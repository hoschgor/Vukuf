import { useState, useEffect, useRef, useMemo } from "react"
import { useNavigate } from "react-router-dom"
import { Search, X, BookOpen, ChevronRight, Loader, SlidersHorizontal } from "lucide-react"
import { useApp } from "../AppContext"
import { useMediaQuery } from "../data/hooks/useMediaQuery"
import { normHarf } from "../data/okumaKayit"
import KapsamSecici from "../components/KapsamSecici"

// ════════════════════════════════════════════════════════════════
// Kur'an sure adları (Türkçe) — arama sadece isim üzerinden; gidiş no ile
// ════════════════════════════════════════════════════════════════
const SURELER = [
  "Fâtiha", "Bakara", "Âl-i İmrân", "Nisâ", "Mâide", "En'âm", "A'râf", "Enfâl",
  "Tevbe", "Yûnus", "Hûd", "Yûsuf", "Ra'd", "İbrâhîm", "Hicr", "Nahl", "İsrâ",
  "Kehf", "Meryem", "Tâhâ", "Enbiyâ", "Hac", "Mü'minûn", "Nûr", "Furkân",
  "Şuarâ", "Neml", "Kasas", "Ankebût", "Rûm", "Lokmân", "Secde", "Ahzâb", "Sebe'",
  "Fâtır", "Yâsîn", "Sâffât", "Sâd", "Zümer", "Mü'min (Gâfir)", "Fussilet",
  "Şûrâ", "Zuhruf", "Duhân", "Câsiye", "Ahkâf", "Muhammed", "Fetih", "Hucurât",
  "Kâf", "Zâriyât", "Tûr", "Necm", "Kamer", "Rahmân", "Vâkıa", "Hadîd",
  "Mücâdele", "Haşr", "Mümtehine", "Saff", "Cuma", "Münâfikûn", "Teğâbün",
  "Talâk", "Tahrîm", "Mülk", "Kalem", "Hâkka", "Meâric", "Nûh", "Cin",
  "Müzzemmil", "Müddessir", "Kıyâme", "İnsân", "Mürselât", "Nebe'", "Nâziât",
  "Abese", "Tekvîr", "İnfitâr", "Mutaffifîn", "İnşikâk", "Bürûc", "Târık",
  "A'lâ", "Gâşiye", "Fecr", "Beled", "Şems", "Leyl", "Duhâ", "İnşirâh (Şerh)",
  "Tîn", "Alak", "Kadir", "Beyyine", "Zilzâl", "Âdiyât", "Kâria", "Tekâsür",
  "Asr", "Hümeze", "Fîl", "Kureyş", "Mâûn", "Kevser", "Kâfirûn", "Nasr",
  "Tebbet (Mesed)", "İhlâs", "Felâk", "Nâs",
].map((ad, i) => ({ no: i + 1, ad }))

// Türkçe-duyarlı küçük harf (İ→i, I→ı→i)
// Arama eşleştirmesi: şapka/aksan + büyük-küçük duyarsız (â→a, ş→s, ...).
// normHarf precomposed harflerde uzunluğu korur → önizleme dilimlemesi hizalı kalır.
const trLower = normHarf

// Kitap metinleri önbelleği (dosya -> sayfalar[])
const metinCache = new Map()
async function kitapYukle(dosya) {
  if (metinCache.has(dosya)) return metinCache.get(dosya)
  try {
    const r = await fetch(`/kitap-metin/${dosya}`)
    const d = await r.json()
    metinCache.set(dosya, Array.isArray(d) ? d : [])
  } catch {
    metinCache.set(dosya, [])
  }
  return metinCache.get(dosya)
}

const KITAP_BASI_LIMIT = 6     // bir kitaptan en çok kaç önizleme
const TOPLAM_LIMIT = 80        // toplam kitap-içi sonuç

export default function Arama() {
  const { theme } = useApp()
  const navigate = useNavigate()
  const isMobile = useMediaQuery("(max-width: 768px)")

  // "Aramaya dön" ile gelindiyse son durumu al (menüden girişte temiz)
  const ilk = useMemo(() => {
    try {
      if (localStorage.getItem("vukuf-arama-devam") === "1") {
        return JSON.parse(localStorage.getItem("vukuf-arama-durum") || "null")
      }
    } catch {}
    return null
  }, [])

  const [sorgu, setSorgu] = useState(ilk?.sorgu || "")
  const [yukleniyor, setYukleniyor] = useState(false)
  const [kitapSonuc, setKitapSonuc] = useState([])
  const [sureSonuc, setSureSonuc] = useState([])
  const aramaIdRef = useRef(0)

  // Özel (kapsamlı) arama — KapsamSecici bileşeni yönetir, scope buraya gelir
  const [filtreAcik, setFiltreAcik] = useState(!!(ilk?.secimler && Object.values(ilk.secimler).some(Boolean)))
  const [sifirla, setSifirla] = useState(0)   // KapsamSecici'yi sıfırlamak için key
  const [scope, setScope] = useState({ kuran: false, kapsam: [], etiket: "Tüm kitaplar", filtreAktif: false, secimler: {} })
  const filtreAktif = scope.filtreAktif
  const kapsam = scope.kapsam

  // Açılışta dönüş bayraklarını temizle (durum zaten ilk'te okundu)
  useEffect(() => {
    try { localStorage.removeItem("vukuf-arama-devam"); localStorage.removeItem("vukuf-donus") } catch {}
  }, [])

  // Bir sonuca giderken o anki arama durumunu anlık kaydet (dönünce devam etsin)
  function durumKaydet() {
    try { localStorage.setItem("vukuf-arama-durum", JSON.stringify({ sorgu, secimler: scope.secimler })) } catch {}
  }

  useEffect(() => {
    const q = sorgu.trim()
    if (q.length < 2) { setKitapSonuc([]); setSureSonuc([]); setYukleniyor(false); return }
    const benimId = ++aramaIdRef.current
    const norm = trLower(q)

    // 1) Sure adları — anında (yalnız filtre yokken; kısım/alim seçiliyken gizli)
    setSureSonuc(filtreAktif ? [] : SURELER.filter(s => trLower(s.ad).includes(norm)).slice(0, 15))

    // 2) Kitap içi — debounce + önbellek (kapsam = seçilen filtre)
    setYukleniyor(true)
    const t = setTimeout(async () => {
      const yuklu = await Promise.all(
        kapsam.map(k => kitapYukle(k.dosya).then(d => ({ k, d })))
      )
      if (benimId !== aramaIdRef.current) return   // yeni arama başladı

      const bulunan = []
      dis: for (const { k, d } of yuklu) {
        let kitapSay = 0
        for (const sayfa of d) {
          const satirlar = (sayfa.metin || "").split("\n")
          for (let si = 0; si < satirlar.length; si++) {
            const satir = satirlar[si]
            if (!satir || satir.startsWith("§")) continue
            const idx = trLower(satir).indexOf(norm)
            if (idx === -1) continue
            const bas = Math.max(0, idx - 30)
            const son = idx + norm.length + 55
            const onizleme = (bas > 0 ? "…" : "") + satir.slice(bas, son).trim() + (satir.length > son ? "…" : "")
            bulunan.push({ kitapId: k.id, kitapAd: k.baslik, yazar: k.yazar, sayfaNo: sayfa.sayfa, satirIdx: si, onizleme })
            if (++kitapSay >= KITAP_BASI_LIMIT) break
            if (bulunan.length >= TOPLAM_LIMIT) break dis
          }
          if (kitapSay >= KITAP_BASI_LIMIT) break
        }
      }
      if (benimId !== aramaIdRef.current) return
      setKitapSonuc(bulunan)
      setYukleniyor(false)
    }, 320)

    return () => clearTimeout(t)
  }, [sorgu, kapsam, filtreAktif])

  // Kitap içi sonuca git: hedefi belleğe yaz, kitabı aç (OkumaEkrani açılışta okur)
  function kitabaGit(r) {
    try {
      localStorage.setItem("vukuf-arama-hedef", JSON.stringify({
        kitapId: r.kitapId, aranan: sorgu.trim(), sayfaNo: r.sayfaNo, satirIdx: r.satirIdx,
      }))
      localStorage.setItem("vukuf-donus", "arama")   // okuma ekranında "Aramaya dön" göster
    } catch {}
    durumKaydet()
    navigate(`/kitap/${r.kitapId}`)
  }

  // Sureye git: numarayı belleğe yaz, Kuran'ı aç (KuranOkuma açılışta okur)
  function sureyeGit(s) {
    try {
      localStorage.setItem("vukuf-kuran-hedef", JSON.stringify({ sureNo: s.no }))
      localStorage.setItem("vukuf-donus", "arama")
    } catch {}
    durumKaydet()
    navigate("/kuran")
  }

  const q = sorgu.trim()
  const sonucVar = q.length >= 2
  const hicYok = sonucVar && !yukleniyor && sureSonuc.length === 0 && kitapSonuc.length === 0

  return (
    <div style={{ maxWidth: "760px", margin: "0 auto", padding: isMobile ? "20px 16px 60px" : "36px 24px 80px" }}>
      <h1 style={{ fontSize: isMobile ? "26px" : "34px", color: theme.accent, marginBottom: "6px", fontFamily: "PlayfairDisplay, serif" }}>
        Arama
      </h1>
      <p style={{ fontSize: "13px", color: theme.textSecondary, marginBottom: "20px" }}>
        Kitaplarda her şeyi, Kur'an'da sure adlarını arayabilirsiniz.
      </p>

      {/* Arama kutusu */}
      <div style={{
        display: "flex", alignItems: "center", gap: "10px",
        padding: "12px 16px", borderRadius: "14px",
        background: theme.surface, border: `1px solid ${theme.border}`,
        boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
      }}>
        <Search size={20} color={theme.accent} />
        <input
          autoFocus
          value={sorgu}
          onChange={e => setSorgu(e.target.value)}
          placeholder="Kelime, kavram ya da sure adı…"
          style={{
            flex: 1, border: "none", outline: "none", background: "transparent",
            color: theme.text, fontSize: "16px", fontFamily: "inherit",
          }}
        />
        {sorgu && (
          <button onClick={() => setSorgu("")} style={{ background: "none", border: "none", cursor: "pointer", color: theme.textSecondary, display: "flex" }}>
            <X size={18} />
          </button>
        )}
      </div>

      {/* Özel arama (filtre) aç/kapa + aktif etiket */}
      <div style={{ display: "flex", alignItems: "center", gap: "10px", marginTop: "10px", flexWrap: "wrap" }}>
        <button onClick={() => setFiltreAcik(v => !v)}
          style={{
            display: "flex", alignItems: "center", gap: "6px", padding: "7px 12px", borderRadius: "10px",
            border: `1px solid ${filtreAcik || filtreAktif ? theme.accent : theme.border}`,
            background: filtreAcik || filtreAktif ? `${theme.accent}12` : "transparent",
            color: filtreAcik || filtreAktif ? theme.accent : theme.textSecondary, cursor: "pointer", fontSize: "13px",
          }}>
          <SlidersHorizontal size={15} /> Özel arama
        </button>
        {filtreAktif && (
          <>
            <span style={{ fontSize: "12px", color: theme.textSecondary }}>{scope.etiket}</span>
            <button onClick={() => setSifirla(x => x + 1)}
              style={{ display: "flex", alignItems: "center", gap: "3px", fontSize: "12px", color: theme.accent, background: "none", border: "none", cursor: "pointer" }}>
              <X size={13} /> temizle
            </button>
          </>
        )}
      </div>

      {/* Filtre çekmecesi: Kısım → Alim → (Eserler) → Kitap */}
      <div style={{
        overflow: "visible", transition: "max-height 0.3s ease, opacity 0.25s ease, margin 0.25s ease",
        maxHeight: filtreAcik ? "600px" : "0px", opacity: filtreAcik ? 1 : 0, marginTop: filtreAcik ? "10px" : "0px",
        ...(filtreAcik ? {} : { overflow: "hidden" }),
      }}>
        <div style={{ padding: "14px", borderRadius: "12px", background: theme.surface, border: `1px solid ${theme.border}` }}>
          <KapsamSecici key={sifirla} theme={theme} baslangic={sifirla === 0 ? ilk?.secimler : undefined} onChange={setScope} />
        </div>
      </div>

      {/* Çekmece — sonuçlar */}
      <div style={{
        overflow: "hidden",
        transition: "max-height 0.35s ease, opacity 0.3s ease, margin 0.3s ease",
        maxHeight: sonucVar ? "2000px" : "0px",
        opacity: sonucVar ? 1 : 0,
        marginTop: sonucVar ? "18px" : "0px",
      }}>
        {/* Kur'an sure sonuçları */}
        {sureSonuc.length > 0 && (
          <div style={{ marginBottom: "20px" }}>
            <div style={{ fontSize: "11px", letterSpacing: "1.5px", color: theme.textSecondary, marginBottom: "8px" }}>
              KUR'ÂN-I KERÎM · SÛRELER
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              {sureSonuc.map(s => (
                <button key={s.no} onClick={() => sureyeGit(s)}
                  style={{
                    display: "flex", alignItems: "center", gap: "10px", textAlign: "left",
                    padding: "10px 14px", borderRadius: "10px", cursor: "pointer",
                    background: `${theme.accent}08`, border: `1px solid ${theme.border}`, color: theme.text,
                  }}>
                  <span style={{ fontSize: "11px", color: theme.accent, minWidth: "26px", fontWeight: 700 }}>{s.no}</span>
                  <span style={{ flex: 1, fontSize: "15px" }}>{s.ad} Sûresi</span>
                  <ChevronRight size={16} color={theme.accent} />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Kitap içi sonuçlar */}
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "11px", letterSpacing: "1.5px", color: theme.textSecondary, marginBottom: "8px" }}>
            KİTAPLARDA
            {yukleniyor && <Loader size={13} className="arama-spin" style={{ color: theme.accent }} />}
          </div>
          {!yukleniyor && kitapSonuc.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {kitapSonuc.map((r, i) => (
                <button key={i} onClick={() => kitabaGit(r)}
                  style={{
                    display: "flex", flexDirection: "column", gap: "4px", textAlign: "left",
                    padding: "11px 14px", borderRadius: "10px", cursor: "pointer",
                    background: theme.surface, border: `1px solid ${theme.border}`, color: theme.text,
                  }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "11px", color: theme.accent }}>
                    <BookOpen size={12} />
                    <span style={{ fontWeight: 600 }}>{r.kitapAd}</span>
                    <span style={{ color: theme.textSecondary, marginLeft: "auto" }}>s. {r.sayfaNo}</span>
                  </div>
                  <div style={{ fontSize: "13px", color: theme.textSecondary, lineHeight: 1.5 }}>{r.onizleme}</div>
                </button>
              ))}
            </div>
          )}
          {yukleniyor && (
            <div style={{ fontSize: "13px", color: theme.textSecondary, padding: "8px 2px" }}>Kitaplarda aranıyor…</div>
          )}
          {!yukleniyor && sonucVar && kitapSonuc.length === 0 && sureSonuc.length > 0 && (
            <div style={{ fontSize: "13px", color: theme.textSecondary, padding: "8px 2px" }}>Kitaplarda eşleşme yok.</div>
          )}
        </div>

        {hicYok && (
          <div style={{ textAlign: "center", padding: "30px 0", color: theme.textSecondary, fontSize: "14px" }}>
            "{q}" için sonuç bulunamadı.
          </div>
        )}
      </div>

      <style>{`@keyframes arama-spin { to { transform: rotate(360deg) } } .arama-spin { animation: arama-spin 0.9s linear infinite }`}</style>
    </div>
  )
}
