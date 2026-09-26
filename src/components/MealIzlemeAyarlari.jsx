/* VUKUF — MEAL & İZLEME AYARLARI PANELİ
   src/components/MealIzlemeAyarlari.jsx

   Tek panel, iki bölüm. PlayerBar'a üçüncü bir düğme eklemek yerine buraya iki
   yerden giriliyor: meal popup'ının kenarındaki dişli ve izleme modundaki dişli.
   Hangi yerden açıldıysa o bölüm üstte duruyor. Ayarlar `data/izlemeAyar.js`de. */

import { useEffect, useState } from "react"
import { X, Plus } from "lucide-react"
import { DESENLER, GORSELLER } from "../data/arkaplanlar"
import { useIzlemeAyar } from "../data/izlemeAyar"

const KONUMLAR   = [{ id: "ust", ad: "Üst" }, { id: "orta", ad: "Orta" }, { id: "alt", ad: "Alt" }]
const GENISLIKLER = [{ id: "dar", ad: "Dar" }, { id: "orta", ad: "Orta" }, { id: "genis", ad: "Geniş" }]
const CERCEVELER = [
  { id: "yok", ad: "Çerçevesiz" }, { id: "ince", ad: "İnce Çizgi" }, { id: "cift", ad: "Çift Çizgi" },
  { id: "kose", ad: "Köşe Süsü" }, { id: "kemer", ad: "Kemer" }, { id: "kartus", ad: "Kartuş" },
]
const KARARTMALAR = [
  { id: "yok", ad: "Yok" }, { id: "az", ad: "Az" }, { id: "orta", ad: "Orta" }, { id: "cok", ad: "Çok" },
]
const YAZI_BOYLARI = [12, 13, 14, 15, 16, 18]

export default function MealIzlemeAyarlari({ acik, kapat, theme, isMobile, odak = "meal" }) {
  const [ayar, guncelle] = useIzlemeAyar()
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

  useEffect(() => {
    if (!acik) return
    const tus = (e) => { if (e.key === "Escape") kapat?.() }
    document.addEventListener("keydown", tus)
    return () => document.removeEventListener("keydown", tus)
  }, [acik, kapat])

  if (!acik) return null

  const cip = (secili) => ({
    display: "inline-flex", alignItems: "center", gap: "5px", whiteSpace: "nowrap",
    padding: "6px 11px", borderRadius: "999px", cursor: "pointer", flexShrink: 0,
    fontSize: "12px", fontWeight: 600, fontFamily: "inherit",
    border: `1px solid ${secili ? theme.accent : theme.border}`,
    background: secili ? theme.accent : "transparent",
    color: secili ? "#fff" : theme.textSecondary,
  })
  const serit = { display: "flex", gap: "6px", overflowX: "auto", paddingBottom: "2px", marginBottom: "12px" }
  const baslik = { fontSize: "11px", fontWeight: 700, letterSpacing: "0.04em", textTransform: "uppercase", color: theme.textSecondary, margin: "0 0 6px" }
  const bolumBaslik = { fontSize: "13px", fontWeight: 700, color: theme.accent, margin: "4px 0 10px" }

  const dosyaSec = (e) => {
    const f = e.target.files && e.target.files[0]
    if (!f) return
    const okuyucu = new FileReader()
    okuyucu.onload = () => guncelle("izleme", { ozelGorsel: String(okuyucu.result), arka: "ozel" })
    okuyucu.readAsDataURL(f)
  }

  const anahtar = (etiket, deger, ayarla) => (
    <button onClick={() => ayarla(!deger)} style={cip(deger)}>{etiket}</button>
  )

  const mealBolum = (
    <div key="meal">
      <p style={bolumBaslik}>Meal penceresi</p>
      <p style={baslik}>Konum</p>
      <div style={serit}>
        {KONUMLAR.map(k => (
          <button key={k.id} onClick={() => guncelle("meal", { konum: k.id, kaydir: 0 })} style={cip(ayar.meal.konum === k.id)}>{k.ad}</button>
        ))}
        {ayar.meal.kaydir !== 0 && (
          <button onClick={() => guncelle("meal", { kaydir: 0 })} style={cip(false)}>İnce ayarı sıfırla</button>
        )}
      </div>
      <p style={baslik}>Genişlik</p>
      <div style={serit}>
        {GENISLIKLER.map(g => (
          <button key={g.id} onClick={() => guncelle("meal", { genislik: g.id })} style={cip(ayar.meal.genislik === g.id)}>{g.ad}</button>
        ))}
      </div>
      <p style={baslik}>Yazı boyu</p>
      <div style={serit}>
        {YAZI_BOYLARI.map(b => (
          <button key={b} onClick={() => guncelle("meal", { yaziBoyu: b })} style={cip(ayar.meal.yaziBoyu === b)}>{b}px</button>
        ))}
      </div>
      <p style={baslik}>Görünüm</p>
      <div style={serit}>
        {anahtar("Sûre adı hattı", ayar.meal.hat, v => guncelle("meal", { hat: v }))}
      </div>
    </div>
  )

  const izlemeBolum = (
    <div key="izleme">
      <p style={bolumBaslik}>İzleme modu</p>
      <p style={baslik}>Arka plan</p>
      <div style={serit}>
        <label style={{ ...cip(ayar.izleme.arka === "ozel") }}>
          <Plus size={13} /> Galeriden
          <input type="file" accept="image/*" onChange={dosyaSec} style={{ display: "none" }} />
        </label>
        {gorseller.map(g => (
          <button key={g.id} onClick={() => guncelle("izleme", { arka: g.id })} style={cip(ayar.izleme.arka === g.id)}>{g.ad}</button>
        ))}
        {DESENLER.map(d => (
          <button key={d.id} onClick={() => guncelle("izleme", { arka: d.id })} style={cip(ayar.izleme.arka === d.id)}>{d.ad}</button>
        ))}
      </div>
      <p style={baslik}>Çerçeve</p>
      <div style={serit}>
        {CERCEVELER.map(c => (
          <button key={c.id} onClick={() => guncelle("izleme", { cerceve: c.id })} style={cip(ayar.izleme.cerceve === c.id)}>{c.ad}</button>
        ))}
      </div>
      <p style={baslik}>Karartma</p>
      <div style={serit}>
        {KARARTMALAR.map(k => (
          <button key={k.id} onClick={() => guncelle("izleme", { karartma: k.id })} style={cip(ayar.izleme.karartma === k.id)}>{k.ad}</button>
        ))}
      </div>
      <p style={baslik}>İçerik</p>
      <div style={serit}>
        {anahtar("Meali de göster", ayar.izleme.meal, v => guncelle("izleme", { meal: v }))}
      </div>
      <p style={baslik}>Görünüm</p>
      <div style={serit}>
        {anahtar("Gizli butonlar", ayar.izleme.gizliDugme, v => guncelle("izleme", { gizliDugme: v }))}
      </div>
      <p style={{ fontSize: "11px", color: theme.textSecondary, lineHeight: 1.6, marginTop: "-6px" }}>
        Gizli butonlar açıkken ekranda düğme durmaz: <b>sola sürükle</b> önceki âyet,
        <b> sağa sürükle</b> sonraki âyet, <b>aşağı sürükle</b> çıkış,
        <b> ortaya bir kez dokun</b> duraklat/devam.
      </p>
    </div>
  )

  const bolumler = odak === "izleme" ? [izlemeBolum, mealBolum] : [mealBolum, izlemeBolum]

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
        maxHeight: "78vh", overflowY: "auto",
        background: theme.surface,
        border: `1px solid ${theme.border}`,
        borderRadius: isMobile ? "16px 16px 0 0" : "16px",
        boxShadow: "0 -6px 28px rgba(0,0,0,0.28)",
        padding: "14px 16px calc(18px + env(safe-area-inset-bottom))",
        boxSizing: "border-box",
      }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "10px" }}>
          <span style={{ fontSize: "14px", fontWeight: 600, color: theme.text }}>Meal ve izleme ayarları</span>
          <button onClick={kapat} style={{
            display: "flex", padding: "4px", border: "none", background: "none",
            cursor: "pointer", color: theme.textSecondary,
          }}><X size={16} /></button>
        </div>
        {bolumler.map((b, i) => (
          <div key={i} style={i ? { borderTop: `1px solid ${theme.border}`, paddingTop: "12px", marginTop: "6px" } : undefined}>
            {b}
          </div>
        ))}
      </div>
    </>
  )
}
