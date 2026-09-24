/* ═══════════════════════════════════════════════════════════════════════════
   VUKUF — VERİ YEDEKLEME / GERİ YÜKLEME / SIFIRLAMA
   src/data/vukufVeri.js

   Saf yardımcı modül: React yok, hiçbir mevcut dosyaya dokunmuyor. Yalnızca
   localStorage'ı okuyup yazıyor.

   ── İKİ FARKLI YAKLAŞIM, BİLEREK ───────────────────────────────────────────
   YEDEKLEME  → ÖNEK TARAMASI. `vukuf-` / `vukuf_` ile başlayan HER anahtar
     alınır, aşağıdaki GECICI listesi hariç. Elle anahtar listesi TUTULMUYOR;
     çünkü yarın yeni bir özellik yeni bir anahtar eklediğinde elle tutulan
     liste onu SESSİZCE atlar ve bunu ancak veri kaybedince fark edersiniz.
     Önek taraması ileriye dönük çalışır: bilmediğim anahtarı da yedekler.

   SIFIRLAMA  → AÇIK LİSTE. Yıkıcı işlem olduğu için desenle tahmin YOK.
     Her kategori, hangi anahtarları ve hangi önekleri kapsadığını tek tek
     yazar. Eşleşmeyen her anahtar "diger" kategorisinde GÖRÜNÜR kalır —
     sessizce yutulmaz. Böylece yeni bir anahtar eklendiğinde kullanıcı onu
     "Diğer" altında görür, yanlış kategoride silinmiş olmaz.

   ⚠ NİÇİN TAHMİN YASAK — gerçek tuzak: `vukuf-sure-bilgisi` bardaki "sûre
     bilgisi" göster/gizle AYARI; `vukuf-sure-kuran-2026-9-24` ise o günün
     OKUMA SÜRESİ kaydı. İkisi de "vukuf-sure" ile başlıyor. Desene bakan bir
     sınıflandırma "Okuma geçmişini sıfırla" derken bar ayarını da siler.

   ⚠ ANAHTARLARDA TÜRKÇE HARF YOK ama Türkçe kökenli adlar var; karşılaştırma
     her yerde birebir (===) ya da startsWith ile yapılıyor, küçültme/normalize
     UYGULANMIYOR — "İ/ı" tuzağına düşmemek için bilerek.
   ═══════════════════════════════════════════════════════════════════════════ */

export const YEDEK_SURUM = 1
const ONEKLER = ["vukuf-", "vukuf_"]

/* ── GEÇİCİ ANAHTARLAR ───────────────────────────────────────────────────────
   Bunlar kullanıcı verisi değil, ekranlar arası gezinme notları: "aramaya dön",
   "şu âyete git" gibi. Yedeğe girmezler (başka cihazda anlamsız, hatta zararlı:
   geri yükleyince uygulama alakasız bir hedefe atlar). Sıfırlamada da ayrı
   tutulur; "Geçici veriler" kategorisiyle temizlenebilirler. */
const GECICI_ANAHTAR = new Set([
  "vukuf-arama-devam", "vukuf-arama-durum", "vukuf-arama-hedef",
  "vukuf-donus", "vukuf-donus-yol", "vukuf-kuran-hedef",
  "vukuf-tefeul-devam", "vukuf-tefeul-durum", "vukuf-okuma-devam",
])

/* ── KATEGORİLER ─────────────────────────────────────────────────────────────
   `anahtarlar` = birebir eşleşen adlar. `onekler` = bu önekle BAŞLAYAN her ad
   (kitap/âlim kimliğiyle türeyen anahtarlar için).
   SIRA ÖNEMLİ: bir anahtar ilk eşleşen kategoriye yazılır. Daha dar tanımlı
   kategoriler (veri) daha genişlerin (ayar) ÜSTÜNDE duruyor. */
export const KATEGORILER = [
  {
    id: "isaretler",
    ad: "İşaretler ve kayıtlar",
    aciklama: "Mushafta ve kitaplarda koyduğunuz yer imleri",
    korumali: true,          // "her şeyi sıfırla" dışında ekstra uyarı gösterilir
    anahtarlar: ["vukuf-kayitlar", "vukuf-isaretler"],
    onekler: ["vukuf_kayitlar_"],
  },
  {
    id: "notlar",
    ad: "Notlar",
    aciklama: "Kitaplara düştüğünüz notlar",
    korumali: true,
    anahtarlar: [],
    onekler: ["vukuf_notlar_"],
  },
  {
    id: "vurgular",
    ad: "Vurgular",
    aciklama: "Metin üzerinde işaretlediğiniz renkli bölümler",
    korumali: true,
    anahtarlar: [],
    onekler: ["vukuf_vurgular_"],
  },
  {
    id: "gecmis",
    ad: "Okuma geçmişi",
    aciklama: "Son konum, son sayfa ve günlük okuma süreleri",
    anahtarlar: [
      "vukuf-son-konum", "vukuf-son-sayfa", "vukuf-son-scroll",
      "vukuf-okuma-zamani", "vukuf-okuma-istatistik", "vukuf-okuma-donus-odak",
    ],
    // DİKKAT: `vukuf-sure-` DEĞİL, `vukuf-sure-kuran-`. Kısa önek yazılsaydı
    // `vukuf-sure-bilgisi` (bar ayarı) de buraya düşer ve yanlışlıkla silinirdi.
    onekler: ["vukuf_son_konum_", "vukuf_sure_", "vukuf-sure-kuran-"],
  },
  {
    id: "kutuphane",
    ad: "Kütüphane düzeni",
    aciklama: "Özel raflar, sıralama ve açık/gizli kategoriler",
    anahtarlar: [
      "vukuf-ozel-raflar", "vukuf-gizli-raflar", "vukuf-acik-kategori",
      "vukuf-alim-sira", "vukuf-kategori-sira", "vukuf-kitap-sira",
      "vukuf-ust-sira", "vukuf-raf-ac",
    ],
    onekler: ["vukuf-alim-rafi-", "vukuf-ozel-acik-", "vukuf-ozelalt-"],
  },
  {
    id: "tema",
    ad: "Tema ve renkler",
    aciklama: "Seçili tema, özel palet ve renk tercihleri",
    anahtarlar: [
      "vukuf-tema", "vukuf-ozel-tema", "vukuf-lugat-renk", "vukuf-arapca-renk",
      "vukuf-kuran-ayetno-renk", "vukuf-kuran-yazi-renk", "vukuf-gorsel-son-renkler",
    ],
    onekler: [],
  },
  {
    id: "ses",
    ad: "Ses ve kâri",
    aciklama: "Seçili okuyucu, çalma hızı ve ses seviyesi",
    anahtarlar: ["vukuf-kari", "vukuf-calma-hizi", "vukuf-ses-seviyesi"],
    onekler: [],
  },
  {
    id: "okumaAyarlari",
    ad: "Okuma ayarları",
    aciklama: "Yazı boyutu, aralıklar, fontlar, bar düzeni ve görünüm",
    anahtarlar: [
      // Tipografi
      "vukuf-yazi-boyutu", "vukuf-kuran-yazi-boyutu", "vukuf-arap-boyutu",
      "vukuf-baslik-boyutu", "vukuf-satir-araligi", "vukuf-harf-araligi",
      "vukuf-kelime-araligi", "vukuf-hizalama",
      // Sayfa düzeni
      "vukuf-kenar-bosluk", "vukuf-okuma-kenar-bosluk",
      "vukuf-tam-genislik", "vukuf-okuma-tam-genislik",
      // Fontlar
      "vukuf-fontlar", "vukuf-kuran-arapca-font", "vukuf-arapca-elle",
      // Bar
      "vukuf-bar-konum", "vukuf-bar-gorunur", "vukuf-bar-sade", "vukuf-bar-ui-olcegi",
      "vukuf-buton-sirasi", "vukuf-buton-taraf",
      "vukuf-okuma-buton-sirasi", "vukuf-okuma-buton-taraf",
      "vukuf-otomatik-gizleme", "vukuf-gizleme-suresi",
      // Göster/gizle ve bilgi öğeleri
      "vukuf-btn-bilgi", "vukuf-btn-gorsel", "vukuf-btn-kayit", "vukuf-btn-otooynat",
      "vukuf-btn-sade", "vukuf-btn-sayfa", "vukuf-btn-sure", "vukuf-btn-tekrar",
      "vukuf-btn-tema", "vukuf-btn-yazitipi",
      "vukuf-sure-bilgisi", "vukuf-cuz-bilgisi", "vukuf-hizb-bilgisi",
      "vukuf-sayfa-gosterim", "vukuf-kuran-sayfa-gosterim",
      "vukuf-sade-mod", "vukuf-sade-mode", "vukuf-kuran-sade-gizli",
      "vukuf-bilgi-olcegi",
      // Genel görünüm
      "vukuf-dinamik-mod", "vukuf-giris-animasyonu",
    ],
    onekler: [],
  },
  {
    id: "gecici",
    ad: "Geçici veriler",
    aciklama: "Arama ve gidiş hatırlatmaları — silinmesi hiçbir şeyi kaybettirmez",
    anahtarlar: [...GECICI_ANAHTAR],
    onekler: [],
  },
]

const DIGER = {
  id: "diger",
  ad: "Diğer",
  aciklama: "Henüz sınıflandırılmamış anahtarlar",
  anahtarlar: [], onekler: [],
}

/* ── TEMEL OKUMA ──────────────────────────────────────────────────────────── */

// localStorage bazı ortamlarda (özel pencere, kapalı site verisi) ERİŞİMDE
// hata fırlatır. Her dokunuş korumalı.
function guvenli(f, yedek) {
  try { return f() } catch { return yedek }
}

export function tumAnahtarlar() {
  return guvenli(() => {
    const liste = []
    for (let i = 0; i < localStorage.length; i++) {
      const a = localStorage.key(i)
      if (a && ONEKLER.some(o => a.startsWith(o))) liste.push(a)
    }
    return liste.sort()
  }, [])
}

export function kategoriBul(anahtar) {
  for (const k of KATEGORILER) {
    if (k.anahtarlar.includes(anahtar)) return k.id
    if (k.onekler.some(o => anahtar.startsWith(o))) return k.id
  }
  return DIGER.id
}

function anahtarBoyutu(a) {
  return guvenli(() => ((localStorage.getItem(a) || "").length + a.length) * 2, 0)
}

export function boyutMetni(bayt) {
  if (bayt < 1024) return `${bayt} B`
  if (bayt < 1024 * 1024) return `${(bayt / 1024).toFixed(1)} KB`
  return `${(bayt / 1024 / 1024).toFixed(1)} MB`
}

/* Envanter: her kategoride kaç anahtar, ne kadar yer. Sıfırlama ekranı bunu
   gösteriyor — kullanıcı neyi sildiğini SAYIYLA görsün, "Notlar" yazıp boş
   kategori silmeye çalışmasın. */
export function envanter() {
  const kutular = new Map()
  for (const k of [...KATEGORILER, DIGER]) {
    kutular.set(k.id, { id: k.id, ad: k.ad, aciklama: k.aciklama, korumali: !!k.korumali, adet: 0, boyut: 0, anahtarlar: [] })
  }
  for (const a of tumAnahtarlar()) {
    const kutu = kutular.get(kategoriBul(a))
    if (!kutu) continue
    kutu.adet++
    kutu.boyut += anahtarBoyutu(a)
    kutu.anahtarlar.push(a)
  }
  return [...kutular.values()]
}

export function toplamBoyut() {
  return tumAnahtarlar().reduce((t, a) => t + anahtarBoyutu(a), 0)
}

/* ── YEDEK ALMA ──────────────────────────────────────────────────────────── */

export function yedekAl() {
  const veriler = {}
  for (const a of tumAnahtarlar()) {
    if (GECICI_ANAHTAR.has(a)) continue          // gezinme notu, yedeğe girmez
    const d = guvenli(() => localStorage.getItem(a), null)
    if (d != null) veriler[a] = d
  }
  return {
    uygulama: "vukuf",
    surum: YEDEK_SURUM,
    tarih: new Date().toISOString(),
    adet: Object.keys(veriler).length,
    veriler,
  }
}

export function yedekMetni() {
  return JSON.stringify(yedekAl(), null, 2)
}

export function yedekDosyaAdi() {
  const d = new Date()
  const ik = (n) => String(n).padStart(2, "0")
  return `vukuf-yedek-${d.getFullYear()}-${ik(d.getMonth() + 1)}-${ik(d.getDate())}.json`
}

/* Dosya indirme. iOS'ta ana ekrana eklenmiş uygulamada indirme bazen sessizce
   düşer; bu yüzden arayüzde AYRICA "panoya kopyala" seçeneği var. Burada
   yalnız başarıyı bildiriyoruz, arayüz gerisini halleder. */
export function yedekIndir() {
  return guvenli(() => {
    const blob = new Blob([yedekMetni()], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = yedekDosyaAdi()
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    // Hemen iptal edilirse bazı tarayıcılarda indirme yarıda kalıyor.
    setTimeout(() => { try { URL.revokeObjectURL(url) } catch { /* yoksay */ } }, 4000)
    return true
  }, false)
}

/* ── YEDEK OKUMA / DOĞRULAMA ─────────────────────────────────────────────── */

export function yedekCozumle(metin) {
  let d
  try { d = JSON.parse(metin) } catch { return { hata: "Dosya okunamadı — geçerli bir JSON değil." } }
  if (!d || typeof d !== "object") return { hata: "Dosya beklenen biçimde değil." }
  // Başka bir uygulamanın yedeğini yanlışlıkla yüklemeyi engelleyen tek kontrol.
  if (d.uygulama !== "vukuf") return { hata: "Bu dosya bir Vukuf yedeği değil." }
  if (!d.veriler || typeof d.veriler !== "object") return { hata: "Yedekte veri bölümü yok." }
  const anahtarlar = Object.keys(d.veriler).filter(a => ONEKLER.some(o => a.startsWith(o)))
  if (!anahtarlar.length) return { hata: "Yedek boş görünüyor." }
  return {
    surum: d.surum,
    tarih: d.tarih,
    adet: anahtarlar.length,
    anahtarlar,
    veriler: d.veriler,
  }
}

export function dosyadanOku(dosya) {
  return new Promise((coz) => {
    const okuyucu = new FileReader()
    okuyucu.onload = () => coz(yedekCozumle(String(okuyucu.result || "")))
    okuyucu.onerror = () => coz({ hata: "Dosya açılamadı." })
    okuyucu.readAsText(dosya)
  })
}

/* ── GERİ YÜKLEME ────────────────────────────────────────────────────────────
   kip "birlestir": yalnız yedekteki anahtarlar yazılır, gerisi durur.
   kip "degistir" : önce mevcut TÜM vukuf anahtarları silinir, sonra yazılır.
   Sayfanın yenilenmesi ÇAĞIRANIN işi — değerlerin çoğu açılışta bir kez
   state'e okunduğu için yenilenmeden arayüz eski değerleri göstermeye devam eder. */
export function yedekYaz(cozulmus, kip = "birlestir") {
  if (!cozulmus || cozulmus.hata) return { yazilan: 0, hata: cozulmus?.hata || "Geçersiz yedek." }
  let yazilan = 0, atlanan = 0
  try {
    if (kip === "degistir") {
      for (const a of tumAnahtarlar()) {
        try { localStorage.removeItem(a) } catch { /* yoksay */ }
      }
    }
    for (const a of cozulmus.anahtarlar) {
      const d = cozulmus.veriler[a]
      if (typeof d !== "string") { atlanan++; continue }
      try { localStorage.setItem(a, d); yazilan++ } catch { atlanan++ }
    }
  } catch {
    return { yazilan, atlanan, hata: "Yazma sırasında hata oluştu." }
  }
  return { yazilan, atlanan }
}

/* ── SIFIRLAMA ───────────────────────────────────────────────────────────────
   Tek bir kategori ya da "hepsi". Silinen anahtar adları geri döner — arayüz
   "şu kadar kayıt silindi" diyebilsin ve gerekirse günlüğe yazılabilsin. */
export function sifirla(kategoriId) {
  const silinecek = tumAnahtarlar().filter(a =>
    kategoriId === "hepsi" ? true : kategoriBul(a) === kategoriId
  )
  const silinen = []
  for (const a of silinecek) {
    try { localStorage.removeItem(a); silinen.push(a) } catch { /* yoksay */ }
  }
  return silinen
}
