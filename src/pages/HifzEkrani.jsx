/* VUKUF — HIFZ EKRANI (/hifz)
   src/pages/HifzEkrani.jsx

   Hıfzın PLAN tarafı: bugün tekrarı gelenler, ilerleme haritası, zor âyetler.
   ÇALIŞMA tarafı burada değil — o, mushafın kendi sayfası üzerinde yürüyor
   (gerekçesi src/data/hifz.js'te). Bu ekran "ne çalışacağım"ı söyler, çalışmayı
   mushafa devreder.

   Tekrar iki yolla kapatılabiliyor:
     • Ezberden okuyup doğrudan "Kolay/Orta/Zor" demek — mushafı açmaya gerek yok.
     • "Mushafta aç" ile o âyete gidip perdeli çalışmak.
   İkisi de gerçek kullanım: bazen hatırladığını bilirsin, bazen bakman gerekir. */

import { useEffect, useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import { Brain, ChevronRight, Eye, CheckCircle2, Loader, BookOpen } from "lucide-react"
import { useApp } from "../AppContext"
import { mushafYukle } from "../data/mushafVerisi"
import {
  useHifz, bekleyenTekrarlar, zorAyetler, ozet, cevapla, DURUM,
  HEDEF_ANAHTAR, DONUS_ANAHTAR,
} from "../data/hifz"

const ZORLUKLAR = [
  { id: "kolay", ad: "Kolay" },
  { id: "orta",  ad: "Orta" },
  { id: "zor",   ad: "Zor" },
]

export default function HifzEkrani() {
  const { theme } = useApp()
  const navigate = useNavigate()
  const [veri] = useHifz()
  const [mushaf, setMushaf] = useState(null)
  const [hata, setHata] = useState("")

  /* OKUMAYA DÖNÜŞ — buraya mushaftan mı gelindi?
     Okuma ekranı ayrılırken çalıştığı âyeti DONUS_ANAHTAR'a yazıyor. Anahtar
     ilk okumada SİLİNİYOR ve bilgi bileşen durumunda tutuluyor; böylece menüden
     girilen bir sonraki ziyarette bayat bir "dön" düğmesi kalmıyor. */
  const [donus] = useState(() => {
    try {
      const ham = localStorage.getItem(DONUS_ANAHTAR)
      if (!ham) return null
      localStorage.removeItem(DONUS_ANAHTAR)
      const d = JSON.parse(ham)
      return (d && d.sure && d.ayet) ? d : null
    } catch { return null }
  })

  useEffect(() => {
    let iptal = false
    mushafYukle()
      .then(m => { if (!iptal) setMushaf(m) })
      .catch(() => { if (!iptal) setHata("Mushaf verisi yüklenemedi — çevrimdışı olabilirsiniz.") })
    return () => { iptal = true }
  }, [])

  const sureAdi = useMemo(() => {
    const m = new Map((mushaf || []).map(s => [s.id, s.isim]))
    return (no) => m.get(no) || `Sûre ${no}`
  }, [mushaf])

  const bekleyen = useMemo(() => bekleyenTekrarlar(veri), [veri])
  const zorlar = useMemo(() => zorAyetler(veri, 15), [veri])
  const sayilar = useMemo(() => ozet(veri), [veri])

  /* CÜZ İLERLEMESİ — cüz sınırları tabloya yazılmıyor, her âyetin kendi `cuz`
     alanından sayılıyor. (Ses indirmede de aynı kural: Kur'ân yapısına dair
     veri uydurulmuyor, projenin kendi mushaf verisinden türetiliyor.) */
  const cuzler = useMemo(() => {
    if (!mushaf) return []
    const kutu = new Map()
    for (const s of mushaf) {
      for (const a of s.ayetler || []) {
        const c = a.cuz
        if (!c) continue
        if (!kutu.has(c)) kutu.set(c, { no: c, toplam: 0, ezber: 0 })
        const k = kutu.get(c)
        k.toplam++
        const b = veri.birimler[`${s.id}:${a.no}`]
        if (b && b.d === DURUM.EZBERLENDI) k.ezber++
      }
    }
    return [...kutu.values()].sort((x, y) => x.no - y.no)
  }, [mushaf, veri])

  /* Hedef localStorage ile devrediliyor: yönlendirme durumu (router state)
     sayfa yenilenince kayboluyor, bu ise PWA'da geri gelindiğinde de duruyor.
     Biçim "sûre:âyet" ya da "sûre:âyet|kapsam". */
  function mushaftaAc(sureNo, ayetNo, kapsam) {
    const hedef = kapsam ? `${sureNo}:${ayetNo}|${kapsam}` : `${sureNo}:${ayetNo}`
    try { localStorage.setItem(HEDEF_ANAHTAR, hedef) } catch { /* kota */ }
    navigate("/kuran")
  }

  // Aynı köprünün ters yönü: bırakılan âyete ve kapsama geri dönülüyor.
  function okumayaDon() {
    if (!donus) { navigate("/kuran"); return }
    mushaftaAc(donus.sure, donus.ayet, donus.kapsam)
  }

  const kart = {
    background: theme.surface, border: `1px solid ${theme.border}`,
    borderRadius: "14px", padding: "14px 16px", marginBottom: "12px",
  }
  const baslik = {
    fontSize: "12px", fontWeight: 700, letterSpacing: "0.05em",
    textTransform: "uppercase", color: theme.textSecondary, margin: "0 0 10px",
  }
  const dugme = (vurgulu) => ({
    padding: "6px 12px", borderRadius: "999px", cursor: "pointer",
    fontSize: "12px", fontWeight: 600, fontFamily: "inherit", flexShrink: 0,
    border: `1px solid ${vurgulu ? theme.accent : theme.border}`,
    background: vurgulu ? theme.accent : "transparent",
    color: vurgulu ? "#fff" : theme.textSecondary,
  })

  return (
    <div style={{
      minHeight: "100vh", background: theme.background, color: theme.text,
      padding: "18px 14px calc(40px + env(safe-area-inset-bottom))",
      maxWidth: "760px", margin: "0 auto", boxSizing: "border-box",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: "9px", marginBottom: "14px" }}>
        <Brain size={20} color={theme.accent} />
        <h1 style={{ margin: 0, fontSize: "19px", fontWeight: 600 }}>Hıfz</h1>
        <div style={{ flex: 1 }} />
        {donus && (
          <button onClick={okumayaDon} title="Bıraktığınız âyete dön" style={{
            display: "inline-flex", alignItems: "center", gap: "6px",
            padding: "7px 13px", borderRadius: "999px", cursor: "pointer",
            fontSize: "12.5px", fontWeight: 600, fontFamily: "inherit",
            border: `1px solid ${theme.accent}`, background: "transparent", color: theme.accent,
          }}>
            <BookOpen size={14} /> Okumaya dön
          </button>
        )}
      </div>

      {/* ── ÖZET ─────────────────────────────────────────────────────────── */}
      <div style={{ display: "flex", gap: "10px", marginBottom: "12px" }}>
        {[
          { ad: "Ezberlenen", n: sayilar.ezber },
          { ad: "Çalışılan", n: sayilar.calisilan },
          { ad: "Bugün tekrar", n: sayilar.bekleyen, vurgu: sayilar.bekleyen > 0 },
        ].map(k => (
          <div key={k.ad} style={{
            flex: 1, textAlign: "center", padding: "12px 6px", borderRadius: "14px",
            background: theme.surface, border: `1px solid ${k.vurgu ? theme.accent : theme.border}`,
          }}>
            <div style={{ fontSize: "22px", fontWeight: 700, color: k.vurgu ? theme.accent : theme.text }}>{k.n}</div>
            <div style={{ fontSize: "11px", color: theme.textSecondary, marginTop: "2px" }}>{k.ad}</div>
          </div>
        ))}
      </div>

      {hata && (
        <div style={{ ...kart, color: "#c0392b", fontSize: "13px" }}>{hata}</div>
      )}

      {/* ── BUGÜNÜN TEKRARI ──────────────────────────────────────────────── */}
      <div style={kart}>
        <p style={baslik}>Bugünün tekrarı</p>
        {!bekleyen.length ? (
          <div style={{ display: "flex", alignItems: "center", gap: "8px", color: theme.textSecondary, fontSize: "13px" }}>
            <CheckCircle2 size={16} color={theme.accent} />
            {sayilar.ezber ? "Bugün tekrarı gelen âyet yok." : "Henüz ezberlenmiş âyet yok. Mushafta hıfz modunu açıp başlayabilirsiniz."}
          </div>
        ) : (
          <div style={{ maxHeight: "46vh", overflowY: "auto", margin: "0 -4px" }}>
            {bekleyen.map(b => (
              <div key={b.anahtar} style={{
                display: "flex", alignItems: "center", flexWrap: "wrap", gap: "7px",
                padding: "9px 4px", borderBottom: `1px solid ${theme.border}`,
              }}>
                <button
                  onClick={() => mushaftaAc(b.sureNo, b.ayetNo)}
                  title="Mushafta aç"
                  style={{
                    flex: 1, minWidth: "140px", textAlign: "left", background: "none",
                    border: "none", cursor: "pointer", padding: 0, fontFamily: "inherit",
                    display: "flex", alignItems: "center", gap: "6px", color: theme.text,
                  }}
                >
                  <span style={{ fontSize: "13.5px", fontWeight: 600 }}>
                    {sureAdi(b.sureNo)} <span style={{ color: theme.textSecondary, fontWeight: 500 }}>{b.ayetNo}</span>
                  </span>
                  {b.gecikme > 0 && (
                    <span style={{
                      fontSize: "10.5px", fontWeight: 700, color: "#fff",
                      background: "#c0392b", borderRadius: "999px", padding: "1px 6px",
                    }}>{b.gecikme} gün gecikti</span>
                  )}
                  <ChevronRight size={14} color={theme.textSecondary} />
                </button>
                <div style={{ display: "flex", gap: "5px" }}>
                  {ZORLUKLAR.map(z => (
                    <button key={z.id} onClick={() => cevapla(b.anahtar, z.id)} style={dugme(false)}>{z.ad}</button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── İLERLEME ─────────────────────────────────────────────────────── */}
      <div style={kart}>
        <p style={baslik}>Cüz cüz ilerleme</p>
        {!mushaf ? (
          <div style={{ display: "flex", alignItems: "center", gap: "8px", color: theme.textSecondary, fontSize: "13px" }}>
            <Loader size={15} className="hifz-spin" /> Mushaf verisi yükleniyor…
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(104px, 1fr))", gap: "8px" }}>
            {cuzler.map(c => {
              const oran = c.toplam ? c.ezber / c.toplam : 0
              return (
                <div key={c.no} title={`${c.ezber} / ${c.toplam} âyet`} style={{
                  padding: "7px 9px", borderRadius: "10px",
                  border: `1px solid ${oran > 0 ? theme.accent : theme.border}`,
                  background: theme.background,
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11.5px", marginBottom: "5px" }}>
                    <span style={{ fontWeight: 600 }}>{c.no}. cüz</span>
                    <span style={{ color: theme.textSecondary }}>%{Math.round(oran * 100)}</span>
                  </div>
                  <div style={{ height: "5px", borderRadius: "3px", background: `${theme.accent}22`, overflow: "hidden" }}>
                    <div style={{ width: `${oran * 100}%`, height: "100%", background: theme.accent }} />
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* ── ZOR ÂYETLER ──────────────────────────────────────────────────── */}
      {zorlar.length > 0 && (
        <div style={kart}>
          <p style={baslik}>Zorlandığınız âyetler</p>
          <p style={{ fontSize: "11.5px", color: theme.textSecondary, lineHeight: 1.6, margin: "-4px 0 10px" }}>
            En çok ipucu aldığınız âyetler. Tekrar takviminden bağımsız, fazladan çalışmak için.
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "7px" }}>
            {zorlar.map(z => (
              <button key={z.anahtar} onClick={() => mushaftaAc(z.sureNo, z.ayetNo)} style={{
                ...dugme(false), display: "inline-flex", alignItems: "center", gap: "5px",
              }}>
                {sureAdi(z.sureNo)} {z.ayetNo}
                <span style={{ display: "inline-flex", alignItems: "center", gap: "2px", opacity: 0.75 }}>
                  <Eye size={11} />{z.ipucu}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      <style>{`@keyframes hifz-spin{to{transform:rotate(360deg)}}.hifz-spin{animation:hifz-spin .9s linear infinite}`}</style>
    </div>
  )
}
