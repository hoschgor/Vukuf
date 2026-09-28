import { createContext, useContext, useEffect, useRef, useState } from "react"
import { themes, defaultTheme, defaultCustomTheme, ESKI_TEMALAR } from "./styles/themes"

const AppContext = createContext()

/* ═══════════════════════════════════════════════════════════════════════════
   TON SEÇİCİ (28 Eylül 2026) — Aydınlık · Karanlık · Otomatik

   Temalar artık iki TONA ayrılıyor. Ton temanın adından değil ZEMİN RENGİNİN
   parlaklığından hesaplanıyor (`temaTonu`) — böylece Özel tema da kendi
   rengine göre doğru tarafa düşüyor, themes.js'e yeni alan gerekmiyor.

   Her ton KENDİ FAVORİSİNİ hatırlar (`vukuf-ton-favori`): gündüz Sepya, gece
   Kahve gibi. Ton anahtarına basmak doğrudan o tonun favorisine geçirir.

   OTOMATİK: cihazın açık/koyu ayarını (`prefers-color-scheme`) izler ve o
   tonun favorisini uygular. Bu modda tema seçmek yalnız o TONUN favorisini
   değiştirir; seçilen tema cihazın şu anki tonundaysa hemen uygulanır, değilse
   o ton gelince uygulanır (seçicide iki grup ayrı başlıkla gösteriliyor).

   ESKİ KULLANICI İÇİN DAVRANIŞ DEĞİŞMEZ: `vukuf-ton-modu` yoksa mod, kayıtlı
   temanın tonu kabul edilir; Otomatik'i kullanıcı kendisi seçmedikçe tema
   kendiliğinden değişmez.
   ═══════════════════════════════════════════════════════════════════════════ */

const TON_MODU_ANAHTAR = "vukuf-ton-modu"      // "acik" | "koyu" | "oto"
const TON_FAVORI_ANAHTAR = "vukuf-ton-favori"  // { acik: id, koyu: id }
const VARSAYILAN_FAVORI = { acik: "sepia", koyu: "kehribar" }

function oku(anahtar) {
  try { return localStorage.getItem(anahtar) } catch { return null }
}
function yaz(anahtar, deger) {
  try { localStorage.setItem(anahtar, deger) } catch {}
}

// #rgb / #rrggbb → göreli parlaklık (WCAG). Okunamazsa null.
function parlaklik(hex) {
  if (typeof hex !== "string") return null
  let h = hex.trim().replace("#", "")
  if (h.length === 3) h = h.split("").map(c => c + c).join("")
  if (!/^[0-9a-f]{6}$/i.test(h)) return null
  const k = [0, 2, 4].map(i => {
    const c = parseInt(h.slice(i, i + 2), 16) / 255
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * k[0] + 0.7152 * k[1] + 0.0722 * k[2]
}

// Bir tema nesnesinin tonu. Eşik 0.3 — DalSusu'nun koyu/açık ayrımıyla aynı.
export function temaTonu(tema) {
  const l = parlaklik(tema?.background)
  return l !== null && l < 0.3 ? "koyu" : "acik"
}

function sistemKoyuMu() {
  try { return window.matchMedia("(prefers-color-scheme: dark)").matches } catch { return false }
}

function temaVarMi(id) {
  return id === "custom" || Object.prototype.hasOwnProperty.call(themes, id)
}

// Kaldırılmış tema kimliği (light, dark, night, coffee, highcontrast) →
// yerine gelen tema. Kayıtta ya da yedekten dönen veride eski kimlik olabilir.
function cevir(id) {
  return (id && ESKI_TEMALAR[id]) || id
}

export function AppProvider({ children }) {
  const [customTheme, setCustomTheme] = useState(() => {
    try {
      const kayitli = oku("vukuf-ozel-tema")
      return kayitli ? JSON.parse(kayitli) : defaultCustomTheme
    } catch { return defaultCustomTheme }
  })
  // "custom" seçilirken tonunu doğru hesaplamak için EN GÜNCEL özel tema.
  // ozelTemaKaydet ardından aynı tıklamada setCurrentTheme("custom") çağrılırsa
  // (OkumaEkrani böyle yapıyor) state henüz güncellenmemiş olur; ref olur.
  const ozelRef = useRef(customTheme)

  const temaNesnesi = (id) => (id === "custom" ? ozelRef.current : themes[id])

  // Kayıtlı tema (eski anahtar, aynen). Geçersizse varsayılan.
  // (lazy state: localStorage her çizimde değil, yalnız ilk açılışta okunur)
  const [kayitliTema] = useState(() => {
    const t = cevir(oku("vukuf-tema"))
    return t && temaVarMi(t) ? t : defaultTheme
  })

  const [sistemTonu, setSistemTonu] = useState(() => (sistemKoyuMu() ? "koyu" : "acik"))

  const [tonModu, setTonModu] = useState(() => {
    const m = oku(TON_MODU_ANAHTAR)
    if (m === "acik" || m === "koyu" || m === "oto") return m
    return temaTonu(temaNesnesi(kayitliTema))
  })

  const [tonFavori, setTonFavori] = useState(() => {
    let f = null
    try { f = JSON.parse(oku(TON_FAVORI_ANAHTAR) || "null") } catch {}
    if (f) f = { acik: cevir(f.acik), koyu: cevir(f.koyu) }
    const kayitliTon = temaTonu(temaNesnesi(kayitliTema))
    return {
      acik: f && temaVarMi(f.acik) ? f.acik : (kayitliTon === "acik" ? kayitliTema : VARSAYILAN_FAVORI.acik),
      koyu: f && temaVarMi(f.koyu) ? f.koyu : (kayitliTon === "koyu" ? kayitliTema : VARSAYILAN_FAVORI.koyu),
    }
  })

  // İlk çizimde Otomatik moddaysa DOĞRUDAN doğru tema — önce eskisini boyayıp
  // sonra değiştirmek açılışta renk çakması yapardı.
  const [currentTheme, setCurrentThemeHam] = useState(() =>
    tonModu === "oto" ? tonFavori[sistemTonu] : kayitliTema
  )

  const [lugatActive, setLugatActive] = useState(true)

  const [isaretler, setIsaretler] = useState(() => {
    try {
      const kayitli = oku("vukuf-isaretler")
      return kayitli ? JSON.parse(kayitli) : {}
    } catch { return {} }
  })

  const theme = currentTheme === "custom" ? customTheme : (themes[currentTheme] || themes[defaultTheme])

  function temaUygula(id) {
    setCurrentThemeHam(id)
    yaz("vukuf-tema", id)
  }

  function favoriYaz(ton, id) {
    setTonFavori(prev => {
      if (prev[ton] === id) return prev
      const yeni = { ...prev, [ton]: id }
      yaz(TON_FAVORI_ANAHTAR, JSON.stringify(yeni))
      return yeni
    })
  }

  // Görünen tema her değiştiğinde kayda da yazılsın. Otomatik modda ilk çizim
  // doğrudan favoriyle başladığı için temaUygula hiç çağrılmayabiliyor; bu
  // olmasa `vukuf-tema` eski değerde kalırdı (yedekte yanlış tema görünürdü).
  useEffect(() => { yaz("vukuf-tema", currentTheme) }, [currentTheme])

  // ── Cihazın açık/koyu ayarını izle ─────────────────────────────────────────
  useEffect(() => {
    let mq
    try { mq = window.matchMedia("(prefers-color-scheme: dark)") } catch { return }
    const dinle = () => setSistemTonu(mq.matches ? "koyu" : "acik")
    dinle()
    if (mq.addEventListener) mq.addEventListener("change", dinle)
    else if (mq.addListener) mq.addListener(dinle)          // eski Safari
    return () => {
      if (mq.removeEventListener) mq.removeEventListener("change", dinle)
      else if (mq.removeListener) mq.removeListener(dinle)
    }
  }, [])

  // ── Otomatik mod: cihaz tonu ya da favori değişince uygula ────────────────
  useEffect(() => {
    if (tonModu !== "oto") return
    const hedef = tonFavori[sistemTonu]
    if (hedef && hedef !== currentTheme) temaUygula(hedef)
    // currentTheme bilerek bağımlılıkta yok: kullanıcı elle değiştirirse
    // temaDegistir zaten favoriyi güncelliyor; burası yalnız ton/favori olayına bakar.
  }, [tonModu, sistemTonu, tonFavori])

  // Tema seçimi — dışarıya eski adla (`setCurrentTheme`) veriliyor, çağıranlar değişmedi.
  function temaDegistir(istenen) {
    const yeniTema = cevir(istenen)
    if (!temaVarMi(yeniTema)) return
    const ton = temaTonu(temaNesnesi(yeniTema))
    favoriYaz(ton, yeniTema)
    if (tonModu === "oto") {
      // Otomatik modda yalnız cihazın şu anki tonundaki seçim ekrana yansır.
      if (ton === sistemTonu) temaUygula(yeniTema)
      return
    }
    temaUygula(yeniTema)
    if (ton !== tonModu) {
      setTonModu(ton)
      yaz(TON_MODU_ANAHTAR, ton)
    }
  }

  // Ton anahtarı: "acik" | "koyu" | "oto"
  function tonSec(mod) {
    if (mod !== "acik" && mod !== "koyu" && mod !== "oto") return
    setTonModu(mod)
    yaz(TON_MODU_ANAHTAR, mod)
    const hedef = tonFavori[mod === "oto" ? sistemTonu : mod]
    if (hedef && hedef !== currentTheme) temaUygula(hedef)
  }

  function ozelTemaKaydet(yeniTema) {
    const kaydedilen = { ...yeniTema, name: "Özel" }
    ozelRef.current = kaydedilen
    setCustomTheme(kaydedilen)
    yaz("vukuf-ozel-tema", JSON.stringify(kaydedilen))
    temaDegistir("custom")
  }

  function isaret_ekle(kitapId, sayfaNo) {
    setIsaretler(prev => {
      const yeni = {
        ...prev,
        [kitapId]: [...(prev[kitapId] || []), sayfaNo].filter((v, i, a) => a.indexOf(v) === i)
      }
      yaz("vukuf-isaretler", JSON.stringify(yeni))
      return yeni
    })
  }

  function isaret_sil(kitapId, sayfaNo) {
    setIsaretler(prev => {
      const yeni = {
        ...prev,
        [kitapId]: (prev[kitapId] || []).filter(s => s !== sayfaNo)
      }
      yaz("vukuf-isaretler", JSON.stringify(yeni))
      return yeni
    })
  }

  return (
    <AppContext.Provider
      value={{
        theme,
        currentTheme,
        setCurrentTheme: temaDegistir,
        customTheme,
        ozelTemaKaydet,
        // Ton seçici
        tonModu,
        tonSec,
        tonFavori,
        sistemTonu,
        lugatActive,
        setLugatActive,
        isaretler,
        isaret_ekle,
        isaret_sil,
      }}
    >
      <div style={{
        minHeight: "100vh",
        background: theme.background,
        color: theme.text,
        // "all" DEĞİL: bu sarmalayıcıda minHeight 100vh var ve `transition: all`
        // ekran ölçüsü değiştiğinde (dönme!) YÜKSEKLİĞİ de 0.3 sn animasyonluyor
        // — dönme anında gereksiz yerleşim çalkantısı çıkarıyor. Tema geçişi için
        // yalnız renkleri animasyonlamak yeterli.
        transition: "background-color 0.3s ease, color 0.3s ease",
      }}>
        {children}
      </div>
    </AppContext.Provider>
  )
}

export function useApp() {
  return useContext(AppContext)
}
