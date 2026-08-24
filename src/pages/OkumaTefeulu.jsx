import { useState, useMemo, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { Shuffle, Loader, Sparkles } from "lucide-react"
import { useApp } from "../AppContext"
import { useMediaQuery } from "../data/hooks/useMediaQuery"
import KapsamSecici from "../components/KapsamSecici"

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

  // "Tefeüle dön" ile gelindiyse son kapsamı geri yükle; menüden girişte temiz
  const ilk = useMemo(() => {
    try {
      if (localStorage.getItem("vukuf-tefeul-devam") === "1") {
        return JSON.parse(localStorage.getItem("vukuf-tefeul-durum") || "null")
      }
    } catch {}
    return null
  }, [])

  const [scope, setScope] = useState({ kuran: false, kapsam: [], etiket: "Tüm kitaplar", secimler: {} })
  const [yukleniyor, setYukleniyor] = useState(false)
  const [hata, setHata] = useState("")

  useEffect(() => {
    try { localStorage.removeItem("vukuf-tefeul-devam"); localStorage.removeItem("vukuf-donus") } catch {}
  }, [])

  async function tefeulEt() {
    setHata("")
    // Dönüş bilgisi: okuma ekranında "Tefeüle dön" göster + kapsamı hatırla
    try {
      localStorage.setItem("vukuf-donus", "tefeul")
      localStorage.setItem("vukuf-tefeul-durum", JSON.stringify({ secimler: scope.secimler }))
    } catch {}

    // Kur'an: rastgele sure (başlık) ya da ayet
    if (scope.kuran) {
      const sureNo = 1 + rnd(114)
      const payload = (Math.random() < 0.5)
        ? { sureNo }
        : { sureNo, ayetNo: 1 + rnd(AYET_SAYILARI[sureNo - 1] || 1) }
      try { localStorage.setItem("vukuf-kuran-hedef", JSON.stringify(payload)) } catch {}
      navigate("/kuran")
      return
    }

    const havuz = scope.kapsam || []
    if (!havuz.length) { setHata("Bu kapsamda kitap yok."); return }

    setYukleniyor(true)
    const karisik = [...havuz].sort(() => Math.random() - 0.5)
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
        const ham = satirlar[si].replace(/⟦H\d+⟧/g, "").replace(/\[\d+\]/g, "").trim()
        const m = ham.match(/^[\s\S]*?[.!?:]/)
        const ilkCumle = (m ? m[0] : ham).slice(0, 90).trim()
        try {
          localStorage.setItem("vukuf-arama-hedef", JSON.stringify({
            kitapId: kitap.id, aranan: ilkCumle, sayfaNo: sayfa.sayfa, satirIdx: si,
          }))
        } catch {}
        setYukleniyor(false)
        navigate(`/kitap/${kitap.id}`)
        return
      }
    }
    setYukleniyor(false)
    setHata("Uygun bir bölüm bulunamadı, tekrar deneyiniz.")
  }

  return (
    <div style={{ maxWidth: "560px", margin: "0 auto", padding: isMobile ? "22px 16px 60px" : "44px 24px 80px" }}>
      <div style={{ textAlign: "center", marginBottom: "26px" }}>
        <Sparkles size={30} color={theme.accent} style={{ marginBottom: "6px" }} />
        <h1 style={{ fontSize: isMobile ? "26px" : "34px", color: theme.accent, fontFamily: "Souvenir, serif" }}>
          Okuma Tefeülü
        </h1>
        <p style={{ fontSize: "13px", color: theme.textSecondary, marginTop: "6px" }}>
          Rastgele bir bölüm okumak için kapsam seçiniz.
        </p>
      </div>

      <div style={{ padding: "16px", borderRadius: "14px", background: theme.surface, border: `1px solid ${theme.border}` }}>
        <KapsamSecici theme={theme} kuranSecenek baslangic={ilk?.secimler} onChange={setScope} />
        {scope.kuran && (
          <div style={{ fontSize: "12px", color: theme.textSecondary, marginTop: "12px" }}>
            Rastgele bir sûre ya da âyet karşınıza çıkacak.
          </div>
        )}
      </div>

      <div style={{ textAlign: "center", fontSize: "12px", color: theme.textSecondary, margin: "16px 0 4px" }}>
        Kapsam: <span style={{ color: theme.accent }}>{scope.etiket}</span>
      </div>

      <button onClick={tefeulEt} disabled={yukleniyor}
        style={{
          width: "100%", marginTop: "10px", padding: "15px", borderRadius: "14px",
          background: theme.accent, color: "#fff", border: "none", cursor: yukleniyor ? "default" : "pointer",
          fontSize: "16px", fontWeight: 600, fontFamily: "PlayfairDisplay, serif",
          display: "flex", alignItems: "center", justifyContent: "center", gap: "10px",
          boxShadow: `0 4px 16px ${theme.accent}44`, opacity: yukleniyor ? 0.7 : 1,
        }}>
        {yukleniyor ? <Loader size={19} className="tef-spin" /> : <Shuffle size={19} />}
        {yukleniyor ? "Açılıyor…" : "Tefeül"}
      </button>

      {hata && <div style={{ textAlign: "center", fontSize: "13px", color: "#c0392b", marginTop: "12px" }}>{hata}</div>}

      <style>{`@keyframes tef-spin { to { transform: rotate(360deg) } } .tef-spin { animation: tef-spin 0.9s linear infinite }`}</style>
    </div>
  )
}
