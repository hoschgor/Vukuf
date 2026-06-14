import { useState, useEffect, useRef, useCallback, useMemo } from "react"
import { useNavigate } from "react-router-dom"
import { useApp } from "../AppContext"
import { useVirtualizer } from "@tanstack/react-virtual"
import arapcaLugat from "../data/arapca-lugat.json"
import SureBasligi from "../components/SureBasligi"
import AyetNo from "../components/AyetNo"
import Besmele from "../components/Besmele"
import { useMediaQuery } from "../data/hooks/useMediaQuery"
import {
  ArrowLeft, Search, X, ChevronRight, ChevronDown, Menu,
  Play, Pause, Plus, Minus, Bookmark, Type, Palette,
  Settings, Circle, Clock, ChevronsUp, ChevronsDown,
  Pencil, Eye, Highlighter,
} from "lucide-react"

// Özel tema sabitleri
const PALET_ALANLARI = [
  { key: "background", label: "Ana Arka Plan" },
  { key: "surface", label: "Yüzey Rengi" },
  { key: "text", label: "Yazı Rengi" },
  { key: "textSecondary", label: "İkincil Yazı" },
  { key: "accent", label: "Vurgu Rengi" },
  { key: "border", label: "Kenarlık Rengi" },
  { key: "lugatHighlight", label: "Lügat Vurgu" },
]

const HAZIR_RENKLER = [
  "#f4ecd8", "#ffffff", "#1a1a2e", "#0d0d0d",
  "#8b5e3c", "#c41e3a", "#2e8b57", "#4a90e2", "#9b59b6", "#e67e22",
  "#3a3a3a", "#666666", "#999999", "#cccccc",
]

function harekeSil(k) {
  return k.replace(/[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06DC\u06DF-\u06E4\u06E7\u06E8\u06EA-\u06ED\u06E1\u0671]/g, "")
}

function dakikaFormatla(saniye) {
  const saat = Math.floor(saniye / 3600)
  const dakika = Math.floor((saniye % 3600) / 60)
  
  if (saat === 0 && dakika === 0) return "1 dk'dan az"
  return `${saat > 0 ? saat + " sa " : ""}${dakika > 0 ? dakika + " dk" : ""}`.trim()
}

function bugunAnahtari() {
  const now = new Date()
  return `vukuf-sure-kuran-${now.getFullYear()}-${now.getMonth()}-${now.getDate()}`
}

export default function KuranOkuma({ kitap }) {
  const { theme, currentTheme, setCurrentTheme, customTheme, ozelTemaKaydet: ozelTemaKaydetFromContext } = useApp()
  const navigate = useNavigate()
  const scrollRef = useRef(null)
  const isMobile = useMediaQuery("(max-width: 768px)")
  const barZamanRef = useRef(null)
  const otomatikRef = useRef(null)
  const sureSayacRef = useRef(null)
  
  // ── Veri
  const [kitapMetni, setKitapMetni] = useState([])
  const [yukleniyor, setYukleniyor] = useState(true)

  // ── Popup
  const [popup, setPopup] = useState(null)

  // ── Yazı
  const [yaziBoyutu, setYaziBoyutu] = useState(() =>
    parseInt(localStorage.getItem("vukuf-yazi-boyutu") || "16")
  )

  // ── Bar
  const [barGorunur, setBarGorunur] = useState(true)
  const [barKonum, setBarKonum] = useState(() => localStorage.getItem("vukuf-bar-konum") || "alt")
  const [sadeMode, setSadeMode] = useState(() => localStorage.getItem("vukuf-sade-mod") === "true")
  const [otomatikGizleme, setOtomatikGizleme] = useState(() => localStorage.getItem("vukuf-otomatik-gizleme") !== "false")
  const [gizlemeSuresi, setGizlemeSuresi] = useState(() => parseInt(localStorage.getItem("vukuf-gizleme-suresi") || "5"))
  const [sureGoster, setSureGoster] = useState(true)

  // ── Paneller
  const [aaAcik, setAaAcik] = useState(false)
  const [temaAcik, setTemaAcik] = useState(false)
  const [ayarlarAcik, setAyarlarAcik] = useState(false)
  const [ozelTemaPanelAcik, setOzelTemaPanelAcik] = useState(false)

  // ── Özel Tema State'leri (
  const [ozelRenkler, setOzelRenkler] = useState(() => {
    const kayitli = localStorage.getItem("vukuf-ozel-tema")
    return kayitli ? JSON.parse(kayitli) : {
      background: "#f5f0e8",
      surface: "#ffffff", 
      text: "#2c2418",
      textSecondary: "#6b5b4e",
      accent: "#8b5e3c",
      border: "#d4c5b0",
      lugatHighlight: "#c41e3a",
    }
  })
  const [aktifRenk, setAktifRenk] = useState(null)

  // ── Otomatik kaydırma
  const [otomatikKaydirma, setOtomatikKaydirma] = useState(false)
  const [kaydirmaHizi, setKaydirmaHizi] = useState(1)

  // ── Okuma süresi
  const [bugunSure, setBugunSure] = useState(() =>
    parseInt(localStorage.getItem(bugunAnahtari()) || "0")
  )

  // ── Sure menüsü
  const [menuAcik, setMenuAcik] = useState(false)
  const [menuArama, setMenuArama] = useState("")
  const [acikSure, setAcikSure] = useState(null)
  const [ayetArama, setAyetArama] = useState({})

  // ... devamı aynen kalır
  

  // ── localStorage kayıt
  useEffect(() => { localStorage.setItem("vukuf-yazi-boyutu", yaziBoyutu) }, [yaziBoyutu])
  useEffect(() => { localStorage.setItem("vukuf-bar-konum", barKonum) }, [barKonum])
  useEffect(() => { localStorage.setItem("vukuf-sade-mod", sadeMode) }, [sadeMode])
  useEffect(() => { localStorage.setItem("vukuf-otomatik-gizleme", otomatikGizleme) }, [otomatikGizleme])
  useEffect(() => { localStorage.setItem("vukuf-gizleme-suresi", gizlemeSuresi) }, [gizlemeSuresi])

  // ── Okuma süresi sayacı
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

  // ── Bar zamanlayıcı
  const barGoster = useCallback(() => {
    setBarGorunur(true)
    if (barZamanRef.current) clearTimeout(barZamanRef.current)
    if (otomatikGizleme) {
      barZamanRef.current = setTimeout(() => setBarGorunur(false), gizlemeSuresi * 1000)
    }
  }, [otomatikGizleme, gizlemeSuresi])

  useEffect(() => { barGoster() }, [])

  // ── Otomatik kaydırma
  useEffect(() => {
    if (otomatikKaydirma) {
      otomatikRef.current = setInterval(() => {
        if (scrollRef.current) scrollRef.current.scrollTop += kaydirmaHizi
      }, 50)
    } else {
      clearInterval(otomatikRef.current)
    }
    return () => clearInterval(otomatikRef.current)
  }, [otomatikKaydirma, kaydirmaHizi])

  // ── Veri yükle
  useEffect(() => {
    if (!kitap) return
    fetch(`/${kitap.dosya}`)
      .then(r => r.json())
      .then(data => { setKitapMetni(data); setYukleniyor(false) })
      .catch(() => setYukleniyor(false))
  }, [kitap])

  // ── İşlenmiş veri
  const kuranIslenmiş = useMemo(() => {
    if (!kitapMetni.length) return []
    return kitapMetni.map(sure => ({
      ...sure,
      ayetler: sure.ayetler.map(ayet => ({
        ...ayet,
        kelimeler: ayet.arapca.split(" ").map(kelime => ({
          ham: kelime,
          lugat: arapcaLugat[harekeSil(kelime).trim()] || null,
        }))
      }))
    }))
  }, [kitapMetni])

  // ── Düz satır listesi
  const satirlar = useMemo(() => {
    const liste = []
    kuranIslenmiş.forEach(sure => {
      liste.push({ tip: "sure-baslik", sure })
      // Besmele: Fatiha (1) ve Tevbe (9) hariç tüm surelerde göster
      if (sure.id !== 1 && sure.id !== 9) {
        liste.push({ tip: "besmele", sure })
      }
      sure.ayetler.forEach(ayet => {
        liste.push({ tip: "ayet", sure, ayet })
      })
    })
    return liste
  }, [kuranIslenmiş])

  // ── Virtualizer
  const virtualizer = useVirtualizer({
    count: satirlar.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: (i) => {
      const s = satirlar[i]
      if (!s) return 60
      if (s.tip === "sure-baslik") return 110
      if (s.tip === "besmele") return 60
      return Math.ceil(s.ayet.arapca.length / 25) * 50 + 32
    },
    overscan: 10,
  })

  // ── Sure'ye git
  function sureGit(sureId, ayetNo) {
    let idx = satirlar.findIndex(s => s.tip === "sure-baslik" && s.sure.id === sureId)
    if (ayetNo) {
      idx = satirlar.findIndex(s => s.tip === "ayet" && s.sure.id === sureId && s.ayet.no === ayetNo)
    }
    if (idx !== -1) virtualizer.scrollToIndex(idx, { align: "start" })
    setMenuAcik(false)
    setMenuArama("")
    setAcikSure(null)
    setAyetArama({})
  }

  // ── Kelime tıkla
  const kelimeTikla = useCallback((kelime, anlam, e) => {
    const x = Math.min(e.clientX, window.innerWidth - 300)
    const y = e.clientY + 12 + 200 > window.innerHeight ? e.clientY - 180 : e.clientY + 12
    setPopup({ kelime, anlam, x, y })
  }, [])

  // ── Panel toggle
  function togglePanel(setter, deger) {
    setAaAcik(false); setTemaAcik(false)
    setAyarlarAcik(false); setOzelTemaPanelAcik(false)
    setter(deger)
  }

  // ── Filtrelenmiş sure listesi
  const filtrelenmisKategoriler = useMemo(() => {
    if (!menuArama) return kuranIslenmiş
    return kuranIslenmiş.filter(s =>
      s.isim.toLowerCase().includes(menuArama.toLowerCase()) ||
      String(s.id).includes(menuArama)
    )
  }, [kuranIslenmiş, menuArama])

  // ── Panel stil
  const panelStil = (konum) => ({
    position: "fixed",
    [barKonum === "alt" ? "bottom" : "top"]: "56px",
    ...(konum === "right" ? { right: "12px" } : konum === "left" ? { left: "12px" } : { left: "50%", transform: "translateX(-50%)" }),
    background: theme.surface,
    border: `1px solid ${theme.border}`,
    borderRadius: "12px",
    padding: "16px",
    zIndex: 200,
    boxShadow: "0 8px 24px rgba(0,0,0,0.15)",
  })

  // ── Bar buton stili
  const barButonStil = (aktif = false) => ({
    display: "flex", alignItems: "center", gap: "4px",
    padding: "6px 8px", borderRadius: "8px", fontSize: "12px",
    background: aktif ? `${theme.accent}20` : "transparent",
    color: aktif ? theme.accent : theme.textSecondary,
    border: "none", cursor: "pointer",
    transition: "all 0.15s",
  })

  if (yukleniyor) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", color: theme.textSecondary }}>
      Yükleniyor...
    </div>
  )

  // ── Aa Paneli
  const AaPanel = aaAcik && (
    <>
      <div onClick={() => setAaAcik(false)} style={{ position: "fixed", inset: 0, zIndex: 95 }} />
      <div style={{ ...panelStil("center"), width: "280px" }}>
        <div style={{ fontSize: "11px", color: theme.textSecondary, marginBottom: "8px", letterSpacing: "1px" }}>YAZI BOYUTU</div>
        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "14px" }}>
          <button onClick={() => setYaziBoyutu(Math.max(12, yaziBoyutu - 1))} style={barButonStil()}><Minus size={14} /></button>
          <div style={{ flex: 1, textAlign: "center" }}>
            <span style={{ fontSize: `${Math.min(yaziBoyutu, 22)}px`, color: theme.text }}>Aa</span>
            <span style={{ fontSize: "11px", color: theme.textSecondary, marginLeft: "6px" }}>{yaziBoyutu}px</span>
          </div>
          <button onClick={() => setYaziBoyutu(Math.min(32, yaziBoyutu + 1))} style={barButonStil()}><Plus size={14} /></button>
        </div>
      </div>
    </>
  )

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
          ozelTemaKaydetFromContext(ozelRenkler); 
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

  // ── Ayarlar Paneli
  const AyarlarPanel = ayarlarAcik && (
    <>
      <div onClick={() => setAyarlarAcik(false)} style={{ position: "fixed", inset: 0, zIndex: 95 }} />
      <div style={{ ...panelStil("right"), width: "260px", display: "flex", flexDirection: "column", gap: "16px" }}>
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
      </div>
    </>
  )

  // ── Bar
  const Bar = (
    <div
      onClick={barGoster}
      style={{
        position: "fixed", left: 0, right: 0,
        [barKonum === "alt" ? "bottom" : "top"]: 0,
        background: theme.surface,
        borderTop: barKonum === "alt" ? `1px solid ${theme.border}` : "none",
        borderBottom: barKonum === "ust" ? `1px solid ${theme.border}` : "none",
        padding: isMobile ? "10px 55px" : "3px 10px",
        display: "flex", alignItems: "center", gap: "4px",
        zIndex: 90, flexWrap: "wrap",
        transition: "opacity 0.3s ease",
        opacity: barGorunur ? 1 : 0,
        pointerEvents: barGorunur ? "auto" : "none",
      }}
    >
      {/* Geri */}
      <button onClick={() => navigate(-1)} style={barButonStil()}>
        <ArrowLeft size={16} /> Geri
      </button>

      {/* Sure menüsü - 3 çizgi */}
      <button onClick={() => setMenuAcik(!menuAcik)} style={barButonStil(menuAcik)}>
        <Menu size={15} />
      </button>

      {!sadeMode && (
        <>
          {/* Aa */}
          <button onClick={() => togglePanel(setAaAcik, !aaAcik)} style={barButonStil(aaAcik)}>
            <Type size={15} /> Aa
          </button>

          {/* Otomatik kaydırma */}
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

      {/* Sağ grup */}
      <div style={{
        display: "flex", gap: "8px", alignItems: "center",
        ...(isMobile ? { justifyContent: "center", flex: 1 } : { marginLeft: "auto" })
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

  return (
    <div
      style={{ height: "100vh", display: "flex", background: theme.background }}
      onMouseMove={barGoster}
      onTouchStart={barGoster}
    >
      {/* Paneller */}
      {AaPanel}
      {TemaPanel}
      {AyarlarPanel}
      {OzelTemaPanel}

      {/* Sure menüsü - sol panel */}
      {menuAcik && (
        <div style={{
          width: "260px", flexShrink: 0,
          background: theme.surface,
          borderRight: `1px solid ${theme.border}`,
          display: "flex", flexDirection: "column",
          height: "100vh",
          zIndex: 80,
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
                <button onClick={() => setMenuArama("")} style={{ color: theme.textSecondary, display: "flex" }}>
                  <X size={12} />
                </button>
              )}
            </div>
            <button onClick={() => setMenuAcik(false)} style={{ color: theme.textSecondary, display: "flex" }}>
              <X size={16} />
            </button>
          </div>

          <div style={{ flex: 1, overflowY: "auto" }}>
            {filtrelenmisKategoriler.map(sure => (
              <div key={sure.id}>
                <div style={{ display: "flex", alignItems: "center", borderBottom: `1px solid ${theme.border}` }}>
                  <button
                    onClick={() => setAcikSure(acikSure === sure.id ? null : sure.id)}
                    style={{ padding: "10px 8px", color: theme.accent, display: "flex", alignItems: "center", flexShrink: 0 }}
                  >
                    {acikSure === sure.id ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                  </button>
                  <button
                    onClick={() => sureGit(sure.id)}
                    style={{ flex: 1, display: "flex", alignItems: "center", gap: "8px", padding: "10px 8px 10px 0", textAlign: "left", color: theme.text }}
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
                            style={{ fontSize: "11px", color: theme.accent }}
                          >Git</button>
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
                          onMouseEnter={e => e.currentTarget.style.background = `${theme.accent}20`}
                          onMouseLeave={e => e.currentTarget.style.background = theme.background}
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
      )}

      {/* Ana alan */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
        {barKonum === "ust" && Bar}

        <div
          ref={scrollRef}
          style={{ flex: 1, overflowY: "auto", padding: `${barKonum === "ust" ? "0" : "0"} 24px ${barKonum === "alt" ? "72px" : "0"}` }}
          onClick={barGoster}
        >
          <style>{`.kuran-kelime:hover { background: ${theme.accent}20; border-radius: 3px; }`}</style>

          {/* Kitap başlığı */}
          <div style={{ textAlign: "center", padding: "32px 0 16px", direction: "ltr" }}>
            <h1 style={{ fontSize: "32px", color: theme.accent, fontFamily: " serif" }}>{kitap.baslik}</h1>
          </div>

          <div style={{
            height: `${virtualizer.getTotalSize()}px`,
            position: "relative",
            direction: "rtl",
            fontFamily: "ArabicCustom, Scheherazade New, serif",
            maxWidth: "680px",
            margin: "0 auto",
          }}>
            {virtualizer.getVirtualItems().map(vItem => {
              const satir = satirlar[vItem.index]
              return (
                <div
                  key={vItem.key}
                  style={{
                    position: "absolute", top: 0, left: 0, right: 0,
                    transform: `translateY(${vItem.start}px)`,
                    padding: "0 4px",
                  }}
                >
                  {satir.tip === "besmele" ? (
                    <div style={{ marginTop: "8px", marginBottom: "8px" }}>
                      <Besmele theme={theme} sureId={satir.sure.id} />
                    </div>
                  ) : satir.tip === "sure-baslik" ? (
                    <div style={{ marginBottom: "16px" }}>
                      <SureBasligi
                        sure={satir.sure}
                        theme={theme}
                        onTikla={(e) => {
                          const x = Math.min(e.clientX, window.innerWidth - 300)
                          const y = e.clientY + 12 + 200 > window.innerHeight ? e.clientY - 180 : e.clientY + 12
                          setPopup({
                            kelime: `${satir.sure.isimArapca || satir.sure.isim} · ${satir.sure.isim}`,
                            anlam: `Anlam: ${satir.sure.anlam}\nNüzul: ${satir.sure.yer}\nÂyet sayısı: ${satir.sure.ayetSayisi}`,
                            x, y,
                          })
                        }}
                      />
                    </div>
                  ) : (
                    <div style={{
                      lineHeight: "2.4",
                      fontSize: `${yaziBoyutu + 4}px`,
                      color: theme.text,
                      paddingBottom: "16px",
                      marginTop: "80px",      
                    }}>
                      <AyetNo
                        no={satir.ayet.no}
                        sure={satir.sure}
                        theme={theme}
                        onClick={(e) => {
                          const x = Math.min(e.clientX, window.innerWidth - 300)
                          const y = e.clientY + 12 + 200 > window.innerHeight ? e.clientY - 180 : e.clientY + 12
                          setPopup({
                            kelime: `${satir.sure.isim} · ${satir.ayet.no}. Âyet`,
                            anlam: satir.ayet.meal || "Meal henüz eklenmemiş",
                            x, y,
                          })
                        }}
                      />
                      {satir.ayet.kelimeler.map((k, ki) => (
                        <span
                          key={ki}
                          className="kuran-kelime"
                          onClick={(e) => kelimeTikla(
                            `${k.ham}${k.lugat?.okunuş ? `  (${k.lugat.okunuş})` : ""}`,
                            k.lugat
                              ? k.lugat.anlamlar.map((a, i) => `${i + 1}. ${a}`).join("\n")
                              : "Bu kelime için anlam bulunamadı",
                            e
                          )}
                          style={{ cursor: "pointer" }}
                        >
                          {k.ham}{" "}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {barKonum === "alt" && Bar}
      </div>

      {/* Popup */}
      {popup && (
        <>
          <div onClick={() => setPopup(null)} style={{ position: "fixed", inset: 0, zIndex: 299 }} />
          <div style={{
            position: "fixed", left: popup.x, top: popup.y, zIndex: 300,
            background: theme.surface, border: `1px solid ${theme.border}`,
            borderRadius: "12px", padding: "14px 16px", maxWidth: "280px",
            boxShadow: "0 4px 24px rgba(0,0,0,0.15)",
          }}>
            <div style={{ color: theme.accent, fontWeight: "bold", fontSize: "16px", marginBottom: "6px", direction: "rtl" }}>
              {popup.kelime}
            </div>
            <div style={{ color: theme.textSecondary, fontSize: "14px", lineHeight: "1.6", direction: "ltr", whiteSpace: "pre-line" }}>
              {popup.anlam}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
