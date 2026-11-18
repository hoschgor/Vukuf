/* ═══════════════════════════════════════════════════════════════════════════
   VUKUF — EKRAN UYANIK (otomatik kilitlenmesin)
   src/data/ekranUyanik.js

   Otomatik kaydırma, sesli okuma ve âyet takibi sürerken ekrana dokunulmadığı için telefon
   ekranı kilitliyordu. Ortak bir istek sayacı: en az bir neden açıkken ekran uyanık tutulur.
   • Screen Wake Lock API: tarayıcı kilidi kendisi bırakırsa ("release") ya da sekme gizlenip
     geri gelirse yeniden istenir.
   • iPhone/iPad: ana ekrana eklenmiş uygulamada Wake Lock eski sürümlerde istek kabul edip
     etkisiz kalabiliyor; bu yüzden ek olarak görünmez, sessiz, döngülü küçük bir video
     oynatılır (bilinen yöntem). Wake Lock hiç yoksa her cihazda bu yol kullanılır.
   Kullanım: useEkranUyanik("ad", kosul)
   ═══════════════════════════════════════════════════════════════════════════ */

import { useEffect } from "react"

const VIDEO = "data:video/mp4;base64,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"

const nedenler = new Set()
let kilit = null, isteniyor = false, video = null, kuruldu = false

const ios = () => typeof navigator !== "undefined" &&
  (/iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1))
const gerekli = () => nedenler.size > 0 && typeof document !== "undefined" && document.visibilityState === "visible"

async function kilitAl() {
  if (kilit || isteniyor || !gerekli() || !navigator.wakeLock) return
  isteniyor = true
  try {
    const k = await navigator.wakeLock.request("screen")
    if (!gerekli()) { try { await k.release() } catch { /* yoksay */ } }
    else {
      kilit = k
      k.addEventListener("release", () => {
        if (kilit === k) kilit = null
        setTimeout(() => { if (gerekli()) guncelle() }, 400)   // tarayıcı bıraktıysa yeniden
      })
    }
  } catch { kilit = null; videoBaslat() }                       // izin yok / desteklenmiyor → video
  finally { isteniyor = false }
}

function videoBaslat() {
  if (typeof document === "undefined" || !gerekli()) return
  if (!video) {
    video = document.createElement("video")
    video.setAttribute("playsinline", ""); video.setAttribute("muted", ""); video.setAttribute("aria-hidden", "true")
    video.muted = true; video.loop = true; video.playsInline = true; video.src = VIDEO
    video.style.cssText = "position:fixed;left:0;top:0;width:1px;height:1px;opacity:0;pointer-events:none;z-index:-1"
    document.body.appendChild(video)
  }
  const p = video.play()
  if (p && p.catch) p.catch(() => {
    // Dokunuş gerekiyorsa ilk dokunuşta yeniden dene
    const bir = () => { document.removeEventListener("touchend", bir, true); document.removeEventListener("click", bir, true); if (gerekli()) videoBaslat() }
    document.addEventListener("touchend", bir, true); document.addEventListener("click", bir, true)
  })
}
function videoDurdur() { try { video && video.pause() } catch { /* yoksay */ } }

function guncelle() {
  if (gerekli()) {
    kilitAl()
    if (ios() || !navigator.wakeLock) videoBaslat()
  } else {
    if (kilit) { const k = kilit; kilit = null; k.release().catch(() => {}) }
    videoDurdur()
  }
}

function kur() {
  if (kuruldu || typeof document === "undefined") return
  kuruldu = true
  document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible") kilit = null; guncelle() })
}

/** ad: neden adı (ör. "oto-kaydirma"), aktif: uyanık tutulsun mu */
export function ekranUyanikIste(ad, aktif) {
  kur()
  if (aktif) nedenler.add(ad); else nedenler.delete(ad)
  guncelle()
}

export function useEkranUyanik(ad, aktif) {
  useEffect(() => {
    ekranUyanikIste(ad, !!aktif)
    return () => ekranUyanikIste(ad, false)
  }, [ad, aktif])
}
