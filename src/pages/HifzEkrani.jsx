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

import { useEffect, useMemo, useRef, useState } from "react"
import { useNavigate } from "react-router-dom"
import {
  Brain, ChevronRight, ChevronDown, Eye, CheckCircle2, Loader, BookOpen, Check, Plus, Minus, Search,
  X, RotateCcw, Trash2, Bell, BellOff, Download, Upload, Copy, FileText, HardDrive,
  Repeat, CalendarClock, CalendarOff, ListPlus,
} from "lucide-react"
import { useApp } from "../AppContext"
import { mushafYukle } from "../data/mushafVerisi"
import {
  useHifz, bekleyenTekrarlar, zorAyetler, ozet, cevapla, DURUM,
  HEDEF_ANAHTAR, DONUS_ANAHTAR, manuelOneriler, eskiEzberEkle,
  ezberdenCikar, ezberAraliklari, yedekAl, yedekOku, yedektenDon, sifirla,
  ayarGuncelle, bugun, takvimAyarla, listeyeEkle, listedenCikar, topluCevapla,
  tekrarGruplari, bugunTamamlanan, hifzYedekIndir, hifzYedekMetni, hifzYedekDosyaAdi, hifzYedekCoz, hifzYedekUygula,
} from "../data/hifz"
import { sonYedekYaz, sonYedekOku } from "../data/vukufVeri"
import { normHarf } from "../data/okumaKayit"

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

  // ── EZBERLEDİKLERİMİ EKLE (2 Ekim 2026, kullanıcı isteği) ─────────────────
  // Daha önce ezberlenmiş bir sûreyi ya da aralığı elle eklemek; eklenenler
  // toplam yüzdeye ve cüz ilerlemesine yansıyor. Takvime "eski ezber" olarak
  // giriyor (hifz.js eskiEzberEkle: 7 gün aralık, ilk tekrarlar 14 güne yayılı).
  const [arama, setArama] = useState("")
  const [bildirim, setBildirim] = useState("")
  const [sureAc, setSureAc] = useState(false)
  // Eklenen eski ezber takvime de girsin mi (varsayılan HAYIR — "zaten ezberinde
  // olan kısımlar için tekrar gerekmez"; 3 Ekim 2026)
  const eskiTakvim = !!veri.ayarlar.eskiTakvim
  const sureListesi = useMemo(() => (mushaf || []).map(s => ({
    id: s.id, isim: s.isim, ayetSayisi: (s.ayetler || []).length,
  })), [mushaf])
  const toplamAyet = useMemo(() => sureListesi.reduce((t, s) => t + s.ayetSayisi, 0), [sureListesi])
  // Sûre başına ezberli âyet sayısı (✓ ve kısmi ilerleme için)
  const sureEzber = useMemo(() => {
    const m = new Map()
    for (const s of mushaf || []) {
      let n = 0
      for (const a of s.ayetler || []) if ((veri.birimler[`${s.id}:${a.no}`] || {}).d === DURUM.EZBERLENDI) n++
      m.set(s.id, n)
    }
    return m
  }, [mushaf, veri])
  const oneriler = useMemo(() => manuelOneriler(arama, sureListesi, normHarf), [arama, sureListesi])

  // Bir aralığın anahtarları ve içindeki ezberli âyet sayısı
  const aralikAnahtarlari = (id, bas, son) => {
    const l = []
    for (let a = bas; a <= son; a++) l.push(`${id}:${a}`)
    return l
  }
  const aralikEzberli = (id, bas, son) => {
    let n = 0
    for (let a = bas; a <= son; a++) if ((veri.birimler[`${id}:${a}`] || {}).d === DURUM.EZBERLENDI) n++
    return n
  }
  const aralikAdi = (isim, bas, son) => `${isim} ${bas === son ? bas : `${bas}–${son}`}`

  /* Her elle değişiklikten ÖNCE yedek alınıyor (hifz.js yedekAl) — yanlış
     ekleme ya da sıfırlama "Geri al" ile tek dokunuşta düzeltilebilsin. */
  function araligiEkle(o) {
    const ad = aralikAdi(o.isim, o.bas, o.son)
    yedekAl(`${ad} eklendi`)
    eskiEzberEkle(aralikAnahtarlari(o.id, o.bas, o.son), { takvim: eskiTakvim })
    setBildirim(`${ad} ezberlediklerinize eklendi${eskiTakvim ? " (tekrar takvimine de)" : ""}.`)
    setArama("")
  }
  // TEKRARA AL — aralığın ezberli âyetleri "tekrar listem"e (bugünün tekrarına) girer
  function tekraraAl(id, isim, bas, son) {
    const ad = aralikAdi(isim, bas, son)
    yedekAl(`${ad} tekrar listesine alındı`)
    listeyeEkle(aralikAnahtarlari(id, bas, son))
    setBildirim(`${ad} bugünün tekrarına eklendi.`)
  }
  // Sûrenin ezberli âyetlerini takvime al / takvimden çıkar
  function takvimDegistir(s) {
    const acik = s.takvimli < s.ezberli          // bir kısmı bile dışarıdaysa → hepsini al
    yedekAl(`${s.isim} ${acik ? "takvime alındı" : "takvimden çıkarıldı"}`)
    takvimAyarla(aralikAnahtarlari(s.id, 1, s.ayetSayisi), acik)
    setBildirim(acik
      ? `${s.isim} tekrar takvimine alındı; ilk tekrarlar önümüzdeki iki haftaya yayıldı.`
      : `${s.isim} tekrar takviminden çıkarıldı (ezberli kalır).`)
  }
  function araligiCikar(id, isim, bas, son, sor = true) {
    const ad = aralikAdi(isim, bas, son)
    if (sor && !window.confirm(`${ad} ezberlediklerinizden çıkarılsın mı? (Tekrar takvimi de silinir.)`)) return
    yedekAl(`${ad} çıkarıldı`)
    ezberdenCikar(aralikAnahtarlari(id, bas, son))
    setBildirim(`${ad} ezberlediklerinizden çıkarıldı.`)
  }
  function sureyiDegistir(s) {
    const tamam = (sureEzber.get(s.id) || 0) >= s.ayetSayisi
    if (tamam) {
      if (!window.confirm(`${s.isim} sûresinin ezber işareti ve tekrar takvimi kaldırılsın mı?`)) return
      araligiCikar(s.id, s.isim, 1, s.ayetSayisi, false)
    } else {
      yedekAl(`${s.isim} eklendi`)
      eskiEzberEkle(aralikAnahtarlari(s.id, 1, s.ayetSayisi), { takvim: eskiTakvim })
      setBildirim(`${s.isim} sûresi ezberlediklerinize eklendi${eskiTakvim ? " (tekrar takvimine de)" : ""}.`)
    }
  }

  // ── DÜZENLE / SIFIRLA / GERİ AL (2 Ekim 2026, kullanıcı isteği) ───────────
  const [duzenAc, setDuzenAc] = useState(false)
  const [sifirAc, setSifirAc] = useState(false)
  const araliklar = useMemo(() => ezberAraliklari(veri, sureListesi), [veri, sureListesi])
  // Yedek yuvası her veri değişiminde yeniden okunuyor (yedekAl yazmadan hemen önce çağrılıyor)
  const yedek = useMemo(() => yedekOku(), [veri])
  const ipucuSayisi = useMemo(() => Object.values(veri.birimler).filter(b => (b.i || 0) > 0).length, [veri])
  function geriDon() {
    if (!yedek) return
    if (!window.confirm(`Son değişiklik geri alınsın mı?\n"${yedek.aciklama}"\n\nO andan sonra yapılan hıfz çalışmaları da (ör. mushafta ezberledikleriniz) o anki hâline döner.`)) return
    yedektenDon()
    setBildirim(`Geri alındı: ${yedek.aciklama}.`)
  }
  function sifirlaSor(tur) {
    const metin = {
      ezber: ["Bütün ezber işaretleri ve tekrar takvimi silinsin mi?", "Ezberler sıfırlandı"],
      ipucu: ["Zorlandığınız âyetlerin ipucu sayaçları sıfırlansın mı?", "İpucu sayaçları sıfırlandı"],
      hepsi: ["BÜTÜN hıfz ilerlemesi (ezber, çalışılan, ipucu, takvim) silinsin mi?", "Bütün hıfz ilerlemesi sıfırlandı"],
    }[tur]
    if (!window.confirm(`${metin[0]}\n\nAyarlarınız korunur. Hemen ardından "Geri al" ile dönebilirsiniz.`)) return
    yedekAl(metin[1])
    sifirla(tur)
    setBildirim(`${metin[1]}.`)
    setSifirAc(false)
  }
  const zamanYazi = (z) => {
    const dk = Math.floor((Date.now() - z) / 60000)
    if (dk < 1) return "az önce"
    if (dk < 60) return `${dk} dk önce`
    if (dk < 24 * 60) return `${Math.floor(dk / 60)} sa önce`
    try { return new Date(z).toLocaleDateString("tr-TR", { day: "numeric", month: "long" }) } catch { return "" }
  }

  // ── UYARILAR (3 Ekim 2026) — "X gün gecikti" gibi uyarıları kapatma ──────
  // Tek anahtar: gecikme rozetleri, özet kartının vurgusu, mushaf hıfz
  // panelindeki rozet ve yedek hatırlatması birlikte susar. Ayar hıfz
  // kaydında duruyor (yedekle birlikte taşınır).
  const bildirimGizle = !!veri.ayarlar.bildirimGizle

  // ── HIFZ YEDEĞİ (3 Ekim 2026) ─────────────────────────────────────────────
  const yedekRef = useRef(null)
  const dosyaRef = useRef(null)
  const [sonYedek, setSonYedek] = useState(sonYedekOku)
  const [yedekMesaj, setYedekMesaj] = useState(null)       // { tip: "iyi"|"kotu", metin }
  const [kopyalandi, setKopyalandi] = useState(false)
  const [indirmeHatasi, setIndirmeHatasi] = useState(false)
  const [yapistirAcik, setYapistirAcik] = useState(false)
  const [yapistirMetni, setYapistirMetni] = useState("")
  const [yedekAday, setYedekAday] = useState(null)          // çözülmüş yedek, onay bekliyor
  const yedekGun = sonYedek ? Math.floor((Date.now() - sonYedek) / 86400000) : null
  const yedekAlindi = () => { sonYedekYaz(); setSonYedek(Date.now()) }
  function yedegiIndir() {
    const oldu = hifzYedekIndir()
    setIndirmeHatasi(!oldu)
    if (oldu) { yedekAlindi(); setYedekMesaj({ tip: "iyi", metin: `${hifzYedekDosyaAdi()} indirildi.` }) }
  }
  async function yedegiKopyala() {
    try {
      await navigator.clipboard.writeText(hifzYedekMetni())
      yedekAlindi()
      setKopyalandi(true)
      setTimeout(() => setKopyalandi(false), 2500)
    } catch {
      setYedekMesaj({ tip: "kotu", metin: "Panoya kopyalanamadı. Dosya olarak indirmeyi deneyin." })
    }
  }
  function adayYap(metin) {
    const c = hifzYedekCoz(metin)
    if (c.hata) { setYedekMesaj({ tip: "kotu", metin: c.hata }); return }
    setYedekMesaj(null); setYapistirAcik(false); setYapistirMetni("")
    setYedekAday(c)
  }
  function dosyaSecildi(e) {
    const d = e.target.files && e.target.files[0]
    e.target.value = ""            // aynı dosya art arda seçilebilsin
    if (!d) return
    const r = new FileReader()
    r.onload = () => adayYap(String(r.result || ""))
    r.onerror = () => setYedekMesaj({ tip: "kotu", metin: "Dosya açılamadı." })
    r.readAsText(d)
  }
  function yedegiUygula(kip) {
    if (!yedekAday) return
    if (kip === "degistir" && !window.confirm("Bu cihazdaki hıfz kaydı (ayarlar dahil) yedektekiyle DEĞİŞTİRİLSİN mi?\n\nHemen ardından \"Geri al\" ile dönebilirsiniz.")) return
    yedekAl(kip === "degistir" ? "Hıfz kaydı yedekle değiştirildi" : "Yedek birleştirildi")
    hifzYedekUygula(yedekAday.veri, kip)
    setYedekAday(null)
    setYedekMesaj({ tip: "iyi", metin: kip === "degistir" ? "Hıfz kaydı yedekten yüklendi." : "Yedek bu cihazdaki kayıtla birleştirildi." })
  }
  // Yedek bölümü artık sayfanın en altında KAPALI bir çekmece; hatırlatmadaki
  // "Yedek al" onu açıp oraya kaydırıyor.
  const [yedekAcik, setYedekAcik] = useState(false)
  const kartaGit = () => {
    setYedekAcik(true)
    setTimeout(() => { try { yedekRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }) } catch { /* yoksay */ } }, 30)
  }

  const bekleyen = useMemo(() => bekleyenTekrarlar(veri), [veri])
  // ZAMANLAMA (3 Ekim 2026): bekleyenler aralıklara toplanıyor + bugünkü ilerleme
  const gruplar = useMemo(() => tekrarGruplari(bekleyen), [bekleyen])
  const tamamlanan = useMemo(() => bugunTamamlanan(veri), [veri])
  const tekrarModu = veri.ayarlar.tekrarModu === "elle" ? "elle" : "otomatik"
  const zorlar = useMemo(() => zorAyetler(veri, 15), [veri])
  const sayilar = useMemo(() => ozet(veri), [veri])
  // Yedek hatırlatması: ezber varsa ve 30 günden uzun süredir (ya da hiç) yedek
  // alınmadıysa. ✕ 30 gün erteler; 🔕 hepsini susturur.
  const yedekHatirlat = !bildirimGizle && sayilar.ezber > 0 &&
    (yedekGun == null || yedekGun >= 30) && bugun() >= (veri.ayarlar.yedekErtele || 0)

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
          // Toplam yüzde: ezberli âyet / Kur'ân'ın bütün âyetleri (mushaf verisinden)
          { ad: "Ezberlenen", n: sayilar.ezber, alt: toplamAyet ? `%${(sayilar.ezber * 100 / toplamAyet).toFixed(sayilar.ezber * 1000 / toplamAyet < 10 ? 1 : 0)}` : null },
          { ad: "Çalışılan", n: sayilar.calisilan },
          { ad: "Bugün tekrar", n: sayilar.bekleyen, vurgu: sayilar.bekleyen > 0 && !bildirimGizle },
        ].map(k => (
          <div key={k.ad} style={{
            flex: 1, textAlign: "center", padding: "12px 6px", borderRadius: "14px",
            background: theme.surface, border: `1px solid ${k.vurgu ? theme.accent : theme.border}`,
          }}>
            <div style={{ fontSize: "22px", fontWeight: 700, color: k.vurgu ? theme.accent : theme.text }}>{k.n}</div>
            <div style={{ fontSize: "11px", color: theme.textSecondary, marginTop: "2px" }}>{k.ad}</div>
            {k.alt && <div style={{ fontSize: "11px", fontWeight: 700, color: theme.accent, marginTop: "2px" }}>{k.alt}</div>}
          </div>
        ))}
      </div>

      {hata && (
        <div style={{ ...kart, color: "#c0392b", fontSize: "13px" }}>{hata}</div>
      )}

      {/* ── YEDEK HATIRLATMASI ───────────────────────────────────────────── */}
      {yedekHatirlat && (
        <div style={{
          ...kart, display: "flex", alignItems: "center", gap: "10px", padding: "10px 12px",
          border: `1px solid ${theme.accent}`, background: `${theme.accent}10`,
        }}>
          <HardDrive size={16} color={theme.accent} style={{ flexShrink: 0 }} />
          <span style={{ flex: 1, fontSize: "12.5px", lineHeight: 1.5 }}>
            {yedekGun == null ? "Hıfz kaydınızın hiç yedeği alınmadı." : `Hıfz kaydınızın yedeği ${yedekGun} gündür alınmadı.`}
            <span style={{ color: theme.textSecondary }}> Kayıt yalnız bu cihazda duruyor.</span>
          </span>
          <button onClick={kartaGit} style={dugme(true)}>Yedek al</button>
          <button onClick={() => ayarGuncelle({ yedekErtele: bugun() + 30 })}
            aria-label="Hatırlatmayı 30 gün ertele" title="30 gün sonra yeniden hatırlat"
            style={{
              width: "28px", height: "28px", borderRadius: "50%", border: "none", flexShrink: 0,
              background: "transparent", color: theme.textSecondary, cursor: "pointer",
              display: "inline-flex", alignItems: "center", justifyContent: "center", padding: 0,
            }}>
            <X size={15} />
          </button>
        </div>
      )}

      {/* ── BUGÜNÜN TEKRARI ──────────────────────────────────────────────── */}
      {/* ZAMANLAMA (3 Ekim 2026): Otomatik = takvimde vadesi gelenler + listem;
          Elle = yalnız listem. Âyetler aralıklara toplanıyor ("Yâsîn 1–12"),
          Kolay/Orta/Zor bütün aralığa uygulanıyor. Aralığın adına dokununca
          mushafta O ARALIK hıfz modunda açılıyor. */}
      <div style={kart}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", margin: "0 0 10px", flexWrap: "wrap" }}>
          <p style={{ ...baslik, margin: 0, flex: 1 }}>Bugünün tekrarı</p>
          {/* Mod seçimi — bölünmüş düğme */}
          <div role="radiogroup" aria-label="Tekrar modu" style={{
            display: "inline-flex", padding: "2px", borderRadius: "999px",
            background: `${theme.accent}12`, border: `1px solid ${theme.border}`,
          }}>
            {[{ id: "otomatik", ad: "Otomatik" }, { id: "elle", ad: "Elle" }].map(m => (
              <button key={m.id} role="radio" aria-checked={tekrarModu === m.id}
                onClick={() => ayarGuncelle({ tekrarModu: m.id })}
                title={m.id === "otomatik" ? "Takvimde vadesi gelenler + listeniz" : "Yalnız sizin tekrara aldıklarınız"}
                style={{
                  padding: "4px 11px", borderRadius: "999px", border: "none", cursor: "pointer",
                  fontFamily: "inherit", fontSize: "11.5px", fontWeight: 600,
                  background: tekrarModu === m.id ? theme.accent : "transparent",
                  color: tekrarModu === m.id ? "#fff" : theme.textSecondary,
                }}>{m.ad}</button>
            ))}
          </div>
          {/* Uyarıları kapat/aç — gecikme rozetleri, panel rozeti, yedek hatırlatması */}
          <button onClick={() => ayarGuncelle({ bildirimGizle: !bildirimGizle })}
            aria-pressed={bildirimGizle}
            aria-label={bildirimGizle ? "Uyarıları göster" : "Uyarıları gizle"}
            title={bildirimGizle ? "Uyarılar kapalı — göstermek için dokunun" : "Gecikme uyarılarını gizle"}
            style={{
              display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
              width: "30px", height: "30px", borderRadius: "50%", cursor: "pointer", padding: 0,
              border: `1px solid ${theme.border}`, background: "transparent",
              color: bildirimGizle ? theme.textSecondary : theme.accent,
            }}>
            {bildirimGizle ? <BellOff size={14} /> : <Bell size={14} />}
          </button>
        </div>

        {/* Bugünkü ilerleme */}
        {(tamamlanan > 0 || bekleyen.length > 0) && (
          <div style={{ marginBottom: "10px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11.5px", color: theme.textSecondary, marginBottom: "4px" }}>
              <span>{bekleyen.length ? `${bekleyen.length} âyet bekliyor` : "Bugünün tekrarı tamam"}</span>
              <span><b style={{ color: theme.accent }}>{tamamlanan}</b> / {tamamlanan + bekleyen.length}</span>
            </div>
            <div style={{ height: "5px", borderRadius: "3px", background: `${theme.accent}22`, overflow: "hidden" }}>
              <div style={{
                width: `${(tamamlanan * 100) / Math.max(1, tamamlanan + bekleyen.length)}%`,
                height: "100%", background: theme.accent, transition: "width .3s ease",
              }} />
            </div>
          </div>
        )}

        {!gruplar.length ? (
          <div style={{ display: "flex", alignItems: "flex-start", gap: "8px", color: theme.textSecondary, fontSize: "13px", lineHeight: 1.5 }}>
            <CheckCircle2 size={16} color={theme.accent} style={{ flexShrink: 0, marginTop: "2px" }} />
            <span>
              {!sayilar.ezber ? "Henüz ezberlenmiş âyet yok. Mushafta hıfz modunu açıp başlayabilirsiniz."
                : tamamlanan ? "Bugünün tekrarı bitti. Allah kabul etsin."
                : tekrarModu === "elle" ? "Tekrar listeniz boş. Aşağıda Ezberlediklerim'den bir aralığı \"Tekrara al\" ile ekleyin."
                : "Bugün tekrarı gelen âyet yok."}
            </span>
          </div>
        ) : (
          <div style={{ maxHeight: "46vh", overflowY: "auto", margin: "0 -4px" }}>
            {gruplar.map(gr => {
              const ad = `${sureAdi(gr.sureNo)} ${gr.bas === gr.son ? gr.bas : `${gr.bas}–${gr.son}`}`
              return (
                <div key={`${gr.kaynak}-${gr.anahtarlar[0]}`} style={{
                  display: "flex", alignItems: "center", flexWrap: "wrap", gap: "7px",
                  padding: "9px 4px", borderBottom: `1px solid ${theme.border}`,
                }}>
                  <button
                    onClick={() => mushaftaAc(gr.sureNo, gr.bas, `manuel:${gr.bas}-${gr.son}`)}
                    title="Mushafta bu aralıkla hıfz modunda aç"
                    style={{
                      flex: 1, minWidth: "150px", textAlign: "left", background: "none",
                      border: "none", cursor: "pointer", padding: 0, fontFamily: "inherit",
                      display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap", color: theme.text,
                    }}
                  >
                    <span style={{ fontSize: "13.5px", fontWeight: 600 }}>{ad}</span>
                    {gr.anahtarlar.length > 1 && (
                      <span style={{ fontSize: "10.5px", color: theme.textSecondary }}>{gr.anahtarlar.length} âyet</span>
                    )}
                    {gr.kaynak === "liste" && (
                      <span style={{
                        fontSize: "10px", fontWeight: 700, color: theme.accent,
                        border: `1px solid ${theme.accent}`, borderRadius: "999px", padding: "0 6px",
                      }}>listem</span>
                    )}
                    {gr.gecikme > 0 && !bildirimGizle && (
                      <span style={{
                        fontSize: "10.5px", fontWeight: 700, color: "#fff",
                        background: "#c0392b", borderRadius: "999px", padding: "1px 6px",
                      }}>{gr.gecikme} gün gecikti</span>
                    )}
                    <ChevronRight size={14} color={theme.textSecondary} />
                  </button>
                  <div style={{ display: "flex", gap: "5px", alignItems: "center" }}>
                    {ZORLUKLAR.map(z => (
                      <button key={z.id} onClick={() => topluCevapla(gr.anahtarlar, z.id)}
                        title={z.id === "zor" ? "Zor — yarın yeniden (takvim dışıysa takvime girer)" : z.ad}
                        style={dugme(false)}>{z.ad}</button>
                    ))}
                    {gr.kaynak === "liste" && (
                      <button onClick={() => listedenCikar(gr.anahtarlar)} aria-label={`${ad} listeden çıkar`}
                        title="Tekrar listemden çıkar"
                        style={{
                          width: "26px", height: "26px", borderRadius: "50%", border: "none", padding: 0,
                          background: "transparent", color: theme.textSecondary, cursor: "pointer",
                          display: "inline-flex", alignItems: "center", justifyContent: "center",
                        }}><X size={14} /></button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* ── EZBERLEDİKLERİMİ EKLE ────────────────────────────────────────── */}
      <div style={kart}>
        <p style={baslik}>Ezberlediklerim</p>
        <p style={{ fontSize: "11.5px", color: theme.textSecondary, lineHeight: 1.6, margin: "-4px 0 10px" }}>
          Daha önce ezberlediğiniz sûreyi ya da âyet aralığını ekleyin; toplam yüzdeye ve
          cüz ilerlemesine katılır. Eklenenler kendiliğinden tekrara gelmez — istediğiniz
          kısmı <b>Tekrara al</b> ile bugünün tekrarına ekleyin ya da takvime alın. Yanlış
          eklediyseniz "Ezberlediklerimi düzenle"den çıkarabilir ya da "Geri al"a dokunabilirsiniz.
        </p>
        {!mushaf ? (
          <div style={{ display: "flex", alignItems: "center", gap: "8px", color: theme.textSecondary, fontSize: "13px" }}>
            <Loader size={15} className="hifz-spin" /> Mushaf verisi yükleniyor…
          </div>
        ) : (
          <>
            <div style={{ position: "relative", marginBottom: "6px" }}>
              <Search size={15} color={theme.textSecondary} style={{ position: "absolute", left: "10px", top: "10px" }} />
              {/* 16 px: iOS daha küçük yazılı alana dokununca yakınlaştırıyor */}
              <input type="search" value={arama} onChange={e => { setArama(e.target.value); setBildirim("") }}
                placeholder="ör. Yâsîn · Bakara 1-20 · 67 · 36:1-12"
                aria-label="Sûre ve âyet aralığı ara"
                onKeyDown={e => { if (e.key === "Enter" && oneriler[0]) araligiEkle(oneriler[0]) }}
                style={{
                  width: "100%", height: "36px", boxSizing: "border-box", borderRadius: "10px",
                  border: `1px solid ${theme.border}`, background: theme.background, color: theme.text,
                  fontSize: "16px", fontFamily: "inherit", padding: "0 10px 0 32px",
                }} />
            </div>
            {/* Eklenen eski ezber takvime de girsin mi — onay kutusu biçiminde */}
            <button onClick={() => ayarGuncelle({ eskiTakvim: !eskiTakvim })} aria-pressed={eskiTakvim}
              style={{
                display: "inline-flex", alignItems: "center", gap: "7px", margin: "2px 0 8px",
                background: "none", border: "none", padding: "2px 0", cursor: "pointer",
                fontFamily: "inherit", fontSize: "12px", color: theme.textSecondary, textAlign: "left",
              }}>
              <span style={{
                width: "16px", height: "16px", borderRadius: "5px", flexShrink: 0,
                display: "inline-flex", alignItems: "center", justifyContent: "center",
                border: `1px solid ${eskiTakvim ? theme.accent : theme.border}`,
                background: eskiTakvim ? theme.accent : "transparent",
              }}>{eskiTakvim && <Check size={11} color="#fff" strokeWidth={3} />}</span>
              <span>Eklerken tekrar takvimine de al <span style={{ opacity: 0.75 }}>(yeni ezberlenmiş kısımlar için)</span></span>
            </button>
            {oneriler.length > 0 && (
              <div style={{ display: "flex", flexDirection: "column", gap: "4px", marginBottom: "8px" }}>
                {oneriler.map(o => {
                  // Sayaç önerilen ARALIK için (sûrenin tamamı değil): "Bakara 1–20 → 12/20 ezberli"
                  const uzunluk = o.son - o.bas + 1
                  const ezberli = aralikEzberli(o.id, o.bas, o.son)
                  return (
                    <div key={o.id} style={{
                      display: "flex", alignItems: "center", flexWrap: "wrap", gap: "6px 8px", padding: "7px 10px",
                      borderRadius: "9px", border: `1px solid ${theme.border}`, background: theme.background,
                    }}>
                      <span style={{ fontSize: "11px", fontWeight: 700, color: theme.accent, minWidth: "24px" }}>{o.id}</span>
                      <span style={{ flex: 1, minWidth: "140px", fontSize: "13px" }}>
                        {o.isim} <b style={{ color: theme.accent }}>{o.bas === o.son ? o.bas : `${o.bas}–${o.son}`}</b>
                        <span style={{ fontSize: "10.5px", color: theme.textSecondary, marginLeft: "6px" }}>
                          {ezberli}/{uzunluk} ezberli
                        </span>
                      </span>
                      {ezberli > 0 && (
                        <button onClick={() => tekraraAl(o.id, o.isim, o.bas, o.son)}
                          title="Bu aralığın ezberli âyetlerini bugünün tekrarına ekle"
                          style={{ ...dugme(false), display: "inline-flex", alignItems: "center", gap: "4px" }}>
                          <Repeat size={13} /> Tekrara al
                        </button>
                      )}
                      {ezberli > 0 && (
                        <button onClick={() => araligiCikar(o.id, o.isim, o.bas, o.son)}
                          title="Bu aralığı ezberlediklerimden çıkar"
                          style={{ ...dugme(false), display: "inline-flex", alignItems: "center", gap: "4px" }}>
                          <Minus size={13} /> Çıkar
                        </button>
                      )}
                      {ezberli < uzunluk && (
                        <button onClick={() => araligiEkle(o)} style={{ ...dugme(true), display: "inline-flex", alignItems: "center", gap: "4px" }}>
                          <Plus size={13} /> Ekle
                        </button>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
            {bildirim && (
              <div style={{ fontSize: "12px", color: theme.accent, margin: "2px 0 8px", display: "flex", alignItems: "center", gap: "6px" }}>
                <CheckCircle2 size={14} /> {bildirim}
              </div>
            )}
            {/* Son değişikliği geri al — yanlış ekleme/çıkarma/sıfırlama için */}
            {yedek && (
              <div style={{
                display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap",
                padding: "7px 10px", margin: "0 0 10px", borderRadius: "9px",
                border: `1px dashed ${theme.border}`, fontSize: "12px", color: theme.textSecondary,
              }}>
                <span style={{ flex: 1, minWidth: "150px" }}>
                  Son değişiklik: <b style={{ color: theme.text, fontWeight: 600 }}>{yedek.aciklama}</b>
                  <span style={{ marginLeft: "6px", opacity: 0.8 }}>· {zamanYazi(yedek.z)}</span>
                </span>
                <button onClick={geriDon} style={{ ...dugme(false), display: "inline-flex", alignItems: "center", gap: "4px" }}>
                  <RotateCcw size={13} /> Geri al
                </button>
              </div>
            )}
            <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
              <button onClick={() => setSureAc(v => !v)} style={{ ...dugme(sureAc), display: "inline-flex", alignItems: "center", gap: "5px" }}>
                <Check size={13} /> Sûre listesinden işaretle
              </button>
              <button onClick={() => setDuzenAc(v => !v)} style={{ ...dugme(duzenAc), display: "inline-flex", alignItems: "center", gap: "5px" }}>
                {duzenAc ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
                Ezberlediklerimi düzenle{araliklar.length ? ` (${araliklar.length})` : ""}
              </button>
              <button onClick={() => setSifirAc(v => !v)} style={{ ...dugme(sifirAc), display: "inline-flex", alignItems: "center", gap: "5px" }}>
                <Trash2 size={13} /> Sıfırla
              </button>
            </div>

            {/* ── DÜZENLE: sûre sûre ezberli aralıklar, her biri ✕ ile çıkarılır ── */}
            {duzenAc && (
              <div style={{ marginTop: "10px", maxHeight: "50vh", overflowY: "auto" }}>
                {!araliklar.length ? (
                  <div style={{ fontSize: "12.5px", color: theme.textSecondary, padding: "4px 2px" }}>
                    Henüz ezberlenmiş âyet yok.
                  </div>
                ) : (
                  <>
                    <p style={{ fontSize: "11.5px", color: theme.textSecondary, lineHeight: 1.6, margin: "0 0 8px" }}>
                      Aralığın yanındaki ✕ onu çıkarır. Bir aralığın yalnız bir kısmını çıkarmak için
                      yukarıda arayın (ör. <i>Bakara 5-7</i>) ve <b>Çıkar</b>'a dokunun.
                      {" "}<CalendarClock size={11} style={{ verticalAlign: "-1px" }} /> <b>Takvim</b>: sûre
                      otomatik tekrar planında mı. <ListPlus size={11} style={{ verticalAlign: "-1px" }} /> sûreyi
                      bugünün tekrarına ekler.
                    </p>
                    {araliklar.map(s => {
                      const tamam = s.ezberli >= s.ayetSayisi
                      return (
                        <div key={s.id} style={{
                          display: "flex", alignItems: "center", flexWrap: "wrap", gap: "6px",
                          padding: "8px 2px", borderBottom: `1px solid ${theme.border}`,
                        }}>
                          <span style={{ fontSize: "13px", fontWeight: 600, minWidth: "120px", flex: "0 1 auto" }}>
                            <span style={{ fontSize: "11px", color: theme.accent, marginRight: "5px" }}>{s.id}</span>
                            {s.isim}
                            <span style={{ fontSize: "10.5px", fontWeight: 500, color: theme.textSecondary, marginLeft: "6px" }}>
                              {tamam ? "tamamı" : `${s.ezberli}/${s.ayetSayisi}`}
                            </span>
                          </span>
                          <span style={{ flex: 1, display: "flex", flexWrap: "wrap", gap: "5px" }}>
                            {s.araliklar.map(r => (
                              <span key={r.bas} style={{
                                display: "inline-flex", alignItems: "center", gap: "2px",
                                padding: "2px 2px 2px 9px", borderRadius: "999px", fontSize: "12px",
                                border: `1px solid ${theme.accent}`, background: `${theme.accent}14`, color: theme.text,
                              }}>
                                {r.bas === r.son ? r.bas : `${r.bas}–${r.son}`}
                                <button onClick={() => araligiCikar(s.id, s.isim, r.bas, r.son)}
                                  aria-label={`${aralikAdi(s.isim, r.bas, r.son)} çıkar`}
                                  title="Bu aralığı çıkar"
                                  style={{
                                    width: "22px", height: "22px", borderRadius: "50%", border: "none",
                                    background: "transparent", color: theme.textSecondary, cursor: "pointer",
                                    display: "inline-flex", alignItems: "center", justifyContent: "center", padding: 0,
                                  }}>
                                  <X size={13} />
                                </button>
                              </span>
                            ))}
                          </span>
                          <span style={{ display: "inline-flex", gap: "5px", flexWrap: "wrap" }}>
                            {/* Takvim — hepsi takvimdeyse çıkarır, değilse hepsini alır */}
                            <button onClick={() => takvimDegistir(s)}
                              title={s.takvimli >= s.ezberli ? "Otomatik tekrar takviminden çıkar" : "Otomatik tekrar takvimine al"}
                              style={{
                                ...dugme(false), padding: "4px 9px", fontSize: "11px",
                                display: "inline-flex", alignItems: "center", gap: "4px",
                                borderColor: s.takvimli ? theme.accent : theme.border,
                                color: s.takvimli ? theme.accent : theme.textSecondary,
                              }}>
                              {s.takvimli ? <CalendarClock size={12} /> : <CalendarOff size={12} />}
                              {s.takvimli >= s.ezberli ? "Takvimde" : s.takvimli ? `Takvim ${s.takvimli}/${s.ezberli}` : "Takvim dışı"}
                            </button>
                            <button onClick={() => tekraraAl(s.id, s.isim, 1, s.ayetSayisi)}
                              disabled={s.listede >= s.ezberli}
                              title={s.listede >= s.ezberli ? "Zaten bugünün tekrarında" : "Bugünün tekrarına ekle"}
                              aria-label={`${s.isim} tekrara al`}
                              style={{
                                ...dugme(false), padding: "4px 9px", fontSize: "11px",
                                display: "inline-flex", alignItems: "center", gap: "4px",
                                opacity: s.listede >= s.ezberli ? 0.5 : 1,
                                cursor: s.listede >= s.ezberli ? "default" : "pointer",
                              }}>
                              <ListPlus size={12} /> {s.listede >= s.ezberli ? "Listede" : "Tekrara al"}
                            </button>
                            {s.araliklar.length > 1 && (
                              <button onClick={() => araligiCikar(s.id, s.isim, 1, s.ayetSayisi)}
                                style={{ ...dugme(false), padding: "4px 10px", fontSize: "11px" }}>
                                Sûreyi çıkar
                              </button>
                            )}
                          </span>
                        </div>
                      )
                    })}
                  </>
                )}
              </div>
            )}

            {/* ── SIFIRLA: üç kapsam, her biri onay ister; hemen ardından "Geri al" ── */}
            {sifirAc && (
              <div style={{ marginTop: "10px", display: "flex", flexDirection: "column", gap: "6px" }}>
                {[
                  { tur: "ezber", ad: "Ezberleri sıfırla", acik: `Ezber işaretleri ve tekrar takvimi silinir (${sayilar.ezber} âyet). Zorlandığınız âyetler kalır.`, bos: !sayilar.ezber },
                  { tur: "ipucu", ad: "İpucu sayaçlarını sıfırla", acik: `"Zorlandığınız âyetler" listesi boşalır (${ipucuSayisi} âyet). Ezberler kalır.`, bos: !ipucuSayisi },
                  { tur: "hepsi", ad: "Bütün hıfz ilerlemesini sıfırla", acik: "Ezber, çalışılan, ipucu ve takvimin tamamı silinir. Ayarlar korunur.", bos: !Object.keys(veri.birimler).length, tehlike: true },
                ].map(s => (
                  <div key={s.tur} style={{
                    display: "flex", alignItems: "center", gap: "10px", padding: "8px 10px",
                    borderRadius: "9px", border: `1px solid ${s.tehlike ? "#c0392b55" : theme.border}`,
                    background: theme.background, opacity: s.bos ? 0.5 : 1,
                  }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: "13px", fontWeight: 600, color: s.tehlike ? "#c0392b" : theme.text }}>{s.ad}</div>
                      <div style={{ fontSize: "11px", color: theme.textSecondary, lineHeight: 1.5, marginTop: "2px" }}>{s.acik}</div>
                    </div>
                    <button disabled={s.bos} onClick={() => sifirlaSor(s.tur)} style={{
                      ...dugme(false), cursor: s.bos ? "default" : "pointer",
                      borderColor: s.tehlike ? "#c0392b" : theme.border, color: s.tehlike ? "#c0392b" : theme.textSecondary,
                    }}>
                      Sıfırla
                    </button>
                  </div>
                ))}
              </div>
            )}
            {sureAc && (
              <div style={{
                display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(132px, 1fr))", gap: "6px",
                marginTop: "10px", maxHeight: "50vh", overflowY: "auto",
              }}>
                {sureListesi.map(s => {
                  const n = sureEzber.get(s.id) || 0
                  const tamam = n >= s.ayetSayisi
                  return (
                    <button key={s.id} onClick={() => sureyiDegistir(s)}
                      title={tamam ? "İşareti kaldır" : "Sûrenin tamamını ezberledim olarak işaretle"}
                      style={{
                        display: "flex", alignItems: "center", gap: "6px", textAlign: "left",
                        padding: "6px 8px", borderRadius: "9px", cursor: "pointer", fontFamily: "inherit",
                        border: `1px solid ${tamam ? theme.accent : theme.border}`,
                        background: tamam ? `${theme.accent}18` : theme.background, color: theme.text,
                      }}>
                      <span style={{
                        width: "16px", height: "16px", borderRadius: "5px", flexShrink: 0,
                        display: "inline-flex", alignItems: "center", justifyContent: "center",
                        border: `1px solid ${tamam ? theme.accent : theme.border}`,
                        background: tamam ? theme.accent : "transparent",
                      }}>{tamam && <Check size={11} color="#fff" strokeWidth={3} />}</span>
                      <span style={{ flex: 1, minWidth: 0, fontSize: "12px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {s.id}. {s.isim}
                      </span>
                      {n > 0 && !tamam && (
                        <span style={{ fontSize: "10px", color: theme.textSecondary }}>{n}/{s.ayetSayisi}</span>
                      )}
                    </button>
                  )
                })}
              </div>
            )}
          </>
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

      {/* ── HIFZ YEDEĞİ (en altta, çekmece) ──────────────────────────────────────────────────── */}
      {/* Çekmece (3 Ekim 2026, kullanıcı: "Hıfz yedeği çok göz önünde, en alta
          çekmece gibi koyabiliriz"). Kapalıyken tek satır: başlık + son yedek. */}
      <div ref={yedekRef} style={{ ...kart, padding: 0, scrollMarginTop: "70px", overflow: "hidden" }}>
        <button onClick={() => setYedekAcik(v => !v)} aria-expanded={yedekAcik}
          style={{
            width: "100%", display: "flex", alignItems: "center", gap: "9px",
            padding: "12px 16px", background: "none", border: "none", cursor: "pointer",
            fontFamily: "inherit", textAlign: "left", color: theme.text,
          }}>
          <HardDrive size={15} color={theme.textSecondary} style={{ flexShrink: 0 }} />
          <span style={{ flex: 1, fontSize: "13.5px", fontWeight: 600 }}>Hıfz yedeği</span>
          <span style={{ fontSize: "11px", color: yedekGun != null && yedekGun < 30 ? theme.textSecondary : theme.accent }}>
            {yedekGun == null ? "hiç alınmadı" : yedekGun === 0 ? "bugün alındı" : `${yedekGun} gün önce`}
          </span>
          <ChevronDown size={16} color={theme.textSecondary}
            style={{ flexShrink: 0, transform: yedekAcik ? "rotate(180deg)" : "none", transition: "transform .2s ease" }} />
        </button>
        {yedekAcik && (
        <div style={{ padding: "0 16px 14px" }}>
        <p style={{ fontSize: "11.5px", color: theme.textSecondary, lineHeight: 1.6, margin: "-4px 0 10px" }}>
          Hıfz kaydınız (ezberler, tekrar takvimi, ayarlar) yalnız bu cihazda duruyor. Tarayıcı
          verisi silinirse ya da cihaz değişirse kaybolmasın diye ara ara yedek alın.
          {" "}Son yedek: <b style={{ color: yedekGun != null && yedekGun < 30 ? theme.accent : theme.text }}>
            {yedekGun == null ? "hiç alınmadı" : yedekGun === 0 ? "bugün" : `${yedekGun} gün önce`}
          </b>.
        </p>
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
          <button onClick={yedegiIndir} style={{ ...dugme(true), display: "inline-flex", alignItems: "center", gap: "6px", padding: "8px 14px" }}>
            <Download size={14} /> Dosya indir
          </button>
          <button onClick={yedegiKopyala} style={{ ...dugme(false), display: "inline-flex", alignItems: "center", gap: "6px", padding: "8px 14px", color: kopyalandi ? theme.accent : theme.textSecondary }}>
            {kopyalandi ? <Check size={14} /> : <Copy size={14} />} {kopyalandi ? "Kopyalandı" : "Kopyala"}
          </button>
          <button onClick={() => dosyaRef.current?.click()} style={{ ...dugme(false), display: "inline-flex", alignItems: "center", gap: "6px", padding: "8px 14px" }}>
            <Upload size={14} /> Yedekten yükle
          </button>
          <button onClick={() => setYapistirAcik(v => !v)} style={{ ...dugme(yapistirAcik), display: "inline-flex", alignItems: "center", gap: "6px", padding: "8px 14px" }}>
            <FileText size={14} /> Yapıştır
          </button>
          <input ref={dosyaRef} type="file" accept=".json,application/json" onChange={dosyaSecildi} style={{ display: "none" }} />
        </div>
        {indirmeHatasi && (
          <div style={{ fontSize: "11px", color: theme.textSecondary, marginTop: "6px", lineHeight: 1.5 }}>
            İndirme başlatılamadı — ana ekrana eklenmiş uygulamalarda olabiliyor. "Kopyala" ile
            yedeği panoya alıp bir not uygulamasına yapıştırabilirsiniz.
          </div>
        )}
        {yapistirAcik && (
          <div style={{ marginTop: "8px" }}>
            {/* 16 px: iOS daha küçük yazılı alana dokununca yakınlaştırıyor */}
            <textarea value={yapistirMetni} onChange={e => setYapistirMetni(e.target.value)}
              placeholder="Yedek metnini buraya yapıştırın…" rows={4}
              style={{
                width: "100%", boxSizing: "border-box", borderRadius: "10px", padding: "8px 10px",
                border: `1px solid ${theme.border}`, background: theme.background, color: theme.text,
                fontSize: "16px", fontFamily: "monospace", resize: "vertical",
              }} />
            <button disabled={!yapistirMetni.trim()} onClick={() => adayYap(yapistirMetni)}
              style={{ ...dugme(!!yapistirMetni.trim()), marginTop: "6px", opacity: yapistirMetni.trim() ? 1 : 0.5 }}>
              Yedeği oku
            </button>
          </div>
        )}
        {yedekAday && (
          <div style={{
            marginTop: "10px", padding: "10px 12px", borderRadius: "10px",
            border: `1px solid ${theme.accent}`, background: theme.background,
          }}>
            <div style={{ fontSize: "12.5px", lineHeight: 1.6, marginBottom: "8px" }}>
              Yedek okundu: <b>{yedekAday.ezber}</b> ezberli âyet ({yedekAday.kayit} kayıt)
              {yedekAday.tarih && <> · {new Date(yedekAday.tarih).toLocaleString("tr-TR", { dateStyle: "medium", timeStyle: "short" })}</>}
              <br />
              <span style={{ color: theme.textSecondary, fontSize: "11.5px" }}>
                <b>Birleştir</b>: iki taraftaki ezberler birleşir, ayarlarınız değişmez.
                {" "}<b>Değiştir</b>: bu cihazdaki kayıt yedektekiyle değişir.
              </span>
            </div>
            <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
              <button onClick={() => yedegiUygula("birlestir")} style={dugme(true)}>Birleştir</button>
              <button onClick={() => yedegiUygula("degistir")} style={{ ...dugme(false), borderColor: "#c0392b", color: "#c0392b" }}>Değiştir</button>
              <button onClick={() => setYedekAday(null)} style={dugme(false)}>Vazgeç</button>
            </div>
          </div>
        )}
        {yedekMesaj && (
          <div style={{
            fontSize: "12px", marginTop: "8px", display: "flex", alignItems: "center", gap: "6px",
            color: yedekMesaj.tip === "kotu" ? "#c0392b" : theme.accent,
          }}>
            {yedekMesaj.tip === "kotu" ? <X size={14} /> : <CheckCircle2 size={14} />} {yedekMesaj.metin}
          </div>
        )}
        <div style={{ fontSize: "11px", color: theme.textSecondary, marginTop: "8px", lineHeight: 1.5 }}>
          Ayarlar → Veriler → "Yedek al" ile alınan genel yedek de hıfz kaydını içerir; o dosya burada da yüklenebilir.
        </div>
      </div>
        )}
      </div>

      <style>{`@keyframes hifz-spin{to{transform:rotate(360deg)}}.hifz-spin{animation:hifz-spin .9s linear infinite}`}</style>
    </div>
  )
}
