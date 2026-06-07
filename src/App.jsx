import { Routes, Route, useLocation } from "react-router-dom"
import Navbar from "./components/Navbar"
import Kutuphane from "./pages/Kutuphane"
import Lugat from "./pages/Lugat"
import Tefeul from "./pages/Tefeul"
import OkumaEkrani from "./pages/OkumaEkrani"
import { useApp } from "./AppContext"

export default function App() {
  const { theme } = useApp()
  const location = useLocation()
  const okumadaMiyiz = location.pathname.startsWith("/kitap/")

  return (
    <div style={{ minHeight: "100vh", background: theme.background }}>
      {!okumadaMiyiz && <Navbar />}
      <Routes>
        <Route path="/" element={<Kutuphane />} />
        <Route path="/lugat" element={<Lugat />} />
        <Route path="/tefeul" element={<Tefeul />} />
        <Route path="/kitap/:id" element={<OkumaEkrani />} />
      </Routes>
    </div>
  )
}