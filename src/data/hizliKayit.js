/* ═══════════════════════════════════════════════════════════════════════════
   VUKUF — HIZLI VİDEO DIŞA AKTARMA (WebCodecs + Mediabunny)
   src/data/hizliKayit.js

   14 Ekim 2026, kullanıcı: "Dışa aktarma süresini ne kadar kısaltabiliriz?" →
   "O zaman buna geçmemiz gerekiyor."

   ESKİ YOL (MediaRecorder): tuval canlı çizilir, tarayıcı saatle kaydeder →
   12 dk'lık sûre 12 dk'da hazırlanır. Yedek olarak duruyor.
   YENİ YOL: kareler tek tek, beklemeden çizilir ve doğrudan donanım kodlayıcısına
   verilir; âyet sesleri OfflineAudioContext ile tek parça hâlinde (anında) birleştirilir
   ve kodlanır. Mediabunny ikisini MP4 dosyasında birleştirir. Çıktı her cihazda MP4.

   NE ZAMAN KULLANILIR: tarayıcı VideoEncoder'ı biliyorsa ve uygun bir görüntü (ve ses
   isteniyorsa ses) kodeği bulunursa. Arka plan galerisindeki VİDEOLAR da (14 Ekim 2026,
   2. adım) <video> ile oynatılmıyor; Mediabunny ile kare kare ÇÖZÜLÜYOR (videoOkuyucuKur)
   → onlar da gerçek zamandan hızlı. Bir galeri videosu bu yolla çözülemezse ya da
   herhangi bir adımda hata olursa çağıran eski (gerçek zamanlı) yola döner.

   Kütüphane yalnız kayıt anında yüklenir (dinamik import) — uygulamanın açılışına yük yok.
   İzleme modu bu dosyayı KULLANMAZ; yalnız Görsel Oluştur'un video kaydı kullanır.
   ═══════════════════════════════════════════════════════════════════════════ */

export const HIZLI_FPS = 30
const SES_HIZI = 48000

/** Tarayıcı hızlı yolu tanıyor mu (eşzamanlı, kaba denetim — arayüz metni için). */
export function hizliKayitOlasi() {
  return typeof window !== "undefined" && typeof window.VideoEncoder === "function"
    && typeof window.VideoFrame === "function"
}

/** Kullanılabilecek kodekleri bulur; bulunamazsa null (eski yola dönülür). */
export async function hizliKodekler(W, H, sesVar) {
  if (!hizliKayitOlasi()) return null
  try {
    const mb = await import("mediabunny")
    const video = await mb.getFirstEncodableVideoCodec(["avc", "vp9", "av1"], { width: W, height: H, frameRate: HIZLI_FPS })
    if (!video) return null
    let ses = null
    if (sesVar) {
      ses = await mb.getFirstEncodableAudioCodec(["aac", "opus"], { numberOfChannels: 2, sampleRate: SES_HIZI })
      if (!ses) return null                     // sesli video istendi, ses kodlanamıyor → eski yol
    }
    return { video, ses }
  } catch { return null }
}

/**
 * GALERİ VİDEOSU OKUYUCU — videoyu kare kare çözer. kare(T): T saniyesindeki kareyi
 * taşıyan tuval (sıralı ileri okumada her kare bir kez çözülür; geri gidilirse — döngü —
 * okuma o noktadan yeniden başlar). Çözülemiyorsa null döner.
 */
export async function videoOkuyucuKur(blob, azamiKenar = 1280) {
  const mb = await import("mediabunny")
  const girdi = new mb.Input({ source: new mb.BlobSource(blob), formats: mb.ALL_FORMATS })
  try {
    const iz = await girdi.getPrimaryVideoTrack()
    if (!iz || !(await iz.canDecode())) { girdi.dispose(); return null }
    const dw = iz.displayWidth, dh = iz.displayHeight
    const k = Math.min(1, azamiKenar / Math.max(dw || 1, dh || 1))
    const w = Math.max(2, Math.round(dw * k / 2) * 2), h = Math.max(2, Math.round(dh * k / 2) * 2)
    // Havuz: elde aynı anda en çok 2 kare tutuluyor (şimdiki + sıradaki) → 4 güvenli
    const sink = new mb.CanvasSink(iz, { width: w, height: h, fit: "fill", poolSize: 4 })
    let it = null, simdiki = null, siradaki = null, bitti = false
    const bastan = (T) => {
      try { it && it.return && it.return() } catch { /* yoksay */ }
      it = sink.canvases(Math.max(0, T)); simdiki = null; siradaki = null; bitti = false
    }
    return {
      async kare(T) {
        if (!it || (simdiki && T < simdiki.timestamp - 0.001)) bastan(T)
        while (!bitti) {
          if (!siradaki) {
            const r = await it.next()
            if (r.done) { bitti = true; break }
            siradaki = r.value
          }
          if (siradaki.timestamp <= T + 0.0005 || !simdiki) { simdiki = siradaki; siradaki = null }
          else break
        }
        return simdiki ? simdiki.canvas : null
      },
      kapat() {
        try { it && it.return && it.return() } catch { /* yoksay */ }
        try { girdi.dispose() } catch { /* yoksay */ }
      },
    }
  } catch { try { girdi.dispose() } catch { /* yoksay */ } return null }
}

/** Âyet seslerini zaman çizelgesine göre TEK bir AudioBuffer'da birleştirir (gerçek zamanlı değil, anında). */
export async function sesleriBirlestir(tamponlar, cizelge, toplam) {
  const OAC = window.OfflineAudioContext || window.webkitOfflineAudioContext
  if (!OAC) return null
  const uzunluk = Math.max(1, Math.ceil(toplam * SES_HIZI))
  const oac = new OAC(2, uzunluk, SES_HIZI)
  let var_ = false
  cizelge.forEach((c, i) => {
    const b = tamponlar[i]
    if (!b) return
    const src = oac.createBufferSource()
    src.buffer = b
    src.connect(oac.destination)
    src.start(c.bas)
    var_ = true
  })
  if (!var_) return null
  return await oac.startRendering()
}

// Arayüze nefes aldır (setTimeout arka sekmede yavaşlıyor; MessageChannel yavaşlamıyor)
const nefes = () => new Promise(cz => {
  const k = new MessageChannel()
  k.port1.onmessage = () => cz()
  k.port2.postMessage(0)
})

/**
 * Kareleri tek tek çizip kodlar, MP4 Blob döndürür. İptal edilirse null.
 *  canvas   : çizilen tuval (önizleme tuvali olabilir)
 *  kareCiz  : async (t) => void — t anındaki kareyi tuvale çizer
 *  ses      : AudioBuffer | null (sesleriBirlestir sonucu)
 *  ilerleme : (oran 0..1, kalanSn) => void
 *  iptal    : () => boolean
 */
export async function hizliKaydet({ canvas, W, H, toplam, kod, kareCiz, ses, ilerleme, iptal }) {
  const mb = await import("mediabunny")
  const cikti = new mb.Output({
    format: new mb.Mp4OutputFormat({ fastStart: "in-memory" }),
    target: new mb.BufferTarget(),
  })
  const bit = W * H >= 1800 * 1000 ? 8000000 : 5000000
  const goruntu = new mb.CanvasSource(canvas, { codec: kod.video, bitrate: bit, keyFrameInterval: 2 })
  cikti.addVideoTrack(goruntu, { frameRate: HIZLI_FPS })
  let sesKaynak = null
  if (ses && kod.ses) {
    sesKaynak = new mb.AudioBufferSource({ codec: kod.ses, bitrate: 128000 })
    cikti.addAudioTrack(sesKaynak)
  }
  await cikti.start()
  try {
    if (sesKaynak) { await sesKaynak.add(ses); sesKaynak.close() }
    const N = Math.max(1, Math.ceil(toplam * HIZLI_FPS))
    const bas = performance.now()
    for (let i = 0; i < N; i++) {
      if (iptal()) { await cikti.cancel(); return null }
      const t = i / HIZLI_FPS
      await kareCiz(t)
      await goruntu.add(t, 1 / HIZLI_FPS)
      if (i % 6 === 5 || i === N - 1) {
        const oran = (i + 1) / N
        const gecen = (performance.now() - bas) / 1000
        ilerleme(oran, oran > 0.03 ? Math.max(0, gecen / oran - gecen) : null)
        await nefes()
      }
    }
    goruntu.close()
    await cikti.finalize()
  } catch (e) {
    try { await cikti.cancel() } catch { /* yoksay */ }
    throw e
  }
  return new Blob([cikti.target.buffer], { type: "video/mp4" })
}
