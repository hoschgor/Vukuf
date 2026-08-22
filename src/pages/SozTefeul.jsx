import { useState } from "react"
import { useApp } from "../AppContext"
import { Shuffle, RefreshCw, SlidersHorizontal, X } from "lucide-react"
import tefeulMetinleri from "../data/tefeul.json"

const kategoriler = {
  "Tümü": [],
  "Hadis-i Şerif": ["Hadis-i Şerif"],
  "Kelam": [
    "İmam-ı Azam Ebû Hanîfe",
    "İmam Mâlik",
    "İmam Şâfiî",
    "İmam Ahmed bin Hanbel",
    "İmam Eş'arî",
    "İmam Mâtürîdî",
  ],
  "Tasavvuf": [
    "Abdülkâdir Geylânî",
    "Muhyiddin İbnü'l-Arabî",
    "İmam Rabbânî",
    "Şâh-ı Nakşibend",
    "Ahmed Yesevî",
    "Ebû Saîd-i Ebü'l-Hayr",
    "Mevlânâ Celâleddîn-i Rûmî",
    "Yunus Emre",
    "Hacı Bektaş-ı Velî",
  ],
  "Kelam & Felsefe": [
    "İmam Gazâlî",
    "Şehristânî",
  ],
  "Halifeler": [
    "Hz. Ebû Bekir r.a",
    "Hz. Ömer r.a",
    "Hz. Osman r.a",
    "Hz. Ali r.a"
  ],
  "Risale-i Nur": [
    "Bediüzzaman Said Nursî",
  ],
}

export default function Tefeul() {
  const { theme } = useApp()
  const [animasyon, setAnimasyon] = useState(false)
  const [filtrePanelAcik, setFiltrePanelAcik] = useState(false)
  const [seciliKategori, setSeciliKategori] = useState("Tümü")
  const [seciliYazar, setSeciliYazar] = useState(null)
  const [mevcutIndex, setMevcutIndex] = useState(
    () => Math.floor(Math.random() * tefeulMetinleri.length)
  )

  const filtrelenmis = tefeulMetinleri.filter(m => {
    if (seciliYazar) return m.yazar === seciliYazar
    if (seciliKategori === "Tümü") return true
    if (seciliKategori === "Hadis-i Şerif") return m.yazar === "Hadis-i Şerif"
    return kategoriler[seciliKategori]?.includes(m.yazar)
  })

  const mevcutMetin = filtrelenmis[mevcutIndex % (filtrelenmis.length || 1)]

  function yeniMetin() {
    setAnimasyon(true)
    setTimeout(() => {
      let yeniIndex
      do {
        yeniIndex = Math.floor(Math.random() * filtrelenmis.length)
      } while (yeniIndex === mevcutIndex && filtrelenmis.length > 1)
      setMevcutIndex(yeniIndex)
      setAnimasyon(false)
    }, 300)
  }

  return (
    <div style={{
      maxWidth: "680px",
      margin: "0 auto",
      padding: "40px 24px",
      minHeight: "calc(100vh - 56px)",
      display: "flex",
      flexDirection: "column",
      justifyContent: "center",
    }}>

      {/* Başlık */}
      <div style={{ marginBottom: "32px" }}>
        <div style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "10px",
          position: "relative",
          marginBottom: (seciliYazar || seciliKategori !== "Tümü") ? "10px" : "0",
        }}>
          <Shuffle size={20} color={theme.accent} />
          <h1 style={{ fontSize: "22px", color: theme.accent, letterSpacing: "2px" }}>
            Kısa Tefeül Modu
          </h1>

          {/* Filtre ikonu */}
          <button
            onClick={() => setFiltrePanelAcik(!filtrePanelAcik)}
            style={{
              position: "absolute",
              right: 0,
              color: (seciliKategori !== "Tümü" || seciliYazar) ? theme.accent : theme.textSecondary,
              padding: "6px",
              borderRadius: "8px",
              display: "flex",
              alignItems: "center",
              background: (seciliKategori !== "Tümü" || seciliYazar) ? `${theme.accent}18` : "transparent",
            }}
          >
            <SlidersHorizontal size={16} />
          </button>

          {/* Filtre paneli */}
          {filtrePanelAcik && (
            <>
              <div onClick={() => setFiltrePanelAcik(false)} style={{ position: "fixed", inset: 0, zIndex: 100 }} />
              <div style={{
                position: "absolute",
                top: "36px",
                right: 0,
                background: theme.surface,
                border: `1px solid ${theme.border}`,
                borderRadius: "12px",
                padding: "12px",
                zIndex: 200,
                minWidth: "220px",
                boxShadow: "0 4px 20px rgba(0,0,0,0.15)",
                maxHeight: "400px",
                overflowY: "auto",
              }}>
                <button
                  onClick={() => { setSeciliKategori("Tümü"); setSeciliYazar(null); setFiltrePanelAcik(false); setMevcutIndex(Math.floor(Math.random() * 10000)) }}
                  style={{
                    width: "100%",
                    textAlign: "left",
                    padding: "8px 10px",
                    borderRadius: "6px",
                    fontSize: "13px",
                    color: (!seciliYazar && seciliKategori === "Tümü") ? theme.accent : theme.text,
                    background: (!seciliYazar && seciliKategori === "Tümü") ? `${theme.accent}18` : "transparent",
                    marginBottom: "4px",
                  }}
                >
                  Tümü
                </button>
                {Object.entries(kategoriler).filter(([k]) => k !== "Tümü").map(([kategori, alimListesi]) => (
                  <div key={kategori} style={{ marginBottom: "8px" }}>
                    <button
                      onClick={() => { setSeciliKategori(kategori); setSeciliYazar(null); setFiltrePanelAcik(false); setMevcutIndex(Math.floor(Math.random() * 10000)) }}
                      style={{
                        width: "100%",
                        textAlign: "left",
                        padding: "6px 10px",
                        borderRadius: "6px",
                        fontSize: "11px",
                        fontWeight: "bold",
                        letterSpacing: "0.5px",
                        color: (!seciliYazar && seciliKategori === kategori) ? theme.accent : theme.textSecondary,
                        background: (!seciliYazar && seciliKategori === kategori) ? `${theme.accent}18` : "transparent",
                      }}
                    >
                      {kategori.toUpperCase()}
                    </button>
                    {alimListesi.map(alim => (
                      <button
                        key={alim}
                        onClick={() => { setSeciliYazar(alim); setSeciliKategori(kategori); setFiltrePanelAcik(false); setMevcutIndex(Math.floor(Math.random() * 10000)) }}
                        style={{
                          width: "100%",
                          textAlign: "left",
                          padding: "6px 10px 6px 20px",
                          borderRadius: "6px",
                          fontSize: "13px",
                          color: seciliYazar === alim ? theme.accent : theme.text,
                          background: seciliYazar === alim ? `${theme.accent}18` : "transparent",
                        }}
                      >
                        {alim}
                      </button>
                    ))}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Seçili filtre badge */}
        {(seciliYazar || seciliKategori !== "Tümü") && (
          <div style={{
            display: "flex",
            justifyContent: "center",
          }}>
            <div style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              padding: "4px 12px",
              borderRadius: "20px",
              background: `${theme.accent}18`,
              border: `1px solid ${theme.accent}40`,
              fontSize: "13px",
              color: theme.accent,
            }}>
              <span>{seciliYazar || seciliKategori}</span>
              <button
                onClick={() => { setSeciliKategori("Tümü"); setSeciliYazar(null); setMevcutIndex(Math.floor(Math.random() * 10000)) }}
                style={{ color: theme.accent, display: "flex", alignItems: "center", padding: "0" }}
              >
                <X size={14} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Kart */}
      {mevcutMetin ? (
        <div style={{
          background: theme.surface,
          border: `1px solid ${theme.border}`,
          borderRadius: "16px",
          padding: "48px 40px",
          textAlign: "center",
          opacity: animasyon ? 0 : 1,
          transform: animasyon ? "translateY(8px)" : "translateY(0)",
          transition: "all 0.3s ease",
        }}>
          <div style={{
            fontSize: "64px",
            color: theme.accent,
            opacity: 0.3,
            lineHeight: 1,
            marginBottom: "16px",
            fontFamily: "Georgia, serif",
          }}>
            "
          </div>
          <p style={{
            fontSize: "18px",
            lineHeight: "1.9",
            color: theme.text,
            marginBottom: "32px",
            fontStyle: "italic",
          }}>
            {mevcutMetin.metin}
          </p>
          <div>
            <div style={{ fontSize: "13px", color: theme.accent, fontWeight: "bold", marginBottom: "4px" }}>
              {mevcutMetin.yazar}
            </div>
            <div style={{ fontSize: "12px", color: theme.textSecondary }}>
              {mevcutMetin.kaynak}
            </div>
          </div>
        </div>
      ) : (
        <div style={{
          background: theme.surface,
          border: `1px solid ${theme.border}`,
          borderRadius: "16px",
          padding: "48px 40px",
          textAlign: "center",
          color: theme.textSecondary,
        }}>
          Bu alime ait söz henüz eklenmemiş.
        </div>
      )}

      {/* Yeni tefeül butonu */}
      <div style={{ display: "flex", justifyContent: "center", marginTop: "32px" }}>
        <button
          onClick={yeniMetin}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            padding: "12px 28px",
            borderRadius: "10px",
            background: theme.surface,
            border: `1px solid ${theme.border}`,
            color: theme.textSecondary,
            fontSize: "14px",
            transition: "all 0.2s",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = theme.accent
            e.currentTarget.style.color = theme.accent
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = theme.border
            e.currentTarget.style.color = theme.textSecondary
          }}
        >
          <RefreshCw size={16} />
          Yeni Tefeül
        </button>
      </div>
    </div>
  )
}