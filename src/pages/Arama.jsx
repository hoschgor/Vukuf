import { useState, useEffect, useRef, useMemo } from "react"
import { useNavigate } from "react-router-dom"
import { Search, X, BookOpen, ChevronRight, Loader, SlidersHorizontal } from "lucide-react"
import { useApp } from "../AppContext"
import { kitaplar, kategoriler } from "../data/kitaplar"
import { useMediaQuery } from "../data/hooks/useMediaQuery"

// Bir alimin tüm kitapları (altKategoriler varsa düzleştir)
const alimKitaplari = (alim) =>
  (alim?.altKategoriler ? alim.altKategoriler.flatMap(a => a.kitaplar || []) : (alim?.kitaplar || []))
    .filter(b => b && b.dosya)

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
const trLower = (s) => (s || "").toLocaleLowerCase("tr").replace(/ı/g, "i")

// Kitap metinleri önbelleği (dosya -> sayfalar[])
const metinCache = new Map()
async function kitapYukle(dosya) {
  if (metinCache.has(dosya)) return metinCache.get(dosya)
  try {
    const r = await fetch(`/${dosya}`)
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

  const [sorgu, setSorgu] = useState("")
  const [yukleniyor, setYukleniyor] = useState(false)
  const [kitapSonuc, setKitapSonuc] = useState([])
  const [sureSonuc, setSureSonuc] = useState([])
  const aramaIdRef = useRef(0)

  // Özel (kapsamlı) arama: Kısım → Alim → Kitap
  const [filtreAcik, setFiltreAcik] = useState(false)
  const [secKisim, setSecKisim] = useState("")
  const [secAlim, setSecAlim] = useState("")
  const [secKitap, setSecKitap] = useState("")

  // Aranabilir kitaplar (düz katalog; kuran hariç, dosyası olanlar)
  const kitapListesi = useMemo(
    () => kitaplar.filter(k => k && k.dosya && k.id !== "kuran"),
    []
  )

  // Kısımlar (Kur'an kategorisi hariç — o sure adlarıyla ayrı aranıyor)
  const kisimlar = useMemo(
    () => kategoriler.filter(k => k.id !== "orijinal-eserler" && (k.alimler || []).some(a => alimKitaplari(a).length)),
    []
  )
  const kisimObj = kisimlar.find(k => k.id === secKisim) || null
  const alimSecenek = useMemo(
    () => (kisimObj ? (kisimObj.alimler || []).filter(a => alimKitaplari(a).length) : []),
    [secKisim]
  )
  const alimObj = alimSecenek.find(a => a.id === secAlim) || null
  const kitapSecenek = useMemo(() => (alimObj ? alimKitaplari(alimObj) : []), [secKisim, secAlim])

  const filtreAktif = !!(secKisim || secAlim || secKitap)

  // Aranacak kitap kümesi (kapsam)
  const kapsam = useMemo(() => {
    if (secKitap) { const b = kitapSecenek.find(x => x.id === secKitap); return b ? [b] : [] }
    if (alimObj) return alimKitaplari(alimObj)
    if (kisimObj) return (kisimObj.alimler || []).flatMap(alimKitaplari)
    return kitapListesi
  }, [secKisim, secAlim, secKitap, kitapListesi])

  // Açılışta son arama durumunu geri yükle (kaldığı yerden devam)
  useEffect(() => {
    try {
      const d = JSON.parse(localStorage.getItem("vukuf-arama-durum") || "null")
      if (d) {
        if (d.secKisim) { setSecKisim(d.secKisim); setFiltreAcik(true) }
        if (d.secAlim) setSecAlim(d.secAlim)
        if (d.secKitap) setSecKitap(d.secKitap)
        if (d.sorgu) setSorgu(d.sorgu)
      }
    } catch {}
    try { localStorage.removeItem("vukuf-aramaya-don") } catch {}   // Aramaya dönüldü → bildirim kalksın
  }, [])

  // Arama durumunu kalıcı tut (dönünce aynen devam etsin)
  useEffect(() => {
    try { localStorage.setItem("vukuf-arama-durum", JSON.stringify({ sorgu, secKisim, secAlim, secKitap })) } catch {}
  }, [sorgu, secKisim, secAlim, secKitap])

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
      localStorage.setItem("vukuf-aramaya-don", "1")   // okuma ekranında "Aramaya dön" göster
    } catch {}
    navigate(`/kitap/${r.kitapId}`)
  }

  // Sureye git: numarayı belleğe yaz, Kuran'ı aç (KuranOkuma açılışta okur)
  function sureyeGit(s) {
    try {
      localStorage.setItem("vukuf-kuran-hedef", JSON.stringify({ sureNo: s.no }))
      localStorage.setItem("vukuf-aramaya-don", "1")
    } catch {}
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
        Kitaplarda her şeyi, Kur'an'da sure adlarını ara.
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
            <span style={{ fontSize: "12px", color: theme.textSecondary }}>
              {[kisimObj?.baslik, alimObj?.isim, kitapSecenek.find(x => x.id === secKitap)?.baslik].filter(Boolean).join(" · ")}
            </span>
            <button onClick={() => { setSecKisim(""); setSecAlim(""); setSecKitap("") }}
              style={{ display: "flex", alignItems: "center", gap: "3px", fontSize: "12px", color: theme.accent, background: "none", border: "none", cursor: "pointer" }}>
              <X size={13} /> temizle
            </button>
          </>
        )}
      </div>

      {/* Filtre çekmecesi: Kısım → Alim → Kitap */}
      <div style={{
        overflow: "hidden", transition: "max-height 0.3s ease, opacity 0.25s ease, margin 0.25s ease",
        maxHeight: filtreAcik ? "260px" : "0px", opacity: filtreAcik ? 1 : 0, marginTop: filtreAcik ? "10px" : "0px",
      }}>
        <div style={{ display: "flex", flexDirection: "column", gap: "10px", padding: "14px", borderRadius: "12px", background: theme.surface, border: `1px solid ${theme.border}` }}>
          {[
            { label: "Kısım", value: secKisim, secenekler: kisimlar.map(k => ({ id: k.id, ad: k.baslik })),
              onChange: v => { setSecKisim(v); setSecAlim(""); setSecKitap("") }, hepsi: "Tüm kısımlar" },
            { label: "Alim", value: secAlim, secenekler: alimSecenek.map(a => ({ id: a.id, ad: a.isim })), disabled: !secKisim,
              onChange: v => { setSecAlim(v); setSecKitap("") }, hepsi: "Tüm alimler" },
            { label: "Kitap", value: secKitap, secenekler: kitapSecenek.map(b => ({ id: b.id, ad: b.baslik })), disabled: !secAlim,
              onChange: v => setSecKitap(v), hepsi: "Tüm kitaplar" },
          ].map(alan => (
            <label key={alan.label} style={{ display: "flex", alignItems: "center", gap: "10px", opacity: alan.disabled ? 0.5 : 1 }}>
              <span style={{ fontSize: "12px", color: theme.textSecondary, minWidth: "44px" }}>{alan.label}</span>
              <select value={alan.value} disabled={alan.disabled} onChange={e => alan.onChange(e.target.value)}
                style={{
                  flex: 1, padding: "8px 10px", borderRadius: "8px", border: `1px solid ${theme.border}`,
                  background: theme.background, color: theme.text, fontSize: "14px", fontFamily: "inherit",
                  cursor: alan.disabled ? "not-allowed" : "pointer",
                }}>
                <option value="">{alan.hepsi}</option>
                {alan.secenekler.map(o => <option key={o.id} value={o.id}>{o.ad}</option>)}
              </select>
            </label>
          ))}
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
