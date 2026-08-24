import { useApp } from "../AppContext"
import { useState } from "react"

export default function Hakkinda() {
  const { theme, arapcaFont } = useApp()
  const [selectedAyet, setSelectedAyet] = useState(null)
  const [meal, setMeal] = useState("")

  const ayetMealleri = {
    "بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ": "Rahman ve Rahim olan Allah'ın adıyla.",
    "وَمَا تَوْفِيقِي إِلَّا بِاللَّهِ": "Başarım, ancak Allah'ın yardımıyladır.",
  }

  const handleAyetClick = (ayetMetni) => {
    setSelectedAyet(ayetMetni)
    setMeal(ayetMealleri[ayetMetni])
    setTimeout(() => { setSelectedAyet(null); setMeal("") }, 4000)
  }

  const ayetStil = {
    cursor: "pointer",
    transition: "opacity 0.2s",
    display: "inline-block",
  }
  const hover = (e, v) => { e.currentTarget.style.opacity = v }

  return (
    <div style={{
      maxWidth: "760px",
      margin: "0 auto",
      padding: "56px 24px",
      minHeight: "100vh",
      background: theme.background,
      position: "relative",
    }}>
      <div style={{
        background: theme.surface,
        borderRadius: "18px",
        padding: "44px 40px",
        border: `1px solid ${theme.border}`,
        boxShadow: "0 6px 28px rgba(0,0,0,0.06)",
      }}>
        <h1 style={{
          fontSize: "27px",
          color: theme.accent,
          fontFamily: "PlayfairDisplay, serif",
          margin: "0 0 6px",
          textAlign: "center",
          letterSpacing: "0.5px",
        }}>
          Hakkında
        </h1>
        <div style={{ width: "48px", height: "2px", background: theme.accent, opacity: 0.5, margin: "0 auto 30px", borderRadius: "2px" }} />

        {/* Âyetler — RTL, tıklanınca meal */}
        <div style={{
          fontFamily: arapcaFont || "'Scheherazade New', 'Amiri', 'Traditional Arabic', serif",
          direction: "rtl",
          textAlign: "center",
          color: theme.text,
          lineHeight: "1.9",
          fontSize: "23px",
        }}>
          <p style={{ margin: "0 0 10px" }}>
            <span onClick={() => handleAyetClick("بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ")}
              style={ayetStil} onMouseEnter={(e) => hover(e, "0.7")} onMouseLeave={(e) => hover(e, "1")}>
              بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ
            </span>
          </p>
          <p style={{ margin: "0 0 4px" }}>
            <span onClick={() => handleAyetClick("وَمَا تَوْفِيقِي إِلَّا بِاللَّهِ")}
              style={ayetStil} onMouseEnter={(e) => hover(e, "0.7")} onMouseLeave={(e) => hover(e, "1")}>
              وَمَا تَوْفِيقِي إِلَّا بِاللَّهِ
            </span>
          </p>
          <p style={{ margin: 0, fontSize: "12px", color: theme.textSecondary, fontFamily: "inherit", direction: "ltr" }}>
            (Hûd Sûresi, 88)
          </p>
        </div>

        {/* Açıklama */}
        <p style={{
          marginTop: "34px",
          color: theme.text,
          fontSize: "15px",
          lineHeight: "1.85",
          textAlign: "center",
        }}>
          Vukuf; İslâm âlimlerinin istifade edilmesi ümit edilen seçkin eserlerini ve diğer
          islâmî eserleri kolaylıkla okuyabilmeyi ve inceleyebilmeyi amaçlayarak derlenmiştir.
          Herhangi bir ticarî amacı yoktur.
        </p>

        {/* Kaynaklar */}
        <div style={{
          marginTop: "32px",
          paddingTop: "24px",
          borderTop: `1px solid ${theme.border}`,
        }}>
          <h2 style={{
            fontSize: "13px",
            letterSpacing: "1px",
            textTransform: "uppercase",
            color: theme.accent,
            margin: "0 0 16px",
            fontFamily: "PlayfairDisplay, serif",
          }}>
            Yararlanılan Kişi ve Kaynaklar
          </h2>

          <div style={{ fontSize: "14px", color: theme.text, lineHeight: "1.7" }}>
            <div style={{ marginBottom: "14px" }}>
              <div style={{ fontWeight: 600 }}>
                <a href="https://instagram.com/3ondokuz" target="_blank" rel="noopener noreferrer"
                  style={{ color: theme.accent, textDecoration: "none", borderBottom: `1px solid ${theme.accent}55` }}>
                  3ondokuz
                </a>
              </div>
              <div style={{ fontSize: "12.5px", color: theme.textSecondary, marginTop: "2px" }}>
                Risale-i Nûr, Kur'ân-ı Kerîm, Evrad, Ezkâr ve Riyâzü's-Sâlihîn kaynakları
              </div>
            </div>

            <div>
              <div style={{ fontWeight: 600 }}>Necati Aksu <span style={{ fontWeight: 400, color: theme.textSecondary }}>(necatiaksu.net)</span></div>
              <div style={{ fontSize: "12.5px", color: theme.textSecondary, marginTop: "2px" }}>
                İmam Gazzâlî Eserleri, Abdülkâdir Geylânî Eserleri
              </div>
            </div>
          </div>
        </div>

        {/* Katkı / iletişim */}
        <div style={{
          marginTop: "30px",
          paddingTop: "22px",
          borderTop: `1px solid ${theme.border}`,
          fontSize: "12.5px",
          color: theme.textSecondary,
          lineHeight: "1.7",
        }}>
          <p style={{ margin: "0 0 6px" }}>
            Dokümanlarla katkıda bulunmak için:{" "}
            <a href="mailto:hoschgor@gmail.com" style={{ color: theme.accent, textDecoration: "none", borderBottom: `1px solid ${theme.accent}55` }}>
              hoschgor@gmail.com
            </a>
          </p>
          <p style={{ margin: "0", opacity: 0.7 }}>Geliştirilmeye devam ediyor…</p>
          <p style={{ margin: "6px 0 0", opacity: 0.7 }}>Vukuf v1.0.0 · 2026</p>
        </div>
      </div>

      {/* Meal popup */}
      {selectedAyet && (
        <div style={{
          position: "fixed",
          bottom: "30px",
          left: "50%",
          transform: "translateX(-50%)",
          background: theme.surface,
          border: `2px solid ${theme.accent}`,
          borderRadius: "14px",
          padding: "16px 22px",
          maxWidth: "90%",
          width: "400px",
          zIndex: 1000,
          boxShadow: "0 10px 34px rgba(0,0,0,0.22)",
          animation: "slideUp 0.3s ease",
        }}>
          <div style={{ fontSize: "13px", fontWeight: 700, color: theme.accent, marginBottom: "8px", fontFamily: "PlayfairDisplay, serif", letterSpacing: "0.5px" }}>
            Meâl
          </div>
          <div style={{ fontSize: "15px", color: theme.text, lineHeight: "1.6", marginBottom: "12px" }}>
            {meal}
          </div>
          <div style={{ fontSize: "20px", color: theme.textSecondary, textAlign: "right", fontFamily: arapcaFont || "'Scheherazade New', 'Amiri', serif", direction: "rtl" }}>
            {selectedAyet}
          </div>
        </div>
      )}

      <style>{`
        @keyframes slideUp {
          from { opacity: 0; transform: translateX(-50%) translateY(20px); }
          to   { opacity: 1; transform: translateX(-50%) translateY(0); }
        }
      `}</style>
    </div>
  )
}
