import { Play, Pause, Square, SkipBack, SkipForward } from "lucide-react"
import { KARILAR } from "../data/hooks/useAudioPlayer"
import { useMediaQuery } from "../data/hooks/useMediaQuery"

export default function PlayerBar({ player, sureler = [], theme, barKonum = "alt" }) {
  const { durum, aktifAyet, kariId, duraklat, devamEt, durdur, oncekiAyet, sonrakiAyet } = player
  const isMobile = useMediaQuery("(max-width: 768px)")

  if (durum === "kapali") return null

  const aktifSure = aktifAyet ? sureler.find(s => s.id === aktifAyet.sureNo) : null
  const aktifKari = KARILAR.find(k => k.id === kariId)

  // Mobilde bar padding daha büyük (10px üst/alt) → bar yüksekliği ~56-60px
  // Bilgisayarda bar padding daha küçük (4px üst/alt) → bar yüksekliği ~40px
  // PlayerBar bu yüksekliğin hemen üstünde/altında durmalı
  const barYuksekligi = isMobile ? 48 : 32

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
      position: "fixed", left: 0, right: 0,
      // Mobil ve masaüstü için ayrı offset
      [barKonum === "alt" ? "bottom" : "top"]: `${barYuksekligi}px`,
      background: theme.surface,
      borderTop:    barKonum === "alt" ? `1px solid ${theme.accent}30` : "none",
      borderBottom: barKonum === "ust" ? `1px solid ${theme.accent}30` : "none",
      padding: isMobile ? "8px 16px" : "6px 16px",
      display: "flex", alignItems: "center", gap: "10px",
      zIndex: 88,
      boxShadow: barKonum === "alt"
        ? `0 -2px 12px ${theme.accent}12`
        : `0 2px 12px ${theme.accent}12`,
    }}>
      {/* Sol: sure · ayet · kari adı */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: "13px", fontWeight: "500", color: theme.text,
          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
        }}>
          {aktifSure
            ? `${aktifSure.isim} · ${aktifAyet.ayetNo}. Âyet`
            : "Besmele"}
        </div>
        <div style={{
          fontSize: "11px", color: theme.textSecondary,
          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
        }}>
          {aktifKari?.label || kariId}
        </div>
      </div>

      {/* Orta: kontroller */}
      <div style={{ display: "flex", alignItems: "center", gap: "6px", flexShrink: 0 }}>
        <button onClick={oncekiAyet} style={kucukButonStil()} title="Önceki âyet">
          <SkipBack size={14} />
        </button>
        {durum === "caliyor" ? (
          <button onClick={duraklat} style={butonStil(true)} title="Duraklat">
            <Pause size={15} />
          </button>
        ) : (
          <button onClick={devamEt} style={butonStil(true)} title="Devam et">
            <Play size={15} />
          </button>
        )}
        <button onClick={durdur} style={butonStil(false)} title="Durdur ve kapat">
          <Square size={13} fill={theme.accent} />
        </button>
        <button onClick={sonrakiAyet} style={kucukButonStil()} title="Sonraki âyet">
          <SkipForward size={14} />
        </button>
      </div>
    </div>
  )
}