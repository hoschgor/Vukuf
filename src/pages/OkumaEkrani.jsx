import KuranOkuma from "./KuranOkuma"
import { useState, useEffect, useRef, useCallback, useMemo } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { useApp } from "../AppContext"
import { kitaplar } from "../data/kitaplar"
import lugatVerisi from "../data/lugat.json"
import kavramlarVerisi from "../data/kavramlar.json"
import {
  ArrowLeft, BookOpen, Eye, EyeOff, Play, Pause,
  Plus, Minus, AlignJustify, ChevronsUp, ChevronsDown,
  Bookmark, X, Type, StickyNote, Palette,
  Search, Highlighter, ChevronDown, Clock, Settings,
  ChevronUp, Edit2, Pencil, Circle,
} from "lucide-react"
import { useMediaQuery } from '../data/hooks/useMediaQuery'

// ════════════════════════════════════════════════════════════════
// SABİTLER
// ════════════════════════════════════════════════════════════════

const FONT_GRUPLARI = {
  turkce: {
    label: "Türkçe",
    fontlar: [
      { id: "georgia",      label: "Georgia",          style: "Georgia, serif" },
      { id: "lora",         label: "Lora",             style: "'Lora', serif",             google: "Lora:ital,wght@0,400;0,600;1,400" },
      { id: "source-serif", label: "Source Serif 4",   style: "'Source Serif 4', serif",   google: "Source+Serif+4:ital,wght@0,400;0,600;1,400" },
      { id: "playfair",     label: "Playfair Display", style: "'Playfair Display', serif",  google: "Playfair+Display:ital,wght@0,400;0,700;1,400" },
      { id: "merriweather", label: "Merriweather",     style: "'Merriweather', serif",      google: "Merriweather:ital,wght@0,300;0,400;1,300" },
    ],
  },
  osmanlica: {
    label: "Osmanlıca",
    fontlar: [
      { id: "crimson",   label: "Crimson Text",    style: "'Crimson Text', serif",    google: "Crimson+Text:ital,wght@0,400;0,600;1,400" },
      { id: "garamond",  label: "EB Garamond",     style: "'EB Garamond', serif",     google: "EB+Garamond:ital,wght@0,400;0,500;1,400" },
      { id: "cormorant", label: "Cormorant",       style: "'Cormorant', serif",       google: "Cormorant:ital,wght@0,300;0,400;1,300" },
      { id: "im-fell",   label: "IM Fell English", style: "'IM Fell English', serif", google: "IM+Fell+English:ital@0;1" },
    ],
  },
  arapca: {
    label: "Arapça",
    fontlar: [
      { id: "kfgqpc",            label: "KFGQPC Uthmanic (Önerilen)", style: "'KFGQPC Uthmanic', serif",    google: null },
      { id: "me-quran",          label: "Me Quran",                   style: "'me_quran', serif",            google: null },
      { id: "Indopak",           label: "Indopak",                    style: "'Indopak', serif",             google: null },
      { id: "IndopakNastaleeq",  label: "Indopak Nastaleeq",          style: "'IndopakNastaleeq', serif",    google: null },
    ],
  },
}

const TUM_FONTLAR = Object.values(FONT_GRUPLARI).flatMap(g => g.fontlar)

const PALET_ALANLARI = [
  { key: "background",   label: "Ana Arka Plan" },
  { key: "surface",      label: "Yüzey Rengi" },
  { key: "text",         label: "Yazı Rengi" },
  { key: "textSecondary",label: "İkincil Yazı" },
  { key: "accent",       label: "Vurgu Rengi" },
  { key: "lugatHighlight",label: "Lügat Rengi" },
  { key: "border",       label: "Kenarlık Rengi" },
]

const HAZIR_RENKLER = [
  "#f4ecd8", "#ffffff", "#1a1a2e", "#0d0d0d", "#2c3e50",
  "#8b5e3c", "#c0392b", "#27ae60", "#2980b9", "#8e44ad",
  "#d4b896", "#3b2f2f",
]

const VURGU_RENKLERI = [
  { id: "sari",    renk: "#fde68a", label: "Sarı" },
  { id: "yesil",   renk: "#bbf7d0", label: "Yeşil" },
  { id: "mavi",    renk: "#bfdbfe", label: "Mavi" },
  { id: "pembe",   renk: "#fbcfe8", label: "Pembe" },
  { id: "turuncu", renk: "#fed7aa", label: "Turuncu" },
]

// ════════════════════════════════════════════════════════════════
// YARDIMCI FONKSİYONLAR
// ════════════════════════════════════════════════════════════════

function kelimeAra(kelime) {
  const temiz = kelime.toLowerCase().replace(/[.,!?;:'"()\[\]]/g, "").trim()
  return lugatVerisi[temiz] || null
}
function kavramAra(kelime) {
  const temiz = kelime.toLowerCase().replace(/[.,!?;:'"()\[\]]/g, "").trim()
  return kavramlarVerisi[temiz] || null
}
function bugunAnahtar() {
  const d = new Date()
  return `vukuf_sure_${d.getFullYear()}_${d.getMonth()}_${d.getDate()}`
}

function okumaVerisiYukle(kitapId) {
  try {
    return {
      notlar:   JSON.parse(localStorage.getItem(`vukuf_notlar_${kitapId}`))   || {},
      vurgular: JSON.parse(localStorage.getItem(`vukuf_vurgular_${kitapId}`)) || {},
    }
  } catch { return { notlar: {}, vurgular: {} } }
}

function notlariKaydet(kitapId, notlar) {
  localStorage.setItem(`vukuf_notlar_${kitapId}`, JSON.stringify(notlar))
}

function vurguKaydet(kitapId, vurgular) {
  localStorage.setItem(`vukuf_vurgular_${kitapId}`, JSON.stringify(vurgular))
}

function sureyiYukle() {
  return parseInt(localStorage.getItem(bugunAnahtar()) || "0", 10)
}

function sureyiKaydet(saniye) {
  localStorage.setItem(bugunAnahtar(), String(saniye))
}

function dakikaFormatla(saniye) {
  const dakika = Math.floor(saniye / 60)
  return `${dakika} dk.`
}

function fontYukle(fontId) {
  const font = TUM_FONTLAR.find(f => f.id === fontId)
  if (!font?.google) return
  const linkId = `font-${fontId}`
  if (!document.getElementById(linkId)) {
    const link = document.createElement("link")
    link.id = linkId
    link.rel = "stylesheet"
    link.href = `https://fonts.googleapis.com/css2?family=${font.google}&display=swap`
    document.head.appendChild(link)
  }
}

function fontBul(fontId) {
  return TUM_FONTLAR.find(f => f.id === fontId) || TUM_FONTLAR[0]
}

// ════════════════════════════════════════════════════════════════
// METİN PARCASI
// ════════════════════════════════════════════════════════════════
const ARAP_RE = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/
const LATIN_RE = /[A-Za-zÇĞİıÖŞÜçğöşü]/

function MetinParcasi({
  metin, sayfaNo, lugatAktif, onKelimeTikla,
  theme, fontSize, hizalama, metinFont, arapcaFont,
  vurguModu, vurguRengi, sayfaVurgulari, onVurguEkle,
}) {
  const [secimBaslangic, setSecimBaslangic] = useState(null)
  const satirlar = metin.split("\n")

  function vurgulananMi(satirIdx, kelimeIdx) {
    if (!sayfaVurgulari?.length) return null
    for (const v of sayfaVurgulari) {
      const { baslangic: b, bitis: bi } = v
      let icinde = false
      if (b.satir === bi.satir) {
        icinde = satirIdx === b.satir && kelimeIdx >= b.kelime && kelimeIdx <= bi.kelime
      } else if (satirIdx === b.satir) { icinde = kelimeIdx >= b.kelime }
      else if (satirIdx === bi.satir) { icinde = kelimeIdx <= bi.kelime }
      else { icinde = satirIdx > b.satir && satirIdx < bi.satir }
      if (icinde) return v
    }
    return null
  }

  function kelimeMouseDown(satirIdx, kelimeIdx, e) {
    if (!vurguModu) return
    e.preventDefault()
    setSecimBaslangic({ satir: satirIdx, kelime: kelimeIdx })
  }
  function kelimeMouseUp(satirIdx, kelimeIdx) {
    if (!vurguModu || !secimBaslangic) return
    let b = secimBaslangic
    let bi = { satir: satirIdx, kelime: kelimeIdx }
    if (bi.satir < b.satir || (bi.satir === b.satir && bi.kelime < b.kelime)) { [b, bi] = [bi, b] }
    onVurguEkle(sayfaNo, b, bi, vurguRengi)
    setSecimBaslangic(null)
  }

  return (
    <div style={{ fontSize: `${fontSize}px`, fontFamily: metinFont }}>
      {satirlar.map((satir, si) => {
        if (!satir.trim()) return <br key={si} />
        const hasiye = satir.startsWith("§")
        const gosterilecek = hasiye ? satir.slice(1) : satir

        if (hasiye) {
          const arapHasiye = ARAP_RE.test(gosterilecek) && !LATIN_RE.test(gosterilecek)
          return (
            <div key={si} style={{
              borderTop: `1px solid ${theme.border}`, marginTop: "16px", paddingTop: "8px",
              fontSize: `${fontSize - 2}px`, color: theme.textSecondary, fontStyle: "italic", lineHeight: "1.7",
              ...(arapHasiye && arapcaFont ? { fontFamily: arapcaFont, direction: "rtl", textAlign: "right" } : {}),
            }}>
              {gosterilecek}
            </div>
          )
        }

        // Tamamen Arapça satır: sağdan sola + Arapça font, kelime bölme yok
        if (arapcaFont && ARAP_RE.test(satir) && !LATIN_RE.test(satir)) {
          return (
            <p key={si} style={{
              marginBottom: "12px", lineHeight: "2", direction: "rtl", textAlign: "center",
              fontFamily: arapcaFont, fontSize: `${fontSize + 6}px`,
            }}>
              {gosterilecek}
            </p>
          )
        }

        const kelimeler = gosterilecek.split(" ")
        return (
          <p key={si} style={{
            marginBottom: "10px", lineHeight: "1.9",
            textAlign: hizalama || "justify",
            wordSpacing: hizalama === "justify" ? "2px" : "normal",
            cursor: vurguModu ? "text" : "default",
          }}>
            {kelimeler.map((kelime, ki) => {
              if (!kelime.trim()) return " "
              const arapKelime = ARAP_RE.test(kelime)
              const anlam    = arapKelime ? null : kelimeAra(kelime)
              const kavram   = arapKelime ? null : kavramAra(kelime)
              const lugatliMi = (anlam || kavram) && lugatAktif
              const vurgulu  = vurgulananMi(si, ki)
              return (
                <span key={ki}>
                  <span
                    className={lugatliMi ? "lugat-kelime" : ""}
                    onMouseDown={e => kelimeMouseDown(si, ki, e)}
                    onMouseUp={() => kelimeMouseUp(si, ki)}
                    onClick={e => { if (!vurguModu && lugatliMi) onKelimeTikla(kelime, anlam, kavram, e) }}
                    onMouseEnter={e => { if (lugatliMi && !vurguModu) e.currentTarget.style.opacity = "0.75" }}
                    onMouseLeave={e => { e.currentTarget.style.opacity = "1" }}
                    style={{
                      background: vurgulu ? vurgulu.renk : "transparent",
                      borderRadius: vurgulu ? "2px" : "0",
                      color: lugatliMi ? theme.lugatHighlight : "inherit",
                      borderBottom: lugatliMi && !vurgulu ? `1px dotted ${theme.lugatHighlight}` : "none",
                      cursor: vurguModu ? "text" : (lugatliMi ? "pointer" : "default"),
                      padding: vurgulu ? "0 1px" : "0",
                      userSelect: "text",
                      ...(arapKelime && arapcaFont ? { fontFamily: arapcaFont, unicodeBidi: "isolate" } : {}),
                    }}
                  >
                    {kelime}
                  </span>
                  {" "}
                </span>
              )
            })}
          </p>
        )
      })}
    </div>
  )
}
// Sadece görünürken içerik render eden pencereleme sarmalayıcısı
function LazySayfa({ minHeight, children }) {
  const ref = useRef(null)
  const [gorunur, setGorunur] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const io = new IntersectionObserver(
      ([e]) => setGorunur(e.isIntersecting),
      { rootMargin: "1200px 0px" }
    )
    io.observe(el)
    return () => io.disconnect()
  }, [])
  return (
    <div ref={ref} style={{ minHeight: gorunur ? undefined : `${minHeight}px` }}>
      {gorunur ? children : null}
    </div>
  )
}
// ════════════════════════════════════════════════════════════════
// FONT SEÇİCİ
// ════════════════════════════════════════════════════════════════

function FontSecici({ grupId, grup, seciliFontId, onSecim, theme }) {
  const [acik, setAcik] = useState(false)
  const secili = grup.fontlar.find(f => f.id === seciliFontId) || null

  return (
    <div style={{ position: "relative", marginBottom: "10px" }}>
      <div style={{ fontSize: "11px", color: theme.textSecondary, marginBottom: "4px", letterSpacing: "1px" }}>
        {grup.label.toUpperCase()}
      </div>
      <button
        onClick={() => setAcik(!acik)}
        style={{
          width: "100%", display: "flex", alignItems: "center",
          justifyContent: "space-between", padding: "8px 12px", borderRadius: "8px",
          border: `1px solid ${secili ? theme.accent : theme.border}`,
          background: secili ? `${theme.accent}10` : theme.background,
          color: theme.text, cursor: "pointer", fontSize: "13px",
        }}
      >
        <span style={{ fontFamily: secili?.style }}>{secili ? secili.label : "—"}</span>
        <ChevronDown size={13} color={theme.textSecondary} />
      </button>

      {acik && (
        <>
          <div onClick={() => setAcik(false)} style={{ position: "fixed", inset: 0, zIndex: 195 }} />
          <div style={{
            position: "absolute", top: "100%", left: 0, right: 0, marginTop: "4px",
            background: theme.surface, border: `1px solid ${theme.border}`,
            borderRadius: "10px", zIndex: 200, overflow: "hidden",
            boxShadow: "0 4px 16px rgba(0,0,0,0.15)",
          }}>
            {secili && (
              <button
                onClick={() => { onSecim(grupId, null); setAcik(false) }}
                style={{
                  width: "100%", padding: "8px 12px", textAlign: "left", fontSize: "12px",
                  color: theme.textSecondary, background: "transparent", border: "none",
                  cursor: "pointer", borderBottom: `1px solid ${theme.border}`,
                }}
              >
                — Seçimi kaldır
              </button>
            )}
            {grup.fontlar.map(font => (
              <button
                key={font.id}
                onClick={() => { onSecim(grupId, font.id); setAcik(false) }}
                style={{
                  width: "100%", display: "flex", alignItems: "center",
                  justifyContent: "space-between", padding: "10px 12px",
                  background: seciliFontId === font.id ? `${theme.accent}15` : "transparent",
                  border: "none", cursor: "pointer",
                  borderBottom: `1px solid ${theme.border}`,
                }}
              >
                <span style={{ fontSize: "13px", color: theme.text }}>{font.label}</span>
                <span style={{ fontSize: "15px", fontFamily: font.style, color: theme.textSecondary, fontStyle: "italic" }}>
                  Elif بسم
                </span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}


// ════════════════════════════════════════════════════════════════
// ANA BİLEŞEN
// ════════════════════════════════════════════════════════════════

export default function OkumaEkrani() {
const { id } = useParams()
const navigate = useNavigate()
const {
  theme, currentTheme, setCurrentTheme,
  lugatActive, setLugatActive,
  isaretler, isaret_ekle, isaret_sil,
  customTheme, ozelTemaKaydet,
} = useApp()

// ── Kitap
const [kitapMetni, setKitapMetni] = useState([])
const [yukleniyor, setYukleniyor] = useState(true)
const kitap = kitaplar.find(k => k.id === id)
const kitapIsaretleri = isaretler[id] || []

// ── Okuma ayarları
const [yaziBoyutu, setYaziBoyutu] = useState(() => parseInt(localStorage.getItem("vukuf-yazi-boyutu") || "16"))
const [hizalama, setHizalama] = useState(() => localStorage.getItem("vukuf-hizalama") || "justify")
const [fontSecimler, setFontSecimler] = useState(() => {
  const kayitli = localStorage.getItem("vukuf-fontlar")
  return kayitli ? JSON.parse(kayitli) : { turkce: "georgia", osmanlica: null, arapca: null }
})
const aktifFontId = fontSecimler.turkce || fontSecimler.osmanlica || fontSecimler.arapca || "georgia"
const aktifFont   = fontBul(aktifFontId)
const metinFont  = fontBul(fontSecimler.turkce || fontSecimler.osmanlica || "georgia").style
const arapcaFont = fontSecimler.arapca ? fontBul(fontSecimler.arapca).style : null

// ── Scroll
const scrollRef    = useRef(null)
const sayfaRefs    = useRef({})
const sonScrollRef = useRef(0)
const [mevcutSayfa, setMevcutSayfa] = useState(1)

// ── Otomatik kaydırma
const otomatikRef = useRef(null)
const [otomatikKaydirma, setOtomatikKaydirma] = useState(false)
const [kaydirmaHizi, setKaydirmaHizi]         = useState(1)
const [duraklatildi, setDuraklatildi]         = useState(false)

// ── Bar
const barZamanRef = useRef(null)
const [barGorunur, setBarGorunur]           = useState(true)
const [barKonum, setBarKonum] = useState(() => localStorage.getItem("vukuf-bar-konum") || "alt")
const [sadeMode, setSadeMode]               = useState(() => localStorage.getItem("vukuf-sade-mode") !== "false")
const [otomatikGizleme, setOtomatikGizleme] = useState(() => localStorage.getItem("vukuf-otomatik-gizleme") !== "false")
const [gizlemeSuresi, setGizlemeSuresi] = useState(() => parseInt(localStorage.getItem("vukuf-gizleme-suresi") || "5"))
const [sureGoster, setSureGoster]           = useState(true)
const isMobile = useMediaQuery('(max-width: 768px)')

// ── Paneller
const [ayarlarAcik, setAyarlarAcik]     = useState(false)
const [sayfaGitAcik, setSayfaGitAcik]   = useState(false)
const [sayfaGitInput, setSayfaGitInput] = useState("")
const [aaAcik, setAaAcik]               = useState(false)
const [kayitAcik, setKayitAcik]         = useState(false)
const [kayitSekme, setKayitSekme]       = useState("isaretler")
const [temaAcik, setTemaAcik]           = useState(false)
const [aramaAcik, setAramaAcik]         = useState(false)

const herhangiPanelAcik = ayarlarAcik || sayfaGitAcik || aaAcik || kayitAcik || temaAcik || aramaAcik

// ── Lügat popup
const [popup, setPopup] = useState(null)
const [popupKavramAcik, setPopupKavramAcik] = useState(false)

// ── Notlar & Vurgular
const [notlar, setNotlar]     = useState(() => okumaVerisiYukle(id).notlar)
const [vurgular, setVurgular] = useState(() => okumaVerisiYukle(id).vurgular)
const [notMetni, setNotMetni] = useState("")

// ── Vurgulama modu
const [vurguModu, setVurguModu]   = useState(false)
const [vurguRengi, setVurguRengi] = useState(VURGU_RENKLERI[0].renk)

// ── Arama
const [aramaMetni, setAramaMetni]           = useState("")
const [aramaEslesmeler, setAramaEslesmeler] = useState([])
const [aramaIndeks, setAramaIndeks]         = useState(0)

// ── Okuma süresi
const [bugunSure, setBugunSure] = useState(sureyiYukle)
const sureSayacRef = useRef(null)

// ── Özel tema
const [ozelTemaPanelAcik, setOzelTemaPanelAcik] = useState(false)
const [ozelRenkler, setOzelRenkler] = useState(customTheme || {})
const [aktifRenk, setAktifRenk]     = useState(null)

const dokunusBaslangicRef = useRef(null)

// ════════════════════════════════════════════════════
// Bar zamanlayıcısı
// ════════════════════════════════════════════════════


const barGoster = useCallback(() => {
  setBarGorunur(true)
  if (barZamanRef.current) clearTimeout(barZamanRef.current)
  if (otomatikGizleme && !herhangiPanelAcik) {
    barZamanRef.current = setTimeout(() => setBarGorunur(false), gizlemeSuresi * 1000)
  }
}, [otomatikGizleme, herhangiPanelAcik, gizlemeSuresi])

const barGizle = useCallback(() => {
  if (barZamanRef.current) clearTimeout(barZamanRef.current)
  setBarGorunur(false)
}, [])

useEffect(() => {
  if (herhangiPanelAcik) {
    if (barZamanRef.current) clearTimeout(barZamanRef.current)
    setBarGorunur(true)
  } else if (otomatikGizleme) {
    if (barZamanRef.current) clearTimeout(barZamanRef.current)
    barZamanRef.current = setTimeout(() => setBarGorunur(false), gizlemeSuresi * 1000)
  }
  return () => { if (barZamanRef.current) clearTimeout(barZamanRef.current) }
}, [herhangiPanelAcik, otomatikGizleme, gizlemeSuresi])

useEffect(() => { barGoster() }, [])

// ════════════════════════════════════════════════════
// Okuma süresi sayacı
// ════════════════════════════════════════════════════

useEffect(() => {
  sureSayacRef.current = setInterval(() => {
    setBugunSure(prev => { const y = prev + 1; sureyiKaydet(y); return y })
  }, 1000)
  return () => clearInterval(sureSayacRef.current)
}, [])

// ════════════════════════════════════════════════════
// JSON yükle
// ════════════════════════════════════════════════════

useEffect(() => {
  if (!kitap) return
  fetch(`/${kitap.dosya}`)
    .then(r => r.json())
    .then(data => { setKitapMetni(data); setYukleniyor(false) })
    .catch(() => setYukleniyor(false))
}, [kitap])

// ════════════════════════════════════════════════════
// Scroll takibi
// ════════════════════════════════════════════════════

useEffect(() => {
  const el = scrollRef.current
  if (!el) return
  function onScroll() {
    sonScrollRef.current = el.scrollTop
    const items = Object.entries(sayfaRefs.current)
    for (let i = items.length - 1; i >= 0; i--) {
      const [no, ref] = items[i]
      if (ref && ref.getBoundingClientRect().top <= 120) { setMevcutSayfa(Number(no)); break }
    }
  }
  el.addEventListener("scroll", onScroll)
  return () => el.removeEventListener("scroll", onScroll)
}, [])

// ════════════════════════════════════════════════════
// Otomatik kaydırma
// ════════════════════════════════════════════════════

useEffect(() => {
  if (!otomatikKaydirma || duraklatildi) {
    if (otomatikRef.current) { clearInterval(otomatikRef.current); otomatikRef.current = null }
    return
  }
  const ms = Math.max(20, 220 - kaydirmaHizi * 20)
  otomatikRef.current = setInterval(() => {
    if (scrollRef.current) scrollRef.current.scrollTop += 1
  }, ms)
  return () => { if (otomatikRef.current) { clearInterval(otomatikRef.current); otomatikRef.current = null } }
}, [otomatikKaydirma, kaydirmaHizi, duraklatildi])

// ════════════════════════════════════════════════════
// Font yükle
// ════════════════════════════════════════════════════

useEffect(() => {
  Object.values(fontSecimler).forEach(fid => { if (fid) fontYukle(fid) })
}, [fontSecimler])

// ════════════════════════════════════════════════════
// Metin içi arama
// ════════════════════════════════════════════════════

useEffect(() => {
  if (!aramaMetni.trim() || !kitapMetni.length) { setAramaEslesmeler([]); return }
  const aranan = aramaMetni.toLowerCase()
  const eslesmeler = []
  kitapMetni.forEach(sayfa => {
    sayfa.metin.split("\n").forEach((satir, si) => {
      satir.split(" ").forEach((kelime, ki) => {
        if (kelime.toLowerCase().includes(aranan))
          eslesmeler.push({ sayfaNo: sayfa.sayfa, satirIdx: si, kelimeIdx: ki })
      })
    })
  })
  setAramaEslesmeler(eslesmeler)
  setAramaIndeks(0)
}, [aramaMetni, kitapMetni])

useEffect(() => {
  if (!aramaEslesmeler.length) return
  const eslesme = aramaEslesmeler[aramaIndeks]
  if (eslesme) sayfayaGit(eslesme.sayfaNo)
}, [aramaIndeks, aramaEslesmeler])

useEffect(() => { localStorage.setItem("vukuf-yazi-boyutu", yaziBoyutu) }, [yaziBoyutu])
useEffect(() => { localStorage.setItem("vukuf-hizalama", hizalama) }, [hizalama])
useEffect(() => { localStorage.setItem("vukuf-fontlar", JSON.stringify(fontSecimler)) }, [fontSecimler])
useEffect(() => { localStorage.setItem("vukuf-bar-konum", barKonum) }, [barKonum])
useEffect(() => { localStorage.setItem("vukuf-otomatik-gizleme", otomatikGizleme) }, [otomatikGizleme])
useEffect(() => { localStorage.setItem("vukuf-gizleme-suresi", gizlemeSuresi) }, [gizlemeSuresi])
useEffect(() => { localStorage.setItem("vukuf-sade-mode", sadeMode) }, [sadeMode])


// ════════════════════════════════════════════════════
// Dokunma
// ════════════════════════════════════════════════════

function dokunusBasladi(e) {
  setDuraklatildi(true)
  dokunusBaslangicRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY, zaman: Date.now() }
}

function dokunusBitti(e) {
  setDuraklatildi(false)
  if (!dokunusBaslangicRef.current) return
  const dx = Math.abs(e.changedTouches[0].clientX - dokunusBaslangicRef.current.x)
  const dy = Math.abs(e.changedTouches[0].clientY - dokunusBaslangicRef.current.y)
  const sure = Date.now() - dokunusBaslangicRef.current.zaman
  if (dx < 10 && dy < 10 && sure < 300) barGoster()
  dokunusBaslangicRef.current = null
}

// ════════════════════════════════════════════════════
// İçerik tıklama — bar toggle
// ════════════════════════════════════════════════════

function icerikTiklandi(e) {
  if (e.target.closest(".lugat-kelime")) return
  if (e.target.closest(".okuma-bar"))   return
  if (e.target.closest(".okuma-panel")) return
  if (barGorunur) {
    setBarGorunur(false)
    if (barZamanRef.current) clearTimeout(barZamanRef.current)
  } else {
    barGoster()
  }
}

// ════════════════════════════════════════════════════
// Panel yönetimi
// ════════════════════════════════════════════════════

function tumPanelleriKapat() {
  setAyarlarAcik(false); setSayfaGitAcik(false); setAaAcik(false)
  setKayitAcik(false); setTemaAcik(false); setAramaAcik(false)
}

function togglePanel(setter, deger) {
  tumPanelleriKapat()
  setter(deger)
}

// ════════════════════════════════════════════════════
// Yardımcı işlemler
// ════════════════════════════════════════════════════

function sayfayaGit(sayfaNo) {
  const ref = sayfaRefs.current[sayfaNo]
  if (ref && scrollRef.current) {
    scrollRef.current.scrollTo({ top: ref.offsetTop - 80, behavior: "smooth" })
  }
  setSayfaGitAcik(false)
  setSayfaGitInput("")
}

function isaretToggle(sayfaNo) {
  if (kitapIsaretleri.includes(sayfaNo)) isaret_sil(id, sayfaNo)
  else isaret_ekle(id, sayfaNo)
}

function notKaydet() {
  if (!notMetni.trim()) return
  const yeni = { ...notlar, [mevcutSayfa]: [...(notlar[mevcutSayfa] || []), { id: Date.now(), metin: notMetni.trim() }] }
  setNotlar(yeni); notlariKaydet(id, yeni); setNotMetni("")
}

function notSil(sayfaNo, notId) {
  const yeni = { ...notlar, [sayfaNo]: (notlar[sayfaNo] || []).filter(n => n.id !== notId) }
  if (!yeni[sayfaNo]?.length) delete yeni[sayfaNo]
  setNotlar(yeni); notlariKaydet(id, yeni)
}

function vurguEkle(sayfaNo, baslangic, bitis, renk) {
  const yeni = { ...vurgular, [sayfaNo]: [...(vurgular[sayfaNo] || []), { id: Date.now(), baslangic, bitis, renk }] }
  setVurgular(yeni); vurguKaydet(id, yeni)
}

function vurguSil(sayfaNo, vurguId) {
  const yeni = { ...vurgular, [sayfaNo]: (vurgular[sayfaNo] || []).filter(v => v.id !== vurguId) }
  if (!yeni[sayfaNo]?.length) delete yeni[sayfaNo]
  setVurgular(yeni); vurguKaydet(id, yeni)
}

function fontSecimDegistir(grupId, fontId) {
  setFontSecimler(prev => ({ ...prev, [grupId]: fontId }))
}

function kelimeTikla(kelime, anlam, kavram, e) {
  const x = Math.min(e.clientX, window.innerWidth - 300)
  const y = e.clientY + 12 + 200 > window.innerHeight ? e.clientY - 180 : e.clientY + 12
  setPopupKavramAcik(false)
  setPopup({ kelime, anlam, kavram, x, y })
}

// Toplam sayılar
const toplamNot   = Object.values(notlar).reduce((a, arr) => a + arr.length, 0)
const toplamVurgu = Object.values(vurgular).reduce((a, arr) => a + arr.length, 0)
const toplamKayit = kitapIsaretleri.length + toplamNot + toplamVurgu

// ════════════════════════════════════════════════════
// Erken dönüş
// ════════════════════════════════════════════════════

if (!kitap)     return <div style={{ padding: "40px", color: theme.text }}>Kitap bulunamadı.</div>
if (kitap.id === "kuran") return <KuranOkuma kitap={kitap} />
if (yukleniyor) return <div style={{ padding: "40px", color: theme.text }}>Yükleniyor...</div>

// ════════════════════════════════════════════════════
// Ortak stiller
// ════════════════════════════════════════════════════

const barButonStil = (aktif = false) => ({
  color: aktif ? theme.accent : theme.textSecondary,
  display: "flex", alignItems: "center", gap: "4px",
  fontSize: "13px", padding: "6px 8px",  // 16px 12px yerine 6px 8px yapın
  borderRadius: "6px",
  background: aktif ? `${theme.accent}15` : "transparent",
  border: "none", cursor: "pointer",
})

const panelStil = (konum = "center") => ({
  position: "fixed",
  [barKonum === "alt" ? "bottom" : "top"]: "56px",
  ...(konum === "center"
    ? { left: "50%", transform: "translateX(-50%)" }
    : { [konum]: "16px" }),
  background: theme.surface,
  border: `1px solid ${theme.border}`,
  borderRadius: "16px",
  padding: "16px",
  zIndex: 100,
  boxShadow: "0 4px 20px rgba(0,0,0,0.15)",
})

// ════════════════════════════════════════════════════════════════
// AA PANELİ
// ════════════════════════════════════════════════════════════════

const AaPanel = aaAcik && (
  <>
    <div onClick={() => setAaAcik(false)} style={{ position: "fixed", inset: 0, zIndex: 95 }} />
    <div className="okuma-panel" style={{ ...panelStil("center"), width: "300px", maxHeight: "80vh", overflowY: "auto" }}>

      <div style={{ marginBottom: "14px" }}>
        <div style={{ fontSize: "11px", color: theme.textSecondary, marginBottom: "8px", letterSpacing: "1px" }}>YAZI BOYUTU</div>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <button onClick={() => setYaziBoyutu(Math.max(12, yaziBoyutu - 1))} style={barButonStil()}><Minus size={14} /></button>
          <div style={{ flex: 1, textAlign: "center" }}>
            <span style={{ fontSize: `${Math.min(yaziBoyutu, 22)}px`, color: theme.text, fontFamily: aktifFont.style }}>Aa</span>
            <span style={{ fontSize: "11px", color: theme.textSecondary, marginLeft: "6px" }}>{yaziBoyutu}px</span>
          </div>
          <button onClick={() => setYaziBoyutu(Math.min(28, yaziBoyutu + 1))} style={barButonStil()}><Plus size={14} /></button>
        </div>
      </div>

      <div style={{ marginBottom: "14px" }}>
        <div style={{ fontSize: "11px", color: theme.textSecondary, marginBottom: "8px", letterSpacing: "1px" }}>METİN HİZALAMA</div>
        <div style={{ display: "flex", gap: "6px" }}>
          {[{ value: "left", label: "Sola" }, { value: "justify", label: "İki Tarafa" }, { value: "center", label: "Orta" }].map(h => (
            <button key={h.value} onClick={() => setHizalama(h.value)} style={{
              flex: 1, padding: "6px 8px", borderRadius: "8px", fontSize: "12px",
              background: hizalama === h.value ? theme.accent : `${theme.accent}15`,
              color: hizalama === h.value ? "#fff" : theme.text,
              border: "none", cursor: "pointer",
            }}>
              {h.label}
            </button>
          ))}
        </div>
      </div>

      <div style={{ fontSize: "11px", color: theme.textSecondary, marginBottom: "8px", letterSpacing: "1px" }}>YAZI TİPİ</div>
      {Object.entries(FONT_GRUPLARI).map(([grupId, grup]) => (
        <FontSecici
          key={grupId}
          grupId={grupId}
          grup={grup}
          seciliFontId={fontSecimler[grupId]}
          onSecim={fontSecimDegistir}
          theme={theme}
        />
      ))}
    </div>
  </>
)

// ════════════════════════════════════════════════════════════════
// KAYIT PANELİ — İşaretler | Notlar | Vurgular
// ════════════════════════════════════════════════════════════════

const KayitPanel = kayitAcik && (
  <>
    <div onClick={() => setKayitAcik(false)} style={{ position: "fixed", inset: 0, zIndex: 95 }} />
    <div className="okuma-panel" style={{ ...panelStil("center"), width: "320px", maxHeight: "480px", display: "flex", flexDirection: "column" }}>

      {/* Sekmeler */}
      <div style={{ display: "flex", gap: "4px", marginBottom: "12px" }}>
        {[
          { id: "isaretler", label: `İşaretler${kitapIsaretleri.length ? ` (${kitapIsaretleri.length})` : ""}` },
          { id: "notlar",    label: `Notlar${toplamNot ? ` (${toplamNot})` : ""}` },
          { id: "vurgular",  label: `Vurgular${toplamVurgu ? ` (${toplamVurgu})` : ""}` },
        ].map(s => (
          <button key={s.id} onClick={() => setKayitSekme(s.id)} style={{
            flex: 1, padding: "6px 4px", borderRadius: "8px", fontSize: "11px",
            background: kayitSekme === s.id ? theme.accent : `${theme.accent}15`,
            color: kayitSekme === s.id ? "#fff" : theme.text,
            border: "none", cursor: "pointer",
          }}>
            {s.label}
          </button>
        ))}
      </div>

      <div style={{ overflowY: "auto", flex: 1 }}>

        {/* ── İşaretler ── */}
        {kayitSekme === "isaretler" && (
          kitapIsaretleri.length === 0
            ? <div style={{ color: theme.textSecondary, fontSize: "13px", textAlign: "center", padding: "24px 0", opacity: 0.6 }}>Henüz işaret eklenmedi</div>
            : kitapIsaretleri.sort((a, b) => a - b).map(s => (
              <div key={s} style={{ display: "flex", alignItems: "center", gap: "8px", padding: "8px 10px", borderRadius: "8px", background: `${theme.accent}0A`, border: `1px solid ${theme.border}`, marginBottom: "6px" }}>
                <Bookmark size={13} fill={theme.accent} color={theme.accent} />
                <span style={{ flex: 1, fontSize: "13px", color: theme.text }}>Sayfa {s}</span>
                <button onClick={() => sayfayaGit(s)} style={{ fontSize: "11px", color: theme.accent, background: "none", border: "none", cursor: "pointer" }}>git →</button>
                <button onClick={() => isaret_sil(id, s)} style={{ color: theme.textSecondary, background: "none", border: "none", cursor: "pointer" }}><X size={12} /></button>
              </div>
            ))
        )}

        {/* ── Notlar ── */}
        {kayitSekme === "notlar" && (
          <>
            <div style={{ display: "flex", gap: "8px", marginBottom: "12px" }}>
              <textarea
                value={notMetni}
                onChange={e => setNotMetni(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); notKaydet() } }}
                placeholder={`Sayfa ${mevcutSayfa} için not... (Enter)`}
                rows={2}
                style={{
                  flex: 1, padding: "8px 12px", borderRadius: "8px",
                  border: `1px solid ${theme.border}`, background: theme.background,
                  color: theme.text, fontSize: "13px", resize: "none",
                  outline: "none", fontFamily: "inherit", lineHeight: "1.5",
                }}
              />
              <button onClick={notKaydet} style={{ padding: "8px 12px", borderRadius: "8px", background: theme.accent, color: "#fff", border: "none", cursor: "pointer", alignSelf: "flex-end", fontSize: "12px" }}>
                Ekle
              </button>
            </div>
            {toplamNot === 0
              ? <div style={{ color: theme.textSecondary, fontSize: "13px", textAlign: "center", padding: "16px 0", opacity: 0.6 }}>Henüz not eklenmedi</div>
              : Object.entries(notlar).sort(([a], [b]) => Number(a) - Number(b)).map(([sayfaNo, sayfaNotlari]) => (
                <div key={sayfaNo} style={{ marginBottom: "12px" }}>
                  <div style={{ fontSize: "10px", color: theme.textSecondary, letterSpacing: "1px", marginBottom: "4px", display: "flex", alignItems: "center", gap: "6px" }}>
                    <div style={{ flex: 1, height: "1px", background: theme.border }} />
                    SAYFA {sayfaNo}
                    <button onClick={() => sayfayaGit(Number(sayfaNo))} style={{ color: theme.accent, background: "none", border: "none", cursor: "pointer", fontSize: "10px" }}>git →</button>
                    <div style={{ flex: 1, height: "1px", background: theme.border }} />
                  </div>
                  {sayfaNotlari.map(not => (
                    <div key={not.id} style={{ display: "flex", gap: "8px", padding: "7px 10px", borderRadius: "8px", background: `${theme.accent}08`, border: `1px solid ${theme.border}`, marginBottom: "4px" }}>
                      <div style={{ flex: 1, fontSize: "12px", color: theme.text, lineHeight: "1.5" }}>{not.metin}</div>
                      <button onClick={() => notSil(Number(sayfaNo), not.id)} style={{ color: theme.textSecondary, background: "none", border: "none", cursor: "pointer", padding: "0", flexShrink: 0 }}><X size={12} /></button>
                    </div>
                  ))}
                </div>
              ))
            }
          </>
        )}

        {/* ── Vurgular ── */}
        {kayitSekme === "vurgular" && (
          toplamVurgu === 0
            ? <div style={{ color: theme.textSecondary, fontSize: "13px", textAlign: "center", padding: "24px 0", opacity: 0.6 }}>Henüz vurgu eklenmedi</div>
            : Object.entries(vurgular).sort(([a], [b]) => Number(a) - Number(b)).map(([sayfaNo, sayfaVurgulari]) => (
              <div key={sayfaNo} style={{ marginBottom: "12px" }}>
                <div style={{ fontSize: "10px", color: theme.textSecondary, letterSpacing: "1px", marginBottom: "4px", display: "flex", alignItems: "center", gap: "6px" }}>
                  <div style={{ flex: 1, height: "1px", background: theme.border }} />
                  SAYFA {sayfaNo}
                  <button onClick={() => sayfayaGit(Number(sayfaNo))} style={{ color: theme.accent, background: "none", border: "none", cursor: "pointer", fontSize: "10px" }}>git →</button>
                  <div style={{ flex: 1, height: "1px", background: theme.border }} />
                </div>
                {sayfaVurgulari.map(v => (
                  <div key={v.id} style={{ display: "flex", alignItems: "center", gap: "8px", padding: "6px 10px", borderRadius: "8px", background: `${theme.accent}08`, border: `1px solid ${theme.border}`, marginBottom: "4px" }}>
                    <div style={{ width: "12px", height: "12px", borderRadius: "2px", background: v.renk, flexShrink: 0 }} />
                    <span style={{ flex: 1, fontSize: "12px", color: theme.textSecondary }}>
                      {v.baslangic.satir}:{v.baslangic.kelime} – {v.bitis.satir}:{v.bitis.kelime}
                    </span>
                    <button onClick={() => sayfayaGit(Number(sayfaNo))} style={{ fontSize: "11px", color: theme.accent, background: "none", border: "none", cursor: "pointer" }}>git →</button>
                    <button onClick={() => vurguSil(Number(sayfaNo), v.id)} style={{ color: theme.textSecondary, background: "none", border: "none", cursor: "pointer" }}><X size={12} /></button>
                  </div>
                ))}
              </div>
            ))
        )}
      </div>
    </div>
  </>
)

// ════════════════════════════════════════════════════════════════
// ════════════════════════════════════════════════════════════════
// ════════════════════════════════════════════════════════════════
// ════════════════════════════════════════════════════════════════
// TEMA PANELİ
// ════════════════════════════════════════════════════════════════

const TemaPanel = temaAcik && (
  <>
    <div onClick={() => setTemaAcik(false)} style={{ position: "fixed", inset: 0, zIndex: 95 }} />
    <div className="okuma-panel" style={{ ...panelStil("right"), width: "240px" }}>
      <div style={{ fontSize: "11px", color: theme.textSecondary, marginBottom: "10px", letterSpacing: "1px" }}>TEMA</div>
      {[
        { id: "sepia",  label: "Sepya",  renk: "#f4ecd8", aciklama: "Göz yormayan sıcak ton" },
          { id: "light",  label: "Açık",   renk: "#ffffff", aciklama: "Sade beyaz arka plan" },
          { id: "dark",   label: "Koyu",   renk: "#1a1a2e", aciklama: "Koyu mavi gece modu" },
          { id: "night",  label: "Gece",   renk: "#0d0d0d", aciklama: "Tam karanlık mod" },
          { id: "coffee", label: "Kahve",  renk: "#251b04", aciklama: "Koyu kahve tonları" },
          { id: "highcontrast", label: "Yüksek Karşıtlık",  renk: "#eeb311", aciklama: "Koyu zemin üzerinde sarı vurgular" },
          { id: "custom", label: "Özel",   renk: customTheme?.background || "#888", aciklama: "Kişisel renk ayarları" },
      ].map(t => (
        <button 
          key={t.id} 
          onClick={() => {
            if (t.id === "custom") {
              setTemaAcik(false);
              setOzelTemaPanelAcik(true);  // Yeni paneli aç
            } else {
              setCurrentTheme(t.id);
              setTemaAcik(false);
            }
          }} 
          style={{
            width: "100%", display: "flex", alignItems: "center", gap: "10px",
            padding: "8px 10px", borderRadius: "8px", fontSize: "13px",
            color: currentTheme === t.id ? theme.accent : theme.text,
            background: currentTheme === t.id ? `${theme.accent}15` : "transparent",
            border: "none", cursor: "pointer", marginBottom: "2px",
          }}
        >
          <div style={{ 
            width: "16px", 
            height: "16px", 
            borderRadius: "50%", 
            background: t.renk, 
            border: `2px solid ${currentTheme === t.id ? theme.accent : theme.border}`,
            flexShrink: 0 
          }} />
          <div style={{ flex: 1, textAlign: "left" }}>
            <div style={{ fontSize: "13px" }}>{t.label}</div>
            <div style={{ fontSize: "10px", color: theme.textSecondary }}>{t.aciklama}</div>
          </div>
          {currentTheme === t.id && t.id !== "custom" && (
            <span style={{ fontSize: "10px", color: theme.accent }}>✓</span>
          )}
          {t.id === "custom" && (
            <Pencil size={12} color={theme.textSecondary} />
          )}
        </button>
      ))}
    </div>
  </>
)

// ════════════════════════════════════════════════════════════════
// ════════════════════════════════════════════════════════════════
// AYARLAR PANELİ
// ════════════════════════════════════════════════════════════════

const AyarlarPanel = ayarlarAcik && (
  <>
    <div onClick={() => setAyarlarAcik(false)} style={{ position: "fixed", inset: 0, zIndex: 95 }} />
    <div className="okuma-panel" style={{ ...panelStil("right"), width: "280px", maxHeight: "80vh", overflowY: "auto", display: "flex", flexDirection: "column", gap: "16px" }}>

      {/* Bar konumu */}
      <div>
        <div style={{ fontSize: "11px", color: theme.textSecondary, marginBottom: "8px", letterSpacing: "1px" }}>BAR KONUMU</div>
        <div style={{ display: "flex", gap: "6px" }}>
          {["ust", "alt"].map(k => (
            <button key={k} onClick={() => setBarKonum(k)} style={{
              flex: 1, padding: "8px", borderRadius: "8px", fontSize: "12px",
              background: barKonum === k ? theme.accent : `${theme.accent}15`,
              color: barKonum === k ? "#fff" : theme.text,
              display: "flex", alignItems: "center", justifyContent: "center", gap: "4px",
              border: "none", cursor: "pointer",
            }}>
              {k === "ust" ? <ChevronsUp size={13} /> : <ChevronsDown size={13} />}
              {k === "ust" ? "Üst" : "Alt"}
            </button>
          ))}
        </div>
      </div>

      {/* Otomatik gizleme */}
      <div>
        <div style={{ fontSize: "11px", color: theme.textSecondary, marginBottom: "8px", letterSpacing: "1px" }}>OTOMATİK GİZLEME</div>
        <button onClick={() => setOtomatikGizleme(!otomatikGizleme)} style={{
          width: "100%", padding: "8px 12px", borderRadius: "8px", fontSize: "13px",
          background: otomatikGizleme ? `${theme.accent}15` : theme.background,
          color: otomatikGizleme ? theme.accent : theme.textSecondary,
          border: `1px solid ${otomatikGizleme ? theme.accent : theme.border}`,
          cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "space-between",
        }}>
          <span>Otomatik gizleme</span>
          <span style={{ fontSize: "12px", fontWeight: "bold" }}>{otomatikGizleme ? "Açık" : "Kapalı"}</span>
        </button>
        {otomatikGizleme && (
          <div style={{ marginTop: "8px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", color: theme.textSecondary, marginBottom: "4px" }}>
              <span>Gizlenme süresi</span><span>{gizlemeSuresi} sn.</span>
            </div>
            <input type="range" min="2" max="15" value={gizlemeSuresi}
              onChange={e => setGizlemeSuresi(Number(e.target.value))}
              style={{ width: "100%", accentColor: theme.accent }}
            />
          </div>
        )}
      </div>

      {/* Okuma süresi gösterimi */}
      <div>
        <div style={{ fontSize: "11px", color: theme.textSecondary, marginBottom: "8px", letterSpacing: "1px" }}>OKUMA SÜRESİ</div>
        <button onClick={() => setSureGoster(!sureGoster)} style={{
          width: "100%", padding: "8px 12px", borderRadius: "8px", fontSize: "13px",
          background: sureGoster ? `${theme.accent}15` : theme.background,
          color: sureGoster ? theme.accent : theme.textSecondary,
          border: `1px solid ${sureGoster ? theme.accent : theme.border}`,
          cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "space-between",
        }}>
          <span>Süre gösterimi</span>
          <span style={{ fontSize: "12px", fontWeight: "bold" }}>{sureGoster ? "Açık" : "Kapalı"}</span>
        </button>
      </div>

      {/* Otomatik kaydırma hızı */}
      {otomatikKaydirma && (
        <div>
          <div style={{ fontSize: "11px", color: theme.textSecondary, marginBottom: "8px", letterSpacing: "1px" }}>KAYDIRMA HIZI</div>
          <input type="range" min="1" max="20" value={kaydirmaHizi}
            onChange={e => setKaydirmaHizi(Number(e.target.value))}
            style={{ width: "100%", accentColor: theme.accent }}
          />
        </div>
      )}
    </div>
    </>
)

// ════════════════════════════════════════════════════════════════
// ÖZEL TEMA PANELİ
// ════════════════════════════════════════════════════════════════

const OzelTemaPanel = ozelTemaPanelAcik && (
  <>
    <div
      onClick={() => setOzelTemaPanelAcik(false)}
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 300 }}
    />
    <div style={{
      position: "fixed",
      top: "50%",
      left: "50%",
      transform: "translate(-50%, -50%)",
      background: theme.surface,
      border: `1px solid ${theme.border}`,
      borderRadius: "24px",
      padding: "24px",
      zIndex: 400,
      width: "320px",
      maxHeight: "90vh",
      overflowY: "auto",
      boxShadow: "0 8px 32px rgba(0,0,0,0.2)",
    }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "20px" }}>
        <h2 style={{ fontSize: "16px", color: theme.text, fontFamily: "PlayfairDisplay, serif" }}>
          Özel Tema
        </h2>
        <button onClick={() => setOzelTemaPanelAcik(false)} style={{ color: theme.textSecondary }}>
          <X size={18} />
        </button>
      </div>

      {/* Renk paleti */}
      <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
        {PALET_ALANLARI.map(palet => (
          <div key={palet.key}>
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <button
                onClick={() => setAktifRenk(aktifRenk === palet.key ? null : palet.key)}
                style={{
                  width: "32px",
                  height: "32px",
                  borderRadius: "24px",
                  background: ozelRenkler[palet.key] || theme[palet.key] || "#888",
                  border: `2px solid ${aktifRenk === palet.key ? theme.accent : theme.border}`,
                  cursor: "pointer",
                  flexShrink: 0,
                  boxShadow: aktifRenk === palet.key ? `0 0 0 2px ${theme.accent}40` : "none",
                }}
              />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: "13px", color: theme.text }}>{palet.label}</div>
                <div style={{ fontSize: "11px", color: theme.textSecondary }}>
                  {ozelRenkler[palet.key] || theme[palet.key]}
                </div>
              </div>
            </div>

            {aktifRenk === palet.key && (
              <div style={{ marginTop: "8px", marginLeft: "48px" }}>
                <input
                  type="color"
                  value={ozelRenkler[palet.key] || theme[palet.key] || "#000000"}
                  onChange={(e) => setOzelRenkler(prev => ({ ...prev, [palet.key]: e.target.value }))}
                  style={{
                    width: "100%",
                    height: "40px",
                    borderRadius: "24px",
                    border: `1px solid ${theme.border}`,
                    cursor: "pointer",
                    padding: "2px",
                    background: theme.background,
                  }}
                />
                <div style={{ display: "flex", gap: "6px", marginTop: "8px", flexWrap: "wrap" }}>
                  {HAZIR_RENKLER.map(renk => (
                    <button
                      key={renk}
                      onClick={() => setOzelRenkler(prev => ({ ...prev, [palet.key]: renk }))}
                      style={{
                        width: "24px",
                        height: "24px",
                        borderRadius: "24px",
                        background: renk,
                        border: `2px solid ${(ozelRenkler[palet.key] || theme[palet.key]) === renk ? theme.accent : theme.border}`,
                        cursor: "pointer",
                      }}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Önizleme */}
      <div style={{
        marginTop: "16px",
        padding: "12px",
        borderRadius: "10px",
        background: ozelRenkler.background || theme.background,
        border: `1px solid ${ozelRenkler.border || theme.border}`,
      }}>
        <div style={{ fontSize: "11px", color: theme.textSecondary, marginBottom: "6px", letterSpacing: "1px" }}>
          ÖNİZLEME
        </div>
        <div style={{ fontSize: "13px", color: ozelRenkler.text || theme.text, marginBottom: "4px" }}>
          Örnek metin rengi
        </div>
        <div style={{ fontSize: "12px", color: ozelRenkler.textSecondary || theme.textSecondary, marginBottom: "6px" }}>
          İkincil metin rengi
        </div>
        <span style={{
          fontSize: "12px",
          color: ozelRenkler.lugatHighlight || theme.lugatHighlight,
          borderBottom: `1px dotted ${ozelRenkler.lugatHighlight || theme.lugatHighlight}`,
        }}>
          lügat kelimesi
        </span>
        {" "}
        <span style={{
          fontSize: "12px",
          padding: "2px 8px",
          borderRadius: "4px",
          background: `${ozelRenkler.accent || theme.accent}20`,
          color: ozelRenkler.accent || theme.accent,
        }}>
          vurgu
        </span>
      </div>

      <button
        onClick={() => { 
          ozelTemaKaydet(ozelRenkler); 
          setAktifRenk(null); 
          setOzelTemaPanelAcik(false);
          setCurrentTheme("custom");
        }}
        style={{
          width: "100%",
          marginTop: "16px",
          padding: "12px",
          borderRadius: "10px",
          background: theme.accent,
          color: "#fff",
          fontSize: "14px",
          cursor: "pointer",
          border: "none",
          fontFamily: "PlayfairDisplay, serif",
        }}
      >
        Temayı Kaydet
      </button>
    </div>
  </>
)
// ════════════════════════════════════════════════════════════════
// ARAMA PANELİ
// ════════════════════════════════════════════════════════════════

const AramaPanel = aramaAcik && (
  <>
    <div onClick={() => setAramaAcik(false)} style={{ position: "fixed", inset: 0, zIndex: 95 }} />
    <div className="okuma-panel" style={{ ...panelStil("center"), width: "300px" }}>
      <div style={{ display: "flex", gap: "8px", alignItems: "center", marginBottom: "10px" }}>
        <Search size={14} color={theme.textSecondary} />
        <input
          value={aramaMetni}
          onChange={e => setAramaMetni(e.target.value)}
          placeholder="Metinde ara..."
          autoFocus
          style={{
            flex: 1, padding: "6px 10px", borderRadius: "8px",
            border: `1px solid ${theme.border}`, background: theme.background,
            color: theme.text, fontSize: "14px", outline: "none",
          }}
        />
        {aramaMetni && (
          <button onClick={() => { setAramaMetni(""); setAramaEslesmeler([]) }} style={{ color: theme.textSecondary, background: "none", border: "none", cursor: "pointer" }}>
            <X size={14} />
          </button>
        )}
      </div>
      {aramaEslesmeler.length > 0 ? (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ fontSize: "12px", color: theme.textSecondary }}>{aramaIndeks + 1} / {aramaEslesmeler.length} eşleşme</span>
          <div style={{ display: "flex", gap: "6px" }}>
            <button onClick={() => setAramaIndeks(i => Math.max(0, i - 1))} style={barButonStil()} disabled={aramaIndeks === 0}><ChevronUp size={14} /></button>
            <button onClick={() => setAramaIndeks(i => Math.min(aramaEslesmeler.length - 1, i + 1))} style={barButonStil()} disabled={aramaIndeks === aramaEslesmeler.length - 1}><ChevronDown size={14} /></button>
          </div>
        </div>
      ) : aramaMetni ? (
        <div style={{ fontSize: "12px", color: theme.textSecondary, textAlign: "center", padding: "8px 0" }}>Eşleşme bulunamadı</div>
      ) : null}
    </div>
  </>
)

// ════════════════════════════════════════════════════════════════
// SAYFAYA GİT PANELİ
// ════════════════════════════════════════════════════════════════

const SayfaGitPopup = sayfaGitAcik && (
  <>
    <div onClick={() => setSayfaGitAcik(false)} style={{ position: "fixed", inset: 0, zIndex: 95 }} />
    <div className="okuma-panel" style={{ ...panelStil("center"), width: "280px" }}>
      <div style={{ fontSize: "12px", color: theme.textSecondary, marginBottom: "10px" }}>SAYFAYA GİT (1 – {kitapMetni.length})</div>
      <div style={{ display: "flex", gap: "8px", marginBottom: "12px" }}>
        <input
          type="number" min={1} max={kitapMetni.length}
          value={sayfaGitInput} onChange={e => setSayfaGitInput(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter") sayfayaGit(Math.min(Math.max(1, Number(sayfaGitInput)), kitapMetni.length)) }}
          placeholder="Sayfa no..." autoFocus
          style={{ flex: 1, padding: "8px 12px", borderRadius: "8px", border: `1px solid ${theme.border}`, background: theme.background, color: theme.text, fontSize: "14px", outline: "none" }}
        />
        <button onClick={() => sayfayaGit(Math.min(Math.max(1, Number(sayfaGitInput)), kitapMetni.length))} style={{ padding: "8px 14px", borderRadius: "8px", background: theme.accent, color: "#fff", fontSize: "13px", border: "none", cursor: "pointer" }}>
          Git
        </button>
      </div>
      <input type="range" min={1} max={kitapMetni.length} value={mevcutSayfa}
        onChange={e => setMevcutSayfa(Number(e.target.value))}
        onMouseUp={e => sayfayaGit(Number(e.target.value))}
        onTouchEnd={e => sayfayaGit(Number(e.target.value))}
        style={{ width: "100%", accentColor: theme.accent }}
      />
      <div style={{ textAlign: "center", fontSize: "16px", fontWeight: "bold", color: theme.accent, marginTop: "6px" }}>{mevcutSayfa}</div>
    </div>
  </>
)

// ════════════════════════════════════════════════════════════════
// BAR
// ════════════════════════════════════════════════════════════════

const Bar = (
  <div className="okuma-bar" style={{
    position: "fixed", left: 0, right: 0,
    [barKonum === "alt" ? "bottom" : "top"]: 0,
    background: theme.surface,
    borderTop:    barKonum === "alt" ? `1px solid ${theme.border}` : "none",
    borderBottom: barKonum === "ust" ? `1px solid ${theme.border}` : "none",
    padding: isMobile ? "10px 55px" : "3px 10px",
    display: "flex", alignItems: "center", gap: "4px",
    zIndex: 90, flexWrap: "wrap",
    transition: "opacity 0.3s ease",
    opacity: barGorunur ? 1 : 0,
    pointerEvents: barGorunur ? "auto" : "none",
  }}>

    <button onClick={() => navigate("/")} style={barButonStil()}>
      <ArrowLeft size={16} /> Geri
    </button>

    <button onClick={() => togglePanel(setSayfaGitAcik, !sayfaGitAcik)} style={{ ...barButonStil(sayfaGitAcik), background: `${theme.accent}15`, color: theme.text }}>
      <BookOpen size={13} color={theme.accent} />
      {mevcutSayfa} / {kitapMetni.length}
    </button>

    {!sadeMode && (
      <>
        <button onClick={() => setLugatActive(!lugatActive)} style={barButonStil(lugatActive)}>
          {lugatActive ? <Eye size={15} /> : <Circle size={15} />} Lügat
        </button>

        <button onClick={() => togglePanel(setAaAcik, !aaAcik)} style={barButonStil(aaAcik)}>
          <Type size={15} /> Aa
        </button>

        {/* Vurgulama modu */}
        <button onClick={() => setVurguModu(!vurguModu)} style={barButonStil(vurguModu)} title="Vurgulama modu">
          <Highlighter size={15} />
          {vurguModu && (
            <div style={{ display: "flex", gap: "3px", marginLeft: "4px" }} onClick={e => e.stopPropagation()}>
              {VURGU_RENKLERI.map(vr => (
                <button key={vr.id} onClick={() => setVurguRengi(vr.renk)} title={vr.label} style={{
                  width: "14px", height: "14px", borderRadius: "50%", background: vr.renk,
                  border: `2px solid ${vurguRengi === vr.renk ? theme.accent : "transparent"}`,
                  cursor: "pointer", padding: 0,
                }} />
              ))}
            </div>
          )}
        </button>

        {/* Kayıtlar */}
        <button onClick={() => togglePanel(setKayitAcik, !kayitAcik)} style={barButonStil(kayitAcik)} title="Kayıtlar">
          <Bookmark size={15} />
          {toplamKayit > 0 && (
            <span style={{ fontSize: "10px", background: theme.accent, color: "#fff", borderRadius: "10px", padding: "1px 5px", marginLeft: "2px" }}>
              {toplamKayit}
            </span>
          )}
        </button>

        <button onClick={() => togglePanel(setAramaAcik, !aramaAcik)} style={barButonStil(aramaAcik)} title="Metinde ara">
          <Search size={15} />
        </button>

        <button onClick={() => setOtomatikKaydirma(!otomatikKaydirma)} style={barButonStil(otomatikKaydirma)}>
          {otomatikKaydirma ? <Pause size={15} /> : <Play size={15} />}
        </button>

        {otomatikKaydirma && (
          <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
            <button onClick={() => setKaydirmaHizi(Math.max(1, kaydirmaHizi - 1))} style={{ ...barButonStil(), padding: "2px" }}><Minus size={13} /></button>
            <span style={{ fontSize: "12px", color: theme.textSecondary }}>{kaydirmaHizi}</span>
            <button onClick={() => setKaydirmaHizi(Math.min(20, kaydirmaHizi + 1))} style={{ ...barButonStil(), padding: "2px" }}><Plus size={13} /></button>
          </div>
        )}
      </>
    )}

    <div style={{ 
      display: "flex", 
      gap: "8px", 
      alignItems: "center",
      ...(isMobile 
        ? { 
            justifyContent: "center", 
            flex: 1,  // Mobilde genişliği kapla ve ortala
          }  
        : { 
            marginLeft: "auto"  // Masaüstünde sağa yasla
          }
      )
    }}>
      {sureGoster && !sadeMode && (
        <span style={{ fontSize: "11px", color: theme.textSecondary, padding: "4px 6px", display: "flex", alignItems: "center", gap: "3px" }}>
          <Clock size={11} /> Bugün {dakikaFormatla(bugunSure)}
        </span>
      )}

        <button onClick={() => setSadeMode(!sadeMode)} style={{ ...barButonStil(sadeMode), padding: "4px" }} title="Sade mod">
        <Circle size={15} />
      </button>

        <button onClick={() => togglePanel(setTemaAcik, !temaAcik)} style={{ ...barButonStil(temaAcik), padding: "4px" }} title="Tema">
        <Palette size={15} />
      </button>

        <button onClick={() => togglePanel(setAyarlarAcik, !ayarlarAcik)} style={{ ...barButonStil(ayarlarAcik), padding: "4px" }} title="Ayarlar">
        <Settings size={15} />
      </button>
    </div>
  </div>
)

// ════════════════════════════════════════════════════════════════
// RENDER
// ════════════════════════════════════════════════════════════════

return (
  <div style={{ height: "100vh", display: "flex", flexDirection: "column", background: theme.background }}>

    {barKonum === "ust" && Bar}

    {SayfaGitPopup}
    {AaPanel}
    {KayitPanel}
    {TemaPanel}
    {OzelTemaPanel}
    {AyarlarPanel}
    {AramaPanel}

    {/* Lügat popup */}
    {popup && (
      <>
        <div onClick={() => setPopup(null)} style={{ position: "fixed", inset: 0, zIndex: 299 }} />
        <div style={{
          position: "fixed", left: popup.x, top: popup.y,
          background: theme.surface, border: `1px solid ${theme.border}`,
          borderRadius: "12px", padding: "14px 18px", zIndex: 300,
          maxWidth: "300px", maxHeight: "55vh", overflowY: "auto",
          boxShadow: "0 8px 24px rgba(0,0,0,0.15)",
        }}>
          <div style={{ color: theme.accent, fontWeight: "bold", fontSize: "16px", marginBottom: "6px" }}>{popup.kelime}</div>
          {popup.anlam && (
            <div style={{ color: theme.textSecondary, fontSize: "14px", lineHeight: "1.5" }}>{popup.anlam}</div>
          )}
          {popup.kavram && (
            <div style={{ marginTop: popup.anlam ? "10px" : "0", borderTop: popup.anlam ? `1px solid ${theme.border}` : "none", paddingTop: popup.anlam ? "10px" : "0" }}>
              <button onClick={() => setPopupKavramAcik(v => !v)} style={{
                display: "flex", alignItems: "center", gap: "6px",
                background: `${theme.accent}18`, color: theme.accent,
                border: `1px solid ${theme.accent}40`, borderRadius: "20px",
                padding: "4px 12px", fontSize: "11px", fontWeight: 500, cursor: "pointer",
              }}>
                <BookOpen size={11} /> Kavram {popupKavramAcik ? "▾" : "▸"}
              </button>
              {popupKavramAcik && popup.kavram.map((kv, i) => (
                <div key={i} style={{ marginTop: "10px" }}>
                  <div style={{ fontSize: "13px", fontWeight: 600, color: theme.text, marginBottom: "4px" }}>{kv.terim}</div>
                  <div style={{ fontSize: "12.5px", color: theme.text, lineHeight: "1.7", whiteSpace: "pre-wrap" }}>{kv.aciklama}</div>
                  {kv.kaynaklar?.length > 0 && (
                    <div style={{ marginTop: "8px", fontSize: "11px", color: theme.textSecondary, lineHeight: "1.6" }}>
                      {kv.kaynaklar.map((k, j) => <div key={j}>{k}</div>)}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </>
    )}

    {/* Ana içerik */}
    <div
      ref={scrollRef}
      onClick={icerikTiklandi}
      onMouseDown={() => { if (!vurguModu) setDuraklatildi(true) }}
      onMouseUp={() => { if (!vurguModu) setDuraklatildi(false) }}
      onTouchStart={dokunusBasladi}
      onTouchEnd={dokunusBitti}
      style={{
        flex: 1, overflowY: "auto", userSelect: "none",
        padding: `${barKonum === "ust" ? "80px" : "24px"} 0 ${barKonum === "alt" ? "80px" : "24px"}`,
      }}
    >
      <div style={{ maxWidth: "680px", margin: "0 auto", padding: "0 24px" }}>

        {/* Vurgulama modu bandı */}
        {vurguModu && (
          <div style={{
            position: "sticky", top: 0, zIndex: 50,
            background: `${vurguRengi}dd`, padding: "6px 12px", borderRadius: "8px",
            marginBottom: "12px", fontSize: "12px", color: "#333",
            display: "flex", alignItems: "center", gap: "8px",
          }}>
            <Highlighter size={13} />
            Vurgulama modu açık — metinden seçim yap
            <button onClick={() => setVurguModu(false)} style={{ marginLeft: "auto", background: "none", border: "none", cursor: "pointer", color: "#333" }}>
              <X size={13} />
            </button>
          </div>
        )}

        {/* Kitap başlığı */}
        <div style={{ textAlign: "center", marginBottom: "48px", paddingTop: "24px" }}>
          <h1 style={{ fontSize: "48px", color: theme.accent, marginBottom: "8px", fontFamily: "PlayfairDisplay, serif" }}>
            {kitap.baslik}
          </h1>
          <p style={{ color: theme.textSecondary, fontSize: "14px" }}>{kitap.yazar}</p>
        </div>

        {/* Sayfalar */}
          {kitapMetni.map((sayfa, index) => (
            <div key={sayfa.sayfa} ref={el => { if (el) sayfaRefs.current[sayfa.sayfa] = el }} style={{ position: "relative" }}>
              {kitapIsaretleri.includes(sayfa.sayfa) && (
                <div style={{
                  position: "absolute", top: "6px", right: "-8px",
                  width: "8px", height: "8px", borderRadius: "50%",
                  background: "#ef4444", boxShadow: "0 0 4px rgba(239,68,68,0.6)",
                }} />
              )}
              <LazySayfa minHeight={Math.max(300, Math.round(sayfa.metin.length * 0.5))}>
                <MetinParcasi
                  metin={sayfa.metin}
                  sayfaNo={sayfa.sayfa}
                  lugatAktif={lugatActive}
                  onKelimeTikla={kelimeTikla}
                  theme={theme}
                  fontSize={yaziBoyutu}
                  hizalama={hizalama}
                  metinFont={metinFont}
                  arapcaFont={arapcaFont}
                  vurguModu={vurguModu}
                  vurguRengi={vurguRengi}
                  sayfaVurgulari={vurgular[sayfa.sayfa] || []}
                  onVurguEkle={vurguEkle}
                />
              </LazySayfa>
              {notlar[sayfa.sayfa]?.length > 0 && (
                <div
                  onClick={() => { setMevcutSayfa(sayfa.sayfa); togglePanel(setKayitAcik, true); setKayitSekme("notlar") }}
                  style={{ display: "inline-flex", alignItems: "center", gap: "4px", fontSize: "11px", color: theme.accent, cursor: "pointer", marginBottom: "4px", opacity: 0.8 }}
                >
                  <StickyNote size={11} /> {notlar[sayfa.sayfa].length} not
                </div>
              )}
              {index < kitapMetni.length - 1 && (
                <div style={{ display: "flex", alignItems: "center", gap: "12px", margin: "32px 0" }}>
                  <div style={{ flex: 1, height: "1px", background: theme.border }} />
                  <span style={{ fontSize: "11px", color: theme.textSecondary, opacity: 0.6 }}>{sayfa.sayfa}</span>
                  <div style={{ flex: 1, height: "1px", background: theme.border }} />
                </div>
              )}
            </div>
        ))}
      </div>
    </div>
    {barKonum === "alt" && Bar}
  </div>
)
}