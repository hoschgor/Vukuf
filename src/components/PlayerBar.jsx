import { Play, Pause, Square, SkipBack, SkipForward } from "lucide-react"
import { KARILAR } from "../data/hooks/useAudioPlayer"
import { useMediaQuery } from "../data/hooks/useMediaQuery"

export default function PlayerBar({ player, sureler = [], theme, barKonum = "alt", barGorunur = true, barYuksekligi = 0 }) {
  const { durum, aktifAyet, kariId, duraklat, devamEt, durdur, oncekiAyet, sonrakiAyet } = player
  const isMobile = useMediaQuery("(max-width: 768px)")

  if (durum === "kapali") return null

  const aktifSure = aktifAyet ? sureler.find(s => s.id === aktifAyet.sureNo) : null
  const aktifKari = KARILAR.find(k => k.id === kariId)

  // Bar yüksekliğini hesapla (eğer dışarıdan verilmediyse)
  const mainBarHeight = barYuksekligi || (isMobile ? 48 : 32)
  
  // PlayerBar kendi yüksekliği
  const playerBarHeight = isMobile ? 56 : 44

  // PlayerBar'ın konumunu hesapla
  const getBottomPosition = () => {
    if (barKonum === "alt") {
      // Alt bar görünürse onun üstüne, yoksa en alta
      return barGorunur ? `${mainBarHeight + 4}px` : "0px"
    }
    // Üst bar için
    return "auto"
  }

  const getTopPosition = () => {
    if (barKonum === "ust") {
      return barGorunur ? `${mainBarHeight + 4}px` : "0px"
    }
    return "auto"
  }

  const butonStil = (vurgulu = false) => ({
    display: "flex", alignItems: "center", justifyContent: "center",
    width: "32px", height: "32px", borderRadius: "50%",
    border: "none", cursor: "pointer",
    background: vurgulu ? theme.accent : `${theme.accent}18`,
    color: vurgulu ? "#fff" : theme.accent,
    transition: "all 0.15s", flexShrink: 0,
  })

  const kucukButonStil = () => ({
    display: "flex", alignItems: "center", justifyContent: "center",
    width: "26px", height: "26px", borderRadius: "50%",
    border: "none", cursor: "pointer",
    background: "transparent", color: theme.textSecondary,
    transition: "all 0.15s", flexShrink: 0,
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
      borderTop: barKonum === "alt" ? `1px solid ${theme.accent}30` : "none",
      borderBottom: barKonum === "ust" ? `1px solid ${theme.accent}30` : "none",
      padding: isMobile ? "6px 16px" : "4px 16px",
      display: "flex", 
      alignItems: "center", 
      gap: "10px",
      zIndex: 89, // Main bar'dan (90) bir alt, ama diğer içerikten üst
      boxShadow: barKonum === "alt"
        ? `0 -2px 12px ${theme.accent}12`
        : `0 2px 12px ${theme.accent}12`,
      transition: "bottom 0.3s ease, top 0.3s ease, opacity 0.3s ease",
      // PlayerBar her zaman görünür (otomatik gizlenmez)
      opacity: 1,
      pointerEvents: "auto",
    }}>
      {/* Sol: sure · ayet · kari adı */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: isMobile ? "12px" : "13px", 
          fontWeight: "500", 
          color: theme.text,
          overflow: "hidden", 
          textOverflow: "ellipsis", 
          whiteSpace: "nowrap",
        }}>
          {aktifSure
            ? `${aktifSure.isim} · ${aktifAyet.ayetNo}. Âyet`
            : "Besmele"}
        </div>
        <div style={{
          fontSize: isMobile ? "10px" : "11px", 
          color: theme.textSecondary,
          overflow: "hidden", 
          textOverflow: "ellipsis", 
          whiteSpace: "nowrap",
        }}>
          {aktifKari?.label || kariId}
        </div>
      </div>

      {/* Orta: kontroller */}
      <div style={{ 
        display: "flex", 
        alignItems: "center", 
        gap: isMobile ? "4px" : "6px", 
        flexShrink: 0 
      }}>
        <button 
          onClick={oncekiAyet} 
          style={kucukButonStil()} 
          title="Önceki âyet"
          onMouseEnter={e => e.currentTarget.style.background = `${theme.accent}15`}
          onMouseLeave={e => e.currentTarget.style.background = "transparent"}
        >
          <SkipBack size={isMobile ? 13 : 14} />
        </button>
        
        {durum === "caliyor" ? (
          <button 
            onClick={duraklat} 
            style={butonStil(true)} 
            title="Duraklat"
          >
            <Pause size={isMobile ? 14 : 15} />
          </button>
        ) : (
          <button 
            onClick={devamEt} 
            style={butonStil(true)} 
            title="Devam et"
          >
            <Play size={isMobile ? 14 : 15} />
          </button>
        )}
        
        <button 
          onClick={durdur} 
          style={butonStil(false)} 
          title="Durdur ve kapat"
        >
          <Square size={isMobile ? 12 : 13} fill={theme.accent} />
        </button>
        
        <button 
          onClick={sonrakiAyet} 
          style={kucukButonStil()} 
          title="Sonraki âyet"
          onMouseEnter={e => e.currentTarget.style.background = `${theme.accent}15`}
          onMouseLeave={e => e.currentTarget.style.background = "transparent"}
        >
          <SkipForward size={isMobile ? 13 : 14} />
        </button>
      </div>
    </div>
  )
}