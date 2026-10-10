/* ═══════════════════════════════════════════════════════════════════════════
   VUKUF — GİRİŞ EKRANI ÇERÇEVESİ (cetvel + köşebent)
   src/components/GirisCercevesi.jsx

   10 Ekim 2026. Açılıştaki giriş ekranında (App.jsx, girisVar) rozeti çevreleyen
   mushaf sayfası çerçevesi. Sayfa geçişindeki "yükleniyor" ekranında KULLANILMAZ
   (her geçişte süslü ekran yorucu olur).
   • Cetvel: ekran kenarından içeride çift ince çizgi (dış belirgin, iç soluk).
   • Köşebent: her köşede rozetteki dilin çeyreği — köşede düğüm, köşeden içeri
     bakan kafesli badem, iki kenar boyunca kıvrılan hilal demetleri.
   • Açılış: çizgiler köşelerden uzayarak çizilir, köşebentler ardından belirir.
   • Güvenli alan: çentik ve alt çubuk payı (env(safe-area-inset-*)).
   • Renk tek: `ac` (temanın vurgu rengi); tonlar opaklıkla.
   ═══════════════════════════════════════════════════════════════════════════ */

import { useId, useLayoutEffect, useRef, useState, useMemo } from "react"

// Köşe için daha uzun, ince badem (ucu içeri, geniş tarafı köşede)
const BADEM = "M0 -71 C4.5 -78 9.5 -87 11 -93 C9.5 -99 4.5 -104 0 -111 C-4.5 -104 -9.5 -99 -11 -93 C-9.5 -87 -4.5 -78 0 -71 Z"
const KAFES = (() => {
  const c = []
  for (let k = -40; k <= 40; k += 5.2) {
    c.push(`M${-16 + k} -114 L${16 + k} -66`)
    c.push(`M${16 - k} -114 L${-16 - k} -66`)
  }
  return c.join(" ")
})()
// Kenar boyunca kıvrılan hilal demeti (köşe koordinatında, üst kenar için)
const HILAL = [0, 1, 2, 3, 4].map(i =>
  `M21 18 C${30 + i * 1.2} ${21.5 + i * 1.7} ${47 + i * 1.5} ${19.5 + i * 1.1} 70 12.5`)

const PAY = 12   // ekran kenarından cetvele uzaklık (güvenli alana ek)
/* iOS ÜST SOLUKLAŞTIRMASI (10 Ekim 2026): ana ekrandan açılan uygulamada iOS,
   ekranın üst ~100 CSS px'ine KENDİ soluklaştırma katmanını çiziyor ve bu katman
   sayfanın her şeyinin üstünde duruyor (OkumaEkrani notunda ölçümüyle; bizim
   kodumuzla kaldırılamıyor). Çerçevenin üst kenarı ve üst köşebentler o bölgede
   kalınca soluk görünüyordu → yalnız bu kipte üst kenar biraz aşağı alınıyor. */
const IOS_UST_EK = 0   // 30 denendi; kullanıcı: "üst çizgi çok aşağı geldi, çerçeveye göre olmalı" → kaldırıldı
/* ALT GÜVENLİ ALAN (11 Ekim 2026): iPhone'da alt güvenli alan ~34 px (ana ekran
   çizgisi). Tamamı eklenince alt cetvel ekranın altından fark edilir derecede
   yukarıda kalıyordu; Android'de (tam ekran, alt pay 0) cetvel kenara iniyor.
   Güvenli alanın yalnız bu oranı ekleniyor → iPhone'da alt cetvel ~24 px'e iner,
   çizginin üstünde kalır. Android/masaüstünde pay 0 olduğu için etkisi yok.
   Daha aşağı: oranı küçült (0.2 → ~19 px); daha yukarı: büyüt (1 = eski hâl). */
const ALT_ORAN = 0.35
const ALT_GUVENLI = `env(safe-area-inset-bottom) * ${ALT_ORAN}`
/* OVAL KÖŞELER (11 Ekim 2026): Face ID'li bütün iPhone'larda (X ve sonrası, 16e
   dahil) ekran köşeleri yuvarlak; köşe yarıçapı ~39–62 pt. Ev tuşlu modellerde
   (SE 2/3, 8) köşe düz ve alt güvenli alan 0. Yani alt güvenli alanın VARLIĞI
   yuvarlak köşenin işareti. Alt cetvel aşağı inince alt köşe düğümleri (kenardan
   ~10, ~22 px) büyük yarıçaplı Pro modellerde eğrinin dışında kalıp kesiliyordu
   (r > ~53 pt). Yanlar da aynı orandan içeri alınıyor (~+10 px): düğüm ~(20, 22)
   px'e geliyor, r ≈ 71 pt'ye kadar güvenli; çerçeve payı da dört yanda eşitleniyor.
   Android ve masaüstünde alt güvenli alan 0 → değişiklik yok. */
const YAN_ORAN = 0.3
const YAN_GUVENLI = `env(safe-area-inset-bottom) * ${YAN_ORAN}`

/* ── CETVELE SARILAN DALLAR (10 Ekim 2026) ─────────────────────────────────
   Kullanıcı: "çizgiler üzerinde rastgele dallar (meal penceresindeki gibi ama
   simetrik değil, oradakiyle birebir aynı değil) içeriye girip çıkabilir."
   • Sekiz dal, her kenarda iki; farklı boy ve kalınlıkta; köşebentlerin alanına
     girmiyor. Dal cetveli bir içeriden bir dışarıdan keserek ilerliyor.
   • Gövde uca doğru incelen dolu şekil; yer yer yaprak, kısa sürgün, kıvrık
     filiz; birinin ucunda küçük çiçek. Sabit tohumlu sözde-rastgele: her
     açılışta aynı çizim, ama elle dizilmiş gibi düzenli değil.
   • Ölçü cetvelin GERÇEK yerinden (güvenli alan dahil) okunuyor. */
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
const f2 = (x) => Math.round(x * 10) / 10
function yaprak(p, a, L, W) {
  const dx = Math.cos(a), dy = Math.sin(a), px = -dy, py = dx
  const u = { x: p.x + dx * L, y: p.y + dy * L }
  const c1 = { x: p.x + dx * L * 0.4 + px * W, y: p.y + dy * L * 0.4 + py * W }
  const c2 = { x: p.x + dx * L * 0.4 - px * W, y: p.y + dy * L * 0.4 - py * W }
  return {
    govde: `M${f2(p.x)} ${f2(p.y)} Q${f2(c1.x)} ${f2(c1.y)} ${f2(u.x)} ${f2(u.y)} Q${f2(c2.x)} ${f2(c2.y)} ${f2(p.x)} ${f2(p.y)}Z`,
    damar: `M${f2(p.x)} ${f2(p.y)} L${f2(p.x + dx * L * 0.75)} ${f2(p.y + dy * L * 0.75)}`,
  }
}
function govdeYolu(n) {
  if (n.length < 2) return ""
  const sol = n.map(q => [q.x + q.nx * q.k / 2, q.y + q.ny * q.k / 2])
  const sag = n.map(q => [q.x - q.nx * q.k / 2, q.y - q.ny * q.k / 2]).reverse()
  const yum = (d) => {
    let s = `${f2(d[0][0])} ${f2(d[0][1])}`
    for (let i = 1; i < d.length - 1; i++) s += ` Q${f2(d[i][0])} ${f2(d[i][1])} ${f2((d[i][0] + d[i + 1][0]) / 2)} ${f2((d[i][1] + d[i + 1][1]) / 2)}`
    const z = d[d.length - 1]
    return s + ` L${f2(z[0])} ${f2(z[1])}`
  }
  return `M${yum(sol)} L${yum(sag)} Z`
}
// Kenar üzerinde kesir s (0–1) konumundaki nokta + ilerleme yönü + dışa normal
function kenarNokta(kenar, s, R) {
  const W = R.x1 - R.x0, H = R.y1 - R.y0
  if (kenar === "sol") return { x: R.x0, y: R.y1 - s * H, tx: 0, ty: -1, ox: -1, oy: 0 }
  if (kenar === "ust") return { x: R.x0 + s * W, y: R.y0, tx: 1, ty: 0, ox: 0, oy: -1 }
  if (kenar === "sag") return { x: R.x1, y: R.y0 + s * H, tx: 0, ty: 1, ox: 1, oy: 0 }
  return { x: R.x1 - s * W, y: R.y1, tx: -1, ty: 0, ox: 0, oy: 1 }
}
// Kenarların boş kalan yerleri de dolu (kullanıcı: "kalan boş çizgilere de dallar
// gelebilir, kalınlıklar değişebilir"). Köşebent alanları boş: dikeyde ~%10,
// yatayda ~%21 pay. Kalınlıklar kasten farklı: ince filiz gibiler ve kalın gövdeler.
const DALLAR = [
  { kenar: "sol", bas: 0.12, bit: 0.5,  dalga: 6.5, boy: 120, k0: 2.4, k1: 0.55, tohum: 7,  cicek: true },
  { kenar: "sol", bas: 0.56, bit: 0.88, dalga: 4.5, boy: 90,  k0: 1.2, k1: 0.4,  tohum: 53 },
  { kenar: "ust", bas: 0.22, bit: 0.37, dalga: 3.5, boy: 70,  k0: 1.0, k1: 0.35, tohum: 61 },
  { kenar: "ust", bas: 0.42, bit: 0.79, dalga: 5.5, boy: 95,  k0: 2.0, k1: 0.5,  tohum: 19 },
  { kenar: "sag", bas: 0.12, bit: 0.52, dalga: 6,   boy: 130, k0: 2.9, k1: 0.6,  tohum: 71, cicek: true },
  { kenar: "sag", bas: 0.58, bit: 0.8,  dalga: 4.5, boy: 85,  k0: 1.7, k1: 0.45, tohum: 43 },
  { kenar: "alt", bas: 0.24, bit: 0.6,  dalga: 6,   boy: 105, k0: 2.2, k1: 0.5,  tohum: 31 },
  { kenar: "alt", bas: 0.64, bit: 0.78, dalga: 3.5, boy: 65,  k0: 1.4, k1: 0.4,  tohum: 83 },
]
function dalUret(t, R) {
  const rnd = uretec(t.tohum)
  const uz = t.kenar === "sol" || t.kenar === "sag" ? R.y1 - R.y0 : R.x1 - R.x0
  const adet = Math.max(8, Math.round((t.bit - t.bas) * uz / 5))
  const faz1 = rnd() * 6.28, faz2 = rnd() * 6.28
  const n = []
  for (let i = 0; i <= adet; i++) {
    const il = i / adet, s = t.bas + (t.bit - t.bas) * il
    const c = kenarNokta(t.kenar, s, R)
    const yay = il * (t.bit - t.bas) * uz
    // cetvelin bir dışına bir içine: uçlarda cetvele yaklaşır
    const zarf = Math.min(1, il / 0.12, (1 - il) / 0.1 + 0.25)
    let d = (Math.sin(yay / t.boy * 6.28 + faz1) * t.dalga + Math.sin(yay / 21 + faz2) * 0.7) * zarf
    // dışarıya ekran kenarına kadar taşmasın (cetvel kenardan 12 px içeride): dış
    // salınım yumuşakça ~5 px'te durur; içeri daha serbest
    d = d > 0 ? 5.5 * (1 - Math.exp(-d / 5.5)) : d * 1.15
    // kök incelerek başlar (kesik sopa gibi durmasın)
    const kok = Math.min(1, 0.35 + il / 0.07)
    n.push({ x: c.x + c.ox * d, y: c.y + c.oy * d, ox: c.ox, oy: c.oy, k: (t.k0 + (t.k1 - t.k0) * Math.pow(il, 1.1)) * kok, il })
  }
  for (let i = 0; i < n.length; i++) {
    const a = n[Math.max(0, i - 1)], b = n[Math.min(n.length - 1, i + 1)]
    const lx = b.x - a.x, ly = b.y - a.y, l = Math.hypot(lx, ly) || 1
    n[i].tx = lx / l; n[i].ty = ly / l; n[i].nx = -ly / l; n[i].ny = lx / l
  }
  const yapraklar = [], surgunler = [], filizler = [], cicekler = []
  let taraf = rnd() < 0.5 ? 1 : -1
  let i = 3 + Math.floor(rnd() * 3)
  while (i < n.length - 3) {
    const q = n[i]
    taraf = -taraf
    const yx = q.ox * taraf, yy = q.oy * taraf
    const ileri = Math.atan2(q.ty, q.tx), yan = Math.atan2(yy, yx)
    let fark = yan - ileri
    while (fark > Math.PI) fark -= 2 * Math.PI
    while (fark < -Math.PI) fark += 2 * Math.PI
    const a = ileri + fark * (0.45 + rnd() * 0.3)
    const zar = rnd()
    const disa = taraf > 0   // dışa (ekran kenarına) bakan süsler kısa
    if (zar < 0.3) {
      // kısa sürgün + uçta 1-2 yaprak
      const L = (9 + rnd() * 8) * (disa ? 0.55 : 1), buk = (rnd() - 0.5) * 0.9
      const c = { x: q.x + Math.cos(a + buk) * L * 0.55, y: q.y + Math.sin(a + buk) * L * 0.55 }
      const son = { x: q.x + Math.cos(a) * L, y: q.y + Math.sin(a) * L }
      surgunler.push({ d: `M${f2(q.x)} ${f2(q.y)} Q${f2(c.x)} ${f2(c.y)} ${f2(son.x)} ${f2(son.y)}`, k: Math.max(0.55, q.k * 0.45) })
      const sa = Math.atan2(son.y - c.y, son.x - c.x)
      const b = (6 + rnd() * 4) * (disa ? 0.75 : 1)
      yapraklar.push(yaprak(son, sa + (rnd() - 0.5) * 0.4, b, b * 0.36))
      if (rnd() < 0.45) yapraklar.push(yaprak(son, sa + (rnd() < 0.5 ? 0.8 : -0.8), b * 0.7, b * 0.26))
    } else if (zar < 0.42) {
      // kıvrık filiz
      const L = (7 + rnd() * 5) * (disa ? 0.6 : 1), don = taraf
      const p1 = { x: q.x + Math.cos(a) * L, y: q.y + Math.sin(a) * L }
      const b2 = a + don * 1.9
      const p2 = { x: p1.x + Math.cos(b2) * L * 0.45, y: p1.y + Math.sin(b2) * L * 0.45 }
      const p3 = { x: p2.x + Math.cos(b2 + don * 1.9) * L * 0.22, y: p2.y + Math.sin(b2 + don * 1.9) * L * 0.22 }
      filizler.push(`M${f2(q.x)} ${f2(q.y)} Q${f2(q.x + Math.cos(a - don * 0.4) * L * 0.6)} ${f2(q.y + Math.sin(a - don * 0.4) * L * 0.6)} ${f2(p1.x)} ${f2(p1.y)} Q${f2(p1.x + Math.cos(a + don * 0.9) * L * 0.4)} ${f2(p1.y + Math.sin(a + don * 0.9) * L * 0.4)} ${f2(p2.x)} ${f2(p2.y)} L${f2(p3.x)} ${f2(p3.y)}`)
    } else {
      const L = (6 + rnd() * 6) * (disa ? 0.7 : 1)
      yapraklar.push(yaprak(q, a, L, L * (0.32 + rnd() * 0.08)))
    }
    i += 3 + Math.floor(rnd() * 4)
  }
  // uç: ya küçük çiçek ya kıvrık filiz
  const u = n[n.length - 1], ua = Math.atan2(u.ty, u.tx)
  if (t.cicek) cicekler.push({ x: u.x + Math.cos(ua) * 3, y: u.y + Math.sin(ua) * 3, r: 3.4, don: rnd() * 72 })
  else filizler.push(`M${f2(u.x)} ${f2(u.y)} q${f2(Math.cos(ua) * 6)} ${f2(Math.sin(ua) * 6)} ${f2(Math.cos(ua + 1.6) * 5)} ${f2(Math.sin(ua + 1.6) * 5)}`)
  return { govde: govdeYolu(n), yapraklar, surgunler, filizler, cicekler }
}

/* NOT (Android, 10 Ekim 2026): öğelerde `opacity` YERİNE fillOpacity/strokeOpacity.
   SVG'de bir öğeye `opacity` verilince Chrome onu kendi sınır kutusu boyutunda ayrı
   bir saydamlık katmanında çiziyor; Android'de nadiren bu katman temizlenmeden
   birleşiyor ve dalların sınır kutuları kenarlarda koyu, lekeli dikey şeritler
   olarak görünüyordu (kullanıcı ekran görüntüsü). Tek boyalı şekillerde görüntü
   aynı, ama ara katman oluşmuyor. */
function Dallar({ R, canli = true }) {
  const dallar = useMemo(() => (R ? DALLAR.map(t => dalUret(t, R)) : []), [R])
  if (!R) return null
  return (
    <svg aria-hidden="true" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", overflow: "visible", animation: canli ? "vkDalBelir 1.4s ease 0.9s both" : "none" }}>
      {dallar.map((d, i) => (
        <g key={i}>
          {d.surgunler.map((s, j) => <path key={`s${j}`} d={s.d} fill="none" stroke="currentColor" strokeWidth={s.k} strokeLinecap="round" strokeOpacity="0.75" />)}
          {d.filizler.map((f, j) => <path key={`f${j}`} d={f} fill="none" stroke="currentColor" strokeWidth="0.6" strokeLinecap="round" strokeOpacity="0.6" />)}
          <path d={d.govde} fill="currentColor" fillOpacity="0.8" />
          {d.yapraklar.map((y, j) => (
            <g key={`y${j}`}>
              <path d={y.govde} fill="currentColor" fillOpacity="0.55" />
              <path d={y.damar} fill="none" stroke="currentColor" strokeWidth="0.45" strokeOpacity="0.7" />
            </g>
          ))}
          {d.cicekler.map((c, j) => (
            <g key={`c${j}`} transform={`translate(${f2(c.x)} ${f2(c.y)}) rotate(${f2(c.don)})`}>
              {[0, 72, 144, 216, 288].map(a => (
                <ellipse key={a} cx="0" cy={-c.r * 0.62} rx={c.r * 0.42} ry={c.r * 0.62} transform={`rotate(${a})`} fill="currentColor" fillOpacity="0.6" />
              ))}
              <circle r={c.r * 0.32} fill="currentColor" />
            </g>
          ))}
        </g>
      ))}
    </svg>
  )
}

function Kosebent({ uid, konum, canli = true }) {
  // konum: "su" sol-üst, "sau" sağ-üst, "sa" sol-alt, "saa" sağ-alt
  const sag = konum === "sau" || konum === "saa"
  const alt = konum === "sa" || konum === "saa"
  const id = `${uid}-k`
  return (
    <svg width="96" height="96" viewBox="0 0 96 96" aria-hidden="true"
      style={{
        position: "absolute",
        [alt ? "bottom" : "top"]: alt ? `calc(${ALT_GUVENLI} + ${PAY - 10}px)` : `calc(env(safe-area-inset-top) + ${PAY - 10 + IOS_UST_EK}px)`,
        [sag ? "right" : "left"]: `calc(env(safe-area-inset-${sag ? "right" : "left"}) + ${YAN_GUVENLI} + ${PAY - 10}px)`,
        transform: `scale(${sag ? -1 : 1}, ${alt ? -1 : 1})`,
        overflow: "visible",
        animation: canli ? "vkKoseBelir 0.9s ease 0.45s both" : "none",
      }}>
      <defs>
        <clipPath id={`${id}-badem`}><path d={BADEM} /></clipPath>
        <linearGradient id={`${id}-hilal`} gradientUnits="userSpaceOnUse" x1="21" y1="18" x2="70" y2="12">
          <stop offset="0" stopColor="currentColor" stopOpacity="0.95" />
          <stop offset="1" stopColor="currentColor" stopOpacity="0.25" />
        </linearGradient>
      </defs>
      {/* köşeden içeri bakan kafesli badem (geniş ucu köşede) */}
      <g transform="translate(76.8 76.8) rotate(-45) scale(0.8)">
        <g clipPath={`url(#${id}-badem)`}>
          <path d={KAFES} fill="none" stroke="currentColor" strokeWidth="1.4" strokeOpacity="0.8" />
        </g>
        <path d={BADEM} fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      </g>
      {/* iki kenar boyunca hilal demetleri */}
      <g fill="none" stroke={`url(#${id}-hilal)`} strokeWidth="0.8" strokeLinecap="round">
        {HILAL.map((d, i) => <path key={`u${i}`} d={d} />)}
        <g transform="matrix(0 1 1 0 0 0)">{HILAL.map((d, i) => <path key={`s${i}`} d={d} />)}</g>
      </g>
      {/* köşe düğümü (cetvellerin birleştiği yer) */}
      <rect x="6.6" y="6.6" width="6.8" height="6.8" transform="rotate(45 10 10)" fill="currentColor" />
      <circle cx="74" cy="12.2" r="1.3" fill="currentColor" fillOpacity="0.6" />
      <circle cx="12.2" cy="74" r="1.3" fill="currentColor" fillOpacity="0.6" />
    </svg>
  )
}

/* canli: true → giriş (splash) için çizilerek beliren çerçeve.
   canli: false → yükleme ekranları için durağan çerçeve. Kitap açılırken birkaç
   yükleme ekranı art arda gelebiliyor; animasyon her birinde baştan başlasa
   çerçeve yanıp sönerdi, bu yüzden orada çizim/belirme yok. */
export default function GirisCercevesi({ ac = "currentColor", dallar = true, canli = true }) {
  const an = (a) => (canli ? a : "none")
  const uid = useId().replace(/:/g, "")
  // Cetvelin gerçek yeri (güvenli alan dahil) → dallar onun üstüne kurulur
  const kokRef = useRef(null), cetvelRef = useRef(null)
  const [R, setR] = useState(null)
  useLayoutEffect(() => {
    const olc = () => {
      const k = kokRef.current?.getBoundingClientRect(), c = cetvelRef.current?.getBoundingClientRect()
      if (!k || !c) return
      const y = { x0: c.left - k.left, y0: c.top - k.top, x1: c.right - k.left, y1: c.bottom - k.top }
      setR(o => (o && Math.abs(o.x1 - y.x1) < 1 && Math.abs(o.y1 - y.y1) < 1 ? o : y))
    }
    // iPhone'da (ana ekrandan açılış) ilk karede görünüm yüksekliği ve güvenli
    // alan henüz oturmamış olabiliyor; `resize` de gelmiyor → dallar eski ölçüyle
    // çizilip alt kenardan kopuk kalıyordu (kullanıcı ekran görüntüsü). Artık
    // cetvel kutusunun boyutu gözleniyor + ilk saniyede birkaç kez yeniden ölçülüyor.
    olc()
    const zamanlar = [60, 200, 450, 900, 1500].map(ms => setTimeout(olc, ms))
    const r = requestAnimationFrame(olc)
    let ro = null
    if (typeof ResizeObserver !== "undefined") {
      ro = new ResizeObserver(olc)
      if (cetvelRef.current) ro.observe(cetvelRef.current)
      if (kokRef.current) ro.observe(kokRef.current)
    }
    window.addEventListener("resize", olc)
    window.visualViewport?.addEventListener("resize", olc)
    return () => {
      zamanlar.forEach(clearTimeout); cancelAnimationFrame(r); ro?.disconnect()
      window.removeEventListener("resize", olc)
      window.visualViewport?.removeEventListener("resize", olc)
    }
  }, [])
  const cizgi = (ic, kalin, op) => ({
    position: "absolute",
    top: `calc(env(safe-area-inset-top) + ${PAY + ic + IOS_UST_EK}px)`,
    bottom: `calc(${ALT_GUVENLI} + ${PAY + ic}px)`,
    left: `calc(env(safe-area-inset-left) + ${YAN_GUVENLI} + ${PAY + ic}px)`,
    right: `calc(env(safe-area-inset-right) + ${YAN_GUVENLI} + ${PAY + ic}px)`,
    border: `${kalin}px solid currentColor`,
    opacity: op,
    pointerEvents: "none",
  })
  return (
    <div ref={kokRef} aria-hidden="true" style={{ position: "absolute", inset: 0, color: ac, pointerEvents: "none" }}>
      <style>{`
        @keyframes vkCetvelCiz { from { clip-path: inset(0 50% 0 50%); } to { clip-path: inset(0 0 0 0); } }
        @keyframes vkCetvelCizD { from { clip-path: inset(50% 0 50% 0); } to { clip-path: inset(0 0 0 0); } }
        @keyframes vkKoseBelir { from { opacity: 0; transform-origin: 10px 10px; } to { opacity: 1; } }
        @keyframes vkDalBelir { from { opacity: 0; } to { opacity: 1; } }
        @media (prefers-reduced-motion: reduce) { .vk-cetvel { animation: none !important; } }
      `}</style>
      {/* ölçü için görünmez dış cetvel kutusu (dallar buna göre) */}
      <div ref={cetvelRef} style={{ ...cizgi(0, 0, 0), border: "none" }} />
      {/* dış cetvel: yatay kenarlar ortadan köşelere, dikeyler ardından */}
      <div className="vk-cetvel" style={{ ...cizgi(0, 1.2, 0.75), borderLeft: "none", borderRight: "none", animation: an("vkCetvelCiz 0.7s cubic-bezier(.22,.61,.36,1) both") }} />
      <div className="vk-cetvel" style={{ ...cizgi(0, 1.2, 0.75), borderTop: "none", borderBottom: "none", animation: an("vkCetvelCizD 0.7s cubic-bezier(.22,.61,.36,1) 0.1s both") }} />
      {/* iç cetvel (soluk) */}
      <div className="vk-cetvel" style={{ ...cizgi(5, 0.6, 0.38), animation: an("vkCetvelCiz 0.8s ease 0.2s both") }} />
      {dallar && <Dallar R={R} canli={canli} />}
      {["su", "sau", "sa", "saa"].map(k => <Kosebent key={k} uid={`${uid}${k}`} konum={k} canli={canli} />)}
    </div>
  )
}
