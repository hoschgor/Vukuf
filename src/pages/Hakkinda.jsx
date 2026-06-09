import { useApp } from "../AppContext"

export default function Hakkinda() {
  const { theme } = useApp()

  return (
    <div style={{ 
      maxWidth: "800px", 
      margin: "0 auto", 
      padding: "60px 24px",
      minHeight: "100vh",
      background: theme.background,
    }}>
      <div style={{
        background: theme.surface,
        borderRadius: "16px",
        padding: "40px",
        border: `1px solid ${theme.border}`,
        boxShadow: "0 4px 20px rgba(0,0,0,0.05)",
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
          fontSize: "15px",
          color: theme.text,
          lineHeight: "1.8",
          textAlign: "center",
        }}>
          <p style={{ marginBottom: "20px" }}>
            <strong>Vukûf</strong>, İslam düşünce geleneğinin önemli eserlerini 
            dijital ortamda bir araya getiren bir kütüphanedir.
          </p>
          
          <p style={{ marginBottom: "20px", color: theme.textSecondary, fontSize: "14px" }}>
            Kelâm, Tasavvuf, Fıkıh, Tefsir, Hadis ve daha birçok alanda 
            temel eserlere kolay erişim imkanı sunar.
          </p>
          
          <div style={{
            marginTop: "32px",
            paddingTop: "24px",
            borderTop: `1px solid ${theme.border}`,
            fontSize: "12px",
            color: theme.textSecondary,
          }}>
            <p>📖 Geliştirilmeye devam ediyor</p>
            <p style={{ marginTop: "8px", opacity: 0.6 }}>v1.0.0 · 2025</p>
          </div>
        </div>
      </div>
    </div>
  )
}