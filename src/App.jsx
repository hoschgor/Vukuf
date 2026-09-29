import { useEffect, useState, lazy, Suspense, Component } from "react"
import { Routes, Route, useLocation } from "react-router-dom"
import Navbar from "./components/Navbar"
import MushafYukleniyorRozeti from "./components/MushafYukleniyorRozeti"
import Kutuphane from "./pages/Kutuphane"
import { useApp } from "./AppContext"
import { swKaydet, swGuncelle } from "./data/cevrimdisi"

/* ═══════════════════════════════════════════════════════════════════════════
   SAYFALAR GEREKTİĞİNDE YÜKLENİYOR (29 Eylül 2026)

   Eskiden bütün sayfalar burada doğrudan içe aktarılıyordu. Sayfaların içe
   aktardığı JSON'lar da (ölçüldü: lügat 2,5 MB, kelime anlamı 2,0 MB, kelime
   eşleme 1,7 MB, kavramlar 1,5 MB, Arapça lügat 1,4 MB, meal 1,1 MB, öbek
   452 KB…) böylece ANA PAKETE giriyordu: uygulama Kitaplık'ı göstermek için
   ~11 MB veriyi indirip JavaScript olarak ayrıştırmak zorundaydı.

   Artık yalnız Kitaplık (açılış sayfası) doğrudan geliyor; ötekiler ilk
   açıldıklarında yükleniyor, kendi JSON'larıyla birlikte ayrı parça olarak.

   ÇEVRİMDIŞI: parçaların hepsi servis işçisi kurulurken önden önbelleğe
   alınıyor (vite.config.js → varlik-listesi.json → sw.js). Bir kez çevrimiçi
   açılmış sürüm internetsiz de her sayfayı açar.

   PARÇA YÜKLENEMEZSE: yeni sürüm yayınlanmış ve eski sayfanın istediği parça
   sunucudan kalkmış olabilir. Bir kez sayfa yenileniyor (yeni index.html yeni
   parça adlarını getirir); ikinci kez de olmazsa hata olduğu gibi çıkıyor —
   sonsuz yenileme döngüsü olmasın diye bayrak oturumda tutuluyor.
   ═══════════════════════════════════════════════════════════════════════════ */
const YENILEME_BAYRAK = "vukuf-parca-yenilendi"
function tembel(yukle) {
  return lazy(() => yukle().then(
    (m) => { try { sessionStorage.removeItem(YENILEME_BAYRAK) } catch { /* yoksay */ } return m },
    (hata) => {
      let yenilendi = false
      try { yenilendi = sessionStorage.getItem(YENILEME_BAYRAK) === "1" } catch { /* yoksay */ }
      if (!yenilendi && navigator.onLine !== false) {
        try { sessionStorage.setItem(YENILEME_BAYRAK, "1") } catch { /* yoksay */ }
        window.location.reload()
        return new Promise(() => {})          // yenilenene kadar bekle
      }
      throw hata
    },
  ))
}

const Lugat        = tembel(() => import("./pages/Lugat"))
const HifzEkrani   = tembel(() => import("./pages/HifzEkrani"))
const Tefeul       = tembel(() => import("./pages/SozTefeul"))
const OkumaTefeulu = tembel(() => import("./pages/OkumaTefeulu"))
const OkumaEkrani  = tembel(() => import("./pages/OkumaEkrani"))
const Arama        = tembel(() => import("./pages/Arama"))
const Hakkinda     = tembel(() => import("./pages/Hakkinda"))
const KuranOkuma   = tembel(() => import("./pages/KuranOkuma"))

/* Parça HİÇ yüklenemezse (çevrimdışı ve önbellekte yok, ya da yenileme de
   yetmedi) beyaz ekran yerine açıklama + iki çıkış. Sayfa değişince sıfırlanır. */
class ParcaHatasi extends Component {
  constructor(p) { super(p); this.state = { hata: null } }
  static getDerivedStateFromError(hata) { return { hata } }
  componentDidUpdate(onceki) {
    if (onceki.yol !== this.props.yol && this.state.hata) this.setState({ hata: null })
  }
  render() {
    if (!this.state.hata) return this.props.children
    const { theme } = this.props
    const dugme = (etiket, tikla, ana) => (
      <button onClick={tikla} style={{
        padding: "9px 16px", borderRadius: "10px", fontSize: "14px", fontFamily: "inherit", cursor: "pointer",
        border: ana ? "none" : `1px solid ${theme.border}`,
        background: ana ? theme.accent : "transparent", color: ana ? "#fff" : theme.text,
      }}>{etiket}</button>
    )
    return (
      <div style={{ padding: "80px 24px", textAlign: "center", color: theme.text }}>
        <div style={{ fontSize: "16px", marginBottom: "8px" }}>Bu bölüm yüklenemedi.</div>
        <div style={{ fontSize: "13px", color: theme.textSecondary, marginBottom: "20px", lineHeight: 1.5 }}>
          {navigator.onLine === false
            ? "İnternet bağlantısı yok ve bu bölüm henüz cihaza indirilmemiş."
            : "Bağlantı kesilmiş ya da uygulama güncellenmiş olabilir."}
        </div>
        <div style={{ display: "flex", gap: "10px", justifyContent: "center" }}>
          {dugme("Yeniden dene", () => window.location.reload(), true)}
          {dugme("Kitaplık", () => { window.location.href = "/" })}
        </div>
      </div>
    )
  }
}

/* Parça yüklenirken: ortada rozet. 180 ms gecikmeli beliriyor — önbellekten
   anında gelen geçişlerde ekran bir kare yanıp sönmesin. */
function SayfaYukleniyor({ theme }) {
  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 50,
      display: "flex", alignItems: "center", justifyContent: "center",
      background: theme.background,
      opacity: 0, animation: "vukufParcaBelir .25s ease .18s forwards",
    }}>
      <style>{`@keyframes vukufParcaBelir { to { opacity: 1 } }`}</style>
      <MushafYukleniyorRozeti size={96} ac={theme.accent} />
    </div>
  )
}

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

  /* ── ÇEVRİMDIŞI / SERVİS İŞÇİSİ ───────────────────────────────────────────
     Kayıt yalnız ÜRETİM derlemesinde yapılıyor; `npm run dev` sırasında servis
     işçisi açık olursa kaynak değişiklikleri önbelleğe takılır ve "değiştirdim
     ama olmadı" saatleri başlar.
     Yeni sürüm hazır olduğunda `skipWaiting` KENDİLİĞİNDEN çağrılmıyor —
     kullanıcı okurken uygulamayı altından çekmek doğru değil. Aşağıdaki çubuk
     çıkıyor, karar ona bırakılıyor. */
  const [guncellemeKaydi, setGuncellemeKaydi] = useState(null)
  useEffect(() => {
    if (!import.meta.env.PROD) return
    swKaydet((kayit) => setGuncellemeKaydi(kayit))
  }, [])
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
      {/* ── YENİ SÜRÜM ÇUBUĞU ─────────────────────────────────────────────
          Okuma ekranlarında da görünüyor (orada Navbar yok) ama ALTTA duruyor
          ki metnin üstünü kapatmasın. Kapatılabiliyor: kullanıcı şimdi
          istemiyorsa bir dahaki açılışta yine karşısına çıkar. */}
      {guncellemeKaydi && (
        <div style={{
          position: "fixed", left: "12px", right: "12px",
          bottom: "calc(12px + env(safe-area-inset-bottom))",
          zIndex: 9000, display: "flex", alignItems: "center", gap: "10px",
          padding: "11px 14px", borderRadius: "12px",
          background: theme.surface, border: `1px solid ${theme.accent}`,
          boxShadow: "0 6px 24px rgba(0,0,0,0.22)",
          maxWidth: "520px", margin: "0 auto",
        }}>
          <span style={{ flex: 1, minWidth: 0, fontSize: "13px", color: theme.text }}>
            Yeni sürüm hazır.
          </span>
          <button
            onClick={() => swGuncelle(guncellemeKaydi)}
            style={{
              padding: "7px 13px", borderRadius: "9px", border: "none",
              background: theme.accent, color: "#fff",
              fontSize: "13px", fontWeight: 600, fontFamily: "inherit", cursor: "pointer",
            }}
          >Güncelle</button>
          <button
            onClick={() => setGuncellemeKaydi(null)}
            aria-label="Şimdilik kapat"
            style={{
              background: "none", border: "none", color: theme.textSecondary,
              cursor: "pointer", fontSize: "13px", fontFamily: "inherit", padding: "4px",
            }}
          >Sonra</button>
        </div>
      )}

      {!okumadaMiyiz && <Navbar />}
      <ParcaHatasi theme={theme} yol={location.pathname}>
      <Suspense fallback={<SayfaYukleniyor theme={theme} />}>
      <Routes>
        <Route path="/" element={<Kutuphane />} />
        <Route path="/lugat" element={<Lugat />} />
        <Route path="/arama" element={<Arama />} />
        <Route path="/kuran" element={<KuranOkuma />} />
        <Route path="/hifz" element={<HifzEkrani />} />
        <Route path="/tefeul" element={<Tefeul />} />
        <Route path="/okuma-tefeul" element={<OkumaTefeulu />} />
        <Route path="/kitap/:id" element={<OkumaEkrani />} />
        <Route path="/hakkinda" element={<Hakkinda />} />
      </Routes>
      </Suspense>
      </ParcaHatasi>
    </div>
  )
}