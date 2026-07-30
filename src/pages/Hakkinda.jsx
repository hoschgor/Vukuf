import { useApp } from "../AppContext"
import { useState } from "react"

export default function Hakkinda() {
  const { theme, arapcaFont } = useApp()
  const [selectedAyet, setSelectedAyet] = useState(null)
  const [meal, setMeal] = useState("")

  const ayetMealleri = {
    "بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ": "Rahman ve Rahim olan Allah'ın adıyla.",
    "وَمَا تَوْفِيقِي إِلَّا بِاللَّهِ": "Başarım, ancak Allah'ın yardımıyladır."
  }

  const handleAyetClick = (ayetMetni) => {
    setSelectedAyet(ayetMetni)
    setMeal(ayetMealleri[ayetMetni])
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
          {/* Arapça metinler - RTL ve Arapça font */}
          <div style={{
            fontFamily: arapcaFont || "'Scheherazade New', 'Amiri', 'Traditional Arabic', serif",
            direction: "rtl",
            
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
              </strong>
            </p>  
            <p style={{ marginBottom: "12px" }}>
              <span style={{ 
                fontSize: "14px", 
                color: theme.textSecondary, 
                marginLeft: "12px",
              }}>
                (Hûd: 88)
              </span>
              <strong 
                onClick={() => handleAyetClick("وَمَا تَوْفِيقِي إِلَّا بِاللَّهِ")}
                style={{ 
                  marginLeft: "82px",
                  cursor: "pointer", 
                  transition: "all 0.2s",
                }}
                onMouseEnter={(e) => e.currentTarget.style.opacity = "0.7"}
                onMouseLeave={(e) => e.currentTarget.style.opacity = "1"}
              >
                وَمَا تَوْفِيقِي إِلَّا بِاللَّهِ
              </strong>
            </p>
          </div>
          
          {/* Türkçe metinler - LTR ve kalın */}
          <div style={{ 
            direction: "ltr",
            fontWeight: "bold", // Türkçe metinler kalın
          }}>
            <p style={{ 
              marginBottom: "20px", 
              color: theme.textSecondary, 
              fontSize: "14px",
              fontWeight: "bold", // Kalın
            }}>
              Vukuf, İslam Âlimlerinin, istifade edileceği ümit edilen seçkin eserlerini ve islâmî diğer eserleri kolaylıkla okuyabilmeyi ve inceleyebilmeyi amaçlanarak derlenmiştir, herhangi bir ticari amacı yoktur. 
            </p>

            <p style={{ 
              marginLeft: "2px", 
              color: theme.textSecondary, 
              fontSize: "12px", 
              textAlign: "left",
              marginBottom: "0px",
              marginTop: 0,
              fontWeight: "bold", // Kalın
            }}>
              Yararlanılan kişi ve kaynaklar: 
            </p>
            
            <p style={{ 
              marginBottom: "4px", 
              textAlign: "left",
              marginTop: 0,
              fontWeight: "bold", // Kalın
            }}>
              <span style={{ 
                fontSize: "12px", 
                color: theme.textSecondary, 
                marginRight: "12px",
              }}>
                Necati Aksu (necatiaksu.net) (İmam Gazzâli Eserleri, Abdülkâdir Geylânî Eserleri)
              </span>
            </p>
            
            <div style={{
              marginTop: "32px",
              paddingTop: "24px",
              borderTop: `1px solid ${theme.border}`,
              fontSize: "12px",
              color: theme.textSecondary,
              fontWeight: "bold", // Kalın
            }}>
              <p>Döküman olarak katkıda bulunmak için, hoschgor@gmail.com adresi üzerinden iletişime geçebilirsiniz.</p>
              <p style={{ marginTop: "8px", opacity: 0.6 }}>📖 Geliştirilmeye devam ediyor...</p>
              <p style={{ marginTop: "8px", opacity: 0.6 }}>Vukuf v1.0.0 · 2026</p>
            </div>
          </div>
        </div>
      </div>
      
      {/* Meal Popup - Arapça ve Türkçe ayrımı */}
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
            textAlign: "left",
          }}>
            📖 Meal
          </div>
          
          {/* Türkçe meal - LTR */}
          <div style={{ 
            fontSize: "16px", 
            color: theme.text,
            lineHeight: "1.6",
            marginBottom: "12px",
            textAlign: "left",
            fontWeight: "bold",
          }}>
            {meal}
          </div>
          
          {/* Arapça ayet - RTL */}
          <div style={{ 
            fontSize: "20px", 
            color: theme.textSecondary,
            textAlign: "right",
            fontFamily: arapcaFont || "'Scheherazade New', 'Amiri', serif",
            direction: "rtl",
          }}>
            {selectedAyet}
          </div>
        </div>
      )}
      
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