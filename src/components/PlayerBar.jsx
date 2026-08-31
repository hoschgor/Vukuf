import { useRef, useEffect } from "react"
import { Play, Pause, Square, SkipBack, SkipForward, Glasses, Repeat, Gauge } from "lucide-react"
import { KARILAR } from "../data/hooks/useAudioPlayer"
import { useMediaQuery } from "../data/hooks/useMediaQuery"


export default function PlayerBar({
  player,
  sureler = [],
  theme,
  barKonum = "alt",
  barUiOlcegi,
  barGorunur = true,
  barYuksekligi = 0,
  playerBarYuksekligi,
  onOdaklan,
  onOlcum,
  onDonguAyar,          // döngü/tekrar ayar arayüzünü aç (KuranOkuma yönetir)
  tekrarAktif = false,  // bir tekrar modu seçili mi (buton vurgusu)
}) {
  const { durum, aktifAyet, kariId, duraklat, devamEt, durdur, oncekiAyet, sonrakiAyet, hiz = 1, hizAyarla } = player
  const isMobile = useMediaQuery("(max-width: 768px)")
  const HIZLAR = [0.75, 1, 1.25, 1.5, 2]
  const hizSonraki = () => { const i = HIZLAR.indexOf(hiz); hizAyarla && hizAyarla(HIZLAR[(i + 1) % HIZLAR.length]) }

  // Gerçek yüksekliği ölç → ebeveyn (KuranOkuma) menü/içerik ofsetlerinde kullanır
  const rootRef = useRef(null)
  useEffect(() => {
    if (!rootRef.current || !onOlcum) return
    const ro = new ResizeObserver(() => {
      // offsetHeight = padding + border dahil (gerçek yükseklik)
      if (rootRef.current) onOlcum(Math.ceil(rootRef.current.offsetHeight))
    })
    ro.observe(rootRef.current)
    return () => ro.disconnect()
  }, [onOlcum, durum])

  if (durum === "kapali") return null

  const aktifSure = aktifAyet ? sureler.find(s => s.id === aktifAyet.sureNo) : null
  const aktifKari = KARILAR.find(k => k.id === kariId)

  const mainBarHeight = barYuksekligi || (isMobile ? 44 : 33)
  const playerBarHeight = playerBarYuksekligi

  // Bar görünürken oynatıcı barın iç kenarına bitişik; bar gizlenince
  // oynatıcı barın yerine (kenara) geçsin
  const getBottomPosition = () => (barKonum === "alt" ? (barGorunur ? `${mainBarHeight}px` : "0px") : "auto")
  const getTopPosition = () => (barKonum === "ust" ? (barGorunur ? `${mainBarHeight}px` : "0px") : "auto")

  const butonStil = (vurgulu = false) => ({
    display: "flex", 
    alignItems: "center", 
    justifyContent: "center",
    width: isMobile ? "30px" : "32px", 
    height: isMobile ? "30px" : "32px", 
    borderRadius: "50%",
    border: "none", 
    cursor: "pointer",
    background: vurgulu ? theme.accent : `${theme.accent}15`,
    color: vurgulu ? "#fff" : theme.accent,
    transition: "all 0.15s", 
    flexShrink: 0,
    touchAction: "manipulation",
  })

  const kucukButonStil = () => ({
    display: "flex", 
    alignItems: "center", 
    justifyContent: "center",
    width: isMobile ? "25px" : "26px", 
    height: isMobile ? "25px" : "26px", 
    borderRadius: "50%",
    border: "none", 
    cursor: "pointer",
    background: "transparent", 
    color: theme.textSecondary,
    transition: "all 0.15s", 
    flexShrink: 0,
    touchAction: "manipulation",
  })

  return (
    <div ref={rootRef} style={{
      position: "fixed",
      left: 0,
      right: 0,
      bottom: getBottomPosition(),
      top: getTopPosition(),
      minHeight: `${playerBarHeight}px`,
      height: "auto",
      background: theme.surface,
      borderTop: barKonum === "alt" ? `1px solid ${theme.accent}25` : "none",
      borderBottom: barKonum === "ust" ? `1px solid ${theme.accent}25` : "none",
      padding: isMobile ? "4px 16px" : "4px 24px",
      display: "flex", 
      alignItems: "center", 
      justifyContent: "space-between",
      gap: isMobile ? "8px" : "12px",
      zIndex: 91,
      boxShadow: barKonum === "alt"
        ? `0 -2px 12px ${theme.accent}10`
        : `0 2px 12px ${theme.accent}10`,
      transition: "bottom 0.3s ease, top 0.3s ease, opacity 0.3s ease",
      opacity: 1,
      pointerEvents: "auto",
      overflow: "hidden",
      maxWidth: "100%",
      boxSizing: "border-box",
    }}>
      {/* Sol: sure · ayet · kari adı */}
      <div style={{ 
        flex: "0 1 auto",
        minWidth: 0,
        maxWidth: isMobile ? "75%" : "100%",
        overflow: "hidden",
        paddingLeft: isMobile ? "5%" : "1%",
      }}>
        <div style={{
          fontSize: `${Math.round((isMobile ? 12 : 11) * barUiOlcegi)}px`,
          fontWeight: "500", 
          color: theme.text,
          overflow: "hidden", 
          textOverflow: "ellipsis", 
          whiteSpace: "nowrap",
          lineHeight: "1.2",
        }}>
          {aktifSure
            ? (aktifAyet.besmeleIcin
                ? "Bismillahirrahmanirrahim"
                : `${aktifSure.isim} ${isMobile ? '·' : '·'} ${aktifAyet.ayetNo}`)
            : "Besmele"}
        </div>
        <div style={{
          fontSize: `${Math.round((isMobile ? 10 : 11) * barUiOlcegi)}px`,
          color: theme.textSecondary,
          overflow: "hidden", 
          textOverflow: "ellipsis", 
          whiteSpace: "nowrap",
          opacity: 0.7,
        }}>
          {aktifKari?.label || kariId}
        </div>
      </div>

      {/* Sağ grup: Gözlük + kontroller */}
      <div style={{ 
        display: "flex", 
        alignItems: "center", 
        gap: isMobile ? "4px" : "6px",
        flexShrink: 0,
        marginRight: isMobile ? "3%" : "1%",
      }}>
        {/* GÖZLÜK - En solda ama ayrı duruyor */}
        <button
          onClick={onOdaklan}
          style={{
            display: "flex", 
            alignItems: "center", 
            justifyContent: "center",
            width: isMobile ? "28px" : "30px", 
            height: isMobile ? "28px" : "30px", 
            borderRadius: "50%",
            border: "none", 
            cursor: "pointer",
            background: "transparent", 
            color: theme.textSecondary,
            transition: "all 0.15s", 
            flexShrink: 0,
            touchAction: "manipulation",
            padding: 0,
            marginRight: isMobile ? "4px" : "6px",
          }}
          title="Okunan ayete odaklan"
        >
          <Glasses size={isMobile ? 17 : 19} />
        </button>

        {/* DÖNGÜ / TEKRAR — ayar arayüzünü açar (sayfa/ayet/sure tekrarı) */}
        <button
          onClick={onDonguAyar}
          title="Tekrar (döngü) ayarları"
          style={{
            display: "flex", alignItems: "center", justifyContent: "center",
            width: isMobile ? "27px" : "29px", height: isMobile ? "27px" : "29px", borderRadius: "50%",
            border: "none", cursor: "pointer", flexShrink: 0, touchAction: "manipulation", padding: 0,
            background: tekrarAktif ? theme.accent : "transparent",
            color: tekrarAktif ? "#fff" : theme.textSecondary,
          }}
        >
          <Repeat size={isMobile ? 15 : 16} />
        </button>

        {/* ÇALMA HIZI — dokununca sıradaki hıza geçer */}
        <button
          onClick={hizSonraki}
          title="Çalma hızı"
          style={{
            display: "flex", alignItems: "center", justifyContent: "center", gap: "2px",
            minWidth: isMobile ? "36px" : "40px", height: isMobile ? "27px" : "29px", borderRadius: "14px",
            border: "none", cursor: "pointer", flexShrink: 0, touchAction: "manipulation", padding: "0 6px",
            background: hiz !== 1 ? `${theme.accent}22` : "transparent",
            color: hiz !== 1 ? theme.accent : theme.textSecondary,
            fontSize: `${Math.round((isMobile ? 10 : 11) * (barUiOlcegi || 1))}px`, fontWeight: 600, fontFamily: "inherit",
          }}
        >
          <Gauge size={isMobile ? 13 : 14} />{hiz}×
        </button>

        {/* Kontrol butonları */}
        <button 
          onClick={oncekiAyet} 
          style={kucukButonStil()} 
          title="Önceki âyet"
          onMouseEnter={e => e.currentTarget.style.background = `${theme.accent}12`}
          onMouseLeave={e => e.currentTarget.style.background = "transparent"}
          onTouchStart={e => e.currentTarget.style.background = `${theme.accent}20`}
          onTouchEnd={e => e.currentTarget.style.background = "transparent"}
        >
          <SkipBack size={isMobile ? 15 : 14} />
        </button>
        
        {durum === "caliyor" ? (
          <button 
            onClick={duraklat} 
            style={butonStil(true)} 
            title="Duraklat"
          >
            <Pause size={isMobile ? 17 : 15} />
          </button>
        ) : (
          <button 
            onClick={devamEt} 
            style={butonStil(true)} 
            title="Devam et"
          >
            <Play size={isMobile ? 17 : 15} />
          </button>
        )}
        
        <button 
          onClick={durdur} 
          style={butonStil(false)} 
          title="Durdur ve kapat"
        >
          <Square size={isMobile ? 14 : 13} fill={theme.accent} />
        </button>
        
        <button 
          onClick={sonrakiAyet} 
          style={kucukButonStil()} 
          title="Sonraki âyet"
          onMouseEnter={e => e.currentTarget.style.background = `${theme.accent}12`}
          onMouseLeave={e => e.currentTarget.style.background = "transparent"}
          onTouchStart={e => e.currentTarget.style.background = `${theme.accent}20`}
          onTouchEnd={e => e.currentTarget.style.background = "transparent"}
        >
          <SkipForward size={isMobile ? 15 : 14} />
        </button>
      </div>
    </div>
  )
}