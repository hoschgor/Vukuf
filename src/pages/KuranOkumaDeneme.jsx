import { useState, useEffect, useLayoutEffect, useRef, useMemo, useCallback } from "react"
import { useApp } from "../AppContext"
import { useMediaQuery } from "../data/hooks/useMediaQuery"
import { useMushaf, sureBaslangicSayfasi, ayetSayfasi } from "../data/hooks/useMushaf"
import MushafSayfa from "../components/MushafSayfa"
import sayfaHaritaJson from "../data/sayfa-harita.json"
import ayetMeal from "../data/ayet-meal.json"

// ════════════════════════════════════════════════════════════════
// DENEME: react-virtual YOK. Tüm sayfalar NORMAL AKIŞTA render edilir,
// içerik SayfaBlok (IntersectionObserver + minHeight yer tutucu) ile TEMBEL yüklenir.
// Sayfalar akışta olduğu için tarayıcının doğal "scroll anchoring"i konumu sabit tutar
// → SIÇRAMA / GÖZ KIRPMA YOK. Her sayfa DOM'da (yer tutucu) olduğundan ayete/sayfaya/sûreye
// gidiş ANINDA (scrollIntoView), yükleme gecikmesi/gizleme gerekmez.
// ════════════════════════════════════════════════════════════════

// Sayfa yer-tutucu yüksekliği (kaba tahmin yeter; akış modeli toleranslıdır) — boyuta göre ölçekli
function tahminYuk(elemanlar, isMobile, yb) {
  const kelime = (elemanlar || []).filter(e => e.tip === "kelime").length
  const baslik = (elemanlar || []).filter(e => e.tip === "sure-baslik" || e.tip === "besmele" || e.tip === "sure-sonu").length
  const satir = Math.max(1, Math.ceil(kelime / (isMobile ? 12 : 16)))
  const satirYuk = (isMobile ? yb : yb + 2) * (isMobile ? 2.2 : 2.0)
  return Math.round(satir * satirYuk + baslik * (yb * 3.5) + 120)
}

// Bir sayfa: görünüme YAKLAŞINCA (marginIn) gerçek içeriği render eder ve BİR DAHA KALDIRMAZ
// (io.disconnect) → sayfa sınırlarında yeniden-render/göz kırpma OLMAZ. (Bellek gerekirse
// ileride "çok uzak" için nazik pencereleme eklenir; şimdilik göz kırpmasızlık önceliği.)
function SayfaBlok({ minHeight, marginIn, gorunur0 = false, cocuk }) {
  const ref = useRef(null)
  const [gorunur, setGorunur] = useState(gorunur0)
  useEffect(() => {
    if (gorunur) return
    const el = ref.current
    if (!el) return
    const io = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setGorunur(true); io.disconnect() } },
      { rootMargin: marginIn }
    )
    io.observe(el)
    return () => io.disconnect()
  }, [gorunur, marginIn])
  return (
    <div ref={ref} style={{ minHeight: gorunur ? undefined : `${minHeight}px` }}>
      {gorunur ? cocuk : null}
    </div>
  )
}

const STUB_PLAYER = { durum: "kapali", aktifAyet: null }
const NOOP = () => {}

export default function KuranOkumaDeneme() {
  const { theme } = useApp()
  const isMobile = useMediaQuery("(max-width: 768px)")

  const [mushafData, setMushafData] = useState([])
  const [yukleniyor, setYukleniyor] = useState(true)
  useEffect(() => {
    fetch("/kuran-mushaf.json").then(r => r.json())
      .then(d => { setMushafData(d); setYukleniyor(false) })
      .catch(() => setYukleniyor(false))
  }, [])

  const { sayfaMap, sureler, toplamSayfa, sureSayfaLookup, ayetSayfaLookup } = useMushaf(mushafData, sayfaHaritaJson)

  const sayfaListesi = useMemo(() => {
    if (!sayfaMap || sayfaMap.size === 0) return []
    return Array.from(sayfaMap.keys()).sort((a, b) => a - b)
      .map(no => ({ sayfaNo: no, elemanlar: sayfaMap.get(no) || [] }))
  }, [sayfaMap])

  const scrollRef = useRef(null)
  const sayfaRefs = useRef({})            // sayfaNo → DOM div
  const [mevcutSayfa, setMevcutSayfa] = useState(1)

  const arapcaFont = "'KFGQPC Uthmanic', serif"
  const [yaziBoyutu, setYaziBoyutu] = useState(20)   // 14–45

  // Girişler
  const [sayfaGir, setSayfaGir] = useState("")
  const [sureGir, setSureGir] = useState("")
  const [ayetGir, setAyetGir] = useState("")
  const [odak, setOdak] = useState(null)   // {sureNo, ayetNo} kısa vurgu
  const [meal, setMeal] = useState(null)    // tıklanan âyet meali (efektli popup)

  // Üstteki sayfayı takip et (scroll)
  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    let raf = 0
    const guncelle = () => {
      raf = 0
      const scRect = el.getBoundingClientRect()
      let enYakin = null, enKucuk = Infinity
      for (const [no, node] of Object.entries(sayfaRefs.current)) {
        if (!node) continue
        const r = node.getBoundingClientRect()
        const fark = Math.abs(r.top - scRect.top)
        if (r.bottom > scRect.top + 4 && fark < enKucuk) { enKucuk = fark; enYakin = +no }
      }
      if (enYakin != null) setMevcutSayfa(enYakin)
    }
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(guncelle) }
    el.addEventListener("scroll", onScroll, { passive: true })
    return () => el.removeEventListener("scroll", onScroll)
  }, [sayfaListesi.length])

  // ── ANINDA GİDİŞ (tek satır) ──
  const sayfayaGit = useCallback((no, opt = {}) => {
    const node = sayfaRefs.current[no]
    const el = scrollRef.current
    if (!node || !el) return
    const scRect = el.getBoundingClientRect()
    const nRect = node.getBoundingClientRect()
    el.scrollTop += (nRect.top - scRect.top) - (opt.ofset || 12)
  }, [])

  const ayeteGit = useCallback((sureNo, ayetNo) => {
    const sayfa = ayetNo ? ayetSayfasi(sureNo, ayetNo, ayetSayfaLookup) : sureBaslangicSayfasi(sureNo, sureSayfaLookup)
    if (!sayfa) return
    // 1) Sayfaya git (div zaten DOM'da) → içerik görünüme girince render olur
    sayfayaGit(sayfa)
    // 2) İçerik oturunca âyet elemanına tam hizala (birkaç deneme)
    let t = 0
    const hizala = () => {
      const el = scrollRef.current
      const hedef = el && el.querySelector(`[data-sure="${sureNo}"][data-ayet="${ayetNo || 1}"]`)
      if (hedef) {
        const scRect = el.getBoundingClientRect()
        const hRect = hedef.getBoundingClientRect()
        el.scrollTop += (hRect.top - scRect.top) - 12
        if (ayetNo) { setOdak({ sureNo, ayetNo }); setTimeout(() => setOdak(null), 2200) }
        return
      }
      if (++t < 8) setTimeout(hizala, 60)
    }
    setTimeout(hizala, 40)
  }, [ayetSayfaLookup, sureSayfaLookup, sayfayaGit])

  if (yukleniyor) return (
    <div style={{ height: "100vh", display: "flex", alignItems: "center", justifyContent: "center", color: theme.textSecondary }}>Yükleniyor…</div>
  )

  const kolonW = Math.round((isMobile ? 480 : 720) * (yaziBoyutu / 20))

  return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column", background: theme.background }}>
      {/* DENEME ÜST BAR */}
      <div style={{ flexShrink: 0, display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap",
        padding: "8px 12px", borderBottom: `1px solid ${theme.border}`, background: theme.surface }}>
        <span style={{ fontSize: "12px", fontWeight: 700, color: theme.accent }}>DENEME · Sayfa {mevcutSayfa}/{toplamSayfa}</span>
        <input value={sayfaGir} onChange={e => setSayfaGir(e.target.value)} placeholder="Sayfa"
          onKeyDown={e => { if (e.key === "Enter") { const n = parseInt(sayfaGir); if (n >= 1 && n <= toplamSayfa) sayfayaGit(n) } }}
          style={{ width: "64px", padding: "6px 8px", borderRadius: "8px", border: `1px solid ${theme.border}`, background: theme.background, color: theme.text, fontSize: "13px" }} />
        <button onClick={() => { const n = parseInt(sayfaGir); if (n >= 1 && n <= toplamSayfa) sayfayaGit(n) }}
          style={{ padding: "6px 10px", borderRadius: "8px", border: "none", background: theme.accent, color: "#fff", fontSize: "12px", cursor: "pointer" }}>Sayfaya git</button>

        <input value={sureGir} onChange={e => setSureGir(e.target.value)} placeholder="Sûre"
          style={{ width: "56px", padding: "6px 8px", borderRadius: "8px", border: `1px solid ${theme.border}`, background: theme.background, color: theme.text, fontSize: "13px" }} />
        <input value={ayetGir} onChange={e => setAyetGir(e.target.value)} placeholder="Âyet"
          onKeyDown={e => { if (e.key === "Enter") ayeteGit(parseInt(sureGir), parseInt(ayetGir) || null) }}
          style={{ width: "56px", padding: "6px 8px", borderRadius: "8px", border: `1px solid ${theme.border}`, background: theme.background, color: theme.text, fontSize: "13px" }} />
        <button onClick={() => ayeteGit(parseInt(sureGir), parseInt(ayetGir) || null)}
          style={{ padding: "6px 10px", borderRadius: "8px", border: "none", background: theme.accent, color: "#fff", fontSize: "12px", cursor: "pointer" }}>Âyete git</button>

        {/* Font boyutu (14–45) */}
        <div style={{ display: "flex", alignItems: "center", gap: "4px", marginLeft: "auto" }}>
          <button onClick={() => setYaziBoyutu(v => Math.max(14, v - 1))}
            style={{ width: "30px", height: "30px", borderRadius: "8px", border: `1px solid ${theme.border}`, background: theme.background, color: theme.text, fontSize: "18px", cursor: "pointer", lineHeight: 1 }}>−</button>
          <span style={{ minWidth: "30px", textAlign: "center", fontSize: "13px", fontWeight: 700, color: theme.accent }}>{yaziBoyutu}</span>
          <button onClick={() => setYaziBoyutu(v => Math.min(45, v + 1))}
            style={{ width: "30px", height: "30px", borderRadius: "8px", border: `1px solid ${theme.border}`, background: theme.background, color: theme.text, fontSize: "18px", cursor: "pointer", lineHeight: 1 }}>+</button>
        </div>
      </div>

      {/* AKIŞ İÇERİK — react-virtual YOK */}
      <div ref={scrollRef} style={{ flex: 1, overflowY: "auto", overflowX: "hidden" }}>
        <div style={{ maxWidth: `${kolonW}px`, width: "100%", margin: "0 auto", padding: isMobile ? "8px 12px" : "10px 24px", boxSizing: "border-box" }}>
          {sayfaListesi.map((sayfa, i) => (
            <div key={sayfa.sayfaNo} ref={el => { if (el) sayfaRefs.current[sayfa.sayfaNo] = el }} style={{ position: "relative" }}>
              <SayfaBlok
                minHeight={tahminYuk(sayfa.elemanlar, isMobile, yaziBoyutu)}
                marginIn={isMobile ? "3000px 0px" : "2200px 0px"}
                gorunur0={i < 3}
                cocuk={
                  <MushafSayfa
                    sayfaNo={sayfa.sayfaNo}
                    elemanlar={sayfa.elemanlar}
                    sureler={mushafData}
                    theme={theme}
                    arapcaFont={arapcaFont}
                    yaziBoyutu={yaziBoyutu}
                    satirAraligi={isMobile ? 2.2 : 2.0}
                    harfAraligi={0}
                    player={STUB_PLAYER}
                    aktifAyet={null}
                    odakAyet={odak}
                    odakSure={null}
                    odakAyrac={null}
                    sayfaKayitlari={[]}
                    kayitKonumModu={false}
                    onKelimeTikla={NOOP}
                    onAyetTikla={(sure, ayetNo) => {
                      const m = ayetMeal[sure.id]?.[ayetNo]
                      setMeal({ sure: sure.isim, ayetNo, metin: m || "(meal bulunamadı)" })
                    }}
                    onSureTikla={NOOP}
                    onKayitTikla={NOOP}
                    onYukseklikOlcum={NOOP}
                  />
                }
              />
            </div>
          ))}
        </div>
      </div>

      {/* MEAL POPUP (efektli) */}
      {meal && (
        <>
          <div onClick={() => setMeal(null)} style={{ position: "fixed", inset: 0, zIndex: 200 }} />
          <div style={{ position: "fixed", left: "50%", bottom: "24px", transform: "translateX(-50%)", zIndex: 201,
            width: "min(92vw, 420px)", background: theme.surface, border: `1px solid ${theme.border}`, borderRadius: "14px",
            boxShadow: "0 12px 40px rgba(0,0,0,0.3)", padding: "14px 16px", animation: "denemeMealAc 0.22s ease-out" }}>
            <div style={{ fontSize: "12px", fontWeight: 700, color: theme.accent, marginBottom: "6px" }}>{meal.sure} · {meal.ayetNo}. Âyet</div>
            <div style={{ fontSize: "14px", color: theme.text, lineHeight: 1.6 }}>{meal.metin}</div>
          </div>
        </>
      )}

      <style>{`
        @keyframes denemeMealAc { from { opacity: 0; transform: translateX(-50%) translateY(10px) } to { opacity: 1; transform: translateX(-50%) translateY(0) } }
        @keyframes odakYanip { 0% { background: ${theme.accent}44 } 100% { background: transparent } }
      `}</style>
    </div>
  )
}
