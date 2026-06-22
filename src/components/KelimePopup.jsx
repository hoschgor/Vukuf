import { Play, Pause, X } from "lucide-react"

/**
 * KelimePopup
 * ───────────
 * Konum: src/components/KelimePopup.jsx
 *
 * Kullanım:
 *   <KelimePopup
 *     kelime={{ ham, okunus, anlamlar: [] }}
 *     konum={{ x, y }}
 *     player={player}
 *     sureNo={1}
 *     ayetNo={1}
 *     theme={theme}
 *     onKapat={() => setPopup(null)}
 *   />
 *
 * Not: Kelime bazlı ses everyayah'ta yok.
 * Geçici çözüm: o ayeti çalıyoruz.
 * İleride kelime bazlı kaynak eklenirse buraya eklenir.
 */
export default function KelimePopup({ kelime, konum, player, sureNo, ayetNo, theme, onKapat }) {
  if (!kelime) return null

  const caliniyor =
    player?.durum === "caliyor" &&
    player?.aktifAyet?.sureNo === sureNo &&
    player?.aktifAyet?.ayetNo === ayetNo

  const duraklatildi =
    player?.durum === "duraklatildi" &&
    player?.aktifAyet?.sureNo === sureNo &&
    player?.aktifAyet?.ayetNo === ayetNo

  function sesTikla() {
    if (!player) return
    if (caliniyor) {
      player.duraklat()
    } else if (duraklatildi) {
      player.devamEt()
    } else {
      player.ayetCal(sureNo, ayetNo)
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
        maxWidth: "260px",
        minWidth: "180px",
        boxShadow: "0 4px 24px rgba(0,0,0,0.15)",
      }}>

        {/* Üst satır: Arapça + kapat */}
        <div style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "6px",
          gap: "8px",
        }}>
          <span style={{
            fontSize: "22px",
            color: theme.accent,
            fontFamily: "'Scheherazade New', serif",
            direction: "rtl",
            lineHeight: 1.4,
          }}>
            {kelime.ham}
          </span>
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

        {/* Okunuş */}
        {kelime.okunus && (
          <div style={{
            fontSize: "12px",
            color: theme.textSecondary,
            fontStyle: "italic",
            marginBottom: "8px",
            direction: "ltr",
          }}>
            {kelime.okunus}
          </div>
        )}

        {/* Anlamlar */}
        <div style={{
          fontSize: "13px",
          color: theme.text,
          lineHeight: "1.7",
          direction: "ltr",
          marginBottom: "10px",
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

        {/* Alt çizgi + ses butonu */}
        <div style={{
          borderTop: `1px solid ${theme.border}`,
          paddingTop: "8px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}>
          <span style={{
            fontSize: "11px",
            color: theme.textSecondary,
          }}>
            Âyeti dinle
          </span>
          <button
            onClick={sesTikla}
            title={caliniyor ? "Duraklat" : "Dinle"}
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
        </div>
      </div>
    </>
  )
}
