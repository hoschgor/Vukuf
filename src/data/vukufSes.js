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
     • ONNX Runtime (wasm)        ~11 MB  jsDelivr · onnxruntime-web@1.20.1 (npm'e gerek yok — aşağıya bak)
     • Piper fonemleyici (espeak) ~19 MB  jsDelivr · @diffusionstudio/piper-wasm@1.0.0 (npm'e gerek yok)
     • (Fahrettin modeli — 16 Ekim 2026'da çıkarıldı, aşağıya bak)
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
   FAHRETTİN ÇIKARILDI (16 Ekim 2026, kullanıcı: "Fahrettin'i beğenmedim, aksanı Amerikan gibi
   okuyor; Fettah şimdilik kalabilir, daha doğal yeni bir ses kaynağı bulalım"). İndirilmiş
   Fahrettin dosyaları ESKI_PARCALAR ile depodan silinir (~63 MB yer açılır).
   DFKI SESİ (16 Ekim 2026, kullanıcı: "Piper'ı deneyelim, mevcut sistem üzerinden; Hakkında'da
   atıf veririz, ticari amacımız yok"). tr_TR-dfki-medium — erkek, 22 050 Hz; veri seti MaryTTS
   DFKI Turkish (github.com/marytts/dfki-ot-data), lisans CC BY-NC-SA 4.0 (ticari olmayan,
   atıf, aynı lisansla paylaşım). Otomatik doğallık ölçüsünde (UTMOS) küçük Türkçe modellerin
   en iyilerinden (3,71). Ayrı, isteğe bağlı indirme (~63 MB) — Fettah inmiş olan tekrar indirmez.
   ANTALIA-2 MINI (16 Ekim 2026, kullanıcı: "Antalia2 güzel, hatta Piper'dan daha iyi"; Okur kötü).
   PatientDesk AI, Apache-2.0; sentetik erkek ses (gerçek kişi değil), 48 kHz, 7,6 M parametre.
   Piper değil: harf tabanlı (espeak yok) + kendi Türkçe normalleştiricisi (sayı, tarih,
   kısaltma) → dört ONNX grafiği (text, cond, flow, vocoder) + JS iSTFT. Kod (src/data/antalia/
   tts.js, frontend.js) tarayıcı demosundan DEĞİŞTİRİLMEDEN alındı. "mixed" duyarlık: fp32
   akustik + fp16 vocoder ≈ 22,8 MB + normalleştirici verisi. Dosyalar uygulamanın KENDİ
   sunucusundan (public/ses/antalia/ — sw.js bu yolu önbelleğe almıyor, depo burada), olmazsa
   Hugging Face'teki demodan iner. Varsayılan ses artık Antalia.
   GRUPLAR (her ses ayrı indirilir; motor hepsinde ortak):
     "antalia" · "mms" · "ar" (Kerîm). ("tr" = Fettah, "dfki" = DFKI idi; 17 Ekim 2026'da çıkarıldı.)

   DÜZELTME (17 Ekim 2026, kullanıcı): beğenilmeyen ses DFKI değil MMS'ti — "içinde birden fazla
   ses var, bir cümleyi biri, diğerini başkası okuyor; ilk okuyan sürekli okusa güzel olur".
   (DFKI bir süre geri alındı; 17 Ekim 2026 akşamı kullanıcı: "DFKI'yi kaldıralım, daha sonra MMS
   için geliştirme yapacağız" → DFKI KESİN çıkarıldı, dosyaları ESKI_PARCALAR ile silinir.)
   MMS kalıyor ama SES TUTARLILIĞI için gürültü düşük (MMS_AYAR):
   VITS her cümlede ses rengini öncül dağılımdan RASTGELE örnekliyor (noise_scale); MMS'in
   Türkçe verisinde birden çok okuyucu olduğundan bu, cümleden cümleye farklı kişi gibi
   duyuluyor. noise_scale 0,667 → 0,2 ile örnek ortalamaya yaklaşır → tek ses.

   FETTAH ÇIKARILDI (17 Ekim 2026, kullanıcı: "Fettah'ı kaldıralım"). İndirilmiş dosyaları
   ESKI_PARCALAR ile depodan silinir.

   MMS-TTS (Meta) TÜRKÇE (17 Ekim 2026, kullanıcı: "MMS'i kurup deneyelim, atıfla ekleriz").
   facebook/mms-tts-tur — VITS, harf tabanlı, 16 kHz, CC BY-NC 4.0. Hugging Face'te ONNX'i
   yok → mms_onnx_cevir.py ile Piper arayüzünde (input / input_lengths / scales → output)
   ONNX'e çevrildi, ağırlıklar fp16 saklı (~55 MB), 20 MB'lık PARÇALAR hâlinde
   public/ses/mms/ altında; indirirken birleştirilip TEK anahtarla saklanır. Metin
   normalleştirme (sayı, tarih, kısaltma) Antalia'nınkiyle (frontend-data.json.gz ortak),
   ardından MMS harf sözlüğü + aralara 0 (bosluk_ekle) — işçi "tokenizer: karakter"e bakar.

   ONNX RUNTIME 1.20.1 (16 Ekim 2026). iPhone "Hız testi": 1,6 sn ses → 10,2 sn çıkarım,
   ses kurulumu 20,7 sn (dizüstünde ~0,1 oran). Bilinen sorun: onnxruntime-web 1.21 ve
   sonrası Safari/WebKit'te aşırı işlemci + bellek (microsoft/onnxruntime #26827 — WebKit'in
   OMG derleyicisi çok büyük wasm işlevlerinde takılıyor); 1.20.0/1.20.1 sorunsuz bildiriliyor.
   1.29.0 → 1.20.1'e inildi. Paket artık npm'den değil, öbür parçalar gibi depodan
   yükleniyor: ana modül (ort.wasm.min.mjs) + yapıştırıcı (ort-wasm-simd-threaded.mjs)
   işçide blob adresinden içe aktarılıyor, wasm `wasmBinary` ile veriliyor. Eski 1.29 wasm'ı
   indirmeden sonra depodan silinir. Yeni sürümde yalnız motor (~11 MB) yeniden iner.
   ═══════════════════════════════════════════════════════════════════════════ */

export const ONBELLEK_ADI = "vukuf-ses-motoru"
export const VUKUF_SESLERI = [
  // tempo: konuşma uzunluğu çarpanı (>1 yavaşlatır). 16 Ekim 2026, kullanıcı: "Fahrettin'in
  // sesi fazla hızlı geldi; Fettah güzel." → Fettah varsayılan, Fahrettin %18 yavaş.
  { id: "antalia",   ad: "Antalia",   grup: "antalia", motor: "antalia",                                        tempo: 1 },
  { id: "mms",       ad: "MMS",       grup: "mms", motor: "mms",                                               tempo: 1 },
  { id: "kareem",    ad: "Kerîm",     grup: "ar", yol: "ar/ar_JO/kareem/medium/ar_JO-kareem-medium",       tempo: 1 },
]
const sesBul = (id) => VUKUF_SESLERI.find(s => s.id === id)
/** Bir sesin indirme grubu ("antalia" | "mms" | "ar") */
export const sesGrubu = (id) => sesBul(id)?.grup || "antalia"
// Dışarıdan değiştirilebilir (deneme ortamı yerel sunucuyu gösterir)
export const KAYNAK = {
  ortJs:     "https://cdn.jsdelivr.net/npm/onnxruntime-web@1.20.1/dist/ort.wasm.min.mjs",
  ortGlue:   "https://cdn.jsdelivr.net/npm/onnxruntime-web@1.20.1/dist/ort-wasm-simd-threaded.mjs",
  ortWasm:   "https://cdn.jsdelivr.net/npm/onnxruntime-web@1.20.1/dist/ort-wasm-simd-threaded.wasm",
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
  // Antalia: önce kendi sunucumuz, olmazsa Hugging Face demosu (dosya adı → { asıl, yedek })
  antalia: (ad) => `/ses/antalia/${ad}`,
  antaliaYedek: (ad) => `https://huggingface.co/spaces/cloud0day3/antalia-mini/resolve/main/${ad === "frontend-data.json.gz" ? "assets" : "models"}/${ad}`,
}
// Önceki sürümlerden kalan, artık kullanılmayan parçalar (indirmeden sonra silinir)
const ESKI_FAHRETTIN = "https://huggingface.co/rhasspy/piper-voices/resolve/6fb8245d6d27fef8988272e0c8e9f5018da1bbbf/tr/tr_TR/fahrettin/medium/tr_TR-fahrettin-medium.onnx"
const ESKI_FETTAH = "https://huggingface.co/rhasspy/piper-voices/resolve/6fb8245d6d27fef8988272e0c8e9f5018da1bbbf/tr/tr_TR/fettah/medium/tr_TR-fettah-medium.onnx"
const ESKI_DFKI = "https://huggingface.co/rhasspy/piper-voices/resolve/6fb8245d6d27fef8988272e0c8e9f5018da1bbbf/tr/tr_TR/dfki/medium/tr_TR-dfki-medium.onnx"
const ESKI_PARCALAR = [
  "https://cdn.jsdelivr.net/npm/onnxruntime-web@1.29.0/dist/ort-wasm-simd-threaded.wasm",
  ESKI_FAHRETTIN, ESKI_FAHRETTIN + ".json",
  ESKI_FETTAH, ESKI_FETTAH + ".json",            // 17 Ekim 2026'da çıkarıldı
  ESKI_DFKI, ESKI_DFKI + ".json",                // 17 Ekim 2026'da çıkarıldı
]
let eskilerTemizlendi = false
async function eskileriTemizle(dp) {
  if (eskilerTemizlendi) return
  eskilerTemizlendi = true
  for (const k of ESKI_PARCALAR) { try { await dp.kaldir(k) } catch { /* yoksay */ } }
}
const TAHMINI_MB = { ortJs: 0.05, ortGlue: 0.03, ortWasm: 11, fonemJs: 0.12, fonemWasm: 0.6, fonemVeri: 18, model: 63, ayar: 0.01 }
const MOTOR_MB = TAHMINI_MB.ortJs + TAHMINI_MB.ortGlue + TAHMINI_MB.ortWasm + TAHMINI_MB.fonemWasm + TAHMINI_MB.fonemVeri
export const TOPLAM_MB = Math.round(MOTOR_MB + 24)   // varsayılan ses (Antalia) ile ilk indirme
export const ARAPCA_MB = Math.round(TAHMINI_MB.model)

// Antalia dosyaları (mixed duyarlık) — sıra: text, cond, flow, vocoder, manifest, normalleştirici verisi
const ANTALIA_DOSYALARI = [
  ["text.onnx", 4.05], ["cond.onnx", 0.62], ["flow.onnx", 10.3], ["vocoder.fp16.onnx", 7.9],
  ["manifest.json", 0.01], ["frontend-data.json.gz", 1],
]
// MMS: mms_onnx_cevir.py'nin verdiği parça sayısı (çıktısındaki "MMS_PARCA_SAYISI = N")
export const MMS_PARCA_SAYISI = 3
// Ses tutarlılığı: ses rengi gürültüsü düşük (0,667 → 0,2); ritim gürültüsü biraz düşük (0,8 → 0,6).
// Ses hâlâ cümleden cümleye değişirse noise_scale daha da düşürülebilir (0 = tamamen sabit, biraz düz).
export const MMS_AYAR = { noise_scale: 0.2, noise_w: 0.6 }
const MMS_MODEL = "/ses/mms/mms-tur.onnx"
const MMS_PARCALARI = Array.from({ length: MMS_PARCA_SAYISI }, (_, i) => `${MMS_MODEL}.${String(i).padStart(3, "0")}`)
function dosyaListesi(grup = "antalia") {
  const l = [
    { url: KAYNAK.ortJs, ad: "Ses motoru", mb: TAHMINI_MB.ortJs },
    { url: KAYNAK.ortGlue, ad: "Ses motoru", mb: TAHMINI_MB.ortGlue },
    { url: KAYNAK.ortWasm, ad: "Ses motoru", mb: TAHMINI_MB.ortWasm },
    { url: KAYNAK.fonemJs, ad: "Fonemleyici", mb: TAHMINI_MB.fonemJs },
    { url: KAYNAK.fonemWasm, ad: "Fonemleyici", mb: TAHMINI_MB.fonemWasm },
    { url: KAYNAK.fonemVeri, ad: "Fonem verisi", mb: TAHMINI_MB.fonemVeri },
  ]
  for (const s of VUKUF_SESLERI.filter(v => v.grup === grup)) {
    if (s.motor === "antalia") {
      for (const [ad, mb] of ANTALIA_DOSYALARI) l.push({ url: KAYNAK.antalia(ad), yedekler: [KAYNAK.antaliaYedek(ad)], ad: `${s.ad} sesi`, mb })
      continue
    }
    if (s.motor === "mms") {
      // Model parça parça iner, birleştirilip MMS_MODEL anahtarıyla saklanır
      l.push({ url: MMS_MODEL, parcalar: MMS_PARCALARI, ad: `${s.ad} sesi`, mb: 55 })
      l.push({ url: MMS_MODEL + ".json", ad: `${s.ad} ayarları`, mb: 0.01 })
      // Metin normalleştirici verisi (Antalia ile ortak dosya, aynı anahtar)
      l.push({ url: KAYNAK.antalia("frontend-data.json.gz"), yedekler: [KAYNAK.antaliaYedek("frontend-data.json.gz")], ad: "Metin normalleştirici", mb: 1 })
      continue
    }
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
export async function indirilmisMi(grup = "antalia") {
  try {
    const d = await depo()
    for (const f of dosyaListesi(grup)) if (!(await d.var(f.url))) return false
    eskileriTemizle(d)                        // ör. çıkarılan Fahrettin sesi yer kaplamasın (arka planda)
    return true
  } catch { return false }
}

/** Gruptaki eksik parçaların yaklaşık boyutu (MB) — ör. yalnız motor güncellendiyse küçük */
export async function eksikMb(grup = "antalia") {
  try {
    const d = await depo()
    let t = 0
    for (const f of dosyaListesi(grup)) if (!(await d.var(f.url))) t += f.mb
    return Math.max(1, Math.round(t))
  } catch { return null }
}

/** Eksik parçaları indirir. onIlerleme({ oran, ad, indirilenMb, toplamMb }). sinyal: AbortSignal */
export async function indir(onIlerleme, sinyal, grup = "antalia") {
  const dp = await depo()
  const liste = dosyaListesi(grup)
  const eksik = []
  for (const d of liste) if (!(await dp.var(d.url))) eksik.push(d)
  const toplam = eksik.reduce((t, d) => t + d.mb, 0) || 1
  let biten = 0
  // Bir adres listesinden (asıl → yedek) ilk başarılı yanıt. Hata AYRINTISIYLA (hangi dosya, hangi adım).
  const yanitAl = async (d, adresler) => {
    let sonHata = null
    for (const adres of adresler) {
      try {
        const yy = await fetch(adres, { mode: "cors", credentials: "omit", signal: sinyal })
        // Geliştirme sunucusu / SPA barındırıcısı olmayan dosyaya index.html döndürebiliyor → yok say
        const htmlMi = (yy.headers.get("content-type") || "").includes("text/html")
        if (yy.ok && !htmlMi) return yy
        sonHata = new Error(htmlMi ? `${d.ad}: sunucuda bulunamadı` : `${d.ad}: sunucu ${yy.status} döndürdü`)
        sonHata.adim = "sunucu"; sonHata.url = adres
        console.error("[Vukuf sesi]", adres, yy.status)
      } catch (e) {
        if (sinyal?.aborted) throw e
        sonHata = new Error(`${d.ad}: bağlantı kurulamadı (${e?.message || "ağ hatası"})`)
        sonHata.adim = "baglanti"; sonHata.url = adres
        console.error("[Vukuf sesi]", adres, e)
      }
    }
    throw sonHata || new Error(`${d.ad} indirilemedi`)
  }
  for (const d of eksik) {
    // Parçalı dosya (ör. MMS modeli): parçalar sırayla iner, tek dosya olarak saklanır
    const kaynaklar = d.parcalar ? d.parcalar.map(u => [u]) : [[d.url, ...(d.yedekler || [])]]
    const parcalar = []
    let gelen = 0, tur = "application/octet-stream"
    for (let pi = 0; pi < kaynaklar.length; pi++) {
      const y = await yanitAl(d, kaynaklar[pi])
      if (!d.parcalar) tur = y.headers.get("content-type") || tur
      // İlerleme: parçalıda her parça eşit pay; değilse içerik boyuna göre
      const boy = Number(y.headers.get("content-length")) || (d.mb * 1048576) / kaynaklar.length
      const okuyucu = y.body?.getReader()
      let buParca = 0
      const bildir = () => {
        const oranD = d.parcalar ? (pi + Math.min(1, buParca / boy)) / kaynaklar.length : Math.min(1, gelen / boy)
        const anlik = biten + d.mb * oranD
        onIlerleme?.({ oran: Math.min(1, anlik / toplam), ad: d.ad, indirilenMb: anlik, toplamMb: toplam })
      }
      if (okuyucu) {
        for (;;) {
          const { done, value } = await okuyucu.read()
          if (done) break
          parcalar.push(value); gelen += value.length; buParca += value.length
          bildir()
        }
      } else {
        const ab = new Uint8Array(await y.arrayBuffer())
        parcalar.push(ab); gelen += ab.length; buParca += ab.length
        bildir()
      }
    }
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
  // Eski sürüm parçaları yer kaplamasın
  eskilerTemizlendi = false
  await eskileriTemizle(dp)
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
      if (s.motor === "antalia") { for (const [ad] of ANTALIA_DOSYALARI) await d.kaldir(KAYNAK.antalia(ad)); continue }
      if (s.motor === "mms") { await d.kaldir(MMS_MODEL); await d.kaldir(MMS_MODEL + ".json"); continue }   // normalleştirici verisi Antalia ile ortak, kalır
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
    let ortJsB, ortGlueB, ortWasm, fonemJsB, fonemWasm, fonemVeri
    const t0 = performance.now()
    try {
      [ortJsB, ortGlueB, ortWasm, fonemJsB, fonemWasm, fonemVeri] = await Promise.all([
        arabellek(KAYNAK.ortJs), arabellek(KAYNAK.ortGlue),
        arabellek(KAYNAK.ortWasm), arabellek(KAYNAK.fonemJs), arabellek(KAYNAK.fonemWasm), arabellek(KAYNAK.fonemVeri),
      ])
    } catch (e) { throw new Error(`Kayıtlı dosyalar okunamadı (${e?.message || e})`) }
    const t1 = performance.now()
    const metin = (b) => new TextDecoder().decode(b)
    const y = await iste(is, "kur", {
      ortJs: metin(ortJsB), ortGlue: metin(ortGlueB), ortWasm,
      fonemJs: metin(fonemJsB), fonemWasm, fonemVeri,
    }, [ortWasm, fonemWasm, fonemVeri])
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
      if (sesBul(id)?.motor === "mms") {
        const t0 = performance.now()
        let model, ayarB, veri
        try {
          [model, ayarB, veri] = await Promise.all([
            arabellek(MMS_MODEL), arabellek(MMS_MODEL + ".json"), arabellek(KAYNAK.antalia("frontend-data.json.gz")),
          ])
        } catch (e) { throw new Error(`${sesBul(id).ad} sesi okunamadı (${e?.message || e})`) }
        const t1 = performance.now()
        const ayar = JSON.parse(new TextDecoder().decode(ayarB))
        ayar.inference = { ...(ayar.inference || {}), ...MMS_AYAR }   // tek ses (bkz. başlık)
        const y = await iste(is, "ses", { ses: id, model, ayar, veri }, [model, veri])
        tani.ses[id] = { dosyaMs: Math.round(t1 - t0), kurMs: Math.round(performance.now() - t1), ...(y.olcum || {}) }
        return
      }
      if (sesBul(id)?.motor === "antalia") {
        const t0 = performance.now()
        let b
        try { b = await Promise.all(ANTALIA_DOSYALARI.map(([ad]) => arabellek(KAYNAK.antalia(ad)))) }
        catch (e) { throw new Error(`${sesBul(id).ad} sesi okunamadı (${e?.message || e})`) }
        const t1 = performance.now()
        const [text, cond, flow, vocoder, manifestB, veri] = b
        const y = await iste(is, "ses", {
          ses: id,
          antalia: { text, cond, flow, vocoder, manifest: JSON.parse(new TextDecoder().decode(manifestB)), veri },
        }, [text, cond, flow, vocoder, veri])
        tani.ses[id] = { dosyaMs: Math.round(t1 - t0), kurMs: Math.round(performance.now() - t1), ...(y.olcum || {}) }
        return
      }
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

/* ANTALIA HIZLI KİP: akış (flow) adımı 8 → 4. Sürenin ~%80'i bu adımlarda (Chromium ölçümü:
   2,2 sn ses → flow 652 ms, vocoder 109 ms); model 1/2/4/8 adımla çalışacak biçimde eğitilmiş.
   Cihaz yavaşsa sesliOkuma önce bunu açar (bellek harcamaz), sonra ikinci işçiyi kurar. */
let antaliaAdim = 8
export function hizliKip() {
  if (antaliaAdim <= 4) return false
  antaliaAdim = 4
  return true
}
export const hizliKipMi = () => antaliaAdim <= 4

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
export async function hizTesti(id = "antalia") {
  kuyruguBosalt()
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

const isKuyrugu = []
/** Sıradaki (başlamamış) işleri bırak — ör. hız testi okuma kuyruğunun arkasında beklemesin */
export function kuyruguBosalt() { isKuyrugu.splice(0).forEach(j => j.cz(null)) }                          // { metin, id, olcek, istenir, cz, red }
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
        const y = await iste(is, "sentez", { ses: j.id, metin: j.metin, olcek: j.olcek, adim: sesBul(j.id)?.motor === "antalia" ? antaliaAdim : undefined })
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
  // Seslerin doğal hızı farklı olabilir → ses başına tempo çarpanı
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
