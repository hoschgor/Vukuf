import KuranOkuma from "./KuranOkuma"
import { useState, useEffect, useLayoutEffect, useRef, useCallback, useMemo } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { useApp } from "../AppContext"
import { kitaplar, kategoriler } from "../data/kitaplar"
import { okumaKaydet, trFold } from "../data/okumaKayit"
import lugatVerisi from "../data/lugat.json"
import risaleLugat from "../data/risale-lugat.json"
import kavramlarVerisi from "../data/kavramlar.json"
import KitapAyraci from "../components/KitapAyraci"
import YuklemeEkrani from "../components/YuklemeEkrani"
import IosSwitch from "../components/IosSwitch"
import {
  ArrowLeft, BookOpen, Eye, EyeOff, Play, Pause,
  Plus, Minus, AlignJustify, ChevronsUp, ChevronsDown,
  Bookmark, X, Type, StickyNote, Palette,
  Search, Highlighter, ChevronDown, Clock, Settings,
  ChevronUp, ChevronRight, Edit2, Pencil, Circle, Feather, List, Check, Shuffle, Asterisk, ArrowRight,
  GripVertical, Eye as EyeIkon, UnfoldHorizontal, Camera, FoldHorizontal,
} from "lucide-react"
import { useMediaQuery } from '../data/hooks/useMediaQuery'
import BarSiraPaneli, { barSatirOlc } from '../components/BarSiraPaneli'
import GorselOlustur from '../components/GorselOlustur'

// ════════════════════════════════════════════════════════════════
// SABİTLER
// ════════════════════════════════════════════════════════════════

const FONT_GRUPLARI = {
  turkce: {
    label: "Türkçe",
    fontlar: [
      { id: "bookerly",     label: "Bookerly (Önerilen)",         style: "'Bookerly', 'Bookerly Display', serif" },
      { id: "souvenir",     label: "Souvenir",         style: "'Souvenir', 'Souvenir Medium', serif" },
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
      // Yedek zincirine 'me_quran' eklendi: kfgqpc/Indopak'ta OLMAYAN işaretler (waqf/durak,
      // küçük üst işaretler vb.) sistem serifine düşüp yanlış glyph + harf-bağ kopması yapıyordu.
      // MeQuran bu işaretleri kapsadığından yedek olarak ondan alınır (gövde harfleri kfgqpc kalır).
      { id: "kfgqpc",            label: "KFGQPC Uthmanic (Önerilen)", style: "'KFGQPC Uthmanic', 'me_quran', serif", google: null },
      { id: "me-quran",          label: "Me Quran",                   style: "'me_quran', serif",            google: null },
      { id: "Indopak",           label: "Indopak",                    style: "'Indopak', 'me_quran', serif", google: null },
      { id: "IndopakNastaleeq",  label: "Indopak Nastaleeq",          style: "'IndopakNastaleeq', 'me_quran', serif", google: null },
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

// Bar'da gösterilip gizlenebilen öğeler (Geri ve Ayarlar hariç)
const BAR_OGELERI = [
  { key: "menu",  label: "İçindekiler",       sadeVarsayilan: false },
  { key: "sayfa", label: "Sayfa Bilgisi",     sadeVarsayilan: false },
  { key: "lugat", label: "Lügat",             sadeVarsayilan: true },
  { key: "yazi",  label: "Yazı Tipi (Aa)",    sadeVarsayilan: true },
  { key: "vurgu", label: "Vurgulama",         sadeVarsayilan: true },
  { key: "kayit", label: "Kayıtlar",          sadeVarsayilan: true },
  { key: "arama", label: "Arama",             sadeVarsayilan: true },
  { key: "oto",   label: "Otomatik Kaydırma", sadeVarsayilan: true },
  { key: "gorsel", label: "Görsel Oluştur",   sadeVarsayilan: true },
  { key: "sure",  label: "Okuma Süresi",      sadeVarsayilan: true },
  { key: "kisim", label: "Kısım Bilgisi",     sadeVarsayilan: true },
  { key: "sade",  label: "Sade Mod",          sadeVarsayilan: false },
  { key: "tema",  label: "Tema",              sadeVarsayilan: false },
]

// Alt bardaki SIRALANABİLİR öğeler: sıra + sol/sağ yaslama (BarSiraPaneli ile düzenlenir).
// `taraf` = varsayılan yaslama (mevcut görünümü birebir korur).
const BAR_SIRA_OGELERI = [
  { key: "geri",    label: "Geri",              Ikon: ArrowLeft,   taraf: "sol" },
  { key: "menu",    label: "İçindekiler",       Ikon: List,        taraf: "sol" },
  { key: "sayfa",   label: "Sayfa Bilgisi",     Ikon: BookOpen,    taraf: "sol" },
  { key: "lugat",   label: "Lügat",             Ikon: EyeIkon,     taraf: "sol" },
  { key: "yazi",    label: "Yazı Tipi (Aa)",    Ikon: Feather,     taraf: "sol" },
  { key: "vurgu",   label: "Vurgulama",         Ikon: Highlighter, taraf: "sol" },
  { key: "kayit",   label: "Kayıtlar",          Ikon: Bookmark,    taraf: "sol" },
  { key: "arama",   label: "Arama",             Ikon: Search,      taraf: "sol" },
  { key: "oto",     label: "Otomatik Kaydırma", Ikon: Play,        taraf: "sol" },
  { key: "gorsel",  label: "Görsel Oluştur",    Ikon: Camera,      taraf: "sol" },
  { key: "sade",    label: "Sade Mod",          Ikon: Circle,      taraf: "sag" },
  { key: "tema",    label: "Tema",              Ikon: Palette,     taraf: "sag" },
  { key: "ayarlar", label: "Ayarlar",           Ikon: Settings,    taraf: "sag" },
  { key: "kisim",   label: "Kısım Bilgisi",     Ikon: Asterisk,    taraf: "sag" },
  { key: "sure",    label: "Okuma Süresi",      Ikon: Clock,       taraf: "sag" },
]
const BAR_SIRA_VARSAYILAN = BAR_SIRA_OGELERI.map(o => o.key)
const BAR_TARAF_VARSAYILAN = Object.fromEntries(BAR_SIRA_OGELERI.map(o => [o.key, o.taraf]))

// İçindekiler düz listesini seviyelere göre ağaca çevir
function icindekilerAgaci(list) {
  const kok = []
  const stack = []
  ;(list || []).forEach((item, idx) => {
    const node = { ...item, idx, cocuklar: [] }
    const sv = item.seviye || 1
    while (stack.length && stack[stack.length - 1].seviye >= sv) stack.pop()
    if (stack.length) stack[stack.length - 1].node.cocuklar.push(node)
    else kok.push(node)
    stack.push({ node, seviye: sv })
  })
  return kok
}

function AyarToggle({ etiket, aktif, onToggle, theme, acikLabel = "Açık", kapaliLabel = "Kapalı" }) {
  // Varsayılan (Açık/Kapalı) → yalnız anahtar; özel etiket (ör. Gizli/Görünür) → anlam korunsun diye yazı da
  const ozelEtiket = acikLabel !== "Açık" || kapaliLabel !== "Kapalı"
  return (
    <div onClick={onToggle} role="button" aria-pressed={aktif} style={{
      width: "100%", padding: "7px 10px", borderRadius: "8px", fontSize: "13px",
      color: theme.text,
      cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "space-between",
      gap: "12px", marginBottom: "3px",
    }}>
      <span>{etiket}</span>
      <span style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        {ozelEtiket && (
          <span style={{ fontSize: "11px", fontWeight: 600, color: aktif ? theme.accent : theme.textSecondary }}>
            {aktif ? acikLabel : kapaliLabel}
          </span>
        )}
        <IosSwitch acik={aktif} theme={theme} boyut={0.8} />
      </span>
    </div>
  )
}

// ════════════════════════════════════════════════════════════════
// YARDIMCI FONKSİYONLAR
// ════════════════════════════════════════════════════════════════

// Sık geçen bağlaç/edat gibi kelimeler lügatta gösterilmesin (gereksiz/yanlış eşleşme)
const STOPKELIMELER = new Set([
  "ve", "veya", "ya", "ile", "ki", "de", "da", "mi", "mı", "mu", "mü",
  "o", "bu", "şu", "bir", "en", "çok", "daha", "her", "hem", "ne", "ise",
  "ki,", "de,", "da,",
])
function kelimeAra(kelime) {
  const temiz = kelime.toLowerCase().replace(/[.,!?;:'"()\[\]]/g, "").trim()
  if (!temiz || STOPKELIMELER.has(temiz)) return null
  return lugatVerisi[temiz] || risaleLugat[temiz] || null
}
function kavramAra(kelime) {
  const temiz = kelime.toLowerCase().replace(/[.,!?;:'"()\[\]]/g, "").trim()
  if (!temiz || STOPKELIMELER.has(temiz)) return null
  return kavramlarVerisi[temiz] || null
}
// İzafet birleşik ("sırr-ı vahdetle") — tam eşleşme yoksa SON kelimenin ekini kırparak dene
// ("sırr-ı vahdet"). Dönen: {kelime, anlam, kavram} ya da null.
function birlesikBul(bk) {
  const parcalar = bk.split(" ")
  const son = parcalar[parcalar.length - 1]
  const enFazla = Math.min(5, Math.max(0, son.length - 2))
  for (let kes = 0; kes <= enFazla; kes++) {
    const aday = kes === 0 ? bk : parcalar.slice(0, -1).concat(son.slice(0, son.length - kes)).join(" ")
    const a = kelimeAra(aday), k = kavramAra(aday)
    if (a || k) return { kelime: aday, anlam: a, kavram: k }
  }
  return null
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
  const saat = Math.floor(saniye / 3600)
  const dakika = Math.floor((saniye % 3600) / 60)
  if (saat === 0 && dakika === 0) return "1 dk'dan az"
  return `${saat > 0 ? saat + " sa " : ""}${dakika > 0 ? dakika + " dk" : ""}`.trim()
}

function fontYukle(fontId) {
  const font = TUM_FONTLAR.find(f => f.id === fontId)
  if (!font) return
  // Google fontuysa stylesheet linkini enjekte et
  if (font.google) {
    const linkId = `font-${fontId}`
    if (!document.getElementById(linkId)) {
      const link = document.createElement("link")
      link.id = linkId
      link.rel = "stylesheet"
      link.href = `https://fonts.googleapis.com/css2?family=${font.google}&display=swap`
      document.head.appendChild(link)
    }
  }
  // Yerel (@font-face) veya uzak fontu FİİLEN getir → yedek-font parlamasını önler,
  // "yüklü değilse yükle" isteğini karşılar (FontFace API tembel yüklemeyi tetikler).
  try {
    if (document.fonts && document.fonts.load) {
      const aile = (font.style.match(/'[^']+'|"[^"]+"|[^,]+/) || [font.style])[0].trim()
      document.fonts.load(`16px ${aile}`)
      document.fonts.load(`bold 16px ${aile}`)
    }
  } catch {}
}

function fontBul(fontId) {
  return TUM_FONTLAR.find(f => f.id === fontId) || TUM_FONTLAR[0]
}

// ════════════════════════════════════════════════════════════════
// OTOFIT — metni yatay taşmaya karşı kutusuna sığdırır.
//   Kelimeler normal kaydığı sürece dokunmaz; tek bir kelime bile kutu
//   genişliğini aşıyorsa (yatay kaydırmaya yol açacaksa) font px düşürülür.
// ════════════════════════════════════════════════════════════════
function OtoFit({ children, maxFont, minFont = 16, as: Tag = "div", style, ...rest }) {
  const ref = useRef(null)
  const [font, setFont] = useState(maxFont)
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const sigdir = () => {
      let cur = maxFont, guard = 0
      el.style.fontSize = cur + "px"
      while (cur > minFont && el.scrollWidth > el.clientWidth + 1 && guard++ < 300) {
        cur -= 2
        el.style.fontSize = cur + "px"
      }
      setFont(prev => (prev === cur ? prev : cur))
    }
    sigdir()
    const hedef = el.parentElement || el
    let ro
    try { ro = new ResizeObserver(sigdir); ro.observe(hedef) } catch {}
    return () => { try { ro && ro.disconnect() } catch {} }
  }, [children, maxFont, minFont])
  return <Tag ref={ref} style={{ ...style, fontSize: font + "px" }} {...rest}>{children}</Tag>
}

// ════════════════════════════════════════════════════════════════
// METİN PARCASI
// ════════════════════════════════════════════════════════════════
const ARAP_RE = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/
// \u2500\u2500 kfgqpc UYUMSUZLUK TABLOSU (kfgqpc\u2194MeQuran \u00E7ifti; ger\u00E7ek font render'\u0131yla \u00E7\u0131kar\u0131ld\u0131) \u2500\u2500
// kfgqpc harf/rakamda g\u00FCzel ama baz\u0131 i\u015Faretleri \u25C9 \u00E7iziyor, baz\u0131 Fars/Osmanl\u0131 harflerini de
// (glyph var ama \u25C9 placeholder). MeQuran bunlar\u0131 do\u011Fru \u00E7iziyor. Yeni bozuk karakter \u00E7\u0131karsa
// a\u015Fa\u011F\u0131daki listelere tek kod eklemek yeterli.
//   \u0130\u015EARETLER (birle\u015Fik/ayr\u0131k \u2014 tek tek MeQuran span'i ba\u011F\u0131 BOZMAZ):
//     \u060C U+060C virg\u00FCl \u00B7 \u06DF U+06DF \u00B7 \u06E3 U+06E3 \u00B7 \u06EA U+06EA \u00B7 \u06EB U+06EB \u00B7 \u06ED U+06ED \u00B7 \u0658 U+0658
//     \uFD3E U+FD3E \u00B7 \uFD3F U+FD3F s\u00FCsl\u00FC ayet parantezleri
const MQ_ISARET = /([\u060C\u06DF\u06E3\u06EA\u06EB\u06ED\u0658\uFD3E\uFD3F])/
//   FARS/OSMANLI HARFLER\u0130 (BA\u011ELANAN taban harf \u2014 tek harfi ayr\u0131 fonta al\u0131nca ba\u011F kopar \u2192
//     Persli harf i\u00E7eren KEL\u0130MEN\u0130N TAMAMI MeQuran'dan \u00E7izilir):
//     \u067E \u0679 \u0686 \u0698 \u06A9 \u06AF \u06CC \u06BE \u06C1 \u06D2 \u0688 \u0691
const KF_FARS = new Set([0x067E,0x0679,0x0686,0x0698,0x06A9,0x06AF,0x06CC,0x06BE,0x06C1,0x06D2,0x0688,0x0691])
const MQ_STIL = { fontFamily: "'me_quran', serif" }
const farsHarfVar = (s) => { for (const ch of s) if (KF_FARS.has(ch.codePointAt(0))) return true; return false }
// Bir d\u00FCz metin par\u00E7as\u0131n\u0131 kelime baz\u0131nda i\u015Fler: Persli kelime \u2192 t\u00FCm kelime MeQuran; de\u011Filse
// yaln\u0131z bozuk i\u015Faretler MeQuran span'ine al\u0131n\u0131r. Bo\u015Fluklar korunur.
function arapParcaRender(p, anahtar) {
  const tokenlar = p.split(/(\s+)/)
  return <span key={anahtar}>{tokenlar.map((tk, j) => {
    if (!tk) return null
    if (/^\s+$/.test(tk)) return tk
    if (farsHarfVar(tk)) return <span key={j} style={MQ_STIL}>{tk}</span>
    if (MQ_ISARET.test(tk)) {
      const alt = tk.split(MQ_ISARET)
      return <span key={j}>{alt.map((ap, z) => (ap && MQ_ISARET.test(ap)) ? <span key={z} style={MQ_STIL}>{ap}</span> : ap)}</span>
    }
    return tk
  })}</span>
}
const HASIYE_RE = /\u27E6H(\d+)\u27E7/g
// Ba\u015Fl\u0131k metni normalizasyonu (DOM aramas\u0131 i\u00E7in): k\u00FC\u00E7\u00FCk harf + bo\u015Fluk sadele\u015Ftir + sondaki noktalama
const bnormR = (s) => (s || "").toLowerCase().replace(/\s+/g, " ").trim().replace(/[:.\-\u2013\u2014\u2022*\u00B7\s]+$/, "")

// T\u00FCrk\u00E7e-duyarl\u0131, UZUNLU\u011EU KORUYAN k\u00FC\u00E7\u00FCk harf (\u0130\u2192i, I\u2192\u0131\u2192i): indexOf ofsetleri
// orijinal metinle hizal\u0131 kals\u0131n diye normalize (NFD) de\u011Fil locale-lower kullan\u0131l\u0131r.
// Arama/e\u015fle\u015ftirme: \u015fapka/aksan + b\u00fcy\u00fck-k\u00fc\u00e7\u00fck duyars\u0131z, UZUNLUK KORUYAN (offset g\u00fcvenli)
const trLower = trFold

// Bir k\u00F6k eleman\u0131n metninde aranan ifadeyi bulup Range d\u00F6nd\u00FCr\u00FCr (span'lar aras\u0131 da).
function araliktaBul(kok, aranan) {
  const hedef = trLower(aranan).trim()
  if (!kok || !hedef) return null
  const tam = trLower(kok.textContent || "")
  const bas = tam.indexOf(hedef)
  if (bas < 0) return null
  const son = bas + hedef.length
  const tw = document.createTreeWalker(kok, NodeFilter.SHOW_TEXT)
  const r = document.createRange()
  let node, sayac = 0, basAyar = false
  while ((node = tw.nextNode())) {
    const uz = node.textContent.length
    if (!basAyar && sayac + uz > bas) { r.setStart(node, Math.max(0, bas - sayac)); basAyar = true }
    if (basAyar && sayac + uz >= son) { r.setEnd(node, Math.min(uz, son - sayac)); return r }
    sayac += uz
  }
  return basAyar ? r : null
}
const LATIN_RE = /[A-Za-zÇĞİıÖŞÜçğöşü]/

function MetinParcasi({
  metin, sayfaNo, lugatAktif, onKelimeTikla,
  theme, fontSize, baslikBoyutu = 2, hizalama, metinFont, arapcaFont, arapBoyut = 6,
  vurguModu, vurguRengi, sayfaVurgulari, onVurguEkle, duzenleMod, onVurguKelimeSil,
  dipnotlar, satirAraligi = 1.9, harfAraligi = 0, kelimeAraligi = 0, onDipnotTikla,
  basliklar, baslikFont, ortala = false, lugatRenk, arapRenk, hasiyeler, hafif = false,
}) {
  const [secimBaslangic, setSecimBaslangic] = useState(null)
  const [basili, setBasili] = useState(null)   // tıklanan lügat kalıbı (kısa süre yanan manuel efekt)
  const basiliTimerRef = useRef(null)
  // Tıklayınca lügat kalıbını ~1.4sn belli belirsiz yak (mobil dokunmada da görünür)
  const basiliYak = (key) => {
    if (basiliTimerRef.current) clearTimeout(basiliTimerRef.current)
    setBasili(key)
    basiliTimerRef.current = setTimeout(() => setBasili(null), 1400)
  }
  useEffect(() => () => { if (basiliTimerRef.current) clearTimeout(basiliTimerRef.current) }, [])
  // Efekt: lügat renginde ALT ÇİZGİ (arka plan yok). skipInk:none → g/y gibi inen harflerde kesilmez.
  const basiliZemin = (key) => (basili && basili === key
    ? { textDecoration: "underline", textDecorationColor: lugatRenk, textUnderlineOffset: "0.18em", textDecorationThickness: "1.5px", textDecorationSkipInk: "none", WebkitTextDecorationSkipInk: "none" }
    : null)
  const satirlar = metin.split("\n")
  const hasiyeMap = hasiyeler || {}

  const basliklarMap = useMemo(() => {
    const m = {}
    for (const b of (basliklar || [])) m[b.satir] = b
    return m
  }, [basliklar])

  // Dipnot haritası: önce prop (dipnotlar), yoksa § satırlarından çıkar
  const dipnotMap = useMemo(() => {
    if (dipnotlar) return dipnotlar
    const m = {}
    for (const l of satirlar) {
      const mm = l.match(/^§\[(\d+)\]\s*(.*)$/)
      if (mm) m[mm[1]] = mm[2]
    }
    return m
  }, [dipnotlar, metin])

  // Bitişik Arapça satır bloklarında dipnotu tüm bloğa yay (herhangi satıra tıklayınca açılsın)
  const arapBlokDipnot = useMemo(() => {
    const map = {}
    const arapMi = (s) => s.trim() && !s.startsWith("§") && ARAP_RE.test(s) && !LATIN_RE.test(s)
    let i = 0
    while (i < satirlar.length) {
      if (!arapMi(satirlar[i])) { i++; continue }
      let j = i, dp = null
      while (j < satirlar.length && arapMi(satirlar[j])) {
        if (!dp) { const m = satirlar[j].match(/\[\s*(\d+)\s*\]/); if (m && dipnotMap[m[1]]) dp = dipnotMap[m[1]] }
        j++
      }
      for (let k = i; k < j; k++) map[k] = dp
      i = j
    }
    return map
  }, [metin, dipnotMap])

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
    const tekTik = b.satir === bi.satir && b.kelime === bi.kelime
    // Düzenleme modu: vurgulu tek kelimeye dokununca o kelimeyi çıkar (blok bölünür)
    if (duzenleMod && tekTik && vurgulananMi(satirIdx, kelimeIdx)) {
      onVurguKelimeSil?.(sayfaNo, satirIdx, kelimeIdx)
      setSecimBaslangic(null)
      return
    }
    onVurguEkle(sayfaNo, b, bi, vurguRengi)
    setSecimBaslangic(null)
  }

  return (
    <div style={{ fontSize: `${fontSize}px`, fontFamily: metinFont, overflowWrap: "anywhere", wordBreak: "break-word", maxWidth: "100%" }}>
      {satirlar.map((satir, si) => {
        if (!satir.trim()) return <br key={si} />
        // Dipnot metni satırları (§...) artık altta gösterilmiyor; hover'a taşındı
        if (satir.startsWith("§")) return null
        // ⟦C⟧ ön eki: ortalı normal satır (künye, imza, ayraç) — işaret ayıklanır
        const merkez = satir.startsWith("⟦C⟧")
        const gosterilecek = merkez ? satir.replace(/^⟦C⟧/, "") : satir

        // Lâhika bölüm ayracı "- N -" → ortalı süslü ayraç (TÜRKÇE/Latin rakam), iki yanı ince çizgi
        const mektupM = gosterilecek.trim().match(/^-\s*(\d+)\s*-$/)
        if (mektupM) {
          return (
            <div key={si} data-satir={`${sayfaNo}-${si}`} id={`baslik-${sayfaNo}-${si}`}
              style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "12px", margin: "32px 0 20px", color: theme.accent }}>
              <span style={{ flex: 1, maxWidth: "80px", height: "1px", background: theme.border }} />
              <span style={{ fontSize: `${fontSize * 0.85}px`, opacity: 0.85 }}>❁</span>
              <span style={{ fontFamily: baslikFont || "PlayfairDisplay, serif", fontSize: `${fontSize + 20}px`, fontWeight: 700, lineHeight: 1, minWidth: "1.4em", textAlign: "center" }}>
                {mektupM[1]}
              </span>
              <span style={{ fontSize: `${fontSize * 0.85}px`, opacity: 0.85 }}>❁</span>
              <span style={{ flex: 1, maxWidth: "80px", height: "1px", background: theme.border }} />
            </div>
          )
        }

        // Ana/alt başlık (contents.json'dan) — ortalı, LivaNur, hover açıklama
        const bh = basliklarMap[si]
        if (bh) {
          return (
            <OtoFit key={si} as="div" id={`baslik-${sayfaNo}-${si}`} data-satir={`${sayfaNo}-${si}`}
              maxFont={Math.round(fontSize * (bh.seviye <= 1 ? baslikBoyutu : baslikBoyutu * 0.82))} minFont={fontSize + 4}
              style={{
                textAlign: "center", margin: (bh.seviye <= 1) ? "34px 0 18px" : "24px 0 12px",
                fontFamily: baslikFont || "inherit",
                fontWeight: 700, color: theme.accent, lineHeight: 1.35,
              }}>
              {gosterilecek.replace(/⟦H\d+⟧/g, "")}
              {bh.aciklama && (
                <sup onClick={!vurguModu ? (e) => { e.stopPropagation(); onDipnotTikla(bh.aciklama, e, "AÇIKLAMA") } : undefined}
                  title="Açıklama"
                  style={{ fontSize: "0.32em", color: theme.textSecondary, cursor: !vurguModu ? "pointer" : "default", marginLeft: "0.15em", verticalAlign: "super", fontFamily: "inherit" }}>
                  <Feather size={18} style={{ verticalAlign: "middle" }} />
                </sup>
              )}
            </OtoFit>
          )
        }

        // Tamamen Arapça satır: sağdan sola + lügat rengi; işarete/satıra tıklayınca dipnot popup
        if (ARAP_RE.test(satir) && !LATIN_RE.test(satir)) {
          const dpMetin = arapBlokDipnot[si] || null
          return (
            <p key={si} data-satir={`${sayfaNo}-${si}`}
              onClick={dpMetin && !vurguModu ? (e) => onDipnotTikla(dpMetin, e) : undefined}
              style={{
                marginBottom: "12px", lineHeight: "2", direction: "rtl", textAlign: "center",
                fontFamily: arapcaFont || undefined, fontSize: `${fontSize + arapBoyut}px`,
                color: arapRenk, cursor: dpMetin && !vurguModu ? "pointer" : undefined,
              }}>
              {renderMarkerli(gosterilecek, dipnotMap, onDipnotTikla, theme, hasiyeMap)}
            </p>
          )
        }

        const kelimeler = gosterilecek.replace(/\[\s*(\d+)\s*\]/g, "[$1]").split(" ")
        const pStil = {
          marginBottom: "10px", lineHeight: satirAraligi,
          letterSpacing: `${harfAraligi}px`,
          textAlign: (ortala || merkez) ? "center" : (hizalama || "left"),
          wordSpacing: `${kelimeAraligi}px`,
          cursor: vurguModu ? "text" : "default",
        }
        // Hafif mod: aynı <p> stiliyle düz metin → tam moda geçişte YÜKSEKLİK DEĞİŞMEZ
        if (hafif) {
          return <p key={si} data-satir={`${sayfaNo}-${si}`} style={pStil}>{gosterilecek.replace(/⟦H\d+⟧/g, "")}</p>
        }
        // İZAFET birleşik ön-tarama: "şahsiyet-i beşeriye" gibi eşleşen kısmı işaretle.
        // rol "bas": ilk kelime (tam kırmızı); rol "ek": sonraki kelimede eşleşen ÖN kısım
        // kırmızı+tıklanabilir, kalan ek siyah. secenekler = [birleşik, (ilk), (sonraki)].
        const birlesikMap = {}
        if (lugatAktif) {
          const sadeleş = (w) => (w || "").replace(/⟦H\d+⟧/g, "").replace(/[.,!?;:'"()\[\]]/g, "").trim()
          const sade = kelimeler.map(sadeleş)
          for (let wi = 0; wi < sade.length - 1; wi++) {
            if (birlesikMap[wi]) continue
            const wT = sade[wi]
            if (!wT.includes("-") || ARAP_RE.test(wT)) continue
            // En UZUN izafet eşleşmesi: wi'den başlayarak 2..4 kelime; son kelimenin eki kırpılabilir
            let best = null
            for (let n = 2; n <= 4 && wi + n - 1 < sade.length; n++) {
              const parcalar = sade.slice(wi, wi + n)
              if (parcalar.some(p => !p || ARAP_RE.test(p))) break
              const son = parcalar[n - 1]
              const enFazla = Math.min(6, Math.max(0, son.length - 2))
              for (let kes = 0; kes <= enFazla; kes++) {
                const sonKirp = son.slice(0, son.length - kes)
                const aday = parcalar.slice(0, -1).concat(sonKirp).join(" ")
                const a = kelimeAra(aday), k = kavramAra(aday)
                if (a || k) { best = { n, kesim: sonKirp.length, kelime: aday, anlam: a, kavram: k }; break }
              }
            }
            if (!best) continue
            const secenekler = [{ kelime: best.kelime, anlam: best.anlam, kavram: best.kavram }]
            const iA = kelimeAra(wT), iK = kavramAra(wT)
            if (iA || iK) secenekler.push({ kelime: wT, anlam: iA, kavram: iK })
            const sonKel = sade[wi + best.n - 1]
            const lA = kelimeAra(sonKel), lK = kavramAra(sonKel)
            if (lA || lK) secenekler.push({ kelime: sonKel, anlam: lA, kavram: lK })
            for (let d = 0; d < best.n; d++) {
              const idx = wi + d
              birlesikMap[idx] = (d === best.n - 1)
                ? { rol: "ek", kesim: best.kesim, secenekler, grup: wi }
                : { rol: "tam", secenekler, grup: wi }
            }
          }
        }
        const birlesikTikla = (sec, e) => onKelimeTikla(sec[0].kelime, sec[0].anlam, sec[0].kavram, e, sec.length > 1 ? sec : null)
        return (
          <p key={si} data-satir={`${sayfaNo}-${si}`} style={pStil}>
            {kelimeler.map((kelime, ki) => {
              if (!kelime.trim()) return " "
              // Haşiye işaretlerini (⟦Hn⟧) ayıkla — kelimenin sonuna gömülüdür
              const hasNosRaw = []
              const temiz = kelime.replace(/⟦H(\d+)⟧/g, (_, n) => { hasNosRaw.push(n); return "" })
              const hasNos = [...new Set(hasNosRaw)]   // aynı haşiye tek işaret
              const hasHasiye = hasNos.length > 0
              const bosluk = ki < kelimeler.length - 1 ? " " : ""
              const hasiyeEk = hasHasiye ? hasNos.map((n, hi) => (
                hasiyeMap[n]
                  ? <HasiyeSup key={"h" + hi} metin={hasiyeMap[n]} onDipnotTikla={onDipnotTikla} theme={theme} vurguModu={vurguModu} />
                  : null
              )) : null
              // Dipnot işareti [n] -> hover
              const dm = temiz.match(/^\[(\d+)\]$/)
              if (dm && dipnotMap[dm[1]]) {
                return (
                  <span key={ki}>
                    <DipnotSup no={dm[1]} metin={dipnotMap[dm[1]]} onDipnotTikla={onDipnotTikla} theme={theme} />
                    {hasiyeEk}{bosluk}
                  </span>
                )
              }
              if (!temiz) {   // yalnız haşiye işaretinden ibaret jeton
                return <span key={ki}>{hasiyeEk}{bosluk}</span>
              }
              const bil = birlesikMap[ki]
              // İZAFET EKİ: eşleşen ön kısım kırmızı+tıklanabilir, kalan ek siyah
              if (bil && bil.rol === "ek" && !hasHasiye) {
                const on = temiz.slice(0, bil.kesim)
                const kalan = temiz.slice(bil.kesim)
                const lgKey = `${sayfaNo}-${si}-c-${bil.grup}`   // satır+grup: benzersiz
                return (
                  <span key={ki}>
                    <span className="lugat-kelime"
                      onClick={e => { if (!vurguModu) { basiliYak(lgKey); birlesikTikla(bil.secenekler, e) } }}
                      onMouseEnter={e => { if (!vurguModu) e.currentTarget.style.opacity = "0.75" }}
                      onMouseLeave={e => { e.currentTarget.style.opacity = "1" }}
                      style={{ color: lugatRenk, cursor: vurguModu ? "text" : "pointer", userSelect: "text", ...basiliZemin(lgKey) }}>
                      {on}
                    </span>
                    {kalan && <span style={{ color: "inherit" }}>{kalan}</span>}
                    {hasiyeEk}{bosluk}
                  </span>
                )
              }
              const arapKelime = ARAP_RE.test(temiz)
              // Haşiyeli kelimeyi lügat sayma (H + kuş tüyü ile karışmasın)
              let anlam    = (arapKelime || hasHasiye) ? null : kelimeAra(temiz)
              let kavram   = (arapKelime || hasHasiye) ? null : kavramAra(temiz)
              // İZAFET birleşiğin TAM (son olmayan) kelimeleri: tam kırmızı, tıklayınca birleşik anlam
              let secenekler = null
              if (bil && bil.rol === "tam") {
                secenekler = bil.secenekler
                if (!anlam) anlam = secenekler[0].anlam
                if (!kavram) kavram = secenekler[0].kavram
              }
              const lugatliMi = (anlam || kavram || secenekler) && lugatAktif
              const vurgulu  = vurgulananMi(si, ki)
              const lgKey = (bil && bil.rol === "tam") ? `${sayfaNo}-${si}-c-${bil.grup}` : `${sayfaNo}-${si}-w-${ki}`
              return (
              <span key={ki}>
                <span
                  className={lugatliMi ? "lugat-kelime" : ""}
                  data-vurgu={vurgulu ? vurgulu.id : undefined}
                  onMouseDown={e => kelimeMouseDown(si, ki, e)}
                  onMouseUp={() => kelimeMouseUp(si, ki)}
                  onClick={e => { if (!vurguModu && lugatliMi) {
                    basiliYak(lgKey)
                    // Birleşikte pop-up başlığı = EŞLEŞEN kısım (secenekler[0].kelime), tüm kelime değil
                    if (secenekler && secenekler.length > 1) onKelimeTikla(secenekler[0].kelime, secenekler[0].anlam, secenekler[0].kavram, e, secenekler)
                    else if (secenekler) onKelimeTikla(secenekler[0].kelime, secenekler[0].anlam, secenekler[0].kavram, e)
                    else onKelimeTikla(temiz, anlam, kavram, e)
                  } }}
                  onMouseEnter={e => { if (lugatliMi && !vurguModu) e.currentTarget.style.opacity = "0.75" }}
                  onMouseLeave={e => { e.currentTarget.style.opacity = "1" }}
                  style={{
                    ...(vurgulu ? { background: vurgulu.renk } : basiliZemin(lgKey)),
                    borderRadius: vurgulu ? "2px" : "0",
                    color: arapKelime ? arapRenk : (lugatliMi ? lugatRenk : "inherit"),
                    borderBottom: "none",
                    cursor: vurguModu ? "text" : (lugatliMi ? "pointer" : "default"),
                    padding: vurgulu ? "0 1px" : "0",
                    userSelect: "text",
                    ...(arapKelime ? { fontSize: `${fontSize + arapBoyut}px`, ...(arapcaFont ? { fontFamily: arapcaFont } : {}) } : {}),
                  }}
                >
                  {/* Boşluğu vurgulanan kelimenin içine al ki ardışık vurgular birleşsin */}
                  {temiz}{hasHasiye ? "" : bosluk}
                </span>
                {hasiyeEk}{hasHasiye ? bosluk : ""}
              </span>
            )
            })}
          </p>
        )
      })}
    </div>
  )
}
// Dipnot işareti — tıklanınca dipnot popup'ı açar
function DipnotSup({ no, metin, onDipnotTikla, theme }) {
  return (
    <sup
      onClick={(e) => { e.stopPropagation(); onDipnotTikla(metin, e) }}
      style={{ color: theme.accent, cursor: "pointer", fontWeight: 700, padding: "0 2px", userSelect: "none" }}
    >[{no}]</sup>
  )
}

// Haşiye işareti — kelimenin üstünde küçük "H" + kuş tüyü
function HasiyeSup({ metin, onDipnotTikla, theme, vurguModu }) {
  return (
    <sup
      onClick={!vurguModu ? (e) => { e.stopPropagation(); onDipnotTikla(metin, e, "HAŞİYE") } : undefined}
      title="Haşiye"
      style={{
        color: theme.accent, cursor: !vurguModu ? "pointer" : "default",
        userSelect: "none", marginLeft: "0.06em", verticalAlign: "super",
        whiteSpace: "nowrap", fontWeight: 700,
      }}
    >
      <span style={{ fontSize: "0.62em" }}>H</span>
      <Feather size={10} style={{ verticalAlign: "middle", marginLeft: "0.5px" }} />
    </sup>
  )
}

// Bir satırdaki [n] dipnot ve ⟦Hn⟧ haşiye işaretlerini tıklanır işaretlere çevirir
// Metinde TÜM ayet atıflarını bul: "<Sûre adı> Sûresi, <sure>:<ayet>" (İsrâ Sûresi, 17:44;
// bk. Yunus Sûresi, 10:108; Beled Sûresi, 90:10). "Sûresi" büyük/küçük duyarsız aranır.
// → [{ ad, sureNo, ayetNo }] (tekrarsız). Navigasyon rakamlarla (sure:ayet) yapılır.
function ayetAtiflari(text) {
  if (!text) return []
  const re = /([A-Za-zÇĞİÖŞÜçğıöşüâîûôêÂÎÛ'’.\-]+)\s+s[uû]res[iî]\s*[,:]?\s*(\d{1,3})\s*[:：]\s*(\d{1,3})/gi
  const gorulen = new Set(), sonuc = []
  let m
  while ((m = re.exec(text)) !== null) {
    const sureNo = +m[2], ayetNo = +m[3]
    if (sureNo < 1 || sureNo > 114 || ayetNo < 1) continue
    const k = `${sureNo}:${ayetNo}`
    if (gorulen.has(k)) continue
    gorulen.add(k)
    sonuc.push({ ad: (m[1] || "").replace(/[.\-]+$/g, "").trim(), sureNo, ayetNo })
  }
  return sonuc
}
// Lügat/kavram popup'unun tüm metnini birleştir (atıf taraması için)
function popupMetni(p) {
  if (!p) return ""
  let t = (p.anlam || "")
  const ekle = (arr) => (arr || []).forEach(kv => { t += " " + (kv.aciklama || "") + " " + ((kv.kaynaklar || []).join(" ")) })
  ekle(p.kavram)
  ;(p.secenekler || []).forEach(s => { t += " " + (s.anlam || ""); ekle(s.kavram) })
  return t
}

function renderMarkerli(text, dipnotMap, onDipnotTikla, theme, hasiyeMap = {}) {
  const parcalar = text.split(/(\[\s*\d+\s*\]|⟦H\d+⟧)/g)
  return parcalar.map((p, i) => {
    const m = p.match(/^\[\s*(\d+)\s*\]$/)
    if (m && dipnotMap[m[1]]) {
      return <DipnotSup key={i} no={m[1]} metin={dipnotMap[m[1]]} onDipnotTikla={onDipnotTikla} theme={theme} />
    }
    const h = p.match(/^⟦H(\d+)⟧$/)
    if (h) {
      return hasiyeMap[h[1]]
        ? <HasiyeSup key={i} metin={hasiyeMap[h[1]]} onDipnotTikla={onDipnotTikla} theme={theme} />
        : null
    }
    // kfgqpc'nin ◉ çizdiği işaretleri ve Fars/Osmanlı harfli kelimeleri MeQuran'dan çiz
    // (harfler/rakamlar kfgqpc kalır; detay: MQ_ISARET / KF_FARS / arapParcaRender).
    return arapParcaRender(p, i)
  })
}

// Çift onaylı silme butonu
function OnayliSil({ label, onConfirm, theme }) {
  const [onay, setOnay] = useState(false)
  useEffect(() => {
    if (!onay) return
    const t = setTimeout(() => setOnay(false), 3000)
    return () => clearTimeout(t)
  }, [onay])
  return (
    <button
      onClick={() => { if (onay) { onConfirm(); setOnay(false) } else setOnay(true) }}
      style={{
        width: "100%", marginBottom: "10px", padding: "8px", borderRadius: "8px",
        background: onay ? "#c0392b" : `${theme.accent}12`,
        color: onay ? "#fff" : theme.accent,
        border: `1px solid ${onay ? "#c0392b" : theme.border}`,
        cursor: "pointer", fontSize: "12px",
        display: "flex", alignItems: "center", justifyContent: "center", gap: "6px",
      }}>
      <X size={13} /> {onay ? "Emin misin? Tekrar dokun" : label}
    </button>
  )
}

// Sadece görünürken içerik render eden pencereleme sarmalayıcısı
// Sayfa bloğu: görünürken TAM, ulaşılan en derin noktanın üstündeyse (hafifGoster)
// HAFİF (aynı yükseklik) render eder; yalnız alttaki ulaşılmamış sayfalar tahmini
// yer-tutucu olur. Böylece yukarı kaydırırken üstteki sayfalar hep gerçek
// yükseklikte → hiç sıçrama olmaz (iOS'ta native anchoring olmasa bile).
function SayfaBlok({ minHeight, margin = "2200px 0px", hafifGoster, render }) {
  const ref = useRef(null)
  const [gorunur, setGorunur] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const io = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setGorunur(true); io.disconnect() } },
      { rootMargin: margin }
    )
    io.observe(el)
    return () => io.disconnect()
  }, [])
  const mod = gorunur ? "tam" : (hafifGoster ? "hafif" : null)
  return (
    <div ref={ref} style={{ minHeight: mod ? undefined : `${minHeight}px` }}>
      {mod ? render(mod) : null}
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
            position: "absolute", bottom: "100%", left: 0, right: 0, marginBottom: "4px",
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

// Son/Sık Okunanlar rafları için okuma kaydı
useEffect(() => { if (id) okumaKaydet(id) }, [id])

// ── Okuma ayarları
const [yaziBoyutu, setYaziBoyutu] = useState(() => parseInt(localStorage.getItem("vukuf-yazi-boyutu") || "16"))
const [satirAraligi, setSatirAraligi] = useState(() => parseFloat(localStorage.getItem("vukuf-satir-araligi") || "1.9"))
const [harfAraligi, setHarfAraligi]   = useState(() => parseFloat(localStorage.getItem("vukuf-harf-araligi") || "0"))
const [kelimeAraligi, setKelimeAraligi] = useState(() => parseFloat(localStorage.getItem("vukuf-kelime-araligi") || "0"))
const [hizalama, setHizalama] = useState(() => localStorage.getItem("vukuf-hizalama") || "left")
const [arapBoyutu, setArapBoyutu] = useState(() => parseInt(localStorage.getItem("vukuf-arap-boyutu") || "6"))
// Başlık boyutu: gövde yazısının KATI (çarpan). seviye-1 = ×katsayı, seviye-2 biraz küçük.
const [baslikBoyutu, setBaslikBoyutu] = useState(() => parseFloat(localStorage.getItem("vukuf-baslik-boyutu") || "2"))
// İlk oturum mu? (font tercihi henüz kaydedilmemişse)
const ilkOturumRef = useRef(localStorage.getItem("vukuf-fontlar") == null)
const [fontSecimler, setFontSecimler] = useState(() => {
  const VARSAYILAN = { turkce: "bookerly", osmanlica: null, arapca: "kfgqpc" }
  try {
    const k = JSON.parse(localStorage.getItem("vukuf-fontlar") || "null")
    if (k && typeof k === "object") {
      // Dönen kullanıcı: kayıtlı seçim; Türkçe/Arapça boşsa varsayılana tamamla
      return { turkce: k.turkce || "bookerly", osmanlica: k.osmanlica ?? null, arapca: k.arapca || "kfgqpc" }
    }
  } catch {}
  return VARSAYILAN   // ilk oturum → zorla varsayılan
})
const aktifFontId = fontSecimler.turkce || fontSecimler.osmanlica || fontSecimler.arapca || "bookerly"
const aktifFont   = fontBul(aktifFontId)
const metinFont  = fontBul(fontSecimler.turkce || fontSecimler.osmanlica || "bookerly").style
// Kitap "Evrad ve Ezkar" kısmında mı? → Arapça yazı fontu varsayılan Me Quran
const evradKitabiMi = useMemo(() => {
  const kat = kategoriler.find(k => (k.alimler || []).some(a =>
    (a.altKategoriler ? a.altKategoriler.flatMap(x => x.kitaplar || []) : (a.kitaplar || [])).some(b => b.id === id)
  ))
  return kat?.id === "evrad-ezkar"
}, [id])
// Evrad/Ezkar VARSAYILANI Me Quran; ama kullanıcı Arapça fontu menüden bir kez seçtiyse
// (arapcaElle) artık ONA saygı duy — kilit yok, her yerde seçim geçerli.
const [arapcaElle, setArapcaElle] = useState(() => localStorage.getItem("vukuf-arapca-elle") === "1")
const arapcaFont = (evradKitabiMi && !arapcaElle)
  ? fontBul("me-quran").style
  : (fontSecimler.arapca ? fontBul(fontSecimler.arapca).style : null)
const baslikFont = /Nurs[iî]/.test(kitap?.yazar || "") ? "LivaNur, serif" : metinFont
const [arapcaRenk, setArapcaRenk] = useState(() => localStorage.getItem("vukuf-arapca-renk") || "")
const [lugatRenkOzel, setLugatRenkOzel] = useState(() => localStorage.getItem("vukuf-lugat-renk") || "")
const lugatRenk = lugatRenkOzel || theme.lugatHighlight   // Latin lügat kelimeleri rengi
const arapRenk  = arapcaRenk || theme.arabicHighlight     // Arapça-yazı rengi (ayrı)

// ── Scroll
const scrollRef    = useRef(null)
const sayfaRefs    = useRef({})
const sonScrollRef = useRef(0)
const sonKonumRef  = useRef(null)   // { sayfa, oran } — son okuma konumu
// İçindekiler menüsü kaydırma konumu (oturum içi): panel kapanıp açılınca aynı yere döner;
// kitaptan çıkıp geri gelince bileşen yeniden bağlanır → ref sıfırlanır (0'dan başlar).
const menuListeRef = useRef(null)
const menuScrollRef = useRef(0)
const konumYuklendiRef = useRef(false)
const [donusTip, setDonusTip] = useState("")   // "arama" | "tefeul" — geldiği yere dönüş pill'i
const [mevcutSayfa, setMevcutSayfa] = useState(1)
const [maxSayfa, setMaxSayfa] = useState(1)   // ulaşılan en derin sayfa (üstü hafif render edilir)
const maxSayfaRef = useRef(1)
const maxSayfaGuncelle = (n) => { if (n > maxSayfaRef.current) { maxSayfaRef.current = n; setMaxSayfa(n) } }

// ── Otomatik kaydırma
const otomatikRef = useRef(null)
const [otomatikKaydirma, setOtomatikKaydirma] = useState(false)
const [kaydirmaHizi, setKaydirmaHizi]         = useState(1)
const [duraklatildi, setDuraklatildi]         = useState(false)

// ── Bar
const barZamanRef = useRef(null)
const [barGorunur, setBarGorunur]           = useState(true)
const barRef = useRef(null)
const [barYuk, setBarYuk] = useState(56)   // ölçülen bar yüksekliği (safe-area padding dahil)
// Bar TEK SATIRA sığmıyor mu? Sığmıyorsa sol/sağ ayrımı bırakılır (ortada boşluk kalmasın)
// ve öğeler tespit edilen satır sayısına DENGELİ dağıtılır (bkz. aşağıdaki ölçüm).
const [barCokSatir, setBarCokSatir] = useState(false)
const [barSatirKes, setBarSatirKes] = useState([])   // satır kırma ayraçlarının order değerleri
const barOlcRef = useRef(null)                       // ölçüm fonksiyonu (buton seti değişince tetiklenir)
const [gecisHazir, setGecisHazir] = useState(false)  // padding geçişi: açılıştaki ölçüm oturana kadar KAPALI (kayma olmasın)
// Açılış örtüsü: konum oturana dek rozet göster, oturunca kaymadan aç (KuranOkuma ile tutarlı)
const [okumaHazir, setOkumaHazir] = useState(false)
const [acilisOrtu, setAcilisOrtu] = useState(true)
const okumayiGoster = useCallback(() => setOkumaHazir(true), [])
useEffect(() => {
  if (!okumaHazir) return
  const t = setTimeout(() => setAcilisOrtu(false), 420)
  return () => clearTimeout(t)
}, [okumaHazir])
// PWA (ana ekrana eklenmiş / standalone) modu: iOS burada safe-area-inset-bottom'u gerçek
// ~34px verir → alt bar fazla boşluklu görünür. Tarayıcıda inset ~0, kompakt. Bu yüzden
// safe-area katkısını YALNIZ PWA'da bir miktar kırpıyoruz (web'e dokunmuyoruz).
const [pwaModu, setPwaModu] = useState(() => {
  try { return (window.matchMedia && window.matchMedia("(display-mode: standalone)").matches) || window.navigator.standalone === true } catch { return false }
})
useEffect(() => {
  try {
    const mq = window.matchMedia("(display-mode: standalone)")
    const guncelle = () => setPwaModu(mq.matches || window.navigator.standalone === true)
    mq.addEventListener ? mq.addEventListener("change", guncelle) : mq.addListener(guncelle)
    return () => { mq.removeEventListener ? mq.removeEventListener("change", guncelle) : mq.removeListener(guncelle) }
  } catch {}
}, [])
// PWA'da alt barın DOĞRUDAN alt boşluğu (px). Büyüt = daha çok boşluk, küçült = daha az.
// safe-area/max karmaşası yok; web bundan etkilenmez (web'de pwaModu=false).
// ~8 web'e yakın kompakt durur; home-indicator payı istersen 16-20 yapabilirsin.
const pwaAltBosluk = 8
const [barKonum, setBarKonum] = useState(() => localStorage.getItem("vukuf-bar-konum") || "alt")
const [barUiOlcegi, setBarUiOlcegi] = useState(() => parseFloat(localStorage.getItem("vukuf-bar-ui-olcegi") || "1"))
const [bilgiOlcegi, setBilgiOlcegi] = useState(() => parseFloat(localStorage.getItem("vukuf-bilgi-olcegi") || "1"))
const [yaziTipiAcik, setYaziTipiAcik] = useState(false)   // Aa panelindeki yazı tipi listesi açık mı
const yaziTipiBtnRef = useRef(null)
const [gorselVeri, setGorselVeri] = useState(null)   // görsel oluşturucuya gidecek metin
const [gorselIpucu, setGorselIpucu] = useState(null)  // görsel düğmesi uyarı metni (null = yok)
const gorselIpucuTimerRef = useRef(null)
const [ogeGorunur, setOgeGorunur] = useState(() => {
  try { return JSON.parse(localStorage.getItem("vukuf-bar-gorunur")) || {} } catch { return {} }
})
const [ogeSade, setOgeSade] = useState(() => {
  const k = localStorage.getItem("vukuf-bar-sade")
  if (k) { try { return JSON.parse(k) } catch { /* yoksay */ } }
  const d = {}; BAR_OGELERI.forEach(o => { if (o.sadeVarsayilan) d[o.key] = true }); return d
})
const [sadeMode, setSadeMode]               = useState(() => localStorage.getItem("vukuf-sade-mode") === "true")
const [otomatikGizleme, setOtomatikGizleme] = useState(() => localStorage.getItem("vukuf-otomatik-gizleme") !== "false")
const [gizlemeSuresi, setGizlemeSuresi] = useState(() => parseInt(localStorage.getItem("vukuf-gizleme-suresi") || "5"))
const [sureGoster, setSureGoster]           = useState(true)
const isMobile = useMediaQuery('(max-width: 768px)')
const genisEkran = useMediaQuery('(min-width: 1024px)')   // yatay telefon (<1024) bar sağa kaymasın

// ── Paneller
const [ayarlarAcik, setAyarlarAcik]     = useState(false)
const [sayfaGitAcik, setSayfaGitAcik]   = useState(false)
const [sayfaGitInput, setSayfaGitInput] = useState("")
// Bardaki sayfa göstergesi tipi: "tam" (202/1050) | "sayfa" (202) | "ikon" (yalnız simge)
const [sayfaGosterim, setSayfaGosterim] = useState(() => localStorage.getItem("vukuf-sayfa-gosterim") || "tam")
const [sayfaGosterimAcik, setSayfaGosterimAcik] = useState(false)
const [aaAcik, setAaAcik]               = useState(false)
const [kayitAcik, setKayitAcik]         = useState(false)
const [kayitSekme, setKayitSekme]       = useState("isaretler")
const [temaAcik, setTemaAcik]           = useState(false)
const [aramaAcik, setAramaAcik]         = useState(false)
const [menuAcik, setMenuAcik]           = useState(false)
const [gorunumAcik, setGorunumAcik]     = useState(false)
const [siraAcik, setSiraAcik]           = useState(false)
// TAM GENİŞLİK: metni ekran boyunca yayar, kenar boşluğu bırakmaz (web + mobil).
const [tamGenislik, setTamGenislik] = useState(() => localStorage.getItem("vukuf-okuma-tam-genislik") === "true")
// KENAR BOŞLUĞU: Tam Genişlik'in tersi. Metin genişliği yazı boyutuyla BÜYÜMEZ; ekranın sabit
// bir yüzdesinde kalır → yazı ne kadar büyürse büyüsün kenarlarda boşluk durur, satır uzunluğu
// sabit kaldığı için (özellikle webde) satır takibi kolaylaşır. İkisi aynı anda açılamaz.
const [kenarBosluk, setKenarBosluk] = useState(() => localStorage.getItem("vukuf-okuma-kenar-bosluk") === "true")
useEffect(() => { localStorage.setItem("vukuf-okuma-tam-genislik", String(tamGenislik)) }, [tamGenislik])
useEffect(() => { localStorage.setItem("vukuf-okuma-kenar-bosluk", String(kenarBosluk)) }, [kenarBosluk])
const tamGenislikDegis = () => setTamGenislik(v => { const y = !v; if (y) setKenarBosluk(false); return y })
const kenarBoslukDegis = () => setKenarBosluk(v => { const y = !v; if (y) setTamGenislik(false); return y })
const [butonSirasi, setButonSirasi] = useState(() => {
  try {
    const k = JSON.parse(localStorage.getItem("vukuf-okuma-buton-sirasi") || "null")
    if (Array.isArray(k)) {
      const temiz = k.filter(x => BAR_SIRA_VARSAYILAN.includes(x))
      return [...temiz, ...BAR_SIRA_VARSAYILAN.filter(x => !temiz.includes(x))]
    }
  } catch {}
  return BAR_SIRA_VARSAYILAN
})
const [butonTaraf, setButonTaraf] = useState(() => {
  try {
    const k = JSON.parse(localStorage.getItem("vukuf-okuma-buton-taraf") || "null")
    if (k && typeof k === "object") return { ...BAR_TARAF_VARSAYILAN, ...k }
  } catch {}
  return BAR_TARAF_VARSAYILAN
})
const [sadeIcerikAcik, setSadeIcerikAcik] = useState(false)
const [menuAcikDugum, setMenuAcikDugum] = useState(() => new Set())
const [duzenleNot, setDuzenleNot] = useState(null)   // { sayfaNo, notId }
const [duzenleNotMetni, setDuzenleNotMetni] = useState("")
const [duzenleVurgu, setDuzenleVurgu] = useState(null)   // { sayfaNo, vurguId }
const [duzenleVurguMetni, setDuzenleVurguMetni] = useState("")
const [vurguDuzenle, setVurguDuzenle] = useState(false)  // vurgu düzenleme modu (kelime ekle/çıkar)

// ── Component'li işaretler (konum-bazlı kayıtlar)
const [kayitlar, setKayitlar] = useState(() => {
  try { return JSON.parse(localStorage.getItem(`vukuf_kayitlar_${id}`)) || [] } catch { return [] }
})
const [kayitKonumModu, setKayitKonumModu] = useState(false)
const [odakKonum, setOdakKonum] = useState(null)   // { sayfa, oran, nonce }
const odakZamanRef = useRef(null)
const [aramaVurgu, setAramaVurgu] = useState(null) // { sayfa, kutular:[{top,left,width,height}], nonce }
const aramaZamanRef = useRef(null)

// ── İçindekiler (contents.json'dan üretilecek <slug>-icindekiler.json)
const [icindekiler, setIcindekiler] = useState(null)

const herhangiPanelAcik = ayarlarAcik || sayfaGitAcik || aaAcik || kayitAcik || temaAcik || aramaAcik || menuAcik

// ── Lügat popup
const [popup, setPopup] = useState(null)
const [popupKavramAcik, setPopupKavramAcik] = useState(false)
const popupRef = useRef(null)
// Pop-up'ı kelimenin kutusuna göre yerleştir: öncelik ALTTA (çizgiden sonra küçük boşluk);
// altta sığmazsa (bar/ekran) hemen ÜSTTE; yatayda kelimeye en yakın sığan konum.
useLayoutEffect(() => {
  if (!popup || !popup.rect || popup.yerlesti) return
  const el = popupRef.current
  if (!el) return
  const ph = el.offsetHeight, pw = el.offsetWidth
  const bosluk = 8, kenar = 8, vw = window.innerWidth, vh = window.innerHeight
  const altBar = (barKonum === "alt" && barGorunur) ? barYuk : 0
  const ustBar = (barKonum === "ust" && barGorunur) ? barYuk : 0
  const altSinir = vh - altBar - kenar, ustSinir = ustBar + kenar
  const r = popup.rect
  let y
  if (r.bottom + bosluk + ph <= altSinir) y = r.bottom + bosluk         // altta sığıyor
  else y = Math.max(ustSinir, r.top - bosluk - ph)                      // üstte (sığmazsa en yakın üst)
  let x = r.left + r.width / 2 - pw / 2                                 // yatayda kelime ortası
  x = Math.max(kenar, Math.min(x, vw - pw - kenar))                    // taşarsa en yakın sığan konum
  setPopup(p => (p && !p.yerlesti ? { ...p, x, y, yerlesti: true } : p))
}, [popup, barKonum, barGorunur, barYuk])
const [dipnotPopup, setDipnotPopup] = useState(null)
// Atıf kaynağı: bir popup/dipnot açılırken tıklanan SATIRI hatırla → Kur'an'a atıfla gidip
// "Okumaya dön" ile geri gelince tam o satıra odaklan + işaretle (odak biraz aşağıda karşılamasın).
const atifKaynakRef = useRef(null)
const atifKaynakYakala = (e) => {
  try {
    const line = e?.currentTarget?.closest?.("[data-satir]")
    const key = line?.getAttribute?.("data-satir")
    if (!key) { atifKaynakRef.current = null; return }
    const sayfa = parseInt(key.split("-")[0]) || null
    const arabic = line.getAttribute("dir") === "rtl" || (line.style && line.style.direction === "rtl")
    atifKaynakRef.current = { satirKey: key, sayfa, arabic }
  } catch { atifKaynakRef.current = null }
}

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
const [tamArama, setTamArama]               = useState(false)  // * : birebir (tam) arama — normalize yok
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
  fetch(`/kitap-metin/${kitap.dosya}`)
    .then(r => r.text())
    .then(t => {
      // Bazı kaynak metinlerde Arapça, ÖNCEDEN-BİÇİMLENMİŞ harflerle (Arabic Presentation
      // Forms U+FB50–FDFF / U+FE70–FEFF) kaydedilmiş. kfgqpc bu glyph'leri içermiyor →
      // sistem fontuna düşüp harf bağını kırıyor ("ufak atlamalar"). Bu karakterleri NFKC ile
      // TABAN Arapça harflere çeviriyoruz → kfgqpc kendi OpenType şekillendirmesiyle doğru bağlar
      // (mushaftaki gibi). Yalnız presentation-form dizileri dokunulur; Latin/işaretler etkilenmez.
      const norm = t.replace(/[ﭐ-﷿ﹰ-﻿]+/g, m => m.normalize("NFKC"))
      setKitapMetni(JSON.parse(norm)); setYukleniyor(false)
    })
    .catch(() => setYukleniyor(false))
}, [kitap])

// İçindekiler dosyasını dene (varsa)
useEffect(() => {
  if (!kitap?.dosya) { setIcindekiler(null); return }
  const dosya = kitap.dosya.replace(/-metin\.json$/, "-icindekiler.json")
  fetch(`/bolumler/${dosya}`)
    .then(r => r.ok ? r.json() : null)
    .then(data => setIcindekiler(Array.isArray(data) ? data : null))
    .catch(() => setIcindekiler(null))
}, [kitap])

// Mobilde istem dışı zoom'u sıfırla
useEffect(() => {
  if (!isMobile) return
  const viewport = window.visualViewport
  if (!viewport) return
  const zoomSifirla = () => {
    if (viewport.scale > 1) {
      const meta = document.querySelector('meta[name="viewport"]')
      if (meta) {
        meta.content = 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no'
        setTimeout(() => {
          meta.content = 'width=device-width, initial-scale=1.0, user-scalable=yes'
        }, 50)
      }
    }
  }
  viewport.addEventListener('resize', zoomSifirla)
  return () => viewport.removeEventListener('resize', zoomSifirla)
}, [isMobile])

// ════════════════════════════════════════════════════
// Sayfa yükseklik tahmini (LazySayfa yer-tutucusu gerçek yüksekliğe yakın olsun
// ki mount olunca sıçrama minimal kalsın). Yapı bir kez ölçülür, boyut canlı.
// ════════════════════════════════════════════════════
const sayfaYapisi = useMemo(() => {
  const kpl = isMobile ? 50 : 82   // satır başına ~ karakter (font-bağımsız yaklaşık)
  return kitapMetni.map(sf => {
    let latinWrap = 0, arapWrap = 0, nPara = 0, nBos = 0
    const baslikSet = new Set((sf.basliklar || []).map(b => b.satir))
    const satirlar = (sf.metin || "").split("\n")
    for (let i = 0; i < satirlar.length; i++) {
      const s = satirlar[i]
      if (s.startsWith("§") || baslikSet.has(i)) continue   // başlık ayrı sayılıyor
      if (!s.trim()) { nBos++; continue }
      const wrap = Math.max(1, Math.ceil(s.length / kpl))
      if (ARAP_RE.test(s) && !LATIN_RE.test(s)) arapWrap += wrap
      else latinWrap += wrap
      nPara++
    }
    return { latinWrap, arapWrap, nPara, nBos, nBaslik: (sf.basliklar || []).length }
  })
}, [kitapMetni, isMobile])

const tahminYukHam = (i) => {
  const t = sayfaYapisi[i]
  if (!t) return 400
  const lh = yaziBoyutu * satirAraligi
  const arapLh = (yaziBoyutu + arapBoyutu) * 2
  return t.latinWrap * lh + t.arapWrap * arapLh +
    t.nPara * 10 + t.nBos * (yaziBoyutu * 0.8) +
    t.nBaslik * ((yaziBoyutu + 84) * 1.35 + 52)
}

// ════════════════════════════════════════════════════
// Font/boyut değişiminde OKUMA YERİNİ KORU (sayfa atlamasın)
// Değişimden önce en üstte görünen satırı yakala; reflow sonrası aynı satırı
// aynı yüksekliğe geri çek. useLayoutEffect → paint öncesi, kayma/flash yok.
// ════════════════════════════════════════════════════
const fontAnkorRef = useRef(null)
const aaAcikRef = useRef(false)
// Okunabilir alanın üst referans Y'si (üst bar altı)
const ustReferansY = () => {
  const el = scrollRef.current
  if (!el) return 0
  return el.getBoundingClientRect().top + ((barKonum === "ust" && barGorunur) ? barYuk : 0) + 4
}
// En üstte (referansın altında) görünen ilk satırı yakala → {satir, ofset}
const ustSatirYakala = () => {
  const el = scrollRef.current
  if (!el) return null
  const refY = ustReferansY()
  const satirlar = el.querySelectorAll("[data-satir]")
  for (let i = 0; i < satirlar.length; i++) {
    const r = satirlar[i].getBoundingClientRect()
    if (r.bottom > refY + 1) return { satir: satirlar[i].getAttribute("data-satir"), ofset: r.top - refY }
  }
  return null
}
// Yakalanan satırı aynı yüksekliğe geri çek
const ustSatirGeriYukle = (ank) => {
  const el = scrollRef.current
  if (!el || !ank || !ank.satir) return
  const h = el.querySelector(`[data-satir="${ank.satir}"]`)
  if (!h) return
  const simdi = h.getBoundingClientRect().top - ustReferansY()
  el.scrollTop += (simdi - ank.ofset)
}

// ════════════════════════════════════════════════════
// Scroll takibi
// ════════════════════════════════════════════════════

useEffect(() => {
  const el = scrollRef.current
  if (!el) return
  function onScroll() {
    sonScrollRef.current = el.scrollTop
    // Aa paneli açıkken kullanıcı kaydırırsa font-ankorunu tazele (geri çekilecek satır güncel kalsın)
    if (aaAcikRef.current) fontAnkorRef.current = ustSatirYakala()
    const merkez = el.getBoundingClientRect().top + el.clientHeight / 2
    let bulunan = null
    for (const [no, ref] of Object.entries(sayfaRefs.current)) {
      if (!ref) continue
      const r = ref.getBoundingClientRect()
      if (r.top <= merkez && r.bottom >= merkez) { bulunan = Number(no); break }
      if (r.top <= merkez) bulunan = Number(no)
    }
    if (bulunan != null) {
      setMevcutSayfa(bulunan)
      maxSayfaGuncelle(bulunan)
      const ref = sayfaRefs.current[bulunan]
      if (ref) {
        const r = ref.getBoundingClientRect()
        const oran = Math.max(0, Math.min(1, (merkez - r.top) / Math.max(1, r.height)))
        sonKonumRef.current = { sayfa: bulunan, oran }
      }
    }
  }
  el.addEventListener("scroll", onScroll, { passive: true })
  onScroll()
  return () => el.removeEventListener("scroll", onScroll)
}, [yukleniyor, kitapMetni])

// Aa paneli açılınca üst satırı yakala (ref senkronu + ilk ankor)
useEffect(() => { aaAcikRef.current = aaAcik }, [aaAcik])
useEffect(() => { if (aaAcik) fontAnkorRef.current = ustSatirYakala() }, [aaAcik])

// İçindekiler menüsü açılınca son kaydırma konumuna dön (oturum içi hafıza)
useLayoutEffect(() => {
  if (menuAcik && menuListeRef.current) menuListeRef.current.scrollTop = menuScrollRef.current
}, [menuAcik])

// Font/boyut/aralık/hizalama değişince: reflow sonrası aynı satıra geri çek (paint öncesi)
const fontIlkRef = useRef(true)
useLayoutEffect(() => {
  if (fontIlkRef.current) { fontIlkRef.current = false; return }  // ilk mount: atla
  const ank = fontAnkorRef.current
  if (!ank) return
  ustSatirGeriYukle(ank)
  // Font-family DEĞİŞİMİNDE yeni font ASENKRON yüklenip metni yeniden akıtabilir → tek restore
  // yetmez. rAF + kısa timeout + fonts.ready ile birkaç kez geri çek (OtoFit/başlık de geç oturabilir).
  const rafId = requestAnimationFrame(() => ustSatirGeriYukle(ank))
  const t1 = setTimeout(() => ustSatirGeriYukle(ank), 90)
  const t2 = setTimeout(() => ustSatirGeriYukle(ank), 260)
  let iptal = false
  try { document.fonts && document.fonts.ready && document.fonts.ready.then(() => { if (!iptal) ustSatirGeriYukle(ank) }) } catch {}
  return () => { cancelAnimationFrame(rafId); clearTimeout(t1); clearTimeout(t2); iptal = true }
}, [yaziBoyutu, satirAraligi, harfAraligi, kelimeAraligi, hizalama, arapBoyutu, baslikBoyutu, fontSecimler])

// ── Son okuma konumu: çıkışta kaydet, açılışta geri dön (sistemi yormadan)
const konumKaydet = useCallback(() => {
  const k = sonKonumRef.current
  if (!k || !id) return
  try { localStorage.setItem(`vukuf_son_konum_${id}`, JSON.stringify(k)) } catch {}
}, [id])

// Arama/Tefeül'den mi gelindi? (bir kez oku, bayrağı temizle → yalnız bu kitapta göster)
useEffect(() => {
  try {
    const d = localStorage.getItem("vukuf-donus")
    if (d === "arama" || d === "tefeul") {
      setDonusTip(d)
      localStorage.removeItem("vukuf-donus")
    }
  } catch {}
}, [])

// Kaydetme: yalnız sekme gizlenince / sayfa kapanınca / bileşen sökülünce (scroll'da değil)
useEffect(() => {
  const gizlenince = () => { if (document.visibilityState === "hidden") konumKaydet() }
  window.addEventListener("pagehide", konumKaydet)
  document.addEventListener("visibilitychange", gizlenince)
  return () => {
    konumKaydet()
    window.removeEventListener("pagehide", konumKaydet)
    document.removeEventListener("visibilitychange", gizlenince)
  }
}, [konumKaydet])

// Açılışta: önce Arama'dan gelen hedef (varsa) → o satıra git + vurgula;
// yoksa son okuma konumuna dön. (yalnız bir kez, kitap yüklendikten sonra)
useEffect(() => {
  if (yukleniyor || !kitapMetni.length || konumYuklendiRef.current) return

  // 1) Arama hedefi (Arama.jsx'ten): kullanıcıya göstermeden o sonuca git
  let aramaHedef = null
  try { aramaHedef = JSON.parse(localStorage.getItem("vukuf-arama-hedef") || "null") } catch {}
  if (aramaHedef && aramaHedef.kitapId === id) {
    konumYuklendiRef.current = true
    try { localStorage.removeItem("vukuf-arama-hedef") } catch {}
    const sn = Math.min(Math.max(1, aramaHedef.sayfaNo || 1), kitapMetni.length)
    maxSayfaGuncelle(sn)
    setTimeout(() => {
      elemanaGit(sn,
        () => document.querySelector(`[data-satir="${sn}-${aramaHedef.satirIdx}"]`),
        0, false, (el) => aramaVurgula(sn, el, aramaHedef.aranan))
      okumayiGoster()   // hizalama oturdu → açılış örtüsü solar
    }, 200)
    return
  }

  // 1b) Kur'an atıfından "Okumaya dön" ile geri gelindiyse → tam KAYNAK SATIRA odaklan + işaretle
  let donusOdak = null
  try { donusOdak = JSON.parse(localStorage.getItem("vukuf-okuma-donus-odak") || "null") } catch {}
  if (donusOdak && donusOdak.kitapId === id && donusOdak.satirKey) {
    konumYuklendiRef.current = true
    try { localStorage.removeItem("vukuf-okuma-donus-odak") } catch {}
    const sn = Math.min(Math.max(1, donusOdak.sayfa || 1), kitapMetni.length)
    maxSayfaGuncelle(sn)
    setTimeout(() => {
      elemanaGit(sn,
        () => document.querySelector(`[data-satir="${donusOdak.satirKey}"]`),
        0, false, (el) => aramaVurgula(sn, el, "", true, true))   // satırın tamamını işaretle (Arapça bölüm dahil)
      okumayiGoster()
    }, 240)
    return
  }

  // 2) Son okuma konumu
  konumYuklendiRef.current = true
  let kayitli = null
  try { kayitli = JSON.parse(localStorage.getItem(`vukuf_son_konum_${id}`) || "null") } catch {}
  if (kayitli && kayitli.sayfa > 1 || (kayitli && kayitli.oran > 0.02)) {
    const hedef = Math.min(Math.max(1, kayitli.sayfa || 1), kitapMetni.length)
    maxSayfaGuncelle(hedef)   // üstteki sayfalar hafif render → yukarı kaydırma sıçramaz
    setTimeout(() => { sayfayaGit(hedef, kayitli.oran || 0); okumayiGoster() }, 160)
  } else {
    okumayiGoster()   // hedef yok (baştan) → hemen aç
  }
}, [yukleniyor, kitapMetni, id])

// Güvenlik: içerik en geç bu süre içinde görünür olsun
useEffect(() => {
  if (yukleniyor) return
  const t = setTimeout(okumayiGoster, 1500)
  return () => clearTimeout(t)
}, [yukleniyor, okumayiGoster])

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
  // İlk oturum: varsayılan Türkçe+Arapça fontları zorla yükle ve kalıcı kaydet.
  if (ilkOturumRef.current) {
    fontYukle("bookerly"); fontYukle("kfgqpc")
    try { localStorage.setItem("vukuf-fontlar", JSON.stringify({ turkce: "bookerly", osmanlica: null, arapca: "kfgqpc" })) } catch {}
    ilkOturumRef.current = false
  }
  Object.values(fontSecimler).forEach(fid => { if (fid) fontYukle(fid) })
  // MeQuran'ı HER durumda yükle: kfgqpc/Indopak yedek zincirindeki 'me_quran' adı çözülebilsin
  // (eksik işaretler MeQuran'dan gelsin; yüklü değilse tarayıcı doğrudan serif'e düşerdi).
  fontYukle("me-quran")
}, [fontSecimler, evradKitabiMi])

// ════════════════════════════════════════════════════
// Metin içi arama
// ════════════════════════════════════════════════════

useEffect(() => {
  if (!aramaMetni.trim() || !kitapMetni.length) { setAramaEslesmeler([]); return }
  // tamArama: birebir (büyük/küçük + şapka/aksan duyarlı); değilse trLower ile normalize
  const aranan = tamArama ? aramaMetni : trLower(aramaMetni)
  const eslesmeler = []
  for (const sayfa of kitapMetni) {
    const satirlar = sayfa.metin.split("\n")
    for (let si = 0; si < satirlar.length; si++) {
      const satir = satirlar[si].replace(/^⟦C⟧/, "")
      if (satir.startsWith("§")) continue
      const idx = (tamArama ? satir : trLower(satir)).indexOf(aranan)
      if (idx === -1) continue
      const bas = Math.max(0, idx - 30)
      const son = idx + aranan.length + 50
      const onizleme = (bas > 0 ? "…" : "") + satir.slice(bas, son).trim() + (satir.length > son ? "…" : "")
      eslesmeler.push({ sayfaNo: sayfa.sayfa, satirIdx: si, onizleme })
      if (eslesmeler.length >= 300) break
    }
    if (eslesmeler.length >= 300) break
  }
  setAramaEslesmeler(eslesmeler)
  setAramaIndeks(0)
}, [aramaMetni, kitapMetni, tamArama])

useEffect(() => { localStorage.setItem("vukuf-yazi-boyutu", yaziBoyutu) }, [yaziBoyutu])
useEffect(() => { localStorage.setItem("vukuf-satir-araligi", satirAraligi) }, [satirAraligi])
useEffect(() => { localStorage.setItem("vukuf-harf-araligi", harfAraligi) }, [harfAraligi])
useEffect(() => { localStorage.setItem("vukuf-kelime-araligi", kelimeAraligi) }, [kelimeAraligi])
useEffect(() => { localStorage.setItem("vukuf-hizalama", hizalama) }, [hizalama])
useEffect(() => { localStorage.setItem("vukuf-arap-boyutu", String(arapBoyutu)) }, [arapBoyutu])
useEffect(() => { localStorage.setItem("vukuf-baslik-boyutu", String(baslikBoyutu)) }, [baslikBoyutu])
useEffect(() => { localStorage.setItem("vukuf-fontlar", JSON.stringify(fontSecimler)) }, [fontSecimler])
useEffect(() => { localStorage.setItem("vukuf-bar-konum", barKonum) }, [barKonum])
// Bar yüksekliğini ölç (safe-area padding dahil offsetHeight); dönme/yeniden boyutta güncelle
useLayoutEffect(() => {
  const el = barRef.current
  if (!el) return
  const olc = () => {
    const h = el.offsetHeight; if (h) setBarYuk(prev => (Math.abs(prev - h) > 1 ? h : prev))
    // Sarma tespiti + DENGELİ DAĞITIM (barSatirOlc). Doğal sarma 1. satırı tıka basa doldurup
    // 2. satırı neredeyse boş bırakıyordu. Bunun yerine gereken satır sayısı bulunur ve öğeler
    // satır genişlikleri birbirine en yakın olacak biçimde bölünür; kırma noktalarına tam
    // genişlikte, yüksekliksiz görünmez ayraç konur.
    const { cokSatir, kes } = barSatirOlc(el)
    setBarCokSatir(cokSatir)
    setBarSatirKes(p => (p.length === kes.length && p.every((v, i) => v === kes[i]) ? p : kes))
  }
  barOlcRef.current = olc
  olc()
  let ro
  try { ro = new ResizeObserver(olc); ro.observe(el) } catch {}
  window.addEventListener("resize", olc); window.addEventListener("orientationchange", olc)
  // Fontlar yüklenince yeniden ölç (metin metrikleri değişip barı büyütebilir) —
  // sonra padding geçişini AÇ. Böylece açılıştaki ölçüm düzeltmesi animasyonsuz olur:
  // içerik "boşluklu açılıp sonra kayma" yapmaz; geçiş yalnız bar göster/gizle için kalır.
  let zaman
  const gecisiAc = () => setGecisHazir(true)
  if (typeof document !== "undefined" && document.fonts && document.fonts.ready) {
    document.fonts.ready.then(() => { olc(); zaman = setTimeout(gecisiAc, 80) }).catch(() => { zaman = setTimeout(gecisiAc, 400) })
  } else {
    zaman = setTimeout(gecisiAc, 400)
  }
  return () => { try { ro && ro.disconnect() } catch {}; window.removeEventListener("resize", olc); window.removeEventListener("orientationchange", olc); if (zaman) clearTimeout(zaman) }
}, [barKonum, isMobile, barUiOlcegi])

// Bar yüksekliği DEĞİŞMEDEN buton seti/sırası/metni değişebilir (sade mod, kısım adı,
// süre...). ResizeObserver bunu görmez. KuranOkuma ile AYNI yapı: bağımlılıksız layout
// effect her render'dan sonra ölçer. Sonuç aynıysa state referansı korunur → döngü olmaz.
useLayoutEffect(() => {
  if (barOlcRef.current) barOlcRef.current()
  const id = requestAnimationFrame(() => { try { barOlcRef.current && barOlcRef.current() } catch {} })
  return () => cancelAnimationFrame(id)
})

// Ekran döndürülünce aynı sayfada kal (px scroll konumu farklı sayfaya denk gelmesin)
const mevcutSayfaRef = useRef(1)
useEffect(() => { mevcutSayfaRef.current = mevcutSayfa }, [mevcutSayfa])
useEffect(() => {
  let zaman
  const donunce = () => {
    const hedef = mevcutSayfaRef.current
    clearTimeout(zaman)
    zaman = setTimeout(() => { try { sayfayaGit(hedef, 0) } catch {} }, 350)
  }
  window.addEventListener("orientationchange", donunce)
  return () => { window.removeEventListener("orientationchange", donunce); clearTimeout(zaman) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [])
useEffect(() => { localStorage.setItem("vukuf-otomatik-gizleme", otomatikGizleme) }, [otomatikGizleme])
useEffect(() => { localStorage.setItem("vukuf-gizleme-suresi", gizlemeSuresi) }, [gizlemeSuresi])
useEffect(() => { localStorage.setItem("vukuf-sade-mode", sadeMode) }, [sadeMode])
useEffect(() => { localStorage.setItem("vukuf-bar-ui-olcegi", String(barUiOlcegi)) }, [barUiOlcegi])
useEffect(() => { localStorage.setItem("vukuf-bilgi-olcegi", String(bilgiOlcegi)) }, [bilgiOlcegi])
useEffect(() => { localStorage.setItem("vukuf-sayfa-gosterim", sayfaGosterim) }, [sayfaGosterim])
useEffect(() => { localStorage.setItem("vukuf-arapca-renk", arapcaRenk || "") }, [arapcaRenk])
useEffect(() => { localStorage.setItem("vukuf-lugat-renk", lugatRenkOzel || "") }, [lugatRenkOzel])
useEffect(() => { localStorage.setItem("vukuf-bar-gorunur", JSON.stringify(ogeGorunur)) }, [ogeGorunur])
useEffect(() => { localStorage.setItem("vukuf-bar-sade", JSON.stringify(ogeSade)) }, [ogeSade])


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
  // İşaret ekleme modu: tıklanan konumu kaydet
  if (kayitKonumModu) { kayitKonumSec(e); return }
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
  setMenuAcik(false)
}

function togglePanel(setter, deger) {
  tumPanelleriKapat()
  setter(deger)
}

// ════════════════════════════════════════════════════
// Yardımcı işlemler
// ════════════════════════════════════════════════════

// Fren efektli kaydırma çekirdeği: hedefTop() her karede yeniden ölçülür
// (lazy mount yüksekliği değiştirir). Yerleşince onSettle() çağrılır.
// Anında zıpla + lazy-mount ölçümleri oturana kadar sessizce düzelt, sonra tek
// kısa smooth = fren. Yerleşince onSettle() bir kez çağrılır.
function frenKaydir(hedefTop, onSettle) {
  const el = scrollRef.current
  if (!el) return
  el.scrollTop = hedefTop()      // 1) anında zıpla
  let bitti = false, sabit = 0, adim = 0
  const tamamla = () => { if (onSettle) requestAnimationFrame(() => requestAnimationFrame(onSettle)) }
  const bitir = (fark) => {
    if (bitti) return
    bitti = true
    if (Math.abs(fark) > 3) { el.scrollTo({ top: el.scrollTop + fark, behavior: "smooth" }); setTimeout(tamamla, 280) }
    else tamamla()
  }
  const otur = () => {
    if (bitti || ++adim > 40) return bitir(0)
    const fark = hedefTop() - el.scrollTop
    if (Math.abs(fark) <= 2) { if (++sabit >= 3) return bitir(0); return requestAnimationFrame(otur) }
    sabit = 0
    if (Math.abs(fark) > 80) { el.scrollTop = hedefTop(); requestAnimationFrame(otur) }
    else bitir(fark)
  }
  requestAnimationFrame(otur)
}

function sayfayaGit(sayfaNo, oran = 0, ekstra = 0) {
  setSayfaGitAcik(false)
  setSayfaGitInput("")
  const el = scrollRef.current
  if (!el) return
  const ofset = (barKonum === "ust" ? 80 : 12) + ekstra
  const hedefTop = () => {
    const ref = sayfaRefs.current[sayfaNo]
    if (!ref) return el.scrollTop
    const r = ref.getBoundingClientRect()
    const base = r.top - el.getBoundingClientRect().top + el.scrollTop
    return base + oran * (ref.offsetHeight || 0) - ofset
  }
  setMevcutSayfa(sayfaNo)
  maxSayfaGuncelle(sayfaNo)
  frenKaydir(hedefTop)
}

// Bir DOM elemanına tam git (başlık/vurgu). cizgi=false ise odak çizgisi çizilmez.
// Tek fren döngüsü kullanır -> fazladan scroll olmaz; eleman gerçek konumundan hizalanır.
function elemanaGit(sayfaNo, selectorFn, fallbackOran = 0, cizgi = true, onLand = null) {
  const el = scrollRef.current
  if (!el) return
  setMevcutSayfa(sayfaNo)
  maxSayfaGuncelle(sayfaNo)
  // Üst bar hedefi örtmesin: sabit değil, ölçülen bar yüksekliği + pay kadar aşağı hizala.
  const ofset = barKonum === "ust" ? (barGorunur ? barYuk + 80 : 0) : 4

  // Önce sayfaya yaklaş ki lazy mount tetiklensin (henüz fren yok)
  const ref0 = sayfaRefs.current[sayfaNo]
  if (ref0) {
    const r = ref0.getBoundingClientRect()
    el.scrollTop = r.top - el.getBoundingClientRect().top + el.scrollTop + fallbackOran * (ref0.offsetHeight || 0) - ofset
  }

  let adim = 0
  const dene = () => {
    const hedef = selectorFn()
    if (!hedef) {
      if (adim++ < 25) { setTimeout(dene, 90); return }
      return sayfayaGit(sayfaNo, fallbackOran)   // eleman bulunamadı -> yaklaşık oran
    }
    const hedefTop = () => hedef.getBoundingClientRect().top - el.getBoundingClientRect().top + el.scrollTop - ofset
    frenKaydir(hedefTop, () => {
      const pref = sayfaRefs.current[sayfaNo]
      if (pref) {
        const o = (hedef.getBoundingClientRect().top - pref.getBoundingClientRect().top) / Math.max(1, pref.offsetHeight)
        odakAyarla(sayfaNo, Math.max(0, Math.min(1, o)), cizgi)
      }
      if (onLand) onLand(hedef)
    })
  }
  setTimeout(dene, 60)
}

// Bulunan öğede aranan metni seçili gibi vurgula (kutular sayfaya göre konumlanır) +
// kelime görünür değilse ona kaydır. Kısa süre sonra söner.
function aramaVurgula(sayfaNo, el, aranan, altCizgi = true, tumEleman = false) {
  const sc = scrollRef.current, pref = sayfaRefs.current[sayfaNo]
  if (!el || !sc || !pref) return
  // tumEleman: başlık gibi hedeflerde SATIRIN TAMAMINI işaretle → 2 satıra sarıyorsa
  // (görünen 2. satır dahil) her satır için ayrı kutu çıkar, alt satır boş kalmaz.
  let r = tumEleman ? null : araliktaBul(el, aranan)
  if (!r) { r = document.createRange(); r.selectNodeContents(el) }
  const rects = Array.from(r.getClientRects())
  if (!rects.length) return
  const prefRect = pref.getBoundingClientRect()
  // Aynı SATIRDAKİ parça kutuları TEK sürekli kutuda birleştir (kelime araları/boşluk dahil):
  // getClientRects kelime başına ayrı rect verebiliyor → aralarda boşluk + dikey çizgi kalıyordu.
  // Dikey olarak çakışan rect'ler aynı satır sayılır; sarma varsa satır başına ayrı kutu kalır.
  const gruplar = []
  for (const rc of rects) {
    if (rc.width <= 0 || rc.height <= 0) continue
    const mY = rc.top + rc.height / 2
    let g = gruplar.find(x => mY > x.top && mY < x.bottom)
    if (!g) gruplar.push({ top: rc.top, bottom: rc.bottom, left: rc.left, right: rc.right })
    else {
      g.top = Math.min(g.top, rc.top); g.bottom = Math.max(g.bottom, rc.bottom)
      g.left = Math.min(g.left, rc.left); g.right = Math.max(g.right, rc.right)
    }
  }
  const kutular = gruplar.map(g => ({
    top: g.top - prefRect.top, left: g.left - prefRect.left, width: g.right - g.left, height: g.bottom - g.top,
  }))
  // kelime görünüm dışında/çok yukarıdaysa ona doğru ince ayar kaydır
  // Üst bar hedefi örtmesin: ölçülen bar yüksekliği + pay (sabit 110 çentik+2 satırda yetmiyordu).
  const ofset = barKonum === "ust" ? (barGorunur ? barYuk + 24 : 24) : 60
  const scRect = sc.getBoundingClientRect()
  const rTop = rects[0].top - scRect.top
  if (rTop < ofset || rTop > sc.clientHeight * 0.65) {
    sc.scrollTo({ top: rects[0].top - scRect.top + sc.scrollTop - ofset, behavior: "smooth" })
  }
  if (aramaZamanRef.current) clearTimeout(aramaZamanRef.current)
  setAramaVurgu({ sayfa: sayfaNo, kutular, altCizgi, nonce: Date.now() })
  aramaZamanRef.current = setTimeout(() => setAramaVurgu(null), 3600)
}

// Odak işaretini (çizgi/ayraç) ayarla
function odakAyarla(sayfaNo, oran, cizgi = true) {
  if (odakZamanRef.current) clearTimeout(odakZamanRef.current)
  setOdakKonum({ sayfa: sayfaNo, oran, cizgi, nonce: Date.now() })
  odakZamanRef.current = setTimeout(() => setOdakKonum(null), 2600)
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

function notGuncelle(sayfaNo, notId, yeniMetin) {
  const yeni = { ...notlar, [sayfaNo]: (notlar[sayfaNo] || []).map(n => n.id === notId ? { ...n, metin: yeniMetin } : n) }
  setNotlar(yeni); notlariKaydet(id, yeni)
}

// Aynı renkli, bitişik/örtüşen vurguları tek parçaya birleştir
function mergeVurgular(list) {
  const lin = (p) => p.satir * 100000 + p.kelime
  const arr = list.map(v => ({ ...v, s: lin(v.baslangic), e: lin(v.bitis) })).sort((a, b) => a.s - b.s)
  const out = []
  for (const v of arr) {
    const last = out[out.length - 1]
    if (last && v.renk === last.renk && v.s <= last.e + 1) {
      if (v.e > last.e) { last.e = v.e; last.bitis = v.bitis }
      if (!last.isim && v.isim) last.isim = v.isim
    } else {
      out.push({ ...v })
    }
  }
  return out.map(v => ({ id: v.id, renk: v.renk, baslangic: v.baslangic, bitis: v.bitis, isim: v.isim || "" }))
}

function vurguEkle(sayfaNo, baslangic, bitis, renk) {
  const birlesik = mergeVurgular([...(vurgular[sayfaNo] || []), { id: Date.now(), baslangic, bitis, renk, isim: "" }])
  const yeni = { ...vurgular, [sayfaNo]: birlesik }
  setVurgular(yeni); vurguKaydet(id, yeni)
}

function vurguGuncelle(sayfaNo, vurguId, isim) {
  const yeni = { ...vurgular, [sayfaNo]: (vurgular[sayfaNo] || []).map(v => v.id === vurguId ? { ...v, isim } : v) }
  setVurgular(yeni); vurguKaydet(id, yeni)
}

// Tek kelimeyi vurgudan çıkar (gerekiyorsa bloğu böl)
function vurguKelimeSil(sayfaNo, satir, kelime) {
  const lin = (s, k) => s * 100000 + k
  const konum = (pos) => ({ satir: Math.floor(pos / 100000), kelime: pos % 100000 })
  const p = lin(satir, kelime)
  const liste = vurgular[sayfaNo] || []
  const hedef = liste.find(v => {
    const s = lin(v.baslangic.satir, v.baslangic.kelime)
    const e = lin(v.bitis.satir, v.bitis.kelime)
    return p >= s && p <= e
  })
  if (!hedef) return
  const s = lin(hedef.baslangic.satir, hedef.baslangic.kelime)
  const e = lin(hedef.bitis.satir, hedef.bitis.kelime)
  const parcalar = []
  if (p > s) parcalar.push({ id: `${Date.now()}a`, renk: hedef.renk, isim: hedef.isim || "", baslangic: hedef.baslangic, bitis: konum(p - 1) })
  if (p < e) parcalar.push({ id: `${Date.now()}b`, renk: hedef.renk, isim: "", baslangic: konum(p + 1), bitis: hedef.bitis })
  const kalan = liste.filter(v => v.id !== hedef.id).concat(parcalar)
  const yeni = { ...vurgular, [sayfaNo]: kalan }
  if (!yeni[sayfaNo].length) delete yeni[sayfaNo]
  setVurgular(yeni); vurguKaydet(id, yeni)
}

function vurguSil(sayfaNo, vurguId) {
  const yeni = { ...vurgular, [sayfaNo]: (vurgular[sayfaNo] || []).filter(v => v.id !== vurguId) }
  if (!yeni[sayfaNo]?.length) delete yeni[sayfaNo]
  setVurgular(yeni); vurguKaydet(id, yeni)
}

function vurguTumSil() {
  setVurgular({}); vurguKaydet(id, {})
}

function notTumSil() {
  setNotlar({}); notlariKaydet(id, {})
}

// ── Konum-bazlı işaretler (kayıtlar)
function kayitlariKaydet(list) {
  localStorage.setItem(`vukuf_kayitlar_${id}`, JSON.stringify(list))
}
function kayitEkle(sayfaNo, oran, baslik) {
  const yeni = [...kayitlar, {
    id: Date.now().toString(), sayfa: sayfaNo,
    oran: Math.max(0, Math.min(1, oran)),
    baslik: baslik || `Sayfa ${sayfaNo}`, olusturma: Date.now(),
  }]
  setKayitlar(yeni); kayitlariKaydet(yeni)
}
function kayitSil(kayitId) {
  const yeni = kayitlar.filter(k => k.id !== kayitId)
  setKayitlar(yeni); kayitlariKaydet(yeni)
}
function kayitTumSil() {
  setKayitlar([]); kayitlariKaydet([])
}

// Bir konuma git + odak (focus) efekti
// Genel odak git. opt.cizgi === false -> çizgi yerine yalnız ayraç döner (kayıt git).
function odakGit(sayfaNo, oran = 0, opt = {}) {
  sayfayaGit(sayfaNo, oran, opt.ekstra || 0)
  odakAyarla(sayfaNo, oran, opt.cizgi !== false)
}

// İçindekiler'den git. Ana başlık → #baslik + odak çizgisi. Alt başlık → başlığı
// ham METİNDE (arama mantığıyla) bulup satır indeksini çıkar, [data-satir]'a git ve
// kelime araması gibi (alt çizgisiz) işaretle.
function basligaGit(sayfa, satir, oran = 0, baslikMetni = "", seviye = 1, aciklama = "") {
  setMenuAcik(false)
  const anaBaslik = (seviye || 1) <= 1

  // Hedef satır indeksini belirle: extractor verdiyse onu; yoksa metinde başlığı ara.
  // Başlık gövdede geçmiyorsa AÇIKLAMA ile ara (ör. "Mülk Suresi" yok → aciklama "Tebareke").
  let hedefSatir = satir
  let mektupOdak = false
  let bulunanTerim = baslikMetni
  if (hedefSatir == null) {
    const sf = kitapMetni.find(s => s.sayfa === sayfa)
    if (sf) {
      const norm = (s) => trLower(s || "").replace(/⟦[^⟧]*⟧/g, "").replace(/\[\d+\]/g, "").replace(/\s+/g, " ").trim()
      const satirlar = sf.metin.split("\n")
      const ara = (terim) => {
        if (!terim) return -1
        const hedef = norm(terim)
        if (!hedef) return -1
        const mm = terim.match(/(\d+)\s*\.\s*mektup/i)
        const mektupRe = mm ? new RegExp(`^-\\s*${mm[1]}\\s*-$`) : null
        for (let i = 0; i < satirlar.length; i++) {
          if (satirlar[i].startsWith("§")) continue
          if (mektupRe && mektupRe.test(satirlar[i].replace(/⟦C⟧/g, "").trim())) { mektupOdak = true; return i }
          const ln = norm(satirlar[i])
          if (!ln) continue
          if (ln === hedef || ln.startsWith(hedef) || (hedef.length >= 6 && ln.includes(hedef))) return i
        }
        return -1
      }
      let r = ara(baslikMetni)
      if (r < 0 && aciklama) { r = ara(aciklama); if (r >= 0) bulunanTerim = aciklama }
      if (r >= 0) hedefSatir = r
    }
  }

  const sel = () => (hedefSatir == null ? null :
    (document.getElementById(`baslik-${sayfa}-${hedefSatir}`) ||
     document.querySelector(`[data-satir="${sayfa}-${hedefSatir}"]`)))

  const odakla = anaBaslik || mektupOdak   // mektup ayracı: satır başını üste odakla (vurgu arama yok)
  elemanaGit(sayfa, sel, oran,
    odakla,                                               // ana başlık / mektup: odak çizgisi
    odakla ? null : (el) => aramaVurgula(sayfa, el, bulunanTerim, false, true)) // alt başlık: SATIRIN TAMAMINI vurgula (2 satır sarıyorsa alt satır dahil)
}

// Popup'taki ayet atfına git: hedefi+dönüşü sakla, Kur'an Okuma'yı aç (üstte "Okumaya dön" çıkar)
function ayeteGit(atif) {
  try {
    localStorage.setItem("vukuf-kuran-hedef", JSON.stringify({ sureNo: atif.sureNo, ayetNo: atif.ayetNo }))
    localStorage.setItem("vukuf-donus", "okuma")
    localStorage.setItem("vukuf-donus-yol", `/kitap/${id}`)
    // Geri dönüşte tam kaynağa odaklan
    if (atifKaynakRef.current && atifKaynakRef.current.satirKey)
      localStorage.setItem("vukuf-okuma-donus-odak", JSON.stringify({ kitapId: id, ...atifKaynakRef.current }))
    else
      localStorage.removeItem("vukuf-okuma-donus-odak")
  } catch {}
  setPopup(null); setDipnotPopup(null)
  navigate("/kuran")
}
// Atıf ok(lar)ı — birden fazla sûre atfı varsa hepsi kompakt rozet olarak, göz yormadan
const atifOklari = (atiflar) => {
  if (!atiflar || !atiflar.length) return null
  return (
    <div style={{ marginTop: "10px", display: "flex", flexWrap: "wrap", gap: "6px" }}>
      {atiflar.map((a, i) => (
        <button key={i} onClick={() => ayeteGit(a)} title={`${a.ad ? a.ad + " " : ""}${a.sureNo}:${a.ayetNo} âyetine git`}
          style={{ display: "flex", alignItems: "center", gap: "5px", background: `${theme.accent}18`, color: theme.accent,
            border: `1px solid ${theme.accent}40`, borderRadius: "20px", padding: "5px 11px", fontSize: "12px", fontWeight: 500, cursor: "pointer" }}>
          <ArrowRight size={13} /> {a.ad || "Âyet"} {a.sureNo}:{a.ayetNo}
        </button>
      ))}
    </div>
  )
}

// Vurguya git — vurgulanan ilk kelimenin DOM konumuna ([data-vurgu]) tam hizala
function vurguGit(sayfaNo, v) {
  const sf = kitapMetni.find(s => s.sayfa === sayfaNo)
  const satirSayisi = sf ? Math.max(1, sf.metin.split("\n").length) : 1
  const oran = Math.max(0, Math.min(0.95, (v?.baslangic?.satir || 0) / satirSayisi))
  if (v?.id != null) {
    elemanaGit(sayfaNo, () => document.querySelector(`[data-vurgu="${v.id}"]`), oran, true)
  } else {
    odakGit(sayfaNo, oran)
  }
}

// Ekrandan konum seçilince işaret oluştur
function kayitKonumSec(e) {
  const el = scrollRef.current
  if (!el) { setKayitKonumModu(false); return }
  const y = e.clientY
  let secilenSayfa = null, oran = 0
  for (const [no, ref] of Object.entries(sayfaRefs.current)) {
    if (!ref) continue
    const r = ref.getBoundingClientRect()
    if (y >= r.top && y <= r.bottom) {
      secilenSayfa = Number(no)
      oran = (y - r.top) / Math.max(1, r.height)
      break
    }
  }
  if (secilenSayfa == null) secilenSayfa = mevcutSayfa
  kayitEkle(secilenSayfa, oran, `Sayfa ${secilenSayfa}`)
  setKayitKonumModu(false)
}

function fontSecimDegistir(grupId, fontId) {
  setFontSecimler(prev => ({ ...prev, [grupId]: fontId }))
  // Arapça fontu elle seçildi → Evrad'daki Me Quran kilidini kaldır (seçim her yerde geçerli)
  if (grupId === "arapca") { setArapcaElle(true); try { localStorage.setItem("vukuf-arapca-elle", "1") } catch {} }
}

function kelimeTikla(kelime, anlam, kavram, e, secenekler = null) {
  atifKaynakYakala(e)   // atıf için tıklanan satırı hatırla
  // Konum TIKLAMA noktasına göre değil, KELİMENİN kutusuna göre (rect); yerlesimEfekti ölçüp yerleştirir
  let rect = null
  try { const rr = e?.currentTarget?.getBoundingClientRect?.(); if (rr) rect = { top: rr.top, bottom: rr.bottom, left: rr.left, width: rr.width } } catch {}
  const pw = Math.min(300, window.innerWidth * 0.92)
  let x = 10, y = 60
  if (rect) { x = Math.max(8, Math.min(rect.left + rect.width / 2 - pw / 2, window.innerWidth - pw - 8)); y = rect.bottom + 8 }
  setPopupKavramAcik(false)
  setPopup({ kelime, anlam, kavram, secenekler, rect, x, y, yerlesti: !rect })   // rect yoksa doğrudan göster
}

function dipnotTikla(metin, e, etiket = "DİPNOT") {
  atifKaynakYakala(e)   // atıf için tıklanan satırı hatırla
  const gx = e?.clientX ?? window.innerWidth / 2
  const gy = e?.clientY ?? window.innerHeight / 2
  const x = Math.max(10, Math.min(gx - 150, window.innerWidth - 310))
  const y = gy + 12 + 260 > window.innerHeight ? Math.max(10, gy - 260) : gy + 12
  setDipnotPopup({ metin, x, y, etiket })
}

// Toplam sayılar
const toplamNot   = Object.values(notlar).reduce((a, arr) => a + arr.length, 0)
const toplamVurgu = Object.values(vurgular).reduce((a, arr) => a + arr.length, 0)
const toplamKayit = kayitlar.length + toplamNot + toplamVurgu

// ════════════════════════════════════════════════════
// Erken dönüş
// ════════════════════════════════════════════════════

if (!kitap)     return <div style={{ padding: "40px", color: theme.text }}>Kitap bulunamadı.</div>
if (kitap.id === "kuran") return <KuranOkuma kitap={kitap} />
if (yukleniyor) return <YuklemeEkrani theme={theme} yukseklik="100vh" />

// ════════════════════════════════════════════════════
// Ortak stiller
// ════════════════════════════════════════════════════

const barButonStil = (aktif = false) => ({
  color: theme.accent,
  display: "flex", alignItems: "center", gap: "4px",
  fontSize: `${Math.round(13 * barUiOlcegi)}px`,
  padding: `${Math.round(6 * barUiOlcegi)}px ${Math.round(8 * barUiOlcegi)}px`,
  borderRadius: "6px",
  background: aktif ? `${theme.accent}15` : "transparent",
  border: "none", cursor: "pointer",
})

// Bir bar öğesi görünür mü? (gizlenmemiş VE sade modda gizlenmeye ayarlı değil)
const gorunurMu = (key) => (ogeGorunur[key] !== false) && !(sadeMode && ogeSade[key])
// Bar ikon boyutu — arayüz ölçeğiyle orantılı
const bIkon = (n) => Math.round(n * barUiOlcegi)

// Mevcut sayfadaki kısım yolu (ana/alt başlık zinciri) — hook değil, düz hesap
const mevcutKisimYolu = (() => {
  if (!icindekiler || !icindekiler.length) return []
  const path = []
  for (const b of icindekiler) {
    if (b.sayfa > mevcutSayfa) break
    const sv = b.seviye || 1
    path[sv] = b
    path.length = sv + 1
  }
  return path.filter(Boolean)
})()
const mevcutKisim = mevcutKisimYolu.length ? mevcutKisimYolu[mevcutKisimYolu.length - 1] : null

// ── GÖRSEL OLUŞTUR: seçili metinden paylaşım görseli
// Kullanıcı metni parmağıyla seçer (uzun basıp tutamakları kaydırarak), sonra
// fotoğraf makinesi düğmesine basar. Seçim yoksa kısa bir yönlendirme gösterilir.
// Görsele girecek metnin AZAMİ uzunluğu. Bunun üstünde yazı okunmaz hâle geldiği için
// KIRPMA YAPILMAZ, panel AÇILMAZ: kullanıcıya daha kısa bir bölüm seçmesi söylenir.
const GORSEL_AZAMI = 900
// Uyarıyı göster ve 3,5 sn sonra kaldır (üst üste basılırsa sayaç sıfırlanır)
const gorselUyar = (tip, uzunluk) => {
  const mesaj = tip === "uzun"
    ? `Seçim çok uzun (${uzunluk} karakter). Görselde okunabilmesi için en fazla ${GORSEL_AZAMI} karakterlik bir bölüm seç.`
    : "Önce görsele koymak istediğin bölümü veya cümleyi seç, sonra bu düğmeye dokun."
  setGorselIpucu(mesaj)
  if (gorselIpucuTimerRef.current) clearTimeout(gorselIpucuTimerRef.current)
  gorselIpucuTimerRef.current = setTimeout(() => setGorselIpucu(null), 3500)
}
const gorselYap = () => {
  let sec = ""
  try { sec = String(window.getSelection ? window.getSelection().toString() : "") } catch { sec = "" }
  sec = sec.replace(/\s+/g, " ").trim()
  if (!sec) { gorselUyar("yok"); return }
  if (sec.length > GORSEL_AZAMI) { gorselUyar("uzun", sec.length); return }
  const yol = mevcutKisimYolu.map(b => b.baslik).join(" · ")
  setGorselVeri({
    metin: sec,
    kaynak: [kitap?.baslik || kitap?.isim, yol, `s. ${mevcutSayfa}`].filter(Boolean).join(" · "),
  })
  try { window.getSelection()?.removeAllRanges() } catch { /* yoksay */ }
}

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

      {/* TEK ÖNİZLEME — panelin üstünde sabit durur; aşağıdaki BÜTÜN ayarlar (boyutlar,
          aralıklar, hizalama, yazı tipleri) bunu anında değiştirir. Eskiden her ayarın
          altında ayrı bir önizleme vardı; menü kalabalıktı. */}
      <div style={{
        // Panelin kendi 12px padding'i olduğu için negatif marj + eşit padding ile
        // yapıştırılır; yoksa altından kayan yazı üst boşlukta görünüyordu.
        position: "sticky", top: "-12px", zIndex: 2,
        background: theme.surface,
        margin: "-12px -12px 12px", padding: "12px 12px 10px",
        borderBottom: `1px solid ${theme.border}`,
      }}>
        <div style={{ fontSize: "10px", color: theme.textSecondary, letterSpacing: "1px", marginBottom: "6px", opacity: 0.8 }}>
          ÖNİZLEME
        </div>
        <div style={{
          padding: "10px 12px", borderRadius: "9px",
          background: theme.background, border: `1px solid ${theme.border}`,
          overflow: "hidden",
        }}>
          <div style={{
            fontFamily: baslikFont || "inherit",
            fontSize: `${Math.round(Math.min(yaziBoyutu * baslikBoyutu, 34))}px`,
            textAlign: "center", color: theme.accent, fontWeight: 700, lineHeight: 1.2,
            marginBottom: "6px",
          }}>
            Örnek Başlık
          </div>
          <div style={{
            fontFamily: metinFont,
            fontSize: `${Math.min(yaziBoyutu, 26)}px`,
            lineHeight: satirAraligi, letterSpacing: `${harfAraligi}px`, wordSpacing: `${kelimeAraligi}px`,
            color: theme.text, textAlign: hizalama === "justify" ? "justify" : hizalama,
          }}>
            Bismillâh her hayrın başıdır.
          </div>
          <div style={{
            marginTop: "6px",
            fontFamily: arapcaFont || undefined,
            fontSize: `${Math.min(yaziBoyutu + arapBoyutu, 34)}px`,
            direction: "rtl", textAlign: "center", color: arapRenk, lineHeight: 1.9,
          }}>
            بِسْمِ اللّٰهِ الرَّحْمٰنِ الرَّحِيمِ
          </div>
        </div>
      </div>

      {/* YAZI BOYUTU */}
      <div style={{ fontSize: "11px", color: theme.textSecondary, marginBottom: "8px", letterSpacing: "1px" }}>YAZI BOYUTU</div>
      <div style={{ marginBottom: "16px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", color: theme.textSecondary, marginBottom: "6px" }}>
          <span>Küçük</span>
          <span style={{ color: theme.accent, fontWeight: "bold" }}>{yaziBoyutu}px</span>
          <span>Büyük</span>
        </div>
        <input type="range" min="14" max="40" step="1" value={yaziBoyutu}
          onChange={e => setYaziBoyutu(parseInt(e.target.value))}
          style={{ width: "100%", accentColor: theme.accent }} />
      </div>


      {/* ARAPÇA YAZI BOYUTU */}
      <div style={{ fontSize: "11px", color: theme.textSecondary, marginBottom: "8px", letterSpacing: "1px" }}>ARAPÇA YAZI BOYUTU</div>
      <div style={{ marginBottom: "16px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", color: theme.textSecondary, marginBottom: "6px" }}>
          <span>Küçük</span>
          <span style={{ color: theme.accent, fontWeight: "bold" }}>{yaziBoyutu + arapBoyutu}px</span>
          <span>Büyük</span>
        </div>
        <input type="range" min="-6" max="40" step="1" value={arapBoyutu}
          onChange={e => setArapBoyutu(parseInt(e.target.value))}
          style={{ width: "100%", accentColor: theme.accent }} />
      </div>

      {/* BAŞLIK BOYUTU */}
      <div style={{ fontSize: "11px", color: theme.textSecondary, marginBottom: "8px", letterSpacing: "1px" }}>BAŞLIK BOYUTU</div>
      <div style={{ marginBottom: "16px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", color: theme.textSecondary, marginBottom: "6px" }}>
          <span>Küçük</span>
          <span style={{ color: theme.accent, fontWeight: "bold" }}>{Math.round(yaziBoyutu * baslikBoyutu)}px</span>
          <span>Büyük</span>
        </div>
        <input type="range" min="1.2" max="3" step="0.1" value={baslikBoyutu}
          onChange={e => setBaslikBoyutu(parseFloat(e.target.value))}
          style={{ width: "100%", accentColor: theme.accent }} />
      </div>

      {/* SATIR ARALIĞI */}
      <div style={{ fontSize: "11px", color: theme.textSecondary, marginBottom: "8px", letterSpacing: "1px" }}>SATIR ARALIĞI</div>
      <div style={{ marginBottom: "16px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", color: theme.textSecondary, marginBottom: "6px" }}>
          <span>Sıkışık</span>
          <span style={{ color: theme.accent, fontWeight: "bold" }}>{satirAraligi.toFixed(1)}</span>
          <span>Geniş</span>
        </div>
        <input type="range" min="1.4" max="3" step="0.1" value={satirAraligi}
          onChange={e => setSatirAraligi(parseFloat(e.target.value))}
          style={{ width: "100%", accentColor: theme.accent }} />
      </div>

      {/* HARF ARALIĞI */}
      <div style={{ fontSize: "11px", color: theme.textSecondary, marginBottom: "8px", letterSpacing: "1px" }}>HARF ARALIĞI</div>
      <div style={{ marginBottom: "16px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", color: theme.textSecondary, marginBottom: "6px" }}>
          <span>Normal</span>
          <span style={{ color: theme.accent, fontWeight: "bold" }}>{harfAraligi.toFixed(1)}px</span>
          <span>Geniş</span>
        </div>
        <input type="range" min="0" max="2" step="0.1" value={harfAraligi}
          onChange={e => setHarfAraligi(parseFloat(e.target.value))}
          style={{ width: "100%", accentColor: theme.accent }} />
      </div>

      {/* KELİME ARALIĞI */}
      <div style={{ fontSize: "11px", color: theme.textSecondary, marginBottom: "8px", letterSpacing: "1px" }}>KELİME ARALIĞI</div>
      <div style={{ marginBottom: "16px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", color: theme.textSecondary, marginBottom: "6px" }}>
          <span>Normal</span>
          <span style={{ color: theme.accent, fontWeight: "bold" }}>{kelimeAraligi.toFixed(1)}px</span>
          <span>Geniş</span>
        </div>
        <input type="range" min="0" max="10" step="0.5" value={kelimeAraligi}
          onChange={e => setKelimeAraligi(parseFloat(e.target.value))}
          style={{ width: "100%", accentColor: theme.accent }} />
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

      {/* TAM GENİŞLİK — web + mobil */}
      <div
        onClick={tamGenislikDegis}
        role="button"
        aria-pressed={tamGenislik}
        style={{
          display: "flex", alignItems: "center", gap: "9px",
          padding: "9px 10px", marginBottom: "8px", borderRadius: "9px",
          cursor: "pointer", color: theme.text,
          background: tamGenislik ? `${theme.accent}12` : "transparent",
          border: `1px solid ${tamGenislik ? `${theme.accent}44` : theme.border}`,
        }}
      >
        <UnfoldHorizontal size={16} color={theme.accent} style={{ flexShrink: 0 }} />
        <span style={{ flex: 1, minWidth: 0 }}>
          <span style={{ display: "block", fontSize: "12px", fontWeight: 600 }}>Tam Genişlik</span>
          <span style={{ display: "block", fontSize: "11px", color: theme.textSecondary, lineHeight: 1.35 }}>
            Yazıyı ekran boyunca yayar, kenar boşluklarını kaldırır.
          </span>
        </span>
        <IosSwitch acik={tamGenislik} theme={theme} boyut={0.82} />
      </div>

      {/* KENAR BOŞLUĞU — Tam Genişlik'in tersi; ikisi birlikte açılamaz */}
      <div
        onClick={kenarBoslukDegis}
        role="button"
        aria-pressed={kenarBosluk}
        style={{
          display: "flex", alignItems: "center", gap: "9px",
          padding: "9px 10px", marginBottom: "16px", borderRadius: "9px",
          cursor: "pointer", color: theme.text,
          background: kenarBosluk ? `${theme.accent}12` : "transparent",
          border: `1px solid ${kenarBosluk ? `${theme.accent}44` : theme.border}`,
        }}
      >
        <FoldHorizontal size={16} color={theme.accent} style={{ flexShrink: 0 }} />
        <span style={{ flex: 1, minWidth: 0 }}>
          <span style={{ display: "block", fontSize: "12px", fontWeight: 600 }}>Kenar Boşluğu</span>
          <span style={{ display: "block", fontSize: "11px", color: theme.textSecondary, lineHeight: 1.35 }}>
            Yazı büyüse de kenarlarda boşluk kalır; metin ortada, satır takibi kolay.
          </span>
        </span>
        <IosSwitch acik={kenarBosluk} theme={theme} boyut={0.82} />
      </div>

      {/* YAZI TİPİ — açılır kapanır. column-reverse: liste düğmenin ÜSTÜNDE açılır
          (aşağı açılınca panelin altında kalıp görünmüyordu); açılışta görünür alana kaydırılır. */}
      <div style={{ display: "flex", flexDirection: "column-reverse" }}>
        <button
          ref={yaziTipiBtnRef}
          onClick={() => {
            const yeni = !yaziTipiAcik
            setYaziTipiAcik(yeni)
            // Liste YUKARI açıldığı için düğme panelin dibinde kalıyordu; açılışta
            // DÜĞMEYİ görünür alanın altına çek → hem liste hem "kapat" düğmesi görünsün.
            if (yeni) requestAnimationFrame(() => {
              try { yaziTipiBtnRef.current?.scrollIntoView({ block: "end", behavior: "smooth" }) } catch { /* yoksay */ }
            })
          }}
          style={{
            width: "100%", display: "flex", alignItems: "center", gap: "8px",
            padding: "9px 10px", borderRadius: "9px", cursor: "pointer",
            background: "transparent", border: `1px solid ${theme.border}`,
            color: theme.text, marginTop: yaziTipiAcik ? "8px" : "0",
          }}
        >
          <Feather size={15} color={theme.accent} style={{ flexShrink: 0 }} />
          <span style={{ flex: 1, minWidth: 0, textAlign: "left" }}>
            <span style={{ display: "block", fontSize: "10px", letterSpacing: "1px", color: theme.textSecondary }}>YAZI TİPİ</span>
            <span style={{ display: "block", fontSize: "12px", fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {fontBul(fontSecimler.turkce || fontSecimler.osmanlica || "bookerly").label || "Varsayılan"}
            </span>
          </span>
          {yaziTipiAcik ? <ChevronDown size={16} color={theme.textSecondary} /> : <ChevronUp size={16} color={theme.textSecondary} />}
        </button>
        <div style={{ display: yaziTipiAcik ? "block" : "none" }}>
          {Object.entries(FONT_GRUPLARI).filter(([grupId]) => grupId !== "osmanlica").map(([grupId, grup]) => (
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
      </div>
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
          { id: "isaretler", label: `İşaretler${kayitlar.length ? ` (${kayitlar.length})` : ""}` },
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
          <>
            <button onClick={() => { setKayitKonumModu(true); setKayitAcik(false) }} style={{
              width: "100%", marginBottom: "10px", padding: "9px", borderRadius: "8px",
              background: theme.accent, color: "#fff", border: "none", cursor: "pointer",
              fontSize: "13px", display: "flex", alignItems: "center", justifyContent: "center", gap: "6px",
            }}>
              <Bookmark size={14} /> Yeni işaret ekle
            </button>
            {kayitlar.length > 0 && (
              <OnayliSil label={`Tüm işaretleri sil (${kayitlar.length})`} onConfirm={kayitTumSil} theme={theme} />
            )}
            {kayitlar.length === 0
              ? <div style={{ color: theme.textSecondary, fontSize: "13px", textAlign: "center", padding: "16px 0", opacity: 0.6 }}>Henüz işaret eklenmedi</div>
              : kayitlar.slice().sort((a, b) => a.sayfa - b.sayfa || a.oran - b.oran).map(k => (
                <div key={k.id} style={{ display: "flex", alignItems: "center", gap: "8px", padding: "8px 10px", borderRadius: "8px", background: `${theme.accent}0A`, border: `1px solid ${theme.border}`, marginBottom: "6px" }}>
                  <Bookmark size={13} fill={theme.accent} color={theme.accent} />
                  <span style={{ flex: 1, fontSize: "13px", color: theme.text }}>{k.baslik}</span>
                  <button onClick={() => { odakGit(k.sayfa, k.oran || 0, { cizgi: false, ekstra: barKonum === "ust" ? (isMobile ? 30 : -8) : 20 }); setKayitAcik(false) }} title="İşarete git" style={{ fontSize: "11px", color: theme.accent, background: "none", border: "none", cursor: "pointer" }}><ChevronRight size={13} /></button>
                  <button onClick={() => kayitSil(k.id)} style={{ color: theme.textSecondary, background: "none", border: "none", cursor: "pointer" }}><X size={12} /></button>
                </div>
              ))
            }
          </>
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
            {toplamNot > 0 && (
              <OnayliSil label={`Tüm notları sil (${toplamNot})`} onConfirm={notTumSil} theme={theme} />
            )}
            {toplamNot === 0
              ? <div style={{ color: theme.textSecondary, fontSize: "13px", textAlign: "center", padding: "16px 0", opacity: 0.6 }}>Henüz not eklenmedi</div>
              : Object.entries(notlar).sort(([a], [b]) => Number(a) - Number(b)).map(([sayfaNo, sayfaNotlari]) => (
                <div key={sayfaNo} style={{ marginBottom: "12px" }}>
                  <div style={{ fontSize: "10px", color: theme.textSecondary, letterSpacing: "1px", marginBottom: "4px", display: "flex", alignItems: "center", gap: "6px" }}>
                    <div style={{ flex: 1, height: "1px", background: theme.border }} />
                    SAYFA {sayfaNo}
                    <button onClick={() => sayfayaGit(Number(sayfaNo))} style={{ color: theme.accent, background: "none", border: "none", cursor: "pointer", fontSize: "10px" }}><ChevronRight size={13} /></button>
                    <div style={{ flex: 1, height: "1px", background: theme.border }} />
                  </div>
                  {sayfaNotlari.map(not => (
                    <div key={not.id} style={{ display: "flex", gap: "8px", padding: "7px 10px", borderRadius: "8px", background: `${theme.accent}08`, border: `1px solid ${theme.border}`, marginBottom: "4px", alignItems: "center" }}>
                      {duzenleNot && duzenleNot.notId === not.id ? (
                        <>
                          <input value={duzenleNotMetni} autoFocus
                            onChange={e => setDuzenleNotMetni(e.target.value)}
                            onKeyDown={e => { if (e.key === "Enter") { notGuncelle(Number(sayfaNo), not.id, duzenleNotMetni.trim()); setDuzenleNot(null) } }}
                            style={{ flex: 1, padding: "5px 8px", borderRadius: "6px", border: `1px solid ${theme.border}`, background: theme.background, color: theme.text, fontSize: "12px", outline: "none" }} />
                          <button onClick={() => { notGuncelle(Number(sayfaNo), not.id, duzenleNotMetni.trim()); setDuzenleNot(null) }} style={{ color: theme.accent, background: "none", border: "none", cursor: "pointer", flexShrink: 0, fontSize: "11px" }}>Kaydet</button>
                        </>
                      ) : (
                        <>
                          <div style={{ flex: 1, fontSize: "12px", color: theme.text, lineHeight: "1.5" }}>{not.metin}</div>
                          <button onClick={() => { setDuzenleNot({ sayfaNo: Number(sayfaNo), notId: not.id }); setDuzenleNotMetni(not.metin) }} title="Düzenle" style={{ color: theme.textSecondary, background: "none", border: "none", cursor: "pointer", padding: "0", flexShrink: 0 }}><Pencil size={12} /></button>
                          <button onClick={() => notSil(Number(sayfaNo), not.id)} style={{ color: theme.textSecondary, background: "none", border: "none", cursor: "pointer", padding: "0", flexShrink: 0 }}><X size={12} /></button>
                        </>
                      )}
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
            : <>
              <OnayliSil label={`Tüm vurguları sil (${toplamVurgu})`} onConfirm={vurguTumSil} theme={theme} />
              {Object.entries(vurgular).sort(([a], [b]) => Number(a) - Number(b)).map(([sayfaNo, sayfaVurgulari]) => (
              <div key={sayfaNo} style={{ marginBottom: "12px" }}>
                <div style={{ fontSize: "10px", color: theme.textSecondary, letterSpacing: "1px", marginBottom: "4px", display: "flex", alignItems: "center", gap: "6px" }}>
                  <div style={{ flex: 1, height: "1px", background: theme.border }} />
                  SAYFA {sayfaNo}
                  <button onClick={() => sayfayaGit(Number(sayfaNo))} style={{ color: theme.accent, background: "none", border: "none", cursor: "pointer", fontSize: "10px" }}><ChevronRight size={13} /></button>
                  <div style={{ flex: 1, height: "1px", background: theme.border }} />
                </div>
                {sayfaVurgulari.map(v => (
                  <div key={v.id} style={{ display: "flex", alignItems: "center", gap: "8px", padding: "6px 10px", borderRadius: "8px", background: `${theme.accent}08`, border: `1px solid ${theme.border}`, marginBottom: "4px" }}>
                    <div style={{ width: "12px", height: "12px", borderRadius: "2px", background: v.renk, flexShrink: 0 }} />
                    {duzenleVurgu && duzenleVurgu.vurguId === v.id ? (
                      <>
                        <input value={duzenleVurguMetni} autoFocus
                          onChange={e => setDuzenleVurguMetni(e.target.value)}
                          onKeyDown={e => { if (e.key === "Enter") { vurguGuncelle(Number(sayfaNo), v.id, duzenleVurguMetni.trim()); setDuzenleVurgu(null) } }}
                          placeholder="Vurgu adı..."
                          style={{ flex: 1, padding: "4px 8px", borderRadius: "6px", border: `1px solid ${theme.border}`, background: theme.background, color: theme.text, fontSize: "12px", outline: "none" }} />
                        <button onClick={() => { vurguGuncelle(Number(sayfaNo), v.id, duzenleVurguMetni.trim()); setDuzenleVurgu(null) }} style={{ fontSize: "11px", color: theme.accent, background: "none", border: "none", cursor: "pointer" }}>Kaydet</button>
                      </>
                    ) : (
                      <>
                        <span style={{ flex: 1, fontSize: "12px", color: v.isim ? theme.text : theme.textSecondary }}>
                          {v.isim || `${v.baslangic.satir}:${v.baslangic.kelime} – ${v.bitis.satir}:${v.bitis.kelime}`}
                        </span>
                        <button onClick={() => { setDuzenleVurgu({ sayfaNo: Number(sayfaNo), vurguId: v.id }); setDuzenleVurguMetni(v.isim || "") }} title="İsim ver" style={{ color: theme.textSecondary, background: "none", border: "none", cursor: "pointer" }}><Pencil size={12} /></button>
                        <button onClick={() => { setVurguModu(true); setVurguDuzenle(true); vurguGit(Number(sayfaNo), v); setKayitAcik(false) }} title="Düzenle (kelime ekle/çıkar)" style={{ color: theme.textSecondary, background: "none", border: "none", cursor: "pointer" }}><Settings size={13} /></button>
                        <button onClick={() => { vurguGit(Number(sayfaNo), v); setKayitAcik(false) }} style={{ fontSize: "11px", color: theme.accent, background: "none", border: "none", cursor: "pointer" }}><ChevronRight size={13} /></button>
                        <button onClick={() => vurguSil(Number(sayfaNo), v.id)} style={{ color: theme.textSecondary, background: "none", border: "none", cursor: "pointer" }}><X size={12} /></button>
                      </>
                    )}
                  </div>
                ))}
              </div>
            ))}
            </>
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

      {/* Arapça harf rengi */}
      <div style={{ borderTop: `1px solid ${theme.border}`, marginTop: "10px", paddingTop: "10px" }}>
        <div style={{ fontSize: "11px", color: theme.textSecondary, marginBottom: "8px", letterSpacing: "1px" }}>ARAPÇA HARF RENGİ</div>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <input type="color" value={arapcaRenk || theme.arabicHighlight}
            onChange={e => setArapcaRenk(e.target.value)}
            style={{ width: "40px", height: "28px", border: `1px solid ${theme.border}`, borderRadius: "6px", background: theme.background, cursor: "pointer", padding: "2px" }} />
          <span style={{ flex: 1, fontSize: "12px", color: arapcaRenk || theme.arabicHighlight }}>بِسْمِ اللّٰه · Bismillâh</span>
          {arapcaRenk && (
            <button onClick={() => setArapcaRenk("")} title="Temaya sıfırla" style={{ fontSize: "11px", color: theme.textSecondary, background: "none", border: "none", cursor: "pointer" }}>Sıfırla</button>
          )}
        </div>
      </div>

      {/* Lügat (Latin) kelime rengi */}
      <div style={{ marginTop: "10px" }}>
        <div style={{ fontSize: "11px", color: theme.textSecondary, marginBottom: "8px", letterSpacing: "1px" }}>LÜGAT RENGİ</div>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <input type="color" value={lugatRenkOzel || theme.lugatHighlight}
            onChange={e => setLugatRenkOzel(e.target.value)}
            style={{ width: "40px", height: "28px", border: `1px solid ${theme.border}`, borderRadius: "6px", background: theme.background, cursor: "pointer", padding: "2px" }} />
          <span style={{ flex: 1, fontSize: "12px", color: lugatRenkOzel || theme.lugatHighlight }}>nasihat · hakikat</span>
          {lugatRenkOzel && (
            <button onClick={() => setLugatRenkOzel("")} title="Temaya sıfırla" style={{ fontSize: "11px", color: theme.textSecondary, background: "none", border: "none", cursor: "pointer" }}>Sıfırla</button>
          )}
        </div>
      </div>
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
        <div onClick={() => setOtomatikGizleme(!otomatikGizleme)} role="button" aria-pressed={otomatikGizleme} style={{
          width: "100%", padding: "7px 10px", borderRadius: "8px", fontSize: "13px",
          color: theme.text,
          cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px",
        }}>
          <span>Otomatik gizleme</span>
          <IosSwitch acik={otomatikGizleme} theme={theme} boyut={0.82} />
        </div>
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

      {/* Arayüz (bar) boyutu */}
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", color: theme.textSecondary, marginBottom: "6px", letterSpacing: "1px" }}>
          <span>ARAYÜZ BOYUTU</span>
          <span style={{ color: theme.accent, fontWeight: "bold" }}>{Math.round(barUiOlcegi * 100)}%</span>
        </div>
        <input type="range" min="0.8" max="1.3" step="0.05" value={barUiOlcegi}
          onChange={e => setBarUiOlcegi(parseFloat(e.target.value))}
          style={{ width: "100%", accentColor: theme.accent }}
        />
      </div>

      {/* Bilgi menüsü (hover/popup) boyutu */}
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", color: theme.textSecondary, marginBottom: "6px", letterSpacing: "1px" }}>
          <span>BİLGİ MENÜSÜ BOYUTU</span>
          <span style={{ color: theme.accent, fontWeight: "bold" }}>{Math.round(bilgiOlcegi * 100)}%</span>
        </div>
        <input type="range" min="0.85" max="1.6" step="0.05" value={bilgiOlcegi}
          onChange={e => setBilgiOlcegi(parseFloat(e.target.value))}
          style={{ width: "100%", accentColor: theme.accent }}
        />
      </div>

      {/* Görüntüle — bar öğelerini göster/gizle (açılır) */}
      <div>
        <button onClick={() => setGorunumAcik(v => !v)} style={{
          width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
          background: "transparent", border: "none", cursor: "pointer", padding: "2px 0",
          fontSize: "11px", color: theme.textSecondary, letterSpacing: "1px",
        }}>
          <span>GÖRÜNTÜLE</span>
          {gorunumAcik ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>
        {gorunumAcik && (
          <div style={{ marginTop: "8px" }}>
            <button
              onClick={() => setSiraAcik(true)}
              style={{
                width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
                gap: "8px", padding: "9px 10px", marginBottom: "10px",
                background: `${theme.accent}12`, border: `1px solid ${theme.accent}33`,
                borderRadius: "9px", cursor: "pointer", color: theme.text, fontSize: "12px",
              }}
            >
              <span style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <GripVertical size={15} color={theme.accent} />
                Buton Sıralaması
              </span>
              <ChevronRight size={15} color={theme.textSecondary} />
            </button>
            {BAR_OGELERI.map(o => (
              <AyarToggle key={o.key} etiket={o.label} theme={theme}
                aktif={ogeGorunur[o.key] !== false}
                onToggle={() => setOgeGorunur(p => ({ ...p, [o.key]: (p[o.key] === false) }))}
              />
            ))}
          </div>
        )}
      </div>

      {/* Sade Mod içeriği — sade modda gizlenecek öğeler (açılır) */}
      <div>
        <button onClick={() => setSadeIcerikAcik(v => !v)} style={{
          width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
          background: "transparent", border: "none", cursor: "pointer", padding: "2px 0",
          fontSize: "11px", color: theme.textSecondary, letterSpacing: "1px",
        }}>
          <span>SADE MOD İÇERİKLERİ</span>
          {sadeIcerikAcik ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>
        {sadeIcerikAcik && (
          <div style={{ marginTop: "8px" }}>
            {/* Düz mantık: anahtar AÇIK = öğe sade modda GÖSTERİLİR. ogeSade[key]=true "gizli"
                anlamına geldiği için anahtar bunun TERSİ (gösteriliyor mu). */}
            {BAR_OGELERI.map(o => (
              <AyarToggle key={o.key} etiket={o.label} theme={theme}
                aktif={!ogeSade[o.key]}
                onToggle={() => setOgeSade(p => ({ ...p, [o.key]: !p[o.key] }))}
              />
            ))}
          </div>
        )}
      </div>
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
        <button onClick={() => setTamArama(v => !v)} title={tamArama ? "Birebir arama açık (tam yazıldığı gibi)" : "Birebir arama (tam yazıldığı gibi ara)"}
          style={{ display: "flex", alignItems: "center", justifyContent: "center", width: "26px", height: "26px", borderRadius: "6px", flexShrink: 0,
            background: tamArama ? theme.accent : `${theme.accent}15`, color: tamArama ? "#fff" : theme.accent,
            border: "none", cursor: "pointer", fontSize: "15px", fontWeight: "bold", lineHeight: 1 }}>
          <Asterisk size={15} />
        </button>
        {aramaMetni && (
          <button onClick={() => { setAramaMetni(""); setAramaEslesmeler([]) }} style={{ color: theme.textSecondary, background: "none", border: "none", cursor: "pointer" }}>
            <X size={14} />
          </button>
        )}
      </div>
      {aramaEslesmeler.length > 0 ? (
        <>
          <div style={{ fontSize: "11px", color: theme.textSecondary, marginBottom: "6px" }}>
            {aramaEslesmeler.length}{aramaEslesmeler.length >= 300 ? "+" : ""} sonuç
          </div>
          <div style={{ maxHeight: "230px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "6px" }}>
            {aramaEslesmeler.map((es, i) => (
              <button key={i}
                onClick={() => {
                  const sf = kitapMetni.find(s => s.sayfa === es.sayfaNo)
                  const ls = sf ? Math.max(1, sf.metin.split("\n").length) : 1
                  const oran = Math.max(0, Math.min(0.95, (es.satirIdx || 0) / ls))
                  const aranan = aramaMetni
                  elemanaGit(es.sayfaNo, () => document.querySelector(`[data-satir="${es.sayfaNo}-${es.satirIdx}"]`), oran, false,
                    (el) => aramaVurgula(es.sayfaNo, el, aranan))
                  setAramaAcik(false)
                }}
                style={{
                  textAlign: "left", padding: "8px 10px", borderRadius: "8px",
                  background: `${theme.accent}08`, border: `1px solid ${theme.border}`,
                  color: theme.text, cursor: "pointer",
                }}>
                <div style={{ fontSize: "10px", color: theme.accent, marginBottom: "2px" }}>Sayfa {es.sayfaNo}</div>
                <div style={{ fontSize: "12px", color: theme.textSecondary, lineHeight: "1.5" }}>{es.onizleme}</div>
              </button>
            ))}
          </div>
        </>
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
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "10px" }}>
        <div style={{ fontSize: "12px", color: theme.textSecondary }}>SAYFAYA GİT (1 – {kitapMetni.length})</div>
        <button onClick={() => setSayfaGosterimAcik(v => !v)} title="Bardaki görünüm tipi"
          style={{ background: sayfaGosterimAcik ? `${theme.accent}20` : "none", border: "none", borderRadius: "6px", cursor: "pointer", color: theme.textSecondary, padding: "3px", display: "flex" }}>
          <Settings size={14} />
        </button>
      </div>
      {sayfaGosterimAcik && (
        <div style={{ display: "flex", flexDirection: "column", gap: "6px", marginBottom: "12px", padding: "8px", borderRadius: "8px", background: theme.background, border: `1px solid ${theme.border}` }}>
          <div style={{ fontSize: "10px", color: theme.textSecondary, letterSpacing: "1px", marginBottom: "2px" }}>BARDA GÖRÜNÜM</div>
          {[{ id: "ikon", on: null }, { id: "sayfa", on: `${mevcutSayfa}` }, { id: "tam", on: `${mevcutSayfa} / ${kitapMetni.length}` }].map(o => (
            <button key={o.id} onClick={() => { setSayfaGosterim(o.id); setSayfaGosterimAcik(false) }}
              style={{ display: "flex", alignItems: "center", gap: "6px", padding: "7px 10px", borderRadius: "8px",
                border: `1px solid ${sayfaGosterim === o.id ? theme.accent : theme.border}`,
                background: sayfaGosterim === o.id ? `${theme.accent}12` : "transparent",
                color: theme.text, cursor: "pointer", fontSize: "13px" }}>
              <BookOpen size={13} color={theme.accent} />
              {o.on && <span>{o.on}</span>}
              {sayfaGosterim === o.id && <Check size={13} style={{ marginLeft: "auto", color: theme.accent }} />}
            </button>
          ))}
        </div>
      )}
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
// İÇİNDEKİLER MENÜSÜ (iskele — contents.json bağlanacak)
// ════════════════════════════════════════════════════════════════

const menuDugumRender = (node) => {
  const mo = barUiOlcegi
  const acik = menuAcikDugum.has(node.idx)
  const cocukVar = node.cocuklar && node.cocuklar.length > 0
  return (
    <div key={node.idx}>
      <div style={{ display: "flex", alignItems: "stretch", borderBottom: `1px solid ${theme.border}` }}>
        {cocukVar ? (
          <button onClick={() => setMenuAcikDugum(s => { const n = new Set(s); n.has(node.idx) ? n.delete(node.idx) : n.add(node.idx); return n })}
            style={{ padding: `0 ${Math.round(6 * mo)}px`, background: "transparent", border: "none", cursor: "pointer", color: theme.textSecondary, display: "flex", alignItems: "center", flexShrink: 0 }}>
            {acik ? <ChevronDown size={Math.round(15 * mo)} /> : <ChevronRight size={Math.round(15 * mo)} />}
          </button>
        ) : (
          <span style={{ width: `${Math.round(20 * mo)}px`, flexShrink: 0 }} />
        )}
        <button onClick={() => { if (node.sayfa) basligaGit(node.sayfa, node.satir, node.oran || 0, node.baslik, node.seviye, node.aciklama); setMenuAcik(false) }}
          title={node.aciklama || ""}
          style={{
            flex: 1, textAlign: "left", background: "transparent", border: "none", cursor: "pointer",
            padding: `${Math.round(8 * mo)}px ${Math.round(10 * mo)}px ${Math.round(8 * mo)}px 0`,
            color: theme.text, fontSize: `${Math.round(((node.seviye || 1) === 1 ? 14 : 13) * mo)}px`,
            fontWeight: (node.seviye || 1) === 1 ? 600 : 400,
            fontFamily: (node.seviye || 1) === 1 ? "'Souvenir', 'Souvenir Medium', serif" : "inherit",
          }}>
          {node.baslik}
        </button>
      </div>
      {cocukVar && acik && (
        <div style={{ paddingLeft: `${Math.round(14 * mo)}px` }}>
          {node.cocuklar.map(menuDugumRender)}
        </div>
      )}
    </div>
  )
}

const MenuPanel = menuAcik && (
  <>
    <div onClick={() => setMenuAcik(false)} style={{ position: "fixed", inset: 0, zIndex: 149 }} />
    <div className="okuma-panel" style={{
      position: "fixed", top: 0, bottom: 0, left: 0, width: `${Math.round(300 * barUiOlcegi)}px`, maxWidth: "85vw",
      background: theme.surface, borderRight: `1px solid ${theme.border}`,
      zIndex: 150, display: "flex", flexDirection: "column",
      boxShadow: "4px 0 24px rgba(0,0,0,0.15)",
    }}>
      <div style={{ padding: "14px 16px", borderBottom: `1px solid ${theme.border}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ fontSize: `${Math.round(15 * barUiOlcegi)}px`, fontWeight: 600, color: theme.accent }}>İçindekiler</span>
        <button onClick={() => setMenuAcik(false)} style={{ background: "none", border: "none", cursor: "pointer", color: theme.textSecondary }}><X size={Math.round(16 * barUiOlcegi)} /></button>
      </div>
      <div ref={menuListeRef} onScroll={e => { menuScrollRef.current = e.currentTarget.scrollTop }}
        style={{ flex: 1, overflowY: "auto", padding: "4px 0" }}>
        {(icindekiler && icindekiler.length > 0) ? (
          icindekilerAgaci(icindekiler).map(menuDugumRender)
        ) : (
          <div style={{ padding: "24px 16px", textAlign: "center", color: theme.textSecondary, fontSize: "13px", lineHeight: "1.7", opacity: 0.8 }}>
            İçindekiler verisi henüz eklenmedi.
          </div>
        )}
      </div>
    </div>
  </>
)

// ════════════════════════════════════════════════════════════════
// BAR
// ════════════════════════════════════════════════════════════════

// Bar öğesi görünür mü? (ayar + sade mod). gorunurMu'dan SONRA tanımlı olmalı.
const barOgeAcik = (k) => {
  if (k === "geri" || k === "ayarlar") return true
  if (k === "kisim") return gorunurMu("kisim") && !!mevcutKisim
  return gorunurMu(k)
}
// Sıra + taraf: "sag" öğeler 50+ order alır; GÖRÜNÜR ilk sağ öğe marginLeft:auto ile boşluğu iter.
const barSira = (k) => { const i = butonSirasi.indexOf(k); return i === -1 ? 99 : i }
const ilkSagKey = butonSirasi.find(k => butonTaraf[k] === "sag" && barOgeAcik(k))
// order 10'un katları: satır kırma ayraçları aradaki tek sayıya (ör. 35) yerleşebilsin.
const barOge = (k) => ({
  order: ((butonTaraf[k] === "sag" ? 50 : 0) + barSira(k)) * 10,
  ...(!barCokSatir && k === ilkSagKey ? { marginLeft: "auto" } : {}),
})

const Bar = (
  <div ref={barRef} className="okuma-bar" style={{
    position: "fixed", left: 0, right: 0,
    [barKonum === "alt" ? "bottom" : "top"]: 0,
    background: theme.surface,
    borderTop:    barKonum === "alt" ? `1px solid ${theme.border}` : "none",
    borderBottom: barKonum === "ust" ? `1px solid ${theme.border}` : "none",
    // Dikey padding + safe-area: max() → çift boşluk YOK (baz+inset yerine büyüğü kadar)
    // Baz padding azaltıldı: bar gereksiz uzamasın, ögeler orta bölümde tıklanabilir kalsın.
    // PWA'da alt boşluk DOĞRUDAN pwaAltBosluk (safe-area yok); web'de eskisi gibi max(base, inset).
    paddingTop:    barKonum === "ust" ? `max(${isMobile ? 5 : 3}px, env(safe-area-inset-top))` : `${isMobile ? 5 : 3}px`,
    paddingBottom: barKonum === "alt"
      ? (pwaModu
          ? `${pwaAltBosluk}px`
          : `max(${isMobile ? 5 : 3}px, env(safe-area-inset-bottom))`)
      : `${isMobile ? 5 : 3}px`,
    paddingLeft:   `max(${isMobile ? 12 : 10}px, env(safe-area-inset-left))`,
    paddingRight:  `max(${isMobile ? 12 : 10}px, env(safe-area-inset-right))`,
    display: "flex", alignItems: "center", gap: `${Math.round(4 * barUiOlcegi)}px`,
    justifyContent: "center",
    zIndex: 90, flexWrap: "wrap",
    // Ayraç varken satır arası ayracın kendi yüksekliğinden gelir; rowGap iki kez uygulanıp
    // bar gereksiz uzamasın diye sıfırlanır.
    rowGap: barSatirKes.length ? "0px" : "4px",
    transition: "opacity 0.3s ease",
    opacity: barGorunur ? 1 : 0,
    pointerEvents: barGorunur ? "auto" : "none",
  }}>

    <button onClick={() => navigate("/")} style={{ ...barButonStil(), ...barOge("geri") }}>
      <ArrowLeft size={bIkon(16)} /> Geri
    </button>

    {gorunurMu("menu") && (
      <button onClick={() => togglePanel(setMenuAcik, !menuAcik)} style={{ ...barButonStil(menuAcik), ...barOge("menu") }} title="İçindekiler">
        <List size={bIkon(16)} />
      </button>
    )}

    {gorunurMu("sayfa") && (
      <button onClick={() => togglePanel(setSayfaGitAcik, !sayfaGitAcik)} style={{ ...barButonStil(sayfaGitAcik), background: `${theme.accent}15`, color: theme.text, ...barOge("sayfa") }}>
        <BookOpen size={bIkon(13)} color={theme.accent} />
        {sayfaGosterim === "ikon" ? null : (sayfaGosterim === "sayfa" ? mevcutSayfa : `${mevcutSayfa} / ${kitapMetni.length}`)}
      </button>
    )}

    {gorunurMu("lugat") && (
      <button onClick={() => setLugatActive(!lugatActive)} style={{ ...barButonStil(lugatActive), ...barOge("lugat") }}>
        {lugatActive ? <Eye size={bIkon(15)} /> : <Circle size={bIkon(15)} />} Lügat
      </button>
    )}

    {gorunurMu("yazi") && (
      <button onClick={() => togglePanel(setAaAcik, !aaAcik)} style={{ ...barButonStil(aaAcik), ...barOge("yazi") }} title="Yazı tipi / boyut">
        <Feather size={bIkon(15)} />
      </button>
    )}

    {gorunurMu("vurgu") && (
      <button onClick={() => { const y = !vurguModu; setVurguModu(y); if (!y) setVurguDuzenle(false) }} style={{ ...barButonStil(vurguModu), ...barOge("vurgu") }} title="Vurgulama modu">
        <Highlighter size={bIkon(15)} />
        {vurguModu && (
          <div style={{ display: "flex", gap: "3px", marginLeft: "4px", ...barOge("oto") }} onClick={e => e.stopPropagation()}>
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
    )}

    {gorunurMu("kayit") && (
      <button onClick={() => togglePanel(setKayitAcik, !kayitAcik)} style={{ ...barButonStil(kayitAcik), ...barOge("kayit") }} title="Kayıtlar">
        <Bookmark size={bIkon(15)} />
        {toplamKayit > 0 && (
          <span style={{ fontSize: "10px", background: theme.accent, color: "#fff", borderRadius: "10px", padding: "1px 5px", marginLeft: "2px" }}>
            {toplamKayit}
          </span>
        )}
      </button>
    )}

    {gorunurMu("arama") && (
      <button onClick={() => togglePanel(setAramaAcik, !aramaAcik)} style={{ ...barButonStil(aramaAcik), ...barOge("arama") }} title="Metinde ara">
        <Search size={bIkon(15)} />
      </button>
    )}

    {gorunurMu("gorsel") && (
      <button onClick={gorselYap} style={{ ...barButonStil(!!gorselVeri), ...barOge("gorsel") }} title="Seçili metinden görsel oluştur">
        <Camera size={bIkon(15)} />
      </button>
    )}

    {gorunurMu("oto") && (
      <button onClick={() => setOtomatikKaydirma(!otomatikKaydirma)} style={{ ...barButonStil(otomatikKaydirma), ...barOge("oto") }}>
        {otomatikKaydirma ? <Pause size={bIkon(15)} /> : <Play size={bIkon(15)} />}
      </button>
    )}
    {/* Hız kutusu oto düğmesiyle AYNI order'ı alır → sıralamada onun yanında kalır.
        order verilmezse 0'a düşüp barın en başına atlıyordu. */}
    {gorunurMu("oto") && otomatikKaydirma && (
      <div style={{ display: "flex", alignItems: "center", gap: "4px", ...barOge("oto") }}>
        <button onClick={() => setKaydirmaHizi(Math.max(1, kaydirmaHizi - 1))} style={{ ...barButonStil(), padding: "2px" }}><Minus size={bIkon(13)} /></button>
        <span style={{ fontSize: "12px", color: theme.textSecondary }}>{kaydirmaHizi}</span>
        <button onClick={() => setKaydirmaHizi(Math.min(20, kaydirmaHizi + 1))} style={{ ...barButonStil(), padding: "2px" }}><Plus size={bIkon(13)} /></button>
      </div>
    )}

      {gorunurMu("sade") && (
        <button onClick={() => setSadeMode(!sadeMode)} style={{ ...barButonStil(sadeMode), padding: "4px", ...barOge("sade") }} title="Sade mod">
          <Circle size={bIkon(15)} />
        </button>
      )}
      {gorunurMu("tema") && (
        <button onClick={() => togglePanel(setTemaAcik, !temaAcik)} style={{ ...barButonStil(temaAcik), padding: "4px", ...barOge("tema") }} title="Tema">
          <Palette size={bIkon(15)} />
        </button>
      )}
      <button onClick={() => togglePanel(setAyarlarAcik, !ayarlarAcik)} style={{ ...barButonStil(ayarlarAcik), padding: "4px", ...barOge("ayarlar") }} title="Ayarlar">
        <Settings size={bIkon(15)} />
      </button>
      {gorunurMu("kisim") && mevcutKisim && (
        <span onClick={(e) => { const yol = mevcutKisimYolu.map(b => b.baslik).join(" / "); dipnotTikla(mevcutKisim.aciklama || yol, e, yol) }}
          title={mevcutKisimYolu.map(b => b.baslik).join(" / ")}
          style={{ fontSize: `${Math.round(11 * barUiOlcegi)}px`, color: theme.accent, padding: "4px 6px", maxWidth: isMobile ? "150px" : "260px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", cursor: "pointer", ...barOge("kisim") }}>
          {mevcutKisimYolu.map(b => b.baslik).join(" / ")}
        </span>
      )}
      {gorunurMu("sure") && (
        <span style={{ fontSize: `${Math.round(11 * barUiOlcegi)}px`, color: theme.accent, padding: "4px 6px", display: "flex", alignItems: "center", gap: "3px", ...barOge("sure") }}>
          <Clock size={bIkon(11)} /> {dakikaFormatla(bugunSure)}
        </span>
      )}

      {/* Satır kırma ayraçları: tam genişlikte, yüksekliksiz. order değerleri ölçümle
          hesaplanır; öğeler satırlara dengeli dağılsın diye araya girerler. */}
      {barSatirKes.map((o, i) => (
        <span
          key={`bar-kes-${i}`}
          data-bar-kes="1"
          aria-hidden="true"
          style={{ flexBasis: "100%", width: "100%", height: "4px", order: o, pointerEvents: "none" }}
        />
      ))}
  </div>
)

// ════════════════════════════════════════════════════════════════
// RENDER
// ════════════════════════════════════════════════════════════════

const GorselPaneli = (
  <GorselOlustur
    acik={!!gorselVeri}
    kapat={() => setGorselVeri(null)}
    arapca={null}
    meal={gorselVeri?.metin || null}
    kaynak={gorselVeri?.kaynak || null}
    arapcaFont={null}
    theme={theme}
    isMobile={isMobile}
  />
)

const GorselIpucu = gorselIpucu && (
  <div style={{
    position: "fixed",
    top: barKonum === "ust" ? `${barYuk + 12}px` : "auto",
    bottom: barKonum === "ust" ? "auto" : `${barYuk + 12}px`,
    left: "50%", transform: "translateX(-50%)",
    background: theme.surface, border: `1px solid ${theme.accent}`,
    borderRadius: "12px", padding: "10px 16px", zIndex: 499,
    color: theme.text, fontSize: "12px", maxWidth: "92vw",
    display: "flex", alignItems: "center", gap: "9px",
    boxShadow: "0 4px 20px rgba(0,0,0,0.18)", pointerEvents: "none",
    lineHeight: 1.4,
  }}>
    <Camera size={14} color={theme.accent} style={{ flexShrink: 0 }} />
    <span>{gorselIpucu}</span>
  </div>
)

const SiraPaneli = (
  <BarSiraPaneli
    acik={siraAcik}
    kapat={() => setSiraAcik(false)}
    ogeler={BAR_SIRA_OGELERI}
    sira={butonSirasi}
    taraf={butonTaraf}
    acikMi={barOgeAcik}
    onKaydet={(yeniSira, yeniTaraf) => {
      setButonSirasi(yeniSira); setButonTaraf(yeniTaraf)
      localStorage.setItem("vukuf-okuma-buton-sirasi", JSON.stringify(yeniSira))
      localStorage.setItem("vukuf-okuma-buton-taraf", JSON.stringify(yeniTaraf))
      setSiraAcik(false)
    }}
    theme={theme}
    isMobile={isMobile}
  />
)

return (
  <div style={{ height: "100vh", display: "flex", flexDirection: "column", background: theme.background, position: "relative" }}>

    {/* AÇILIŞ ÖRTÜSÜ — konum oturana dek rozet; oturunca kaymadan solar. */}
    {acilisOrtu && (
      <div style={{
        position: "absolute", inset: 0, zIndex: 95,
        background: theme.background,
        opacity: okumaHazir ? 0 : 1,
        pointerEvents: okumaHazir ? "none" : "auto",
        transition: "opacity 0.35s ease",
      }}>
        <YuklemeEkrani theme={theme} yukseklik="100%" arkaplan={false} fade={false} />
      </div>
    )}

    <style>{`@keyframes odakYanip { 0%{opacity:0} 15%{opacity:1} 70%{opacity:1} 100%{opacity:0} }
@keyframes aramaVurguAnim { 0%{opacity:0} 12%{opacity:1} 75%{opacity:1} 100%{opacity:0} }
.lugat-kelime, .lugat-kelime * { -webkit-tap-highlight-color: transparent; }`}</style>

    {barKonum === "ust" && Bar}

    {SayfaGitPopup}
    {AaPanel}
    {KayitPanel}
    {TemaPanel}
    {OzelTemaPanel}
    {AyarlarPanel}
    {SiraPaneli}
    {GorselPaneli}
    {GorselIpucu}
    {AramaPanel}
    {MenuPanel}

    {/* Dipnot popup */}
    {dipnotPopup && (
      <>
        <div onClick={() => setDipnotPopup(null)} style={{ position: "fixed", inset: 0, zIndex: 299 }} />
        <div style={{
          position: "fixed", left: dipnotPopup.x, top: dipnotPopup.y,
          background: theme.surface, border: `1px solid ${theme.border}`,
          borderRadius: "12px", padding: "14px 16px", zIndex: 300,
          width: "300px", maxWidth: "92vw", maxHeight: "45vh", overflowY: "auto",
          boxShadow: "0 8px 24px rgba(0,0,0,0.18)",
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
            <span style={{ fontSize: "11px", color: theme.accent, letterSpacing: "1px" }}>{dipnotPopup.etiket || "DİPNOT"}</span>
            <button onClick={() => setDipnotPopup(null)} style={{ background: "none", border: "none", cursor: "pointer", color: theme.textSecondary, padding: "2px" }}><X size={14} /></button>
          </div>
          <div style={{ color: theme.text, fontSize: `${Math.round(15 * bilgiOlcegi)}px`, lineHeight: "1.7", whiteSpace: "pre-wrap" }}>
            {dipnotPopup.metin}
          </div>
          {/* Dipnotta ayet atfı/atıfları → Kur'an Okuma'ya köprü (birden fazlaysa hepsi) */}
          {atifOklari(ayetAtiflari(dipnotPopup.metin))}
        </div>
      </>
    )}

    {/* Lügat popup */}
    {popup && (
      <>
        <div onClick={() => setPopup(null)} style={{ position: "fixed", inset: 0, zIndex: 299 }} />
        <div ref={popupRef} style={{
          position: "fixed", left: popup.x, top: popup.y,
          background: theme.surface, border: `1px solid ${theme.border}`,
          borderRadius: "12px", padding: "14px 18px", zIndex: 300,
          width: "300px", maxWidth: "92vw", maxHeight: "25vh", overflowY: "auto",
          boxShadow: "0 8px 24px rgba(0,0,0,0.15)",
          visibility: popup.yerlesti ? "visible" : "hidden",
        }}>
          {popup.secenekler && popup.secenekler.length > 1 ? (
            // Birden çok aday (izafet birleşik) — hepsini seçenek olarak göster
            popup.secenekler.map((s, i) => (
              <div key={i} style={{ marginBottom: i < popup.secenekler.length - 1 ? "12px" : "0", paddingBottom: i < popup.secenekler.length - 1 ? "12px" : "0", borderBottom: i < popup.secenekler.length - 1 ? `1px solid ${theme.border}` : "none" }}>
                <div style={{ color: theme.accent, fontWeight: "bold", fontSize: `${Math.round(15 * bilgiOlcegi)}px`, marginBottom: "4px" }}>{s.kelime}</div>
                {s.anlam && <div style={{ color: theme.textSecondary, fontSize: `${Math.round(13.5 * bilgiOlcegi)}px`, lineHeight: "1.5" }}>{s.anlam}</div>}
                {s.kavram && s.kavram.map((kv, j) => (
                  <div key={j} style={{ marginTop: "6px" }}>
                    <div style={{ fontSize: `${Math.round(12.5 * bilgiOlcegi)}px`, fontWeight: 600, color: theme.text }}>{kv.terim}</div>
                    <div style={{ fontSize: `${Math.round(12 * bilgiOlcegi)}px`, color: theme.text, lineHeight: "1.6", whiteSpace: "pre-wrap" }}>{kv.aciklama}</div>
                  </div>
                ))}
              </div>
            ))
          ) : (<>
          <div style={{ color: theme.accent, fontWeight: "bold", fontSize: `${Math.round(16 * bilgiOlcegi)}px`, marginBottom: "6px" }}>{popup.kelime}</div>
          {popup.anlam && (
            <div style={{ color: theme.textSecondary, fontSize: `${Math.round(14 * bilgiOlcegi)}px`, lineHeight: "1.5" }}>{popup.anlam}</div>
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
                  <div style={{ fontSize: `${Math.round(13 * bilgiOlcegi)}px`, fontWeight: 600, color: theme.text, marginBottom: "4px" }}>{kv.terim}</div>
                  <div style={{ fontSize: `${Math.round(12.5 * bilgiOlcegi)}px`, color: theme.text, lineHeight: "1.7", whiteSpace: "pre-wrap" }}>{kv.aciklama}</div>
                  {kv.kaynaklar?.length > 0 && (
                    <div style={{ marginTop: "8px", fontSize: `${Math.round(11 * bilgiOlcegi)}px`, color: theme.textSecondary, lineHeight: "1.6" }}>
                      {kv.kaynaklar.map((k, j) => <div key={j}>{k}</div>)}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
          </>)}
          {/* Ayet atfı/atıfları varsa → âyete git (Kur'an Okuma'da açılır, üstte "Okumaya dön") */}
          {atifOklari(ayetAtiflari(popupMetni(popup)))}
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
        flex: 1, overflowY: "auto", overflowX: "hidden", userSelect: "none",
        WebkitTapHighlightColor: "transparent",   // dokununca gri kutu çıkmasın
        // Üst/alt boşluk BAR YÜKSEKLİĞİNE eşit ve SABİT (barGorunur'a bağlı DEĞİL) →
        // bar gizlenip görününce padding değişmiyor, dolayısıyla scroll kaymıyor
        // (KuranOkuma'daki gibi; bar sabit bir katman olarak kayıp gösteriliyor).
        paddingTop:    barKonum === "ust" ? `${barYuk}px` : "24px",
        paddingBottom: barKonum === "alt" ? `${barYuk}px` : "24px",
        paddingLeft: "env(safe-area-inset-left)",
        paddingRight: "env(safe-area-inset-right)",
      }}
    >
      <div style={{
        maxWidth: tamGenislik ? "100%"
          : kenarBosluk ? (isMobile ? "90%" : "62%")
          : `${Math.round((isMobile ? 480 : 720) * (yaziBoyutu / 16))}px`,
        width: "100%", margin: "0 auto",
        padding: tamGenislik ? (isMobile ? "0 6px" : "0 10px") : "0 24px",
        boxSizing: "border-box",
      }}>

        {/* İşaret ekleme modu bandı */}
        {kayitKonumModu && (
          <div style={{
            position: "sticky", top: 0, zIndex: 50,
            background: theme.accent, padding: "6px 12px", borderRadius: "8px",
            marginBottom: "12px", fontSize: "12px", color: "#fff",
            display: "flex", alignItems: "center", gap: "8px",
          }}>
            <Bookmark size={13} />
            İşaret için metinde bir yere dokun
            <button onClick={() => setKayitKonumModu(false)} style={{ marginLeft: "auto", background: "none", border: "none", cursor: "pointer", color: "#fff" }}>
              <X size={13} />
            </button>
          </div>
        )}

        {/* Vurgulama modu bandı */}
        {vurguModu && (
          <div style={{
            position: "sticky", top: 0, zIndex: 50,
            background: `${vurguRengi}dd`, padding: "6px 12px", borderRadius: "8px",
            marginBottom: "12px", fontSize: "12px", color: "#333",
            display: "flex", alignItems: "center", gap: "8px",
          }}>
            <Highlighter size={13} />
            {vurguDuzenle ? "Düzenleme modu — kelimeye dokun: çıkar · seçerek ekle" : "Vurgu modu — seçerek ekle"}
            <button onClick={() => setVurguDuzenle(v => !v)} title={vurguDuzenle ? "Ekleme moduna geç" : "Düzenleme moduna geç"} style={{ marginLeft: "auto", background: vurguDuzenle ? "#00000022" : "transparent", borderRadius: "6px", border: "none", cursor: "pointer", color: "#333", padding: "2px 4px", display: "flex" }}>
              <Settings size={13} />
            </button>
            <button onClick={() => { setVurguModu(false); setVurguDuzenle(false) }} style={{ background: "none", border: "none", cursor: "pointer", color: "#333" }}>
              <X size={13} />
            </button>
          </div>
        )}

        {/* Kitap başlığı */}
        <div style={{ textAlign: "center", marginBottom: "48px", paddingTop: "24px" }}>
          <OtoFit as="h1" maxFont={isMobile ? 98 : 158} minFont={isMobile ? 20 : 36}
            style={{ color: theme.accent, marginBottom: "8px", lineHeight: 1.1, fontFamily: /Nurs[iî]/.test(kitap.yazar || "") ? "LivaNur, serif" : "PlayfairDisplay, serif" }}>
            {kitap.baslik}
          </OtoFit>
          <p style={{ color: theme.textSecondary, fontSize: "44px" }}>{kitap.yazar}</p>
        </div>

        {/* Sayfalar */}
          {kitapMetni.map((sayfa, index) => {
            const ham = tahminYukHam(index)
            return (
            <div key={sayfa.sayfa} ref={el => { if (el) sayfaRefs.current[sayfa.sayfa] = el }} style={{ position: "relative" }}>
              {odakKonum && odakKonum.sayfa === sayfa.sayfa && odakKonum.cizgi !== false && (
                <div key={odakKonum.nonce} style={{
                  position: "absolute", left: "-10px", right: "-10px",
                  top: `${odakKonum.oran * 100}%`, height: "3px",
                  background: theme.accent, borderRadius: "2px",
                  boxShadow: `0 0 10px 2px ${theme.accent}`,
                  zIndex: 6, opacity: 0, animation: "odakYanip 2.4s ease-out forwards",
                }} />
              )}
              {aramaVurgu && aramaVurgu.sayfa === sayfa.sayfa && aramaVurgu.kutular.map((kt, ki) => (
                <div key={aramaVurgu.nonce + "-" + ki} style={{
                  position: "absolute", top: `${kt.top - 1}px`, left: `${kt.left - 2}px`,
                  width: `${kt.width + 4}px`, height: `${kt.height + 2}px`,
                  background: `${theme.accent}44`, borderBottom: aramaVurgu.altCizgi ? `2px solid ${theme.accent}` : "none",
                  borderRadius: "3px", zIndex: 5, pointerEvents: "none",
                  animation: "aramaVurguAnim 3.4s ease-out forwards",
                }} />
              ))}
              {kayitlar.filter(k => k.sayfa === sayfa.sayfa).map(k => (
                <div key={k.id} style={{ position: "absolute", top: `${(k.oran || 0) * 100}%`, right: "6px", zIndex: 30 }}>
                  <div style={{ position: "relative" }}>
                    <KitapAyraci
                      kayit={k}
                      theme={theme}
                      vurgulu={odakKonum?.sayfa === sayfa.sayfa && odakKonum?.cizgi === false && Math.abs((k.oran || 0) - (odakKonum.oran || 0)) < 0.03}
                      onTikla={() => togglePanel(setKayitAcik, true)}
                    />
                  </div>
                </div>
              ))}
              <SayfaBlok
                minHeight={Math.max(300, Math.round(ham))}
                margin={isMobile ? "3000px 0px" : "2200px 0px"}
                hafifGoster={sayfa.sayfa <= maxSayfa}
                render={(mod) => (
                  <MetinParcasi
                    hafif={mod === "hafif"}
                    metin={sayfa.metin}
                    sayfaNo={sayfa.sayfa}
                    lugatAktif={lugatActive}
                    onKelimeTikla={kelimeTikla}
                    theme={theme}
                    fontSize={yaziBoyutu}
                    baslikBoyutu={baslikBoyutu}
                    hizalama={hizalama}
                    metinFont={metinFont}
                    arapcaFont={arapcaFont}
                    arapBoyut={arapBoyutu}
                    vurguModu={vurguModu}
                    vurguRengi={vurguRengi}
                    sayfaVurgulari={vurgular[sayfa.sayfa] || []}
                    onVurguEkle={vurguEkle}
                    duzenleMod={vurguDuzenle}
                    onVurguKelimeSil={vurguKelimeSil}
                    dipnotlar={sayfa.dipnotlar}
                    satirAraligi={satirAraligi}
                    harfAraligi={harfAraligi}
                    kelimeAraligi={kelimeAraligi}
                    onDipnotTikla={dipnotTikla}
                    basliklar={sayfa.basliklar}
                    baslikFont={baslikFont}
                    ortala={sayfa.sayfa === 1 && (sayfa.metin || "").split("\n").filter(l => l.trim() && !l.startsWith("§")).length <= 6}
                    lugatRenk={lugatRenk}
                    arapRenk={arapRenk}
                    hasiyeler={sayfa.hasiyeler}
                  />
                )}
              />
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
            )
          })}
      </div>
    </div>
    {barKonum === "alt" && Bar}

    {donusTip && (
      <div style={{
        position: "fixed", right: "14px", zIndex: 120,
        [barKonum === "alt" ? "bottom" : "top"]: "58px",
        display: "flex", alignItems: "center", gap: "6px",
        background: theme.accent, color: "#fff", borderRadius: "22px",
        padding: "8px 8px 8px 14px", boxShadow: "0 4px 16px rgba(0,0,0,0.25)",
      }}>
        <button onClick={() => { try { localStorage.setItem(`vukuf-${donusTip}-devam`, "1") } catch {}; navigate(donusTip === "tefeul" ? "/okuma-tefeul" : "/arama") }} style={{ display: "flex", alignItems: "center", gap: "6px", background: "none", border: "none", color: "#fff", cursor: "pointer", fontSize: "13px", fontFamily: "inherit" }}>
          {donusTip === "tefeul" ? <Shuffle size={15} /> : <Search size={15} />} {donusTip === "tefeul" ? "Tefeüle dön" : "Aramaya dön"}
        </button>
        <button onClick={() => setDonusTip("")} title="Kapat" style={{ display: "flex", background: "rgba(255,255,255,0.25)", border: "none", color: "#fff", cursor: "pointer", borderRadius: "50%", padding: "3px" }}>
          <X size={13} />
        </button>
      </div>
    )}
  </div>
)
}