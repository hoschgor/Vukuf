import { useState, useEffect, useRef } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { useApp } from "../AppContext"
import { kitaplar } from "../data/kitaplar"
import lugatVerisi from "../data/lugat.json"
import {
  ArrowLeft, BookOpen, Eye, EyeOff, Play, Pause,
  Plus, Minus, AlignJustify, ChevronsUp, ChevronsDown,
  Bookmark, Pencil, X, Type, StickyNote, Palette
} from "lucide-react"

// ─── Sabitler ────────────────────────────────────────────────────────────────

const FONT_SECENEKLERI = [
  { id: "serif",        label: "Varsayılan",    style: "Georgia, serif" },
  { id: "crimson",      label: "Crimson Text",  style: "'Crimson Text', serif" },
  { id: "garamond",     label: "EB Garamond",   style: "'EB Garamond', serif" },
  { id: "lora",         label: "Lora",          style: "'Lora', serif" },
  { id: "source-serif", label: "Source Serif",  style: "'Source Serif 4', serif" },
  { id: "sans",         label: "Sans-Serif",    style: "system-ui, sans-serif" },
]

const PALET_ALANLARI = [
  { key: "background",     label: "Arka Plan" },
  { key: "surface",        label: "Yüzey" },
  { key: "text",           label: "Yazı" },
  { key: "textSecondary",  label: "İkincil Yazı" },
  { key: "accent",         label: "Vurgu" },
  { key: "lugatHighlight", label: "Lügat Rengi" },
  { key: "border",         label: "Kenarlık" },
]

const HAZIR_RENKLER = [
  "#f4ecd8","#ffffff","#1a1a2e","#0d0d0d","#2c3e50",
  "#8b5e3c","#c0392b","#27ae60","#2980b9","#8e44ad",
  "#d4b896","#3b2f2f",
]

// ─── Yardımcı fonksiyonlar ────────────────────────────────────────────────────

function kelimeAra(kelime) {
  const temiz = kelime
    .toLowerCase()
    .replace(/[.,!?;:'"()\[\]]/g, "")
    .trim()
  return lugatVerisi[temiz] || null
}

function notlariYukle(kitapId) {
  try {
    return JSON.parse(localStorage.getItem(`vukuf_notlar_${kitapId}`)) || {}
  } catch { return {} }
}

function notlariKaydet(kitapId, notlar) {
  localStorage.setItem(`vukuf_notlar_${kitapId}`, JSON.stringify(notlar))
}

function fontYukle(fontId) {
  if (["crimson", "garamond", "lora", "source-serif"].includes(fontId)) {
    const fontMap = {
      crimson:      "Crimson+Text:ital,wght@0,400;0,600;1,400",
      garamond:     "EB+Garamond:ital,wght@0,400;0,500;1,400",
      lora:         "Lora:ital,wght@0,400;0,600;1,400",
      "source-serif": "Source+Serif+4:ital,wght@0,400;0,600;1,400",
    }
    const linkId = `font-${fontId}`
    if (!document.getElementById(linkId)) {
      const link = document.createElement("link")
      link.id = linkId
      link.rel = "stylesheet"
      link.href = `https://fonts.googleapis.com/css2?family=${fontMap[fontId]}&display=swap`
      document.head.appendChild(link)
    }
  }
}

// ─── MetinParcasi ─────────────────────────────────────────────────────────────

function MetinParcasi({ metin, lugatAktif, onKelimeTikla, theme, fontSize, hizalama, fontStyle }) {
  const satirlar = metin.split("\n")

  return (
    <div style={{ fontSize: `${fontSize}px`, fontFamily: fontStyle }}>
      {satirlar.map((satir, si) => {
        if (!satir.trim()) return <br key={si} />

        const hasiye = satir.startsWith("§")
        const gosterilecek = hasiye ? satir.slice(1) : satir

        if (hasiye) {
          return (
            <div key={si} style={{
              borderTop: `1px solid ${theme.border}`,
              marginTop: "16px",
              paddingTop: "8px",
              fontSize: `${fontSize - 2}px`,
              color: theme.textSecondary,
              fontStyle: "italic",
              lineHeight: "1.7",
              fontFamily: fontStyle,
            }}>
              {gosterilecek}
            </div>
          )
        }

        const kelimeler = gosterilecek.split(" ")

        return (
          <p key={si} style={{
            marginBottom: "10px",
            lineHeight: "1.9",
            textAlign: hizalama || "justify",
            wordSpacing: hizalama === "justify" ? "2px" : "normal",
          }}>
            {kelimeler.map((kelime, ki) => {
              if (!kelime.trim()) return " "
              const anlam = kelimeAra(kelime)
              const lugatliMi = anlam && lugatAktif

              if (!lugatliMi) return kelime + " "

              return (
                <span key={ki}>
                  <span
                    className="lugat-kelime"
                    onClick={(e) => onKelimeTikla(kelime, anlam, e)}
                    style={{
                      color: theme.lugatHighlight,
                      cursor: "pointer",
                      borderBottom: `1px dotted ${theme.lugatHighlight}`,
                      userSelect: "text",
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.opacity = "0.75" }}
                    onMouseLeave={(e) => { e.currentTarget.style.opacity = "1" }}
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

// ─── Ana bileşen ──────────────────────────────────────────────────────────────

export default function OkumaEkrani() {
  const { id } = useParams()
  const navigate = useNavigate()
  const {
    theme, currentTheme, setCurrentTheme,
    lugatActive, setLugatActive,
    isaretler, isaret_ekle, isaret_sil,
    customTheme, ozelTemaKaydet,
  } = useApp()

  // ── Kitap verisi
  const [kitapMetni, setKitapMetni]   = useState([])
  const [yukleniyor, setYukleniyor]   = useState(true)
  const kitap = kitaplar.find((k) => k.id === id)
  const kitapIsaretleri = isaretler[id] || []

  // ── Okuma ayarları
  const [yaziBoyutu, setYaziBoyutu]           = useState(16)
  const [hizalama, setHizalama]               = useState("justify")
  const [seciliFontId, setSeciliFontId]       = useState("serif")
  const seciliFont = FONT_SECENEKLERI.find(f => f.id === seciliFontId) || FONT_SECENEKLERI[0]

  // ── Scroll & sayfa takibi
  const scrollRef   = useRef(null)
  const sayfaRefs   = useRef({})
  const sonScrollRef = useRef(0)
  const [mevcutSayfa, setMevcutSayfa] = useState(1)

  // ── Otomatik kaydırma
  const otomatikRef = useRef(null)
  const [otomatikKaydirma, setOtomatikKaydirma] = useState(false)
  const [kaydirmaHizi, setKaydirmaHizi]         = useState(1)
  const [duraklatildi, setDuraklatildi]         = useState(false)

  // ── Bar görünürlüğü
  const barZamanRef = useRef(null)
  const [barGorunur, setBarGorunur]   = useState(true)
  const [barKonum, setBarKonum]       = useState("alt") // "ust" | "alt"
  const [sadeMode, setSadeMode]       = useState(false)

  // ── Açık panel takibi (timer'ı dondurmak için)
  // Herhangi bir panel açıksa bar zamanlayıcısı çalışmaz
  const [ayarlarAcik, setAyarlarAcik]     = useState(false)
  const [sayfaGitAcik, setSayfaGitAcik]   = useState(false)
  const [sayfaGitInput, setSayfaGitInput] = useState("")
  const [aaAcik, setAaAcik]               = useState(false)
  const [notAcik, setNotAcik]             = useState(false)
  const [temaAcik, setTemaAcik]           = useState(false)

  const herhangiPanelAcik = ayarlarAcik || sayfaGitAcik || aaAcik || notAcik || temaAcik

  // ── Lügat popup
  const [popup, setPopup] = useState(null)

  // ── Notlar
  const [notlar, setNotlar]       = useState(() => notlariYukle(id))
  const [notMetni, setNotMetni]   = useState("")
  const notInputRef = useRef(null)

  // ── Özel tema
  const [ozelRenkler, setOzelRenkler] = useState(customTheme || {})
  const [aktifRenk, setAktifRenk]     = useState(null)

  // ─── Dokunma (otomatik kaydırma duraklatma)
  const dokunusBaslangicRef = useRef(null)

  function dokunusBasladi(e) {
    setDuraklatildi(true)
    dokunusBaslangicRef.current = {
      x: e.touches[0].clientX,
      y: e.touches[0].clientY,
      zaman: Date.now(),
    }
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

  // ─── Bar zamanlayıcısı ────────────────────────────────────────────────────
  // Panel açıkken timer başlatma; kapatılınca yeniden başlat
  function barGoster() {
    setBarGorunur(true)
    if (barZamanRef.current) clearTimeout(barZamanRef.current)
    // Panel açıksa timer başlatma
    if (!herhangiPanelAcik) {
      barZamanRef.current = setTimeout(() => setBarGorunur(false), 5000)
    }
  }

  // Panel durumu değişince timer'ı güncelle
  useEffect(() => {
    if (herhangiPanelAcik) {
      // Panel açık → timer iptal, bar görünür kal
      if (barZamanRef.current) clearTimeout(barZamanRef.current)
      setBarGorunur(true)
    } else {
      // Panel kapandı → timer başlat
      if (barZamanRef.current) clearTimeout(barZamanRef.current)
      barZamanRef.current = setTimeout(() => setBarGorunur(false), 5000)
    }
    return () => {
      if (barZamanRef.current) clearTimeout(barZamanRef.current)
    }
  }, [herhangiPanelAcik])

  // İlk yüklemede bar'ı göster
  useEffect(() => {
    barGoster()
  }, [])

  // ─── Boş alana tıklayınca bar toggle ──────────────────────────────────────
  function icerikTiklandi(e) {
    // Lugat kelimesi, bar elemanı veya panel içindeyse yoksay
    if (e.target.closest(".lugat-kelime")) return
    if (e.target.closest(".okuma-bar")) return
    if (e.target.closest(".okuma-panel")) return
    // Bar görünürse gizle, gizliyse göster
    if (barGorunur) {
      setBarGorunur(false)
      if (barZamanRef.current) clearTimeout(barZamanRef.current)
    } else {
      barGoster()
    }
  }

  // ─── JSON yükle ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (!kitap) return
    fetch(`/${kitap.dosya}`)
      .then(r => r.json())
      .then(data => { setKitapMetni(data); setYukleniyor(false) })
      .catch(() => setYukleniyor(false))
  }, [kitap])

  // ─── Scroll takibi ────────────────────────────────────────────────────────
  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    function onScroll() {
      sonScrollRef.current = el.scrollTop
      const sayfaElemanlar = Object.entries(sayfaRefs.current)
      for (let i = sayfaElemanlar.length - 1; i >= 0; i--) {
        const [no, ref] = sayfaElemanlar[i]
        if (ref && ref.getBoundingClientRect().top <= 120) {
          setMevcutSayfa(Number(no))
          break
        }
      }
    }
    el.addEventListener("scroll", onScroll)
    return () => el.removeEventListener("scroll", onScroll)
  }, [])

  // ─── Otomatik kaydırma ────────────────────────────────────────────────────
  useEffect(() => {
    if (!otomatikKaydirma || duraklatildi) {
      if (otomatikRef.current) { clearInterval(otomatikRef.current); otomatikRef.current = null }
      return
    }
    const intervalMs = Math.max(20, 220 - kaydirmaHizi * 20)
    otomatikRef.current = setInterval(() => {
      if (scrollRef.current) scrollRef.current.scrollTop += 1
    }, intervalMs)
    return () => { if (otomatikRef.current) { clearInterval(otomatikRef.current); otomatikRef.current = null } }
  }, [otomatikKaydirma, kaydirmaHizi, duraklatildi])

  // ─── Font yükle ───────────────────────────────────────────────────────────
  useEffect(() => { fontYukle(seciliFontId) }, [seciliFontId])

  // ─── Nota kaydet ──────────────────────────────────────────────────────────
  function notKaydet() {
    if (!notMetni.trim()) return
    const yeniNotlar = {
      ...notlar,
      [mevcutSayfa]: [...(notlar[mevcutSayfa] || []), { id: Date.now(), metin: notMetni.trim() }],
    }
    setNotlar(yeniNotlar)
    notlariKaydet(id, yeniNotlar)
    setNotMetni("")
  }

  function notSil(sayfaNo, notId) {
    const yeniNotlar = {
      ...notlar,
      [sayfaNo]: (notlar[sayfaNo] || []).filter(n => n.id !== notId),
    }
    if (yeniNotlar[sayfaNo]?.length === 0) delete yeniNotlar[sayfaNo]
    setNotlar(yeniNotlar)
    notlariKaydet(id, yeniNotlar)
  }

  // ─── Sayfaya git ──────────────────────────────────────────────────────────
  function sayfayaGit(sayfaNo) {
    const ref = sayfaRefs.current[sayfaNo]
    if (ref && scrollRef.current) {
      scrollRef.current.scrollTo({ top: ref.offsetTop - 80, behavior: "smooth" })
    }
    setSayfaGitAcik(false)
    setSayfaGitInput("")
  }

  // ─── İşaret toggle ────────────────────────────────────────────────────────
  function isaretToggle(sayfaNo) {
    if (kitapIsaretleri.includes(sayfaNo)) isaret_sil(id, sayfaNo)
    else isaret_ekle(id, sayfaNo)
  }

  // ─── Tema sırası ──────────────────────────────────────────────────────────
  const themeOrder = ["sepia", "light", "dark", "night"]

  // ─── Panel kapatıcılar ────────────────────────────────────────────────────
  function tumPanelleriKapat() {
    setAyarlarAcik(false)
    setSayfaGitAcik(false)
    setAaAcik(false)
    setNotAcik(false)
    setTemaAcik(false)
  }

  function togglePanel(setter, deger) {
    tumPanelleriKapat()
    setter(deger)
  }

  // ─── Popup Y düzeltme ─────────────────────────────────────────────────────
  function kelimeTikla(kelime, anlam, e) {
    const x = Math.min(e.clientX, window.innerWidth - 300)
    const y = e.clientY + 12 + 200 > window.innerHeight
      ? e.clientY - 180
      : e.clientY + 12
    setPopup({ kelime, anlam, x, y })
  }

  // ─── Erken dönüşler ───────────────────────────────────────────────────────
  if (!kitap) return <div style={{ padding: "40px", color: theme.text }}>Kitap bulunamadı.</div>
  if (yukleniyor) return <div style={{ padding: "40px", color: theme.text }}>Yükleniyor...</div>

  // ─── Ortak buton stili ────────────────────────────────────────────────────
  const barButonStil = (aktif = false) => ({
    color: aktif ? theme.accent : theme.textSecondary,
    display: "flex",
    alignItems: "center",
    gap: "4px",
    fontSize: "13px",
    padding: "4px 8px",
    borderRadius: "6px",
    background: aktif ? `${theme.accent}15` : "transparent",
    border: "none",
    cursor: "pointer",
  })

  // ════════════════════════════════════════════════════════════════════════════
  // Aa PANELİ — Yazı tipi + boyut + hizalama
  // ════════════════════════════════════════════════════════════════════════════
  const AaPanel = aaAcik && (
    <>
      <div onClick={() => setAaAcik(false)} style={{ position: "fixed", inset: 0, zIndex: 95 }} />
      <div className="okuma-panel" style={{
        position: "fixed",
        [barKonum === "alt" ? "bottom" : "top"]: "56px",
        left: "50%",
        transform: "translateX(-50%)",
        background: theme.surface,
        border: `1px solid ${theme.border}`,
        borderRadius: "16px",
        padding: "16px",
        zIndex: 100,
        width: "320px",
        boxShadow: "0 4px 20px rgba(0,0,0,0.15)",
      }}>
        {/* Yazı boyutu */}
        <div style={{ marginBottom: "14px" }}>
          <div style={{ fontSize: "11px", color: theme.textSecondary, marginBottom: "8px", letterSpacing: "1px" }}>YAZI BOYUTU</div>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <button onClick={() => setYaziBoyutu(Math.max(12, yaziBoyutu - 1))} style={barButonStil()}>
              <Minus size={14} />
            </button>
            <div style={{ flex: 1, textAlign: "center" }}>
              <span style={{ fontSize: `${Math.min(yaziBoyutu, 22)}px`, color: theme.text, fontFamily: seciliFont.style }}>
                Aa
              </span>
              <span style={{ fontSize: "11px", color: theme.textSecondary, marginLeft: "6px" }}>{yaziBoyutu}px</span>
            </div>
            <button onClick={() => setYaziBoyutu(Math.min(28, yaziBoyutu + 1))} style={barButonStil()}>
              <Plus size={14} />
            </button>
          </div>
        </div>

        {/* Hizalama */}
        <div style={{ marginBottom: "14px" }}>
          <div style={{ fontSize: "11px", color: theme.textSecondary, marginBottom: "8px", letterSpacing: "1px" }}>METİN HİZALAMA</div>
          <div style={{ display: "flex", gap: "6px" }}>
            {[{ value: "left", label: "Sola" }, { value: "justify", label: "İki Tarafa" }, { value: "center", label: "Orta" }].map(h => (
              <button key={h.value} onClick={() => setHizalama(h.value)} style={{
                flex: 1,
                padding: "6px 8px",
                borderRadius: "8px",
                fontSize: "12px",
                background: hizalama === h.value ? theme.accent : `${theme.accent}15`,
                color: hizalama === h.value ? "#fff" : theme.text,
                border: "none",
                cursor: "pointer",
              }}>
                {h.label}
              </button>
            ))}
          </div>
        </div>

        {/* Yazı tipi seçimi */}
        <div>
          <div style={{ fontSize: "11px", color: theme.textSecondary, marginBottom: "8px", letterSpacing: "1px" }}>YAZI TİPİ</div>
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            {FONT_SECENEKLERI.map(font => (
              <button
                key={font.id}
                onClick={() => setSeciliFontId(font.id)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "10px 14px",
                  borderRadius: "10px",
                  background: seciliFontId === font.id ? `${theme.accent}18` : `${theme.accent}08`,
                  border: `1px solid ${seciliFontId === font.id ? theme.accent : theme.border}`,
                  cursor: "pointer",
                  transition: "all 0.15s",
                }}
              >
                <span style={{ fontSize: "13px", color: theme.text }}>{font.label}</span>
                <span style={{
                  fontSize: `${yaziBoyutu}px`,
                  fontFamily: font.style,
                  color: seciliFontId === font.id ? theme.accent : theme.textSecondary,
                  fontStyle: "italic",
                }}>
                  Elif
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </>
  )

  // ════════════════════════════════════════════════════════════════════════════
  // NOT PANELİ
  // ════════════════════════════════════════════════════════════════════════════
  const mevcutSayfaNotu = notlar[mevcutSayfa] || []
  const toplamNot = Object.values(notlar).reduce((acc, arr) => acc + arr.length, 0)

  const NotPanel = notAcik && (
    <>
      <div onClick={() => setNotAcik(false)} style={{ position: "fixed", inset: 0, zIndex: 95 }} />
      <div className="okuma-panel" style={{
        position: "fixed",
        [barKonum === "alt" ? "bottom" : "top"]: "56px",
        left: "50%",
        transform: "translateX(-50%)",
        background: theme.surface,
        border: `1px solid ${theme.border}`,
        borderRadius: "16px",
        padding: "16px",
        zIndex: 100,
        width: "320px",
        maxHeight: "420px",
        display: "flex",
        flexDirection: "column",
        boxShadow: "0 4px 20px rgba(0,0,0,0.15)",
      }}>
        <div style={{ fontSize: "11px", color: theme.textSecondary, marginBottom: "10px", letterSpacing: "1px" }}>
          NOT — SAYFA {mevcutSayfa}
        </div>

        {/* Not giriş */}
        <div style={{ display: "flex", gap: "8px", marginBottom: "12px" }}>
          <textarea
            ref={notInputRef}
            value={notMetni}
            onChange={e => setNotMetni(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); notKaydet() } }}
            placeholder="Bu sayfaya not ekle... (Enter ile kaydet)"
            rows={2}
            style={{
              flex: 1,
              padding: "8px 12px",
              borderRadius: "8px",
              border: `1px solid ${theme.border}`,
              background: theme.background,
              color: theme.text,
              fontSize: "13px",
              resize: "none",
              outline: "none",
              fontFamily: "inherit",
              lineHeight: "1.5",
            }}
          />
          <button
            onClick={notKaydet}
            style={{
              padding: "8px 12px",
              borderRadius: "8px",
              background: theme.accent,
              color: "#fff",
              border: "none",
              cursor: "pointer",
              alignSelf: "flex-end",
              fontSize: "12px",
            }}
          >
            Ekle
          </button>
        </div>

        {/* Mevcut sayfa notları */}
        <div style={{ overflowY: "auto", flex: 1 }}>
          {mevcutSayfaNotu.length === 0 ? (
            <div style={{ color: theme.textSecondary, fontSize: "13px", textAlign: "center", padding: "16px 0", opacity: 0.6 }}>
              Bu sayfada not yok
            </div>
          ) : (
            mevcutSayfaNotu.map(not => (
              <div key={not.id} style={{
                display: "flex",
                gap: "8px",
                padding: "8px 10px",
                borderRadius: "8px",
                background: `${theme.accent}0A`,
                border: `1px solid ${theme.border}`,
                marginBottom: "6px",
              }}>
                <div style={{ flex: 1, fontSize: "13px", color: theme.text, lineHeight: "1.5" }}>
                  {not.metin}
                </div>
                <button
                  onClick={() => notSil(mevcutSayfa, not.id)}
                  style={{ color: theme.textSecondary, background: "none", border: "none", cursor: "pointer", padding: "0", flexShrink: 0 }}
                >
                  <X size={13} />
                </button>
              </div>
            ))
          )}

          {/* Diğer sayfalardaki notlar */}
          {Object.entries(notlar)
            .filter(([sayfaNo]) => Number(sayfaNo) !== mevcutSayfa)
            .sort(([a], [b]) => Number(a) - Number(b))
            .map(([sayfaNo, sayfaNotlari]) => (
              <div key={sayfaNo} style={{ marginTop: "8px" }}>
                <div style={{
                  fontSize: "10px",
                  color: theme.textSecondary,
                  letterSpacing: "1px",
                  marginBottom: "4px",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                }}>
                  <div style={{ flex: 1, height: "1px", background: theme.border }} />
                  SAYFA {sayfaNo}
                  <button
                    onClick={() => sayfayaGit(Number(sayfaNo))}
                    style={{ color: theme.accent, background: "none", border: "none", cursor: "pointer", fontSize: "10px" }}
                  >
                    git →
                  </button>
                  <div style={{ flex: 1, height: "1px", background: theme.border }} />
                </div>
                {sayfaNotlari.map(not => (
                  <div key={not.id} style={{
                    display: "flex",
                    gap: "8px",
                    padding: "6px 10px",
                    borderRadius: "8px",
                    background: `${theme.accent}06`,
                    border: `1px solid ${theme.border}`,
                    marginBottom: "4px",
                  }}>
                    <div style={{ flex: 1, fontSize: "12px", color: theme.textSecondary, lineHeight: "1.5" }}>
                      {not.metin}
                    </div>
                    <button
                      onClick={() => notSil(Number(sayfaNo), not.id)}
                      style={{ color: theme.textSecondary, background: "none", border: "none", cursor: "pointer", padding: "0", flexShrink: 0 }}
                    >
                      <X size={12} />
                    </button>
                  </div>
                ))}
              </div>
            ))
          }
        </div>
      </div>
    </>
  )

  // ════════════════════════════════════════════════════════════════════════════
  // TEMA PANELİ — Navbar'dakiyle aynı mantık
  // ════════════════════════════════════════════════════════════════════════════
  const TemaPanel = temaAcik && (
    <>
      <div onClick={() => setTemaAcik(false)} style={{ position: "fixed", inset: 0, zIndex: 95 }} />
      <div className="okuma-panel" style={{
        position: "fixed",
        [barKonum === "alt" ? "bottom" : "top"]: "56px",
        right: "16px",
        background: theme.surface,
        border: `1px solid ${theme.border}`,
        borderRadius: "16px",
        padding: "16px",
        zIndex: 100,
        width: "240px",
        boxShadow: "0 4px 20px rgba(0,0,0,0.15)",
      }}>
        <div style={{ fontSize: "11px", color: theme.textSecondary, marginBottom: "10px", letterSpacing: "1px" }}>TEMA</div>

        {[
          { id: "sepia",  label: "Sepya",  renk: "#f4ecd8", aciklama: "Göz yormayan sıcak ton" },
          { id: "light",  label: "Açık",   renk: "#ffffff", aciklama: "Sade beyaz arka plan" },
          { id: "dark",   label: "Koyu",   renk: "#1a1a2e", aciklama: "Koyu mavi gece modu" },
          { id: "night",  label: "Gece",   renk: "#0d0d0d", aciklama: "Tam karanlık mod" },
          { id: "custom", label: "Özel",   renk: customTheme?.background || "#ffffff", aciklama: "Kişisel renk ayarları" },
        ].map(t => (
          <button
            key={t.id}
            onClick={() => {
              if (t.id === "custom") {
                setOzelRenkler({ ...customTheme })
                setTemaAcik(false)
                // Özel tema panelini aç (ayarlar paneli içinde)
                setAyarlarAcik(true)
              } else {
                setCurrentTheme(t.id)
              }
            }}
            style={{
              width: "100%",
              display: "flex",
              alignItems: "center",
              gap: "10px",
              padding: "8px 10px",
              borderRadius: "8px",
              fontSize: "13px",
              color: currentTheme === t.id ? theme.accent : theme.text,
              background: currentTheme === t.id ? `${theme.accent}15` : "transparent",
              border: "none",
              cursor: "pointer",
              marginBottom: "2px",
            }}
          >
            <div style={{
              width: "18px",
              height: "18px",
              borderRadius: "50%",
              background: t.renk,
              border: `2px solid ${currentTheme === t.id ? theme.accent : theme.border}`,
              flexShrink: 0,
            }} />
            <div style={{ flex: 1, textAlign: "left" }}>
              <div>{t.label}</div>
              <div style={{ fontSize: "10px", color: theme.textSecondary }}>{t.aciklama}</div>
            </div>
            {currentTheme === t.id && <span style={{ fontSize: "12px", color: theme.accent }}>✓</span>}
            {t.id === "custom" && <Pencil size={11} color={theme.textSecondary} />}
          </button>
        ))}
      </div>
    </>
  )

  // ════════════════════════════════════════════════════════════════════════════
  // AYARLAR PANELİ — Bar konumu + Özel tema renk editörü
  // ════════════════════════════════════════════════════════════════════════════
  const AyarlarPanel = ayarlarAcik && (
    <>
      <div onClick={() => setAyarlarAcik(false)} style={{ position: "fixed", inset: 0, zIndex: 95 }} />
      <div className="okuma-panel" style={{
        position: "fixed",
        [barKonum === "alt" ? "bottom" : "top"]: "56px",
        right: "16px",
        background: theme.surface,
        border: `1px solid ${theme.border}`,
        borderRadius: "16px",
        padding: "16px",
        zIndex: 100,
        width: "260px",
        maxHeight: "80vh",
        overflowY: "auto",
        boxShadow: "0 4px 20px rgba(0,0,0,0.15)",
        display: "flex",
        flexDirection: "column",
        gap: "16px",
      }}>
        {/* Bar konumu */}
        <div>
          <div style={{ fontSize: "11px", color: theme.textSecondary, marginBottom: "8px", letterSpacing: "1px" }}>BAR KONUMU</div>
          <div style={{ display: "flex", gap: "6px" }}>
            {["ust", "alt"].map(k => (
              <button key={k} onClick={() => setBarKonum(k)} style={{
                flex: 1,
                padding: "8px",
                borderRadius: "8px",
                fontSize: "12px",
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

        {/* Otomatik kaydırma hızı */}
        {otomatikKaydirma && (
          <div>
            <div style={{ fontSize: "11px", color: theme.textSecondary, marginBottom: "8px", letterSpacing: "1px" }}>KAYDIRMA HIZI</div>
            <input
              type="range" min="1" max="20" value={kaydirmaHizi}
              onChange={e => setKaydirmaHizi(Number(e.target.value))}
              style={{ width: "100%", accentColor: theme.accent }}
            />
          </div>
        )}

        {/* Özel tema renk editörü */}
        <div>
          <div style={{ fontSize: "11px", color: theme.textSecondary, marginBottom: "10px", letterSpacing: "1px" }}>ÖZEL TEMA</div>
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {PALET_ALANLARI.map(palet => (
              <div key={palet.key}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <button
                    onClick={() => setAktifRenk(aktifRenk === palet.key ? null : palet.key)}
                    style={{
                      width: "28px", height: "28px", borderRadius: "50%",
                      background: ozelRenkler[palet.key] || "#888",
                      border: `2px solid ${aktifRenk === palet.key ? theme.accent : theme.border}`,
                      cursor: "pointer", flexShrink: 0,
                    }}
                  />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: "12px", color: theme.text }}>{palet.label}</div>
                    <div style={{ fontSize: "10px", color: theme.textSecondary }}>{ozelRenkler[palet.key]}</div>
                  </div>
                </div>
                {aktifRenk === palet.key && (
                  <div style={{ marginTop: "8px", marginLeft: "38px" }}>
                    <input
                      type="color"
                      value={ozelRenkler[palet.key] || "#000000"}
                      onChange={e => setOzelRenkler(prev => ({ ...prev, [palet.key]: e.target.value }))}
                      style={{ width: "100%", height: "36px", borderRadius: "8px", border: `1px solid ${theme.border}`, cursor: "pointer", padding: "2px", background: theme.background }}
                    />
                    <div style={{ display: "flex", gap: "5px", marginTop: "6px", flexWrap: "wrap" }}>
                      {HAZIR_RENKLER.map(renk => (
                        <button key={renk} onClick={() => setOzelRenkler(prev => ({ ...prev, [palet.key]: renk }))} style={{
                          width: "22px", height: "22px", borderRadius: "50%",
                          background: renk,
                          border: `2px solid ${ozelRenkler[palet.key] === renk ? theme.accent : theme.border}`,
                          cursor: "pointer",
                        }} />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          <button
            onClick={() => { ozelTemaKaydet(ozelRenkler); setAktifRenk(null) }}
            style={{
              width: "100%", marginTop: "14px", padding: "10px",
              borderRadius: "24px", background: theme.accent,
              color: "#fff", fontSize: "13px", cursor: "pointer", border: "none",
            }}
          >
            Temayı Kaydet
          </button>
        </div>
      </div>
    </>
  )

  // ════════════════════════════════════════════════════════════════════════════
  // SAYFAYA GİT PANELİ
  // ════════════════════════════════════════════════════════════════════════════
  const SayfaGitPopup = sayfaGitAcik && (
    <>
      <div onClick={() => setSayfaGitAcik(false)} style={{ position: "fixed", inset: 0, zIndex: 95 }} />
      <div className="okuma-panel" style={{
        position: "fixed",
        [barKonum === "alt" ? "bottom" : "top"]: "56px",
        left: "50%",
        transform: "translateX(-50%)",
        background: theme.surface,
        border: `1px solid ${theme.border}`,
        borderRadius: "16px",
        padding: "16px",
        zIndex: 100,
        width: "280px",
        boxShadow: "0 4px 20px rgba(0,0,0,0.15)",
      }}>
        <div style={{ fontSize: "12px", color: theme.textSecondary, marginBottom: "10px" }}>
          SAYFAYA GİT (1 – {kitapMetni.length})
        </div>
        <div style={{ display: "flex", gap: "8px", marginBottom: "12px" }}>
          <input
            type="number" min={1} max={kitapMetni.length}
            value={sayfaGitInput}
            onChange={e => setSayfaGitInput(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") sayfayaGit(Math.min(Math.max(1, Number(sayfaGitInput)), kitapMetni.length)) }}
            placeholder="Sayfa no..."
            style={{
              flex: 1, padding: "8px 12px", borderRadius: "8px",
              border: `1px solid ${theme.border}`, background: theme.background,
              color: theme.text, fontSize: "14px", outline: "none",
            }}
            autoFocus
          />
          <button
            onClick={() => sayfayaGit(Math.min(Math.max(1, Number(sayfaGitInput)), kitapMetni.length))}
            style={{ padding: "8px 14px", borderRadius: "8px", background: theme.accent, color: "#fff", fontSize: "13px", border: "none", cursor: "pointer" }}
          >
            Git
          </button>
        </div>
        <input
          type="range" min={1} max={kitapMetni.length} value={mevcutSayfa}
          onChange={e => setMevcutSayfa(Number(e.target.value))}
          onMouseUp={e => sayfayaGit(Number(e.target.value))}
          onTouchEnd={e => sayfayaGit(Number(e.target.value))}
          style={{ width: "100%", accentColor: theme.accent }}
        />
        <div style={{ textAlign: "center", fontSize: "16px", fontWeight: "bold", color: theme.accent, marginTop: "6px" }}>
          {mevcutSayfa}
        </div>

        {kitapIsaretleri.length > 0 && (
          <div style={{ marginTop: "12px", borderTop: `1px solid ${theme.border}`, paddingTop: "10px" }}>
            <div style={{ fontSize: "11px", color: theme.textSecondary, marginBottom: "8px", letterSpacing: "1px" }}>İŞARETLER</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
              {kitapIsaretleri.sort((a, b) => a - b).map(s => (
                <button key={s} onClick={() => sayfayaGit(s)} style={{
                  display: "flex", alignItems: "center", gap: "4px",
                  padding: "4px 10px", borderRadius: "6px", fontSize: "12px",
                  background: `${theme.accent}18`, color: theme.accent,
                  border: `1px solid ${theme.accent}40`, cursor: "pointer",
                }}>
                  <Bookmark size={11} fill={theme.accent} />
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  )

  // ════════════════════════════════════════════════════════════════════════════
  // BAR
  // ════════════════════════════════════════════════════════════════════════════
  const Bar = (
    <div
      className="okuma-bar"
      style={{
        position: "fixed",
        left: 0, right: 0,
        [barKonum === "alt" ? "bottom" : "top"]: 0,
        background: theme.surface,
        borderTop: barKonum === "alt" ? `1px solid ${theme.border}` : "none",
        borderBottom: barKonum === "ust" ? `1px solid ${theme.border}` : "none",
        padding: "8px 16px",
        display: "flex",
        alignItems: "center",
        gap: "4px",
        zIndex: 90,
        flexWrap: "wrap",
        transition: "opacity 0.3s ease",
        opacity: barGorunur ? 1 : 0,
        pointerEvents: barGorunur ? "auto" : "none",
      }}
    >
      {/* Geri */}
      <button onClick={() => navigate("/")} style={barButonStil()}>
        <ArrowLeft size={16} />
        Geri
      </button>

      {/* İşaret */}
      <button
        onClick={() => isaretToggle(mevcutSayfa)}
        style={{ ...barButonStil(kitapIsaretleri.includes(mevcutSayfa)), padding: "4px" }}
        title={kitapIsaretleri.includes(mevcutSayfa) ? "İşareti kaldır" : "İşaret ekle"}
      >
        <Bookmark size={16} fill={kitapIsaretleri.includes(mevcutSayfa) ? theme.accent : "none"} />
      </button>

      {/* Sayfa / sayfaya git */}
      <button
        onClick={() => togglePanel(setSayfaGitAcik, !sayfaGitAcik)}
        style={{
          ...barButonStil(sayfaGitAcik),
          background: `${theme.accent}15`,
          color: theme.text,
        }}
      >
        <BookOpen size={13} color={theme.accent} />
        {mevcutSayfa} / {kitapMetni.length}
      </button>

      {!sadeMode && (
        <>
          {/* Lügat */}
          <button onClick={() => setLugatActive(!lugatActive)} style={barButonStil(lugatActive)}>
            {lugatActive ? <Eye size={15} /> : <EyeOff size={15} />}
            Lügat
          </button>

          {/* Aa — yazı ayarları */}
          <button onClick={() => togglePanel(setAaAcik, !aaAcik)} style={barButonStil(aaAcik)}>
            <Type size={15} />
            Aa
          </button>

          {/* Not */}
          <button onClick={() => togglePanel(setNotAcik, !notAcik)} style={barButonStil(notAcik)}>
            <StickyNote size={15} />
            {toplamNot > 0 && (
              <span style={{
                fontSize: "10px",
                background: theme.accent,
                color: "#fff",
                borderRadius: "10px",
                padding: "1px 5px",
                marginLeft: "2px",
              }}>
                {toplamNot}
              </span>
            )}
          </button>

          {/* Otomatik kaydırma */}
          <button onClick={() => setOtomatikKaydirma(!otomatikKaydirma)} style={barButonStil(otomatikKaydirma)}>
            {otomatikKaydirma ? <Pause size={15} /> : <Play size={15} />}
          </button>

          {/* Hız — sadece otomatik aktifken */}
          {otomatikKaydirma && (
            <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
              <button onClick={() => setKaydirmaHizi(Math.max(1, kaydirmaHizi - 1))} style={{ ...barButonStil(), padding: "2px" }}>
                <Minus size={13} />
              </button>
              <span style={{ fontSize: "12px", color: theme.textSecondary }}>{kaydirmaHizi}</span>
              <button onClick={() => setKaydirmaHizi(Math.min(20, kaydirmaHizi + 1))} style={{ ...barButonStil(), padding: "2px" }}>
                <Plus size={13} />
              </button>
            </div>
          )}
        </>
      )}

      {/* Sağ taraf */}
      <div style={{ marginLeft: "auto", display: "flex", gap: "4px", alignItems: "center" }}>
        {/* Sade mod */}
        <button onClick={() => setSadeMode(!sadeMode)} style={{ ...barButonStil(sadeMode), padding: "4px" }} title="Sade mod">
          <AlignJustify size={15} />
        </button>

        {/* Tema */}
        <button onClick={() => togglePanel(setTemaAcik, !temaAcik)} style={{ ...barButonStil(temaAcik), padding: "4px" }} title="Tema">
          <Palette size={15} />
        </button>

        {/* Ayarlar */}
        <button onClick={() => togglePanel(setAyarlarAcik, !ayarlarAcik)} style={{ ...barButonStil(ayarlarAcik), padding: "4px" }} title="Ayarlar">
          <Pencil size={15} />
        </button>
      </div>
    </div>
  )

  // ════════════════════════════════════════════════════════════════════════════
  // RENDER
  // ════════════════════════════════════════════════════════════════════════════
  return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column", background: theme.background }}>

      {/* Özel tema tam ekran modal (ayarlar panelinden tetiklenir) */}
      {/* → Artık AyarlarPanel içinde inline, ayrı modal yok */}

      {barKonum === "ust" && Bar}

      {SayfaGitPopup}
      {AaPanel}
      {NotPanel}
      {TemaPanel}
      {AyarlarPanel}

      {/* Lügat popup */}
      {popup && (
        <>
          <div onClick={() => setPopup(null)} style={{ position: "fixed", inset: 0, zIndex: 299 }} />
          <div style={{
            position: "fixed",
            left: popup.x,
            top: popup.y,
            background: theme.surface,
            border: `1px solid ${theme.border}`,
            borderRadius: "12px",
            padding: "14px 18px",
            zIndex: 300,
            maxWidth: "280px",
            boxShadow: "0 8px 24px rgba(0,0,0,0.15)",
            animation: "fadeIn 0.15s ease",
          }}>
            <div style={{ color: theme.accent, fontWeight: "bold", fontSize: "16px", marginBottom: "6px" }}>{popup.kelime}</div>
            <div style={{ color: theme.textSecondary, fontSize: "14px", lineHeight: "1.5" }}>{popup.anlam}</div>
          </div>
        </>
      )}

      {/* Ana içerik */}
      <div
        ref={scrollRef}
        onClick={icerikTiklandi}
        onMouseDown={() => setDuraklatildi(true)}
        onMouseUp={() => setDuraklatildi(false)}
        onTouchStart={dokunusBasladi}
        onTouchEnd={dokunusBitti}
        style={{
          flex: 1,
          overflowY: "auto",
          userSelect: "none",
          padding: `${barKonum === "ust" ? "80px" : "24px"} 0 ${barKonum === "alt" ? "80px" : "24px"}`,
        }}
      >
        <div style={{ maxWidth: "680px", margin: "0 auto", padding: "0 24px" }}>
          {/* Kitap başlığı */}
          <div style={{ textAlign: "center", marginBottom: "48px", paddingTop: "24px" }}>
            <h1 style={{ fontSize: "48px", color: theme.accent, marginBottom: "8px", fontFamily: "LivaNur, serif" }}>
              {kitap.baslik}
            </h1>
            <p style={{ color: theme.textSecondary, fontSize: "14px" }}>{kitap.yazar}</p>
          </div>

          {/* Sayfalar */}
          {kitapMetni.map((sayfa, index) => (
            <div key={sayfa.sayfa} ref={el => { if (el) sayfaRefs.current[sayfa.sayfa] = el }}>
              <MetinParcasi
                metin={sayfa.metin}
                lugatAktif={lugatActive}
                onKelimeTikla={kelimeTikla}
                theme={theme}
                fontSize={yaziBoyutu}
                hizalama={hizalama}
                fontStyle={seciliFont.style}
              />

              {/* Sayfa notu göstergesi */}
              {notlar[sayfa.sayfa]?.length > 0 && (
                <div
                  onClick={() => { setMevcutSayfa(sayfa.sayfa); togglePanel(setNotAcik, true) }}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "4px",
                    fontSize: "11px",
                    color: theme.accent,
                    cursor: "pointer",
                    marginBottom: "4px",
                    opacity: 0.8,
                  }}
                >
                  <StickyNote size={11} />
                  {notlar[sayfa.sayfa].length} not
                </div>
              )}

              {/* Sayfa ayracı */}
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
