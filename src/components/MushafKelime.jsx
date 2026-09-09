import { useState } from "react"
import { useMediaQuery } from "../data/hooks/useMediaQuery"

// ══════════════════════════════════════════════════════════════════════════════════════════
// VAKIF (durak) ve TECVİD işaretleri — REFERANS
// ------------------------------------------------------------------------------------------
// KAYNAK: kuran-mushaf.json'ın TAMAMI tarandı (isaret_dok.py). Aşağıdaki hükümler
// tahmin değil, o sayımın sonucudur. Sayılar sıklık; parantezdeki yer örnek.
//
// ÖNCEKİ İKİ HATA — ikisi de bu sayımla ortaya çıktı, tekrar edilmesin:
//   • U+06DC "BU VERİDE ط durağıdır" YAZIYORDU → YANLIŞ. Veride tam 4 kez geçiyor ve
//     dördü de Hafs'ın sekte yerleri (Kehf 18:1, Yâsîn 36:52, Kıyâme 75:27,
//     Mutaffifîn 83:14). Yani standart anlamı (SEKTE) doğruymuş. Karışıklığın sebebi
//     FONT: onarılmış fontlarda U+06DC ile U+0615 aynı glife düşüyor, ekranda ط görünüyordu.
//   • U+08D5 "kıraat farkı: sâd ile okunuş" SAYILIYORDU → YANLIŞ. Veride 156 kez geçiyor;
//     bu sıklık nadir bir kıraat farkı olamaz. SMALL HIGH SAD = ص = vakf-ı MURAHHAS.
//     Yanılgının sebebi: Bakara 2:245 يَبْصُۣطُࣕ kelimesinde gerçek kıraat işareti (U+06E3)
//     ile ص durağı yan yana duruyor; ikisi bir kural sanılmıştı.
//
// Kural: yeni bir işaret eklemeden önce isaret_dok.py ile SAY. Unicode adına da,
// tek bir âyetteki görüntüye de güvenme.
//
// VAKIF (durak) İŞARETLERİ — durup durmama hükmü:
//   مـ  U+06D8  vakf-ı LÂZIM     → durmak VÂCİP; geçilirse mânâ bozulur
//   ط   U+0615  vakf-ı MUTLAK    → durmak evlâ (mutlak durak)
//   ج   U+06DA  vakf-ı CÂİZ      → durmak da geçmek de câiz, eşit
//   ز   U+0617  vakf-ı MÜCEVVEZ  → câiz ama GEÇMEK evlâ   (Bakara 2:41 قليلا — doğrulandı)
//   صلى U+06D6  el-VASLU EVLÂ (1) → geçmek daha iyi   (Kehf 18:58)
//   لا  U+06D9  LÂ VAKF          → DURMA (durulduysa geri alıp tekrarla)
//   ∴∴  U+06DB  MUÂNAKA          → iki noktadan YALNIZ BİRİNDE durulur, ikisinde birden değil
//   ع   U+08D6  RUKÛ' SONU (445) → durak hükmü DEĞİL; bölüm (rukû) sonunu gösterir
//   ص   U+08D5  vakf-ı MURAHHAS (156) → uzun âyette nefes için ruhsat; geçmek evlâ
//   قف  U+08DE  KIF              → "dur" (durulmayacak sanılan yerde uyarı)
//   ق   U+08D7  KÎLE aleyhi'l-vakf → "burada durulur denmiştir"
//
// TECVİD / KIRAAT işaretleri (aşağıdaki TECVID_ISARET tablosunda çizilenler):
//   U+06E3 küçük ALT sîn (2)  → Bakara 2:245 يبصط · A'râf 7:69 بصطة — sîn ile okunuş
//   U+06EB boş merkezli üst durak (1) → Yûsuf 12:11 تأمنا — İŞMÂM
//   U+06ED küçük ALT mîm (1)  → Hûd 11:42 اركب معنا — idgâm-ı mütecâniseyn (bâ → mîm)
//   U+06DC küçük ÜST sîn (4)  → SEKTE (yukarıdaki nota bak; overlay ile çiziliyor)
//   U+06EC dolu merkezli üst durak (1) → Fussilet 41:44 ءَاَ۬عْجَمِيٌّ — TESHÎL
//     (fontlar bu ikisini doğru çiziyor; yalnız panelde açıklanır)
//
// VERİDE GEÇEN AMA DURAK/TECVİD OLMAYANLAR (bilerek ele alınmıyor):
//   U+06E1 (31) → sükûn; imlâsı farklı bir kaynaktan gelen kelimelerde (ٱ / ۡ üslubu)
//   U+06E4 (5)  → medd; yalnız SÛRE ADLARINDA (isimArapca), âyet metninde değil
//
// VERİDE HİÇ GEÇMEYENLER (tabloya konmadı): U+06D7 (قلى), U+06DF, U+06E0, U+08D1, U+08D2
//   (İmâle Hafs'ta tek yerdedir: Hûd 11:41 مجراها — bu veride ayrı bir kodla işaretlenmiyor.)
// ══════════════════════════════════════════════════════════════════════════════════════════
// 0x06D6 (صلى) ve 0x06DB (muânaka) BURAYA SONRADAN EKLENDİ: veride geçiyorlar
// (46 ve 1 kez) ama bu kümede olmadıkları için `vakifMi` onları vakıf saymıyor,
// dolayısıyla RENKLENDİRİLMİYORLARDI — muânaka gibi kritik bir işaret düz metin
// gibi görünüyordu. Sayım olmadan fark edilmesi güç bir eksikti.
const VAKIF_CPS = new Set([0x615, 0x617, 0x06D6, 0x06D8, 0x06D9, 0x06DB, 0x08D5, 0x08D6, 0x08D7, 0x08DE])
// ── TECVİD / KIRAAT İŞARETLERİ (font-bağımsız, kendi çizimimiz) ────────────────────────────
// KFGQPC bu işaretleri bozuk ◉ (noktalı-daire) glifine düşürüyordu. İşaret string'den ÇIKARILIR
// (kelime TEK span'de, aktif fontta, bitişmesi bozulmadan kalır) ve kuralı belirten KÜÇÜK RENKLİ
// SİMGE mutlak-konumlu overlay olarak çizilir. Overlay akışa girmez: ne satır kırılımını ne de
// sayfa yüksekliğini etkiler. Simgeler mushaf geleneğindeki kısa gösterimlerdir.
const TECVID_ISARET = {
  // Bakara 2:245 يبصط — kıraat farkı: sîn ile de okunur (altta küçük س), sâd ile de (üstte küçük ص)
  0x06E3: { sembol: 'س', yer: 'alt', renk: '#c0392b', ad: 'Kıraat farkı: sîn ile okunuş' },
  // Yûsuf 12:11 تأمنا — işmâm. Mushaf işareti: üstte küçük halka.
  0x06EB: { sembol: '○', yer: 'ust', renk: '#16a085', ad: 'İşmâm' },
  // Hûd 11:42 اركب معنا — idgâm-ı mütecâniseyn (bâ, mîm'e idgâm olur): altta küçük م
  0x06ED: { sembol: 'م', yer: 'alt', renk: '#2980b9', ad: 'İdgâm-ı mütecâniseyn' },
  // SEKTE — Hafs'ta tam DÖRT yer: Kehf 18:1, Yâsîn 36:52, Kıyâme 75:27, Mutaffifîn 83:14.
  // Veride U+06DC ile işaretli ve sayım bunu doğruluyor (tam 4 kez, tam bu âyetlerde).
  // Overlay'e alınmasının sebebi FONT: onarılmış KFGQPC/me_quran'da U+06DC ile U+0615
  // AYNI glife (uni0615x) düşüyor, yani sekte ekranda ط durağı gibi çiziliyordu.
  // Kendimiz çizerek fonttan bağımsız hâle getiriyoruz.
  0x06DC: { sembol: 'س', yer: 'ust', renk: '#1abc9c', ad: 'Sekte' },
  // NOT: U+06DF (yuvarlak sıfır) ve U+06E0 (dikdörtgen sıfır) BU MUSHAFTA HİÇ GEÇMİYOR
  // (kuran-mushaf.json tarandı, 0 kez). Ölü yapılandırma bırakmamak için kaldırıldılar.
  // NOT: U+06EA burada YOK. Standartta "low stop" olsa da bu verinin imlâsında uzun "î" ÇEKME
  // işaretidir; fontta doğru çizildiği için overlay'e alınmaz (alınırsa her uzun î'ye simge basardı).
  // İmâle ise AŞAĞIDA, karakterle değil KELİMEYLE tespit edilir (bkz. imaleMi).
}
// ── İMÂLE ─────────────────────────────────────────────────────────────────────────────────
// Hafs kıraatinde imâle TEK bir yerdedir: Hûd 11:41 "مَجْر۪ىهَا". Bu veride U+06EA her yerde
// uzun "î" çekmesi olarak kullanıldığı için imâleyi KARAKTERDEN tespit etmek imkânsız — yapılırsa
// bütün uzun î'lere imâle simgesi basar (önceki hata buydu). Doğru tetikleyici kelimenin kendisi:
// sûre 11, âyet 41 ve taban harfleri "مجرىها". Yalnız orada U+06EA metinden çıkarılıp
// mushaf geleneğindeki küçük elmas (معين) simgesi çizilir.
const IMALE_ISARET = { sembol: '◆', yer: 'alt', renk: '#8e44ad', ad: 'İmâle (Hûd 11:41)' }
const IMALE_KELIMELER = new Set(['مجرىها', 'مجريها'])
const tabanHarfleri = (s) => [...String(s || '')].filter(c => !BIRLESIK_RE.test(c)).join('')
function imaleMi(kelime) {
  const [sure, ayet] = String(kelime?.id || '').split(':').map(Number)
  if (sure !== 11 || ayet !== 41) return false
  return IMALE_KELIMELER.has(tabanHarfleri(kelime.arabic))
}
const TECVID_CPS = new Set(Object.keys(TECVID_ISARET).map(Number))
// Birleşik (harekeler/işaretler) — taban harf saymak için: bunlar harf DEĞİL.
const BIRLESIK_RE = /[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06ED\u08D3-\u08FF]/
// U+08D1 ve U+08D2 bir ara "veride hiç geçmiyor" denip çıkarılmıştı — O ÖLÇÜM
// HATALIYDI (tarayıcı aralığı 0x08D3'ten başlıyordu, bu iki kodu göremiyordu).
// Gerçek: U+08D1 = 484 kez, U+08D2 = 247 kez. Anlamları da mushaftan doğrulandı:
//   U+08D1 → KASR  (Bakara 5/16/27/39 "اُو۟لٰٓئِكَ")
//   U+08D2 → MED   (Bakara 14 "مُسْتَهْزِؤُ۫نَ", Bakara 40 "اُو۫فِ")
// Unicode adları (LARGE CIRCLE BELOW / ROUND DOT INSIDE CIRCLE BELOW) bu veride
// YANILTICI; dosyanın başındaki kural burada da geçerli: ada değil, kullanıma bak.
const OZEL_CPS = new Set([0x08D1, 0x08D2, 0x08D9])
const CIM_CPS = new Set([0x06DA])
const TUM_OZEL_CPS = new Set([...VAKIF_CPS, ...OZEL_CPS, ...CIM_CPS])
// ── PAYLAŞIM GÖRSELİ İÇİN TEMİZLEME ────────────────────────────────────────────────────────
// ARTIK SABİT BİR ÇIKARMA LİSTESİ YOK. Fontlar onarıldığı için (KFGQPC'de uni0656 konturu
// düzeltildi; me_quran'a U+0615 ve U+08D1..08DE Osmanlı işaretleri eklendi) bu işaretlerin
// hemen hepsi çıktıda DOĞRU ve RENKSİZ çiziliyor. Sabit liste tutmak, font her güncellendiğinde
// yeniden elden geçirmeyi gerektiriyordu ve fazladan işaret siliyordu (ör. ط durağı,
// me_quran'da U+0615 olmadığı için atılıyor ve çıktıda hiç görünmüyordu).
// Bunun yerine GorselOlustur'daki `eksikGlifAt` süzgeci kullanılır: o, SEÇİLİ FONTU ölçerek
// yalnızca gerçekten çizilemeyen (notdef/□) işaretleri atar. Yani kural fonta göre kendini
// ayarlar; burada elle bakım gerekmez. Harflere ve harekelere hiç dokunulmaz.
export function gorselIcinTemizle(metin) {
  return String(metin || "").replace(/\s+/g, " ").trim()
}

const CIM_RENK = '#f39c12'
const VAKIF_RENK = {
  0x615:  '#e67e22',
  0x06D6: '#95a5a6',   // صلى el-vaslu evlâ (Kehf 18:58 — veride tek yer)
  // U+0617 = küçük üst ZÂY (ز) → VAKF-I MÜCEVVEZ. Bakara 2:41 "قَلِيلࣰا" üzerinde
  // doğrulandı (mushaf görüntüsünden glif okundu: tek noktalı zây kancası).
  // Hükmü İZİN VERİCİDİR: durmak câiz, GEÇMEK evlâ. Eskiden kırmızıydı; kırmızı bu
  // palette en bağlayıcı hükmü (vakf-ı lâzım) gösteriyor ve tam tersini sezdiriyordu.
  0x617:  '#d4ac0d',
  0x06D8: '#e74c3c',   // م vakf-ı LÂZIM — en bağlayıcı hüküm, kırmızı olmalı (mavi ق ile çakışıyordu)
  0x06D9: '#e67e22',   // لا LÂ VAKF — durma yasağı
  0x06DA: '#f39c12',   // ج vakf-ı CÂİZ (yeşil ص murahhas ile çakışıyordu)
  0x06DB: '#9b59b6',
  // 0x06DC (sekte) artık TECVID_ISARET'te overlay olarak çiziliyor — burada renk gerekmez.
  0x08D5: '#2ecc71',   // ص vakf-ı MURAHHAS (veride 156 kez — kıraat farkı değil)
  0x08D6: '#95a5a6',   // ع RUKÛ' sonu (veride 445 kez) — durak hükmü değil, bölüm işareti
  0x08D7: '#3498db',
  0x08DE: '#3498db',
}
// HARF → KOD NOKTASI. `kelime.vakif` alanı (varsa) harf tutar; renk yine YUKARIDAKİ
// tek tablodan okunur. Önceden ayrı bir VAKIF_RENKLERI tablosu vardı ve iki tablo
// birbirinden SESSİZCE ayrışmıştı: م kod tablosunda mavi, harf tablosunda kırmızıydı;
// ج yeşil/turuncu, لا turuncu/sarı. Ekranda kod tablosu kullanıldığı için bilgi paneli
// gerçekte görülen renkten farklı şey söylüyordu. Tek kaynak bırakıldı.
//   ط mutlak: durmak evlâ   · م lâzım: durmak vâcip   · ج câiz: ikisi de olur
//   ص murahhas: ruhsat var  · مع muânaka: yalnız birinde · ق "durulur denmiştir"
//   ز mücevvez: geçmek evlâ · لا DURMA
// (س sekte harfi burada YOK — o artık TECVID_ISARET'te overlay olarak çiziliyor.)
const VAKIF_HARF_KOD = {
  'ط': 0x615, 'م': 0x06D8, 'ج': 0x06DA, 'ص': 0x08D5,
  'مع': 0x06DB, 'ق': 0x08D7, 'لا': 0x06D9, 'ز': 0x617,
}
// ÖZEL OKUYUŞ etiketleri — yalnız OZEL_CPS'teki (08D1/08D2/08D9) kodlar için çizilir.
//   U+08D1 قصر (kasr) → medd yerine KISA okuma seçeneği
//   U+08D2 مد  (medd) → uzun okuma seçeneği
//   U+08D9 ن          → nûn-i sağîre / gunne uyarısı
// NOT: 06DC, 08D5 ve 06EB buradan ÇIKARILDI. 06DC bu veride ط durağıdır (sekte değil) ve fontun
// kendisi çizer; 08D5 ile 06EB zaten TECVID_ISARET'te ele alınıyor — burada durmaları ölü
// yapılandırmaydı ve yanlış yönlendiriyordu.
const OZEL_SEMBOL = {
  0x08D1: 'قصر',
  0x08D2: 'مد',
  0x08D9: 'ن',
}
const OZEL_RENK = {
  0x08D1: '#c0392b',
  0x08D2: '#c0392b',
  0x08D9: '#c0392b',
}

function besmeleMi(kelimeId) {
  const [sure, ayet, kelime] = kelimeId.split(':').map(Number)
  if (sure === 1 && ayet === 1) return true
  if (sure === 27 && ayet === 30 && kelime >= 5 && kelime <= 8) return true
  return false
}

function vakifMi(seg) {
  return [...seg].some(c => VAKIF_CPS.has(c.codePointAt(0)))
}

function vakifRengiAl(vakifStr) {
  // İki gösterim de aynı tabloya düşer: harf ('ط', 'مع'…) önce kod noktasına
  // çevrilir, sonra renk VAKIF_RENK'ten okunur. Böylece panel, ekran ve çıktı
  // birbirinden ayrışamaz.
  const harf = String(vakifStr || '').trim()
  const kod = VAKIF_HARF_KOD[harf]
  if (kod && VAKIF_RENK[kod]) return VAKIF_RENK[kod]
  const cp = [...harf][0]?.codePointAt(0)
  return VAKIF_RENK[cp] || '#e67e22'
}

function lafzatullahMi(arabic) {
  const temiz = arabic
    .replace(/[\u0671\u0622\u0623\u0625]/g, '\u0627')
    .replace(/[\u064B-\u065F\u0670\u06D6-\u06ED]/g, '')
    .trim()
  return temiz === '\u0627\u0644\u0644\u0647' || temiz.includes('\u0644\u0644\u0647')
}



export default function MushafKelime({
  kelime,
  aktif = false,
  theme,
  arapcaFont,
  yaziBoyutu = 20,
  lineHeight = 2.4,
  harfAraligi = 0,
  onTikla,
  kayitKonumModu = false,
}) {
  const [hover, setHover] = useState(false)
  const isMobile = useMediaQuery("(max-width: 768px)")
  const lafizkontrol = lafzatullahMi(kelime.arabic)
  const besmelekontrol = besmeleMi(kelime.id)
  const hasUpperIndicator = kelime.vakif || kelime.secde
  const vakifRengi = kelime.vakif ? vakifRengiAl(kelime.vakif) : null
  // Kelimedeki tecvid/kıraat işaretleri: string'den çıkarılır, simge olarak overlay çizilir.
  // İşaret, string'de BAĞLI OLDUĞU HARFTEN SONRA geldiği için o ana kadar sayılan TABAN harf
  // sayısıyla yatay konumu bulunur → simge kelimenin ortasına değil, ait olduğu harfin üzerine/
  // altına gelir (ör. Bakara 2:245'te üstteki ص "tı" harfinin, alttaki س "sad"ın hizasında).
  // U+0656 (uzatma / alt elif) ARTIK OVERLAY DEĞİL: fontun kendisi çiziyor.
  // KFGQPC bu glifi ÇİFT ESRE gibi çiziyordu; fontun uni0656 konturu onarıldı (U+0670 hançer
  // elif konturu taban çizgisinin altına indirildi). İşareti fontun GPOS'u yerleştirdiği için
  // konum HER KELİMEDE doğru — harf sayarak tahmin etmeye gerek kalmadı.
  const tecvidler = []
  let temizArabic = kelime.arabic
  // İmâle YALNIZ Hûd 11:41 "مجرىها" kelimesinde geçerlidir (Hafs'ta tek yer). Orada U+06EA
  // uzatma değil imâle demektir; başka her yerde uzatmadır ve fonta bırakılır.
  const imale = imaleMi(kelime)
  if (imale || [...kelime.arabic].some(c => TECVID_CPS.has(c.codePointAt(0)))) {
    const kalan = []
    let taban = 0
    for (const c of kelime.arabic) {
      const cp = c.codePointAt(0)
      const t = TECVID_ISARET[cp]
      if (t) { tecvidler.push({ ...t, taban }); continue }   // işaret metinden çıkar
      if (imale && cp === 0x06EA) { tecvidler.push({ ...IMALE_ISARET, taban }); continue }
      kalan.push(c)
      if (!BIRLESIK_RE.test(c)) taban++                       // yalnız taban (harf) say
    }
    temizArabic = kalan.join('')
    const toplam = Math.max(1, taban)
    // oran: sağdan (RTL başlangıcı) itibaren harfin merkezi → soldan yüzde konumu
    for (const tv of tecvidler) {
      const oran = Math.min(1, Math.max(0, (tv.taban - 0.5) / toplam))
      tv.sol = (1 - oran) * 100
    }
  }
  const efektifLineHeight = arapcaFont.toLowerCase().includes('me_quran') || arapcaFont.toLowerCase().includes('mequran')
  
  ? Math.max(lineHeight, 5.2)
  : lineHeight
  

  return (
    <span
      className="mushaf-kelime"
      onClick={(e) => onTikla?.(kelime, e)}
      onMouseEnter={() => { if (!kayitKonumModu) setHover(true) }}
      onMouseLeave={() => setHover(false)}
      style={{
        position: "relative",
        display: "inline-block",
        cursor: kayitKonumModu ? "crosshair" : "pointer",
        marginTop: hasUpperIndicator ? `${yaziBoyutu * 0.35}px` : "0",
        paddingLeft: isMobile ? `${2 + harfAraligi * 3}px` : "3px",
        paddingRight: isMobile ? `${2 + harfAraligi * 3}px` : "3px",
        paddingBottom: "2px",
        borderRadius: "3px",
        background: kayitKonumModu
          ? "transparent"
          : aktif
            ? `${theme.accent}22`
            : hover ? `${theme.accent}0a` : "transparent",
        boxShadow: kayitKonumModu ? "none" : aktif ? `inset 0 -2px 0 ${theme.accent}` : "none",
        transition: "background 0.15s",
        whiteSpace: "nowrap",
        verticalAlign: "middle",
        userSelect: "none",
        lineHeight: lineHeight,
        WebkitTapHighlightColor: kayitKonumModu ? "transparent" : undefined,
      }}
    >
      {/* Vakıf işareti */}
      {kelime.vakif && (
        <span
          style={{
            position: "absolute",
            top: `-${yaziBoyutu * 0.09}px`,
            left: isMobile ? "10px" : "3px",
            transform: "translateX(-10%)",
            fontSize: `${yaziBoyutu * 0.48}px`,
            color: vakifRengi,
            fontFamily: "'Scheherazade New', serif",
            fontWeight: "bold",
            lineHeight: 1,
            pointerEvents: "none",
            zIndex: 2,
          }}
        >
          {kelime.vakif}
        </span>
      )}

      {/* Secde işareti */}
      {kelime.secde && (
        <span
          style={{
            position: "absolute",
            top: kelime.vakif ? `-${yaziBoyutu * 0.1}px` : `-${yaziBoyutu * 0.05}px`,
            right: kelime.vakif ? "auto" : "0",
            left: kelime.vakif ? "auto" : "40%",
            transform: kelime.vakif ? "translateX(120%)" : "translateX(-50%)",
            fontSize: `${yaziBoyutu * 0.32}px`,
            color: "#2e7d4f",
            fontFamily: "'Scheherazade New', serif",
            lineHeight: 1,
            pointerEvents: "none",
            zIndex: 2,
            display: "inline-flex",
            alignItems: "center",
            gap: "2px",
            whiteSpace: "nowrap",
          }}
        >
          <svg width="9" height="9" viewBox="0 0 24 24" style={{ display: "inline-block" }}>
            <path
              d="M12 2 L14.5 8.5 L21.5 8.5 L16 13 L18.5 20 L12 16 L5.5 20 L8 13 L2.5 8.5 L9.5 8.5 Z"
              fill="none" stroke="#2e7d4f" strokeWidth="1.5" strokeLinejoin="round"
            />
            <circle cx="12" cy="11" r="2.5" fill="#2e7d4f" />
          </svg>
          سَجْدَة
        </span>
      )}

      {/* Tecvid / kıraat kuralı simgeleri — MUTLAK konumlu (akışa girmez: satır kırılımını ve
          sayfa yüksekliğini etkilemez). Kelimenin altına/üstüne ortalı, küçük ve renkli. */}
      {tecvidler.map((t, ti) => (
        <span
          key={`tv-${ti}`}
          title={t.ad}
          style={{
            position: "absolute",
            left: `${t.sol ?? 50}%`,
            // Kutu yüksekliği satır aralığına göre değiştiğinden ÜST/ALT kenara değil, kutunun
            // DİKEY MERKEZİNE (harflerin bulunduğu yer) göre konumlandırılır → satır aralığı
            // ayarı değişse de simge kelimeye aynı uzaklıkta kalır.
            top: "50%",
            transform: `translate(-50%, -50%) translateY(${t.yer === "ust" ? "-" : ""}${yaziBoyutu * (t.yer === "ust" ? 0.74 : 0.62)}px)`,
            fontSize: `${yaziBoyutu * 0.34}px`,
            lineHeight: 1,
            color: t.renk,
            fontFamily: "'Scheherazade New', serif",
            fontWeight: 700,
            pointerEvents: "none",
            whiteSpace: "nowrap",
            zIndex: 3,
          }}
        >
          {t.sembol}
        </span>
      ))}

      {/* Arapça metin */}
      <span
        style={{
          fontFamily: arapcaFont,
          fontSize: `${yaziBoyutu}px`,
          lineHeight: lineHeight,
          color: (lafizkontrol || besmelekontrol) ? (theme.lugatHighlight || theme.accent) : theme.text,
          display: "inline",
          opacity: aktif ? 1 : 0.95,
          verticalAlign: "middle",
          position: "relative",
        }}
      >
        {(() => {
          const isKfgqpc = arapcaFont.toLowerCase().includes('kfgqpc')

          if (arapcaFont.toLowerCase().includes('kufi') || arapcaFont.toLowerCase().includes('kûfi')) {
            return <span style={{ letterSpacing: 0 }}>{temizArabic}</span>
          }

          // NOT: tecvid işaretleri temizArabic'te YOK (yukarıda çıkarıldı) → kelime tek parça,
          // aktif fontta, bitişmesi bozulmadan çizilir; kural simgesi aşağıda overlay olarak gelir.
          const hasOzel = [...temizArabic].some(c => TUM_OZEL_CPS.has(c.codePointAt(0)))

          if (!hasOzel) {
            return <span>{temizArabic}</span>
          }

          const chars = [...temizArabic]
          const spans = []
          let normalBuf = ''
          let atla = false

          chars.forEach((c, i) => {
            if (atla) { atla = false; return }
            const cp = c.codePointAt(0)

            if (cp === 0x06DA) {
            if (normalBuf) { spans.push(<span key={`n-${i}`}>{normalBuf}</span>); normalBuf = '' }
            const nextCp = chars[i+1]?.codePointAt(0)
            const f = arapcaFont.toLowerCase()
            const cimTop = f.includes('nastaleeq')
              ? `-${yaziBoyutu * 0.4}px`
              : f.includes('indopak')
                ? `-${yaziBoyutu * 0.8}px`
                : f.includes('me_quran')
                  ? `${yaziBoyutu * 0.3}px`
                  : f.includes('kfgqpc')
                    ? `-${yaziBoyutu * 0}px`
                    : `-${yaziBoyutu * 0}px`
            if (nextCp === 0x06DB) {
              spans.push(<span key={i} style={{ position: 'absolute', top: cimTop, color: '#9b59b6' }}>{c}{chars[i+1]}</span>)
              atla = true
            } else {
              spans.push(<span key={i} style={{ position: 'absolute', top: cimTop, color: '#2ecc71' }}>{c}</span>)
            }
          } else if (cp === 0x06DB) {
              if (normalBuf) { spans.push(<span key={`n-${i}`}>{normalBuf}</span>); normalBuf = '' }
              spans.push(<span key={i} style={{ position: 'absolute', top: `-${yaziBoyutu * 0.25}px`, color: '#9b59b6' }}>{c}</span>)
            } else if (VAKIF_CPS.has(cp)) {
              if (normalBuf) { spans.push(<span key={`n-${i}`}>{normalBuf}</span>); normalBuf = '' }
              const fallbackGerekli = arapcaFont.toLowerCase().includes('kfgqpc')
                || arapcaFont.toLowerCase().includes('me_quran')
                || arapcaFont.toLowerCase().includes('mequran')
                || arapcaFont.toLowerCase().includes('nastaleeq')

              const vakifFontFamily = fallbackGerekli ? "'Scheherazade New', serif" : arapcaFont
              const f = arapcaFont.toLowerCase()
              const vakifTop = f.includes('me_quran')
                ? (cp === 0x0615 ? `-${yaziBoyutu * 0.2}px` : `${yaziBoyutu * 0.2}px`)  // me_quran: t vakfı normal, diğerleri aşağı
                : f.includes('nastaleeq')
                  ? `-${yaziBoyutu * 0.25}px`  // nastaleeq: normal top
                  : f.includes('indopak')
                    ? `-${yaziBoyutu * 1}px`  // indopak: yukarı
                    : `-${yaziBoyutu * 0}px`  // kfgqpc: normal

              const vakifLeft = f.includes('nastaleeq') ? '10px' : 'auto'
              const vakifTransform = f.includes('nastaleeq') ? 'none' : 'translateX(-50%)'

              spans.push(<span key={i} style={{ 
                position: 'absolute', 
                top: vakifTop,
                left: vakifLeft,
                transform: vakifTransform,
                color: vakifRengiAl(c), 
                fontFamily: vakifFontFamily,
                whiteSpace: 'nowrap',
              }}>{c}</span>)
            } else if (OZEL_CPS.has(cp)) {
              if (normalBuf) { spans.push(<span key={`n-${i}`}>{normalBuf}</span>); normalBuf = '' }
              spans.push(<span key={i} style={{
                position: 'absolute',
                bottom: `-${yaziBoyutu * 0.25}px`,
                right: 0,
                color: OZEL_RENK[cp] || '#c0392b',
                fontSize: `${yaziBoyutu * 0.45}px`,
                fontFamily: "'Scheherazade New', serif",
              }}>{OZEL_SEMBOL[cp] || c}</span>)
            } else {
              normalBuf += c
            }
          })

          if (normalBuf) spans.push(<span key="n-last">{normalBuf}</span>)

          return (
            <span style={{ position: 'relative', display: 'inline-block' }}>
              {spans}
            </span>
          )
        })()}
      </span>
    </span>
  )
}