import { useState, useEffect, useRef, useCallback, useMemo } from "react"
import { useNavigate } from "react-router-dom"
import { useApp } from "../AppContext"
import { useVirtualizer } from "@tanstack/react-virtual"
import arapcaLugat from "../data/arapca-lugat.json"
import { ArrowLeft, BookOpen, X, Search, ChevronDown, ChevronUp } from "lucide-react"

function harekeSil(k) {
  return k.replace(/[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06DC\u06DF-\u06E4\u06E7\u06E8\u06EA-\u06ED\u06E1\u0671]/g, "")
}

export default function KuranOkuma({ kitap }) {
  const { theme } = useApp()
  const navigate = useNavigate()
  const scrollRef = useRef(null)

  // ── Veri
  const [kitapMetni, setKitapMetni] = useState([])
  const [yukleniyor, setYukleniyor] = useState(true)

  // ── Popup
  const [popup, setPopup] = useState(null)

  // ── Yazı boyutu
  const [yaziBoyutu, setYaziBoyutu] = useState(() =>
    parseInt(localStorage.getItem("vukuf-yazi-boyutu") || "16")
  )

  // ── Sure navigasyon
  const [navAcik, setNavAcik] = useState(false)
  const [navArama, setNavArama] = useState("")

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

  // ── Düz satır listesi (virtualizer için)
  const satirlar = useMemo(() => {
    const liste = []
    kuranIslenmiş.forEach(sure => {
      liste.push({ tip: "sure-baslik", sure })
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
      if (s.tip === "sure-baslik") return 80
      return Math.ceil(s.ayet.arapca.length / 25) * 50 + 32
    },
    overscan: 10,
  })

  // ── Sure'ye git
  function sureGit(sureId) {
    const idx = satirlar.findIndex(s => s.tip === "sure-baslik" && s.sure.id === sureId)
    if (idx !== -1) virtualizer.scrollToIndex(idx, { align: "start" })
    setNavAcik(false)
    setNavArama("")
  }

  // ── Kelime tıkla
  const kelimeTikla = useCallback((kelime, anlam, e) => {
    const x = Math.min(e.clientX, window.innerWidth - 300)
    const y = e.clientY + 12 + 200 > window.innerHeight ? e.clientY - 180 : e.clientY + 12
    setPopup({ kelime, anlam, x, y })
  }, [])

  // ── Filtrelenmiş sure listesi
  const filtrelenmisKategoriler = useMemo(() => {
    if (!navArama) return kuranIslenmiş
    return kuranIslenmiş.filter(s =>
      s.isim.toLowerCase().includes(navArama.toLowerCase()) ||
      String(s.id).includes(navArama)
    )
  }, [kuranIslenmiş, navArama])

  if (yukleniyor) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", color: theme.textSecondary }}>
      Yükleniyor...
    </div>
  )

  return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column", background: theme.background }}>

      {/* Üst bar */}
      <div style={{
        display: "flex", alignItems: "center", gap: "12px",
        padding: "12px 20px",
        background: theme.surface,
        borderBottom: `1px solid ${theme.border}`,
        flexShrink: 0,
      }}>
        <button onClick={() => navigate(-1)} style={{ color: theme.textSecondary, display: "flex" }}>
          <ArrowLeft size={20} />
        </button>
        <span style={{ fontSize: "18px", fontFamily: "LivaNur, serif", color: theme.accent, flex: 1 }}>
          {kitap.baslik}
        </span>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <button onClick={() => setYaziBoyutu(v => Math.max(14, v - 2))} style={{ color: theme.textSecondary, fontSize: "13px" }}>A-</button>
          <button onClick={() => setYaziBoyutu(v => Math.min(32, v + 2))} style={{ color: theme.textSecondary, fontSize: "15px" }}>A+</button>
          <button
            onClick={() => setNavAcik(!navAcik)}
            style={{
              display: "flex", alignItems: "center", gap: "4px",
              padding: "6px 12px", borderRadius: "8px",
              background: navAcik ? `${theme.accent}20` : "transparent",
              border: `1px solid ${theme.border}`,
              color: theme.text, fontSize: "13px",
            }}
          >
            <BookOpen size={15} />
            Sureler
            {navAcik ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
          </button>
        </div>
      </div>

      {/* Sure navigasyon paneli */}
      {navAcik && (
        <div style={{
          background: theme.surface,
          borderBottom: `1px solid ${theme.border}`,
          maxHeight: "300px",
          overflowY: "auto",
          flexShrink: 0,
        }}>
          <div style={{ padding: "8px 16px", borderBottom: `1px solid ${theme.border}` }}>
            <div style={{
              display: "flex", alignItems: "center", gap: "8px",
              background: theme.background,
              border: `1px solid ${theme.accent}40`,
              borderRadius: "20px", padding: "6px 12px",
            }}>
              <Search size={13} color={theme.accent} />
              <input
                type="text"
                placeholder="Sure ismi veya numarası..."
                value={navArama}
                onChange={e => setNavArama(e.target.value)}
                autoFocus
                style={{
                  flex: 1, background: "transparent", border: "none",
                  outline: "none", fontSize: "13px", color: theme.text,
                }}
              />
              {navArama && (
                <button onClick={() => setNavArama("")} style={{ color: theme.textSecondary, display: "flex" }}>
                  <X size={13} />
                </button>
              )}
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: "2px", padding: "8px" }}>
            {filtrelenmisKategoriler.map(sure => (
              <button
                key={sure.id}
                onClick={() => sureGit(sure.id)}
                style={{
                  display: "flex", alignItems: "center", gap: "8px",
                  padding: "8px 12px", borderRadius: "6px", textAlign: "left",
                  background: "transparent", border: "none",
                  color: theme.text, cursor: "pointer",
                  transition: "background 0.15s",
                }}
                onMouseEnter={e => e.currentTarget.style.background = `${theme.accent}15`}
                onMouseLeave={e => e.currentTarget.style.background = "transparent"}
              >
                <span style={{ fontSize: "11px", color: theme.accent, minWidth: "24px" }}>{sure.id}.</span>
                <span style={{ fontSize: "13px" }}>{sure.isim}</span>
                <span style={{ fontSize: "10px", color: theme.textSecondary, marginLeft: "auto" }}>{sure.ayetSayisi}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Ana içerik - virtualizer */}
      <div ref={scrollRef} style={{ flex: 1, overflowY: "auto", padding: "0 24px" }}>
        <style>{`.kuran-kelime:hover { background: ${theme.accent}20; border-radius: 3px; }`}</style>
        <div style={{
          height: `${virtualizer.getTotalSize()}px`,
          position: "relative",
          direction: "rtl",
          fontFamily: "Scheherazade New, serif",
          maxWidth: "680px",
          margin: "0 auto",
        }}>
          {virtualizer.getVirtualItems().map(vItem => {
            const satir = satirlar[vItem.index]
            return (
              <div
                key={vItem.key}
                style={{
                  position: "absolute",
                  top: 0, left: 0, right: 0,
                  transform: `translateY(${vItem.start}px)`,
                  padding: "0 4px",
                }}
              >
                {satir.tip === "sure-baslik" ? (
                  <div style={{
                    textAlign: "center",
                    fontSize: "20px",
                    color: theme.accent,
                    borderBottom: `1px solid ${theme.border}`,
                    paddingBottom: "12px",
                    marginBottom: "8px",
                    fontFamily: "PlayfairDisplay, serif",
                    direction: "ltr",
                    paddingTop: satir.sure.id === 1 ? "24px" : "32px",
                  }}>
                    {satir.sure.id}. {satir.sure.isim}
                    <span style={{ fontSize: "13px", color: theme.textSecondary, marginRight: "12px" }}>
                      {satir.sure.yer} · {satir.sure.ayetSayisi} âyet
                    </span>
                  </div>
                ) : (
                  <div style={{
                    lineHeight: "2.4",
                    fontSize: `${yaziBoyutu + 4}px`,
                    color: theme.text,
                    paddingBottom: "8px",
                  }}>
                    <span
                      onClick={(e) => {
                        const x = Math.min(e.clientX, window.innerWidth - 300)
                        const y = e.clientY + 12 + 200 > window.innerHeight ? e.clientY - 180 : e.clientY + 12
                        setPopup({
                          kelime: `${satir.sure.isim} · ${satir.ayet.no}. Âyet`,
                          anlam: satir.ayet.meal || "Meal henüz eklenmemiş",
                          x, y
                        })
                      }}
                      style={{
                        fontSize: "12px",
                        color: theme.accent,
                        marginLeft: "8px",
                        cursor: "pointer",
                        fontFamily: "PlayfairDisplay, serif",
                        direction: "ltr",
                        display: "inline-block",
                        opacity: 0.8,
                      }}
                    >
                      ﴿{satir.ayet.no}﴾
                    </span>
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
