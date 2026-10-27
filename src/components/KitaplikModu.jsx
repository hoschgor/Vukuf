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
   Kitaplık'taki kısım rafları ve Âlimler rafı; ayrıca (26 Ekim 2026, kullanıcı:
   "seçilen raf sistemine göre tefeül ve arama bölümü de güncellenmeli, kapalı
   kısımlar görüntülenmemeli") Arama ve Okuma Tefeülü'nün kapsam seçicisi
   (KapsamSecici), Arama'nın sûre adı sonuçları ve Söz Tefeülü (gorunenler,
   gorunenKitaplar). Kitaplık'ta (Risale-i Nûr modunda
   Âlimler rafı gösterilmez; seçilen eserlerde yalnız seçilenlerden kurulur).
   Son Okunanlar, Sık Okunanlar ve kullanıcının kendi (özel) rafları her modda
   aynen görünür. Hiçbir kayıt, sıra ya da gizleme ayarı silinmez; mod yalnız
   GÖRÜNENİ süzer, "Tüm eserler"e dönünce her şey eskisi gibidir.
   ═══════════════════════════════════════════════════════════════════════════ */

import { useEffect, useMemo, useState } from "react"
import { Library, BookOpen, ListChecks, ChevronDown, ChevronLeft, X } from "lucide-react"
import { kategoriler as TUM_KATEGORILER } from "../data/kitaplar"
import { rafPaleti, rafResmiBul } from "./rafGorselleri"

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

/* Moda göre görünenler (tefeül, arama gibi kitaplık dışı ekranlar için):
   { raflar: Set(kategoriId), alimler: Set(alimId), kuran: bool } */
export function gorunenler(mod, secim, kategoriler = TUM_KATEGORILER) {
  const gk = kategorileriSuz(kategoriler, mod || "tum", secim)
  return {
    raflar: new Set(gk.map(k => k.id)),
    alimler: new Set(gk.flatMap(k => (k.alimler || []).map(a => a.id))),
    kuran: gk.some(k => k.id === "orijinal-eserler"),
  }
}
/* Görünen raflardaki okunabilir kitaplar (tekrarsız) */
export function gorunenKitaplar(mod, secim, kategoriler = TUM_KATEGORILER) {
  const gor = new Set(), liste = []
  for (const k of kategorileriSuz(kategoriler, mod || "tum", secim)) {
    for (const a of k.alimler || []) {
      const ks = a.altKategoriler ? a.altKategoriler.flatMap(x => x.kitaplar || []) : (a.kitaplar || [])
      for (const b of ks) if (b && b.dosya && b.id !== "kuran" && !gor.has(b.id)) { gor.add(b.id); liste.push(b) }
    }
  }
  return liste
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

/* ═══ GÖRÜNÜM — VUKUF'A ÖZEL (27 Ekim 2026) ═════════════════════════════════
   Kullanıcı: "Kitaplık modu seçme bölümü çok bilinen bir tarzda oldu, bize özel
   bir stil olsa daha güzel olacak."
   Hazır arayüz kalıbı (yuvarlak radyo, kare onay kutusu, düz kart) yerine
   kitaplığın kendi dili:
   • PENCERE: kitap sayfası gibi — "cetvel" (altın çift çizgi) çerçeve, köşelerde
     tezhip köşebentleri, başlık ahşap bir "unvan" levhasında.
   • MOD KARTLARI: her mod küçük bir dolap — Kitaplık'taki raf resimleri ahşap
     çerçeve içinde (Tüm eserler: altı raf; Risale-i Nûr: Kur'ân, Evrâd, Risale;
     Seçilen eserler: seçtiğiniz raflar + boş bölme). Seçilende resimler aydınlanır,
     kandil ışığı düşer, üstten bir AYRAÇ (kitap şeridi) sarkar.
   • SEÇİM İŞARETİ: onay kutusu yerine sekiz köşeli MÜHÜR — boş, yarım (bazı
     âlimler), tam (bütün raf).
   • RAF SATIRLARI: raf resmi + raf levhası (Kitaplık'taki aralıklı büyük harf).
     Âlimler KİTAP SIRTI şeklinde: renkli deri sırt, altın şeritler.
   Renkler temadan (rafPaleti): her temada kendi ahşabı.
   ═══════════════════════════════════════════════════════════════════════════ */

const DERILER = ["#4a1720", "#1d2b3d", "#3d2a18", "#24301f", "#2c2440", "#3d1f24", "#22333a", "#4a3320"]
const deri = (id) => { let h = 0; for (const c of String(id)) h = (h * 31 + c.charCodeAt(0)) >>> 0; return DERILER[h % DERILER.length] }
const aralikli = (s) => String(s || "").toLocaleUpperCase("tr-TR")

/* Sekiz köşeli mühür: yok · kismi · tam */
function Muhur({ theme, durum, boy = 26 }) {
  const p = rafPaleti(theme), altin = p.gold
  const dolu = durum === "tam"
  const yildiz = "M12 1.6 L14.9 5 L19.4 4.6 L19 9.1 L22.4 12 L19 14.9 L19.4 19.4 L14.9 19 L12 22.4 L9.1 19 L4.6 19.4 L5 14.9 L1.6 12 L5 9.1 L4.6 4.6 L9.1 5 Z"
  return (
    <svg width={boy} height={boy} viewBox="0 0 24 24" aria-hidden="true" style={{ flexShrink: 0, display: "block" }}>
      <defs>
        <radialGradient id="vk-muhur-altin" cx="40%" cy="35%" r="70%">
          <stop offset="0%" stopColor="#f3dc9a" /><stop offset="60%" stopColor={altin} /><stop offset="100%" stopColor="#9c7a2e" />
        </radialGradient>
      </defs>
      <path d={yildiz} fill={dolu ? "url(#vk-muhur-altin)" : "none"}
        stroke={durum === "yok" ? theme.border : altin} strokeWidth={dolu ? 0.8 : 1.3} strokeLinejoin="round" />
      {dolu && <path d="M7.6 12.3 L10.6 15.2 L16.4 9" fill="none" stroke="#fff" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" />}
      {durum === "kismi" && <circle cx="12" cy="12" r="3.6" fill={altin} />}
      {durum === "yok" && <circle cx="12" cy="12" r="2.2" fill="none" stroke={theme.border} strokeWidth="1" />}
    </svg>
  )
}

/* Kitap şeridi (ayraç) — seçili kartın üst kenarından sarkar */
function Ayrac({ theme, sag = 18, boy = 30 }) {
  return (
    <svg width="14" height={boy} viewBox={`0 0 14 ${boy}`} aria-hidden="true"
      style={{ position: "absolute", top: -2, right: sag, filter: "drop-shadow(0 2px 2px rgba(0,0,0,0.25))", pointerEvents: "none" }}>
      <path d={`M0 0 H14 V${boy} L7 ${boy - 6} L0 ${boy} Z`} fill={theme.accent} />
      <path d={`M3 0 V${boy - 4}`} stroke="rgba(255,255,255,0.35)" strokeWidth="1" />
    </svg>
  )
}

/* Raf resmi (yoksa ahşap zemin) */
function RafResmi({ theme, id, baslik, soluk, style }) {
  const p = rafPaleti(theme)
  const r = rafResmiBul(id, baslik)
  return (
    <div style={{ position: "relative", overflow: "hidden", background: p.ic, ...style }}>
      {r && (
        <img src={r.src} alt="" draggable={false} loading="lazy" style={{
          position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", objectPosition: r.konum,
          filter: soluk ? "saturate(0.45) brightness(0.78)" : "none", transition: "filter .3s ease",
        }} />
      )}
    </div>
  )
}

/* Küçük dolap: ahşap çerçeve + raf resimleri. duzen: [[id,…], …] satırlar; null = boş bölme */
function MiniDolap({ theme, duzen, secili, en = 120, yuk = 74 }) {
  const p = rafPaleti(theme)
  return (
    <div aria-hidden="true" style={{
      position: "relative", width: `${en}px`, height: `${yuk}px`, flexShrink: 0, boxSizing: "border-box",
      padding: "5px 4px 4px", borderRadius: "5px 5px 3px 3px",
      background: p.yatay, boxShadow: `inset 0 0 0 1px ${p.oyma}, 0 2px 5px rgba(0,0,0,0.3)`,
      display: "flex", flexDirection: "column", gap: "3px",
    }}>
      {duzen.map((satir, i) => (
        <div key={i} style={{ flex: 1, minHeight: 0, display: "flex", gap: "3px" }}>
          {satir.map((id, j) => id ? (
            <RafResmi key={j} theme={theme} id={id} baslik={TUM_KATEGORILER.find(k => k.id === id)?.baslik}
              soluk={!secili} style={{ flex: 1, borderRadius: "1px", boxShadow: "inset 0 -2px 0 rgba(0,0,0,0.35)" }} />
          ) : (
            <div key={j} style={{
              flex: 1, borderRadius: "1px", background: p.ic, display: "flex", alignItems: "center", justifyContent: "center",
              color: p.oyma, fontSize: "14px", fontWeight: 700, outline: `1px dashed ${p.oyma}`, outlineOffset: "-4px",
            }}>+</div>
          ))}
        </div>
      ))}
      {/* kandil ışığı — seçilende */}
      <div style={{ position: "absolute", left: "50%", top: "-14px", width: "110px", height: "70px", transform: "translateX(-50%)",
        background: p.isik, opacity: secili ? 1 : 0, transition: "opacity .3s ease", pointerEvents: "none" }} />
    </div>
  )
}

/* ── RAF / ÂLİM SEÇİCİ ─────────────────────────────────────────────────────── */
export function EserSecici({ theme, secim, onDegis, kategoriler = TUM_KATEGORILER }) {
  const p = rafPaleti(theme)
  const ac = theme.accent
  const [acik, setAcik] = useState(null)              // âlimleri açık raf
  const { raf, alim } = secimSayilari(secim, kategoriler)
  const kisayol = {
    display: "inline-flex", alignItems: "center", padding: "5px 11px", borderRadius: "4px",
    border: `1px solid ${p.oyma}`, background: p.band, color: "#f3e6c8",
    fontSize: "11px", fontWeight: 600, letterSpacing: "0.06em", cursor: "pointer", fontFamily: "inherit",
    boxShadow: "inset 0 1px 0 rgba(255,255,255,0.08), 0 1px 2px rgba(0,0,0,0.25)",
  }
  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap", marginBottom: "10px" }}>
        <span style={{ flex: 1, minWidth: "120px", fontSize: "12px", color: theme.textSecondary, fontStyle: "italic" }}>
          {raf || alim ? `${[raf && `${raf} raf`, alim && `${alim} âlim`].filter(Boolean).join(", ")} seçili` : "Henüz seçim yok"}
        </span>
        <button style={kisayol} onClick={() => onDegis({ raflar: [...RISALE_RAFLARI], alimler: [] })}>RİSALE-İ NÛR</button>
        <button style={kisayol} onClick={() => onDegis({ raflar: kategoriler.map(k => k.id), alimler: [] })}>TÜMÜ</button>
        {(raf > 0 || alim > 0) && <button style={kisayol} onClick={() => onDegis({ raflar: [], alimler: [] })}>TEMİZLE</button>}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: "7px" }}>
        {kategoriler.map(k => {
          const durum = rafDurumu(k, secim)
          const alimVar = (k.alimler || []).length > 1      // tek alt kaydı olan rafta açmaya gerek yok
          const birim = birimAdi(k)
          const acikMi = acik === k.id
          const secilen = durum === "tam" ? (k.alimler || []).length : (k.alimler || []).filter(a => secim.alimler.includes(a.id)).length
          const isikli = durum !== "yok"
          return (
            <div key={k.id} style={{
              borderRadius: "7px", overflow: "hidden",
              background: p.band, padding: "4px",
              boxShadow: `inset 0 0 0 1px ${p.oyma}, 0 2px 4px rgba(0,0,0,0.22)`,
            }}>
              <div style={{ display: "flex", alignItems: "stretch", gap: "4px" }}>
                <button onClick={() => onDegis(rafDegistir(k, secim))} role="checkbox"
                  aria-checked={durum === "tam" ? true : durum === "kismi" ? "mixed" : false}
                  style={{
                    flex: 1, minWidth: 0, display: "flex", alignItems: "center", gap: "10px", padding: "4px 10px 4px 4px",
                    borderRadius: "4px", cursor: "pointer", fontFamily: "inherit", textAlign: "left", color: theme.text,
                    background: theme.surface,
                    border: `1px solid ${isikli ? p.gold : "rgba(0,0,0,0.15)"}`,
                    boxShadow: isikli ? `inset 0 0 0 2px ${theme.surface}, inset 0 0 0 3px ${p.gold}66` : "none",
                  }}>
                  <RafResmi theme={theme} id={k.id} baslik={k.baslik} soluk={!isikli}
                    style={{ width: "74px", height: "40px", flexShrink: 0, borderRadius: "3px", boxShadow: "inset 0 0 0 1px rgba(0,0,0,0.25)" }} />
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ display: "block", fontSize: "12.5px", fontWeight: 600, letterSpacing: "0.12em", color: isikli ? ac : theme.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {aralikli(k.baslik)}
                    </span>
                    {alimVar && (
                      <span style={{ display: "block", fontSize: "11px", color: theme.textSecondary, marginTop: "1px" }}>
                        {durum === "tam" ? `bütün raf · ${k.alimler.length} ${birim}` : `${secilen}/${k.alimler.length} ${birim}`}
                      </span>
                    )}
                  </span>
                  <Muhur theme={theme} durum={durum} />
                </button>
                {alimVar && (
                  <button onClick={() => setAcik(a => (a === k.id ? null : k.id))} aria-expanded={acikMi}
                    aria-label={`${k.baslik} ${birim === "âlim" ? "âlimleri" : "bölümleri"}`} style={{
                      width: "38px", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center",
                      borderRadius: "4px", border: `1px solid ${p.oyma}`, background: "transparent", cursor: "pointer", color: "#f3e6c8",
                    }}>
                    <ChevronDown size={16} style={{ transition: "transform 0.2s", transform: acikMi ? "rotate(180deg)" : "none" }} />
                  </button>
                )}
              </div>
              {acikMi && (
                /* Âlimler — kitap sırtları gibi */
                <div style={{
                  marginTop: "4px", padding: "8px", borderRadius: "4px", background: p.ic,
                  display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: "6px",
                }}>
                  {k.alimler.map(a => {
                    const s = secim.raflar.includes(k.id) || secim.alimler.includes(a.id)
                    const renk = deri(a.id)
                    return (
                      <button key={a.id} onClick={() => onDegis(alimDegistir(k, a.id, secim))} role="checkbox" aria-checked={s}
                        style={{
                          display: "flex", alignItems: "stretch", gap: "8px", padding: 0, minHeight: "36px",
                          borderRadius: "3px", overflow: "hidden", cursor: "pointer", fontFamily: "inherit", textAlign: "left",
                          border: `1px solid ${s ? p.gold : "rgba(0,0,0,0.3)"}`,
                          background: s ? theme.surface : `${theme.surface}cc`, color: theme.text,
                          opacity: s ? 1 : 0.82,
                        }}>
                        {/* sırt: deri + iki altın şerit */}
                        <span aria-hidden="true" style={{
                          width: "11px", flexShrink: 0,
                          background: `linear-gradient(180deg, ${renk} 0 18%, ${p.gold} 18% 23%, ${renk} 23% 77%, ${p.gold} 77% 82%, ${renk} 82%)`,
                          boxShadow: "inset -2px 0 2px rgba(0,0,0,0.35)",
                        }} />
                        <span style={{ flex: 1, minWidth: 0, display: "flex", alignItems: "center", fontSize: "12.5px", lineHeight: 1.3, padding: "4px 0" }}>{a.isim}</span>
                        <span style={{ display: "flex", alignItems: "center", paddingRight: "6px" }}>
                          <Muhur theme={theme} durum={s ? "tam" : "yok"} boy={18} />
                        </span>
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
const MOD_DOLABI = {
  tum: [["orijinal-eserler", "risale", "tasavvuf"], ["hadis", "kelam", "tefsir"]],
  risale: [["orijinal-eserler", "evrad-ezkar", "risale"]],
}
export function ModKartlari({ theme, deger, onSec, secim = null }) {
  const p = rafPaleti(theme)
  const ac = theme.accent
  // Seçilen eserler kartı: seçilen ilk iki raf + boş bölme
  const seciliDolap = useMemo(() => {
    const s = secim || secimOku()
    const ids = TUM_KATEGORILER.filter(k => s.raflar.includes(k.id) || (k.alimler || []).some(a => s.alimler.includes(a.id))).map(k => k.id)
    const ilk2 = ids.length ? ids.slice(0, 2) : ["tasavvuf", "hadis"]
    return [[...ilk2, null]]
  }, [secim])
  return (
    <div role="radiogroup" style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
      {MODLAR.map(m => {
        const sec = deger === m.id
        return (
          <button key={m.id} role="radio" aria-checked={sec} onClick={() => onSec(m.id)} style={{
            position: "relative", display: "flex", alignItems: "center", gap: "12px", padding: "10px 12px 10px 10px",
            borderRadius: "8px", cursor: "pointer", fontFamily: "inherit", textAlign: "left", color: theme.text,
            background: sec ? theme.surface : "transparent",
            border: `1px solid ${sec ? p.gold : theme.border}`,
            // seçilende cetvel: altın çift çizgi
            boxShadow: sec ? `inset 0 0 0 3px ${theme.surface}, inset 0 0 0 4px ${p.gold}88, 0 3px 10px rgba(0,0,0,0.12)` : "none",
            transition: "border-color .2s ease, box-shadow .2s ease",
          }}>
            <MiniDolap theme={theme} secili={sec} duzen={m.id === "secili" ? seciliDolap : MOD_DOLABI[m.id]} />
            <span style={{ flex: 1, minWidth: 0, paddingRight: "16px" }}>
              <span style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", fontWeight: 700, letterSpacing: "0.1em", color: sec ? ac : theme.text, whiteSpace: "nowrap" }}>
                <m.Ikon size={14} style={{ flexShrink: 0, opacity: 0.85 }} /> {aralikli(m.ad)}
              </span>
              <span style={{ display: "block", fontSize: "12px", color: theme.textSecondary, lineHeight: 1.45, marginTop: "4px" }}>{m.aciklama}</span>
            </span>
            {sec && <Ayrac theme={theme} />}
          </button>
        )
      })}
    </div>
  )
}

/* Tezhip köşebendi (pencerenin dört köşesi) */
function Kosebent({ renk, donus }) {
  return (
    <svg width="26" height="26" viewBox="0 0 26 26" aria-hidden="true"
      style={{ position: "absolute", ...donus.yer, transform: `rotate(${donus.aci}deg)`, pointerEvents: "none" }}>
      <path d="M2 2 H24 C15 3.5 8 8 4.5 15 C3.2 18 2.5 21 2 24 Z" fill={renk} fillOpacity="0.22" stroke={renk} strokeWidth="0.9" />
      <circle cx="8.5" cy="8.5" r="2.4" fill="none" stroke={renk} strokeWidth="0.9" />
      <circle cx="8.5" cy="8.5" r="0.9" fill={renk} />
    </svg>
  )
}
const KOSELER = [
  { yer: { top: 6, left: 6 }, aci: 0 }, { yer: { top: 6, right: 6 }, aci: 90 },
  { yer: { bottom: 6, right: 6 }, aci: 180 }, { yer: { bottom: 6, left: 6 }, aci: 270 },
]

/* ── MOD PENCERESİ ─────────────────────────────────────────────────────────────
   ilk: true → ilk açılış karşılaması (kapatma düğmesi yok; seçim yapılınca kapanır).
   adim: "mod" | "secim" — "Seçilen eserler"de ikinci adım raf/âlim seçimi. */
export function ModPenceresi({ theme, ilk = false, baslangicAdim = "mod", kapat }) {
  const p = rafPaleti(theme)
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
    flex: birincil ? 2 : 1, padding: "11px", borderRadius: "6px", fontFamily: "inherit",
    fontSize: "13px", fontWeight: 700, letterSpacing: "0.1em", cursor: pasif ? "default" : "pointer",
    border: birincil ? `1px solid ${p.gold}` : `1px solid ${theme.border}`,
    background: birincil ? (pasif ? `${ac}55` : ac) : "transparent",
    color: birincil ? "#fff" : theme.textSecondary,
    boxShadow: birincil && !pasif ? `inset 0 0 0 2px ${ac}, inset 0 0 0 3px ${p.gold}88` : "none",
  })
  const yuvarlak = {
    width: "30px", height: "30px", borderRadius: "50%", border: "none", background: "transparent",
    color: "#f3e6c8", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
  }
  const baslik = adim === "secim" ? "Raf ve Âlim Seçimi" : ilk ? "Vukuf'a Hoş Geldiniz" : "Kitaplık Modu"

  return (
    <>
      <div onClick={ilk ? undefined : kapat} style={{ position: "fixed", inset: 0, zIndex: 390, background: "rgba(0,0,0,0.5)" }} />
      <div role="dialog" aria-modal="true" aria-label="Kitaplık modu" style={{
        position: "fixed", left: "50%", top: "50%", transform: "translate(-50%, -50%)", zIndex: 391,
        width: "min(470px, calc(100vw - 24px))", maxHeight: "calc(100dvh - 28px)",
        display: "flex", flexDirection: "column", boxSizing: "border-box",
        background: theme.surface, color: theme.text,
        border: `1px solid ${p.c2}`, borderRadius: "10px",
        // sayfa cetveli: ince–altın–ince
        boxShadow: `inset 0 0 0 5px ${theme.surface}, inset 0 0 0 6px ${p.gold}, inset 0 0 0 8px ${theme.surface}, inset 0 0 0 9px ${p.gold}77, 0 22px 60px rgba(0,0,0,0.4)`,
        padding: "12px",
      }}>
        {KOSELER.map((k, i) => <Kosebent key={i} renk={p.gold} donus={k} />)}

        {/* UNVAN — ahşap levha, uçları sivri */}
        <div style={{ position: "relative", margin: "8px 10px 0", height: "52px", flexShrink: 0 }}>
          <svg width="100%" height="52" viewBox="0 0 400 52" preserveAspectRatio="none" aria-hidden="true" style={{ position: "absolute", inset: 0 }}>
            <defs>
              <linearGradient id="vk-unvan" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={p.c3} /><stop offset="45%" stopColor={p.c2} /><stop offset="100%" stopColor={p.c1} />
              </linearGradient>
            </defs>
            <path d="M2 26 L26 2 H374 L398 26 L374 50 H26 Z" fill="url(#vk-unvan)" stroke={p.gold} strokeWidth="1.4" vectorEffect="non-scaling-stroke" />
            <path d="M12 26 L30 7 H370 L388 26 L370 45 H30 Z" fill="none" stroke={p.gold} strokeOpacity="0.55" strokeWidth="0.8" vectorEffect="non-scaling-stroke" />
          </svg>
          <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", padding: "0 34px" }}>
            {adim === "secim" && (
              <button onClick={() => setAdim("mod")} aria-label="Geri" style={{ ...yuvarlak, position: "absolute", left: "26px" }}><ChevronLeft size={18} /></button>
            )}
            <span style={{ fontFamily: "PlayfairDisplay, serif", fontSize: "17px", fontWeight: 700, color: "#f1d991", letterSpacing: "0.04em", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", textShadow: "0 1px 2px rgba(0,0,0,0.5)" }}>
              {baslik}
            </span>
            {!ilk && (
              <button onClick={kapat} aria-label="Kapat" style={{ ...yuvarlak, position: "absolute", right: "26px" }}><X size={17} /></button>
            )}
          </div>
        </div>

        <div style={{ fontSize: "12.5px", color: theme.textSecondary, lineHeight: 1.55, textAlign: "center", padding: "10px 18px 6px", fontStyle: "italic" }}>
          {adim === "secim"
            ? "Kitaplıkta görmek istediğiniz raflar mühürlenebilir. Bir rafın yalnız bazı âlimlerini ya da bölümlerini seçmek için sağdaki oka dokunabilirsiniz."
            : ilk
              ? "Kitaplığın nasıl görüneceğini seçebilirsiniz. Bu tercih daha sonra Ayarlar → Kitaplık modu bölümünden değiştirilebilir."
              : "Kitaplıkta hangi rafların görüneceğini seçebilirsiniz. Son ve Sık Okunanlar ile kendi raflarınız her modda görünür."}
        </div>

        <div style={{ flex: "1 1 auto", minHeight: 0, overflowY: "auto", overscrollBehavior: "contain", padding: "6px 10px 10px" }}>
          {adim === "mod"
            ? <ModKartlari theme={theme} deger={mod} onSec={setMod} secim={secim} />
            : <EserSecici theme={theme} secim={secim} onDegis={setSecim} />}
        </div>

        <div style={{ display: "flex", gap: "8px", padding: "10px 10px calc(8px + env(safe-area-inset-bottom))", borderTop: `1px solid ${p.gold}55`, flexShrink: 0 }}>
          {!ilk && adim === "mod" && <button onClick={kapat} style={dugme(false)}>VAZGEÇ</button>}
          {adim === "secim" && <button onClick={() => setAdim("mod")} style={dugme(false)}>GERİ</button>}
          <button onClick={() => { if (!(adim === "secim" && bosSecim)) devam() }} disabled={adim === "secim" && bosSecim}
            style={dugme(true, adim === "secim" && bosSecim)}>
            {adim === "mod" && mod === "secili" ? "RAF VE ÂLİM SEÇ →" : ilk ? "BAŞLA" : "KAYDET"}
          </button>
        </div>
      </div>
    </>
  )
}
