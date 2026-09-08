import { useState, useEffect, useRef, useMemo } from "react"
import { useNavigate } from "react-router-dom"
import { Search, X, BookOpen, ChevronRight, ChevronLeft, Loader, SlidersHorizontal, Asterisk } from "lucide-react"
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

// ARAMA SINIRI YOK: her kitap baştan sona taranır ve TÜM eşleşmeler toplanır.
// (Eskiden kitap başına 6, toplamda 80 sonuçta kesiliyordu.)
// Sınır yalnız ÇİZİMDE var: bir kitabın binlerce sonucu olabilir, hepsini birden
// DOM'a basmak sayfayı kilitler. Bu yüzden seçilen kitabın sonuçları sayfa sayfa
// açılır — arama sonucu eksilmez, sadece görünen kısım artarak gelir.
const SAYFA_ADIM = 50          // "Daha fazla" her basışta kaç sonuç daha gösterir

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
  const [tamArama, setTamArama] = useState(false)  // * : birebir (tam) arama — normalize yok
  const [yukleniyor, setYukleniyor] = useState(false)
  const [kitapGruplar, setKitapGruplar] = useState([])   // [{ kitapId, kitapAd, yazar, sonuclar: [...] }]
  // "Aramaya dön" ile gelindiyse acik kitap da geri yuklenir; yoksa kullanici sonuca
  // tikladiktan sonra geri donunce kitap listesine dusuyor ve yerini kaybediyor.
  const [secilenKitap, setSecilenKitap] = useState(ilk?.acikKitap || null)
  const [gosterilen, setGosterilen] = useState(SAYFA_ADIM)
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
    try { localStorage.setItem("vukuf-arama-durum", JSON.stringify({ sorgu, secimler: scope.secimler, acikKitap: secilenKitap })) } catch {}
  }

  useEffect(() => {
    const q = sorgu.trim()
    if (q.length < 2) { setKitapGruplar([]); setSureSonuc([]); setYukleniyor(false); return }
    const benimId = ++aramaIdRef.current
    const kucult = (s) => (tamArama ? s : trLower(s))   // tamArama: birebir; değilse normalize
    const norm = kucult(q)

    // 1) Sure adları — anında (yalnız filtre yokken). "Fussilet, 44" → virgül sonrası ayet no.
    //    İsim kısmıyla eşleştir; eşleşen surelere ayetNo iliştir (varsa o ayete gider).
    const vp = q.split(/[,،]/)
    const isimTerim = kucult(vp[0].trim())
    const ayetStr = (vp[1] || "").trim()
    const ayetNo = /^\d+$/.test(ayetStr) ? parseInt(ayetStr, 10) : null
    setSureSonuc(filtreAktif ? [] : SURELER
      .filter(s => kucult(s.ad).includes(isimTerim))
      .slice(0, 15)
      .map(s => ({ ...s, ayetNo })))

    // 2) Kitap içi — debounce + önbellek (kapsam = seçilen filtre)
    setYukleniyor(true)
    const t = setTimeout(async () => {
      const yuklu = await Promise.all(
        kapsam.map(k => kitapYukle(k.dosya).then(d => ({ k, d })))
      )
      if (benimId !== aramaIdRef.current) return   // yeni arama başladı

      // Sonuclar KITAP KITAP toplanir; hicbir yerde kesilmez.
      const gruplar = []
      for (const { k, d } of yuklu) {
        const sonuclar = []
        for (const sayfa of d) {
          const satirlar = (sayfa.metin || "").split("\n")
          for (let si = 0; si < satirlar.length; si++) {
            const satir = satirlar[si]
            if (!satir || satir.startsWith("§")) continue
            const idx = (tamArama ? satir : trLower(satir)).indexOf(norm)
            if (idx === -1) continue
            const bas = Math.max(0, idx - 30)
            const son = idx + norm.length + 55
            const onizleme = (bas > 0 ? "…" : "") + satir.slice(bas, son).trim() + (satir.length > son ? "…" : "")
            sonuclar.push({ kitapId: k.id, kitapAd: k.baslik, yazar: k.yazar, sayfaNo: sayfa.sayfa, satirIdx: si, onizleme })
          }
        }
        if (sonuclar.length) gruplar.push({ kitapId: k.id, kitapAd: k.baslik, yazar: k.yazar, sonuclar })
      }
      if (benimId !== aramaIdRef.current) return
      gruplar.sort((a, b) => b.sonuclar.length - a.sonuclar.length)   // cok sonuclu kitap once
      setKitapGruplar(gruplar)
      setYukleniyor(false)
    }, 320)

    return () => clearTimeout(t)
  }, [sorgu, kapsam, filtreAktif, tamArama])

  // Sorgu/kapsam degisince acik kitaptan cik ve sayfalamayi bastan basla —
  // yoksa artik var olmayan bir kitabin icinde kalinabiliyor.
  // ILK CALISMA ATLANIR: mount'ta da tetiklenir ve yukarida geri yuklenen
  // `acikKitap` aninda silinirdi.
  const ilkResetRef = useRef(true)
  useEffect(() => {
    if (ilkResetRef.current) { ilkResetRef.current = false; return }
    setSecilenKitap(null); setGosterilen(SAYFA_ADIM)
  }, [sorgu, kapsam, filtreAktif, tamArama])

  const acikGrup = kitapGruplar.find(g => g.kitapId === secilenKitap) || null
  const toplamSonuc = kitapGruplar.reduce((t, g) => t + g.sonuclar.length, 0)

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
      // ayetNo varsa (ör. "Fussilet, 44") o âyete, yoksa sure başına git
      localStorage.setItem("vukuf-kuran-hedef", JSON.stringify(s.ayetNo ? { sureNo: s.no, ayetNo: s.ayetNo } : { sureNo: s.no }))
      localStorage.setItem("vukuf-donus", "arama")
    } catch {}
    durumKaydet()
    navigate("/kuran")
  }

  const q = sorgu.trim()
  const sonucVar = q.length >= 2
  const hicYok = sonucVar && !yukleniyor && sureSonuc.length === 0 && kitapGruplar.length === 0

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
        <button onClick={() => setTamArama(v => !v)} title={tamArama ? "Birebir arama açık (tam yazıldığı gibi)" : "Birebir arama (tam yazıldığı gibi ara)"}
          style={{ display: "flex", alignItems: "center", justifyContent: "center", width: "30px", height: "30px", borderRadius: "8px", flexShrink: 0,
            background: tamArama ? theme.accent : `${theme.accent}15`, color: tamArama ? "#fff" : theme.accent, border: "none", cursor: "pointer" }}>
          <Asterisk size={17} />
        </button>
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
                  <span style={{ flex: 1, fontSize: "15px" }}>{s.ad} Sûresi{s.ayetNo ? <span style={{ color: theme.textSecondary, fontSize: "13px" }}> · {s.ayetNo}. âyet</span> : null}</span>
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
            {!yukleniyor && toplamSonuc > 0 && (
              <span style={{ letterSpacing: 0 }}>· {toplamSonuc} sonuç / {kitapGruplar.length} kitap</span>
            )}
            {yukleniyor && <Loader size={13} className="arama-spin" style={{ color: theme.accent }} />}
          </div>

          {/* 1. KADEME — KİTAP LİSTESİ: ad + o kitaptaki sonuç sayısı */}
          {!yukleniyor && !acikGrup && kitapGruplar.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {kitapGruplar.map(g => (
                <button key={g.kitapId}
                  onClick={() => { setSecilenKitap(g.kitapId); setGosterilen(SAYFA_ADIM) }}
                  style={{
                    display: "flex", alignItems: "center", gap: "10px", textAlign: "left",
                    padding: "13px 14px", borderRadius: "10px", cursor: "pointer",
                    background: theme.surface, border: `1px solid ${theme.border}`, color: theme.text,
                  }}>
                  <BookOpen size={15} style={{ color: theme.accent, flexShrink: 0 }} />
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ display: "block", fontSize: "14px", fontWeight: 600 }}>{g.kitapAd}</span>
                    {g.yazar && (
                      <span style={{ display: "block", fontSize: "11px", color: theme.textSecondary, marginTop: "2px" }}>{g.yazar}</span>
                    )}
                  </span>
                  <span style={{
                    flexShrink: 0, fontSize: "12px", fontWeight: 600, color: theme.accent,
                    background: `${theme.accent}18`, borderRadius: "999px", padding: "3px 9px",
                  }}>{g.sonuclar.length}</span>
                  <ChevronRight size={15} style={{ color: theme.textSecondary, flexShrink: 0 }} />
                </button>
              ))}
            </div>
          )}

          {/* 2. KADEME — SEÇİLEN KİTABIN SONUÇLARI (aynı sayfada, eski görünümle) */}
          {!yukleniyor && acikGrup && (
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              <button onClick={() => setSecilenKitap(null)}
                style={{
                  display: "flex", alignItems: "center", gap: "8px", textAlign: "left",
                  padding: "9px 12px", borderRadius: "10px", cursor: "pointer",
                  background: "transparent", border: `1px solid ${theme.border}`, color: theme.text,
                }}>
                <ChevronLeft size={15} style={{ color: theme.accent, flexShrink: 0 }} />
                <span style={{ flex: 1, minWidth: 0, fontSize: "13px", fontWeight: 600 }}>{acikGrup.kitapAd}</span>
                <span style={{ fontSize: "12px", color: theme.textSecondary }}>{acikGrup.sonuclar.length} sonuç</span>
              </button>

              {acikGrup.sonuclar.slice(0, gosterilen).map((r, i) => (
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

              {acikGrup.sonuclar.length > gosterilen && (
                <button onClick={() => setGosterilen(n => n + SAYFA_ADIM)}
                  style={{
                    padding: "11px 14px", borderRadius: "10px", cursor: "pointer",
                    background: "transparent", border: `1px dashed ${theme.border}`,
                    color: theme.accent, fontSize: "13px", fontWeight: 600,
                  }}>
                  Daha fazla göster ({acikGrup.sonuclar.length - gosterilen} kaldı)
                </button>
              )}
            </div>
          )}
          {yukleniyor && (
            <div style={{ fontSize: "13px", color: theme.textSecondary, padding: "8px 2px" }}>Kitaplarda aranıyor…</div>
          )}
          {!yukleniyor && sonucVar && kitapGruplar.length === 0 && sureSonuc.length > 0 && (
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
