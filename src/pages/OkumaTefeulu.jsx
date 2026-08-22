import { useState, useMemo } from "react"
import { useNavigate } from "react-router-dom"
import { Shuffle, ChevronRight, BookOpen, Loader, Sparkles } from "lucide-react"
import { useApp } from "../AppContext"
import { kitaplar, kategoriler } from "../data/kitaplar"
import { useMediaQuery } from "../data/hooks/useMediaQuery"

// Bir alimin tüm kitapları (altKategoriler varsa düzleştir)
const alimKitaplari = (alim) =>
  (alim?.altKategoriler ? alim.altKategoriler.flatMap(a => a.kitaplar || []) : (alim?.kitaplar || []))
    .filter(b => b && b.dosya)

// Sure başına ayet sayıları (Hafs), 1..114 — rastgele ayet için
const AYET_SAYILARI = [
  7, 286, 200, 176, 120, 165, 206, 75, 129, 109, 123, 111, 43, 52, 99, 128, 111,
  110, 98, 135, 112, 78, 118, 72, 135, 227, 93, 88, 69, 60, 34, 30, 73, 54, 45,
  83, 182, 88, 75, 85, 54, 53, 89, 59, 37, 35, 38, 29, 18, 45, 60, 49, 62, 55,
  78, 96, 29, 22, 24, 13, 14, 11, 11, 18, 12, 12, 30, 52, 52, 44, 28, 28, 20, 56,
  40, 31, 50, 40, 46, 42, 29, 19, 36, 25, 22, 17, 19, 26, 30, 20, 15, 21, 11, 8,
  8, 19, 5, 8, 8, 11, 11, 8, 3, 9, 5, 4, 7, 3, 6, 3, 5, 4, 5, 6,
]

const metinCache = new Map()
async function kitapYukle(dosya) {
  if (metinCache.has(dosya)) return metinCache.get(dosya)
  try {
    const r = await fetch(`/${dosya}`)
    const d = await r.json()
    metinCache.set(dosya, Array.isArray(d) ? d : [])
  } catch { metinCache.set(dosya, []) }
  return metinCache.get(dosya)
}

const rnd = (n) => Math.floor(Math.random() * n)

export default function OkumaTefeulu() {
  const { theme } = useApp()
  const navigate = useNavigate()
  const isMobile = useMediaQuery("(max-width: 768px)")

  const [secKisim, setSecKisim] = useState("")   // "" = tümü, "kuran" = Kur'an, aksi = kategori id
  const [secAlim, setSecAlim] = useState("")
  const [secKitap, setSecKitap] = useState("")
  const [yukleniyor, setYukleniyor] = useState(false)
  const [hata, setHata] = useState("")

  const kitapListesi = useMemo(() => kitaplar.filter(k => k && k.dosya && k.id !== "kuran"), [])
  const kisimlar = useMemo(
    () => kategoriler.filter(k => k.id !== "orijinal-eserler" && (k.alimler || []).some(a => alimKitaplari(a).length)),
    []
  )
  const kuranMi = secKisim === "kuran"
  const kisimObj = kisimlar.find(k => k.id === secKisim) || null
  const alimSecenek = useMemo(() => (kisimObj ? (kisimObj.alimler || []).filter(a => alimKitaplari(a).length) : []), [secKisim])
  const alimObj = alimSecenek.find(a => a.id === secAlim) || null
  const kitapSecenek = useMemo(() => (alimObj ? alimKitaplari(alimObj) : []), [secKisim, secAlim])

  const kapsam = useMemo(() => {
    if (kuranMi) return []
    if (secKitap) { const b = kitapSecenek.find(x => x.id === secKitap); return b ? [b] : [] }
    if (alimObj) return alimKitaplari(alimObj)
    if (kisimObj) return (kisimObj.alimler || []).flatMap(alimKitaplari)
    return kitapListesi
  }, [secKisim, secAlim, secKitap, kitapListesi])

  async function tefeulEt() {
    setHata("")
    // Kur'an: rastgele sure (başlık) ya da ayet
    if (kuranMi) {
      const sureNo = 1 + rnd(114)
      const payload = (Math.random() < 0.5)
        ? { sureNo }
        : { sureNo, ayetNo: 1 + rnd(AYET_SAYILARI[sureNo - 1] || 1) }
      try { localStorage.setItem("vukuf-kuran-hedef", JSON.stringify(payload)) } catch {}
      navigate("/kuran")
      return
    }

    const havuz = kapsam
    if (!havuz.length) { setHata("Bu kapsamda kitap yok."); return }

    setYukleniyor(true)
    const karisik = [...havuz].sort(() => Math.random() - 0.5)   // kitapları karıştır
    for (const kitap of karisik) {
      const d = await kitapYukle(kitap.dosya)
      if (!d || !d.length) continue
      for (let deneme = 0; deneme < 15; deneme++) {
        const sayfa = d[rnd(d.length)]
        const satirlar = (sayfa.metin || "").split("\n")
        const adaylar = []
        for (let i = 0; i < satirlar.length; i++) {
          const s = satirlar[i]
          if (s && s.trim() && !s.startsWith("§")) adaylar.push(i)
        }
        if (!adaylar.length) continue
        const si = adaylar[rnd(adaylar.length)]
        // İlk cümle / başlık (işaret için)
        const ham = satirlar[si].replace(/⟦H\d+⟧/g, "").replace(/\[\d+\]/g, "").trim()
        const m = ham.match(/^[\s\S]*?[.!?:]/)
        const ilk = (m ? m[0] : ham).slice(0, 90).trim()
        try {
          localStorage.setItem("vukuf-arama-hedef", JSON.stringify({
            kitapId: kitap.id, aranan: ilk, sayfaNo: sayfa.sayfa, satirIdx: si,
          }))
        } catch {}
        setYukleniyor(false)
        navigate(`/kitap/${kitap.id}`)
        return
      }
    }
    setYukleniyor(false)
    setHata("Uygun bir bölüm bulunamadı, tekrar dene.")
  }

  const kapsamEtiket = kuranMi
    ? "Kur'ân-ı Kerîm"
    : [kisimObj?.baslik, alimObj?.isim, kitapSecenek.find(x => x.id === secKitap)?.baslik].filter(Boolean).join(" · ") || "Tüm kitaplar"

  const selStil = (disabled) => ({
    flex: 1, padding: "9px 11px", borderRadius: "8px", border: `1px solid ${theme.border}`,
    background: theme.background, color: theme.text, fontSize: "14px", fontFamily: "inherit",
    cursor: disabled ? "not-allowed" : "pointer",
  })

  return (
    <div style={{ maxWidth: "620px", margin: "0 auto", padding: isMobile ? "22px 16px 60px" : "44px 24px 80px" }}>
      <div style={{ textAlign: "center", marginBottom: "26px" }}>
        <Sparkles size={30} color={theme.accent} style={{ marginBottom: "6px" }} />
        <h1 style={{ fontSize: isMobile ? "26px" : "34px", color: theme.accent, fontFamily: "PlayfairDisplay, serif" }}>
          Okuma Tefeülü
        </h1>
        <p style={{ fontSize: "13px", color: theme.textSecondary, marginTop: "6px" }}>
          Bir kapsam seç, rastgele bir bölüm karşına çıksın.
        </p>
      </div>

      {/* Kapsam seçimi */}
      <div style={{ display: "flex", flexDirection: "column", gap: "10px", padding: "16px", borderRadius: "14px", background: theme.surface, border: `1px solid ${theme.border}` }}>
        {/* Kısım (Kur'an dahil) */}
        <label style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <span style={{ fontSize: "12px", color: theme.textSecondary, minWidth: "46px" }}>Kısım</span>
          <select value={secKisim} onChange={e => { setSecKisim(e.target.value); setSecAlim(""); setSecKitap(""); setHata("") }} style={selStil(false)}>
            <option value="">Tüm kitaplar</option>
            {kisimlar.map(k => <option key={k.id} value={k.id}>{k.baslik}</option>)}
            <option value="kuran">Kur'ân-ı Kerîm</option>
          </select>
        </label>

        {/* Alim + Kitap (Kur'an değilse) */}
        {!kuranMi && (
          <>
            <label style={{ display: "flex", alignItems: "center", gap: "10px", opacity: secKisim ? 1 : 0.5 }}>
              <span style={{ fontSize: "12px", color: theme.textSecondary, minWidth: "46px" }}>Alim</span>
              <select value={secAlim} disabled={!secKisim} onChange={e => { setSecAlim(e.target.value); setSecKitap("") }} style={selStil(!secKisim)}>
                <option value="">Tüm alimler</option>
                {alimSecenek.map(a => <option key={a.id} value={a.id}>{a.isim}</option>)}
              </select>
            </label>
            <label style={{ display: "flex", alignItems: "center", gap: "10px", opacity: secAlim ? 1 : 0.5 }}>
              <span style={{ fontSize: "12px", color: theme.textSecondary, minWidth: "46px" }}>Kitap</span>
              <select value={secKitap} disabled={!secAlim} onChange={e => setSecKitap(e.target.value)} style={selStil(!secAlim)}>
                <option value="">Tüm kitaplar</option>
                {kitapSecenek.map(b => <option key={b.id} value={b.id}>{b.baslik}</option>)}
              </select>
            </label>
          </>
        )}

        {kuranMi && (
          <div style={{ fontSize: "12px", color: theme.textSecondary, padding: "2px 2px" }}>
            Rastgele bir sûre ya da âyet karşına çıkacak.
          </div>
        )}
      </div>

      {/* Kapsam etiketi */}
      <div style={{ textAlign: "center", fontSize: "12px", color: theme.textSecondary, margin: "16px 0 4px" }}>
        Kapsam: <span style={{ color: theme.accent }}>{kapsamEtiket}</span>
      </div>

      {/* Tefeül Et */}
      <button onClick={tefeulEt} disabled={yukleniyor}
        style={{
          width: "100%", marginTop: "10px", padding: "15px", borderRadius: "14px",
          background: theme.accent, color: "#fff", border: "none", cursor: yukleniyor ? "default" : "pointer",
          fontSize: "16px", fontWeight: 600, fontFamily: "PlayfairDisplay, serif",
          display: "flex", alignItems: "center", justifyContent: "center", gap: "10px",
          boxShadow: `0 4px 16px ${theme.accent}44`, opacity: yukleniyor ? 0.7 : 1,
        }}>
        {yukleniyor ? <Loader size={19} className="tef-spin" /> : <Shuffle size={19} />}
        {yukleniyor ? "Açılıyor…" : "Tefeül Et"}
      </button>

      {hata && <div style={{ textAlign: "center", fontSize: "13px", color: "#c0392b", marginTop: "12px" }}>{hata}</div>}

      <style>{`@keyframes tef-spin { to { transform: rotate(360deg) } } .tef-spin { animation: tef-spin 0.9s linear infinite }`}</style>
    </div>
  )
}
