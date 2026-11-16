/* ═══════════════════════════════════════════════════════════════════════════
   VUKUF — KAYITLAR EKRANI (/kayitlar)
   src/pages/Kayitlar.jsx

   16 Kasım 2026 — kullanıcı: "Ana sayfaya "Kayıtlar" sayfası açalım, burada kayıtların
   listesini tutalım ve kolayca kayda gidebilelim, kayda gidildiğinde geri dönme köprüsünü
   buraya da ekleyelim."

   Toplanan kayıtlar (yalnız OKUNUR; düzenleme / silme okuma ekranlarındaki kayıt menüsünde):
     • Kur'ân-ı Kerîm işaretleri  "vukuf-kayitlar"            [{ id, sayfa, scrollY, baslik, olusturma }]
     • Eser işaretleri            "vukuf_kayitlar_<kitapId>"  [{ id, sayfa, oran, baslik, olusturma }]
     • Eser notları               "vukuf_notlar_<kitapId>"    { sayfa: [{ id, metin }] }
     • Eser vurguları             "vukuf_vurgular_<kitapId>"  { sayfa: [{ id, renk, isim, baslangic, bitis }] }
   Kayda dokununca oraya gidilir; okuma ekranında sağdaki köprü düğmesi "Kayıtlar'a dön" olur
   ("vukuf-donus" = "kayitlar"), ayrılınan okuma yeri de dönüş noktası olarak bırakılır.
   ═══════════════════════════════════════════════════════════════════════════ */

import { useEffect, useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import { Bookmark, BookOpen, BookMarked, StickyNote, Highlighter, Search, X, ChevronRight } from "lucide-react"
import { useApp } from "../AppContext"
import { kitaplar } from "../data/kitaplar"
import { OKUMA_HEDEF_ANAHTAR } from "../data/gecmis"

const FILTRELER = [
  { id: "hepsi", ad: "Tümü" },
  { id: "isaret", ad: "İşaretler" },
  { id: "not", ad: "Notlar" },
  { id: "vurgu", ad: "Vurgular" },
]
const FILTRE_ANAHTAR = "vukuf-kayitlar-filtre"
const oku = (a, v) => { try { const x = JSON.parse(localStorage.getItem(a) || "null"); return x ?? v } catch { return v } }

/** Bütün kayıtlar, kaynak kaynak: [{ kaynak: "kuran"|kitapId, ad, alt, son, ogeler: [...] }] */
function kayitlariTopla() {
  const gruplar = []
  // Kur'ân
  const kuran = (oku("vukuf-kayitlar", []) || []).filter(k => k && k.sayfa)
  if (kuran.length) {
    gruplar.push({
      kaynak: "kuran", ad: "Kur'ân-ı Kerîm", alt: "",
      ogeler: kuran.map(k => ({ tur: "isaret", id: `k-${k.id}`, kayitId: k.id, sayfa: k.sayfa, oran: k.scrollY || 0, baslik: k.baslik || `Sayfa ${k.sayfa}`, zaman: k.olusturma || Number(k.id) || 0 })),
    })
  }
  // Eserler: anahtarları tara (kitap kimliği anahtarın sonunda)
  const kimlikler = new Set()
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const a = localStorage.key(i) || ""
      const m = /^vukuf_(kayitlar|notlar|vurgular)_(.+)$/.exec(a)
      if (m) kimlikler.add(m[2])
    }
  } catch { /* yoksay */ }
  for (const id of kimlikler) {
    const kitap = kitaplar.find(k => String(k.id) === String(id))
    if (!kitap) continue
    const ogeler = []
    for (const k of oku(`vukuf_kayitlar_${id}`, []) || []) {
      if (k && k.sayfa) ogeler.push({ tur: "isaret", id: `i-${k.id}`, sayfa: k.sayfa, oran: k.oran || 0, baslik: k.baslik || `Sayfa ${k.sayfa}`, zaman: k.olusturma || Number(k.id) || 0 })
    }
    const notlar = oku(`vukuf_notlar_${id}`, {}) || {}
    for (const [s, l] of Object.entries(notlar)) {
      for (const n of l || []) if (n && n.metin) ogeler.push({ tur: "not", id: `n-${n.id}`, sayfa: Number(s), oran: 0, baslik: n.metin, zaman: Number(n.id) || 0 })
    }
    const vurgular = oku(`vukuf_vurgular_${id}`, {}) || {}
    for (const [s, l] of Object.entries(vurgular)) {
      for (const v of l || []) if (v) ogeler.push({ tur: "vurgu", id: `v-${v.id}`, sayfa: Number(s), oran: 0, baslik: v.isim || "", renk: v.renk, zaman: Number(String(v.id).replace(/\D/g, "")) || 0 })
    }
    if (ogeler.length) gruplar.push({ kaynak: String(kitap.id), ad: kitap.baslik, alt: kitap.yazar || "", ogeler })
  }
  for (const g of gruplar) {
    g.ogeler.sort((a, b) => a.sayfa - b.sayfa || a.oran - b.oran || a.zaman - b.zaman)
    g.son = Math.max(0, ...g.ogeler.map(o => o.zaman))
  }
  // Kur'ân hep başta; eserler en son kayıt eklenen önce
  return gruplar.sort((a, b) => (a.kaynak === "kuran" ? -1 : b.kaynak === "kuran" ? 1 : b.son - a.son))
}

/** Kayda gitmeden önce hedefi ve köprüyü yazar; gidilecek yol */
function kopruHazirla(grup, oge) {
  try {
    localStorage.setItem("vukuf-donus", "kayitlar")
    if (grup.kaynak === "kuran") {
      localStorage.setItem("vukuf-kuran-hedef", JSON.stringify({ sayfa: oge.sayfa, oran: oge.oran || 0, kaynak: "kayitlar", kayitId: oge.kayitId }))
      return "/kuran"
    }
    localStorage.setItem(OKUMA_HEDEF_ANAHTAR, JSON.stringify({ kitapId: grup.kaynak, sayfa: oge.sayfa, oran: oge.oran || 0, kaynak: "kayitlar" }))
    return `/kitap/${grup.kaynak}`
  } catch { return null }
}

const normal = (s) => String(s || "").toLocaleLowerCase("tr-TR").normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/ı/g, "i")

export default function Kayitlar() {
  const { theme } = useApp()
  const navigate = useNavigate()
  const ac = theme.accent
  const [gruplar, setGruplar] = useState(kayitlariTopla)
  // Başka sekmede değişirse tazele; sayfaya geri dönülünce de (görünür olunca)
  useEffect(() => {
    const taze = () => setGruplar(kayitlariTopla())
    const gor = () => { if (document.visibilityState === "visible") taze() }
    window.addEventListener("storage", taze)
    document.addEventListener("visibilitychange", gor)
    return () => { window.removeEventListener("storage", taze); document.removeEventListener("visibilitychange", gor) }
  }, [])
  const [filtre, setFiltreD] = useState(() => { try { return localStorage.getItem(FILTRE_ANAHTAR) || "hepsi" } catch { return "hepsi" } })
  const setFiltre = (f) => { setFiltreD(f); try { localStorage.setItem(FILTRE_ANAHTAR, f) } catch { /* yoksay */ } }
  const [sorgu, setSorgu] = useState("")
  const [kapali, setKapali] = useState(() => new Set())

  const sayilar = useMemo(() => {
    const s = { hepsi: 0, isaret: 0, not: 0, vurgu: 0 }
    for (const g of gruplar) for (const o of g.ogeler) { s.hepsi++; s[o.tur]++ }
    return s
  }, [gruplar])
  const gorunen = useMemo(() => {
    const q = normal(sorgu.trim())
    return gruplar.map(g => ({
      ...g,
      ogeler: g.ogeler.filter(o => (filtre === "hepsi" || o.tur === filtre) &&
        (!q || normal(o.baslik).includes(q) || normal(g.ad).includes(q) || String(o.sayfa) === q)),
    })).filter(g => g.ogeler.length)
  }, [gruplar, filtre, sorgu])

  const git = (g, o) => { const yol = kopruHazirla(g, o); if (yol) navigate(yol) }
  const kart = { background: theme.surface, border: `1px solid ${theme.border}`, borderRadius: "14px" }
  const ikon = (o) => (o.tur === "not" ? StickyNote : o.tur === "vurgu" ? Highlighter : Bookmark)

  return (
    <div style={{
      minHeight: "100vh", background: theme.background, color: theme.text,
      padding: "18px 14px calc(70px + env(safe-area-inset-bottom))",
      maxWidth: "760px", margin: "0 auto", boxSizing: "border-box",
    }}>
      {/* ── BAŞLIK ── */}
      <div style={{ display: "flex", alignItems: "center", gap: "9px", marginBottom: "14px" }}>
        <Bookmark size={20} color={ac} />
        <h1 style={{ margin: 0, fontSize: "19px", fontWeight: 600 }}>Kayıtlar</h1>
        {sayilar.hepsi > 0 && <span style={{ fontSize: "12.5px", color: theme.textSecondary }}>{sayilar.hepsi} kayıt</span>}
      </div>

      {sayilar.hepsi === 0 ? (
        <div style={{ ...kart, padding: "16px", fontSize: "13.5px", lineHeight: 1.6, color: theme.textSecondary }}>
          Henüz kayıt yok. Kur'ân-ı Kerîm'de ve eserlerde kayıt menüsünden koyduğunuz işaretler, notlar
          ve vurgular burada listelenir; dokununca o yere gidilir.
        </div>
      ) : (
        <>
          {/* ── FİLTRE ── */}
          <div role="radiogroup" aria-label="Kayıt türü" style={{
            display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: "3px",
            padding: "3px", borderRadius: "11px", marginBottom: "10px",
            background: `${ac}0f`, border: `1px solid ${theme.border}`,
          }}>
            {FILTRELER.map(f => (
              <button key={f.id} role="radio" aria-checked={filtre === f.id} onClick={() => setFiltre(f.id)} style={{
                minHeight: "32px", borderRadius: "8px", border: "none", cursor: "pointer", fontFamily: "inherit",
                fontSize: "12px", fontWeight: 600, padding: "0 2px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                background: filtre === f.id ? ac : "transparent", color: filtre === f.id ? "#fff" : theme.textSecondary,
              }}>
                {f.ad} <span style={{ opacity: 0.75, fontWeight: 500 }}>{sayilar[f.id]}</span>
              </button>
            ))}
          </div>

          {/* ── ARAMA ── */}
          <div style={{ display: "flex", alignItems: "center", gap: "6px", padding: "0 10px", marginBottom: "14px", borderRadius: "10px", border: `1px solid ${theme.border}`, background: theme.surface }}>
            <Search size={14} color={theme.textSecondary} />
            <input value={sorgu} onChange={e => setSorgu(e.target.value)} placeholder="Kayıtlarda ara (ad, not, eser, sayfa)" aria-label="Kayıtlarda ara"
              style={{ flex: 1, minWidth: 0, padding: "9px 0", border: "none", outline: "none", background: "transparent", color: theme.text, fontFamily: "inherit", fontSize: "13px" }} />
            {sorgu && (
              <button onClick={() => setSorgu("")} aria-label="Aramayı temizle"
                style={{ display: "flex", padding: "4px", border: "none", background: "none", cursor: "pointer", color: theme.textSecondary }}>
                <X size={14} />
              </button>
            )}
          </div>

          {gorunen.length === 0 && (
            <div style={{ fontSize: "13px", color: theme.textSecondary, padding: "8px 4px" }}>Bu seçime uyan kayıt yok.</div>
          )}

          {/* ── KAYNAK KAYNAK ── */}
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {gorunen.map(g => {
              const acik = !kapali.has(g.kaynak)
              const GIkon = g.kaynak === "kuran" ? BookMarked : BookOpen
              return (
                <div key={g.kaynak} style={{ ...kart, overflow: "hidden" }}>
                  <button onClick={() => setKapali(s => { const y = new Set(s); if (y.has(g.kaynak)) y.delete(g.kaynak); else y.add(g.kaynak); return y })}
                    aria-expanded={acik}
                    style={{
                      width: "100%", display: "flex", alignItems: "center", gap: "9px", padding: "11px 12px",
                      border: "none", background: `${ac}0a`, cursor: "pointer", fontFamily: "inherit", textAlign: "left", color: theme.text,
                      borderBottom: acik ? `1px solid ${theme.border}` : "none",
                    }}>
                    <GIkon size={17} color={ac} style={{ flexShrink: 0 }} />
                    <span style={{ flex: 1, minWidth: 0 }}>
                      <span style={{ display: "block", fontSize: "14px", fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{g.ad}</span>
                      {g.alt && <span style={{ display: "block", fontSize: "11px", color: theme.textSecondary }}>{g.alt}</span>}
                    </span>
                    <span style={{ fontSize: "11.5px", color: theme.textSecondary, flexShrink: 0 }}>{g.ogeler.length}</span>
                    <ChevronRight size={15} color={theme.textSecondary} style={{ flexShrink: 0, transition: "transform .2s", transform: acik ? "rotate(90deg)" : "none" }} />
                  </button>
                  {acik && g.ogeler.map((o, i) => {
                    const OIkon = ikon(o)
                    return (
                      <button key={o.id} onClick={() => git(g, o)}
                        title={`${o.tur === "not" ? "Not" : o.tur === "vurgu" ? "Vurgu" : "İşaret"} · sayfa ${o.sayfa} — oraya git`}
                        style={{
                          width: "100%", display: "flex", alignItems: "center", gap: "10px", padding: "10px 12px",
                          border: "none", borderTop: i ? `1px solid ${theme.border}` : "none", background: "transparent",
                          cursor: "pointer", fontFamily: "inherit", textAlign: "left", color: theme.text,
                        }}>
                        {o.tur === "vurgu" ? (
                          <span aria-hidden="true" style={{ width: "16px", height: "16px", borderRadius: "4px", flexShrink: 0, background: o.renk || "#fde68a", border: `1px solid ${theme.border}` }} />
                        ) : (
                          <OIkon size={16} color={o.tur === "not" ? theme.textSecondary : ac} style={{ flexShrink: 0 }} />
                        )}
                        <span style={{ flex: 1, minWidth: 0 }}>
                          <span style={{
                            display: "-webkit-box", WebkitLineClamp: o.tur === "not" ? 2 : 1, WebkitBoxOrient: "vertical", overflow: "hidden",
                            fontSize: "13.5px", lineHeight: 1.4, color: o.baslik ? theme.text : theme.textSecondary, fontStyle: o.baslik ? "normal" : "italic",
                          }}>
                            {o.baslik || (o.tur === "vurgu" ? "Adsız vurgu" : "—")}
                          </span>
                        </span>
                        <span style={{ fontSize: "11.5px", color: theme.textSecondary, flexShrink: 0, fontVariantNumeric: "tabular-nums" }}>s. {o.sayfa}</span>
                        <ChevronRight size={14} color={theme.textSecondary} style={{ flexShrink: 0, opacity: 0.6 }} />
                      </button>
                    )
                  })}
                </div>
              )
            })}
          </div>
          <div style={{ fontSize: "11px", color: theme.textSecondary, lineHeight: 1.5, marginTop: "14px", textAlign: "center" }}>
            Kayıtlar okuma ekranlarındaki kayıt menüsünden eklenir, düzenlenir ve silinir.
          </div>
        </>
      )}
    </div>
  )
}
