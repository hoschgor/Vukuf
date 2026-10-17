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
    /* TAŞMA (17 Ekim 2026, iPhone ekran görüntüsü): bir anlamdaki boşluksuz uzun ifade
       kartı ekrandan taşırıyor, sayfa genişleyince Safari her şeyi ¼ boyuta küçültüyordu.
       Artık uzun ifadeler satır içinde bölünüyor; hiçbir öğe ekran genişliğini aşamıyor. */
    <div style={{ maxWidth: "800px", width: "100%", boxSizing: "border-box", margin: "0 auto", padding: "40px 24px", overflowWrap: "anywhere" }}>
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
          type="search"
          inputMode="search"
          enterKeyHint="search"
          placeholder="Kelime veya anlam ara..."
          value={aramaMetni}
          onChange={(e) => setAramaMetni(e.target.value)}
          style={{
            flex: 1,
            minWidth: 0,
            background: "transparent",
            border: "none",
            outline: "none",
            // 16 px: iPhone'da 16 px'ten küçük kutuya dokunulunca Safari sayfayı
            // yakınlaştırıyor ve kutudan çıkınca geri uzaklaştırmıyordu (17 Ekim 2026)
            fontSize: "16px",
            fontFamily: "inherit",
            color: theme.text,
          }}
        />
        {aramaMetni && (
          <span style={{ fontSize: "13px", color: theme.textSecondary, flexShrink: 0 }}>
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
              minWidth: 0,
            }}
          >
            <span
              style={{
                color: theme.accent,
                fontWeight: "bold",
                fontSize: "16px",
                minWidth: "min(140px, 30vw)",
                maxWidth: "45%",
                flexShrink: 0,
                overflowWrap: "anywhere",
              }}
            >
              {kelime}
            </span>
            <span
              style={{
                color: theme.textSecondary,
                fontSize: "14px",
                lineHeight: "1.6",
                flex: 1,
                minWidth: 0,
                overflowWrap: "anywhere",
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
