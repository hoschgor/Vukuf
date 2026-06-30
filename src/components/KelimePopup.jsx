import { useState, useRef } from "react"
import { Play, Pause, X } from "lucide-react"

const WBW_BASE = "https://audio.qurancdn.com/wbw"

function kelimeMp3(sureNo, ayetNo, position) {
  const pos = position && position > 0 ? position : 1
  const s = String(sureNo).padStart(3, "0")
  const a = String(ayetNo).padStart(3, "0")
  const k = String(position).padStart(3, "0")
  return `${WBW_BASE}/${s}_${a}_${k}.mp3`
}

export default function KelimePopup({ kelime, konum, player, sureNo, ayetNo, theme, onKapat }) {
  if (!kelime) return null

  const [kelimeCaliyor, setKelimeCaliyor] = useState(false)
  const kelimeAudioRef = useRef(null)

  const ayetCaliniyor =
    player?.durum === "caliyor" &&
    player?.aktifAyet?.sureNo === sureNo &&
    player?.aktifAyet?.ayetNo === ayetNo

  const ayetDuraklatildi =
    player?.durum === "duraklatildi" &&
    player?.aktifAyet?.sureNo === sureNo &&
    player?.aktifAyet?.ayetNo === ayetNo

  function kelimeTikla() {
    if (!kelime.position) return

    if (kelimeCaliyor) {
      kelimeAudioRef.current?.pause()
      setKelimeCaliyor(false)
      return
    }

    // Ana player'ı duraklat
    if (player?.durum === "caliyor") player.duraklat()

    const audio = new Audio(kelimeMp3(sureNo, ayetNo, kelime.position))
    kelimeAudioRef.current = audio
    setKelimeCaliyor(true)

    audio.play().catch(() => setKelimeCaliyor(false))
    audio.addEventListener("ended", () => setKelimeCaliyor(false))
    audio.addEventListener("error", () => setKelimeCaliyor(false))
  }

  function ayetTikla() {
    if (!player) return
    if (ayetCaliniyor) {
      player.duraklat()
    } else if (ayetDuraklatildi) {
      player.devamEt()
    } else {
      // Kelime sesini durdur
      if (kelimeAudioRef.current) {
        kelimeAudioRef.current.pause()
        setKelimeCaliyor(false)
      }
      player.ayetCal(sureNo, ayetNo)
    }
  }

  const butonStil = (aktif) => ({
    display: "flex", alignItems: "center", gap: "5px",
    padding: "5px 10px", borderRadius: "20px", cursor: "pointer",
    border: `1px solid ${theme.accent}40`,
    background: aktif ? theme.accent : `${theme.accent}18`,
    color: aktif ? "#fff" : theme.accent,
    fontSize: "11px", fontWeight: "500",
    transition: "all 0.15s",
  })

  return (
    <>
      {/* Backdrop */}
      <div onClick={onKapat} style={{ position: "fixed", inset: 0, zIndex: 299 }} />

      {/* Popup */}
      <div style={{
        position: "fixed",
        left: konum.x,
        top: konum.y,
        zIndex: 300,
        background: theme.surface,
        border: `1px solid ${theme.border}`,
        borderRadius: "14px",
        padding: "14px 16px",
        maxWidth: "260px",
        minWidth: "180px",
        maxHeight: "35vh",
        overflowY: "auto",
        boxShadow: "0 4px 24px rgba(0,0,0,0.15)",
      }}>

        {/* Üst: Arapça + kapat */}
        <div style={{
          display: "flex", alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "6px", gap: "8px",
        }}>
          <span style={{
            fontSize: "22px", color: theme.accent,
            fontFamily: "'KFGQPC Uthmanic Script HAFS', serif",
            direction: "rtl", lineHeight: 1.4,
          }}>
            {kelime.ham}
          </span>
          <button onClick={onKapat} style={{
            background: "none", border: "none",
            cursor: "pointer", color: theme.textSecondary,
            display: "flex", padding: "2px", flexShrink: 0,
          }}>
            <X size={14} />
          </button>
        </div>

        {/* Okunuş */}
        {kelime.okunus && (
          <div style={{
            fontSize: "12px", color: theme.textSecondary,
            fontStyle: "italic", marginBottom: "8px",
          }}>
            {kelime.okunus}
          </div>
        )}

        {/* Anlamlar */}
        <div style={{
          fontSize: "13px", color: theme.text,
          lineHeight: "1.7", marginBottom: "12px",
        }}>
          {kelime.anlamlar?.length > 0
            ? kelime.anlamlar.map((a, i) => (
                <span key={i}>
                  {i + 1}. {a}
                  {i < kelime.anlamlar.length - 1 && <br />}
                </span>
              ))
            : <span style={{ color: theme.textSecondary, fontSize: "12px" }}>
                Anlam bulunamadı
              </span>
          }
        </div>

        {/* Alt: ses butonları */}
        <div style={{
          borderTop: `1px solid ${theme.border}`,
          paddingTop: "10px",
          display: "flex", alignItems: "center",
          justifyContent: "space-between", gap: "8px",
        }}>
          {/* Kelime sesi */}
          <button onClick={kelimeTikla} style={butonStil(kelimeCaliyor)}
            title={kelimeCaliyor ? "Durdur" : "Kelimeyi dinle"}>
            {kelimeCaliyor ? <Pause size={10} /> : <Play size={10} />}
            Kelime
          </button>

          {/* Ayet sesi */}
          <button onClick={ayetTikla} style={butonStil(ayetCaliniyor)}
            title={ayetCaliniyor ? "Duraklat" : "Âyeti dinle"}>
            {ayetCaliniyor ? <Pause size={10} /> : <Play size={10} />}
            Âyet
          </button>
        </div>
      </div>
    </>
  )
}
