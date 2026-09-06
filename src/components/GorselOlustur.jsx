import { useState, useEffect, useRef, useCallback, useMemo } from "react"
import {
  X, Download, Share2, Plus, Check, Loader2,
  Square, RectangleHorizontal, RectangleVertical, Image as ImageIcon, Pipette,
  ImagePlay, Film, Volume2, VolumeX, CircleStop, Smartphone, Monitor,
} from "lucide-react"
import { DESENLER, GORSELLER } from "../data/arkaplanlar"

// ════════════════════════════════════════════════════════════════
// GÖRSEL OLUŞTUR — âyet / metin paylaşım görseli üretici (ortak bileşen)
//
// KuranOkuma âyet gönderir (arapca + meal), OkumaEkrani seçili metni gönderir (metin).
// Her şey TEK CANVAS'a çizilir; önizleme aynı canvas'ın CSS ile küçültülmüş hâlidir,
// yani kullanıcının gördüğü ile indirdiği BİREBİR aynıdır.
//
// props:
//   acik, kapat
//   arapca      : string | null   — Arapça blok (KuranOkuma)
//   meal        : string | null   — Türkçe blok (meal veya seçili metin)
//   kaynak      : string | null   — "Bakara 255" / "On Dokuzuncu Mektup · s. 225"
//   arapcaFont  : string          — aktif Arapça font-family (canvas'a da verilir)
//   theme, isMobile
// ════════════════════════════════════════════════════════════════

const ORANLAR = [
  { id: "1:1",  ad: "Kare",     w: 1080, h: 1080, Ikon: Square },
  { id: "4:5",  ad: "Dikey",    w: 1080, h: 1350, Ikon: RectangleVertical },
  { id: "9:16", ad: "Hikâye",   w: 1080, h: 1920, Ikon: RectangleVertical },
  { id: "16:9", ad: "Yatay",    w: 1920, h: 1080, Ikon: RectangleHorizontal },
  { id: "3:4",  ad: "Klasik",   w: 1080, h: 1440, Ikon: RectangleVertical },
]

// ── TAM EKRAN ────────────────────────────────────────────────────────────────
// Cihazın GERÇEK ekran çözünürlüğü: CSS ölçüsü × piksel yoğunluğu (dpr).
// `screen.width/height` mobilde döndürmede değişmediği için cihazın doğal yönü korunur.
// Uzun kenar 3000 px ile sınırlanır (çok büyük canvas telefonda çizilemiyor/çok yavaş).
export function ekranOlcusuAl() {
  const yedek = { id: "ekran", ad: "Tam Ekran", w: 1080, h: 1920, Ikon: Smartphone, etiket: "1080×1920" }
  try {
    const dpr = Math.min(Math.max(window.devicePixelRatio || 1, 1), 3)
    let w = Math.round((window.screen && window.screen.width ? window.screen.width : window.innerWidth) * dpr)
    let h = Math.round((window.screen && window.screen.height ? window.screen.height : window.innerHeight) * dpr)
    if (!(w > 0) || !(h > 0)) return yedek
    let uzun = Math.max(w, h)
    const SINIR = 3000, EN_AZ = 1280
    if (uzun > SINIR) { const k = SINIR / uzun; w = Math.round(w * k); h = Math.round(h * k); uzun = SINIR }
    // Çok küçük ekranlarda (eski cihaz / dpr okunamadı) çıktı kullanışsız kalmasın
    if (uzun < EN_AZ) { const k = EN_AZ / uzun; w = Math.round(w * k); h = Math.round(h * k) }
    w = Math.max(2, Math.round(w / 2) * 2)
    h = Math.max(2, Math.round(h / 2) * 2)
    return { id: "ekran", ad: "Tam Ekran", w, h, Ikon: h >= w ? Smartphone : Monitor, etiket: `${w}×${h}` }
  } catch { return yedek }
}

const CERCEVELER = [
  { id: "yok",    ad: "Çerçevesiz" },
  { id: "ince",   ad: "İnce Çizgi" },
  { id: "cift",   ad: "Çift Çizgi" },
  { id: "kose",   ad: "Köşe Süsü" },
  { id: "kemer",  ad: "Kemer" },
  { id: "kartus", ad: "Kartuş" },
]

const KARARTMALAR = [
  { id: "yok", ad: "Yok",  guc: 0 },
  { id: "az",  ad: "Az",   guc: 0.28 },
  { id: "orta", ad: "Orta", guc: 0.45 },
  { id: "cok", ad: "Çok",  guc: 0.62 },
]

// ── YAZI RENGİ ────────────────────────────────────────────────────────────────
// "oto" = zemin koyuysa fildişi, açıksa koyu (varsayılan davranış).
// Yanında hazır öneriler, kullanıcının seçtiği ÖZEL renk ve SON 5 renk durur.
const ONERILEN_RENKLER = [
  { id: "beyaz",    ad: "Beyaz",       renk: "#ffffff" },
  { id: "fildisi",  ad: "Fildişi",     renk: "#f6f1e6" },
  { id: "krem",     ad: "Krem",        renk: "#eadfc4" },
  { id: "kum",      ad: "Kum",         renk: "#dcc9a6" },
  { id: "altin",    ad: "Altın",       renk: "#d9b45a" },
  { id: "bakir",    ad: "Bakır",       renk: "#c98a4b" },
  { id: "nane",     ad: "Nane",        renk: "#cfe8d5" },
  { id: "zumrut",   ad: "Zümrüt",      renk: "#7fc9a5" },
  { id: "gok",      ad: "Gök",         renk: "#cfe0f5" },
  { id: "lacivert", ad: "Lâcivert",    renk: "#8fb4e3" },
  { id: "gul",      ad: "Gül",         renk: "#f3d3d3" },
  { id: "mercan",   ad: "Mercan",      renk: "#e59a8a" },
  { id: "lila",     ad: "Lila",        renk: "#d9cdf0" },
  { id: "gri",      ad: "Açık Gri",    renk: "#c9cdd2" },
  { id: "kahve",    ad: "Kahve",       renk: "#5a4632" },
  { id: "koyu",     ad: "Koyu",        renk: "#1d1a14" },
]
// Yatay seçenek şeritlerindeki kaydırma çubuğu GİZLENİR (kaydırma çalışmaya devam eder).
// Satır içi stil sözde-öğe alamadığı için tek seferlik bir <style> enjekte edilir.
const SERIT_STIL_ID = "vukuf-serit-stil"
function seritStiliKur() {
  if (typeof document === "undefined" || document.getElementById(SERIT_STIL_ID)) return
  const el = document.createElement("style")
  el.id = SERIT_STIL_ID
  el.textContent = `.vukuf-serit{scrollbar-width:none;-ms-overflow-style:none}
.vukuf-serit::-webkit-scrollbar{width:0;height:0;display:none}`
  document.head.appendChild(el)
}

const SON_RENK_ANAHTAR = "vukuf-gorsel-son-renkler"
const sonRenkleriOku = () => {
  try {
    const d = JSON.parse(localStorage.getItem(SON_RENK_ANAHTAR) || "[]")
    return Array.isArray(d) ? d.filter(x => typeof x === "string" && /^#[0-9a-fA-F]{6}$/.test(x)).slice(0, 5) : []
  } catch { return [] }
}
const sonRenkEkle = (renk) => {
  try {
    const yeni = [renk, ...sonRenkleriOku().filter(r => r.toLowerCase() !== renk.toLowerCase())].slice(0, 5)
    localStorage.setItem(SON_RENK_ANAHTAR, JSON.stringify(yeni))
    return yeni
  } catch { return sonRenkleriOku() }
}

// ── EKSİK GLİF EMNİYETİ ───────────────────────────────────────────────────────
// Aktif fontta karşılığı OLMAYAN işaretler canvas'ta boş kutu (□ notdef) çiziyor.
// Sadece İŞARET/HAREKE aralıklarına bakılır — taban harflere ASLA dokunulmaz.
// Ölçüm: "ا" + işaret genişliği ile notdef genişliği (U+FFFF) karşılaştırılır;
// notdef glifleri aynı ilerleme genişliğini paylaştığı için bu ayrım güvenilir.
const ISARET_ARALIK = [
  [0x0610, 0x061A], [0x064B, 0x065F], [0x0670, 0x0670],
  [0x06D6, 0x06ED], [0x08D3, 0x08FF], [0xFBB2, 0xFBC1],
]
const isaretMi = (cp) => ISARET_ARALIK.some(([a, b]) => cp >= a && cp <= b)
function eksikGlifAt(ctx, metin, fontStr) {
  if (!metin) return metin
  const eski = ctx.font
  ctx.font = fontStr
  const tofu = ctx.measureText("\uFFFF").width
  const bas = ctx.measureText("ا").width
  let cikti = ""
  for (const c of metin) {
    const cp = c.codePointAt(0)
    if (!isaretMi(cp)) { cikti += c; continue }
    const ek = ctx.measureText("ا" + c).width - bas
    if (tofu > 0.5 && Math.abs(ek - tofu) < 0.6) continue   // notdef kutusu → çıkar
    cikti += c
  }
  ctx.font = eski
  return cikti
}

// ════════════════════════════════════════════════════════════════
// VİDEO — süre, efekt ve hareket seçenekleri + parçacık motoru
// ════════════════════════════════════════════════════════════════
const SURELER = [
  { id: 6,  ad: "6 sn" },
  { id: 10, ad: "10 sn" },
  { id: 15, ad: "15 sn" },
  { id: 20, ad: "20 sn" },
]
const EFEKTLER = [
  { id: "yok",     ad: "Yok" },
  { id: "kar",     ad: "Kar" },
  { id: "yagmur",  ad: "Yağmur" },
  { id: "yildiz",  ad: "Yıldız" },
  { id: "toz",     ad: "Altın Toz" },
]
const HAREKETLER = [
  { id: "yok",       ad: "Sabit" },
  { id: "yakinlas",  ad: "Yavaş Yakınlaş" },
  { id: "uzaklas",   ad: "Yavaş Uzaklaş" },
  { id: "kaydir",    ad: "Yavaş Kaydır" },
]

// Belirlenimci rastgele — her açılışta aynı görünsün, kayıt ile önizleme birebir olsun
function rastgeleUret(tohum) {
  let t = tohum >>> 0
  return () => { t = (t * 1103515245 + 12345) & 0x7fffffff; return t / 0x7fffffff }
}

// Parçacıkları bir kez üret; her karede konumları zamandan HESAPLANIR (durum tutulmaz →
// önizleme ile kayıt birebir aynı, kare atlansa bile akış bozulmaz).
export function parcacikUret(efekt, W, H, tohum = 20260906) {
  if (efekt === "yok") return []
  const r = rastgeleUret(tohum)
  const S = Math.min(W, H)
  const adet = efekt === "yildiz" ? 90 : efekt === "toz" ? 70 : efekt === "yagmur" ? 140 : 110
  const p = []
  for (let i = 0; i < adet; i++) {
    p.push({
      x: r(), y: r(),
      b: 0.35 + r() * 0.9,                 // boyut çarpanı
      h: 0.35 + r() * 0.85,                // hız çarpanı
      s: r() * Math.PI * 2,                // salınım fazı
      o: 0.25 + r() * 0.6,                 // saydamlık
      k: S / 900,                          // ölçek
    })
  }
  return p
}

export function parcacikCiz(ctx, efekt, parcaciklar, W, H, t) {
  if (!parcaciklar.length) return
  const S = Math.min(W, H)
  ctx.save()
  for (const p of parcaciklar) {
    if (efekt === "kar") {
      const y = ((p.y + t * 0.045 * p.h) % 1.1) * H - H * 0.05
      const x = (p.x * W) + Math.sin(t * 0.9 * p.h + p.s) * S * 0.035
      ctx.globalAlpha = p.o * 0.9
      ctx.fillStyle = "#ffffff"
      ctx.beginPath(); ctx.arc(x, y, p.b * 3.2 * p.k, 0, Math.PI * 2); ctx.fill()
    } else if (efekt === "yagmur") {
      const y = ((p.y + t * 0.42 * p.h) % 1.15) * H - H * 0.1
      const x = p.x * W + t * 6 * p.h
      const uz = S * 0.028 * p.b
      ctx.globalAlpha = p.o * 0.55
      ctx.strokeStyle = "#dbe9f5"
      ctx.lineWidth = Math.max(1, 1.4 * p.b * p.k)
      ctx.beginPath(); ctx.moveTo(x % W, y); ctx.lineTo((x % W) - uz * 0.18, y + uz); ctx.stroke()
    } else if (efekt === "yildiz") {
      // Yerinde duran, nefes alır gibi parlayan yıldızlar
      const par = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(t * 1.6 * p.h + p.s))
      ctx.globalAlpha = p.o * par
      ctx.fillStyle = "#fff6dc"
      ctx.beginPath(); ctx.arc(p.x * W, p.y * H * 0.85, p.b * 2.1 * p.k, 0, Math.PI * 2); ctx.fill()
    } else if (efekt === "toz") {
      // Yukarı doğru yavaşça süzülen altın zerreler
      const y = ((p.y - t * 0.03 * p.h) % 1 + 1) % 1
      const x = p.x * W + Math.sin(t * 0.5 * p.h + p.s) * S * 0.05
      ctx.globalAlpha = p.o * (0.35 + 0.35 * Math.sin(t * 1.1 + p.s))
      ctx.fillStyle = "#e8c877"
      ctx.beginPath(); ctx.arc(x, y * H, p.b * 2.4 * p.k, 0, Math.PI * 2); ctx.fill()
    }
  }
  ctx.restore()
}

// Arka planın hareketi (Ken Burns). t saniye, sure toplam süre.
export function hareketKutusu(hareket, W, H, t, sure) {
  const o = sure > 0 ? Math.min(1, Math.max(0, t / sure)) : 0
  if (hareket === "yakinlas") { const z = 1 + 0.10 * o; return { sw: W / z, sh: H / z, sx: (W - W / z) / 2, sy: (H - H / z) / 2 } }
  if (hareket === "uzaklas")  { const z = 1.10 - 0.10 * o; return { sw: W / z, sh: H / z, sx: (W - W / z) / 2, sy: (H - H / z) / 2 } }
  if (hareket === "kaydir")   { const z = 1.08; const kx = (W - W / z) * o; return { sw: W / z, sh: H / z, sx: kx, sy: (H - H / z) / 2 } }
  return { sw: W, sh: H, sx: 0, sy: 0 }
}

// Metni verilen genişliğe göre satırlara böler. Arapça'da bitişme kelime İÇİNDE
// olduğundan boşluktan bölmek şekillenmeyi bozmaz.
function satirlaraBol(ctx, metin, maxW) {
  const cikti = []
  for (const paragraf of String(metin).split(/\n+/)) {
    const kelimeler = paragraf.trim().split(/\s+/).filter(Boolean)
    if (!kelimeler.length) continue
    let satir = kelimeler[0]
    for (let i = 1; i < kelimeler.length; i++) {
      const deneme = satir + " " + kelimeler[i]
      if (ctx.measureText(deneme).width <= maxW) satir = deneme
      else { cikti.push(satir); satir = kelimeler[i] }
    }
    cikti.push(satir)
  }
  return cikti
}

// ════════════════════════════════════════════════════════════════
// SAF ÇİZİM — bileşenden bağımsız, tek başına test edilebilir.
// ayar: { W,H, arka, cerceve, karartma, arapca, meal, kaynak, imza, arapcaFont }
// dönüş: { olcek }  (0.45'e kadar inip metni sığdırır; altına inmez)
// ════════════════════════════════════════════════════════════════
export async function gorselCiz(ctx, ayar) {
  const { W, H, arka, cerceve, karartma, arapca, meal, kaynak, imza, arapcaFont, yaziRengi } = ayar
  // katman: "hepsi" (fotoğraf) | "arka" (yalnız arka plan) | "on" (karartma+çerçeve+yazı).
  // Videoda arka plan hareket ettiği için iki katman AYRI ön-çizilir, her karede birleştirilir.
  const katman = ayar.katman || "hepsi"
  const arkaCiz = katman !== "on"
  const onCiz = katman !== "arka"
  const S = Math.min(W, H)
  ctx.clearRect(0, 0, W, H)

  // 1) ARKA PLAN
  if (!arkaCiz) { /* yalnız ön katman çizilecek */ }
  else if (arka.tip === "gorsel") {
    await new Promise(cz => {
      const im = new Image()
      im.crossOrigin = "anonymous"
      im.onload = () => {
        // "cover": oranı bozmadan kırparak doldur
        const o1 = im.width / im.height, o2 = W / H
        let sw = im.width, sh = im.height, sx = 0, sy = 0
        if (o1 > o2) { sw = im.height * o2; sx = (im.width - sw) / 2 }
        else { sh = im.width / o2; sy = (im.height - sh) / 2 }
        ctx.drawImage(im, sx, sy, sw, sh, 0, 0, W, H)
        cz()
      }
      im.onerror = () => { ctx.fillStyle = "#111417"; ctx.fillRect(0, 0, W, H); cz() }
      im.src = arka.src
    })
  } else {
    arka.ciz(ctx, W, H)
  }

  // 2) KARARTMA (fotoğraf üstünde yazının okunması için)
  const kar = KARARTMALAR.find(k => k.id === karartma) || KARARTMALAR[2]
  const koyuZemin = arka.koyu !== false
  if (!onCiz) return { olcek: 1 }
  if (kar.guc > 0) {
    const g = ctx.createLinearGradient(0, 0, 0, H)
    const renk = koyuZemin ? "0,0,0" : "255,255,255"
    g.addColorStop(0,   `rgba(${renk},${kar.guc * 0.75})`)
    g.addColorStop(0.5, `rgba(${renk},${kar.guc})`)
    g.addColorStop(1,   `rgba(${renk},${kar.guc * 0.85})`)
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H)
  }

  // Kullanıcı bir renk seçtiyse o kullanılır; seçmediyse zemine göre otomatik.
  const yaziRenk  = yaziRengi || (koyuZemin ? "#f6f1e6" : "#1d1a14")
  const vurguRenk = koyuZemin ? "#d9b45a" : "#8a6a1f"
  const solukRenk = koyuZemin ? "rgba(246,241,230,0.62)" : "rgba(29,26,20,0.62)"

  // 3) ÇERÇEVE
  const pay = S * 0.075
  const cx0 = pay, cy0 = pay, cx1 = W - pay, cy1 = H - pay
  const kalin = Math.max(2, S * 0.0035)
  ctx.save()
  ctx.strokeStyle = vurguRenk
  ctx.lineWidth = kalin
  if (cerceve === "ince") {
    ctx.strokeRect(cx0, cy0, cx1 - cx0, cy1 - cy0)
  } else if (cerceve === "cift") {
    ctx.strokeRect(cx0, cy0, cx1 - cx0, cy1 - cy0)
    ctx.lineWidth = kalin * 0.5
    const i = S * 0.018
    ctx.strokeRect(cx0 + i, cy0 + i, (cx1 - cx0) - 2 * i, (cy1 - cy0) - 2 * i)
  } else if (cerceve === "kose") {
    const u = S * 0.09
    ctx.beginPath()
    ctx.moveTo(cx0, cy0 + u); ctx.lineTo(cx0, cy0); ctx.lineTo(cx0 + u, cy0)
    ctx.moveTo(cx1 - u, cy0); ctx.lineTo(cx1, cy0); ctx.lineTo(cx1, cy0 + u)
    ctx.moveTo(cx1, cy1 - u); ctx.lineTo(cx1, cy1); ctx.lineTo(cx1 - u, cy1)
    ctx.moveTo(cx0 + u, cy1); ctx.lineTo(cx0, cy1); ctx.lineTo(cx0, cy1 - u)
    ctx.stroke()
  } else if (cerceve === "kemer") {
    // Mihrap kemeri: üstte kemer, altta düz kenarlar. Kemerin tepesi ÇERÇEVE KUTUSUNUN
    // içinde kalır (daha önce kutunun üstüne taşıp tuval kenarına dayanıyordu).
    const r = (cx1 - cx0) / 2
    const omuz = cy0 + Math.min(r * 0.9, (cy1 - cy0) * 0.55)
    ctx.beginPath()
    ctx.moveTo(cx0, cy1)
    ctx.lineTo(cx0, omuz)
    ctx.quadraticCurveTo(cx0, cy0, cx0 + r, cy0)
    ctx.quadraticCurveTo(cx1, cy0, cx1, omuz)
    ctx.lineTo(cx1, cy1)
    ctx.closePath()
    ctx.stroke()
  } else if (cerceve === "kartus") {
    const rr = S * 0.045
    const yol = () => {
      ctx.beginPath()
      if (ctx.roundRect) ctx.roundRect(cx0, cy0, cx1 - cx0, cy1 - cy0, rr)
      else ctx.rect(cx0, cy0, cx1 - cx0, cy1 - cy0)
    }
    ctx.save()
    ctx.fillStyle = koyuZemin ? "rgba(0,0,0,0.34)" : "rgba(255,255,255,0.46)"
    ctx.shadowColor = "rgba(0,0,0,0.35)"
    ctx.shadowBlur = S * 0.03
    yol(); ctx.fill()
    ctx.restore()
    ctx.lineWidth = kalin * 0.6
    yol(); ctx.stroke()
  }
  ctx.restore()

  // 4) METİN — tek ÖLÇEK ile hepsi birlikte küçülür/büyür (ikili arama)
  const icPay = cerceve === "yok" ? S * 0.10 : pay + S * 0.055
  // Kemerde üst kısım daralıyor → metin kutusu üstten ve yanlardan biraz daha içeri alınır
  const icPayUst = icPay + (cerceve === "kemer" ? S * 0.075 : 0)
  const kutuW = (W - icPay * 2) * (cerceve === "kemer" ? 0.9 : 1)
  const kutuH = H - icPayUst - icPay
  const arapcaVar = !!arapca
  const mealVar   = !!meal
  const kaynakVar = !!kaynak

  const arapcaFontYap = (b) => `${Math.round(b)}px ${arapcaFont || "'KFGQPC Uthmanic', serif"}`
  const mealFontYap   = (b) => `${Math.round(b)}px Georgia, 'Times New Roman', serif`
  const kucukFontYap  = (b) => `600 ${Math.round(b)}px system-ui, -apple-system, sans-serif`

  // Fontun çizemediği işaretleri at (□ kutusu çıkmasın). Metin bir kez süzülür.
  const arapcaGuvenli = arapcaVar ? eksikGlifAt(ctx, arapca, arapcaFontYap(S * 0.078)) : arapca

  const duzen = (olcek) => {
    const bloklar = []
    let toplam = 0
    if (arapcaVar) {
      const b = S * 0.078 * olcek
      ctx.font = arapcaFontYap(b)
      const sat = satirlaraBol(ctx, arapcaGuvenli, kutuW)
      const satirYuk = b * 1.95
      bloklar.push({ tip: "arapca", boy: b, satirlar: sat, yuk: sat.length * satirYuk, satirYuk })
      toplam += sat.length * satirYuk
    }
    if (arapcaVar && mealVar) { const bo = S * 0.045 * olcek; bloklar.push({ tip: "ayrac", yuk: bo }); toplam += bo }
    if (mealVar) {
      const b = S * 0.042 * olcek
      ctx.font = mealFontYap(b)
      const sat = satirlaraBol(ctx, meal, kutuW)
      const satirYuk = b * 1.52
      bloklar.push({ tip: "meal", boy: b, satirlar: sat, yuk: sat.length * satirYuk, satirYuk })
      toplam += sat.length * satirYuk
    }
    if (kaynakVar) {
      const bo = S * 0.05 * olcek
      const b = S * 0.028 * olcek
      ctx.font = kucukFontYap(b)
      // Kaynak uzun olabilir (kitap · kısım yolu · sayfa) → KAÇ SATIR GEREKİYORSA o kadar
      // sarılır, KISALTILMAZ. Tamamı görünsün; sığmıyorsa genel ölçek zaten küçülür.
      const sat = satirlaraBol(ctx, kaynak, kutuW)
      const satirYuk = b * 1.4
      bloklar.push({ tip: "bosluk", yuk: bo })
      bloklar.push({ tip: "kaynak", boy: b, satirlar: sat, yuk: sat.length * satirYuk, satirYuk })
      toplam += bo + sat.length * satirYuk
    }
    return { bloklar, toplam }
  }

  // Üst sınır: çok uzun ekranlarda (tam ekran 9:19.5 gibi) yazı kutuda küçük kalmasın
  const enBoy = Math.max(W, H) / Math.min(W, H)
  const enBuyukOlcek = 1.35 + Math.min(0.35, Math.max(0, enBoy - 1.8) * 0.5)
  let alt = 0.45, ust = enBuyukOlcek, olcek = 0.45
  for (let i = 0; i < 26; i++) {
    const orta = (alt + ust) / 2
    if (duzen(orta).toplam <= kutuH) { olcek = orta; alt = orta } else ust = orta
  }
  const sonuc = duzen(olcek)

  let y = Math.max(icPayUst, icPayUst + (kutuH - sonuc.toplam) / 2)
  ctx.textAlign = "center"
  ctx.textBaseline = "top"
  for (const b of sonuc.bloklar) {
    if (b.tip === "arapca") {
      ctx.font = arapcaFontYap(b.boy)
      ctx.fillStyle = yaziRenk
      try { ctx.direction = "rtl" } catch { /* eski tarayıcı */ }
      for (const st of b.satirlar) { ctx.fillText(st, W / 2, y + (b.satirYuk - b.boy) / 2); y += b.satirYuk }
      try { ctx.direction = "ltr" } catch { /* yoksay */ }
    } else if (b.tip === "meal") {
      ctx.font = mealFontYap(b.boy)
      ctx.fillStyle = yaziRenk
      for (const st of b.satirlar) { ctx.fillText(st, W / 2, y + (b.satirYuk - b.boy) / 2); y += b.satirYuk }
    } else if (b.tip === "ayrac") {
      const g = ctx.createLinearGradient(W / 2 - kutuW * 0.22, 0, W / 2 + kutuW * 0.22, 0)
      g.addColorStop(0, "rgba(0,0,0,0)")
      g.addColorStop(0.5, vurguRenk)
      g.addColorStop(1, "rgba(0,0,0,0)")
      ctx.fillStyle = g
      ctx.fillRect(W / 2 - kutuW * 0.22, y + b.yuk / 2 - Math.max(1, S * 0.0016), kutuW * 0.44, Math.max(2, S * 0.0032))
      y += b.yuk
    } else if (b.tip === "kaynak") {
      ctx.font = kucukFontYap(b.boy)
      ctx.fillStyle = vurguRenk
      for (const st of b.satirlar) { ctx.fillText(st, W / 2, y + (b.satirYuk - b.boy) / 2); y += b.satirYuk }
    } else {
      y += b.yuk
    }
  }

  // 5) İMZA
  if (imza) {
    ctx.font = `500 ${Math.round(S * 0.021)}px system-ui, -apple-system, sans-serif`
    ctx.fillStyle = solukRenk
    ctx.textAlign = "center"
    ctx.fillText("Vukuf", W / 2, H - S * 0.045)
  }
  return { olcek }
}

// Tarayıcı video kaydını destekliyor mu? (iOS 14.3+ mp4, masaüstü webm)
const VIDEO_MIMELER = [
  "video/mp4;codecs=avc1.42E01E,mp4a.40.2",
  "video/mp4",
  "video/webm;codecs=vp9,opus",
  "video/webm;codecs=vp8,opus",
  "video/webm",
]
function videoMime() {
  try {
    if (typeof MediaRecorder === "undefined") return null
    return VIDEO_MIMELER.find(m => MediaRecorder.isTypeSupported(m)) || null
  } catch { return null }
}

export default function GorselOlustur({
  acik, kapat, arapca, meal, kaynak, arapcaFont, theme, isMobile,
  // Video için (KuranOkuma doldurur; yoksa video sessiz kaydedilir)
  kariler, kariId, onKari, sesUrlAl, ayet, ayetListesiAl, azamiAyet = 25, sureBilgi,
}) {
  const canvasRef = useRef(null)
  const dosyaRef = useRef(null)
  const [oran, setOran] = useState("4:5")
  const [arkaId, setArkaId] = useState("zumrut")
  const [ozelGorsel, setOzelGorsel] = useState(null)     // kullanıcının galeriden seçtiği (dataURL)
  const [cerceve, setCerceve] = useState("ince")
  const [karartma, setKarartma] = useState("orta")
  const [arapcaAcik, setArapcaAcik] = useState(!!arapca)
  const [mealAcik, setMealAcik] = useState(!!meal)
  const [kaynakAcik, setKaynakAcik] = useState(true)
  const [imzaAcik, setImzaAcik] = useState(true)
  const [gecerliGorseller, setGecerliGorseller] = useState([])   // dosyası GERÇEKTEN olanlar
  const [durum, setDurum] = useState("")                          // kullanıcıya kısa bilgi
  const [calisiyor, setCalisiyor] = useState(false)
  const [uyari, setUyari] = useState("")
  const [yaziRengi, setYaziRengi] = useState(null)          // null = otomatik
  // ── VİDEO
  const [mod, setMod] = useState("foto")                     // "foto" | "video"
  const [videoSure, setVideoSure] = useState(6)
  const [efekt, setEfekt] = useState("yok")
  const [hareket, setHareket] = useState("yakinlas")
  const [sesAcik, setSesAcik] = useState(true)
  const [kapsam, setKapsam] = useState("tek")                // "tek"|3|5|10|"sayfa"|"sure"|"ozel"
  const [ozelBas, setOzelBas] = useState(1)                  // Özel kapsam: başlangıç âyeti
  const [ozelSon, setOzelSon] = useState(1)                  // Özel kapsam: bitiş âyeti
  // Video çözünürlüğü: 720 (hızlı, varsayılan) veya 1080. Telefonda 1080×1920'yi 30 fps
  // çizmek zorlanabildiği için kısa kenar varsayılan 720.
  const [videoKalite, setVideoKalite] = useState(720)
  const iptalRef = useRef(null)                              // ses indirmelerini kesmek için
  const kayitDurumRef = useRef("hazir")
  const parcaCvRef = useRef(null)                            // parça (âyet) yazı katmanı
  const parcaIdxRef = useRef(-1)                             // o an çizili parça
  const cizelgeRef = useRef([])                              // [{bas, sure}] saniye
  const tamponRef = useRef([])                               // AudioBuffer | null
  const [kayitDurum, setKayitDurum] = useState("hazir")      // hazir | kayit | isleniyor
  const [ilerleme, setIlerleme] = useState(0)
  const [kalanSn, setKalanSn] = useState(0)
  const arkaCvRef = useRef(null)                             // ön-çizilmiş arka plan
  const onCvRef = useRef(null)                               // ön-çizilmiş yazı katmanı
  const rafRef = useRef(null)
  const parcacikRef = useRef([])
  const sesRef = useRef(null)
  const kayitIptalRef = useRef(false)
  const toplamSureRef = useRef(0)                            // sesli kayıtta gerçek süre
  useEffect(() => { kayitDurumRef.current = kayitDurum }, [kayitDurum])
  const mimeTuru = useMemo(() => videoMime(), [])
  const videoDestekli = !!mimeTuru && typeof HTMLCanvasElement !== "undefined"
    && typeof HTMLCanvasElement.prototype.captureStream === "function"
  const [sonRenkler, setSonRenkler] = useState(() => sonRenkleriOku())
  const ozelRenkMi = !!yaziRengi && !ONERILEN_RENKLER.some(r => r.renk === yaziRengi)

  // Panel her AÇILIŞTA içeriğe göre mantıklı başlasın.
  // KRİTİK: sıfırlama yalnızca KAPALI→AÇIK geçişinde yapılır. Daha önce bağımlılıklar
  // (arapca/meal gibi) proplardan geldiği için, üst bileşen bu propları yeni kimlikle
  // ürettiğinde effect tekrar çalışıp KULLANICININ AYARLARINI VARSAYILANA DÖNDÜRÜYORDU
  // (renk seçiliyor geri dönüyor, Video sekmesi Fotoğraf'a atıyordu). Artık açılış kenarı
  // bir ref ile izleniyor; panel açık kaldığı sürece hiçbir prop değişimi ayarları bozmaz.
  const acikOncekiRef = useRef(false)
  useEffect(() => {
    if (!acik) { acikOncekiRef.current = false; return }
    if (acikOncekiRef.current) return        // zaten açıktı → sıfırlama YOK
    acikOncekiRef.current = true
    seritStiliKur()
    setArapcaAcik(!!arapca); setMealAcik(!!meal); setUyari(""); setDurum("")
    setYaziRengi(null); setSonRenkler(sonRenkleriOku())
    setMod("foto"); setKayitDurum("hazir"); setIlerleme(0); kayitIptalRef.current = false
    setKapsam("tek"); tamponRef.current = []; cizelgeRef.current = []
    if (ayet) { setOzelBas(ayet.ayetNo); setOzelSon(ayet.ayetNo) }
  }, [acik, arapca, meal, ayet])

  // Panel kapanınca / fotoğraf moduna dönünce ön-çizilmiş canvas'ları bırak.
  // iOS'ta canvas belleği sınırlı; tam çözünürlükte 2-3 offscreen canvas açık kalmasın.
  useEffect(() => {
    if (acik && mod === "video") return
    arkaCvRef.current = null
    parcaCvRef.current = null
    parcaIdxRef.current = -1
    tamponRef.current = []
    cizelgeRef.current = []
  }, [acik, mod])

  // Hangi hazır fotoğraflar GERÇEKTEN var? (dosya yoksa listede hiç görünmesin)
  useEffect(() => {
    if (!acik) return
    let iptal = false
    Promise.all(GORSELLER.map(g => new Promise(cz => {
      const im = new Image()
      im.onload = () => cz(g)
      im.onerror = () => cz(null)
      im.src = g.src
    }))).then(sonuc => { if (!iptal) setGecerliGorseller(sonuc.filter(Boolean)) })
    return () => { iptal = true }
  }, [acik])

  const secili = useMemo(() => {
    if (ozelGorsel && arkaId === "ozel") return { id: "ozel", ad: "Galeriden", src: ozelGorsel, koyu: true, tip: "gorsel" }
    const g = gecerliGorseller.find(x => x.id === arkaId)
    if (g) return { ...g, tip: "gorsel" }
    const d = DESENLER.find(x => x.id === arkaId) || DESENLER[0]
    return { ...d, tip: "desen" }
  }, [arkaId, ozelGorsel, gecerliGorseller])

  // Hazır oranlar + cihazın tam ekranı
  const oranListesi = useMemo(() => [...ORANLAR, ekranOlcusuAl()], [])
  const olcuTam = oranListesi.find(o => o.id === oran) || oranListesi[0]
  // Videoda kısa kenar `videoKalite` olacak şekilde ölçeklenir (oran korunur, çift sayı)
  const olcu = useMemo(() => {
    if (mod !== "video") return olcuTam
    const kisa = Math.min(olcuTam.w, olcuTam.h)
    const k = videoKalite / kisa
    if (k >= 1) return olcuTam
    const cift = (n) => Math.round(n * k / 2) * 2
    return { ...olcuTam, w: cift(olcuTam.w), h: cift(olcuTam.h) }
  }, [olcuTam, mod, videoKalite])

  // ── ÇİZİM ───────────────────────────────────────────────────
  // Ortak ayar paketi (foto ve video aynı görünümü kullansın)
  const cizAyari = useCallback((ek) => ({
    W: olcu.w, H: olcu.h,
    arka: secili,
    cerceve, karartma,
    arapca: arapcaAcik ? arapca : null,
    meal:   mealAcik   ? meal   : null,
    kaynak: kaynakAcik ? kaynak : null,
    imza: imzaAcik,
    arapcaFont,
    yaziRengi,
    ...ek,
  }), [olcu, secili, cerceve, karartma, arapca, meal, kaynak, arapcaAcik, mealAcik, kaynakAcik, imzaAcik, arapcaFont, yaziRengi])

  // ÇİZİM SIRA NUMARASI — `gorselCiz` asenkron (arka plan fotoğrafını bekliyor). Art arda
  // ayar değiştirilince ESKİ çizim SONRA bitip canvas'a basabiliyordu: kullanıcı ayarı
  // uygulanmış görüp bir an sonra ESKİ hâle dönmüş görüyordu. Çözüm: her çizim önce
  // GİZLİ bir canvas'a yapılır; bitince hâlâ en güncel çizim ise ekrana kopyalanır.
  const cizNoRef = useRef(0)
  const ciz = useCallback(async () => {
    const cv = canvasRef.current
    if (!cv) return
    const benim = ++cizNoRef.current
    const W = olcu.w, H = olcu.h
    const gizli = document.createElement("canvas")
    gizli.width = W; gizli.height = H
    const { olcek } = await gorselCiz(gizli.getContext("2d"), cizAyari())
    if (benim !== cizNoRef.current || !canvasRef.current) return   // eskimiş çizim → basma
    cv.width = W; cv.height = H
    cv.getContext("2d").drawImage(gizli, 0, 0)
    setUyari(olcek <= 0.46
      ? "Metin uzun olduğu için yazı en küçük okunur boyuta indi. Daha kısa bir bölüm seçerseniz daha güzel görünecektir."
      : "")
  }, [olcu, cizAyari])

  // ── VİDEO PARÇALARI ────────────────────────────────────────────
  // Tek âyet → tek parça. Çoklu seçimde KuranOkuma'nın listesi kullanılır
  // (gerekirse başa besmele eklenmiş, uzun sûrelerde kırpılmış hâlde).
  const videoParcalari = useMemo(() => {
    const tek = [{ tip: "ayet", arapca, meal, etiket: kaynak }]
    if (mod !== "video" || !ayet || !ayetListesiAl || kapsam === "tek") return tek
    try {
      const adet = kapsam === "sure" ? "hepsi" : kapsam    // "sayfa" ve "ozel" aynen geçer
      const bas = kapsam === "ozel" ? ozelBas : ayet.ayetNo
      const { liste } = ayetListesiAl(ayet.sureNo, bas, adet, ozelSon)
      return liste && liste.length ? liste : tek
    } catch { return tek }
  }, [mod, ayet, ayetListesiAl, kapsam, ozelBas, ozelSon, arapca, meal, kaynak])

  // Bir parçanın YAZI katmanını çizer. katman:"on" görsel yüklemediği için gorselCiz
  // gövdesi baştan sona SENKRON çalışır → beklemeye gerek yok (rAF içinde kullanılabilir).
  const parcaCiz = useCallback((idx) => {
    const p = videoParcalari[idx]
    if (!p) return
    let cv = parcaCvRef.current
    if (!cv || cv.width !== olcu.w || cv.height !== olcu.h) {
      cv = document.createElement("canvas"); cv.width = olcu.w; cv.height = olcu.h
      parcaCvRef.current = cv
    }
    gorselCiz(cv.getContext("2d"), cizAyari({
      katman: "on",
      arapca: arapcaAcik ? p.arapca : null,
      meal:   mealAcik   ? p.meal   : null,
      kaynak: kaynakAcik ? p.etiket : null,
    }))
    parcaIdxRef.current = idx
  }, [videoParcalari, olcu, cizAyari, arapcaAcik, mealAcik, kaynakAcik])

  // Zaman çizelgesi: ses yüklüyse gerçek süreler, değilse eşit paylaştırma
  const cizelgeKur = useCallback(() => {
    const n = videoParcalari.length
    const tamponlar = tamponRef.current
    const cizelge = []
    let t = 0
    for (let i = 0; i < n; i++) {
      const b = tamponlar[i]
      const sr = b && b.duration > 0
        ? b.duration + 0.35                                   // âyetler arası küçük nefes
        : Math.max(2.4, (n > 1 ? Math.max(videoSure, n * 3) : videoSure) / n)
      cizelge.push({ bas: t, sure: sr })
      t += sr
    }
    cizelgeRef.current = cizelge
    return t
  }, [videoParcalari, videoSure])

  // ── VİDEO: arka plan katmanını ÖN-ÇİZ (her karede yeniden çizmek pahalı) ──────
  const katmanlariHazirla = useCallback(async () => {
    const benim = ++cizNoRef.current
    const W = olcu.w, H = olcu.h
    const arkaCv = document.createElement("canvas"); arkaCv.width = W; arkaCv.height = H
    await gorselCiz(arkaCv.getContext("2d"), cizAyari({ katman: "arka" }))
    if (benim !== cizNoRef.current) return toplamSureRef.current || videoSure   // eskimiş
    arkaCvRef.current = arkaCv
    parcacikRef.current = parcacikUret(efekt, W, H)
    parcaIdxRef.current = -1
    parcaCiz(0)
    const toplam = cizelgeKur()
    return toplam
  }, [olcu, cizAyari, efekt, parcaCiz, cizelgeKur, videoSure])

  // Tek kare: arka plan (hareketli) → parçacıklar → o anki âyetin yazı katmanı
  const videoKare = useCallback((ctx, t, toplam) => {
    const W = olcu.w, H = olcu.h
    const arkaCv = arkaCvRef.current
    if (!arkaCv) return
    ctx.clearRect(0, 0, W, H)
    const k = hareketKutusu(hareket, W, H, t, toplam)
    ctx.drawImage(arkaCv, k.sx, k.sy, k.sw, k.sh, 0, 0, W, H)
    parcacikCiz(ctx, efekt, parcacikRef.current, W, H, t)

    // Hangi âyetteyiz?
    const cizelge = cizelgeRef.current
    let idx = 0
    for (let i = 0; i < cizelge.length; i++) { if (t >= cizelge[i].bas) idx = i; else break }
    if (idx !== parcaIdxRef.current) parcaCiz(idx)
    const cv = parcaCvRef.current
    if (!cv) return

    // Geçiş: her âyet 0,45 sn içinde belirir, bitmeden 0,3 sn önce soluklaşır
    const c = cizelge[idx] || { bas: 0, sure: toplam }
    const yerel = t - c.bas
    const gir = Math.min(1, yerel / 0.45)
    const cik = Math.min(1, Math.max(0, (c.sure - yerel) / 0.3))
    ctx.globalAlpha = Math.max(0, Math.min(1, gir * cik))
    ctx.drawImage(cv, 0, 0)
    ctx.globalAlpha = 1
  }, [olcu, hareket, efekt, parcaCiz])

  // Döngünün kullandığı GÜNCEL işlevler — bağımlılık kirlenmesin diye ref üzerinden okunur
  const hazirlaRef = useRef(null)
  const kareRef = useRef(null)
  hazirlaRef.current = katmanlariHazirla
  kareRef.current = videoKare
  // Önizlemenin yeniden kurulmasını gerektiren AYAR imzası (ilkel değerlerden)
  const icerikImza = `${arapcaAcik ? 1 : 0}${mealAcik ? 1 : 0}${kaynakAcik ? 1 : 0}${imzaAcik ? 1 : 0}`
    + `|${kapsam}|${(arapca || "").length}|${(meal || "").length}|${kaynak || ""}`
    + `|${secili.id}|${cerceve}|${karartma}|${yaziRengi || "oto"}|${arapcaFont || ""}|${videoParcalari.length}`

  // Fontlar yüklenmeden çizersek canvas yedek fontla çizer → önce fonts.ready bekle
  useEffect(() => {
    if (!acik || mod !== "foto") return
    let iptal = false
    const calistir = () => { if (!iptal) ciz() }
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(calistir).catch(calistir)
    else calistir()
    // Moddan/ayardan çıkarken uçuşan çizimi GEÇERSİZ kıl (video karesinin üstüne basmasın)
    return () => { iptal = true; cizNoRef.current++ }
  }, [acik, mod, ciz])

  // ── VİDEO ÖNİZLEME DÖNGÜSÜ ──────────────────────────────────
  // ÖNEMLİ: bağımlılıkları SADE ve İLKEL tutulur. Önceki sürüm `katmanlariHazirla` /
  // `videoKare` / `videoParcalari` gibi her render'da kimliği değişebilen değerlere
  // bağlıydı; üst bileşen sık render ettiği için döngü sürekli yeniden kuruluyor ve
  // animasyon baştan başlıyordu → önizleme "sürekli açılıp kapanıyor" görünüyordu.
  // Artık işlevler REF üzerinden okunur; effect yalnızca gerçekten değişen ayarlarda kurulur.
  useEffect(() => {
    if (!acik || mod !== "video") return
    let iptal = false
    let baslangic = 0
    const cv = canvasRef.current
    if (!cv) return
    cv.width = olcu.w; cv.height = olcu.h
    const ctx = cv.getContext("2d")
    const baslat = async () => {
      const toplam = await hazirlaRef.current()
      if (iptal) return
      toplamSureRef.current = toplam
      const dongu = (zaman) => {
        if (iptal) return
        // Kayıt sırasında çizimi KAYIT döngüsü yapar; önizleme döngüsü karışmaz
        if (kayitDurumRef.current === "kayit") { rafRef.current = requestAnimationFrame(dongu); return }
        if (!baslangic) baslangic = zaman
        const t = (zaman - baslangic) / 1000
        const sure = toplamSureRef.current || 8
        kareRef.current(ctx, t % (sure + 0.6), sure)
        rafRef.current = requestAnimationFrame(dongu)
      }
      rafRef.current = requestAnimationFrame(dongu)
    }
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(baslat).catch(baslat)
    else baslat()
    return () => {
      iptal = true
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      rafRef.current = null
    }
  }, [acik, mod, olcu.w, olcu.h, efekt, hareket, videoSure, icerikImza])

  // ── İNDİR / PAYLAŞ ──────────────────────────────────────────
  const dosyaAdi = useMemo(() => {
    const t = (kaynak || "vukuf").toLocaleLowerCase("tr-TR")
      .replace(/[çğıöşü]/g, c => ({ ç: "c", ğ: "g", ı: "i", ö: "o", ş: "s", ü: "u" }[c]))
      .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")
    return `vukuf-${t || "gorsel"}.png`
  }, [kaynak])

  // ── VİDEO KAYDI ─────────────────────────────────────────────
  // SES: <audio> + createMediaElementSource yolu CORS'a çok duyarlıydı ve sessiz kalıyordu.
  // Artık ses DOSYA OLARAK indirilip (fetch) çözülüyor (decodeAudioData) ve AudioContext'te
  // ZAMANLANARAK çalınıyor. Böylece (a) gerçek süreler baştan bilinir → âyet-meal senkronu
  // birebir olur, (b) çoklu âyet kesintisiz sıralanır, (c) kaydedilen akışa doğrudan bağlanır.
  const sesleriYukle = useCallback(async (sesCtx) => {
    const n = videoParcalari.length
    const tamponlar = new Array(n).fill(null)
    if (!sesAcik || !sesUrlAl || !ayet) { tamponRef.current = tamponlar; return { yuklenen: 0, hata: false } }
    // PARALEL indirme + İPTAL EDİLEBİLİR (AbortController) + 15 sn zaman aşımı.
    // Sırayla indirmek çoklu âyette çok yavaştı; ayrıca tek bir yavaş istek "Durdur"u
    // etkisiz bırakıyordu — abort ile artık anında kesiliyor.
    const kontrol = new AbortController()
    iptalRef.current = kontrol
    const zamanAsimi = setTimeout(() => { try { kontrol.abort() } catch { /* yoksay */ } }, 8000)
    let bitmis = 0, yuklenen = 0, hata = false
    const isler = videoParcalari.map(async (p, i) => {
      // Besmele için Fâtiha 1 kaydı kullanılır (besmelenin kendisidir)
      const sn = p.tip === "besmele" ? 1 : (p.sureNo || ayet.sureNo)
      const an = p.tip === "besmele" ? 1 : (p.ayetNo || ayet.ayetNo)
      const url = sesUrlAl(sn, an)
      if (!url) { hata = true; return }
      try {
        const c = await fetch(url, { mode: "cors", credentials: "omit", signal: kontrol.signal })
        if (!c.ok) throw new Error(String(c.status))
        const ab = await c.arrayBuffer()
        tamponlar[i] = await sesCtx.decodeAudioData(ab)
        yuklenen++
      } catch { hata = true }
      bitmis++
      setIlerleme(bitmis / n)
      setDurum(`Ses hazırlanıyor… ${bitmis}/${n}`)
    })
    await Promise.all(isler)
    clearTimeout(zamanAsimi)
    iptalRef.current = null
    tamponRef.current = tamponlar
    return { yuklenen, hata }
  }, [videoParcalari, sesAcik, sesUrlAl, ayet])

  const videoKaydet = async () => {
    const cv = canvasRef.current
    if (!cv || !videoDestekli) return
    kayitIptalRef.current = false
    setDurum(""); setIlerleme(0); setKayitDurum("isleniyor")

    // 1) Ses (varsa) indirilip çözülür → gerçek süreler
    let sesCtx = null, sesUyari = false
    const AC = window.AudioContext || window.webkitAudioContext
    if (sesAcik && sesUrlAl && ayet && AC) {
      try {
        sesCtx = new AC()
        if (sesCtx.state === "suspended") await sesCtx.resume()
        const { yuklenen, hata } = await sesleriYukle(sesCtx)
        if (!yuklenen) { sesUyari = true; try { sesCtx.close() } catch { /* yoksay */ } sesCtx = null }
        else if (hata) sesUyari = true
      } catch { sesUyari = true; sesCtx = null }
    } else {
      tamponRef.current = new Array(videoParcalari.length).fill(null)
    }
    if (kayitIptalRef.current) {
      setKayitDurum("hazir"); kayitDurumRef.current = "hazir"
      setIlerleme(0); setKalanSn(0); setDurum("Kayıt durduruldu.")
      try { sesCtx && sesCtx.close() } catch { /* yoksay */ }
      return
    }

    // 2) Çizelge (ses süreleriyle) + katmanlar
    await katmanlariHazirla()
    const toplam = cizelgeKur()
    toplamSureRef.current = toplam
    setDurum(""); setIlerleme(0)

    // 3) Akış: canvas + (varsa) ses
    const akis = cv.captureStream(30)
    let hedef = null
    if (sesCtx) {
      try {
        hedef = sesCtx.createMediaStreamDestination()
        hedef.stream.getAudioTracks().forEach(t => akis.addTrack(t))
      } catch { sesUyari = true; hedef = null }
    }

    const parcalar = []
    let kaydedici
    try {
      kaydedici = new MediaRecorder(akis, { mimeType: mimeTuru, videoBitsPerSecond: 6000000 })
    } catch {
      setKayitDurum("hazir"); setDurum("Bu tarayıcı video kaydını desteklemiyor.")
      return
    }
    kaydedici.ondataavailable = (e) => { if (e.data && e.data.size) parcalar.push(e.data) }
    const bitti = new Promise(cz => { kaydedici.onstop = cz })

    // 4) Kaydı ve sesi AYNI ANDA başlat; çizim döngüsü sıfırdan saysın
    setKayitDurum("kayit")
    kayitDurumRef.current = "kayit"
    setKalanSn(Math.ceil(toplam))
    const ctx2 = cv.getContext("2d")
    if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = null }
    kaydedici.start(200)
    const kaynaklar = []
    const t0 = sesCtx ? sesCtx.currentTime + 0.12 : 0
    if (sesCtx && hedef) {
      cizelgeRef.current.forEach((c, i) => {
        const b = tamponRef.current[i]
        if (!b) return
        const src = sesCtx.createBufferSource()
        src.buffer = b
        src.connect(hedef)
        src.connect(sesCtx.destination)         // kullanıcı da duysun
        src.start(t0 + c.bas)
        kaynaklar.push(src)
      })
    }
    const bas = performance.now() + (sesCtx ? 120 : 0)
    await new Promise(cz => {
      const dongu = (zaman) => {
        const t = (zaman - bas) / 1000
        if (kayitIptalRef.current || t >= toplam) { cz(); return }
        if (t >= 0) videoKare(ctx2, t, toplam)
        setIlerleme(Math.min(1, Math.max(0, t / toplam)))
        setKalanSn(Math.max(0, Math.ceil(toplam - Math.max(0, t))))
        rafRef.current = requestAnimationFrame(dongu)
      }
      rafRef.current = requestAnimationFrame(dongu)
    })
    if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = null }

    // 5) Bitir
    try { kaydedici.stop() } catch { /* yoksay */ }
    kaynaklar.forEach(sr => { try { sr.stop() } catch { /* yoksay */ } })
    await bitti
    try { akis.getTracks().forEach(t => t.stop()) } catch { /* yoksay */ }
    try { sesCtx && sesCtx.close() } catch { /* yoksay */ }
    setKayitDurum("isleniyor")

    const blob = new Blob(parcalar, { type: mimeTuru })
    setIlerleme(0); setKalanSn(0); setKayitDurum("hazir"); kayitDurumRef.current = "hazir"
    if (kayitIptalRef.current) { setDurum("Kayıt durduruldu."); return }
    if (!blob.size) { setDurum("Video oluşturulamadı, lütfen tekrar deneyiniz."); return }
    const uzanti = mimeTuru.includes("mp4") ? "mp4" : "webm"
    await dosyayiVer(blob, dosyaAdi.replace(/\.png$/, "." + uzanti), `video/${uzanti}`)
    if (sesUyari) setDurum("Video kaydedildi — kâri sesi alınamadı (ses sunucusu izin vermiyor olabilir).")
  }

  // Blob'u paylaş / indir (foto ve video ortak)
  const dosyayiVer = async (blob, ad, tur) => {
    try {
      const dosya = new File([blob], ad, { type: tur })
      if (navigator.canShare && navigator.canShare({ files: [dosya] })) {
        await navigator.share({ files: [dosya] })
        setDurum("Paylaşıldı")
      } else {
        const u = URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.href = u; a.download = ad
        document.body.appendChild(a); a.click(); a.remove()
        setTimeout(() => URL.revokeObjectURL(u), 6000)
        setDurum("İndirildi")
      }
    } catch (e) {
      if (e && e.name === "AbortError") setDurum("")
      else setDurum("Kaydedilemedi — dosyaya basılı tutarak kaydedebilirsiniz.")
    }
  }

  const indir = async () => {
    const cv = canvasRef.current
    if (!cv) return
    // Kaydedilen görselde kullanılan özel rengi "son kullanılanlar"a yaz (onBlur mobilde
    // her zaman tetiklenmiyor; kaydetme anı kesin bir işaret).
    if (yaziRengi) setSonRenkler(sonRenkEkle(yaziRengi))
    setCalisiyor(true); setDurum("")
    try {
      const blob = await new Promise(cz => cv.toBlob(cz, "image/png"))
      if (!blob) throw new Error("boş")
      // iOS'ta <a download> güvenilir değil; önce paylaşım sayfası denenir ("Fotoğraflara Kaydet")
      await dosyayiVer(blob, dosyaAdi, "image/png")
    } catch {
      setDurum("Kaydedilemedi — görsele basılı tutarak kaydedebilirsiniz.")
    }
    setCalisiyor(false)
  }

  const dosyaSec = (e) => {
    const f = e.target.files && e.target.files[0]
    if (!f) return
    const okuyucu = new FileReader()
    okuyucu.onload = () => { setOzelGorsel(String(okuyucu.result)); setArkaId("ozel") }
    okuyucu.readAsDataURL(f)
    e.target.value = ""
  }

  if (!acik) return null

  // ── ARAYÜZ ──────────────────────────────────────────────────
  const kucukBaslik = { fontSize: "10px", letterSpacing: "1px", textTransform: "uppercase", color: theme.textSecondary, opacity: 0.75, margin: "0 0 6px" }
  const cipStil = (aktif) => ({
    display: "flex", alignItems: "center", gap: "5px",
    padding: isMobile ? "6px 9px" : "7px 11px", borderRadius: "999px", cursor: "pointer",
    border: `1px solid ${aktif ? theme.accent : theme.border}`,
    background: aktif ? `${theme.accent}1e` : "transparent",
    color: aktif ? theme.accent : theme.textSecondary,
    fontSize: isMobile ? "11px" : "12px", fontWeight: 600, whiteSpace: "nowrap", flexShrink: 0,
  })
  const seritStil = { display: "flex", gap: "6px", overflowX: "auto", paddingBottom: "3px", WebkitOverflowScrolling: "touch" }
  const renkKutu = (renk, aktif) => ({
    width: isMobile ? "26px" : "28px", height: isMobile ? "26px" : "28px",
    borderRadius: "50%", flexShrink: 0, cursor: "pointer", background: renk,
    border: aktif ? `3px solid ${theme.accent}` : `1px solid ${theme.border}`,
    boxShadow: aktif ? `0 0 0 2px ${theme.accent}33` : "none",
    padding: 0,
  })

  const anahtar = (etiket, deger, ayarla, kapali) => (
    <button
      onClick={() => !kapali && ayarla(v => !v)}
      disabled={kapali}
      style={{ ...cipStil(deger && !kapali), opacity: kapali ? 0.35 : 1, cursor: kapali ? "not-allowed" : "pointer" }}
    >
      {deger && !kapali ? <Check size={12} /> : <span style={{ width: 12 }} />} {etiket}
    </button>
  )

  return (
    <div
      onClick={kapat}
      style={{
        position: "fixed", inset: 0, zIndex: 420, background: "rgba(0,0,0,0.62)",
        display: "flex", alignItems: "center", justifyContent: "center", padding: isMobile ? "10px" : "18px",
      }}
    >
      <div
        className="vukuf-panel"
        onClick={e => e.stopPropagation()}
        style={{
          width: "100%", maxWidth: isMobile ? "100%" : "820px", maxHeight: "94vh",
          display: "flex", flexDirection: "column",
          background: theme.background, border: `1px solid ${theme.border}`,
          borderRadius: "16px", overflow: "hidden", boxShadow: "0 18px 60px rgba(0,0,0,0.45)",
        }}
      >
        {/* Başlık */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "11px 14px", borderBottom: `1px solid ${theme.border}`, flexShrink: 0,
        }}>
          <span style={{ display: "flex", alignItems: "center", gap: "8px", minWidth: 0 }}>
            <ImagePlay size={16} color={theme.accent} style={{ flexShrink: 0 }} />
            {/* MOD SEKMELERİ — ayrı bir bar düğmesi yok; fotoğraf/video buradan seçilir */}
            <span style={{ display: "flex", gap: "4px", background: `${theme.accent}12`, borderRadius: "999px", padding: "3px" }}>
              {[{ id: "foto", ad: "Fotoğraf", I: ImageIcon }, { id: "video", ad: "Video", I: Film }].map(m => {
                const kapali = m.id === "video" && !videoDestekli
                const I = m.I
                return (
                  <button
                    key={m.id}
                    onClick={() => !kapali && setMod(m.id)}
                    disabled={kapali}
                    title={kapali ? "Bu tarayıcı video kaydını desteklemiyor" : m.ad}
                    style={{
                      display: "flex", alignItems: "center", gap: "5px",
                      padding: isMobile ? "5px 10px" : "6px 13px", borderRadius: "999px",
                      border: "none", cursor: kapali ? "not-allowed" : "pointer",
                      background: mod === m.id ? theme.accent : "transparent",
                      color: mod === m.id ? "#fff" : theme.textSecondary,
                      opacity: kapali ? 0.4 : 1,
                      fontSize: isMobile ? "11px" : "12px", fontWeight: 600, whiteSpace: "nowrap",
                    }}
                  ><I size={12} /> {m.ad}</button>
                )
              })}
            </span>
          </span>
          <button onClick={kapat} aria-label="Kapat" style={{ background: "transparent", border: "none", color: theme.textSecondary, cursor: "pointer", padding: "4px", display: "flex" }}>
            <X size={18} />
          </button>
        </div>

        <div style={{ overflowY: "auto", overscrollBehavior: "contain", flex: 1, padding: isMobile ? "10px 12px 14px" : "14px 18px 18px" }}>
          {/* ÖNİZLEME */}
          {/* Önizleme YAPIŞKAN: seçenekleri kaydırırken üstte sabit kalır */}
          <div style={{
            position: "sticky", top: 0, zIndex: 3,
            background: theme.background,
            display: "flex", justifyContent: "center",
            margin: isMobile ? "-10px -12px 12px" : "-14px -18px 12px",
            padding: isMobile ? "10px 12px" : "14px 18px",
            borderBottom: `1px solid ${theme.border}`,
          }}>
            <canvas
              ref={canvasRef}
              style={{
                maxWidth: "100%",
                maxHeight: isMobile ? "42vh" : "46vh",
                width: "auto", height: "auto",
                borderRadius: "10px",
                boxShadow: "0 6px 22px rgba(0,0,0,0.28)",
                background: theme.surface,
              }}
            />
          </div>

          {uyari && (
            <div style={{
              fontSize: "11px", color: theme.textSecondary, background: `${theme.accent}12`,
              border: `1px solid ${theme.border}`, borderRadius: "8px", padding: "7px 10px", marginBottom: "10px",
            }}>{uyari}</div>
          )}

          {/* ORAN */}
          <p style={kucukBaslik}>Boyut</p>
          <div className="vukuf-serit" style={{ ...seritStil, marginBottom: "12px" }}>
            {oranListesi.map(o => {
              const I = o.Ikon
              return (
                <button key={o.id} onClick={() => setOran(o.id)} style={cipStil(oran === o.id)}>
                  <I size={12} /> {o.ad} <span style={{ opacity: 0.6 }}>{o.etiket || o.id}</span>
                </button>
              )
            })}
          </div>

          {/* İÇERİK ANAHTARLARI */}
          <p style={kucukBaslik}>İçerik</p>
          <div className="vukuf-serit" style={{ ...seritStil, marginBottom: "12px" }}>
            {anahtar("Âyet (Arapça)", arapcaAcik, setArapcaAcik, !arapca)}
            {anahtar("Meal / Metin", mealAcik, setMealAcik, !meal)}
            {anahtar("Kaynak", kaynakAcik, setKaynakAcik, !kaynak)}
            {anahtar("Vukuf imzası", imzaAcik, setImzaAcik, false)}
          </div>

          {/* ARKA PLAN */}
          <p style={kucukBaslik}>Arka Plan</p>
          <div className="vukuf-serit" style={{ ...seritStil, marginBottom: "12px" }}>
            <button onClick={() => dosyaRef.current?.click()} style={cipStil(arkaId === "ozel")} title="Galeriden seç">
              <Plus size={13} /> Galeriden
            </button>
            <input ref={dosyaRef} type="file" accept="image/*" onChange={dosyaSec} style={{ display: "none" }} />
            {gecerliGorseller.map(g => (
              <button key={g.id} onClick={() => setArkaId(g.id)} style={cipStil(arkaId === g.id)}>{g.ad}</button>
            ))}
            {DESENLER.map(d => (
              <button key={d.id} onClick={() => setArkaId(d.id)} style={cipStil(arkaId === d.id)}>{d.ad}</button>
            ))}
          </div>

          {/* ÇERÇEVE */}
          <p style={kucukBaslik}>Çerçeve</p>
          <div className="vukuf-serit" style={{ ...seritStil, marginBottom: "12px" }}>
            {CERCEVELER.map(c => (
              <button key={c.id} onClick={() => setCerceve(c.id)} style={cipStil(cerceve === c.id)}>{c.ad}</button>
            ))}
          </div>

          {/* KARARTMA */}
          <p style={kucukBaslik}>Karartma <span style={{ textTransform: "none", letterSpacing: 0 }}>(yazının okunurluğu)</span></p>
          <div className="vukuf-serit" style={{ ...seritStil, marginBottom: "12px" }}>
            {KARARTMALAR.map(k => (
              <button key={k.id} onClick={() => setKarartma(k.id)} style={cipStil(karartma === k.id)}>{k.ad}</button>
            ))}
          </div>

          {/* YAZI RENGİ — otomatik + öneriler + son 5 renk + özel renk */}
          <p style={kucukBaslik}>Yazı Rengi</p>
          <div className="vukuf-serit" style={{ ...seritStil, marginBottom: "4px", alignItems: "center" }}>
            <button onClick={() => setYaziRengi(null)} style={cipStil(yaziRengi === null)}>Otomatik</button>

            {/* ÖZEL RENK — input'un KENDİSİ düğme; tıklanınca tarayıcının renk paleti açılır.
                (Gizli/sıfır boyutlu input iOS'ta paleti açmıyordu ve panelin altında ince bir
                beyaz çizgi olarak sızıyordu.) */}
            <label
              title="Özel renk seç"
              style={{
                position: "relative", display: "flex", alignItems: "center", gap: "5px",
                padding: isMobile ? "5px 9px" : "6px 11px", borderRadius: "999px", cursor: "pointer",
                border: `1px solid ${ozelRenkMi ? theme.accent : theme.border}`,
                background: ozelRenkMi ? `${theme.accent}1e` : "transparent",
                color: ozelRenkMi ? theme.accent : theme.textSecondary,
                fontSize: isMobile ? "11px" : "12px", fontWeight: 600, whiteSpace: "nowrap", flexShrink: 0,
                overflow: "hidden",
              }}
            >
              <Pipette size={13} />
              Özel
              <span style={{
                width: "14px", height: "14px", borderRadius: "50%",
                background: yaziRengi || "#f6f1e6",
                border: `1px solid ${theme.border}`, flexShrink: 0,
              }} />
              <input
                type="color"
                value={yaziRengi || "#f6f1e6"}
                onChange={e => setYaziRengi(e.target.value)}
                onBlur={e => setSonRenkler(sonRenkEkle(e.target.value))}
                style={{ position: "absolute", inset: 0, opacity: 0, cursor: "pointer", border: "none", padding: 0 }}
              />
            </label>

            {sonRenkler.length > 0 && <span style={{ width: "1px", height: "22px", background: theme.border, flexShrink: 0, margin: "0 2px" }} />}
            {sonRenkler.map(r => (
              <button key={`son-${r}`} onClick={() => setYaziRengi(r)} title={`Son kullanılan: ${r}`} style={renkKutu(r, yaziRengi === r)} />
            ))}

            <span style={{ width: "1px", height: "22px", background: theme.border, flexShrink: 0, margin: "0 2px" }} />
            {ONERILEN_RENKLER.map(r => (
              <button key={r.id} onClick={() => { setYaziRengi(r.renk); setSonRenkler(sonRenkEkle(r.renk)) }} title={r.ad} style={renkKutu(r.renk, yaziRengi === r.renk)} />
            ))}
          </div>
          <div style={{ fontSize: "10px", color: theme.textSecondary, opacity: 0.7 }}>
            Otomatik: koyu zeminde açık, açık zeminde koyu yazı.
          </div>

          {/* ── VİDEO SEÇENEKLERİ ───────────────────────────── */}
          {mod === "video" && (
            <>
              {/* KAPSAM — birden fazla âyet ya da sûrenin tamamı */}
              {ayet && ayetListesiAl && (
                <>
                  <p style={{ ...kucukBaslik, marginTop: "14px" }}>Kapsam</p>
                  <div className="vukuf-serit" style={{ ...seritStil, marginBottom: "6px" }}>
                    {[{ id: "tek", ad: "Tek âyet" }, { id: 3, ad: "3 âyet" }, { id: 5, ad: "5 âyet" },
                      { id: 10, ad: "10 âyet" }, { id: "sayfa", ad: "Tek sayfa" },
                      { id: "sure", ad: "Sûrenin tamamı" }, { id: "ozel", ad: "Özel…" }].map(k => (
                      <button key={String(k.id)} onClick={() => setKapsam(k.id)} style={cipStil(kapsam === k.id)}>{k.ad}</button>
                    ))}
                  </div>

                  {/* ÖZEL ARALIK — başlangıç / bitiş âyeti (en fazla azamiAyet âyet) */}
                  {kapsam === "ozel" && (() => {
                    const enCok = sureBilgi?.ayetSayisi || 286
                    const sinirla = (v) => Math.min(Math.max(1, Math.round(Number(v) || 1)), enCok)
                    const kutu = {
                      width: "62px", padding: "7px 8px", borderRadius: "8px", textAlign: "center",
                      border: `1px solid ${theme.border}`, background: theme.background,
                      color: theme.text, fontSize: "13px", outline: "none", fontFamily: "inherit",
                    }
                    const secili = ozelSon - ozelBas + 1
                    return (
                      <div style={{ marginBottom: "10px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                          <span style={{ fontSize: "12px", color: theme.textSecondary }}>Başlangıç</span>
                          <input
                            type="number" inputMode="numeric" min={1} max={enCok} value={ozelBas}
                            onChange={e => {
                              const v = sinirla(e.target.value)
                              setOzelBas(v)
                              if (ozelSon < v) setOzelSon(v)
                            }}
                            style={kutu}
                          />
                          <span style={{ fontSize: "12px", color: theme.textSecondary }}>Bitiş</span>
                          <input
                            type="number" inputMode="numeric" min={ozelBas} max={enCok} value={ozelSon}
                            onChange={e => {
                              const v = sinirla(e.target.value)
                              setOzelSon(Math.min(Math.max(v, ozelBas), ozelBas + azamiAyet - 1))
                            }}
                            style={kutu}
                          />
                          <span style={{ fontSize: "11px", color: secili > azamiAyet ? "#c0392b" : theme.accent, fontWeight: 600 }}>
                            {Math.min(Math.max(secili, 1), azamiAyet)} âyet
                          </span>
                        </div>
                        <div style={{ fontSize: "10px", color: theme.textSecondary, opacity: 0.75, marginTop: "5px", lineHeight: 1.45 }}>
                          {sureBilgi?.sureAdi ? `${sureBilgi.sureAdi} sûresi 1–${enCok} arası. ` : ""}
                          En fazla {azamiAyet} âyet seçebilirsiniz.
                        </div>
                      </div>
                    )
                  })()}
                  <div style={{ fontSize: "10px", color: theme.textSecondary, opacity: 0.75, marginBottom: "12px", lineHeight: 1.45 }}>
                    {videoParcalari.length > 1
                      ? `Ekranda ${videoParcalari.length} bölüm sırayla görünür; her âyetin meali altında eş zamanlı geçer.`
                      : "Tek âyet gösterilir."}
                    {(kapsam === "sure" || kapsam === "sayfa") && ` En fazla ${azamiAyet} âyet alınır.`}
                    {kapsam === "sayfa" && " Sayfa iki sûreye taşıyorsa her âyet kendi sûresinin adıyla gösterilir."}
                    {videoParcalari.some(p => p.tip === "besmele") && " Sûre başından başlandığı için besmele ile açılır."}
                  </div>
                </>
              )}

              <p style={{ ...kucukBaslik, marginTop: ayet && ayetListesiAl ? 0 : "14px" }}>Hareket</p>
              <div className="vukuf-serit" style={{ ...seritStil, marginBottom: "12px" }}>
                {HAREKETLER.map(h => (
                  <button key={h.id} onClick={() => setHareket(h.id)} style={cipStil(hareket === h.id)}>{h.ad}</button>
                ))}
              </div>

              <p style={kucukBaslik}>Efekt</p>
              <div className="vukuf-serit" style={{ ...seritStil, marginBottom: "12px" }}>
                {EFEKTLER.map(e => (
                  <button key={e.id} onClick={() => setEfekt(e.id)} style={cipStil(efekt === e.id)}>{e.ad}</button>
                ))}
              </div>

              {/* Kâri sesi yalnız âyet bilgisi geldiğinde (KuranOkuma) anlamlı */}
              {ayet && sesUrlAl && (
                <>
                  <p style={kucukBaslik}>Âyeti Okusun</p>
                  <div className="vukuf-serit" style={{ ...seritStil, marginBottom: kariler && kariler.length && sesAcik ? "8px" : "12px" }}>
                    <button onClick={() => setSesAcik(true)} style={cipStil(sesAcik)}>
                      <Volume2 size={12} /> Kâri okusun
                    </button>
                    <button onClick={() => setSesAcik(false)} style={cipStil(!sesAcik)}>
                      <VolumeX size={12} /> Sessiz
                    </button>
                  </div>
                  {sesAcik && kariler && kariler.length > 0 && (
                    <div className="vukuf-serit" style={{ ...seritStil, marginBottom: "12px" }}>
                      {kariler.map(k => (
                        <button
                          key={k.id}
                          onClick={() => onKari && onKari(k.id)}
                          style={cipStil(kariId === k.id)}
                        >{k.label || k.ad || k.id}</button>
                      ))}
                    </div>
                  )}
                  {sesAcik && (
                    <div style={{ fontSize: "10px", color: theme.textSecondary, opacity: 0.7, marginBottom: "12px" }}>
                      Videonun süresi âyetin okunuş süresi kadar olur.
                    </div>
                  )}
                </>
              )}

              <p style={kucukBaslik}>Çözünürlük</p>
              <div className="vukuf-serit" style={{ ...seritStil, marginBottom: "6px" }}>
                {[{ id: 720, ad: "720p · hızlı" }, { id: 1080, ad: "1080p · net" }].map(k => (
                  <button key={k.id} onClick={() => setVideoKalite(k.id)} style={cipStil(videoKalite === k.id)}>{k.ad}</button>
                ))}
              </div>
              <div style={{ fontSize: "10px", color: theme.textSecondary, opacity: 0.75, marginBottom: "12px", lineHeight: 1.45 }}>
                Kayıt gerçek zamanlıdır: video ne kadar sürüyorsa hazırlanması da o kadar sürer.
                720p telefonlarda gözle görülür biçimde daha akıcı kaydeder.
              </div>

              {/* Ses yoksa süre seçilir (çoklu âyette süre seslerden gelir) */}
              {(!ayet || !sesUrlAl || !sesAcik) && videoParcalari.length === 1 && (
                <>
                  <p style={kucukBaslik}>Süre</p>
                  <div className="vukuf-serit" style={{ ...seritStil, marginBottom: "4px" }}>
                    {SURELER.map(sr => (
                      <button key={sr.id} onClick={() => setVideoSure(sr.id)} style={cipStil(videoSure === sr.id)}>{sr.ad}</button>
                    ))}
                  </div>
                </>
              )}
            </>
          )}
        </div>

        {/* ALT: indir */}
        <div style={{
          padding: "10px 14px", borderTop: `1px solid ${theme.border}`,
          display: "flex", alignItems: "center", gap: "10px", flexShrink: 0,
        }}>
          <span style={{ flex: 1, fontSize: "11px", color: theme.textSecondary, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {durum || (mod === "video"
              ? (kayitDurum === "kayit"
                  ? `Kaydediliyor… ${kalanSn} sn kaldı`
                  : `${olcu.w}×${olcu.h} · ${mimeTuru && mimeTuru.includes("mp4") ? "MP4" : "WEBM"} · ~${Math.ceil(toplamSureRef.current || videoSure)} sn`)
              : `${olcu.w}×${olcu.h} px · PNG`)}
          </span>

          {mod === "video" && kayitDurum !== "hazir" ? (
            <>
              {/* Kayıt gerçek zamanlıdır: ilerleme çubuğu + durdurma */}
              <span style={{
                flexShrink: 0, width: isMobile ? "70px" : "110px", height: "6px",
                borderRadius: "3px", background: `${theme.accent}22`, overflow: "hidden",
              }}>
                <span style={{
                  display: "block", height: "100%", width: `${Math.round(ilerleme * 100)}%`,
                  background: theme.accent, transition: "width .12s linear",
                }} />
              </span>
              <button
                onClick={() => {
                  kayitIptalRef.current = true
                  try { iptalRef.current && iptalRef.current.abort() } catch { /* yoksay */ }
                  setDurum("Durduruluyor…")
                }}
                style={{
                  display: "flex", alignItems: "center", gap: "6px",
                  padding: isMobile ? "10px 14px" : "11px 18px", borderRadius: "10px",
                  border: `1px solid ${theme.border}`, background: "transparent",
                  color: theme.textSecondary, cursor: "pointer",
                  fontSize: isMobile ? "13px" : "14px", fontWeight: 600,
                }}
              ><CircleStop size={15} /> Durdur</button>
            </>
          ) : (
            <button
              onClick={mod === "video" ? videoKaydet : indir}
              disabled={calisiyor}
              style={{
                display: "flex", alignItems: "center", gap: "7px",
                padding: isMobile ? "10px 16px" : "11px 20px", borderRadius: "10px", border: "none",
                background: theme.accent, color: "#fff", cursor: calisiyor ? "wait" : "pointer",
                fontSize: isMobile ? "13px" : "14px", fontWeight: 600,
              }}
            >
              {calisiyor ? <Loader2 size={15} />
                : mod === "video" ? <Film size={15} />
                : (navigator.canShare ? <Share2 size={15} /> : <Download size={15} />)}
              {mod === "video" ? "Videoyu Kaydet" : "Kaydet"}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
