import { useRef, useState } from "react"
import { useMediaQuery } from "../data/hooks/useMediaQuery"

/**
 * MushafKelime
 * ────────────
 * Konum: src/components/MushafKelime.jsx
 *
 * Tek bir Arapça kelimeyi render eder.
 * Üstünde vakıf işareti ve/veya secde etiketi gösterebilir.
 * Tıklanınca KelimePopup açılır.
 *
 * Kullanım:
 *   <MushafKelime
 *     kelime={{ id, arabic, vakif, secde }}
 *     aktif={bool}          ← ses çalarken o kelime vurgulanır (ileride)
 *     theme={theme}
 *     arapcaFont="..."
 *     yaziBoyutu={20}
 *     onTikla={(kelime, e) => ...}
 *   />
 */
export default function MushafKelime({
  kelime,
  aktif = false,
  theme,
  arapcaFont,
  yaziBoyutu = 20,
  onTikla,
}) {
  const ref = useRef(null)
  const [hover, setHover] = useState(false)
  const isMobile = useMediaQuery("(max-width: 768px)")

  // Vakıf ve secde renkleri
  const vakifRenkleri = {
    'م': '#e74c3c',   // Vakf-ı Lazım
    'ط': '#e67e22',   // Vakf-ı Mutlak
    'ج': '#f39c12',   // Vakf-ı Câiz
    'ص': '#2ecc71',   // Vakf-ı Mücevvez
    'ق': '#3498db',   // Vakf-ı Murahhas
    '۩': '#e84393',   // Secde
  }
  
  const vakifRengi = kelime.vakif 
    ? (vakifRenkleri[kelime.vakif] || theme.accent) 
    : null

  // 📱 Mobil ve masaüstü için ayrı font boyutu
  const fontBoyutu = isMobile ? yaziBoyutu * 0.95 : yaziBoyutu
  const satirYuksekligi = isMobile ? 2.2 : 2.2

  // ⬇️ Vakıf işaretini kelimenin SON harfinin ÜZERİNE koy
  // Mobilde daha yakın, masaüstünde normal
  const vakifKonumu = {
    top: isMobile 
      ? `-${fontBoyutu * 0.15}px`    // ← Mobilde daha yakın
      : `-${fontBoyutu * 0.3}px`,    // ← Masaüstü normal
    right: `-${fontBoyutu * 0.05}px`,
    fontSize: isMobile 
      ? `${fontBoyutu * 0.45}px`     // ← Mobilde daha küçük
      : `${fontBoyutu * 0.55}px`,
  }

  // Secde işareti konumu (vakıf varsa onun da üstünde)
  const secdeKonumu = {
    top: kelime.vakif 
      ? `-${fontBoyutu * 0.45}px`      
      : `-${fontBoyutu * 0.25}px`,
    right: `-${fontBoyutu * 0.05}px`,
    fontSize: isMobile 
      ? `${fontBoyutu * 0.35}px` 
      : `${fontBoyutu * 0.45}px`,
  }

  return (
    <span
      ref={ref}
      onClick={(e) => onTikla?.(kelime, e)}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        position: "relative",
        display: "inline-block",
        cursor: "pointer",
        padding: kelime.vakif || kelime.secde 
          ? (isMobile ? "2px 4px" : "4px 6px") 
          : (isMobile ? "0 1px" : "0 2px"),
        margin: kelime.vakif || kelime.secde 
          ? (isMobile ? "2px 0" : "8px 0") 
          : "0",
        borderRadius: "4px",
        background: aktif ? `${theme.accent}20` : (hover ? `${theme.accent}08` : "transparent"),
        transition: "all 0.2s ease",
        borderBottom: aktif ? `2px solid ${theme.accent}` : "none",
        transform: aktif ? "scale(1.02)" : "scale(1)",
        // 📱 Mobilde satır yüksekliği
        lineHeight: satirYuksekligi,
        fontSize: `${fontBoyutu}px`,
        fontFamily: arapcaFont,
        color: theme.text,
      }}
      className="mushaf-kelime"
    >
      {/* ── VAKIF İŞARETİ ── */}
      {kelime.vakif && (
        <span
          style={{
            position: "absolute",
            top: vakifKonumu.top,
            right: vakifKonumu.right,
            fontSize: vakifKonumu.fontSize,
            color: vakifRengi,
            fontFamily: "'Scheherazade New', 'Traditional Arabic', serif",
            fontWeight: "bold",
            lineHeight: 1,
            pointerEvents: "none",
            whiteSpace: "nowrap",
            opacity: hover ? 1 : 0.85,
            transition: "all 0.2s ease",
            textShadow: hover 
              ? `0 0 12px ${vakifRengi}50` 
              : `0 0 8px ${vakifRengi}30`,
            zIndex: 5,
            transform: hover ? "scale(1.15)" : "scale(1)",
          }}
          title={`Vakıf işareti: ${kelime.vakif}`}
        >
          {kelime.vakif}
        </span>
      )}

      {/* ── SECDE İŞARETİ ── */}
      {kelime.secde && (
        <span
          style={{
            position: "absolute",
            top: secdeKonumu.top,
            right: secdeKonumu.right,
            fontSize: secdeKonumu.fontSize,
            color: '#e84393',
            fontFamily: "'Scheherazade New', serif",
            fontWeight: "bold",
            lineHeight: 1,
            pointerEvents: "none",
            whiteSpace: "nowrap",
            opacity: 0.85,
            transition: "all 0.2s ease",
            textShadow: `0 0 8px #e8439330`,
            zIndex: 6,
          }}
          title="Secde ayeti"
        >
          ۩
        </span>
      )}

      {/* ── ARAPÇA METİN ── */}
      <span
        style={{
          fontFamily: arapcaFont,
          fontSize: `${fontBoyutu}px`,
          color: theme.text,
          lineHeight: satirYuksekligi,
          userSelect: "none",
          transition: "color 0.2s ease",
          opacity: aktif ? 1 : 0.95,
        }}
      >
        {kelime.arabic}
      </span>
    </span>
  )
}