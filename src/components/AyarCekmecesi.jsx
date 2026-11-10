// AYAR ÇEKMECESİ (10 Kasım 2026) — okuma ekranlarının Ayarlar panelinde bölümler artık
// açılıp kapanan çekmeceler: Okuma Düzeni · Meal · Menü ve Bar · Öge Görüntüleme · Gezinme.
// Kullanıcı: "Ayarlar kısımlarını da sadeleştirelim … çekmece stiline geçelim."
//   • AyarCekmecesi: çerçeveli ana bölüm. Başlıkta kısa bir özet (ör. "Kitap", "Üst")
//     durur → çekmeceyi açmadan mevcut durum görülür. Açık/kapalı durumu cihazda saklanır.
//   • AltCekmece: çekmece içindeki ikinci kat (Menü ögeleri, Sade mod ögeleri, Opaklık…);
//     çerçevesiz, yalnız başlık + ok. Durumu çağıran yönetir (mevcut state'ler korunuyor).
//   • AltBaslik: çekmece içinde küçük ara başlık (Bar konumu, Boyut ayarları…).
import { useState } from "react"
import { ChevronRight } from "lucide-react"

const anahtar = (id) => `vukuf-ayar-cekmece-${id}`

export function AyarCekmecesi({ id, baslik, ozet, theme, olcek = 1, isMobile = false, varsayilanAcik = false, className, children }) {
  const [acik, setAcik] = useState(() => {
    try {
      const v = localStorage.getItem(anahtar(id))
      return v == null ? varsayilanAcik : v === "1"
    } catch { return varsayilanAcik }
  })
  const degis = () => setAcik(v => {
    const y = !v
    try { localStorage.setItem(anahtar(id), y ? "1" : "0") } catch { /* yoksay */ }
    return y
  })
  const bas = Math.round((isMobile ? 11 : 12) * olcek)
  return (
    <div className={className} style={{
      border: `1px solid ${acik ? `${theme.accent}44` : theme.border}`,
      borderRadius: "10px",
      background: acik ? `${theme.accent}08` : "transparent",
      transition: "border-color .15s, background .15s",
    }}>
      <button type="button" onClick={degis} aria-expanded={acik} style={{
        width: "100%", display: "flex", alignItems: "center", gap: "8px",
        padding: "10px 12px", background: "none", border: "none", cursor: "pointer",
        fontFamily: "inherit", textAlign: "left", color: theme.text,
      }}>
        <span style={{ flex: 1, minWidth: 0, fontSize: `${bas}px`, letterSpacing: "1px", fontWeight: 600, color: acik ? theme.accent : theme.textSecondary }}>
          {baslik.toLocaleUpperCase("tr-TR")}
        </span>
        {ozet ? (
          <span style={{
            fontSize: `${Math.round(11 * olcek)}px`, color: theme.textSecondary, opacity: 0.85,
            whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "55%",
          }}>{ozet}</span>
        ) : null}
        <ChevronRight size={Math.round(16 * olcek)} color={theme.textSecondary} style={{
          flexShrink: 0, transition: "transform .2s ease", transform: acik ? "rotate(90deg)" : "none",
        }} />
      </button>
      {acik && (
        <div style={{ padding: "0 10px 10px", display: "flex", flexDirection: "column", gap: "12px" }}>
          {children}
        </div>
      )}
    </div>
  )
}

// `acik`/`onDegis` verilmezse ve `id` varsa durumu kendisi tutar (cihazda saklanır).
export function AltCekmece({ id, baslik, acik: disAcik, onDegis: disDegis, theme, olcek = 1, isMobile = false, children }) {
  const [icAcik, setIcAcik] = useState(() => {
    if (!id) return false
    try { return localStorage.getItem(anahtar(id)) === "1" } catch { return false }
  })
  const kontrollu = typeof disAcik === "boolean"
  const acik = kontrollu ? disAcik : icAcik
  const onDegis = kontrollu ? disDegis : () => setIcAcik(v => {
    const y = !v
    if (id) { try { localStorage.setItem(anahtar(id), y ? "1" : "0") } catch { /* yoksay */ } }
    return y
  })
  return (
    <div>
      <button type="button" onClick={onDegis} aria-expanded={acik} style={{
        width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px",
        padding: "6px 2px", background: "none", border: "none", cursor: "pointer", fontFamily: "inherit",
        fontSize: `${Math.round((isMobile ? 12 : 13) * olcek)}px`, color: theme.text, fontWeight: 500,
        borderBottom: `1px solid ${theme.border}`,
      }}>
        <span>{baslik}</span>
        <ChevronRight size={Math.round(15 * olcek)} color={theme.textSecondary} style={{
          flexShrink: 0, transition: "transform .2s ease", transform: acik ? "rotate(90deg)" : "none",
        }} />
      </button>
      {acik && <div style={{ marginTop: "8px" }}>{children}</div>}
    </div>
  )
}

export function AltBaslik({ children, theme, olcek = 1, isMobile = false, sag = null }) {
  return (
    <div style={{
      display: "flex", justifyContent: "space-between", alignItems: "baseline",
      fontSize: `${Math.round((isMobile ? 10 : 11) * olcek)}px`, color: theme.textSecondary,
      letterSpacing: "0.5px", marginBottom: "6px", paddingLeft: "2px",
    }}>
      <span>{children}</span>
      {sag}
    </div>
  )
}
