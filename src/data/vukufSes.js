/* ═══════════════════════════════════════════════════════════════════════════
   VUKUF SESİ — tarayıcı içinde Türkçe sinir ağı sesi (Piper)
   src/data/vukufSes.js

   15 Ekim 2026, kullanıcı: "Ahmet'i beğenmedim, Fahrettin iyi gibi; Fettah ve
   Fahrettin'i indirip bir seferlik kuralım."

   NİÇİN: Web Speech API yalnız cihazdaki sesleri kullanabiliyor (Linux Chrome'da
   Türkçe yok, Floorp'ta hiç ses yok, telefonda tek kadın sesi). Piper sesleri
   tarayıcının içinde çalışıyor → her cihazda AYNI erkek sesler, internetsiz.

   SESLER (lisans denetlendi): Fahrettin ve Fettah — veri seti NabuCasa voice-datasets
   (CC0), model rhasspy/piper-voices (MIT), "medium" kalite, 22 050 Hz. (DFKI sesi
   ticari olmayan lisanslı olduğu için ALINMADI.)

   PARÇALAR — hepsi BİR KEZ indirilir, Cache Storage'da (yoksa IndexedDB'de) "vukuf-ses-motoru"na konur
   (sw.js bu önbelleği silmemeli — korunan adlar listesine eklendi):
     • ONNX Runtime (wasm)        ~14 MB  jsDelivr · onnxruntime-web@1.29.0
     • Piper fonemleyici (espeak) ~19 MB  jsDelivr · @diffusionstudio/piper-wasm@1.0.0 (npm'e gerek yok)
     • Fahrettin modeli           ~63 MB  Hugging Face · rhasspy/piper-voices
     • Fettah modeli              ~63 MB
   Sonra hiçbir şey ağdan gelmez: wasm'lar `wasmBinary`, fonem verisi
   `getPreloadedPackage` ile bellekten verilir.

   ÇALIŞMA (Web Worker'da — vukufSesIsci.js): metin → espeak-ng fonemleri (piper_phonemize,
   tek örnek, tekrar tekrar callMain) → ONNX çıkarımı (tek iş parçacığı; SharedArrayBuffer/COOP gerekmez)
   → Float32 ses → WAV → <audio>. <audio> kullanılıyor çünkü iPhone'da sessiz
   anahtarı Web Audio'yu susturuyor, medya çalmayı susturmuyor.
   HIZ: ses hızlandırılmıyor (tonu bozar); Piper'ın `length_scale` değeri ayarlanıyor.

   ARAPÇA SES (16 Ekim 2026, kullanıcı: "ikili kombinasyon yapabiliriz"): Kaynağı bilinen
   âyetler hafız kaydıyla (everyayah) okunur — burada değil, sesliOkuma.js'te. Kaynağı
   BİLİNMEYEN Arapça ibareler için isteğe bağlı Kerîm sesi (Piper ar_JO-kareem-medium,
   ~63 MB, ayrı indirilir — "ar" grubu). Harekeli metinde iyi okur; harekesizde
   telaffuz hataları olabilir (tarayıcı fonemleyicisinde harekeleme modeli yok).
   GRUPLAR: "tr" = motor + Fettah + Fahrettin · "ar" = motor + Kerîm. Motor iki grupta ortak.
   ═══════════════════════════════════════════════════════════════════════════ */

export const ONBELLEK_ADI = "vukuf-ses-motoru"
export const VUKUF_SESLERI = [
  // tempo: konuşma uzunluğu çarpanı (>1 yavaşlatır). 16 Ekim 2026, kullanıcı: "Fahrettin'in
  // sesi fazla hızlı geldi; Fettah güzel." → Fettah varsayılan, Fahrettin %18 yavaş.
  { id: "fettah",    ad: "Fettah",    grup: "tr", yol: "tr/tr_TR/fettah/medium/tr_TR-fettah-medium",       tempo: 1 },
  { id: "fahrettin", ad: "Fahrettin", grup: "tr", yol: "tr/tr_TR/fahrettin/medium/tr_TR-fahrettin-medium", tempo: 1.18 },
  { id: "kareem",    ad: "Kerîm",     grup: "ar", yol: "ar/ar_JO/kareem/medium/ar_JO-kareem-medium",       tempo: 1 },
]
const sesBul = (id) => VUKUF_SESLERI.find(s => s.id === id)
// Dışarıdan değiştirilebilir (deneme ortamı yerel sunucuyu gösterir)
export const KAYNAK = {
  ortWasm:   "https://cdn.jsdelivr.net/npm/onnxruntime-web@1.29.0/dist/ort-wasm-simd-threaded.wasm",
  // Fonemleyici yapıştırıcısı (Emscripten, UMD) paketlenmiyor: içindeki Node dalları
  // ("fs", "path") tarayıcı paketleyicisini bozuyor. Depodan metin olarak alınıp
  // işçide çalıştırılıyor → `createPiperPhonemize` genel adı tanımlanıyor.
  fonemJs:   "https://cdn.jsdelivr.net/npm/@diffusionstudio/piper-wasm@1.0.0/build/piper_phonemize.js",
  fonemWasm: "https://cdn.jsdelivr.net/npm/@diffusionstudio/piper-wasm@1.0.0/build/piper_phonemize.wasm",
  fonemVeri: "https://cdn.jsdelivr.net/npm/@diffusionstudio/piper-wasm@1.0.0/build/piper_phonemize.data",
  // 16 Ekim 2026: `resolve/main` bu seslerde 404 veriyor (kullanıcının curl denemesi).
  // Sesler, depoda bulunduğu doğrulanan SABİT bir sürümden alınıyor (değişmez adres);
  // ulaşılamazsa piper-tts-web'in kullandığı yansıdan denenir.
  model: (id) => `https://huggingface.co/rhasspy/piper-voices/resolve/6fb8245d6d27fef8988272e0c8e9f5018da1bbbf/${sesBul(id).yol}.onnx`,
  modelYedek: (id) => `https://huggingface.co/diffusionstudio/piper-voices/resolve/main/${sesBul(id).yol}.onnx`,
}
const TAHMINI_MB = { ortWasm: 14, fonemJs: 0.12, fonemWasm: 0.6, fonemVeri: 18, model: 63, ayar: 0.01 }
const MOTOR_MB = TAHMINI_MB.ortWasm + TAHMINI_MB.fonemWasm + TAHMINI_MB.fonemVeri
export const TOPLAM_MB = Math.round(MOTOR_MB + TAHMINI_MB.model * VUKUF_SESLERI.filter(s => s.grup === "tr").length)
export const ARAPCA_MB = Math.round(TAHMINI_MB.model)

function dosyaListesi(grup = "tr") {
  const l = [
    { url: KAYNAK.ortWasm, ad: "Ses motoru", mb: TAHMINI_MB.ortWasm },
    { url: KAYNAK.fonemJs, ad: "Fonemleyici", mb: TAHMINI_MB.fonemJs },
    { url: KAYNAK.fonemWasm, ad: "Fonemleyici", mb: TAHMINI_MB.fonemWasm },
    { url: KAYNAK.fonemVeri, ad: "Fonem verisi", mb: TAHMINI_MB.fonemVeri },
  ]
  for (const s of VUKUF_SESLERI.filter(v => v.grup === grup)) {
    l.push({ url: KAYNAK.model(s.id), yedekler: [KAYNAK.modelYedek(s.id)], ad: `${s.ad} sesi`, mb: TAHMINI_MB.model })
    l.push({ url: KAYNAK.model(s.id) + ".json", yedekler: [KAYNAK.modelYedek(s.id) + ".json"], ad: `${s.ad} ayarları`, mb: TAHMINI_MB.ayar })
  }
  return l
}

/* ── DEPO ─────────────────────────────────────────────────────────────────────
   16 Ekim 2026, kullanıcı: "Mobilde 'Bu tarayıcıda önbellek yok' dedi." Cache
   Storage yalnız GÜVENLİ kökende (https / localhost) var; geliştirme sunucusuna
   yerel ağ adresiyle (http://192.168…) girilince yok. O durumda IndexedDB'ye düşülür
   (her kökende var). Anahtar her iki depoda da dosyanın ASIL adresi. */
let depoSoz = null
function idbAc() {
  return new Promise((cz, red) => {
    const r = indexedDB.open(ONBELLEK_ADI, 1)
    r.onupgradeneeded = () => { if (!r.result.objectStoreNames.contains("d")) r.result.createObjectStore("d") }
    r.onsuccess = () => cz(r.result)
    r.onerror = () => red(r.error || new Error("IndexedDB açılamadı"))
  })
}
function idbIs(db, kip, is) {
  return new Promise((cz, red) => {
    const tx = db.transaction("d", kip)
    const istek = is(tx.objectStore("d"))
    tx.oncomplete = () => cz(istek ? istek.result : undefined)
    tx.onerror = () => red(tx.error)
    tx.onabort = () => red(tx.error || new Error("Kayıt yarıda kaldı"))
  })
}
async function depo() {
  if (!depoSoz) {
    depoSoz = (async () => {
      if (typeof caches !== "undefined" && (typeof window === "undefined" || window.isSecureContext !== false)) {
        try {
          const c = await caches.open(ONBELLEK_ADI)
          return {
            tur: "cache",
            var: async (k) => !!(await c.match(k)),
            al: async (k) => { const y = await c.match(k); return y ? y.arrayBuffer() : null },
            koy: (k, blob) => c.put(k, new Response(blob, { headers: { "content-type": blob.type || "application/octet-stream" } })),
            sil: () => caches.delete(ONBELLEK_ADI),
            kaldir: (k) => c.delete(k),
          }
        } catch { /* IndexedDB'ye düş */ }
      }
      if (typeof indexedDB === "undefined") throw new Error("Bu tarayıcıda kalıcı depolama yok")
      const db = await idbAc()
      return {
        tur: "idb",
        var: async (k) => (await idbIs(db, "readonly", d => d.count(k))) > 0,
        al: async (k) => { const b = await idbIs(db, "readonly", d => d.get(k)); return b ? b.arrayBuffer() : null },
        koy: (k, blob) => idbIs(db, "readwrite", d => d.put(blob, k)),
        sil: () => idbIs(db, "readwrite", d => d.clear()),
        kaldir: (k) => idbIs(db, "readwrite", d => d.delete(k)),
      }
    })().catch((e) => { depoSoz = null; throw e })
  }
  return depoSoz
}

/** Gruptaki parçaların hepsi indirilmiş mi? ("tr" Türkçe sesler, "ar" Kerîm) */
export async function indirilmisMi(grup = "tr") {
  try {
    const d = await depo()
    for (const f of dosyaListesi(grup)) if (!(await d.var(f.url))) return false
    return true
  } catch { return false }
}

/** Eksik parçaları indirir. onIlerleme({ oran, ad, indirilenMb, toplamMb }). sinyal: AbortSignal */
export async function indir(onIlerleme, sinyal, grup = "tr") {
  const dp = await depo()
  const liste = dosyaListesi(grup)
  const eksik = []
  for (const d of liste) if (!(await dp.var(d.url))) eksik.push(d)
  const toplam = eksik.reduce((t, d) => t + d.mb, 0) || 1
  let biten = 0
  for (const d of eksik) {
    // Sırayla adresler denenir (asıl → yedek); depoda hep ASIL adresle saklanır.
    // Hata AYRINTISIYLA bildirilir (hangi dosya, hangi adım).
    let y = null, sonHata = null
    for (const adres of [d.url, ...(d.yedekler || [])]) {
      try {
        const yy = await fetch(adres, { mode: "cors", credentials: "omit", signal: sinyal })
        if (yy.ok) { y = yy; break }
        sonHata = new Error(`${d.ad}: sunucu ${yy.status} döndürdü`)
        sonHata.adim = "sunucu"; sonHata.url = adres
        console.error("[Vukuf sesi]", adres, yy.status)
      } catch (e) {
        if (sinyal?.aborted) throw e
        sonHata = new Error(`${d.ad}: bağlantı kurulamadı (${e?.message || "ağ hatası"})`)
        sonHata.adim = "baglanti"; sonHata.url = adres
        console.error("[Vukuf sesi]", adres, e)
      }
    }
    if (!y) throw sonHata || new Error(`${d.ad} indirilemedi`)
    const boy = Number(y.headers.get("content-length")) || d.mb * 1048576
    const okuyucu = y.body?.getReader()
    const parcalar = []
    let gelen = 0
    if (okuyucu) {
      for (;;) {
        const { done, value } = await okuyucu.read()
        if (done) break
        parcalar.push(value); gelen += value.length
        const anlik = biten + d.mb * Math.min(1, gelen / boy)
        onIlerleme?.({ oran: Math.min(1, anlik / toplam), ad: d.ad, indirilenMb: anlik, toplamMb: toplam })
      }
    } else parcalar.push(new Uint8Array(await y.arrayBuffer()))
    const tur = y.headers.get("content-type") || "application/octet-stream"
    try {
      await dp.koy(d.url, new Blob(parcalar, { type: tur }))
    } catch (e) {
      const h = new Error(`${d.ad}: cihaza kaydedilemedi (${e?.name === "QuotaExceededError" ? "yer yetmedi" : (e?.message || "kayıt hatası")})`)
      h.adim = "kayit"; h.url = d.url
      console.error("[Vukuf sesi]", d.url, e)
      throw h
    }
    biten += d.mb
    onIlerleme?.({ oran: Math.min(1, biten / toplam), ad: d.ad, indirilenMb: biten, toplamMb: toplam })
  }
  // Tarayıcı yer açarken bu depoyu kendiliğinden silmesin (izin verilirse)
  try { await navigator.storage?.persist?.() } catch { /* yoksay */ }
}

/** Vukuf sesi dosyalarını siler (yer açmak için). grup verilirse YALNIZ o grubun ses
    modelleri silinir (motor öbür grup için kalır); verilmezse hepsi. */
export async function sil(grup) {
  for (const is of [...isciler]) isciKaldir(is)
  isKuyrugu.splice(0).forEach(j => j.cz(null))
  try {
    const d = await depo()
    if (!grup) { await d.sil(); return }
    for (const s of VUKUF_SESLERI.filter(v => v.grup === grup)) {
      await d.kaldir(KAYNAK.model(s.id)); await d.kaldir(KAYNAK.model(s.id) + ".json")
    }
  } catch { /* yoksay */ }
}

async function arabellek(url) {
  const d = await depo()
  const b = await d.al(url)
  if (!b) throw new Error("Vukuf sesi henüz indirilmedi")
  return b
}

/* ── İŞÇİLER ───────────────────────────────────────────────────────────────────
   Çıkarım işçide (data/vukufSesIsci.js) — ana iş parçacığı ve ses olayları beklemez.
   Her işçi tek iş parçacığıyla çalışır (SharedArrayBuffer/COOP gerekmez).

   16 Ekim 2026, kullanıcı (iPhone): "Çok uzun sürede ses hazırlanıyor diyor, sonra
   1 cümle okuyor, tekrar hazırlanıyor." → Cihaz bir cümleyi okunduğundan YAVAŞ
   üretiyor. Önden hazırlık bunu tek başına çözemez (üretim hızı çalma hızının
   altında kaldıkça boşluk büyür). Çözüm: İKİNCİ BİR İŞÇİ — telefonlarda birden çok
   çekirdek var; iki işçi iki cümleyi aynı anda üretir (üretim ~2 kat). İkinci işçi
   yalnız gerektiğinde (sesliOkuma yavaşlık görünce `isciEkle`) kurulur — hızlı
   cihaz boşuna bellek harcamaz. Kurulumu bitene kadar ona iş verilmez (sıra bozulmasın).
   İş sırası: kuyruktaki ilk istenen iş ilk boş HAZIR işçiye; artık istenmeyen iş
   (okuyucu atladı, hız değişti) çalıştırılmadan geçilir. */
/* global Worker */
export let isciOlustur = () => new Worker(new URL("./vukufSesIsci.js", import.meta.url), { type: "module" })
export function isciOlusturucuAyarla(f) { isciOlustur = f }   // deneme ortamı için
export const ISCI_SINIRI = 2
let isciler = []                              // { w, kurSoz, sesSoz: Map, mesgul, hazir, olu }
let istekNo = 0
const bekleyenler = new Map()                 // no → { tip, is, cz, red }

// Yanıt gelmezse (ör. iPhone işçiyi bellek yüzünden sessizce kapattıysa) sonsuza dek beklenmez
const SURE_SINIRI = { kur: 90000, ses: 90000, sentez: 60000 }
const ASAMA = { kur: "Ses motoru kurulumu", ses: "Ses modeli yüklemesi", sentez: "Ses üretimi" }
function iste(is, tip, veri = {}, aktar = []) {
  return new Promise((cz, red) => {
    if (is.olu) { red(new Error("Ses işçisi kapandı")); return }
    const no = ++istekNo
    const zaman = setTimeout(() => {
      if (!bekleyenler.has(no)) return
      bekleyenler.delete(no)
      red(new Error(`${ASAMA[tip] || tip}: yanıt gelmedi (cihaz belleği yetmemiş olabilir)`))
    }, SURE_SINIRI[tip] || 60000)
    bekleyenler.set(no, {
      tip, is,
      cz: (v) => { clearTimeout(zaman); cz(v) },
      red: (h) => { clearTimeout(zaman); red(h) },
    })
    try { is.w.postMessage({ no, tip, ...veri }, aktar) } catch (e) { clearTimeout(zaman); bekleyenler.delete(no); red(e) }
  })
}

function isciKaldir(is, hata) {
  if (is.olu) return
  is.olu = true
  try { is.w.terminate() } catch { /* yoksay */ }
  isciler = isciler.filter(x => x !== is)
  const h = hata || new Error("Ses işçisi kapandı")
  for (const [no, b] of [...bekleyenler]) if (b.is === is) { bekleyenler.delete(no); b.red(h) }
}

function isciKur() {
  const w = isciOlustur()
  const is = { w, kurSoz: null, sesSoz: new Map(), mesgul: false, hazir: false, olu: false }
  w.onmessage = (e) => {
    const b = bekleyenler.get(e.data?.no)
    if (!b) return
    bekleyenler.delete(e.data.no)
    if (e.data.hata) b.red(new Error(`${ASAMA[b.tip] || "Ses motoru"}: ${e.data.hata}`)); else b.cz(e.data)
  }
  w.onerror = (e) => {
    try { e?.preventDefault?.() } catch { /* yoksay */ }
    // Çökmüş işçi atılır; gerekirse bir sonraki istekte yenisi kurulur
    isciKaldir(is, new Error(`Ses işçisi çalışmadı${e?.message ? ` (${e.message})` : ""}`))
    dagit()
  }
  w.onmessageerror = () => isciKaldir(is, new Error("Ses işçisi iletisi okunamadı"))
  is.kurSoz = (async () => {
    let ortWasm, fonemJsB, fonemWasm, fonemVeri
    const t0 = performance.now()
    try {
      [ortWasm, fonemJsB, fonemWasm, fonemVeri] = await Promise.all([
        arabellek(KAYNAK.ortWasm), arabellek(KAYNAK.fonemJs), arabellek(KAYNAK.fonemWasm), arabellek(KAYNAK.fonemVeri),
      ])
    } catch (e) { throw new Error(`Kayıtlı dosyalar okunamadı (${e?.message || e})`) }
    const t1 = performance.now()
    const y = await iste(is, "kur", { ortWasm, fonemJs: new TextDecoder().decode(fonemJsB), fonemWasm, fonemVeri }, [ortWasm, fonemWasm, fonemVeri])
    tani.kurulum = { dosyaMs: Math.round(t1 - t0), kurMs: Math.round(performance.now() - t1), ...(y.olcum || {}) }
    tani.ortam = y.ortam || null
  })()
  is.kurSoz.catch((e) => isciKaldir(is, e))
  isciler.push(is)
  return is
}

/* Bir işçide bir sesi kur (her işçide ses başına bir kez) */
function sesHazir(is, id) {
  if (!is.sesSoz.has(id)) {
    const soz = (async () => {
      await is.kurSoz
      let model, ayarB
      const t0 = performance.now()
      try { [model, ayarB] = await Promise.all([arabellek(KAYNAK.model(id)), arabellek(KAYNAK.model(id) + ".json")]) }
      catch (e) { throw new Error(`${sesBul(id)?.ad || id} sesi okunamadı (${e?.message || e})`) }
      const t1 = performance.now()
      const y = await iste(is, "ses", { ses: id, model, ayar: JSON.parse(new TextDecoder().decode(ayarB)) }, [model])
      tani.ses[id] = { dosyaMs: Math.round(t1 - t0), kurMs: Math.round(performance.now() - t1), ...(y.olcum || {}) }
    })()
    soz.catch(() => { if (is.sesSoz.get(id) === soz) is.sesSoz.delete(id) })
    is.sesSoz.set(id, soz)
  }
  return is.sesSoz.get(id)
}

/** Ses önceden kurulur (ilk cümlede bekleme olmasın). Aynı anda iki kez çağrılırsa tek kurulum. */
export async function hazirla(id) {
  const is = isciler[0] || isciKur()
  await sesHazir(is, id)
  is.hazir = true
}

/** Kaç işçi çalışıyor */
export const isciSayisi = () => isciler.length

/** Yavaş cihaz: ikinci işçiyi kur (ilkinde kurulu sesleri de hazırlayarak). Kurulamazsa sessizce vazgeçilir. */
export function isciEkle() {
  if (isciler.length >= ISCI_SINIRI || !isciler.length) return false
  const ilk = isciler[0]
  const is = isciKur()
  ;(async () => {
    try {
      await is.kurSoz
      for (const id of [...ilk.sesSoz.keys()]) await sesHazir(is, id)
      is.hazir = true
      dagit()
    } catch (e) {
      console.warn("[Vukuf sesi] ikinci işçi kurulamadı:", e?.message || e)
      isciKaldir(is)
    }
  })()
  return true
}

/* ── TANILAMA ── "Hız testi" (ayarlar) bu ölçüleri gösterir; sorun bildirmek için */
const tani = { kurulum: null, ortam: null, ses: {} }
function jsOlcu() {
  // Saf JS döngüsü: JIT kapalıysa (ör. Kilitlenme Modu) belirgin biçimde yavaşlar
  const t = performance.now()
  let x = 0
  for (let i = 0; i < 5e6; i++) x = (x + i * 7) % 1000003
  return { ms: Math.round(performance.now() - t), x }
}
/** Ölçümlü deneme: hazırlık + iki cümle. Okuma sürerken çağrılmamalı (kuyruğa girer). */
export async function hizTesti(id = "fettah") {
  const t0 = performance.now()
  await hazirla(id)
  const hazirlikMs = Math.round(performance.now() - t0)
  const cumleler = []
  for (const m of ["Bismillâhirrahmânirrahîm.", "Her hayrın başı besmeledir; biz dahi başta ona başlarız."]) {
    const t = performance.now()
    const y = await sentezle(m, id, 1)
    cumleler.push({
      metin: m, toplamMs: Math.round(performance.now() - t),
      sesMs: Math.round((y.pcm.length / y.ornekleme) * 1000), ...(y.olcum || {}),
    })
  }
  return {
    hazirlikMs, kurulum: tani.kurulum, ortam: tani.ortam, ses: tani.ses[id] || null, cumleler,
    js: jsOlcu().ms, isci: isciler.length,
    tarayici: typeof navigator !== "undefined" ? navigator.userAgent : "",
    guvenli: typeof window !== "undefined" ? window.isSecureContext : null,
  }
}

const isKuyrugu = []                          // { metin, id, olcek, istenir, cz, red }
function dagit() {
  if (!isKuyrugu.length) return
  if (!isciler.length) isciKur()
  // İlk işçi hazır değilse de ona verilir (başka seçenek yok); sonradan gelen ancak hazır olunca iş alır
  for (const is of isciler) {
    if (is.mesgul || is.olu || !(is.hazir || is === isciler[0])) continue
    let j
    while ((j = isKuyrugu.shift())) { if (j.istenir()) break; j.cz(null) }
    if (!j) return
    is.mesgul = true
    ;(async () => {
      try {
        await sesHazir(is, j.id)
        is.hazir = true
        const t0 = performance.now()
        const y = await iste(is, "sentez", { ses: j.id, metin: j.metin, olcek: j.olcek })
        j.cz({ pcm: y.pcm, ornekleme: y.ornekleme, sure: performance.now() - t0, olcum: y.olcum || null })
      } catch (e) { j.red(e) }
      finally { is.mesgul = false; dagit() }
    })()
  }
}

/**
 * Metni sese çevirir → { pcm: Float32Array, ornekleme, sure (ms) }.
 * istenir(): false dönerse iş sırası geldiğinde ATLANIR (null döner).
 */
export function sentezle(metin, id, hiz = 1, istenir = () => true) {
  const ses = sesBul(id) || VUKUF_SESLERI[0]
  // Seslerin doğal hızı farklı: Fahrettin hızlı konuşuyor → biraz yavaşlatılır (tempo)
  const olcek = (ses.tempo || 1) / Math.max(0.5, Math.min(2, Number(hiz) || 1))
  return new Promise((cz, red) => {
    isKuyrugu.push({ metin, id: ses.id, olcek, istenir, cz, red })
    dagit()
  })
}

/** Float32 PCM → WAV Blob (16 bit, tek kanal) */
export function wavYap(pcm, ornekleme) {
  const n = pcm.length
  const v = new DataView(new ArrayBuffer(44 + n * 2))
  const yaz = (o, s) => { for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)) }
  yaz(0, "RIFF"); v.setUint32(4, 36 + n * 2, true); yaz(8, "WAVE")
  yaz(12, "fmt "); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true)
  v.setUint32(24, ornekleme, true); v.setUint32(28, ornekleme * 2, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true)
  yaz(36, "data"); v.setUint32(40, n * 2, true)
  let p = 44
  for (let i = 0; i < n; i++, p += 2) {
    const x = Math.max(-1, Math.min(1, pcm[i]))
    v.setInt16(p, x < 0 ? x * 32768 : x * 32767, true)
  }
  return new Blob([v.buffer], { type: "audio/wav" })
}
