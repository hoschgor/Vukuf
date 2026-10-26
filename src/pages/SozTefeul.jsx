import { useEffect, useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import { useApp } from "../AppContext"
import { Shuffle, RefreshCw, SlidersHorizontal, X, BookOpen, ArrowRight } from "lucide-react"
import tefeulMetinleri from "../data/tefeul.json"
import { SURE_ADLARI } from "../data/sureAdlari"
import { useKitaplikModu, gorunenler } from "../components/KitaplikModu"

/* ═══════════════════════════════════════════════════════════════════════════
   26 Ekim 2026 — kullanıcı: "Seçilen raf sistemine göre tefeül bölümü de
   güncellenmeli, kapalı olan kısımlar görüntülenmemeli. Tefeül kısmına Kur'ân-ı
   Kerîm'i de eklesek, rastgele âyete ya da sûreye odaklansa güzel olur."
   • KUR'ÂN-I KERÎM: kartta rastgele bir âyetin meali (data/ayet-meal.json, ilk
     ihtiyaçta yüklenir) ya da bir sûre (adı, sırası, âyet sayısı, ilk âyetin
     meali). "Âyete git" / "Sûreyi aç" Kur'ân ekranını o âyette ya da sûre
     başında açar; oradaki "Tefeüle dön" bu sayfaya getirir ve aynı kart kalır.
     "Tümü"nde sözlerin arasına ara sıra (KURAN_ORANI) karışır; filtreden yalnız
     Kur'ân seçilebilir. Meal ve âyet sayıları veriden; metin uydurulmaz.
   • KİTAPLIK MODU: sözün söyleyeni, kitaplıkta görünen bir rafa/âlime bağlıysa
     görünür (YAZAR_KIMLIKLERI). Risale-i Nûr modunda Bediüzzaman'ın sözleri ve
     Kur'ân; seçilen eserlerde yalnız seçilen raf ve âlimlerinkiler.
   ═══════════════════════════════════════════════════════════════════════════ */

// Sûre başına âyet sayıları (Hafs), 1..114 — OkumaTefeulu.jsx ile aynı
const AYET_SAYILARI = [
  7, 286, 200, 176, 120, 165, 206, 75, 129, 109, 123, 111, 43, 52, 99, 128, 111,
  110, 98, 135, 112, 78, 118, 72, 135, 227, 93, 88, 69, 60, 34, 30, 73, 54, 45,
  83, 182, 88, 75, 85, 54, 53, 89, 59, 37, 35, 38, 29, 18, 45, 60, 49, 62, 55,
  78, 96, 29, 22, 24, 13, 14, 11, 11, 18, 12, 12, 30, 52, 52, 44, 28, 28, 20, 56,
  40, 31, 50, 40, 46, 42, 29, 19, 36, 25, 22, 17, 19, 26, 30, 20, 15, 21, 11, 8,
  8, 19, 5, 8, 8, 11, 11, 8, 3, 9, 5, 4, 7, 3, 6, 3, 5, 4, 5, 6,
]
const KURAN = "Kur'ân-ı Kerîm"
const KURAN_ORANI = 0.15            // "Tümü"nde kartların yaklaşık bu kadarı Kur'ân'dan
const SURE_ORANI = 0.25             // Kur'ân kartlarının bu kadarı sûre, gerisi âyet
const DURUM_ANAHTAR = "vukuf-soz-tefeul-durum"

// Sözün söyleyeni → kitaplıkta bağlı olduğu raflar (r) ve âlimler (a).
// Rafın bütünü ya da bu âlimlerden biri görünüyorsa söz de görünür.
const YAZAR_KIMLIKLERI = {
  "Hadis-i Şerif": { r: ["hadis"] },
  "Hz. Ebû Bekir r.a": { r: ["hadis"] },
  "Hz. Ömer r.a": { r: ["hadis"] },
  "Hz. Osman r.a": { r: ["hadis"] },
  "Hz. Ali r.a": { r: ["hadis"] },
  "İmam-ı Azam Ebû Hanîfe": { a: ["imam-azam", "imam-azam-fikih", "imam-azam-akaid"] },
  "İmam Mâlik": { a: ["imam-malik-fikih", "imam-malik-hadis"] },
  "İmam Şâfiî": { a: ["imam-safii", "imam-safii-usul"] },
  "İmam Ahmed bin Hanbel": { a: ["imam-hanbel"] },
  "İmam Eş'arî": { a: ["imam-esari", "imam-esari-akaid"] },
  "İmam Mâtürîdî": { a: ["imam-maturidi", "imam-maturidi-akaid"] },
  "Abdülkâdir Geylânî": { a: ["abdulkadir-geylani"] },
  "Muhyiddin İbnü'l-Arabî": { a: ["muhyiddin-arabi", "ibn-arabi-diger"] },
  "İmam Rabbânî": { a: ["imam-rabbani"] },
  "Şâh-ı Nakşibend": { a: ["shah-naksbend"] },
  "Ahmed Yesevî": { a: ["ahmed-yesevi"] },
  "Ebû Saîd-i Ebü'l-Hayr": { r: ["tasavvuf"] },
  "Mevlânâ Celâleddîn-i Rûmî": { a: ["mevlana"] },
  "Yunus Emre": { a: ["yunus-emre"] },
  "Hacı Bektaş-ı Velî": { a: ["haci-bektas"] },
  "İmam Gazâlî": { a: ["imam-gazali", "imam-gazali-kelam", "gazali-usul"] },
  "Şehristânî": { a: ["sehristani"] },
  "Bediüzzaman Said Nursî": { r: ["risale"] },
}
// Veride "Hz. Osman r.a r.a" gibi yinelenen ekler var → tek ada indir
const yazarAdi = (y) => String(y || "").replace(/(\s*r\.a)+$/i, " r.a").trim()
function yazarGorunur(yazar, gor) {
  const k = YAZAR_KIMLIKLERI[yazarAdi(yazar)]
  if (!k) return false
  return (k.r || []).some(id => gor.raflar.has(id)) || (k.a || []).some(id => gor.alimler.has(id))
}
const rnd = (n) => Math.floor(Math.random() * n)
let mealBellek = null
const mealYukle = () => (mealBellek ||= import("../data/ayet-meal.json").then(m => m.default).catch(() => null))
function kuranKarti() {
  const sureNo = 1 + rnd(114)
  return Math.random() < SURE_ORANI
    ? { tip: "sure", sureNo }
    : { tip: "ayet", sureNo, ayetNo: 1 + rnd(AYET_SAYILARI[sureNo - 1] || 1) }
}

const kategoriler = {
  "Tümü": [],
  "Hadis-i Şerif": ["Hadis-i Şerif"],
  "Kelam": [
    "İmam-ı Azam Ebû Hanîfe",
    "İmam Mâlik",
    "İmam Şâfiî",
    "İmam Ahmed bin Hanbel",
    "İmam Eş'arî",
    "İmam Mâtürîdî",
  ],
  "Tasavvuf": [
    "Abdülkâdir Geylânî",
    "Muhyiddin İbnü'l-Arabî",
    "İmam Rabbânî",
    "Şâh-ı Nakşibend",
    "Ahmed Yesevî",
    "Ebû Saîd-i Ebü'l-Hayr",
    "Mevlânâ Celâleddîn-i Rûmî",
    "Yunus Emre",
    "Hacı Bektaş-ı Velî",
  ],
  "Kelam & Felsefe": [
    "İmam Gazâlî",
    "Şehristânî",
  ],
  "Halifeler": [
    "Hz. Ebû Bekir r.a",
    "Hz. Ömer r.a",
    "Hz. Osman r.a",
    "Hz. Ali r.a"
  ],
  "Risale-i Nur": [
    "Bediüzzaman Said Nursî",
  ],
}

export default function Tefeul() {
  const { theme } = useApp()
  const navigate = useNavigate()
  const [kMod, kSecim] = useKitaplikModu()
  const tumMod = (kMod || "tum") === "tum"
  const gor = useMemo(() => gorunenler(kMod || "tum", kSecim), [kMod, kSecim])
  const kuranAcik = gor.kuran
  const sozGorunur = (m) => tumMod || yazarGorunur(m.yazar, gor)

  // "Tefeüle dön" ile Kur'ân'dan gelindiyse aynı kart ve filtre geri gelir
  const ilk = useMemo(() => {
    try {
      if (localStorage.getItem("vukuf-tefeul-devam") === "1" && localStorage.getItem("vukuf-tefeul-yol") === "/tefeul") {
        return JSON.parse(localStorage.getItem(DURUM_ANAHTAR) || "null")
      }
    } catch { /* yoksay */ }
    return null
  }, [])
  useEffect(() => {
    try { if (ilk) localStorage.removeItem("vukuf-tefeul-devam"); localStorage.removeItem("vukuf-donus") } catch { /* yoksay */ }
  }, []) // eslint-disable-line

  const [animasyon, setAnimasyon] = useState(false)
  const [filtrePanelAcik, setFiltrePanelAcik] = useState(false)
  const [seciliKategori, setSeciliKategori] = useState(ilk?.seciliKategori || "Tümü")
  const [seciliYazar, setSeciliYazar] = useState(ilk?.seciliYazar || null)
  const [meal, setMeal] = useState(null)

  // Filtre listesi: yalnız kitaplık modunda görünen söyleyenler; Kur'ân en üstte
  const filtreKategorileri = useMemo(() => {
    const gorunen = new Set(tefeulMetinleri.filter(sozGorunur).map(m => yazarAdi(m.yazar)))
    return Object.entries(kategoriler)
      .filter(([k]) => k !== "Tümü")
      .map(([k, liste]) => [k, k === "Hadis-i Şerif" ? [] : liste.filter(y => gorunen.has(y))])
      .filter(([k, liste]) => (k === "Hadis-i Şerif" ? gorunen.has("Hadis-i Şerif") : liste.length > 0))
  }, [gor, tumMod]) // eslint-disable-line

  // Seçili filtreye uyan sözlerin sıra numaraları
  const havuz = useMemo(() => {
    const out = []
    tefeulMetinleri.forEach((m, i) => {
      if (!sozGorunur(m)) return
      const y = yazarAdi(m.yazar)
      if (seciliYazar) { if (y === seciliYazar) out.push(i); return }
      if (seciliKategori === "Tümü") { out.push(i); return }
      if (seciliKategori === "Hadis-i Şerif") { if (y === "Hadis-i Şerif") out.push(i); return }
      if (kategoriler[seciliKategori]?.includes(y)) out.push(i)
    })
    return out
  }, [seciliKategori, seciliYazar, gor, tumMod]) // eslint-disable-line

  function rastgeleKart(onceki = null) {
    if (seciliKategori === KURAN) return kuranAcik ? kuranKarti() : null
    const kuranKatil = seciliKategori === "Tümü" && !seciliYazar && kuranAcik
    if (kuranKatil && (Math.random() < KURAN_ORANI || !havuz.length)) return kuranKarti()
    if (!havuz.length) return null
    let i
    do { i = havuz[rnd(havuz.length)] } while (onceki && onceki.tip === "soz" && i === onceki.index && havuz.length > 1)
    return { tip: "soz", index: i }
  }
  const [kart, setKart] = useState(() => ilk?.kart || null)
  // İlk kart ve mod/filtre değişince geçersiz kalan kart yenilenir
  const kartGecerli = (k) => !!k && (k.tip === "soz"
    ? havuz.includes(k.index)
    : kuranAcik && (seciliKategori === KURAN || (seciliKategori === "Tümü" && !seciliYazar)))
  useEffect(() => {
    if (!kartGecerli(kart)) setKart(rastgeleKart())
  }, [kart, havuz, kuranAcik, seciliKategori]) // eslint-disable-line
  // Filtrenin rafı kapandıysa (mod değişti) "Tümü"ne dön
  useEffect(() => {
    if (seciliKategori === KURAN ? !kuranAcik
      : seciliKategori !== "Tümü" && !filtreKategorileri.some(([k]) => k === seciliKategori)) {
      setSeciliKategori("Tümü"); setSeciliYazar(null)
    }
  }, [filtreKategorileri, kuranAcik]) // eslint-disable-line

  useEffect(() => {
    if (!kart || kart.tip === "soz" || meal) return
    let iptal = false
    mealYukle().then(m => { if (!iptal) setMeal(m || {}) })
    return () => { iptal = true }
  }, [kart, meal])

  function filtreSec(kategori, yazar = null) {
    setSeciliKategori(kategori); setSeciliYazar(yazar); setFiltrePanelAcik(false)
    setKart(null)          // yeni filtreye uygun kart efektle seçilir
  }
  function yeniMetin() {
    setAnimasyon(true)
    setTimeout(() => { setKart(k => rastgeleKart(k)); setAnimasyon(false) }, 300)
  }
  function kuranaGit() {
    if (!kart || kart.tip === "soz") return
    try {
      localStorage.setItem(DURUM_ANAHTAR, JSON.stringify({ kart, seciliKategori, seciliYazar }))
      localStorage.setItem("vukuf-donus", "tefeul")
      localStorage.setItem("vukuf-tefeul-yol", "/tefeul")
      localStorage.setItem("vukuf-kuran-hedef", JSON.stringify(kart.tip === "ayet"
        ? { sureNo: kart.sureNo, ayetNo: kart.ayetNo } : { sureNo: kart.sureNo }))
    } catch { /* yoksay */ }
    navigate("/kuran")
  }

  const mevcutMetin = kart && kart.tip === "soz" ? tefeulMetinleri[kart.index] : null
  const sureAdi = kart && kart.tip !== "soz" ? (SURE_ADLARI[kart.sureNo - 1] || `${kart.sureNo}.`) : ""
  const mealMetni = kart && kart.tip !== "soz" && meal
    ? ((meal[String(kart.sureNo)] || {})[String(kart.tip === "ayet" ? kart.ayetNo : 1)] || "") : null
  const filtreVar = seciliYazar || seciliKategori !== "Tümü"

  const filtreDugmesi = (aktif, ust = false) => ({
    width: "100%", textAlign: "left", padding: ust ? "6px 10px" : "6px 10px 6px 20px", borderRadius: "6px",
    fontSize: ust ? "11px" : "13px", fontWeight: ust ? "bold" : "normal", letterSpacing: ust ? "0.5px" : 0,
    color: aktif ? theme.accent : (ust ? theme.textSecondary : theme.text),
    background: aktif ? `${theme.accent}18` : "transparent",
  })
  const kartKabi = {
    background: theme.surface, border: `1px solid ${theme.border}`, borderRadius: "16px",
    padding: "48px 40px", textAlign: "center",
    opacity: animasyon ? 0 : 1, transform: animasyon ? "translateY(8px)" : "translateY(0)", transition: "all 0.3s ease",
  }

  return (
    <div style={{
      maxWidth: "680px",
      margin: "0 auto",
      padding: "40px 24px",
      minHeight: "calc(100vh - 56px)",
      display: "flex",
      flexDirection: "column",
      justifyContent: "center",
    }}>

      {/* Başlık */}
      <div style={{ marginBottom: "32px" }}>
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "center", gap: "10px",
          position: "relative", marginBottom: filtreVar ? "10px" : "0",
        }}>
          <Shuffle size={20} color={theme.accent} />
          <h1 style={{ fontSize: "22px", color: theme.accent, letterSpacing: "2px" }}>
            Kısa Tefeül Modu
          </h1>

          {/* Filtre ikonu */}
          <button
            onClick={() => setFiltrePanelAcik(!filtrePanelAcik)}
            aria-label="Filtre"
            style={{
              position: "absolute", right: 0, padding: "6px", borderRadius: "8px", display: "flex", alignItems: "center",
              color: filtreVar ? theme.accent : theme.textSecondary,
              background: filtreVar ? `${theme.accent}18` : "transparent",
            }}
          >
            <SlidersHorizontal size={16} />
          </button>

          {/* Filtre paneli — kitaplık modunda kapalı raflar listelenmez */}
          {filtrePanelAcik && (
            <>
              <div onClick={() => setFiltrePanelAcik(false)} style={{ position: "fixed", inset: 0, zIndex: 100 }} />
              <div style={{
                position: "absolute", top: "36px", right: 0, background: theme.surface,
                border: `1px solid ${theme.border}`, borderRadius: "12px", padding: "12px", zIndex: 200,
                minWidth: "220px", boxShadow: "0 4px 20px rgba(0,0,0,0.15)", maxHeight: "400px", overflowY: "auto",
              }}>
                <button onClick={() => filtreSec("Tümü")} style={{ ...filtreDugmesi(!seciliYazar && seciliKategori === "Tümü"), padding: "8px 10px", marginBottom: "4px" }}>
                  Tümü
                </button>
                {kuranAcik && (
                  <div style={{ marginBottom: "8px" }}>
                    <button onClick={() => filtreSec(KURAN)} style={filtreDugmesi(seciliKategori === KURAN, true)}>
                      {KURAN.toLocaleUpperCase("tr-TR")}
                    </button>
                  </div>
                )}
                {filtreKategorileri.map(([kategori, alimListesi]) => (
                  <div key={kategori} style={{ marginBottom: "8px" }}>
                    <button onClick={() => filtreSec(kategori)} style={filtreDugmesi(!seciliYazar && seciliKategori === kategori, true)}>
                      {kategori.toLocaleUpperCase("tr-TR")}
                    </button>
                    {alimListesi.map(alim => (
                      <button key={alim} onClick={() => filtreSec(kategori, alim)} style={filtreDugmesi(seciliYazar === alim)}>
                        {alim}
                      </button>
                    ))}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Seçili filtre badge */}
        {filtreVar && (
          <div style={{ display: "flex", justifyContent: "center" }}>
            <div style={{
              display: "inline-flex", alignItems: "center", gap: "8px", padding: "4px 12px", borderRadius: "20px",
              background: `${theme.accent}18`, border: `1px solid ${theme.accent}40`, fontSize: "13px", color: theme.accent,
            }}>
              <span>{seciliYazar || seciliKategori}</span>
              <button onClick={() => filtreSec("Tümü")} aria-label="Filtreyi kaldır"
                style={{ color: theme.accent, display: "flex", alignItems: "center", padding: "0" }}>
                <X size={14} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Kart */}
      {mevcutMetin ? (
        <div style={kartKabi}>
          <div style={{ fontSize: "64px", color: theme.accent, opacity: 0.3, lineHeight: 1, marginBottom: "16px", fontFamily: "Georgia, serif" }}>
            "
          </div>
          <p style={{ fontSize: "18px", lineHeight: "1.9", color: theme.text, marginBottom: "32px", fontStyle: "italic" }}>
            {mevcutMetin.metin}
          </p>
          <div>
            <div style={{ fontSize: "13px", color: theme.accent, fontWeight: "bold", marginBottom: "4px" }}>
              {yazarAdi(mevcutMetin.yazar)}
            </div>
            <div style={{ fontSize: "12px", color: theme.textSecondary }}>
              {mevcutMetin.kaynak}
            </div>
          </div>
        </div>
      ) : kart && kart.tip !== "soz" ? (
        /* KUR'ÂN KARTI — âyet: meal + yeri; sûre: adı, sırası, âyet sayısı, ilk âyetin meali */
        <div style={kartKabi}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", fontSize: "11px", fontWeight: 700, letterSpacing: "2px", color: theme.accent, marginBottom: "18px" }}>
            <BookOpen size={15} /> {KURAN.toLocaleUpperCase("tr-TR")}
          </div>
          {kart.tip === "sure" && (
            <>
              <div style={{ fontSize: "30px", color: theme.accent, fontFamily: "PlayfairDisplay, serif", fontWeight: 700, lineHeight: 1.25 }}>
                {sureAdi} Sûresi
              </div>
              <div style={{ fontSize: "13px", color: theme.textSecondary, margin: "6px 0 22px" }}>
                {kart.sureNo}. sûre · {AYET_SAYILARI[kart.sureNo - 1]} âyet
              </div>
              <div style={{ fontSize: "11px", letterSpacing: "1px", color: theme.textSecondary, marginBottom: "6px" }}>İLK ÂYETİN MEALİ</div>
            </>
          )}
          <p style={{ fontSize: "18px", lineHeight: "1.9", color: theme.text, margin: "0 0 26px", minHeight: "1.9em" }}>
            {mealMetni == null ? "…" : (mealMetni || "Meal yüklenemedi.")}
          </p>
          {kart.tip === "ayet" && (
            <div style={{ fontSize: "13px", color: theme.accent, fontWeight: "bold", marginBottom: "18px" }}>
              {sureAdi} Sûresi, {kart.ayetNo}. âyet
            </div>
          )}
          <button onClick={kuranaGit} style={{
            display: "inline-flex", alignItems: "center", gap: "8px", padding: "10px 20px", borderRadius: "999px",
            border: "none", background: theme.accent, color: "#fff", fontSize: "14px", fontWeight: 600,
            cursor: "pointer", fontFamily: "inherit",
          }}>
            {kart.tip === "ayet" ? "Âyete git" : "Sûreyi aç"} <ArrowRight size={15} />
          </button>
        </div>
      ) : (
        <div style={{ ...kartKabi, color: theme.textSecondary, opacity: 1, transform: "none" }}>
          {havuz.length || kuranAcik ? "…" : "Kitaplık modunda seçili raflara ait söz bulunmuyor. Ayarlar → Kitaplık modu bölümünden başka raflar seçilebilir."}
        </div>
      )}

      {/* Yeni tefeül butonu */}
      <div style={{ display: "flex", justifyContent: "center", marginTop: "32px" }}>
        <button
          onClick={yeniMetin}
          style={{
            display: "flex", alignItems: "center", gap: "8px", padding: "12px 28px", borderRadius: "10px",
            background: theme.surface, border: `1px solid ${theme.border}`, color: theme.textSecondary,
            fontSize: "14px", transition: "all 0.2s",
          }}
          onMouseEnter={(e) => { e.currentTarget.style.borderColor = theme.accent; e.currentTarget.style.color = theme.accent }}
          onMouseLeave={(e) => { e.currentTarget.style.borderColor = theme.border; e.currentTarget.style.color = theme.textSecondary }}
        >
          <RefreshCw size={16} />
          Yeni Tefeül
        </button>
      </div>
    </div>
  )
}
