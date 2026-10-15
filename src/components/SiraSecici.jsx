/* ═══════════════════════════════════════════════════════════════════════════
   VUKUF — SIRA SEÇİCİ (sûre menüsü ve içindekiler için küçük, sade seçici)
   src/components/SiraSecici.jsx

   15 Ekim 2026. Tek satır: soluk "Sıra" etiketi + üç küçük çip + (olağan sıradan
   farklıysa) "Sıfırla". Sıfırla onay İSTEMEZ — tek dokunuşla olağan sıraya döner.
   İsteğe bağlı `not`: seçili sıranın altında tek satırlık soluk açıklama.
   ═══════════════════════════════════════════════════════════════════════════ */

export default function SiraSecici({ theme, secenekler, deger, varsayilan, onSec, olcek = 1, not }) {
  const ac = theme.accent
  const px = (n) => `${Math.round(n * olcek)}px`
  return (
    <div style={{ padding: `${px(7)} ${px(10)} ${px(8)}`, borderBottom: `1px solid ${theme.border}` }}>
      <div role="radiogroup" aria-label="Sıralama" style={{ display: "flex", alignItems: "center", gap: px(6) }}>
        <span style={{ fontSize: px(10.5), color: theme.textSecondary, marginRight: px(2), flexShrink: 0 }}>Sıra</span>
        <div style={{
          display: "flex", gap: "2px", padding: "2px", borderRadius: "999px",
          background: `${ac}10`, border: `1px solid ${ac}22`, minWidth: 0,
        }}>
          {secenekler.map(s => {
            const secili = s.id === deger
            return (
              <button key={s.id} role="radio" aria-checked={secili} onClick={() => onSec(s.id)}
                title={s.ipucu || undefined}
                style={{
                  padding: `${px(3)} ${px(10)}`, borderRadius: "999px", border: "none", cursor: "pointer",
                  fontFamily: "inherit", fontSize: px(11), fontWeight: secili ? 700 : 500, whiteSpace: "nowrap",
                  background: secili ? ac : "transparent", color: secili ? "#fff" : theme.textSecondary,
                  transition: "background .15s, color .15s",
                }}>{s.ad}</button>
            )
          })}
        </div>
        {deger !== varsayilan && (
          <button onClick={() => onSec(varsayilan)} title="Olağan sıraya dön"
            style={{
              marginLeft: "auto", background: "none", border: "none", cursor: "pointer", flexShrink: 0,
              fontFamily: "inherit", fontSize: px(11), color: theme.textSecondary, padding: `${px(2)} ${px(2)}`,
            }}>Sıfırla</button>
        )}
      </div>
      {not && (
        <div style={{ fontSize: px(10), color: theme.textSecondary, opacity: 0.85, marginTop: px(5), lineHeight: 1.4 }}>{not}</div>
      )}
    </div>
  )
}
