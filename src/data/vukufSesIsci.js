/* ═══════════════════════════════════════════════════════════════════════════
   VUKUF SESİ — İŞÇİ (Web Worker)
   src/data/vukufSesIsci.js

   16 Ekim 2026, kullanıcı: "sonraki cümlelere geçişler aşırı yavaş."
   SEBEP: sinir ağı çıkarımı ana iş parçacığında çalışıyordu; sonraki cümle
   hazırlanırken sayfa ve ses olayları (bir cümlenin bitişi dahil) bekliyordu.
   Artık fonemleme + ONNX çıkarımı bu işçide; ana iş parçacığı yalnız çalar.

   İLETİLER  (her biri { no, tip, ... } → yanıt { no, ok | hata, ... })
     kur    { ortJs, ortGlue (metin), ortWasm, fonemJs (metin), fonemWasm, fonemVeri }
            ONNX Runtime 1.20.1 npm'den değil, depodan gelen metinden (blob adresiyle) içe
            aktarılır — 1.21+ Safari'de aşırı yavaş/bellek (bkz. vukufSes.js başlığı).
     ses    { ses, model, ayar }           → oturum kurulur (ses başına bir kez)
            { ses, antalia: { text, cond, flow, vocoder, manifest, veri } } → Antalia-2 Mini
            (16 Ekim 2026, kullanıcı: "Antalia2 güzel, hatta Piper'dan daha iyi"): espeak yok,
            harf tabanlı; Türkçe normalleştirici (sayı, tarih, kısaltma) ./antalia/frontend.js,
            dört ONNX grafiği + iSTFT ./antalia/tts.js — ikisi de Apache-2.0, değiştirilmeden.
            { ses, model, ayar: { tokenizer: "karakter", sozluk, bosluk_ekle }, veri } → MMS-TTS
            (17 Ekim 2026): harf tabanlı VITS; metin Antalia normalleştiricisinden geçer (veri),
            sonra sözlükte olmayan harfler atılır (şapkalı ünlü → düz), aralara 0 eklenir.
     sentez { ses, metin, olcek }          → { pcm (aktarılır), ornekleme }
   TANILAMA (16 Ekim 2026, iPhone'da cümle başına ~30 sn): her yanıt `olcum` (ms) taşır;
   kur ayrıca `ortam` (SIMD, çekirdek, izolasyon) verir → ayarlardaki "Hız testi".
   ═══════════════════════════════════════════════════════════════════════════ */

import { Engine as AntaliaMotoru, speak as antaliaSoyle, SAMPLE_RATE as ANTALIA_HZ } from "./antalia/tts.js"
import { createFrontend as antaliaOnYuz, decodeAsset as antaliaVeriCoz } from "./antalia/frontend.js"

// Şapkalı ünlü süresi çarpanı (Antalia). 1 = demonun kendi süresi. Az gelirse artırılabilir (ör. 1,6).
const ANTALIA_SAPKA_UZATMA = 1.4

let ort = null, fonem = null, fonemCikis = null
const oturumlar = new Map()
let fonemGirdileri = null

async function fonemleyiciKur() {
  const g = fonemGirdileri
  return self.createPiperPhonemize({
    print: (s) => fonemCikis && fonemCikis(s),
    printErr: () => {},
    wasmBinary: g.fonemWasm,
    getPreloadedPackage: () => g.fonemVeri,
    locateFile: (u) => u,
  })
}

function fonemle(metin, dil) {
  const ids = []
  fonemCikis = (satir) => {
    try { const j = JSON.parse(satir); if (Array.isArray(j.phoneme_ids)) ids.push(...j.phoneme_ids) } catch { /* yoksay */ }
  }
  try {
    fonem.callMain(["-l", dil, "--input", JSON.stringify([{ text: metin }]), "--espeak_data", "/espeak-ng-data"])
  } finally { fonemCikis = null }
  return ids
}

/* MMS: metin → harf kimlikleri (transformers VitsTokenizer ile aynı: küçük harf, sözlük
   dışı karakter atılır, kırp, aralara 0). Sayı/tarih/kısaltma Antalia normalleştiricisiyle açılır. */
function karakterKimlikleri(o, metin) {
  let t = o.onYuz ? o.onYuz.modelText(metin) : String(metin).toLocaleLowerCase("tr")
  let suz = ""
  for (const c of t) {
    if (o.sozluk.has(c)) { suz += c; continue }
    const taban = c.normalize("NFD").replace(/[\u0300-\u036f]/g, "")   // â → a
    if (taban && o.sozluk.has(taban)) suz += taban
  }
  suz = suz.trim()
  if (!suz) return []
  const ids = []
  for (const c of suz) ids.push(Number(o.sozluk.get(c)))
  if (o.ayar.bosluk_ekle === false) return ids
  const ara = new Array(ids.length * 2 + 1).fill(0)
  ids.forEach((v, i) => { ara[2 * i + 1] = v })
  return ara
}

self.onmessage = async (e) => {
  const { no, tip } = e.data || {}
  const yanit = (v, aktar) => self.postMessage({ no, ...v }, aktar || [])
  try {
    if (tip === "kur") {
      const t0 = performance.now()
      let t1 = t0
      if (!ort) {
        const blobUrl = (t) => URL.createObjectURL(new Blob([t], { type: "text/javascript" }))
        const glueUrl = blobUrl(e.data.ortGlue)
        const m = await import(/* @vite-ignore */ blobUrl(e.data.ortJs))
        ort = m.InferenceSession ? m : m.default
        ort.env.wasm.numThreads = 1
        ort.env.wasm.proxy = false
        // wasm da blob adresiyle: yapıştırıcı `wasmBinary` verilse bile `new URL(…, import.meta.url)`
        // hesaplıyor ve blob adresinde bu hata veriyor; locateFile ise yalnız wasmPaths ile kuruluyor
        const wasmUrl = URL.createObjectURL(new Blob([e.data.ortWasm], { type: "application/wasm" }))
        ort.env.wasm.wasmPaths = { mjs: glueUrl, wasm: wasmUrl }
      }
      t1 = performance.now()
      if (!fonem) {
        // Emscripten yapıştırıcısı (UMD) işçi kapsamında çalıştırılır → self.createPiperPhonemize
        if (!self.createPiperPhonemize) (0, eval)(e.data.fonemJs)
        fonemGirdileri = { fonemWasm: e.data.fonemWasm, fonemVeri: e.data.fonemVeri }
        fonem = await fonemleyiciKur()
      }
      let simd = null
      try { simd = self.WebAssembly.validate(new Uint8Array([0, 97, 115, 109, 1, 0, 0, 0, 1, 5, 1, 96, 0, 1, 123, 3, 2, 1, 0, 10, 10, 1, 8, 0, 65, 0, 253, 15, 253, 98, 11])) } catch { /* yoksay */ }
      yanit({
        ok: true,
        olcum: { motorMs: Math.round(t1 - t0), fonemleyiciMs: Math.round(performance.now() - t1) },
        ortam: { simd, izole: !!self.crossOriginIsolated, cekirdek: self.navigator?.hardwareConcurrency || 0, ort: ort?.env?.versions?.web || "" },
      })
      return
    }
    if (tip === "ses") {
      const t0 = performance.now()
      if (!oturumlar.has(e.data.ses) && e.data.antalia) {
        const a = e.data.antalia
        const motor = await AntaliaMotoru.create(ort, { text: a.text, cond: a.cond, flow: a.flow, vocoder: a.vocoder }, a.manifest, ["wasm"])
        // Şapkalı ünlüler (â, î, û) biraz daha uzun (17 Ekim 2026, kullanıcı: "biraz az uzatıyor")
        const uzunIds = new Set(["â", "î", "û"].map(c => motor.symbolId.get(c)).filter(v => v !== undefined))
        if (uzunIds.size) motor.options.uzun_unlu = { ids: uzunIds, oran: ANTALIA_SAPKA_UZATMA }
        const onYuz = antaliaOnYuz(await antaliaVeriCoz(a.veri))
        onYuz.warmup()
        // Isınma: her grafiğin ilk çalışması bellek ayırıyor; ilk gerçek cümle beklemesin
        for await (const _ of antaliaSoyle(motor, onYuz.modelText("Merhaba."), { steps: 1 })) { /* boş */ }
        oturumlar.set(e.data.ses, { antalia: { motor, onYuz } })
      } else if (!oturumlar.has(e.data.ses)) {
        const s = await ort.InferenceSession.create(e.data.model, { executionProviders: ["wasm"] })
        const o = { s, ayar: e.data.ayar }
        if (e.data.ayar?.tokenizer === "karakter") {
          o.onYuz = e.data.veri ? antaliaOnYuz(await antaliaVeriCoz(e.data.veri)) : null
          o.onYuz?.warmup()
          o.sozluk = new Map(Object.entries(e.data.ayar.sozluk || {}))
        }
        oturumlar.set(e.data.ses, o)
      }
      yanit({ ok: true, olcum: { oturumMs: Math.round(performance.now() - t0) } })
      return
    }
    if (tip === "sentez") {
      const o = oturumlar.get(e.data.ses)
      if (!o) throw new Error("Ses hazır değil")
      if (o.antalia) {
        // Antalia: hız varsayılanına (0,95) oranla; cümle içi parçalar arası duraklamalar motorda.
        // Cümle sonuna kısa sessizlik eklenir (Piper kendisi koyuyor; Antalia ön/son eki kesiyor).
        const { motor, onYuz } = o.antalia
        const t0 = performance.now()
        const metin = onYuz.modelText(e.data.metin)
        const t1 = performance.now()
        const parcalar = []
        let n = 0
        const hiz = motor.defaults.speed / (e.data.olcek || 1)
        const sure = { text: 0, cond: 0, flow: 0, vocoder: 0, istft: 0 }
        for await (const { audio, timings } of antaliaSoyle(motor, metin, { seed: 0, speed: hiz, steps: e.data.adim || undefined })) {
          parcalar.push(audio); n += audio.length
          for (const k in sure) sure[k] += timings?.[k] || 0
        }
        const sessiz = Math.floor((/[.?!…]["'”’)]*\s*$/.test(e.data.metin) ? 0.22 : 0.12) * ANTALIA_HZ)
        const pcm = new Float32Array(n + sessiz)
        let k = 0
        for (const p of parcalar) { pcm.set(p, k); k += p.length }
        const ayrinti = Object.fromEntries(Object.entries(sure).map(([k, v]) => [k, Math.round(v)]))
        yanit({ ok: true, pcm, ornekleme: ANTALIA_HZ, olcum: { fonemMs: Math.round(t1 - t0), cikarimMs: Math.round(performance.now() - t1), fonemSayisi: metin.length, ayrinti, metin } }, [pcm.buffer])
        return
      }
      const dil = o.ayar.espeak?.voice || "tr"
      const t0 = performance.now()
      let ids
      if (o.sozluk) ids = karakterKimlikleri(o, e.data.metin)
      else {
        try { ids = fonemle(e.data.metin, dil) }
        catch { fonem = await fonemleyiciKur(); ids = fonemle(e.data.metin, dil) }
      }
      const ornekleme = o.ayar.audio?.sample_rate || 22050
      if (!ids.length) { yanit({ ok: true, pcm: new Float32Array(0), ornekleme }); return }
      const inf = o.ayar.inference || {}
      const T = ort.Tensor
      const feeds = {
        input: new T("int64", BigInt64Array.from(ids.map(BigInt)), [1, ids.length]),
        input_lengths: new T("int64", BigInt64Array.from([BigInt(ids.length)]), [1]),
        scales: new T("float32", Float32Array.from([
          inf.noise_scale ?? 0.667,
          (inf.length_scale ?? 1) * (e.data.olcek || 1),
          inf.noise_w ?? 0.8,
        ]), [3]),
      }
      if (o.ayar.num_speakers > 1) feeds.sid = new T("int64", BigInt64Array.from([0n]), [1])
      const t1 = performance.now()
      const sonuc = await o.s.run(feeds)
      const t2 = performance.now()
      const cikti = sonuc.output || sonuc[Object.keys(sonuc)[0]]
      let pcm = cikti.data instanceof Float32Array ? new Float32Array(cikti.data) : Float32Array.from(cikti.data)
      if (o.sozluk) {
        // MMS cümle sonunda duraksamıyor (noktalama sözlükte yok) → kısa sessizlik
        const ek = Math.floor((/[.?!…]["'”’)]*\s*$/.test(e.data.metin) ? 0.25 : 0.12) * ornekleme)
        const p2 = new Float32Array(pcm.length + ek); p2.set(pcm); pcm = p2
      }
      yanit({ ok: true, pcm, ornekleme, olcum: { fonemMs: Math.round(t1 - t0), cikarimMs: Math.round(t2 - t1), fonemSayisi: ids.length } }, [pcm.buffer])
      return
    }
    throw new Error("Bilinmeyen istek")
  } catch (err) {
    yanit({ hata: String(err?.message || err) })
  }
}
