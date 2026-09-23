import { useEffect, useState } from "react"
import { Routes, Route, useLocation } from "react-router-dom"
import Navbar from "./components/Navbar"
import MushafYukleniyorRozeti from "./components/MushafYukleniyorRozeti"
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

  // ── GİRİŞ ANİMASYONU (splash) — açılışta rozet 2 sn görünür, sonra solarak kalkar.
  // "Giriş Animasyonu" ayarına bağlı (vukuf-giris-animasyonu; varsayılan açık). Alttaki
  // dönen halka splash'ta kapalı (halka={false}) — bu bir marka girişi, "yükleniyor" değil.
  const [girisVar, setGirisVar] = useState(() => {
    try { return localStorage.getItem("vukuf-giris-animasyonu") !== "0" } catch { return true }
  })
  const [girisSoluyor, setGirisSoluyor] = useState(false)
  useEffect(() => {
    if (!girisVar) return
    const t1 = setTimeout(() => setGirisSoluyor(true), 2000)   // 2 sn görün
    const t2 = setTimeout(() => setGirisVar(false), 2620)      // 0.6 sn sol → DOM'dan kalk
    return () => { clearTimeout(t1); clearTimeout(t2) }
    // eslint-disable-next-line
  }, [])

  // Telefon yan çevrilince çentik/güvenli alan (letterbox) beyaz kalmasın:
  // iOS bu alanı html/body arka planıyla boyar → tema rengine ayarla + theme-color
  useEffect(() => {
    const bg = theme.background
    document.documentElement.style.background = bg
    document.body.style.background = bg
    // ══════════════════════════════════════════════════════════════════════
    // theme-color META'SI ARTIK YAZILMIYOR — ÜSTTEKİ ŞERİDİN SEBEBİ BUYDU.
    // ══════════════════════════════════════════════════════════════════════
    // iOS, ana ekrandan açılan uygulamada durum çubuğu alanını `theme-color`
    // ile boyuyor. Burada her tema değişiminde tema arka planı yazıldığı için
    // saatin bulunduğu şerit OPAK bir tema rengi bandı olarak duruyordu; sayfa
    // onun altından başlıyor, üstteki solma perdesi de aşağıda kalıp yalnız
    // ucu görünüyordu ("tema renklerinden bir şey üst kısmı kapatıyor gibi").
    // Aynı renk manifest'te de `theme_color` olarak duruyordu, o da kaldırıldı.
    // Varsa ESKİDEN kalan etiket de siliniyor: kurulu uygulamada head'de kalmış
    // olabilir ve tek başına bandı diri tutar.
    document.querySelectorAll('meta[name="theme-color"]').forEach(m => m.remove())
    // Letterbox/çentik alanının beyaz kalmaması zaten yukarıdaki html+body
    // arka planıyla sağlanıyor; theme-color buna gerekli değil.
    // ══════════════════════════════════════════════════════════════════════
    // VIEWPORT META'SI ARTIK BURADAN YAZILMIYOR — index.html'de SABİT duruyor.
    // ══════════════════════════════════════════════════════════════════════
    // Eskiden burada `viewport-fit=cover` çalışma zamanında meta'ya EKLENİYORDU.
    // Teşhis rozeti, telefon yan çevrildiğinde sayfanın hiç dönmediğini gösterdi:
    //   win 440x894 · scr 440x956 · yon portrait-primary · donme 0
    // yani ekran yatay ama web görünümü 1320px'lik DİKEY geometrisini koruyup
    // sol üste yapışıyor. iOS'ta WKWebView'ın dönmede yeniden yerleşmemesinin
    // bilinen tetikleyicilerinden biri, viewport meta etiketinin ÇALIŞMA ZAMANINDA
    // değiştirilmesidir — özellikle `viewport-fit=cover` sonradan eklendiğinde.
    // Çözüm: meta'ya çalışırken HİÇ dokunma, tek ve sabit bir tanım bırak.
    //
    // >>> YAPILACAK: index.html içindeki viewport satırı tam olarak şu olsun:
    //     <meta name="viewport"
    //           content="width=device-width, initial-scale=1.0, viewport-fit=cover">
    //     (Böylece çentik/kenar görünümü aynen korunur, ama kimse çalışırken
    //      meta'yı yeniden yazmaz.)
    // (theme-color yazımı yukarıda kaldırıldı; gerekçesi orada.)
  }, [theme])
  return (
    <div style={{ minHeight: "100vh", background: theme.background }}>
      {girisVar && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 9999,
          background: theme.background,
          display: "flex", alignItems: "center", justifyContent: "center",
          opacity: girisSoluyor ? 0 : 1,
          transition: "opacity 0.6s ease",
          pointerEvents: girisSoluyor ? "none" : "auto",
        }}>
          <style>{`@keyframes vukufGirisBelir { from { opacity: 0; transform: scale(0.9) } to { opacity: 1; transform: scale(1) } }`}</style>
          <div style={{ animation: "vukufGirisBelir 0.7s cubic-bezier(.22,.61,.36,1)" }}>
            <MushafYukleniyorRozeti size={172} ac={theme.accent} halka={false} />
          </div>
        </div>
      )}
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