export const kategoriler = [
  {
    id: "orijinal-eserler",
    baslik: "Kur'an-ı Kerim",
    kuran: {
      id: "kuran",
      baslik: "Kur'ân-ı Kerîm",
      aciklama: "Yüce Allah ﷻ'ın, efendimiz Hz. Muhammed Mustafa ﷺ'e vahyettiği, tüm zamanların en büyük mucizesi",
      dosya: "kuran.json",
      gorsel: "/kitap-kapak/kuran-icon.png",
    },
    alimler: [],
  },
  
  {
    id: "evrad-ezkar",
    baslik: "Evrad ve Ezkar",
    // ── Evrad ve Ezkar (Arapça) ────────────────────────────────────────────────
    //   NOT: Bu kitapların JSON'ları (dosya alanı) henüz üretilmedi; Arapça örnek
    //   ile çıkarıcı doğrulanıp kitap-metin/'e konulana kadar okuma açıldığında
    //   boş/hatalı gelebilir. İsimler kütüphanede görünsün diye şimdiden eklendi.
    alimler: [
      {
        id: "evrad-ezkar-liste",
        isim: "Evrad ve Ezkâr",
        kitaplar: [
          { id: "d_meallihizbulhakaik", baslik: "Meaili Büyük Cevşen",     yazar: "", dosya: "d_meallihizbulhakaik-metin.json", gorsel: "/kitap-kapak/d_meallihizbulhakaik.png", aciklama: "Büyük Cevşen'in meâlli neşri." },
          { id: "cevsen",               baslik: "Cevşen",                  yazar: "", dosya: "cevsen-metin.json",               gorsel: "/kitap-kapak/cevsen.png",               aciklama: "Cevşenü'l-Kebîr münâcâtı." },
          { id: "hizbulhakaik",         baslik: "Hizb'ul Hakaik",          yazar: "", dosya: "hizbulhakaik-metin.json",         gorsel: "/kitap-kapak/hizbulhakaik.png",         aciklama: "Risale-i Nur'dan derlenen hizb ve münâcâtlar." },
          { id: "tesbihat",             baslik: "Tesbihat",                yazar: "", dosya: "tesbihat-metin.json",             gorsel: "/kitap-kapak/tesbihat.png",             aciklama: "Namaz sonrası tesbihat ve virdler." },
          { id: "hizbkuran",            baslik: "Hizb-ül Kur'an",          yazar: "", dosya: "hizbkuran-metin.json",            gorsel: "/kitap-kapak/hizbkuran.png",            aciklama: "Kur'ân-ı Kerîm'den seçme âyetlerden oluşan hizb." },
          { id: "hizbkuranmeal",        baslik: "Hizb-ül Kur'an (Mealli)", yazar: "", dosya: "hizbkuranmeal-metin.json",        gorsel: "/kitap-kapak/hizbkuranmeal.png",        aciklama: "Hizb-ül Kur'an'ın meâlli neşri." },
          { id: "cevsenmeal",           baslik: "Mealli Cevşen",           yazar: "", dosya: "cevsenmeal-metin.json",           gorsel: "/kitap-kapak/cevsenmeal.png",           aciklama: "Cevşen'in Türkçe meâliyle birlikte neşri." },
          { id: "celcelutiye",          baslik: "Celcelutiye",             yazar: "", dosya: "celcelutiye-metin.json",          gorsel: "/kitap-kapak/celcelutiye.png",          aciklama: "Hz. Ali'ye (ra) nisbet edilen meşhur kaside-dua." },
          { id: "kenzulars",            baslik: "Kenz-ül Arş duası",       yazar: "", dosya: "kenzulars-metin.json",            gorsel: "/kitap-kapak/kenzulars.png",            aciklama: "Kenzü'l-Arş duası." },
        ],
      },
    ],
  },
  {
    id: "muhtelif-eserler",
    baslik: "Muhtelif Eserler",
    // ── Muhtelif Eserler (Türkçe) — iki raf ────────────────────────────────────
    alimler: [
      {
        id: "muhtelif-eserler-genel",
        isim: "Muhtelif Eserler",
        kitaplar: [
          { id: "pey_hayati", baslik: "Peygamberimizin Hayatı", yazar: "",                   dosya: "pey_hayati-metin.json", gorsel: "/kitap-kapak/pey_hayati.png", aciklama: "Peygamber Efendimizin (asm) hayatını anlatan siyer eseri." },
          { id: "bilmen",     baslik: "Büyük İslam İlmihali",   yazar: "Ömer Nasuhi Bilmen", dosya: "bilmen-metin.json",     gorsel: "/kitap-kapak/bilmen.png",     aciklama: "Ömer Nasuhi Bilmen'in kaleme aldığı kapsamlı ilmihal." },
          { id: "safii",      baslik: "Büyük Şafiî İlmihali",   yazar: "",                   dosya: "safii-metin.json",      gorsel: "/kitap-kapak/safii.png",      aciklama: "Şâfiî mezhebine göre ibadet esaslarını anlatan ilmihal." },
        ],
      },
      {
        id: "risale-i-nur-muhtelif",
        isim: "Risale-i Nur / Muhtelif Eserler",
        kitaplar: [
          { id: "abed",             baslik: "Âsâr-ı Bediiye",                 yazar: "Bediüzzaman Said Nursî", dosya: "abed-metin.json",             gorsel: "/kitap-kapak/abed.png",             aciklama: "Bediüzzaman'ın Barla öncesi ilk dönem eserlerini bir araya getiren külliyat." },
          { id: "esasat",           baslik: "Esasat-ı Nuriye",                yazar: "Bediüzzaman Said Nursî", dosya: "esasat-metin.json",           gorsel: "/kitap-kapak/esasat.png",           aciklama: "Risale-i Nur'dan iman ve tevhid esaslarına dair seçme bahisler." },
          { id: "ihlas_tilsimlar",  baslik: "Tılsımlar",                      yazar: "Bediüzzaman Said Nursî", dosya: "ihlas_tilsimlar-metin.json",  gorsel: "/kitap-kapak/ihlas_tilsimlar.png",  aciklama: "Risale-i Nur Külliyatı'ndan derlenen Tılsımlar Mecmuası." },
          { id: "ihlas_zulfikar",   baslik: "Zülfikar",                       yazar: "Bediüzzaman Said Nursî", dosya: "ihlas_zulfikar-metin.json",   gorsel: "/kitap-kapak/ihlas_zulfikar.png",   aciklama: "Kur'ân'ın ve Peygamberimizin mu'cizelerine dair Zülfikar Mecmuası." },
          { id: "hizmettoplama",    baslik: "Hizmet Düsturları",              yazar: "",                       dosya: "hizmettoplama-metin.json",    gorsel: "/kitap-kapak/hizmettoplama.png",    aciklama: "Risale-i Nur hizmetine dair düstur ve prensiplerin derlemesi." },
          { id: "envar_fihristris", baslik: "Fihrist Risalesi",               yazar: "Bediüzzaman Said Nursî", dosya: "envar_fihristris-metin.json", gorsel: "/kitap-kapak/envar_fihristris.png", aciklama: "Risale-i Nur'un konularını gösteren Fihrist Risalesi." },
          { id: "env_siracunnur",   baslik: "Siracün-Nur (Envar)",            yazar: "Bediüzzaman Said Nursî", dosya: "env_siracunnur-metin.json",   gorsel: "/kitap-kapak/env_siracunnur.png",   aciklama: "Risale-i Nur'dan seçme risalelerden oluşan Siracün-Nur mecmuası." },
          { id: "d_ktb_muhsadi",    baslik: "Muhâkemât Dersleri",             yazar: "",                       dosya: "d_ktb_muhsadi-metin.json",    gorsel: "/kitap-kapak/d_ktb_muhsadi.png",    aciklama: "Bediüzzaman'ın Muhâkemât eseri üzerine hazırlanan ders notları." },
          { id: "badmuf1",          baslik: "Mufassal Tarihçe 1",             yazar: "Abdülkadir Badıllı",     dosya: "badmuf1-metin.json",          gorsel: "/kitap-kapak/badmuf1.png",          aciklama: "Abdülkadir Badıllı'nın hazırladığı Mufassal Tarihçe-i Hayat'ın birinci cildi." },
          { id: "badmuf2",          baslik: "Mufassal Tarihçe 2",             yazar: "Abdülkadir Badıllı",     dosya: "badmuf2-metin.json",          gorsel: "/kitap-kapak/badmuf2.png",          aciklama: "Mufassal Tarihçe-i Hayat'ın ikinci cildi." },
          { id: "badmuf3",          baslik: "Mufassal Tarihçe 3",             yazar: "Abdülkadir Badıllı",     dosya: "badmuf3-metin.json",          gorsel: "/kitap-kapak/badmuf3.png",          aciklama: "Mufassal Tarihçe-i Hayat'ın üçüncü cildi." },
          { id: "davaadam1",        baslik: "Bir Dava Adamının Notları 1",    yazar: "",                       dosya: "davaadam1-metin.json",        gorsel: "/kitap-kapak/davaadam1.png",        aciklama: "Bir dava adamının hâtıra ve notlarından oluşan derlemenin birinci kısmı." },
          { id: "davaadam2",        baslik: "Bir Dava Adamının Notları 2",    yazar: "",                       dosya: "davaadam2-metin.json",        gorsel: "/kitap-kapak/davaadam2.png",        aciklama: "Bir dava adamının hâtıra ve notlarından oluşan derlemenin ikinci kısmı." },
          { id: "taniyanlar",       baslik: "Tanıyanların Dilinden",          yazar: "",                       dosya: "taniyanlar-metin.json",       gorsel: "/kitap-kapak/taniyanlar.png",       aciklama: "Bediüzzaman'ı yakından tanıyanların hâtıralarından derleme." },
        ],
      },
    ],
  },
  {
    id: "tasavvuf",
    baslik: "Tasavvuf",
    alimler: [
      { id: "imam-rabbani", isim: "İmam Rabbânî", kitaplar: [] },
      { id: "muhyiddin-arabi", isim: "Muhyiddin-i Arabî", kitaplar: [] },
      { id: "abdulkadir-geylani", isim: "Abdülkâdir Geylânî", kitaplar: [
        {
          id:"geylani-futuhulgayb",
          baslik: "Fütuh-ul Gayb",
          aciklama:"Abdülkâdir Geylânî'nin (1077-1166) sohbetlerinden derlenen ve manevi eğitim, nefis terbiyesi ile Allah'a yakınlaşma yollarını anlatan 78 altın öğütten oluşan tasavvuf klasiği",
          dosya:"futuhulgayb-metin.json",
          gorsel:"/kitap-kapak/futuhulgayb.png",
        },
        {
          id:"sırrulesrar",
          baslik: "Sırru'l Esrâr",
          aciklama:"Abdülkâdir Geylânî'nin tasavvufun derin sırlarını, manevi makamları ve Allah'a giden yolda kalbin tasfiyesini anlatan önemli eseri",
          dosya:"sırrulesrar-metin.json",
          gorsel:"/kitap-kapak/sir.png",
        },
      ] },
      {
        id: "imam-gazali",
        isim: "İmam Gazâlî",
        kitaplar: [
          {
            id: "munkiz",
            baslik: "El-Münkiz Mine'd Dalal",
            aciklama: "İmam Gazali'nin (1058-1111) kendi entelektüel ve manevi yolculuğunu anlattığı otobiyografik eseridir.",
            dosya: "munkiz-metin.json",
            gorsel:"/kitap-kapak/munkiz.png",
          },
          {
          id:"kiyametveahiret",
          baslik: "Kıyâmet ve Âhiret",
          aciklama:"Ölüm anı, kabir hayatı, kıyamet sahneleri, cennet ve cehennem tasvirleri gibi ahiretin hallerini ele alır",
          dosya:"kıyametveahiret-metin.json" ,
          gorsel: "/kitap-kapak/kiyametveahiret.png",
          },
          {
          id:"mukasefetulkulub",
          baslik: "Mükâşefetü'l Kulûb",
          aciklama:"İmam Gazâli'nin dilinden kalplerin keşfi",
          dosya:"mukasefetulkulub-metin.json",
          gorsel:"/kitap-kapak/mukasefetulkulub.png",
          },
        ],
      },
      { id: "mevlana", isim: "Mevlânâ Celâleddîn-i Rûmî", kitaplar: [] },
      { id: "yunus-emre", isim: "Yunus Emre", kitaplar: [] },
      { id: "haci-bektas", isim: "Hacı Bektaş-ı Velî", kitaplar: [] },
      { id: "shah-naksbend", isim: "Şâh-ı Nakşibend", kitaplar: [] },
      { id: "ahmed-yesevi", isim: "Ahmed Yesevî", kitaplar: [] },
    ],
  },
  {
    id: "kelam",
    baslik: "Kelam",
    alimler: [
      { id: "imam-azam", isim: "İmam-ı Azam Ebû Hanîfe", kitaplar: [] },
      { id: "imam-maturidi", isim: "İmam Mâtürîdî", kitaplar: [] },
      { id: "imam-esari", isim: "İmam Eş'arî", kitaplar: [] },
      { id: "curcani", isim: "Seyyid Şerif Cürcanî", kitaplar:[] },
      { id: "sehristani", isim: "Şehristânî", kitaplar: [] },
      {
        id: "imam-gazali-kelam",
        isim: "İmam Gazâlî",
        kitaplar: [
          {
            id: "ilcam",
            baslik: "İlcâmü'l-Avâm",
            aciklama: "Kelâm ilminin tehlikesinden halkın muhâfazası.",
            dosya: "ilcam-metin.json",
            gorsel:"/kitap-kapak/avam.png",
          },
        ],
      },
    ],
  },
  {
    id: "fikih",
    baslik: "Fıkıh",
    alimler: [
      { id: "imam-azam-fikih", isim: "İmam-ı Azam Ebû Hanîfe", kitaplar: [] },
      { id: "imam-malik-fikih", isim: "İmam Mâlik", kitaplar: [] },
      { id: "imam-safii", isim: "İmam Şâfiî", kitaplar: [] },
      { id: "imam-hanbel", isim: "İmam Ahmed bin Hanbel", kitaplar: [] },
    ],
  },
  {
    id: "akaid",
    baslik: "Akaid",
    alimler: [
      { id: "imam-azam-akaid", isim: "İmam-ı Azam Ebû Hanîfe", kitaplar: [] },
      { id: "imam-maturidi-akaid", isim: "İmam Mâtürîdî", kitaplar: [] },
      { id: "imam-esari-akaid", isim: "İmam Eş'arî", kitaplar: [] },
      { id: "nesefî", isim: "Necmüddîn en-Nesefî", kitaplar: [] },
      { id: "taftazani", isim: "Taftâzânî", kitaplar: [] },
    ],
  },
  {
    id: "tefsir",
    baslik: "Tefsir",
    alimler: [
      { id: "taberi", isim: "İmam Taberî", kitaplar: [] },
      { id: "zemahseri", isim: "Zemahşerî", kitaplar: [] },
      { id: "razi", isim: "Fahruddîn er-Râzî", kitaplar: [] },
      { id: "ibn-kesir", isim: "İbn Kesîr", kitaplar: [] },
      { id: "elmalili", isim: "Elmalılı Hamdi Yazır", kitaplar: [] },
    ],
  },
  {
    id: "usul",
    baslik: "Usûl",
    alimler: [
      {
        id: "hanefi-usul",
        isim: "Hanefî Hadis Usûlü",
        kitaplar: [],
      },
      { id: "imam-safii-usul", isim: "İmam Şâfiî", kitaplar: [] },
      { id: "gazali-usul", isim: "İmam Gazâlî", kitaplar: [] },
    ],
  },
  {
    id: "diger",
    baslik: "Diğer",
    alimler: [
      {
        id: "bediuzzaman",
        isim: "Bediüzzaman Said Nursî",
        altKategoriler: [
        {
          id: "buyuk-eserler",
          baslik: "Büyük Eserler",
          kitaplar: [
            { id: "sozler",                      baslik: "Sözler",                       gorsel: "/kitap-kapak/sozler.png",                yazar: "Bediüzzaman Said Nursî", dosya: "sozler-metin.json",                      aciklama: "Risale-i Nur'un temel eseri; iman hakikatlerini temsil ve hikâyelerle anlatan otuz üç Söz." },
            { id: "mektubat",                    baslik: "Mektubat",                     gorsel: "/kitap-kapak/mektubat.png",              yazar: "Bediüzzaman Said Nursî", dosya: "mektubat-metin.json",                    aciklama: "Talebelerin sorularına verilen cevaplardan oluşan otuz üç Mektup." },
            { id: "lemalar",                     baslik: "Lem'alar",                     gorsel: "/kitap-kapak/lemalar.png",               yazar: "Bediüzzaman Said Nursî", dosya: "lemalar-metin.json",                     aciklama: "İman ve Kur'ân hakikatlerine dair otuz üç Lem'a; İhlas ve Hastalar Risalesi gibi bölümler." },
            { id: "sualar",                      baslik: "Şuâlar",                       gorsel: "/kitap-kapak/sualar.png",                yazar: "Bediüzzaman Said Nursî", dosya: "sualar-metin.json",                      aciklama: "Âyetü'l-Kübrâ ve Meyve Risalesi gibi tahkikî iman derslerini içeren şuâlar." },
            { id: "mesnevi-i-nuriye",            baslik: "Mesnevî-i Nuriye",             gorsel: "/kitap-kapak/mesneviinuriye.png",        yazar: "Bediüzzaman Said Nursî", dosya: "mesnevi-i-nuriye-metin.json",            aciklama: "Risale-i Nur'un çekirdeği sayılan, Arapça aslından tercüme kısa ve derin bahisler." },
            { id: "isaratul-icaz",               baslik: "İşârâtü'l-İ'câz",              gorsel: "/kitap-kapak/isarat.png",                yazar: "Bediüzzaman Said Nursî", dosya: "isaratul-icaz-metin.json",               aciklama: "Bakara sûresinin tefsiri; Kur'ân'ın nazmındaki i'câzı gösterir." },
            { id: "asa-yi-musa",                 baslik: "Asâ-yı Mûsâ",                  gorsel: "/kitap-kapak/asayimusa.png",             yazar: "Bediüzzaman Said Nursî", dosya: "asa-yi-musa-metin.json",                 aciklama: "İman esaslarını delilleriyle ispatlayan iki kısımlık derleme." },
            { id: "barla-lahikasi",              baslik: "Barla Lâhikası",               gorsel: "/kitap-kapak/barla.png",                 yazar: "Bediüzzaman Said Nursî", dosya: "barla-lahikasi-metin.json",              aciklama: "Barla döneminde talebelerle mektuplaşmalar." },
            { id: "kastamonu-lahikasi",          baslik: "Kastamonu Lâhikası",           gorsel: "/kitap-kapak/kastamonu.png",             yazar: "Bediüzzaman Said Nursî", dosya: "kastamonu-lahikasi-metin.json",          aciklama: "Kastamonu dönemi mektuplaşmaları." },
            { id: "emirdag-lahikasi",            baslik: "Emirdağ Lâhikası",             gorsel: "/kitap-kapak/emirdag.png",               yazar: "Bediüzzaman Said Nursî", dosya: "emirdag-lahikasi-metin.json",            aciklama: "Emirdağ dönemi mektupları; hizmet düsturları." },
            { id: "iman-ve-kufur-muvazeneleri",  baslik: "İman ve Küfür Muvazeneleri",   gorsel: "/kitap-kapak/imanvekufur.png",           yazar: "Bediüzzaman Said Nursî", dosya: "iman-ve-kufur-muvazeneleri-metin.json",  aciklama: "İman ile küfrün neticelerini karşılaştıran seçme bahisler." },
            { id: "sikke-i-tasdik-i-gaybi",      baslik: "Sikke-i Tasdîk-ı Gaybî",       gorsel: "/kitap-kapak/gaybi.png",                 yazar: "Bediüzzaman Said Nursî", dosya: "sikke-i-tasdik-i-gaybi-metin.json",      aciklama: "Risale-i Nur'a dair gaybî işaretler ve tevafuklar." },
            { id: "muhakemat",                   baslik: "Muhâkemat",                    gorsel: "/kitap-kapak/muhakemat.png",             yazar: "Bediüzzaman Said Nursî", dosya: "muhakemat-metin.json",                   aciklama: "İlk dönem eseri; Kur'ân hakikatlerinin anlaşılmasında usûl ve muhakeme." },
            { id: "tarihce-i-hayat",             baslik: "Tarihçe-i Hayat",              gorsel: "/kitap-kapak/tarihce.png",               yazar: "Bediüzzaman Said Nursî", dosya: "tarihce-i-hayat-metin.json",             aciklama: "Bediüzzaman'ın hayatını dönem dönem anlatan biyografi." },
            { id: "ilk-donem-eserleri",          baslik: "İlk Dönem Eserleri",           gorsel: "/kitap-kapak/ilkdonem.png",              yazar: "Bediüzzaman Said Nursî", dosya: "ilk-donem-eserleri-metin.json",          aciklama: "Münâzarât, Hutbe-i Şâmiye gibi erken dönem eserleri." },
          ],
        },
        {
          id: "kucuk-eserler",
          baslik: "Küçük Eserler",
          kitaplar: [

          ],
        },
      ],
      },
      { id: "ibn-haldun", isim: "İbn Haldûn", kitaplar: [] },
      { id: "ibn-arabi-diger", isim: "İbn Arabî", kitaplar: [] },
    ],
  },
  {
    id: "hadis",
    baslik: "Hadis-i Şerif",
    alimler: [
      {
        id: "imam-nevevi",
        isim: "İmam Nevevî",
        kitaplar: [
          {
            id: "riyazussalihin",
            baslik: "Riyâzü's-Sâlihîn",
            yazar: "İmam Nevevî",
            dosya: "riyazussalihin-metin.json",
            gorsel: "/kitap-kapak/riyazussalihin.png",
            aciklama: "İmam Nevevî'nin sahih hadislerden derlediği meşhur ahlâk ve amel kitabı.",
          },
        ],
      },
      { id: "imam-buhari", isim: "İmam Buhârî", kitaplar: [] },
      { id: "imam-muslim", isim: "İmam Müslim", kitaplar: [] },
      { id: "imam-tirmizi", isim: "İmam Tirmizî", kitaplar: [] },
      { id: "imam-nesai", isim: "İmam Nesâî", kitaplar: [] },
      { id: "imam-ebu-davud", isim: "İmam Ebû Dâvûd", kitaplar: [] },
      { id: "ibn-mace", isim: "İbn Mâce", kitaplar: [] },
      { id: "imam-malik-hadis", isim: "İmam Mâlik", kitaplar: [] },
    ],
  },
]

export const kitaplar = kategoriler.flatMap(k =>
  (k.alimler || []).flatMap(a =>
    a.altKategoriler
      ? a.altKategoriler.flatMap(alt => alt.kitaplar)
      : a.kitaplar
  )
)

export function kitapFontGetir(alimId) {
  if (alimId === "bediuzzaman") return "LivaNur, serif"
  return null
}
export const kuranKitapligi = {
  id: "kuran-kitapligi",
  baslik: "Kur'ân-ı Kerîm",
  sureler: [] // kuran.js'den ayrı yönetilecek
}

export const duaKitapligi = {
  id: "dua-kitapligi",
  baslik: "Dua Kitaplığı",
  kitaplar: [
    // İleride: Cevşenü'l Kebîr, Celcelûtiye vb.
  ]
}

export const hadisKitapligi = {
  id: "hadis-kitapligi",
  baslik: "Hadis-i Şerîf",
  koleksiyonlar: [
    // İleride: Buhari, Müslim vb.
  ]
}
