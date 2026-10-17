/* ═══════════════════════════════════════════════════════════════════════════
   VUKUF — LÜGAT ARAMASI (okuma ekranı)
   src/components/LugatArama.jsx

   17 Ekim 2026, kullanıcı: "OkumaEkranı içine bir buton ekleyip lügat araması
   yaptıralım. Göz yormayan şekilde sonuçları göstersin, kolayca çıkılabilsin."

   GÖRÜNÜM: telefonda alttan açılan yaprak (ekranın ~%82'si), geniş ekranda ortada
   sakin bir pencere. Ağır çerçeve yok; satırlar ince ayraçla ayrılır, kelime tema
   renginde, anlam rahat satır aralığıyla. Uzun anlamlar iki satırda kesilir, satıra
   dokunulunca tamamı (ve varsa kavram açıklaması) açılır.
   ÇIKIŞ: ✕, arka plana dokunma, Esc, telefonda tutamağı aşağı çekme.
   AÇILIŞ: metinde seçili bir kelime varsa arama kutusuna o gelir.
   ARAMA: Türkçe katlama (trFold: â/a, İ/i, büyük/küçük) + esnek ayraç ("lisanıhal",
   "lisan ı hal" → lisan-ı hâl). Sıra: tam eşleşme → başta → içinde → anlamda
   (anlamda arama 3+ harfte). En çok 40 sonuç, "Daha fazla" ile devam. Son aramalar
   (8) cihazda hatırlanır. Dizin bir kez, ilk açılışta kurulur (~42 bin kelime).
   ═══════════════════════════════════════════════════════════════════════════ */

import { useEffect, useMemo, useRef, useState } from "react"
import { Search, X, ChevronDown } from "lucide-react"
import { trFold } from "../data/okumaKayit"

const SON_ANAHTAR = "vukuf-lugat-son-aramalar"
const SAYFA = 40
// Ayraçlar (esnek arama): boşluk, tire çeşitleri, kesme/hemze işaretleri, birleşik aksanlar
const AYRAC_RE = /[\s\-‐-―'`´‘’ʻʼʾʿ·̀-ͯ]+/g
const sikistir = (s) => s.replace(AYRAC_RE, "")

function sonlariOku() {
  try { const v = JSON.parse(localStorage.getItem(SON_ANAHTAR) || "[]"); return Array.isArray(v) ? v.slice(0, 8) : [] }
  catch { return [] }
}
function sonaEkle(q) {
  const t = q.trim()
  if (t.length < 2) return
  try {
    const l = [t, ...sonlariOku().filter(x => trFold(x) !== trFold(t))].slice(0, 8)
    localStorage.setItem(SON_ANAHTAR, JSON.stringify(l))
  } catch { /* yoksay */ }
}

const siralayici = new Intl.Collator("tr", { sensitivity: "base" })
const dizinBellek = new WeakMap()
function dizinKur(lugat) {
  if (!lugat) return []
  let d = dizinBellek.get(lugat)
  if (!d) {
    d = Object.entries(lugat).map(([k, a]) => {
      const kf = trFold(k)
      return { k, a: String(a ?? ""), kf, ks: sikistir(kf), af: null }   // af: anlamın katlanmışı (gerekince)
    })
    dizinBellek.set(lugat, d)
  }
  return d
}

export default function LugatArama({ acik, kapat, theme, isMobile, olcek = 1, lugat, kavramlar }) {
  const [sorgu, setSorgu] = useState("")
  const [gecikmeli, setGecikmeli] = useState("")
  const [goster, setGoster] = useState(SAYFA)
  const [acikKelime, setAcikKelime] = useState(null)
  const [sonlar, setSonlar] = useState(sonlariOku)
  const [cekme, setCekme] = useState(0)                    // tutamaktan aşağı çekme (px)
  const girisRef = useRef(null)
  const listeRef = useRef(null)
  const cekmeRef = useRef(null)
  const ac = theme.accent
  const f = (v) => `${Math.round(v * olcek)}px`

  // Dizin: yalnız ilk açılışta kurulur, sonra bellekte kalır (modül düzeyinde)
  const dizin = useMemo(() => (acik ? dizinKur(lugat) : null), [acik, lugat])

  // Açılış: seçili metin varsa onunla başla; odak arama kutusuna
  useEffect(() => {
    if (!acik) return
    let secili = ""
    try { secili = (window.getSelection?.()?.toString() || "").trim() } catch { /* yoksay */ }
    if (secili && secili.length <= 40 && !/\n/.test(secili)) {
      const temiz = secili.replace(/^[\s.,;:!?"'“”‘’()[\]]+|[\s.,;:!?"'“”‘’()[\]]+$/g, "")
      if (temiz) { setSorgu(temiz); setGecikmeli(temiz) }
    }
    setSonlar(sonlariOku())
    setCekme(0)
    const t = setTimeout(() => girisRef.current?.focus({ preventScroll: true }), 60)
    const tus = (e) => { if (e.key === "Escape") kapat() }
    window.addEventListener("keydown", tus)
    return () => { clearTimeout(t); window.removeEventListener("keydown", tus) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [acik])

  // Yazarken her harfte değil, kısa bir duraksamadan sonra ara
  useEffect(() => {
    const t = setTimeout(() => setGecikmeli(sorgu), 140)
    return () => clearTimeout(t)
  }, [sorgu])
  useEffect(() => { setGoster(SAYFA); setAcikKelime(null); listeRef.current?.scrollTo?.({ top: 0 }) }, [gecikmeli])

  const sonuclar = useMemo(() => {
    const q = trFold(gecikmeli.trim())
    if (!dizin || !q) return []
    const qs = sikistir(q)
    const anlamda = q.length >= 3
    const bulunan = []
    for (const e of dizin) {
      let p = -1
      if (e.kf === q) p = 0
      else if (e.kf.startsWith(q)) p = 1
      else if (qs && e.ks.startsWith(qs)) p = 2
      else if (e.kf.includes(q)) p = 3
      else if (qs.length >= 4 && e.ks.includes(qs)) p = 4
      else if (anlamda) {
        if (e.af === null) e.af = trFold(e.a)
        if (e.af.includes(q)) p = 5
      }
      if (p >= 0) bulunan.push([p, e])
    }
    bulunan.sort((x, y) => x[0] - y[0] || x[1].k.length - y[1].k.length || siralayici.compare(x[1].k, y[1].k))
    return bulunan
  }, [dizin, gecikmeli])

  const kavramBul = (k) => {
    if (!kavramlar) return null
    const v = kavramlar[k] || kavramlar[k.toLocaleLowerCase("tr")]
    return Array.isArray(v) && v.length ? v : null
  }

  const vurgula = (metin, katli, q) => {
    if (!q) return metin
    const i = katli.indexOf(q)
    if (i < 0) return metin
    return <>{metin.slice(0, i)}<mark style={{ background: `${ac}26`, color: "inherit", borderRadius: "3px", padding: "0 1px" }}>{metin.slice(i, i + q.length)}</mark>{metin.slice(i + q.length)}</>
  }

  // Tutamaktan aşağı çekince kapanır (telefon)
  const cekBas = (e) => { cekmeRef.current = { y: e.clientY, id: e.pointerId }; try { e.currentTarget.setPointerCapture(e.pointerId) } catch { /* yoksay */ } }
  const cekKaydir = (e) => { const c = cekmeRef.current; if (c && c.id === e.pointerId) setCekme(Math.max(0, e.clientY - c.y)) }
  const cekBirak = () => { const d = cekme; cekmeRef.current = null; if (d > 90) kapat(); else setCekme(0) }

  if (!acik) return null
  const q = trFold(gecikmeli.trim())
  const gorunen = sonuclar.slice(0, goster)

  return (
    <div
      onClick={kapat}
      style={{
        position: "fixed", inset: 0, zIndex: 160, background: "rgba(0,0,0,0.28)",
        display: "flex", alignItems: isMobile ? "flex-end" : "flex-start", justifyContent: "center",
        animation: "lugatAramaSol .18s ease-out",
      }}
    >
      <style>{`
        @keyframes lugatAramaSol { from { background: rgba(0,0,0,0) } to { background: rgba(0,0,0,0.28) } }
        @keyframes lugatAramaYukari { from { transform: translateY(24px); opacity: .6 } to { transform: none; opacity: 1 } }
        .lugat-arama-satir:hover { background: ${ac}0a; }
        @media (prefers-reduced-motion: reduce) { .lugat-arama-kutu { animation: none !important } }
      `}</style>
      <div
        className="lugat-arama-kutu"
        role="dialog" aria-label="Lügat araması" aria-modal="true"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: isMobile ? "100%" : "min(560px, 92vw)",
          height: isMobile ? "82dvh" : "auto", maxHeight: isMobile ? "82dvh" : "76vh",
          marginTop: isMobile ? 0 : "9vh",
          background: theme.surface, color: theme.text,
          borderRadius: isMobile ? "18px 18px 0 0" : "16px",
          boxShadow: "0 18px 50px rgba(0,0,0,0.25)",
          display: "flex", flexDirection: "column", overflow: "hidden",
          transform: cekme ? `translateY(${cekme}px)` : undefined,
          transition: cekme ? "none" : "transform .2s ease",
          animation: "lugatAramaYukari .22s ease-out",
          paddingBottom: isMobile ? "env(safe-area-inset-bottom)" : 0,
        }}
      >
        {/* Tutamak (telefon) */}
        {isMobile && (
          <div onPointerDown={cekBas} onPointerMove={cekKaydir} onPointerUp={cekBirak} onPointerCancel={cekBirak}
            style={{ padding: "8px 0 2px", display: "flex", justifyContent: "center", touchAction: "none", cursor: "grab" }}>
            <span style={{ width: "38px", height: "4px", borderRadius: "2px", background: theme.border }} />
          </div>
        )}

        {/* Arama satırı */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px", padding: isMobile ? "8px 14px 10px" : "14px 16px 10px" }}>
          <div style={{
            flex: 1, display: "flex", alignItems: "center", gap: "8px",
            background: theme.background, borderRadius: "12px", padding: "9px 12px",
            border: `1px solid ${theme.border}`,
          }}>
            <Search size={17} color={theme.textSecondary} style={{ flexShrink: 0 }} />
            <input
              ref={girisRef} type="search" inputMode="search" enterKeyHint="search"
              value={sorgu} onChange={(e) => setSorgu(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") { sonaEkle(sorgu); setSonlar(sonlariOku()); e.currentTarget.blur() } }}
              placeholder="Kelime ya da anlam…"
              autoComplete="off" autoCorrect="off" spellCheck={false}
              style={{
                flex: 1, minWidth: 0, background: "transparent", border: "none", outline: "none",
                fontSize: "16px", color: theme.text, fontFamily: "inherit",
              }}
            />
            {sorgu && (
              <button onClick={() => { setSorgu(""); setGecikmeli(""); girisRef.current?.focus() }} aria-label="Aramayı temizle"
                style={{ border: "none", background: "none", padding: 0, cursor: "pointer", color: theme.textSecondary, display: "flex" }}>
                <X size={16} />
              </button>
            )}
          </div>
          <button onClick={kapat} aria-label="Lügat aramasını kapat" title="Kapat"
            style={{
              width: "38px", height: "38px", borderRadius: "999px", border: "none", cursor: "pointer", flexShrink: 0,
              background: `${ac}14`, color: ac, display: "flex", alignItems: "center", justifyContent: "center",
            }}>
            <X size={18} />
          </button>
        </div>

        {/* Sayı / ipucu */}
        <div style={{ padding: "0 18px 6px", fontSize: f(11.5), color: theme.textSecondary, minHeight: "16px" }}>
          {q
            ? (sonuclar.length ? `${sonuclar.length.toLocaleString("tr-TR")} sonuç` : "")
            : `${(dizin?.length || 0).toLocaleString("tr-TR")} kelime`}
        </div>

        {/* İçerik */}
        <div ref={listeRef} style={{ flex: 1, overflowY: "auto", overscrollBehavior: "contain", padding: "0 6px 14px" }}>
          {!q && (
            <div style={{ padding: "10px 12px", color: theme.textSecondary, fontSize: f(13.5), lineHeight: 1.7 }}>
              {sonlar.length > 0 && (
                <>
                  <div style={{ fontSize: f(11.5), letterSpacing: ".5px", marginBottom: "6px" }}>SON ARAMALAR</div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginBottom: "14px" }}>
                    {sonlar.map(s => (
                      <button key={s} onClick={() => { setSorgu(s); setGecikmeli(s) }}
                        style={{
                          padding: "5px 11px", borderRadius: "999px", border: `1px solid ${theme.border}`, background: "transparent",
                          color: theme.text, fontSize: f(13), cursor: "pointer", fontFamily: "inherit",
                        }}>{s}</button>
                    ))}
                  </div>
                </>
              )}
              Kelime ya da anlamın bir kısmı yazılabilir. Şapka, büyük/küçük harf ve tire fark etmez:
              <span style={{ color: theme.text }}> lisanıhal</span> yazıldığında da <span style={{ color: theme.text }}>lisan-ı hâl</span> bulunur.
            </div>
          )}

          {q && sonuclar.length === 0 && (
            <div style={{ padding: "36px 16px", textAlign: "center", color: theme.textSecondary, fontSize: f(14) }}>
              “{gecikmeli.trim()}” için sonuç bulunamadı.
            </div>
          )}

          {gorunen.map(([p, e], i) => {
            const acikMi = acikKelime === e.k
            const kv = acikMi ? kavramBul(e.k) : null
            const kavramVar = !acikMi && !!kavramBul(e.k)
            return (
              <div key={e.k}
                className="lugat-arama-satir"
                onClick={() => { setAcikKelime(acikMi ? null : e.k); sonaEkle(gecikmeli) }}
                style={{
                  padding: "11px 12px", borderRadius: "10px", cursor: "pointer",
                  borderTop: i === 0 ? "none" : `1px solid ${theme.border}66`,
                }}>
                <div style={{ display: "flex", alignItems: "baseline", gap: "8px" }}>
                  <span style={{ color: ac, fontWeight: 600, fontSize: f(16), flex: 1, minWidth: 0 }}>
                    {p <= 3 ? vurgula(e.k, e.kf, q) : e.k}
                  </span>
                  {kavramVar && (
                    <span style={{ fontSize: f(10.5), color: theme.textSecondary, border: `1px solid ${theme.border}`, borderRadius: "999px", padding: "0 7px" }}>kavram</span>
                  )}
                  <ChevronDown size={14} color={theme.textSecondary}
                    style={{ flexShrink: 0, opacity: 0.6, transform: acikMi ? "rotate(180deg)" : "none", transition: "transform .2s" }} />
                </div>
                <div style={{
                  marginTop: "3px", color: theme.text, opacity: 0.82, fontSize: f(14.5), lineHeight: 1.65,
                  ...(acikMi ? {} : { display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }),
                }}>
                  {p === 5 && e.af ? vurgula(e.a, e.af, q) : e.a}
                </div>
                {kv && kv.map((x, j) => (
                  <div key={j} style={{
                    marginTop: "10px", padding: "10px 12px", borderRadius: "10px",
                    background: theme.background, fontSize: f(13.5), lineHeight: 1.7, color: theme.textSecondary,
                  }}>
                    <div style={{ fontSize: f(11), letterSpacing: ".5px", marginBottom: "4px", color: ac }}>
                      KAVRAM{x.terim ? ` · ${x.terim}` : ""}
                    </div>
                    <div style={{ whiteSpace: "pre-line" }}>{x.aciklama}</div>
                  </div>
                ))}
              </div>
            )
          })}

          {sonuclar.length > goster && (
            <div style={{ display: "flex", justifyContent: "center", padding: "10px 0 4px" }}>
              <button onClick={() => setGoster(g => g + SAYFA)}
                style={{
                  padding: "8px 18px", borderRadius: "999px", border: `1px solid ${theme.border}`, background: "transparent",
                  color: theme.text, fontSize: f(13), cursor: "pointer", fontFamily: "inherit",
                }}>
                Daha fazla göster ({(sonuclar.length - goster).toLocaleString("tr-TR")})
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
