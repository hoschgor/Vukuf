/* ═══════════════════════════════════════════════════════════════════════════
   VUKUF — ESNEK ARAMA (ayraç duyarsız eşleştirme)
   src/data/esnekArama.js

   11 Ekim 2026, kullanıcı: "lisan-ı hâl kelimesini aramak için 'lisanıhal',
   'lisan ı hal' veyahut 'lisan - ı hal' yazılsa da bulunabilmeli."

   YÖNTEM: önce bildik arama (katlanmış alt dizi). Bulunamazsa AYRAÇLAR
   (boşluk, tire çeşitleri, kesme/hemze işaretleri, birleşik aksan ve Arapça
   hareke işaretleri) yok sayılarak eşleştirilir:
     lisan-ı hâl · lisanıhal · lisan ı hal · lisan - ı hal · Lisan-ı Hâl
     Âl-i İmrân · al i imran · aliimran
   Harf katlaması (şapka, büyük/küçük, İ/ı) DIŞARIDAN verilir — çağıran ekran
   kendi katlamasını (trFold / normHarf) kullanır, eski davranış aynen sürer.
   Katlama UZUNLUK KORUYAN olmalı: bulunan yer orijinal satırdaki konumdur,
   önizleme ve vurgu ona göre yapılıyor.

   NOKTALAMA (17 Kasım 2026, kullanıcı: "metin içi arama ya da genel arama işleminde, ',' -
   '.' - '-' gibi işaretleri görmezden gelebilelim, ararken, ',' yerine boşluk bırakılabiliyor
   ve tam bir arama gibi çalıştığı için bulamayabiliyor."): virgül, nokta, noktalı virgül, iki
   nokta, ünlem, soru, tırnaklar, parantezler, üç nokta, eğik çizgi ve Arapça virgül / noktalı
   virgül / soru işareti de ayraç sayılır → "kalb ruh", "kalb. ruh" ↔ "kalb, ruh" eşleşir.
   Birebir (*) aramada eski davranış sürer.

   KISA SORGU SINIRI: ayraçlar atılınca kelimeler birleşir ve 2–3 harflik bir
   sorgu iki kelimenin kesişiminde de eşleşebilir ("kalb u" → "bu"). Bu yüzden
   esnek eşleşme yalnız sorgu (ayraçsız) en az ESNEK_EN_AZ harfse devreye giriyor;
   daha kısa sorgularda bildik birebir alt dizi araması yapılıyor.
   ═══════════════════════════════════════════════════════════════════════════ */

export const ESNEK_EN_AZ = 4

// Boşluk, tire/çizgi çeşitleri, kesme ve hemze/ayın işaretleri, orta nokta,
// birleşik aksanlar (ayrışık yazılmış "â" gibi), Arapça harekeler.
// (\p{…} sınıfları "u" bayrağıyla ~2 kat yavaş ölçüldü; kod aralıkları elle yazıldı.)
// ayracKod() aynı kümenin karakter koduyla denetimi — ikisi birlikte güncellenmeli.
const AYRAC = "\\s\\-\\u2010-\\u2015'`\\u00B4\\u2018\\u2019\\u02BB\\u02BC\\u02BE\\u02BF\\u00B7\\u0300-\\u036F\\u064B-\\u065F\\u0670" +
  // Noktalama (17 Kasım 2026): , . ; : ! ? " ( ) [ ] / … “ ” „ « » ، ؛ ؟ ۔
  ",.;:!?\"()\\[\\]/\\u2026\\u201C\\u201D\\u201E\\u00AB\\u00BB\\u060C\\u061B\\u061F\\u06D4"
const AYRAC_HEPSI = new RegExp(`[${AYRAC}]+`, "g")

/** Aranan ifadeyi bir kez hazırla (döngü dışında): katlanmış düz hâli + ayraçsız hâli. */
export function esnekHazirla(aranan, katla) {
  const katli = katla(aranan || "")
  return { duz: katli.trim(), sikisik: katli.replace(AYRAC_HEPSI, "") }
}

/* Ayraç mı? (AYRAC ile aynı küme; döngüde dizgi kurmadan karakter koduyla bakılır) */
function ayracKod(c) {
  return c <= 32 || c === 45 || c === 39 || c === 96 || c === 0xA0 || c === 0xB4 || c === 0xB7 ||
    (c >= 0x2000 && c <= 0x200B) || (c >= 0x2010 && c <= 0x2015) || c === 0x2018 || c === 0x2019 ||
    c === 0x202F || c === 0x3000 || c === 0x02BB || c === 0x02BC || c === 0x02BE || c === 0x02BF ||
    (c >= 0x0300 && c <= 0x036F) || (c >= 0x064B && c <= 0x065F) || c === 0x0670 ||
    // Noktalama (17 Kasım 2026): , . ; : ! ? " ( ) [ ] / … “ ” „ « » ، ؛ ؟ ۔
    c === 44 || c === 46 || c === 59 || c === 58 || c === 33 || c === 63 || c === 34 || c === 40 ||
    c === 41 || c === 91 || c === 93 || c === 47 || c === 0x2026 || c === 0x201C || c === 0x201D ||
    c === 0x201E || c === 0xAB || c === 0xBB || c === 0x060C || c === 0x061B || c === 0x061F || c === 0x06D4
}

/* Ayraçları atlayarak eşleştir. Satır için yeni dizgi KURULMUYOR: sorgunun ilk
   harfinin geçtiği her yerden başlayıp ilerleniyor, aradaki ayraçlar atlanıyor.
   Uzun kitaplarda satır başına regex ile ayraç silmekten belirgin hızlı. */
function ayracAtlayarakBul(katli, q) {
  const ilk = q[0]
  let i = katli.indexOf(ilk)
  while (i !== -1) {
    let j = 1, k = i + 1
    while (j < q.length && k < katli.length) {
      const c = katli.charCodeAt(k)
      if (c === q.charCodeAt(j)) { j++; k++ }
      else if (ayracKod(c)) k++
      else break
    }
    if (j === q.length) return { bas: i, son: k }
    i = katli.indexOf(ilk, i + 1)
  }
  return null
}

/**
 * Satırda aranan ifadeyi bulur. Önce bildik yolla (katlanmış alt dizi), bulamazsa
 * ayraç duyarsız. Dönen { bas, son } ORİJİNAL satırdaki yarı açık aralıktır.
 *  aranan : metin YA DA esnekHazirla(...) sonucu (döngülerde bir kez hazırlanır)
 *  katla  : uzunluk koruyan harf katlaması (trFold / normHarf)
 */
export function esnekBul(satir, aranan, katla) {
  if (!satir || !aranan) return null
  const h = typeof aranan === "string" ? esnekHazirla(aranan, katla) : aranan
  if (!h.duz) return null
  const katli = katla(satir)
  const i = katli.indexOf(h.duz)
  if (i !== -1) return { bas: i, son: i + h.duz.length }
  if (h.sikisik.length < ESNEK_EN_AZ) return null
  return ayracAtlayarakBul(katli, h.sikisik)
}
