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

  // Vakıf ve secde ikisi aynı anda olabilir
  // Secde daha üstte, vakıf hemen üstünde durur
  const ustOffset = kelime.secde && kelime.vakif
    ? { secde: -38, vakif: -20 }
    : kelime.secde
    ? { secde: -24, vakif: null }
    : { secde: null, vakif: -20 }

  return (
    <span
      ref={ref}
      onClick={(e) => onTikla?.(kelime, e)}
      style={{
        position: "relative",
        display: "inline-block",
        cursor: "pointer",
        padding: "0 2px",
        // Üstte işaret varsa boşluk bırak
        marginTop: (kelime.secde || kelime.vakif) ? "28px" : "0",
        borderRadius: "3px",
        background: aktif ? `${theme.accent}25` : "transparent",
        transition: "background 0.2s",
      }}
      className="mushaf-kelime"
    >
      {/* Secde etiketi */}
      {kelime.secde && (
        <span
          style={{
            position: "absolute",
            top: ustOffset.secde,
            left: "50%",
            transform: "translateX(-50%)",
            whiteSpace: "nowrap",
            fontSize: `${yaziBoyutu * 0.52}px`,
            color: "#2e7d4f",
            fontFamily: arapcaFont,
            lineHeight: 1,
            pointerEvents: "none",
            display: "flex",
            alignItems: "center",
            gap: "2px",
          }}
        >
          {/* Küçük rozet SVG */}
          <svg
            width="10"
            height="10"
            viewBox="0 0 24 24"
            style={{ flexShrink: 0 }}
          >
            <path
              d="M12 2 L14.5 8.5 L21.5 8.5 L16 13 L18.5 20 L12 16 L5.5 20 L8 13 L2.5 8.5 L9.5 8.5 Z"
              fill="none"
              stroke="#2e7d4f"
              strokeWidth="1.5"
              strokeLinejoin="round"
            />
            <circle cx="12" cy="11" r="2.5" fill="#2e7d4f" />
          </svg>
          {kelime.secde}
        </span>
      )}

      {/* Vakıf işareti */}
      {kelime.vakif && (
        <span
          style={{
            position: "absolute",
            top: ustOffset.vakif,
            left: "50%",
            transform: "translateX(-50%)",
            fontSize: `${yaziBoyutu * 0.6}px`,
            color: theme.accent,
            fontFamily: "'Scheherazade New', serif",
            lineHeight: 1,
            pointerEvents: "none",
            whiteSpace: "nowrap",
          }}
        >
          {kelime.vakif}
        </span>
      )}

      {/* Arapça metin */}
      <span
        style={{
          fontFamily: arapcaFont,
          fontSize: `${yaziBoyutu}px`,
          color: theme.text,
          lineHeight: 2.2,
          userSelect: "none",
        }}
      >
        {kelime.arabic}
      </span>
    </span>
  )
}
