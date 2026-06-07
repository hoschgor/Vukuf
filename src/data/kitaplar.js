export const kategoriler = [
  {
    id: "tasavvuf",
    baslik: "Tasavvuf",
    alimler: [
      { id: "imam-rabbani", isim: "İmam Rabbânî", kitaplar: [] },
      { id: "muhyiddin-arabi", isim: "Muhyiddin-i Arabî", kitaplar: [] },
      { id: "abdulkadir-geylani", isim: "Abdülkâdir Geylânî", kitaplar: [] },
      {
        id: "imam-gazali",
        isim: "İmam Gazâlî",
        kitaplar: [
          {
            id: "munkiz",
            baslik: "El-Münkız Mine'd-Dalâl",
            aciklama: "Gazâlî'nin dalâletten kurtuluşunu anlattığı otobiyografik eseri.",
            dosya: "munkiz-metin.json",
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
    id: "hadis",
    baslik: "Hadis-i Şerif",
    alimler: [
      { id: "imam-buhari", isim: "İmam Buhârî", kitaplar: [] },
      { id: "imam-muslim", isim: "İmam Müslim", kitaplar: [] },
      { id: "imam-tirmizi", isim: "İmam Tirmizî", kitaplar: [] },
      { id: "imam-nesai", isim: "İmam Nesâî", kitaplar: [] },
      { id: "imam-ebu-davud", isim: "İmam Ebû Dâvûd", kitaplar: [] },
      { id: "ibn-mace", isim: "İbn Mâce", kitaplar: [] },
      { id: "imam-malik-hadis", isim: "İmam Mâlik", kitaplar: [] },
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
            id: "kucuk-eserler",
            baslik: "Küçük Eserler",
            kitaplar: [
              {
                id: "ayetul-kubra",
                baslik: "Âyetü'l-Kübrâ",
                aciklama: "Kâinattan Hâlıkını soran bir seyyahın müşâhedatı.",
                dosya: "ayetul-kubra-metin.json",
              },
            ],
          },
          {
            id: "buyuk-eserler",
            baslik: "Büyük Eserler",
            kitaplar: [],
          },
        ],
      },
      { id: "ibn-haldun", isim: "İbn Haldûn", kitaplar: [] },
      { id: "ibn-arabi-diger", isim: "İbn Arabî", kitaplar: [] },
    ],
  },
]

export const kitaplar = kategoriler.flatMap(k =>
  k.alimler.flatMap(a =>
    a.altKategoriler
      ? a.altKategoriler.flatMap(alt => alt.kitaplar)
      : a.kitaplar
  )
)