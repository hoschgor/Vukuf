/* ═══════════════════════════════════════════════════════════════════════════
   YAZI PANELİ YAPI TAŞLARI (28 Eylül 2026) — KuranOkuma ve OkumaEkrani ortak

   Kullanıcı: "yazı tipi ayarlarındaki açılan paneller açılıp kapandığında rahat
   kullanılmıyor, daha rahat bir şey yapabiliriz". Açılır bölümler (PanelAcilir)
   açılıp kapanınca panelin boyu zıplıyor, içerik kaydırılıp hizalanmak zorunda
   kalıyordu; iki bölüm arasında gidip gelmek hep "kapat → aç → kaydır" demekti.

   YERİNE SEKMELER: önizlemenin altında tek sıra sekme (Boyut · Aralık · Yazı tipi
   · Sayfa). Dokununca içerik YERİNDE değişiyor — hiçbir şey açılıp kapanmıyor,
   panel kaymıyor. Son açılan sekme hatırlanıyor.

   KAYDIRICI SATIRI: başlık ve değer TEK satırda (eskiden üç satır: başlık, "Küçük
   · değer · Büyük", kaydırıcı). Kaydırıcının iki yanında − / + düğmeleri: parmakla
   sürüklemek yerine tek adım ince ayar (telefonda en çok zorlanılan kısım buydu).
   ═══════════════════════════════════════════════════════════════════════════ */

export function SekmeCubugu({ theme, sekmeler, secili, onSec }) {
  return (
    <div role="tablist" style={{
      display: "flex", gap: "3px", padding: "3px", borderRadius: "11px",
      background: theme.background, border: `1px solid ${theme.border}`,
      margin: "10px 0",
    }}>
      {sekmeler.map(({ id, etiket, Ikon }) => {
        const sec = secili === id
        return (
          <button
            key={id}
            role="tab"
            aria-selected={sec}
            onClick={() => onSec(id)}
            style={{
              flex: 1, minWidth: 0,
              display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "2px",
              padding: "6px 2px", borderRadius: "8px", cursor: "pointer",
              fontSize: "10.5px", fontWeight: sec ? 600 : 400, fontFamily: "inherit",
              color: sec ? theme.accent : theme.textSecondary,
              background: sec ? theme.surface : "transparent",
              border: `1px solid ${sec ? `${theme.accent}55` : "transparent"}`,
              boxShadow: sec ? "0 1px 3px rgba(0,0,0,0.14)" : "none",
              whiteSpace: "nowrap",
            }}
          >
            {Ikon && <Ikon size={15} />}
            <span style={{ overflow: "hidden", textOverflow: "ellipsis", maxWidth: "100%" }}>{etiket}</span>
          </button>
        )
      })}
    </div>
  )
}

// Adım kadar yuvarla (0.1 adımında 1.2000000002 gibi kayan nokta artıklarını temizler)
function adimaYuvarla(v, step) {
  const ondalik = (String(step).split(".")[1] || "").length
  return +(Math.round(v / step) * step).toFixed(ondalik)
}

export function Kaydirici({ theme, etiket, deger, gosterim, min, max, step, onChange }) {
  const degis = (v) => onChange(adimaYuvarla(Math.min(max, Math.max(min, v)), step))
  const dugme = (isaret, yon, pasif) => (
    <button
      onClick={() => degis(deger + yon * step)}
      disabled={pasif}
      aria-label={`${etiket} ${yon > 0 ? "artır" : "azalt"}`}
      style={{
        width: "28px", height: "28px", flexShrink: 0, borderRadius: "50%",
        display: "flex", alignItems: "center", justifyContent: "center",
        border: `1px solid ${theme.border}`, background: theme.background,
        color: pasif ? `${theme.textSecondary}66` : theme.accent,
        fontSize: "16px", fontWeight: 600, lineHeight: 1, cursor: pasif ? "default" : "pointer",
        padding: 0, fontFamily: "inherit", touchAction: "manipulation",
      }}
    >{isaret}</button>
  )
  return (
    <div style={{ padding: "6px 0" }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: "4px", padding: "0 2px" }}>
        <span style={{ fontSize: "10.5px", letterSpacing: "1px", color: theme.textSecondary }}>{etiket}</span>
        <span style={{ fontSize: "12px", fontWeight: 700, color: theme.accent }}>{gosterim ?? deger}</span>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        {dugme("−", -1, deger <= min)}
        <input
          type="range" min={min} max={max} step={step} value={deger}
          aria-label={etiket}
          onChange={e => degis(parseFloat(e.target.value))}
          style={{ flex: 1, minWidth: 0, accentColor: theme.accent, cursor: "pointer" }}
        />
        {dugme("+", 1, deger >= max)}
      </div>
    </div>
  )
}

// Son açılan sekme: localStorage (erişilemezse varsayılan)
export function sekmeOku(anahtar, varsayilan, gecerli) {
  try {
    const v = localStorage.getItem(anahtar)
    return v && gecerli.includes(v) ? v : varsayilan
  } catch { return varsayilan }
}
export function sekmeYaz(anahtar, v) {
  try { localStorage.setItem(anahtar, v) } catch {}
}
