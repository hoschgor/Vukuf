/* ═══════════════════════════════════════════════════════════════════════════
   VUKUF — VİDEO DÖNÜŞTÜRÜCÜ (galeri için, cihazda)
   src/data/videoDonustur.js

   13 Ekim 2026, kullanıcı: "farklı video formatları da desteklenebilmeli, geniş
   bir skala sunmalı."

   NE YAPAR: tarayıcının doğrudan oynatamadığı (AVI, WMV, FLV, MPEG-2, bazı MKV
   ve HEVC…) ya da 150 MB'ı aşan videoları cihazda MP4'e (H.264) çevirir
   (H.264 çözemeyen tarayıcıda WebM/VP8):
     • sessiz (ses izi atılır — arka planda zaten sessiz oynuyor)
     • uzun kenar en çok 1280 px, en çok 30 kare/sn
     • en çok ilk 2 dakika (slaytta bir video zaten en çok 2 dk kalıyor)
   Sonuç galeriye normal bir video olarak eklenir.

   MOTOR: ffmpeg.wasm (@ffmpeg/ffmpeg + @ffmpeg/util, npm). Çekirdek (~31 MB)
   YALNIZ İLK DÖNÜŞTÜRMEDE CDN'den indirilir; uygulama paketine girmez, Vercel
   trafiğine yük olmaz. Sonrasında tarayıcı önbelleğinden gelir. Tek iş parçacıklı
   çekirdek kullanılıyor: SharedArrayBuffer / COOP-COEP başlığı gerekmez.
   Dosya belleğe KOPYALANMIYOR (WORKERFS ile bağlanıyor) → büyük videolar da olur.

   İŞ SIRASI MODÜL DÜZEYİNDE: düzenleyici kapansa da dönüştürme sürer; açılınca
   ilerleme yine görünür (useDonusturme).
   ═══════════════════════════════════════════════════════════════════════════ */

import { useSyncExternalStore } from "react"
import { galeriyeEkle } from "./izlemeGaleri"
import { ayarOku, ayarYaz } from "./izlemeAyar"

const CEKIRDEK_SURUM = "0.12.10"
const ortam = (typeof import.meta !== "undefined" && import.meta.env) || {}
const CEKIRDEK = ortam.VITE_FFMPEG_CEKIRDEK || `https://cdn.jsdelivr.net/npm/@ffmpeg/core@${CEKIRDEK_SURUM}/dist/esm`
export const DONUSTURUCU_MB = 31
export const AZAMI_KAYNAK_MB = 2048
const AZAMI_SN = 120

let motorEl = null, motorSoz = null
let kuyruk = []
let durdur = false
let durum = { calisiyor: false, asama: "", oran: 0, sira: 0, adet: 0, ad: "", biten: 0, basarisiz: [], hata: "" }
const dinleyiciler = new Set()
function yay(p) { durum = { ...durum, ...p }; dinleyiciler.forEach(f => f()) }

export function useDonusturme() {
  return useSyncExternalStore(
    (f) => { dinleyiciler.add(f); return () => dinleyiciler.delete(f) },
    () => durum, () => durum,
  )
}

async function motor() {
  if (motorEl) return motorEl
  if (!motorSoz) {
    motorSoz = (async () => {
      const [{ FFmpeg }, { toBlobURL }] = await Promise.all([import("@ffmpeg/ffmpeg"), import("@ffmpeg/util")])
      yay({ asama: "indiriliyor", oran: 0 })
      const coreURL = await toBlobURL(`${CEKIRDEK}/ffmpeg-core.js`, "text/javascript")
      const wasmURL = await toBlobURL(`${CEKIRDEK}/ffmpeg-core.wasm`, "application/wasm", true,
        ({ received, total }) => { if (total > 0) yay({ oran: Math.min(1, received / total) }) })
      const f = new FFmpeg()
      await f.load({ coreURL, wasmURL, ...(ortam.VITE_FFMPEG_ISCI ? { classWorkerURL: ortam.VITE_FFMPEG_ISCI } : {}) })
      motorEl = f
      return f
    })().catch((e) => { motorSoz = null; throw e })
  }
  return motorSoz
}

const sn = (h, m, s) => Number(h) * 3600 + Number(m) * 60 + Number(s)

/* Çıktı biçimi: H.264/MP4 hemen her yerde oynar (iPhone dahil). Kodekleri eksik
   tarayıcılarda (bazı Linux Chromium / Firefox kurulumları) H.264 çözülemiyor →
   o cihazda VP8/WebM üretilir. Galeri cihaza özel olduğu için bu yeterli. */
function ciktiBicimi() {
  let h264 = true
  try { h264 = !!document.createElement("video").canPlayType('video/mp4; codecs="avc1.42E01E"') } catch { /* yoksay */ }
  return h264
    ? { ad: "cikti.mp4", tur: "video/mp4", uzanti: "mp4",
        kodek: ["-c:v", "libx264", "-preset", "superfast", "-crf", "27", "-pix_fmt", "yuv420p", "-movflags", "+faststart"] }
    : { ad: "cikti.webm", tur: "video/webm", uzanti: "webm",
        kodek: ["-c:v", "libvpx", "-deadline", "realtime", "-cpu-used", "8", "-b:v", "1800k", "-pix_fmt", "yuv420p"] }
}

async function tekDonustur(f, dosya, no) {
  const dizin = `/girdi${no}`
  let sure = 0
  const gunluk = ({ message }) => {
    const d = !sure && /Duration:\s*(\d+):(\d+):([\d.]+)/.exec(message || "")
    if (d) sure = Math.min(AZAMI_SN, sn(d[1], d[2], d[3])) || 0
    const t = /time=\s*(\d+):(\d+):([\d.]+)/.exec(message || "")
    if (t && sure > 0) yay({ oran: Math.min(1, sn(t[1], t[2], t[3]) / sure) })
  }
  f.on("log", gunluk)
  const cikti = ciktiBicimi()
  let bagli = false
  try {
    await f.createDir(dizin)
    await f.mount("WORKERFS", { files: [dosya] }, dizin)
    bagli = true
    const kod = await f.exec([
      "-i", `${dizin}/${dosya.name}`,
      "-t", String(AZAMI_SN),
      "-map", "0:v:0", "-an", "-sn", "-dn",
      "-vf", "scale=w='min(1280,iw)':h='min(1280,ih)':force_original_aspect_ratio=decrease:force_divisible_by=2",
      "-fpsmax", "30",
      ...cikti.kodek,
      cikti.ad,
    ])
    if (kod !== 0) throw new Error(`ffmpeg ${kod}`)
    const veri = await f.readFile(cikti.ad)
    return new File([veri], (dosya.name || "video").replace(/\.[^.]+$/, "") + "." + cikti.uzanti, { type: cikti.tur })
  } finally {
    f.off("log", gunluk)
    try { await f.deleteFile(cikti.ad) } catch { /* yoksay */ }
    if (bagli) { try { await f.unmount(dizin) } catch { /* yoksay */ } }
    try { await f.deleteDir(dizin) } catch { /* yoksay */ }
  }
}

/* Dosyaları sıraya ekler; sıra boşalana kadar birer birer dönüştürüp galeriye ekler. */
export function donusturVeEkle(dosyalar) {
  const yeni = Array.from(dosyalar || []).filter(Boolean)
  if (!yeni.length) return
  kuyruk.push(...yeni)
  if (durum.calisiyor) { yay({ adet: durum.adet + yeni.length }); return }
  durdur = false
  yay({ calisiyor: true, asama: "hazirlaniyor", oran: 0, sira: 0, adet: yeni.length, ad: "", biten: 0, basarisiz: [], hata: "" })
  calistir()
}

async function calistir() {
  let no = 0
  try {
    const f = await motor()
    while (kuyruk.length && !durdur) {
      const dosya = kuyruk.shift()
      no++
      yay({ asama: "donusturuluyor", oran: 0, sira: durum.sira + 1, ad: dosya.name })
      try {
        if (dosya.size > AZAMI_KAYNAK_MB * 1024 * 1024) throw new Error("çok büyük")
        const cikan = await tekDonustur(motorEl || f, dosya, no)
        const ids = await galeriyeEkle([cikan])
        if (!ids.length) throw new Error("eklenemedi")
        ayarYaz("izleme", { galeri: [...(ayarOku().izleme.galeri || []), ...ids] })
        yay({ biten: durum.biten + 1 })
      } catch (e) {
        if (durdur) break
        yay({ basarisiz: [...durum.basarisiz, dosya.name] })
        // ffmpeg düzgün bitip hata koduyla döndüyse motor sağlam. Başka bir hata
        // (bellek, çökme) ise sonraki dosyayı bozmasın diye motor yeniden kurulur.
        const msg = String((e && e.message) || "")
        if (!/^(ffmpeg|eklenemedi|çok büyük)/.test(msg)) {
          try { motorEl && motorEl.terminate() } catch { /* yoksay */ }
          motorEl = null; motorSoz = null
          if (kuyruk.length) await motor()
        }
      }
    }
  } catch {
    if (!durdur) yay({ hata: "indirilemedi" })
  } finally {
    kuyruk = []
    yay({ calisiyor: false, asama: "", oran: 0, ad: "" })
  }
}

/* Süren dönüştürmeyi keser (o anki video eklenmez; eklenmiş olanlar kalır). */
export function donusturmeyiDurdur() {
  durdur = true
  kuyruk = []
  try { motorEl && motorEl.terminate() } catch { /* yoksay */ }
  motorEl = null; motorSoz = null
}

/* Bildirim kartı kapatılınca son sonuç (başarısızlar / hata) temizlenir. */
export function donusturmeSonucunuTemizle() {
  if (!durum.calisiyor) yay({ basarisiz: [], hata: "", biten: 0, adet: 0, sira: 0 })
}
