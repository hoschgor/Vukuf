/* ═══════════════════════════════════════════════════════════════════════════
   VUKUF — DİYANET TV (uygulama geneli canlı yayın durumu)
   src/data/diyanetTv.jsx

   14 Kasım 2026 — kullanıcı: "Burada ekran içinde ekran ile sürekli oynatmaya devam
   edebiliriz belki, alternatif olarak da sesin sürekli çalması ile ilgili düzenleme
   yapılabilir." Radyo gibi UYGULAMA KÖKÜNDE (App.jsx → <DiyanetTvSaglayici>): Ekstralar'dan
   çıkılınca yayın kesilmez, öbür ekranlarda küçük yüzen pencerede sürer
   (components/TvKatmani.jsx). Masaüstü Chrome/Edge'de ayrıca gerçek "ekran içinde ekran"
   penceresi (Document Picture-in-Picture): uygulama ya da sekme değişse de pencere üstte kalır.

   YALNIZ SES YOK (bilerek): yayın YouTube'un gömme oynatıcısıyla veriliyor; YouTube'un
   kuralları oynatıcının görünür kalmasını (en az 200×200 px) istiyor ve tarayıcılar arka
   plandaki YouTube'u zaten durduruyor. Bu yüzden "sürekli çalma" = görünür küçük pencere.

   Ses çakışması: TV başlarken Kur'ân oynatıcısı, radyo ve Kur'an Dinle duraklar; TV açıkken
   onlardan biri çalmaya başlarsa TV duraklatılır (enablejsapi=1 → postMessage "pauseVideo").
   ═══════════════════════════════════════════════════════════════════════════ */

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react"
import { useOynatici } from "./oynatici"
import { useRadyo } from "./radyo"
import { useKuranDinle } from "./kuranDinle"

export const TV_VIDEO_KIMLIK = "8KOE6__ogN8"              // diyanet.tv/canli-izle'nin gömdüğü yayın (Kasım 2026)
export const TV_KANAL_KIMLIK = "UC3d1AdmvAP6Jq16-WpD086g"  // YouTube · DiyanetTV (@diyanettv)
export const TV_RESMI_SITE = "https://www.diyanet.tv/canli-izle/"
const KAYNAK_ANAHTAR = "vukuf-diyanet-tv-kaynak"

const ORTAK = "autoplay=1&playsinline=1&rel=0&modestbranding=1&enablejsapi=1"
export const tvAdresi = (kaynak) => (kaynak === "kanal"
  ? `https://www.youtube-nocookie.com/embed/live_stream?channel=${TV_KANAL_KIMLIK}&${ORTAK}`
  : `https://www.youtube-nocookie.com/embed/${TV_VIDEO_KIMLIK}?${ORTAK}`)

export const pipDestekli = () => typeof window !== "undefined" && "documentPictureInPicture" in window

const Baglam = createContext(null)
export function useDiyanetTv() { return useContext(Baglam) }

export function DiyanetTvSaglayici({ children }) {
  const player = useOynatici()
  const radyo = useRadyo()
  const dinle = useKuranDinle()
  const [acik, setAcik] = useState(false)
  const [kaynak, setKaynakD] = useState(() => {
    try { return localStorage.getItem(KAYNAK_ANAHTAR) === "kanal" ? "kanal" : "video" } catch { return "video" }
  })
  const [yuva, setYuva] = useState(null)       // Ekstralar kartındaki yer (varsa yayın orada görünür)
  const [pip, setPip] = useState(null)         // açık ekran-içinde-ekran penceresi
  const cerceveRef = useRef(null)
  const pipRef = useRef(null); pipRef.current = pip

  const digerleriSustur = useCallback(() => {
    try { if (player && player.durum === "caliyor") player.duraklat() } catch { /* yoksay */ }
    try { if (radyo && radyo.durum === "caliyor") radyo.duraklat() } catch { /* yoksay */ }
    try { if (dinle && dinle.durum === "caliyor") dinle.duraklat() } catch { /* yoksay */ }
  }, [player, radyo, dinle])

  const baslat = useCallback(() => { digerleriSustur(); setAcik(true) }, [digerleriSustur])
  const kapat = useCallback(() => {
    setAcik(false)
    const w = pipRef.current
    if (w) { try { w.close() } catch { /* yoksay */ } }
    setPip(null)
  }, [])
  const setKaynak = useCallback((k) => {
    setKaynakD(k)
    try { localStorage.setItem(KAYNAK_ANAHTAR, k) } catch { /* yoksay */ }
  }, [])

  // Masaüstü: gerçek "ekran içinde ekran" penceresi (dokunuştan çağrılmalı)
  const pipAc = useCallback(async () => {
    if (!pipDestekli() || pipRef.current) return
    try {
      const w = await window.documentPictureInPicture.requestWindow({ width: 480, height: 270 })
      try {
        w.document.title = "Diyanet TV"
        w.document.body.style.cssText = "margin:0;background:#000;overflow:hidden"
      } catch { /* yoksay */ }
      w.addEventListener("pagehide", () => setPip(p => (p === w ? null : p)))
      setPip(w)
    } catch { /* izin verilmedi / desteklenmiyor */ }
  }, [])
  const pipKapat = useCallback(() => {
    const w = pipRef.current
    if (w) { try { w.close() } catch { /* yoksay */ } }
    setPip(null)
  }, [])

  // TV açıkken başka bir ses başlarsa TV dursun
  const sesCaliyor = (player?.durum === "caliyor") || (radyo?.durum === "caliyor") || (dinle?.durum === "caliyor")
  useEffect(() => {
    if (!acik || !sesCaliyor) return
    try {
      cerceveRef.current?.contentWindow?.postMessage(JSON.stringify({ event: "command", func: "pauseVideo", args: "" }), "*")
    } catch { /* yoksay */ }
  }, [acik, sesCaliyor])

  const deger = useMemo(() => ({
    acik, kaynak, yuva, pip, cerceveRef,
    baslat, kapat, setKaynak, setYuva, pipAc, pipKapat,
  }), [acik, kaynak, yuva, pip, baslat, kapat, setKaynak, pipAc, pipKapat])

  return <Baglam.Provider value={deger}>{children}</Baglam.Provider>
}
