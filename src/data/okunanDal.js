/* ═══════════════════════════════════════════════════════════════════════════
   VUKUF — OKUNAN ÂYETİN ALT DALI ("Alt bant → Dal")
   src/data/okunanDal.js

   Kelimelerin altında tekrar eden uzun bir sarmaşık şeridi: oval kıvrımlı gövde, ortası
   damarlı yapraklar, yer yer küçük hatâyî çiçeği, lâle tomurcuğu ve kıvrık filiz. Gövde ve
   yapraklar rozet dalının renginde (âyet no rengi; temaya göre değişir), çiçekler rozetteki
   çiçeğin renk dilinden (CiniAyetRozeti → cicekRenkleri).
   "Dallar hafifçe salınsın" açıkken yapraklar, çiçekler ve tomurcuklar tabanlarından hafifçe
   sallanır (SVG içi animasyon; gövde sabit, sayfa düzenine dokunmaz).
   Şerit 12 yazı eni uzunluğunda ve 3 çeşidi var (âyete göre seçilir) → her yer aynı görünmez.
   Desen kelimeden kelimeye kesilmesin diye her kelime şeridi kendi satırdaki yerine göre
   kaydırır (MushafKelime: background-position = -offsetLeft) → satır boyunca tek dal.
   ═══════════════════════════════════════════════════════════════════════════ */

import { cicekRenkleri } from "../components/CiniAyetRozeti"

const W = 480, H = 24, Y0 = 12          // şerit kutusu (svg birimi) ve gövdenin orta çizgisi
const YARIM = 40                         // yarım dalga eni → 12 yarım dalga, uçlar aynı evrede
export const DAL_EN = 12                 // şerit eni (yazı boyutunun katı)
export const DAL_BOY = (DAL_EN * H) / W  // şerit boyu (yazı boyutunun katı)
export const DAL_ORAN = W / H            // en / boy
export const DAL_CESIT = 3

// Sabit tohumlu sözde-rastgele (aynı çeşit hep aynı çizilir)
function tohumlu(t) {
  let s = t >>> 0
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296 }
}
const f = (n) => Math.round(n * 100) / 100

// İki rengi karıştır (y: a'nın yüzdesi); hex değilse a döner
function hexRgb(h) {
  const m = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(String(h || "").trim())
  if (!m) return null
  const t = m[1].length === 3 ? m[1].split("").map(c => c + c).join("") : m[1]
  return [0, 2, 4].map(i => parseInt(t.slice(i, i + 2), 16))
}
function karis(a, b, y) {
  const x = hexRgb(a), z = hexRgb(b)
  if (!x || !z) return a
  return "#" + x.map((v, i) => Math.round(v * y / 100 + z[i] * (100 - y) / 100).toString(16).padStart(2, "0")).join("")
}

// Salınım: öğe (x, y) tabanı çevresinde ±genlik derece döner; süre ve başlangıç öğeye göre
let salRnd = null
function salla(x, y, icerik, genlik) {
  if (!salRnd) return icerik
  const sure = 2.8 + salRnd() * 1.6, bas = salRnd() * sure
  const d = `${f(genlik)} ${f(x)} ${f(y)}`, e = `${f(-genlik * 0.6)} ${f(x)} ${f(y)}`
  return `<g><animateTransform attributeName='transform' type='rotate' values='${e};${d};${e}' keyTimes='0;.5;1' calcMode='spline' keySplines='.45 0 .55 1;.45 0 .55 1' dur='${f(sure)}s' begin='-${f(bas)}s' repeatCount='indefinite'/>${icerik}</g>`
}

function yaprak(x, y, aci, boy, renk, damar) {
  const en = boy * 0.4
  return salla(x, y, `<g transform='translate(${f(x)} ${f(y)}) rotate(${f(aci)})'>`
    + `<path d='M0 0 C${f(boy * 0.28)} ${f(-en)} ${f(boy * 0.74)} ${f(-en * 0.95)} ${f(boy)} 0 C${f(boy * 0.7)} ${f(en * 0.62)} ${f(boy * 0.3)} ${f(en * 0.72)} 0 0Z' fill='${renk}'/>`
    + `<path d='M${f(boy * 0.08)} 0 Q${f(boy * 0.5)} ${f(-en * 0.18)} ${f(boy * 0.9)} ${f(-en * 0.04)}' fill='none' stroke='${damar}' stroke-width='.45' stroke-linecap='round' opacity='.7'/>`
    + `</g>`, 9)
}
function cicek(x, y, r, c, don) {
  let s = `<g transform='translate(${f(x)} ${f(y)}) rotate(${f(don)})'>`
  for (let i = 0; i < 5; i++) {
    s += `<ellipse cx='0' cy='${f(-r * 0.62)}' rx='${f(r * 0.42)}' ry='${f(r * 0.62)}' fill='${c.tacOrta}' transform='rotate(${i * 72})'/>`
  }
  s += `<circle r='${f(r * 0.42)}' fill='${c.tacIc}'/><circle r='${f(r * 0.2)}' fill='${c.gobek}'/></g>`
  return salla(x, y, s, 7)
}
function tomurcuk(x, y, aci, boy, c) {
  return salla(x, y, `<g transform='translate(${f(x)} ${f(y)}) rotate(${f(aci)})'>`
    + `<path d='M0 0 C${f(-boy * 0.42)} ${f(-boy * 0.3)} ${f(-boy * 0.36)} ${f(-boy * 0.8)} 0 ${f(-boy)} C${f(boy * 0.36)} ${f(-boy * 0.8)} ${f(boy * 0.42)} ${f(-boy * 0.3)} 0 0Z' fill='${c.tacOrta}'/>`
    + `<path d='M0 ${f(-boy * 0.15)} C${f(-boy * 0.12)} ${f(-boy * 0.45)} ${f(-boy * 0.08)} ${f(-boy * 0.7)} 0 ${f(-boy * 0.85)}' fill='none' stroke='${c.tacIc}' stroke-width='.5' opacity='.8'/>`
    + `<path d='M0 0 C${f(-boy * 0.5)} ${f(-boy * 0.05)} ${f(-boy * 0.55)} ${f(-boy * 0.3)} ${f(-boy * 0.42)} ${f(-boy * 0.42)} C${f(-boy * 0.25)} ${f(-boy * 0.2)} ${f(-boy * 0.1)} ${f(-boy * 0.08)} 0 0Z' fill='${c.yaprak}'/>`
    + `<path d='M0 0 C${f(boy * 0.5)} ${f(-boy * 0.05)} ${f(boy * 0.55)} ${f(-boy * 0.3)} ${f(boy * 0.42)} ${f(-boy * 0.42)} C${f(boy * 0.25)} ${f(-boy * 0.2)} ${f(boy * 0.1)} ${f(-boy * 0.08)} 0 0Z' fill='${c.yaprakAcik}'/>`
    + `</g>`, 8)
}
function filiz(x, y, yon, c) {
  // küçük kıvrık sürgün (yön: -1 yukarı, 1 aşağı)
  const d = yon
  return `<path d='M${f(x)} ${f(y)} q1.6 ${f(2.8 * d)} 4.4 ${f(3.2 * d)} q2 ${f(0.1 * d)} 1.6 ${f(-1.6 * d)} q-0.5 ${f(-1.1 * d)} -1.7 ${f(-0.3 * d)}' fill='none' stroke='${c.dal}' stroke-width='.7' stroke-linecap='round' opacity='.85'/>`
}

const bellek = new Map()
/** renk: rozet dalı rengi (âyet no rengi) · zemin / yazi: tema renkleri · cesit: 0..DAL_CESIT-1
    hareket: salınım → data URI */
export function dalSeridi(renk, zemin, yazi, cesit = 0, hareket = false) {
  const anahtar = `${renk}|${zemin}|${yazi}|${cesit}|${hareket ? 1 : 0}`
  const hazir = bellek.get(anahtar)
  if (hazir) return hazir
  const c = {
    ...cicekRenkleri(renk, zemin, yazi),                // çiçek renkleri
    dal: renk, yaprak: renk, yaprakAcik: karis(renk, zemin, 62),
  }
  const damarKoyu = karis(renk, zemin, 45)            // koyu yaprakta açık damar
  const rnd = tohumlu(7 + cesit * 1013)
  // Salınım değerleri ayrı dizi → desen hareket açık/kapalı aynı kalır
  salRnd = hareket ? tohumlu(91 + cesit * 37) : null
  const A = 3.6                                       // kıvrım yüksekliği (oval tepe)
  // GÖVDE — oval yarım dalgalar; düğümlerde eğim eşit → kırık yok, uçlar aynı evrede (dikişsiz)
  let govde = `M0 ${Y0}`
  for (let i = 0; i < W / YARIM; i++) {
    const x = i * YARIM, s = i % 2 ? 1 : -1
    govde += ` C${x + 9} ${f(Y0 + s * A * 1.33)} ${x + 31} ${f(Y0 + s * A * 1.33)} ${x + YARIM} ${Y0}`
  }
  // Gövde üstündeki nokta (yarım dalga i, 0..1 arası t) — yaklaşık: kosinüs tepe
  const nokta = (i, t) => {
    const s = i % 2 ? 1 : -1
    return [i * YARIM + t * YARIM, Y0 + s * A * Math.sin(Math.PI * t)]
  }
  let alt = "", ust = ""
  // Çiçek ve tomurcuk yerleri çeşide göre kayar (her şeritte 2 çiçek, 2 tomurcuk)
  const cicekYeri = new Set([(1 + cesit * 5) % 12, (6 + cesit * 3) % 12])
  const tomurcukYeri = new Set([(3 + cesit * 2) % 12, (9 + cesit) % 12])
  for (let i = 0; i < W / YARIM; i++) {
    const s = i % 2 ? 1 : -1                          // s=-1 tepe yukarıda, 1 aşağıda
    const [tx, ty] = nokta(i, 0.5)
    if (cicekYeri.has(i)) {
      // gövdenin üstünde çiçek, iki yanında yaprak
      alt += yaprak(tx - 2.5, ty, 180 + s * (25 + rnd() * 15), 7.5, c.yaprak, damarKoyu)
      alt += yaprak(tx + 2.5, ty, s * (25 + rnd() * 15), 7.5, c.yaprakAcik, c.dal)
      ust += cicek(tx, ty, 3.9 + rnd() * 0.5, c, rnd() * 72)
    } else if (tomurcukYeri.has(i)) {
      ust += tomurcuk(tx, ty, s < 0 ? -12 + rnd() * 24 : 168 + rnd() * 24, 7 + rnd() * 1.4, c)
      alt += yaprak(tx + 1, ty, s < 0 ? 20 + rnd() * 15 : -20 - rnd() * 15, 6.5, c.yaprakAcik, c.dal)
    } else {
      // tepeden dışa bir yaprak, çoğu zaman yanında ikincisi
      const boy = 8 + rnd() * 2.5
      const aci = s < 0 ? -(130 + rnd() * 25) : 130 + rnd() * 25
      const koyu = rnd() < 0.5
      alt += yaprak(tx - 1.5, ty, aci, boy, koyu ? c.yaprak : c.yaprakAcik, koyu ? damarKoyu : c.dal)
      if (rnd() < 0.7) alt += yaprak(tx + 1.5, ty, s < 0 ? -(25 + rnd() * 25) : 25 + rnd() * 25, boy * 0.8, c.yaprakAcik, c.dal)
    }
    // yamaçta küçük yaprak ya da kıvrık filiz (dışa doğru)
    const r = rnd()
    if (r < 0.4) { const [x, y] = nokta(i, 0.85); alt += yaprak(x, y, s < 0 ? -(30 + rnd() * 20) : 30 + rnd() * 20, 5.5, c.yaprak, damarKoyu) }
    else if (r < 0.65) { const [x, y] = nokta(i, 0.82); alt += filiz(x, y, s, c) }
  }
  const susler = alt + ust
  // preserveAspectRatio none: piksele yuvarlanan karo boyunda kenarlarda boşluk kalmasın
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 ${W} ${H}' preserveAspectRatio='none'>`
    + `<path d='${govde}' fill='none' stroke='${c.dal}' stroke-width='1.05' stroke-linecap='round' opacity='.85'/>`
    + `<g opacity='.92'>${susler}</g></svg>`
  salRnd = null
  const v = `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`
  bellek.set(anahtar, v)
  return v
}
