import { useState } from "react"
import { useApp } from "../AppContext"
import { Search } from "lucide-react"
import lugatVerisi from "../data/lugat.json"


export default function Lugat() {
  const { theme } = useApp()
  const [aramaMetni, setAramaMetni] = useState("")

  const kelimeler = Object.entries(lugatVerisi)
  const filtrelenmis = kelimeler.filter(([kelime, anlam]) => {
    const aranan = aramaMetni.toLowerCase()
    return (
      kelime.toLowerCase().includes(aranan) ||
      anlam.toLowerCase().includes(aranan)
    )
  })

  return (
    <div style={{ maxWidth: "800px", margin: "0 auto", padding: "40px 24px" }}>
      {/* Başlık */}
      <div style={{ marginBottom: "32px" }}>
        <h1
          style={{
            fontSize: "28px",
            color: theme.text,
            marginBottom: "8px",
            letterSpacing: "1px",
          }}
        >
          Lügat
        </h1>
        <p style={{ color: theme.textSecondary, fontSize: "15px" }}>
          {kelimeler.length} kelime mevcut
        </p>
      </div>

      {/* Arama kutusu */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "12px",
          background: theme.surface,
          border: `1px solid ${theme.border}`,
          borderRadius: "12px",
          padding: "12px 16px",
          marginBottom: "24px",
        }}
      >
        <Search size={18} color={theme.textSecondary} />
        <input
          type="text"
          placeholder="Kelime veya anlam ara..."
          value={aramaMetni}
          onChange={(e) => setAramaMetni(e.target.value)}
          style={{
            flex: 1,
            background: "transparent",
            border: "none",
            outline: "none",
            fontSize: "15px",
            color: theme.text,
          }}
        />
        {aramaMetni && (
          <span style={{ fontSize: "13px", color: theme.textSecondary }}>
            {filtrelenmis.length} sonuç
          </span>
        )}
      </div>

      {/* Kelime listesi */}
      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
        {filtrelenmis.map(([kelime, anlam]) => (
          <div
            key={kelime}
            style={{
              background: theme.surface,
              border: `1px solid ${theme.border}`,
              borderRadius: "10px",
              padding: "16px 20px",
              display: "flex",
              gap: "16px",
              alignItems: "baseline",
            }}
          >
            <span
              style={{
                color: theme.accent,
                fontWeight: "bold",
                fontSize: "16px",
                minWidth: "140px",
                flexShrink: 0,
              }}
            >
              {kelime}
            </span>
            <span
              style={{
                color: theme.textSecondary,
                fontSize: "14px",
                lineHeight: "1.6",
              }}
            >
              {anlam}
            </span>
          </div>
        ))}

        {filtrelenmis.length === 0 && (
          <div
            style={{
              textAlign: "center",
              padding: "48px",
              color: theme.textSecondary,
            }}
          >
            "{aramaMetni}" için sonuç bulunamadı.
          </div>
        )}
      </div>
    </div>
  )
}