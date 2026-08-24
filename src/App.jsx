import { useEffect } from "react"
import { Routes, Route, useLocation } from "react-router-dom"
import Navbar from "./components/Navbar"
import Kutuphane from "./pages/Kutuphane"
import Lugat from "./pages/Lugat"
import Tefeul from "./pages/SozTefeul"
import OkumaTefeulu from "./pages/OkumaTefeulu"
import OkumaEkrani from "./pages/OkumaEkrani"
import Arama from "./pages/Arama"
import Hakkinda from "./pages/Hakkinda"
import { useApp } from "./AppContext"
import KuranOkuma from "./pages/KuranOkuma"

export default function App() {
  const { theme } = useApp()
  const location = useLocation()
  const okumadaMiyiz = location.pathname.startsWith("/kitap/") || location.pathname === "/kuran"

  // Telefon yan çevrilince çentik/güvenli alan (letterbox) beyaz kalmasın:
  // iOS bu alanı html/body arka planıyla boyar → tema rengine ayarla + theme-color
  useEffect(() => {
    const bg = theme.background
    document.documentElement.style.background = bg
    document.body.style.background = bg
    let m = document.querySelector('meta[name="theme-color"]')
    if (!m) { m = document.createElement("meta"); m.setAttribute("name", "theme-color"); document.head.appendChild(m) }
    m.setAttribute("content", bg)
    // viewport-fit=cover: içerik fiziksel kenara kadar uzansın (bar/arka plan çentik
    // altına da devam eder). Sıkışmayı önlemek için bar ve içeriğe env(safe-area-inset-*)
    // padding'i okuma ekranında ekli.
    let vp = document.querySelector('meta[name="viewport"]')
    if (!vp) { vp = document.createElement("meta"); vp.setAttribute("name", "viewport"); document.head.appendChild(vp) }
    const icerik = vp.getAttribute("content") || "width=device-width, initial-scale=1"
    if (!/viewport-fit/.test(icerik)) vp.setAttribute("content", icerik + ", viewport-fit=cover")
  }, [theme])
  return (
    <div style={{ minHeight: "100vh", background: theme.background }}>
      {!okumadaMiyiz && <Navbar />}
      <Routes>
        <Route path="/" element={<Kutuphane />} />
        <Route path="/lugat" element={<Lugat />} />
        <Route path="/arama" element={<Arama />} />
        <Route path="/kuran" element={<KuranOkuma />} />
        <Route path="/tefeul" element={<Tefeul />} />
        <Route path="/okuma-tefeul" element={<OkumaTefeulu />} />
        <Route path="/kitap/:id" element={<OkumaEkrani />} />
        <Route path="/hakkinda" element={<Hakkinda />} />
      </Routes>
    </div>
  )
}