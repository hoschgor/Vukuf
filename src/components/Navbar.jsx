import { useState } from "react"
import { Link, useLocation } from "react-router-dom"
import { BookOpen, Search, Shuffle, Menu, X, Palette, Info, Type, Sparkles, Settings, HardDrive, Brain, History, HelpCircle } from "lucide-react"
import { useApp } from "../AppContext"
import { useMediaQuery } from "../data/hooks/useMediaQuery"
import IosSwitch from "./IosSwitch"
import AltSayfa from "./AltSayfa"
import VeriAyarlari from "./VeriAyarlari"
import Katlanir from "./Katlanir"
import TemaSecici from "./TemaSecici"
import { ypDegisken } from "./yatayDuzen"
import { themes } from "../styles/themes"
import { useGecmisAyari, gecmisOku } from "../data/gecmis"
import YardimPaneli from "./YardimPaneli"

/* ═══════════════════════════════════════════════════════════════════════════
   AYARLARIN TEK KAPIDA TOPLANMASI (24 Eylül 2026)

   Eskiden sağ üstte İKİ düğme vardı: Sparkles (yalnız Kitaplık sayfasında
   görünen "Görünüm ayarları") ve Palette (tema açılır menüsü). Veri yedekleme
   eklenince üçüncü bir düğme koymak yerine hepsi TEK DİŞLİ altında toplandı:
       AYARLAR → TEMA · GÖRÜNÜM · VERİLER
   Panel gövdesi yine `AltSayfa` (alttan açılan, sürükleyerek kapanan sayfa) —
   uzun içerikte kendiliğinden `pan-y`ye geçip kaydırmayı doğru yönettiği için
   Veriler bölümü panelin boyunu uzatsa da davranış bozulmuyor.

   NE DEĞİŞMEDİ (bilerek): tema listesi, özel tema modalı, Dinamik Mod ve Giriş
   Animasyonu anahtarları, hamburger menü ve yönlendirmeler AYNEN duruyor.
   Yalnız AÇILDIKLARI YER değişti. Böylece çalışan hiçbir davranış bozulmadı.

   Dinamik Mod satırı artık her sayfada görünüyor (eskiden yalnız "/" idi).
   Ayar Kitaplık'a ait olduğu için açıklamasında bu yazıyor; başka sayfadan
   açılıp kapatılması zararsız, değer localStorage'a yazılıp olay yayınlanıyor.
   ═══════════════════════════════════════════════════════════════════════════ */

/* ── ÜST ÇENTİK EK PAYI — TEK AYAR NOKTASI ──────────────────────────────────
   `env(safe-area-inset-top)` cihazın bildirdiği çentik payıdır; içerik tam o
   çizgide başlar ve görsel olarak saate "yapışık" durur. Kullanıcı birkaç
   piksel daha nefes istedi. Bu sayı o nefes payı:
     BÜYÜT → bar ve içindekiler AŞAĞI iner · KÜÇÜLT → yukarı çıkar · 0 → eski hâl
   Çentiksiz cihazlarda env() 0 döner; orada da bu pay kadar boşluk kalır, o
   yüzden abartılmamalı.
   ⚠ ÜÇ DOSYADA AYNI OLMALI: Navbar.jsx · KuranOkuma.jsx · OkumaEkrani.jsx
   ───────────────────────────────────────────────────────────────────────── */
const UST_CENTIK_EK = 6

const paletRenkleri = [
  { key: "background", label: "Arka Plan" },
  { key: "surface", label: "Yüzey" },
  { key: "text", label: "Yazı" },
  { key: "textSecondary", label: "İkincil Yazı" },
  { key: "accent", label: "Vurgu" },
  { key: "lugatHighlight", label: "Lügat Rengi" },
  { key: "ayetNoRengi", label: "Âyet No Rengi" },
  { key: "border", label: "Kenarlık" },
]

// Panel satırı: başlık + açıklama + anahtar (tüm satır tıklanabilir)
function AyarSatiri({ baslik, aciklama, acik, onToggle, theme }) {
  return (
    <div
      onClick={onToggle}
      role="button"
      aria-pressed={acik}
      style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        gap: "14px", padding: "12px 4px", cursor: "pointer",
      }}
    >
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: "15px", color: theme.text, fontWeight: 500 }}>{baslik}</div>
        {aciklama && <div style={{ fontSize: "12px", color: theme.textSecondary, marginTop: "2px" }}>{aciklama}</div>}
      </div>
      <IosSwitch acik={acik} theme={theme} />
    </div>
  )
}

export default function Navbar() {
  const { theme, currentTheme, customTheme, ozelTemaKaydet, tonModu } = useApp()
  const location = useLocation()
  const isMobile = useMediaQuery("(max-width: 768px)")
  const [menuAcik, setMenuAcik] = useState(false)
  const [ayarlarAcik, setAyarlarAcik] = useState(false)
  // YARDIM (8 Ekim 2026) — ayarların yanındaki (?) düğmesi; kullanım rehberi (YardimPaneli.jsx)
  const [yardimAcik, setYardimAcik] = useState(false)
  // Ayarlar paneli de akordiyon: aynı anda tek bölüm açık, panel kısa kalıyor.
  // TEMA varsayılan olarak açık — en sık dokunulan yer orası.
  const [acikBolum, setAcikBolum] = useState("tema")
  const kapak = (id) => ({
    acik: acikBolum === id,
    onAc: () => setAcikBolum(x => (x === id ? null : id)),
  })

  const [dinamik, setDinamik] = useState(() => {
    try { return localStorage.getItem("vukuf-dinamik-mod") === "1" } catch { return false }
  })
  const [girisAnim, setGirisAnim] = useState(() => {
    try { return localStorage.getItem("vukuf-giris-animasyonu") !== "0" } catch { return true }  // varsayılan AÇIK
  })

  function toggleDinamik() {
    setDinamik(prev => {
      const yeni = !prev
      try { localStorage.setItem("vukuf-dinamik-mod", yeni ? "1" : "0") } catch {}
      window.dispatchEvent(new CustomEvent("vukuf-dinamik", { detail: yeni }))
      return yeni
    })
  }

  /* RAF GÖRÜNÜMÜ (8 Ekim 2026) — Kitaplık raflarının içi: resimli · çizimli · sade.
     Kutuphane.jsx aynı anahtarı okur, değişince olayla hemen güncellenir. */
  const RAF_GORUNUMLERI = [
    { id: "resimli", ad: "Resimli" },
    { id: "cizimli", ad: "Çizimli" },
    { id: "sade",    ad: "Sade" },
  ]
  const [rafGorunum, setRafGorunum] = useState(() => {
    try { const v = localStorage.getItem("vukuf-raf-gorunum"); return v === "cizimli" || v === "sade" ? v : "resimli" } catch { return "resimli" }
  })
  function rafGorunumSec(v) {
    setRafGorunum(v)
    try { localStorage.setItem("vukuf-raf-gorunum", v) } catch {}
    window.dispatchEvent(new CustomEvent("vukuf-raf-gorunum", { detail: v }))
  }

  function toggleGirisAnim() {
    setGirisAnim(prev => {
      const yeni = !prev
      try { localStorage.setItem("vukuf-giris-animasyonu", yeni ? "1" : "0") } catch {}
      return yeni
    })
  }

  /* GEÇMİŞ (4 Ekim 2026) — açıksa ana menüde "Geçmiş" sayfası. Kayıt varken
     kapatılırsa geçmiş silinir; önce sorulur. Ayrıntı: data/gecmis.js */
  const [gecmisAcik, setGecmisAcik] = useGecmisAyari()
  function toggleGecmis() {
    if (gecmisAcik) {
      const n = gecmisOku().length
      if (n && !window.confirm(`Geçmiş kapatılırsa kayıtlı ${n} işlem (aramalar ve okumalar) SİLİNECEK.\n\nKapatılsın mı?`)) return
      setGecmisAcik(false)
    } else setGecmisAcik(true)
  }

  const [ozelPanelAcik, setOzelPanelAcik] = useState(false)
  const [ozelRenkler, setOzelRenkler] = useState(customTheme)
  const [aktifRenk, setAktifRenk] = useState(null)

  // Ana menü öğeleri (Hakkında hariç)
  const anaNavItems = [
    { path: "/", label: "Kitaplık", icon: BookOpen },
    { path: "/arama", label: "Arama", icon: Search },
    { path: "/lugat", label: "Lügat", icon: Type },
    { path: "/hifz", label: "Hıfz", icon: Brain },
    { path: "/tefeul", label: "Söz Tefeülü", icon: Shuffle },
    { path: "/okuma-tefeul", label: "Okuma Tefeülü", icon: Shuffle },
    // Geçmiş yalnız ayarı açıkken (Ayarlar → Geçmiş)
    ...(gecmisAcik ? [{ path: "/gecmis", label: "Geçmiş", icon: History }] : []),
  ]

  // Alt menü öğesi (Hakkında)
  const altNavItems = [
    { path: "/hakkinda", label: "Hakkında", icon: Info },
  ]

  // Tema listesi artık TemaSecici.jsx'te (üç ekranda ortak). Burada yalnız özet.
  const temaAdi = currentTheme === "custom" ? "Özel" : (themes[currentTheme]?.name || "")
  const temaOzeti = tonModu === "oto" ? `${temaAdi} · otomatik` : temaAdi

  function ozelPanelAc() {
    setOzelRenkler({ ...customTheme })
    setOzelPanelAcik(true)
    setAyarlarAcik(false)       // iki katman üst üste binmesin
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
      {/* ── ÇENTİK PAYI (24 Eylül 2026) ─────────────────────────────────────
          index.html'e `apple-mobile-web-app-status-bar-style: black-translucent`
          eklendiğinden beri içerik ekranın GERÇEK tepesinden (y=0) başlıyor.
          Navbar `height: 42px` + `top: 0` ile tamamen durum çubuğunun (saatin)
          altında kalıyor ve hiç görünmüyordu.
          ÇÖZÜM: barın kendisi çentik şeridini de KAPLASIN — üstte düz `theme.surface`
          zemin, altında ayırıcı çizgi. Okuma ekranlarındaki bar da aynı kuralla
          çalışıyor (`paddingTop: max(5px, env(safe-area-inset-top))`), böylece
          uygulama genelinde tek davranış var.
          `height` YERİNE `minHeight`: `* { box-sizing: border-box }` yüzünden sabit
          height + paddingTop, içeriği 42px'in içine sıkıştırıp ezerdi.
          Çentiksiz cihazlarda env() 0 döner, görünüm bugünküyle birebir aynı kalır.

          ⚠ BUNA BAĞLI YER: Arama.jsx'te sticky üst blok `top: "42px"` varsayıyor.
          Navbar artık 42px + çentik payı kadar; o dosyada da
          `calc(42px + env(safe-area-inset-top))` yazılmalı, yoksa arama kutusu
          navbar'ın ALTINDA kalır. */}
      <nav style={{
        background: theme.surface,
        borderBottom: `1px solid ${theme.border}`,
        padding: "0 20px",
        paddingTop: `calc(env(safe-area-inset-top) + ${UST_CENTIK_EK}px)`,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        // border-box (index.css'teki `* { box-sizing: border-box }`) korunuyor —
        // content-box'a geçmek yatay dolguyu genişliğe ekleyip taşma yapardı.
        // Bu yüzden yükseklik doğrudan "42px + çentik" yazılıyor: toplam yükseklik
        // doğru, içerik alanı yine 42px.
        minHeight: `calc(42px + env(safe-area-inset-top) + ${UST_CENTIK_EK}px)`,
        position: "sticky",
        top: 0,
        zIndex: 100,
      }}>
        {/* Hamburger — sol grup, sağ grupla aynı esneklikte: logo tam ortada kalsın */}
        <div style={{ flex: 1, display: "flex", alignItems: "center" }}>
        <button
          onClick={() => { setMenuAcik(!menuAcik); setAyarlarAcik(false); setYardimAcik(false) }}
          style={{ color: theme.textSecondary, padding: "6px", borderRadius: "8px", display: "flex", alignItems: "center" }}
        >
          {menuAcik ? <X size={20} /> : <Menu size={20} />}
        </button>
        </div>

        {/* Logo */}
        <Link to="/" style={{ color: theme.accent, fontSize: "20px", fontWeight: "bold", letterSpacing: "3px" }}>
          VUKUF
        </Link>

        {/* SAĞ GRUP: Yardım (?) + Ayarlar */}
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "flex-end", gap: "2px" }}>
        <button
          onClick={() => { setYardimAcik(true); setMenuAcik(false); setAyarlarAcik(false) }}
          title="Yardım — nasıl kullanılır"
          aria-label="Yardım"
          style={{
            color: yardimAcik ? theme.accent : theme.textSecondary,
            padding: "6px",
            borderRadius: "8px",
            display: "flex",
            alignItems: "center",
            background: yardimAcik ? `${theme.accent}15` : "transparent",
          }}
        >
          <HelpCircle size={18} />
        </button>
        {/* TEK AYARLAR DÜĞMESİ — eski Sparkles + Palette ikilisinin yerine */}
        <button
          onClick={() => { setAyarlarAcik(true); setMenuAcik(false); setYardimAcik(false) }}
          title="Ayarlar"
          aria-label="Ayarlar"
          style={{
            color: ayarlarAcik ? theme.accent : theme.textSecondary,
            padding: "6px",
            borderRadius: "8px",
            display: "flex",
            alignItems: "center",
            background: ayarlarAcik ? `${theme.accent}15` : "transparent",
          }}
        >
          <Settings size={18} />
        </button>
        </div>
      </nav>

      {/* ═══ YARDIM PANELİ ════════════════════════════════════════════════ */}
      {yardimAcik && <YardimPaneli kapat={() => setYardimAcik(false)} theme={theme} />}

      {/* ═══ AYARLAR PANELİ ═══════════════════════════════════════════════ */}
      {ayarlarAcik && (
        <AltSayfa
          kapat={() => setAyarlarAcik(false)}
          theme={theme}
          baslik="AYARLAR"
          maxYukseklik="86vh"
        >
          {/* ── TEMA ──────────────────────────────────────────────────── */}
          <Katlanir
            theme={theme} ikon={Palette} baslik="Tema"
            ozet={temaOzeti}
            {...kapak("tema")}
          >
          {/* Ton anahtarı + canlı önizleme kartları — ortak bileşen (TemaSecici.jsx).
              Aynı bileşen okuma ekranlarının tema panelinde de kullanılıyor. */}
          <TemaSecici
            theme={theme}
            duzen="kart"
            sutun={isMobile ? 2 : 3}
            onOzel={ozelPanelAc}
          />

          </Katlanir>

          {/* ── GÖRÜNÜM ───────────────────────────────────────────────── */}
          <Katlanir
            theme={theme} ikon={Sparkles} baslik="Görünüm"
            ozet={[girisAnim && "giriş", dinamik && "dinamik", RAF_GORUNUMLERI.find(r => r.id === rafGorunum)?.ad.toLocaleLowerCase("tr-TR")].filter(Boolean).join(" · ")}
            {...kapak("gorunum")}
          >
          <AyarSatiri
            baslik="Giriş Animasyonu"
            aciklama="Açılışta tezhipli giriş ekranı (sonraki açılışta geçerli)"
            acik={girisAnim}
            onToggle={toggleGirisAnim}
            theme={theme}
          />
          <div style={{ height: "1px", background: theme.border, opacity: 0.6, margin: "2px 0" }} />
          <AyarSatiri
            baslik="Dinamik Mod"
            aciklama="Kitaplıkta akan (coverflow) kapak görünümü"
            acik={dinamik}
            onToggle={toggleDinamik}
            theme={theme}
          />
          <div style={{ height: "1px", background: theme.border, opacity: 0.6, margin: "2px 0" }} />
          {/* Raf görünümü — üç seçenekli */}
          <div style={{ padding: "12px 4px" }}>
            <div style={{ fontSize: "15px", color: theme.text, fontWeight: 500 }}>Raf Görünümü</div>
            <div style={{ fontSize: "12px", color: theme.textSecondary, marginTop: "2px" }}>
              {rafGorunum === "resimli" ? "Raflarda bölümlere özel resimler"
                : rafGorunum === "cizimli" ? "Resimsiz; kitap sırtları, kandil ve mumlar"
                : "Yalnız raf levhaları; en sade görünüm"}
            </div>
            <div role="radiogroup" aria-label="Raf görünümü" style={{
              display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: "4px", marginTop: "10px",
              padding: "3px", borderRadius: "12px", border: `1px solid ${theme.border}`, background: `${theme.accent}0d`,
            }}>
              {RAF_GORUNUMLERI.map(r => {
                const secili = rafGorunum === r.id
                return (
                  <button key={r.id} role="radio" aria-checked={secili} onClick={() => rafGorunumSec(r.id)}
                    style={{
                      height: "32px", borderRadius: "9px", border: "none", cursor: "pointer",
                      background: secili ? theme.accent : "transparent",
                      color: secili ? "#fff" : theme.textSecondary, fontSize: "13px", fontWeight: 600,
                    }}>
                    {r.ad}
                  </button>
                )
              })}
            </div>
          </div>

          </Katlanir>

          {/* ── GEÇMİŞ ────────────────────────────────────────────────── */}
          <Katlanir
            theme={theme} ikon={History} baslik="Geçmiş"
            ozet={gecmisAcik ? "açık" : "kapalı"}
            {...kapak("gecmis")}
          >
          <AyarSatiri
            baslik="Geçmişi tut"
            aciklama="Aramalarınız ve okuduğunuz yerler tarih ve süreleriyle kaydedilir; ana menüde Geçmiş sayfası açılır. Kapatınca kayıtlar silinir."
            acik={gecmisAcik}
            onToggle={toggleGecmis}
            theme={theme}
          />
          </Katlanir>

          {/* ── VERİLER ───────────────────────────────────────────────────
              İçinde kendi akordiyonu var (Depolama · Yedek al · Geri yükle ·
              Sıfırla), o yüzden burada iç dolgu verilmiyor — iki kat çerçeve
              görüntüyü boğuyordu. */}
          <Katlanir
            theme={theme} ikon={HardDrive} baslik="Veriler"
            ozet="yedek · sıfırla"
            {...kapak("veriler")}
          >
            <VeriAyarlari theme={theme} />
          </Katlanir>

          {/* Panelin sonunda nefes payı — son düğme ekranın en dibine yapışmasın */}
          <div style={{ height: "8px" }} />
        </AltSayfa>
      )}

      {/* ═══ ÖZEL TEMA PANELİ (değişmedi) ═════════════════════════════════ */}
      {ozelPanelAcik && (
        <>
          <div
            onClick={() => setOzelPanelAcik(false)}
            style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 300 }}
          />
          {/* YATAY TELEFON: genişliyor, renk listesi iki sütun (yatayDuzen.js) */}
          <div className="yp-panel yp-genis" style={{
            ...ypDegisken({ pay: 24, en: 620 }),
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
            <div className="yp-iki" style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
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

      {/* ═══ HAMBURGER MENÜ (değişmedi) ═══════════════════════════════════ */}
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
            // Yatay telefonda (ekran ~430 px) menü öğeleri sığmayıp alttan
            // kesiliyordu → kendi içinde kaydırılsın.
            overflowY: "auto",
            overscrollBehavior: "contain",
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
