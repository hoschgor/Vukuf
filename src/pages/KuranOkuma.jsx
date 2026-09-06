import { useState, useEffect, useLayoutEffect, useRef, useCallback, useMemo, } from "react"
import { createPortal } from "react-dom"
import { useNavigate } from "react-router-dom"
import { useApp } from "../AppContext"
import { okumaKaydet, KURAN_ID, normHarf } from "../data/okumaKayit"
import arapcaLugat from "../data/arapca-lugat.json"
import ayetMeal from "../data/ayet-meal.json"
import sayfaHaritaJson from "../data/sayfa-harita.json"
import SureBasligi from "../components/SureBasligi"
import Besmele from "../components/Besmele"
import MushafSayfa from "../components/MushafSayfa"
import { gorselIcinTemizle } from "../components/MushafKelime"
import PlayerBar from "../components/PlayerBar"
import KitapAyraci from "../components/KitapAyraci"
import KayitPaneli from "../components/KayitPaneli"
import KariSecici from "../components/KariSecici"
import KelimePopup from "../components/KelimePopup"
import YuklemeEkrani from "../components/YuklemeEkrani"
import IosSwitch from "../components/IosSwitch"
import AyetPopup from "../components/AyetPopup"
import { barSatirOlc } from "../components/BarSiraPaneli"
import GorselOlustur from "../components/GorselOlustur"
import { useMushaf, sureBaslangicSayfasi, ayetSayfasi } from "../data/hooks/useMushaf"
import useAudioPlayer, { BESMELE_OKUYANLAR } from "../data/hooks/useAudioPlayer"
import { useMediaQuery } from "../data/hooks/useMediaQuery"
import usePanelKilidi from "../data/hooks/usePanelKilidi"
import { flushSync } from "react-dom"
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, TouchSensor, useSensor, useSensors } from "@dnd-kit/core"
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import {
  ArrowLeft, Search, X, ChevronRight, ChevronDown, Menu,
  Play, Pause, Plus, Minus, Type, Palette,
  Settings, Circle, Clock, ChevronsUp, ChevronsDown,
  Pencil, ChevronLeft, Bookmark, BookOpen, Feather,
  Layers, Check, Shuffle, Mic, Repeat, Gem, UnfoldHorizontal, GripVertical, RotateCcw, Save, AlignLeft, AlignRight,
  Camera, FoldHorizontal, ChevronUp, ImagePlay,
} from "lucide-react"

// ── Arapça font listesi
const ARAPCA_FONTLAR = [
  { id: "kfgqpc",            label: "KFGQPC Uthmanic (Önerilen)", style: "'KFGQPC Uthmanic', serif",    google: null },
  { id: "me-quran",          label: "Me Quran",                   style: "'me_quran', serif",            google: null },
  { id: "Indopak",           label: "Indopak",                    style: "'Indopak', serif",             google: null },
  { id: "IndopakNastaleeq",  label: "Indopak Nastaleeq",          style: "'IndopakNastaleeq', serif",    google: null },
]

// Sûre adı araması için normalize: büyük/küçük + şapka/aksan duyarsız (â→a, İ/I, ş→s…)
function srNorm(s) {
  return (s || "").replace(/İ/g, "i").replace(/I/g, "ı").toLowerCase()
    .replace(/[âàáäā]/g, "a").replace(/[îïíìī]/g, "i").replace(/[ûüúùū]/g, "u")
    .replace(/[ôöóòō]/g, "o").replace(/[êëéèē]/g, "e")
    .replace(/ç/g, "c").replace(/ş/g, "s").replace(/ğ/g, "g").replace(/ı/g, "i")
    .replace(/['`’‘-]/g, "").trim()
}

// ── Özel tema sabitleri
const PALET_ALANLARI = [
  { key: "background",   label: "Ana Arka Plan" },
  { key: "surface",      label: "Yüzey Rengi" },
  { key: "text",         label: "Yazı Rengi" },
  { key: "textSecondary",label: "İkincil Yazı" },
  { key: "accent",       label: "Vurgu Rengi" },
  { key: "lugatHighlight",label: "Allah lafızları" },
  { key: "ayetNoRengi",  label: "Âyet Numarası" },
  { key: "border",       label: "Kenarlık Rengi" },
]

const HAZIR_RENKLER = [
  "#f4ecd8", "#ffffff", "#1a1a2e", "#0d0d0d",
  "#8b5e3c", "#c41e3a", "#2e8b57", "#4a90e2", "#9b59b6", "#e67e22",
  "#3a3a3a", "#666666", "#999999", "#cccccc",
]

// ── Yardımcı fonksiyonlar
function normalize(k) {
  k = k.replace(/[\u0610-\u061A\u064B-\u065F\u0640\u0670\u06D6-\u06DC\u06DF-\u06E4\u06E7\u06E8\u06EA-\u06ED\u06E1\u08D1\u08D6]/g, "")
  k = k.replace(/[\u0671\u0622\u0623\u0625]/g, "\u0627")
  k = k.replace(/^\u0627\u0644/, "\u0644")
  return k.trim()
}

function dakikaFormatla(saniye) {
  const saat   = Math.floor(saniye / 3600)
  const dakika = Math.floor((saniye % 3600) / 60)
  if (saat === 0 && dakika === 0) return "1 dk'dan az"
  return `${saat > 0 ? saat + " sa " : ""}${dakika > 0 ? dakika + " dk" : ""}`.trim()
}

function bugunAnahtari() {
  const now = new Date()
  return `vukuf-sure-kuran-${now.getFullYear()}-${now.getMonth()}-${now.getDate()}`
}

function popupKonum(e) {
  const x = Math.min(e.clientX, window.innerWidth - 310)
  const y = e.clientY + 12 + 220 > window.innerHeight
    ? e.clientY - 200
    : e.clientY + 12
  return { x, y }
}

// ── Lugat arama
function lugat(kelimeHam) {
  const temiz = normalize(kelimeHam)
  return arapcaLugat[temiz] || null
}
function AyarToggle({ etiket, aktif, onToggle, theme, isMobile, barUiOlcegi }) {
  return (
    <div onClick={onToggle} role="button" aria-pressed={aktif} style={{
      width: "100%", padding: "7px 10px", borderRadius: "8px",
      fontSize: `${Math.round((isMobile ? 12 : 13) * barUiOlcegi)}px`,
      color: theme.text,
      cursor: "pointer", display: "flex", alignItems: "center",
      justifyContent: "space-between", gap: "12px", marginBottom: "3px",
    }}>
      <span>{etiket}</span>
      <IosSwitch acik={aktif} theme={theme} boyut={0.8} />
    </div>
  )
}

// Sade modda gösterilip gizlenebilen bar öğeleri (Sade Mod İçerikleri bölümü + gizleme mantığı)
// Videoda gösterilecek AZAMİ âyet sayısı (Bakara gibi uzun sûreler için sınır)
const VIDEO_AZAMI_AYET = 25

const SADE_OGELERI = [
  { key: "sureMenu",    label: "Sûre Menüsü" },
  { key: "kayit",       label: "Kayıt Menüsü" },
  { key: "sayfaGit",    label: "Sayfaya Gitme" },
  { key: "tekrar",      label: "Tekrar (Döngü)" },
  { key: "yaziTipi",    label: "Yazı Tipi" },
  { key: "otoOynat",    label: "Otomatik Oynatma" },
  { key: "tema",        label: "Tema Paneli" },
  { key: "okumaZamani", label: "Okuma Zamanı" },
  { key: "sureBilgisi", label: "Sûre Bilgisi" },
  { key: "cuzBilgisi",  label: "Cüz Bilgisi" },
  { key: "hizbBilgisi", label: "Hizb Bilgisi" },
  { key: "bilgi",       label: "Bilgi (İşaretler)" },
  { key: "gorsel",      label: "Görsel / Video" },
]

// Alt bardaki SIRALANABİLİR butonlar (varsayılan sıra). Geri tuşu ve sağdaki
// sade/tema/ayarlar kümesi sabittir.
const SIRALANABILIR = [
  { key: "geri",        label: "Geri",               Ikon: ArrowLeft, taraf: "sol" },
  { key: "sureMenu",    label: "Sûre Menüsü",        Ikon: Menu,      taraf: "sol" },
  { key: "kayit",       label: "Kayıt",              Ikon: Bookmark,  taraf: "sol" },
  { key: "sayfaGit",    label: "Sayfaya Gitme",      Ikon: BookOpen,  taraf: "sol" },
  { key: "tekrar",      label: "Tekrar (Döngü)",     Ikon: Repeat,    taraf: "sol" },
  { key: "bilgi",       label: "Bilgi (İşaretler)",  Ikon: Gem,  taraf: "sol" },
  { key: "gorsel",      label: "Görsel / Video",     Ikon: ImagePlay, taraf: "sol" },
  { key: "yaziTipi",    label: "Yazı Tipi",          Ikon: Feather,   taraf: "sol" },
  { key: "otoOynat",    label: "Otomatik Kaydırma",  Ikon: Play,      taraf: "sol" },
  { key: "sadeMod",     label: "Sade Mod",           Ikon: Circle,    taraf: "sag" },
  { key: "tema",        label: "Tema Paneli",        Ikon: Palette,   taraf: "sag" },
  { key: "ayarlar",     label: "Ayarlar",            Ikon: Settings,  taraf: "sag" },
  { key: "okumaZamani", label: "Okuma Zamanı",       Ikon: Clock,     taraf: "sag" },
  { key: "sureBilgisi", label: "Sûre Bilgisi",       Ikon: Layers,    taraf: "sag" },
  { key: "cuzHizb",     label: "Cüz / Hizb Bilgisi", Ikon: BookOpen,  taraf: "sag" },
]
const VARSAYILAN_SIRA = SIRALANABILIR.map(o => o.key)
const SIRA_BILGI = Object.fromEntries(SIRALANABILIR.map(o => [o.key, o]))
const VARSAYILAN_TARAF = Object.fromEntries(SIRALANABILIR.map(o => [o.key, o.taraf]))

// Sürüklenebilir sıra satırı — ana menüdeki (Kütüphane) davranışın aynısı: 6 noktalı
// tutamaktan sürüklenir. Sağda öğenin SOLA mı SAĞA mı yaslanacağı seçilir.
function SiraSatiri({ k, taraf, onTaraf, theme, isMobile }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: k })
  const o = SIRA_BILGI[k]
  if (!o) return null
  const Ikon = o.Ikon
  const yasBtn = (deger, Simge) => (
    <button
      // Bu düğmeler sürüklemeyi BAŞLATMASIN (satırın tamamı sürükleme tutamağı)
      onPointerDown={(e) => e.stopPropagation()}
      onTouchStart={(e) => e.stopPropagation()}
      onClick={(e) => { e.stopPropagation(); onTaraf(k, deger) }}
      title={deger === "sol" ? "Sola yasla" : "Sağa yasla"}
      style={{
        display: "flex", alignItems: "center", padding: "4px",
        borderRadius: "5px", cursor: "pointer",
        border: `1px solid ${taraf === deger ? theme.accent : theme.border}`,
        background: taraf === deger ? `${theme.accent}1e` : "transparent",
        color: taraf === deger ? theme.accent : theme.textSecondary,
      }}
    ><Simge size={12} /></button>
  )
  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      style={{
        transform: CSS.Transform.toString(transform), transition,
        display: "flex", alignItems: "center", gap: "8px",
        padding: "7px 8px", borderRadius: "8px",
        background: theme.background,
        border: `1px solid ${isDragging ? theme.accent : theme.border}`,
        boxShadow: isDragging ? "0 6px 18px rgba(0,0,0,0.25)" : "none",
        marginBottom: "5px", position: "relative", zIndex: isDragging ? 5 : 1,
        // Satırın TAMAMI tutamak; yazı seçilmesin ki sürükleme kesilmesin
        cursor: isDragging ? "grabbing" : "grab",
        touchAction: "none",
        userSelect: "none", WebkitUserSelect: "none", msUserSelect: "none",
        WebkitTouchCallout: "none", WebkitTapHighlightColor: "transparent",
      }}
    >
      <span style={{ color: theme.textSecondary, display: "flex", flexShrink: 0 }}>
        <GripVertical size={16} />
      </span>
      <Ikon size={15} color={theme.accent} style={{ flexShrink: 0 }} />
      <span style={{
        flex: 1, minWidth: 0, color: theme.text,
        fontSize: isMobile ? "12px" : "13px",
        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
      }}>{o.label}</span>
      <span style={{ display: "flex", gap: "3px", flexShrink: 0 }}>
        {yasBtn("sol", AlignLeft)}
        {yasBtn("sag", AlignRight)}
      </span>
    </div>
  )
}

// ── BİLGİ PANELİ İÇERİĞİ ──────────────────────────────────────────────────────
// Renkler MushafKelime'deki çizim renkleriyle BİREBİR aynı tutulmalı (VAKIF_RENKLERI / TECVID_ISARET).
const BILGI_BOLUMLERI = [
  {
    baslik: "Sayfa İşaretleri",
    satirlar: [
      { secde: true, renk: "#2e7d4f", ad: "Secde âyeti",     aciklama: "Okununca tilâvet secdesi gerekir. Sayfa kenarında bu rozetle gösterilir.", ornek: "A'râf 206" },
      { cuz: true,   renk: "#b8860b", ad: "Cüz başlangıcı",  aciklama: "Cüz başlangıcında, cüz numarasını gösterir." },
    ],
  },
  {
    baslik: "Vakıf (Durak) İşaretleri",
    satirlar: [
      { sembol: "م",  renk: "#e74c3c", ad: "Vakf-ı lâzım",      aciklama: "Durmak gerekir; geçilirse mânâ bozulur." },
      { sembol: "ط",  renk: "#e67e22", ad: "Vakf-ı mutlak",     aciklama: "Durmak evlâdır." },
      { sembol: "ج",  renk: "#f39c12", ad: "Vakf-ı câiz",       aciklama: "Durmak da geçmek de câizdir." },
      { sembol: "ص",  renk: "#2ecc71", ad: "Vakf-ı murahhas",   aciklama: "Nefes yetmezse durulur; geçmek evlâdır." },
      { sembol: "ق",  renk: "#3498db", ad: "Kîle aleyhi'l-vakf", aciklama: "Durulur denmiştir; geçmek evlâdır." },
      { sembol: "لا", renk: "#e67e22", ad: "Lâ vakfe",          aciklama: "Burada durulmaz; âyet sonu değilse geçilir." },
      { sembol: "مع", renk: "#9b59b6", ad: "Muânaka (sarmaşık)", aciklama: "Yan yana iki noktadan YALNIZ birinde durulur." },
      { sembol: "س",  renk: "#1abc9c", ad: "Sekte",             aciklama: "Nefes almadan kısa bir duruş yapılır." },
    ],
  },
  {
    baslik: "Tecvid / Kıraat İşaretleri",
    satirlar: [
      { sembol: "س",  renk: "#c0392b", ad: "Kıraat farkı: sîn",  aciklama: "Harfin ALTINDA. Sîn ile de okunabileceğini gösterir.", ornek: "Bakara 245" },
      { sembol: "ص",  renk: "#c0392b", ad: "Kıraat farkı: sâd",  aciklama: "Harfin ÜSTÜNDE. Sâd ile de okunabileceğini gösterir.", ornek: "Bakara 245" },
      { sembol: "◆",  renk: "#8e44ad", ad: "İmâle",              aciklama: "Elifi \"e\"ye meylettirerek okumak.", ornek: "Hûd 41" },
      { sembol: "○",  renk: "#16a085", ad: "İşmâm",              aciklama: "Ötreyi dudak yumarak sessizce göstermek.", ornek: "Yûsuf 11" },
      { sembol: "م",  renk: "#2980b9", ad: "İdgâm-ı mütecâniseyn", aciklama: "Mahreçleri bir, sıfatları ayrı iki harfin birleşmesi.", ornek: "Hûd 42" },
      { sembol: "ن",  renk: "#c0392b", ad: "Küçük nûn (sıla)",   aciklama: "Vasıl hâlinde okunan ince nûn.", ornek: "Hûd 42" },
      { sembol: "٥",  renk: "#7f8c8d", ad: "Vasılda okunmaz",    aciklama: "Geçerek okunduğunda bu harf okunmaz." },
      { sembol: "مد", renk: "#c0392b", ad: "Medd",               aciklama: "Uzatarak okuma işareti." },
      { sembol: "قصر", renk: "#c0392b", ad: "Kasr",              aciklama: "Uzatmadan, kısa okuma işareti." },
    ],
  },
]

// Ayete odaklanırken kaydırma çıpası:
//  - data-ayet ayet-sonu ROZETİNDE (ayet numarası). Ayetin BAŞI = önceki ayet
//    rozetinin bir sonraki kardeşi (ilk kelime). Onu üste hizalarsak ayet başı
//    en üstte olur; ayet yeni satırdaysa o satır, aynı satırdaysa önceki ayetin
//    bitişiyle birlikte üstte gelir.
//  - Ayet 1 / sayfanın ilk ayeti → sûre başlığı ya da sayfa bloğu başı.
function odakKaydirElemani(el, sureId, ayetNo, hedefEl) {
  const sayfaEl = hedefEl.closest("[data-index]")
  // Ayet 1 → sûre başlığı (yoksa sayfa başı)
  if (!ayetNo || ayetNo <= 1) {
    const baslik = el.querySelector(`[data-sure-baslik="${sureId}"]`)
    if (baslik && (!sayfaEl || baslik.closest("[data-index]") === sayfaEl)) return baslik
    return sayfaEl || hedefEl
  }
  // Önceki ayet AYNI sayfada ise: ayetin ilk kelimesi = önceki rozetin sonraki kardeşi
  const onceki = el.querySelector(`[data-sure="${sureId}"][data-ayet="${ayetNo - 1}"]`)
  if (onceki && sayfaEl && onceki.closest("[data-index]") === sayfaEl) {
    let ilk = onceki.nextElementSibling
    // Kelime, display:contents SARMALAYICI (data-kelime) içinde → getBoundingClientRect boş
    // döner. Gerçek KUTULU kelime elemanını (içteki çocuk) al ki hizalama doğru olsun.
    if (ilk && ilk.getAttribute && ilk.getAttribute("data-kelime") != null) ilk = ilk.firstElementChild || ilk
    if (ilk) return ilk
  }
  // Önceki ayet farklı sayfada / yok → ayet bu sayfanın BAŞINDA başlıyor → sayfa başı
  return sayfaEl || hedefEl
}

// ════════════════════════════════════════════════════════════════
// SAYFA BLOK — akış modeli (react-virtual YOK). Sayfa görünüme YAKLAŞINCA gerçek içeriği
// render eder ve bir daha KALDIRMAZ → sayfa sınırlarında yeniden-render/göz kırpma olmaz.
// Sayfalar normal akışta olduğu için tarayıcının doğal scroll-anchoring'i konumu sabit tutar
// (sıçrama yok) ve her sayfa DOM'da (yer tutucu) olduğundan gidişler anındadır.
// ════════════════════════════════════════════════════════════════
const NOOP_OLCUM = () => {}
// Sayfa bloğu: içerik iki yoldan mount edilir → (1) IntersectionObserver (yavaş/normal kaydırma),
// (2) `zorla` — üst bileşenin SCROLL konumundan hesapladığı pencere. iOS'ta momentum (fling)
// kaydırması sırasında IO geri-çağrıları kısılıyor → sayfa görünüme mount OLMADAN giriyordu
// (boş kare) sonra dolup sıçrıyordu. Scroll dinleyicisi momentum'da da tetiklendiği için `zorla`
// pencresi sayfaları görünüme GİRMEDEN ÖNCE mount eder → boş kare yok, sıçrama yok.
function SayfaBlok({ minHeight, margin, gorunur0 = false, zorla = false, cocuk, scrollRef }) {
  const ref = useRef(null)
  const [ioGor, setIoGor] = useState(gorunur0)
  const goster = ioGor || zorla
  useEffect(() => {
    if (ioGor) return
    const el = ref.current
    if (!el) return
    // ÖNEMLİ: root = SCROLL KONTEYNERİ (varsayılan viewport DEĞİL). IO burada yalnız yedek
    // tetikleyici; asıl mount `zorla` (scroll-penceresi) ile önden yapılıyor.
    const io = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setIoGor(true); io.disconnect() } },
      { root: (scrollRef && scrollRef.current) || null, rootMargin: margin }
    )
    io.observe(el)
    return () => io.disconnect()
  }, [ioGor, margin])

  // NOT: scrollTop TELAFİSİ KALDIRILDI. iOS'ta momentum (fling) sırasında programatik scrollTop
  // yazımı fling'i ANINDA durduruyordu ("sıçrayıp duruyor"). Onun yerine konumu tarayıcının DOĞAL
  // scroll-anchoring'i tutuyor (konteynerde overflowAnchor:auto) — compositor'da çalışır, momentum'u
  // kesmez. Scroll-penceresi sayfaları önden mount ettiği için anchoring'in tutunacağı gerçek içerik
  // hazır olur (boş kare yok).
  return (
    <div ref={ref} style={{ minHeight: goster ? undefined : `${minHeight}px` }}>
      {goster ? cocuk : null}
    </div>
  )
}

// ════════════════════════════════════════════════════════════════
// ANA BİLEŞEN
// ════════════════════════════════════════════════════════════════
export default function KuranOkuma({ kitap }) {
  const {
    theme, currentTheme, setCurrentTheme,
    customTheme, ozelTemaKaydet: ozelTemaKaydetFromContext,
  } = useApp()
  const navigate  = useNavigate()
  const isMobile  = useMediaQuery("(max-width: 768px)")
  const genisEkran = useMediaQuery("(min-width: 1024px)")   // yatay telefon (<1024) bar sağa kaymasın
  const scrollRef = useRef(null)

  // Son/Sık Okunanlar rafları için okuma kaydı
  useEffect(() => { okumaKaydet(KURAN_ID) }, [])
  const [odakAyet, setOdakAyet] = useState(null)
  const [odakSure, setOdakSure] = useState(null)
  const odakSureNonce = useRef(0)
  const odakSureTimeoutRef = useRef(null)
  const [odakAyrac, setOdakAyrac] = useState(null)
  const odakAyracTimeoutRef = useRef(null)
  const kuranHedefRef = useRef(false)   // Arama'dan gelen sure hedefi işlendi mi
  const [donusTip, setDonusTip] = useState("")   // "arama" | "tefeul" | "okuma"
  const [donusYol, setDonusYol] = useState("")   // "okuma" için geri dönülecek kitap yolu
  // ── TEKRAR / DÖNGÜ ──
  const [tekrarModu, setTekrarModu] = useState(null)     // aktif mod: null | "sayfa" | "ayet" | "sure"
  const [donguAyarAcik, setDonguAyarAcik] = useState(false)
  const [tmMod, setTmMod] = useState("ayet")             // panel form: seçili mod
  const [tmSayfaBas, setTmSayfaBas] = useState(1)
  const [tmSayfaSon, setTmSayfaSon] = useState(1)
  const [tmSure, setTmSure] = useState(1)
  const [tmSureArama, setTmSureArama] = useState("")   // sûre adı arama kutusu
  const [tmAyetBas, setTmAyetBas] = useState(1)
  const [tmAyetSon, setTmAyetSon] = useState(1)
  const [tmBesmele, setTmBesmele] = useState(true)   // döngüde sûre başına gelince besmele ile başla
  const [kariSecAcik, setKariSecAcik] = useState(false)   // döngü panelinde kâri seçim listesi açık mı
  const [sureUyari, setSureUyari] = useState("")     // Sûre modunda maks aşımı: 3 sn'lik uyarı
  const sureUyariTimerRef = useRef(null)
  const sureUyariGoster = useCallback((mesaj) => {
    setSureUyari(mesaj)
    if (sureUyariTimerRef.current) clearTimeout(sureUyariTimerRef.current)
    sureUyariTimerRef.current = setTimeout(() => setSureUyari(""), 3000)
  }, [])
  const barZamanRef  = useRef(null)
  const sureSayacRef = useRef(null)
  const scrollHiziRef = useRef({ sonScrollTop: 0, sonZaman: Date.now(), scrollSayisi: 0 })
  const scrollOranRef = useRef(0)
  const [kayitPaneliAcik, setKayitPaneliAcik] = useState(false)

  // ── Ses sistemi
  const player = useAudioPlayer()

  // ── Veri
  const [mushafData, setMushafData] = useState([])
  const [yukleniyor, setYukleniyor] = useState(true)
  const [scrollKilitli, setScrollKilitli] = useState(false)

  // ── Popup
  // Menü/panel açıkken arka sayfa HİÇ kaymasın; onun yerine panel kısa bir sarsıntı yapsın
  usePanelKilidi()
  const [popup, setPopup] = useState(null)

  // ── Sayfa navigasyonu
  const [mevcutSayfa, setMevcutSayfa] = useState(() =>
    parseInt(localStorage.getItem("vukuf-son-sayfa") || "1")
  )
  // Son konum: mount'ta bir kez oku (scroll takibi ezmeden önce), geri yükle.
  // {sayfa, oran} → sayfa ORTASINDA çıkıldıysa oraya (satır hizasına) dönebilmek için oran da saklanır.
  const sonKonumOku = () => {
    try { const k = JSON.parse(localStorage.getItem("vukuf-son-konum") || "null"); if (k && k.sayfa) return k } catch {}
    return { sayfa: parseInt(localStorage.getItem("vukuf-son-sayfa") || "1") || 1, oran: 0 }
  }
  const _sonKonum0 = sonKonumOku()
  const hedefSayfaRef = useRef(_sonKonum0.sayfa)
  const hedefOranRef = useRef(_sonKonum0.oran || 0)
  const sonKonumRef = useRef({ sayfa: _sonKonum0.sayfa, oran: _sonKonum0.oran || 0 })  // anlık konum (kaydetmek için)
  const geriYuklendiRef = useRef(false)
  // ════════════════════════════════════════════════════════════════
  // SCROLL-PENCERESİ (mobil sıçrama çözümü)
  // Temel kural: bir sayfa mount olunca yüksekliği tahminden GERÇEĞE atlar. Bu fark, sayfa
  // görünümün ÜSTÜNDEYSE altındaki her şeyi kaydırır = SIÇRAMA. Safari (iOS) scroll-anchoring'i
  // DESTEKLEMEDİĞİ için tarayıcı bunu gizleyemiyor (Chrome/Firefox gizlediğinden webde sorun yok).
  // Çözüm, farkı telafi etmek değil, MOMENTUM SIRASINDA ÜSTTE HİÇ MOUNT ETMEMEK:
  //  • AŞAĞI yöndeki sayfalar her zaman mount edilir → görünümü kaydırmaz, sıçrama üretmez.
  //  • YUKARI yöndeki sayfalar YALNIZ parmak ekrandayken veya kaydırma durmuşken mount edilir;
  //    o anda momentum yoktur, konumu ölçüm-tabanlı "yeniden sabitleme" ile birebir koruruz.
  //  • Fling (parmak kalkmış, kayıyor) sırasında üst pencere DONDURULUR → hiç yükseklik değişmez
  //    → hiç sıçrama olmaz. Üst tampon geniş tutulduğu için fling boyunca hazır sayfa biter değil.
  // ════════════════════════════════════════════════════════════════
  const PENCERE_ALT = 12     // aşağı tampon (her zaman güvenli, sıçrama üretmez)
  const PENCERE_UST = 30     // yukarı tampon: fling ne kadar uzun olsa da hazır sayfa bitmesin
  const UST_ADIM = 8         // yukarı tampon kademeli büyür (tek seferde donma olmasın)
  const gosterSetRef = useRef(new Set())
  const [, setGosterNonce] = useState(0)
  const dokunuyorRef = useRef(false)      // parmak ekranda mı
  const sonScrollAnRef = useRef(0)        // son scroll olayının zamanı
  const sonScrollTopRef = useRef(-1)      // "gerçekten durdu mu" kontrolü
  const durakTimerRef = useRef(null)      // kaydırma durunca üst tamponu büyüt
  const oturtRef = useRef(null)           // geç oturan yükseklikleri yutan kısa "sabit tut" döngüsü
  const beklenenTopRef = useRef(-1)       // BİZİM yazdığımız son scrollTop (kullanıcı kaydırmasını ayırt etmek için)

  // Çıpayı ölçüp konumu birebir geri koyar. Tek atışta yapmak yetmiyordu: tarayıcı scrollTop'u
  // yuvarlıyor ve geriye ~1px artık kalıyordu (kendiliğinden duruşta "1px yukarı kayma").
  // Ölç → yaz → TEKRAR ölç döngüsüyle artık 0.25px altına iner.
  const konumSabitle = (sc, cipa, hedefTop, tur = 3) => {
    for (let i = 0; i < tur; i++) {
      const d = (cipa.getBoundingClientRect().top - sc.getBoundingClientRect().top) - hedefTop
      if (Math.abs(d) < 0.25) break
      sc.scrollTop += d
    }
    beklenenTopRef.current = sc.scrollTop
  }

  // AŞAĞI pencere: görünümün ALTINA sayfa eklemek görüneni kaydırmaz → telafi GEREKTİRMEZ.
  // Kaydırma dinleyicisinden (momentum dâhil) serbestçe çağrılabilir.
  const altPencere = useCallback((no) => {
    if (!no) return
    const set = gosterSetRef.current
    let degisti = false
    for (let p = no; p <= no + PENCERE_ALT; p++) {
      if (!set.has(p)) { set.add(p); degisti = true }
    }
    if (degisti) setGosterNonce(n => n + 1)
  }, [])

  // Gidiş/açılış: hedefin iki yanını da doldur. Sonrasında zaten hedefe kaydırılacağı için
  // konum düzeltmesi YAPILMAZ (düzeltme o kaydırmayla çakışırdı).
  const pencereHazirla = useCallback((no) => {
    if (!no) return
    const set = gosterSetRef.current
    let degisti = false
    for (let p = Math.max(1, no - PENCERE_UST); p <= no + PENCERE_ALT; p++) {
      if (!set.has(p)) { set.add(p); degisti = true }
    }
    if (degisti) setGosterNonce(n => n + 1)
  }, [])

  // YUKARI pencere — YALNIZ kaydırma TAMAMEN durmuşken çağrılır.
  // Üste sayfa eklemek görüneni kaydırır, bunu telafi etmek gerekir. KRİTİK: ölçüm ile DOM
  // mutasyonu AYNI SENKRON BLOKTA olmalı. Önceki sürümde ölçüm zamanlayıcıda, mutasyon sonraki
  // render'da yapılıyordu; arada kaydırma bir tık ilerlediği için telafi "büyümeyi" değil ESKİ
  // KAYDIRMA KONUMUNU geri yüklüyor ve dururken geriye sıçratıyordu (videoda +36/+38 px).
  // flushSync ile mutasyon senkron yapılır → araya kaydırma giremez → telafi birebir doğru.
  const ustPencereBuyut = useCallback(() => {
    const sc = scrollRef.current
    if (!sc || dokunuyorRef.current) return
    const no = sonKonumRef.current?.sayfa
    const cipa = no && sayfaRefs.current[no]
    if (!no || !cipa) return
    const set = gosterSetRef.current
    let enKucuk = no
    while (enKucuk > 1 && set.has(enKucuk - 1)) enKucuk--
    const kademe = Math.max(Math.max(1, no - PENCERE_UST), enKucuk - UST_ADIM)
    if (kademe >= enKucuk) return                    // büyüyecek yer yok
    let eklendi = false
    for (let p = kademe; p < enKucuk; p++) { if (!set.has(p)) { set.add(p); eklendi = true } }
    if (!eklendi) return

    const oncekiTop = cipa.getBoundingClientRect().top - sc.getBoundingClientRect().top
    flushSync(() => setGosterNonce(n => n + 1))      // DOM'u SENKRON güncelle
    konumSabitle(sc, cipa, oncekiTop)                // büyümeyi birebir telafi et (görünmez)

    // Geç oturan yükseklikler (font/ölçüm) için kısa süre çıpayı sabit tut. Kullanıcı dokunursa
    // ya da ARAYA GERÇEK BİR KAYDIRMA girerse DERHAL bırak: momentum sırasında scrollTop'a
    // yazmak iOS'ta akışı öldürüyor ("yukarı çekip bıraktığımda yarıda duruyor").
    if (oturtRef.current) cancelAnimationFrame(oturtRef.current)
    const bitis = performance.now() + 300
    const tut = () => {
      oturtRef.current = null
      if (dokunuyorRef.current) return
      const s2 = scrollRef.current, c2 = sayfaRefs.current[no]
      if (!s2 || !c2) return
      // Bizim yazdığımızdan başka bir sebeple konum değiştiyse (momentum/kullanıcı) → çekil
      if (beklenenTopRef.current >= 0 && Math.abs(s2.scrollTop - beklenenTopRef.current) > 1.5) return
      const d = (c2.getBoundingClientRect().top - s2.getBoundingClientRect().top) - oncekiTop
      if (Math.abs(d) > 0.5) konumSabitle(s2, c2, oncekiTop, 2)
      if (performance.now() < bitis) oturtRef.current = requestAnimationFrame(tut)
    }
    oturtRef.current = requestAnimationFrame(tut)
  }, [])
  // İlk açılışta VE bir âyete/sayfaya giderken (mobilde) kaydırma "oturana" kadar
  // içeriği gizle → kullanıcı ara geçişi/mini sıçramayı görmez, doğrudan hedefte açılır.
  const [konumHazir, setKonumHazir] = useState(false)
  const konumHazirRef = useRef(false)
  const konumGoster = useCallback((v) => {   // iki yönlü (gizle/göster)
    konumHazirRef.current = v
    setKonumHazir(v)
  }, [])
  const konumuGoster = useCallback(() => konumGoster(true), [konumGoster])
  const gecisGosterTimerRef = useRef(null)   // gizli kalırsa en geç bu süre sonra göster (emniyet)
  // Açılış örtüsü: ilk açılış/atıf'ta konum oturana dek rozet gösterilir; oturunca (konumHazir)
  // solarak kalkar (içerik altında zaten doğru konumda → kayma görünmez). Sonra DOM'dan kalkar.
  const [acilisOrtu, setAcilisOrtu] = useState(true)
  useEffect(() => {
    if (!konumHazir) return
    const t = setTimeout(() => setAcilisOrtu(false), 420)   // fade süresinden biraz sonra kaldır
    return () => clearTimeout(t)
  }, [konumHazir])
  
  const [sayfaGirdi, setSayfaGirdi] = useState("")
  const [sayfaGirdiAcik, setSayfaGirdiAcik] = useState(false)
  const [kayitKonumModu, setKayitKonumModu] = useState(false)
  // GÖRSEL OLUŞTUR: fotoğraf makinesi butonu "âyet seçme modunu" açar; kullanıcı bir âyete
  // dokununca o âyetin verisiyle görsel paneli açılır. ayetTikla useCallback([]) olduğundan
  // mod ve açıcı REF üzerinden okunur (kimlik değişip MushafSayfa'yı boşa render etmesin).
  const [gorselModu, setGorselModu] = useState(false)
  const gorselModuRef = useRef(false)
  const gorselAcRef = useRef(null)
  const [gorselVeri, setGorselVeri] = useState(null)
  useEffect(() => { gorselModuRef.current = gorselModu }, [gorselModu])
  

  const [kayitlar, setKayitlar] = useState(() => {
    try { return JSON.parse(localStorage.getItem("vukuf-kayitlar") || "[]") }
    catch { return [] }
  })
  const mevcutKayit = kayitlar.find(k => k.sayfa === mevcutSayfa)
  
  
  // ── Yazı boyutu
  const [yaziBoyutu, setYaziBoyutu] = useState(() =>
    // Kuran'ın kendi yazı boyutu anahtarı → Okuma ekranından BAĞIMSIZ (birbirini etkilemez)
    parseInt(localStorage.getItem("vukuf-kuran-yazi-boyutu") || localStorage.getItem("vukuf-yazi-boyutu") || "20")
  )
  const [satirAraligi, setSatirAraligi] = useState(() =>
    parseFloat(localStorage.getItem("vukuf-satir-araligi") || "2.4")
  )
  // TAM GENİŞLİK: sayfa metnini ekran boyunca yayar, kenar boşluğu bırakmaz (web + mobil;
  // yüksek çözünürlüklü ekranda küçük puntoyla tam ekran okumak isteyenler için).
  const [tamGenislik, setTamGenislik] = useState(() => localStorage.getItem("vukuf-tam-genislik") === "true")
  useEffect(() => { localStorage.setItem("vukuf-tam-genislik", String(tamGenislik)) }, [tamGenislik])
  // KENAR BOŞLUĞU: Tam Genişlik'in tersi. Metin genişliği yazı boyutuyla BÜYÜMEZ; ekranın
  // sabit bir yüzdesinde kalır → yazı ne kadar büyürse büyüsün kenarlarda boşluk durur ve
  // satır uzunluğu sabit kaldığı için (özellikle webde) satır takibi kolaylaşır.
  const [kenarBosluk, setKenarBosluk] = useState(() => localStorage.getItem("vukuf-kenar-bosluk") === "true")
  useEffect(() => { localStorage.setItem("vukuf-kenar-bosluk", String(kenarBosluk)) }, [kenarBosluk])
  // İkisi aynı anda açık olamaz (biri kenar boşluğunu kaldırır, diğeri ekler)
  const tamGenislikDegis = () => setTamGenislik(v => { const y = !v; if (y) setKenarBosluk(false); return y })
  const kenarBoslukDegis = () => setKenarBosluk(v => { const y = !v; if (y) setTamGenislik(false); return y })
  const [harfAraligi, setHarfAraligi] = useState(() =>
    parseFloat(localStorage.getItem("vukuf-harf-araligi") || "0")
  )

  // ── Bar
  const [barGorunur, setBarGorunur]       = useState(true)
  const [barKonum, setBarKonum]           = useState(() => localStorage.getItem("vukuf-bar-konum") || "alt")
  const [sadeMode, setSadeMode]           = useState(() => localStorage.getItem("vukuf-sade-mod") === "true")
  const [otomatikGizleme, setOtomatikGizleme] = useState(() => localStorage.getItem("vukuf-otomatik-gizleme") === "true")   // varsayılan KAPALI (yeni kullanıcı bar gizlemeden başlar)
  const [gizlemeSuresi, setGizlemeSuresi] = useState(() => parseInt(localStorage.getItem("vukuf-gizleme-suresi") || "5"))
  const [sureGoster, setSureGoster] = useState(() =>
    localStorage.getItem("vukuf-okuma-zamani") !== "false"
  )
  const touchBaslangicRef = useRef({ x: 0, y: 0 })
  const touchHareketRef = useRef(false)
  const [barKilitli, setBarKilitli] = useState(false)
  const [sureBilgisiGoster, setSureBilgisiGoster] = useState(() => localStorage.getItem("vukuf-sure-bilgisi") !== "false")
  const [cuzBilgisiGoster, setCuzBilgisiGoster] = useState(() => localStorage.getItem("vukuf-cuz-bilgisi") !== "false")
  const [hizbBilgisiGoster, setHizbBilgisiGoster] = useState(() => localStorage.getItem("vukuf-hizb-bilgisi") !== "false")
  const [sureMenuGoster, setSureMenuGoster]   = useState(() => localStorage.getItem("vukuf-btn-sure")   !== "false")
  const [kayitGoster, setKayitGoster]         = useState(() => localStorage.getItem("vukuf-btn-kayit")  !== "false")
  const [sayfaGitGoster, setSayfaGitGoster]   = useState(() => localStorage.getItem("vukuf-btn-sayfa")  !== "false")
  const [sadeModGoster, setSadeModGoster]     = useState(() => localStorage.getItem("vukuf-btn-sade")   !== "false")
  const [temaGoster, setTemaGoster]           = useState(() => localStorage.getItem("vukuf-btn-tema")   !== "false")
  const [yaziTipiGoster, setYaziTipiGoster] = useState(() => localStorage.getItem("vukuf-btn-yazitipi") !== "false")
  const [otoOynatGoster, setOtoOynatGoster] = useState(() => localStorage.getItem("vukuf-btn-otooynat") !== "false")
  const [tekrarBtnGoster, setTekrarBtnGoster] = useState(() => localStorage.getItem("vukuf-btn-tekrar") !== "false")
  const [bilgiGoster, setBilgiGoster] = useState(() => localStorage.getItem("vukuf-btn-bilgi") !== "false")   // işaret/tecvid bilgi paneli butonu
  const [gorselGoster, setGorselGoster] = useState(() => localStorage.getItem("vukuf-btn-gorsel") !== "false") // âyet paylaşım görseli butonu
  const [bilgiAcik, setBilgiAcik] = useState(false)
  // Buton sıralaması: alt bar flex olduğundan sıra CSS `order` ile veriliyor (JSX yeri değişmez).
  const [butonSirasi, setButonSirasi] = useState(() => {
    try {
      const k = JSON.parse(localStorage.getItem("vukuf-buton-sirasi") || "null")
      if (Array.isArray(k)) {
        const temiz = k.filter(x => VARSAYILAN_SIRA.includes(x))
        return [...temiz, ...VARSAYILAN_SIRA.filter(x => !temiz.includes(x))]   // yeni butonlar sona
      }
    } catch {}
    return VARSAYILAN_SIRA
  })
  const [butonTaraf, setButonTaraf] = useState(() => {
    try {
      const k = JSON.parse(localStorage.getItem("vukuf-buton-taraf") || "null")
      if (k && typeof k === "object") return { ...VARSAYILAN_TARAF, ...k }
    } catch {}
    return VARSAYILAN_TARAF
  })
  const [siraAcik, setSiraAcik] = useState(false)
  const [siraTaslak, setSiraTaslak] = useState(VARSAYILAN_SIRA)      // kaydedilene dek uygulanmaz
  const [tarafTaslak, setTarafTaslak] = useState(VARSAYILAN_TARAF)
  const [sifirlaOnay, setSifirlaOnay] = useState(false)
  const sira = (k) => { const i = butonSirasi.indexOf(k); return i === -1 ? 99 : i }
  const siraSensors = useSensors(
    // Sürükleme KOLAY başlasın: kısa mesafe / kısa basılı tutma
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 110, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )
  const siraPaneliAc = () => {
    setSiraTaslak(butonSirasi); setTarafTaslak(butonTaraf); setSifirlaOnay(false); setSiraAcik(true)
  }
  const siraKaydet = () => {
    setButonSirasi(siraTaslak); setButonTaraf(tarafTaslak)
    localStorage.setItem("vukuf-buton-sirasi", JSON.stringify(siraTaslak))
    localStorage.setItem("vukuf-buton-taraf", JSON.stringify(tarafTaslak))
    setSiraAcik(false)
  }   // döngü/tekrar barda görünsün mü (sade modda da geçerli)
  // Sade modda GİZLENECEK öğeler (true = gizli). Varsayılan: yazı tipi + oto. oynatma + okuma zamanı.
  const [sadeGizli, setSadeGizli] = useState(() => {
    try { const v = JSON.parse(localStorage.getItem("vukuf-kuran-sade-gizli") || "null"); if (v && typeof v === "object") return v } catch {}
    return { yaziTipi: true, otoOynat: true, okumaZamani: true }
  })
  const [sadeIcerikAcik, setSadeIcerikAcik] = useState(false)   // "Sade Mod İçerikleri" bölümü açık mı
  const [gorunumAcik, setGorunumAcik] = useState(false)
  

const maxWidth = useMemo(() => 
  `${Math.round((isMobile ? 480 : 720) * (yaziBoyutu / 20))}px`
, [isMobile, yaziBoyutu])

  // ── Scrollbar
  const [scrollbarGorunur, setScrollbarGorunur] = useState(false)
  const scrollbarTimeoutRef = useRef(null)


  // ── Paneller
  const [aaAcik, setAaAcik]                     = useState(false)
  const [temaAcik, setTemaAcik]                 = useState(false)
  const [ayarlarAcik, setAyarlarAcik]           = useState(false)
  const [ozelTemaPanelAcik, setOzelTemaPanelAcik] = useState(false)
  const [sayfaGitAcik, setSayfaGitAcik] = useState(false)
  const [sayfaGitInput, setSayfaGitInput] = useState("")
  // Bardaki sayfa göstergesi tipi: "tam" (202/604) | "sayfa" (202) | "ikon" (yalnız simge)
  const [sayfaGosterim, setSayfaGosterim] = useState(() => localStorage.getItem("vukuf-kuran-sayfa-gosterim") || "sayfa")
  const [sayfaGosterimAcik, setSayfaGosterimAcik] = useState(false)

  // ── Özel tema
  const [ozelRenkler, setOzelRenkler] = useState(() => {
    const k = localStorage.getItem("vukuf-ozel-tema")
    return k ? JSON.parse(k) : {
      background: "#f5f0e8", surface: "#ffffff", text: "#2c2418",
      textSecondary: "#6b5b4e", accent: "#8b5e3c",
      border: "#d4c5b0", lugatHighlight: "#c41e3a", ayetNoRengi: "#8b5e3c",
    }
  })
  const [aktifRenk, setAktifRenk] = useState(null)

  // ── Arapça font
  const [yaziTipiAcik, setYaziTipiAcik] = useState(false)   // Aa panelindeki yazı tipi listesi açık mı
  const yaziTipiBtnRef = useRef(null)
  const [arapcaFontId, setArapcaFontId] = useState(() =>
    localStorage.getItem("vukuf-kuran-arapca-font") || "kfgqpc"
  )
  const aktifArapcaFont = ARAPCA_FONTLAR.find(f => f.id === arapcaFontId) || ARAPCA_FONTLAR[0]

  // ── Okuma süresi
  const [bugunSure, setBugunSure] = useState(() =>
    parseInt(localStorage.getItem(bugunAnahtari()) || "0")
  )
  const menuKapatildiRef = useRef(false)
  // ── Sure menüsü
  const [menuAcik, setMenuAcik]   = useState(false)
  const [menuArama, setMenuArama] = useState("")
  const [acikSure, setAcikSure]   = useState(null)
  const [anaBaslik, setAnaBaslik] = useState(null)   // iki çekmece de KAPALI başlar; oturum içinde hatırlanır
  const [cuzArama, setCuzArama] = useState("")
  const [acikCuz, setAcikCuz]     = useState(null)
  const [ayetArama, setAyetArama] = useState({})

  // ── Otomatik kaydırma
  const [otomatikKaydirma, setOtomatikKaydirma] = useState(false)
  const [kaydirmaHizi, setKaydirmaHizi] = useState(1)
  const [duraklatildi, setDuraklatildi] = useState(false)
  const otomatikRef = useRef(null)

  // Panel açık mı kontrolü
  const herhangiPanelAcik = aaAcik || temaAcik || ozelTemaPanelAcik || popup !== null

  // ════════════════════════════════════════════════════════════════
  // EFFECT'LER
  // ════════════════════════════════════════════════════════════════

  useEffect(() => { localStorage.setItem("vukuf-kuran-yazi-boyutu", String(yaziBoyutu))     }, [yaziBoyutu])
  useEffect(() => { localStorage.setItem("vukuf-bar-konum",         barKonum)               }, [barKonum])
  useEffect(() => { localStorage.setItem("vukuf-sade-mod",          String(sadeMode))       }, [sadeMode])
  useEffect(() => { localStorage.setItem("vukuf-otomatik-gizleme",  String(otomatikGizleme))}, [otomatikGizleme])
  useEffect(() => { localStorage.setItem("vukuf-gizleme-suresi",    String(gizlemeSuresi))  }, [gizlemeSuresi])
  useEffect(() => { if (geriYuklendiRef.current) localStorage.setItem("vukuf-son-sayfa", String(mevcutSayfa)) }, [mevcutSayfa])
  useEffect(() => { localStorage.setItem("vukuf-kuran-sayfa-gosterim", sayfaGosterim)       }, [sayfaGosterim])
  useEffect(() => { localStorage.setItem("vukuf-satir-araligi",     String(satirAraligi))   }, [satirAraligi])
  useEffect(() => { localStorage.setItem("vukuf-harf-araligi",      String(harfAraligi))    }, [harfAraligi])
  useEffect(() => {
    localStorage.setItem("vukuf-okuma-zamani", String(sureGoster))
    localStorage.setItem("vukuf-sure-bilgisi", String(sureBilgisiGoster))
    localStorage.setItem("vukuf-cuz-bilgisi",  String(cuzBilgisiGoster))
    localStorage.setItem("vukuf-hizb-bilgisi", String(hizbBilgisiGoster))
    localStorage.setItem("vukuf-btn-sure",     String(sureMenuGoster))
    localStorage.setItem("vukuf-btn-kayit",    String(kayitGoster))
    localStorage.setItem("vukuf-btn-sayfa",    String(sayfaGitGoster))
    localStorage.setItem("vukuf-btn-sade",     String(sadeModGoster))
    localStorage.setItem("vukuf-btn-tema",     String(temaGoster))
    localStorage.setItem("vukuf-btn-yazitipi", String(yaziTipiGoster))
    localStorage.setItem("vukuf-btn-otooynat", String(otoOynatGoster))
    localStorage.setItem("vukuf-btn-tekrar",   String(tekrarBtnGoster))
    localStorage.setItem("vukuf-btn-bilgi",    String(bilgiGoster))
    localStorage.setItem("vukuf-btn-gorsel",   String(gorselGoster))
  }, [sureGoster, sureBilgisiGoster, cuzBilgisiGoster, hizbBilgisiGoster, sureMenuGoster, kayitGoster, sayfaGitGoster, sadeModGoster, temaGoster, yaziTipiGoster, otoOynatGoster, tekrarBtnGoster, bilgiGoster, gorselGoster])
  useEffect(() => { try { localStorage.setItem("vukuf-kuran-sade-gizli", JSON.stringify(sadeGizli)) } catch {} }, [sadeGizli])


  useEffect(() => {
    sureSayacRef.current = setInterval(() => {
      setBugunSure(prev => {
        const yeni = prev + 1
        localStorage.setItem(bugunAnahtari(), String(yeni))
        return yeni
      })
    }, 1000)
    return () => clearInterval(sureSayacRef.current)
  }, [])

  useEffect(() => {
    const font = ARAPCA_FONTLAR.find(f => f.id === arapcaFontId)
    
    const url = font?.google 
      ? `https://fonts.googleapis.com/css2?family=${font.google}&display=swap`
      : font?.cdnUrl || null

    if (url) {
      const linkId = `kuran-font-${arapcaFontId}`
      if (!document.getElementById(linkId)) {
        const link = document.createElement("link")
        link.id   = linkId
        link.rel  = "stylesheet"
        link.href = url
        document.head.appendChild(link)
      }
    }
    localStorage.setItem("vukuf-kuran-arapca-font", arapcaFontId)
    // Fontu önden yükle (akış modelinde ölçüm tazeleme gerekmez; tarayıcı doğal akışta yeniden dizer)
    try {
      const aile = (font?.style.match(/'[^']+'|"[^"]+"|[^,]+/) || [""])[0].trim()
      if (aile && document.fonts && document.fonts.load) document.fonts.load(`24px ${aile}`).catch(() => {})
    } catch {}
  }, [arapcaFontId])

  // kayitKonumModu true olduğunda 3 sn sonra iptal et
  useEffect(() => {
    if (kayitKonumModu) {
      setBarKilitli(true)
      const timer = setTimeout(() => setKayitKonumModu(false), 3000)
      return () => clearTimeout(timer)
    } else {
      setBarKilitli(false)
    }
  }, [kayitKonumModu])
  
  useEffect(() => {
    fetch("/kuran-mushaf.json")
      .then(r => r.json())
      .then(data => { setMushafData(data); setYukleniyor(false) })
      .catch(() => setYukleniyor(false))
  }, [])

  // ── Otomatik kaydırma (rAF + zaman-tabanlı, alt-piksel)
  // ESKİ: setInterval ile her seferinde tam 1px → hız 1'de 5px/sn (sürünüyordu) ve 1px'lik
  // sıçramalar "sekme" olarak görünüyordu; kare süresiyle senkron olmadığı için de titriyordu.
  // YENİ: requestAnimationFrame ile geçen SÜREYE göre kesirli ilerleme (px/sn). Her karede
  // ekran yenilemesiyle senkron, alt-piksel → tamamen pürüzsüz. Hız kademeleri geometrik
  // ilerler; 1 rahat okuma temposu, 10 hızlı tarama.
  useEffect(() => {
    if (!otomatikKaydirma || duraklatildi) return
    const el = scrollRef.current
    if (!el) return
    // Hız ölçeği (px/sn). Eski eğri çok hızlıydı (10 → 193 px/sn ≈ saniyede 4+ satır).
    // Yeni çapa noktaları: 1 → 6 (çok yavaş, teenni ile), 10 → ~18 (rahat okuma),
    // 20 → ~61 px/sn (azamî okuma hızı, ~1,4 satır/sn). Kesirli bırakılır; birikimli
    // ilerleme zaten alt-piksel çalıştığı için yuvarlamaya gerek yok.
    // 1-10 bandı aynı; 10-20 bandı KULLANICI İSTEĞİYLE daha da yumuşatıldı.
    // Çapa noktaları: 1 → 6, 10 → 18, 15 → ~25, 20 → ~36 px/sn (~0,8 satır/sn).
    const kademe = Math.min(20, Math.max(1, kaydirmaHizi))
    const pxSn = kademe <= 10
      ? 6 * Math.pow(1.13, kademe - 1)
      : 18 * Math.pow(1.0718, kademe - 10)
    let raf = 0, sonT = 0
    let hedef = el.scrollTop            // kesirli konum (tarayıcı scrollTop'u yuvarlarsa hassasiyet kaybolmasın)
    const adim = (t) => {
      if (!sonT) sonT = t
      const dt = Math.min(64, t - sonT)  // sekme arka plana geçip dönerse dev sıçrama olmasın
      sonT = t
      // Kullanıcı elle kaydırdıysa (veya sayfa penceresi konumu düzelttiyse) senkronize ol
      if (Math.abs(el.scrollTop - hedef) > 4) hedef = el.scrollTop
      hedef += (pxSn * dt) / 1000
      el.scrollTop = hedef
      // Sona gelince kendiliğinden dursun
      if (el.scrollTop + el.clientHeight >= el.scrollHeight - 1) { setOtomatikKaydirma(false); return }
      raf = requestAnimationFrame(adim)
    }
    raf = requestAnimationFrame(adim)
    return () => cancelAnimationFrame(raf)
  }, [otomatikKaydirma, kaydirmaHizi, duraklatildi])

  // menuAcik useEffect — dışarı tıklayınca kapat
  useEffect(() => {
    if (!menuAcik) return
    function disariTikla(e) {
      const menu = document.querySelector('.sure-menusu')
      if (menu && !menu.contains(e.target)) {
        menuKapatildiRef.current = true
        setMenuAcik(false)
        setTimeout(() => { menuKapatildiRef.current = false }, 100)
      }
    }
    document.addEventListener('mousedown', disariTikla, true)
    return () => document.removeEventListener('mousedown', disariTikla, true)
  }, [menuAcik])

  const [barYuksekligi, setBarYuksekligi] = useState(48)
  const barRef = useRef(null)
  // PWA (standalone) modu: iOS'ta safe-area-inset-bottom gerçek ~34px → alt bar fazla boşluklu.
  // Tarayıcıda inset ≈0. Bu yüzden safe-area'yı yalnız PWA'da bir miktar kırpıyoruz.
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
  // PWA'da alt barın DOĞRUDAN alt boşluğu (px). Büyüt = daha çok, küçült = daha az. Web etkilenmez.
  const pwaAltBosluk = 8
  const [playerYuk, setPlayerYuk] = useState(0)  // PlayerBar'ın ÖLÇÜLEN yüksekliği
  // Bar TEK SATIRA sığmıyor mu? Sığmıyorsa iki şey yapılır:
  //  1) sol/sağ yaslama bırakılır (ortada boşluk kalmasın, öğeler sırayla ortalansın),
  //  2) öğeler tespit edilen SATIR SAYISINA DENGELİ dağıtılır (barSatirOlc). Doğal sarma
  //     1. satırı tıka basa doldurup 2. satırı neredeyse boş bırakıyordu; bunun yerine gereken
  //     satır sayısı bulunur ve öğeler satır genişlikleri birbirine en yakın olacak biçimde
  //     bölünür. Kırma noktalarına tam genişlikte, yüksekliksiz görünmez ayraç konur.
  const [barCokSatir, setBarCokSatir] = useState(false)
  const [barSatirKes, setBarSatirKes] = useState([])   // ayraçların order değerleri

useLayoutEffect(() => {
  if (!barRef.current) return
  const olcSatir = () => {
    const el = barRef.current
    if (!el) return
    const { cokSatir, kes } = barSatirOlc(el)
    setBarCokSatir(cokSatir)
    setBarSatirKes(p => (p.length === kes.length && p.every((v, i) => v === kes[i]) ? p : kes))
  }
  const observer = new ResizeObserver(() => {
    // offsetHeight = padding + border dahil (contentRect padding'i atlıyordu → player bara biniyordu)
    if (barRef.current) setBarYuksekligi(Math.ceil(barRef.current.offsetHeight))
    olcSatir()
  })
  observer.observe(barRef.current)
  return () => observer.disconnect()
})

// Player kapanınca ölçülen yüksekliği sıfırla (tahmine dön)
useEffect(() => { if (player.durum === "kapali") setPlayerYuk(0) }, [player.durum])


const [barUiOlcegi, setBarUiOlcegi] = useState(() =>
  parseFloat(localStorage.getItem("vukuf-bar-ui-olcegi") || "1")
)

useEffect(() => {
  localStorage.setItem("vukuf-bar-ui-olcegi", String(barUiOlcegi))
}, [barUiOlcegi])

// Bir bar öğesi sade modda görünür mü? (sade değilse hep görünür; sade modda sadeGizli'ye bağlı)
const sadeGorunur = (key) => !(sadeMode && sadeGizli[key])

const gorunurOgeSayisi = useMemo(() => {
  let n = 2 // Geri + Ayarlar
  if (sureMenuGoster && sadeGorunur("sureMenu")) n++
  if (kayitGoster && sadeGorunur("kayit")) n++
  if (sayfaGitGoster && sadeGorunur("sayfaGit")) n++
  if (tekrarBtnGoster && sadeGorunur("tekrar")) n++
  if (bilgiGoster && sadeGorunur("bilgi")) n++
  if (gorselGoster && sadeGorunur("gorsel")) n++
  if (yaziTipiGoster && sadeGorunur("yaziTipi")) n++
  if (otoOynatGoster && sadeGorunur("otoOynat")) n++
  if (sadeModGoster) n++
  if (temaGoster && sadeGorunur("tema")) n++
  if (sureGoster && sadeGorunur("okumaZamani")) n++
  if (sureBilgisiGoster && sadeGorunur("sureBilgisi")) n++
  if ((cuzBilgisiGoster && sadeGorunur("cuzBilgisi")) || (hizbBilgisiGoster && sadeGorunur("hizbBilgisi"))) n++
  return n
}, [sureMenuGoster, kayitGoster, sayfaGitGoster, tekrarBtnGoster, bilgiGoster, gorselGoster, yaziTipiGoster, otoOynatGoster,
    sadeModGoster, temaGoster, sureGoster, sureBilgisiGoster, cuzBilgisiGoster, hizbBilgisiGoster,
    sadeMode, sadeGizli])
const wrapAktif = isMobile && barUiOlcegi > 0.9 && gorunurOgeSayisi >= 5
const tekSatirYuksekligi = isMobile ? 44 : 36
const cokSatir = wrapAktif && barYuksekligi > tekSatirYuksekligi * 1.0

  // ════════════════════════════════════════════════════════════════
  // BAR FONKSİYONLARI
  // ════════════════════════════════════════════════════════════════

  const barGoster = useCallback(() => {
    if (sadeMode || !otomatikGizleme) return
    setBarGorunur(true)
    if (barZamanRef.current) {
      clearTimeout(barZamanRef.current)
    }
    barZamanRef.current = setTimeout(() => {
      setBarGorunur(false)
    }, gizlemeSuresi * 1000)
  }, [otomatikGizleme, gizlemeSuresi, sadeMode])

  const barGizle = useCallback(() => {
    if (barZamanRef.current) {
      clearTimeout(barZamanRef.current)
      barZamanRef.current = null
    }
    if (otomatikGizleme) {
      setBarGorunur(false)
    }
  }, [otomatikGizleme])

  // ── Bar toggle (görünür/gizli değiştir)
  const barToggle = useCallback(() => {
  if (menuAcikRef.current) {
    setMenuAcik(false)
    return
  }
  if (herhangiPanelAcik) return
  if (barZamanRef.current) {
    clearTimeout(barZamanRef.current)
    barZamanRef.current = null
  }
  setBarGorunur(prev => {
    const yeni = !prev
    // Bar göründüğünde otomatik gizleme timer'ı başlat
    if (yeni && otomatikGizleme && !sadeMode) {
      barZamanRef.current = setTimeout(() => {
        setBarGorunur(false)
      }, gizlemeSuresi * 1000)
    }
    return yeni
  })
}, [herhangiPanelAcik, otomatikGizleme, gizlemeSuresi, sadeMode])

  // ════════════════════════════════════════════════════════════════
  // SCROLLBAR FONKSİYONLARI
  // ════════════════════════════════════════════════════════════════

  const scrollbarGoster = useCallback(() => {
    setScrollbarGorunur(true)
    if (scrollbarTimeoutRef.current) {
      clearTimeout(scrollbarTimeoutRef.current)
    }
    scrollbarTimeoutRef.current = setTimeout(() => {
      setScrollbarGorunur(false)
    }, 2000)
  }, [])

  // ── Scroll hızını algıla
  const scrollHiziAlgila = useCallback(() => {
    const el = scrollRef.current
    if (!el) return

    const suAn = Date.now()
    const deltaZaman = suAn - scrollHiziRef.current.sonZaman
    const deltaScroll = Math.abs(el.scrollTop - scrollHiziRef.current.sonScrollTop)

    // Mobil için daha hassas değerler
    const zamanEsik = isMobile ? 400 : 300
    const scrollEsik = isMobile ? 20 : 30
    
    if (deltaZaman < zamanEsik && deltaScroll > scrollEsik) {
      scrollHiziRef.current.scrollSayisi += 1
      
      // Mobilde 1 kez yeterli olsun
      const sayiEsik = isMobile ? 2 : 1
      if (scrollHiziRef.current.scrollSayisi >= sayiEsik) {
        scrollbarGoster()
        scrollHiziRef.current.scrollSayisi = 0
      }
    } else {
      scrollHiziRef.current.scrollSayisi = Math.max(0, scrollHiziRef.current.scrollSayisi - 1)
    }

    scrollHiziRef.current.sonScrollTop = el.scrollTop
    scrollHiziRef.current.sonZaman = suAn
    scrollOranRef.current = el.scrollHeight > el.clientHeight
      ? el.scrollTop / (el.scrollHeight - el.clientHeight)
      : 0
      localStorage.setItem("vukuf-son-scroll", String(el.scrollTop))
    }, [scrollbarGoster, isMobile])


    const menuAcikRef = useRef(false)

    useEffect(() => {
      menuAcikRef.current = menuAcik
    }, [menuAcik])
  // ════════════════════════════════════════════════════════════════
  // SCROLL OLAYLARI
  // ════════════════════════════════════════════════════════════════

  const handleScroll = useCallback(() => {
    scrollHiziAlgila()    // ← hız algılama ayrı devam eder
    // Aa paneli açıkken kaydırılırsa font-ankorunu tazele
    if (aaAcikRef.current && ustSatirYakalaRef.current) fontAnkorRef.current = ustSatirYakalaRef.current()
  }, [scrollbarGoster, scrollHiziAlgila])

  // ════════════════════════════════════════════════════════════════
  // DOKUNMA FONKSİYONLARI
  // ════════════════════════════════════════════════════════════════

  function dokunusBasladi() {
    setDuraklatildi(true)
  }

  function dokunusBitti() {
    setDuraklatildi(false)
  }

  // Scroll event listener'ları
  useEffect(() => {
  const scrollElement = scrollRef.current
    if (!scrollElement) return

    scrollElement.addEventListener('scroll', handleScroll, { passive: true })

    return () => {
      scrollElement.removeEventListener('scroll', handleScroll)
      if (scrollbarTimeoutRef.current) {
        clearTimeout(scrollbarTimeoutRef.current)
      }
    }
  }, [handleScroll])

  // Zoom Out
  useEffect(() => {
    if (!isMobile) return
    
    const viewport = window.visualViewport
    if (!viewport) return

    const zoomSifirla = () => {
      // Zoom varsa (scale > 1) sıfırla
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

  // ════════════════════════════════════════════════════════════════
  // VERİ HAZIRLAMA
  // ════════════════════════════════════════════════════════════════
  const { sayfaMap, sureler, toplamSayfa, sureSayfaLookup, ayetSayfaLookup } = useMushaf(mushafData, sayfaHaritaJson)
  // Bu üçü, kimliği sabit kalması gereken callback'lerden REF üzerinden okunur.
  // (Doğrudan bağımlılık verilirse useMushaf her render'da yeni nesne döndürdüğünde
  //  callback kimlikleri değişip aşağı doğru gereksiz yeniden hesaplama zinciri kuruluyor.)
  const mushafRef = useRef(null)
  mushafRef.current = { sayfaMap, ayetSayfaLookup, mevcutSayfa }

  // Aa paneli açılınca üst ayeti yakala (ref senkronu + ilk ankor)
  useEffect(() => { aaAcikRef.current = aaAcik }, [aaAcik])
  useEffect(() => { if (aaAcik) fontAnkorRef.current = ustSatirYakala() }, [aaAcik])
  // Font/boyut/aralık değişince: reflow sonrası aynı ayete geri çek (birkaç kez — reflow oturana dek)
  const fontIlkRef = useRef(true)
  useLayoutEffect(() => {
    if (fontIlkRef.current) { fontIlkRef.current = false; return }
    const ank = fontAnkorRef.current
    if (!ank) return
    ustSatirGeriYukle(ank)
    let r1, r2, t
    r1 = requestAnimationFrame(() => {
      ustSatirGeriYukle(ank)
      r2 = requestAnimationFrame(() => ustSatirGeriYukle(ank))
    })
    t = setTimeout(() => ustSatirGeriYukle(ank), 80)   // reflow geç oturursa son bir düzeltme
    return () => { cancelAnimationFrame(r1); cancelAnimationFrame(r2); clearTimeout(t) }
  }, [yaziBoyutu, satirAraligi, harfAraligi, arapcaFontId])

  const mevcutSureBilgisi = useMemo(() => {
    if (!sayfaMap?.size) return null
    const elemanlar = sayfaMap.get(mevcutSayfa) || []
    const sureBaslik = elemanlar.find(el => el.tip === "sure-baslik")
    if (sureBaslik) return sureBaslik.sure
    const kelime = elemanlar.find(el => el.tip === "kelime")
    return kelime?.sure || null
  }, [sayfaMap, mevcutSayfa])

  
  
  const filtreliSureler = useMemo(() => {
    if (!menuArama) return sureler
    const q = normHarf(menuArama)  // şapka/aksan + büyük-küçük duyarsız
    return sureler.filter(s =>
      normHarf(s.isim).includes(q) ||
      String(s.id).includes(menuArama.trim())
    )
  }, [sureler, menuArama])

  
  // ── SAYFA LİSTESİ ──
  const sayfaListesi = useMemo(() => {
    if (!sayfaMap || sayfaMap.size === 0) return []
    const sayfaNolari = Array.from(sayfaMap.keys()).sort((a, b) => a - b)
    return sayfaNolari.map(sayfaNo => ({
      tip: "sayfa",
      sayfaNo,
      elemanlar: sayfaMap.get(sayfaNo) || [],
    }))
  }, [sayfaMap])

    useLayoutEffect(() => {
  if (geriYuklendiRef.current) return
  if (yukleniyor || !sayfaListesi.length) return

  // Arama/Tefeül'den sure hedefi geldiyse restore ATLA (sureGit devralır).
  let h = null
  try { h = JSON.parse(localStorage.getItem("vukuf-kuran-hedef") || "null") } catch {}
  if (h && h.sureNo) { geriYuklendiRef.current = true; return }

  geriYuklendiRef.current = true
  const sayfa = hedefSayfaRef.current
  const oran = hedefOranRef.current || 0
  if (!sayfa || (sayfa <= 1 && oran < 0.01)) { konumuGoster(); return }   // Fatiha başı

  // AKIŞ MODELİ: sayfa div'i hep DOM'da (yer tutucu). İLK hizalama BOYAMADAN ÖNCE (layout
  // effect, senkron) yapılır → kullanıcı hiç Fatiha'yı görüp sonra sıçramaz; spinner GEREKMEZ.
  // SayfaBlok içeriği render olurken yükseklik oturana dek birkaç kez daha hizalanır.
  let tries = 0
  const git = () => {
    sayfayaHizala(sayfa, { ust: 12, oran })
    if (++tries < 6) setTimeout(git, 60)
    else konumuGoster()
  }
  git()   // senkron ilk hizalama (paint öncesi)
}, [yukleniyor, sayfaListesi.length])

// Güvenlik: içerik en geç bu süre içinde görünür olsun
useEffect(() => {
  if (yukleniyor) return
  const t = setTimeout(konumuGoster, 1500)
  return () => clearTimeout(t)
}, [yukleniyor])

// Arama'dan gelen sure hedefi: Kuran açılınca o sureye git (bir kez)
useEffect(() => {
  if (kuranHedefRef.current || !sayfaListesi.length) return
  let h = null
  try { h = JSON.parse(localStorage.getItem("vukuf-kuran-hedef") || "null") } catch {}
  if (h && h.sureNo) {
    kuranHedefRef.current = true
    try { localStorage.removeItem("vukuf-kuran-hedef") } catch {}
    setTimeout(() => {
      // sureGit kendi hizalaması oturunca içeriği gösterir (bitir → konumuGoster).
      // Mobilde zaten gizli; masaüstünde ilk-açılış-atıf durumunda da bitir gösterecek.
      sureGit(h.sureNo, h.ayetNo || null)   // ayetNo varsa ayete, yoksa sure başlığına
    }, 180)
  }
}, [sayfaListesi.length])

// Arama/Tefeül/Okuma'dan mı gelindi? (bir kez oku, bayrağı temizle)
useEffect(() => {
  try {
    const d = localStorage.getItem("vukuf-donus")
    if (d === "arama" || d === "tefeul") {
      setDonusTip(d)
      localStorage.removeItem("vukuf-donus")
    } else if (d === "okuma") {
      // Okuma ekranındaki popup'tan ayete gelindi → "Okumaya dön" (kitaba geri git)
      setDonusTip("okuma")
      setDonusYol(localStorage.getItem("vukuf-donus-yol") || "/")
      localStorage.removeItem("vukuf-donus")
    }
  } catch {}
}, [])

  const cuzListesi = useMemo(() => {
  const map = new Map()
  for (const sure of mushafData) {
    for (const ayet of sure.ayetler) {
      const mevcut = map.get(ayet.cuz)
      if (mevcut === undefined || ayet.sayfa < mevcut) map.set(ayet.cuz, ayet.sayfa)
    }
  }
  return [...map.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([no, baslangic]) => ({ no, baslangic }))
}, [mushafData])

// Cüz araması: yalnız rakam (ör. "12" → 12. cüz). Boşsa tüm cüzler.
// NOT: cuzListesi'nden SONRA tanımlanmalı — önce tanımlanırsa render sırasında TDZ hatası verir.
const filtreliCuzler = useMemo(() => {
  const q = (cuzArama || "").replace(/\D/g, "")
  if (!q) return cuzListesi
  return cuzListesi.filter(c => String(c.no).includes(q))
}, [cuzListesi, cuzArama])

// Sayfa içine ortalı Arapça CÜZ işareti: sayfa no → o sayfada BAŞLAYAN cüz no
const sayfaCuzBaslangic = useMemo(() => {
  const m = {}
  for (const c of cuzListesi) if (m[c.baslangic] == null) m[c.baslangic] = c.no
  return m
}, [cuzListesi])

// HİZB işareti: veride ayet.hizb varsa her hizb değerinin İLK sayfası → o sayfada başlar.
// (Cüz başı olan sayfalarda cüz işareti öncelikli olduğundan buradan çıkarılır.)
const sayfaHizbBaslangic = useMemo(() => {
  const ilkSayfa = {}   // hizbNo → min sayfa
  let varMi = false
  for (const sure of mushafData) for (const a of (sure.ayetler || [])) {
    const hz = a.hizb ?? a.hizip ?? a.hzb
    if (hz == null) continue
    varMi = true
    if (ilkSayfa[hz] == null || a.sayfa < ilkSayfa[hz]) ilkSayfa[hz] = a.sayfa
  }
  if (!varMi) return {}
  const m = {}   // sayfa → hizb no
  for (const hz of Object.keys(ilkSayfa)) {
    const sf = ilkSayfa[hz]
    if (sayfaCuzBaslangic[sf] != null) continue   // cüz başı → cüz işareti gösterilecek
    if (m[sf] == null) m[sf] = Number(hz)
  }
  return m
}, [mushafData, sayfaCuzBaslangic])

const mevcutCuzHizb = useMemo(() => {
  if (!cuzListesi.length) return null

  let cuz = cuzListesi[0]
  for (const c of cuzListesi) {
    if (c.baslangic <= mevcutSayfa) cuz = c
    else break
  }


  const i = cuzListesi.findIndex(c => c.no === cuz.no)
  const bas = cuz.baslangic
  const son = (cuzListesi[i + 1]?.baslangic ?? toplamSayfa + 1) - 1
  const uzunluk = son - bas + 1

  let hizb = 1
  for (let k = 1; k < 4; k++) {
    if (bas + Math.round((uzunluk * k) / 4) <= mevcutSayfa) hizb = k + 1
  }

  return { cuz: cuz.no, hizb }
}, [cuzListesi, mevcutSayfa, toplamSayfa])


const hizbSayfalari = (cuzNo) => {
  const i = cuzListesi.findIndex(c => c.no === cuzNo)
  if (i === -1) return []
  const bas = cuzListesi[i].baslangic
  const son = (cuzListesi[i + 1]?.baslangic ?? toplamSayfa + 1) - 1
  const uzunluk = son - bas + 1
  return [0, 1, 2, 3].map(k => ({
    hizb: k + 1,
    sayfa: bas + Math.round((uzunluk * k) / 4),
  }))
}
  const playerBarYuksekligi = (playerYuk || (isMobile
  ? 41 + Math.max(0, Math.round((1 - barUiOlcegi) * 1))
  : 40 + Math.max(0, Math.round((1 - barUiOlcegi) * 8))))

  // ════════════════════════════════════════════════════
  // Font/boyut değişiminde OKUMA YERİNİ KORU (sayfa atlamasın)
  // En üstte görünen ayeti (data-sure+data-ayet) yakala; reflow sonrası aynı yere çek.
  // ════════════════════════════════════════════════════
  const fontAnkorRef = useRef(null)
  const aaAcikRef = useRef(false)
  const ustReferansY = () => {
    const el = scrollRef.current
    if (!el) return 0
    const ustKaplama = barKonum === "ust"
      ? ((barGorunur ? barYuksekligi : 0) + (player.durum !== "kapali" ? playerBarYuksekligi : 0))
      : 0
    return el.getBoundingClientRect().top + ustKaplama + 4
  }
  const ustSatirYakala = () => {
    const el = scrollRef.current
    if (!el) return null
    const refY = ustReferansY()
    const ayetler = el.querySelectorAll("[data-sure][data-ayet]")
    for (let i = 0; i < ayetler.length; i++) {
      const r = ayetler[i].getBoundingClientRect()
      if (r.bottom > refY + 1) return {
        sure: ayetler[i].getAttribute("data-sure"),
        ayet: ayetler[i].getAttribute("data-ayet"),
        ofset: r.top - refY,
      }
    }
    return null
  }
  const ustSatirGeriYukle = (ank) => {
    const el = scrollRef.current
    if (!el || !ank || !ank.sure) return
    const h = el.querySelector(`[data-sure="${ank.sure}"][data-ayet="${ank.ayet}"]`)
    if (!h) return
    const simdi = h.getBoundingClientRect().top - ustReferansY()
    el.scrollTop += (simdi - ank.ofset)
  }
  const ustSatirYakalaRef = useRef(null)
  ustSatirYakalaRef.current = ustSatirYakala   // handleScroll her zaman güncel sürümü çağırsın

  // ── SAYFA YÜKSEKLİKLERİ ──
  const sayfaYukseklikleri = useMemo(() => {
    if (!sayfaListesi.length) return []
    const mobile = isMobile
    
    return sayfaListesi.map((sayfa) => {
      const elemanlar = sayfa.elemanlar
      let toplamYukseklik = 0
      toplamYukseklik += mobile ? 20 : 30
      
      let mevcutInlineElemanlar = []
      
      elemanlar.forEach((el) => {
        if (el.tip === "sure-baslik" || el.tip === "besmele" || el.tip === "sure-sonu") {
          if (mevcutInlineElemanlar.length > 0) {
            const kelimeSayisi = mevcutInlineElemanlar.filter(e => e.tip === "kelime").length
            const fontBoyutu = mobile ? yaziBoyutu : yaziBoyutu + 2
            const lineHeight = mobile ? 2.2 : 2.0
            const satirYuksekligi = fontBoyutu * lineHeight
            const satirBasiKelime = mobile ? 12 : 16
            const kelimeSatirSayisi = Math.max(1, Math.ceil(kelimeSayisi / satirBasiKelime))
            const inlineYukseklik = kelimeSatirSayisi * satirYuksekligi * 1.3 + 20
            toplamYukseklik += inlineYukseklik
            mevcutInlineElemanlar = []
          }
          
          if (el.tip === "sure-baslik") {
            toplamYukseklik += mobile ? 55 : 75
            toplamYukseklik += mobile ? 6 : 8
          } else if (el.tip === "besmele") {
            toplamYukseklik += mobile ? 35 : 50
            toplamYukseklik += mobile ? 4 : 6
          } else if (el.tip === "sure-sonu") {
            toplamYukseklik += mobile ? 35 : 50
            toplamYukseklik += mobile ? 4 : 6
          }
        } else {
          mevcutInlineElemanlar.push(el)
        }
      })
      
      if (mevcutInlineElemanlar.length > 0) {
        const kelimeSayisi = mevcutInlineElemanlar.filter(e => e.tip === "kelime").length
        const fontBoyutu = mobile ? yaziBoyutu : yaziBoyutu + 2
        const lineHeight = mobile ? 2.2 : 2.0
        const satirYuksekligi = fontBoyutu * lineHeight
        const satirBasiKelime = mobile ? 12 : 16
        const kelimeSatirSayisi = Math.max(1, Math.ceil(kelimeSayisi / satirBasiKelime))
        // *1.3: âyet rozetleri + kelime dolgusu/işaretleri gerçek satır yüksekliğini büyütür.
        // (Orta gruplarla TUTARLI: tek-gruplu sayfaların çoğu burayı kullanıyor; 1.3 olmadan
        // eksik tahmin edilip mount'ta büyüyorlardı → yukarı kaydırmada sıçrama.)
        const inlineYukseklik = kelimeSatirSayisi * satirYuksekligi * 1.3 + 20
        toplamYukseklik += inlineYukseklik
      }
      
      toplamYukseklik += mobile ? 16 : 24
      return Math.max(toplamYukseklik, mobile ? 200 : 300)
    })
  }, [sayfaListesi, yaziBoyutu, isMobile])

  // ── AKIŞ MODELİ (react-virtual YOK) ──
  // Tüm sayfalar SayfaBlok ile normal akışta render edilir; her sayfa div'i DOM'da (yer tutucu)
  // olduğundan gidişler ANINDA (scrollIntoView) ve tarayıcının doğal scroll-anchoring'i konumu
  // sabit tuttuğundan ölçüm kilidi / kalibrasyon / shouldAdjust / gizleme GEREKMEZ.
  const sayfaRefs = useRef({})            // sayfaNo → sayfa div'i (anında gidiş için)
  const scrollYonRef = useRef(null)       // (touch handler'ları set eder; şu an kullanılmıyor)
  const sonTouchYRef = useRef(0)
  const sonKayitZamanRef = useRef(0)      // vukuf-son-konum yazımını kısması (throttle)

  // Bir sayfayı üste hizala (anında). ofset = üstteki bar/oynatıcı payı.
  const sayfayaHizala = useCallback((sayfaNo, opt = {}) => {
    const el = scrollRef.current
    const node = sayfaRefs.current[sayfaNo]
    if (!el || !node) return false
    const scRect = el.getBoundingClientRect()
    const nRect = node.getBoundingClientRect()
    const ust = opt.ust != null ? opt.ust : 12
    el.scrollTop += (nRect.top - scRect.top) - ust + (opt.oran ? (node.offsetHeight * opt.oran) : 0)
    return true
  }, [])

// ════════════════════════════════════════════════════════════════
// KAYIT BÖLÜMÜ
// ════════════════════════════════════════════════════════════════
const kayitEkle = useCallback((baslik, scrollY) => {
  const el = scrollRef.current
  if (!el) return

  let oran = scrollY
  if (oran === undefined) {
    const node = sayfaRefs.current[mevcutSayfa]
    if (!node) return
    const scRect = el.getBoundingClientRect()
    const nRect = node.getBoundingClientRect()
    const noktaY = el.clientHeight * 0.25   // viewport üstünden ~%25
    oran = (noktaY - (nRect.top - scRect.top)) / (node.offsetHeight || 1)
  }

  const yeniKayit = {
    id: Date.now().toString(),
    sayfa: mevcutSayfa,
    scrollY: Math.max(0, Math.min(1, oran)),
    baslik: baslik || `Sayfa ${mevcutSayfa}`,
    olusturma: Date.now(),
  }

  setKayitlar(prev => {
    const yeni = [...prev, yeniKayit]
    localStorage.setItem("vukuf-kayitlar", JSON.stringify(yeni))
    return yeni
  })
}, [mevcutSayfa])

// Kayıt güncelleme fonksiyonu
const kayitGuncelle = useCallback((id, baslik) => {
  setKayitlar(prev => {
    const yeni = prev.map(k => 
      k.id === id ? { ...k, baslik: baslik } : k
    )
    localStorage.setItem("vukuf-kayitlar", JSON.stringify(yeni))
    return yeni
  })
}, [])

// Kayıt silme fonksiyonu
const kayitSil = useCallback((id) => {
  setKayitlar(prev => {
    const yeni = prev.filter(k => k.id !== id)
    localStorage.setItem("vukuf-kayitlar", JSON.stringify(yeni))
    return yeni
  })
}, [])



const sayfayaKaydir = useCallback((sayfaNo) => { sayfayaHizala(sayfaNo, { ust: 12 }) }, [sayfayaHizala])

// Üst içerik payı (bar/oynatıcı örtüşü) — hizalama ofseti
const ustPay = () => (barKonum === "ust"
  ? ((barGorunur ? barYuksekligi : 0) + (player.durum !== "kapali" ? playerBarYuksekligi : 0) + 8)
  : 16)

// NOT: Arka plan ön-ölçüm + kalıcı yükseklik önbelleği KALDIRILDI — font değiştirilince tüm
// önbelleği geçersiz kılıp 604 sayfayı yeniden ölçüyor, bu da içeriği sürekli kaydırıyordu.
// Yukarı-kaydırma: (1) mount SCROLL-PENCERESİNDEN sürülür (momentum'da IO kısıldığından boş kare
// olmasın), (2) konumu tarayıcının DOĞAL scroll-anchoring'i tutar (overflowAnchor:auto) — manuel
// scrollTop telafisi KALDIRILDI çünkü iOS'ta fling'i durduruyordu ("sıçrayıp duruyor").

const sayfaGercekYukseklikleriRef = useRef({})   // (geri uyumluluk; artık kullanılmıyor)
// Kayıtlı konuma ANINDA git — üst bar payını bırak, sayfa içi oranı uygula, işaret vurgusu.
const kayitSayfaGit = useCallback((sayfa, scrollY, kayitId) => {
  pencereHazirla(sayfa)   // gidiş: hedefin iki yanını hazırla (telafi yok, zaten kaydırılacak)
  const ust = ustPay() + (isMobile ? 6 : 4)
  let tries = 0
  const git = () => {
    sayfayaHizala(sayfa, { ust, oran: scrollY || 0 })
    if (++tries < 6) setTimeout(git, 60)
  }
  requestAnimationFrame(git)
  if (kayitId) {
    if (odakAyracTimeoutRef.current) clearTimeout(odakAyracTimeoutRef.current)
    setOdakAyrac(kayitId)
    odakAyracTimeoutRef.current = setTimeout(() => { setOdakAyrac(null); odakAyracTimeoutRef.current = null }, 6000)
  }
}, [isMobile, barKonum, barGorunur, barYuksekligi, playerBarYuksekligi, player.durum, sayfayaHizala])

// Üstteki sayfayı takip et (header) + son konumu (mid-page) kaydet — sayfaRefs ile
useEffect(() => {
  const el = scrollRef.current
  if (!el || !sayfaListesi.length) return
  pencereHazirla(hedefSayfaRef.current || mevcutSayfa)   // açılış: hedefin çevresini önden hazırla
  let raf = 0
  const sayfaGuncelle = () => {
    raf = 0
    if (!konumHazirRef.current) return
    const scTop = el.getBoundingClientRect().top + 2
    // Sayfalar belge akışında sıralı → ikili arama: top'u scTop'u geçmeyen SON sayfa
    let lo = 0, hi = sayfaListesi.length - 1, idx = 0
    while (lo <= hi) {
      const mid = (lo + hi) >> 1
      const n = sayfaRefs.current[sayfaListesi[mid].sayfaNo]
      if (!n) { hi = mid - 1; continue }   // ölçülemeyen düğüm → sola daral
      if (n.getBoundingClientRect().top <= scTop) { idx = mid; lo = mid + 1 }
      else hi = mid - 1
    }
    const s = sayfaListesi[idx]
    const node = s ? sayfaRefs.current[s.sayfaNo] : null
    const no = node ? s.sayfaNo : null
    if (no != null && node) {
      setMevcutSayfa(no)
      altPencere(no)   // yalnız AŞAĞI (güvenli). Yukarısı ancak kaydırma tam durunca büyür.
      const r = node.getBoundingClientRect()
      const oran = Math.max(0, Math.min(1, (scTop - r.top) / (node.offsetHeight || 1)))
      sonKonumRef.current = { sayfa: no, oran }
      const simdi = Date.now()
      if (simdi - sonKayitZamanRef.current > 600) {
        sonKayitZamanRef.current = simdi
        try { localStorage.setItem("vukuf-son-konum", JSON.stringify(sonKonumRef.current)) } catch {}
      }
    }
  }
  const onScroll = () => {
    sonScrollAnRef.current = performance.now()
    // Bu kaydırma BİZİM yazdığımız değerden mi geliyor, yoksa gerçek (parmak/momentum) mi?
    // Gerçekse "oturt" döngüsünü derhal bırak — momentum sırasında scrollTop'a yazmak akışı öldürür.
    if (oturtRef.current && beklenenTopRef.current >= 0 &&
        Math.abs(el.scrollTop - beklenenTopRef.current) > 1.5) {
      cancelAnimationFrame(oturtRef.current); oturtRef.current = null
    }
    if (!raf) raf = requestAnimationFrame(sayfaGuncelle)
    // Üst tamponu YALNIZ kaydırma GERÇEKTEN durunca büyüt. "Durdu" için iki şart: (1) parmak
    // ekranda değil, (2) son kontrolden bu yana scrollTop hiç değişmemiş. Yavaşlayan momentumun
    // kuyruğunda scroll olayları seyrekleştiği için tek başına zamanlayıcıya güvenmek, hâlâ
    // kayarken müdahale edip DURURKEN GERİYE SIÇRAMAYA yol açıyordu.
    if (durakTimerRef.current) clearTimeout(durakTimerRef.current)
    durakTimerRef.current = setTimeout(function dene() {
      const sc = scrollRef.current
      if (!sc) return
      // ÜÇ şart birden: (1) parmak yok, (2) son kontrolden beri scrollTop hiç değişmedi,
      // (3) en az 260 ms'dir HİÇ scroll olayı gelmedi. (3) olmadan, ana iş parçacığı bir render
      // yüzünden tıkanıp olaylar birikince zamanlayıcı önce çalışabiliyor ve momentum sürerken
      // "durdu" sanıp scrollTop'a yazıyorduk → fling başlangıcında nadiren yarıda duruş.
      if (dokunuyorRef.current ||
          sc.scrollTop !== sonScrollTopRef.current ||
          performance.now() - sonScrollAnRef.current < 260) {
        sonScrollTopRef.current = sc.scrollTop            // hâlâ hareket var → tekrar bak
        durakTimerRef.current = setTimeout(dene, 140)
        return
      }
      const oncekiBoyut = gosterSetRef.current.size
      ustPencereBuyut()
      if (gosterSetRef.current.size !== oncekiBoyut) {
        durakTimerRef.current = setTimeout(dene, 160)     // tampon dolana dek kademeli devam
      }
    }, 200)
  }
  el.addEventListener('scroll', onScroll, { passive: true })
  return () => {
    el.removeEventListener('scroll', onScroll)
    if (durakTimerRef.current) clearTimeout(durakTimerRef.current)
    if (oturtRef.current) cancelAnimationFrame(oturtRef.current)
  }
}, [sayfaListesi])

// Sayfadan çıkarken / gizlenince anlık konumu (mid-page) kesin kaydet
useEffect(() => {
  const kaydet = () => { try { localStorage.setItem("vukuf-son-konum", JSON.stringify(sonKonumRef.current)) } catch {} }
  const gizlenince = () => { if (document.visibilityState === "hidden") kaydet() }
  window.addEventListener("pagehide", kaydet)
  document.addEventListener("visibilitychange", gizlenince)
  return () => { kaydet(); window.removeEventListener("pagehide", kaydet); document.removeEventListener("visibilitychange", gizlenince) }
}, [])

  // ════════════════════════════════════════════════════════════════
  // NAVİGASYON
  // ════════════════════════════════════════════════════════════════

  function oncekiSayfa() {
    setMevcutSayfa(p => Math.max(1, p - 1))
    setPopup(null)
  }

  function sonrakiSayfa() {
    setMevcutSayfa(p => Math.min(toplamSayfa, p + 1))
    setPopup(null)
  }

function sayfayaGit(no) {
  const n = parseInt(no)
  if (n < 1 || n > toplamSayfa) return
  setMevcutSayfa(n); pencereHazirla(n); setAyetArama({}); setPopup(null)
  const ust = ustPay()
  let tries = 0
  const git = () => { sayfayaHizala(n, { ust }); if (++tries < 6) setTimeout(git, 60) }
  requestAnimationFrame(git)
}

// AKIŞ MODELİ: sayfaya anında git (div hep DOM'da), içerik render olunca âyet/sûre elemanına
// tam hizala. react-virtual/gizleme/settle YOK — anında ve göz kırpmasız.
function sureGit(sureId, ayetNo) {
  const sayfa = ayetNo
    ? ayetSayfasi(sureId, ayetNo, ayetSayfaLookup)
    : sureBaslangicSayfasi(sureId, sureSayfaLookup)
  if (!sayfa) return

  setMevcutSayfa(sayfa)
  pencereHazirla(sayfa)
  setMenuAcik(false); setMenuArama(""); setAcikSure(null); setAyetArama({}); setPopup(null); setAcikCuz(null)

  const offset = ustPay() + (ayetNo ? 6 : 8)
  sayfayaHizala(sayfa, { ust: offset })   // önce sayfaya (içerik render tetiklenir)

  const selector = ayetNo
    ? `[data-sure="${sureId}"][data-ayet="${ayetNo}"]`
    : `[data-sure-baslik="${sureId}"]`
  let tries = 0, hizaAdim = 0
  const hizala = () => {
    const el = scrollRef.current
    if (!el) return
    // Kullanıcı bu arada kaydırmaya başladıysa hizalamayı BIRAK: momentum sırasında
    // scrollTop'a yazmak iOS'ta akışı öldürüyor (yarıda duruş).
    if (dokunuyorRef.current) { konumuGoster(); return }
    const hedefEl = el.querySelector(selector)
    if (!hedefEl) { if (++tries < 16) setTimeout(hizala, 60); else konumuGoster(); return }   // sayfa henüz render olmadı
    const kaydirEl = odakKaydirElemani(el, sureId, ayetNo, hedefEl)
    const scRect = el.getBoundingClientRect()
    const kRect = kaydirEl.getBoundingClientRect()
    const fark = (kRect.top - scRect.top) - offset
    if (Math.abs(fark) > 1) el.scrollTop += fark
    if (++hizaAdim < 4) setTimeout(hizala, 70)   // içerik otururken birkaç kez daha
    else konumuGoster()                          // hizalama oturdu → açılış örtüsü (varsa) kalkar
  }
  requestAnimationFrame(hizala)

  if (ayetNo) {
    setOdakAyet({ sureNo: sureId, ayetNo })
    setTimeout(() => setOdakAyet(null), 2200)
  } else {
    odakSureNonce.current += 1
    setOdakSure({ id: sureId, nonce: odakSureNonce.current })
    if (odakSureTimeoutRef.current) clearTimeout(odakSureTimeoutRef.current)
    odakSureTimeoutRef.current = setTimeout(() => { setOdakSure(null); odakSureTimeoutRef.current = null }, 4200)
  }
}


  // ════════════════════════════════════════════════════════════════
  // POPUP YÖNETİMİ
  // ════════════════════════════════════════════════════════════════

  const kelimeTikla = useCallback((kelime, sure, ayet, e) => {
    const lugatSonuc = lugat(kelime.arabic)
    const position = kelime.id ? parseInt(kelime.id.split(":")[2]) : 0
    setPopup({
      tip: "kelime",
      kelime: {
        ham:      kelime.arabic,
        okunus:   lugatSonuc?.okunuş || "",
        anlamlar: lugatSonuc?.anlamlar || [],
        position,
      },
      sureNo: sure.id,
      ayetNo: ayet.no,
      konum:  popupKonum(e),
    })
  }, [])

  // Bir âyetin ARAPÇA metnini SAYFA ELEMANLARINDAN toplar — sayfayı çizen kaynağın aynısı,
  // böylece veri şekli ne olursa olsun ekranda görünenle birebir aynı metni alırız.
  // Âyet iki sayfaya taşabildiği için komşu sayfalara da bakılır.
  const ayetArapcasi = useCallback((sureNo, ayetNo) => {
    const sayfaMap = mushafRef.current.sayfaMap
    const ayetSayfaLookup = mushafRef.current.ayetSayfaLookup
    if (!sayfaMap || !sayfaMap.size) return ""
    const bas = ayetSayfasi(sureNo, ayetNo, ayetSayfaLookup) || 1
    const parcalar = []
    for (let p = Math.max(1, bas - 1); p <= bas + 1; p++) {
      for (const el of (sayfaMap.get(p) || [])) {
        if (el.tip === "kelime" && el.sure?.id === sureNo && Number(el.ayet?.no) === Number(ayetNo)) {
          parcalar.push(el.kelime.arabic)
        }
      }
    }
    // Sayfada overlay olarak çizilen tecvid/vakıf işaretlerini ÇIKAR: canvas'ta bunlar
    // fontun bozuk glifine düşüyor (KFGQPC'de ◉, diğerlerinde □ veya kopuk boşluk).
    return gorselIcinTemizle(parcalar.join(" "))
  }, [])

  const gorselAc = useCallback((sure, ayetNo) => {
    const meal = ayetMeal[sure.id]?.[ayetNo] || null
    setGorselVeri({
      arapca: ayetArapcasi(sure.id, ayetNo) || null,
      meal,
      kaynak: `${sure.isim} sûresi, ${ayetNo}. âyet`,
      sureNo: sure.id,
      ayetNo,
    })
    setGorselModu(false)
  }, [ayetArapcasi])

  // ── VİDEO SESİ ──────────────────────────────────────────────────────────────
  // useAudioPlayer `mp3Url(kariId, sureNo, ayetNo)` fonksiyonunu dışa veriyor
  // (everyayah.com/data/<kari>/SSSAAA.mp3) → tahmine/öğrenmeye gerek yok.
  const ayetSesUrl = useCallback((sureNo, ayetNo) => {
    try {
      if (typeof player.mp3Url === "function") return player.mp3Url(player.kariId, sureNo, ayetNo)
    } catch { /* yoksay */ }
    return null
  }, [player])

  // Videoda gösterilecek âyet listesi.
  //   adet: sayı | "hepsi" (sûrenin tamamı) | "sayfa" (âyetin bulunduğu mushaf sayfası)
  //         | "ozel" (baslangic..bitis arası)
  // Uzun sûre/sayfa seçimlerinde VIDEO_AZAMI_AYET ile kırpılır.
  // Sûre başından başlıyorsa (Fâtiha/Tevbe hariç ve kâri kaydında besmele okumuyorsa)
  // başa BESMELE parçası eklenir. "Tek Sayfa" iki sûreye taşabildiği için her parçanın
  // etiketi KENDİ sûresinin adıyla kurulur.
  const videoAyetListesi = useCallback((sureNo, baslangic, adet, bitis) => {
    const sureBul = (id) => mushafData.find(x => x.id === id)
    const sure = sureBul(sureNo)
    if (!sure) return { liste: [], kirpildi: false, toplamAyet: 0, sureAdi: "" }
    const toplamAyet = (sure.ayetler || []).length

    let ciftler = []
    if (adet === "sayfa") {
      const { sayfaMap, ayetSayfaLookup } = mushafRef.current
      const sayfa = ayetSayfasi(sureNo, baslangic, ayetSayfaLookup) || mushafRef.current.mevcutSayfa || 1
      const gorulen = new Set()
      for (const el of (sayfaMap.get(sayfa) || [])) {
        if (el.tip !== "kelime" || !el.sure || !el.ayet) continue
        const k = `${el.sure.id}:${el.ayet.no}`
        if (gorulen.has(k)) continue
        gorulen.add(k)
        ciftler.push({ sureNo: el.sure.id, ayetNo: Number(el.ayet.no) })
      }
    } else {
      const sonAyet = adet === "hepsi"
        ? toplamAyet
        : adet === "ozel"
          ? Math.min(Math.max(Number(bitis) || baslangic, baslangic), toplamAyet)
          : Math.min(baslangic + Number(adet) - 1, toplamAyet)
      for (let a = baslangic; a <= sonAyet; a++) ciftler.push({ sureNo, ayetNo: a })
    }

    const istenen = ciftler.length
    const kirpildi = istenen > VIDEO_AZAMI_AYET
    if (kirpildi) ciftler = ciftler.slice(0, VIDEO_AZAMI_AYET)

    const liste = []
    const ilk = ciftler[0]
    if (ilk && ilk.ayetNo === 1 && ilk.sureNo !== 1 && ilk.sureNo !== 9
        && !BESMELE_OKUYANLAR.includes(player.kariId)) {
      const s0 = sureBul(ilk.sureNo)
      liste.push({
        tip: "besmele", sureNo: ilk.sureNo, ayetNo: 0,
        arapca: "بِسْمِ اللّٰهِ الرَّحْمٰنِ الرَّح۪يمِ",
        meal: null,
        etiket: `${s0?.isim || ""} Sûresi`,
      })
    }
    for (const c of ciftler) {
      const s0 = sureBul(c.sureNo)
      liste.push({
        tip: "ayet", sureNo: c.sureNo, ayetNo: c.ayetNo,
        arapca: ayetArapcasi(c.sureNo, c.ayetNo) || null,
        meal: ayetMeal[c.sureNo]?.[c.ayetNo] || null,
        etiket: `${s0?.isim || ""} Sûresi · ${c.ayetNo}`,
      })
    }
    return { liste, sureAdi: sure.isim, toplamAyet, kirpildi }
  }, [mushafData, ayetArapcasi, player.kariId])


  useEffect(() => { gorselAcRef.current = gorselAc }, [gorselAc])

  // Panel proplarını MEMO'la: her render'da yeni nesne göndermek panelde gereksiz
  // yeniden hesaplamaya yol açıyordu.
  const gorselAyetProp = useMemo(
    () => (gorselVeri?.sureNo ? { sureNo: gorselVeri.sureNo, ayetNo: gorselVeri.ayetNo } : null),
    [gorselVeri?.sureNo, gorselVeri?.ayetNo]
  )
  const gorselSureBilgiProp = useMemo(() => {
    if (!gorselVeri?.sureNo) return null
    const sr = mushafData.find(x => x.id === gorselVeri.sureNo)
    return { ayetSayisi: (sr?.ayetler || []).length, sureAdi: sr?.isim || "" }
  }, [gorselVeri?.sureNo, mushafData])

  const ayetTikla = useCallback((sure, ayetNo, e) => {
    if (gorselModuRef.current) { gorselAcRef.current?.(sure, ayetNo); return }
    const meal = ayetMeal[sure.id]?.[ayetNo] || null
    setPopup({
      tip:    "ayet",
      sure,
      ayetNo,
      meal,
      konum: e ? popupKonum(e) : { x: window.innerWidth / 2 - 150, y: 120 },
    })
  }, [])

  const sureTikla = useCallback((sure, e) => {
    setPopup({
      tip: "ayet",
      sure,
      ayetNo: null,
      meal: `Anlam: ${sure.anlam}\nNüzul: ${sure.yer}\nÂyet sayısı: ${sure.ayetSayisi}`,
      konum: e ? popupKonum(e) : { x: window.innerWidth / 2 - 150, y: 120 },
    })
  }, [])


  // Tekrar ayar panelini aç — mevcut bağlama göre alanları ön-doldur
  function acDonguAyar() {
    const akt = player.aktifAyet
    // Besmele çalıyorsa gerçek hedef sûre besmeleIcin'de (aktifAyet.sureNo=1/Fatiha olur).
    // O yüzden besmeleIcin varsa onu ve 1. âyeti al → panel "Fatiha 1" yerine o sûreyi gösterir.
    const sn = akt?.besmeleIcin || akt?.sureNo || mevcutSureBilgisi?.id || 1
    const an = akt?.besmeleIcin ? 1 : (akt?.ayetNo || 1)
    setTmSure(sn)
    setTmSureArama("")
    setTmAyetBas(an); setTmAyetSon(an)
    setTmSayfaBas(mevcutSayfa); setTmSayfaSon(mevcutSayfa)
    setDonguAyarAcik(true)
  }
  // Seçilen moda göre âyet listesi kurup döngülü çal (playlist gibi başa döner)
  function tekrariUygula() {
    let liste = []
    if (tmMod === "sure") {
      const s = mushafData.find(x => x.id === +tmSure)
      if (s) liste = (s.ayetler || []).map(a => ({ sureNo: s.id, ayetNo: a.no }))
    } else if (tmMod === "ayet") {
      const s = mushafData.find(x => x.id === +tmSure)
      if (s) {
        const b = Math.max(1, Math.min(+tmAyetBas, +tmAyetSon))
        const e = Math.min(s.ayetSayisi, Math.max(+tmAyetBas, +tmAyetSon))
        for (let a = b; a <= e; a++) liste.push({ sureNo: s.id, ayetNo: a })
      }
    } else if (tmMod === "sayfa") {
      const b = Math.min(+tmSayfaBas, +tmSayfaSon), e = Math.max(+tmSayfaBas, +tmSayfaSon)
      for (const s of mushafData) for (const a of (s.ayetler || [])) {
        if (a.sayfa >= b && a.sayfa <= e) liste.push({ sureNo: s.id, ayetNo: a.no, _sq: s.id * 10000 + a.no })
      }
      liste.sort((x, y) => x._sq - y._sq)
    }
    if (!liste.length) return
    // Besmele ile başla: döngüde bir sûrenin 1. âyetine gelince önüne besmele (sûre 1 ve 9 hariç).
    // Besmeleyi zaten okuyan kâriler (Abdussamed vb.) için ayrı besmele EKLENMEZ → "Fatiha 1"
    // tekrarı / çift besmele olmaz.
    if (tmBesmele && !BESMELE_OKUYANLAR.includes(player.kariId)) {
      const bes = []
      for (const it of liste) {
        if (it.ayetNo === 1 && it.sureNo !== 1 && it.sureNo !== 9) bes.push({ sureNo: 1, ayetNo: 1, besmeleIcin: it.sureNo })
        bes.push(it)
      }
      liste = bes
    }
    // Yalnız kaydedilen mod aktif olsun; diğer modların değerleri sıfırlansın (karışmasın)
    if (tmMod !== "sayfa") { setTmSayfaBas(1); setTmSayfaSon(1) }
    if (tmMod !== "ayet")  { setTmAyetBas(1); setTmAyetSon(1) }
    if (tmMod === "sayfa") { setTmSure(1) }
    setTmSureArama("")
    setTekrarModu(tmMod)
    setDonguAyarAcik(false)
    player.listeCal(liste, true)
  }
  function tekrariSifirla() {
    setTekrarModu(null)
    setDonguAyarAcik(false)
    player.durdur()
  }

  function togglePanel(setter, deger) {
    setAaAcik(false); setTemaAcik(false)
    setAyarlarAcik(false); setOzelTemaPanelAcik(false)
    setter(deger)
  }

  // ════════════════════════════════════════════════════════════════
  // PANEL ve BAR STİLLERİ
  // ════════════════════════════════════════════════════════════════

  const panelStil = (konum) => ({
    position: "fixed",
    [barKonum === "alt" ? "bottom" : "top"]: `${barYuksekligi + (player.durum !== "kapali" ? playerBarYuksekligi : 4)}px`,
    ...(konum === "right"
      ? { right: "12px" }
      : konum === "left"
      ? { left: "12px" }
      : { left: "50%", transform: "translateX(-50%)" }),
    background: theme.surface,
    border: `1px solid ${theme.border}`,
    borderRadius: "24px",
    padding: "12px",
    zIndex: 200,
    boxShadow: "0 8px 24px rgba(0,0,0,0.15)",
    // Panel kendi sonuna gelince kaydırma ARKA SAYFAYA zincirlenmesin
    overscrollBehavior: "contain",
  })

  const barButonStil = (aktif = false) => ({
  display: "flex", alignItems: "center", gap: "4px",
  padding: isMobile 
    ? `${Math.round(3 * barUiOlcegi)}px ${Math.round(5 * barUiOlcegi)}px`
    : `${Math.round(6 * barUiOlcegi)}px ${Math.round(8 * barUiOlcegi)}px`,
  borderRadius: "8px",
  fontSize: `${Math.round(12 * barUiOlcegi)}px`,
  background: aktif ? `${theme.accent}20` : "transparent",
  color: theme.accent,
  border: "none", cursor: "pointer", transition: "all 0.15s",
  flexShrink: 0,
})


const menuStil = {
  position: "fixed",
  width: "280px",
  flexShrink: 0,
  background: theme.surface,
  borderRight: `1px solid ${theme.border}`,
  display: "flex",
  flexDirection: "column",
  zIndex: 80,
  // Bar + oynatıcı payı; bar GİZLİYSE bar payı düşer (menü otomatik gizlemeyle kayar).
  // Bar gizliyken oynatıcı kenara geçtiğinden onun payı korunur.
  top: barKonum === "ust"
    ? `${(barGorunur ? barYuksekligi : 0) + (player.durum !== "kapali" ? playerBarYuksekligi : 0)}px`
    : "0px",
  bottom: barKonum === "alt"
    ? `${(barGorunur ? barYuksekligi : 0) + (player.durum !== "kapali" ? playerBarYuksekligi : 0)}px`
    : "0px",
  transition: "top 0.3s ease, bottom 0.3s ease",
  ...(isMobile ? { left: 0 } : {}),
}

// menuStil zaten bar+oynatıcı payını top/bottom ile ayırıyor; içeride EK boşluk
// gerekmez (eskiden playerBarOffset ile çift sayılıp fazla boşluk kalıyordu).
// Yalnız listenin son öğesi (Nâs) kenara yapışmasın diye ufak nefeslik.
const menuIcerikPadding = { paddingTop: 0, paddingBottom: 0 }

  // ════════════════════════════════════════════════════════════════
  // SAYFAYA GİT POPUP
  // ════════════════════════════════════════════════════════════════
  const SayfaGitPopup = sayfaGitAcik && (
  <>
    <div onClick={() => setSayfaGitAcik(false)} style={{ position: "fixed", inset: 0, zIndex: 95 }} />
    <div className="vukuf-panel" style={{ ...panelStil("center"), width: "280px", zIndex: 96 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "10px" }}>
        <div style={{ fontSize: "12px", color: theme.textSecondary }}>SAYFAYA GİT (1 – {toplamSayfa})</div>
        <button onClick={() => setSayfaGosterimAcik(v => !v)} title="Bardaki görünüm tipi"
          style={{ background: sayfaGosterimAcik ? `${theme.accent}20` : "none", border: "none", borderRadius: "6px", cursor: "pointer", color: theme.textSecondary, padding: "3px", display: "flex" }}>
          <Settings size={14} />
        </button>
      </div>
      {sayfaGosterimAcik && (
        <div style={{ display: "flex", flexDirection: "column", gap: "6px", marginBottom: "12px", padding: "8px", borderRadius: "8px", background: theme.background, border: `1px solid ${theme.border}` }}>
          <div style={{ fontSize: "10px", color: theme.textSecondary, letterSpacing: "1px", marginBottom: "2px" }}>BARDA GÖRÜNÜM</div>
          {[{ id: "ikon", on: null }, { id: "sayfa", on: `${mevcutSayfa}` }, { id: "tam", on: `${mevcutSayfa} / ${toplamSayfa}` }].map(o => (
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
          type="number" min={1} max={toplamSayfa}
          value={sayfaGitInput}
          onChange={e => setSayfaGitInput(e.target.value)}
          onKeyDown={e => {
            if (e.key === "Enter") {
              const n = Math.min(Math.max(1, parseInt(sayfaGitInput)), toplamSayfa)
              sayfayaGit(n)
              setSayfaGitAcik(false)
            }
          }}
          placeholder="Sayfa no..." autoFocus
          style={{
            flex: 1, padding: "8px 12px", borderRadius: "8px",
            border: `1px solid ${theme.border}`,
            background: theme.background, color: theme.text,
            fontSize: "14px", outline: "none",
          }}
        />
        <button
          onClick={() => {
            sayfayaGit(Math.min(Math.max(1, Number(sayfaGitInput)), toplamSayfa))
            setSayfaGitAcik(false)
          }}
          style={{
            padding: "8px 14px", borderRadius: "8px",
            background: theme.accent, color: "#fff",
            fontSize: "13px", border: "none", cursor: "pointer",
          }}
        >
          Git
        </button>
      </div>
      <input
        type="range" min={1} max={toplamSayfa} value={mevcutSayfa}
        onChange={e => setMevcutSayfa(Number(e.target.value))}
        onMouseUp={e => {
          sayfayaGit(parseInt(e.target.value))
          setSayfaGitAcik(false)
        }}
        onTouchEnd={e => {
          sayfayaGit(parseInt(e.target.value))
          setSayfaGitAcik(false)
        }}
        style={{ width: "100%", accentColor: theme.accent }}
      />
      <div style={{
        textAlign: "center", fontSize: "16px",
        fontWeight: "bold", color: theme.accent, marginTop: "6px",
      }}>
        {mevcutSayfa}
      </div>
    </div>
  </>
)

  // ════════════════════════════════════════════════════════════════
  // AA PANELİ
  // ════════════════════════════════════════════════════════════════

 const AaPanel = aaAcik && (
    <>
      <div onClick={() => setAaAcik(false)} style={{ position: "fixed", inset: 0, zIndex: 195 }} />
      <div className="vukuf-panel" style={{ ...panelStil("center"), width: "300px", maxHeight: "80vh", overflowY: "auto", zIndex: 200 }}>

        {/* TEK ÖNİZLEME — panelin üstünde sabit durur, aşağıdaki BÜTÜN ayarlar
            (boyut, satır aralığı, harf aralığı, yazı tipi) bunu anında değiştirir.
            Eskiden her ayarın altında ayrı bir önizleme vardı; menü kalabalıktı. */}
        <div style={{
          // Panelin kendi 12px padding'i olduğu için negatif marj + eşit padding ile
          // yapıştırılır; yoksa altından kayan yazı üst boşlukta görünüyordu.
          position: "sticky", top: "-12px", zIndex: 2,
          background: theme.surface,
          margin: "-12px -12px 12px", padding: "12px 12px 10px",
          borderBottom: `1px solid ${theme.border}`,
        }}>
          <div style={{ fontSize: "10px", color: theme.textSecondary, letterSpacing: "1px", marginBottom: "6px", opacity: 0.8 }}>
            ÖNİZLEME · {aktifArapcaFont.label}
          </div>
          <div style={{
            padding: "10px 12px", borderRadius: "9px",
            background: theme.background, border: `1px solid ${theme.border}`,
            direction: "rtl", textAlign: "center",
            fontFamily: aktifArapcaFont.style,
            fontSize: `${Math.min(yaziBoyutu, 44)}px`,
            lineHeight: satirAraligi,
            letterSpacing: `${harfAraligi}px`,
            color: theme.text,
            overflow: "hidden",
          }}>
            بِسۡمِ ٱللَّهِ ٱلرَّحۡمَٰنِ ٱلرَّحِيمِ
          </div>
        </div>

        {/* YAZI BOYUTU */}
        <div style={{ fontSize: "11px", color: theme.textSecondary, marginBottom: "8px", letterSpacing: "1px" }}>YAZI BOYUTU</div>
        <div style={{ marginBottom: "20px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", color: theme.textSecondary, marginBottom: "6px" }}>
            <span>Küçük</span>
            <span style={{ color: theme.accent, fontWeight: "bold" }}>{yaziBoyutu}px</span>
            <span>Büyük</span>
          </div>
          <input
            type="range"
            min="20"
            max="100"
            step="5"
            value={yaziBoyutu}
            onChange={e => setYaziBoyutu(parseInt(e.target.value))}
            style={{ width: "100%", accentColor: theme.accent }}
          />
        </div>

  
        {/* SATIR ARALIĞI */}
        <div style={{ fontSize: "11px", color: theme.textSecondary, marginBottom: "8px", letterSpacing: "1px" }}>SATIR ARALIĞI</div>
        <div style={{ marginBottom: "20px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", color: theme.textSecondary, marginBottom: "6px" }}>
            <span>Sıkışık</span>
            <span style={{ color: theme.accent, fontWeight: "bold" }}>{satirAraligi.toFixed(1)}</span>
            <span>Geniş</span>
          </div>
          <input
            type="range"
            min="1.6"
            max="3.5"
            step="0.1"
            value={satirAraligi}
            onChange={e => setSatirAraligi(parseFloat(e.target.value))}
            style={{ width: "100%", accentColor: theme.accent }}
          />
        </div>

        {/* HARF ARALIĞI */}
        <div style={{ fontSize: "11px", color: theme.textSecondary, marginBottom: "8px", letterSpacing: "1px" }}>HARF ARALIĞI</div>
        <div style={{ marginBottom: "20px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", color: theme.textSecondary, marginBottom: "6px" }}>
            <span>Normal</span>
            <span style={{ color: theme.accent, fontWeight: "bold" }}>{harfAraligi.toFixed(1)}px</span>
            <span>Geniş</span>
          </div>
          <input
            type="range"
            min="0"
            max={isMobile ? "1" : "1.9"}
            step="0.1"
            value={harfAraligi}
            onChange={e => setHarfAraligi(parseFloat(e.target.value))}
            style={{ width: "100%", accentColor: theme.accent }}
          />
        </div>

        {/* YAZI TİPİ */}
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
            padding: "9px 10px", marginBottom: "20px", borderRadius: "9px",
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
            (aşağı açılınca panelin altında kalıp görünmüyordu); açılışta da görünür
            alana kaydırılır. */}
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
            <span style={{ display: "block", fontSize: "12px", fontWeight: 600 }}>{aktifArapcaFont.label}</span>
          </span>
          {yaziTipiAcik ? <ChevronDown size={16} color={theme.textSecondary} /> : <ChevronUp size={16} color={theme.textSecondary} />}
        </button>
        <div style={{ display: yaziTipiAcik ? "flex" : "none", flexDirection: "column", gap: "2px" }}>
          {ARAPCA_FONTLAR.map(font => (
            <button
              key={font.id}
              onClick={() => setArapcaFontId(font.id)}
              style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                padding: "10px 12px", borderRadius: "8px",
                border: `1px solid ${arapcaFontId === font.id ? theme.accent : theme.border}`,
                background: arapcaFontId === font.id ? `${theme.accent}12` : theme.background,
                cursor: "pointer", transition: "all 0.15s",
              }}
            >
              <span style={{ fontSize: "12px", color: theme.textSecondary }}>{font.label}</span>
              <span style={{
                fontFamily: font.style,
                fontSize: "18px",
                color: arapcaFontId === font.id ? theme.accent : theme.text,
              }}>
                بِسۡمِ
              </span>
            </button>
          ))}
        </div>
        </div>
      </div>
    </>
  )

  // ════════════════════════════════════════════════════════════════
  // TEMA PANELİ
  // ════════════════════════════════════════════════════════════════

  const TemaPanel = temaAcik && (
    <>
      <div onClick={() => setTemaAcik(false)} style={{ position: "fixed", inset: 0, zIndex: 195 }} />
      <div className="vukuf-panel" style={{ ...panelStil("right"), width: "240px", zIndex: 200 }}>
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
              if (t.id === "custom") { setTemaAcik(false); setOzelTemaPanelAcik(true) }
              else { setCurrentTheme(t.id); setTemaAcik(false) }
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
              width: "16px", height: "16px", borderRadius: "50%", background: t.renk, flexShrink: 0,
              border: `2px solid ${currentTheme === t.id ? theme.accent : theme.border}`,
            }} />
            <div style={{ flex: 1, textAlign: "left" }}>
              <div style={{ fontSize: "13px" }}>{t.label}</div>
              <div style={{ fontSize: "10px", color: theme.textSecondary }}>{t.aciklama}</div>
            </div>
            {currentTheme === t.id && t.id !== "custom" && <span style={{ fontSize: "10px", color: theme.accent }}>✓</span>}
            {t.id === "custom" && <Pencil size={Math.round((isMobile ? 18 : 21) * barUiOlcegi)} color={theme.textSecondary} />}
          </button>
        ))}
      </div>
    </>
  )

  // ════════════════════════════════════════════════════════════════
  // ÖZEL TEMA PANELİ
  // ════════════════════════════════════════════════════════════════

  const OzelTemaPanel = ozelTemaPanelAcik && (
    <>
      <div onClick={() => setOzelTemaPanelAcik(false)}
        style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 300 }} />
      <div className="vukuf-panel" style={{
        position: "fixed", top: "50%", left: "50%", transform: "translate(-50%, -50%)",
        background: theme.surface, border: `1px solid ${theme.border}`,
        borderRadius: "24px", padding: "24px", zIndex: 400,
        width: "320px", maxHeight: "90vh", overflowY: "auto", overscrollBehavior: "contain",
        boxShadow: "0 8px 32px rgba(0,0,0,0.2)",
      }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "20px" }}>
          <h2 style={{ fontSize: `${Math.round((isMobile ? 11 : 12) * barUiOlcegi)}px`, color: theme.text }}>Özel Tema</h2>
          <button onClick={() => setOzelTemaPanelAcik(false)} style={{ color: theme.textSecondary, background: "none", border: "none", cursor: "pointer" }}>
            <X size={Math.round((isMobile ? 18 : 21) * barUiOlcegi)} />
          </button>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {PALET_ALANLARI.map(palet => (
            <div key={palet.key}>
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <button
                  onClick={() => setAktifRenk(aktifRenk === palet.key ? null : palet.key)}
                  style={{
                    width: "32px", height: "32px", borderRadius: "50%",
                    background: ozelRenkler[palet.key] || theme[palet.key] || "#888",
                    border: `2px solid ${aktifRenk === palet.key ? theme.accent : theme.border}`,
                    cursor: "pointer", flexShrink: 0,
                  }}
                />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: `${Math.round((isMobile ? 11 : 12) * barUiOlcegi)}px`, color: theme.text }}>{palet.label}</div>
                  <div style={{ fontSize: `${Math.round((isMobile ? 11 : 12) * barUiOlcegi)}px`, color: theme.textSecondary }}>{ozelRenkler[palet.key]}</div>
                </div>
              </div>
              {aktifRenk === palet.key && (
                <div style={{ marginTop: "8px", marginLeft: "44px" }}>
                  <input
                    type="color"
                    value={ozelRenkler[palet.key] || "#000000"}
                    onChange={e => setOzelRenkler(prev => ({ ...prev, [palet.key]: e.target.value }))}
                    style={{ width: "100%", height: "40px", borderRadius: "8px", border: `1px solid ${theme.border}`, cursor: "pointer", padding: "2px" }}
                  />
                  <div style={{ display: "flex", gap: "6px", marginTop: "8px", flexWrap: "wrap" }}>
                    {HAZIR_RENKLER.map(renk => (
                      <button
                        key={renk}
                        onClick={() => setOzelRenkler(prev => ({ ...prev, [palet.key]: renk }))}
                        style={{
                          width: "24px", height: "24px", borderRadius: "50%", background: renk, cursor: "pointer",
                          border: `2px solid ${ozelRenkler[palet.key] === renk ? theme.accent : theme.border}`,
                        }}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
        <div style={{
          marginTop: "16px", padding: "12px", borderRadius: "10px",
          background: ozelRenkler.background, border: `1px solid ${ozelRenkler.border}`,
        }}>
          <div style={{ fontSize: `${Math.round((isMobile ? 11 : 12) * barUiOlcegi)}px`, color: theme.textSecondary, marginBottom: "6px", letterSpacing: "1px" }}>ÖNİZLEME</div>
          <div style={{ fontSize: `${Math.round((isMobile ? 11 : 12) * barUiOlcegi)}px`, color: ozelRenkler.text, marginBottom: "4px" }}>Örnek metin</div>
          <div style={{ fontSize: `${Math.round((isMobile ? 11 : 12) * barUiOlcegi)}px`, color: ozelRenkler.textSecondary, marginBottom: "6px" }}>İkincil metin</div>
          <span style={{ fontSize: `${Math.round((isMobile ? 11 : 12) * barUiOlcegi)}px`, color: ozelRenkler.lugatHighlight, borderBottom: `1px dotted ${ozelRenkler.lugatHighlight}` }}>
          </span>
        </div>
        <button
          onClick={() => {
            ozelTemaKaydetFromContext(ozelRenkler)
            setAktifRenk(null)
            setOzelTemaPanelAcik(false)
            setCurrentTheme("custom")
          }}
          style={{
            width: "100%", marginTop: "16px", padding: "12px", borderRadius: "10px",
            background: theme.accent, color: "#fff", fontSize: "14px",
            cursor: "pointer", border: "none",
          }}
        >
          Temayı Kaydet
        </button>
      </div>
    </>
  )

  // ════════════════════════════════════════════════════════════════
  // AYARLAR PANELİ
  // ════════════════════════════════════════════════════════════════

  const AyarlarPanel = ayarlarAcik && (
    <>
      <div onClick={() => setAyarlarAcik(false)} style={{ position: "fixed", inset: 0, zIndex: 195 }} />
      <div className="vukuf-panel" style={{ 
        ...panelStil("right"), 
        width: "270px", 
        display: "flex", 
        flexDirection: "column", 
        gap: "16px", 
        zIndex: 200,
        maxHeight: "80vh",
        overflowY: "auto",
      }}>
        <div>
          <div style={{ fontSize: `${Math.round((isMobile ? 11 : 12) * barUiOlcegi)}px`, color: theme.textSecondary, marginBottom: "8px", letterSpacing: "1px" }}>Bar Konumu</div>
          <div style={{ display: "flex", gap: "6px" }}>
            {["ust", "alt"].map(k => (
              <button key={k} onClick={() => setBarKonum(k)} style={{
                flex: 1, padding: "8px", borderRadius: "8px", fontSize: `${Math.round((isMobile ? 11 : 12) * barUiOlcegi)}px`,
                background: barKonum === k ? theme.accent : `${theme.accent}15`,
                color: barKonum === k ? "#fff" : theme.text,
                display: "flex", alignItems: "center", justifyContent: "center", gap: "4px",
                border: "none", cursor: "pointer",
              }}>
                {k === "ust" ? <ChevronsUp size={Math.round((isMobile ? 18 : 21) * barUiOlcegi)} /> : <ChevronsDown size={Math.round((isMobile ? 18 : 21) * barUiOlcegi)} />}
                {k === "ust" ? "Üst" : "Alt"}
              </button>
            ))}
          </div>
        </div>
        <div>
          <div>
            </div>
          <div style={{ fontSize: `${Math.round((isMobile ? 11 : 12) * barUiOlcegi)}px`, color: theme.textSecondary, marginBottom: "8px", letterSpacing: "1px" }}>Arayüz Boyutu</div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: `${Math.round((isMobile ? 11 : 12) * barUiOlcegi)}px`, color: theme.textSecondary, marginBottom: "6px" }}>
            <span>Küçük</span>
            <span style={{ color: theme.accent, fontWeight: "bold" }}>{barUiOlcegi.toFixed(1)}x</span>
            <span>Büyük</span>
          </div>
          <input
            type="range" min="0.8" max="1.6" step="0.1"
            value={barUiOlcegi}
            onChange={e => setBarUiOlcegi(parseFloat(e.target.value))}
            style={{ width: "100%", accentColor: theme.accent }}
          />
        <div>
        </div>
          <div style={{ fontSize: `${Math.round((isMobile ? 11 : 12) * barUiOlcegi)}px`, color: theme.textSecondary, marginBottom: "8px", letterSpacing: "1px" }}>Otomatik Gizleme</div>
          <div onClick={() => setOtomatikGizleme(!otomatikGizleme)} role="button" aria-pressed={otomatikGizleme} style={{
            width: "100%", padding: "7px 10px", borderRadius: "8px", fontSize: `${Math.round((isMobile ? 12 : 13) * barUiOlcegi)}px`,
            color: theme.text,
            cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px",
          }}>
            <span>Otomatik gizleme</span>
            <IosSwitch acik={otomatikGizleme} theme={theme} boyut={0.82} />
          </div>
          {otomatikGizleme && (
            <div style={{ marginTop: "8px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: `${Math.round((isMobile ? 11 : 12) * barUiOlcegi)}px`, color: theme.textSecondary, marginBottom: "4px" }}>
                <span>Gizlenme süresi</span><span>{gizlemeSuresi} sn.</span>
              </div>
              <input type="range" min="2" max="15" value={gizlemeSuresi}
                onChange={e => setGizlemeSuresi(Number(e.target.value))}
                style={{ width: "100%", accentColor: theme.accent }}
              />
            </div>           
          )}
        </div>
        <div>
        {/* Açılır başlık */}
        <button
          onClick={() => setGorunumAcik(v => !v)}
          style={{
            width: "100%", padding: "4px 0", background: "none", border: "none",
            cursor: "pointer", display: "flex", alignItems: "center",
            justifyContent: "space-between",
            fontSize: `${Math.round((isMobile ? 11 : 12) * barUiOlcegi)}px`,
            color: theme.textSecondary, letterSpacing: "1px",
          }}
        >
          <span>Görüntüleme</span>
          {gorunumAcik
            ? <ChevronDown size={Math.round((isMobile ? 18 : 21) * barUiOlcegi)} />
            : <ChevronRight size={Math.round((isMobile ? 18 : 21) * barUiOlcegi)} />}
        </button>

        {/* İçerik — sadece açıkken */}
        {gorunumAcik && (
          <div style={{ marginTop: "10px" }}>
            {/* Görüntüleme'nin İLK seçeneği */}
            <button
              onClick={siraPaneliAc}
              style={{
                width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
                gap: "8px", padding: "9px 10px", marginBottom: "10px",
                background: `${theme.accent}12`, border: `1px solid ${theme.accent}33`,
                borderRadius: "9px", cursor: "pointer", color: theme.text,
                fontSize: `${Math.round((isMobile ? 12 : 13) * barUiOlcegi)}px`,
              }}
            >
              <span style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <GripVertical size={15} color={theme.accent} />
                Buton Sıralaması
              </span>
              <ChevronRight size={15} color={theme.textSecondary} />
            </button>

            <div style={{ fontSize: `${Math.round((isMobile ? 9 : 10) * barUiOlcegi)}px`, color: theme.textSecondary, opacity: .7, marginBottom: "6px", paddingLeft: "2px" }}>Bilgi</div>
            <AyarToggle etiket="Okuma zamanı"       aktif={sureGoster}        onToggle={() => setSureGoster(v => !v)}        {...{theme, isMobile, barUiOlcegi}} />
            <AyarToggle etiket="Sûre bilgisi"       aktif={sureBilgisiGoster} onToggle={() => setSureBilgisiGoster(v => !v)} {...{theme, isMobile, barUiOlcegi}} />
            <AyarToggle etiket="Cüz bilgisi"  aktif={cuzBilgisiGoster}   onToggle={() => setCuzBilgisiGoster(v => !v)}   {...{theme, isMobile, barUiOlcegi}} />
            <AyarToggle etiket="Hizb bilgisi" aktif={hizbBilgisiGoster}  onToggle={() => setHizbBilgisiGoster(v => !v)}  {...{theme, isMobile, barUiOlcegi}} />

            <div style={{ fontSize: `${Math.round((isMobile ? 9 : 10) * barUiOlcegi)}px`, color: theme.textSecondary, opacity: .7, margin: "10px 0 6px", paddingLeft: "2px" }}>Menü Butonları</div>
            <AyarToggle etiket="Sûre Menüsü"   aktif={sureMenuGoster} onToggle={() => setSureMenuGoster(v => !v)} {...{theme, isMobile, barUiOlcegi}} />
            <AyarToggle etiket="Kayıt Menüsü"  aktif={kayitGoster}    onToggle={() => setKayitGoster(v => !v)}    {...{theme, isMobile, barUiOlcegi}} />
            <AyarToggle etiket="Sayfaya Gitme" aktif={sayfaGitGoster} onToggle={() => setSayfaGitGoster(v => !v)} {...{theme, isMobile, barUiOlcegi}} />
            <AyarToggle etiket="Tekrar (Döngü)" aktif={tekrarBtnGoster} onToggle={() => setTekrarBtnGoster(v => !v)} {...{theme, isMobile, barUiOlcegi}} />
            <AyarToggle etiket="Bilgi (İşaretler)" aktif={bilgiGoster} onToggle={() => setBilgiGoster(v => !v)} {...{theme, isMobile, barUiOlcegi}} />
            <AyarToggle etiket="Görsel / Video" aktif={gorselGoster} onToggle={() => setGorselGoster(v => !v)} {...{theme, isMobile, barUiOlcegi}} />


            <AyarToggle etiket="Yazı Tipi"         aktif={yaziTipiGoster} onToggle={() => setYaziTipiGoster(v => !v)} {...{theme, isMobile, barUiOlcegi}} />
            <AyarToggle etiket="Otomatik Oynatma"  aktif={otoOynatGoster} onToggle={() => setOtoOynatGoster(v => !v)} {...{theme, isMobile, barUiOlcegi}} />
            <AyarToggle etiket="Sade Mod"      aktif={sadeModGoster}  onToggle={() => setSadeModGoster(v => !v)}  {...{theme, isMobile, barUiOlcegi}} />
            <AyarToggle etiket="Tema Paneli"   aktif={temaGoster}     onToggle={() => setTemaGoster(v => !v)}     {...{theme, isMobile, barUiOlcegi}} />
          </div>
        )}
      </div>

        {/* Sade Mod İçerikleri — sade modda hangi öğeler GÖSTERİLSİN (anahtar açık = görünür) */}
        <div>
          <button
            onClick={() => setSadeIcerikAcik(v => !v)}
            style={{
              width: "100%", padding: "4px 0", background: "none", border: "none",
              cursor: "pointer", display: "flex", alignItems: "center",
              justifyContent: "space-between",
              fontSize: `${Math.round((isMobile ? 11 : 12) * barUiOlcegi)}px`,
              color: theme.textSecondary, letterSpacing: "1px",
            }}
          >
            <span>Sade Mod İçerikleri</span>
            {sadeIcerikAcik
              ? <ChevronDown size={Math.round((isMobile ? 18 : 21) * barUiOlcegi)} />
              : <ChevronRight size={Math.round((isMobile ? 18 : 21) * barUiOlcegi)} />}
          </button>
          {sadeIcerikAcik && (
            <div style={{ marginTop: "10px" }}>
              <div style={{ fontSize: `${Math.round((isMobile ? 9 : 10) * barUiOlcegi)}px`, color: theme.textSecondary, opacity: .7, marginBottom: "6px", paddingLeft: "2px" }}>Sade modda görünecek öğeler</div>
              {SADE_OGELERI.map(o => (
                <AyarToggle key={o.key} etiket={o.label}
                  aktif={!sadeGizli[o.key]}
                  onToggle={() => setSadeGizli(p => ({ ...p, [o.key]: !p[o.key] }))}
                  {...{theme, isMobile, barUiOlcegi}} />
              ))}
            </div>
          )}
        </div>

        <div style={{ position: "relative", zIndex: 300 }}>
          <KariSecici
            kariId={player.kariId}
            setKariId={player.setKariId}
            theme={theme}
            barKonum={barKonum}
            barUiOlcegi={barUiOlcegi}
          />
        </div>
      </div>
    </>
  )

  // ════════════════════════════════════════════════════════════════
  // BAR
  // ════════════════════════════════════════════════════════════════

  // Bar öğesi görünür mü? (ayar + sade mod). Bu yardımcı sadeGorunur / mevcutSureBilgisi /
  // mevcutCuzHizb tanımlandıktan SONRA gelmeli — daha yukarıda tanımlanırsa render sırasında
  // TDZ hatası verir ve ekran beyaz kalır.
  const butonAcikMi = (k) => {
    switch (k) {
      case "geri":        return true
      case "sureMenu":    return sureMenuGoster && sadeGorunur("sureMenu")
      case "kayit":       return kayitGoster && sadeGorunur("kayit")
      case "sayfaGit":    return sayfaGitGoster && sadeGorunur("sayfaGit")
      case "tekrar":      return tekrarBtnGoster && sadeGorunur("tekrar")
      case "bilgi":       return bilgiGoster && sadeGorunur("bilgi")
      case "gorsel":      return gorselGoster && sadeGorunur("gorsel")
      case "yaziTipi":    return yaziTipiGoster && sadeGorunur("yaziTipi")
      case "otoOynat":    return otoOynatGoster && sadeGorunur("otoOynat")
      case "sadeMod":     return !!sadeModGoster
      case "tema":        return temaGoster && sadeGorunur("tema")
      case "ayarlar":     return true
      case "okumaZamani": return sureGoster && sadeGorunur("okumaZamani")
      case "sureBilgisi": return !!mevcutSureBilgisi && sureBilgisiGoster && sadeGorunur("sureBilgisi")
      case "cuzHizb":     return !!mevcutCuzHizb && ((cuzBilgisiGoster && sadeGorunur("cuzBilgisi")) || (hizbBilgisiGoster && sadeGorunur("hizbBilgisi")))
      default:            return false
    }
  }
  // Sıra + taraf. "sag" öğeler 50+ order alır; GÖRÜNÜR ilk sağ öğeye marginLeft:auto verilir →
  // o ve sonrası sağa yaslanır. Hiç sağ öğe yoksa hiçbir şey itilmez (düzen bozulmaz).
  const ilkSagKey = butonSirasi.find(k => butonTaraf[k] === "sag" && butonAcikMi(k))
  // order 10'un katları: satır kırma ayraçları aradaki tek sayıya (ör. 35) yerleşebilsin.
  const barOge = (k) => ({
    order: ((butonTaraf[k] === "sag" ? 50 : 0) + sira(k)) * 10,
    ...(!barCokSatir && k === ilkSagKey ? { marginLeft: "auto" } : {}),
  })

  const Bar = (
  <div
    ref={barRef}
    className="mushaf-bar"
    style={{
      position: "fixed", left: 0, right: 0,
      [barKonum === "alt" ? "bottom" : "top"]: 0,
      background: theme.surface,
      borderTop:    barKonum === "alt" ? `1px solid ${theme.border}` : "none",
      borderBottom: barKonum === "ust" ? `1px solid ${theme.border}` : "none",
      // Dikey padding + safe-area: max() → çift boşluk yok. Baz padding azaltıldı: bar uzamasın.
      // PWA'da alt boşluk DOĞRUDAN pwaAltBosluk (safe-area yok); web'de max(base, inset).
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
    }}
  >
      <button onClick={() => navigate(-1)} style={{ ...barButonStil(), flexShrink: 0, ...barOge("geri") }}>
        <ArrowLeft size={Math.round((isMobile ? 18 : 21) * barUiOlcegi)} /> {!isMobile && ""}
      </button>
      
            {sureMenuGoster && sadeGorunur("sureMenu") && (
        <button onClick={() => setMenuAcik(!menuAcik)} style={{ ...barButonStil(menuAcik), flexShrink: 0, ...barOge("sureMenu") }}>
          <Menu size={Math.round((isMobile ? 18 : 21) * barUiOlcegi)} />
        </button>
      )}

      {kayitGoster && sadeGorunur("kayit") && (
        <button
          onClick={() => {
            if (kayitlar.length > 0) {
              setKayitPaneliAcik(!kayitPaneliAcik)
            } else {
              setKayitKonumModu(true)
              setKayitPaneliAcik(false)
            }
          }}
          style={{ ...barOge("kayit") }}
        >
          <Bookmark color={theme.accent}
            size={Math.round((isMobile ? 18 : 21) * barUiOlcegi)}
            fill={kayitlar.some(k => k.sayfa === mevcutSayfa) ? "currentColor" : "none"}
          />
        </button>
      )}
      
      {sayfaGitGoster && sadeGorunur("sayfaGit") && (
        <button
          onClick={() => setSayfaGitAcik(!sayfaGitAcik)}
          style={{
            ...barButonStil(),
            ...barOge("sayfaGit"),
            fontSize: `${Math.round((isMobile ? 11 : 14) * barUiOlcegi)}px`,
            minWidth: isMobile ? "40px" : "48px",
            justifyContent: "center",
            fontWeight: "500",
            color: theme.accent,
          }}
        >
          <BookOpen size={Math.round((isMobile ? 18 : 21) * barUiOlcegi)} />
          {sayfaGosterim === "ikon" ? null : (sayfaGosterim === "sayfa" ? mevcutSayfa : `${mevcutSayfa} / ${toplamSayfa}`)}
        </button>
      )}

      {/* TEKRAR / DÖNGÜ — döngü ayar panelini açar (oynatıcı kapalıyken de erişilir).
          Sade modda da görünür; yalnız kendi görünürlük ayarına bağlı. */}
      {tekrarBtnGoster && sadeGorunur("tekrar") && (
        <button
          onClick={acDonguAyar}
          style={{ ...barButonStil(donguAyarAcik), flexShrink: 0, ...barOge("tekrar") }}
          title="Tekrar (döngü) ayarları"
        >
          <Repeat size={Math.round((isMobile ? 18 : 21) * barUiOlcegi)} />
        </button>
      )}

      {bilgiGoster && sadeGorunur("bilgi") && (
        <button
          onClick={() => setBilgiAcik(true)}
          style={{ ...barButonStil(bilgiAcik), flexShrink: 0, ...barOge("bilgi") }}
          title="İşaretler ve tecvid bilgisi"
        >
          <Gem size={Math.round((isMobile ? 18 : 21) * barUiOlcegi)} />
        </button>
      )}

      {gorselGoster && sadeGorunur("gorsel") && (
        <button
          onClick={() => { setPopup(null); setGorselModu(v => !v) }}
          style={{ ...barButonStil(gorselModu), flexShrink: 0, ...barOge("gorsel") }}
          title="Âyetten görsel veya video oluştur"
        >
          <ImagePlay size={Math.round((isMobile ? 18 : 21) * barUiOlcegi)} />
        </button>
      )}

    {yaziTipiGoster && sadeGorunur("yaziTipi") && (
      <button onClick={() => togglePanel(setAaAcik, !aaAcik)} style={{ ...barButonStil(aaAcik), ...barOge("yaziTipi") }}>
        <Feather size={Math.round((isMobile ? 18 : 21) * barUiOlcegi)} />
      </button>
    )}

    {otoOynatGoster && sadeGorunur("otoOynat") && (
      <>
        <button
          onClick={() => setOtomatikKaydirma(!otomatikKaydirma)}
          style={{ ...barButonStil(otomatikKaydirma), ...barOge("otoOynat") }}
          title="Otomatik kaydırma"
        >
          {otomatikKaydirma
            ? <Pause size={Math.round((isMobile ? 18 : 21) * barUiOlcegi)}  />
            : <Play size={Math.round((isMobile ? 18 : 21) * barUiOlcegi)}  />}
        </button>

        {otomatikKaydirma && (
          <div style={{
            ...barOge("otoOynat"),
            display: "flex",
            alignItems: "center",
            gap: "2px",
            background: `${theme.accent}10`,
            borderRadius: "6px",
            padding: "2px 6px",
          }}>
            <button
              onClick={() => setKaydirmaHizi(Math.max(1, kaydirmaHizi - 1))}
              style={{ ...barButonStil(), padding: "2px" }}
            >
              <Minus size={Math.round((isMobile ? 18 : 21) * barUiOlcegi)} />
            </button>
            <span style={{
              fontSize: `${Math.round((isMobile ? 18 : 21) * barUiOlcegi)}px`,
              color: theme.textSecondary,
              minWidth: "16px",
              textAlign: "center",
            }}>
              {kaydirmaHizi}
            </span>
            <button
              onClick={() => setKaydirmaHizi(Math.min(20, kaydirmaHizi + 1))}
              style={{ ...barButonStil(), padding: "2px" }}
            >
              <Plus size={Math.round((isMobile ? 18 : 21) * barUiOlcegi)} />
            </button>
          </div>
        )}
      </>
    )}

      {sadeModGoster && (
        <button onClick={() => setSadeMode(!sadeMode)} style={{ ...barButonStil(sadeMode), padding: isMobile ? "3px" : "4px", ...barOge("sadeMod") }}>
          <Circle size={Math.round((isMobile ? 18 : 21) * barUiOlcegi)} />
        </button>
      )}

      {temaGoster && sadeGorunur("tema") && (
        <button onClick={() => togglePanel(setTemaAcik, !temaAcik)} style={{ ...barButonStil(temaAcik), padding: isMobile ? "3px" : "4px", ...barOge("tema") }}>
          <Palette size={Math.round((isMobile ? 18 : 21) * barUiOlcegi)} />
        </button>
      )}

      <button onClick={() => togglePanel(setAyarlarAcik, !ayarlarAcik)} style={{ ...barButonStil(ayarlarAcik), padding: isMobile ? "3px" : "4px", ...barOge("ayarlar") }}>
        <Settings size={Math.round((isMobile ? 18 : 21) * barUiOlcegi)} />
      </button>

      {sureGoster && sadeGorunur("okumaZamani") && (
        <span style={{
          ...barOge("okumaZamani"),
          fontSize: `${Math.round((isMobile ? 9 : 12) * barUiOlcegi)}px`,
          color: theme.accent,
          padding: "5px 4px",
          display: "flex",
          alignItems: "center",
          gap: "2px",
        }}>
          <Clock size={Math.round((isMobile ? 18 : 21) * barUiOlcegi)} />
          {isMobile ? dakikaFormatla(bugunSure) : `Bugün ${dakikaFormatla(bugunSure)}`}
        </span>
      )}
      {mevcutSureBilgisi && sureBilgisiGoster && sadeGorunur("sureBilgisi") && (
        <span style={{
          ...barOge("sureBilgisi"),
          fontSize: `${Math.round((isMobile ? 9 : 12) * barUiOlcegi)}px`,
          color: theme.accent,
          padding: "5px 4px",
          display: "flex",
          alignItems: "center",
          gap: "2px",
        }}>
          <Layers size={Math.round((isMobile ? 18 : 21) * barUiOlcegi)} />
          {mevcutSureBilgisi.isim}
        </span>
      )}
      {(() => {
        // Cüz ve Hizb ayrı ayarlar. Kısa (mobil) gösterim: tek bilgi açıksa yer olduğu için tam
        // yazılır ("1. Cüz" / "Hizb 1"); İKİSİ birden açıksa sığması için kısaltılır ("9C·3H").
        const cuzAcik  = cuzBilgisiGoster  && sadeGorunur("cuzBilgisi")
        const hizbAcik = hizbBilgisiGoster && sadeGorunur("hizbBilgisi")
        if (!mevcutCuzHizb || (!cuzAcik && !hizbAcik)) return null
        const metin = isMobile
          ? (cuzAcik && hizbAcik
              ? `${mevcutCuzHizb.cuz}C·${mevcutCuzHizb.hizb}H`
              : cuzAcik ? `${mevcutCuzHizb.cuz}. Cüz` : `Hizb ${mevcutCuzHizb.hizb}`)
          : (cuzAcik && hizbAcik
              ? `${mevcutCuzHizb.cuz}. Cüz · ${mevcutCuzHizb.hizb}. Hizb`
              : cuzAcik ? `${mevcutCuzHizb.cuz}. Cüz` : `${mevcutCuzHizb.hizb}. Hizb`)
        return (
          <span style={{
            ...barOge("cuzHizb"),
            fontSize: `${Math.round((isMobile ? 9 : 12) * barUiOlcegi)}px`,
            color: theme.accent,
            padding: "5px 4px",
            display: "flex",
            alignItems: "center",
            gap: "2px",
            whiteSpace: "nowrap",
          }}>
            <BookOpen size={Math.round((isMobile ? 18 : 21) * barUiOlcegi)} />
            {metin}
          </span>
        )
      })()}

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
  // ANA RENDER
  // ════════════════════════════════════════════════════════════════

  if (yukleniyor) return <YuklemeEkrani theme={theme} yukseklik="100vh" />

  return (
    <div
      style={{ height: "100vh", display: "flex", background: theme.background, overflow: "hidden", position: "relative" }}
    >
      {/* AÇILIŞ ÖRTÜSÜ — konum oturana dek rozet; oturunca kaymadan solar. */}
      {acilisOrtu && (
        <div style={{
          position: "absolute", inset: 0, zIndex: 95,
          background: theme.background,
          opacity: konumHazir ? 0 : 1,
          pointerEvents: konumHazir ? "none" : "auto",
          transition: "opacity 0.35s ease",
        }}>
          <YuklemeEkrani theme={theme} yukseklik="100%" arkaplan={false} fade={false} />
        </div>
      )}

      {/* Paneller */}
      {AaPanel}
      {TemaPanel}
      
      {AyarlarPanel}
      {OzelTemaPanel}
      {SayfaGitPopup}


      {/* Popup'lar */}
      {popup?.tip === "kelime" && (
        <KelimePopup
          kelime={popup.kelime}
          konum={popup.konum}
          player={player}
          sureNo={popup.sureNo}
          ayetNo={popup.ayetNo}
          theme={theme}
          onKapat={() => setPopup(null)}
        />
      )}

      {popup?.tip === "ayet" && (
        <AyetPopup
          sure={popup.sure}
          ayetNo={popup.ayetNo}
          meal={popup.meal}
          konum={popup.konum}
          player={player}
          theme={theme}
          onKapat={() => setPopup(null)}
        />
      )}

      {/* GÖRSEL OLUŞTUR */}
      <GorselOlustur
        acik={!!gorselVeri}
        kapat={() => setGorselVeri(null)}
        arapca={gorselVeri?.arapca || null}
        meal={gorselVeri?.meal || null}
        kaynak={gorselVeri?.kaynak || null}
        arapcaFont={aktifArapcaFont.style}
        theme={theme}
        isMobile={isMobile}
        // Video: âyeti kâri okusun. Nesneler MEMO'lu — her render'da yeni kimlik üretilirse
        // paneldeki hesaplamalar boşuna tekrarlanıyor.
        ayet={gorselAyetProp}
        kariler={player.KARILAR || []}
        kariId={player.kariId}
        onKari={(id) => player.setKariId && player.setKariId(id)}
        sesUrlAl={ayetSesUrl}
        ayetListesiAl={videoAyetListesi}
        sureBilgi={gorselSureBilgiProp}
        azamiAyet={VIDEO_AZAMI_AYET}
      />

      {/* TEKRAR / DÖNGÜ AYAR PANELİ */}
      {donguAyarAcik && (() => {
        const inpStil = { width: "64px", padding: "7px 8px", borderRadius: "8px", border: `1px solid ${theme.border}`, background: theme.background, color: theme.text, fontSize: "14px", textAlign: "center", outline: "none" }
        const modBtn = (mod, etiket) => (
          <button onClick={() => setTmMod(mod)} style={{
            flex: 1, padding: "8px 6px", borderRadius: "10px", cursor: "pointer", fontSize: "13px", fontWeight: 600,
            border: `1px solid ${tmMod === mod ? theme.accent : theme.border}`,
            background: tmMod === mod ? theme.accent : "transparent",
            color: tmMod === mod ? "#fff" : theme.textSecondary,
          }}>{etiket}</button>
        )
        const satir = (label, cocuk) => (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "10px", marginTop: "12px" }}>
            <span style={{ fontSize: "13px", color: theme.textSecondary }}>{label}</span>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>{cocuk}</div>
          </div>
        )
        // Sûre adı arama (â→a, büyük/küçük duyarsız — sure menüsü gibi)
        const seciliSure = mushafData.find(s => s.id === +tmSure) || null
        const maksSure = mushafData.length || 114
        const aramaQ = tmSureArama.trim()
        const sureEslesme = aramaQ
          ? mushafData.filter(s => srNorm(s.isim).includes(srNorm(aramaQ)) || String(s.id).includes(aramaQ)).slice(0, 8) : []
        const sureSec = (s) => { setTmSure(s.id); setTmSureArama(""); setTmAyetBas(1); setTmAyetSon(1) }
        // Yazarken sûre NUMARASI maksimumu aşarsa: uyar (3 sn) + maks sûreye sabitle
        const sureAramaYaz = (v) => {
          const t = v.trim()
          if (/^\d+$/.test(t) && parseInt(t) > maksSure) {
            const maxS = mushafData.find(s => s.id === maksSure)
            if (maxS) sureSec(maxS)
            sureUyariGoster(`En fazla ${maksSure} sûre var — son sûreye sabitlendi.`)
            return
          }
          setTmSureArama(v)
        }
        const sureAramaAlani = (
          <div style={{ position: "relative", width: "168px" }}>
            <input value={tmSureArama} onChange={e => sureAramaYaz(e.target.value)}
              placeholder={seciliSure ? `${seciliSure.id}. ${seciliSure.isim}` : "Sûre adı / no…"}
              style={{ ...inpStil, width: "168px", textAlign: "left" }} />
            {sureEslesme.length > 0 && (
              <div style={{ position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0, zIndex: 210,
                background: theme.surface, border: `1px solid ${theme.border}`, borderRadius: "10px",
                boxShadow: "0 8px 24px rgba(0,0,0,0.2)", maxHeight: "200px", overflowY: "auto", padding: "4px" }}>
                {sureEslesme.map(s => (
                  <button key={s.id} onClick={() => sureSec(s)} style={{ width: "100%", textAlign: "left", padding: "8px 10px",
                    borderRadius: "8px", border: "none", background: "transparent", color: theme.text, cursor: "pointer", fontSize: "13px", fontFamily: "inherit" }}>
                    <span style={{ color: theme.accent, fontWeight: 700 }}>{s.id}.</span> {s.isim}
                  </button>
                ))}
              </div>
            )}
          </div>
        )
        // Sayfa aralığındaki sûre adları (maks 5) + max sayfa sabitleme
        const sayfaClamp = (v) => v === "" ? "" : Math.min(toplamSayfa, Math.max(1, parseInt(v) || 1))
        const sayfaAralikBilgi = () => {
          const b = Math.min(+tmSayfaBas || 1, +tmSayfaSon || 1), e = Math.max(+tmSayfaBas || 1, +tmSayfaSon || 1)
          const adlar = mushafData.filter(s => (s.ayetler || []).some(a => a.sayfa >= b && a.sayfa <= e)).map(s => s.isim)
          if (!adlar.length) return ""
          // Çok sûre varsa: ilk 2 + … + son (ör. "İhlâs, Felâk, …, Nâs Sûreleri")
          const gost = adlar.length <= 3 ? adlar.join(", ") : `${adlar[0]}, ${adlar[1]}, …, ${adlar[adlar.length - 1]}`
          return `${gost} Sûre${adlar.length > 1 ? "leri" : "si"}`
        }
        const ayetClamp = (v) => v === "" ? "" : Math.max(1, Math.min(seciliSure?.ayetSayisi || 999, parseInt(v) || 1))
        const ayetGecersiz = tmMod === "ayet" && seciliSure && +tmAyetBas > +tmAyetSon
        const sayfaGecersiz = tmMod === "sayfa" && (+tmSayfaBas || 1) > (+tmSayfaSon || 1)
        const kaydetGecersiz = (tmMod !== "sayfa" && !seciliSure) || ayetGecersiz || sayfaGecersiz
        return (
          <>
            <div onClick={() => setDonguAyarAcik(false)} style={{ position: "fixed", inset: 0, zIndex: 199, background: "rgba(0,0,0,0.35)" }} />
            <div className="vukuf-panel" style={{ position: "fixed", left: "50%", top: "50%", transform: "translate(-50%,-50%)", zIndex: 200,
              width: "min(92vw, 360px)", background: theme.surface, border: `1px solid ${theme.border}`, borderRadius: "16px",
              boxShadow: "0 12px 40px rgba(0,0,0,0.3)", padding: "18px", maxHeight: "82vh", overflowY: "auto", overscrollBehavior: "contain" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "14px" }}>
                <span style={{ fontSize: "15px", fontWeight: 700, color: theme.accent }}>Tekrar (Döngü)</span>
                <button onClick={() => setDonguAyarAcik(false)} style={{ background: "none", border: "none", cursor: "pointer", color: theme.textSecondary, display: "flex" }}><X size={16} /></button>
              </div>

              <div style={{ display: "flex", gap: "6px" }}>
                {modBtn("sayfa", "Sayfa")}
                {modBtn("ayet", "Âyet")}
                {modBtn("sure", "Sûre")}
              </div>

              {tmMod === "sayfa" && (
                <>
                  {satir("Başlangıç sayfa", <input type="number" min={1} max={toplamSayfa} value={tmSayfaBas} onChange={e => setTmSayfaBas(sayfaClamp(e.target.value))} style={inpStil} />)}
                  {satir("Bitiş sayfa", <input type="number" min={1} max={toplamSayfa} value={tmSayfaSon} onChange={e => setTmSayfaSon(sayfaClamp(e.target.value))} style={inpStil} />)}
                  {sayfaGecersiz
                    ? <div style={{ fontSize: "11.5px", color: "#c0392b", marginTop: "10px" }}>Başlangıç sayfası bitiş sayfasından büyük olamaz.</div>
                    : (sayfaAralikBilgi() && <div style={{ fontSize: "12.5px", color: theme.accent, marginTop: "10px", fontWeight: 500 }}>{sayfaAralikBilgi()}</div>)}
                  <div style={{ fontSize: "11.5px", color: theme.textSecondary, marginTop: "6px", opacity: 0.85 }}>Seçilen ardışık sayfalar sırayla okunur, sona gelince başa döner.</div>
                </>
              )}
              {tmMod === "ayet" && (
                <>
                  {satir("Sûre", sureAramaAlani)}
                  {sureUyari && <div style={{ fontSize: "11.5px", color: "#c0392b", marginTop: "8px" }}>{sureUyari}</div>}
                  {satir("Başlangıç âyet", <input type="number" min={1} max={seciliSure?.ayetSayisi || 999} value={tmAyetBas} onChange={e => setTmAyetBas(ayetClamp(e.target.value))} style={inpStil} />)}
                  {satir("Bitiş âyet", <input type="number" min={1} max={seciliSure?.ayetSayisi || 999} value={tmAyetSon} onChange={e => setTmAyetSon(ayetClamp(e.target.value))} style={inpStil} />)}
                  {ayetGecersiz && <div style={{ fontSize: "11.5px", color: "#c0392b", marginTop: "8px" }}>Başlangıç âyeti bitişten büyük olamaz.</div>}
                  <div style={{ fontSize: "11.5px", color: theme.textSecondary, marginTop: "6px", opacity: 0.85 }}>Seçilen ardışık âyetler playlist gibi tekrar eder.</div>
                </>
              )}
              {tmMod === "sure" && (
                <>
                  {satir("Sûre", sureAramaAlani)}
                  {sureUyari && <div style={{ fontSize: "11.5px", color: "#c0392b", marginTop: "8px" }}>{sureUyari}</div>}
                  <div style={{ fontSize: "11.5px", color: theme.textSecondary, marginTop: "8px", opacity: 0.85 }}>Seçilen sûre baştan sona tekrar eder.</div>
                </>
              )}

              {/* Kâri seçimi */}
              {(() => {
                const kariler = player.KARILAR || []
                const seciliKari = kariler.find(k => k.id === player.kariId)
                return (
                  <div style={{ position: "relative", marginTop: "14px" }}>
                    <button onClick={() => setKariSecAcik(a => !a)} style={{
                      width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px",
                      padding: "9px 12px", borderRadius: "10px", cursor: "pointer", fontSize: "13px", fontFamily: "inherit",
                      border: `1px solid ${kariSecAcik ? theme.accent : theme.border}`, background: "transparent", color: theme.text,
                    }}>
                      <span style={{ display: "flex", alignItems: "center", gap: "8px", overflow: "hidden" }}>
                        <Mic size={15} style={{ color: theme.accent, flexShrink: 0 }} />
                        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{seciliKari?.label || "Kâri seç"}</span>
                      </span>
                      <ChevronDown size={16} style={{ flexShrink: 0, transform: kariSecAcik ? "rotate(180deg)" : "none", transition: "transform .2s", color: theme.textSecondary }} />
                    </button>
                    {kariSecAcik && (
                      <div style={{ position: "absolute", bottom: "calc(100% + 4px)", left: 0, right: 0, zIndex: 210,
                        background: theme.surface, border: `1px solid ${theme.border}`, borderRadius: "10px",
                        boxShadow: "0 8px 24px rgba(0,0,0,0.2)", maxHeight: "220px", overflowY: "auto", padding: "4px" }}>
                        {kariler.map(k => (
                          <button key={k.id} onClick={() => { player.setKariId(k.id); setKariSecAcik(false) }} style={{
                            width: "100%", display: "flex", alignItems: "center", gap: "8px", textAlign: "left",
                            padding: "8px 10px", borderRadius: "8px", border: "none", cursor: "pointer", fontSize: "13px", fontFamily: "inherit",
                            background: k.id === player.kariId ? `${theme.accent}15` : "transparent",
                            color: k.id === player.kariId ? theme.accent : theme.text,
                          }}>
                            <span style={{ flex: 1 }}>{k.label}</span>
                            {k.id === player.kariId && <Check size={14} color={theme.accent} />}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })()}

              {/* Besmele ile başla — döngüde sûre başına gelince */}
              <div onClick={() => setTmBesmele(v => !v)} role="button" aria-pressed={tmBesmele} style={{
                width: "100%", marginTop: "10px", display: "flex", alignItems: "center", justifyContent: "space-between",
                padding: "9px 12px", borderRadius: "10px", cursor: "pointer", fontSize: "13px", gap: "12px",
                border: `1px solid ${theme.border}`, background: "transparent", color: theme.text,
              }}>
                <span>Besmele ile başla</span>
                <IosSwitch acik={tmBesmele} theme={theme} boyut={0.82} />
              </div>

              <div style={{ display: "flex", gap: "8px", marginTop: "14px" }}>
                <button onClick={tekrariSifirla} style={{ flex: 1, padding: "11px", borderRadius: "12px", border: `1px solid ${theme.border}`, background: "transparent", color: theme.textSecondary, cursor: "pointer", fontSize: "14px", fontWeight: 600 }}>Sıfırla</button>
                <button onClick={tekrariUygula} disabled={kaydetGecersiz}
                  style={{ flex: 1, padding: "11px", borderRadius: "12px", border: "none", cursor: kaydetGecersiz ? "not-allowed" : "pointer", fontSize: "14px", fontWeight: 600,
                    background: theme.accent, color: "#fff", opacity: kaydetGecersiz ? 0.5 : 1 }}>Kaydet</button>
              </div>
            </div>
          </>
        )
      })()}

      {/* Kayıt paneli */}
      {kayitPaneliAcik && (
        <KayitPaneli
          theme={theme}
          kayitlar={kayitlar}
          mevcutSayfa={mevcutSayfa}
          scrollOran={scrollOranRef.current}
          onSayfaGit={kayitSayfaGit}
          onKonumSec={() => {
            setKayitKonumModu(true)
            setKayitPaneliAcik(false)
          }}
          onKayitEkle={(baslik, scrollY) => {
            const yeniKayit = {
              id: Date.now().toString(),
              sayfa: mevcutSayfa,
              scrollY: scrollY !== undefined ? scrollY : scrollOranRef.current,
              baslik: baslik,
              olusturma: Date.now(),
            }
            setKayitlar(prev => {
              const yeni = [...prev, yeniKayit]
              localStorage.setItem("vukuf-kayitlar", JSON.stringify(yeni))
              return yeni
            })
          }}
          onKayitGuncelle={(id, baslik) => {
            setKayitlar(prev => {
              const yeni = prev.map(k => 
                k.id === id ? { ...k, baslik: baslik } : k
              )
              localStorage.setItem("vukuf-kayitlar", JSON.stringify(yeni))
              return yeni
            })
          }}
          onKayitSil={(id) => {
            setKayitlar(prev => {
              const yeni = prev.filter(k => k.id !== id)
              localStorage.setItem("vukuf-kayitlar", JSON.stringify(yeni))
              return yeni
            })
          }}
          onKapat={() => {
            setKayitPaneliAcik(false)
            setKayitlar(JSON.parse(localStorage.getItem("vukuf-kayitlar") || "[]"))
          }}
        />
      )}

      {kayitKonumModu && (
        <div style={{
          position: "fixed",
          top: "50%", left: "50%",
          transform: "translate(-50%, -50%)",
          background: theme.surface,
          border: `1px solid ${theme.accent}`,
          borderRadius: "12px",
          padding: "12px 20px",
          fontSize: `${Math.round((isMobile ? 11 : 12) * barUiOlcegi)}px`,
          color: theme.text,
          zIndex: 499,
          pointerEvents: "none",
          boxShadow: "0 4px 20px rgba(0,0,0,0.15)",
        }}>
          Kayıt koymak istediğiniz satıra dokunun
        </div>
      )}
      {gorselModu && (
        <div style={{
          position: "fixed",
          top: barKonum === "ust" ? `${barYuksekligi + 12}px` : "auto",
          bottom: barKonum === "ust" ? "auto" : `${barYuksekligi + 12}px`,
          left: "50%", transform: "translateX(-50%)",
          background: theme.surface,
          border: `1px solid ${theme.accent}`,
          borderRadius: "12px",
          padding: "10px 16px",
          fontSize: `${Math.round((isMobile ? 11 : 12) * barUiOlcegi)}px`,
          color: theme.text,
          zIndex: 499,
          display: "flex", alignItems: "center", gap: "10px",
          boxShadow: "0 4px 20px rgba(0,0,0,0.18)",
          maxWidth: "92vw",
        }}>
          <Camera size={14} color={theme.accent} />
          <span>Lütfen görselde kullanmak istediğiniz âyetin numarasına dokununuz.</span>
          <button
            onClick={() => setGorselModu(false)}
            style={{ background: "transparent", border: "none", color: theme.textSecondary, cursor: "pointer", padding: "2px", display: "flex" }}
            aria-label="Vazgeç"
          ><X size={14} /></button>
        </div>
      )}
      {/* Sure menüsü */}
      {menuAcik && (
  <>
    <div
      onClick={() => setMenuAcik(false)}
      style={{ 
        position: "fixed", 
        inset: 0, 
        zIndex: 78,
        background: "transparent",
        pointerEvents: "none",
      }}
    />
    <div 
      className="sure-menusu vukuf-panel"
      style={menuStil}
    >
      <div style={{ 
        padding: "12px 16px", 
        borderBottom: `1px solid ${theme.border}`, 
        display: "flex", 
        alignItems: "center", 
        gap: "8px" 
      }}>
        <span style={{
          flex: 1, minWidth: 0,
          color: theme.accent,
          fontSize: isMobile ? "14px" : "15px",
          fontWeight: 600,
          letterSpacing: "0.3px",
          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
        }}>Sûre &amp; Cüz Menüsü</span>
        <button 
          onClick={() => setMenuAcik(false)} 
          style={{ 
            color: theme.textSecondary, 
            display: "flex", 
            background: "none", 
            border: "none", 
            cursor: "pointer" 
          }}
        >
          <X size={Math.round((isMobile ? 18 : 21) * barUiOlcegi)} />
        </button>
      </div>
      
      <div style={{  
        flex: 1,  
        overflowY: "auto",
        ...menuIcerikPadding,
      }}>
       {/* ── ANA BAŞLIKLAR — arama yokken ── */}
      {/* Cüz + Sûre çekmeceleri — başlıklar her zaman görünür */}
      <>
          {/* Cüz başlığı */}
          <button
            onClick={() => setAnaBaslik(anaBaslik === "cuz" ? null : "cuz")}
            style={{
              width: "100%",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              padding: "12px 8px",
              background: "none",
              border: "none",
              borderBottom: `1px solid ${theme.border}`,
              cursor: "pointer",
              color: theme.accent,
              fontWeight: 600,
              fontSize: `${Math.round((isMobile ? 12 : 13) * barUiOlcegi)}px`,
            }}
          >
            {anaBaslik === "cuz"
              ? <ChevronDown size={Math.round((isMobile ? 18 : 21) * barUiOlcegi)} />
              : <ChevronRight size={Math.round((isMobile ? 18 : 21) * barUiOlcegi)} />}
            Cüz
          </button>

          {anaBaslik === "cuz" && (
            <div style={{
              display: "flex", alignItems: "center", gap: "8px",
              padding: "10px 8px", borderBottom: `1px solid ${theme.border}`,
            }}>
              <Search size={Math.round((isMobile ? 16 : 19) * barUiOlcegi)} color={theme.accent} />
              <input
                type="text"
                inputMode="numeric"
                placeholder="Cüz numarası..."
                value={cuzArama}
                onChange={e => setCuzArama(e.target.value.replace(/\D/g, ""))}
                style={{
                  flex: 1, background: "transparent", border: "none", outline: "none",
                  fontSize: `${Math.round((isMobile ? 11 : 12) * barUiOlcegi)}px`, color: theme.text,
                }}
              />
              {cuzArama && (
                <button onClick={() => setCuzArama("")} style={{ color: theme.textSecondary, display: "flex", background: "none", border: "none", cursor: "pointer" }}>
                  <X size={Math.round((isMobile ? 16 : 19) * barUiOlcegi)} />
                </button>
              )}
            </div>
          )}

          {anaBaslik === "cuz" && filtreliCuzler.map(cuz => (
            <div key={cuz.no}>
              <div style={{
                display: "flex",
                alignItems: "center",
                borderBottom: `1px solid ${theme.border}`,
                background: `${theme.accent}08`,
              }}>
                <button
                  onClick={() => setAcikCuz(acikCuz === cuz.no ? null : cuz.no)}
                  style={{
                    padding: "10px 8px 10px 16px",
                    color: theme.accent,
                    display: "flex",
                    alignItems: "center",
                    flexShrink: 0,
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                  }}
                >
                  {acikCuz === cuz.no
                    ? <ChevronDown size={Math.round((isMobile ? 18 : 21) * barUiOlcegi)} />
                    : <ChevronRight size={Math.round((isMobile ? 18 : 21) * barUiOlcegi)} />}
                </button>
                <button
                  onClick={() => sayfayaGit(cuz.baslangic)}
                  style={{
                    flex: 1,
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    padding: "10px 8px 10px 0",
                    textAlign: "left",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    color: theme.text,
                  }}
                >
                  <span style={{ fontSize: `${Math.round((isMobile ? 11 : 12) * barUiOlcegi)}px` }}>
                    {cuz.no}. Cüz
                  </span>
                  <span style={{
                    fontSize: `${Math.round((isMobile ? 8 : 9) * barUiOlcegi)}px`,
                    color: theme.textSecondary,
                    marginLeft: "auto",
                    paddingRight: "8px",
                  }}>
                    Sayfa {cuz.baslangic}
                  </span>
                </button>
              </div>

              {acikCuz === cuz.no && (
                <div style={{
                  display: "flex",
                  gap: "6px",
                  padding: "8px 12px 8px 24px",
                  background: `${theme.accent}08`,
                  borderBottom: `1px solid ${theme.border}`,
                }}>
                  {hizbSayfalari(cuz.no).map(h => (
                    <button
                      key={h.hizb}
                      onClick={() => sayfayaGit(h.sayfa)}
                      style={{
                        flex: 1,
                        height: "28px",
                        fontSize: `${Math.round((isMobile ? 8 : 10) * barUiOlcegi)}px`,
                        color: theme.text,
                        background: theme.background,
                        border: `1px solid ${theme.border}`,
                        borderRadius: "4px",
                        cursor: "pointer",
                      }}
                      onMouseEnter={e => { e.currentTarget.style.background = `${theme.accent}20` }}
                      onMouseLeave={e => { e.currentTarget.style.background = theme.background }}
                    >
                      Hizb {h.hizb}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}

          {/* Sure başlığı */}
          <button
            onClick={() => setAnaBaslik(anaBaslik === "sure" ? null : "sure")}
            style={{
              width: "100%",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              padding: "12px 8px",
              background: "none",
              border: "none",
              borderBottom: `1px solid ${theme.border}`,
              cursor: "pointer",
              color: theme.accent,
              fontWeight: 600,
              fontSize: `${Math.round((isMobile ? 12 : 13) * barUiOlcegi)}px`,
            }}
          >
            {anaBaslik === "sure"
              ? <ChevronDown size={Math.round((isMobile ? 18 : 21) * barUiOlcegi)} />
              : <ChevronRight size={Math.round((isMobile ? 18 : 21) * barUiOlcegi)} />}
            Sûre
          </button>
      </>

              {/* ── Sûre araması — listenin en başında */}
              {anaBaslik === "sure" && (
                <div style={{
                  display: "flex", alignItems: "center", gap: "8px",
                  padding: "10px 8px", borderBottom: `1px solid ${theme.border}`,
                }}>
                  <Search size={Math.round((isMobile ? 16 : 19) * barUiOlcegi)} color={theme.accent} />
                  <input
                    type="text"
                    placeholder="Sûre ismi..."
                    value={menuArama}
                    onChange={e => setMenuArama(e.target.value)}
                    style={{
                      flex: 1, background: "transparent", border: "none", outline: "none",
                      fontSize: `${Math.round((isMobile ? 11 : 12) * barUiOlcegi)}px`, color: theme.text,
                    }}
                  />
                  {menuArama && (
                    <button onClick={() => setMenuArama("")} style={{ color: theme.textSecondary, display: "flex", background: "none", border: "none", cursor: "pointer" }}>
                      <X size={Math.round((isMobile ? 16 : 19) * barUiOlcegi)} />
                    </button>
                  )}
                </div>
              )}

              {/* ── Sûre Listesi */}
              {anaBaslik === "sure" && filtreliSureler.map(sure => (
                <div key={sure.id}>
                  <div style={{ 
                    display: "flex", 
                    alignItems: "center", 
                    borderBottom: `1px solid ${theme.border}` 
                  }}>
                    <button
                      onClick={() => setAcikSure(acikSure === sure.id ? null : sure.id)}
                      style={{ 
                        padding: "10px 8px", 
                        color: theme.accent, 
                        display: "flex", 
                        alignItems: "center", 
                        flexShrink: 0, 
                        background: "none", 
                        border: "none", 
                        cursor: "pointer" 
                      }}
                    >
                      {acikSure === sure.id 
                        ? <ChevronDown size={Math.round((isMobile ? 18 : 21) * barUiOlcegi)} /> 
                        : <ChevronRight size={Math.round((isMobile ? 18 : 21) * barUiOlcegi)} />
                      }
                    </button>
                    <button
                      onClick={() => sureGit(sure.id)}
                      style={{ 
                        flex: 1, 
                        display: "flex", 
                        alignItems: "center", 
                        gap: "8px", 
                        padding: "10px 8px 10px 0", 
                        textAlign: "left", 
                        background: "none", 
                        border: "none", 
                        cursor: "pointer", 
                        color: theme.text 
                      }}
                    >
                      <span style={{ 
                        fontSize: `${Math.round((isMobile ? 11 : 12) * barUiOlcegi)}px`, 
                        color: theme.accent, 
                        minWidth: "20px" 
                      }}>
                        {sure.id}.
                      </span>
                      <span style={{ fontSize: `${Math.round((isMobile ? 11 : 12) * barUiOlcegi)}px` }}>
                        {sure.isim}
                      </span>
                      <span style={{ 
                        fontSize: `${Math.round((isMobile ? 7 : 9) * barUiOlcegi)}px`, 
                        color: theme.textSecondary, 
                        marginLeft: "auto", 
                        paddingRight: "8px" 
                      }}>
                        {sure.ayetSayisi} Âyet
                      </span>
                    </button>
                  </div>
                  {acikSure === sure.id && (
                    <div style={{ 
                      background: `${theme.accent}08`, 
                      borderBottom: `1px solid ${theme.border}` 
                    }}>
                      <div style={{ 
                        padding: "8px 12px", 
                        borderBottom: `1px solid ${theme.border}` 
                      }}>
                        <div style={{
                          display: "flex", 
                          alignItems: "center", 
                          gap: "6px",
                          background: theme.background, 
                          border: `1px solid ${theme.accent}30`,
                          borderRadius: "16px", 
                          padding: "4px 10px",
                        }}>
                          <Search size={Math.round((isMobile ? 18 : 21) * barUiOlcegi)} color={theme.accent} />
                          <input
                            type="number" 
                            min="1" 
                            max={sure.ayetSayisi}
                            placeholder={`1 - ${sure.ayetSayisi}`}
                            value={ayetArama[sure.id] || ""}
                            onChange={e => setAyetArama(prev => ({ ...prev, [sure.id]: e.target.value }))}
                            onKeyDown={e => {
                              if (e.key === "Enter") {
                                const no = parseInt(ayetArama[sure.id])
                                if (no >= 1 && no <= sure.ayetSayisi) sureGit(sure.id, no)
                              }
                            }}
                            style={{ 
                              flex: 1, 
                              background: "transparent", 
                              border: "none", 
                              outline: "none", 
                              fontSize: `${Math.round((isMobile ? 11 : 12) * barUiOlcegi)}px`, 
                              color: theme.text, 
                              width: "60px" 
                            }}
                          />
                          {ayetArama[sure.id] && (
                            <button
                              onClick={() => { 
                                const no = parseInt(ayetArama[sure.id]); 
                                if (no >= 1 && no <= sure.ayetSayisi) sureGit(sure.id, no) 
                              }}
                              style={{ 
                                fontSize: `${Math.round((isMobile ? 11 : 12) * barUiOlcegi)}px`, 
                                color: theme.accent, 
                                background: "none", 
                                border: "none", 
                                cursor: "pointer" 
                              }}
                            >
                              Git
                            </button>
                          )}
                        </div>
                      </div>
                      <div style={{ 
                        display: "flex", 
                        flexWrap: "wrap", 
                        gap: "4px", 
                        padding: "8px 12px", 
                        maxHeight: "200px", 
                        overflowY: "auto" 
                      }}>
                        {Array.from({ length: sure.ayetSayisi }, (_, i) => i + 1).map(no => (
                          <button
                            key={no}
                            onClick={() => sureGit(sure.id, no)}
                            style={{
                              width: "32px", 
                              height: "28px", 
                              fontSize: `${Math.round((isMobile ? 11 : 12) * barUiOlcegi)}px`,
                              color: theme.text, 
                              background: theme.background,
                              border: `1px solid ${theme.border}`, 
                              borderRadius: "4px", 
                              cursor: "pointer",
                            }}
                            onMouseEnter={e => { e.currentTarget.style.background = `${theme.accent}20` }}
                            onMouseLeave={e => { e.currentTarget.style.background = theme.background }}
                          >
                            {no}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </>
      )}
      

      {/* Ana içerik alanı */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0, overflowX: "hidden", overflowY: "visible", position: "relative" }}>
        {barKonum === "ust" && Bar}


        <PlayerBar
          player={player}
          sureler={sureler}
          theme={theme}
          barKonum={barKonum}
          barGorunur={barGorunur}
          barYuksekligi={barYuksekligi}
          playerBarYuksekligi={playerBarYuksekligi}
          barUiOlcegi={barUiOlcegi}
          onOlcum={setPlayerYuk}
          onOdaklan={() => {
            if (!player.aktifAyet) return
            const { sureNo, ayetNo, besmeleIcin } = player.aktifAyet
            // Besmele çalıyorsa (besmeleIcin=hedef sûre) → Fatiha 1'e değil, o sûrenin başına
            // (başlık + besmele componenti orada) git.
            if (besmeleIcin) { sureGit(besmeleIcin); return }
            // Akış modeli: sayfaya git + âyete hizala + odak (sureGit bunu yapıyor)
            sureGit(sureNo, ayetNo)
          }}
          onDonguAyar={acDonguAyar}
          tekrarAktif={!!tekrarModu}
        />
        {/* Akış modeli: tüm sayfalar normal belge akışında (SayfaBlok ile tembel içerik) */}
        <div
          ref={scrollRef}
          className="kuran-scroll-container" 
          style={{
            flex: 1,
            overflowY: "auto",
            overflowX: "hidden",
            overflowAnchor: "auto",   // DOĞAL scroll-anchoring AÇIK: üst sayfa mount olup büyüyünce
                                      // tarayıcı görünen konumu compositor'da tutar (momentum'u kesmez).
                                      // Manuel scrollTop telafisi kaldırıldı (fling'i durduruyordu).
            paddingTop: barKonum === "ust"
              ? `${barYuksekligi + (player.durum !== "kapali" ? playerBarYuksekligi : 0) + 8}px`
              : "16px",
            paddingBottom: barKonum === "alt" 
              ? `${barYuksekligi + (player.durum !== "kapali" ? playerBarYuksekligi : 0) + 8}px` 
              : "16px",
            scrollbarWidth: scrollbarGorunur ? "thin" : "none",
            msOverflowStyle: scrollbarGorunur ? "auto" : "none",
            transition: "scrollbar-width 0.3s ease",
            cursor: kayitKonumModu ? "crosshair" : "default",
            // Akış modeli: içerik hep görünür. İlk konumlandırma boyamadan ÖNCE (useLayoutEffect)
            // yapıldığından gizleme/spinner GEREKMEZ — sıçrama zaten görünmez.
          }}
          onClick={(e) => {
            if (kayitKonumModu) {
              const el = scrollRef.current
              if (!el) return
              // Tıklanan sayfayı ve o sayfadaki oranı bul (akış: sayfaRefs)
              let hedefNo = mevcutSayfa
              const cel = e.target?.closest?.("[data-index]")
              if (cel) { const n = parseInt(cel.getAttribute("data-index")); if (n) hedefNo = n }
              const node = sayfaRefs.current[hedefNo]
              if (!node) { setKayitKonumModu(false); return }
              const nRect = node.getBoundingClientRect()
              const oran = Math.max(0, Math.min(1, (e.clientY - nRect.top) / (node.offsetHeight || 1)))
              // kayitEkle mevcutSayfa'yı kullanır → önce onu ayarla, sonra ekle
              setMevcutSayfa(hedefNo)
              const yeniKayit = { id: Date.now().toString(), sayfa: hedefNo, scrollY: oran, baslik: `Sayfa ${hedefNo}`, olusturma: Date.now() }
              setKayitlar(prev => { const y = [...prev, yeniKayit]; localStorage.setItem("vukuf-kayitlar", JSON.stringify(y)); return y })
              setKayitKonumModu(false)
              return
            }
            if (window.innerWidth <= 768) return
            if (menuKapatildiRef.current) return
            if (popup || aaAcik || temaAcik || ozelTemaPanelAcik || menuAcikRef.current) return
            // Kelime / âyet no / sûre başı-play (etkileşimli öğe) tıklanınca bar durumu DEĞİŞMESİN
            if (e.target?.closest?.("button, [data-kelime], [data-sure], [data-ayet], [data-sure-baslik]")) return
            barToggle()
          }}
          onTouchStart={(e) => {
            dokunusBasladi()
            dokunuyorRef.current = true   // parmak ekranda → üst pencere büyütme YOK
            if (oturtRef.current) { cancelAnimationFrame(oturtRef.current); oturtRef.current = null }
            // Bekleyen "durdu mu" zinciri iptal + son konum geçersiz: yeni harekete BAYAT bir
            // eşleşmeyle "durdu" kararı vererek fling'i kesmesin.
            if (durakTimerRef.current) { clearTimeout(durakTimerRef.current); durakTimerRef.current = null }
            sonScrollTopRef.current = -1
            beklenenTopRef.current = -1

            // Touch başlangıç pozisyonunu kaydet
            const touch = e.touches[0]
            if (touch) {
              touchBaslangicRef.current = {
                x: touch.clientX,
                y: touch.clientY
              }
              sonTouchYRef.current = touch.clientY
            }
            touchHareketRef.current = false
          }}
          onTouchMove={(e) => {
            // Hareket varsa işaretle
            const touch = e.touches[0]
            if (touch && touchBaslangicRef.current) {
              const deltaX = Math.abs(touch.clientX - touchBaslangicRef.current.x)
              const deltaY = Math.abs(touch.clientY - touchBaslangicRef.current.y)

              // 10px'den fazla hareket varsa kaydırma olarak kabul et
              if (deltaX > 10 || deltaY > 10) {
                touchHareketRef.current = true
              }
              // Kaydırma YÖNÜ = PARMAK yönü (programlı scroll düzeltmesi yönü kirletmesin).
              // Parmak AŞAĞI (y artar) → içerik YUKARI kayar → "up".
              const y = touch.clientY
              if (y > sonTouchYRef.current + 2) scrollYonRef.current = "up"
              else if (y < sonTouchYRef.current - 2) scrollYonRef.current = "down"
              sonTouchYRef.current = y
            }
          }}
          onTouchEnd={(e) => {
            dokunusBitti()
            dokunuyorRef.current = false   // parmak kalktı → bundan sonrası MOMENTUM: üstte mount YOK
            if (barKilitli) return
            // Eğer popup veya panel açık ise işlemi engelle
            if (popup || aaAcik || temaAcik || ozelTemaPanelAcik || menuAcikRef.current) {
              return
            }
            
            // Eğer hareket varsa (kaydırma), toggle yapma
            if (touchHareketRef.current) {
              return
            }
            // Kelime / âyet no / sûre başı-play (etkileşimli öğe) tıklanınca bar durumu DEĞİŞMESİN
            if (e.target?.closest?.("button, [data-kelime], [data-sure], [data-ayet], [data-sure-baslik]")) {
              return
            }
            // Tıklama ise bar'ı toggle et
            barToggle()
          }}
          onTouchCancel={() => { dokunuyorRef.current = false }}
          onScroll={() => {
            // Scroll'un bar'ı etkilemesini engelle
          }}
        >
          {/* Scrollbar için CSS - WebKit tarayıcılar için */}
          <style>{`
            .kuran-scroll-container::-webkit-scrollbar {
              width: ${scrollbarGorunur ? '6px' : '0px'};
              transition: width 0.3s ease;
            }
            .kuran-scroll-container::-webkit-scrollbar-track {
              background: transparent;
            }
            .kuran-scroll-container::-webkit-scrollbar-thumb {
              background: ${theme.accent}70;
              border-radius: 10px;
              min-height: 40px;
            }
            .kuran-scroll-container::-webkit-scrollbar-thumb:hover {
              background: ${theme.accent}90;
            }
            .kuran-scroll-container {
              scrollbar-width: ${scrollbarGorunur ? 'thin' : 'none'};
              scrollbar-color: ${theme.accent}70 transparent;
            }
          `}</style>
          
          <div
            style={{
              position: "relative",
              maxWidth: tamGenislik ? "100%"
                : kenarBosluk ? (isMobile ? "90%" : "62%")
                : `${Math.round((isMobile ? 480 : 720) * (yaziBoyutu / 20))}px`,
              width: "100%",
              margin: "0 auto",
              padding: tamGenislik ? (isMobile ? "4px 4px" : "6px 8px") : (isMobile ? "4px 12px" : "6px 24px"),
              boxSizing: "border-box",
            }}
          >
            {sayfaListesi.map((sayfa, i) => (
              <div
                key={sayfa.sayfaNo}
                ref={el => { if (el) sayfaRefs.current[sayfa.sayfaNo] = el }}
                data-index={sayfa.sayfaNo}
                style={{ position: "relative" }}
              >
                <SayfaBlok
                  minHeight={sayfaYukseklikleri[i] || (isMobile ? 500 : 700)}
                  margin={isMobile ? "4500px 0px" : "3500px 0px"}
                  gorunur0={i < 3}
                  zorla={gosterSetRef.current.has(sayfa.sayfaNo)}
                  scrollRef={scrollRef}
                  cocuk={
                    <MushafSayfa
                      sayfaNo={sayfa.sayfaNo}
                      elemanlar={sayfa.elemanlar}
                      sureler={mushafData}
                      theme={theme}
                      arapcaFont={aktifArapcaFont.style}
                      yaziBoyutu={yaziBoyutu}
                      satirAraligi={satirAraligi}
                      harfAraligi={harfAraligi}
                      player={player}
                      odakAyet={odakAyet}
                      odakSure={odakSure}
                      odakAyrac={odakAyrac}
                      aktifAyet={player.aktifAyet}
                      cuzBaslangic={sayfaCuzBaslangic[sayfa.sayfaNo] ?? null}
                      hizbBaslangic={sayfaHizbBaslangic[sayfa.sayfaNo] ?? null}
                      onKelimeTikla={kelimeTikla}
                      onAyetTikla={ayetTikla}
                      onSureTikla={(sure, e) => {
                        if (kayitKonumModu) return
                        sureTikla(sure, e)
                      }}
                      kayitKonumModu={kayitKonumModu}
                      sayfaKayitlari={kayitlar.filter(k => k.sayfa === sayfa.sayfaNo)}
                      onKayitTikla={(kayit) => {
                        if (window.confirm(`"${kayit.baslik}" kaydını silmek istiyor musun?`)) {
                          const yeni = kayitlar.filter(k => k.id !== kayit.id)
                          setKayitlar(yeni)
                          localStorage.setItem("vukuf-kayitlar", JSON.stringify(yeni))
                        }
                      }}
                      onYukseklikOlcum={NOOP_OLCUM}
                    />
                  }
                />
              </div>
            ))}
          </div>
        </div>

        {/* ── BUTON SIRALAMASI PANELİ: sürükle-bırak + sol/sağ yaslama + canlı önizleme ── */}
        {siraAcik && (
          <div
            onClick={() => setSiraAcik(false)}
            style={{
              position: "fixed", inset: 0, zIndex: 400, background: "rgba(0,0,0,0.45)",
              display: "flex", alignItems: "center", justifyContent: "center", padding: "16px",
            }}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              style={{
                width: "100%", maxWidth: isMobile ? "340px" : "410px",
                maxHeight: "84vh", display: "flex", flexDirection: "column",
                background: theme.background, border: `1px solid ${theme.border}`,
                borderRadius: "14px", boxShadow: "0 12px 40px rgba(0,0,0,0.35)", overflow: "hidden",
              }}
            >
              <div style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                padding: "12px 14px", borderBottom: `1px solid ${theme.border}`,
              }}>
                <span style={{ display: "flex", alignItems: "center", gap: "7px", color: theme.text, fontSize: isMobile ? "14px" : "15px", fontWeight: 600 }}>
                  <GripVertical size={16} color={theme.accent} /> Buton Sıralaması
                </span>
                <button onClick={() => setSiraAcik(false)} style={{
                  background: "transparent", border: "none", color: theme.textSecondary,
                  cursor: "pointer", padding: "4px", display: "flex",
                }} aria-label="Kapat"><X size={17} /></button>
              </div>

              {/* Canlı önizleme — taslak sıra + sol/sağ yaslama; kapalı butonlar soluk */}
              <div style={{ padding: "10px 14px 8px", borderBottom: `1px solid ${theme.border}` }}>
                <div style={{ fontSize: "10px", letterSpacing: "1px", textTransform: "uppercase", color: theme.textSecondary, opacity: 0.7, marginBottom: "6px" }}>Önizleme</div>
                <div style={{
                  display: "flex", alignItems: "center", gap: "6px",
                  padding: "7px 8px", borderRadius: "9px",
                  background: `${theme.accent}0d`, border: `1px solid ${theme.border}`,
                }}>
                  <ArrowLeft size={15} color={theme.textSecondary} style={{ opacity: 0.5 }} />
                  {["sol", "sag"].map(taraf => (
                    <span key={taraf} style={{
                      display: "flex", alignItems: "center", gap: "6px",
                      ...(taraf === "sag" ? { marginLeft: "auto" } : {}),
                    }}>
                      {siraTaslak.filter(k => (tarafTaslak[k] || "sol") === taraf).map(k => {
                        const o = SIRA_BILGI[k]; if (!o) return null
                        const I = o.Ikon
                        return <I key={k} size={15} color={theme.accent} style={{ opacity: butonAcikMi(k) ? 1 : 0.22 }} />
                      })}
                    </span>
                  ))}
                  <Settings size={15} color={theme.textSecondary} style={{ opacity: 0.5 }} />
                </div>
                <div style={{ fontSize: "10px", color: theme.textSecondary, opacity: 0.65, marginTop: "5px" }}>
                  Soluk simgeler kapalı butonlardır.
                </div>
              </div>

              {/* Sürüklenebilir liste */}
              <div data-panel-surukle="1" style={{ overflowY: "auto", overscrollBehavior: "contain", padding: "10px 14px", flex: 1 }}>
                <DndContext
                  sensors={siraSensors}
                  collisionDetection={closestCenter}
                  onDragEnd={({ active, over }) => {
                    if (over && active.id !== over.id) {
                      setSiraTaslak(prev => arrayMove(prev, prev.indexOf(active.id), prev.indexOf(over.id)))
                    }
                  }}
                >
                  <SortableContext items={siraTaslak} strategy={verticalListSortingStrategy}>
                    {siraTaslak.map(k => (
                      <SiraSatiri
                        key={k}
                        k={k}
                        taraf={tarafTaslak[k] || "sol"}
                        onTaraf={(key, deger) => setTarafTaslak(prev => ({ ...prev, [key]: deger }))}
                        theme={theme}
                        isMobile={isMobile}
                      />
                    ))}
                  </SortableContext>
                </DndContext>
              </div>

              {/* Sıfırla (çift onay) / Kaydet */}
              <div style={{ padding: "10px 14px", borderTop: `1px solid ${theme.border}`, display: "flex", gap: "8px" }}>
                <button
                  onClick={() => {
                    if (!sifirlaOnay) { setSifirlaOnay(true); return }
                    setSiraTaslak(VARSAYILAN_SIRA); setTarafTaslak(VARSAYILAN_TARAF); setSifirlaOnay(false)
                  }}
                  style={{
                    flex: 1, padding: "10px 8px", borderRadius: "9px", cursor: "pointer",
                    border: `1px solid ${sifirlaOnay ? "#c0392b" : theme.border}`,
                    background: sifirlaOnay ? "#c0392b12" : "transparent",
                    color: sifirlaOnay ? "#c0392b" : theme.textSecondary,
                    fontSize: isMobile ? "12px" : "13px", fontWeight: 600,
                    display: "flex", alignItems: "center", justifyContent: "center", gap: "5px",
                  }}
                >
                  <RotateCcw size={14} />
                  {sifirlaOnay ? "Emin misin?" : "Sıfırla"}
                </button>
                <button
                  onClick={siraKaydet}
                  style={{
                    flex: 1, padding: "10px 8px", borderRadius: "9px", border: "none",
                    background: theme.accent, color: "#fff", cursor: "pointer",
                    fontSize: isMobile ? "12px" : "13px", fontWeight: 600,
                    display: "flex", alignItems: "center", justifyContent: "center", gap: "5px",
                  }}
                >
                  <Save size={14} /> Kaydet
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── BİLGİ PANELİ: vakıf (durak) işaretleri + tecvid/kıraat simgeleri ──
            Kapanış: Tamam · çarpı · panel dışına tıklama. */}
        {bilgiAcik && (
          <div
            onClick={() => setBilgiAcik(false)}
            style={{
              position: "fixed", inset: 0, zIndex: 400,
              background: "rgba(0,0,0,0.45)",
              display: "flex", alignItems: "center", justifyContent: "center",
              padding: "16px",
              animation: "vukufBilgiFade 0.18s ease",
            }}
          >
            <style>{`@keyframes vukufBilgiFade{from{opacity:0}to{opacity:1}}`}</style>
            <div
              className="vukuf-panel"
              onClick={(e) => e.stopPropagation()}
              style={{
                width: "100%", maxWidth: isMobile ? "340px" : "420px",
                maxHeight: "78vh", display: "flex", flexDirection: "column",
                background: theme.background,
                border: `1px solid ${theme.border}`,
                borderRadius: "14px",
                boxShadow: "0 12px 40px rgba(0,0,0,0.35)",
                overflow: "hidden",
              }}
            >
              {/* Başlık */}
              <div style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                padding: "12px 14px", borderBottom: `1px solid ${theme.border}`,
              }}>
                <span style={{ display: "flex", alignItems: "center", gap: "7px", color: theme.text, fontSize: isMobile ? "14px" : "15px", fontWeight: 600 }}>
                  <Gem size={16} color={theme.accent} /> İşaretler ve Tecvid
                </span>
                <button onClick={() => setBilgiAcik(false)} style={{
                  background: "transparent", border: "none", color: theme.textSecondary,
                  cursor: "pointer", padding: "4px", display: "flex", alignItems: "center",
                }} aria-label="Kapat"><X size={17} /></button>
              </div>

              {/* İçerik */}
              <div style={{ overflowY: "auto", padding: "12px 14px", flex: 1 }}>
                {BILGI_BOLUMLERI.map(bolum => (
                  <div key={bolum.baslik} style={{ marginBottom: "14px" }}>
                    <div style={{
                      fontSize: isMobile ? "10px" : "11px", letterSpacing: "1px",
                      textTransform: "uppercase", color: theme.textSecondary,
                      opacity: 0.75, marginBottom: "7px",
                    }}>{bolum.baslik}</div>
                    {bolum.satirlar.map(s => (
                      <div key={s.ad} style={{
                        display: "flex", alignItems: "center", gap: "10px",
                        padding: "6px 0", borderBottom: `1px solid ${theme.border}22`,
                      }}>
                        <span style={{
                          minWidth: "30px", textAlign: "center", flexShrink: 0,
                          fontFamily: "'Scheherazade New', serif",
                          fontSize: isMobile ? "17px" : "19px", fontWeight: 700,
                          color: s.renk, lineHeight: 1.25,
                          display: "inline-flex", flexDirection: "column",
                          alignItems: "center", gap: "2px",
                        }}>
                          {s.secde ? (
                            /* Mushaftaki secde rozetinin aynısı (bkz. SecdeKenar) */
                            <>
                              <svg width="17" height="17" viewBox="0 0 24 24">
                                <path
                                  d="M12 2 L14.5 8.5 L21.5 8.5 L16 13 L18.5 20 L12 16 L5.5 20 L8 13 L2.5 8.5 L9.5 8.5 Z"
                                  fill="none" stroke="#2e7d4f" strokeWidth="1.5" strokeLinejoin="round"
                                />
                                <circle cx="12" cy="11" r="2.5" fill="#2e7d4f" />
                              </svg>
                              <span style={{ fontSize: "8px", color: "#2e7d4f", lineHeight: 1, fontFamily: aktifArapcaFont.style }}>سَجْدَة</span>
                            </>
                          ) : s.cuz ? (
                            /* Sayfa içindeki cüz işaretinin aynısı: "الجزء" + rakam yeri BOŞ
                               (gerçek sayfada burada cüz numarası çıkar). */
                            <span style={{
                              display: "inline-flex", alignItems: "center", gap: "3px",
                              fontFamily: aktifArapcaFont.style, direction: "rtl", whiteSpace: "nowrap",
                            }}>
                              <span style={{ color: theme.accent, fontSize: isMobile ? "15px" : "17px", lineHeight: 1.1 }}>الجزء</span>
                              <span style={{
                                display: "inline-block", width: "12px", height: "12px",
                                border: `1.5px dashed ${theme.ayetNoRengi || theme.accent}`,
                                borderRadius: "3px",
                              }} />
                            </span>
                          ) : s.sembol}
                        </span>
                        <span style={{ flex: 1, minWidth: 0 }}>
                          <span style={{ display: "block", color: theme.text, fontSize: isMobile ? "12px" : "13px", fontWeight: 600 }}>{s.ad}</span>
                          <span style={{ display: "block", color: theme.textSecondary, fontSize: isMobile ? "11px" : "12px", lineHeight: 1.4 }}>{s.aciklama}</span>
                          {s.ornek && (
                            <span style={{ display: "block", color: theme.accent, fontSize: isMobile ? "10px" : "11px", marginTop: "2px", opacity: 0.9 }}>
                              Örnek Âyet: {s.ornek}
                            </span>
                          )}
                        </span>
                      </div>
                    ))}
                  </div>
                ))}
              </div>

              {/* Tamam */}
              <div style={{ padding: "10px 14px", borderTop: `1px solid ${theme.border}` }}>
                <button onClick={() => setBilgiAcik(false)} style={{
                  width: "100%", padding: "10px", borderRadius: "9px",
                  border: "none", background: theme.accent, color: "#fff",
                  fontSize: isMobile ? "13px" : "14px", fontWeight: 600, cursor: "pointer",
                }}>Tamam</button>
              </div>
            </div>
          </div>
        )}

        {barKonum === "alt" && Bar}

        {donusTip && (
          <div style={{
            position: "fixed", right: "14px", zIndex: 120,
            [barKonum === "alt" ? "bottom" : "top"]: "58px",
            display: "flex", alignItems: "center", gap: "6px",
            background: theme.accent, color: "#fff", borderRadius: "22px",
            padding: "8px 8px 8px 14px", boxShadow: "0 4px 16px rgba(0,0,0,0.25)",
          }}>
            <button onClick={() => {
                if (donusTip === "okuma") { navigate(donusYol || "/"); return }
                try { localStorage.setItem(`vukuf-${donusTip}-devam`, "1") } catch {}
                navigate(donusTip === "tefeul" ? "/okuma-tefeul" : "/arama")
              }} style={{ display: "flex", alignItems: "center", gap: "6px", background: "none", border: "none", color: "#fff", cursor: "pointer", fontSize: "13px", fontFamily: "inherit" }}>
              {donusTip === "okuma" ? <BookOpen size={15} /> : donusTip === "tefeul" ? <Shuffle size={15} /> : <Search size={15} />}
              {donusTip === "okuma" ? "Okumaya dön" : donusTip === "tefeul" ? "Tefeüle dön" : "Aramaya dön"}
            </button>
            <button onClick={() => setDonusTip("")} title="Kapat" style={{ display: "flex", background: "rgba(255,255,255,0.25)", border: "none", color: "#fff", cursor: "pointer", borderRadius: "50%", padding: "3px" }}>
              <X size={13} />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}