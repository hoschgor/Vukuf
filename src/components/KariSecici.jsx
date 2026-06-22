import { useState } from "react"
import { Music2, ChevronDown, Check } from "lucide-react"
import { KARILAR } from "../data/hooks/useAudioPlayer"

/**
 * KariSecici
 * ──────────
 * Ayarlar paneline gömülür. Minik bir dropdown açar,
 * seçim useAudioPlayer'a ve localStorage'a kaydedilir.
 *
 * Konum: src/components/KariSecici.jsx
 *
 * Kullanım:
 *   <KariSecici
 *     kariId={player.kariId}
 *     setKariId={player.setKariId}
 *     theme={theme}
 *     barKonum="alt"
 *   />
 */
export default function KariSecici({ kariId, setKariId, theme, barKonum = "alt" }) {
  const [acik, setAcik] = useState(false)

  const aktifKari = KARILAR.find(k => k.id === kariId) || KARILAR[0]

  function secKari(id) {
    setKariId(id)   // useAudioPlayer içinde localStorage'a da kaydedilir
    setAcik(false)
  }

  return (
    <div>
      <div style={{
        fontSize: "11px", color: theme.textSecondary,
        marginBottom: "8px", letterSpacing: "1px",
      }}>
        KARİ
      </div>

      {/* Seçili kari butonu */}
      <button
        onClick={() => setAcik(!acik)}
        style={{
          width: "100%",
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "8px 12px", borderRadius: "8px",
          border: `1px solid ${acik ? theme.accent : theme.border}`,
          background: acik ? `${theme.accent}10` : theme.background,
          color: theme.text, fontSize: "13px", cursor: "pointer",
          transition: "all 0.15s",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <Music2 size={13} color={theme.accent} />
          <span>{aktifKari.label}</span>
        </div>
        <ChevronDown
          size={13}
          color={theme.textSecondary}
          style={{
            transform: acik ? "rotate(180deg)" : "rotate(0deg)",
            transition: "transform 0.2s",
          }}
        />
      </button>

      {/* Dropdown */}
      {acik && (
        <>
          {/* Backdrop */}
          <div
            onClick={() => setAcik(false)}
            style={{ position: "fixed", inset: 0, zIndex: 195 }}
          />
          <div style={{
            position: "absolute",
            // Ayarlar panelinin konumuna göre açılır
            [barKonum === "alt" ? "bottom" : "top"]: "calc(100% + 4px)",
            left: 0, right: 0,
            background: theme.surface,
            border: `1px solid ${theme.border}`,
            borderRadius: "10px",
            overflow: "hidden",
            zIndex: 196,
            boxShadow: "0 4px 20px rgba(0,0,0,0.12)",
          }}>
            {/* Başlık */}
            <div style={{
              padding: "8px 12px",
              fontSize: "10px", color: theme.textSecondary,
              letterSpacing: "1px",
              borderBottom: `1px solid ${theme.border}`,
            }}>
              KARİ SEÇ
            </div>

            {KARILAR.map((kari, i) => {
              const secili = kariId === kari.id
              return (
                <button
                  key={kari.id}
                  onClick={() => secKari(kari.id)}
                  style={{
                    width: "100%",
                    display: "flex", alignItems: "center",
                    justifyContent: "space-between",
                    padding: "10px 12px",
                    border: "none",
                    borderBottom: i < KARILAR.length - 1
                      ? `1px solid ${theme.border}`
                      : "none",
                    background: secili ? `${theme.accent}12` : "transparent",
                    color: secili ? theme.accent : theme.text,
                    fontSize: "13px", cursor: "pointer",
                    textAlign: "left",
                    transition: "background 0.1s",
                  }}
                >
                  <span>{kari.label}</span>
                  {secili && <Check size={13} color={theme.accent} />}
                </button>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}
