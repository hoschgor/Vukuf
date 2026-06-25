// ════════════════════════════════════════════════════════════════
// KuranOkuma.jsx — Tam Dosya (Virtualizer ile)
// Konum: src/pages/KuranOkuma.jsx
// ════════════════════════════════════════════════════════════════

import { useState, useEffect, useRef, useCallback, useMemo } from "react"
import { useNavigate } from "react-router-dom"
import { useApp } from "../AppContext"
import { useVirtualizer } from "@tanstack/react-virtual"
import arapcaLugat from "../data/arapca-lugat.json"
import ayetMeal from "../data/ayet-meal.json"
import sayfaHaritaJson from "../data/sayfa-harita.json"
import SureBasligi from "../components/SureBasligi"
import Besmele from "../components/Besmele"
import MushafSayfa from "../components/MushafSayfa"
import PlayerBar from "../components/PlayerBar"
import KariSecici from "../components/KariSecici"
import KelimePopup from "../components/KelimePopup"
import AyetPopup from "../components/AyetPopup"
import { useMushaf, sureBaslangicSayfasi, ayetSayfasi } from "../data/hooks/useMushaf"
import useAudioPlayer from "../data/hooks/useAudioPlayer"
import { useMediaQuery } from "../data/hooks/useMediaQuery"
import {
  ArrowLeft, Search, X, ChevronRight, ChevronDown, Menu,
  Play, Pause, Plus, Minus, Type, Palette,
  Settings, Circle, Clock, ChevronsUp, ChevronsDown,
  Pencil, ChevronLeft,
} from "lucide-react"

// ── Arapça font listesi
const ARAPCA_FONTLAR = [
  { id: "kfgqpc",       label: "KFGQPC Uthmanic (Mushaf)", style: "'KFGQPC Uthmanic', serif",        google: null },
  { id: "osman-taha",   label: "Osman Taha (Mushaf)",       style: "'Osman Taha', serif",              google: null },
  { id: "amiri",        label: "Amiri",                     style: "'Amiri', serif",                   google: "Amiri:ital,wght@0,400;0,700;1,400" },
  { id: "scheherazade", label: "Scheherazade New",          style: "'Scheherazade New', serif",        google: "Scheherazade+New:wght@400;700" },
  { id: "noto-arabic",  label: "Noto Sans Arabic",          style: "'Noto Sans Arabic', sans-serif",   google: "Noto+Sans+Arabic:wght@400;600" },
  { id: "reem-kufi",    label: "Reem Kufi",                 style: "'Reem Kufi', sans-serif",          google: "Reem+Kufi:wght@400;600" },
  { id: "hasenat",      label: "Hasenat",                   style: "'Hasenat', serif",                 google: null },
]

// ── Özel tema sabitleri
const PALET_ALANLARI = [
  { key: "background",   label: "Ana Arka Plan" },
  { key: "surface",      label: "Yüzey Rengi" },
  { key: "text",         label: "Yazı Rengi" },
  { key: "textSecondary",label: "İkincil Yazı" },
  { key: "accent",       label: "Vurgu Rengi" },
  { key: "border",       label: "Kenarlık Rengi" },
  { key: "lugatHighlight",label: "Lügat Vurgu" },
]

const HAZIR_RENKLER = [
  "#f4ecd8", "#ffffff", "#1a1a2e", "#0d0d0d",
  "#8b5e3c", "#c41e3a", "#2e8b57", "#4a90e2", "#9b59b6", "#e67e22",
  "#3a3a3a", "#666666", "#999999", "#cccccc",
]

// ── Yardımcı fonksiyonlar
function harekeSil(k) {
  return k.replace(/[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06DC\u06DF-\u06E4\u06E7\u06E8\u06EA-\u06ED\u06E1\u0671]/g, "")
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

// ── Lugat arama (hareke temizlenmiş kelimeyle)
function lugat(kelimeHam) {
  const temiz = harekeSil(kelimeHam).trim()
  return arapcaLugat[temiz] || null
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
  const scrollRef = useRef(null)
  const barZamanRef  = useRef(null)
  const sureSayacRef = useRef(null)

  // ── Ses sistemi
  const player = useAudioPlayer()

  // ── Veri
  const [mushafData, setMushafData] = useState([])
  const [yukleniyor, setYukleniyor] = useState(true)

  // ── Popup: kelime veya ayet
  const [popup, setPopup] = useState(null)

  // ── Sayfa navigasyonu
  const [mevcutSayfa, setMevcutSayfa] = useState(() =>
    parseInt(localStorage.getItem("vukuf-son-sayfa") || "1")
  )
  const [sayfaGirdi, setSayfaGirdi] = useState("")
  const [sayfaGirdiAcik, setSayfaGirdiAcik] = useState(false)

  // ── Yazı boyutu
  const [yaziBoyutu, setYaziBoyutu] = useState(() =>
    parseInt(localStorage.getItem("vukuf-yazi-boyutu") || "20")
  )
  const [satirAraligi, setSatirAraligi] = useState(() =>
  parseFloat(localStorage.getItem("vukuf-satir-araligi") || "2.4")
)
const [harfAraligi, setHarfAraligi] = useState(() =>
  parseFloat(localStorage.getItem("vukuf-harf-araligi") || "0")
)

  // ── Bar
  const [barGorunur, setBarGorunur]       = useState(true)
  const [barKonum, setBarKonum]           = useState(() => localStorage.getItem("vukuf-bar-konum") || "alt")
  const [sadeMode, setSadeMode]           = useState(() => localStorage.getItem("vukuf-sade-mod") === "true")
  const [otomatikGizleme, setOtomatikGizleme] = useState(() => localStorage.getItem("vukuf-otomatik-gizleme") !== "false")
  const [gizlemeSuresi, setGizlemeSuresi] = useState(() => parseInt(localStorage.getItem("vukuf-gizleme-suresi") || "5"))
  const [sureGoster, setSureGoster]       = useState(true)

  // ── Paneller
  const [aaAcik, setAaAcik]                     = useState(false)
  const [temaAcik, setTemaAcik]                 = useState(false)
  const [ayarlarAcik, setAyarlarAcik]           = useState(false)
  const [ozelTemaPanelAcik, setOzelTemaPanelAcik] = useState(false)
  const [fontSeciciAcik, setFontSeciciAcik]     = useState(false)
  

  // ── Özel tema
  const [ozelRenkler, setOzelRenkler] = useState(() => {
    const k = localStorage.getItem("vukuf-ozel-tema")
    return k ? JSON.parse(k) : {
      background: "#f5f0e8", surface: "#ffffff", text: "#2c2418",
      textSecondary: "#6b5b4e", accent: "#8b5e3c",
      border: "#d4c5b0", lugatHighlight: "#c41e3a",
    }
  })
  const [aktifRenk, setAktifRenk] = useState(null)

  // ── Arapça font
  const [arapcaFontId, setArapcaFontId] = useState(() =>
    localStorage.getItem("vukuf-kuran-arapca-font") || "scheherazade"
  )
  const aktifArapcaFont = ARAPCA_FONTLAR.find(f => f.id === arapcaFontId) || ARAPCA_FONTLAR[3]

  // ── Okuma süresi
  const [bugunSure, setBugunSure] = useState(() =>
    parseInt(localStorage.getItem(bugunAnahtari()) || "0")
  )

  // ── Sure menüsü
  const [menuAcik, setMenuAcik]   = useState(false)
  const [menuArama, setMenuArama] = useState("")
  const [acikSure, setAcikSure]   = useState(null)
  const [ayetArama, setAyetArama] = useState({})

  // ════════════════════════════════════════════════════════════════
  // EFFECT'LER
  // ════════════════════════════════════════════════════════════════

  useEffect(() => { localStorage.setItem("vukuf-yazi-boyutu",       String(yaziBoyutu))     }, [yaziBoyutu])
  useEffect(() => { localStorage.setItem("vukuf-bar-konum",         barKonum)               }, [barKonum])
  useEffect(() => { localStorage.setItem("vukuf-sade-mod",          String(sadeMode))       }, [sadeMode])
  useEffect(() => { localStorage.setItem("vukuf-otomatik-gizleme",  String(otomatikGizleme))}, [otomatikGizleme])
  useEffect(() => { localStorage.setItem("vukuf-gizleme-suresi",    String(gizlemeSuresi))  }, [gizlemeSuresi])
  useEffect(() => { localStorage.setItem("vukuf-son-sayfa",         String(mevcutSayfa))    }, [mevcutSayfa])
  useEffect(() => { localStorage.setItem("vukuf-satir-araligi", String(satirAraligi)) }, [satirAraligi])
  useEffect(() => { localStorage.setItem("vukuf-harf-araligi", String(harfAraligi)) }, [harfAraligi])

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
    if (font?.google) {
      const linkId = `kuran-font-${arapcaFontId}`
      if (!document.getElementById(linkId)) {
        const link = document.createElement("link")
        link.id   = linkId
        link.rel  = "stylesheet"
        link.href = `https://fonts.googleapis.com/css2?family=${font.google}&display=swap`
        document.head.appendChild(link)
      }
    }
    localStorage.setItem("vukuf-kuran-arapca-font", arapcaFontId)
  }, [arapcaFontId])

  const barGoster = useCallback(() => {
    setBarGorunur(true)
    if (barZamanRef.current) clearTimeout(barZamanRef.current)
    if (otomatikGizleme) {
      barZamanRef.current = setTimeout(() => setBarGorunur(false), gizlemeSuresi * 1000)
    }
  }, [otomatikGizleme, gizlemeSuresi])

  useEffect(() => { barGoster() }, [])

  useEffect(() => {
    fetch("/kuran-mushaf.json")
      .then(r => r.json())
      .then(data => { setMushafData(data); setYukleniyor(false) })
      .catch(() => setYukleniyor(false))
  }, [])

  const barGizle = useCallback(() => {
  if (barZamanRef.current) clearTimeout(barZamanRef.current)
  setBarGorunur(false)
}, [])

  // ════════════════════════════════════════════════════════════════
  // VERİ HAZIRLAMA
  // ════════════════════════════════════════════════════════════════

  const { sayfaMap, sureler, toplamSayfa } = useMushaf(mushafData, sayfaHaritaJson)

  const filtreliSureler = useMemo(() => {
    if (!menuArama) return sureler
    return sureler.filter(s =>
      s.isim.toLowerCase().includes(menuArama.toLowerCase()) ||
      String(s.id).includes(menuArama)
    )
  }, [sureler, menuArama])

  // ════════════════════════════════════════════════════════════════
  // ════════════════════════════════════════════════════════════════
  // Virtualizer Kısmı
  // ════════════════════════════════════════════════════════════════

  // ════════════════════════════════════════════════════════════════
  // Virtualizer Kısmı (DÜZELTİLMİŞ)
  // ════════════════════════════════════════════════════════════════

  // ── SAYFA LİSTESİ ──
  const sayfaListesi = useMemo(() => {
    if (!sayfaMap || sayfaMap.size === 0) {
      console.warn('⚠️ sayfaMap boş!')
      return []
    }
    
    const sayfaNolari = Array.from(sayfaMap.keys()).sort((a, b) => a - b)
    console.log('📄 Sayfa listesi:', sayfaNolari.length, 'sayfa')
    
    return sayfaNolari.map(sayfaNo => ({
      tip: "sayfa",
      sayfaNo,
      elemanlar: sayfaMap.get(sayfaNo) || [],
    }))
  }, [sayfaMap])

  // ── SAYFA YÜKSEKLİKLERİ (Dinamik) ──
  const sayfaYukseklikleri = useMemo(() => {
    if (!sayfaListesi.length) {
      console.warn('⚠️ sayfaListesi boş, yükseklik hesaplanamıyor')
      return []
    }
    
    // ⬇️ useMediaQuery'den gelen isMobile'i kullan
    const mobile = isMobile
    
    return sayfaListesi.map((sayfa) => {
      const elemanlar = sayfa.elemanlar
      
      const kelimeSayisi = elemanlar.filter(el => el.tip === "kelime").length
      const ayetSayisi = elemanlar.filter(el => el.tip === "ayet-sonu").length
      const baslikVar = elemanlar.some(el => el.tip === "sure-baslik")
      const besmeleVar = elemanlar.some(el => el.tip === "besmele")
      
      const fontBoyutu = mobile ? yaziBoyutu : yaziBoyutu + 2
      const lineHeight = mobile ? 2.2 : 2.0
      
      const satirYuksekligi = fontBoyutu * lineHeight
      const kelimeSatirSayisi = Math.ceil(kelimeSayisi / (mobile ? 14 : 18))
      const kelimeYuksekligi = kelimeSatirSayisi * satirYuksekligi
      const ayetYuksekligi = ayetSayisi * (mobile ? 22 : 25)
      const baslikYuksekligi = baslikVar ? (mobile ? 60 : 90) : 0
      const besmeleYuksekligi = besmeleVar ? (mobile ? 35 : 50) : 0
      
      const padding = mobile ? 30 : 50
      const between = mobile ? 4 : 8
      
      let toplam = padding + between + baslikYuksekligi + besmeleYuksekligi + kelimeYuksekligi + ayetYuksekligi
      
      return Math.max(toplam, mobile ? 150 : 220)
    })
  }, [sayfaListesi, yaziBoyutu, isMobile])  // ⬇️ isMobile eklendi

  // ── VIRTUALIZER ──
  const virtualizer = useVirtualizer({
    count: sayfaListesi.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: (index) => {
      const height = sayfaYukseklikleri[index] || (isMobile ? 400 : 600)
      return height
    },
    overscan: 5,
  })

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
    if (n >= 1 && n <= toplamSayfa) {
      setMevcutSayfa(n)
      // Virtualizer'ı o sayfaya kaydır
      const index = sayfaListesi.findIndex(s => s.sayfaNo === n)
      if (index !== -1) {
        virtualizer.scrollToIndex(index, { align: "start" })
      }
      setPopup(null)
    }
  }

  function sureGit(sureId, ayetNo) {
    const sayfa = ayetNo
      ? ayetSayfasi(sureId, ayetNo, sayfaMap)
      : sureBaslangicSayfasi(sureId, sayfaMap)
    setMevcutSayfa(sayfa)
    // Virtualizer'ı o sayfaya kaydır
    const index = sayfaListesi.findIndex(s => s.sayfaNo === sayfa)
    if (index !== -1) {
      virtualizer.scrollToIndex(index, { align: "start" })
    }
    setMenuAcik(false)
    setMenuArama("")
    setAcikSure(null)
    setAyetArama({})
    setPopup(null)
  }

  // ════════════════════════════════════════════════════════════════
  // POPUP YÖNETİMİ
  // ════════════════════════════════════════════════════════════════

  const kelimeTikla = useCallback((kelime, sure, ayet, e) => {
    const lugatSonuc = lugat(kelime.arabic)
    setPopup({
      tip: "kelime",
      kelime: {
        ham:     kelime.arabic,
        okunus:  lugatSonuc?.okunuş || "",
        anlamlar: lugatSonuc?.anlamlar || [],
      },
      sureNo: sure.id,
      ayetNo: ayet.no,
      konum:  popupKonum(e),
    })
  }, [])

  const ayetTikla = useCallback((sure, ayetNo, e) => {
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
    [barKonum === "alt" ? "bottom" : "top"]: "56px",
    ...(konum === "right"
      ? { right: "12px" }
      : konum === "left"
      ? { left: "12px" }
      : { left: "50%", transform: "translateX(-50%)" }),
    background: theme.surface,
    border: `1px solid ${theme.border}`,
    borderRadius: "12px",
    padding: "16px",
    zIndex: 200,
    boxShadow: "0 8px 24px rgba(0,0,0,0.15)",
  })

  const barButonStil = (aktif = false) => ({
    display: "flex", alignItems: "center", gap: "4px",
    padding: "6px 8px", borderRadius: "8px", fontSize: "12px",
    background: aktif ? `${theme.accent}20` : "transparent",
    color: aktif ? theme.accent : theme.textSecondary,
    border: "none", cursor: "pointer", transition: "all 0.15s",
  })

  // ════════════════════════════════════════════════════════════════
  // AA PANELİ
  // ════════════════════════════════════════════════════════════════
  // KuranOkuma.jsx içindeki AaPanel'i bu ile değiştir
// fontSeciciAcik state'i artık gerekmiyor, kaldırılabilir

  const AaPanel = aaAcik && (
    <>
      <div onClick={() => setAaAcik(false)} style={{ position: "fixed", inset: 0, zIndex: 195 }} />
      <div style={{ ...panelStil("center"), width: "300px", maxHeight: "80vh", overflowY: "auto", zIndex: 200 }}>

        {/* ── Yazı boyutu ── */}
        <div style={{ fontSize: "11px", color: theme.textSecondary, marginBottom: "8px", letterSpacing: "1px" }}>YAZI BOYUTU</div>
        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "20px" }}>
          <button onClick={() => setYaziBoyutu(v => Math.max(14, v - 1))} style={barButonStil()}>
            <Minus size={14} />
          </button>
          <div style={{ flex: 1, textAlign: "center" }}>
            <span style={{ fontSize: `${Math.min(yaziBoyutu, 28)}px`, color: theme.text, fontFamily: aktifArapcaFont.style }}>ب</span>
            <span style={{ fontSize: "11px", color: theme.textSecondary, marginLeft: "6px" }}>{yaziBoyutu}px</span>
          </div>
          <button onClick={() => setYaziBoyutu(v => Math.min(36, v + 1))} style={barButonStil()}>
            <Plus size={14} />
          </button>
        </div>

        {/* ── Satır aralığı ── */}
        <div style={{ fontSize: "11px", color: theme.textSecondary, marginBottom: "8px", letterSpacing: "1px" }}>SATIR ARALIĞI</div>
        <div style={{ marginBottom: "20px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", color: theme.textSecondary, marginBottom: "6px" }}>
            <span>Sıkışık</span>
            <span style={{ color: theme.accent, fontWeight: "bold" }}>{satirAraligi.toFixed(1)}</span>
            <span>Geniş</span>
          </div>
          <input
            type="range" min="1.6" max="3.5" step="0.1"
            value={satirAraligi}
            onChange={e => setSatirAraligi(parseFloat(e.target.value))}
            style={{ width: "100%", accentColor: theme.accent }}
          />
          {/* Önizleme */}
          <div style={{
            marginTop: "8px", padding: "8px 12px", borderRadius: "8px",
            background: theme.background, border: `1px solid ${theme.border}`,
            direction: "rtl", textAlign: "center",
            fontFamily: aktifArapcaFont.style,
            fontSize: `${Math.min(yaziBoyutu, 22)}px`,
            lineHeight: satirAraligi,
            color: theme.text,
          }}>
            بِسۡمِ ٱللَّهِ ٱلرَّحۡمَٰنِ ٱلرَّحِيمِ
          </div>
        </div>

        {/* ── Harf aralığı ── */}
        <div style={{ fontSize: "11px", color: theme.textSecondary, marginBottom: "8px", letterSpacing: "1px" }}>HARF ARALIĞI</div>
        <div style={{ marginBottom: "20px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", color: theme.textSecondary, marginBottom: "6px" }}>
            <span>Normal</span>
            <span style={{ color: theme.accent, fontWeight: "bold" }}>{harfAraligi.toFixed(1)}px</span>
            <span>Geniş</span>
          </div>
          <input
            type="range" min="0" max="6" step="0.5"
            value={harfAraligi}
            onChange={e => setHarfAraligi(parseFloat(e.target.value))}
            style={{ width: "100%", accentColor: theme.accent }}
          />
        </div>

        {/* ── Yazı tipi — kari menüsü tarzı ── */}
        <div style={{ fontSize: "11px", color: theme.textSecondary, marginBottom: "8px", letterSpacing: "1px" }}>YAZI TİPİ</div>
        <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
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
    </>
  )


  // ════════════════════════════════════════════════════════════════
  // TEMA PANELİ
  // ════════════════════════════════════════════════════════════════
  const TemaPanel = temaAcik && (
    <>
      <div onClick={() => setTemaAcik(false)} style={{ position: "fixed", inset: 0, zIndex: 195 }} />
      <div style={{ ...panelStil("right"), width: "240px", zIndex: 200 }}>
        <div style={{ fontSize: "11px", color: theme.textSecondary, marginBottom: "10px", letterSpacing: "1px" }}>TEMA</div>
        {[
          { id: "sepia",  label: "Sepya",  renk: "#f4ecd8", aciklama: "Göz yormayan sıcak ton" },
          { id: "light",  label: "Açık",   renk: "#ffffff", aciklama: "Sade beyaz arka plan" },
          { id: "dark",   label: "Koyu",   renk: "#1a1a2e", aciklama: "Koyu mavi gece modu" },
          { id: "night",  label: "Gece",   renk: "#0d0d0d", aciklama: "Tam karanlık mod" },
          { id: "coffee", label: "Kahve",  renk: "#251b04", aciklama: "Koyu kahve tonları" },
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
            {t.id === "custom" && <Pencil size={12} color={theme.textSecondary} />}
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
      <div style={{
        position: "fixed", top: "50%", left: "50%", transform: "translate(-50%, -50%)",
        background: theme.surface, border: `1px solid ${theme.border}`,
        borderRadius: "24px", padding: "24px", zIndex: 400,
        width: "320px", maxHeight: "90vh", overflowY: "auto",
        boxShadow: "0 8px 32px rgba(0,0,0,0.2)",
      }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "20px" }}>
          <h2 style={{ fontSize: "16px", color: theme.text }}>Özel Tema</h2>
          <button onClick={() => setOzelTemaPanelAcik(false)} style={{ color: theme.textSecondary, background: "none", border: "none", cursor: "pointer" }}>
            <X size={18} />
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
                  <div style={{ fontSize: "13px", color: theme.text }}>{palet.label}</div>
                  <div style={{ fontSize: "11px", color: theme.textSecondary }}>{ozelRenkler[palet.key]}</div>
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
          <div style={{ fontSize: "11px", color: theme.textSecondary, marginBottom: "6px", letterSpacing: "1px" }}>ÖNİZLEME</div>
          <div style={{ fontSize: "13px", color: ozelRenkler.text, marginBottom: "4px" }}>Örnek metin</div>
          <div style={{ fontSize: "12px", color: ozelRenkler.textSecondary, marginBottom: "6px" }}>İkincil metin</div>
          <span style={{ fontSize: "12px", color: ozelRenkler.lugatHighlight, borderBottom: `1px dotted ${ozelRenkler.lugatHighlight}` }}>
            lügat kelimesi
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
      <div style={{ ...panelStil("right"), width: "270px", display: "flex", flexDirection: "column", gap: "16px", zIndex: 200 }}>
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
            <span style={{ fontSize: "12px" }}>{otomatikGizleme ? "Açık" : "Kapalı"}</span>
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
            <span style={{ fontSize: "12px" }}>{sureGoster ? "Açık" : "Kapalı"}</span>
          </button>
        </div>
        <div style={{ position: "relative" }}>
          <KariSecici
            kariId={player.kariId}
            setKariId={player.setKariId}
            theme={theme}
            barKonum={barKonum}
          />
        </div>
      </div>
    </>
  )

  // ════════════════════════════════════════════════════════════════
  // BAR
  // ════════════════════════════════════════════════════════════════
  const Bar = (
    <div
      onClick={barGoster}
      style={{
        position: "fixed", left: 0, right: 0,
        [barKonum === "alt" ? "bottom" : "top"]: 0,
        background: theme.surface,
        borderTop:    barKonum === "alt" ? `1px solid ${theme.border}` : "none",
        borderBottom: barKonum === "ust" ? `1px solid ${theme.border}` : "none",
        padding: isMobile ? "10px 16px" : "4px 12px",
        display: "flex", alignItems: "center", gap: "4px",
        zIndex: 90, flexWrap: "wrap",
        transition: "opacity 0.3s ease",
        opacity: barGorunur ? 1 : 0,
        pointerEvents: barGorunur ? "auto" : "none",
      }}
    >
      <button onClick={() => navigate(-1)} style={barButonStil()}>
        <ArrowLeft size={16} /> Geri
      </button>
      <button onClick={() => setMenuAcik(!menuAcik)} style={barButonStil(menuAcik)}>
        <Menu size={15} />
      </button>
      <button onClick={oncekiSayfa} disabled={mevcutSayfa <= 1} style={barButonStil()}>
        <ChevronRight size={15} />
      </button>
      {sayfaGirdiAcik ? (
        <input
          type="number"
          value={sayfaGirdi}
          autoFocus
          onChange={e => setSayfaGirdi(e.target.value)}
          onBlur={() => { sayfayaGit(sayfaGirdi); setSayfaGirdiAcik(false); setSayfaGirdi("") }}
          onKeyDown={e => {
            if (e.key === "Enter") { sayfayaGit(sayfaGirdi); setSayfaGirdiAcik(false); setSayfaGirdi("") }
            if (e.key === "Escape") { setSayfaGirdiAcik(false); setSayfaGirdi("") }
          }}
          style={{
            width: "52px", padding: "4px 6px", borderRadius: "6px", fontSize: "12px",
            border: `1px solid ${theme.accent}`, background: theme.background,
            color: theme.text, textAlign: "center", outline: "none",
          }}
        />
      ) : (
        <button
          onClick={() => { setSayfaGirdiAcik(true); setSayfaGirdi(String(mevcutSayfa)) }}
          style={{ ...barButonStil(), fontSize: "12px", minWidth: "48px", justifyContent: "center" }}
        >
          {mevcutSayfa} / {toplamSayfa}
        </button>
      )}
      <button onClick={sonrakiSayfa} disabled={mevcutSayfa >= toplamSayfa} style={barButonStil()}>
        <ChevronLeft size={15} />
      </button>
      {!sadeMode && (
        <button onClick={() => togglePanel(setAaAcik, !aaAcik)} style={barButonStil(aaAcik)}>
          <Type size={15} /> Aa
        </button>
      )}
      <div style={{
        display: "flex", gap: "6px", alignItems: "center",
        ...(isMobile ? { justifyContent: "center", flex: 1 } : { marginLeft: "auto" }),
      }}>
        {sureGoster && !sadeMode && (
          <span style={{ fontSize: "11px", color: theme.textSecondary, padding: "4px 6px", display: "flex", alignItems: "center", gap: "3px" }}>
            <Clock size={11} /> Bugün {dakikaFormatla(bugunSure)}
          </span>
        )}
        <button onClick={() => setSadeMode(!sadeMode)} style={{ ...barButonStil(sadeMode), padding: "4px" }}>
          <Circle size={15} />
        </button>
        <button onClick={() => togglePanel(setTemaAcik, !temaAcik)} style={{ ...barButonStil(temaAcik), padding: "4px" }}>
          <Palette size={15} />
        </button>
        <button onClick={() => togglePanel(setAyarlarAcik, !ayarlarAcik)} style={{ ...barButonStil(ayarlarAcik), padding: "4px" }}>
          <Settings size={15} />
        </button>
      </div>
    </div>
  )

  // ════════════════════════════════════════════════════════════════
  // ANA RENDER
  // ════════════════════════════════════════════════════════════════

  if (yukleniyor) return (
    <div style={{
      display: "flex", alignItems: "center", justifyContent: "center",
      height: "100vh", color: theme.textSecondary, fontSize: "14px",
    }}>
      Yükleniyor...
    </div>
  )

  return (
    <div
      style={{ height: "100vh", display: "flex", background: theme.background, overflow: "hidden" }}
      onMouseMove={(e) => {
        if (e.movementX !== 0 || e.movementY !== 0) barGoster()
      }}
      onTouchStart={barGoster}
    >
      {/* Paneller */}
      {AaPanel}
      {TemaPanel}
      {AyarlarPanel}
      {OzelTemaPanel}

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

      {/* Sure menüsü */}
      {menuAcik && (
        <>
          <div
            onClick={() => setMenuAcik(false)}
            style={{ position: "fixed", inset: 0, zIndex: 79, background: "rgba(0,0,0,0.3)" }}
          />
          <div style={{
            position: isMobile ? "fixed" : "relative",
            width: "260px", flexShrink: 0,
            background: theme.surface,
            borderRight: `1px solid ${theme.border}`,
            display: "flex", flexDirection: "column",
            height: "100vh",
            zIndex: 80,
            ...(isMobile ? { left: 0, top: 0, bottom: 0 } : {}),
          }}>
            <div style={{ padding: "12px 16px", borderBottom: `1px solid ${theme.border}`, display: "flex", alignItems: "center", gap: "8px" }}>
              <div style={{
                display: "flex", alignItems: "center", gap: "8px",
                background: theme.background, border: `1px solid ${theme.accent}40`,
                borderRadius: "20px", padding: "6px 12px", flex: 1,
              }}>
                <Search size={13} color={theme.accent} />
                <input
                  type="text"
                  placeholder="Sûre ismi..."
                  value={menuArama}
                  onChange={e => setMenuArama(e.target.value)}
                  autoFocus
                  style={{ flex: 1, background: "transparent", border: "none", outline: "none", fontSize: "13px", color: theme.text }}
                />
                {menuArama && (
                  <button onClick={() => setMenuArama("")} style={{ color: theme.textSecondary, display: "flex", background: "none", border: "none", cursor: "pointer" }}>
                    <X size={12} />
                  </button>
                )}
              </div>
              <button onClick={() => setMenuAcik(false)} style={{ color: theme.textSecondary, display: "flex", background: "none", border: "none", cursor: "pointer" }}>
                <X size={16} />
              </button>
            </div>
            <div style={{ flex: 1, overflowY: "auto" }}>
              {filtreliSureler.map(sure => (
                <div key={sure.id}>
                  <div style={{ display: "flex", alignItems: "center", borderBottom: `1px solid ${theme.border}` }}>
                    <button
                      onClick={() => setAcikSure(acikSure === sure.id ? null : sure.id)}
                      style={{ padding: "10px 8px", color: theme.accent, display: "flex", alignItems: "center", flexShrink: 0, background: "none", border: "none", cursor: "pointer" }}
                    >
                      {acikSure === sure.id ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                    </button>
                    <button
                      onClick={() => sureGit(sure.id)}
                      style={{ flex: 1, display: "flex", alignItems: "center", gap: "8px", padding: "10px 8px 10px 0", textAlign: "left", background: "none", border: "none", cursor: "pointer", color: theme.text }}
                    >
                      <span style={{ fontSize: "11px", color: theme.accent, minWidth: "20px" }}>{sure.id}.</span>
                      <span style={{ fontSize: "13px" }}>{sure.isim}</span>
                      <span style={{ fontSize: "10px", color: theme.textSecondary, marginLeft: "auto", paddingRight: "8px" }}>{sure.ayetSayisi}</span>
                    </button>
                  </div>
                  {acikSure === sure.id && (
                    <div style={{ background: `${theme.accent}08`, borderBottom: `1px solid ${theme.border}` }}>
                      <div style={{ padding: "8px 12px", borderBottom: `1px solid ${theme.border}` }}>
                        <div style={{
                          display: "flex", alignItems: "center", gap: "6px",
                          background: theme.background, border: `1px solid ${theme.accent}30`,
                          borderRadius: "16px", padding: "4px 10px",
                        }}>
                          <Search size={11} color={theme.accent} />
                          <input
                            type="number" min="1" max={sure.ayetSayisi}
                            placeholder={`1 - ${sure.ayetSayisi}`}
                            value={ayetArama[sure.id] || ""}
                            onChange={e => setAyetArama(prev => ({ ...prev, [sure.id]: e.target.value }))}
                            onKeyDown={e => {
                              if (e.key === "Enter") {
                                const no = parseInt(ayetArama[sure.id])
                                if (no >= 1 && no <= sure.ayetSayisi) sureGit(sure.id, no)
                              }
                            }}
                            style={{ flex: 1, background: "transparent", border: "none", outline: "none", fontSize: "12px", color: theme.text, width: "60px" }}
                          />
                          {ayetArama[sure.id] && (
                            <button
                              onClick={() => { const no = parseInt(ayetArama[sure.id]); if (no >= 1 && no <= sure.ayetSayisi) sureGit(sure.id, no) }}
                              style={{ fontSize: "11px", color: theme.accent, background: "none", border: "none", cursor: "pointer" }}
                            >
                              Git
                            </button>
                          )}
                        </div>
                      </div>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: "4px", padding: "8px 12px", maxHeight: "200px", overflowY: "auto" }}>
                        {Array.from({ length: sure.ayetSayisi }, (_, i) => i + 1).map(no => (
                          <button
                            key={no}
                            onClick={() => sureGit(sure.id, no)}
                            style={{
                              width: "32px", height: "28px", fontSize: "11px",
                              color: theme.text, background: theme.background,
                              border: `1px solid ${theme.border}`, borderRadius: "4px", cursor: "pointer",
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
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0, overflow: "hidden" }}>
        {barKonum === "ust" && Bar}

        <PlayerBar
          player={player}
          sureler={sureler}
          theme={theme}
          barKonum={barKonum}
        />

        {/* Virtualizer ile sayfa içeriği */}
        <div
          ref={scrollRef}
          style={{
            flex: 1,
            overflowY: "auto",
            overflowX: "hidden",
            paddingTop:    barKonum === "ust" ? "8px" : "16px",
            paddingBottom: barKonum === "alt" ? "80px" : "16px",
          }}
          onClick={(e) => {
            if (popup) return
            barGorunur ? barGizle() : barGoster()
          }}
          onScroll={() => {
            if (!herhangiPanelAcik && otomatikGizleme) {
              if (barZamanRef.current) clearTimeout(barZamanRef.current)
              setBarGorunur(false)
            }
          }}
        >
          <div
            style={{
              height: `${virtualizer.getTotalSize()}px`,
              position: "relative",
              maxWidth: "720px",
              width: "100%",
              margin: "0 auto",
              boxSizing: "border-box",
            }}
          >
            {virtualizer.getVirtualItems().map(vItem => {
              const sayfa = sayfaListesi[vItem.index]
              if (!sayfa) return null

              return (
                <div
                  key={vItem.key}
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    right: 0,
                    width: "100%",        // ← ekle
                    boxSizing: "border-box", // ← ekle
                    transform: `translateY(${vItem.start}px)`,
                  }}
                >
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
                    aktifAyet={player.aktifAyet}
                    onKelimeTikla={kelimeTikla}
                    onAyetTikla={ayetTikla}
                    onSureTikla={sureTikla}
                  />
                </div>
              )
            })}
          </div>
        </div>

        {barKonum === "alt" && Bar}
      </div>
    </div>
  )
}