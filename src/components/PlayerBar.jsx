import { Play, Pause, Square, SkipBack, SkipForward } from "lucide-react"
import { KARILAR } from "../data/hooks/useAudioPlayer"
import { useMediaQuery } from "../data/hooks/useMediaQuery"

export default function PlayerBar({ player, sureler = [], theme, barKonum = "alt", barGorunur = true, barYuksekligi = 0 }) {
  const { durum, aktifAyet, kariId, duraklat, devamEt, durdur, oncekiAyet, sonrakiAyet } = player
  const isMobile = useMediaQuery("(max-width: 768px)")

  if (durum === "kapali") return null

  const aktifSure = aktifAyet ? sureler.find(s => s.id === aktifAyet.sureNo) : null
  const aktifKari = KARILAR.find(k => k.id === kariId)

  // Bar yüksekliğini hesapla
  const mainBarHeight = barYuksekligi || (isMobile ? 44 : 33)
  
  // PlayerBar kendi yüksekliği
  const playerBarHeight = isMobile ? 41 : 40

  // PlayerBar'ın konumunu hesapla
  const getBottomPosition = () => {
  if (barKonum === "alt") {
    return barGorunur ? `${mainBarHeight - 7}px` : "0px"  // 2 → 8
  }
  return "auto"
}

const getTopPosition = () => {
  if (barKonum === "ust") {
    return barGorunur ? `${mainBarHeight + 8}px` : "0px"  // 2 → 8
  }
  return "auto"
}

  const butonStil = (vurgulu = false) => ({
    display: "flex", 
    alignItems: "center", 
    justifyContent: "center",
    width: isMobile ? "36px" : "32px", 
    height: isMobile ? "36px" : "32px", 
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
    width: isMobile ? "32px" : "26px", 
    height: isMobile ? "32px" : "26px", 
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
    <div style={{
      position: "fixed", 
      left: 0, 
      right: 0,
      bottom: getBottomPosition(),
      top: getTopPosition(),
      height: `${playerBarHeight}px`,
      background: theme.surface,
      borderTop: barKonum === "alt" ? `1px solid ${theme.accent}25` : "none",
      borderBottom: barKonum === "ust" ? `1px solid ${theme.accent}25` : "none",
      padding: isMobile ? "4px 16px" : "4px 24px",
      display: "flex", 
      alignItems: "center", 
      justifyContent: "space-between", // ÖNEMLİ: İki tarafa yasla
      gap: isMobile ? "8px" : "12px",
      zIndex: 89,
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
      {/* Sol: sure · ayet · kari adı - ortaya yakın olacak şekilde padding ile */}
      <div style={{ 
        flex: "0 1 auto",
        minWidth: 0,
        maxWidth: isMobile ? "45%" : "50%",
        overflow: "hidden",
        // Sol tarafta ama ortaya yakın olması için paddingLeft ekle
        paddingLeft: isMobile ? "5%" : "1%",
      }}>
        <div style={{
          fontSize: isMobile ? "11px" : "13px", 
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
          fontSize: isMobile ? "9px" : "11px", 
          color: theme.textSecondary,
          overflow: "hidden", 
          textOverflow: "ellipsis", 
          whiteSpace: "nowrap",
          opacity: 0.7,
        }}>
          {aktifKari?.label || kariId}
        </div>
      </div>

      {/* Orta: kontroller */}
      <div style={{ 
        display: "flex", 
        alignItems: "center", 
        justifyContent: "center",
        gap: isMobile ? "4px" : "6px", 
        flexShrink: 0,
        // Butonları sağa kaydırmak için marginRight ekle
        marginRight: isMobile ? "3%" : "1%",
      }}>
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