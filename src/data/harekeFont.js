/* ═══════════════════════════════════════════════════════════════════════════
   VUKUF — RENKLİ HAREKE İÇİN YAZI TİPİ KATMANLARI
   src/data/harekeFont.js

   15 Kasım 2026 — kullanıcı: "KuranOkuma bölümünde tema ayarlarına alt kısma renkli hareke
   seçeneği koyalım, aktif edilirse harekeler renklendirilsin ve kullanıcı rengini
   değiştirebilsin … Özel hareke … tüm harekeleri ayrı ayrı renklendirebilsin."

   NİÇİN BU YOL: harekeyi harfinden ayrı bir <span>'e alıp boyamak Chrome'da ÇALIŞMIYOR —
   Chrome işareti harfle aynı kümede çizdiği için işaretin rengini yok sayıp harfin rengini
   veriyor (ölçüldü). Harekesiz metni üstüne bindirmek de olmuyor: harekeler çıkınca
   bazı yazı tiplerinde harf aralıkları değişiyor (çakışmayı önleyen aralık ayarları,
   hançer elifin yeri) ve katmanlar kayıyor (ölçüldü).
   ÇÖZÜM: aynı yazı tipinin, TARAYICIDA üretilen kopyaları. Kopyalarda bütün şekillendirme
   tabloları (GSUB/GPOS) ve harf genişlikleri AYNEN kalır, yalnız bazı harflerin ÇİZİMİ
   boşaltılır:
     • "taban" kopyası: harekeler boş → metin rengiyle çizilir (harfler, hemze, işaretler)
     • "hepsi" kopyası: yalnız harekeler dolu → hareke rengiyle tam üstüne bindirilir
     • grup kopyaları (fetha, kesra, …): yalnız o grubun harekeleri → özel renklerde
   Aynı metin aynı tablolarla şekillendiği için katmanlar piksel piksel üst üste oturur;
   her tarayıcıda çalışır.
   Hangi şeklin hangi harekeye ait olduğu: GDEF'te "işaret" sınıfındaki şekiller, cmap ile
   Unicode'a; GSUB'un ürettiği türev şekiller (küçük fetha, şedde+fetha bitişiği vb.)
   kaynaklarından grup devralır. Şedde ile bir harekenin TEK ŞEKİLDE birleştiği yazı
   tiplerinde o bitişik şekil harekenin rengini alır.
   Yalnız TrueType (glyf) yazı tipleri; CFF (ör. .otf Indopak) desteklenmez.
   ═══════════════════════════════════════════════════════════════════════════ */

import { useSyncExternalStore } from "react"

// ── HAREKE GRUPLARI ─────────────────────────────────────────────────────────
export const HAREKE_GRUPLARI = [
  { id: "fetha",  ad: "Üstün (fetha)",   cp: [0x064E] },
  { id: "kesra",  ad: "Esre (kesra)",    cp: [0x0650] },
  { id: "damme",  ad: "Ötre (damme)",    cp: [0x064F, 0x0657] },
  { id: "tenvin", ad: "Tenvin",          cp: [0x064B, 0x064C, 0x064D, 0x08F0, 0x08F1, 0x08F2] },
  { id: "sukun",  ad: "Cezm (sükûn)",    cp: [0x0652, 0x06E1, 0x06DF] },
  { id: "sedde",  ad: "Şedde",           cp: [0x0651] },
  { id: "uzatma", ad: "Uzatma (çeker, medde)", cp: [0x0670, 0x0656, 0x0653] },
]
const CP_GRUP = new Map()
for (const g of HAREKE_GRUPLARI) for (const c of g.cp) CP_GRUP.set(c, g.id)
// Bitişik şekillerde öncelik: şedde/sükûn yerine harekenin rengi görünsün
const ONCELIK = ["fetha", "kesra", "damme", "tenvin", "uzatma", "sukun", "sedde"]

// Arapça yazı tipi kimliği → dosya (index.css ile aynı)
export const HAREKE_FONT_DOSYA = {
  Vukuf: "/fonts/Vukuf.ttf",
  VukufInce: "/fonts/VukufInce.ttf",
  kfgqpc: "/fonts/KFGQPC Uthmanic.ttf",
  uc_ondokuz: "/fonts/uc_ondokuz.ttf",
  "me-quran": "/fonts/Me_Quran.ttf",
  IndopakNastaleeq: "/fonts/indopak-nastaleeq.ttf",
}

// font-family yazısından (ör. "'KFGQPC Uthmanic', serif") yazı tipi kimliği
const AILE_KIMLIK = {
  "vukuf": "Vukuf", "vukuf ince": "VukufInce", "kfgqpc uthmanic": "kfgqpc", "uc_ondokuz": "uc_ondokuz",
  "me_quran": "me-quran", "indopaknastaleeq": "IndopakNastaleeq",
}
export function harekeFontKimligi(aile) {
  const ilk = String(aile || "").split(",")[0].replace(/['"]/g, "").trim().toLowerCase()
  return AILE_KIMLIK[ilk] || null
}

// ── TTF OKUMA ───────────────────────────────────────────────────────────────
function tablolar(dv) {
  const n = dv.getUint16(4), t = {}
  for (let i = 0; i < n; i++) {
    const o = 12 + i * 16
    const etiket = String.fromCharCode(dv.getUint8(o), dv.getUint8(o + 1), dv.getUint8(o + 2), dv.getUint8(o + 3))
    t[etiket] = { ofs: dv.getUint32(o + 8), uz: dv.getUint32(o + 12) }
  }
  return t
}
function cmapOku(dv, t) {
  const b = t.cmap.ofs, n = dv.getUint16(b + 2)
  let sec = null, secPuan = -1
  for (let i = 0; i < n; i++) {
    const pl = dv.getUint16(b + 4 + i * 8), en = dv.getUint16(b + 6 + i * 8), of = dv.getUint32(b + 8 + i * 8)
    const bic = dv.getUint16(b + of)
    const puan = (pl === 3 && en === 10 && bic === 12) ? 3 : (pl === 0 && bic === 12) ? 2 : (pl === 3 && en === 1 && bic === 4) ? 1 : (pl === 0 && bic === 4) ? 0.5 : -1
    if (puan > secPuan) { secPuan = puan; sec = b + of }
  }
  const harita = new Map()     // şekil → kod noktası
  if (sec == null) return harita
  const bic = dv.getUint16(sec)
  if (bic === 4) {
    const seg = dv.getUint16(sec + 6) / 2
    const son = sec + 14, bas = son + seg * 2 + 2, del = bas + seg * 2, ro = del + seg * 2
    for (let i = 0; i < seg; i++) {
      const e = dv.getUint16(son + i * 2), s = dv.getUint16(bas + i * 2)
      const d = dv.getInt16(del + i * 2), r = dv.getUint16(ro + i * 2)
      for (let c = s; c <= e && c !== 0xFFFF; c++) {
        let g
        if (r === 0) g = (c + d) & 0xFFFF
        else { const a = ro + i * 2 + r + (c - s) * 2; g = dv.getUint16(a); if (g) g = (g + d) & 0xFFFF }
        if (g && !harita.has(g)) harita.set(g, c)
      }
    }
  } else if (bic === 12) {
    const n2 = dv.getUint32(sec + 12)
    for (let i = 0; i < n2; i++) {
      const o = sec + 16 + i * 12
      const s = dv.getUint32(o), e = dv.getUint32(o + 4), g0 = dv.getUint32(o + 8)
      if (e - s > 5000) continue
      for (let c = s; c <= e; c++) { const g = g0 + c - s; if (!harita.has(g)) harita.set(g, c) }
    }
  }
  return harita
}
function sinifOku(dv, o, cb) {
  const bic = dv.getUint16(o)
  if (bic === 1) {
    const ilk = dv.getUint16(o + 2), n = dv.getUint16(o + 4)
    for (let i = 0; i < n; i++) cb(ilk + i, dv.getUint16(o + 6 + i * 2))
  } else if (bic === 2) {
    const n = dv.getUint16(o + 2)
    for (let i = 0; i < n; i++) {
      const r = o + 4 + i * 6, s = dv.getUint16(r), e = dv.getUint16(r + 2), k = dv.getUint16(r + 4)
      for (let g = s; g <= e; g++) cb(g, k)
    }
  }
}
function kapsam(dv, o) {
  const bic = dv.getUint16(o), l = []
  if (bic === 1) { const n = dv.getUint16(o + 2); for (let i = 0; i < n; i++) l.push(dv.getUint16(o + 4 + i * 2)) }
  else if (bic === 2) {
    const n = dv.getUint16(o + 2)
    for (let i = 0; i < n; i++) { const r = o + 4 + i * 6, s = dv.getUint16(r), e = dv.getUint16(r + 2); for (let g = s; g <= e; g++) l.push(g) }
  }
  return l
}
// GSUB: (girdi şekilleri → çıktı şekli) ilişkileri — tek, çoklu, seçenekli, bitişik
function gsubIliskileri(dv, t) {
  const iliski = []    // { girdi: [g…], cikti: [g…] }
  if (!t.GSUB) return iliski
  const b = t.GSUB.ofs
  const ll = b + dv.getUint16(b + 8)
  const n = dv.getUint16(ll)
  const altTablo = (tur, o) => {
    if (tur === 7) { const t2 = dv.getUint16(o + 2); altTablo(t2, o + dv.getUint32(o + 4)); return }
    const bic = dv.getUint16(o)
    if (tur === 1) {
      const kap = kapsam(dv, o + dv.getUint16(o + 2))
      if (bic === 1) { const d = dv.getInt16(o + 4); kap.forEach(g => iliski.push({ girdi: [g], cikti: [(g + d) & 0xFFFF] })) }
      else { kap.forEach((g, i) => iliski.push({ girdi: [g], cikti: [dv.getUint16(o + 6 + i * 2)] })) }
    } else if (tur === 2 || tur === 3) {
      const kap = kapsam(dv, o + dv.getUint16(o + 2))
      kap.forEach((g, i) => {
        const so = o + dv.getUint16(o + 6 + i * 2), m = dv.getUint16(so), c = []
        for (let j = 0; j < m; j++) c.push(dv.getUint16(so + 2 + j * 2))
        iliski.push({ girdi: [g], cikti: c })
      })
    } else if (tur === 4) {
      const kap = kapsam(dv, o + dv.getUint16(o + 2))
      kap.forEach((g, i) => {
        const ls = o + dv.getUint16(o + 6 + i * 2), m = dv.getUint16(ls)
        for (let j = 0; j < m; j++) {
          const lo = ls + dv.getUint16(ls + 2 + j * 2)
          const lig = dv.getUint16(lo), k = dv.getUint16(lo + 2), girdi = [g]
          for (let q = 1; q < k; q++) girdi.push(dv.getUint16(lo + 4 + (q - 1) * 2))
          iliski.push({ girdi, cikti: [lig] })
        }
      })
    }
  }
  for (let i = 0; i < n; i++) {
    const lo = ll + dv.getUint16(ll + 2 + i * 2)
    const tur = dv.getUint16(lo), m = dv.getUint16(lo + 4)
    for (let j = 0; j < m; j++) { try { altTablo(tur, lo + dv.getUint16(lo + 6 + j * 2)) } catch { /* bozuk alt tablo */ } }
  }
  return iliski
}

/** Şekil başına hareke grubu (Map şekil → grup id) */
function sekilGruplari(dv, t) {
  const sayi = dv.getUint16(t.maxp.ofs + 4)
  const isaret = new Set()
  if (t.GDEF) {
    const so = dv.getUint16(t.GDEF.ofs + 4)
    if (so) sinifOku(dv, t.GDEF.ofs + so, (g, k) => { if (k === 3) isaret.add(g) })
  }
  const grup = new Map()
  for (const [g, cp] of cmapOku(dv, t)) { const id = CP_GRUP.get(cp); if (id) grup.set(g, id) }
  // GSUB türevleri: çıktılar girdilerin grubunu devralır (bitişikte öncelikli grup)
  const iliski = gsubIliskileri(dv, t)
  for (let tur = 0; tur < 6; tur++) {
    let degisti = false
    for (const r of iliski) {
      const gl = r.girdi.map(g => grup.get(g)).filter(Boolean)
      if (!gl.length) continue
      // Bitişikte girdilerden biri hareke değilse (harf + hareke bitişiği) çıktı taban sayılır
      if (r.cikti.length === 1 && r.girdi.length > 1 && gl.length < r.girdi.length) continue
      const sec = ONCELIK.find(x => gl.includes(x))
      for (const c of r.cikti) {
        if (c >= sayi || grup.has(c)) continue
        if (isaret.size && !isaret.has(c)) continue     // harf şekline dönüşen (ör. hançer elif → elif) taban kalır
        grup.set(c, sec); degisti = true
      }
    }
    if (!degisti) break
  }
  return grup
}

// ── TTF YAZMA ───────────────────────────────────────────────────────────────
// katman: "taban" (harekeler boş) | "hepsi" (yalnız harekeler) | grup id (yalnız o grup).
// BİLEŞİK ŞEKİLLER: şedde+hareke gibi bitişik şekiller çoğu yazı tipinde iki şeklin
// bileşimi (ör. KFGQPC "şedde_fetha" = şedde + fetha). Bileşenlerden biri boşaltılınca
// tarayıcı bütün bileşik şekli çizmiyor (ölçüldü) → bileşik şekil o katmana göre
// YENİDEN YAZILIYOR: yalnız o katmanın grubundaki bileşenler kalıyor (fetha katmanında
// yalnız fetha, şedde katmanında yalnız şedde); kalan bileşenlerin çizimi korunuyor.
const BILESIK = { KELIME: 0x0001, OLCEK: 0x0008, DAHA: 0x0020, XY: 0x0040, IKIYEIKI: 0x0080, KOMUT: 0x0100 }
function bilesenler(u8, a, b) {
  const v = new DataView(u8.buffer, u8.byteOffset + a, b - a)
  if (b - a < 10 || v.getInt16(0) >= 0) return null
  const l = []
  let o = 10
  for (;;) {
    const bayrak = v.getUint16(o), sekil = v.getUint16(o + 2)
    let uz = 4 + ((bayrak & BILESIK.KELIME) ? 4 : 2)
    if (bayrak & BILESIK.OLCEK) uz += 2
    else if (bayrak & BILESIK.XY) uz += 4
    else if (bayrak & BILESIK.IKIYEIKI) uz += 8
    l.push({ o, uz, bayrak, sekil })
    o += uz
    if (!(bayrak & BILESIK.DAHA)) break
  }
  return l
}
// Basit şekil → noktalar; noktalar → basit şekil (bileşik şekli tek parçaya indirmek için)
function basitOku(u8, a, b) {
  const v = new DataView(u8.buffer, u8.byteOffset + a, b - a)
  const n = v.getInt16(0)
  if (n <= 0) return { son: [], x: [], y: [], on: [] }
  const son = []
  for (let i = 0; i < n; i++) son.push(v.getUint16(10 + i * 2))
  const nokta = son[n - 1] + 1
  let o = 10 + n * 2
  o += 2 + v.getUint16(o)
  const bayrak = []
  while (bayrak.length < nokta) {
    const f = v.getUint8(o++)
    bayrak.push(f)
    if (f & 8) { let r = v.getUint8(o++); while (r-- > 0) bayrak.push(f) }
  }
  const x = [], y = []
  let c = 0
  for (const f of bayrak) {
    if (f & 2) { const d = v.getUint8(o++); c += (f & 16) ? d : -d }
    else if (!(f & 16)) { c += v.getInt16(o); o += 2 }
    x.push(c)
  }
  c = 0
  for (const f of bayrak) {
    if (f & 4) { const d = v.getUint8(o++); c += (f & 32) ? d : -d }
    else if (!(f & 32)) { c += v.getInt16(o); o += 2 }
    y.push(c)
  }
  return { son, x, y, on: bayrak.map(f => f & 1) }
}
function basitYaz(p) {
  const n = p.son.length, m = p.x.length
  if (!n || !m) return null
  const uz = 10 + n * 2 + 2 + m + m * 4
  const out = new Uint8Array(uz + ((4 - uz % 4) % 4))
  const v = new DataView(out.buffer)
  v.setInt16(0, n)
  v.setInt16(2, Math.min(...p.x)); v.setInt16(4, Math.min(...p.y)); v.setInt16(6, Math.max(...p.x)); v.setInt16(8, Math.max(...p.y))
  p.son.forEach((e, i) => v.setUint16(10 + i * 2, e))
  let o = 10 + n * 2
  v.setUint16(o, 0); o += 2
  for (let i = 0; i < m; i++) out[o++] = p.on[i] ? 1 : 0
  let c = 0
  for (let i = 0; i < m; i++) { v.setInt16(o, p.x[i] - c); c = p.x[i]; o += 2 }
  c = 0
  for (let i = 0; i < m; i++) { v.setInt16(o, p.y[i] - c); c = p.y[i]; o += 2 }
  return out
}
// Bileşik şeklin seçilen bileşenlerini (iç içe olanlar dahil) tek basit şekle indir
function duzlestir(u8, sekilVeri, g, secim, derinlik = 0) {
  const [a, b] = sekilVeri(g)
  if (b <= a || derinlik > 6) return { son: [], x: [], y: [], on: [] }
  const bl = bilesenler(u8, a, b)
  if (!bl) return basitOku(u8, a, b)
  const v = new DataView(u8.buffer, u8.byteOffset + a, b - a)
  const top = { son: [], x: [], y: [], on: [] }
  for (const c of (secim || bl)) {
    if (!(c.bayrak & 0x0002)) continue                 // nokta eşleme (çok nadir) — atlanır
    let o = c.o + 4, dx, dy
    if (c.bayrak & BILESIK.KELIME) { dx = v.getInt16(o); dy = v.getInt16(o + 2); o += 4 }
    else { dx = v.getInt8(o); dy = v.getInt8(o + 1); o += 2 }
    let xx = 1, xy = 0, yx = 0, yy = 1
    const f2 = (q) => v.getInt16(q) / 16384
    if (c.bayrak & BILESIK.OLCEK) { xx = yy = f2(o) }
    else if (c.bayrak & BILESIK.XY) { xx = f2(o); yy = f2(o + 2) }
    else if (c.bayrak & BILESIK.IKIYEIKI) { xx = f2(o); xy = f2(o + 2); yx = f2(o + 4); yy = f2(o + 6) }
    const p = duzlestir(u8, sekilVeri, c.sekil, null, derinlik + 1)
    const kay = top.x.length
    p.son.forEach(e => top.son.push(e + kay))
    for (let i = 0; i < p.x.length; i++) {
      top.x.push(Math.round(p.x[i] * xx + p.y[i] * yx + dx))
      top.y.push(Math.round(p.x[i] * xy + p.y[i] * yy + dy))
      top.on.push(p.on[i])
    }
  }
  return top
}
function kopyaUret(buf, dv, t, katman, grup) {
  const sayi = dv.getUint16(t.maxp.ofs + 4)
  const kisa = dv.getInt16(t.head.ofs + 50) === 0
  const loca = (i) => kisa ? dv.getUint16(t.loca.ofs + i * 2) * 2 : dv.getUint32(t.loca.ofs + i * 4)
  const kaynak = new Uint8Array(buf)
  const gb = t.glyf.ofs
  const sekilVeri = (g) => [gb + loca(g), gb + loca(g + 1)]
  // Bu katmanda bu grup görünür mü
  const gorunur = (gr) => katman === "taban" ? !gr : katman === "hepsi" ? !!gr : gr === katman
  const yeni = new Array(sayi).fill(null)       // şekil → Uint8Array (null = boş)
  const zorunlu = new Set()                      // korunan bileşik şekillerin bileşenleri
  for (let g = 0; g < sayi; g++) {
    const [a, b] = sekilVeri(g)
    if (b <= a) continue
    const gr = grup.get(g)
    const bl = bilesenler(kaynak, a, b)
    if (!bl) { if (gorunur(gr)) yeni[g] = kaynak.subarray(a, b); continue }
    // Bileşik: bileşen ana şeklin grubunu alır — yalnız ŞEDDE bileşeni kendi grubunda kalır.
    // (Vukuf'ta esre, fethanın aşağı taşınmış bileşimi: bileşen "fetha" görünse de esredir;
    // şedde+esre bitişiğinde şedde şedde rengi, öbür parça esre rengi alır.)
    const bilesenGrubu = (c) => {
      const kg = grup.get(c.sekil)
      if (kg === "sedde" && gr && gr !== "sedde") return "sedde"
      return gr ?? kg
    }
    if (gr) {
      // Hareke bileşikleri her zaman TEK PARÇAYA indirilir: bileşen şekli kendi başına bu
      // katmanda görünmeyebilir (ör. Vukuf'ta esre = fetha bileşeni; fetha esre katmanında görünmemeli)
      const secilen = bl.filter(c => gorunur(bilesenGrubu(c)))
      if (secilen.length) yeni[g] = basitYaz(duzlestir(kaynak, sekilVeri, g, secilen))
      continue
    }
    if (katman !== "taban") continue          // taban harfler yalnız taban katmanında
    if (bl.some(c => grup.has(c.sekil))) {
      // Harf + hareke bileşiği: hareke parçası çıkarılıp tek parçaya indirilir
      const secilen = bl.filter(c => !grup.has(c.sekil))
      if (secilen.length) yeni[g] = basitYaz(duzlestir(kaynak, sekilVeri, g, secilen))
      continue
    }
    yeni[g] = kaynak.subarray(a, b)
    bl.forEach(c => zorunlu.add(c.sekil))
  }
  // Bileşenlerin kendi çizimleri (boşaltılmışsa) geri konur — iç içe bileşikler dahil
  const bekleyen = [...zorunlu]
  while (bekleyen.length) {
    const c = bekleyen.pop()
    if (c >= sayi || yeni[c]) continue
    const [a, b] = sekilVeri(c)
    if (b <= a) continue
    yeni[c] = kaynak.subarray(a, b)
    const bl = bilesenler(kaynak, a, b)
    if (bl) bl.forEach(x => bekleyen.push(x.sekil))
  }
  const parcalar = [], yeniLoca = new Uint32Array(sayi + 1)
  let uz = 0
  for (let g = 0; g < sayi; g++) {
    yeniLoca[g] = uz
    const p = yeni[g]
    if (p) {
      parcalar.push(p); uz += p.length
      const pay = (4 - (uz % 4)) % 4
      if (pay) { parcalar.push(new Uint8Array(pay)); uz += pay }
    }
  }
  yeniLoca[sayi] = uz
  if (!uz) return null            // bu katmanda çizilecek bir şey yok (boş glyf tablosu geçersiz sayılır)
  const glyf = new Uint8Array(uz)
  let k = 0
  for (const p of parcalar) { glyf.set(p, k); k += p.length }
  const locaB = new Uint8Array((sayi + 1) * 4)
  const lv = new DataView(locaB.buffer)
  for (let i = 0; i <= sayi; i++) lv.setUint32(i * 4, yeniLoca[i])
  // Tabloları yeniden diz (DSIG atılır — imza artık geçersiz)
  const etiketler = Object.keys(t).filter(e => e !== "DSIG").sort()
  const veri = {}
  for (const e of etiketler) {
    if (e === "glyf") veri[e] = glyf
    else if (e === "loca") veri[e] = locaB
    else veri[e] = kaynak.slice(t[e].ofs, t[e].ofs + t[e].uz)
  }
  const hv = new DataView(veri.head.buffer, veri.head.byteOffset, veri.head.byteLength)
  hv.setInt16(50, 1)            // indexToLocFormat: uzun
  hv.setUint32(8, 0)            // checkSumAdjustment sonradan
  const n = etiketler.length
  let ofs = 12 + n * 16
  const yerler = etiketler.map(e => { const o = ofs; ofs += (veri[e].length + 3) & ~3; return o })
  const cikti = new Uint8Array(ofs)
  const cv = new DataView(cikti.buffer)
  cv.setUint32(0, dv.getUint32(0)); cv.setUint16(4, n)
  let es = 1, lg = 0
  while (es * 2 <= n) { es *= 2; lg++ }
  cv.setUint16(6, es * 16); cv.setUint16(8, lg); cv.setUint16(10, n * 16 - es * 16)
  const toplam = (u8) => {
    let s = 0; const v = new DataView(u8.buffer, u8.byteOffset, u8.byteLength)
    for (let i = 0; i + 3 < u8.length; i += 4) s = (s + v.getUint32(i)) >>> 0
    const kalan = u8.length % 4
    if (kalan) { let w = 0; for (let i = 0; i < 4; i++) w = (w << 8) | (i < kalan ? u8[u8.length - kalan + i] : 0); s = (s + (w >>> 0)) >>> 0 }
    return s
  }
  etiketler.forEach((e, i) => {
    const o = 12 + i * 16
    for (let j = 0; j < 4; j++) cv.setUint8(o + j, e.charCodeAt(j))
    cv.setUint32(o + 4, toplam(veri[e])); cv.setUint32(o + 8, yerler[i]); cv.setUint32(o + 12, veri[e].length)
    cikti.set(veri[e], yerler[i])
  })
  const hi = yerler[etiketler.indexOf("head")]
  cv.setUint32(hi + 8, (0xB1B0AFBA - toplam(cikti)) >>> 0)
  return cikti.buffer
}

// ── DEPO: yazı tipi başına katman aileleri ─────────────────────────────────
const durumlar = new Map()   // fontId → { durum: "yukleniyor"|"hazir"|"yok", aileler: { taban, hepsi, <grup>… }, gruplar: Set }
const dinleyiciler = new Set()
const yay = () => dinleyiciler.forEach(f => f())
const BOS = { durum: "yok", aileler: null, gruplar: null }

async function hazirla(fontId) {
  const url = HAREKE_FONT_DOSYA[fontId]
  if (!url) throw new Error("dosya yok")
  const r = await fetch(url)
  if (!r.ok) throw new Error("indirilemedi")
  const buf = await r.arrayBuffer()
  const dv = new DataView(buf)
  const t = tablolar(dv)
  if (!t.glyf || !t.loca || !t.head || !t.maxp) throw new Error("glyf değil")
  const grup = sekilGruplari(dv, t)
  const ad = (k) => `VukufHareke-${fontId}-${k}`
  const mevcut = new Set(grup.values())
  const kopyalar = ["taban", "hepsi", ...HAREKE_GRUPLARI.filter(g => mevcut.has(g.id)).map(g => g.id)]
  const aileler = {}
  await Promise.all(kopyalar.map(async (k) => {
    const veri = kopyaUret(buf, dv, t, k, grup)
    if (!veri) return
    const ff = new FontFace(ad(k), veri, { display: "block" })
    await ff.load()
    document.fonts.add(ff)
    aileler[k] = ad(k)
  }))
  if (!aileler.taban || !aileler.hepsi) throw new Error("katman üretilemedi")
  return { durum: "hazir", aileler, gruplar: new Set([...mevcut].filter(g => aileler[g])) }
}

/** Renkli hareke açıkken çağrılır; ilk çağrıda kopyalar üretilir */
export function harekeFontIste(fontId) {
  if (durumlar.has(fontId) || typeof window === "undefined") return
  durumlar.set(fontId, { durum: "yukleniyor", aileler: null, gruplar: null })
  yay()
  hazirla(fontId)
    .then(v => durumlar.set(fontId, v))
    .catch(() => durumlar.set(fontId, BOS))
    .finally(yay)
}
export function useHarekeFont(fontId, etkin) {
  const v = useSyncExternalStore(
    (f) => { dinleyiciler.add(f); return () => dinleyiciler.delete(f) },
    () => durumlar.get(fontId) || null, () => null)
  if (etkin && !v && typeof window !== "undefined") queueMicrotask(() => harekeFontIste(fontId))
  return v
}
