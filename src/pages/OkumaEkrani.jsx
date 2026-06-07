import { useState, useEffect, useRef, useCallback } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { useApp } from "../AppContext"
import { kitaplar } from "../data/kitaplar"
import lugatVerisi from "../data/lugat.json"
import {
  ArrowLeft, BookOpen, Eye, EyeOff, Play, Pause,
  Plus, Minus, AlignJustify, MoreHorizontal,
  ChevronsUp, ChevronsDown, Bookmark, Pencil, X
} from "lucide-react"

// Kelimeyi lügatta ara (noktalama temizle)
function kelimeAra(kelime) {
  const temiz = kelime
    .toLowerCase()
    .replace(/[.,!?;:'"()\[\]]/g, "")
    .trim()
  return lugatVerisi[temiz] || null 
}
function uzunlugaGoreBirlestir(satirlar, minUzunluk = 40) {
  const birlesmis = []
  let mevcut = ""
  
  for (const satir of satirlar) {
    const temiz = satir.trim()
    if (!temiz) {
      if (mevcut) birlesmis.push(mevcut)
      mevcut = ""
      continue
    }
    
    if (mevcut && mevcut.length + temiz.length < minUzunluk) {
      mevcut += " " + temiz
    } else {
      if (mevcut) birlesmis.push(mevcut)
      mevcut = temiz
    }
  }
  
  if (mevcut) birlesmis.push(mevcut)
  return birlesmis
}
function MetinParcasi({ metin, lugatAktif, onKelimeTikla, theme, fontSize, hizalama }) {
  const satirlar = metin.split("\n")

  return (
    <div style={{ fontSize: `${fontSize}px` }}>
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

export default function OkumaEkrani() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { theme, currentTheme, setCurrentTheme, lugatActive, setLugatActive, isaretler, isaret_ekle, isaret_sil, customTheme, ozelTemaKaydet } = useApp()

  const [kitapMetni, setKitapMetni] = useState([])
  const [yukleniyor, setYukleniyor] = useState(true)
  const [popup, setPopup] = useState(null) // { kelime, anlam, x, y }
  const [mevcutSayfa, setMevcutSayfa] = useState(1)
  const [yaziBoyutu, setYaziBoyutu] = useState(16)
  const [otomatikKaydirma, setOtomatikKaydirma] = useState(false)
  const [kaydirmaHizi, setKaydirmaHizi] = useState(1)
  const [duraklatildi, setDuraklatildi] = useState(false)
  const animationRef = useRef(null) // YENİ: requestAnimationFrame için
  const sonZamanRef = useRef(0)     // YENİ: zaman bazlı hız için
  const [barKonum, setBarKonum] = useState("alt") // "ust" | "alt"
  const [barGorunur, setBarGorunur] = useState(true)
  const barZamanRef = useRef(null)
  const [sadeMode, setSadeMode] = useState(false)
  const [ayarlarAcik, setAyarlarAcik] = useState(false)
  const [hizalama, setHizalama] = useState("justify") // Varsayılan iki tarafa hizalı
  const [sayfaGitAcik, setSayfaGitAcik] = useState(false)
  const [sayfaGitInput, setSayfaGitInput] = useState("")
  const [scrollTimeout, setScrollTimeout] = useState(null)
  const [ozelPanelAcik, setOzelPanelAcik] = useState(false)
  const [ozelRenkler, setOzelRenkler] = useState(customTheme || {})
  const [aktifRenk, setAktifRenk] = useState(null)
  const dokunusBaslangicRef = useRef(null)
  const kitap = kitaplar.find((k) => k.id === id)
  const scrollRef = useRef(null)
  const otomatikRef = useRef(null)
  const sayfaRefs = useRef({})
  const sonScrollRef = useRef(0)
  const kitapIsaretleri = isaretler[id] || []

function barGoster() {
  setBarGorunur(true)
  if (barZamanRef.current) clearTimeout(barZamanRef.current)
  barZamanRef.current = setTimeout(() => {
    setBarGorunur(false)
  }, 5000)
}

function isaretToggle(sayfaNo) {
  if (kitapIsaretleri.includes(sayfaNo)) {
    isaret_sil(id, sayfaNo)
  } else {
    isaret_ekle(id, sayfaNo)
  }
}

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
  
  // 10px'den az hareket VE 300ms'den kısa süre = tap
  if (dx < 10 && dy < 10 && sure < 300) {
    barGoster()
  }
  
  dokunusBaslangicRef.current = null
}

  // JSON yükle
  useEffect(() => {
    if (!kitap) return
    fetch(`/${kitap.dosya}`)
      .then(r => r.json())
      .then(data => {
        setKitapMetni(data)
        setYukleniyor(false)
      })
      .catch(() => setYukleniyor(false))
  }, [kitap])

  // Alt Barı otomatik gizleme
  useEffect(() => {
    barGoster()
    return () => {
      if (barZamanRef.current) clearTimeout(barZamanRef.current)
    }
  }, [])

  // Scroll takibi — hangi sayfadayız ve bar gizleme
  useEffect(() => {
    const el = scrollRef.current
    if (!el) return

    function onScroll() {
      sonScrollRef.current = el.scrollTop

      // Bar otomatik gizleme
      if (barGorunur) {
        if (scrollTimeout) clearTimeout(scrollTimeout)
        const timeout = setTimeout(() => {
          // Bar'ı göster logic'i buraya gelebilir
        }, 150)
        setScrollTimeout(timeout)
      }

      // Hangi sayfadayız
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
    return () => {
      el.removeEventListener("scroll", onScroll)
      if (scrollTimeout) clearTimeout(scrollTimeout)
    }
  }, [barGorunur, scrollTimeout])

  // Otomatik kaydırma
  useEffect(() => {
    if (!otomatikKaydirma || duraklatildi) {
      if (otomatikRef.current) {
        clearInterval(otomatikRef.current)
        otomatikRef.current = null
      }
      return
    }

    // Sabit 1px kaydır, ama interval süresini değiştir
    // kaydirmaHizi 1 = 200ms aralık (çok yavaş)
    // kaydirmaHizi 10 = 20ms aralık (hızlı)
    const intervalMs = Math.max(20, 220 - (kaydirmaHizi * 20))

    otomatikRef.current = setInterval(() => {
      if (scrollRef.current) {
        scrollRef.current.scrollTop += 1
      }
    }, intervalMs)

    return () => {
      if (otomatikRef.current) {
        clearInterval(otomatikRef.current)
        otomatikRef.current = null
      }
    }
  }, [otomatikKaydirma, kaydirmaHizi, duraklatildi]) // ← duraklatildi eklendi

  // Sayfaya git
  function sayfayaGit(sayfaNo) {
    const ref = sayfaRefs.current[sayfaNo]
    if (ref && scrollRef.current) {
      scrollRef.current.scrollTo({
        top: ref.offsetTop - 80,
        behavior: "smooth",
      })
    }
    setSayfaGitAcik(false)
    setSayfaGitInput("")
  }

  function kelimeTikla(kelime, anlam, e) {
    setPopup({ 
      kelime, 
      anlam, 
      x: e.clientX, 
      y: e.clientY 
    })
  }

  // Popup'ı kapat
  function popupKapat() {
    setPopup(null)
  }

  const themeOrder = ["sepia", "light", "dark", "night"]
  function temaDegistir() {
    const i = themeOrder.indexOf(currentTheme)
    setCurrentTheme(themeOrder[(i + 1) % themeOrder.length])
  }

  if (!kitap) return (
    <div style={{ padding: "40px", color: theme.text }}>Kitap bulunamadı.</div>
  )

  if (yukleniyor) return (
    <div style={{ padding: "40px", color: theme.text }}>Yükleniyor...</div>
  )

  // Bar bileşeni
  const Bar = (
    <div
      style={{
        position: "fixed",
        left: 0,
        right: 0,
        [barKonum === "alt" ? "bottom" : "top"]: 0,
        background: theme.surface,
        borderTop: barKonum === "alt" ? `1px solid ${theme.border}` : "none",
        borderBottom: barKonum === "ust" ? `1px solid ${theme.border}` : "none",
        padding: "8px 16px",
        display: "flex",
        alignItems: "center",
        gap: "8px",
        zIndex: 90,
        flexWrap: "wrap",
        transition: "opacity 0.3s ease",
        opacity: barGorunur ? 1 : 0,
        pointerEvents: barGorunur ? "auto" : "none",
      }}
    >
      {/* Geri */}
      <button
        onClick={() => navigate("/")}
        style={{ 
          color: theme.textSecondary, 
          display: "flex", 
          alignItems: "center", 
          gap: "4px", 
          fontSize: "13px",
          background: "none",
          border: "none",
          cursor: "pointer",
          padding: "4px 8px",
          borderRadius: "6px",
        }}
      >
        <ArrowLeft size={16} />
        Geri
      </button>
      {/* İşaret butonu */}
      <button
        onClick={() => isaretToggle(mevcutSayfa)}
        style={{
          color: kitapIsaretleri.includes(mevcutSayfa) ? theme.accent : theme.textSecondary,
          display: "flex",
          alignItems: "center",
          padding: "4px",
          background: "none",
          border: "none",
          cursor: "pointer",
        }}
        title={kitapIsaretleri.includes(mevcutSayfa) ? "İşareti kaldır" : "İşaret ekle"}
      >
        <Bookmark
          size={16}
          fill={kitapIsaretleri.includes(mevcutSayfa) ? theme.accent : "none"}
        />
      </button>

      {/* Sayfa bilgisi + sayfaya git */}
      <button
        onClick={() => setSayfaGitAcik(!sayfaGitAcik)}
        style={{
          color: theme.text,
          fontSize: "13px",
          padding: "4px 10px",
          borderRadius: "6px",
          background: `${theme.accent}15`,
          display: "flex",
          alignItems: "center",
          gap: "4px",
          border: "none",
          cursor: "pointer",
        }}
      >
        <BookOpen size={13} color={theme.accent} />
        {mevcutSayfa} / {kitapMetni.length}
      </button>

      {!sadeMode && (
        <>
          {/* Lügat toggle */}
          <button
            onClick={() => setLugatActive(!lugatActive)}
            style={{
              color: lugatActive ? theme.accent : theme.textSecondary,
              display: "flex", 
              alignItems: "center", 
              gap: "4px", 
              fontSize: "13px",
              padding: "4px 8px", 
              borderRadius: "6px",
              background: lugatActive ? `${theme.accent}15` : "transparent",
              border: "none",
              cursor: "pointer",
            }}
          >
            {lugatActive ? <Eye size={15} /> : <EyeOff size={15} />}
            Lügat
          </button>

          {/* Yazı boyutu */}
          <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
            <button
              onClick={() => setYaziBoyutu(Math.max(12, yaziBoyutu - 1))}
              style={{ 
                color: theme.textSecondary, 
                padding: "2px",
                background: "none",
                border: "none",
                cursor: "pointer",
              }}
            >
              <Minus size={14} />
            </button>
            <span style={{ fontSize: "12px", color: theme.textSecondary, minWidth: "24px", textAlign: "center" }}>
              {yaziBoyutu}
            </span>
            <button
              onClick={() => setYaziBoyutu(Math.min(28, yaziBoyutu + 1))}
              style={{ 
                color: theme.textSecondary, 
                padding: "2px",
                background: "none",
                border: "none",
                cursor: "pointer",
              }}
            >
              <Plus size={14} />
            </button>
          </div>

          {/* Otomatik kaydırma */}
          <button
            onClick={() => setOtomatikKaydirma(!otomatikKaydirma)}
            style={{
              color: otomatikKaydirma ? theme.accent : theme.textSecondary,
              display: "flex", 
              alignItems: "center", 
              gap: "4px", 
              fontSize: "13px",
              padding: "4px 8px", 
              borderRadius: "6px",
              background: otomatikKaydirma ? `${theme.accent}15` : "transparent",
              border: "none",
              cursor: "pointer",
            }}
          >
            {otomatikKaydirma ? <Pause size={15} /> : <Play size={15} />}
            Otomatik
          </button>

          {/* Hız */}
          {otomatikKaydirma && (
            <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
              <button 
                onClick={() => setKaydirmaHizi(Math.max(1, kaydirmaHizi - 1))} 
                style={{ 
                  color: theme.textSecondary,
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                }}
              >
                <Minus size={13} />
              </button>
              <span style={{ fontSize: "12px", color: theme.textSecondary }}>{kaydirmaHizi}</span>
              <button 
                onClick={() => setKaydirmaHizi(Math.min(20, kaydirmaHizi + 1))} 
                style={{ 
                  color: theme.textSecondary,
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                }}
              >
                <Plus size={13} />
              </button>
            </div>
          )}
        </>
      )}

      {/* Sağ taraf — ayarlar */}
      <div style={{ marginLeft: "auto", display: "flex", gap: "6px", alignItems: "center" }}>
        {/* Sade mod */}
        <button
          onClick={() => setSadeMode(!sadeMode)}
          style={{ 
            color: theme.textSecondary, 
            padding: "4px",
            background: "none",
            border: "none",
            cursor: "pointer",
          }}
          title="Sade mod"
        >
          <AlignJustify size={15} />
        </button>

        {/* Bar gizle/göster */}
        <button
          onClick={() => setBarGorunur(!barGorunur)}
          title={barGorunur ? "Çubuğu gizle" : "Çubuğu göster"}
        >
          <MoreHorizontal size={15} />
        </button>

        {/* Daha fazla ayar */}
        <button
          onClick={() => setAyarlarAcik(!ayarlarAcik)}
          style={{ 
            color: theme.textSecondary, 
            padding: "4px",
            background: "none",
            border: "none",
            cursor: "pointer",
          }}
        >
          <MoreHorizontal size={15} />
        </button>
      </div>

      {/* Ayarlar paneli */}
      {ayarlarAcik && (
  <>
    <div
      onClick={() => setAyarlarAcik(false)}
      style={{ position: "fixed", inset: 0, zIndex: 95 }}
    />
    <div
      style={{
        position: "fixed",
        [barKonum === "alt" ? "bottom" : "top"]: "52px",
        right: "16px",
        background: theme.surface,
        border: `1px solid ${theme.border}`,
        borderRadius: "12px",
        padding: "16px",
        zIndex: 100,
        minWidth: "200px",
        display: "flex",
        flexDirection: "column",
        gap: "12px",
        boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
      }}
    >
      {/* Bar konumu */}
      <div>
        <div style={{ fontSize: "11px", color: theme.textSecondary, marginBottom: "6px" }}>BAR KONUMU</div>
        <div style={{ display: "flex", gap: "6px" }}>
          {["ust", "alt"].map((k) => (
            <button
              key={k}
              onClick={() => setBarKonum(k)}
              style={{
                padding: "6px 12px",
                borderRadius: "6px",
                fontSize: "12px",
                background: barKonum === k ? theme.accent : `${theme.accent}20`,
                color: barKonum === k ? "#fff" : theme.text,
                display: "flex", 
                alignItems: "center", 
                gap: "4px",
                border: "none",
                cursor: "pointer",
              }}
            >
              {k === "ust" ? <ChevronsUp size={13} /> : <ChevronsDown size={13} />}
              {k === "ust" ? "Üst" : "Alt"}
            </button>
          ))}
        </div>
      </div>

      {/* YENİ: Metin hizalama */}
      <div>
        <div style={{ fontSize: "11px", color: theme.textSecondary, marginBottom: "6px" }}>METİN HİZALAMA</div>
        <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
          {[
            { value: "left", label: "Sola" },
            { value: "justify", label: "İki Tarafa" },
            { value: "center", label: "Orta" }
          ].map((h) => (
            <button
              key={h.value}
              onClick={() => setHizalama(h.value)}
              style={{
                padding: "6px 10px",
                borderRadius: "6px",
                fontSize: "12px",
                background: hizalama === h.value ? theme.accent : `${theme.accent}20`,
                color: hizalama === h.value ? "#fff" : theme.text,
                border: "none",
                cursor: "pointer",
              }}
            >
              {h.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tema */}
      <div>
        <div style={{ fontSize: "11px", color: theme.textSecondary, marginBottom: "6px" }}>TEMA</div>
        <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
          {themeOrder.map((t) => (
            <button
              key={t}
              onClick={() => setCurrentTheme(t)}
              style={{
                padding: "6px 10px",
                borderRadius: "6px",
                fontSize: "12px",
                background: currentTheme === t ? theme.accent : `${theme.accent}20`,
                color: currentTheme === t ? "#fff" : theme.text,
                border: "none",
                cursor: "pointer",
              }}
            >
              {t === "sepia" ? "Sepya" : t === "light" ? "Açık" : t === "dark" ? "Koyu" : "Gece"}
            </button>
          ))}
          {/* Özel tema */}
          <div style={{ display: "flex", alignItems: "center", gap: "2px" }}>
            <button
              onClick={() => setCurrentTheme("custom")}
              style={{
                padding: "6px 10px",
                borderRadius: "6px",
                fontSize: "12px",
                background: currentTheme === "custom" ? theme.accent : `${theme.accent}20`,
                color: currentTheme === "custom" ? "#fff" : theme.text,
                border: "none",
                cursor: "pointer",
              }}
            >
              Özel
            </button>
            <button
              onClick={() => {
                setOzelRenkler({ ...customTheme })
                setOzelPanelAcik(true)
                setAyarlarAcik(false)
              }}
              style={{
                padding: "6px 8px",
                borderRadius: "6px",
                background: `${theme.accent}20`,
                color: theme.text,
                border: "none",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
              }}
            >
              <Pencil size={11} />
            </button>
          </div>
      </div>
    </div>
      
      
      {/* Hız göstergesi (otomatik kaydırmadaysa) */}
      {otomatikKaydirma && (
        <div>
          <div style={{ fontSize: "11px", color: theme.textSecondary, marginBottom: "6px" }}>KAYDIRMA HIZI</div>
          <input
            type="range"
            min="1"
            max="50"
            value={kaydirmaHizi}
            onChange={(e) => setKaydirmaHizi(Number(e.target.value))}
            style={{ width: "100%", accentColor: theme.accent }}
                />
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
  // Barı tıklama ile gösterme
  

  // Sayfaya git popup
  const SayfaGitPopup = sayfaGitAcik && (
    <>
      <div
        onClick={() => setSayfaGitAcik(false)}
        style={{ position: "fixed", inset: 0, zIndex: 95 }}
      />
      <div
        style={{
          position: "fixed",
          [barKonum === "alt" ? "bottom" : "top"]: "52px",
          left: "50%",
          transform: "translateX(-50%)",
          background: theme.surface,
          border: `1px solid ${theme.border}`,
          borderRadius: "12px",
          padding: "16px",
          zIndex: 100,
          width: "280px",
          boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
        }}
      >
        <div style={{ fontSize: "12px", color: theme.textSecondary, marginBottom: "10px" }}>
          SAYFAYA GİT (1 - {kitapMetni.length})
        </div>

        {/* Yazarak git */}
        <div style={{ display: "flex", gap: "8px", marginBottom: "12px" }}>
          <input
            type="number"
            min={1}
            max={kitapMetni.length}
            value={sayfaGitInput}
            onChange={(e) => setSayfaGitInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                const no = Math.min(Math.max(1, Number(sayfaGitInput)), kitapMetni.length)
                sayfayaGit(no)
              }
            }}
            placeholder="Sayfa no..."
            style={{
              flex: 1,
              padding: "8px 12px",
              borderRadius: "8px",
              border: `1px solid ${theme.border}`,
              background: theme.background,
              color: theme.text,
              fontSize: "14px",
              outline: "none",
            }}
            autoFocus
          />
          <button
            onClick={() => {
              const no = Math.min(Math.max(1, Number(sayfaGitInput)), kitapMetni.length)
              sayfayaGit(no)
            }}
            style={{
              padding: "8px 14px",
              borderRadius: "8px",
              background: theme.accent,
              color: "#fff",
              fontSize: "13px",
              border: "none",
              cursor: "pointer",
            }}
          >
            Git
          </button>
        </div>

        {/* Kaydırma çubuğu */}
        <input
          type="range"
          min={1}
          max={kitapMetni.length}
          value={mevcutSayfa}
          onChange={(e) => {
            const no = Number(e.target.value)
            setMevcutSayfa(no)
          }}
          onMouseUp={(e) => sayfayaGit(Number(e.target.value))}
          onTouchEnd={(e) => sayfayaGit(Number(e.target.value))}
          style={{ width: "100%", accentColor: theme.accent }}
        />
        {/* İşaretler */}
        {kitapIsaretleri.length > 0 && (
          <div style={{ marginTop: "12px", borderTop: `1px solid ${theme.border}`, paddingTop: "10px" }}>
            <div style={{ fontSize: "11px", color: theme.textSecondary, marginBottom: "8px", letterSpacing: "1px" }}>
              İŞARETLER
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
              {kitapIsaretleri.sort((a, b) => a - b).map(s => (
                <button
                  key={s}
                  onClick={() => sayfayaGit(s)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "4px",
                    padding: "4px 10px",
                    borderRadius: "6px",
                    fontSize: "12px",
                    background: `${theme.accent}18`,
                    color: theme.accent,
                    border: `1px solid ${theme.accent}40`,
                    cursor: "pointer",
                  }}
                >
                  <Bookmark size={11} fill={theme.accent} />
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}
        {/* Anlık sayfa göstergesi */}
        <div style={{
          textAlign: "center",
          fontSize: "16px",
          fontWeight: "bold",
          color: theme.accent,
          marginTop: "8px",
        }}>
          {mevcutSayfa}
        </div>
      </div>
    </>
  )

  return (
    <div 
    style={{ height: "100vh", display: "flex", flexDirection: "column", background: theme.background }}>
      {/* Özel tema paneli - bar dışında */}
      {ozelPanelAcik && (
        <>
          <div
            onClick={() => setOzelPanelAcik(false)}
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
              <button onClick={() => setOzelPanelAcik(false)} style={{ color: theme.textSecondary }}>
                <X size={18} />
              </button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {[
                { key: "background", label: "Arka Plan" },
                { key: "surface", label: "Yüzey" },
                { key: "text", label: "Yazı" },
                { key: "textSecondary", label: "İkincil Yazı" },
                { key: "accent", label: "Vurgu" },
                { key: "lugatHighlight", label: "Lügat Rengi" },
                { key: "border", label: "Kenarlık" },
              ].map(palet => (
                <div key={palet.key}>
                  <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                    <button
                      onClick={() => setAktifRenk(aktifRenk === palet.key ? null : palet.key)}
                      style={{
                        width: "32px",
                        height: "32px",
                        borderRadius: "24px",
                        background: ozelRenkler[palet.key],
                        border: `2px solid ${aktifRenk === palet.key ? theme.accent : theme.border}`,
                        cursor: "pointer",
                        flexShrink: 0,
                      }}
                    />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: "13px", color: theme.text }}>{palet.label}</div>
                      <div style={{ fontSize: "11px", color: theme.textSecondary }}>{ozelRenkler[palet.key]}</div>
                    </div>
                  </div>
                  {aktifRenk === palet.key && (
                    <div style={{ marginTop: "8px", marginLeft: "48px" }}>
                      <input
                        type="color"
                        value={ozelRenkler[palet.key]}
                        onChange={(e) => setOzelRenkler(prev => ({ ...prev, [palet.key]: e.target.value }))}
                        style={{ width: "100%", height: "40px", borderRadius: "8px", border: `1px solid ${theme.border}`, cursor: "pointer", padding: "2px", background: theme.background }}
                      />
                      <div style={{ display: "flex", gap: "6px", marginTop: "8px", flexWrap: "wrap" }}>
                        {["#f4ecd8","#ffffff","#1a1a2e","#0d0d0d","#2c3e50","#8b5e3c","#c0392b","#27ae60","#2980b9","#8e44ad","#d4b896","#3b2f2f"].map(renk => (
                          <button
                            key={renk}
                            onClick={() => setOzelRenkler(prev => ({ ...prev, [palet.key]: renk }))}
                            style={{
                              width: "24px", height: "24px", borderRadius: "32px",
                              background: renk,
                              border: `2px solid ${ozelRenkler[palet.key] === renk ? theme.accent : theme.border}`,
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

            <button
              onClick={() => {
                ozelTemaKaydet(ozelRenkler)
                setOzelPanelAcik(false)
                setAktifRenk(null)
              }}
              style={{
                width: "100%",
                marginTop: "16px",
                padding: "12px",
                borderRadius: "24px",
                background: theme.accent,
                color: "#fff",
                fontSize: "14px",
                cursor: "pointer",
                border: "none",
              }}
            >
              Temayı Kaydet
            </button>
          </div>
        </>
      )}

      {/* Bar üstteyse */}
      {barKonum === "ust" && Bar}

      {SayfaGitPopup}

      {/* Kelime popup */}
      {popup && (
        <>
          <div
            onClick={popupKapat}
            style={{ position: "fixed", inset: 0, zIndex: 299 }}
          />
          <div
            style={{
              position: "fixed",
              left: Math.min(popup.x, window.innerWidth - 300),
              top: popup.y + 12,
              background: theme.surface,
              border: `1px solid ${theme.border}`,
              borderRadius: "12px",
              padding: "14px 18px",
              zIndex: 300,
              maxWidth: "280px",
              boxShadow: "0 8px 24px rgba(0,0,0,0.15)",
              animation: "fadeIn 0.15s ease",
            }}
          >
            <div style={{ color: theme.accent, fontWeight: "bold", fontSize: "16px", marginBottom: "6px" }}>
              {popup.kelime}
            </div>
            <div style={{ color: theme.textSecondary, fontSize: "14px", lineHeight: "1.5" }}>
              {popup.anlam}
            </div>
          </div>
        </>
      )}

      {/* Ana içerik */}
      <div
        ref={scrollRef}
        className={otomatikKaydirma ? "okuma-icerik" : ""}
        onMouseDown={() => setDuraklatildi(true)}
        onMouseUp={() => { setDuraklatildi(false); barGoster() }}
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
            <div
              key={sayfa.sayfa}
              ref={(el) => {
                if (el) sayfaRefs.current[sayfa.sayfa] = el
              }}
            >
              <MetinParcasi
                metin={sayfa.metin}
                lugatAktif={lugatActive}
                onKelimeTikla={kelimeTikla}
                theme={theme}
                fontSize={yaziBoyutu}
                hizalama={hizalama}  // Yeni prop
              />

              {/* Sayfa ayracı */}
              {index < kitapMetni.length - 1 && (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "12px",
                    margin: "32px 0",
                  }}
                >
                  <div style={{ flex: 1, height: "1px", background: theme.border }} />
                  <span style={{ fontSize: "11px", color: theme.textSecondary, opacity: 0.6 }}>
                    {sayfa.sayfa}
                  </span>
                  <div style={{ flex: 1, height: "1px", background: theme.border }} />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Bar alttaysa */}
      {barKonum === "alt" && Bar}
    </div>
  )
}