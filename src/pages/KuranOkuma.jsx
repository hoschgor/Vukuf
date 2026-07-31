import { useState, useEffect, useLayoutEffect, useRef, useCallback, useMemo, } from "react"
import { createPortal } from "react-dom"
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
import KitapAyraci from "../components/KitapAyraci"
import KayitPaneli from "../components/KayitPaneli"
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
  Pencil, ChevronLeft, Bookmark, BookOpen,
  Layers,
} from "lucide-react"

// ── Arapça font listesi
const ARAPCA_FONTLAR = [
  { id: "kfgqpc",            label: "KFGQPC Uthmanic (Önerilen)", style: "'KFGQPC Uthmanic', serif",    google: null },
  { id: "me-quran",          label: "Me Quran",                   style: "'me_quran', serif",            google: null },
  { id: "Indopak",           label: "Indopak",                    style: "'Indopak', serif",             google: null },
  { id: "IndopakNastaleeq",  label: "Indopak Nastaleeq",          style: "'IndopakNastaleeq', serif",    google: null },
]

// ── Özel tema sabitleri
const PALET_ALANLARI = [
  { key: "background",   label: "Ana Arka Plan" },
  { key: "surface",      label: "Yüzey Rengi" },
  { key: "text",         label: "Yazı Rengi" },
  { key: "textSecondary",label: "İkincil Yazı" },
  { key: "accent",       label: "Vurgu Rengi" },
  { key: "lugatHighlight",label: "Allah lafızları" },
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
  const [odakAyet, setOdakAyet] = useState(null)
  const [odakSure, setOdakSure] = useState(null)
  const odakSureNonce = useRef(0)
  const odakSureTimeoutRef = useRef(null)
  const [odakAyrac, setOdakAyrac] = useState(null)
  const odakAyracNonce = useRef(0)
  const odakAyracTimeoutRef = useRef(null)
  const barZamanRef  = useRef(null)
  const sureSayacRef = useRef(null)
  const scrollHiziRef = useRef({ sonScrollTop: 0, sonZaman: Date.now(), scrollSayisi: 0 })
  const scrollOranRef = useRef(0)
  const [kayitPaneliAcik, setKayitPaneliAcik] = useState(false)
  const playerBarYuksekligi = isMobile ? 41 : 40
  // ── Ses sistemi
  const player = useAudioPlayer()

  // ── Veri
  const [mushafData, setMushafData] = useState([])
  const [yukleniyor, setYukleniyor] = useState(true)
  const [scrollKilitli, setScrollKilitli] = useState(false)

  // ── Popup
  const [popup, setPopup] = useState(null)

  // ── Sayfa navigasyonu
  const [mevcutSayfa, setMevcutSayfa] = useState(() =>
    parseInt(localStorage.getItem("vukuf-son-sayfa") || "1")
  )
  
  const [sayfaGirdi, setSayfaGirdi] = useState("")
  const [sayfaGirdiAcik, setSayfaGirdiAcik] = useState(false)

  const [kayitKonumModu, setKayitKonumModu] = useState(false)
  

  const [kayitlar, setKayitlar] = useState(() => {
    try { return JSON.parse(localStorage.getItem("vukuf-kayitlar") || "[]") }
    catch { return [] }
  })
  const mevcutKayit = kayitlar.find(k => k.sayfa === mevcutSayfa)
  
  
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
  const touchBaslangicRef = useRef({ x: 0, y: 0 })
  const touchHareketRef = useRef(false)
  const [barKilitli, setBarKilitli] = useState(false)
  const [sureBilgisiGoster, setSureBilgisiGoster] = useState(() =>
  localStorage.getItem("vukuf-sure-bilgisi") !== "false"
)
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

  useEffect(() => { localStorage.setItem("vukuf-yazi-boyutu",       String(yaziBoyutu))     }, [yaziBoyutu])
  useEffect(() => { localStorage.setItem("vukuf-bar-konum",         barKonum)               }, [barKonum])
  useEffect(() => { localStorage.setItem("vukuf-sade-mod",          String(sadeMode))       }, [sadeMode])
  useEffect(() => { localStorage.setItem("vukuf-otomatik-gizleme",  String(otomatikGizleme))}, [otomatikGizleme])
  useEffect(() => { localStorage.setItem("vukuf-gizleme-suresi",    String(gizlemeSuresi))  }, [gizlemeSuresi])
  useEffect(() => { localStorage.setItem("vukuf-son-sayfa",         String(mevcutSayfa))    }, [mevcutSayfa])
  useEffect(() => { localStorage.setItem("vukuf-satir-araligi",     String(satirAraligi))   }, [satirAraligi])
  useEffect(() => { localStorage.setItem("vukuf-harf-araligi",      String(harfAraligi))    }, [harfAraligi])
  useEffect(() => { localStorage.setItem("vukuf-sure-bilgisi", String(sureBilgisiGoster)) }, [sureBilgisiGoster])

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

  // ── Otomatik kaydırma
  useEffect(() => {
    if (!otomatikKaydirma || duraklatildi) {
      if (otomatikRef.current) { 
        clearInterval(otomatikRef.current); 
        otomatikRef.current = null 
      }
      return
    }
    const ms = Math.max(20, 220 - kaydirmaHizi * 20)
    otomatikRef.current = setInterval(() => {
      if (scrollRef.current) {
        scrollRef.current.scrollTop += 1
      }
    }, ms)
    return () => { 
      if (otomatikRef.current) { 
        clearInterval(otomatikRef.current); 
        otomatikRef.current = null 
      } 
    }
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

useLayoutEffect(() => {
  if (!barRef.current) return
  const observer = new ResizeObserver(entries => {
    setBarYuksekligi(Math.ceil(entries[0].contentRect.height))
  })
  observer.observe(barRef.current)
  return () => observer.disconnect()
})


const [barUiOlcegi, setBarUiOlcegi] = useState(() =>
  parseFloat(localStorage.getItem("vukuf-bar-ui-olcegi") || "1")
)

useEffect(() => {
  localStorage.setItem("vukuf-bar-ui-olcegi", String(barUiOlcegi))
}, [barUiOlcegi])
const wrapAktif = isMobile && barUiOlcegi > 0.9
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
    return sureler.filter(s =>
      s.isim.toLowerCase().includes(menuArama.toLowerCase()) ||
      String(s.id).includes(menuArama)
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

    useEffect(() => {
  if (yukleniyor || !sayfaListesi.length) return
  if (scrollKilitli) return // Kilitliyken scroll yapma
  
  const index = sayfaListesi.findIndex(s => s.sayfaNo === mevcutSayfa)
  if (index === -1) return
  
  const ilkYukleme = !sessionStorage.getItem("vukuf-ilk-yukleme")
  if (ilkYukleme) {
    virtualizer.scrollToIndex(index, { align: "start" })
    sessionStorage.setItem("vukuf-ilk-yukleme", "true")
  }
}, [yukleniyor, sayfaListesi.length, scrollKilitli])

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
        const inlineYukseklik = kelimeSatirSayisi * satirYuksekligi + 20
        toplamYukseklik += inlineYukseklik
      }
      
      toplamYukseklik += mobile ? 16 : 24
      return Math.max(toplamYukseklik, mobile ? 200 : 300)
    })
  }, [sayfaListesi, yaziBoyutu, isMobile])

  // ── VIRTUALIZER ──
  const virtualizer = useVirtualizer({
    count: sayfaListesi.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: (index) => {
      return sayfaYukseklikleri[index] || (isMobile ? 500 : 700)
    },
    overscan: isMobile ? 4 : 3,
    // ...diğer opsiyonlar
  })

  // Sayfa navigasyonu sırasında otomatik scroll düzeltmesini kapat
  virtualizer.shouldAdjustScrollPositionOnItemSizeChange = () => false

// ════════════════════════════════════════════════════════════════
// KAYIT BÖLÜMÜ
// ════════════════════════════════════════════════════════════════
const kayitEkle = useCallback((baslik, scrollY) => {
  const el = scrollRef.current
  if (!el) return

  let oran = scrollY
  if (oran === undefined) {
    const ortaY = el.scrollTop + el.clientHeight * 0.25
    const sayfaIndex = sayfaListesi.findIndex(s => s.sayfaNo === mevcutSayfa)
    if (sayfaIndex === -1) return
    const sayfaYukseklik = sayfaYukseklikleri[sayfaIndex] || 500
    const virtualItem = virtualizer.getVirtualItems().find(v => v.index === sayfaIndex)
    const sayfaBaslangic = virtualItem?.start || 0
    oran = (ortaY - sayfaBaslangic) / sayfaYukseklik
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
}, [mevcutSayfa, sayfaListesi, sayfaYukseklikleri, virtualizer])

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



const sayfayaKaydir = useCallback((index, align = "start") => {
  // Tek seferlik scroll
  virtualizer.scrollToIndex(index, { align })
}, [virtualizer])


const sayfaGercekYukseklikleriRef = useRef({})
// Kayıtlı sayfaya gitme fonksiyonu
const kayitSayfaGit = useCallback((sayfa, scrollY, kayitId) => {
  const index = sayfaListesi.findIndex(s => s.sayfaNo === sayfa)
  if (index === -1) return
  virtualizer.scrollToIndex(index, { align: "start" })
  setTimeout(() => {
    const el = scrollRef.current
    if (!el) return
    const virtualItem = virtualizer.getVirtualItems().find(v => v.index === index)
    const sayfaBaslangic = virtualItem?.start || 0
    const sayfaYukseklik = sayfaGercekYukseklikleriRef.current[sayfa]
      || sayfaYukseklikleri[index]
      || 500
    const barOfset = isMobile ? 20 : 13
    el.scrollTop = sayfaBaslangic + (scrollY || 0) * sayfaYukseklik - barOfset

    if (kayitId) {
      setOdakAyrac(kayitId)
      setTimeout(() => setOdakAyrac(null), 4200)
    }
  }, isMobile ? 400 : 150)
}, [sayfaListesi, virtualizer, sayfaYukseklikleri, isMobile])

// Sayfa numarası güncelleme
useEffect(() => {
  const el = scrollRef.current
  if (!el) return

  const sayfaGuncelle = () => {
    const items = virtualizer.getVirtualItems()
    if (!items.length) return
    const ortaY = el.scrollTop + el.clientHeight / 2
    const aktif = items.find(item =>
      item.start <= ortaY && item.end >= ortaY
    ) || items[0]

    if (aktif && sayfaListesi[aktif.index]) {
      setMevcutSayfa(sayfaListesi[aktif.index].sayfaNo)
    }
  }


  
  el.addEventListener('scroll', sayfaGuncelle, { passive: true })
  return () => el.removeEventListener('scroll', sayfaGuncelle)
}, [virtualizer, sayfaListesi])

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

  setMevcutSayfa(n)
  setPopup(null)

  const index = sayfaListesi.findIndex(s => s.sayfaNo === n)
  if (index === -1) return

  virtualizer.scrollToIndex(index, { align: "start" })

  // Virtualizer render ettikten sonra pozisyonu düzelt
  setTimeout(() => {
    const el = scrollRef.current
    if (!el) return
    const targetItem = virtualizer.getVirtualItems().find(v => v.index === index)
    if (targetItem) el.scrollTop = targetItem.start
  }, isMobile ? 400 : 150)
}


function sureGit(sureId, ayetNo) {
  const sayfa = ayetNo
    ? ayetSayfasi(sureId, ayetNo, ayetSayfaLookup)
    : sureBaslangicSayfasi(sureId, sureSayfaLookup)

  const hedefIndex = sayfaListesi.findIndex(s => s.sayfaNo === sayfa)
  if (hedefIndex === -1) return

  setScrollKilitli(true)
  setMevcutSayfa(sayfa)
  setMenuAcik(false)
  setMenuArama("")
  setAcikSure(null)
  setAyetArama({})
  setPopup(null)

  virtualizer.scrollToIndex(hedefIndex, { align: "start" })
  setScrollKilitli(false)

  function odaklanHedefe(deneme = 0) {
    const el = scrollRef.current
    if (!el) return

    const selector = ayetNo
      ? `[data-sure="${sureId}"][data-ayet="${ayetNo}"]`
      : `[data-sure-baslik="${sureId}"]`
    const hedefEl = el.querySelector(selector)

    if (!hedefEl) {
      if (deneme < 2) {
        setTimeout(() => odaklanHedefe(deneme + 1), 200)
      }
      return
    }

    const offset = (barKonum === "ust" ? barYuksekligi : 0)
      + (player.durum !== "kapali" ? playerBarYuksekligi : 0)
      + (ayetNo ? 20 : 8)

    hedefEl.style.scrollMarginTop = `${offset}px`
    hedefEl.scrollIntoView({ behavior: "smooth", block: "start" })
    setTimeout(() => { hedefEl.style.scrollMarginTop = "0" }, 400)

    if (ayetNo) {
      setOdakAyet({ sureNo: sureId, ayetNo })
      setTimeout(() => setOdakAyet(null), 2000)
    } else {
  odakSureNonce.current += 1
  setOdakSure({ id: sureId, nonce: odakSureNonce.current })

  if (odakSureTimeoutRef.current) {
    clearTimeout(odakSureTimeoutRef.current)
  }
  odakSureTimeoutRef.current = setTimeout(() => {
    setOdakSure(null)
    odakSureTimeoutRef.current = null
  }, 4200)
}
  }

  setTimeout(() => odaklanHedefe(0), isMobile ? 300 : 150)
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
    [barKonum === "alt" ? "bottom" : "top"]: `${barYuksekligi + (player.durum !== "kapali" ? playerBarYuksekligi : 4)}px`,
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
  padding: isMobile 
    ? `${Math.round(3 * barUiOlcegi)}px ${Math.round(5 * barUiOlcegi)}px`
    : `${Math.round(6 * barUiOlcegi)}px ${Math.round(8 * barUiOlcegi)}px`,
  borderRadius: "8px",
  fontSize: `${Math.round(12 * barUiOlcegi)}px`,
  background: aktif ? `${theme.accent}20` : "transparent",
  color: aktif ? theme.accent : theme.textSecondary,
  border: "none", cursor: "pointer", transition: "all 0.15s",
  flexShrink: 0,
})

// panelStil fonksiyonuna benzer bir stil oluşturalım
const menuStil = {
  position: "fixed",
  width: "280px",
  flexShrink: 0,
  background: theme.surface,
  borderRight: `1px solid ${theme.border}`,
  display: "flex",
  flexDirection: "column",
  zIndex: 80,
  // Bar ve player bar'ın toplam yüksekliğini hesapla
  top: barKonum === "ust" 
    ? `${barYuksekligi + (player.durum !== "kapali" ? playerBarYuksekligi : 0)}px` 
    : "0px",
  bottom: barKonum === "alt" 
    ? `${barYuksekligi + (player.durum !== "kapali" ? playerBarYuksekligi : 0)}px` 
    : "0px",
  ...(isMobile ? { left: 0 } : {}),
}

// Menü içeriği için padding hesapla (panelStil'deki gibi)
const playerBarOffset = player.durum !== "kapali" 
  ? (isMobile ? playerBarYuksekligi - 41 : playerBarYuksekligi) 
  : -30

const menuIcerikPadding = {
  paddingTop: barKonum === "ust" ? `${playerBarOffset}px` : "0px",
  paddingBottom: barKonum === "alt" ? `${playerBarOffset}px` : "0px",
}

  // ════════════════════════════════════════════════════════════════
  // SAYFAYA GİT POPUP
  // ════════════════════════════════════════════════════════════════
  const SayfaGitPopup = sayfaGitAcik && (
  <>
    <div onClick={() => setSayfaGitAcik(false)} style={{ position: "fixed", inset: 0, zIndex: 95 }} />
    <div style={{ ...panelStil("center"), width: "280px", zIndex: 96 }}>
      <div style={{ fontSize: "12px", color: theme.textSecondary, marginBottom: "10px" }}>
        SAYFAYA GİT (1 – {toplamSayfa})
      </div>
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
      <div style={{ ...panelStil("center"), width: "300px", maxHeight: "80vh", overflowY: "auto", zIndex: 200 }}>
        
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
          <div style={{
            marginTop: "8px", padding: "8px 12px", borderRadius: "8px",
            background: theme.background, border: `1px solid ${theme.border}`,
            direction: "rtl", textAlign: "center",
            fontFamily: aktifArapcaFont.style,
            fontSize: `${Math.min(yaziBoyutu, 100)}px`,
            lineHeight: satirAraligi,
            letterSpacing: `${harfAraligi}px`,
            color: theme.text,
          }}>
            بِسۡمِ ٱللَّهِ ٱلرَّحۡمَٰنِ ٱلرَّحِيمِ
          </div>
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
          <div style={{
            marginTop: "8px", padding: "8px 12px", borderRadius: "8px",
            background: theme.background, border: `1px solid ${theme.border}`,
            direction: "rtl", textAlign: "center",
            fontFamily: aktifArapcaFont.style,
            fontSize: `${Math.min(yaziBoyutu, 22)}px`,
            lineHeight: satirAraligi,
            letterSpacing: `${harfAraligi}px`,
            color: theme.text,
          }}>
            بِسۡمِ ٱللَّهِ ٱلرَّحۡمَٰنِ ٱلرَّحِيمِ
          </div>
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
            {t.id === "custom" && <Pencil size={Math.round((isMobile ? 12 : 16) * barUiOlcegi)} color={theme.textSecondary} />}
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
          <h2 style={{ fontSize: `${Math.round((isMobile ? 11 : 12) * barUiOlcegi)}px`, color: theme.text }}>Özel Tema</h2>
          <button onClick={() => setOzelTemaPanelAcik(false)} style={{ color: theme.textSecondary, background: "none", border: "none", cursor: "pointer" }}>
            <X size={Math.round((isMobile ? 12 : 16) * barUiOlcegi)} />
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
      <div style={{ 
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
          <div style={{ fontSize: `${Math.round((isMobile ? 11 : 12) * barUiOlcegi)}px`, color: theme.textSecondary, marginBottom: "8px", letterSpacing: "1px" }}>BAR KONUMU</div>
          <div style={{ display: "flex", gap: "6px" }}>
            {["ust", "alt"].map(k => (
              <button key={k} onClick={() => setBarKonum(k)} style={{
                flex: 1, padding: "8px", borderRadius: "8px", fontSize: `${Math.round((isMobile ? 11 : 12) * barUiOlcegi)}px`,
                background: barKonum === k ? theme.accent : `${theme.accent}15`,
                color: barKonum === k ? "#fff" : theme.text,
                display: "flex", alignItems: "center", justifyContent: "center", gap: "4px",
                border: "none", cursor: "pointer",
              }}>
                {k === "ust" ? <ChevronsUp size={Math.round((isMobile ? 12 : 16) * barUiOlcegi)} /> : <ChevronsDown size={Math.round((isMobile ? 12 : 16) * barUiOlcegi)} />}
                {k === "ust" ? "Üst" : "Alt"}
              </button>
            ))}
          </div>
        </div>
        <div>
          <div style={{ fontSize: `${Math.round((isMobile ? 11 : 12) * barUiOlcegi)}px`, color: theme.textSecondary, marginBottom: "8px", letterSpacing: "1px" }}>OTOMATİK GİZLEME</div>
          <button onClick={() => setOtomatikGizleme(!otomatikGizleme)} style={{
            width: "100%", padding: "8px 12px", borderRadius: "8px", fontSize: `${Math.round((isMobile ? 11 : 12) * barUiOlcegi)}px`,
            background: otomatikGizleme ? `${theme.accent}15` : theme.background,
            color: otomatikGizleme ? theme.accent : theme.textSecondary,
            border: `1px solid ${otomatikGizleme ? theme.accent : theme.border}`,
            cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "space-between",
          }}>
            <span>Otomatik gizleme</span>
            <span style={{ fontSize: `${Math.round((isMobile ? 11 : 12) * barUiOlcegi)}px` }}>{otomatikGizleme ? "Açık" : "Kapalı"}</span>
          </button>
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
          <div style={{ fontSize: `${Math.round((isMobile ? 11 : 12) * barUiOlcegi)}px`, color: theme.textSecondary, marginBottom: "8px", letterSpacing: "1px" }}>OKUMA SÜRESİ</div>
          <button onClick={() => setSureGoster(!sureGoster)} style={{
            width: "100%", padding: "8px 12px", borderRadius: "8px", fontSize: `${Math.round((isMobile ? 11 : 12) * barUiOlcegi)}px`,
            background: sureGoster ? `${theme.accent}15` : theme.background,
            color: sureGoster ? theme.accent : theme.textSecondary,
            border: `1px solid ${sureGoster ? theme.accent : theme.border}`,
            cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "space-between",
          }}>
            <span>Süre gösterimi</span>
            <span style={{ fontSize: `${Math.round((isMobile ? 11 : 12) * barUiOlcegi)}px` }}>{sureGoster ? "Açık" : "Kapalı"}</span>
          </button>
        </div>
        <div>
            </div>
          <div style={{ fontSize: `${Math.round((isMobile ? 11 : 12) * barUiOlcegi)}px`, color: theme.textSecondary, marginBottom: "8px", letterSpacing: "1px" }}>ARAYÜZ BOYUTU</div>
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
          <div style={{ fontSize: `${Math.round((isMobile ? 9 : 12) * barUiOlcegi)}px`, color: theme.textSecondary, marginBottom: "8px", letterSpacing: "1px" }}>SÛRE BİLGİSİ</div>
          <button onClick={() => setSureBilgisiGoster(!sureBilgisiGoster)} style={{
            width: "100%", padding: "8px 12px", borderRadius: "8px", fontSize: `${Math.round((isMobile ? 11 : 12) * barUiOlcegi)}px`,
            background: sureBilgisiGoster ? `${theme.accent}15` : theme.background,
            color: sureBilgisiGoster ? theme.accent : theme.textSecondary,
            border: `1px solid ${sureBilgisiGoster ? theme.accent : theme.border}`,
            cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "space-between",
          }}>
            <span>Sûre bilgisi</span>
            <span style={{ fontSize: `${Math.round((isMobile ? 9 : 11) * barUiOlcegi)}px`, }}>{sureBilgisiGoster ? "Açık" : "Kapalı"}</span>
          </button>
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
      padding: isMobile 
        ? `1px ${Math.round(8 * barUiOlcegi)}px`
        : `0px ${Math.round(8 * barUiOlcegi)}px`,
      display: "flex", 
      alignItems: "center",
      alignContent: "center",
      gap: cokSatir 
        ? `${Math.round((isMobile ? 6 : 8) * barUiOlcegi)}px`
        : `${Math.round((isMobile ? 0 : 5) * barUiOlcegi)}px`,
      zIndex: 90, 
      flexWrap: wrapAktif ? "wrap" : "nowrap",
      transition: "opacity 0.3s ease, transform 0.3s ease",
      opacity: barGorunur ? 1 : 0,
      pointerEvents: barGorunur ? "auto" : "none",
      transform: barGorunur ? "translateY(0)" : 
                 barKonum === "alt" ? "translateY(100%)" : "translateY(-100%)",
      justifyContent: wrapAktif ? "center" : "space-between",
    }}
  >
    {/* Sol grup */}
    <div style={{
      display: "flex",
      alignItems: "center",
      justifyContent: wrapAktif ? "center" : "flex-start",
      flexWrap: wrapAktif ? "wrap" : "nowrap",
      gap: `${Math.round((isMobile ? 2 : 4) * barUiOlcegi)}px`,
      flex: 1,
      maxWidth: wrapAktif ? "60%" : "none",
      overflow: wrapAktif ? "visible" : "hidden",
      minWidth: 0,
      paddingLeft: (!wrapAktif && isMobile) ? "40px" : 0,
    }}>
      <button onClick={() => navigate(-1)} style={{ ...barButonStil(), flexShrink: 0 }}>
        <ArrowLeft size={Math.round((isMobile ? 12 : 16) * barUiOlcegi)} /> {!isMobile && "Geri"}
      </button>
      
      <button onClick={() => setMenuAcik(!menuAcik)} style={{ ...barButonStil(menuAcik), flexShrink: 0 }}>
        <Menu size={Math.round((isMobile ? 12 : 16) * barUiOlcegi)} />
      </button>

      <button
        onClick={() => {
          if (kayitlar.length > 0) {
            setKayitPaneliAcik(!kayitPaneliAcik)
          } else {
            setKayitKonumModu(true)
            setKayitPaneliAcik(false)
          }
        }}
      >
        <Bookmark color={theme.accent}
          size={Math.round((isMobile ? 12 : 16) * barUiOlcegi)}
          fill={kayitlar.some(k => k.sayfa === mevcutSayfa) ? "currentColor" : "none"}
        />
      </button>
      
      <button
        onClick={() => setSayfaGitAcik(!sayfaGitAcik)}
        style={{
          ...barButonStil(),
          fontSize: `${Math.round((isMobile ? 12 : 18) * barUiOlcegi)}px`,
          minWidth: isMobile ? "40px" : "48px",
          justifyContent: "center",
          fontWeight: "500",
          color: theme.accent,
        }}
      >
        <BookOpen size={Math.round((isMobile ? 12 : 16) * barUiOlcegi)} />
        {mevcutSayfa}
      </button>
      
      {!sadeMode && (
        <>
          <button onClick={() => togglePanel(setAaAcik, !aaAcik)} style={barButonStil(aaAcik)}>
            <span style={{ 
              fontSize: `${Math.round((isMobile ? 12 : 20) * barUiOlcegi)}px`,
              fontWeight: "600",
              fontFamily: "'Amiri', serif",
              position: "relative",
              top: isMobile ? "-1px" : "-3.2px",
            }}>ن</span>
          </button>

          <button 
            onClick={() => setOtomatikKaydirma(!otomatikKaydirma)} 
            style={barButonStil(otomatikKaydirma)}
            title="Otomatik kaydırma"
          >
            {otomatikKaydirma ? <Pause size={Math.round((isMobile ? 12 : 16) * barUiOlcegi)} /> : <Play size={Math.round((isMobile ? 12 : 16) * barUiOlcegi)} />}
          </button>

          {otomatikKaydirma && (
            <div style={{ 
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
                <Minus size={Math.round((isMobile ? 12 : 16) * barUiOlcegi)} />
              </button>
              <span style={{ 
                fontSize: `${Math.round((isMobile ? 10 : 12) * barUiOlcegi)}px`,
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
                <Plus size={Math.round((isMobile ? 12 : 16) * barUiOlcegi)} />
              </button>
            </div>
          )}
        </>
      )}
    </div>

    {/* Sağ grup */}
    <div style={{
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      gap: `${Math.round((isMobile ? 4 : 3) * barUiOlcegi)}px`,
      flexShrink: 0,
      flexWrap: wrapAktif ? "wrap" : "nowrap",
      width: wrapAktif ? "100%" : "auto",
      marginLeft: wrapAktif ? 0 : "auto",
      paddingRight: (!wrapAktif && isMobile) ? "40px" : 0,
    }}>
      {sureGoster && !sadeMode && (
        <span style={{ 
          fontSize: `${Math.round((isMobile ? 9 : 12) * barUiOlcegi)}px`,
          color: theme.textSecondary, 
          padding: "5px 4px", 
          display: "flex", 
          alignItems: "center", 
          gap: "2px",
        }}>
          <Clock size={Math.round((isMobile ? 12 : 16) * barUiOlcegi)} /> 
          {isMobile ? dakikaFormatla(bugunSure) : `Bugün ${dakikaFormatla(bugunSure)}`}
        </span>
      )}
      {mevcutSureBilgisi && sureBilgisiGoster && (
        <span style={{
          fontSize: `${Math.round((isMobile ? 9 : 12) * barUiOlcegi)}px`,
          color: theme.textSecondary,
          padding: "5px 4px",
          display: "flex",
          alignItems: "center",
          gap: "2px",
        }}>
          <Layers size={Math.round((isMobile ? 12 : 16) * barUiOlcegi)} />
          {mevcutSureBilgisi.isim}
        </span>
      )}
      
      <button onClick={() => setSadeMode(!sadeMode)} style={{ ...barButonStil(sadeMode), padding: isMobile ? "3px" : "4px" }}>
        <Circle size={Math.round((isMobile ? 12 : 16) * barUiOlcegi)} />
      </button>
      
      <button onClick={() => togglePanel(setTemaAcik, !temaAcik)} style={{ ...barButonStil(temaAcik), padding: isMobile ? "3px" : "4px" }}>
        <Palette size={Math.round((isMobile ? 12 : 16) * barUiOlcegi)} />
      </button>
      
      <button onClick={() => togglePanel(setAyarlarAcik, !ayarlarAcik)} style={{ ...barButonStil(ayarlarAcik), padding: isMobile ? "3px" : "4px" }}>
        <Settings size={Math.round((isMobile ? 12 : 16) * barUiOlcegi)} />
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
    >
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
      className="sure-menusu"
      style={menuStil}
    >
      <div style={{ 
        padding: "12px 16px", 
        borderBottom: `1px solid ${theme.border}`, 
        display: "flex", 
        alignItems: "center", 
        gap: "8px" 
      }}>
        <Search size={Math.round((isMobile ? 12 : 16) * barUiOlcegi)} color={theme.accent} />
        <input
          type="text"
          placeholder="Sûre ismi..."
          value={menuArama}
          onChange={e => setMenuArama(e.target.value)}
          autoFocus
          style={{ 
            flex: 1, 
            background: "transparent", 
            border: "none", 
            outline: "none", 
            fontSize: `${Math.round((isMobile ? 11 : 12) * barUiOlcegi)}px`, 
            color: theme.text 
          }}
        />
        {menuArama && (
          <button 
            onClick={() => setMenuArama("")} 
            style={{ 
              color: theme.textSecondary, 
              display: "flex", 
              background: "none", 
              border: "none", 
              cursor: "pointer" 
            }}
          >
            <X size={Math.round((isMobile ? 12 : 16) * barUiOlcegi)} />
          </button>
        )}
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
          <X size={Math.round((isMobile ? 12 : 16) * barUiOlcegi)} />
        </button>
      </div>
      
      <div style={{  
        flex: 1,  
        overflowY: "auto",
        ...menuIcerikPadding,
      }}>
              {filtreliSureler.map(sure => (
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
                        ? <ChevronDown size={Math.round((isMobile ? 12 : 16) * barUiOlcegi)} /> 
                        : <ChevronRight size={Math.round((isMobile ? 12 : 16) * barUiOlcegi)} />
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
                        fontSize: `${Math.round((isMobile ? 11 : 12) * barUiOlcegi)}px`, 
                        color: theme.textSecondary, 
                        marginLeft: "auto", 
                        paddingRight: "8px" 
                      }}>
                        {sure.ayetSayisi}
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
                          <Search size={Math.round((isMobile ? 12 : 16) * barUiOlcegi)} color={theme.accent} />
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
          onOdaklan={() => {
            if (!player.aktifAyet) return
            const { sureNo, ayetNo } = player.aktifAyet
            const el = scrollRef.current
            if (!el) return

            const offset = (barKonum === "ust" ? barYuksekligi : 0) +
              (player.durum !== "kapali" ? playerBarYuksekligi : 0) + 20

            const hedefElementler = el.querySelectorAll(`[data-sure="${sureNo}"][data-ayet="${ayetNo}"]`)
            
            const odakla = () => {
              if (hedefElementler.length === 0) return
              const hedef = hedefElementler[0]
              const oncekiNo = ayetNo - 1
              const oncekiElementler = oncekiNo >= 1
                ? el.querySelectorAll(`[data-sure="${sureNo}"][data-ayet="${oncekiNo}"]`)
                : null
              const baslangic = oncekiElementler?.length > 0 ? oncekiElementler[0] : hedef
              baslangic.style.scrollMarginTop = `${offset}px`
              baslangic.scrollIntoView({ behavior: "smooth", block: "start" })
              baslangic.style.scrollMarginTop = "0"
              // Vurgulama kısmı
            setOdakAyet({ sureNo, ayetNo })
            setTimeout(() => setOdakAyet(null), 2000)
            }

            if (hedefElementler.length > 0) {
              // Sayfa zaten render edilmiş, direkt odaklan
              odakla()
            } else {
              // Farklı sayfada, önce sayfaya git
              const sayfa = ayetSayfasi(sureNo, ayetNo, ayetSayfaLookup)
              if (!sayfa) return
              const index = sayfaListesi.findIndex(s => s.sayfaNo === sayfa)
              if (index === -1) return
              sayfayaKaydir(index)
              setTimeout(odakla, 600)
            }
          }}
        />
        {/* Virtualizer ile sayfa içeriği */}
        <div
          ref={scrollRef}
          className="kuran-scroll-container" 
          style={{
            flex: 1,
            overflowY: "auto",
            overflowX: "hidden",
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
          }}
          onClick={(e) => {
            if (kayitKonumModu) {
              const el = scrollRef.current
              if (!el) return
              const rect = el.getBoundingClientRect()
              const tiklamaY = e.clientY - rect.top + el.scrollTop
              const sayfaIndex = sayfaListesi.findIndex(s => s.sayfaNo === mevcutSayfa)
              const virtualItem = virtualizer.getVirtualItems().find(v => v.index === sayfaIndex)
              const sayfaBaslangic = virtualItem?.start || 0
              const sayfaYukseklik = sayfaGercekYukseklikleriRef.current[mevcutSayfa]
                || sayfaYukseklikleri[sayfaIndex]
                || 500
              const oran = Math.max(0, Math.min(1, (tiklamaY - sayfaBaslangic) / sayfaYukseklik))
              kayitEkle(`Sayfa ${mevcutSayfa}`, oran)
              setKayitKonumModu(false)
              return
            }
            if (window.innerWidth <= 768) return
            if (menuKapatildiRef.current) return
            if (popup || aaAcik || temaAcik || ozelTemaPanelAcik || menuAcikRef.current) return
            barToggle()
          }}
          onTouchStart={(e) => {
            dokunusBasladi()
            
            // Touch başlangıç pozisyonunu kaydet
            const touch = e.touches[0]
            if (touch) {
              touchBaslangicRef.current = {
                x: touch.clientX,
                y: touch.clientY
              }
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
            }
          }}
          onTouchEnd={(e) => {
            dokunusBitti()
            if (barKilitli) return 
            // Eğer popup veya panel açık ise işlemi engelle
            if (popup || aaAcik || temaAcik || ozelTemaPanelAcik || menuAcikRef.current) {
              return
            }
            
            // Eğer hareket varsa (kaydırma), toggle yapma
            if (touchHareketRef.current) {
              return
            }
            
            // Tıklama ise bar'ı toggle et
            barToggle()
          }}
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
              height: `${virtualizer.getTotalSize()}px`,
              position: "relative",
              maxWidth: `${Math.round((isMobile ? 480 : 720) * (yaziBoyutu / 20))}px`,
              width: "maxWidth",
              margin: "0 auto",
              padding: isMobile ? "4px 12px" : "6px 24px",
              boxSizing: "border-box",
            }}
          >
            {virtualizer.getVirtualItems().map(vItem => {
              const sayfa = sayfaListesi[vItem.index]
              if (!sayfa) return null

              return (
                <div
                  key={vItem.key}
                  ref={virtualizer.measureElement}
                  data-index={vItem.index}
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    right: 0,
                    width: "100%",
                    boxSizing: "border-box",
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
                    odakAyet={odakAyet}
                    odakSure={odakSure}
                    odakAyrac={odakAyrac}
                    aktifAyet={player.aktifAyet}
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
                    onYukseklikOlcum={(sayfaNo, yukseklik) => {
                      sayfaGercekYukseklikleriRef.current[sayfaNo] = yukseklik
                    }}
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