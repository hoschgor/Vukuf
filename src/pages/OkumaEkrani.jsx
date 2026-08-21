import KuranOkuma from "./KuranOkuma"
import { useState, useEffect, useRef, useCallback, useMemo } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { useApp } from "../AppContext"
import { kitaplar } from "../data/kitaplar"
import lugatVerisi from "../data/lugat.json"
import risaleLugat from "../data/risale-lugat.json"
import kavramlarVerisi from "../data/kavramlar.json"
import KitapAyraci from "../components/KitapAyraci"
import {
  ArrowLeft, BookOpen, Eye, EyeOff, Play, Pause,
  Plus, Minus, AlignJustify, ChevronsUp, ChevronsDown,
  Bookmark, X, Type, StickyNote, Palette,
  Search, Highlighter, ChevronDown, Clock, Settings,
  ChevronUp, ChevronRight, Edit2, Pencil, Circle, Feather, List,
} from "lucide-react"
import { useMediaQuery } from '../data/hooks/useMediaQuery'

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
  { key: "sure",  label: "Okuma Süresi",      sadeVarsayilan: true },
  { key: "kisim", label: "Kısım Bilgisi",     sadeVarsayilan: true },
  { key: "sade",  label: "Sade Mod",          sadeVarsayilan: false },
  { key: "tema",  label: "Tema",              sadeVarsayilan: false },
]

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
  return (
    <button onClick={onToggle} style={{
      width: "100%", padding: "8px 12px", borderRadius: "8px", fontSize: "12px",
      background: aktif ? `${theme.accent}15` : theme.background,
      color: aktif ? theme.accent : theme.textSecondary,
      border: `1px solid ${aktif ? theme.accent : theme.border}`,
      cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "6px",
    }}>
      <span>{etiket}</span>
      <span style={{ fontSize: "11px", fontWeight: "bold" }}>{aktif ? acikLabel : kapaliLabel}</span>
    </button>
  )
}

// ════════════════════════════════════════════════════════════════
// YARDIMCI FONKSİYONLAR
// ════════════════════════════════════════════════════════════════

function kelimeAra(kelime) {
  const temiz = kelime.toLowerCase().replace(/[.,!?;:'"()\[\]]/g, "").trim()
  return lugatVerisi[temiz] || risaleLugat[temiz] || null
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
  const saat = Math.floor(saniye / 3600)
  const dakika = Math.floor((saniye % 3600) / 60)
  if (saat === 0 && dakika === 0) return "1 dk'dan az"
  return `${saat > 0 ? saat + " sa " : ""}${dakika > 0 ? dakika + " dk" : ""}`.trim()
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
const HASIYE_RE = /\u27E6H(\d+)\u27E7/g
// Ba\u015Fl\u0131k metni normalizasyonu (DOM aramas\u0131 i\u00E7in): k\u00FC\u00E7\u00FCk harf + bo\u015Fluk sadele\u015Ftir + sondaki noktalama
const bnormR = (s) => (s || "").toLowerCase().replace(/\s+/g, " ").trim().replace(/[:.\-\u2013\u2014\u2022*\u00B7\s]+$/, "")
const LATIN_RE = /[A-Za-zÇĞİıÖŞÜçğöşü]/

function MetinParcasi({
  metin, sayfaNo, lugatAktif, onKelimeTikla,
  theme, fontSize, hizalama, metinFont, arapcaFont, arapBoyut = 6,
  vurguModu, vurguRengi, sayfaVurgulari, onVurguEkle, duzenleMod, onVurguKelimeSil,
  dipnotlar, satirAraligi = 1.9, harfAraligi = 0, kelimeAraligi = 0, onDipnotTikla,
  basliklar, baslikFont, ortala = false, lugatRenk, arapRenk, hasiyeler,
}) {
  const [secimBaslangic, setSecimBaslangic] = useState(null)
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
    <div style={{ fontSize: `${fontSize}px`, fontFamily: metinFont }}>
      {satirlar.map((satir, si) => {
        if (!satir.trim()) return <br key={si} />
        // Dipnot metni satırları (§...) artık altta gösterilmiyor; hover'a taşındı
        if (satir.startsWith("§")) return null
        const gosterilecek = satir

        // Ana/alt başlık (contents.json'dan) — ortalı, LivaNur, hover açıklama
        const bh = basliklarMap[si]
        if (bh) {
          return (
            <div key={si} id={`baslik-${sayfaNo}-${si}`} data-satir={`${sayfaNo}-${si}`} style={{
              textAlign: "center", margin: (bh.seviye <= 1) ? "34px 0 18px" : "24px 0 12px",
              fontFamily: baslikFont || "inherit",
              fontSize: `${fontSize + ((bh.seviye <= 1) ? 84 : 84)}px`,
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
            </div>
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
        return (
          <p key={si} data-satir={`${sayfaNo}-${si}`} style={{
            marginBottom: "10px", lineHeight: satirAraligi,
            letterSpacing: `${harfAraligi}px`,
            textAlign: ortala ? "center" : (hizalama || "left"),
            wordSpacing: `${kelimeAraligi}px`,
            cursor: vurguModu ? "text" : "default",
          }}>
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
              const arapKelime = ARAP_RE.test(temiz)
              // Haşiyeli kelimeyi lügat sayma (H + kuş tüyü ile karışmasın)
              const anlam    = (arapKelime || hasHasiye) ? null : kelimeAra(temiz)
              const kavram   = (arapKelime || hasHasiye) ? null : kavramAra(temiz)
              const lugatliMi = (anlam || kavram) && lugatAktif
              const vurgulu  = vurgulananMi(si, ki)
              return (
              <span key={ki}>
                <span
                  className={lugatliMi ? "lugat-kelime" : ""}
                  data-vurgu={vurgulu ? vurgulu.id : undefined}
                  onMouseDown={e => kelimeMouseDown(si, ki, e)}
                  onMouseUp={() => kelimeMouseUp(si, ki)}
                  onClick={e => { if (!vurguModu && lugatliMi) onKelimeTikla(temiz, anlam, kavram, e) }}
                  onMouseEnter={e => { if (lugatliMi && !vurguModu) e.currentTarget.style.opacity = "0.75" }}
                  onMouseLeave={e => { e.currentTarget.style.opacity = "1" }}
                  style={{
                    background: vurgulu ? vurgulu.renk : "transparent",
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
    return <span key={i}>{p}</span>
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
function LazySayfa({ minHeight, children }) {
  const ref = useRef(null)
  const [gorunur, setGorunur] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    // Bir kez görününce mount et ve gözlemi bırak (bir daha sökme → Arapça zıplaması olmaz)
    const io = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setGorunur(true); io.disconnect() } },
      { rootMargin: "2200px 0px" }
    )
    io.observe(el)
    return () => io.disconnect()
  }, [])
  // İçerik geldiğinde yer-tutucu yüksekliği yakın olduğu için sıçrama minimal;
  // kalanı tarayıcının kendi scroll-anchoring'i (overflow-anchor: auto) düzeltir.
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

// ── Okuma ayarları
const [yaziBoyutu, setYaziBoyutu] = useState(() => parseInt(localStorage.getItem("vukuf-yazi-boyutu") || "16"))
const [satirAraligi, setSatirAraligi] = useState(() => parseFloat(localStorage.getItem("vukuf-satir-araligi") || "1.9"))
const [harfAraligi, setHarfAraligi]   = useState(() => parseFloat(localStorage.getItem("vukuf-harf-araligi") || "0"))
const [kelimeAraligi, setKelimeAraligi] = useState(() => parseFloat(localStorage.getItem("vukuf-kelime-araligi") || "0"))
const [hizalama, setHizalama] = useState(() => localStorage.getItem("vukuf-hizalama") || "left")
const [arapBoyutu, setArapBoyutu] = useState(() => parseInt(localStorage.getItem("vukuf-arap-boyutu") || "6"))
const [fontSecimler, setFontSecimler] = useState(() => {
  const kayitli = localStorage.getItem("vukuf-fontlar")
  return kayitli ? JSON.parse(kayitli) : { turkce: "bookerly", osmanlica: null, arapca: "kfgqpc" }
})
const aktifFontId = fontSecimler.turkce || fontSecimler.osmanlica || fontSecimler.arapca || "bookerly"
const aktifFont   = fontBul(aktifFontId)
const metinFont  = fontBul(fontSecimler.turkce || fontSecimler.osmanlica || "bookerly").style
const arapcaFont = fontSecimler.arapca ? fontBul(fontSecimler.arapca).style : null
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
const konumYuklendiRef = useRef(false)
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
const [barUiOlcegi, setBarUiOlcegi] = useState(() => parseFloat(localStorage.getItem("vukuf-bar-ui-olcegi") || "1"))
const [bilgiOlcegi, setBilgiOlcegi] = useState(() => parseFloat(localStorage.getItem("vukuf-bilgi-olcegi") || "1"))
const [ogeGorunur, setOgeGorunur] = useState(() => {
  try { return JSON.parse(localStorage.getItem("vukuf-bar-gorunur")) || {} } catch { return {} }
})
const [ogeSade, setOgeSade] = useState(() => {
  const k = localStorage.getItem("vukuf-bar-sade")
  if (k) { try { return JSON.parse(k) } catch { /* yoksay */ } }
  const d = {}; BAR_OGELERI.forEach(o => { if (o.sadeVarsayilan) d[o.key] = true }); return d
})
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
const [menuAcik, setMenuAcik]           = useState(false)
const [gorunumAcik, setGorunumAcik]     = useState(false)
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

// ── İçindekiler (contents.json'dan üretilecek <slug>-icindekiler.json)
const [icindekiler, setIcindekiler] = useState(null)

const herhangiPanelAcik = ayarlarAcik || sayfaGitAcik || aaAcik || kayitAcik || temaAcik || aramaAcik || menuAcik

// ── Lügat popup
const [popup, setPopup] = useState(null)
const [popupKavramAcik, setPopupKavramAcik] = useState(false)
const [dipnotPopup, setDipnotPopup] = useState(null)

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
  const kpl = isMobile ? 40 : 68   // satır başına ~ karakter (font-bağımsız yaklaşık)
  return kitapMetni.map(sf => {
    let latinWrap = 0, arapWrap = 0, nPara = 0, nBos = 0
    for (const s of (sf.metin || "").split("\n")) {
      if (s.startsWith("§")) continue
      if (!s.trim()) { nBos++; continue }
      const wrap = Math.max(1, Math.ceil(s.length / kpl))
      if (ARAP_RE.test(s) && !LATIN_RE.test(s)) arapWrap += wrap
      else latinWrap += wrap
      nPara++
    }
    return { latinWrap, arapWrap, nPara, nBos, nBaslik: (sf.basliklar || []).length }
  })
}, [kitapMetni, isMobile])

const tahminYuk = (i) => {
  const t = sayfaYapisi[i]
  if (!t) return 400
  const lh = yaziBoyutu * satirAraligi
  const arapLh = (yaziBoyutu + arapBoyutu) * 2
  return Math.max(300, Math.round(
    t.latinWrap * lh + t.arapWrap * arapLh +
    t.nPara * 10 + t.nBos * (yaziBoyutu * 0.8) +
    t.nBaslik * ((yaziBoyutu + 84) * 1.35 + 52)
  ))
}

// ════════════════════════════════════════════════════
// Scroll takibi
// ════════════════════════════════════════════════════

useEffect(() => {
  const el = scrollRef.current
  if (!el) return
  function onScroll() {
    sonScrollRef.current = el.scrollTop
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

// ── Son okuma konumu: çıkışta kaydet, açılışta geri dön (sistemi yormadan)
const konumKaydet = useCallback(() => {
  const k = sonKonumRef.current
  if (!k || !id) return
  try { localStorage.setItem(`vukuf_son_konum_${id}`, JSON.stringify(k)) } catch {}
}, [id])

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

// Açılışta son konuma dön (yalnız bir kez, kitap yüklendikten sonra)
useEffect(() => {
  if (yukleniyor || !kitapMetni.length || konumYuklendiRef.current) return
  konumYuklendiRef.current = true
  let kayitli = null
  try { kayitli = JSON.parse(localStorage.getItem(`vukuf_son_konum_${id}`) || "null") } catch {}
  if (kayitli && kayitli.sayfa > 1 || (kayitli && kayitli.oran > 0.02)) {
    const hedef = Math.min(Math.max(1, kayitli.sayfa || 1), kitapMetni.length)
    setTimeout(() => sayfayaGit(hedef, kayitli.oran || 0), 120)
  }
}, [yukleniyor, kitapMetni, id])

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
  for (const sayfa of kitapMetni) {
    const satirlar = sayfa.metin.split("\n")
    for (let si = 0; si < satirlar.length; si++) {
      const satir = satirlar[si]
      if (satir.startsWith("§")) continue
      const idx = satir.toLowerCase().indexOf(aranan)
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
}, [aramaMetni, kitapMetni])

useEffect(() => { localStorage.setItem("vukuf-yazi-boyutu", yaziBoyutu) }, [yaziBoyutu])
useEffect(() => { localStorage.setItem("vukuf-satir-araligi", satirAraligi) }, [satirAraligi])
useEffect(() => { localStorage.setItem("vukuf-harf-araligi", harfAraligi) }, [harfAraligi])
useEffect(() => { localStorage.setItem("vukuf-kelime-araligi", kelimeAraligi) }, [kelimeAraligi])
useEffect(() => { localStorage.setItem("vukuf-hizalama", hizalama) }, [hizalama])
useEffect(() => { localStorage.setItem("vukuf-arap-boyutu", String(arapBoyutu)) }, [arapBoyutu])
useEffect(() => { localStorage.setItem("vukuf-fontlar", JSON.stringify(fontSecimler)) }, [fontSecimler])
useEffect(() => { localStorage.setItem("vukuf-bar-konum", barKonum) }, [barKonum])
useEffect(() => { localStorage.setItem("vukuf-otomatik-gizleme", otomatikGizleme) }, [otomatikGizleme])
useEffect(() => { localStorage.setItem("vukuf-gizleme-suresi", gizlemeSuresi) }, [gizlemeSuresi])
useEffect(() => { localStorage.setItem("vukuf-sade-mode", sadeMode) }, [sadeMode])
useEffect(() => { localStorage.setItem("vukuf-bar-ui-olcegi", String(barUiOlcegi)) }, [barUiOlcegi])
useEffect(() => { localStorage.setItem("vukuf-bilgi-olcegi", String(bilgiOlcegi)) }, [bilgiOlcegi])
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
  frenKaydir(hedefTop)
}

// Bir DOM elemanına tam git (başlık/vurgu). cizgi=false ise odak çizgisi çizilmez.
// Tek fren döngüsü kullanır -> fazladan scroll olmaz; eleman gerçek konumundan hizalanır.
function elemanaGit(sayfaNo, selectorFn, fallbackOran = 0, cizgi = true) {
  const el = scrollRef.current
  if (!el) return
  setMevcutSayfa(sayfaNo)
  const ofset = barKonum === "ust" ? 90 : 24

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
    })
  }
  setTimeout(dene, 60)
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

// İçindekiler'den git: ana başlıklar #baslik öğesiyle; alt başlıklar (normal metin)
// başlık METNİ, o sayfanın satırlarında ([data-satir]) aranarak tam DOM konumuna.
function basligaGit(sayfa, satir, oran = 0, baslikMetni = "") {
  setMenuAcik(false)
  elemanaGit(sayfa, () => {
    if (satir != null) {
      const el = document.getElementById(`baslik-${sayfa}-${satir}`)
      if (el) return el
    }
    if (baslikMetni) {
      const hedef = bnormR(baslikMetni)
      if (hedef) {
        const satirlar = document.querySelectorAll(`[data-satir^="${sayfa}-"]`)
        let kismi = null
        for (const s of satirlar) {
          const t = bnormR((s.textContent || "").replace(/\[\d+\]/g, ""))
          if (!t) continue
          if (t === hedef) return s
          if (!kismi && (t.startsWith(hedef) || (hedef.length >= 6 && t.includes(hedef)))) kismi = s
        }
        if (kismi) return kismi
      }
    }
    return null
  }, oran, true)
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
}

function kelimeTikla(kelime, anlam, kavram, e) {
  const gx = e?.clientX ?? window.innerWidth / 2
  const gy = e?.clientY ?? window.innerHeight / 2
  const x = Math.max(10, Math.min(gx - 150, window.innerWidth - 310))
  const y = gy + 12 + 260 > window.innerHeight ? Math.max(10, gy - 260) : gy + 12
  setPopupKavramAcik(false)
  setPopup({ kelime, anlam, kavram, x, y })
}

function dipnotTikla(metin, e, etiket = "DİPNOT") {
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
if (yukleniyor) return <div style={{ padding: "40px", color: theme.text }}>Yükleniyor...</div>

// ════════════════════════════════════════════════════
// Ortak stiller
// ════════════════════════════════════════════════════

const barButonStil = (aktif = false) => ({
  color: aktif ? theme.accent : theme.textSecondary,
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
        <div style={{
          marginTop: "10px", padding: "10px 12px", borderRadius: "8px",
          background: theme.background, border: `1px solid ${theme.border}`,
          fontFamily: metinFont, fontSize: `${yaziBoyutu}px`,
          lineHeight: satirAraligi, letterSpacing: `${harfAraligi}px`, wordSpacing: `${kelimeAraligi}px`,
          color: theme.text, textAlign: "center",
        }}>
          Bismillâh her hayrın başıdır.
        </div>
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
        <div style={{
          marginTop: "10px", padding: "12px", borderRadius: "8px",
          background: theme.background, border: `1px solid ${theme.border}`,
          fontFamily: arapcaFont || undefined, fontSize: `${yaziBoyutu + arapBoyutu}px`,
          direction: "rtl", textAlign: "center", color: arapRenk,
        }}>
          بِسْمِ اللّٰهِ الرَّحْمٰنِ الرَّحِيمِ
        </div>
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

      {/* Arapça / Osmanlıca metin rengi */}
      <div style={{ borderTop: `1px solid ${theme.border}`, marginTop: "10px", paddingTop: "10px" }}>
        <div style={{ fontSize: "11px", color: theme.textSecondary, marginBottom: "8px", letterSpacing: "1px" }}>ARAPÇA / OSMANLICA RENGİ</div>
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
          <span>SADE MODDA GİZLENECEKLER</span>
          {sadeIcerikAcik ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>
        {sadeIcerikAcik && (
          <div style={{ marginTop: "8px" }}>
            {BAR_OGELERI.map(o => (
              <AyarToggle key={o.key} etiket={o.label} theme={theme}
                acikLabel="Gizli" kapaliLabel="Görünür"
                aktif={ogeSade[o.key] === true}
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
                  elemanaGit(es.sayfaNo, () => document.querySelector(`[data-satir="${es.sayfaNo}-${es.satirIdx}"]`), oran, true)
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
        <button onClick={() => { if (node.sayfa) basligaGit(node.sayfa, node.satir, node.oran || 0, node.baslik); setMenuAcik(false) }}
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
      <div style={{ flex: 1, overflowY: "auto", padding: "4px 0" }}>
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

const Bar = (
  <div className="okuma-bar" style={{
    position: "fixed", left: 0, right: 0,
    [barKonum === "alt" ? "bottom" : "top"]: 0,
    background: theme.surface,
    borderTop:    barKonum === "alt" ? `1px solid ${theme.border}` : "none",
    borderBottom: barKonum === "ust" ? `1px solid ${theme.border}` : "none",
    padding: isMobile ? "8px 12px" : "3px 10px",
    display: "flex", alignItems: "center", gap: `${Math.round(4 * barUiOlcegi)}px`,
    justifyContent: "center",
    zIndex: 90, flexWrap: "wrap", rowGap: "4px",
    transition: "opacity 0.3s ease",
    opacity: barGorunur ? 1 : 0,
    pointerEvents: barGorunur ? "auto" : "none",
  }}>

    <button onClick={() => navigate("/")} style={barButonStil()}>
      <ArrowLeft size={bIkon(16)} /> Geri
    </button>

    {gorunurMu("menu") && (
      <button onClick={() => togglePanel(setMenuAcik, !menuAcik)} style={barButonStil(menuAcik)} title="İçindekiler">
        <List size={bIkon(16)} />
      </button>
    )}

    {gorunurMu("sayfa") && (
      <button onClick={() => togglePanel(setSayfaGitAcik, !sayfaGitAcik)} style={{ ...barButonStil(sayfaGitAcik), background: `${theme.accent}15`, color: theme.text }}>
        <BookOpen size={bIkon(13)} color={theme.accent} />
        {mevcutSayfa} / {kitapMetni.length}
      </button>
    )}

    {gorunurMu("lugat") && (
      <button onClick={() => setLugatActive(!lugatActive)} style={barButonStil(lugatActive)}>
        {lugatActive ? <Eye size={bIkon(15)} /> : <Circle size={bIkon(15)} />} Lügat
      </button>
    )}

    {gorunurMu("yazi") && (
      <button onClick={() => togglePanel(setAaAcik, !aaAcik)} style={barButonStil(aaAcik)} title="Yazı tipi / boyut">
        <Feather size={bIkon(15)} />
      </button>
    )}

    {gorunurMu("vurgu") && (
      <button onClick={() => { const y = !vurguModu; setVurguModu(y); if (!y) setVurguDuzenle(false) }} style={barButonStil(vurguModu)} title="Vurgulama modu">
        <Highlighter size={bIkon(15)} />
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
    )}

    {gorunurMu("kayit") && (
      <button onClick={() => togglePanel(setKayitAcik, !kayitAcik)} style={barButonStil(kayitAcik)} title="Kayıtlar">
        <Bookmark size={bIkon(15)} />
        {toplamKayit > 0 && (
          <span style={{ fontSize: "10px", background: theme.accent, color: "#fff", borderRadius: "10px", padding: "1px 5px", marginLeft: "2px" }}>
            {toplamKayit}
          </span>
        )}
      </button>
    )}

    {gorunurMu("arama") && (
      <button onClick={() => togglePanel(setAramaAcik, !aramaAcik)} style={barButonStil(aramaAcik)} title="Metinde ara">
        <Search size={bIkon(15)} />
      </button>
    )}

    {gorunurMu("oto") && (
      <button onClick={() => setOtomatikKaydirma(!otomatikKaydirma)} style={barButonStil(otomatikKaydirma)}>
        {otomatikKaydirma ? <Pause size={bIkon(15)} /> : <Play size={bIkon(15)} />}
      </button>
    )}
    {gorunurMu("oto") && otomatikKaydirma && (
      <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
        <button onClick={() => setKaydirmaHizi(Math.max(1, kaydirmaHizi - 1))} style={{ ...barButonStil(), padding: "2px" }}><Minus size={bIkon(13)} /></button>
        <span style={{ fontSize: "12px", color: theme.textSecondary }}>{kaydirmaHizi}</span>
        <button onClick={() => setKaydirmaHizi(Math.min(20, kaydirmaHizi + 1))} style={{ ...barButonStil(), padding: "2px" }}><Plus size={bIkon(13)} /></button>
      </div>
    )}

    <div style={{
      display: "flex", gap: "8px", alignItems: "center",
      ...(isMobile ? {} : { marginLeft: "auto" }),
    }}>
      {gorunurMu("kisim") && mevcutKisim && (
        <span onClick={(e) => { const yol = mevcutKisimYolu.map(b => b.baslik).join(" / "); dipnotTikla(mevcutKisim.aciklama || yol, e, yol) }}
          title={mevcutKisimYolu.map(b => b.baslik).join(" / ")}
          style={{ fontSize: `${Math.round(11 * barUiOlcegi)}px`, color: theme.textSecondary, padding: "4px 6px", maxWidth: isMobile ? "150px" : "260px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", cursor: "pointer" }}>
          {mevcutKisimYolu.map(b => b.baslik).join(" / ")}
        </span>
      )}
      {gorunurMu("sure") && (
        <span style={{ fontSize: `${Math.round(11 * barUiOlcegi)}px`, color: theme.textSecondary, padding: "4px 6px", display: "flex", alignItems: "center", gap: "3px" }}>
          <Clock size={bIkon(11)} /> {dakikaFormatla(bugunSure)}
        </span>
      )}
      {gorunurMu("sade") && (
        <button onClick={() => setSadeMode(!sadeMode)} style={{ ...barButonStil(sadeMode), padding: "4px" }} title="Sade mod">
          <Circle size={bIkon(15)} />
        </button>
      )}
      {gorunurMu("tema") && (
        <button onClick={() => togglePanel(setTemaAcik, !temaAcik)} style={{ ...barButonStil(temaAcik), padding: "4px" }} title="Tema">
          <Palette size={bIkon(15)} />
        </button>
      )}
      <button onClick={() => togglePanel(setAyarlarAcik, !ayarlarAcik)} style={{ ...barButonStil(ayarlarAcik), padding: "4px" }} title="Ayarlar">
        <Settings size={bIkon(15)} />
      </button>
    </div>
  </div>
)

// ════════════════════════════════════════════════════════════════
// RENDER
// ════════════════════════════════════════════════════════════════

return (
  <div style={{ height: "100vh", display: "flex", flexDirection: "column", background: theme.background }}>

    <style>{`@keyframes odakYanip { 0%{opacity:0} 15%{opacity:1} 70%{opacity:1} 100%{opacity:0} }`}</style>

    {barKonum === "ust" && Bar}

    {SayfaGitPopup}
    {AaPanel}
    {KayitPanel}
    {TemaPanel}
    {OzelTemaPanel}
    {AyarlarPanel}
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
          width: "300px", maxWidth: "92vw", maxHeight: "25vh", overflowY: "auto",
          boxShadow: "0 8px 24px rgba(0,0,0,0.18)",
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
            <span style={{ fontSize: "11px", color: theme.accent, letterSpacing: "1px" }}>{dipnotPopup.etiket || "DİPNOT"}</span>
            <button onClick={() => setDipnotPopup(null)} style={{ background: "none", border: "none", cursor: "pointer", color: theme.textSecondary, padding: "2px" }}><X size={14} /></button>
          </div>
          <div style={{ color: theme.text, fontSize: `${Math.round(15 * bilgiOlcegi)}px`, lineHeight: "1.7", whiteSpace: "pre-wrap" }}>
            {dipnotPopup.metin}
          </div>
        </div>
      </>
    )}

    {/* Lügat popup */}
    {popup && (
      <>
        <div onClick={() => setPopup(null)} style={{ position: "fixed", inset: 0, zIndex: 299 }} />
        <div style={{
          position: "fixed", left: popup.x, top: popup.y,
          background: theme.surface, border: `1px solid ${theme.border}`,
          borderRadius: "12px", padding: "14px 18px", zIndex: 300,
          width: "300px", maxWidth: "92vw", maxHeight: "25vh", overflowY: "auto",
          boxShadow: "0 8px 24px rgba(0,0,0,0.15)",
        }}>
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
      <div style={{ maxWidth: `${Math.round((isMobile ? 480 : 720) * (yaziBoyutu / 16))}px`, margin: "0 auto", padding: "0 24px" }}>

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
          <h1 style={{ fontSize: "98px", color: theme.accent, marginBottom: "8px", lineHeight: 1.1, fontFamily: /Nurs[iî]/.test(kitap.yazar || "") ? "LivaNur, serif" : "PlayfairDisplay, serif" }}>
            {kitap.baslik}
          </h1>
          <p style={{ color: theme.textSecondary, fontSize: "44px" }}>{kitap.yazar}</p>
        </div>

        {/* Sayfalar */}
          {kitapMetni.map((sayfa, index) => (
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
              <LazySayfa minHeight={tahminYuk(index)}>
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
                  ortala={sayfa.sayfa === 1}
                  lugatRenk={lugatRenk}
                  arapRenk={arapRenk}
                  hasiyeler={sayfa.hasiyeler}
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