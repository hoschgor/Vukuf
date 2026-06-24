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
  onTikla,
}) {
  const [hover, setHover] = useState(false)
  const isMobile = useMediaQuery("(max-width: 768px)")
  const vakifRengi = kelime.vakif ? (VAKIF_RENKLERI[kelime.vakif] || theme.accent) : null

  return (
    // ── display: inline-block ZORUNLU
    // inline satır kırılmasını RTL'de engelliyor
    // inline-block hem satır kırar hem position:relative çalışır
    // wrap problemi için parent'ta word-break veya overflow-wrap kullanılacak
    <span
      className="mushaf-kelime"
      onClick={(e) => onTikla?.(kelime, e)}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        position: "relative",
        display: "inline-block",
        cursor: "pointer",
        // Kelimeler arası boşluk için margin — padding değil
        // padding kelime genişliğini artırır, margin satır kırılmasını etkiler
        marginInlineStart: isMobile ? "2px" : "3px",
        marginInlineEnd: isMobile ? "2px" : "3px",
        // Vakıf/secde için üst boşluk
        marginTop: (kelime.vakif || kelime.secde) ? `${yaziBoyutu * 0.6}px` : "0",
        borderRadius: "3px",
        background: aktif
          ? `${theme.accent}22`
          : hover ? `${theme.accent}0a` : "transparent",
        boxShadow: aktif ? `inset 0 -2px 0 ${theme.accent}` : "none",
        transition: "background 0.15s",
        // Kritik: tek kelimeyi asla kırma
        whiteSpace: "nowrap",
        verticalAlign: "baseline",
        userSelect: "none",
      }}
    >
      {/* Vakıf işareti — absolute, üste */}
      {kelime.vakif && (
        <span style={{
          position: "absolute",
          top: `-${yaziBoyutu * 0.55}px`,
          left: "50%",
          transform: "translateX(-50%)",
          fontSize: `${yaziBoyutu * 0.52}px`,
          color: vakifRengi,
          fontFamily: "'Scheherazade New', serif",
          fontWeight: "bold",
          lineHeight: 1,
          pointerEvents: "none",
          whiteSpace: "nowrap",
          zIndex: 2,
        }}>
          {kelime.vakif}
        </span>
      )}

      {/* Secde işareti — absolute, üste (vakıf varsa daha üste) */}
      {kelime.secde && (
        <span style={{
          position: "absolute",
          top: kelime.vakif ? `-${yaziBoyutu * 1.1}px` : `-${yaziBoyutu * 0.55}px`,
          left: "50%",
          transform: "translateX(-50%)",
          fontSize: `${yaziBoyutu * 0.38}px`,
          color: "#2e7d4f",
          fontFamily: "'Scheherazade New', serif",
          lineHeight: 1,
          pointerEvents: "none",
          whiteSpace: "nowrap",
          zIndex: 2,
          display: "flex",
          alignItems: "center",
          gap: "2px",
        }}>
          <svg width="10" height="10" viewBox="0 0 24 24">
            <path d="M12 2 L14.5 8.5 L21.5 8.5 L16 13 L18.5 20 L12 16 L5.5 20 L8 13 L2.5 8.5 L9.5 8.5 Z"
              fill="none" stroke="#2e7d4f" strokeWidth="1.5" strokeLinejoin="round"/>
            <circle cx="12" cy="11" r="2.5" fill="#2e7d4f"/>
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
      }}>
        {kelime.arabic}
      </span>
    </span>
  )
}