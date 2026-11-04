/* ═══════════════════════════════════════════════════════════════════════════
   VUKUF — UYGULAMA GENELİ RADYO (Ekstralar → Diyanet radyoları)
   src/data/radyo.jsx

   3 Kasım 2026 — kullanıcı: "Radyolardan biri açık olduğunda devamlı oynatılabilsin;
   diğer kısımlardaki devamlı oynatma efektinin benzer versiyonunu burada da yapabiliriz
   fakat görseli buraya özel olsun, Ekstralar kısmından geldiği belli olsun."

   Ses öğesi UYGULAMA KÖKÜNDE (App.jsx → <RadyoSaglayici>), Kur'ân oynatıcısı gibi:
   Ekstralar sayfasından çıkılınca radyo susmaz; öbür ekranlarda küçük radyo hapı
   (components/MiniRadyo.jsx) görünür. Radyo başlarken Kur'ân oynatıcısı çalıyorsa
   duraklatılır; Kur'ân oynatıcısı başlarsa radyo duraklatılır (iki ses üst üste binmez).

   Yayın adresleri resmî değil, herkese açık listelerden (Kasım 2026); değişirse
   YAYINLAR dizisini güncellemek yeterli. HLS (.m3u8): iPhone/iPad ve Android'de
   tarayıcı kendisi çalar; çoğu masaüstü tarayıcı çalamaz (Ekstralar'da resmî site
   bağlantısı var).
   ═══════════════════════════════════════════════════════════════════════════ */

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react"
import { useOynatici } from "./oynatici"
import { zamanlayiciOlustur, useZamanlayici } from "./otomatikDurdurma"

/* OTOMATİK KAPANMA (4 Kasım 2026, kullanıcı: "Radyo dinlemede de otomatik kapanma
   verelim") — süre dolunca radyo kapanır. Sayaç modül düzeyinde: Ekstralar'dan
   çıkılınca da sürer; radyo elle kapatılınca iptal olur. */
let radyoKapat = () => {}
export const radyoZamanlayici = zamanlayiciOlustur(() => radyoKapat())

export const YAYINLAR = [
  { id: "diyanet", ad: "Diyanet Radyo", kisa: "Diyanet Radyo", aciklama: "Sohbet, belgesel ve dinî programlar",
    url: "https://eustr73.mediatriple.net/videoonlylive/mtikoimxnztxlive/broadcast_5e3c1171d7d2a.smil/playlist.m3u8",
    site: "https://diyanetradyo.com/canli-dinle" },
  { id: "kuran", ad: "Diyanet Kur'an Radyo", kisa: "Kur'an Radyo", aciklama: "Kur'ân-ı Kerîm tilaveti ve meal",
    url: "https://eustr73.mediatriple.net/videoonlylive/mtikoimxnztxlive/broadcast_5e3c14192aa92.smil/playlist.m3u8",
    site: "https://diyanetkuranradyo.com/canli-dinle" },
  { id: "risalet", ad: "Diyanet Risalet Radyo", kisa: "Risalet Radyo", aciklama: "Siyer ve hadis programları",
    url: "https://eustr73.mediatriple.net/videoonlylive/mtikoimxnztxlive/broadcast_5e3c1520b2626.smil/playlist.m3u8",
    site: "https://risaletradyo.com/canli-dinle" },
]

const RadyoBaglami = createContext(null)
export function useRadyo() { return useContext(RadyoBaglami) }

export function RadyoSaglayici({ children }) {
  const player = useOynatici()
  const sesRef = useRef(null)
  const [istasyonId, setIstasyonId] = useState(null)   // açık yayın (null = radyo kapalı)
  const [durum, setDurum] = useState("kapali")        // kapali | yukleniyor | caliyor | duraklatildi | hata

  const ses = useCallback(() => {
    if (!sesRef.current && typeof Audio !== "undefined") {
      const a = new Audio()
      a.preload = "none"
      a.addEventListener("playing", () => setDurum("caliyor"))
      a.addEventListener("waiting", () => setDurum(d => (d === "kapali" ? d : "yukleniyor")))
      a.addEventListener("pause", () => setDurum(d => (d === "kapali" || d === "hata" ? d : "duraklatildi")))
      a.addEventListener("error", () => setDurum(d => (d === "kapali" ? d : "hata")))
      sesRef.current = a
    }
    return sesRef.current
  }, [])

  const kurDurdur = useCallback(() => {
    try { if (player && player.durum === "caliyor") player.duraklat() } catch { /* yoksay */ }
  }, [player])

  const cal = useCallback((id) => {
    const y = YAYINLAR.find(x => x.id === id)
    const a = ses()
    if (!y || !a) return
    kurDurdur()
    setIstasyonId(id)
    setDurum("yukleniyor")
    if (a.src !== y.url) a.src = y.url
    a.play().catch(() => setDurum("hata"))
    try {
      if ("mediaSession" in navigator && window.MediaMetadata) {
        navigator.mediaSession.metadata = new window.MediaMetadata({ title: y.ad, artist: "Canlı yayın · Vukuf Ekstralar", album: "Vukuf" })
      }
    } catch { /* yoksay */ }
  }, [ses, kurDurdur])
  const duraklat = useCallback(() => { try { sesRef.current?.pause() } catch { /* yoksay */ } }, [])
  const devam = useCallback(() => {
    const a = sesRef.current
    if (!a || !istasyonId) return
    kurDurdur()
    setDurum("yukleniyor")
    a.play().catch(() => setDurum("hata"))
  }, [istasyonId, kurDurdur])
  const kapat = useCallback(() => {
    const a = sesRef.current
    radyoZamanlayici.iptal()
    setDurum("kapali")
    setIstasyonId(null)
    if (a) { try { a.pause(); a.removeAttribute("src"); a.load() } catch { /* yoksay */ } }
  }, [])

  radyoKapat = kapat
  const uyku = useZamanlayici(radyoZamanlayici)

  // Kur'ân oynatıcısı başlarsa radyo duraklar
  useEffect(() => {
    if (player && player.durum === "caliyor" && durum === "caliyor") duraklat()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [player?.durum])

  const deger = useMemo(() => ({
    istasyon: YAYINLAR.find(x => x.id === istasyonId) || null,
    durum, cal, duraklat, devam, kapat, uyku,
  }), [istasyonId, durum, cal, duraklat, devam, kapat, uyku.dk, uyku.bitis])

  return <RadyoBaglami.Provider value={deger}>{children}</RadyoBaglami.Provider>
}
