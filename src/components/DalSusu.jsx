/* VUKUF — DAL SÜSÜ (pencerenin etrafını saran dallar)
   src/components/DalSusu.jsx

   Bir pencerenin kenarına sarılmış ince dallar: sol alttan çıkan ana dal sol
   kenardan yukarı tırmanıp üst kenarın bir kısmına uzanıyor, aynı kökten kısa
   bir kol alt kenara, sağ üst köşede de başka bir dal sağ kenardan aşağı
   sarkıyor. BİLEREK SİMETRİK DEĞİL — simetrik süs tezhip gibi durur, dal
   hissi vermez.

   ── NASIL ÇİZİLİYOR ───────────────────────────────────────────────────────
   Pencerenin çevresi 8 parçaya bölünüyor (4 kenar + 4 yuvarlak köşe) ve her
   parça 1 birimlik bir "u" aralığı: 0 sol kenar (aşağıdan yukarı), 1 sol üst
   köşe, 2 üst kenar, 3 sağ üst köşe, 4 sağ kenar, 5 sağ alt, 6 alt kenar
   (sağdan sola), 7 sol alt köşe. Dallar u aralıkları olarak tanımlı; bu yüzden
   pencere boyu değişince (âyetten âyete meal uzunluğu) dallar KAYMIYOR, yalnız
   kenar boyunca esniyor — yapraklar yerinden sıçramıyor.
   Kıvrımlar, yaprak açıları ve boyları sabit tohumlu bir sözde-rastgele
   üreteçten: her açılışta aynı çizim, ama elle dizilmiş gibi düzenli değil.

   ── METNİ KAPATMAMA ───────────────────────────────────────────────────────
   Dal gövdesi kartın üstüne HİÇ çizilmiyor: kenarı kestiği yerde kartın
   arkasına giriyor (maske). İçe dönen sürgün/yapraklar kısa tutuldu, kartın
   iç dolgusunu geçmiyor. SVG `pointerEvents: none` — hiçbir dokunuşu yutmuyor.

   Renkler yalnız temanın vurgu renginden (saydamlıkla): her temada kendi
   tonunu alıyor. */

import { useId, useMemo } from "react"

const TASMA = 18          // SVG'nin pencereden taşma payı (px) — dışarıdaki yapraklar için

// Küçük, tohumlu sözde-rastgele üreteç (mulberry32)
function uretec(tohum) {
  let a = tohum >>> 0
  return () => {
    a = (a + 0x6D2B79F5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/* Çevre üzerinde u konumundaki nokta, ilerleme yönü (t) ve DIŞA bakan normal (n). */
function cevre(u, g) {
  const { x0, y0, w, h, r } = g
  const k = Math.floor(u)
  const seg = ((k % 8) + 8) % 8
  const f = u - k
  const yay = (cx, cy, a0) => {
    const a = a0 + f * Math.PI / 2
    const c = Math.cos(a), s = Math.sin(a)
    return { x: cx + r * c, y: cy + r * s, tx: -s, ty: c, nx: c, ny: s }
  }
  switch (seg) {
    case 0: return { x: x0, y: y0 + h - r - f * (h - 2 * r), tx: 0, ty: -1, nx: -1, ny: 0 }
    case 1: return yay(x0 + r, y0 + r, Math.PI)
    case 2: return { x: x0 + r + f * (w - 2 * r), y: y0, tx: 1, ty: 0, nx: 0, ny: -1 }
    case 3: return yay(x0 + w - r, y0 + r, Math.PI * 1.5)
    case 4: return { x: x0 + w, y: y0 + r + f * (h - 2 * r), tx: 0, ty: 1, nx: 1, ny: 0 }
    case 5: return yay(x0 + w - r, y0 + h - r, 0)
    case 6: return { x: x0 + w - r - f * (w - 2 * r), y: y0 + h, tx: -1, ty: 0, nx: 0, ny: 1 }
    default: return yay(x0 + r, y0 + h - r, Math.PI / 2)
  }
}
// Bir parçanın uzunluğu (örnekleme sıklığı için)
function parcaBoyu(u, g) {
  const seg = ((Math.floor(u) % 8) + 8) % 8
  if (seg % 2 === 1) return g.r * Math.PI / 2
  return (seg === 0 || seg === 4) ? g.h - 2 * g.r : g.w - 2 * g.r
}

const f2 = (x) => Math.round(x * 10) / 10

/* Yaprak: badem biçimi + orta damar. p kök, a açı (radyan), L boy, W yarı en. */
function yaprak(p, a, L, W) {
  const dx = Math.cos(a), dy = Math.sin(a)
  const px = -dy, py = dx
  const u = { x: p.x + dx * L, y: p.y + dy * L }
  // Uca doğru sivri, köke doğru dolgun: kontrol noktaları kökten %40'ta
  const c1 = { x: p.x + dx * L * 0.4 + px * W, y: p.y + dy * L * 0.4 + py * W }
  const c2 = { x: p.x + dx * L * 0.4 - px * W, y: p.y + dy * L * 0.4 - py * W }
  return {
    // Orta nokta: pencerenin içinde mi diye bakılıyor (içerideki yaprak daha soluk)
    orta: { x: p.x + dx * L * 0.5, y: p.y + dy * L * 0.5 },
    govde: `M${f2(p.x)} ${f2(p.y)} Q${f2(c1.x)} ${f2(c1.y)} ${f2(u.x)} ${f2(u.y)} Q${f2(c2.x)} ${f2(c2.y)} ${f2(p.x)} ${f2(p.y)}Z`,
    damar: `M${f2(p.x)} ${f2(p.y)} L${f2(p.x + dx * L * 0.78)} ${f2(p.y + dy * L * 0.78)}`,
  }
}

/* Dal gövdesi: ortahat noktalarından, kalınlığı uca doğru incelen DOLU bir şekil
   (tek kalınlıkta çizgi cansız duruyordu). */
function govdeYolu(noktalar) {
  if (noktalar.length < 2) return ""
  const sol = [], sag = []
  for (const q of noktalar) {
    sol.push([q.x + q.nx * q.k / 2, q.y + q.ny * q.k / 2])
    sag.push([q.x - q.nx * q.k / 2, q.y - q.ny * q.k / 2])
  }
  const yumusak = (dizi) => {
    let d = `${f2(dizi[0][0])} ${f2(dizi[0][1])}`
    for (let i = 1; i < dizi.length - 1; i++) {
      const [x, y] = dizi[i], [x2, y2] = dizi[i + 1]
      d += ` Q${f2(x)} ${f2(y)} ${f2((x + x2) / 2)} ${f2((y + y2) / 2)}`
    }
    const son = dizi[dizi.length - 1]
    return d + ` L${f2(son[0])} ${f2(son[1])}`
  }
  sag.reverse()
  return `M${yumusak(sol)} L${yumusak(sag)} Z`
}

/* Dal tanımları — u aralıkları. `bit` > `bas` ise çevre yönünde, değilse ters.
   Kasten farklı boylar ve kalınlıklar.
   SARILMA HİSSİ: dal kenar çizgisine paralel gitmiyor, onun bir İÇİNE bir
   DIŞINA geçiyor (`ofset` ± `dalga`). Paralel giden dal çifte çerçeve gibi
   okunuyordu (ilk deneme). İçeri geçiş en fazla `icSinir` px — pencerenin iç
   dolgusunu aşmıyor, metne değmiyor.
   KÖK: her dal pencerenin DIŞINDAN gelen kısa bir gövdeyle başlıyor; yoksa dal
   kenarın ortasında kesik bir çizgiyle başlamış gibi görünüyordu. */
const DALLAR = [
  // ANA DAL: sol alttan dışarıdan gelip sol kenarı sarıyor, ÜST KENARIN SONUNA
  // (sağ üst köşeye) kadar TEK PARÇA gidiyor — kartın bir altından bir üstünden.
  // (Önceki hâlde üstte ana dalın ucu + ayrı dolgu filizleri + sağ üst dalın başı
  // arka arkaya diziliyordu; kullanıcı: "örüntü var gibi, dal arka arkaya boşlukla
  // devam ediyor".)
  { bas: 7.25, bit: 10.95, k0: 3.6, k1: 0.75, ofset: 1.6, dalga: 5.4, dalgaBoyu: 115, tohum: 11,
    // cicekIlk: çiçek sol kenarın üst ucunda açsın (kullanıcının sevdiği yer);
    // dal uzayınca 0,45 oranı üst kenarın ortasına kaymıştı.
    cicek: 1, cicekIlk: 0.36, minik: 3, kok: { dx: -16, dy: 14 } },
  // ALT KOL: aynı kökten ALT KENARIN SONUNA kadar tek parça, sağ alt köşeyi dönüp
  // sağ kenardan biraz yukarı tırmanıyor.
  // sik: 0,7 — alt kenar kalabalıktı (kullanıcı: "alttakiler çok fazla, seyrekleştirelim")
  // disOlcek / iceOran (28 Eylül 2026) — kullanıcı: "alt kısımdaki dallar biraz fazla
  // uzun, dışa daha çok çıkmasındansa içeri çıkması daha iyi; tamamını kaldırmayalım,
  // doğal görünmesi önemli". Dışa sürgünler %60 boy; dışa sürgünlerin ~%45'i içe
  // çevriliyor (içe olanlar zaten kısa ve yazının altında soluk çiziliyor).
  { bas: 7.32, bit: 4.86, k0: 2.5, k1: 0.55, ofset: 1.6, dalga: 4.8, dalgaBoyu: 100, tohum: 23,
    cicek: 0, minik: 1, sik: 0.7, disOlcek: 0.6, iceOran: 0.45 },
  // Sağ üst — İÇE DÖNÜK: köşede pencerenin arkasından çıkıp sağ kenardan iniyor,
  // UCU PENCERENİN İÇİNE kıvrılıyor. (İlk hâli dışarı doğru kalın bir kökle
  // başlıyordu — kullanıcı: "dışa dönük, içe dönük olsa daha iyi".)
  { bas: 3.04, bit: 4.58, k0: 2.3, k1: 0.7, ofset: 1.4, dalga: 4.8, dalgaBoyu: 100, tohum: 37,
    cicek: 0, minik: 1, altBasla: true, iceUc: true },
]
const icSinir = 7     // dalın kartın ARKASINDA en fazla gideceği derinlik (px) — görünmez, yalnız dalganın biçimi için
const icUstSinir = 11 // üst/alt kenarda kartın ÜSTÜNDEN geçerken en fazla derinlik (px) — yazının altında kalıyor

// Ana çiçek sayısı — minik çiçekler ve goncalar SAYILMAZ (yoksa önce konan
// minik çiçek, sevilen sol üst çiçeğin yerini kapıyordu).
const anaCicek = (liste) => liste.filter(c => !c.minik && !c.gonca).length

function dalCiz(tanim, g, yogunluk) {
  const rnd = uretec(tanim.tohum)
  // SONRADAN EKLENEN KARARLAR AYRI DİZİDEN: ana diziden bir sayı fazla çekmek
  // sonraki BÜTÜN yaprakların yerini kaydırıyor, beğenilmiş düzen bozuluyordu.
  const rnd2 = uretec(tanim.tohum * 7919 + 17)
  const yon = tanim.bit >= tanim.bas ? 1 : -1
  const aralik = Math.abs(tanim.bit - tanim.bas)
  const noktalar = []
  let u = tanim.bas
  const faz1 = rnd() * 6.28, faz2 = rnd() * 6.28
  // Dalga PİKSEL uzunluğuna bağlı (ilk denemede "u" birimine bağlıydı: uzun üst
  // kenarda dalga neredeyse kayboluyor, dal cetvelle çizilmiş gibi düz kalıyordu).
  let yay = 0, onceki = null
  while ((u - tanim.bas) * yon <= aralik + 1e-6) {
    const c = cevre(u, g)
    if (onceki) yay += Math.hypot(c.x - onceki.x, c.y - onceki.y)
    onceki = c
    const ilerleme = Math.abs(u - tanim.bas) / aralik                // 0 kök → 1 uç
    // Kenara göre uzaklık (+ dışarı, − içeri): uzun dalga kenarı keser, kısa dalga titretir.
    let d = tanim.ofset
      + Math.sin(yay / tanim.dalgaBoyu * 6.28 + faz1) * tanim.dalga
      + Math.sin(yay / 23 + faz2) * 0.7
    if (tanim.altBasla) {
      // Kökü PENCERENİN ARKASINDA: dal dışarıya çıkıntı yapmadan kenarın altından çıkıyor.
      if (ilerleme < 0.1) d = Math.min(d, -3)
    } else {
      d += Math.pow(1 - ilerleme, 2) * 4                             // köke yakın dışarıda
      // KÖK BÖLGESİ DIŞARIDA: dal köşeyi dışarıdan dönmeden kartın altına girerse
      // kökten kopmuş bir sopa gibi görünüyordu (sağ üst dal, ikinci deneme).
      if (ilerleme < 0.2) d = Math.max(d, 2.5 * (1 - ilerleme / 0.2) + 0.8)
    }
    // İçe kıvrılacak uç kenarın üstünde bitsin (kartın altında kaybolmasın)
    if (tanim.iceUc && ilerleme > 0.88) d = 0.5 + (d - 0.5) * 0.2
    // İçeri girişte YUMUŞAK sınır: sert kesme (max) dalgayı düzleştirip kartın
    // üstünde dümdüz bir çubuk bırakıyordu (geniş-alçak pencerede görüldü).
    // ÜST/ALT KENARDA DAHA DERİN (kullanıcı: "dal popup'ın içine hiç girmiyor,
    // üst ve alt kısımda hafif içeriye girebilir, yazı için yeterince pay var"):
    // iç gezinti 2,1 kat derinleşip ~11 px'e kadar iniyor. Kenarın uçlarında bu
    // kat köşe yayına doğru yumuşakça 1'e iniyor — köşede kırık oluşmasın.
    const seg = (((Math.floor(u) % 8) + 8) % 8)
    const kenarAgirlik = (seg === 2 || seg === 6)
      ? Math.min(1, (u - Math.floor(u)) / 0.12, (Math.floor(u) + 1 - u) / 0.12) : 0
    if (d < 0) {
      const kat = 1 + 1.1 * kenarAgirlik
      const sinirD = icSinir + (icUstSinir - icSinir) * kenarAgirlik
      d = -sinirD * (1 - Math.exp(d * kat / sinirD))
    }
    const tx = c.tx * yon, ty = c.ty * yon
    noktalar.push({
      x: c.x + c.nx * d, y: c.y + c.ny * d,
      tx, ty, nx: -ty, ny: tx,
      dnx: c.nx, dny: c.ny,                                        // dışa bakan normal
      k: tanim.k0 + (tanim.k1 - tanim.k0) * Math.pow(ilerleme, 1.15),
      ilerleme, d,
      kose: seg % 2 === 1,
      ustAlt: kenarAgirlik > 0.5,                                  // üst ya da alt kenarın ortası
    })
    const adim = 1 / Math.max(4, Math.ceil(parcaBoyu(u, g) / 4))
    u += adim * yon
  }
  // İÇERİ GEZİNTİLER: dal kenarı her kestiğinde ya kartın ARKASINA girip öbür
  // yanından çıkıyor ya da kartın ÜSTÜNDEN geçiyor — "sarılmış" görüntü bu.
  // Üstten geçiş YALNIZ üst/alt kenarda ve sırayla (bir üstten, bir alttan).
  // Tarihçe: ilk denemede üstten geçiş 4,5 px derinlikle yassı bir çubuk gibi
  // duruyordu ve bırakılmıştı; süs artık yazının ALTINDA çizildiği ve derinlik
  // ~11 px'e çıktığı için kavis doğal kalıyor. Yanlar hep alttan (kullanıcı beğendi).
  {
    let ust = rnd2() < 0.5
    let j = 0
    while (j < noktalar.length) {
      if (noktalar[j].d >= -0.3) { noktalar[j].alt = false; j++; continue }
      let k = j, ustAltSay = 0
      while (k < noktalar.length && noktalar[k].d < -0.3) { if (noktalar[k].ustAlt) ustAltSay++; k++ }
      const kenarda = ustAltSay > (k - j) * 0.6
      let bu = false
      if (kenarda) { ust = !ust; bu = ust }
      for (let m = j; m < k; m++) { noktalar[m].alt = !bu; noktalar[m].ustten = bu }
      j = k
    }
  }
  // Gerçek teğet: dalga kenara paralel değil, noktalar arasından hesaplanıyor
  for (let i = 0; i < noktalar.length; i++) {
    const a = noktalar[Math.max(0, i - 1)], b = noktalar[Math.min(noktalar.length - 1, i + 1)]
    const lx = b.x - a.x, ly = b.y - a.y, l = Math.hypot(lx, ly) || 1
    noktalar[i].tx = lx / l; noktalar[i].ty = ly / l
    noktalar[i].nx = -ly / l; noktalar[i].ny = lx / l
  }
  // KÖK: pencere dışından gelen gövde — ilk noktanın gerisine birkaç nokta
  if (tanim.kok && noktalar.length) {
    const q = noktalar[0]
    const on = []
    for (let s = 3; s >= 1; s--) {
      const t = s / 3
      // Hafif kavisli: kök yönü ile dalın ilk teğeti arasında
      const x = q.x + tanim.kok.dx * t - q.tx * 4 * t * (1 - t)
      const y = q.y + tanim.kok.dy * t - q.ty * 4 * t * (1 - t)
      on.push({ ...q, x, y, k: tanim.k0 * (1 + 0.25 * t), ilerleme: 0 })
    }
    noktalar.unshift(...on)
    for (let i = 0; i < 3; i++) {
      const a = noktalar[i], b = noktalar[i + 1]
      const lx = b.x - a.x, ly = b.y - a.y, l = Math.hypot(lx, ly) || 1
      a.tx = lx / l; a.ty = ly / l; a.nx = -ly / l; a.ny = lx / l
    }
  }

  const yapraklar = [], surgunler = [], kivrimlar = [], cicekler = []
  let minikSay = 0
  let i = 5
  let taraf = rnd() < 0.5 ? 1 : -1
  while (i < noktalar.length - 3) {
    const q = noktalar[i]
    if (q.alt) { i += 2; continue }          // kartın arkasında: görünmeyen yere yaprak takılmaz
    taraf = -taraf
    // Dal içerideyken içe dönen sürgün METNE yaklaşır → o zaman hep dışa
    let disa = taraf > 0 || q.d < 0 || rnd() < 0.3
    // İçe çevirme kararı AYRI diziden (rnd2) — ana dizinin çekim sırası bozulmasın.
    // Dal kartın içindeyken (d<0) çevrilmiyor: o zaman içe sürgün metne fazla yaklaşır.
    if (disa && tanim.iceOran && q.d >= 0 && rnd2() < tanim.iceOran) disa = false
    const nx = disa ? q.dnx : -q.dnx, ny = disa ? q.dny : -q.dny
    const ileriA = Math.atan2(q.ty, q.tx), yanA = Math.atan2(ny, nx)
    let fark = yanA - ileriA
    while (fark > Math.PI) fark -= 2 * Math.PI
    while (fark < -Math.PI) fark += 2 * Math.PI
    const a = ileriA + fark * (0.4 + rnd() * 0.35)
    // İçe dönen sürgün artık pencereye girebiliyor (kullanıcı: "yazıyı aşırı
    // engellemediği sürece sorun yok"). Süs yazının ALTINDA çizildiği için harfleri
    // örtmüyor; köşelerde (yazı yok) tam boy, kenarlarda biraz kısa.
    const sinir = disa ? (tanim.disOlcek ?? 1) : (q.kose ? 1 : 0.75)
    const sik = tanim.sik ?? 1
    if (rnd() < 0.5 * yogunluk * sik && q.ilerleme < 0.93) {
      // SÜRGÜN — ucunda 1-3 yapraklık küme
      const L = (13 + rnd() * 14) * sinir * (1 - q.ilerleme * 0.35)
      const bukum = (rnd() - 0.5) * 1.1
      const c = { x: q.x + Math.cos(a + bukum) * L * 0.55, y: q.y + Math.sin(a + bukum) * L * 0.55 }
      const son = { x: q.x + Math.cos(a) * L, y: q.y + Math.sin(a) * L }
      surgunler.push({
        d: `M${f2(q.x)} ${f2(q.y)} Q${f2(c.x)} ${f2(c.y)} ${f2(son.x)} ${f2(son.y)}`,
        k: Math.max(0.6, q.k * 0.42),
      })
      const sonA = Math.atan2(son.y - c.y, son.x - c.x)
      // Çiçek: ortadan sonra ilk uygun dışa sürgünün ucunda — şansa bırakılmıyor
      // (dar pencerede hiç çıkmamıştı).
      if (tanim.cicek && disa && q.ilerleme > (tanim.cicekIlk ?? 0.45) && anaCicek(cicekler) < tanim.cicek) {
        cicekler.push({ x: son.x, y: son.y, r: 4 + rnd() * 1.3, don: rnd() * 72 })
        yapraklar.push(yaprak(son, sonA + 2.3, 8 + rnd() * 3, 3.2))
      } else if (tanim.minik && disa && minikSay < tanim.minik && q.ilerleme > 0.12 && rnd() < 0.22) {
        // MİNİK ÇİÇEK — dal boyunca seyrek, rastgele (kullanıcı: "ufak minik
        // çiçekler olabilir; sol üstteki gibi tamamen rastgele dursun")
        minikSay++
        cicekler.push({ x: son.x, y: son.y, r: 2.1 + rnd() * 0.9, don: rnd() * 72, minik: true })
        yapraklar.push(yaprak(son, sonA + (rnd() < 0.5 ? 2.2 : -2.2), 6 + rnd() * 2, 2.2))
      } else {
        // SEYRELTME — "çizilsin mi" kararları AYRI diziden (rnd2), ölçüler hep
        // aynı sırayla ana diziden çekiliyor. Ana diziden çekim atlanırsa sonraki
        // bütün yaprakların yeri kayıyor, beğenilmiş yanlar bozuluyordu.
        //   • %15 ÇIPLAK UÇ (kullanıcı: "her uçta çiçek olmasına gerek yok")
        //   • ikinci yaprak eskiden %55, artık ~%30 (0,55 × 0,55)
        const ciplak = rnd2() < 0.15
        const buyuk = (8 + rnd() * 6) * sinir + 3
        const a1 = sonA + (rnd() - 0.5) * 0.4, g1 = buyuk * (0.33 + rnd() * 0.08)
        if (!ciplak) yapraklar.push(yaprak(son, a1, buyuk, g1))
        if (disa && rnd() < 0.55) {
          const yan = rnd() < 0.5 ? 1 : -1
          const l2 = buyuk * (0.65 + rnd() * 0.2)
          const a2 = sonA + yan * (0.7 + rnd() * 0.3)
          if (!ciplak && rnd2() < 0.55) yapraklar.push(yaprak(son, a2, l2, l2 * 0.36))
        }
      }
      if (rnd() < 0.45) {
        const m = { x: q.x + (son.x - q.x) * 0.45, y: q.y + (son.y - q.y) * 0.45 }
        const l3 = (5 + rnd() * 4) * sinir + 2
        yapraklar.push(yaprak(m, sonA + (rnd() < 0.5 ? 1 : -1) * 0.95, l3, l3 * 0.36))
      }
    } else if (rnd() < 0.75 * (tanim.sik ?? 1)) {
      // Gövdeden doğrudan yaprak
      const l = (7 + rnd() * 6) * (disa ? 1 : 0.6)
      yapraklar.push(yaprak(q, a, l, l * (0.33 + rnd() * 0.07)))
    }
    // Ara sıra sarmal filiz (asmanın tutunma kıvrımı) — yalnız dışa
    if (disa && q.d > 0 && rnd() < 0.12 * yogunluk && kivrimlar.length < 2) {
      let d = `M${f2(q.x)} ${f2(q.y)}`
      const r0 = 5.5 + rnd() * 2, don = rnd() < 0.5 ? 1 : -1
      const merkez = { x: q.x + Math.cos(a) * r0, y: q.y + Math.sin(a) * r0 }
      const a0 = a + Math.PI
      for (let s = 1; s <= 18; s++) {
        const t = s / 18
        const aa = a0 + don * t * Math.PI * 2.5
        const rr = r0 * (1 - t * 0.8)
        d += ` L${f2(merkez.x + Math.cos(aa) * rr)} ${f2(merkez.y + Math.sin(aa) * rr)}`
      }
      kivrimlar.push(d)
    }
    i += Math.round((3 + Math.floor(rnd() * 4)) / (tanim.sik ?? 1))
  }
  // ÇİÇEK YEDEĞİ: sürgünlerden hiçbiri uymadıysa (dar pencerede oldu) dalın
  // görünen, dışarıda kalan bir noktasına kısa bir sürgünle çiçek konuyor.
  if (tanim.cicek && anaCicek(cicekler) < tanim.cicek) {
    const aday = noktalar
      .filter(q => !q.alt && q.d >= 0 && q.ilerleme > 0.35 && q.ilerleme < 0.8)
      .sort((x, y) => Math.abs(x.ilerleme - 0.55) - Math.abs(y.ilerleme - 0.55))[0]
    if (aday) {
      const a = Math.atan2(aday.dny, aday.dnx) + 0.5
      const son = { x: aday.x + Math.cos(a) * 11, y: aday.y + Math.sin(a) * 11 }
      surgunler.push({ d: `M${f2(aday.x)} ${f2(aday.y)} L${f2(son.x)} ${f2(son.y)}`, k: Math.max(0.6, aday.k * 0.42) })
      cicekler.push({ x: son.x, y: son.y, r: 4.4, don: 18 })
      yapraklar.push(yaprak(son, a + 2.3, 9, 3.2))
    }
  }
  {
    // Dalın ucu kıl gibi incelip bitmesin: uçta bir yaprak
    const q = noktalar[noktalar.length - 1]
    if (!q.alt && !tanim.tomurcuk) yapraklar.push(yaprak(q, Math.atan2(q.ty, q.tx), 10, 3.4))
  }
  if (tanim.iceUc) {
    // UÇ İÇE KIVRILIYOR: son noktadan pencerenin içine doğru bükülen bir sürgün,
    // ucunda sarmal filiz ve gonca.
    const q = noktalar[noktalar.length - 1]
    const ileriA = Math.atan2(q.ty, q.tx)
    const icA = Math.atan2(-q.dny, -q.dnx)
    let fark = icA - ileriA
    while (fark > Math.PI) fark -= 2 * Math.PI
    while (fark < -Math.PI) fark += 2 * Math.PI
    // Boy/derinlik ölçülü: geniş-alçak pencerede 24 px'lik uç satır sonuna değiyordu
    const L = 20
    const ara = { x: q.x + Math.cos(ileriA + fark * 0.25) * L * 0.55, y: q.y + Math.sin(ileriA + fark * 0.25) * L * 0.55 }
    const sonA = ileriA + fark * 0.62
    const son = { x: q.x + Math.cos(sonA) * L, y: q.y + Math.sin(sonA) * L }
    surgunler.push({
      d: `M${f2(q.x)} ${f2(q.y)} Q${f2(ara.x)} ${f2(ara.y)} ${f2(son.x)} ${f2(son.y)}`,
      k: Math.max(0.8, q.k * 0.8),
    })
    yapraklar.push(yaprak(ara, sonA - 1.1, 9, 3.1))
    yapraklar.push(yaprak(son, sonA + 0.9, 8, 2.8))
    // Sarmal filiz — içe doğru kıvrılıyor
    {
      const r0 = 4.6, don = fark > 0 ? 1 : -1
      const merkez = { x: son.x + Math.cos(sonA) * r0, y: son.y + Math.sin(sonA) * r0 }
      let d = `M${f2(son.x)} ${f2(son.y)}`
      for (let s2 = 1; s2 <= 18; s2++) {
        const t = s2 / 18
        const aa = sonA + Math.PI + don * t * Math.PI * 2.4
        const rr = r0 * (1 - t * 0.8)
        d += ` L${f2(merkez.x + Math.cos(aa) * rr)} ${f2(merkez.y + Math.sin(aa) * rr)}`
      }
      kivrimlar.push(d)
    }
    const g2 = { x: q.x + (son.x - q.x) * 0.72, y: q.y + (son.y - q.y) * 0.72 }
    cicekler.push({ x: g2.x + Math.cos(sonA - 1.4) * 3.5, y: g2.y + Math.sin(sonA - 1.4) * 3.5, r: 2.3, gonca: true, don: 0 })
  }
  if (tanim.tomurcuk) {
    const q = noktalar[noktalar.length - 1]
    const a = Math.atan2(q.ty, q.tx)
    yapraklar.push(yaprak(q, a + 0.35, 7, 2.6))
    yapraklar.push(yaprak(q, a - 0.35, 7, 2.6))
    cicekler.push({ x: q.x + Math.cos(a) * 4, y: q.y + Math.sin(a) * 4, r: 2.3, gonca: true, don: 0 })
  }
  // Kartın üstünden geçen parçalar ayrıca çiziliyor (dış maske onları gizlemesin)
  const ustParcalar = []
  let parca = []
  noktalar.forEach((q, j) => {
    if (q.ustten) {
      if (!parca.length && j > 0) parca.push(noktalar[j - 1])
      parca.push(q)
    } else if (parca.length) {
      parca.push(q); ustParcalar.push(govdeYolu(parca)); parca = []
    }
  })
  if (parca.length > 1) ustParcalar.push(govdeYolu(parca))
  return { govde: govdeYolu(noktalar), ustParcalar, yapraklar, surgunler, kivrimlar, cicekler }
}

/* ── BOŞLUK DOLGUSU ─────────────────────────────────────────────────────────
   Ana dalların kapsamadığı çevre aralıkları bulunup her birine, pencerenin
   ARKASINDAN çıkan kısa bir filiz konuyor (kullanıcı: "boş kısımları rastgele
   dolduralım, şuanki kısımlar çok güzel"). Ana dallara dokunulmuyor.
   Aralık uzunluğu PİKSEL olarak ölçülüyor: aynı "u" aralığı geniş pencerede
   uzun, dar pencerede kısa bir boşluk demek. Rastgelelik boşluğun konumundan
   tohumlanıyor → her açılışta aynı, ama elle dizilmiş gibi değil. */
function boslukDallari(g) {
  const araliklar = []
  for (const t of DALLAR) {
    let a = Math.min(t.bas, t.bit), b = Math.max(t.bas, t.bit)
    while (a >= 8) { a -= 8; b -= 8 }
    if (b > 8) { araliklar.push([a, 8]); araliklar.push([0, b - 8]) } else araliklar.push([a, b])
  }
  araliklar.sort((x, y) => x[0] - y[0])
  const birlesik = []
  for (const [a, b] of araliklar) {
    const son = birlesik[birlesik.length - 1]
    if (son && a <= son[1]) son[1] = Math.max(son[1], b)
    else birlesik.push([a, b])
  }
  // Çember üzerinde boşluklar (sondan başa sarma dahil)
  const bosluk = []
  for (let i = 0; i < birlesik.length; i++) {
    const a = birlesik[i][1]
    const b = i + 1 < birlesik.length ? birlesik[i + 1][0] : birlesik[0][0] + 8
    if (b - a > 0.01) bosluk.push([a, b])
  }
  const pikselBoyu = (a, b) => {
    let top = 0
    for (let u = a; u < b; ) {
      const ust = Math.min(b, Math.floor(u) + 1)
      top += (ust - u) * parcaBoyu(u, g)
      u = ust
    }
    return top
  }
  const dallar = []
  bosluk.forEach(([a, b], i) => {
    const px = pikselBoyu(a, b)
    if (px < 34) return                                  // birkaç yapraklık boşluk: nefes payı kalsın
    const rnd = uretec(1000 + Math.round(a * 97) + i * 13)
    // Kısa boşlukta tek filiz, uzunda iki filiz (karşılıklı ya da aynı yöne)
    const adet = px > 170 ? 2 : 1
    for (let k = 0; k < adet; k++) {
      const dilim = (b - a) / adet
      const d0 = a + dilim * k, d1 = d0 + dilim
      const pay = dilim * (0.08 + rnd() * 0.1)
      const ileri = rnd() < 0.5
      dallar.push({
        bas: ileri ? d0 + pay : d1 - pay,
        bit: ileri ? d1 - pay * 1.6 : d0 + pay * 1.6,
        k0: 1.5 + rnd() * 0.5, k1: 0.45, ofset: 1.3, dalga: 3.6 + rnd() * 1.2,
        dalgaBoyu: 70 + rnd() * 30, tohum: 1000 + Math.round(a * 131) + k * 7 + i,
        cicek: 0, altBasla: true,
      })
    }
  })
  return dallar
}

/* ── RENK: TEMADAN, AMA DALA YAKIŞACAK HÂLE GETİRİLMİŞ ─────────────────────
   Kullanıcı: "Sepya harici temaların ana renkleri güzel ama beğenemedim."
   Gerçek temalarla çizilip bakıldı; sebep ÜÇ:
     1) Doygunluk. Sepya'nın vurgusu %40 doygun — ahşap/mürekkep rengi. Koyu
        (%86 mavi) ve Gece (%97 neon turkuaz) dalı elektrik kablosu gibi
        gösteriyordu; doğada neon dal yok.
     2) Saydamlık koyu zeminde rengi boğuyordu: açık zemine göre ayarlı
        saydamlıklar karanlığa karışıp çamurlaşıyor (Kahve'de dal kayboluyordu).
     3) Yaprak altı dolgusu pencere rengiyle yapılıyordu; pencere DIŞINDAKİ
        yaprak da o renkle doluyor, koyu temalarda leke gibi duruyordu.
   Çözüm: ton temadan, doygunluk Sepya düzeyinde sınırlı (en fazla %48),
   parlaklık zemine göre (açık zeminde koyu mürekkep, koyu zeminde açık).
   Sepya ve Açık tema bu sınırların İÇİNDE → renkleri hiç değişmiyor. */
function hexRgb(h) {
  const m = /^#?([0-9a-f]{6})$/i.exec(String(h || "").trim())
  if (!m) return null
  const n = parseInt(m[1], 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}
function rgbHsl([r, g, b]) {
  r /= 255; g /= 255; b /= 255
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2
  if (mx === mn) return [0, 0, l]
  const d = mx - mn
  const s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn)
  let h = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4
  return [h * 60, s, l]
}
function hslHex(h, s, l) {
  const f = (n) => {
    const k = (n + h / 30) % 12
    const a = s * Math.min(l, 1 - l)
    const c = l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1))
    return Math.round(c * 255).toString(16).padStart(2, "0")
  }
  return `#${f(0)}${f(8)}${f(4)}`
}
const parlaklik = (rgb) => {
  const [r, g, b] = rgb.map(v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4) })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}
export function dalPaleti(renk, sayfa) {
  const rgb = hexRgb(renk)
  const zeminRgb = hexRgb(sayfa)
  const koyu = zeminRgb ? parlaklik(zeminRgb) < 0.3 : false
  if (!rgb) return { dal: renk, koyu }
  const [h, s, l] = rgbHsl(rgb)
  const s2 = Math.min(s, 0.48)
  const l2 = koyu ? Math.min(0.68, Math.max(0.56, l)) : Math.min(0.42, Math.max(0.28, l))
  return { dal: hslHex(h, s2, l2), koyu }
}

export default function DalSusu({ en, boy, renk, zemin, sayfa, yaricap = 14, yogunluk = 1 }) {
  const kimlik = useId().replace(/:/g, "")
  const maskeId = `dal-kart-${kimlik}`
  const icMaskeId = `dal-ic-${kimlik}`
  const cizim = useMemo(() => {
    if (!en || !boy) return null
    const g = { x0: TASMA, y0: TASMA, w: en, h: boy, r: Math.min(yaricap, en / 4, boy / 4) }
    return [...DALLAR, ...boslukDallari(g)].map(t => dalCiz(t, g, yogunluk))
  }, [en, boy, yaricap, yogunluk])
  const { dal, koyu } = useMemo(() => dalPaleti(renk, sayfa || zemin), [renk, sayfa, zemin])

  if (!cizim) return null
  // Koyu zeminde saydamlık rengi boğuyor → daha dolu çiziliyor (bkz. RENK notu)
  const op = koyu
    ? { govde: 0.9, surgun: 0.85, yaprakDolgu: 0.3, yaprakCizgi: 0.85, icDolgu: 0.16, icCizgi: 0.5, kivrim: 0.6, gonca: 0.75 }
    : { govde: 0.78, surgun: 0.72, yaprakDolgu: 0.4, yaprakCizgi: 0.7, icDolgu: 0.2, icCizgi: 0.45, kivrim: 0.45, gonca: 0.55 }
  const W = en + TASMA * 2, H = boy + TASMA * 2
  const rx = Math.min(yaricap, en / 4, boy / 4)
  return (
    <svg
      aria-hidden="true"
      width={W} height={H}
      style={{
        position: "absolute", left: -TASMA, top: -TASMA,
        pointerEvents: "none", overflow: "visible",
        // YAZININ ALTINDA: pencere (position:fixed + z-index) kendi yığın bağlamını
        // kuruyor; -1 bu bağlamda arka planın ÜSTÜNE ama içerikteki yazının ALTINA
        // düşüyor. İçeri uzanan yaprak harflerin üstüne binmiyor, arkasında kalıyor.
        zIndex: -1,
      }}
    >
      {/* KART DIŞI MASKESİ: gövdenin kartın üstüne düşen kısmı gizlenir → dal
          kartın ARKASINDAN geçiyormuş gibi görünür. İÇ MASKE tam tersi: yaprak
          altı dolgusu içeride pencere, dışarıda sayfa rengiyle yapılsın diye. */}
      <defs>
        <mask id={maskeId} maskUnits="userSpaceOnUse" x="0" y="0" width={W} height={H}>
          <rect x="0" y="0" width={W} height={H} fill="#fff" />
          <rect x={TASMA} y={TASMA} width={en} height={boy} rx={rx} fill="#000" />
        </mask>
        <mask id={icMaskeId} maskUnits="userSpaceOnUse" x="0" y="0" width={W} height={H}>
          <rect x="0" y="0" width={W} height={H} fill="#000" />
          <rect x={TASMA} y={TASMA} width={en} height={boy} rx={rx} fill="#fff" />
        </mask>
      </defs>
      {cizim.map((c, i) => (
        <g key={i}>
          {c.surgunler.map((s, j) => (
            <path key={`s${j}`} d={s.d} fill="none" stroke={dal} strokeOpacity={op.surgun}
              strokeWidth={s.k} strokeLinecap="round" />
          ))}
          <path d={c.govde} fill={dal} fillOpacity={op.govde} mask={`url(#${maskeId})`} />
          {c.ustParcalar.map((d, j) => (
            <path key={`u${j}`} d={d} fill={dal} fillOpacity={op.govde} />
          ))}
          {c.kivrimlar.map((d, j) => (
            <path key={`k${j}`} d={d} fill="none" stroke={dal} strokeOpacity={op.kivrim}
              strokeWidth="0.7" strokeLinecap="round" strokeLinejoin="round" />
          ))}
          {c.yapraklar.map((y, j) => {
            // Pencerenin içindeki yaprak (yazının arkasında) daha soluk: okumayı yormasın
            const ic = y.orta.x > TASMA + 4 && y.orta.x < TASMA + en - 4 && y.orta.y > TASMA + 4 && y.orta.y < TASMA + boy - 4
            return (
              <g key={`y${j}`}>
                {/* Yaprak altı dolgusu: çerçeve çizgisi yaprağın içinden görünmesin.
                    İçeride PENCERE, dışarıda SAYFA rengiyle — tek renk kullanılınca
                    koyu temalarda dışarıdaki yapraklar leke gibi duruyordu. */}
                {zemin && <path d={y.govde} fill={zemin} mask={`url(#${icMaskeId})`} />}
                {sayfa && <path d={y.govde} fill={sayfa} mask={`url(#${maskeId})`} />}
                <path d={y.govde} fill={dal} fillOpacity={ic ? op.icDolgu : op.yaprakDolgu} stroke={dal}
                  strokeOpacity={ic ? op.icCizgi : op.yaprakCizgi} strokeWidth="0.6" strokeLinejoin="round" />
                {/* Damar: açık zeminde zemin renginde açık çizgi, koyu zeminde dal renginde */}
                <path d={y.damar} stroke={koyu ? dal : (zemin || dal)} strokeOpacity={koyu ? 0.55 : (zemin ? 0.75 : 0.4)}
                  strokeWidth="0.55" strokeLinecap="round" />
              </g>
            )
          })}
          {c.cicekler.map((ck, j) => ck.gonca ? (
            <circle key={`c${j}`} cx={ck.x} cy={ck.y} r={ck.r} fill={dal} fillOpacity={op.gonca} />
          ) : (
            <g key={`c${j}`} transform={`translate(${f2(ck.x)} ${f2(ck.y)}) rotate(${f2(ck.don)})`}>
              {[0, 72, 144, 216, 288].map(d => (
                <ellipse key={d} cx="0" cy={-ck.r * 0.95} rx={ck.r * 0.55} ry={ck.r * 0.95}
                  transform={`rotate(${d})`}
                  fill={sayfa || zemin || "transparent"} stroke={dal} strokeOpacity={koyu ? 0.8 : 0.6} strokeWidth="0.6" />
              ))}
              {[0, 72, 144, 216, 288].map(d => (
                <ellipse key={`i${d}`} cx="0" cy={-ck.r * 0.95} rx={ck.r * 0.55} ry={ck.r * 0.95}
                  transform={`rotate(${d})`} fill={dal} fillOpacity={koyu ? 0.3 : 0.22} />
              ))}
              <circle r={ck.r * 0.38} fill={dal} fillOpacity="0.9" />
            </g>
          ))}
        </g>
      ))}
    </svg>
  )
}
