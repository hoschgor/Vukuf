/* ═══════════════════════════════════════════════════════════════════════════
   VUKUF — KAYIT (AYRAÇ) ORTAK ÖĞELERİ
   src/components/KayitOgeleri.jsx

   19 Ekim 2026, kullanıcı: "Kayıtların yanlarındaki sil düğmeleri çok göz önünde; kalem ve
   silme düğmelerini bir Düzenle düğmesinin içine saklayalım — dokununca görünsün, sil çift
   onay istesin. Yeni kayıt alındığında önceki ile değiştirme sorusu da sorulabilsin: önceki
   kayda bir isim vermişsek yenisine taşınır, fazladan kayıt olmaz. Kullanışlı ve güzel
   görünsün." Kur'ân (KayitPaneli) ve kitap (OkumaEkrani → İşaretler) aynı öğeleri kullanır.

   • DuzenleDugmesi : "Düzenle" ⇄ "Bitti" küçük hap
   • KayitSatiri    : rozet (sayfa) + ad + tarih; normalde yalnız "git" oku. Düzenlemede kalem
                      (satır içinde ad değiştirme) ve sil (1. dokunuş "Sil?" kırmızı hap, 3 sn
                      içinde 2. dokunuş siler) yumuşakça belirir; git oku gizlenir.
   • YerineKoySorusu: yeni konum seçilince — "Yeni kayıt olarak ekle" ya da listeden seçilen
                      kaydın "yerine koy" (ad korunur, konum yenilenir). En son kullanılan seçili.
   ═══════════════════════════════════════════════════════════════════════════ */

import { useEffect, useRef, useState } from "react"
import { Bookmark, ChevronRight, Pencil, Trash2, Check, X, Plus, RefreshCw } from "lucide-react"

export const kayitZamani = (k) => Number(k?.guncelleme || k?.olusturma || 0)
const tarihYaz = (ts) => {
  if (!ts) return ""
  try { return new Date(ts).toLocaleDateString("tr-TR", { day: "numeric", month: "short", year: "numeric" }) } catch { return "" }
}

export function DuzenleDugmesi({ duzenle, setDuzenle, theme, gizli = false }) {
  if (gizli) return null
  const ac = theme.accent
  return (
    <button onClick={() => setDuzenle(!duzenle)} aria-pressed={duzenle}
      style={{
        display: "inline-flex", alignItems: "center", gap: "5px", padding: "4px 11px", borderRadius: "999px",
        border: `1px solid ${duzenle ? ac : ac + "55"}`, background: duzenle ? ac : "transparent",
        color: duzenle ? "#fff" : ac, fontSize: "12px", fontWeight: 600, fontFamily: "inherit", cursor: "pointer",
        transition: "background .18s ease, color .18s ease", flexShrink: 0,
      }}>
      {duzenle ? <><Check size={12} /> Bitti</> : <><Pencil size={11} /> Düzenle</>}
    </button>
  )
}

export function KayitSatiri({ kayit, theme, duzenle, etiket, aktif = false, onGit, onAdDegistir, onSil }) {
  const ac = theme.accent
  const [adDuzen, setAdDuzen] = useState(null)       // null | yazılan ad
  const [silOnay, setSilOnay] = useState(false)
  const zaman = useRef(0)
  useEffect(() => { if (!duzenle) { setAdDuzen(null); setSilOnay(false) } }, [duzenle])
  useEffect(() => () => clearTimeout(zaman.current), [])

  const adKaydet = () => {
    const t = (adDuzen || "").trim()
    if (t && t !== kayit.baslik) onAdDegistir?.(kayit.id, t)
    setAdDuzen(null)
  }
  const silTikla = () => {
    if (!silOnay) {
      setSilOnay(true)
      clearTimeout(zaman.current)
      zaman.current = setTimeout(() => setSilOnay(false), 3000)
      return
    }
    clearTimeout(zaman.current)
    onSil?.(kayit.id)
  }
  const ikon = (renk, zemin) => ({
    width: "30px", height: "30px", borderRadius: "9px", border: "none", flexShrink: 0, padding: 0,
    display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer",
    color: renk, background: zemin,
  })

  return (
    <div
      onClick={() => { if (!duzenle && adDuzen == null) onGit?.(kayit) }}
      style={{
        display: "flex", alignItems: "center", gap: "10px", padding: "8px 8px 8px 10px", borderRadius: "12px",
        background: aktif ? `${ac}14` : `${ac}08`, border: `1px solid ${aktif ? ac + "55" : theme.border}`,
        cursor: duzenle ? "default" : "pointer", transition: "background .18s ease, border-color .18s ease",
      }}>
      <span style={{
        minWidth: "32px", height: "32px", padding: "0 4px", borderRadius: "9px", flexShrink: 0, boxSizing: "border-box",
        display: "flex", alignItems: "center", justifyContent: "center", gap: "2px",
        background: `${ac}1c`, color: ac, fontSize: "11.5px", fontWeight: 700, fontVariantNumeric: "tabular-nums",
      }}>
        <Bookmark size={11} fill={ac} />{etiket ? etiket(kayit) : kayit.sayfa}
      </span>

      <div style={{ flex: 1, minWidth: 0 }}>
        {adDuzen != null ? (
          <input value={adDuzen} autoFocus
            onClick={e => e.stopPropagation()}
            onChange={e => setAdDuzen(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") adKaydet(); if (e.key === "Escape") setAdDuzen(null) }}
            onBlur={adKaydet}
            aria-label="Kayıt adı"
            style={{
              width: "100%", boxSizing: "border-box", padding: "6px 9px", borderRadius: "8px",
              border: `1px solid ${ac}`, background: theme.background, color: theme.text,
              fontSize: "16px", fontFamily: "inherit", outline: "none",
            }} />
        ) : (
          <>
            <div style={{ fontSize: "13.5px", fontWeight: 600, color: theme.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {kayit.baslik}
            </div>
            <div style={{ fontSize: "10.5px", color: theme.textSecondary, marginTop: "1px" }}>
              {kayit.guncelleme ? `Taşındı · ${tarihYaz(kayit.guncelleme)}` : tarihYaz(kayit.olusturma)}
            </div>
          </>
        )}
      </div>

      {/* Sağ: düzenlemede kalem + sil, değilken git oku */}
      <div style={{ display: "flex", alignItems: "center", gap: "4px", flexShrink: 0 }}>
        {duzenle ? (
          adDuzen != null ? (
            <button onMouseDown={e => e.preventDefault()} onClick={e => { e.stopPropagation(); adKaydet() }} title="Kaydet" aria-label="Adı kaydet" style={ikon("#fff", ac)}>
              <Check size={14} />
            </button>
          ) : (
            <>
              <button onClick={e => { e.stopPropagation(); setSilOnay(false); setAdDuzen(kayit.baslik) }} title="Adını değiştir" aria-label="Adını değiştir"
                style={{ ...ikon(theme.textSecondary, "transparent"), animation: "vukufKayitBelir .18s ease-out" }}>
                <Pencil size={14} />
              </button>
              <button onClick={e => { e.stopPropagation(); silTikla() }} title={silOnay ? "Silmek için yeniden dokununuz" : "Sil"} aria-label={silOnay ? "Silmeyi onayla" : "Sil"}
                style={silOnay
                  ? { ...ikon("#fff", "#c0392b"), width: "auto", padding: "0 10px", gap: "4px", fontSize: "12px", fontWeight: 700, fontFamily: "inherit", animation: "vukufKayitBelir .15s ease-out" }
                  : { ...ikon("#c0392b", "#c0392b12"), animation: "vukufKayitBelir .18s ease-out" }}>
                <Trash2 size={14} />{silOnay && "Sil?"}
              </button>
            </>
          )
        ) : (
          <span style={{ ...ikon(ac, `${ac}14`), cursor: "pointer" }} aria-hidden="true">
            <ChevronRight size={15} />
          </span>
        )}
      </div>
      <style>{`@keyframes vukufKayitBelir { from { opacity: 0; transform: scale(.85) } to { opacity: 1; transform: none } }`}</style>
    </div>
  )
}

/* Yeni konum seçildi → yeni kayıt mı, bir kaydın yerine mi? */
export function YerineKoySorusu({ acik, yeniEtiket, kayitlar = [], etiket, theme, isMobile, onYeni, onYerine, onVazgec }) {
  const ac = theme.accent
  const [secili, setSecili] = useState(null)
  useEffect(() => {
    if (!acik) return
    const enSon = kayitlar.slice().sort((a, b) => kayitZamani(b) - kayitZamani(a))[0]
    setSecili(enSon ? enSon.id : null)
    const tus = (e) => { if (e.key === "Escape") onVazgec?.() }
    window.addEventListener("keydown", tus)
    return () => window.removeEventListener("keydown", tus)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [acik])
  if (!acik) return null
  const liste = kayitlar.slice().sort((a, b) => kayitZamani(b) - kayitZamani(a))
  const secKayit = liste.find(k => k.id === secili)

  return (
    <div onClick={onVazgec} style={{
      position: "fixed", inset: 0, zIndex: 520, background: "rgba(0,0,0,0.3)",
      display: "flex", alignItems: isMobile ? "flex-end" : "center", justifyContent: "center",
    }}>
      <div role="dialog" aria-modal="true" aria-label="Yeni kayıt" onClick={e => e.stopPropagation()}
        style={{
          width: isMobile ? "100%" : "min(400px, 92vw)", maxHeight: isMobile ? "80dvh" : "80vh",
          display: "flex", flexDirection: "column",
          background: theme.surface, color: theme.text, borderRadius: isMobile ? "18px 18px 0 0" : "16px",
          boxShadow: "0 18px 50px rgba(0,0,0,0.25)", padding: "14px 16px",
          paddingBottom: isMobile ? "max(14px, env(safe-area-inset-bottom))" : "14px",
          animation: "vukufKayitYukari .2s ease-out",
        }}>
        <style>{`@keyframes vukufKayitYukari { from { transform: translateY(16px); opacity: .6 } to { transform: none; opacity: 1 } }`}</style>
        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "4px" }}>
          <span style={{ width: "32px", height: "32px", borderRadius: "10px", background: `${ac}1a`, color: ac, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <Bookmark size={16} fill={ac} />
          </span>
          <span style={{ flex: 1, minWidth: 0 }}>
            <span style={{ display: "block", fontSize: "15px", fontWeight: 700 }}>Yeni kayıt</span>
            {yeniEtiket && <span style={{ display: "block", fontSize: "12px", color: theme.textSecondary }}>{yeniEtiket}</span>}
          </span>
          <button onClick={onVazgec} aria-label="Vazgeç" title="Vazgeç"
            style={{ width: "32px", height: "32px", borderRadius: "50%", border: "none", background: "transparent", color: theme.textSecondary, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <X size={18} />
          </button>
        </div>

        <button onClick={onYeni} style={{
          display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", margin: "10px 0 14px",
          padding: "11px 12px", borderRadius: "12px", border: "none", background: ac, color: "#fff",
          fontSize: "14px", fontWeight: 600, fontFamily: "inherit", cursor: "pointer",
        }}>
          <Plus size={16} /> Yeni kayıt olarak ekle
        </button>

        <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "12px", fontWeight: 700, color: theme.textSecondary, margin: "0 2px 6px", letterSpacing: ".02em" }}>
          <RefreshCw size={13} /> YA DA BİR KAYDIN YERİNE
        </div>
        <div style={{ fontSize: "11.5px", color: theme.textSecondary, margin: "0 2px 8px", lineHeight: 1.45 }}>
          Seçilen kaydın adı korunur, yeri buraya taşınır.
        </div>
        <div role="radiogroup" aria-label="Yerine konacak kayıt" style={{ overflowY: "auto", display: "flex", flexDirection: "column", gap: "6px", marginBottom: "12px", minHeight: 0 }}>
          {liste.map(k => {
            const s = k.id === secili
            return (
              <button key={k.id} role="radio" aria-checked={s} onClick={() => setSecili(k.id)}
                style={{
                  display: "flex", alignItems: "center", gap: "10px", padding: "8px 10px", borderRadius: "12px",
                  border: `1.5px solid ${s ? ac : theme.border}`, background: s ? `${ac}12` : "transparent",
                  color: theme.text, fontFamily: "inherit", cursor: "pointer", textAlign: "left",
                }}>
                <span aria-hidden="true" style={{
                  width: "16px", height: "16px", borderRadius: "50%", flexShrink: 0, boxSizing: "border-box",
                  border: `2px solid ${s ? ac : theme.textSecondary + "88"}`, display: "flex", alignItems: "center", justifyContent: "center",
                }}>{s && <span style={{ width: "7px", height: "7px", borderRadius: "50%", background: ac }} />}</span>
                <span style={{ flex: 1, minWidth: 0, fontSize: "13.5px", fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{k.baslik}</span>
                <span style={{ fontSize: "11.5px", color: theme.textSecondary, flexShrink: 0 }}>{etiket ? etiket(k) : `s. ${k.sayfa}`}</span>
              </button>
            )
          })}
        </div>
        <button onClick={() => secKayit && onYerine?.(secKayit.id)} disabled={!secKayit}
          style={{
            display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
            padding: "11px 12px", borderRadius: "12px", border: `1px solid ${ac}`, background: "transparent", color: ac,
            fontSize: "14px", fontWeight: 600, fontFamily: "inherit", cursor: secKayit ? "pointer" : "not-allowed", opacity: secKayit ? 1 : 0.5,
          }}>
          <RefreshCw size={15} /> {secKayit ? `“${secKayit.baslik}” kaydının yerine koy` : "Yerine koy"}
        </button>
      </div>
    </div>
  )
}
