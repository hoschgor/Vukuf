import { useRef } from "react"

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

  // ⬇️ Vakıf işaretini kelimenin SON harfinin ÜZERİNE koy
  // top değeri: 0 = kelimeyle aynı hizada, negatif = yukarıda
  // right değeri: kelimenin sağına kaydırma
  const vakifKonumu = {
    top: `-${yaziBoyutu * 0.35}px`,    // ← Kelimenin hemen üzerinde
    right: `-${yaziBoyutu * 0.1}px`,    // ← Sağa hafif kayık
    fontSize: `${yaziBoyutu * 0.55}px`, // ← Kelimenin yarısı kadar
  }

  // Secde işareti konumu (vakıf varsa onun da üstünde)
  const secdeKonumu = {
    top: kelime.vakif 
      ? `-${yaziBoyutu * 0.55}px`      // ← Vakıf varsa daha yukarıda
      : `-${yaziBoyutu * 0.35}px`,      // ← Vakıf yoksa kelimenin üzerinde
    right: kelime.vakif 
      ? `-${yaziBoyutu * 0.05}px` 
      : `-${yaziBoyutu * 0.1}px`,
    fontSize: `${yaziBoyutu * 0.45}px`,
  }

  return (
    <span
      ref={ref}
      onClick={(e) => onTikla?.(kelime, e)}
      style={{
        position: "relative",
        display: "inline-block",
        cursor: "pointer",
        padding: kelime.vakif || kelime.secde ? "4px 6px" : "0 2px",
        margin: kelime.vakif || kelime.secde ? "8px 0" : "0",
        borderRadius: "4px",
        background: aktif ? `${theme.accent}20` : "transparent",
        transition: "all 0.2s ease",
        borderBottom: aktif ? `2px solid ${theme.accent}` : "none",
        transform: aktif ? "scale(1.02)" : "scale(1)",
      }}
      className="mushaf-kelime"
      onMouseEnter={(e) => {
        if (kelime.vakif || kelime.secde) {
          e.currentTarget.style.background = `${theme.accent}08`
        }
      }}
      onMouseLeave={(e) => {
        if (!aktif) {
          e.currentTarget.style.background = "transparent"
        }
      }}
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
            opacity: 0.85,
            transition: "all 0.2s ease",
            textShadow: `0 0 8px ${vakifRengi}30`,
            zIndex: 5,
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
          fontSize: `${yaziBoyutu}px`,
          color: theme.text,
          lineHeight: 2.2,
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