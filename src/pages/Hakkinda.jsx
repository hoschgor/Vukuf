import { useApp } from "../AppContext"
import { useState } from "react"

export default function Hakkinda() {
  const { theme } = useApp()
  const [selectedAyet, setSelectedAyet] = useState(null)
  const [meal, setMeal] = useState("")

  // Ayet meallerini tutan obje
  const ayetMealleri = {
    "بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ": "Rahman ve Rahim olan Allah'ın adıyla.",
    "وَمَا تَوْفِيقِي إِلَّا بِاللَّهِ": "Benim başarım ancak Allah'ın yardımıyladır."
  }

  const handleAyetClick = (ayetMetni) => {
    setSelectedAyet(ayetMetni)
    setMeal(ayetMealleri[ayetMetni])
    // 4 saniye sonra otomatik kapat
    setTimeout(() => {
      setSelectedAyet(null)
      setMeal("")
    }, 4000)
  }

  return (
    <div style={{ 
      maxWidth: "800px", 
      margin: "0 auto", 
      padding: "60px 24px",
      minHeight: "100vh",
      background: theme.background,
      position: "relative",
    }}>
      <div style={{
        background: theme.surface,
        borderRadius: "16px",
        padding: "40px",
        border: `1px solid ${theme.border}`,
        boxShadow: "0 4px 20px rgba(0,0,0,0.05)",
        position: "relative",
      }}>
        <h1 style={{
          fontSize: "28px",
          color: theme.accent,
          fontFamily: "PlayfairDisplay, serif",
          marginBottom: "24px",
          textAlign: "center",
        }}>
          📚 Hakkında
        </h1>
        
        <div style={{
          fontSize: "22px",
          color: theme.text,
          lineHeight: "1.8",
          textAlign: "center",
        }}>
          <p style={{ marginBottom: "12px" }}>
            <strong 
              onClick={() => handleAyetClick("بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ")}
              style={{ 
                cursor: "pointer", 
                transition: "all 0.2s",
              }}
              onMouseEnter={(e) => e.currentTarget.style.opacity = "0.7"}
              onMouseLeave={(e) => e.currentTarget.style.opacity = "1"}
            >
              بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ
            </strong>, 
          </p>  
          <p style={{ marginBottom: "12px" }}>
            <strong 
              onClick={() => handleAyetClick("وَمَا تَوْفِيقِي إِلَّا بِاللَّهِ")}
              style={{ 
                cursor: "pointer", 
                transition: "all 0.2s",
              }}
              onMouseEnter={(e) => e.currentTarget.style.opacity = "0.7"}
              onMouseLeave={(e) => e.currentTarget.style.opacity = "1"}
            >
              وَمَا تَوْفِيقِي إِلَّا بِاللَّهِ
            </strong>
            <span style={{ fontSize: "12px", color: theme.textSecondary, marginLeft: "8px" }}>
              (Hûd: 88)
            </span>
          </p>
          
          {/* Meal Popup */}
          {selectedAyet && (
            <div style={{
              position: "fixed",
              bottom: "30px",
              left: "50%",
              transform: "translateX(-50%)",
              background: theme.surface,
              border: `2px solid ${theme.accent}`,
              borderRadius: "12px",
              padding: "16px 24px",
              maxWidth: "90%",
              width: "400px",
              zIndex: 1000,
              boxShadow: "0 8px 32px rgba(0,0,0,0.2)",
              animation: "slideUp 0.3s ease",
            }}>
              <div style={{ 
                fontSize: "18px", 
                fontWeight: "bold", 
                color: theme.accent,
                marginBottom: "8px",
                fontFamily: "PlayfairDisplay, serif",
              }}>
                📖 Meal
              </div>
              <div style={{ 
                fontSize: "16px", 
                color: theme.text,
                lineHeight: "1.6",
                marginBottom: "12px",
              }}>
                {meal}
              </div>
              <div style={{ 
                fontSize: "20px", 
                color: theme.textSecondary,
                textAlign: "right",
                fontFamily: "serif",
              }}>
                {selectedAyet}
              </div>
            </div>
          )}
          
          <p style={{ marginBottom: "20px", color: theme.textSecondary, fontSize: "14px" }}>
            Vukuf, İslam Âlimlerinin, istifade edileceği ümit edilen seçkin eserlerini kolaylıkla okuyabilmeyi amaçlanarak derlenmiştir. 
          </p>

          <p style={{ 
            marginLeft: "2px", 
            color: theme.textSecondary, 
            fontSize: "12px", 
            textAlign: "left",
            marginBottom: "0px",
            marginTop: 0
          }}>
            Yararlanılan kişi ve kaynaklar: 
          </p>
          <p style={{ 
            marginBottom: "4px", 
            textAlign: "left",
            marginTop: 0
          }}>
            <span style={{ fontSize: "12px", color: theme.textSecondary, marginRight: "12px" }}>
              Necati Aksu (necatiaksu.net)
            </span>
          </p>
          
          <div style={{
            marginTop: "32px",
            paddingTop: "24px",
            borderTop: `1px solid ${theme.border}`,
            fontSize: "12px",
            color: theme.textSecondary,
          }}>
            <p>Döküman olarak katkıda bulunmak için, hoschgor@gmail.com adresi üzerinden iletişime geçebilirsiniz.
              <p style={{ marginTop: "8px", opacity: 0.6 }}></p>
              📖 Geliştirilmeye devam ediyor...</p>
            <p style={{ marginTop: "8px", opacity: 0.6 }}>Vukuf v1.0.0 · 2026</p>
          </div>
        </div>
      </div>
      
      <style>
        {`
          @keyframes slideUp {
            from {
              opacity: 0;
              transform: translateX(-50%) translateY(20px);
            }
            to {
              opacity: 1;
              transform: translateX(-50%) translateY(0);
            }
          }
        `}
      </style>
    </div>
  )
}