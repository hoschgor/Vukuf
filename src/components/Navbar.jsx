import { useState } from "react"
import { Link, useLocation } from "react-router-dom"
import { BookOpen, Search, Shuffle, Menu, X, Palette, Pencil, Info, Type, Sparkles } from "lucide-react"
import { useApp } from "../AppContext"
import { useMediaQuery } from "../data/hooks/useMediaQuery"

const temaAciklamalari = {
  sepia: "Göz yormayan sıcak ton",
  light: "Sade beyaz arka plan",
  dark: "Koyu mavi gece modu",
  night: "Tam karanlık mod",
  coffee: "Koyu kahve tonları",
  custom: "Kişisel renk ayarları",
}

const paletRenkleri = [
  { key: "background", label: "Arka Plan" },
  { key: "surface", label: "Yüzey" },
  { key: "text", label: "Yazı" },
  { key: "textSecondary", label: "İkincil Yazı" },
  { key: "accent", label: "Vurgu" },
  { key: "lugatHighlight", label: "Lügat Rengi" },
  { key: "border", label: "Kenarlık" },
]

export default function Navbar() {
  const { theme, currentTheme, setCurrentTheme, customTheme, ozelTemaKaydet } = useApp()
  const location = useLocation()
  const [menuAcik, setMenuAcik] = useState(false)
  const [temaAcik, setTemaAcik] = useState(false)
  const [dinamik, setDinamik] = useState(() => {
    try { return localStorage.getItem("vukuf-dinamik-mod") === "1" } catch { return false }
  })

  // Dinamik mod düğmesi yalnızca Kitaplık sayfasında görünür
  const dinamikGoster = location.pathname === "/"

  function toggleDinamik() {
    setDinamik(prev => {
      const yeni = !prev
      try { localStorage.setItem("vukuf-dinamik-mod", yeni ? "1" : "0") } catch {}
      window.dispatchEvent(new CustomEvent("vukuf-dinamik", { detail: yeni }))
      return yeni
    })
  }
  const [ozelPanelAcik, setOzelPanelAcik] = useState(false)
  const [ozelRenkler, setOzelRenkler] = useState(customTheme)
  const [aktifRenk, setAktifRenk] = useState(null)

  // Ana menü öğeleri (Hakkında hariç)
  const anaNavItems = [
    { path: "/", label: "Kitaplık", icon: BookOpen },
    { path: "/arama", label: "Arama", icon: Search },
    { path: "/lugat", label: "Lügat", icon: Type },
    { path: "/tefeul", label: "Söz Tefeülü", icon: Shuffle },
    { path: "/okuma-tefeul", label: "Okuma Tefeülü", icon: Shuffle },
  ]

  // Alt menü öğesi (Hakkında)
  const altNavItems = [
    { path: "/hakkinda", label: "Hakkında", icon: Info },
  ]

  const temaListesi = [
    { id: "sepia",  label: "Sepya",  renk: "#f4ecd8", aciklama: "Göz yormayan sıcak ton" },
          { id: "light",  label: "Açık",   renk: "#ffffff", aciklama: "Sade beyaz arka plan" },
          { id: "dark",   label: "Koyu",   renk: "#1a1a2e", aciklama: "Koyu mavi gece modu" },
          { id: "night",  label: "Gece",   renk: "#0d0d0d", aciklama: "Tam karanlık mod" },
          { id: "coffee", label: "Kahve",  renk: "#251b04", aciklama: "Koyu kahve tonları" },
          { id: "highcontrast", label: "Yüksek Karşıtlık",  renk: "#eeb311", aciklama: "Koyu zemin üzerinde sarı vurgular" },
          { id: "custom", label: "Özel",   renk: customTheme?.background || "#888", aciklama: "Kişisel renk ayarları" },
  ]

  function ozelPanelAc() {
    setOzelRenkler({ ...customTheme })
    setOzelPanelAcik(true)
    setTemaAcik(false)
  }

  function renkDegistir(key, deger) {
    setOzelRenkler(prev => ({ ...prev, [key]: deger }))
  }

  function kaydet() {
    ozelTemaKaydet(ozelRenkler)
    setOzelPanelAcik(false)
    setAktifRenk(null)
  }

  return (
    <>
      <nav style={{
        background: theme.surface,
        borderBottom: `1px solid ${theme.border}`,
        padding: "0 20px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        height: "42px",
        position: "sticky",
        top: 0,
        zIndex: 100,
      }}>
        {/* Hamburger */}
        <button
          onClick={() => { setMenuAcik(!menuAcik); setTemaAcik(false) }}
          style={{ color: theme.textSecondary, padding: "6px", borderRadius: "8px", display: "flex", alignItems: "center" }}
        >
          {menuAcik ? <X size={20} /> : <Menu size={20} />}
        </button>

        {/* Logo */}
        <Link to="/" style={{ color: theme.accent, fontSize: "20px", fontWeight: "bold", letterSpacing: "3px" }}>
          VUKUF
        </Link>

        {/* Sağ grup: Dinamik + Tema */}
        <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
        {/* Dinamik mod (yalnızca Kitaplık sayfasında) */}
        {dinamikGoster && (
          <button
            onClick={toggleDinamik}
            title="Dinamik görünüm"
            aria-label="Dinamik görünüm"
            style={{
              color: dinamik ? theme.accent : theme.textSecondary,
              padding: "6px",
              borderRadius: "8px",
              display: "flex",
              alignItems: "center",
              background: dinamik ? `${theme.accent}15` : "transparent",
            }}
          >
            <Sparkles size={18} />
          </button>
        )}

        {/* Tema seçici */}
        <div style={{ position: "relative" }}>
          <button
            onClick={() => { setTemaAcik(!temaAcik); setMenuAcik(false) }}
            style={{
              color: temaAcik ? theme.accent : theme.textSecondary,
              padding: "6px",
              borderRadius: "8px",
              display: "flex",
              alignItems: "center",
              background: temaAcik ? `${theme.accent}15` : "transparent",
            }}
          >
            <Palette size={18} />
          </button>

          {/* Tema dropdown */}
          {temaAcik && (
            <>
              <div onClick={() => setTemaAcik(false)} style={{ position: "fixed", inset: 0, zIndex: 150 }} />
              <div style={{
                position: "absolute",
                top: "40px",
                right: 0,
                background: theme.surface,
                border: `1px solid ${theme.border}`,
                borderRadius: "12px",
                padding: "8px",
                zIndex: 200,
                minWidth: "200px",
                boxShadow: "0 4px 20px rgba(0,0,0,0.15)",
              }}>
                {temaListesi.map(t => (
                  <button
                    key={t.id}
                    onClick={() => {
                      if (t.id === "custom") {
                        ozelPanelAc()
                      } else {
                        setCurrentTheme(t.id)
                        setTemaAcik(false)
                      }
                    }}
                    style={{
                      width: "100%",
                      display: "flex",
                      alignItems: "center",
                      gap: "10px",
                      padding: "8px 12px",
                      borderRadius: "8px",
                      fontSize: "13px",
                      color: currentTheme === t.id ? theme.accent : theme.text,
                      background: currentTheme === t.id ? `${theme.accent}15` : "transparent",
                      cursor: "pointer",
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
                    <span style={{ flex: 1, textAlign: "left" }}>{t.label}</span>
                    {t.id === "custom" && (
                      <Pencil size={12} color={theme.textSecondary} />
                    )}
                    {currentTheme === t.id && t.id !== "custom" && (
                      <span style={{ fontSize: "10px", color: theme.accent }}>✓</span>
                    )}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
        </div>
      </nav>

      {/* Özel tema paneli */}
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

            {/* Renk paleti */}
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {paletRenkleri.map(palet => (
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
                        boxShadow: aktifRenk === palet.key ? `0 0 0 2px ${theme.accent}40` : "none",
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
                        onChange={(e) => renkDegistir(palet.key, e.target.value)}
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
                        {["#f4ecd8", "#ffffff", "#1a1a2e", "#0d0d0d", "#2c3e50", "#8b5e3c",
                          "#c0392b", "#27ae60", "#2980b9", "#8e44ad", "#d4b896", "#3b2f2f"].map(renk => (
                          <button
                            key={renk}
                            onClick={() => renkDegistir(palet.key, renk)}
                            style={{
                              width: "24px",
                              height: "24px",
                              borderRadius: "24px",
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

            <div style={{
              marginTop: "20px",
              padding: "12px",
              borderRadius: "10px",
              background: ozelRenkler.background,
              border: `1px solid ${ozelRenkler.border}`,
            }}>
              <div style={{ fontSize: "11px", color: theme.textSecondary, marginBottom: "6px", letterSpacing: "1px" }}>
                ÖNİZLEME
              </div>
              <div style={{ fontSize: "13px", color: ozelRenkler.text, marginBottom: "4px" }}>
                Örnek metin rengi
              </div>
              <div style={{ fontSize: "12px", color: ozelRenkler.textSecondary, marginBottom: "6px" }}>
                İkincil metin rengi
              </div>
              <span style={{
                fontSize: "12px",
                color: ozelRenkler.lugatHighlight,
                borderBottom: `1px dotted ${ozelRenkler.lugatHighlight}`,
              }}>
                lügat kelimesi
              </span>
              {" "}
              <span style={{
                fontSize: "12px",
                padding: "2px 8px",
                borderRadius: "4px",
                background: `${ozelRenkler.accent}20`,
                color: ozelRenkler.accent,
              }}>
                vurgu
              </span>
            </div>

            <button
              onClick={kaydet}
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
      )}

      {/* Menü overlay - Hakkında en altta */}
      {menuAcik && (
        <>
          <div
            onClick={() => setMenuAcik(false)}
            style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.3)", zIndex: 150 }}
          />
          <div style={{
            position: "fixed",
            top: 0,
            left: 0,
            bottom: 0,
            width: "240px",
            background: theme.surface,
            borderRight: `1px solid ${theme.border}`,
            zIndex: 200,
            padding: "0px 0",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between", // İçeriği üst ve alt olarak ayırır
          }}>
            {/* Üst kısım - Logo ve ana menü */}
            <div>
              <div style={{ padding: "0 20px 20px", borderBottom: `1px solid ${theme.border}`, marginBottom: "12px" }}>
                <span style={{ color: theme.accent, fontSize: "18px", fontWeight: "bold", letterSpacing: "3px" }}>
                  VUKUF
                </span>
              </div>
              
              {/* Ana menü öğeleri (Kitaplık, Lügat, Tefeül) */}
              {anaNavItems.map(({ path, label, icon: Icon }) => {
                const isActive = location.pathname === path
                return (
                  <Link
                    key={path}
                    to={path}
                    onClick={() => setMenuAcik(false)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "12px",
                      padding: "14px 20px",
                      color: isActive ? theme.accent : theme.text,
                      background: isActive ? `${theme.accent}15` : "transparent",
                      borderLeft: isActive ? `3px solid ${theme.accent}` : "3px solid transparent",
                      fontSize: "15px",
                      transition: "all 0.2s",
                    }}
                  >
                    <Icon size={18} />
                    {label}
                  </Link>
                )
              })}
            </div>

            {/* Alt kısım - Hakkında (çizgi ile ayrılmış) */}
            <div style={{ 
              marginTop: "auto", 
              borderTop: `1px solid ${theme.border}`, 
              paddingTop: "0px",
              marginBottom: "0px",
              marginLeft: "0px",
              marginRight: "0px",
            }}>
              {altNavItems.map(({ path, label, icon: Icon }) => {
                const isActive = location.pathname === path
                return (
                  <Link
                    key={path}
                    to={path}
                    onClick={() => setMenuAcik(false)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",  // Ortalamak için eklendi
                      gap: "8px",                 // Boşluk artırıldı
                      padding: "12px 12px",
                      color: isActive ? theme.accent : theme.textSecondary,
                      background: isActive ? `${theme.accent}15` : "transparent",
                      borderRadius: "8px",        // Yuvarlak köşeler eklendi
                      fontSize: "14px",           // Font biraz büyütüldü
                      transition: "all 0.2s",
                      opacity: 0.9,
                      width: "100%",              // Tam genişlik
                    }}
                  >
                    <Icon size={18} />
                    {label}
                  </Link>
                )
              })}
            </div>
          </div>
        </>
      )}
    </>
  )
}