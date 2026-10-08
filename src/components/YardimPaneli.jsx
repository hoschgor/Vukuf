/* ═══════════════════════════════════════════════════════════════════════════
   VUKUF — YARDIM (KULLANIM REHBERİ)
   src/components/YardimPaneli.jsx

   Kullanıcı (8 Ekim 2026): "Ana sayfaya ayarların yanına soru işareti bölümü
   yapalım. Bölümlerin nasıl kullanıldığını, bardaki öğelerin ne işe yaradığını
   şık ve kullanışlı şekilde anlatalım; kullanıcı aradığını bulabilsin. Emir kipi
   kullanmadan, nazik dille."

   YAPI
   • Navbar'daki (?) düğmesi bu paneli açar; gövde Ayarlar'la aynı `AltSayfa`.
   • Üstte arama kutusu: başlık, özet, metin ve gizli anahtar kelimelerde arar
     (aksan/büyük-küçük harf duyarsız, `normHarf`). Arama varken bölüm süzgeci
     devre dışı kalır, bütün rehberde arar.
   • Bölüm çipleri: Tümü · Kitaplık · Kur'ân-ı Kerîm · Dinleme · Hıfz · Görsel ve İzleme ·
     Kitap Okuma · Arama ve Lügat · Ayarlar.
   • Her konu bir kart: simge + başlık + kısa özet; dokununca ayrıntı açılır.
     "Nerede" satırı o özelliğin bulunduğu yolu gösterir (ör. Ayarlar → Görünüm).

   DİL: Açıklamalar edilgen / "-ebilirsiniz" kalıbında; emir kipi yok.
   İÇERİK EKLEMEK: aşağıdaki KONULAR dizisine bir nesne eklemek yeterli.
   ═══════════════════════════════════════════════════════════════════════════ */

import { useMemo, useState } from "react"
import {
  BookOpen, Search, Pencil, FolderPlus, EyeOff, Sparkles, Menu, Bookmark, Repeat,
  Gem, Feather, Play, Circle, Palette, Settings, Layers, Undo2, Headphones, Volume2,
  MessageSquareText, Brain, ImagePlay, MonitorPlay, List, Eye, Highlighter, Type, Shuffle,
  History, HardDrive, Smartphone, Hash, ChevronDown, X, MousePointerClick, Library, Star,
  RotateCcw, Info, LayoutGrid,
} from "lucide-react"
import AltSayfa from "./AltSayfa"
import { useMediaQuery } from "../data/hooks/useMediaQuery"
import { normHarf } from "../data/okumaKayit"

const BOLUMLER = [
  { id: "tumu",    ad: "Tümü" },
  { id: "kitaplik", ad: "Kitaplık" },
  { id: "kuran",   ad: "Kur'ân-ı Kerîm" },
  { id: "dinleme", ad: "Dinleme" },
  { id: "hifz",    ad: "Hıfz" },
  { id: "gorsel",  ad: "Görsel ve İzleme" },
  { id: "kitap",   ad: "Kitap Okuma" },
  { id: "arama",   ad: "Arama ve Lügat" },
  { id: "ayarlar", ad: "Ayarlar" },
]

// metin: paragraflar dizisi · nerede: bulunduğu yol · anahtar: aramada yakalansın diye ek kelimeler
const KONULAR = [
  // ── KİTAPLIK ───────────────────────────────────────────────────────────
  {
    bolum: "kitaplik", ikon: Library, baslik: "Raflar, âlimler ve eserler",
    ozet: "Kitaplıkta gezinmenin temeli.",
    metin: [
      "Her raf bir ilim dalını temsil eder. Rafa dokunulduğunda altında bir çekmece açılır ve o dalın âlimleri listelenir; âlimin adına dokunulunca eserleri görünür, bir esere dokunulduğunda okuma ekranı açılır.",
      "Rafın içindeki dikey kitaplar raftaki eserleri, yatay kitaplar ise âlimleri temsil eder. Bir dikey kitaba dokunarak doğrudan o esere, bir yatay cilde dokunarak da o âlimin bölümüne geçilebilir.",
    ],
    anahtar: "raf çekmece alim âlim eser kitap aç kategori kısım",
  },
  {
    bolum: "kitaplik", ikon: Search, baslik: "Kitaplıkta arama",
    ozet: "Bütün kitaplıkta, bir rafta ya da bir âlimin eserlerinde arama.",
    nerede: "Kitaplık → başlığın yanındaki büyüteç",
    metin: [
      "Başlığın yanındaki büyüteç bütün kitaplıkta eser ve âlim adlarında arama yapar; sonuca dokunulduğunda ilgili esere ya da âlime gidilir.",
      "Açık bir rafın levhasındaki büyüteç yalnız o rafta, âlim satırındaki büyüteç ise yalnız o âlimin eserleri arasında arar.",
      "Gizlenmiş raflar da aramaya katılsın istenirse arama kutusundaki göz simgesi kullanılabilir.",
    ],
    anahtar: "bul ara kitap âlim isim",
  },
  {
    bolum: "kitaplik", ikon: Pencil, baslik: "Düzenleme ve sıralama",
    ozet: "Rafları, âlimleri ve eserleri sürükleyerek yeniden dizmek.",
    nerede: "Kitaplık → Düzenle",
    metin: [
      "Düzenle düğmesiyle düzenleme moduna geçilir. Bu modda raflar, âlimler ve eserler sürüklenerek yeniden sıralanabilir; telefonda kısa bir süre basılı tutulduktan sonra sürükleme başlar.",
      "İş bitince Bitti düğmesi düzenlemeyi kapatır. Sıralama cihazınızda saklanır ve bir sonraki açılışta aynen durur.",
    ],
    anahtar: "sürükle taşı sırala sıra yer değiştir",
  },
  {
    bolum: "kitaplik", ikon: FolderPlus, baslik: "Özel raf oluşturma",
    ozet: "Sevdiğiniz eserleri kendi rafınızda toplamak.",
    nerede: "Kitaplık → Düzenle → Raf Ekle",
    metin: [
      "Raf Ekle düğmesiyle önce rafa bir isim verilir, ardından listeden kitaplar seçilir.",
      "Özel rafa alt raflar eklenebilir; isimler kalem simgesiyle değiştirilebilir, kitaplar \"+ Kitap\" düğmesiyle eklenip kırmızı çarpıyla çıkarılabilir. Çöp kutusu simgesi, onay istendikten sonra rafı siler.",
    ],
    anahtar: "favori kendi rafım yeni raf alt raf ekle sil",
  },
  {
    bolum: "kitaplik", ikon: EyeOff, baslik: "Rafları gizleme",
    ozet: "Kullanılmayan rafları görünümden kaldırmak.",
    nerede: "Kitaplık → Düzenle → göz simgesi",
    metin: [
      "Göz simgesi gizleme modunu açar; her rafın levhasında beliren göze dokunularak raf gizlenebilir ya da geri getirilebilir. Gizli raflar bu modda soluk görünür.",
      "Hepsini birden geri getirmek için \"Gizlileri göster\" düğmesi kullanılabilir.",
    ],
    anahtar: "sakla göster gizli raf",
  },
  {
    bolum: "kitaplik", ikon: Star, baslik: "Son ve Sık Okunanlar",
    ozet: "Okudukça kendiliğinden oluşan iki raf.",
    metin: [
      "Okudukça kitaplıkta iki raf belirir: en son açılan eserler ve en sık okunanlar. Bu raflar da diğerleri gibi sıralanabilir ve gizlenebilir.",
    ],
    anahtar: "son okunan sık okunan istatistik",
  },
  {
    bolum: "kitaplik", ikon: Sparkles, baslik: "Dinamik mod (akan kapaklar)",
    ozet: "Eserleri kapaklarıyla, kaydırarak gezmek.",
    nerede: "Ayarlar → Görünüm → Dinamik Mod",
    metin: [
      "Dinamik mod açıldığında rafların içindeki eserler kapaklarıyla, sağa sola kaydırılarak gezilen akan bir görünümde listelenir.",
      "Ortadaki kapağa dokunmak eseri açar; yandaki bir kapağa dokunmak onu ortaya getirir.",
    ],
    anahtar: "coverflow kapak akan görünüm kaydır",
  },
  {
    bolum: "kitaplik", ikon: LayoutGrid, baslik: "Raf görünümü (resimli, çizimli, sade)",
    ozet: "Rafların içinin nasıl görüneceğini seçmek.",
    nerede: "Ayarlar → Görünüm → Raf Görünümü",
    metin: [
      "Resimli görünümde her bölümün rafında o bölüme özel bir resim yer alır; resim, ekran genişliğine göre aynı oranda gösterilir.",
      "Çizimli görünümde raflar resimsizdir; içlerinde eserleri temsil eden dikey kitaplar, âlimleri temsil eden yatay ciltler, kandil ve mumlar bulunur.",
      "Sade görünümde rafların içi gösterilmez, yalnız raf levhaları kalır; liste en kısa hâline gelir.",
    ],
    anahtar: "resim görsel resimsiz sade çizim raf görünüm mod",
  },
  {
    bolum: "kitaplik", ikon: RotateCcw, baslik: "Kitaplığı sıfırlama",
    ozet: "Sıralamayı ve özel rafları başlangıç hâline döndürmek.",
    nerede: "Kitaplık → Düzenle → Sıfırla",
    metin: [
      "Sıfırla düğmesi sıralamayı, gizli ve özel rafları ve okuma istatistiklerini başlangıç hâline döndürür. Yanlışlıkla dokunulmasın diye üç kez onay ister; \"vazgeç\" ile iptal edilebilir.",
    ],
    anahtar: "sıfırla başa dön temizle",
  },

  // ── KUR'ÂN OKUMA ───────────────────────────────────────────────────────
  {
    bolum: "kuran", ikon: Menu, baslik: "Sûre menüsü",
    ozet: "Sûre, cüz ve hizb arasında hızlı geçiş.",
    nerede: "Kur'ân-ı Kerîm → bardaki menü simgesi",
    metin: [
      "Menüde Sûre ve Cüz olarak iki başlık bulunur; bir cüz açıldığında hizbleri de listelenir. Bir sûreye, cüze ya da hizbe dokunulduğunda doğrudan oraya gidilir.",
      "Menünün üstündeki kutuya sûre adı yazılarak arama yapılabilir.",
    ],
    anahtar: "sure cüz hizb fihrist git atla",
  },
  {
    bolum: "kuran", ikon: Hash, baslik: "Sayfa bilgisi ve sayfaya gitme",
    ozet: "Bulunulan sayfayı görmek, istenen sayfaya geçmek.",
    nerede: "Kur'ân-ı Kerîm → bardaki kitap simgesi",
    metin: [
      "Kitap simgesi bulunulan sayfayı gösterir; dokunulduğunda açılan kutuya sayfa numarası yazılarak istenen sayfaya geçilebilir.",
    ],
    anahtar: "sayfa numara git mushaf sayfası",
  },
  {
    bolum: "kuran", ikon: MousePointerClick, baslik: "Kelime ve âyete dokunma",
    ozet: "Kelime anlamı, âyet meali ve dinleme.",
    metin: [
      "Arapça bir kelimeye dokunulduğunda kelimenin anlamı ve okunuşu küçük bir pencerede görünür; kelime buradan tek başına dinlenebilir.",
      "Âyet numarasına dokunulduğunda âyetin meali ve dinleme düğmeleri açılır: âyet tek başına ya da o âyetten itibaren sûre dinlenebilir.",
    ],
    anahtar: "kelime anlam meal çeviri tercüme dinle ses âyet numarası",
  },
  {
    bolum: "kuran", ikon: Bookmark, baslik: "Kayıtlar (ayraç)",
    ozet: "Kaldığınız satırı işaretlemek ve oraya dönmek.",
    nerede: "Kur'ân-ı Kerîm → bardaki ayraç simgesi",
    metin: [
      "Yeni kayıt eklenirken ekranda bir satıra dokunmanız istenir; o satır kaydedilir.",
      "Kayıtlar yeniden adlandırılabilir ya da silinebilir. Bir kayda dokunulduğunda tam o satıra gidilir.",
    ],
    anahtar: "işaret ayraç kaldığım yer kayıt",
  },
  {
    bolum: "kuran", ikon: Repeat, baslik: "Tekrar (döngü)",
    ozet: "Bir âyeti, aralığı, sayfayı ya da sûreyi tekrar tekrar dinlemek.",
    nerede: "Kur'ân-ı Kerîm → bardaki döngü simgesi",
    metin: [
      "Döngü simgesiyle bir âyet, bir âyet aralığı, bir sayfa ya da bir sûre istenen sayıda tekrar dinlenebilir. Ezber ve dinleme çalışmalarında kolaylık sağlar.",
    ],
    anahtar: "tekrar döngü loop ezber dinle",
  },
  {
    bolum: "kuran", ikon: Gem, baslik: "İşaretler ve tecvid bilgisi",
    ozet: "Vakıf ve tecvid işaretlerinin anlamları.",
    nerede: "Kur'ân-ı Kerîm → bardaki mücevher simgesi",
    metin: [
      "Mücevher simgesi, mushaftaki vakıf (durak) ve tecvid işaretlerinin ne anlama geldiğini anlatan bilgi panelini açar.",
    ],
    anahtar: "vakıf durak tecvid işaret lazım caiz",
  },
  {
    bolum: "kuran", ikon: Feather, baslik: "Yazı tercihleri",
    ozet: "Yazı tipi, boyutu ve renkleri.",
    nerede: "Kur'ân-ı Kerîm → bardaki kuş tüyü simgesi",
    metin: [
      "Arapça yazı tipi, yazı boyutu ve satır aralığının yanı sıra yazı ve âyet numarası renkleri buradan ayarlanabilir. Değişiklikler önizlemede hemen görünür.",
    ],
    anahtar: "font yazı tipi boyut büyüt küçült renk satır aralığı",
  },
  {
    bolum: "kuran", ikon: Play, baslik: "Otomatik kaydırma",
    ozet: "Sayfanın kendiliğinden ilerlemesi.",
    nerede: "Kur'ân-ı Kerîm → bardaki oynat simgesi",
    metin: [
      "Oynat simgesi sayfayı kendiliğinden kaydırır; tekrar dokunulduğunda durur. Kaydırma hızı ayarlardan değiştirilebilir.",
    ],
    anahtar: "kaydır otomatik akış hız",
  },
  {
    bolum: "kuran", ikon: Circle, baslik: "Sade mod",
    ozet: "Barı sadeleştirip yalnız metne odaklanmak.",
    nerede: "Kur'ân-ı Kerîm → bardaki daire simgesi",
    metin: [
      "Daire simgesi barı sadeleştirir. Sade modda hangi öğelerin gizleneceği Ayarlar → Sade Mod İçerikleri bölümünden seçilebilir.",
    ],
    anahtar: "sade odak gizle bar",
  },
  {
    bolum: "kuran", ikon: Palette, baslik: "Okurken tema değiştirme",
    ozet: "Ekrandan çıkmadan renkleri değiştirmek.",
    nerede: "Kur'ân-ı Kerîm ve kitaplar → bardaki palet simgesi",
    metin: [
      "Palet simgesi okuma ekranından çıkmadan temayı değiştirmeye yarar; panel seçimden sonra açık kalır, böylece temalar arasında rahatça karşılaştırma yapılabilir.",
    ],
    anahtar: "tema renk gece gündüz karanlık",
  },
  {
    bolum: "kuran", ikon: Settings, baslik: "Barın ayarları",
    ozet: "Konum, gizlenme, boyut ve hangi öğelerin görüneceği.",
    nerede: "Kur'ân-ı Kerîm → bardaki dişli simgesi",
    metin: [
      "Barın üstte mi altta mı duracağı, kaydırırken kendiliğinden gizlenip gizlenmeyeceği ve arayüz boyutu buradan seçilebilir.",
      "Görüntüleme bölümünde bardaki öğeler tek tek açılıp kapatılabilir. \"Bardaki görünüm tipi\" ile öğelerin sırası ve sağa ya da sola yaslanması da düzenlenebilir.",
    ],
    anahtar: "bar üst alt gizle boyut sırala görünüm ayar",
  },
  {
    bolum: "kuran", ikon: Layers, baslik: "Bardaki bilgiler",
    ozet: "Okuma süresi, sûre ve cüz/hizb bilgisi.",
    nerede: "Kur'ân-ı Kerîm → barın sağ tarafı",
    metin: [
      "Barın sağında bugünkü okuma süresi, bulunulan sûre ve cüz/hizb bilgisi yer alır. Her biri Ayarlar → Görüntüleme bölümünden açılıp kapatılabilir.",
    ],
    anahtar: "süre zaman sure cüz hizb bilgi",
  },
  {
    bolum: "kuran", ikon: Undo2, baslik: "Dönüş noktaları",
    ozet: "Atlamadan önceki yere geri dönmek.",
    nerede: "Ayarlar → Gezinme → Dönüş noktaları",
    metin: [
      "Sûre menüsü, arama, sayfaya gitme ya da bir kayıtla başka bir yere geçildiğinde ekranda küçük bir \"Geri dön\" düğmesi belirir; dokunulduğunda önceki yere dönülür. Birden fazla nokta varsa yanındaki sayıyla liste açılır.",
      "Düğme sürüklenerek istenen yere taşınabilir; yerler \"Düğme konumlarını sıfırla\" ile eski hâline getirilebilir.",
    ],
    anahtar: "geri dön önceki yer köprü aramaya dön",
  },

  // ── DİNLEME ────────────────────────────────────────────────────────────
  {
    bolum: "dinleme", ikon: Headphones, baslik: "Oynatıcı",
    ozet: "Okunan âyeti takip etmek, durdurmak, ilerlemek.",
    metin: [
      "Bir âyet dinlenmeye başlandığında alt kısımda oynatıcı açılır. Önceki ve sonraki âyet, duraklatma ve durdurma düğmeleri buradadır.",
      "\"Okunan âyete odaklan\" düğmesi, sayfa başka bir yere kaydırılmış olsa bile ekranı çalan âyete getirir.",
    ],
    anahtar: "ses dinle oynat durdur sonraki önceki",
  },
  {
    bolum: "dinleme", ikon: Volume2, baslik: "Kârî, ses ve hız",
    ozet: "Okuyucuyu seçmek, sesi ve okuma hızını ayarlamak.",
    nerede: "Kârî: Kur'ân-ı Kerîm → Ayarlar · Ses ve hız: oynatıcı",
    metin: [
      "Kârî (okuyucu) seçimi Kur'ân ekranının ayarlarında yer alır.",
      "Ses seviyesi ve okuma hızı oynatıcının ayar kısmından değiştirilebilir; yanlarındaki küçük düğmeler değerleri tek dokunuşla varsayılana döndürür.",
    ],
    anahtar: "kari hafız okuyucu ses yüksek hız yavaş hızlı",
  },
  {
    bolum: "dinleme", ikon: MonitorPlay, baslik: "Devamlı oynatma ve mini oynatıcı",
    ozet: "Ekrandan çıkınca da dinlemeye devam etmek.",
    nerede: "Oynatıcı → ayarlar → Devamlı oynatma",
    metin: [
      "Devamlı oynatma açıkken Kur'ân ekranından çıkılsa da okuma sürer ve diğer ekranlarda küçük bir oynatıcı görünür.",
      "Mini oynatıcı sürüklenerek taşınabilir; bir süre dokunulmazsa tek yuvarlak düğmeye küçülür. Kitap simgesi, okunan âyete geri götürür.",
      "Telefon kilitliyken ya da uygulama arka plandayken oynatma, kilit ekranındaki kontrollerle de yönetilebilir.",
    ],
    anahtar: "arka plan kilit ekranı devam mini küçük oynatıcı",
  },
  {
    bolum: "dinleme", ikon: MessageSquareText, baslik: "Meal penceresi",
    ozet: "Çalan âyetin mealini ayrı pencerede okumak.",
    nerede: "Oynatıcı → meal düğmesi",
    metin: [
      "Meal düğmesi, çalan âyetin mealini ayrı bir pencerede gösterir; âyet değiştikçe meal de kendiliğinden güncellenir. Pencerenin boyutu ayarlardan değiştirilebilir.",
    ],
    anahtar: "meal çeviri tercüme türkçe",
  },

  // ── HIFZ ───────────────────────────────────────────────────────────────
  {
    bolum: "hifz", ikon: Brain, baslik: "Hıfz modu (mushafta çalışma)",
    ozet: "Sayfayı perdeleyerek ezberden okumak.",
    nerede: "Kur'ân-ı Kerîm → bardaki beyin simgesi",
    metin: [
      "Beyin simgesiyle sayfa perdelenir; kelimeler gizlenir ve ezberden okumaya çalışılır. Perdeli bir kelimeye dokunulduğunda açılır; dilenirse kelimenin okunması da sağlanabilir (Hıfz panelindeki \"dokununca\" ayarları).",
      "Çalışmanın sonunda âyetler Kolay, Orta ya da Zor olarak değerlendirilir; tekrar zamanları bu değerlendirmeye göre belirlenir.",
    ],
    anahtar: "ezber hafız perde gizle ipucu",
  },
  {
    bolum: "hifz", ikon: Brain, baslik: "Hıfz ekranı (plan ve tekrarlar)",
    ozet: "Bugün tekrarı gelenler, ilerleme ve zor âyetler.",
    nerede: "Ana menü → Hıfz",
    metin: [
      "Hıfz sayfası çalışma planını gösterir: bugün tekrarı gelen âyetler, ilerleme haritası ve zorlanılan âyetler.",
      "Bir tekrar, ezberden okunup doğrudan değerlendirilerek ya da \"Mushafta aç\" ile perdeli çalışılarak tamamlanabilir. Hatırlatma ve yedekleme seçenekleri de bu sayfadadır.",
    ],
    anahtar: "ezber plan tekrar hatırlatma takvim ilerleme",
  },

  // ── GÖRSEL VE İZLEME ───────────────────────────────────────────────────
  {
    bolum: "gorsel", ikon: ImagePlay, baslik: "Görsel ve video oluşturma",
    ozet: "Âyeti paylaşılabilir bir görsele ya da kısa videoya dönüştürmek.",
    nerede: "Kur'ân-ı Kerîm → bardaki görsel simgesi",
    metin: [
      "Görsel simgesine dokunulduktan sonra âyet numarası seçilir; âyetin yazısı, meali ve kaynağıyla bir görsel ya da kısa video hazırlanır.",
      "Arka plan, renkler, hareket ve hava efektleri panelden değiştirilebilir; vakıf işaretleri ayrı bir renkle gösterilebilir.",
    ],
    anahtar: "resim görsel video paylaş indir instagram",
  },
  {
    bolum: "gorsel", ikon: MonitorPlay, baslik: "İzleme modu",
    ozet: "Tam ekranda, resimler eşliğinde dinlemek.",
    nerede: "Oynatıcı → izleme düğmesi",
    metin: [
      "İzleme modu tam ekran bir okuma sahnesi açar: âyet okundukça yazısı ve meali değişir, arkada seçilen resim ya da resimler (slayt) hareketli efektlerle akar.",
      "Yazı rengi, kar ve yağmur gibi efektler, ışıklar ve galeriden eklenen kendi resimleriniz ayarlardan seçilebilir.",
    ],
    anahtar: "tam ekran slayt arka plan efekt kar yağmur galeri",
  },

  // ── KİTAP OKUMA ────────────────────────────────────────────────────────
  {
    bolum: "kitap", ikon: List, baslik: "İçindekiler ve kısım bilgisi",
    ozet: "Eserin bölümleri arasında gezinmek.",
    nerede: "Kitap → bardaki liste simgesi",
    metin: [
      "Liste simgesi eserin başlık ağacını açar; bir başlığa dokunulduğunda o bölüme gidilir.",
      "Barın sağındaki kısım bilgisi bulunulan bölümü gösterir; dokunulduğunda bölümün açıklaması görünür.",
    ],
    anahtar: "içindekiler bölüm başlık fihrist kısım",
  },
  {
    bolum: "kitap", ikon: Eye, baslik: "Lügat (kelime anlamları)",
    ozet: "Metindeki kelimelerin anlamını görmek.",
    nerede: "Kitap → bardaki göz simgesi",
    metin: [
      "Göz simgesi lügati açıp kapatır. Açıkken anlamı bilinen kelimeler renkli görünür; dokunulduğunda anlamı ve varsa kavram açıklaması açılır.",
    ],
    anahtar: "lügat sözlük anlam kelime kavram osmanlıca",
  },
  {
    bolum: "kitap", ikon: Info, baslik: "Dipnotlar ve açıklamalar",
    ozet: "Dipnotları sayfanın sonuna inmeden okumak.",
    metin: [
      "Metindeki [n] işaretlerine ya da Arapça satırlara dokunulduğunda ilgili dipnot küçük bir pencerede görünür. Başlıkların yanındaki kuş tüyü simgesi bölümün açıklamasını gösterir.",
    ],
    anahtar: "dipnot haşiye açıklama not",
  },
  {
    bolum: "kitap", ikon: Highlighter, baslik: "Vurgulama",
    ozet: "Önemli satırları renklendirmek.",
    nerede: "Kitap → bardaki fosforlu kalem simgesi",
    metin: [
      "Fosforlu kalem simgesiyle vurgulama moduna geçilir ve seçilen yerler renklendirilir. Vurgular panelde listelenir; tek tek ya da toplu olarak silinebilir.",
    ],
    anahtar: "vurgu renklendir altını çiz highlight",
  },
  {
    bolum: "kitap", ikon: Bookmark, baslik: "Kayıtlar ve notlar",
    ozet: "Metinde bir yeri işaretlemek, not almak.",
    nerede: "Kitap → bardaki ayraç simgesi",
    metin: [
      "\"Yeni işaret ekle\" seçildikten sonra metinde bir yere dokunularak o konum kaydedilir. Kayda dokunulduğunda tam o satıra gidilir; notlar da aynı panelde tutulur.",
    ],
    anahtar: "işaret ayraç not kaldığım yer",
  },
  {
    bolum: "kitap", ikon: Search, baslik: "Eser içinde arama",
    ozet: "Kitabın içinde bir kelimeyi bulmak.",
    nerede: "Kitap → bardaki büyüteç",
    metin: [
      "Büyüteç simgesi eserin içinde arama yapar; sonuçlar çevresindeki cümleyle birlikte listelenir ve birine dokunulduğunda o yere gidilir.",
    ],
    anahtar: "bul ara kelime metin içi",
  },
  {
    bolum: "kitap", ikon: Type, baslik: "Yazı ve okuma ayarları",
    ozet: "Yazı tipi, boyut ve aralıklar.",
    nerede: "Kitap → Ayarlar (dişli)",
    metin: [
      "Yazı tipi, boyutu, satır, harf ve kelime aralıkları ile bar konumu, arayüz ve bilgi penceresi boyutu ayarlardan değiştirilebilir. Görüntüle bölümünden bardaki öğeler gizlenebilir; sade modda gizlenecekler de ayrıca seçilebilir.",
    ],
    anahtar: "font yazı boyut aralık satır harf kelime bar",
  },

  // ── ARAMA VE LÜGAT ─────────────────────────────────────────────────────
  {
    bolum: "arama", ikon: Search, baslik: "Arama sayfası",
    ozet: "Bütün eserlerde ve Kur'ân'da kelime aramak.",
    nerede: "Ana menü → Arama",
    metin: [
      "Arama sayfası eserlerin ve Kur'ân'ın içinde kelime aramaya imkân verir. Kapsam seçiciyle aramanın hangi kitaplarda yapılacağı belirlenebilir.",
      "Bir sonuca dokunulduğunda o yere gidilir; okuma ekranında beliren \"Aramaya dön\" düğmesiyle sonuçlara geri dönülebilir.",
    ],
    anahtar: "ara bul kelime kapsam sonuç",
  },
  {
    bolum: "arama", ikon: Type, baslik: "Lügat sayfası",
    ozet: "Kelime anlamlarını doğrudan aramak.",
    nerede: "Ana menü → Lügat",
    metin: [
      "Lügat sayfasında Osmanlıca ve Arapça kelimelerin anlamları aranabilir.",
    ],
    anahtar: "sözlük anlam osmanlıca arapça kelime",
  },
  {
    bolum: "arama", ikon: Shuffle, baslik: "Söz ve Okuma Tefeülü",
    ozet: "Rastgele bir söz ya da okuma bölümü.",
    nerede: "Ana menü → Söz Tefeülü / Okuma Tefeülü",
    metin: [
      "Söz Tefeülü rastgele bir söz, Okuma Tefeülü ise rastgele bir okuma bölümü sunar; oradan esere geçildiğinde \"Tefeüle dön\" düğmesiyle geri gelinebilir.",
    ],
    anahtar: "tefeül rastgele fal söz okuma",
  },
  {
    bolum: "arama", ikon: History, baslik: "Geçmiş",
    ozet: "Aramaların ve okumaların kaydı.",
    nerede: "Ayarlar → Geçmiş → Geçmişi tut",
    metin: [
      "Geçmiş açıkken aramalarınız ve okuduğunuz yerler tarih ve süreleriyle kaydedilir; ana menüde Geçmiş sayfası görünür ve bir kayda dokunulduğunda oraya dönülür.",
      "Kayıtlar yalnız bu cihazda tutulur. Geçmiş kapatıldığında kayıtlar silinir; bundan önce onay istenir.",
    ],
    anahtar: "geçmiş kayıt son arama okuma süre",
  },

  // ── AYARLAR ────────────────────────────────────────────────────────────
  {
    bolum: "ayarlar", ikon: Palette, baslik: "Tema",
    ozet: "Açık, koyu ve özel temalar.",
    nerede: "Ayarlar → Tema",
    metin: [
      "Açık ve koyu temalar arasından seçim yapılabilir; \"otomatik\" seçildiğinde cihazın gece/gündüz ayarına uyulur.",
      "Kendi renklerinizle bir özel tema da oluşturulabilir; önizlemede renklerin nasıl görüneceği hemen izlenebilir.",
    ],
    anahtar: "tema renk karanlık gece açık koyu özel",
  },
  {
    bolum: "ayarlar", ikon: HardDrive, baslik: "Yedek, geri yükleme ve sıfırlama",
    ozet: "Kayıtları korumak ya da başka cihaza taşımak.",
    nerede: "Ayarlar → Veriler",
    metin: [
      "Kayıtlar, vurgular, notlar ve ayarlar bir yedek dosyası olarak indirilebilir; bu dosya başka bir cihazda geri yüklenebilir.",
      "Sıfırlama bölümü verileri temizler. Önce yedek alınması hatırlatılır, yedek alınmadıysa ayrıca uyarılır.",
    ],
    anahtar: "yedek yedekle indir geri yükle taşı sıfırla sil veri depolama",
  },
  {
    bolum: "ayarlar", ikon: Sparkles, baslik: "Giriş animasyonu",
    ozet: "Açılıştaki tezhipli giriş ekranı.",
    nerede: "Ayarlar → Görünüm → Giriş Animasyonu",
    metin: [
      "Uygulama açılırken görünen tezhipli giriş ekranı bu ayarla açılıp kapatılabilir; değişiklik bir sonraki açılışta geçerli olur.",
    ],
    anahtar: "açılış giriş animasyon splash",
  },
  {
    bolum: "ayarlar", ikon: Smartphone, baslik: "Uygulama olarak kurma ve çevrimdışı kullanım",
    ozet: "Ana ekrana eklemek, internetsiz okumak.",
    metin: [
      "Vukuf, tarayıcının \"Ana ekrana ekle\" seçeneğiyle telefona uygulama gibi kurulabilir.",
      "Bir kez açılan bölümler internet olmadan da çalışır. Yeni bir sürüm hazır olduğunda ekranda kısa bir bilgi gösterilir.",
    ],
    anahtar: "pwa uygulama kur ana ekran çevrimdışı internetsiz offline güncelleme",
  },
]

function KonuKarti({ konu, acik, onAc, theme, bolumAdi }) {
  const Ikon = konu.ikon || BookOpen
  return (
    <div style={{
      border: `1px solid ${acik ? theme.accent + "66" : theme.border}`,
      borderRadius: "14px", background: acik ? `${theme.accent}0d` : theme.background,
      overflow: "hidden", transition: "border-color 0.2s, background 0.2s",
    }}>
      <button
        onClick={onAc}
        aria-expanded={acik}
        style={{
          width: "100%", display: "flex", alignItems: "center", gap: "12px", padding: "12px 14px",
          background: "none", border: "none", cursor: "pointer", textAlign: "left", color: theme.text,
        }}
      >
        <span style={{
          width: "36px", height: "36px", borderRadius: "10px", flexShrink: 0,
          display: "flex", alignItems: "center", justifyContent: "center",
          background: `${theme.accent}18`, color: theme.accent,
        }}>
          <Ikon size={18} />
        </span>
        <span style={{ flex: 1, minWidth: 0 }}>
          <span style={{ display: "block", fontSize: "15px", fontWeight: 600, lineHeight: 1.3 }}>{konu.baslik}</span>
          <span style={{ display: "block", fontSize: "12.5px", color: theme.textSecondary, marginTop: "2px", lineHeight: 1.35 }}>
            {bolumAdi ? <span style={{ color: theme.accent }}>{bolumAdi} · </span> : null}{konu.ozet}
          </span>
        </span>
        <ChevronDown size={17} color={theme.textSecondary} style={{ flexShrink: 0, transform: acik ? "rotate(180deg)" : "none", transition: "transform 0.25s" }} />
      </button>
      {acik && (
        <div style={{ padding: "0 14px 14px 62px" }}>
          {konu.nerede && (
            <div style={{
              display: "inline-flex", alignItems: "center", gap: "6px", fontSize: "12px",
              color: theme.accent, background: `${theme.accent}14`, border: `1px solid ${theme.accent}33`,
              borderRadius: "999px", padding: "3px 10px", marginBottom: "10px",
            }}>
              <span style={{ opacity: 0.8 }}>Nerede:</span> {konu.nerede}
            </div>
          )}
          {konu.metin.map((p, i) => (
            <p key={i} style={{ margin: i ? "8px 0 0" : 0, fontSize: "14px", lineHeight: 1.6, color: theme.text }}>{p}</p>
          ))}
        </div>
      )}
    </div>
  )
}

export default function YardimPaneli({ kapat, theme }) {
  const isMobile = useMediaQuery("(max-width: 768px)")
  const [arama, setArama] = useState("")
  const [bolum, setBolum] = useState("tumu")
  const [acikKonu, setAcikKonu] = useState(null)

  const q = normHarf(arama.trim())
  const liste = useMemo(() => {
    if (q) {
      const kelimeler = q.split(/\s+/).filter(Boolean)
      return KONULAR.filter(k => {
        const metin = normHarf([k.baslik, k.ozet, k.nerede || "", k.anahtar || "", ...k.metin].join(" "))
        return kelimeler.every(w => metin.includes(w))
      })
    }
    return bolum === "tumu" ? KONULAR : KONULAR.filter(k => k.bolum === bolum)
  }, [q, bolum])

  const bolumAdi = (id) => BOLUMLER.find(b => b.id === id)?.ad || ""
  // Tümü'nde ve aramada bölümler başlıklarla ayrılır
  const gruplu = !q && bolum === "tumu"

  return (
    <AltSayfa kapat={kapat} theme={theme} baslik="YARDIM" maxYukseklik="88vh" maxGenislik={isMobile ? "520px" : "760px"}>
      <p style={{ margin: "0 2px 12px", fontSize: "13.5px", lineHeight: 1.55, color: theme.textSecondary }}>
        Vukuf'un bölümlerinin ve bardaki düğmelerin nasıl kullanıldığı burada anlatılıyor. Aradığınız konunun adını ya da bir kelimesini yazarak hızlıca bulabilirsiniz.
      </p>

      {/* Arama */}
      <div style={{
        display: "flex", alignItems: "center", gap: "10px", padding: "10px 14px", marginBottom: "12px",
        background: theme.background, border: `1px solid ${theme.accent}40`, borderRadius: "24px",
      }}>
        <Search size={16} color={theme.accent} />
        <input
          value={arama}
          onChange={e => { setArama(e.target.value); setAcikKonu(null) }}
          placeholder="Örn. ayraç, meal, yedek, kârî…"
          aria-label="Yardımda ara"
          style={{ flex: 1, minWidth: 0, background: "transparent", border: "none", outline: "none", fontSize: "16px", color: theme.text }}
        />
        {arama && (
          <button onClick={() => setArama("")} aria-label="Aramayı temizle" style={{ display: "flex", background: "none", border: "none", color: theme.textSecondary, cursor: "pointer", padding: "2px" }}>
            <X size={15} />
          </button>
        )}
      </div>

      {/* Bölüm çipleri (aramada gizli) */}
      {!q && (
        <div style={{ display: "flex", flexWrap: isMobile ? "nowrap" : "wrap", gap: "6px", overflowX: isMobile ? "auto" : "visible", paddingBottom: "4px", marginBottom: "10px", WebkitOverflowScrolling: "touch" }}>
          {BOLUMLER.map(b => {
            const secili = bolum === b.id
            return (
              <button
                key={b.id}
                onClick={() => { setBolum(b.id); setAcikKonu(null) }}
                style={{
                  flexShrink: 0, padding: "6px 12px", borderRadius: "999px", fontSize: "13px", cursor: "pointer",
                  border: `1px solid ${secili ? theme.accent : theme.border}`,
                  background: secili ? theme.accent : "transparent",
                  color: secili ? "#fff" : theme.text, whiteSpace: "nowrap",
                }}
              >
                {b.ad}
              </button>
            )
          })}
        </div>
      )}

      {q && (
        <div style={{ fontSize: "12px", color: theme.textSecondary, margin: "0 4px 8px" }}>
          {liste.length ? `${liste.length} konu bulundu` : ""}
        </div>
      )}

      {liste.length === 0 ? (
        <div style={{ textAlign: "center", padding: "28px 12px", color: theme.textSecondary, fontSize: "14px", lineHeight: 1.6 }}>
          Bu kelimeyle eşleşen bir konu bulunamadı.<br />Farklı bir kelimeyle aramak sonuç verebilir.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {liste.map((k, i) => {
            const anahtar = `${k.bolum}-${k.baslik}`
            const baslikGoster = gruplu && (i === 0 || liste[i - 1].bolum !== k.bolum)
            return (
              <div key={anahtar}>
                {baslikGoster && (
                  <div style={{ fontSize: "11px", letterSpacing: "1.5px", color: theme.textSecondary, margin: i ? "14px 4px 8px" : "2px 4px 8px" }}>
                    {/* CSS uppercase Türkçe bilmez (Kitaplık → KITAPLIK); tr-TR ile çevriliyor */}
                    {bolumAdi(k.bolum).toLocaleUpperCase("tr-TR")}
                  </div>
                )}
                <KonuKarti
                  konu={k}
                  theme={theme}
                  acik={acikKonu === anahtar}
                  onAc={() => setAcikKonu(a => (a === anahtar ? null : anahtar))}
                  bolumAdi={q ? bolumAdi(k.bolum) : null}
                />
              </div>
            )
          })}
        </div>
      )}

      <div style={{ height: "10px" }} />
    </AltSayfa>
  )
}
