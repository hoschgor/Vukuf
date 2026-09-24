/* ═══════════════════════════════════════════════════════════════════════════
   VUKUF — VERİLER BÖLÜMÜ (Ayarlar panelinin içinde)
   src/components/VeriAyarlari.jsx

   Yedek al · Geri yükle · Sıfırla. Veri işinin tamamı `src/data/vukufVeri.js`
   içinde; burası yalnız arayüz.

   ── TASARIM KARARLARI ──────────────────────────────────────────────────────
   • HER YIKICI İŞLEM ÇİFT ONAYLI. İlk dokunuş düğmeyi "Emin misiniz?" hâline
     getirir, ikinci dokunuş uygular; 4 saniye dokunulmazsa kendiliğinden geri
     döner. Kullanıcının OkumaEkrani'nda kullandığı `OnayliSil` kalıbının aynısı.
   • SİLMEDEN ÖNCE YEDEK. Sıfırlama bölümünün başında yedek alma hatırlatması
     duruyor; "Her şeyi sıfırla" ise yedek alınmadıysa ayrıca uyarıyor.
   • SAYIYLA GÖSTER. Her kategori "kaç kayıt · ne kadar yer" ile listeleniyor.
     Boş kategorinin düğmesi kapalı — "sildim" hissi verip hiçbir şey yapmasın.
   • "DİĞER" KATEGORİSİ GİZLENMİYOR. Sınıflandırılmamış anahtarlar varsa
     kullanıcı bunu görmeli; ileride eklenen bir özelliğin anahtarı sessizce
     yanlış kategoride silinmesin diye.
   • iOS PAYI: ana ekrana eklenmiş uygulamada dosya indirme sessizce
     düşebiliyor. Bu yüzden indirmenin yanında "panoya kopyala", geri
     yüklemede de dosya seçmenin yanında "yapıştır" yolu var.
   • GERİ YÜKLEDİKTEN SONRA SAYFA YENİLENİR. Değerlerin çoğu açılışta bir kez
     state'e okunuyor; yenilemeden arayüz eski değerleri göstermeye devam eder
     ve kullanıcı "geri yükleme çalışmadı" sanır.
   ═══════════════════════════════════════════════════════════════════════════ */

import { useState, useEffect, useRef, useMemo } from "react"
import { Download, Upload, Copy, Check, AlertTriangle, Trash2, FileText, X, HardDrive, Wifi, Loader, CloudOff } from "lucide-react"
import Katlanir from "./Katlanir"
import { destekVar, swSurum, onbellekDokumu, onbellegiTemizle } from "../data/cevrimdisi"
import {
  envanter, toplamBoyut, boyutMetni,
  yedekIndir, yedekMetni, yedekDosyaAdi,
  dosyadanOku, yedekCozumle, yedekYaz, sifirla,
} from "../data/vukufVeri"

const ONAY_SURESI = 4000   // ms — bu süre dokunulmazsa onay hâli geri döner

/* ── ÇEVRİMDIŞI HAZIRLIK TESTİ — GEÇİCİ ────────────────────────────────────
   Çevrimdışı ses indirme tasarlanabilmesi için iki bilinmeyen var ve ikisi de
   ancak GERÇEK CİHAZDA ölçülebilir:
     1) everyayah.com CORS başlığı gönderiyor mu? Göndermiyorsa yanıtlar OPAK
        olur: önbelleğe konur ama içeriği okunamaz, 404 bile "başarılı" sayılır
        ve tarayıcılar opak kayıtları kotaya ŞİŞİRİLMİŞ olarak yazar.
     2) Bir âyetin gerçek boyutu kaç KB? Tüm Kur'ân tahminini (130-520 MB gibi
        geniş bir aralık) gerçek ölçüme çevirmek için lazım.
   İş bitince `CEVRIMDISI_TESTI = false` yapılıp bu bölüm kaldırılır. */
const CEVRIMDISI_TESTI = true

/* ⚠ ÖRNEKLEM HATASI VE DÜZELTMESİ (24 Eylül 2026)
   İlk sürümde örnek âyetler ELLE seçilmişti: 001001, 002255, 114006. İçlerinden
   002255 ÂYETÜ'L-KÜRSÎ — Kur'ân'ın en uzun âyetlerinden biri (~50 sn). Üç
   örnekten biri o olunca ortalama gerçeğin 4-5 katına çıktı ve test "cüz başına
   73 MB" dedi; bu toplamda ~2,2 GB eder, mp3 için imkânsız.
   DERS: küçük ve ELLE seçilmiş örneklem, uzunluğu çok değişken bir kümede
   ortalamayı tamamen kaydırır. Artık örnekler 6236 âyetin TAMAMINDAN rastgele
   çekiliyor ve sayı 24'e çıkarıldı. Ayrıca dosyalar indirilmiyor: `HEAD` ile
   yalnız `Content-Length` okunuyor (CORS'ta güvenli listede olan bir başlık),
   yani test hem doğru hem hafif. */
const ORNEK_SAYISI = 24

// Sûre başına âyet sayısı (Kûfî sayım) — toplam 6236. Rastgele âyet seçmek için.
const AYET_SAYILARI = [
  7,286,200,176,120,165,206,75,129,109,123,111,43,52,99,128,111,110,98,135,
  112,78,118,64,77,227,93,88,69,60,34,30,73,54,45,83,182,88,75,85,
  54,53,89,59,37,35,38,29,18,45,60,49,62,55,78,96,29,22,24,13,
  14,11,11,18,12,12,30,52,52,44,28,28,20,56,40,31,50,40,46,42,
  29,19,36,25,22,17,19,26,30,20,15,21,11,8,8,19,5,8,8,11,
  11,8,3,9,5,4,7,3,6,3,5,4,5,6,
]
const AYET_SAYISI = AYET_SAYILARI.reduce((t, n) => t + n, 0)   // 6236

// Rastgele, ÇAKIŞMASIZ âyet kimlikleri ("002255" biçiminde).
function rastgeleAyetler(adet) {
  const uc = (n) => String(n).padStart(3, "0")
  const secilen = new Set()
  let guvenlik = 0
  while (secilen.size < adet && guvenlik++ < adet * 20) {
    const s = Math.floor(Math.random() * 114)
    const a = Math.floor(Math.random() * AYET_SAYILARI[s]) + 1
    secilen.add(`${uc(s + 1)}${uc(a)}`)
  }
  return [...secilen]
}
const VARSAYILAN_KARI = "https://everyayah.com/data/Alafasy_128kbps/"

/* Çift onaylı düğme. `onayMetni` ikinci dokunuşu bekleyen hâlin yazısı. */
function OnayliDugme({ theme, metin, onayMetni = "Emin misiniz? Tekrar dokunun", ikon: Ikon, kapali, tehlike, onOnay }) {
  const [onayda, setOnayda] = useState(false)
  const zaman = useRef(null)
  useEffect(() => () => { if (zaman.current) clearTimeout(zaman.current) }, [])

  function tikla() {
    if (kapali) return
    if (!onayda) {
      setOnayda(true)
      zaman.current = setTimeout(() => setOnayda(false), ONAY_SURESI)
      return
    }
    if (zaman.current) clearTimeout(zaman.current)
    setOnayda(false)
    onOnay()
  }

  const renk = onayda ? "#c0392b" : (tehlike ? "#c0392b" : theme.accent)
  return (
    <button
      onClick={tikla}
      disabled={kapali}
      style={{
        display: "flex", alignItems: "center", justifyContent: "center", gap: "7px",
        width: "100%", padding: "10px 12px", borderRadius: "10px",
        border: `1px solid ${kapali ? theme.border : renk}`,
        background: onayda ? `${renk}18` : "transparent",
        color: kapali ? theme.textSecondary : renk,
        fontSize: "13px", fontWeight: 600, fontFamily: "inherit",
        cursor: kapali ? "default" : "pointer",
        opacity: kapali ? 0.5 : 1,
        transition: "background 0.15s ease, color 0.15s ease, border-color 0.15s ease",
      }}
    >
      {onayda ? <AlertTriangle size={15} /> : (Ikon ? <Ikon size={15} /> : null)}
      {onayda ? onayMetni : metin}
    </button>
  )
}

function Ayrac({ theme }) {
  return <div style={{ height: "1px", background: theme.border, opacity: 0.6, margin: "12px 0" }} />
}

export default function VeriAyarlari({ theme }) {
  // Envanter her açılışta bir kez okunur; silme/yükleme sonrası `tazele` ile yenilenir.
  // ── AKORDİYON ────────────────────────────────────────────────────────────
  // Aynı anda TEK bölüm açık. Panel kısa kalsın diye; önemli sayılar zaten
  // başlık satırındaki özette görünüyor, bölüm açmaya gerek kalmıyor.
  const [acikBolum, setAcikBolum] = useState(null)
  const kapak = (id) => ({
    acik: acikBolum === id,
    onAc: () => setAcikBolum(x => (x === id ? null : id)),
  })

  const [tazele, setTazele] = useState(0)
  const kutular = useMemo(() => envanter(), [tazele])
  const toplam = useMemo(() => toplamBoyut(), [tazele])

  const [kopyalandi, setKopyalandi] = useState(false)
  const [indirmeHatasi, setIndirmeHatasi] = useState(false)
  const [yapistirAcik, setYapistirAcik] = useState(false)
  const [yapistirMetni, setYapistirMetni] = useState("")
  const [aday, setAday] = useState(null)      // çözümlenmiş yedek, onay bekliyor
  const [mesaj, setMesaj] = useState(null)    // { tip: "iyi"|"kotu", metin }
  const dosyaRef = useRef(null)

  // ── DEPOLAMA ÖLÇÜMÜ ──────────────────────────────────────────────────────
  // `navigator.storage.estimate()` tarayıcının bu kaynağa ayırdığı yeri ve
  // kullanılanı veriyor. Çevrimdışı indirme geldiğinde sürekli lazım olacak.
  const [depolama, setDepolama] = useState(null)
  const [kalici, setKalici] = useState(null)
  useEffect(() => {
    let iptal = false
    ;(async () => {
      // NİÇİN AYRI TEŞHİS: `navigator.storage` yalnız GÜVENLİ BAĞLAMDA (HTTPS ya da
      // localhost) tanımlıdır. Geliştirme sunucusuna telefondan http://192.168.x.x
      // ile bağlanınca API hiç yoktur; eski hâl buna "bu tarayıcı desteklemiyor"
      // diyordu ve yanlış yöne baktırıyordu. Aynı kısıt SERVİS İŞÇİSİ için de
      // geçerli — çevrimdışı özelliği de o adreste hiç çalışmaz.
      try {
        if (!window.isSecureContext) {
          if (!iptal) setDepolama({ hata: "guvensiz" })
        } else if (!navigator.storage || !navigator.storage.estimate) {
          if (!iptal) setDepolama({ hata: "yok" })
        } else {
          const e = await navigator.storage.estimate()
          if (!iptal) setDepolama({ kullanilan: e.usage || 0, kota: e.quota || 0 })
        }
      } catch { if (!iptal) setDepolama({ hata: "yok" }) }
      try {
        const k = await navigator.storage.persisted()
        if (!iptal) setKalici(k)
      } catch { /* destek yok */ }
    })()
    return () => { iptal = true }
  }, [tazele])

  async function kaliciYap() {
    try {
      const oldu = await navigator.storage.persist()
      setKalici(oldu)
      bilgiVer(oldu ? "iyi" : "kotu", oldu
        ? "Depolama kalıcı işaretlendi — tarayıcı yer açmak için silmeyecek."
        : "Tarayıcı kalıcı depolama vermedi. Veriler yine durur ama yer darlığında silinebilir.")
    } catch {
      bilgiVer("kotu", "Bu tarayıcı kalıcı depolamayı desteklemiyor.")
    }
  }

  // ── ÇEVRİMDIŞI DURUMU ────────────────────────────────────────────────────
  const [cevrimdisi, setCevrimdisi] = useState(null)
  useEffect(() => {
    let iptal = false
    ;(async () => {
      if (!destekVar()) { if (!iptal) setCevrimdisi({ destek: false }); return }
      const [surum, dokum] = await Promise.all([swSurum(), onbellekDokumu()])
      let kayitli = false
      try {
        const k = await navigator.serviceWorker.getRegistrations()
        kayitli = k.length > 0
      } catch { /* yoksay */ }
      if (!iptal) setCevrimdisi({ destek: true, surum, dokum, kayitli })
    })()
    return () => { iptal = true }
  }, [tazele])

  async function onbellekTemizleTikla() {
    const n = await onbellegiTemizle()
    bilgiVer("iyi", `${n} önbellek silindi, sayfa yenileniyor…`)
    setTimeout(() => window.location.reload(), 600)
  }

  // ── ÇEVRİMDIŞI TESTİ (geçici) ────────────────────────────────────────────
  const [testUrl, setTestUrl] = useState(VARSAYILAN_KARI)
  const [test, setTest] = useState(null)      // { calisiyor, cors, ornekler, hata }

  async function cevrimdisiTest() {
    setTest({ calisiyor: true })
    const kok = testUrl.trim().replace(/\/?$/, "/")
    const ornekler = []
    let cors = null, hata = null
    for (const a of rastgeleAyetler(ORNEK_SAYISI)) {
      const url = `${kok}${a}.mp3`
      try {
        // HEAD: dosyayı İNDİRMEDEN boyutu öğreniyoruz. `Content-Length` CORS'ta
        // güvenli listede olduğu için ek başlık izni gerekmiyor.
        // mode:"cors" — sunucu CORS göndermiyorsa burada HATA fırlar; asıl soru bu.
        let y = await fetch(url, { method: "HEAD", mode: "cors", cache: "no-store" })
        let bayt = Number(y.headers.get("content-length") || 0)
        // Bazı sunucular HEAD'e boyut vermiyor; o âyet için tek seferlik GET.
        if (y.ok && !bayt) {
          const g = await fetch(url, { mode: "cors", cache: "no-store" })
          if (g.ok) bayt = (await g.blob()).size
        }
        cors = true
        if (y.ok && bayt) ornekler.push({ a, bayt })
        else ornekler.push({ a, hata: y.ok ? "boyut yok" : `HTTP ${y.status}` })
      } catch (e) {
        cors = false
        hata = String(e && e.message ? e.message : e)
        ornekler.push({ a, hata: "erişilemedi" })
        break            // CORS yoksa 24 kez denemenin anlamı yok
      }
    }
    const olculen = ornekler.filter(o => o.bayt).map(o => o.bayt)
    const ortalama = olculen.length ? olculen.reduce((t, b) => t + b, 0) / olculen.length : 0
    // Dağılımın ne kadar savruk olduğunu da gösterelim — tahminin ne kadar
    // güvenilir olduğunu kullanıcı görsün (âyet uzunlukları çok değişken).
    const enKucuk = olculen.length ? Math.min(...olculen) : 0
    const enBuyuk = olculen.length ? Math.max(...olculen) : 0
    setTest({
      cors, ornekler, ortalama, enKucuk, enBuyuk,
      sayi: olculen.length,
      toplam: ortalama * AYET_SAYISI,
      hata,
    })
  }

  const doluKutular = kutular.filter(k => k.adet > 0)

  function bilgiVer(tip, metin) {
    setMesaj({ tip, metin })
    setTimeout(() => setMesaj(null), 5000)
  }

  function indir() {
    const oldu = yedekIndir()
    setIndirmeHatasi(!oldu)
    if (oldu) bilgiVer("iyi", `${yedekDosyaAdi()} indirildi.`)
  }

  async function panoyaKopyala() {
    try {
      await navigator.clipboard.writeText(yedekMetni())
      setKopyalandi(true)
      setTimeout(() => setKopyalandi(false), 2500)
    } catch {
      bilgiVer("kotu", "Panoya kopyalanamadı. Yedeği dosya olarak indirmeyi deneyin.")
    }
  }

  async function dosyaSecildi(e) {
    const d = e.target.files && e.target.files[0]
    // Aynı dosya art arda seçilebilsin diye input sıfırlanır.
    e.target.value = ""
    if (!d) return
    const c = await dosyadanOku(d)
    if (c.hata) { bilgiVer("kotu", c.hata); return }
    setAday(c)
    setAcikBolum("geri")
  }

  function yapistirilaniAl() {
    const c = yedekCozumle(yapistirMetni)
    if (c.hata) { bilgiVer("kotu", c.hata); return }
    setYapistirAcik(false)
    setYapistirMetni("")
    setAday(c)
    setAcikBolum("geri")
  }

  function geriYukle(kip) {
    const s = yedekYaz(aday, kip)
    if (s.hata) { bilgiVer("kotu", s.hata); return }
    setAday(null)
    // Yenileme şart: değerlerin çoğu açılışta okunuyor.
    setTimeout(() => window.location.reload(), 350)
    bilgiVer("iyi", `${s.yazilan} kayıt geri yüklendi, sayfa yenileniyor…`)
  }

  function kategoriSifirla(id, ad) {
    const silinen = sifirla(id)
    setTazele(x => x + 1)
    bilgiVer("iyi", `${ad}: ${silinen.length} kayıt silindi.`)
    if (id === "hepsi" || id === "tema") setTimeout(() => window.location.reload(), 600)
  }

  const tarihMetni = aday?.tarih
    ? new Date(aday.tarih).toLocaleString("tr-TR", { dateStyle: "medium", timeStyle: "short" })
    : "bilinmiyor"

  return (
    <div>
      <Katlanir
        theme={theme} ikon={HardDrive} baslik="Depolama"
        ozet={depolama && !depolama.hata ? `${boyutMetni(depolama.kota)} ayrıldı` : null}
        {...kapak("depolama")}
      >
        <div style={{
          padding: "10px 12px", borderRadius: "10px", marginBottom: "8px",
          background: `${theme.accent}0d`, border: `1px solid ${theme.border}`,
          fontSize: "12px", color: theme.textSecondary, lineHeight: 1.5,
        }}>
          Bu cihazda <b style={{ color: theme.text }}>{doluKutular.reduce((t, k) => t + k.adet, 0)}</b> kayıt
          {" "}(<b style={{ color: theme.text }}>{boyutMetni(toplam)}</b>) saklı.
          Veriler yalnız bu tarayıcıda durur; uygulamayı silmek ya da site verilerini
          temizlemek hepsini götürür.
        </div>
      <div style={{
        padding: "10px 12px", borderRadius: "10px",
        border: `1px solid ${theme.border}`, background: theme.background,
        fontSize: "12px", color: theme.textSecondary, lineHeight: 1.6,
      }}>
        {!depolama && "Ölçülüyor…"}
        {depolama?.hata === "guvensiz" && (
          <>
            <b style={{ color: "#c0392b" }}>Güvenli bağlam değil.</b> Bu sayfa{" "}
            <code style={{ fontSize: "11px" }}>{location.protocol}//{location.host}</code>{" "}
            adresinden açıldı; tarayıcı depolama bilgisini yalnız HTTPS ya da
            localhost üzerinde veriyor. <b>Çevrimdışı özelliği de</b> aynı sebeple
            burada çalışmaz — kurulu uygulama (HTTPS) üzerinden bakın.
          </>
        )}
        {depolama?.hata === "yok" && "Bu tarayıcı depolama bilgisi vermiyor."}
        {depolama && !depolama.hata && (
          <>
            <div>
              Kullanılan: <b style={{ color: theme.text }}>{boyutMetni(depolama.kullanilan)}</b>
              {depolama.kota > 0 && <> · Ayrılan: <b style={{ color: theme.text }}>{boyutMetni(depolama.kota)}</b></>}
            </div>
            {depolama.kota > 0 && (
              <div style={{
                height: "6px", borderRadius: "3px", marginTop: "7px",
                background: `${theme.accent}20`, overflow: "hidden",
              }}>
                <div style={{
                  height: "100%", borderRadius: "3px", background: theme.accent,
                  width: `${Math.min(100, Math.max(1, (depolama.kullanilan / depolama.kota) * 100))}%`,
                }} />
              </div>
            )}
            <div style={{ marginTop: "8px", display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
              <span>Kalıcı depolama: <b style={{ color: theme.text }}>{kalici === null ? "bilinmiyor" : kalici ? "açık" : "kapalı"}</b></span>
              {kalici === false && (
                <button onClick={kaliciYap} style={{
                  padding: "5px 10px", borderRadius: "8px", fontSize: "11px",
                  background: "transparent", border: `1px solid ${theme.accent}`,
                  color: theme.accent, fontFamily: "inherit", cursor: "pointer",
                }}>Kalıcı yap</button>
              )}
            </div>
          </>
        )}
      </div>

      </Katlanir>

      <Katlanir
        theme={theme} ikon={Download} baslik="Yedek al"
        ozet={`${doluKutular.reduce((t, k) => t + k.adet, 0)} kayıt`}
        {...kapak("yedek")}
      >
      <div style={{ display: "flex", gap: "8px" }}>
        <button onClick={indir} style={{
          flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: "7px",
          padding: "11px 12px", borderRadius: "10px",
          background: theme.accent, color: "#fff", border: "none",
          fontSize: "13px", fontWeight: 600, fontFamily: "inherit", cursor: "pointer",
        }}>
          <Download size={15} /> Dosya indir
        </button>
        <button onClick={panoyaKopyala} title="Yedeği panoya kopyala" style={{
          display: "flex", alignItems: "center", justifyContent: "center", gap: "6px",
          padding: "11px 14px", borderRadius: "10px",
          background: "transparent", border: `1px solid ${theme.border}`,
          color: kopyalandi ? theme.accent : theme.textSecondary,
          fontSize: "13px", fontFamily: "inherit", cursor: "pointer",
        }}>
          {kopyalandi ? <Check size={15} /> : <Copy size={15} />}
          {kopyalandi ? "Kopyalandı" : "Kopyala"}
        </button>
      </div>
      {indirmeHatasi && (
        <div style={{ fontSize: "11px", color: theme.textSecondary, marginTop: "6px", lineHeight: 1.5 }}>
          İndirme başlatılamadı — ana ekrana eklenmiş uygulamalarda bu olabiliyor.
          "Kopyala" ile yedeği panoya alıp bir not uygulamasına yapıştırabilirsiniz.
        </div>
      )}

      </Katlanir>

      <Katlanir
        theme={theme} ikon={Upload} baslik="Geri yükle"
        ozet={aday ? `${aday.adet} kayıt okundu` : null}
        {...kapak("geri")}
      >
      {!aday && (
        <>
          <div style={{ display: "flex", gap: "8px" }}>
            <button onClick={() => dosyaRef.current?.click()} style={{
              flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: "7px",
              padding: "11px 12px", borderRadius: "10px",
              background: "transparent", border: `1px solid ${theme.accent}`,
              color: theme.accent, fontSize: "13px", fontWeight: 600,
              fontFamily: "inherit", cursor: "pointer",
            }}>
              <Upload size={15} /> Dosya seç
            </button>
            <button onClick={() => setYapistirAcik(v => !v)} style={{
              display: "flex", alignItems: "center", justifyContent: "center", gap: "6px",
              padding: "11px 14px", borderRadius: "10px",
              background: "transparent", border: `1px solid ${theme.border}`,
              color: theme.textSecondary, fontSize: "13px", fontFamily: "inherit", cursor: "pointer",
            }}>
              <FileText size={15} /> Yapıştır
            </button>
          </div>
          <input ref={dosyaRef} type="file" accept=".json,application/json"
            onChange={dosyaSecildi} style={{ display: "none" }} />
          {yapistirAcik && (
            <div style={{ marginTop: "8px" }}>
              <textarea
                value={yapistirMetni}
                onChange={e => setYapistirMetni(e.target.value)}
                placeholder="Yedek metnini buraya yapıştırın…"
                rows={4}
                style={{
                  width: "100%", boxSizing: "border-box", padding: "10px",
                  borderRadius: "10px", border: `1px solid ${theme.border}`,
                  background: theme.background, color: theme.text,
                  fontSize: "12px", fontFamily: "ui-monospace, monospace", resize: "vertical",
                }}
              />
              <button onClick={yapistirilaniAl} disabled={!yapistirMetni.trim()} style={{
                width: "100%", marginTop: "6px", padding: "9px", borderRadius: "10px",
                background: "transparent", border: `1px solid ${theme.accent}`,
                color: theme.accent, fontSize: "13px", fontWeight: 600,
                fontFamily: "inherit", cursor: yapistirMetni.trim() ? "pointer" : "default",
                opacity: yapistirMetni.trim() ? 1 : 0.5,
              }}>Yedeği oku</button>
            </div>
          )}
        </>
      )}

      {/* Aday yedek — ne olduğu gösterilip iki kipten biri seçiliyor */}
      {aday && (
        <div style={{
          padding: "12px", borderRadius: "10px",
          border: `1px solid ${theme.accent}`, background: `${theme.accent}0d`,
        }}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: "8px", marginBottom: "10px" }}>
            <div style={{ flex: 1, fontSize: "12px", color: theme.text, lineHeight: 1.6 }}>
              <b>{aday.adet}</b> kayıt içeren yedek okundu.<br />
              <span style={{ color: theme.textSecondary }}>Tarih: {tarihMetni}</span>
            </div>
            <button onClick={() => setAday(null)} aria-label="Vazgeç"
              style={{ background: "none", border: "none", color: theme.textSecondary, cursor: "pointer", display: "flex", padding: "2px" }}>
              <X size={16} />
            </button>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "7px" }}>
            <OnayliDugme theme={theme} metin="Birleştir (yalnız yedektekileri yaz)"
              onayMetni="Birleştirilsin mi? Tekrar dokunun"
              onOnay={() => geriYukle("birlestir")} />
            <OnayliDugme theme={theme} tehlike metin="Tamamen değiştir (öncekileri sil)"
              onayMetni="Mevcut veriler silinecek! Tekrar dokunun"
              onOnay={() => geriYukle("degistir")} />
          </div>
          <div style={{ fontSize: "11px", color: theme.textSecondary, marginTop: "8px", lineHeight: 1.5 }}>
            Geri yüklendikten sonra sayfa kendiliğinden yenilenir.
          </div>
        </div>
      )}

      </Katlanir>

      <Katlanir
        theme={theme} ikon={Trash2} baslik="Sıfırla"
        ozet={`${doluKutular.length} bölüm`}
        {...kapak("sifirla")}
      >
      <div style={{ fontSize: "11px", color: theme.textSecondary, marginBottom: "10px", lineHeight: 1.5 }}>
        Silinen geri getirilemez. Sıfırlamadan önce yukarıdan bir yedek almanız iyi olur.
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
        {kutular.map(k => (
          <div key={k.id} style={{
            padding: "10px 12px", borderRadius: "10px",
            border: `1px solid ${theme.border}`, background: theme.background,
            opacity: k.adet ? 1 : 0.55,
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: k.adet ? "8px" : 0 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: "13px", color: theme.text, fontWeight: 600 }}>
                  {k.ad}
                  {k.korumali && k.adet > 0 && (
                    <span style={{ fontSize: "10px", color: "#c0392b", marginLeft: "6px" }}>• kişisel</span>
                  )}
                </div>
                <div style={{ fontSize: "11px", color: theme.textSecondary, marginTop: "2px", lineHeight: 1.4 }}>
                  {k.aciklama}
                </div>
              </div>
              <span style={{
                flexShrink: 0, fontSize: "11px", fontWeight: 600,
                color: k.adet ? theme.accent : theme.textSecondary,
                background: k.adet ? `${theme.accent}18` : "transparent",
                borderRadius: "999px", padding: "3px 9px",
              }}>{k.adet}{k.adet ? ` · ${boyutMetni(k.boyut)}` : ""}</span>
            </div>
            {k.adet > 0 && (
              <OnayliDugme theme={theme} tehlike={k.korumali} ikon={Trash2}
                metin="Sıfırla"
                onayMetni={k.korumali ? `${k.adet} kişisel kayıt silinecek! Tekrar dokunun` : "Emin misiniz? Tekrar dokunun"}
                onOnay={() => kategoriSifirla(k.id, k.ad)} />
            )}
          </div>
        ))}
      </div>

      <Ayrac theme={theme} />
      <OnayliDugme theme={theme} tehlike ikon={Trash2}
        metin="Her şeyi sıfırla"
        onayMetni="TÜM veriler silinecek! Tekrar dokunun"
        kapali={!doluKutular.length}
        onOnay={() => kategoriSifirla("hepsi", "Tümü")} />

      {/* ── ÇEVRİMDIŞI TESTİ (GEÇİCİ — CEVRIMDISI_TESTI ile kapatılır) ──────
          İki soruyu tek dokunuşta cevaplıyor: (1) ses sunucusu CORS gönderiyor
          mu, (2) bir âyet gerçekte kaç KB. İkincisi "tüm Kur'ân kaç MB eder"
          sorusunu tahminden ÖLÇÜME çeviriyor. */}
      </Katlanir>

      {/* ── ÇEVRİMDIŞI ────────────────────────────────────────────────────
          Servis işçisinin bilinen bedeli BAYAT KOD: yeni sürüm yayınlanır,
          cihaz eskisini çalıştırır, olmayan hata aranır. Bu bölüm o şüpheyi
          tahminle değil BAKARAK çözmek için var — sürüm damgası görünür,
          önbellekte kaç dosya olduğu görünür, ve tek dokunuşla temizlenir. */}
      <Katlanir
        theme={theme} ikon={CloudOff} baslik="Çevrimdışı"
        ozet={cevrimdisi
          ? (cevrimdisi.destek === false ? "kapalı" : cevrimdisi.kayitli ? (cevrimdisi.surum || "etkin") : "kurulmadı")
          : null}
        {...kapak("cevrimdisi")}
      >
        <div style={{
          padding: "10px 12px", borderRadius: "10px",
          border: `1px solid ${theme.border}`, background: theme.background,
          fontSize: "12px", color: theme.textSecondary, lineHeight: 1.6,
        }}>
          {!cevrimdisi && "Bakılıyor…"}
          {cevrimdisi?.destek === false && (
            <>
              <b style={{ color: "#c0392b" }}>Çevrimdışı kapalı.</b> Servis işçisi
              yalnız güvenli bağlamda (HTTPS ya da localhost) çalışır. Geliştirme
              sunucusuna ağ adresiyle bağlanıldığında tarayıcı bu özelliği hiç
              açmaz — kurulu uygulamadan bakın.
            </>
          )}
          {cevrimdisi?.destek && (
            <>
              <div>
                Durum: <b style={{ color: theme.text }}>{cevrimdisi.kayitli ? "etkin" : "henüz kurulmadı"}</b>
                {cevrimdisi.surum && <> · Sürüm: <b style={{ color: theme.text }}>{cevrimdisi.surum}</b></>}
              </div>
              {cevrimdisi.dokum?.length > 0 ? (
                <div style={{ marginTop: "6px" }}>
                  {cevrimdisi.dokum.map(d => (
                    <div key={d.ad} style={{ fontFamily: "ui-monospace, monospace", fontSize: "11px" }}>
                      {d.ad}: {d.adet} dosya
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ marginTop: "6px" }}>Önbellekte henüz dosya yok.</div>
              )}
              <div style={{ marginTop: "8px", lineHeight: 1.5 }}>
                Açtığınız sayfalar ve kitaplar kendiliğinden saklanıyor; bir kez
                çevrimiçi açtığınız şey sonra çevrimdışı da açılır.
              </div>
            </>
          )}
        </div>

        {cevrimdisi?.destek && (
          <div style={{ marginTop: "8px" }}>
            <OnayliDugme
              theme={theme} ikon={Trash2}
              metin="Önbelleği temizle ve yenile"
              onayMetni="Önbellek silinecek, sayfa yenilenecek. Tekrar dokunun"
              onOnay={onbellekTemizleTikla}
            />
            <div style={{ fontSize: "11px", color: theme.textSecondary, marginTop: "6px", lineHeight: 1.5 }}>
              Yalnız indirilmiş dosyaları siler — işaretleriniz, notlarınız ve
              ayarlarınız etkilenmez. "Yeni sürümü almıyor" şüphesinde ilk
              başvurulacak yer burası.
            </div>
          </div>
        )}
      </Katlanir>

      {CEVRIMDISI_TESTI && (
        <Katlanir
          theme={theme} ikon={Wifi} baslik="Çevrimdışı testi (geçici)"
          ozet={test && !test.calisiyor && test.toplam ? boyutMetni(test.toplam) : null}
          {...kapak("test")}
        >
          <input
            value={testUrl}
            onChange={e => setTestUrl(e.target.value)}
            placeholder="Kâri klasörünün adresi…"
            style={{
              width: "100%", boxSizing: "border-box", padding: "9px 10px",
              borderRadius: "10px", border: `1px solid ${theme.border}`,
              background: theme.background, color: theme.text,
              fontSize: "11px", fontFamily: "ui-monospace, monospace",
            }}
          />
          <div style={{ fontSize: "11px", color: theme.textSecondary, margin: "6px 2px 8px", lineHeight: 1.5 }}>
            Uygulamanın gerçekten kullandığı kâri adresini yapıştırırsanız ölçüm doğru olur.
          </div>
          <button onClick={cevrimdisiTest} disabled={test?.calisiyor} style={{
            width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: "7px",
            padding: "10px 12px", borderRadius: "10px",
            background: "transparent", border: `1px solid ${theme.accent}`,
            color: theme.accent, fontSize: "13px", fontWeight: 600,
            fontFamily: "inherit", cursor: test?.calisiyor ? "default" : "pointer",
            opacity: test?.calisiyor ? 0.6 : 1,
          }}>
            {test?.calisiyor ? <Loader size={15} className="veri-spin" /> : <Wifi size={15} />}
            {test?.calisiyor ? "Ölçülüyor…" : "3 âyet indirip ölç"}
          </button>

          {test && !test.calisiyor && (
            <div style={{
              marginTop: "8px", padding: "10px 12px", borderRadius: "10px",
              border: `1px solid ${theme.border}`, background: theme.background,
              fontSize: "12px", color: theme.textSecondary, lineHeight: 1.6,
            }}>
              <div style={{ color: test.cors ? theme.accent : "#c0392b", fontWeight: 600, marginBottom: "6px" }}>
                {test.cors
                  ? "CORS var — sesler saydam olarak önbelleğe alınabilir."
                  : "CORS yok — ancak opak olarak saklanabilir (kotada şişer, hata ayıklanamaz)."}
              </div>
              {test.ortalama > 0 ? (
                <div style={{ color: theme.text }}>
                  <div style={{ fontSize: "11px", color: theme.textSecondary, marginBottom: "6px" }}>
                    {test.sayi} rastgele âyet ölçüldü · en küçük {boyutMetni(test.enKucuk)} ·
                    en büyük {boyutMetni(test.enBuyuk)} · ortalama <b>{boyutMetni(test.ortalama)}</b>
                  </div>
                  <div>
                    {AYET_SAYISI} âyet ≈ <b>{boyutMetni(test.toplam)}</b>
                  </div>
                  <div>
                    Cüz başına ≈ <b>{boyutMetni(test.toplam / 30)}</b>
                  </div>
                  <div style={{ fontSize: "11px", color: theme.textSecondary, marginTop: "6px", lineHeight: 1.5 }}>
                    En küçük ile en büyük arasındaki fark ne kadar açıksa tahmin o kadar
                    kaba demektir; testi birkaç kez çalıştırıp sonuçları karşılaştırın.
                  </div>
                </div>
              ) : (
                <div style={{ fontFamily: "ui-monospace, monospace", fontSize: "11px" }}>
                  {test.ornekler.slice(0, 4).map(o => (
                    <div key={o.a}>{o.a}: {o.hata}</div>
                  ))}
                </div>
              )}
              {test.hata && (
                <div style={{ fontSize: "11px", marginTop: "6px", color: "#c0392b" }}>{test.hata}</div>
              )}
            </div>
          )}
        </Katlanir>
      )}

      {/* Loader'ın dönmesi için — `arama-spin` Arama.jsx'te tanımlı, buraya
          bağımlı olmayalım diye kendi adıyla kopyası. */}
      <style>{`@keyframes veri-spin { to { transform: rotate(360deg) } } .veri-spin { animation: veri-spin 0.9s linear infinite }`}</style>

      {/* ── BİLDİRİM ──────────────────────────────────────────────────────── */}
      {mesaj && (
        <div style={{
          marginTop: "12px", padding: "9px 12px", borderRadius: "10px",
          fontSize: "12px", lineHeight: 1.5,
          color: mesaj.tip === "iyi" ? theme.accent : "#c0392b",
          background: mesaj.tip === "iyi" ? `${theme.accent}12` : "#c0392b12",
          border: `1px solid ${mesaj.tip === "iyi" ? theme.accent : "#c0392b"}40`,
        }}>
          {mesaj.metin}
        </div>
      )}
    </div>
  )
}
