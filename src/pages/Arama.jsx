import { useState, useEffect, useLayoutEffect, useRef, useMemo } from "react"
import { useNavigate } from "react-router-dom"
import { Search, X, BookOpen, ChevronRight, ChevronLeft, Loader, SlidersHorizontal, Asterisk } from "lucide-react"
import { useApp } from "../AppContext"
import { useMediaQuery } from "../data/hooks/useMediaQuery"
import { normHarf } from "../data/okumaKayit"
import KapsamSecici from "../components/KapsamSecici"
import { kategoriler } from "../data/kitaplar"

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

// ════════════════════════════════════════════════════════════════
// KİTAP → KATALOGDAKİ YERİ  (yalnızca SIRALAMA için; arayüzde gösterilmez)
//
// İki gerçek, katalog okunarak doğrulandı:
//  1) `altKategoriler` hiç kullanılmıyor. "Büyük Eserler" / "Küçük Eserler"
//     ayrımı ALİM GİRİŞİ olarak duruyor (risale/buyuk-eserler gibi).
//  2) AYNI ÂLİM BİRDEN ÇOK GİRİŞTE olabiliyor: İmam Gazâlî hem tasavvuf/imam-gazali
//     hem kelam/imam-gazali-kelam altında. Bu yüzden âlim girişinin ID'sine göre
//     gruplamak YETMİYOR — "Kıyâmet ve Âhiret" ile "İlcâmü'l-Avâm" ayrı düşüyordu.
//     Kimlik olarak kitabın `yazar`ı, yoksa âlimin `isim`i kullanılır; böylece aynı
//     zat hangi kısımda geçerse geçsin tek blok olur.
// ════════════════════════════════════════════════════════════════
const trAnahtar = (x) => String(x || "").trim().toLocaleLowerCase("tr")

// KATALOG SIRASI KORUNACAK KÜME(LER) — "kısımId/âlimId".
// Risale-i Nûr Büyük Eserleri kütüphanedeki diziliş dışında bir sırayla
// gösterilmemeli (Sözler → Mektubat → Lem'alar → Şuâlar …); sonuç sayısına göre
// dizilince karışık görünüyor. Başka bir küme de sabitlenecekse buraya eklenir.
// Bunun DIŞINDA kalan her yerde sıra serbesttir → sonuç sayısı belirler.
const SABIT_SIRALI = new Set(["risale/buyuk-eserler"])

const KITAP_YERI = (() => {
  const m = new Map()
  let sira = 0
  for (const kisim of kategoriler || []) {
    for (const alim of kisim.alimler || []) {
      const kume = `${kisim.id}/${alim.id}`
      const sabit = SABIT_SIRALI.has(kume)
      // altKategoriler bugün kullanılmıyor; ileride eklenirse diye destekleniyor.
      const altlar = (alim.altKategoriler && alim.altKategoriler.length)
        ? alim.altKategoriler
        : [{ kitaplar: alim.kitaplar || [] }]
      for (const alt of altlar) {
        for (const b of alt.kitaplar || []) {
          // Aynı kitap birden çok rafta geçebilir; İLK görüldüğü yer esas alınır.
          if (b && b.id && !m.has(b.id)) {
            m.set(b.id, {
              // Zatın kimliği: önce kitabın yazarı, yoksa âlim başlığı.
              // (Âlim ID'si YETMEZ: İmam Gazâlî hem tasavvuf hem kelam altında geçiyor.)
              zat: trAnahtar(b.yazar) || trAnahtar(alim.isim) || "?",
              kume, sabit,
              sira: sira++,        // katalogdaki (kütüphanedeki) sıra
            })
          }
        }
      }
    }
  }
  return m
})()

// Katalogda bulunamayan kitap (ör. kullanıcının özel rafı) için yedek: yazar adı.
const kitapYeri = (g) =>
  KITAP_YERI.get(g.kitapId) || { zat: trAnahtar(g.yazar) || "?", kume: "", sabit: false, sira: Number.MAX_SAFE_INTEGER }

// Bir kümeye sıra numarası ver: önce en çok sonuç veren küme, eşitlikte katalog sırası.
function kumeSiralari(gruplar, anahtarAl) {
  const kume = new Map()
  for (const g of gruplar) {
    const a = anahtarAl(g)
    const y = kitapYeri(g)
    const v = kume.get(a)
    if (!v) kume.set(a, { say: g.sonuclar.length, sira: y.sira })
    else {
      if (g.sonuclar.length > v.say) v.say = g.sonuclar.length
      if (y.sira < v.sira) v.sira = y.sira
    }
  }
  return new Map(
    [...kume.entries()]
      .sort((a, b) => (b[1].say - a[1].say) || (a[1].sira - b[1].sira))
      .map(([ad], i) => [ad, i])
  )
}

// Sıralama üç kademe:
//   1) ZAT bloğu   — aynı zatın eserleri asla birbirinden ayrılmaz.
//   2) ALT KÜME    — blok içinde "sabit sıralı" küme (Risale Büyük Eserler) kendi
//                    kesintisiz öbeğini kurar; kalanlar ayrı öbek.
//   3) ÖBEK İÇİ    — sabit öbekte KATALOG SIRASI, diğer her yerde SONUÇ SAYISI.
// Blokların ve öbeklerin kendi arasındaki sırayı en çok sonuç veren kitap belirler;
// sabit bir öncelik listesi yoktur.
function kitaplariSirala(gruplar) {
  const zatAl = (g) => kitapYeri(g).zat
  const obekAl = (g) => { const y = kitapYeri(g); return `${y.zat}\u0000${y.sabit ? y.kume : ""}` }
  const blokSira = kumeSiralari(gruplar, zatAl)
  const obekSira = kumeSiralari(gruplar, obekAl)
  return [...gruplar].sort((x, y) => {
    const a = blokSira.get(zatAl(x)) - blokSira.get(zatAl(y)); if (a) return a
    const b = obekSira.get(obekAl(x)) - obekSira.get(obekAl(y)); if (b) return b
    const yx = kitapYeri(x), yy = kitapYeri(y)
    if (yx.sabit && yy.sabit) return yx.sira - yy.sira                     // katalog sırası
    return (y.sonuclar.length - x.sonuclar.length) || (yx.sira - yy.sira)  // sonuç sayısı
  })
}

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
      // Sadece sonuç sayısına göre sıralamak aynı âlimin kitaplarını birbirinden
      // ayırıyordu (Lemalar … başka bir eser … Mektubat). Artık âlim/tür blokları
      // bölünmüyor; blokların kendi arasındaki sırayı yine sonuç sayısı belirliyor.
      setKitapGruplar(kitaplariSirala(gruplar))
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

  // Sonuç çekmecesi açılırken max-height ile animasyon yapılıyor. O SINIR AÇIK
  // KALIRSA uzun listeler kırpılıyor: ölçüldü — 50 kart 3425px tutuyor, çekmece
  // 2000px'te kesiliyordu ve sayfa 31. karttan sonrasına kaydırılamıyordu.
  // Bu yüzden açılış animasyonu bitince sınır TAMAMEN kaldırılır.
  // NOT: `sonucVar` bu satırın ÜSTÜNDE tanımlı olmak zorunda — bu blok daha yukarıda
  // durduğu için "Cannot access 'sonucVar' before initialization" hatası veriyordu.
  // Üst sabit bloğun yüksekliği ÖLÇÜLÜR. Kitap başlığı onun hemen altına
  // yapışacak; yüksekliği elle yazmak kırılgan olurdu (arama kutusu, "Özel arama"
  // satırı, mobil/masaüstü dolgular ve tema fontu hepsi değiştiriyor).
  const ustRef = useRef(null)
  const [ustYuk, setUstYuk] = useState(0)
  useLayoutEffect(() => {
    const el = ustRef.current
    if (!el) return
    const olc = () => setUstYuk(h => {
      const y = Math.round(el.getBoundingClientRect().height)
      return Math.abs(h - y) > 1 ? y : h
    })
    olc()
    let ro = null
    try { ro = new ResizeObserver(olc); ro.observe(el) } catch { ro = null }
    window.addEventListener("resize", olc)
    return () => { try { ro && ro.disconnect() } catch { /* yoksay */ }; window.removeEventListener("resize", olc) }
  }, [])

  const [cekmeceSerbest, setCekmeceSerbest] = useState(false)
  useEffect(() => {
    if (!sonucVar) { setCekmeceSerbest(false); return }
    const t = setTimeout(() => setCekmeceSerbest(true), 380)   // geçiş 0.35s
    return () => clearTimeout(t)
  }, [sonucVar])
  const hicYok = sonucVar && !yukleniyor && sureSonuc.length === 0 && kitapGruplar.length === 0

  return (
    <div style={{ maxWidth: "760px", margin: "0 auto", padding: isMobile ? "20px 16px 60px" : "36px 24px 80px" }}>
      <h1 style={{ fontSize: isMobile ? "26px" : "34px", color: theme.accent, marginBottom: "6px", fontFamily: "PlayfairDisplay, serif" }}>
        Arama
      </h1>
      <p style={{ fontSize: "13px", color: theme.textSecondary, marginBottom: "20px" }}>
        Kitaplarda her şeyi, Kur'an'da sure adlarını arayabilirsiniz.
      </p>

      {/* ÜST BLOK — kaydırırken yerinde kalır.
          Navbar da sticky ve 42px yüksekliğinde, o yüzden top=42px; z-index
          Navbar'ın 100'ünün ALTINDA kalmalı ki menüleri bunun üstüne açılsın.
          Sayfanın yatay dolgusu negatif kenar boşluğuyla telafi edilir; yoksa
          altından geçen kartlar sticky bloğun iki yanından görünür. */}
      <div ref={ustRef} style={{
        position: "sticky", top: "42px", zIndex: 50,
        background: theme.background,
        marginLeft: isMobile ? "-16px" : "-24px",
        marginRight: isMobile ? "-16px" : "-24px",
        paddingLeft: isMobile ? "16px" : "24px",
        paddingRight: isMobile ? "16px" : "24px",
        paddingTop: "8px", paddingBottom: "10px",
      }}>
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
        // Açıldıktan sonra sınır YOK — yoksa uzun sonuç listesi kırpılıyor.
        overflow: cekmeceSerbest ? "visible" : "hidden",
        transition: "max-height 0.35s ease, opacity 0.3s ease, margin 0.3s ease",
        maxHeight: cekmeceSerbest ? "none" : (sonucVar ? "2000px" : "0px"),
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
              {/* Kitap başlığı da SABİT: aranan şey bu eserde yoksa kullanıcı
                  listeye dönüp bir sonraki esere bakabilsin diye aşağı kaydırınca
                  kaybolmamalı. Üst bloğun ÖLÇÜLEN yüksekliğinin altına oturur;
                  z-index üst bloğun (50) altında kalır ki onun altına girsin.
                  Arka planı saydam OLAMAZ — altından geçen kartlar okunur hâle gelir. */}
              <button onClick={() => setSecilenKitap(null)}
                style={{
                  position: "sticky", top: `${42 + ustYuk}px`, zIndex: 40,
                  display: "flex", alignItems: "center", gap: "8px", textAlign: "left",
                  padding: "9px 12px", borderRadius: "10px", cursor: "pointer",
                  background: theme.surface, border: `1px solid ${theme.border}`, color: theme.text,
                  boxShadow: "0 2px 10px rgba(0,0,0,0.06)",
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
