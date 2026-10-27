/* ═══════════════════════════════════════════════════════════════════════════
   VUKUF — RAF GÖRSELLERİ (ortak)
   src/components/rafGorselleri.js

   Kitaplık dolabının temadan türeyen ahşap renkleri (rafPaleti) ve raf resimleri
   (RAF_RESIMLERI, rafResmiBul). 27 Ekim 2026'da Kutuphane.jsx'ten buraya alındı;
   Kitaplık modu penceresi (KitaplikModu.jsx) de aynı ahşabı ve resimleri kullanıyor.
   İçerik Kutuphane.jsx'teki hâliyle AYNEN taşındı.
   ═══════════════════════════════════════════════════════════════════════════ */

// ── RENKLER TEMADAN (8 Ekim 2026) ──────────────────────────────────────────
// Sabit kahverengi yerine çerçeve, temanın vurgu renginin TONUNDA üretilir; açıklık
// (L) değerleri koyu/açık temaya göre kaydırılır. Böylece Gülnar'da gül-mor, Sepya'da
// kahve, mavi temalarda lacivert-gri bir dolap çıkar. Kandil/mum pirinci sabit sıcak.
export function hexHsl(hex) {
  let h = String(hex || "#000").replace("#", "")
  if (h.length === 3) h = h.split("").map(c => c + c).join("")
  const n = parseInt(h.slice(0, 6), 16)
  if (Number.isNaN(n)) return [0, 0, 0]
  const r = ((n >> 16) & 255) / 255, g = ((n >> 8) & 255) / 255, b = (n & 255) / 255
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2
  if (mx === mn) return [0, 0, l]
  const d = mx - mn
  const s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn)
  let hh = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4
  return [hh * 60, s, l]
}
export const hsl = (h, s, l, a = 1) =>
  `hsla(${h.toFixed(1)}, ${(Math.max(0, Math.min(1, s)) * 100).toFixed(1)}%, ${(Math.max(0, Math.min(1, l)) * 100).toFixed(1)}%, ${a})`

const _paletBellek = new Map()
export function rafPaleti(theme) {
  const anahtar = `${theme?.background}|${theme?.accent}|${theme?.surface}`
  if (_paletBellek.has(anahtar)) return _paletBellek.get(anahtar)
  const [bh, bs, bl] = hexHsl(theme?.background)
  const [ah, as] = hexHsl(theme?.accent)
  const koyuTema = bl < 0.5
  // ── SADE ÇERÇEVE (9 Ekim 2026) ──────────────────────────────────────────
  // Kullanıcı: "açık tonlarda raf fazla meydanda, arka plan beyaz, raf çok farklı
  // kalıyor; koyu tonlarda sütun çiziminde sorun var; üst yatay kısım fazla detaylı,
  // dikey çizgiler çok fazla, daha sade olmalı."
  // • TON: sarı/altın vurgulu temalarda (ton 30–70°) koyulaşınca zeytin-haki çıkıyordu;
  //   o aralık sıcak ceviz tonuna çekiliyor. Öbür temalar (pembe, mavi…) kendi tonunda kalır.
  // • AÇIK TEMA: çerçeve sayfa zeminine yakın, açık meşe/kum tonu (eski orta kahve
  //   açık zeminde ağır bir blok gibi duruyordu). Doygunluk her iki temada düşük.
  // • DAMAR DESENLERİ KALDIRILDI: ters yönde ve düzenli tekrar eden ince çizgiler
  //   ahşabı oluklu sac gibi gösteriyordu. Yüzeyler yalnız yumuşak geçişli.
  //   Açık temada kırmızımsı kahveler (ör. sepya 26°) açılınca pembe-gri (taupe)
  //   kalıyordu → açık temada sıcak tonlar 30–36° bandına alınıyor (meşe/kum).
  //   Koyu temada sarı/altın tonlar 28°'ye (koyulaşınca 36° bile zeytine kaçıyordu).
  const sicak = ah <= 70
  const h = !sicak ? ah : koyuTema ? (ah > 30 ? 28 : ah) : Math.min(36, Math.max(30, ah))
  const s = koyuTema ? Math.min(0.42, as * 0.7) : Math.min(0.46, as * 0.95)
  // Çerçeve açıklık basamakları: koyu temada derin ve yumuşak, açık temada açık meşe
  // Açık temada da koyu ceviz (kullanıcı: "koyu tonlara alsak daha iyi") — açık meşe
  // denendi, sayfayla kaynaşıyordu ama dolap kimliğini yitiriyordu.
  // Telefon ekranlarında (parlak/OLED) aynı ton daha açık görünüyor → bir kademe daha koyu.
  // 9 Ekim 2026: kullanıcı "tek monitörde iyi, mobilde ve diğer monitörlerde açık
  // görünüyor; koyu kahve olsun" → çoğu ekran (parlak/OLED, yüksek gama) koyu tonları
  // açtığı için temel ton belirgin biçimde koyulaştırıldı; doygunluk kahve kalsın diye arttı.
  const L = koyuTema ? [0.07, 0.12, 0.175, 0.24, 0.36] : [0.07, 0.11, 0.155, 0.21, 0.32]
  const [c0, c1, c2, c3, c4] = L.map(l => hsl(h, s, l))
  const p = {
    koyuTema,
    c0, c1, c2, c3, c4,
    // yatay çubuk (üst ray, levha bandı, taç)
    yatay: `linear-gradient(180deg, ${c3} 0%, ${c2} 35%, ${c1} 100%)`,
    band: `linear-gradient(180deg, ${c2} 0%, ${c1} 100%)`,
    // köşeli pilaster gövdesi: solda pah ışığı, sağda gölge, dikey damar
    // köşeli direk: solda yumuşak pah ışığı, sağda gölge — çizgisiz düz tahta
    pilaster: `linear-gradient(90deg, ${c1} 0%, ${c3} 9%, ${c2} 24%, ${c2} 78%, ${c1} 93%, ${c0} 100%)`,
    blok: `linear-gradient(180deg, ${c3} 0%, ${c2} 100%)`,
    oymaSoluk: hsl(h, Math.min(0.5, as), koyuTema ? 0.70 : 0.92, 0.18),
    oyma: hsl(h, Math.min(0.5, as), koyuTema ? 0.70 : 0.92, 0.32),   // çerçevedeki ince çizgiler (soluk)
    // iç: temanın zemin tonunda, hafif karartılmış arka pano
    ic: koyuTema
      ? `repeating-linear-gradient(90deg,rgba(255,255,255,0.025) 0 1px,transparent 1px 9px,rgba(0,0,0,0.12) 9px 10px,transparent 10px 17px), linear-gradient(180deg, ${hsl(bh, Math.min(0.35, bs), 0.04)}, ${hsl(bh, Math.min(0.35, bs), 0.10)})`
      : `repeating-linear-gradient(90deg,rgba(255,255,255,0.035) 0 1px,transparent 1px 9px,rgba(0,0,0,0.10) 9px 10px,transparent 10px 17px), linear-gradient(180deg, ${hsl(h, s * 0.8, 0.17)}, ${hsl(h, s * 0.8, 0.29)})`,
    isik: "radial-gradient(circle, rgba(246,184,94,0.30), rgba(246,184,94,0.08) 45%, rgba(246,184,94,0) 70%)",
    gold: "#d6b05a", altin: "rgba(217,180,90,0.75)", alev: "#f6b85e", mum: "#efe2c4",
  }
  _paletBellek.set(anahtar, p)
  return p
}

// ── RAF RESİMLERİ ──────────────────────────────────────────────────────────
// Dosyalar public/raflar/<raf-id>.webp (önerilen 2400×600, 4:1; 3:1 de olur — bölme
// webde ~7:1, telefonda ~4:1 göründüğü için ortadaki yatay bant esas). Yalnız burada
// listelenen raflar resim kullanır → olmayan dosya için boşuna istek atılmaz.
// Resmi olmayan raf bugünkü çizimde (koyu ahşap pano) kalır.
// konum: object-position — ekran oranı değişince kırpmanın hangi noktaya göre
// yapılacağı (asıl motif bu noktada kalır).
// Eşleşme: kategorinin kimliği YA DA başlığı (kimlikler veriye göre değişebildiği için
// ikisine birden bakılır). Kısım rafları ve Son/Sık Okunanlar; kullanıcının özel rafları hariç.
export const RAF_RESIMLERI = [
  { esle: /kur.?[aâ]n/i,       src: "/raflar/kuran.webp",    konum: "50% 38%" },
  { esle: /evr[aâ]d|ezk[aâ]r/i, src: "/raflar/evrad.webp",    konum: "50% 62%" },
  { esle: /ris[aâ]le/i,        src: "/raflar/risale.webp",   konum: "50% 40%" },
  { esle: /tasavvuf/i,         src: "/raflar/tasavvuf.webp", konum: "50% 46%" },
  { esle: /^di[gğ]er/i,        src: "/raflar/diger.webp",    konum: "50% 55%" },
  { esle: /kel[aâ]m/i,         src: "/raflar/kelam.webp",    konum: "50% 50%" },
  { esle: /f[ıi]k[ıi]h/i,      src: "/raflar/fikih.webp",    konum: "50% 48%" },
  { esle: /tefs[iî]r/i,        src: "/raflar/tefsir.webp",   konum: "50% 50%" },
  { esle: /had[iî]s/i,         src: "/raflar/hadis.webp",    konum: "50% 50%" },
  { esle: /ak[aâ][iî]d/i,      src: "/raflar/akaid.webp",    konum: "50% 52%" },
  { esle: /us[uû]l/i,          src: "/raflar/usul.webp",     konum: "50% 55%" },
  // Âlimler rafı (9 Ekim 2026): bütün kısımların âlimleri bir arada
  { esle: /^alimler$/,         src: "/raflar/alimler.webp",  konum: "50% 52%" },
  // Otomatik raflar: yalnız kimlikle eşleşir (rafResmiBul(rafId))
  { esle: /^son-okunanlar$/,   src: "/raflar/son-okunanlar.webp", konum: "50% 55%" },
  { esle: /^sik-okunanlar$/,   src: "/raflar/sik-okunanlar.webp", konum: "50% 55%" },
]
// Özel raf resmi seçicisinde gösterilen hazır resimler (aynı dosya bir kez)
const HAZIR_RAF_ADLARI = {
  kuran: "Kur'ân", evrad: "Evrâd", risale: "Risale", tasavvuf: "Tasavvuf", diger: "Diğer", kelam: "Kelâm",
  fikih: "Fıkıh", tefsir: "Tefsir", hadis: "Hadis", akaid: "Akâid", usul: "Usûl", alimler: "Âlimler",
  "son-okunanlar": "Son Okunanlar", "sik-okunanlar": "Sık Okunanlar",
}
export const HAZIR_RAF_RESIMLERI = RAF_RESIMLERI
  .filter((r, i, l) => l.findIndex(x => x.src === r.src) === i)
  .map(r => { const ad = (r.src.match(/\/raflar\/(.+)\.webp$/) || [])[1] || ""; return { src: r.src, konum: r.konum, ad: HAZIR_RAF_ADLARI[ad] || ad } })
export function rafResmiBul(id, baslik) {
  return RAF_RESIMLERI.find(r => r.esle.test(String(id || "")) || r.esle.test(String(baslik || ""))) || null
}
