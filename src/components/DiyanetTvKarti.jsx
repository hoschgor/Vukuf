/* ═══════════════════════════════════════════════════════════════════════════
   VUKUF — DİYANET TV (Ekstralar → canlı yayın)
   src/components/DiyanetTvKarti.jsx

   14 Kasım 2026 — kullanıcı: "Buraya Diyanet TV'yi ekleyebiliyor muyuz, ekstralar içinde
   bir bölüm yapıp Diyanet TV'nin eğer yasak değilse yayınını verebiliriz."

   KAYNAK: Diyanet TV'nin resmî sitesi (diyanet.tv/canli-izle) canlı yayını kendi YouTube
   kanalındaki (DiyanetTV · @diyanettv) yayından, YouTube oynatıcısı gömerek veriyor. Burada
   da AYNI resmî yayın, AYNI yolla (YouTube'un gömme oynatıcısı) gösteriliyor — yayın
   kopyalanmıyor, başka bir sunucudan çekilmiyor; reklam, logo ve yayın hakları YouTube ve
   kanal sahibinde kalıyor. (IPTV listelerindeki .m3u8 adresleri resmî değil, kullanılmadı.)
   youtube-nocookie.com: izleyene "İzle"ye basmadan çerez bırakılmaz; oynatıcı da ancak
   "İzle"ye basılınca yüklenir (sayfa açılışı ağırlaşmasın, veri harcanmasın).

   İKİ KAYNAK: (1) resmî sitenin gömdüğü video kimliği; (2) yayın yeniden başlatılıp kimlik
   değişirse diye kanalın "şu anki canlı yayını" (live_stream?channel=…). Biri açılmazsa
   kart altındaki düğmeyle öbürüne geçilir; resmî siteye bağlantı da duruyor.

   SES ÇAKIŞMASI: TV başlarken Kur'ân oynatıcısı, radyo ve Kur'an Dinle duraklatılır. TV
   açıkken onlardan biri çalmaya başlarsa TV duraklatılır (enablejsapi=1 → postMessage
   "pauseVideo"; YouTube betiği yüklenmeden çalışır).
   Video olduğu için küçük hap yok: kart kapanınca ya da Ekstralar'dan çıkınca yayın durur.
   ═══════════════════════════════════════════════════════════════════════════ */

import { useEffect, useRef, useState } from "react"
import { Tv, Play, ExternalLink, RefreshCw, X } from "lucide-react"
import { Kart, useBolum } from "./EkstraKart"
import { useRadyo } from "../data/radyo"
import { useKuranDinle } from "../data/kuranDinle"
import { useOynatici } from "../data/oynatici"

const VIDEO_KIMLIK = "8KOE6__ogN8"                  // diyanet.tv/canli-izle'nin gömdüğü yayın (Kasım 2026)
const KANAL_KIMLIK = "UC3d1AdmvAP6Jq16-WpD086g"     // YouTube · DiyanetTV (@diyanettv)
const RESMI_SITE = "https://www.diyanet.tv/canli-izle/"
const KAYNAK_ANAHTAR = "vukuf-diyanet-tv-kaynak"

const ORTAK = "autoplay=1&playsinline=1&rel=0&modestbranding=1&enablejsapi=1"
const adres = (kaynak) => (kaynak === "kanal"
  ? `https://www.youtube-nocookie.com/embed/live_stream?channel=${KANAL_KIMLIK}&${ORTAK}`
  : `https://www.youtube-nocookie.com/embed/${VIDEO_KIMLIK}?${ORTAK}`)

export default function DiyanetTvKarti({ theme }) {
  const bolum = useBolum("tv")
  const ac = theme.accent
  const radyo = useRadyo()
  const dinle = useKuranDinle()
  const player = useOynatici()
  const [acik, setAcik] = useState(false)            // oynatıcı yüklü mü
  const [kaynak, setKaynakD] = useState(() => {
    try { return localStorage.getItem(KAYNAK_ANAHTAR) === "kanal" ? "kanal" : "video" } catch { return "video" }
  })
  const setKaynak = (k) => { setKaynakD(k); try { localStorage.setItem(KAYNAK_ANAHTAR, k) } catch { /* yoksay */ } }
  const cerceveRef = useRef(null)

  // Kart kapanınca oynatıcı da kapansın (yeniden açılınca "İzle" beklenir)
  const kartAcik = bolum[0]
  useEffect(() => { if (!kartAcik) setAcik(false) }, [kartAcik])

  const baslat = () => {
    try { if (player && player.durum === "caliyor") player.duraklat() } catch { /* yoksay */ }
    try { if (radyo && radyo.durum === "caliyor") radyo.duraklat() } catch { /* yoksay */ }
    try { if (dinle && dinle.durum === "caliyor") dinle.duraklat() } catch { /* yoksay */ }
    setAcik(true)
  }

  // TV açıkken başka bir ses başlarsa TV dursun
  const sesCaliyor = (player?.durum === "caliyor") || (radyo?.durum === "caliyor") || (dinle?.durum === "caliyor")
  useEffect(() => {
    if (!acik || !sesCaliyor) return
    try {
      cerceveRef.current?.contentWindow?.postMessage(JSON.stringify({ event: "command", func: "pauseVideo", args: "" }), "*")
    } catch { /* yoksay */ }
  }, [acik, sesCaliyor])

  const ozet = acik ? "Canlı yayın açık" : undefined
  const kucukDugme = {
    display: "inline-flex", alignItems: "center", gap: "5px", padding: "6px 10px", borderRadius: "999px",
    border: `1px solid ${theme.border}`, background: "transparent", color: theme.textSecondary,
    fontFamily: "inherit", fontSize: "11.5px", cursor: "pointer", textDecoration: "none", whiteSpace: "nowrap",
  }

  return (
    <Kart theme={theme} Ikon={Tv} baslik="Diyanet TV" alt="Canlı yayın" bolum={bolum} ozet={ozet}>
      <div style={{
        position: "relative", width: "100%", aspectRatio: "16 / 9", borderRadius: "12px", overflow: "hidden",
        background: "#0b0b0b", border: `1px solid ${theme.border}`,
      }}>
        {acik ? (
          <iframe ref={cerceveRef} key={kaynak} src={adres(kaynak)} title="Diyanet TV canlı yayın"
            allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowFullScreen
            referrerPolicy="strict-origin-when-cross-origin"
            style={{ position: "absolute", inset: 0, width: "100%", height: "100%", border: 0 }} />
        ) : (
          <button onClick={baslat} aria-label="Diyanet TV canlı yayını izle"
            style={{
              position: "absolute", inset: 0, width: "100%", height: "100%", border: "none", padding: 0, cursor: "pointer",
              display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "10px",
              background: `radial-gradient(circle at 50% 45%, ${ac}55, #0b0b0b 70%)`, color: "#fff", fontFamily: "inherit",
            }}>
            <span style={{
              width: "58px", height: "58px", borderRadius: "50%", background: ac, display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: "0 6px 20px rgba(0,0,0,0.35)",
            }}>
              <Play size={26} style={{ marginLeft: "3px" }} />
            </span>
            <span style={{ fontSize: "14px", fontWeight: 600, letterSpacing: "0.2px" }}>Canlı yayını izle</span>
            <span style={{ display: "inline-flex", alignItems: "center", gap: "5px", fontSize: "10px", letterSpacing: "0.08em", fontWeight: 700, color: "#ff8a80" }}>
              <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#e53935" }} /> CANLI
            </span>
          </button>
        )}
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "6px", marginTop: "10px" }}>
        {acik && (
          <button onClick={() => setAcik(false)} style={kucukDugme} title="Yayını kapat">
            <X size={13} /> Kapat
          </button>
        )}
        <button onClick={() => { setKaynak(kaynak === "video" ? "kanal" : "video"); if (!acik) baslat() }} style={kucukDugme}
          title={kaynak === "video" ? "Kanalın şu anki canlı yayınını aç" : "Resmî sitedeki yayını aç"}>
          <RefreshCw size={13} /> {kaynak === "video" ? "Açılmazsa: kanalın canlı yayını" : "Resmî sitedeki yayına dön"}
        </button>
        <a href={RESMI_SITE} target="_blank" rel="noopener noreferrer" style={kucukDugme} title="diyanet.tv">
          <ExternalLink size={13} /> Resmî site
        </a>
      </div>
      <div style={{ fontSize: "10.5px", color: theme.textSecondary, lineHeight: 1.45, margin: "8px 2px 0" }}>
        Yayın, Diyanet TV'nin resmî YouTube kanalından ve resmî sitesindeki gibi YouTube oynatıcısıyla gösterilir.
        Yayın başlayınca öbür sesler duraklar. Ekstralar'dan çıkıldığında yayın kapanır.
      </div>
    </Kart>
  )
}
