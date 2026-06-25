import { useState } from "react"
import { useMediaQuery } from "../data/hooks/useMediaQuery"

const VAKIF_RENKLERI = {
  'م': '#e74c3c',
  'ط': '#e67e22',
  'ج': '#f39c12',
  'ص': '#2ecc71',
  'ق': '#3498db',
  '∴': '#9b59b6',
}

export default function MushafKelime({
  kelime,
  aktif = false,
  theme,
  arapcaFont,
  yaziBoyutu = 20,
  lineHeight = 2.4,
  harfAraligi = 0,
  onTikla,
}) {
  const [hover, setHover] = useState(false)
  const isMobile = useMediaQuery("(max-width: 768px)")
  const vakifRengi = kelime.vakif ? (VAKIF_RENKLERI[kelime.vakif] || theme.accent) : null

  const ustIsaretVar = kelime.vakif || kelime.secde

  return (
    <span
      className="mushaf-kelime"
      onClick={(e) => onTikla?.(kelime, e)}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        position: "relative",
        display: "inline-block",
        cursor: "pointer",
        // Vakıf/secde için üst boşluk — marginTop yerine paddingTop
        // marginTop inline-block'ta satır yüksekliğini etkiler
        paddingTop: ustIsaretVar ? `${yaziBoyutu * 0.65}px` : "0",
        paddingLeft: isMobile ? "2px" : "3px",
        paddingRight: isMobile ? "2px" : "3px",
        paddingBottom: "0",
        borderRadius: "3px",
        background: aktif
          ? `${theme.accent}22`
          : hover ? `${theme.accent}0a` : "transparent",
        boxShadow: aktif ? `inset 0 -2px 0 ${theme.accent}` : "none",
        transition: "background 0.15s",
        whiteSpace: "nowrap",
        verticalAlign: "bottom", // ← baseline yerine bottom, hizalamayı düzeltir
        userSelect: "none",
      }}
    >
      {/* Vakıf işareti — kelimenin tam ortasında */}
      {kelime.vakif && (
        <span
          style={{
            position: "absolute",
            top: `${yaziBoyutu * 0.9}px`,  // ← bunu artır, örn. 0.25 veya 0.4
            left: "50%",
            transform: "translateX(-300%)",
            fontSize: `${yaziBoyutu * 0.52}px`,
            color: vakifRengi,
            fontFamily: "'Scheherazade New', serif",
            fontWeight: "bold",
            lineHeight: 1,
            pointerEvents: "none",
            zIndex: 2,
          }}
        >
          {kelime.vakif}
        </span>
      )}

      {/* Secde işareti — vakıf varsa daha üste */}
      {kelime.secde && (
        <span
          style={{
            position: "absolute",
            top: kelime.vakif ? `-${yaziBoyutu * 0.15}px` : `${yaziBoyutu * 0.05}px`,
            left: 0,
            right: 0,
            textAlign: "center",
            fontSize: `${yaziBoyutu * 0.36}px`,
            color: "#2e7d4f",
            fontFamily: "'Scheherazade New', serif",
            lineHeight: 1,
            pointerEvents: "none",
            zIndex: 2,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "2px",
          }}
        >
          <svg width="9" height="9" viewBox="0 0 24 24">
            <path
              d="M12 2 L14.5 8.5 L21.5 8.5 L16 13 L18.5 20 L12 16 L5.5 20 L8 13 L2.5 8.5 L9.5 8.5 Z"
              fill="none" stroke="#2e7d4f" strokeWidth="1.5" strokeLinejoin="round"
            />
            <circle cx="12" cy="11" r="2.5" fill="#2e7d4f" />
          </svg>
          سَجْدَة
        </span>
      )}

      {/* Arapça metin */}
      <span style={{
        fontFamily: arapcaFont,
        fontSize: `${yaziBoyutu}px`,
        lineHeight: lineHeight,
        color: theme.text,
        display: "inline",
        opacity: aktif ? 1 : 0.95,
      }}>
        {kelime.arabic.split('').map((harf, i) => (
          <span key={i} style={{
            letterSpacing: i === kelime.arabic.length - 1 ? '0px' : `${harfAraligi}px`,
            marginLeft: i === kelime.arabic.length - 1 ? '0px' : `${harfAraligi}px`,
          }}>
            {harf}
          </span>
        ))}
      </span>
    </span>
  )
}