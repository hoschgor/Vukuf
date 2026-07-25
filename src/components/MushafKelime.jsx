// MushafKelime.jsx
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
// Component DIŞINA, VAKIF_RENKLERI'nin yanına ekleyin:
function lafzatullahMi(arabic) {
  const temiz = arabic
    .replace(/[\u0671\u0622\u0623\u0625]/g, '\u0627')
    .replace(/[\u064B-\u065F\u06D6-\u06ED]/g, '')
    .trim()
  return temiz === '\u0627\u0644\u0644\u0647'
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
  kayitKonumModu = false,
}) {
  const [hover, setHover] = useState(false)
  const isMobile = useMediaQuery("(max-width: 768px)")
  const vakifRengi = kelime.vakif ? (VAKIF_RENKLERI[kelime.vakif] || theme.accent) : null
  const lafizkontrol = lafzatullahMi(kelime.arabic)
  const hasUpperIndicator = kelime.vakif || kelime.secde

  return (
    <span
      className="mushaf-kelime"
      onClick={(e) => onTikla?.(kelime, e)}
      onMouseEnter={() => { if (!kayitKonumModu) setHover(true) }}
      onMouseLeave={() => setHover(false)}
      style={{
        position: "relative",
        display: "inline-block",
        cursor: kayitKonumModu ? "crosshair" : "pointer",
        marginTop: hasUpperIndicator ? `${yaziBoyutu * 0.35}px` : "0",
        paddingLeft: isMobile ? `${2 + harfAraligi * 3}px` : "3px",
        paddingRight: isMobile ? `${2 + harfAraligi * 3}px` : "3px",
        paddingBottom: "2px", // Alt padding ekle
        borderRadius: "3px",
        background: kayitKonumModu
          ? "transparent"
          : aktif
            ? `${theme.accent}22`
            : hover ? `${theme.accent}0a` : "transparent",
        boxShadow: kayitKonumModu ? "none" : aktif ? `inset 0 -2px 0 ${theme.accent}` : "none",
        transition: "background 0.15s",
        whiteSpace: "nowrap",
        // ÖNEMLİ: verticalAlign: "middle" ile hizala
        verticalAlign: "middle",
        userSelect: "none",
        // ÖNEMLİ: lineHeight'i miras al
        lineHeight: lineHeight,
        WebkitTapHighlightColor: kayitKonumModu ? "transparent" : undefined,
      }}
    >
      {/* Vakıf işareti */}
      {kelime.vakif && (
        <span
          style={{
            position: "absolute",
            // ÖNEMLİ: Top değerini negatif yaparak kelimenin üzerine çık
            top: `-${yaziBoyutu * 0.09 }px`,
            left: isMobile ? "10px" : "3px",
            transform: "translateX(-10%)",
            fontSize: `${yaziBoyutu * 0.48}px`,
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

      {/* Secde işareti - vakıf varsa yanına, yoksa üste */}
      {kelime.secde && (
        <span
          style={{
            position: "absolute",
            // ÖNEMLİ: Vakıf varsa üstüne, yoksa kelimenin üstüne
            top: kelime.vakif ? `-${yaziBoyutu * 0.1}px` : `-${yaziBoyutu * 0.05}px`,
            right: kelime.vakif ? "auto" : "0",
            left: kelime.vakif ? "auto" : "40%",
            transform: kelime.vakif ? "translateX(120%)" : "translateX(-50%)",
            fontSize: `${yaziBoyutu * 0.32}px`,
            color: "#2e7d4f",
            fontFamily: "'Scheherazade New', serif",
            lineHeight: 1,
            pointerEvents: "none",
            zIndex: 2,
            display: "inline-flex",
            alignItems: "center",
            gap: "2px",
            whiteSpace: "nowrap",
          }}
        >
          <svg width="9" height="9" viewBox="0 0 24 24" style={{ display: "inline-block" }}>
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
      <span
        style={{
          fontFamily: arapcaFont,
          fontSize: `${yaziBoyutu}px`,
          lineHeight: lineHeight,
          color: lafizkontrol ? (theme.lugatHighlight || theme.accent) : theme.text,
          display: "inline",
          opacity: aktif ? 1 : 0.95,
          verticalAlign: "middle",
        }}
      >
        {(() => {
          // Kufi fontu ise harf bölme yapma
          if (arapcaFont.toLowerCase().includes('kufi') || arapcaFont.toLowerCase().includes('kûfi')) {
            return <span style={{ letterSpacing: 0 }}>{kelime.arabic}</span>
          }
          const segmenter = new Intl.Segmenter('ar', { granularity: 'grapheme' })
          const segmentler = [...segmenter.segment(kelime.arabic)].map(s => s.segment)
          return segmentler.map((seg, i) => (
            <span
              key={i}
              style={{
                marginLeft: (!isMobile && i !== segmentler.length - 1) ? `${harfAraligi}px` : '0px',
              }}
            >
              {seg}
            </span>
          ))
        })()}
      </span>
    </span>
  )
}