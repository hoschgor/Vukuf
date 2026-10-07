/* VUKUF — MEAL & İZLEME AYARLARI PANELİ
   src/components/MealIzlemeAyarlari.jsx

   Tek panel, iki bölüm. PlayerBar'a üçüncü bir düğme eklemek yerine buraya iki
   yerden giriliyor: meal popup'ının kenarındaki dişli ve izleme modundaki dişli.
   Hangi yerden açıldıysa o bölüm seçili açılıyor. Ayarlar `data/izlemeAyar.js`de.

   7 Ekim 2026 (kullanıcı: "butonları daha kullanışlı yapalım, hıfz modundaki gibi"):
   • Yana kayan çip şeritleri yerine hıfz panelindeki BÖLÜNMÜŞ DÜĞMELER (Secim) ve
     AÇ/KAPA SATIRLARI (Anahtar) — ortak `AyarOgeleri.jsx`. Seçenekler satıra
     sarıldığı için telefonda hiçbiri kesik kalmıyor.
   • İzleme bölümü üç sekmeye ayrıldı: Arka plan · Hareket ve efekt · Görünüm.
     Panel kısaldı, aranan ayar bir dokunuşta bulunuyor.
   • Arka planlar küçük resimli kutular: galeri resimleri, hazır resimler, desenler. */

import { useEffect, useMemo, useState } from "react"
import {
  X, Image as ImageIcon, Sparkles, LayoutTemplate, MonitorPlay, Languages,
  Eye, Hand, Type, Move, Wind, Sun, Timer, Shuffle, Frame, Layers,
} from "lucide-react"
import { DESENLER, GORSELLER } from "../data/arkaplanlar"
import { useIzlemeAyar, ayarOku } from "../data/izlemeAyar"
import { HAREKETLER, HIZLAR, HAVALAR, ISIKLAR, GECISLER, SLAYT_SURELERI } from "../data/izlemeSahne"
import { galeriyeEkle, galeridenSil, galeriBlobu, eskiGorselVarsaTasi } from "../data/izlemeGaleri"
import { Secim, Anahtar, AyarBaslik, ArkaPlanIzgara, desenOnizleme, useGaleriUrlleri } from "./AyarOgeleri"

const KONUMLAR   = [{ id: "ust", ad: "Üst" }, { id: "orta", ad: "Orta" }, { id: "alt", ad: "Alt" }]
const GENISLIKLER = [{ id: "dar", ad: "Dar" }, { id: "orta", ad: "Orta" }, { id: "genis", ad: "Geniş" }]
const CERCEVELER = [
  { id: "yok", ad: "Yok" }, { id: "ince", ad: "İnce" }, { id: "cift", ad: "Çift" },
  { id: "kose", ad: "Köşe" }, { id: "kemer", ad: "Kemer" }, { id: "kartus", ad: "Kartuş" },
]
const KARARTMALAR = [
  { id: "yok", ad: "Yok" }, { id: "az", ad: "Az" }, { id: "orta", ad: "Orta" }, { id: "cok", ad: "Çok" },
]
const YAZI_BOYLARI = [12, 13, 14, 15, 16, 18].map(b => ({ id: b, ad: String(b) }))
const SUSLER = [{ id: "dal", ad: "Dallar" }, { id: "tezhip", ad: "Tezhip" }]
const BOLUMLER = [
  { id: "izleme", ad: "İzleme modu", Ikon: MonitorPlay },
  { id: "meal", ad: "Meal penceresi", Ikon: Languages },
]
const SEKMELER = [
  { id: "arka", ad: "Arka plan", Ikon: ImageIcon },
  { id: "efekt", ad: "Hareket", Ikon: Sparkles },
  { id: "gorunum", ad: "Görünüm", Ikon: LayoutTemplate },
]

export default function MealIzlemeAyarlari({ acik, kapat, theme, isMobile, odak = "meal" }) {
  const [ayar, guncelle] = useIzlemeAyar()
  const iz = ayar.izleme
  const [bolum, setBolum] = useState(odak)
  const [sekme, setSekme] = useState("arka")
  useEffect(() => { if (acik) setBolum(odak) }, [acik, odak])

  // Dosyası gerçekten olan hazır fotoğraflar (yoksa listede hiç görünmesin)
  const [gorseller, setGorseller] = useState([])
  useEffect(() => {
    if (!acik) return
    let iptal = false
    Promise.all(GORSELLER.map(g => new Promise(cz => {
      const im = new Image()
      im.onload = () => cz(g); im.onerror = () => cz(null); im.src = g.src
    }))).then(s => { if (!iptal) setGorseller(s.filter(Boolean)) })
    return () => { iptal = true }
  }, [acik])

  // Eski tek resim (dataURL) varsa galeriye taşınsın — panel izleme açılmadan da açılabiliyor
  useEffect(() => { if (acik) eskiGorselVarsaTasi() }, [acik])

  useEffect(() => {
    if (!acik) return
    const tus = (e) => { if (e.key === "Escape") kapat?.() }
    document.addEventListener("keydown", tus)
    return () => document.removeEventListener("keydown", tus)
  }, [acik, kapat])

  const galeri = iz.galeri || []
  const urller = useGaleriUrlleri(acik ? galeri : [], galeriBlobu)
  const [ekleniyor, setEkleniyor] = useState(false)
  const galeriSecili = iz.arka === "galeri" || iz.arka === "ozel"

  const arkaOgeleri = useMemo(() => [
    ...galeri.map((id, i) => ({
      id: "g:" + id, ad: galeri.length > 1 ? `${i + 1}. resim` : "Resmim", resim: urller[id] || "",
      secili: galeriSecili, onSil: () => galeridenKaldir(id),
    })),
    ...gorseller.map(g => ({ id: g.id, ad: g.ad, resim: g.src, secili: iz.arka === g.id })),
    ...DESENLER.map(d => ({ id: d.id, ad: d.ad, resim: desenOnizleme(d), secili: iz.arka === d.id })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
  ], [galeri.join(","), urller, gorseller, iz.arka, galeriSecili])

  if (!acik) return null

  // Galeriden BİR YA DA BİRDEN ÇOK resim: mevcut listenin sonuna eklenir
  async function dosyaEkle(dosyalar) {
    setEkleniyor(true)
    try {
      const yeni = await galeriyeEkle(dosyalar)
      if (yeni.length) {
        const mevcut = ayarOku().izleme.galeri || []
        guncelle("izleme", { galeri: [...mevcut, ...yeni], arka: "galeri" })
      }
    } finally { setEkleniyor(false) }
  }
  function galeridenKaldir(id) {
    galeridenSil(id)
    const kalan = (ayarOku().izleme.galeri || []).filter(x => x !== id)
    guncelle("izleme", kalan.length ? { galeri: kalan } : { galeri: [], arka: DESENLER[0] ? DESENLER[0].id : "zumrut" })
  }
  const arkaSec = (id) => guncelle("izleme", { arka: String(id).startsWith("g:") ? "galeri" : id })

  const ipucu = { fontSize: "11px", color: theme.textSecondary, lineHeight: 1.5, margin: "8px 2px 0" }

  /* ── İZLEME: ARKA PLAN ─────────────────────────────────────────────── */
  const arkaSekmesi = (
    <>
      <AyarBaslik theme={theme} ikon={ImageIcon} ust={4}
        not={galeriSecili && galeri.length >= 2 ? `Slayt · ${galeri.length} resim` : null}>Arka plan</AyarBaslik>
      <ArkaPlanIzgara theme={theme} ogeler={arkaOgeleri} onSec={arkaSec}
        ekle={{ onDosyalar: dosyaEkle, ekleniyor }} />
      <p style={ipucu}>
        {galeri.length >= 2
          ? "Galerideki resimler sırayla gösterilir (slayt). Âyet değişse de resim ve efekt kesintisiz sürer."
          : "Birden çok resim eklerseniz slayt gösterisi olur. Tek resimde âyet değişse de resim ve efekt aynen sürer."}
      </p>
      {galeriSecili && galeri.length >= 2 && (
        <>
          <AyarBaslik theme={theme} ikon={Timer}>Her resim</AyarBaslik>
          <Secim theme={theme} kucuk deger={Number(iz.slaytSure)} onSec={v => guncelle("izleme", { slaytSure: v })}
            secenekler={SLAYT_SURELERI.map(sn => ({ id: sn, ad: `${sn} sn` }))} />
          <AyarBaslik theme={theme} ikon={Shuffle}>Geçiş</AyarBaslik>
          <Secim theme={theme} kucuk deger={iz.slaytGecis} onSec={v => guncelle("izleme", { slaytGecis: v })}
            secenekler={GECISLER} />
        </>
      )}
    </>
  )

  /* ── İZLEME: HAREKET VE EFEKT ───────────────────────────────────────── */
  const efektSekmesi = (
    <>
      <AyarBaslik theme={theme} ikon={Move} ust={4}>Resim hareketi</AyarBaslik>
      <Secim theme={theme} kucuk deger={iz.hareket} onSec={v => guncelle("izleme", { hareket: v })} secenekler={HAREKETLER} />
      {iz.hareket !== "sabit" && (
        <>
          <AyarBaslik theme={theme} ikon={Layers}>Hız</AyarBaslik>
          <Secim theme={theme} kucuk deger={iz.hiz} onSec={v => guncelle("izleme", { hiz: v })} secenekler={HIZLAR} />
        </>
      )}
      <AyarBaslik theme={theme} ikon={Wind}>Hava</AyarBaslik>
      <Secim theme={theme} kucuk deger={iz.hava} onSec={v => guncelle("izleme", { hava: v })} secenekler={HAVALAR} />
      <AyarBaslik theme={theme} ikon={Sun}>Işık</AyarBaslik>
      <Secim theme={theme} kucuk deger={iz.isik} onSec={v => guncelle("izleme", { isik: v })} secenekler={ISIKLAR} />
    </>
  )

  /* ── İZLEME: GÖRÜNÜM ─────────────────────────────────────────────────── */
  const gorunumSekmesi = (
    <>
      <AyarBaslik theme={theme} ikon={Frame} ust={4}>Çerçeve</AyarBaslik>
      <Secim theme={theme} kucuk deger={iz.cerceve} onSec={v => guncelle("izleme", { cerceve: v })} secenekler={CERCEVELER} sutun={3} />
      <AyarBaslik theme={theme} ikon={Eye} not="yazının okunurluğu">Karartma</AyarBaslik>
      <Secim theme={theme} kucuk deger={iz.karartma} onSec={v => guncelle("izleme", { karartma: v })} secenekler={KARARTMALAR} />
      <div style={{ height: "12px" }} />
      <Anahtar theme={theme} ikon={Languages} acik={!!iz.meal} onDegis={v => guncelle("izleme", { meal: v })}
        baslik="Meali de göster" aciklama="Arapçanın altında Türkçe meal." />
      <Anahtar theme={theme} ikon={Hand} acik={!!iz.gizliDugme} onDegis={v => guncelle("izleme", { gizliDugme: v })}
        baslik="Gizli butonlar"
        aciklama="Ekranda düğme durmaz. Sola sürükle: önceki · sağa: sonraki · aşağı: çıkış · yukarı: ayarlar · ortaya dokun: duraklat/devam." />
    </>
  )

  /* ── MEAL PENCERESİ ──────────────────────────────────────────────────── */
  const mealBolum = (
    <>
      <AyarBaslik theme={theme} ust={4}
        not={ayar.meal.kaydir !== 0 ? (
          <button onClick={() => guncelle("meal", { kaydir: 0 })} style={{
            border: "none", background: "none", padding: 0, cursor: "pointer", fontFamily: "inherit",
            fontSize: "10.5px", fontWeight: 600, color: theme.accent,
          }}>İnce ayarı sıfırla</button>
        ) : null}>Konum</AyarBaslik>
      <Secim theme={theme} kucuk deger={ayar.meal.konum} onSec={v => guncelle("meal", { konum: v, kaydir: 0 })} secenekler={KONUMLAR} />
      <AyarBaslik theme={theme}>Genişlik</AyarBaslik>
      <Secim theme={theme} kucuk deger={ayar.meal.genislik} onSec={v => guncelle("meal", { genislik: v })} secenekler={GENISLIKLER} />
      <AyarBaslik theme={theme} ikon={Type} not="px">Yazı boyu</AyarBaslik>
      <Secim theme={theme} kucuk deger={ayar.meal.yaziBoyu} onSec={v => guncelle("meal", { yaziBoyu: v })} secenekler={YAZI_BOYLARI} sutun={6} />
      <AyarBaslik theme={theme}>Süs</AyarBaslik>
      <Secim theme={theme} kucuk deger={ayar.meal.sus || "dal"} onSec={v => guncelle("meal", { sus: v })} secenekler={SUSLER} />
      <div style={{ height: "12px" }} />
      <Anahtar theme={theme} acik={!!ayar.meal.hat} onDegis={v => guncelle("meal", { hat: v })}
        baslik="Sûre adı hattı" aciklama="Pencere başlığında sûre adı, sûre başlığındaki hat yazısıyla." />
    </>
  )

  return (
    <>
      <div onClick={kapat} style={{ position: "fixed", inset: 0, zIndex: 620, background: "rgba(0,0,0,0.35)" }} />
      <div style={{
        // z-index HER ŞEYİN ÜSTÜNDE: bu panel hem meal penceresinden (z 92) hem de
        // TAM EKRAN izleme modundan (z 500) açılıyor; 401'de kalırsa izlemede görünmezdi.
        position: "fixed", zIndex: 621,
        left: "50%", transform: "translateX(-50%)",
        bottom: isMobile ? 0 : "6vh",
        width: isMobile ? "100%" : "min(560px, 92vw)",
        maxHeight: "78vh", overflowY: "auto", overscrollBehavior: "contain",
        background: theme.surface,
        border: `1px solid ${theme.border}`,
        borderRadius: isMobile ? "16px 16px 0 0" : "16px",
        boxShadow: "0 -6px 28px rgba(0,0,0,0.28)",
        padding: "12px 14px calc(18px + env(safe-area-inset-bottom))",
        boxSizing: "border-box",
      }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "10px" }}>
          <span style={{ fontSize: "14px", fontWeight: 600, color: theme.text }}>Meal ve izleme ayarları</span>
          <button onClick={kapat} aria-label="Kapat" style={{
            display: "flex", padding: "4px", border: "none", background: "none",
            cursor: "pointer", color: theme.textSecondary,
          }}><X size={16} /></button>
        </div>

        <Secim theme={theme} deger={bolum} onSec={setBolum} secenekler={BOLUMLER} />

        {bolum === "izleme" ? (
          <>
            <div style={{ marginTop: "10px" }}>
              <Secim theme={theme} kucuk deger={sekme} onSec={setSekme} secenekler={SEKMELER} />
            </div>
            <div style={{ marginTop: "10px" }}>
              {sekme === "arka" ? arkaSekmesi : sekme === "efekt" ? efektSekmesi : gorunumSekmesi}
            </div>
          </>
        ) : (
          <div style={{ marginTop: "10px" }}>{mealBolum}</div>
        )}
      </div>
    </>
  )
}
