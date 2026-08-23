import { useState, useMemo, useEffect, useRef } from "react"
import { ChevronDown, Check } from "lucide-react"
import { kategoriler, kitaplar } from "../data/kitaplar"
import { ozelRaflarOku, ozelKategoriler, kitapHavuzu } from "../data/okumaKayit"

// Bir alimin tüm kitapları (altKategoriler varsa düzleştir)
export const alimKitaplari = (alim) =>
  (alim?.altKategoriler ? alim.altKategoriler.flatMap(a => a.kitaplar || []) : (alim?.kitaplar || []))
    .filter(b => b && b.dosya)

// Alimin dolu alt kategorileri (Büyük/Küçük Eserler gibi) — boşlar elenir
const dolular = (alim) =>
  (alim?.altKategoriler || []).filter(alt => (alt.kitaplar || []).some(b => b && b.dosya))

const optStil = (theme, sec) => ({
  width: "100%", display: "flex", alignItems: "center", gap: "8px", padding: "9px 11px",
  borderRadius: "8px", border: "none", cursor: "pointer", fontSize: "14px", fontFamily: "inherit",
  background: sec ? `${theme.accent}15` : "transparent", color: sec ? theme.accent : theme.text,
})

// Temaya uygun tek açılır menü
function Dropdown({ theme, label, value, options, onSelect, placeholder, disabled }) {
  const [acik, setAcik] = useState(false)
  const secili = options.find(o => o.id === value)
  return (
    <div style={{ position: "relative" }}>
      <div style={{ fontSize: "11px", color: theme.textSecondary, marginBottom: "5px", letterSpacing: "0.5px" }}>{label}</div>
      <button disabled={disabled} onClick={() => setAcik(a => !a)}
        style={{
          width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px",
          padding: "11px 12px", borderRadius: "10px", border: `1px solid ${acik ? theme.accent : theme.border}`,
          background: disabled ? `${theme.border}22` : theme.background,
          color: secili ? theme.text : theme.textSecondary,
          cursor: disabled ? "not-allowed" : "pointer", fontSize: "14px", fontFamily: "inherit", opacity: disabled ? 0.55 : 1,
        }}>
        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{secili ? secili.ad : placeholder}</span>
        <ChevronDown size={16} style={{ flexShrink: 0, transform: acik ? "rotate(180deg)" : "none", transition: "transform .2s" }} />
      </button>
      {acik && !disabled && (
        <>
          <div onClick={() => setAcik(false)} style={{ position: "fixed", inset: 0, zIndex: 60 }} />
          <div style={{
            position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0, zIndex: 70,
            background: theme.surface, border: `1px solid ${theme.border}`, borderRadius: "10px",
            boxShadow: "0 8px 24px rgba(0,0,0,0.18)", maxHeight: "260px", overflowY: "auto", padding: "4px",
          }}>
            <button onClick={() => { onSelect(""); setAcik(false) }} style={optStil(theme, value === "")}>
              <span style={{ flex: 1, textAlign: "left" }}>{placeholder}</span>
              {value === "" && <Check size={14} color={theme.accent} />}
            </button>
            {options.map(o => (
              <button key={o.id} onClick={() => { onSelect(o.id); setAcik(false) }} style={optStil(theme, value === o.id)}>
                <span style={{ flex: 1, textAlign: "left" }}>{o.ad}</span>
                {value === o.id && <Check size={14} color={theme.accent} />}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

// Kısım → Alim → (Eserler) → Kitap seçici. Seçim değişince onChange(scope) verir.
// scope = { kuran, kapsam:[kitap...], etiket, filtreAktif, secimler }
export default function KapsamSecici({ theme, kuranSecenek = false, baslangic, onChange }) {
  const [secKisim, setSecKisim] = useState(baslangic?.secKisim || "")
  const [secAlim, setSecAlim] = useState(baslangic?.secAlim || "")
  const [secEser, setSecEser] = useState(baslangic?.secEser || "")
  const [secKitap, setSecKitap] = useState(baslangic?.secKitap || "")

  const kisimlar = useMemo(
    () => {
      const yerlesik = kategoriler.filter(k => k.id !== "orijinal-eserler" && (k.alimler || []).some(a => alimKitaplari(a).length))
      // Özel raflar (Arama'da da isimleriyle görünür) — Kur'an hariç kitap havuzu
      const havuz = kitapHavuzu(kitaplar, null)
      const ozel = ozelKategoriler(ozelRaflarOku(), havuz)
        .filter(k => (k.alimler || []).some(a => alimKitaplari(a).length))
      return [...yerlesik, ...ozel]
    },
    []
  )
  const kuranMi = secKisim === "kuran"
  const kisimObj = kisimlar.find(k => k.id === secKisim) || null
  const alimSecenek = useMemo(() => (kisimObj ? (kisimObj.alimler || []).filter(a => alimKitaplari(a).length) : []), [secKisim])
  const alimObj = alimSecenek.find(a => a.id === secAlim) || null
  const eserSecenek = useMemo(() => (alimObj ? dolular(alimObj) : []), [secKisim, secAlim])
  const eserKatmani = eserSecenek.length > 0
  const eserObj = eserSecenek.find(e => e.id === secEser) || null
  const kitapSecenek = useMemo(() => {
    if (!alimObj) return []
    if (eserKatmani) return eserObj ? (eserObj.kitaplar || []).filter(b => b && b.dosya) : []
    return alimKitaplari(alimObj)
  }, [secKisim, secAlim, secEser])

  const kapsam = useMemo(() => {
    if (kuranMi) return []
    if (secKitap) { const b = kitapSecenek.find(x => x.id === secKitap); return b ? [b] : [] }
    if (eserKatmani && eserObj) return (eserObj.kitaplar || []).filter(b => b && b.dosya)
    if (alimObj) return alimKitaplari(alimObj)
    if (kisimObj) return (kisimObj.alimler || []).flatMap(alimKitaplari)
    return kitaplar.filter(k => k && k.dosya && k.id !== "kuran")
  }, [secKisim, secAlim, secEser, secKitap])

  const etiket = kuranMi ? "Kur'ân-ı Kerîm"
    : [kisimObj?.baslik, alimObj?.isim, eserObj?.baslik, kitapSecenek.find(x => x.id === secKitap)?.baslik].filter(Boolean).join(" · ") || "Tüm kitaplar"

  const onChangeRef = useRef(onChange)
  onChangeRef.current = onChange
  useEffect(() => {
    onChangeRef.current && onChangeRef.current({
      kuran: kuranMi, kapsam, etiket,
      filtreAktif: !!(secKisim || secAlim || secEser || secKitap),
      secimler: { secKisim, secAlim, secEser, secKitap },
    })
  }, [secKisim, secAlim, secEser, secKitap]) // eslint-disable-line

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
      <Dropdown theme={theme} label="Kısım" value={secKisim} placeholder="Tüm kitaplar"
        options={[...kisimlar.map(k => ({ id: k.id, ad: k.baslik })), ...(kuranSecenek ? [{ id: "kuran", ad: "Kur'ân-ı Kerîm" }] : [])]}
        onSelect={v => { setSecKisim(v); setSecAlim(""); setSecEser(""); setSecKitap("") }} />

      {!kuranMi && (
        <Dropdown theme={theme} label="Alim" value={secAlim} placeholder="Tüm alimler" disabled={!secKisim}
          options={alimSecenek.map(a => ({ id: a.id, ad: a.isim }))}
          onSelect={v => { setSecAlim(v); setSecEser(""); setSecKitap("") }} />
      )}

      {!kuranMi && eserKatmani && (
        <Dropdown theme={theme} label="Eserler" value={secEser} placeholder="Tüm eserler" disabled={!secAlim}
          options={eserSecenek.map(e => ({ id: e.id, ad: e.baslik }))}
          onSelect={v => { setSecEser(v); setSecKitap("") }} />
      )}

      {!kuranMi && (
        <Dropdown theme={theme} label="Kitap" value={secKitap} placeholder="Tüm kitaplar"
          disabled={eserKatmani ? !secEser : !secAlim}
          options={kitapSecenek.map(b => ({ id: b.id, ad: b.baslik }))}
          onSelect={v => setSecKitap(v)} />
      )}
    </div>
  )
}
