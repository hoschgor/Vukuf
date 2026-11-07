// ══════════════════════════════════════════════════════════════════════════════════════════
// RENKLİ TECVİD — KURAL MOTORU (Diyanet imlâsına göre)
// ──────────────────────────────────────────────────────────────────────────────────────────
// Neden hazır bir veri kullanılmıyor: açık tecvid verilerinin hepsi (ör. cpfair/quran-tajweed,
// CC BY 4.0) Tanzil / Medine imlâsındaki metnin KARAKTER KONUMLARINA bağlı. Bizim metnimiz
// Diyanet imlâsında; harfler aynı ama işaretler farklı yazılıyor, konumlar tutmuyor:
//   • hemze-i vasl düz elif (ا) — âyet başında harekeli (اَلْحَمْدُ), ortada harekesiz (الْحَمْدُ)
//   • sâkin nûn HER ZAMAN cezimli (مِنْ رَبِّهِمْ) — Medine'deki gibi cezimsiz bırakılmıyor
//   • uzun "i" U+0656 (ٖ), uzun "a" U+0670 (ٰ) ile yazılıyor (الرَّحٖيمِ · ذٰلِكَ)
//   • medd işareti (U+0653 ٓ) medd HARFİNİN değil, ondan ÖNCEKİ harfin üstünde (السَّمَٓاءِ)
//   • U+08D1: o harf uzatılmaz/okunmaz (اُو࣑لٰٓئِكَ · اَنَا࣑) · U+08D2: uzatılır (مُسْتَهْزِؤُ۫نَ)
//   • U+08D9: tenvinden sonra vasl nûnu (نُوحٌࣙ ابْنَهُ) — tenvin kuralı uygulanmaz
// Bu yüzden kurallar METNİN KENDİSİNDEN, bu imlâya göre çıkarılıyor. Doğrulama için cpfair
// verisinin âyet başına kural SAYILARIYLA karşılaştırıldı (karakter konumuyla değil).
//
// Birim "küme": bir taban harf + ardındaki birleşen işaretler. MushafKelime metinden bazı
// işaretleri (vakıf, kıraat simgeleri) çıkarsa da hepsi BİRLEŞEN işaret olduğu için taban
// harf sırası değişmez → renk, küme SIRASIYLA (taban indeksiyle) eşlenir.
// ══════════════════════════════════════════════════════════════════════════════════════════

export const BIRLESIK_TECVID = /[ؐ-ًؚ-ٰٟۖ-ۭ࣑-ࣿ]/

// ── KURALLAR (sıra = paneldeki sıra) ─────────────────────────────────────────────────────
// renk: açık ve koyu zeminde okunabilsin diye orta tonlar seçildi.
// acik: ilk kurulumda açık mı (renkli tecvidin KENDİSİ başta kapalı; bu, açıldığında hangi
// kuralların boyanacağı). Medd-i tabii ve okunmayan harfler çok sık geçtiği için kapalı başlar.
export const TECVID_KURALLARI = [
  { id: 'ihfa',      ad: 'İhfâ',                    renk: '#2e9e5b', acik: true,
    aciklama: 'Sâkin nûn veya tenvinden sonra ihfâ harflerinden biri gelirse nûn genizden, gizlice okunur. Sâkin mîmden sonra ب gelirse ihfâ-i şefevî olur.' },
  { id: 'idgamGunne', ad: 'İdğâm-ı maal-ğunne',     renk: '#0e9aa7', acik: true,
    aciklama: 'Sâkin nûn veya tenvinden sonra ي ن م و harflerinden biri gelirse nûn sonraki harfe katılır, genizden okunur. Sâkin mîmden sonra م gelmesi de böyledir (idğâm-ı şefevî).' },
  { id: 'idgamBila', ad: 'İdğâm-ı bilâ-ğunne',      renk: '#6d7fa3', acik: true,
    aciklama: 'Sâkin nûn veya tenvinden sonra ل veya ر gelirse nûn sonraki harfe ğunnesiz katılır.' },
  { id: 'iklab',     ad: 'İklâb',                   renk: '#8e44ad', acik: true,
    aciklama: 'Sâkin nûn veya tenvinden sonra ب gelirse nûn, mîme çevrilerek genizden okunur.' },
  { id: 'gunne',     ad: 'Ğunne',                   renk: '#e67e22', acik: true,
    aciklama: 'Şeddeli nûn ve şeddeli mîm genizden, bir miktar uzatılarak okunur.' },
  { id: 'kalkale',   ad: 'Kalkale',                 renk: '#2f80ed', acik: true,
    aciklama: 'ق ط ب ج د harfleri sâkin olunca (âyet sonunda durulunca da) kısa bir sarsıntıyla okunur.' },
  { id: 'idgamDiger', ad: 'Diğer idğâmlar',         renk: '#c2569b', acik: true,
    aciklama: 'İdğâm-ı misleyn, mütecâniseyn ve mütekâribeyn: sâkin harf, kendisiyle aynı veya mahreci yakın harfe katılır.' },
  { id: 'lamSemsi',  ad: 'Lâm-ı şemsiyye',          renk: '#8a8f98', acik: true,
    aciklama: 'Harf-i tarifin lâmı şemsî harflerden önce okunmaz; sonraki harf şeddeli okunur.' },
  { id: 'meddLazim', ad: 'Medd-i lâzım',            renk: '#c0263a', acik: true,
    aciklama: 'Medd harfinden sonra aynı kelimede sükûn veya şedde gelirse, ayrıca sûre başlarındaki mukattaa harflerinde en uzun çekilir.' },
  { id: 'meddMuttasil', ad: 'Medd-i muttasıl',      renk: '#e53935', acik: true,
    aciklama: 'Medd harfinden sonra AYNI kelimede hemze gelirse uzatılır.' },
  { id: 'meddMunfasil', ad: 'Medd-i munfasıl',      renk: '#ec5f9a', acik: true,
    aciklama: 'Medd harfi kelime sonunda olur ve sonraki kelime hemzeyle başlarsa uzatılır.' },
  { id: 'meddAriz',  ad: 'Medd-i ârız / lîn',       renk: '#c58b0b', acik: true,
    aciklama: 'Âyet sonunda durulurken son harften önceki medd (veya lîn) harfi uzatılabilir.' },
  { id: 'meddTabii', ad: 'Medd-i tabiî',            renk: '#8f9a24', acik: false,
    aciklama: 'Sebebi olmayan, bir elif miktarı (iki hareke) çekilen tabiî uzatma. Çok sık geçtiği için başta kapalı.' },
  { id: 'okunmayan', ad: 'Okunmayan harfler',       renk: '#b3b9c1', acik: false,
    aciklama: 'Yazılıp okunmayan harfler: kelime ortasında hemze-i vasl, çoğul vavından sonraki elif, tenvinden sonraki elif/yâ ve kasr işaretli harfler.' },
]
export const TECVID_KURAL = Object.fromEntries(TECVID_KURALLARI.map(k => [k.id, k]))

// ── HARF SINIFLARI ───────────────────────────────────────────────────────────────────────
const IHFA = new Set([...'تثجدذزسشصضطظفقك'])
const YENMU = new Set([...'ينمو'])
const KALKALE = new Set([...'قطبجد'])
const SEMSI = new Set([...'تثدذرزسشصضطظلن'])
const HEMZE_HARF = new Set([...'ءأإؤئ'])
// Mahreç yakınlığı / cinsdeşlik ile idğâm olan çiftler (Hafs). Anahtar: sâkin + sonraki.
const IDGAM_CIFT = new Set(['تد', 'دت', 'تط', 'طت', 'ذظ', 'ثذ', 'بم', 'لر', 'قك'])

const F = 'َ', D = 'ُ', K = 'ِ', SUK = 'ْ', SED = 'ّ'
const TF = 'ً', TD = 'ٌ', TK = 'ٍ'
const UST_ELIF = 'ٰ', ALT_ELIF = 'ٖ', MEDDE = 'ٓ', HEMZE_UST = 'ٔ'
const KASR = '࣑', MED = '࣒', VASL_NUN = 'ࣙ', SEKTE = 'ۜ'

export function kumele(arabic) {
  const out = []
  for (const ch of String(arabic || '')) {
    if (BIRLESIK_TECVID.test(ch) && out.length) out[out.length - 1].m += ch
    else out.push({ h: ch, m: '' })
  }
  return out
}

const var_ = (k, c) => !!k && k.m.includes(c)
const harfMi = (k) => !!k && /[ء-يٱ]/.test(k.h)
const tenvinli = (k) => var_(k, TF) || var_(k, TD) || var_(k, TK)
const harekeli = (k) => !!k && (var_(k, F) || var_(k, D) || var_(k, K) || tenvinli(k) || var_(k, UST_ELIF) || var_(k, ALT_ELIF))
const sakin = (k) => var_(k, SUK)
const seddeli = (k) => var_(k, SED)
const ciplak = (k) => !!k && !harekeli(k) && !sakin(k) && !seddeli(k)
const hemzeMi = (k) => !!k && (HEMZE_HARF.has(k.h) || var_(k, HEMZE_UST) || ((k.h === 'ا' || k.h === 'ٱ') && harekeli(k)))
// Kelime başında harekeli elif: ayrı kelimenin hemzesi gibi davranır (يَٓااَيُّهَا)
const elifHemze = (k) => !!k && k.h === 'ا' && harekeli(k)

// Sakin harften / tenvinden sonra OKUNAN ilk harf. Tenvinde kelimenin kalanı (ا/ى) yazılıp
// okunmaz; doğrudan sonraki kelimeye geçilir. Sonraki kelime hemze-i vasl ile başlıyorsa
// (çıplak elif) iki sâkin buluşur, sâkin harekelenir → hiçbir kural uygulanmaz: null.
function sonrakiHarf(kel, wi, ci, kelimeSonunaAtla) {
  const w = kel[wi]
  if (!kelimeSonunaAtla) {
    for (let j = ci + 1; j < w.length; j++) {
      if (w[j].h === '‌') continue
      if (w[j].h === 'ـ' && !w[j].m) continue
      return { k: w[j], wi, ci: j, ayni: true }
    }
  }
  const s = kel[wi + 1]
  if (!s || !s.length) return null
  const ilk = s[0]
  if ((ilk.h === 'ا' || ilk.h === 'ٱ') && ciplak(ilk)) return null
  return { k: ilk, wi: wi + 1, ci: 0, ayni: false }
}

// Kelime içinde tenvinden sonra okunmayan elif/yâ (مَرَضًا · هُدًى)
function tenvinSonuOkunmaz(w, ci) {
  const r = []
  for (let j = ci + 1; j < w.length; j++) {
    const k = w[j]
    if ((k.h === 'ا' || k.h === 'ى' || k.h === 'ي') && ciplak(k)) r.push(j)
    else break
  }
  return r
}

// Kelimenin OKUNAN son kümesi: sondaki okunmayan elif (قَالُٓوا), işaretsiz tatvil vb. atlanır.
function sonKume(w, rw) {
  let j = w.length - 1
  while (j > 0 && (!harfMi(w[j]) || rw[j] === 'okunmayan')) j--
  return j
}

// ── ÂYET ÇÖZÜMLEMESİ ─────────────────────────────────────────────────────────────────────
// girdi: âyetin kelimeleri (arabic metinleri), sırayla. çıktı: her kelime için küme
// sayısı uzunluğunda dizi; eleman kural id'si veya null.
export function ayetTecvid(kelimeler) {
  const kel = kelimeler.map(kumele)
  const r = kel.map(w => w.map(() => null))
  const ata = (wi, ci, id, zorla = false) => {
    if (wi < 0 || wi >= r.length || ci < 0 || ci >= r[wi].length) return
    if (zorla || !r[wi][ci]) r[wi][ci] = id
  }
  const sonKelime = kel.length - 1
  // Lafzatullah (الله · لِلّٰهِ · وَاللّٰهُ …) zaten kendi rengiyle çiziliyor: lâmına şemsî denmez.
  const lafza = kel.map(w => w.map(k => k.h).join('').includes('لله'))

  for (let wi = 0; wi < kel.length; wi++) {
    const w = kel[wi]
    for (let ci = 0; ci < w.length; ci++) {
      const k = w[ci]
      if (!harfMi(k)) continue

      // ── OKUNMAYAN HARFLER ──
      if (var_(k, KASR) && (k.h === 'ا' || k.h === 'و' || k.h === 'ي' || k.h === 'ى')) { ata(wi, ci, 'okunmayan'); continue }
      if (ci === 0 && wi > 0 && (k.h === 'ا' || k.h === 'ٱ') && ciplak(k)) { ata(wi, ci, 'okunmayan'); continue }
      if (ci === w.length - 1 && k.h === 'ا' && ciplak(k) && ci > 0 && w[ci - 1].h === 'و' && !harekeli(w[ci - 1])) {
        ata(wi, ci, 'okunmayan'); continue
      }

      // ── NÛN-İ SÂKİN VE TENVİN ──
      const nunSakin = k.h === 'ن' && sakin(k)
      const tenvin = tenvinli(k) && !var_(k, VASL_NUN)
      if (nunSakin || tenvin) {
        // Tenvinden sonraki elif/yâ geçerken okunmaz; âyet sonunda durulunca elif okunur (ıvaz)
        if (tenvin && wi !== sonKelime) for (const j of tenvinSonuOkunmaz(w, ci)) ata(wi, j, 'okunmayan')
        const s = sonrakiHarf(kel, wi, ci, tenvin)
        if (s && harfMi(s.k) && !var_(k, SEKTE)) {
          const h = s.k.h
          if (YENMU.has(h)) { if (!(s.ayni && h !== 'ن' && h !== 'م')) ata(wi, ci, 'idgamGunne', true) }
          else if (h === 'ل' || h === 'ر') ata(wi, ci, 'idgamBila', true)
          else if (h === 'ب') ata(wi, ci, 'iklab', true)
          else if (IHFA.has(h)) ata(wi, ci, 'ihfa', true)
        }
        if (nunSakin) continue
      }

      // ── MÎM-İ SÂKİN ──
      if (k.h === 'م' && sakin(k)) {
        const s = sonrakiHarf(kel, wi, ci, false)
        if (s && s.k.h === 'ب') ata(wi, ci, 'ihfa', true)
        else if (s && s.k.h === 'م') ata(wi, ci, 'idgamGunne', true)
        continue
      }

      // ── ĞUNNE (şeddeli nûn / mîm) ──
      if ((k.h === 'ن' || k.h === 'م') && seddeli(k)) ata(wi, ci, 'gunne')

      // ── DİĞER SÂKİN HARFLER: idğâm (misleyn / mütecâniseyn / mütekâribeyn) ve kalkale ──
      if (sakin(k)) {
        const s = sonrakiHarf(kel, wi, ci, false)
        const h2 = s && harfMi(s.k) ? s.k.h : null
        const idgam = h2 && !var_(k, SEKTE) && (
          (h2 === k.h && k.h !== 'و' && k.h !== 'ي') || IDGAM_CIFT.has(k.h + h2)
        )
        if (idgam) { ata(wi, ci, 'idgamDiger', true); continue }
        if (KALKALE.has(k.h)) { ata(wi, ci, 'kalkale'); continue }
      }

      // ── LÂM-I ŞEMSİYYE ──
      if (k.h === 'ل' && ciplak(k) && !lafza[wi]) {
        const n = w[ci + 1]
        if (n && seddeli(n) && SEMSI.has(n.h)) ata(wi, ci, 'lamSemsi')
      }
    }

    // ── KALKALE: âyet sonunda durulurken son harf ──
    if (wi === sonKelime) {
      let j = w.length - 1
      while (j >= 0 && !harfMi(w[j])) j--
      if (j >= 0 && KALKALE.has(w[j].h) && !r[wi][j]) ata(wi, j, 'kalkale')
    }
  }

  // ── MEDLER ─────────────────────────────────────────────────────────────────────────────
  for (let wi = 0; wi < kel.length; wi++) {
    const w = kel[wi]
    for (let ci = 0; ci < w.length; ci++) {
      const k = w[ci]
      if (!harfMi(k) && k.h !== 'ـ') continue
      if (var_(k, KASR)) continue
      const n = w[ci + 1]
      const nUygun = n && !var_(n, KASR)
      let son = -1          // medd harfinin (uzatmanın) bittiği küme
      const medde = var_(k, MEDDE)
      if (var_(k, F) && nUygun && (n.h === 'ا' || n.h === 'ى') && ciplak(n)) son = ci + 1
      else if ((var_(k, K) || var_(k, ALT_ELIF)) && nUygun && (n.h === 'ي' || n.h === 'ى') && ciplak(n)) son = ci + 1
      else if (var_(k, D) && nUygun && n.h === 'و' && ciplak(n)) son = ci + 1
      // Üstün elif: ardından gelen çıplak ى / و yalnız elifi taşır (عَلٰى · الصَّلٰوةَ · الرِّبٰٓوا)
      else if (var_(k, UST_ELIF)) son = (nUygun && (n.h === 'ى' || n.h === 'و') && ciplak(n)) ? ci + 1 : ci
      else if (var_(k, ALT_ELIF) || var_(k, MED)) son = ci
      else if (medde) son = ci       // sûre başı harfleri (الٓمٓ) · sıla (رَبُّهُٓ اَسْلِمْ)
      if (son < 0) continue

      let tur = 'meddTabii'
      const sonraki = w[son + 1]
      if (medde && !harekeli(k)) tur = 'meddLazim'
      // Medd-i fark (آٰلذَّكَرَيْنِ · آٰللّٰهُ): şemsî/şeddeli lâmdan önce de lâzım
      else if (medde && sonraki && sonraki.h === 'ل' && ciplak(sonraki) && seddeli(w[son + 2])) tur = 'meddLazim'
      else if (sonraki && (sakin(sonraki) || seddeli(sonraki))) {
        // Medde YOKSA bu bir medd değil: önek + hemze-i vasl (وَالَّذٖينَ · فَاتَّقُوا · وَاضْرِبْ);
        // elif okunmaz. Diyanet imlâsında gerçek medd-i lâzım daima meddeli (الضَّٓالّٖينَ).
        if (!medde) {
          if (son === ci + 1 && w[son].h === 'ا') ata(wi, son, 'okunmayan')
          ci = son
          continue
        }
        tur = 'meddLazim'
      }
      else if (sonraki && hemzeMi(sonraki)) {
        // ha-i tenbîh (هٰٓؤُلَٓاءِ · هَٓاَنْتُمْ) ve bitişik yazılmış nidâ (يَٓااَيُّهَا) ayrı kelime sayılır
        const tenbih = ci === 0 && k.h === 'ه'
        tur = (elifHemze(sonraki) || tenbih) ? 'meddMunfasil' : 'meddMuttasil'
      } else if (sonKume(w, r[wi]) === son) {
        const s = kel[wi + 1]?.[0]
        if (s && (s.h === 'ا' || s.h === 'ٱ') && ciplak(s)) continue   // iki sâkin buluştu: medd düşer
        if (s && hemzeMi(s)) tur = 'meddMunfasil'
        else if (medde) tur = 'meddMunfasil'
      } else if (wi === sonKelime && sonKume(w, r[wi]) === son + 1 && !var_(w[son + 1], TF)
        && !var_(w[son + 1], UST_ELIF) && !var_(w[son + 1], MEDDE) && !var_(w[son + 1], ALT_ELIF)) tur = 'meddAriz'
      else if (medde) tur = 'meddMuttasil'

      for (let j = ci; j <= son; j++) ata(wi, j, tur)
      ci = son
    }
    // Lîn: âyet sonunda fethadan sonra sâkin و/ي, ardından son harf (خَوْفٍ · الْبَيْتِ)
    if (wi === sonKelime && w.length >= 3) {
      const j = w.length - 2
      if ((w[j].h === 'و' || w[j].h === 'ي') && sakin(w[j]) && var_(w[j - 1], F)) {
        ata(wi, j - 1, 'meddAriz'); ata(wi, j, 'meddAriz')
      }
    }
  }
  return r
}

// ── ÖNBELLEK ─────────────────────────────────────────────────────────────────────────────
// Sayfa çizilirken âyet başına BİR kez hesaplanır; anahtar ilk kelimenin id'si + kelime sayısı.
const onbellek = new Map()
// `kelimeler` dizi ya da diziyi veren işlev olabilir (önbellekteyse metinler hiç toplanmaz).
export function ayetTecvidOnbellek(anahtar, kelimeler) {
  let v = onbellek.get(anahtar)
  if (!v) {
    v = ayetTecvid(typeof kelimeler === 'function' ? kelimeler() : kelimeler)
    if (onbellek.size > 4000) onbellek.clear()
    onbellek.set(anahtar, v)
  }
  return v
}
