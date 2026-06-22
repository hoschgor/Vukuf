import { Play, Pause, X } from "lucide-react"

/**
 * AyetPopup
 * ─────────
 * Konum: src/components/AyetPopup.jsx
 *
 * Kullanım:
 *   <AyetPopup
 *     sure={{ id, isim, ayetSayisi }}
 *     ayetNo={3}
 *     meal="Hamd alemlerin rabbi..."
 *     konum={{ x, y }}
 *     player={player}
 *     theme={theme}
 *     onKapat={() => setPopup(null)}
 *   />
 */
export default function AyetPopup({ sure, ayetNo, meal, konum, player, theme, onKapat }) {
  if (!sure || !ayetNo) return null

  const caliniyor =
    player?.durum === "caliyor" &&
    player?.aktifAyet?.sureNo === sure.id &&
    player?.aktifAyet?.ayetNo === ayetNo

  const duraklatildi =
    player?.durum === "duraklatildi" &&
    player?.aktifAyet?.sureNo === sure.id &&
    player?.aktifAyet?.ayetNo === ayetNo

  // Sure tamamı mı çalıyor (besmele butonundan başlatıldıysa)
  const sureCaliyor =
    player?.durum === "caliyor" &&
    player?.aktifAyet?.sureNo === sure.id

  function sesTikla() {
    if (!player) return
    if (caliniyor) {
      player.duraklat()
    } else if (duraklatildi) {
      player.devamEt()
    } else {
      player.ayetCal(sure.id, ayetNo)
    }
  }

  // Sure başından bu ayete kadar çal
  function sureyiCalTikla() {
    if (!player) return
    if (sureCaliyor) {
      player.duraklat()
    } else {
      player.sureCal(sure.id, sure.ayetSayisi, ayetNo)
    }
  }

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onKapat}
        style={{ position: "fixed", inset: 0, zIndex: 299 }}
      />

      {/* Popup kutusu */}
      <div style={{
        position: "fixed",
        left: konum.x,
        top: konum.y,
        zIndex: 300,
        background: theme.surface,
        border: `1px solid ${theme.border}`,
        borderRadius: "14px",
        padding: "14px 16px",
        maxWidth: "300px",
        minWidth: "220px",
        boxShadow: "0 4px 24px rgba(0,0,0,0.15)",
      }}>

        {/* Üst satır: sure · ayet + kapat */}
        <div style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "10px",
          gap: "8px",
        }}>
          <div>
            <span style={{
              fontSize: "13px",
              fontWeight: "600",
              color: theme.accent,
            }}>
              {sure.isim}
            </span>
            <span style={{
              fontSize: "12px",
              color: theme.textSecondary,
              marginLeft: "6px",
            }}>
              {ayetNo}. Âyet
            </span>
          </div>
          <button
            onClick={onKapat}
            style={{
              background: "none", border: "none",
              cursor: "pointer", color: theme.textSecondary,
              display: "flex", padding: "2px", flexShrink: 0,
            }}
          >
            <X size={14} />
          </button>
        </div>

        {/* Meal */}
        <div style={{
          fontSize: "13px",
          color: theme.text,
          lineHeight: "1.75",
          direction: "ltr",
          marginBottom: "12px",
          paddingBottom: "10px",
          borderBottom: `1px solid ${theme.border}`,
        }}>
          {meal || (
            <span style={{ color: theme.textSecondary, fontStyle: "italic" }}>
              Bu âyet için meal henüz eklenmemiş.
            </span>
          )}
        </div>

        {/* Alt: ses butonları */}
        <div style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "8px",
        }}>
          {/* Tek ayet dinle */}
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <button
              onClick={sesTikla}
              title={caliniyor ? "Duraklat" : "Bu âyeti dinle"}
              style={{
                display: "flex", alignItems: "center", justifyContent: "center",
                width: "28px", height: "28px", borderRadius: "50%",
                border: `1px solid ${theme.accent}40`,
                background: caliniyor ? theme.accent : `${theme.accent}18`,
                color: caliniyor ? "#fff" : theme.accent,
                cursor: "pointer", transition: "all 0.15s",
              }}
            >
              {caliniyor ? <Pause size={11} /> : <Play size={11} />}
            </button>
            <span style={{ fontSize: "11px", color: theme.textSecondary }}>
              Âyeti dinle
            </span>
          </div>

          {/* Bu ayetten sureyi çal */}
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <span style={{ fontSize: "11px", color: theme.textSecondary }}>
              Buradan oku
            </span>
            <button
              onClick={sureyiCalTikla}
              title={sureCaliyor ? "Duraklat" : "Bu âyetten sureyi dinle"}
              style={{
                display: "flex", alignItems: "center", justifyContent: "center",
                width: "28px", height: "28px", borderRadius: "50%",
                border: `1px solid ${theme.accent}40`,
                background: sureCaliyor ? theme.accent : `${theme.accent}18`,
                color: sureCaliyor ? "#fff" : theme.accent,
                cursor: "pointer", transition: "all 0.15s",
              }}
            >
              {sureCaliyor ? <Pause size={11} /> : <Play size={11} />}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
