/* ═══════════════════════════════════════════════════════════════════════════
   VUKUF — DİYANET TV (Ekstralar → canlı yayın)
   src/components/DiyanetTvKarti.jsx

   14 Kasım 2026 — kullanıcı: "Buraya Diyanet TV'yi ekleyebiliyor muyuz, ekstralar içinde
   bir bölüm yapıp Diyanet TV'nin eğer yasak değilse yayınını verebiliriz."

   KAYNAK: Diyanet TV'nin resmî sitesi (diyanet.tv/canli-izle) canlı yayını kendi YouTube
   kanalındaki (DiyanetTV · @diyanettv) yayından, YouTube oynatıcısı gömerek veriyor. Burada
   da AYNI resmî yayın, AYNI yolla (YouTube'un gömme oynatıcısı) gösteriliyor — yayın
   kopyalanmıyor, başka bir sunucudan çekilmiyor. (IPTV listelerindeki .m3u8 adresleri resmî
   değil, kullanılmadı.) youtube-nocookie.com; oynatıcı "İzle"ye basılınca yüklenir.

   SÜREKLİ OYNATMA (14 Kasım 2026, kullanıcı: "ekran içinde ekran ile sürekli oynatmaya
   devam edebiliriz"): oynatıcının kendisi uygulama kökünde (data/diyanetTv.jsx +
   components/TvKatmani.jsx). Bu kart yalnız YER tutar: oynatıcı kart açıkken buranın tam
   üstüne oturur; kart kapanınca ya da başka ekrana geçilince köşede küçük pencerede sürer.
   Masaüstü Chrome/Edge'de "Ekran içinde ekran" ile ayrı, hep üstte kalan pencereye alınır.
   ═══════════════════════════════════════════════════════════════════════════ */

import { useCallback } from "react"
import { Tv, Play, ExternalLink, RefreshCw, X, PictureInPicture2, Undo2 } from "lucide-react"
import { Kart, useBolum } from "./EkstraKart"
import { useDiyanetTv, pipDestekli, TV_RESMI_SITE } from "../data/diyanetTv"

export default function DiyanetTvKarti({ theme }) {
  const bolum = useBolum("tv")
  const ac = theme.accent
  const tv = useDiyanetTv()
  const acik = !!tv?.acik
  // Yer tutucu: oynatıcı katmanı bunun ölçüsünü alıp tam üstüne oturur
  const setYuva = tv?.setYuva
  const yuvaRef = useCallback((el) => { if (setYuva) setYuva(el) }, [setYuva])

  const ozet = acik ? (tv.pip ? "Ekran içinde ekranda oynuyor" : "Canlı yayın açık") : undefined
  const kucukDugme = {
    display: "inline-flex", alignItems: "center", gap: "5px", padding: "6px 10px", borderRadius: "999px",
    border: `1px solid ${theme.border}`, background: "transparent", color: theme.textSecondary,
    fontFamily: "inherit", fontSize: "11.5px", cursor: "pointer", textDecoration: "none", whiteSpace: "nowrap",
  }
  if (!tv) return null

  return (
    <Kart theme={theme} Ikon={Tv} baslik="Diyanet TV" alt="Canlı yayın" bolum={bolum} ozet={ozet}>
      <div ref={yuvaRef} style={{
        position: "relative", width: "100%", aspectRatio: "16 / 9", borderRadius: "12px", overflow: "hidden",
        background: "#0b0b0b", border: `1px solid ${theme.border}`,
      }}>
        {!acik && (
          <button onClick={tv.baslat} aria-label="Diyanet TV canlı yayını izle"
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
        {acik && tv.pip && (
          <div style={{
            position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "10px",
            color: "#fff", textAlign: "center", padding: "12px",
          }}>
            <PictureInPicture2 size={28} color={ac} />
            <span style={{ fontSize: "13px", fontWeight: 600 }}>Yayın ekran içinde ekranda oynuyor</span>
            <button onClick={tv.pipKapat} style={{ ...kucukDugme, color: "#fff", borderColor: "rgba(255,255,255,0.35)" }}>
              <Undo2 size={13} /> Buraya geri al
            </button>
          </div>
        )}
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "6px", marginTop: "10px" }}>
        {acik && (
          <button onClick={tv.kapat} style={kucukDugme} title="Yayını kapat">
            <X size={13} /> Kapat
          </button>
        )}
        {acik && !tv.pip && pipDestekli() && (
          <button onClick={tv.pipAc} style={{ ...kucukDugme, color: ac, borderColor: `${ac}66` }} title="Ayrı, hep üstte kalan pencerede oynat">
            <PictureInPicture2 size={13} /> Ekran içinde ekran
          </button>
        )}
        <button onClick={() => { tv.setKaynak(tv.kaynak === "video" ? "kanal" : "video"); if (!acik) tv.baslat() }} style={kucukDugme}
          title={tv.kaynak === "video" ? "Kanalın şu anki canlı yayınını aç" : "Resmî sitedeki yayını aç"}>
          <RefreshCw size={13} /> {tv.kaynak === "video" ? "Açılmazsa: kanalın canlı yayını" : "Resmî sitedeki yayına dön"}
        </button>
        <a href={TV_RESMI_SITE} target="_blank" rel="noopener noreferrer" style={kucukDugme} title="diyanet.tv">
          <ExternalLink size={13} /> Resmî site
        </a>
      </div>
      <div style={{ fontSize: "10.5px", color: theme.textSecondary, lineHeight: 1.45, margin: "8px 2px 0" }}>
        Yayın, Diyanet TV'nin resmî YouTube kanalından ve resmî sitesindeki gibi YouTube oynatıcısıyla gösterilir; başlayınca öbür sesler duraklar.
        Kart kapatıldığında ya da başka bir bölüme geçildiğinde yayın köşedeki küçük pencerede sürer.
        {pipDestekli() ? " \"Ekran içinde ekran\" ile başka bir uygulamaya geçildiğinde de üstte kalır." : " Telefon kilitlenince ya da uygulama arka plana alınınca YouTube yayını durdurur."}
      </div>
    </Kart>
  )
}
