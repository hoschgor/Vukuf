import { renderToStaticMarkup } from "react-dom/server"
// ÇİÇEKLİ ÂYET ROZETİ (11 Kasım 2026; dosya adı ilk "çini" denemesinden kaldı) — kullanıcının camide çektiği çini panodan esinlenilen
// âyet sonu "parantezi": rakamın iki yanında hilâl gibi kıvrılan birer sap; sapın dış
// ortasından dışa doğru açan bir hatâyî çiçeği, uçlarında saz yaprakları. Çini geleneğindeki
// gibi her parçanın kenarında zemin renginde ince kontur. Kullanıcı: "şu anki rozetimiz
// uzaktan bakıldığında detaylı olarak anlaşılmayabiliyor … renk farklılıklarını da tema
// rengi + değer gibi yapabiliriz." Bu yüzden ince tel işi yerine DOLU, iri parçalar.
// RENKLER: âyet no renginden türetilir (koyu / ana / açık / çok açık) — JS ile karıştırılır,
// çünkü çerçeve <img> (data-URI SVG) olarak çiziliyor; orada CSS color-mix'e güvenilmiyor.
// API MushafAyetRozeti ile aynı (sayi, size, ac, aktif) + zemin, yazi (kontur ve koyu ton için).
const cerceveBellek = new Map()
const ARAPCA = "٠١٢٣٤٥٦٧٨٩"
const arapcaRakam = (n) => String(n).split("").map((d) => ARAPCA[+d] ?? d).join("")

// #rgb / #rrggbb → [r,g,b]; çözülemezse null
function hexRgb(h) {
  const m = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(String(h || "").trim())
  if (!m) return null
  let x = m[1]
  if (x.length === 3) x = x.split("").map(c => c + c).join("")
  return [0, 2, 4].map(i => parseInt(x.slice(i, i + 2), 16))
}
// a'yı yüzde y oranında b ile karıştır (y: a'nın payı)
function karis(a, b, y) {
  const A = hexRgb(a), B = hexRgb(b)
  if (!A || !B) return a
  const t = y / 100
  return "#" + A.map((v, i) => Math.round(v * t + B[i] * (1 - t)).toString(16).padStart(2, "0")).join("")
}

// Görüş kutusu: klasik rozetle AYNI (çizim x ±68, y ±31) → yerleşim hiç değişmez
const KUTU = { x: -72, y: -36, w: 144, h: 72 }

/* ÇİÇEKLİ ROZET (11 Kasım 2026) — kullanıcı: "Bizim eski parantezimize bu çiçeğin orta
   kısmını entegre edebiliriz. Bizdekinin uç kısımları çok güzel fakat orta kısmı
   umursanmamış gibi doldurulmuş duruyor … uçları değişmesin; ortadaki dolgun kısım
   inceltilip orta kısma çiçek alınacak, çiçek ise uygun şekilde şimdiki uçlara uzanacak."
   • UÇLAR AYNEN klasik rozetten: içe bakan rûmî tepe süsleri, dışa bakan rûmîler, yaprak
     kümeleri, nokta kümeleri (koordinatlar birebir kopya).
   • GÖVDE (hilâl) inceltildi; ortadaki baklava, iki küçük yaprak ve dikey sarmaşık kalktı.
   • ORTADA kat kat yuvarlak bir hatâyî (kitâbe panosundaki gül gibi); üstünden ve altından
     birer ince dal uçlara uzanır, üzerlerinde küçük yapraklar.
   Sol yarı yerel koordinatta (translate(-50 0)); sağ yarı aynası. */
/* Sol yarının ÇİZİMİ (yerel koordinat, merkez hilâlin ortası) — Tema Seçici'deki
   caminin yan kanatlarında da aynısı kullanılıyor (TemaSecici → RozetYarisi). */
export function CicekliYarimCizim({ p }) {
  const ac = p.ana
  const k = { stroke: p.kontur, strokeWidth: 0.45, strokeLinejoin: "round" }
  const halka = (n, r, rx, ry, renk, kay = 0) => Array.from({ length: n }, (_, i) => (
    <ellipse key={`${r}-${i}`} cx="0" cy={-r} rx={rx} ry={ry} transform={`rotate(${(360 / n) * i + kay})`}
      style={{ fill: renk, ...k }} />
  ))
  return (
    <g>
      {/* GÖVDE — eski hilâlin dış kenarı aynı, iç kenarı dışa yaklaştırıldı (ince) */}
      <path d="M0 -19 C-11 -18.5 -17 -10 -17 0 C-17 10 -11 18.5 0 19 C-9.5 17.2 -14.6 9.5 -14.6 0 C-14.6 -9.5 -9.5 -17.2 0 -19 Z"
        fill={ac} opacity=".95" />
      {/* UÇLAR — klasik rozetten AYNEN */}
      <path d="M-2 -19 C1 -22 3 -26 2 -31 C-2 -30 -6 -24 -1 -18.5 Z" fill={ac} />
      <path d="M-2 19 C1 22 3 26 2 31 C-2 30 -6 24 -1 18.5 Z" fill={ac} />
      <path d="M-8 -17 C-12 -18 -15.5 -16.5 -17 -13.5 C-14.5 -13 -12 -14 -10.5 -16 C-11 -13.5 -12.5 -11.5 -15.5 -11 C-12.5 -10 -9 -12 -7.5 -15 Z" fill={ac} opacity=".85" />
      <path d="M-8 17 C-12 18 -15.5 16.5 -17 13.5 C-14.5 13 -12 14 -10.5 16 C-11 13.5 -12.5 11.5 -15.5 11 C-12.5 10 -9 12 -7.5 15 Z" fill={ac} opacity=".85" />
      <circle cx="-12" cy="-22" r="0.9" fill={ac} opacity=".5" />
      <circle cx="-14.5" cy="-20.5" r="0.5" fill={ac} opacity=".35" />
      <circle cx="-12" cy="22" r="0.9" fill={ac} opacity=".5" />
      <circle cx="-14.5" cy="20.5" r="0.5" fill={ac} opacity=".35" />
      <path d="M-4 -19 C-6 -24 -9 -27 -14 -27 C-11 -24 -8 -21 -4 -19 Z" fill={ac} opacity=".7" />
      <path d="M-1 -19 C1 -24 3 -27 8 -27 C5 -24 2 -21 -1 -19 Z" fill={ac} opacity=".5" />
      <path d="M-4 19 C-6 24 -9 27 -14 27 C-11 24 -8 21 -4 19 Z" fill={ac} opacity=".7" />
      <path d="M-1 19 C1 24 3 27 8 27 C5 24 2 21 -1 19 Z" fill={ac} opacity=".5" />

      {/* DALLAR — çiçekten uçlara (üst ve alt), üzerlerinde küçük yapraklar */}
      <path d="M-7 -6 C-6.5 -10.5 -5 -14.5 -2.2 -18.2" fill="none" style={{ stroke: p.dal || p.koyu, strokeWidth: 0.9, strokeLinecap: "round" }} />
      <path d="M-7 6 C-6.5 10.5 -5 14.5 -2.2 18.2" fill="none" style={{ stroke: p.dal || p.koyu, strokeWidth: 0.9, strokeLinecap: "round" }} />
      <path d="M-5.8 -11.2 C-3.4 -12.4 -1.4 -12 0.3 -10.4 C-1.8 -9.6 -3.9 -9.9 -5.8 -11.2 Z" style={{ fill: p.yaprakAcik || p.acik, ...k }} />
      <path d="M-5.8 11.2 C-3.4 12.4 -1.4 12 0.3 10.4 C-1.8 9.6 -3.9 9.9 -5.8 11.2 Z" style={{ fill: p.yaprakAcik || p.acik, ...k }} />
      <path d="M-6.4 -9 C-8.6 -10.6 -10.8 -10.6 -12.4 -9.2 C-10.4 -8 -8.4 -7.9 -6.4 -9 Z" style={{ fill: p.yaprak || p.ana, ...k }} />
      <path d="M-6.4 9 C-8.6 10.6 -10.8 10.6 -12.4 9.2 C-10.4 8 -8.4 7.9 -6.4 9 Z" style={{ fill: p.yaprak || p.ana, ...k }} />
      {/* ÇİÇEĞİN İKİ YANINDA çanak yaprakları (içe ve dışa) */}
      <path d="M-7 0 C-4.5 -2.6 -1.5 -2.6 0.8 0 C-1.5 2.6 -4.5 2.6 -7 0 Z" style={{ fill: p.canak || p.cokAcik, ...k }} />

      {/* HATÂYÎ — kat kat yuvarlak çiçek */}
      <g transform="translate(-7.6 0) scale(1.15)">
        {halka(12, 4.4, 1.55, 2.15, p.tacDis || p.koyu)}
        {halka(8, 2.7, 1.3, 1.7, p.tacOrta || p.ana, 22.5)}
        {halka(6, 1.4, 0.9, 1.15, p.tacIc || p.acik)}
        <circle r="1" style={{ fill: p.gobek || p.merkez, ...k, strokeWidth: 0.35 }} />
      </g>
    </g>
  )
}

function Yarim({ p }) {
  return <g transform="translate(-50 0)"><CicekliYarimCizim p={p} /></g>
}

/* ÇİÇEĞİN RENKLERİ (13 Kasım 2026) — kullanıcı: "Ortasındaki çiçek bazı temalarda daha güzel.
   Birden fazla ve farklı renkler kullanılınca çiçeğe daha çok benziyor. Şekli değiştirmeden
   renkler üzerinde değişiklik yaparak çiçeğe daha çok benzetebiliriz."
   Eskiden çiçeğin bütün katları âyet no renginin tonlarıydı (yalnız göbek temanın vurgu
   rengi) → koyu temalarda altın göbekle güzel, açık temalarda tek renk leke gibiydi.
   Artık İznik çinisinin renk dili: dış taç temanın koyu tonu (kendi renginden kopmasın),
   orta taç mercan kırmızısı, iç taç açık gül pembesi, göbek altın, dal ve yapraklar yeşil.
   Sabit renkler temaya %15 karıştırılıyor (uyum), koyu zeminde biraz açılıyor (parlasın).
   Âyet no rengi kırmızımsı olan temalarda (Kurugül, Gülnar…) orta taç altına, göbek
   kırmızıya dönüyor — dış taçla orta taç birbirine karışmasın. Âyet no rengi beyaz/gri
   gibi renksizse (izleme modunda beyaz yazı) dış taç kobalt mavisi oluyor. */
const CICEK = {
  kirmizi: "#c9463d", pembe: "#f4cbbf", altin: "#e3a935", yesil: "#4b8a4d", yesilAcik: "#a6c98f", kobalt: "#3d64a8",
}
// 0..1 göreli parlaklık (yaklaşık)
function parlaklik(h) {
  const c = hexRgb(h)
  if (!c) return 1
  return (0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]) / 255
}
// { h (derece), s (0..1) }
function tonDoygunluk(h) {
  const c = hexRgb(h)
  if (!c) return { h: 0, s: 0 }
  const [r, g, b] = c.map(v => v / 255)
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn
  let t = 0
  if (d) {
    if (mx === r) t = ((g - b) / d) % 6
    else if (mx === g) t = (b - r) / d + 2
    else t = (r - g) / d + 4
    t *= 60; if (t < 0) t += 360
  }
  return { h: t, s: mx ? d / mx : 0 }
}
export function cicekRenkleri(ac, zemin = "#ffffff", yazi = "#222222") {
  const koyuZemin = parlaklik(zemin) < 0.45
  const { h, s } = tonDoygunluk(ac)
  const renksiz = s < 0.18
  const kirmizimsi = !renksiz && (h >= 320 || h <= 28)
  const uyum = (c) => (renksiz ? c : karis(c, ac, 85))
  const parlat = (c, o = 78) => (koyuZemin ? karis(c, "#ffffff", o) : c)
  const disTac = renksiz ? parlat(CICEK.kobalt, 72) : karis(ac, yazi, koyuZemin ? 88 : 68)
  return {
    tacDis: disTac,
    tacOrta: parlat(uyum(kirmizimsi ? CICEK.altin : CICEK.kirmizi), 88),
    tacIc: uyum(CICEK.pembe),
    gobek: parlat(uyum(kirmizimsi ? CICEK.kirmizi : CICEK.altin), 92),
    dal: koyuZemin ? parlat(uyum(CICEK.yesil), 70) : karis(uyum(CICEK.yesil), yazi, 78),
    yaprak: parlat(uyum(CICEK.yesil), 75),
    yaprakAcik: parlat(uyum(CICEK.yesilAcik), 90),
    canak: koyuZemin ? karis(uyum(CICEK.yesilAcik), zemin, 70) : karis(uyum(CICEK.yesilAcik), zemin, 75),
  }
}

export function ciniPalet(ac, zemin = "#ffffff", yazi = "#222222", vurgu = null) {
  return {
    koyu: karis(ac, yazi, 68),
    ana: ac,
    acik: karis(ac, zemin, 55),
    cokAcik: karis(ac, zemin, 25),
    zeminTon: karis(ac, zemin, 10),
    kose: karis(ac, zemin, 32),          // kavsin dışındaki köşelik
    merkez: vurgu || karis(ac, yazi, 45), // (eski) gül göbeği — artık `gobek`
    vurgu: vurgu || karis(ac, zemin, 70), // lâle goncası
    kontur: zemin,
    ...cicekRenkleri(ac, zemin, yazi),
  }
}

function Cerceve({ p }) {
  return (
    <>
      <Yarim p={p} />
      <g transform="scale(-1 1)"><Yarim p={p} /></g>
    </>
  )
}

export default function CiniAyetRozeti({ sayi, size = 60, ac = "#8b6a2b", zemin = "#ffffff", yazi = "#222222", vurgu = null, aktif = false }) {
  const rakam = arapcaRakam(sayi)
  // Uç kapakları arası ~56 birim → üç haneli sayı biraz küçülür, çiçek saplarına değmesin
  // Klasik rozetle aynı rakam boyları
  const fontSize = rakam.length === 1 ? 50 : 52
  const anahtar = `${ac}|${zemin}|${yazi}|${vurgu || ""}`
  let url = cerceveBellek.get(anahtar)
  if (!url) {
    url = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(renderToStaticMarkup(
      <svg xmlns="http://www.w3.org/2000/svg" width={KUTU.w} height={KUTU.h}
        viewBox={`${KUTU.x} ${KUTU.y} ${KUTU.w} ${KUTU.h}`}>
        <Cerceve p={ciniPalet(ac, zemin, yazi, vurgu)} />
      </svg>
    ))
    cerceveBellek.set(anahtar, url)
  }
  const olcek = size / 130
  const iw = KUTU.w * olcek, ih = KUTU.h * olcek
  return (
    <span style={{
      display: "block", position: "relative", width: size, height: size,
      transform: aktif ? "scale(1.3)" : "none", transition: "transform 0.3s ease",
      filter: aktif ? `drop-shadow(0 0 4px ${ac})` : "none",
    }}>
      <img src={url} alt="" draggable={false} style={{
        position: "absolute", left: (size - iw) / 2, top: (size - ih) / 2, width: iw, height: ih,
        pointerEvents: "none",
      }} />
      <svg width={size} height={size} viewBox="-65 -30 130 60"
        style={{ position: "absolute", left: 0, top: 0, overflow: "visible", pointerEvents: "none" }}>
        <text x="0" y="3" textAnchor="middle" dominantBaseline="middle"
          fontFamily="'Scheherazade New', serif" fontWeight="900" fontSize={fontSize}
          fill={ac} letterSpacing="-2.5">{rakam}</text>
      </svg>
    </span>
  )
}
