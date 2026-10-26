/* ═══════════════════════════════════════════════════════════════════════════
   VUKUF — KİTAPLIK MODU
   src/components/KitaplikModu.jsx

   Kullanıcı (26 Ekim 2026): "Ana ekrandaki ayarlar kısmına mod seçeneği
   ekleyelim: tüm eserler, seçilen eserler, Risale-i Nûr. Risale-i Nûr seçimi
   yapıldığında Kur'ân-ı Kerîm, Evrâd u Ezkâr ve Risale-i Nûr rafları
   görüntülensin. Tüm eserler şu anki gibi kalacak; seçilen eserlerde raf ve
   âlim seçilebilsin, kolaylıkla işlem tamamlanabilsin. Uygulamaya yeni giren
   birine mod sorgusu iletilerek başlatılsın; daha sonra ayarlardan mod
   değiştirilebilsin. Son okunanlar ve Sık okunanlar her zamanki gibi çalışacak."

   ── VERİ ────────────────────────────────────────────────────────────────────
     localStorage "vukuf-kitaplik-modu"  : "tum" | "secili" | "risale"
                                           (YOKSA → henüz seçilmedi → Kitaplık açılışta sorar)
     localStorage "vukuf-kitaplik-secim" : { raflar: [kategoriId], alimler: [alimId] }
       • raflar  : BÜTÜNÜYLE seçilen raflar (sonradan eklenen âlimleri de kapsar)
       • alimler : bütünü seçilmemiş raflardan tek tek seçilen âlimler
     localStorage "vukuf-kitaplik-mod-hapi" : "1" → Kitaplık başlığının altında
                                           "hızlı mod değiştirme" düğmesi (VARSAYILAN KAPALI;
                                           kullanıcı, 26 Ekim 2026: "üst kısımda raf tipini
                                           göstermesine gerek yok, ayarlarda seçenek olarak
                                           sunulabilir ama varsayılanda kapalı olacak")
   Değişince window olayı "vukuf-kitaplik-modu" yayınlanır (Navbar ↔ Kitaplık).

   ── NE ETKİLENİR ────────────────────────────────────────────────────────────
   Yalnız Kitaplık'taki kısım rafları ve Âlimler rafı (Risale-i Nûr modunda
   Âlimler rafı gösterilmez; seçilen eserlerde yalnız seçilenlerden kurulur).
   Son Okunanlar, Sık Okunanlar ve kullanıcının kendi (özel) rafları her modda
   aynen görünür. Hiçbir kayıt, sıra ya da gizleme ayarı silinmez; mod yalnız
   GÖRÜNENİ süzer, "Tüm eserler"e dönünce her şey eskisi gibidir.
   ═══════════════════════════════════════════════════════════════════════════ */

import { useEffect, useMemo, useState } from "react"
import { Library, BookOpen, ListChecks, Check, Minus, ChevronDown, ChevronLeft, X } from "lucide-react"
import { kategoriler as TUM_KATEGORILER } from "../data/kitaplar"

export const MOD_ANAHTAR = "vukuf-kitaplik-modu"
export const SECIM_ANAHTAR = "vukuf-kitaplik-secim"
export const MOD_OLAYI = "vukuf-kitaplik-modu"
export const HAP_ANAHTAR = "vukuf-kitaplik-mod-hapi"
export const RISALE_RAFLARI = ["orijinal-eserler", "evrad-ezkar", "risale"]

export const MODLAR = [
  { id: "tum", ad: "Tüm eserler", Ikon: Library,
    aciklama: "Kitaplıktaki bütün raflar ve âlimler görünür." },
  { id: "secili", ad: "Seçilen eserler", Ikon: ListChecks,
    aciklama: "Yalnız seçtiğiniz raflar ve âlimler görünür." },
  { id: "risale", ad: "Risale-i Nûr", Ikon: BookOpen,
    aciklama: "Kur'ân-ı Kerîm, Evrâd u Ezkâr ve Risale-i Nûr rafları görünür." },
]
const GECERLI = new Set(MODLAR.map(m => m.id))

/* ── OKU / YAZ ─────────────────────────────────────────────────────────────── */
export function modOku() {
  try { const v = localStorage.getItem(MOD_ANAHTAR); return GECERLI.has(v) ? v : null } catch { return null }
}
export function secimOku() {
  try {
    const s = JSON.parse(localStorage.getItem(SECIM_ANAHTAR) || "null")
    return {
      raflar: Array.isArray(s?.raflar) ? s.raflar : [],
      alimler: Array.isArray(s?.alimler) ? s.alimler : [],
    }
  } catch { return { raflar: [], alimler: [] } }
}
function yayinla() {
  try { window.dispatchEvent(new CustomEvent(MOD_OLAYI)) } catch { /* yoksay */ }
}
export function modYaz(mod) {
  try { localStorage.setItem(MOD_ANAHTAR, mod) } catch { /* kota */ }
  yayinla()
}
export function hapAcikMi() {
  try { return localStorage.getItem(HAP_ANAHTAR) === "1" } catch { return false }
}
export function hapYaz(acik) {
  try { localStorage.setItem(HAP_ANAHTAR, acik ? "1" : "0") } catch { /* kota */ }
  yayinla()
}
export function secimYaz(secim) {
  try { localStorage.setItem(SECIM_ANAHTAR, JSON.stringify(secim)) } catch { /* kota */ }
  yayinla()
}

/* [mod (null = seçilmedi), secim, hızlı değiştirme düğmesi açık mı] — başka bileşen değiştirince güncellenir */
export function useKitaplikModu() {
  const [mod, setMod] = useState(modOku)
  const [secim, setSecim] = useState(secimOku)
  const [hap, setHap] = useState(hapAcikMi)
  useEffect(() => {
    const h = () => { setMod(modOku()); setSecim(secimOku()); setHap(hapAcikMi()) }
    window.addEventListener(MOD_OLAYI, h)
    window.addEventListener("storage", h)
    return () => { window.removeEventListener(MOD_OLAYI, h); window.removeEventListener("storage", h) }
  }, [])
  return [mod, secim, hap]
}

/* Kitaplıkta görünecek kısım rafları (âlimleri süzülmüş kopyalar) */
export function kategorileriSuz(kategoriler, mod, secim) {
  if (mod === "risale") return kategoriler.filter(k => RISALE_RAFLARI.includes(k.id))
  if (mod !== "secili") return kategoriler
  const raflar = new Set(secim?.raflar || []), alimler = new Set(secim?.alimler || [])
  return kategoriler
    .map(k => (raflar.has(k.id) ? k : { ...k, alimler: (k.alimler || []).filter(a => alimler.has(a.id)) }))
    .filter(k => raflar.has(k.id) || k.alimler.length)
}

export function secimSayilari(secim, kategoriler = TUM_KATEGORILER) {
  const raflar = new Set(secim?.raflar || []), alimler = new Set(secim?.alimler || [])
  let raf = 0, alim = 0
  for (const k of kategoriler) {
    if (raflar.has(k.id)) { raf++; continue }
    const n = (k.alimler || []).filter(a => alimler.has(a.id)).length
    if (n) alim += n
  }
  return { raf, alim }
}
export function modOzeti(mod, secim) {
  if (mod === "risale") return "Risale-i Nûr"
  if (mod === "secili") {
    const { raf, alim } = secimSayilari(secim)
    const p = [raf && `${raf} raf`, alim && `${alim} âlim`].filter(Boolean)
    return p.length ? `seçilen: ${p.join(", ")}` : "seçilen: henüz yok"
  }
  if (mod === "tum") return "tüm eserler"
  return "seçilmedi"
}

/* ── SEÇİM İŞLEMLERİ (saf) ─────────────────────────────────────────────────── */
function rafDurumu(k, secim) {
  if (secim.raflar.includes(k.id)) return "tam"
  const ids = (k.alimler || []).map(a => a.id)
  const n = ids.filter(id => secim.alimler.includes(id)).length
  return n === 0 ? "yok" : n === ids.length ? "tam" : "kismi"
}
function rafDegistir(k, secim) {
  const ids = (k.alimler || []).map(a => a.id)
  const temizAlim = secim.alimler.filter(id => !ids.includes(id))
  const durum = rafDurumu(k, secim)
  if (durum === "tam") return { raflar: secim.raflar.filter(id => id !== k.id), alimler: temizAlim }
  return { raflar: [...secim.raflar.filter(id => id !== k.id), k.id], alimler: temizAlim }
}
function alimDegistir(k, alimId, secim) {
  const ids = (k.alimler || []).map(a => a.id)
  let raflar = secim.raflar, alimler = secim.alimler
  if (raflar.includes(k.id)) {                       // bütün raf seçiliydi → teke çevir
    raflar = raflar.filter(id => id !== k.id)
    alimler = [...alimler.filter(id => !ids.includes(id)), ...ids.filter(id => id !== alimId)]
  } else if (alimler.includes(alimId)) {
    alimler = alimler.filter(id => id !== alimId)
  } else {
    alimler = [...alimler, alimId]
  }
  // Rafın bütün âlimleri tek tek seçildiyse bütün raf sayılır
  if (ids.length && ids.every(id => alimler.includes(id))) {
    alimler = alimler.filter(id => !ids.includes(id))
    raflar = [...raflar, k.id]
  }
  return { raflar, alimler }
}

// Risale-i Nûr ve Evrâd u Ezkâr'ın alt kayıtları âlim değil eser bölümü (Büyük/Küçük Eserler…)
const birimAdi = (k) => (/ris[aâ]le|evr[aâ]d/i.test(`${k.id} ${k.baslik}`) ? "bölüm" : "âlim")

/* ── ONAY KUTUSU ───────────────────────────────────────────────────────────── */
function Kutu({ theme, durum, boy = 20 }) {
  const ac = theme.accent
  const dolu = durum === "tam" || durum === "kismi"
  return (
    <span aria-hidden="true" style={{
      width: `${boy}px`, height: `${boy}px`, borderRadius: "6px", flexShrink: 0,
      display: "flex", alignItems: "center", justifyContent: "center",
      border: `1.5px solid ${dolu ? ac : theme.border}`, background: dolu ? ac : "transparent", color: "#fff",
    }}>
      {durum === "tam" && <Check size={boy - 6} strokeWidth={3} />}
      {durum === "kismi" && <Minus size={boy - 6} strokeWidth={3} />}
    </span>
  )
}

/* ── RAF / ÂLİM SEÇİCİ ─────────────────────────────────────────────────────── */
export function EserSecici({ theme, secim, onDegis, kategoriler = TUM_KATEGORILER }) {
  const ac = theme.accent
  const [acik, setAcik] = useState(null)              // âlimleri açık raf
  const { raf, alim } = secimSayilari(secim, kategoriler)
  const hap = (vurgulu) => ({
    display: "inline-flex", alignItems: "center", gap: "5px", padding: "5px 11px", borderRadius: "999px",
    border: `1px solid ${vurgulu ? ac : theme.border}`, background: vurgulu ? `${ac}14` : "transparent",
    color: vurgulu ? ac : theme.textSecondary, fontSize: "12px", fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
  })
  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap", marginBottom: "8px" }}>
        <span style={{ flex: 1, minWidth: "120px", fontSize: "12px", color: theme.textSecondary }}>
          {raf || alim ? `${[raf && `${raf} raf`, alim && `${alim} âlim`].filter(Boolean).join(", ")} seçili` : "Henüz seçim yok"}
        </span>
        <button style={hap(false)} onClick={() => onDegis({ raflar: [...RISALE_RAFLARI], alimler: [] })}>Risale-i Nûr rafları</button>
        <button style={hap(false)} onClick={() => onDegis({ raflar: kategoriler.map(k => k.id), alimler: [] })}>Tümü</button>
        {(raf > 0 || alim > 0) && <button style={hap(false)} onClick={() => onDegis({ raflar: [], alimler: [] })}>Temizle</button>}
      </div>
      <div style={{ border: `1px solid ${theme.border}`, borderRadius: "12px", overflow: "hidden" }}>
        {kategoriler.map((k, i) => {
          const durum = rafDurumu(k, secim)
          const alimVar = (k.alimler || []).length > 1      // tek alt kaydı olan rafta açmaya gerek yok
          const birim = birimAdi(k)
          const acikMi = acik === k.id
          const secilen = durum === "tam" ? (k.alimler || []).length : (k.alimler || []).filter(a => secim.alimler.includes(a.id)).length
          return (
            <div key={k.id} style={{ borderTop: i ? `1px solid ${theme.border}` : "none" }}>
              <div style={{ display: "flex", alignItems: "center" }}>
                <button onClick={() => onDegis(rafDegistir(k, secim))} role="checkbox"
                  aria-checked={durum === "tam" ? true : durum === "kismi" ? "mixed" : false}
                  style={{
                    flex: 1, minWidth: 0, display: "flex", alignItems: "center", gap: "10px", padding: "11px 12px",
                    border: "none", background: durum !== "yok" ? `${ac}0a` : "transparent", cursor: "pointer",
                    fontFamily: "inherit", textAlign: "left", color: theme.text,
                  }}>
                  <Kutu theme={theme} durum={durum} />
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ display: "block", fontSize: "14px", fontWeight: 600 }}>{k.baslik}</span>
                    {alimVar && (
                      <span style={{ display: "block", fontSize: "11px", color: theme.textSecondary }}>
                        {durum === "tam" ? `bütün raf · ${k.alimler.length} ${birim}` : `${secilen}/${k.alimler.length} ${birim}`}
                      </span>
                    )}
                  </span>
                </button>
                {alimVar && (
                  <button onClick={() => setAcik(a => (a === k.id ? null : k.id))} aria-expanded={acikMi}
                    aria-label={`${k.baslik} ${birim === "âlim" ? "âlimleri" : "bölümleri"}`} style={{
                      alignSelf: "stretch", width: "46px", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center",
                      border: "none", borderLeft: `1px solid ${theme.border}`, background: "transparent", cursor: "pointer", color: theme.textSecondary,
                    }}>
                    <ChevronDown size={16} style={{ transition: "transform 0.2s", transform: acikMi ? "rotate(180deg)" : "none" }} />
                  </button>
                )}
              </div>
              {acikMi && (
                <div style={{ padding: "2px 0 6px", background: `${ac}06` }}>
                  {k.alimler.map(a => {
                    const s = secim.raflar.includes(k.id) || secim.alimler.includes(a.id)
                    return (
                      <button key={a.id} onClick={() => onDegis(alimDegistir(k, a.id, secim))} role="checkbox" aria-checked={s}
                        style={{
                          width: "100%", display: "flex", alignItems: "center", gap: "10px", padding: "8px 12px 8px 42px",
                          border: "none", background: "transparent", cursor: "pointer", fontFamily: "inherit",
                          textAlign: "left", color: theme.text, fontSize: "13px",
                        }}>
                        <Kutu theme={theme} durum={s ? "tam" : "yok"} boy={18} />
                        <span style={{ flex: 1, minWidth: 0 }}>{a.isim}</span>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

/* ── MOD KARTLARI (ilk açılış ve Ayarlar ortak) ───────────────────────────── */
export function ModKartlari({ theme, deger, onSec }) {
  const ac = theme.accent
  return (
    <div role="radiogroup" style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
      {MODLAR.map(m => {
        const sec = deger === m.id
        return (
          <button key={m.id} role="radio" aria-checked={sec} onClick={() => onSec(m.id)} style={{
            display: "flex", alignItems: "center", gap: "12px", padding: "12px 14px", borderRadius: "14px",
            border: `1.5px solid ${sec ? ac : theme.border}`, background: sec ? `${ac}12` : "transparent",
            cursor: "pointer", fontFamily: "inherit", textAlign: "left", color: theme.text,
          }}>
            <span style={{
              width: "38px", height: "38px", borderRadius: "11px", flexShrink: 0,
              display: "flex", alignItems: "center", justifyContent: "center",
              background: sec ? ac : `${ac}16`, color: sec ? "#fff" : ac,
            }}><m.Ikon size={19} /></span>
            <span style={{ flex: 1, minWidth: 0 }}>
              <span style={{ display: "block", fontSize: "15px", fontWeight: 600, color: sec ? ac : theme.text }}>{m.ad}</span>
              <span style={{ display: "block", fontSize: "12px", color: theme.textSecondary, lineHeight: 1.45, marginTop: "1px" }}>{m.aciklama}</span>
            </span>
            <span aria-hidden="true" style={{
              width: "20px", height: "20px", borderRadius: "50%", flexShrink: 0,
              border: `2px solid ${sec ? ac : theme.border}`, display: "flex", alignItems: "center", justifyContent: "center",
            }}>{sec && <span style={{ width: "10px", height: "10px", borderRadius: "50%", background: ac }} />}</span>
          </button>
        )
      })}
    </div>
  )
}

/* ── MOD PENCERESİ ─────────────────────────────────────────────────────────────
   ilk: true → ilk açılış karşılaması (kapatma düğmesi yok; seçim yapılınca kapanır).
   adim: "mod" | "secim" — "Seçilen eserler"de ikinci adım raf/âlim seçimi. */
export function ModPenceresi({ theme, ilk = false, baslangicAdim = "mod", kapat }) {
  const ac = theme.accent
  const [mod, setMod] = useState(() => modOku() || "tum")
  const [secim, setSecim] = useState(secimOku)
  const [adim, setAdim] = useState(baslangicAdim)
  const { raf, alim } = useMemo(() => secimSayilari(secim), [secim])
  const bosSecim = raf === 0 && alim === 0

  const bitir = () => {
    if (mod === "secili") secimYaz(secim)
    modYaz(mod)
    kapat?.()
  }
  const devam = () => {
    if (adim === "mod" && mod === "secili") { setAdim("secim"); return }
    bitir()
  }
  const dugme = (birincil, pasif) => ({
    flex: birincil ? 2 : 1, padding: "12px", borderRadius: "12px", fontFamily: "inherit",
    fontSize: "14px", fontWeight: 600, cursor: pasif ? "default" : "pointer",
    border: birincil ? "none" : `1px solid ${theme.border}`,
    background: birincil ? (pasif ? `${ac}55` : ac) : "transparent",
    color: birincil ? "#fff" : theme.textSecondary,
  })

  return (
    <>
      <div onClick={ilk ? undefined : kapat} style={{ position: "fixed", inset: 0, zIndex: 390, background: "rgba(0,0,0,0.45)" }} />
      <div role="dialog" aria-modal="true" aria-label="Kitaplık modu" style={{
        position: "fixed", left: "50%", top: "50%", transform: "translate(-50%, -50%)", zIndex: 391,
        width: "min(460px, calc(100vw - 28px))", maxHeight: "calc(100dvh - 32px)",
        display: "flex", flexDirection: "column",
        background: theme.surface, color: theme.text, border: `1px solid ${theme.border}`,
        borderRadius: "20px", boxShadow: "0 18px 50px rgba(0,0,0,0.3)", overflow: "hidden",
      }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: "10px", padding: "18px 18px 10px" }}>
          {adim === "secim" && (
            <button onClick={() => setAdim("mod")} aria-label="Geri" style={{
              width: "30px", height: "30px", borderRadius: "50%", border: "none", background: "transparent",
              color: theme.textSecondary, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
            }}><ChevronLeft size={18} /></button>
          )}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: "17px", fontWeight: 700, color: ac, fontFamily: "PlayfairDisplay, serif" }}>
              {adim === "secim" ? "Raf ve âlim seçimi" : ilk ? "Vukuf'a hoş geldiniz" : "Kitaplık modu"}
            </div>
            <div style={{ fontSize: "13px", color: theme.textSecondary, lineHeight: 1.5, marginTop: "4px" }}>
              {adim === "secim"
                ? "Kitaplıkta görmek istediğiniz rafları işaretleyebilirsiniz. Bir rafın yalnız bazı âlimlerini ya da bölümlerini seçmek için sağdaki oka dokunabilirsiniz."
                : ilk
                  ? "Kitaplığın nasıl görüneceğini seçebilirsiniz. Bu tercih daha sonra Ayarlar → Kitaplık modu bölümünden değiştirilebilir."
                  : "Kitaplıkta hangi rafların görüneceğini seçebilirsiniz. Son ve Sık Okunanlar ile kendi raflarınız her modda görünür."}
            </div>
          </div>
          {!ilk && (
            <button onClick={kapat} aria-label="Kapat" style={{
              width: "30px", height: "30px", borderRadius: "50%", border: "none", background: "transparent",
              color: theme.textSecondary, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
            }}><X size={18} /></button>
          )}
        </div>

        <div style={{ flex: "1 1 auto", minHeight: 0, overflowY: "auto", overscrollBehavior: "contain", padding: "4px 18px 12px" }}>
          {adim === "mod"
            ? <ModKartlari theme={theme} deger={mod} onSec={setMod} />
            : <EserSecici theme={theme} secim={secim} onDegis={setSecim} />}
        </div>

        <div style={{ display: "flex", gap: "8px", padding: "10px 18px calc(16px + env(safe-area-inset-bottom))", borderTop: `1px solid ${theme.border}` }}>
          {!ilk && adim === "mod" && <button onClick={kapat} style={dugme(false)}>Vazgeç</button>}
          {adim === "secim" && <button onClick={() => setAdim("mod")} style={dugme(false)}>Geri</button>}
          <button onClick={() => { if (!(adim === "secim" && bosSecim)) devam() }} disabled={adim === "secim" && bosSecim}
            style={dugme(true, adim === "secim" && bosSecim)}>
            {adim === "mod" && mod === "secili" ? "Raf ve âlim seç →" : ilk ? "Başla" : "Kaydet"}
          </button>
        </div>
      </div>
    </>
  )
}
