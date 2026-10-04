/* VUKUF — GEÇMİŞ EKRANI (/gecmis)
   src/pages/Gecmis.jsx

   Aramalar ve okuma oturumları, gün gün. Veri ve kurallar: src/data/gecmis.js

   ── KULLANIM ────────────────────────────────────────────────────────────────
   • Bir kayda DOKUN → altında açılır:
       Okuma : iki yumuşak kart — BAŞLANGIÇ (okumaya başlanan yer) ve BİTİŞ
               (kalınan yer). Karta dokununca oraya gidilir. Başlangıç ile
               bitiş aynı yerse tek kart.
       Arama : "Aramayı tekrarla".
     Açılan kısmın sağ altında küçük "Sil" — tek kaydı siler (5 sn "Geri al").
   • Birden fazla silmek: üstteki "Seç" ya da bir kayda BASILI TUT → seçim
     kipi; kayıtların başında onay kutuları, üst şeritte "Tümünü seç · Sil".
   • "Temizle" bütün geçmişi siler (onay ister).
   • Buradan bir yere gidilince oradaki sağdaki köprü düğmesi "Geçmiş'e dön". */

import { useEffect, useMemo, useRef, useState } from "react"
import { useNavigate } from "react-router-dom"
import {
  History, BookOpen, BookMarked, Search, Trash2, CheckSquare, Square, CheckCircle2,
  CircleDot, Bookmark, ChevronRight, X, RotateCcw,
} from "lucide-react"
import { useApp } from "../AppContext"
import {
  useGecmis, useGecmisAyari, gecmisSil, gecmisTemizle, gecmisGeriKoy, gecmisKopruHazirla,
  // gecmisTeshisOku, depoBoyutu,   // ⏸ teşhis satırı (yorumda)
} from "../data/gecmis"

const FILTRELER = [
  { id: "hepsi", ad: "Tümü" },
  { id: "okuma", ad: "Okumalar" },
  { id: "arama", ad: "Aramalar" },
]

function sureYazi(sn) {
  const dk = Math.round((sn || 0) / 60)
  if (dk < 1) return "1 dk'dan az"
  if (dk < 60) return `${dk} dk`
  return `${Math.floor(dk / 60)} sa${dk % 60 ? ` ${dk % 60} dk` : ""}`
}
const saatYazi = (z) => {
  try { return new Date(z).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" }) } catch { return "" }
}
function gunAnahtari(z) {
  const d = new Date(z)
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
}
function gunAdi(z) {
  const d = new Date(z)
  const bugun = new Date()
  const dun = new Date(); dun.setDate(dun.getDate() - 1)
  if (gunAnahtari(d) === gunAnahtari(bugun)) return "Bugün"
  if (gunAnahtari(d) === gunAnahtari(dun)) return "Dün"
  try {
    return d.toLocaleDateString("tr-TR", {
      day: "numeric", month: "long", weekday: "long",
      year: d.getFullYear() !== bugun.getFullYear() ? "numeric" : undefined,
    })
  } catch { return "" }
}

export default function Gecmis() {
  const { theme } = useApp()
  const navigate = useNavigate()
  const liste = useGecmis()
  const [acik, setAcik] = useGecmisAyari()
  const [filtre, setFiltre] = useState("hepsi")
  const [acilan, setAcilan] = useState(null)         // açık (genişletilmiş) kaydın id'si
  const [secim, setSecim] = useState(null)           // null = seçim kipi kapalı; Set = seçilenler
  const [geriAl, setGeriAl] = useState(null)         // { kayitlar, metin }
  const geriAlZaman = useRef(null)
  const basiliRef = useRef({ t: null, x: 0, y: 0, tetiklendi: false })

  useEffect(() => () => { if (geriAlZaman.current) clearTimeout(geriAlZaman.current) }, [])

  const ac = theme.accent
  const gorunen = useMemo(() => liste.filter(e => filtre === "hepsi" || e.tur === filtre), [liste, filtre])
  const sayilar = useMemo(() => ({
    hepsi: liste.length,
    okuma: liste.filter(e => e.tur === "okuma").length,
    arama: liste.filter(e => e.tur === "arama").length,
  }), [liste])
  // Gün gün gruplar (liste zaten en yeni başta)
  const gruplar = useMemo(() => {
    const m = new Map()
    for (const e of gorunen) {
      const z = e.son || e.z
      const k = gunAnahtari(z)
      if (!m.has(k)) m.set(k, { anahtar: k, ad: gunAdi(z), kayitlar: [], sure: 0, okuma: 0 })
      const g = m.get(k)
      g.kayitlar.push(e)
      if (e.tur === "okuma") { g.okuma++; g.sure += e.sure || 0 }
    }
    return [...m.values()]
  }, [gorunen])

  function sil(idler, metin) {
    const kume = new Set(idler)
    const silinen = liste.filter(e => kume.has(e.id))
    if (!silinen.length) return
    gecmisSil(idler)
    setAcilan(null)
    if (geriAlZaman.current) clearTimeout(geriAlZaman.current)
    setGeriAl({ kayitlar: silinen, metin })
    geriAlZaman.current = setTimeout(() => setGeriAl(null), 5000)
  }
  function hepsiniTemizle() {
    if (!window.confirm(`Bütün geçmiş (${liste.length} kayıt) silinsin mi?`)) return
    gecmisTemizle()
    setSecim(null); setAcilan(null); setGeriAl(null)
  }
  function git(kayit, uc) {
    const yol = gecmisKopruHazirla(kayit, uc)
    if (yol) navigate(yol)
  }
  const secimDegistir = (id) => setSecim(s => {
    const y = new Set(s || [])
    if (y.has(id)) y.delete(id); else y.add(id)
    return y
  })

  // BASILI TUT → seçim kipi (450 ms; parmak kayarsa iptal — kaydırma bozulmasın)
  const basiliBasla = (e, id) => {
    const b = basiliRef.current
    b.tetiklendi = false
    b.x = e.clientX; b.y = e.clientY
    if (b.t) clearTimeout(b.t)
    b.t = setTimeout(() => {
      b.tetiklendi = true
      setAcilan(null)
      setSecim(s => { const y = new Set(s || []); y.add(id); return y })
      try { navigator.vibrate && navigator.vibrate(12) } catch { /* yoksay */ }
    }, 450)
  }
  const basiliHareket = (e) => {
    const b = basiliRef.current
    if (b.t && (Math.abs(e.clientX - b.x) > 8 || Math.abs(e.clientY - b.y) > 8)) { clearTimeout(b.t); b.t = null }
  }
  const basiliBitti = () => { const b = basiliRef.current; if (b.t) { clearTimeout(b.t); b.t = null } }

  function satirTikla(e) {
    if (basiliRef.current.tetiklendi) { basiliRef.current.tetiklendi = false; return }
    if (secim) { secimDegistir(e.id); return }
    setAcilan(a => (a === e.id ? null : e.id))
  }

  const kart = {
    background: theme.surface, border: `1px solid ${theme.border}`,
    borderRadius: "14px", marginBottom: "12px", overflow: "hidden",
  }
  const hap = (vurgulu, tehlike) => ({
    display: "inline-flex", alignItems: "center", gap: "5px", flexShrink: 0,
    padding: "6px 12px", borderRadius: "999px", cursor: "pointer",
    fontSize: "12px", fontWeight: 600, fontFamily: "inherit",
    border: `1px solid ${tehlike ? "#c0392b" : vurgulu ? ac : theme.border}`,
    background: vurgulu ? ac : "transparent",
    color: tehlike ? "#c0392b" : vurgulu ? "#fff" : theme.textSecondary,
  })

  /* Başlangıç / Bitiş kartı — sade, iki satır, dokunması kolay */
  const UcKarti = ({ ikon: Ikon, etiket, metin, onClick, tam }) => (
    <button onClick={onClick} style={{
      gridColumn: tam ? "1 / -1" : undefined,
      display: "flex", alignItems: "center", gap: "10px", textAlign: "left", minWidth: 0,
      padding: "10px 12px", borderRadius: "12px", cursor: "pointer", fontFamily: "inherit",
      border: `1px solid ${ac}33`, background: `${ac}0d`, color: theme.text,
    }}>
      <span style={{
        width: "28px", height: "28px", borderRadius: "50%", flexShrink: 0,
        display: "flex", alignItems: "center", justifyContent: "center",
        background: `${ac}1f`, color: ac,
      }}><Ikon size={14} /></span>
      <span style={{ flex: 1, minWidth: 0 }}>
        <span style={{ display: "block", fontSize: "10px", fontWeight: 700, letterSpacing: "0.06em", color: ac }}>
          {etiket.toLocaleUpperCase("tr")}
        </span>
        {/* İki satıra kadar kayar (dar ekranda "Bakara …" diye kesilmesin) */}
        <span style={{
          fontSize: "13px", fontWeight: 600, lineHeight: 1.3, overflow: "hidden",
          display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", wordBreak: "break-word",
        }}>
          {metin}
        </span>
      </span>
      <ChevronRight size={15} color={theme.textSecondary} style={{ flexShrink: 0 }} />
    </button>
  )

  return (
    <div style={{
      minHeight: "100vh", background: theme.background, color: theme.text,
      padding: "18px 14px calc(70px + env(safe-area-inset-bottom))",
      maxWidth: "760px", margin: "0 auto", boxSizing: "border-box",
    }}>
      {/* ── BAŞLIK ── */}
      <div style={{ display: "flex", alignItems: "center", gap: "9px", marginBottom: "14px" }}>
        <History size={20} color={ac} />
        <h1 style={{ margin: 0, fontSize: "19px", fontWeight: 600 }}>Geçmiş</h1>
        <div style={{ flex: 1 }} />
        {acik && liste.length > 0 && !secim && (
          <>
            <button onClick={() => { setSecim(new Set()); setAcilan(null) }} style={hap(false)}>
              <CheckSquare size={13} /> Seç
            </button>
            <button onClick={hepsiniTemizle} style={hap(false, true)}>
              <Trash2 size={13} /> Temizle
            </button>
          </>
        )}
      </div>

      {!acik ? (
        <div style={{ ...kart, padding: "16px", fontSize: "13.5px", lineHeight: 1.6, color: theme.textSecondary }}>
          Geçmiş kapalı; arama ve okuma kaydı tutulmuyor. Açınca aramalarınız ve okuduğunuz
          yerler, tarih ve süreleriyle burada listelenir.
          <div style={{ marginTop: "12px" }}>
            <button onClick={() => setAcik(true)} style={hap(true)}>
              <History size={13} /> Geçmişi aç
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* ── SEÇİM ŞERİDİ (yapışkan) ── */}
          {secim && (
            <div style={{
              position: "sticky", top: "calc(50px + env(safe-area-inset-top))", zIndex: 5,
              display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap",
              padding: "8px 10px", marginBottom: "12px", borderRadius: "12px",
              background: theme.surface, border: `1px solid ${ac}`, boxShadow: "0 4px 14px rgba(0,0,0,0.12)",
            }}>
              <button onClick={() => setSecim(null)} aria-label="Seçimi bırak" style={{
                width: "28px", height: "28px", borderRadius: "50%", border: "none", padding: 0,
                display: "flex", alignItems: "center", justifyContent: "center",
                background: "transparent", color: theme.textSecondary, cursor: "pointer",
              }}><X size={16} /></button>
              <span style={{ flex: 1, fontSize: "13px", fontWeight: 600 }}>
                {secim.size ? `${secim.size} kayıt seçili` : "Silinecekleri seçin"}
              </span>
              <button onClick={() => setSecim(s => (s && s.size === gorunen.length ? new Set() : new Set(gorunen.map(e => e.id))))}
                style={hap(false)}>
                {secim.size === gorunen.length && gorunen.length ? "Seçimi kaldır" : "Tümünü seç"}
              </button>
              <button disabled={!secim.size} onClick={() => { sil([...secim], `${secim.size} kayıt silindi`); setSecim(null) }}
                style={{ ...hap(!!secim.size), opacity: secim.size ? 1 : 0.5, cursor: secim.size ? "pointer" : "default" }}>
                <Trash2 size={13} /> Sil
              </button>
            </div>
          )}

          {/* ── FİLTRE ── */}
          {liste.length > 0 && (
            <div role="radiogroup" style={{
              display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: "3px",
              padding: "3px", borderRadius: "11px", marginBottom: "14px",
              background: `${ac}0f`, border: `1px solid ${theme.border}`,
            }}>
              {FILTRELER.map(f => (
                <button key={f.id} role="radio" aria-checked={filtre === f.id} onClick={() => setFiltre(f.id)} style={{
                  minHeight: "32px", borderRadius: "8px", border: "none", cursor: "pointer", fontFamily: "inherit",
                  fontSize: "12.5px", fontWeight: 600,
                  background: filtre === f.id ? ac : "transparent", color: filtre === f.id ? "#fff" : theme.textSecondary,
                }}>
                  {f.ad} <span style={{ opacity: 0.75, fontWeight: 500 }}>{sayilar[f.id]}</span>
                </button>
              ))}
            </div>
          )}

          {!gorunen.length && (
            <div style={{ ...kart, padding: "18px 16px", fontSize: "13px", color: theme.textSecondary, display: "flex", gap: "8px", alignItems: "center" }}>
              <CheckCircle2 size={16} color={ac} />
              {liste.length ? "Bu türde kayıt yok." : "Henüz kayıt yok. Arama yaptıkça ve okudukça burada görünecek."}
            </div>
          )}

          {/* ── GÜNLER ── */}
          {gruplar.map(g => (
            <div key={g.anahtar} style={{ marginBottom: "6px" }}>
              <div style={{
                display: "flex", alignItems: "baseline", gap: "8px", padding: "0 4px 7px",
                fontSize: "11.5px", color: theme.textSecondary,
              }}>
                <span style={{ fontWeight: 700, letterSpacing: "0.05em" }}>{g.ad.toLocaleUpperCase("tr")}</span>
                {g.okuma > 0 && <span>· {g.okuma} okuma · {sureYazi(g.sure)}</span>}
              </div>
              <div style={kart}>
                {g.kayitlar.map((e, i) => {
                  const secili = !!secim && secim.has(e.id)
                  const acikMi = acilan === e.id && !secim
                  const okuma = e.tur === "okuma"
                  const Ikon = !okuma ? Search : e.kaynak === "kuran" ? BookMarked : BookOpen
                  const ayniYer = okuma && e.bas && e.bitis && e.bas.etiket === e.bitis.etiket
                  return (
                    <div key={e.id} style={{ borderTop: i ? `1px solid ${theme.border}` : "none", background: secili ? `${ac}12` : "transparent" }}>
                      <div
                        role="button" tabIndex={0}
                        onClick={() => satirTikla(e)}
                        onPointerDown={(ev) => basiliBasla(ev, e.id)}
                        onPointerMove={basiliHareket}
                        onPointerUp={basiliBitti}
                        onPointerCancel={basiliBitti}
                        onContextMenu={(ev) => ev.preventDefault()}
                        style={{
                          display: "flex", alignItems: "center", gap: "11px", padding: "11px 14px",
                          cursor: "pointer", userSelect: "none", WebkitUserSelect: "none", WebkitTouchCallout: "none",
                        }}>
                        {secim ? (
                          secili ? <CheckSquare size={18} color={ac} style={{ flexShrink: 0 }} />
                            : <Square size={18} color={theme.textSecondary} style={{ flexShrink: 0 }} />
                        ) : (
                          <span style={{
                            width: "32px", height: "32px", borderRadius: "10px", flexShrink: 0,
                            display: "flex", alignItems: "center", justifyContent: "center",
                            background: `${ac}14`, color: ac,
                          }}><Ikon size={15} /></span>
                        )}
                        <span style={{ flex: 1, minWidth: 0 }}>
                          <span style={{ display: "block", fontSize: "14px", fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                            {okuma ? e.baslik : `“${e.sorgu}”`}
                          </span>
                          <span style={{ display: "block", fontSize: "11.5px", color: theme.textSecondary, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                            {okuma
                              ? (ayniYer ? e.bas.etiket : `${e.bas?.etiket || ""} → ${e.bitis?.etiket || ""}`)
                              : (e.ayrinti || "Arama")}
                          </span>
                        </span>
                        <span style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "3px", flexShrink: 0 }}>
                          <span style={{ fontSize: "11.5px", color: theme.textSecondary }}>{saatYazi(e.z)}</span>
                          {okuma && (
                            <span style={{
                              fontSize: "10.5px", fontWeight: 700, color: ac,
                              background: `${ac}14`, borderRadius: "999px", padding: "1px 7px",
                            }}>{sureYazi(e.sure)}</span>
                          )}
                        </span>
                      </div>

                      {/* AÇILAN KISIM — köprüler + tek kayıt silme */}
                      {acikMi && (
                        <div style={{ padding: "0 14px 12px" }}>
                          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "8px" }}>
                            {okuma ? (ayniYer ? (
                              <UcKarti ikon={Bookmark} etiket="Okunan yer" metin={e.bitis.etiket} tam onClick={() => git(e, "bitis")} />
                            ) : (
                              <>
                                <UcKarti ikon={CircleDot} etiket="Başlangıç" metin={e.bas.etiket} onClick={() => git(e, "bas")} />
                                <UcKarti ikon={Bookmark} etiket="Bitiş" metin={e.bitis.etiket} onClick={() => git(e, "bitis")} />
                              </>
                            )) : (
                              <UcKarti ikon={Search} etiket="Aramayı tekrarla" metin={e.sorgu} tam onClick={() => git(e)} />
                            )}
                          </div>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "8px" }}>
                            <span style={{ fontSize: "11px", color: theme.textSecondary }}>
                              {okuma ? `${saatYazi(e.z)} – ${saatYazi(e.son || e.z)}` : ""}
                            </span>
                            <button onClick={() => sil([e.id], "Kayıt silindi")} style={{
                              display: "inline-flex", alignItems: "center", gap: "4px", padding: "4px 8px",
                              borderRadius: "999px", border: "none", background: "transparent", cursor: "pointer",
                              fontFamily: "inherit", fontSize: "11.5px", color: theme.textSecondary,
                            }}>
                              <Trash2 size={12} /> Sil
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          ))}

          {liste.length > 0 && !secim && (
            <p style={{ fontSize: "11px", color: theme.textSecondary, textAlign: "center", margin: "6px 0 0" }}>
              Bir kayda basılı tutarak birden fazlasını seçebilirsiniz.
            </p>
          )}
        </>
      )}

      {/* ── KAYIT DURUMU (teşhis) — YORUMDA (4 Ekim 2026: sorun çözüldü).
          Okuma kaydının son adımı + depo doluluğu; bir eser kaydolmazsa hangi
          adımda kaldığı buradan okunur. Gerekirse aşağıdaki bloğu yorumdan
          çıkarın ve importtaki gecmisTeshisOku, depoBoyutu'yu geri ekleyin.
      {acik && (() => {
        const t = gecmisTeshisOku()
        const mb = depoBoyutu() / (1024 * 1024)
        const dolu = mb > 4.5
        return (
          <div style={{
            marginTop: "18px", fontSize: "10.5px", lineHeight: 1.6, textAlign: "center",
            color: t?.hata || dolu ? "#c0392b" : theme.textSecondary, opacity: t?.hata || dolu ? 1 : 0.75,
          }}>
            {t && <>Kayıt durumu: {saatYazi(t.z)} · {t.olay}{t.ayrinti ? ` · ${t.ayrinti}` : ""}<br /></>}
            Tarayıcı deposu: {mb.toFixed(2)} MB{dolu ? " — dolmak üzere; Ayarlar → Veriler'den yer açın" : ""}
          </div>
        )
      })()}

      */}

      {/* ── GERİ AL bildirimi ── */}
      {geriAl && (
        <div style={{
          position: "fixed", left: "50%", transform: "translateX(-50%)",
          bottom: "calc(18px + env(safe-area-inset-bottom))", zIndex: 120,
          display: "flex", alignItems: "center", gap: "10px",
          padding: "6px 6px 6px 14px", borderRadius: "999px",
          background: theme.surface, border: `1px solid ${ac}`, boxShadow: "0 6px 20px rgba(0,0,0,0.22)",
          fontSize: "13px", whiteSpace: "nowrap",
        }}>
          {geriAl.metin}
          <button onClick={() => { gecmisGeriKoy(geriAl.kayitlar); setGeriAl(null) }} style={{ ...hap(true), padding: "5px 11px" }}>
            <RotateCcw size={13} /> Geri al
          </button>
        </div>
      )}
    </div>
  )
}
