/* ═══════════════════════════════════════════════════════════════════════════
   VUKUF SESİ — İŞÇİ (Web Worker)
   src/data/vukufSesIsci.js

   16 Ekim 2026, kullanıcı: "sonraki cümlelere geçişler aşırı yavaş."
   SEBEP: sinir ağı çıkarımı ana iş parçacığında çalışıyordu; sonraki cümle
   hazırlanırken sayfa ve ses olayları (bir cümlenin bitişi dahil) bekliyordu.
   Artık fonemleme + ONNX çıkarımı bu işçide; ana iş parçacığı yalnız çalar.

   İLETİLER  (her biri { no, tip, ... } → yanıt { no, ok | hata, ... })
     kur    { ortWasm, fonemJs (metin), fonemWasm, fonemVeri }
     ses    { ses, model, ayar }           → oturum kurulur (ses başına bir kez)
     sentez { ses, metin, olcek }          → { pcm (aktarılır), ornekleme }
   ═══════════════════════════════════════════════════════════════════════════ */

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

self.onmessage = async (e) => {
  const { no, tip } = e.data || {}
  const yanit = (v, aktar) => self.postMessage({ no, ...v }, aktar || [])
  try {
    if (tip === "kur") {
      if (!ort) {
        const m = await import("onnxruntime-web/wasm")
        ort = m.default || m
        ort.env.wasm.numThreads = 1
        ort.env.wasm.wasmBinary = e.data.ortWasm
      }
      if (!fonem) {
        // Emscripten yapıştırıcısı (UMD) işçi kapsamında çalıştırılır → self.createPiperPhonemize
        if (!self.createPiperPhonemize) (0, eval)(e.data.fonemJs)
        fonemGirdileri = { fonemWasm: e.data.fonemWasm, fonemVeri: e.data.fonemVeri }
        fonem = await fonemleyiciKur()
      }
      yanit({ ok: true })
      return
    }
    if (tip === "ses") {
      if (!oturumlar.has(e.data.ses)) {
        const s = await ort.InferenceSession.create(e.data.model, { executionProviders: ["wasm"] })
        oturumlar.set(e.data.ses, { s, ayar: e.data.ayar })
      }
      yanit({ ok: true })
      return
    }
    if (tip === "sentez") {
      const o = oturumlar.get(e.data.ses)
      if (!o) throw new Error("Ses hazır değil")
      const dil = o.ayar.espeak?.voice || "tr"
      let ids
      try { ids = fonemle(e.data.metin, dil) }
      catch { fonem = await fonemleyiciKur(); ids = fonemle(e.data.metin, dil) }
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
      const sonuc = await o.s.run(feeds)
      const cikti = sonuc.output || sonuc[Object.keys(sonuc)[0]]
      const pcm = cikti.data instanceof Float32Array ? new Float32Array(cikti.data) : Float32Array.from(cikti.data)
      yanit({ ok: true, pcm, ornekleme }, [pcm.buffer])
      return
    }
    throw new Error("Bilinmeyen istek")
  } catch (err) {
    yanit({ hata: String(err?.message || err) })
  }
}
