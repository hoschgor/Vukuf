import { useState, useRef } from "react"
import { Play, Pause, X, Link2 } from "lucide-react"
import kelimeMapping from "../data/kelime-mapping.json"

// Bizim kelime id'miz → quran.com kelime sırası.
// NEDEN GEREKLİ: kelime sesleri (WBW mp3) quran.com'un kelime numaralarına göre
// dosyalanmış. Bizim bölünmemiz bazı yerlerde farklı (ör. Bakara 40'ta bizde
// "يَا" + "بَنٖي" iki kelime, onlarda tek), dolayısıyla BİZİM sıramızla dosya
// istemek o âyette yanlış kelimeyi çaldırır. Eşleme varsa ondan okunur.
function eslenenSira(kelimeId) {
  if (!kelimeId) return null
  const eslenen = kelimeMapping[kelimeId]
  if (!eslenen) return null
  const p = String(eslenen).split(":")
  const n = parseInt(p[2], 10)
  return Number.isFinite(n) && n > 0 ? n : null
}

const WBW_BASE = "https://audio.qurancdn.com/wbw"

function kelimeMp3(sureNo, ayetNo, position) {
  const pos = position && position > 0 ? position : 1
  const s = String(sureNo).padStart(3, "0")
  const a = String(ayetNo).padStart(3, "0")
  const k = String(pos).padStart(3, "0")
  return `${WBW_BASE}/${s}_${a}_${k}.mp3`
}

export default function KelimePopup({ kelime, konum, player, sureNo, ayetNo, theme, onKapat }) {
  const [kelimeCaliyor, setKelimeCaliyor] = useState(false)
  const kelimeAudioRef = useRef(null)

  if (!kelime) return null

  // ── BİRLEŞİK KELİME ─────────────────────────────────────────────
  // quran.com'un TEK kelime saydığı yeri biz iki kelimeye bölmüşsek (176 grup),
  // baloncuk bunları tek birim gösterir: Arapça zaten birleşik geliyor (kelime.ham),
  // burada bir de kaç parçadan oluştuğu söylenir ve SES doğru sıradan çalınır.
  const uyeler = Array.isArray(kelime.grupUyeleri) ? kelime.grupUyeleri : null
  const birlesik = !!(uyeler && uyeler.length > 1)
  // Ses sırası: önce eşleme tablosu (doğrusu bu), yoksa gelen konum.
  const sesSirasi =
    eslenenSira(kelime.id) ||
    (birlesik ? eslenenSira(uyeler[0]) : null) ||
    kelime.position ||
    null

  const ayetCaliniyor =
    player?.durum === "caliyor" &&
    player?.aktifAyet?.sureNo === sureNo &&
    player?.aktifAyet?.ayetNo === ayetNo

  const ayetDuraklatildi =
    player?.durum === "duraklatildi" &&
    player?.aktifAyet?.sureNo === sureNo &&
    player?.aktifAyet?.ayetNo === ayetNo

  function kelimeTikla() {
    if (!sesSirasi) return

    if (kelimeCaliyor) {
      kelimeAudioRef.current?.pause()
      setKelimeCaliyor(false)
      return
    }

    // Ana player'ı duraklat
    if (player?.durum === "caliyor") player.duraklat()

    const audio = new Audio(kelimeMp3(sureNo, ayetNo, sesSirasi))
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

  const anlamlar = kelime.anlamlar?.length ? kelime.anlamlar : null

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

        {/* Birleşik kelime rozeti — iki kelime tek anlam taşıyor, okuyucu da
            bunları tek birim sayar; kullanıcı "aynı anlam iki kez çıktı" sanmasın. */}
        {birlesik && (
          <div style={{
            display: "inline-flex", alignItems: "center", gap: "4px",
            fontSize: "10px", color: theme.accent,
            background: `${theme.accent}14`,
            border: `1px solid ${theme.accent}30`,
            borderRadius: "999px", padding: "2px 7px",
            marginBottom: "8px",
          }}>
            <Link2 size={10} />
            {uyeler.length} kelime birlikte
          </div>
        )}

        {/* Okunuş */}
        {kelime.okunus && (
          <div style={{
            fontSize: "12px", color: theme.textSecondary,
            fontStyle: "italic", marginBottom: "8px",
          }}>
            {kelime.okunus}
          </div>
        )}

        {/* Anlamlar — madde işareti olarak "1." yerine içi dolu sağ ok.
            Satır başı hizalı kalsın diye her madde flex satırı; ok sabit
            genişlikte, metin sarınca ok hizasının altına kaymaz. */}
        <div style={{
          fontSize: "13px", color: theme.text,
          lineHeight: "1.7", marginBottom: "12px",
        }}>
          {anlamlar
            ? anlamlar.map((a, i) => (
                <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: "6px" }}>
                  <span
                    aria-hidden="true"
                    style={{
                      color: theme.accent,
                      fontSize: "11px",
                      lineHeight: "1.7",
                      flexShrink: 0,
                      userSelect: "none",
                    }}
                  >
                    ▸
                  </span>
                  <span style={{ flex: 1, minWidth: 0 }}>{a}</span>
                </div>
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
