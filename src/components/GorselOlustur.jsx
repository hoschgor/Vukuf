import { useState, useEffect, useRef, useCallback, useMemo } from "react"
import {
  X, Download, Share2, Plus, Check, Loader2,
  Square, RectangleHorizontal, RectangleVertical, Image as ImageIcon, Pipette,
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
  const S = Math.min(W, H)
  ctx.clearRect(0, 0, W, H)

  // 1) ARKA PLAN
  if (arka.tip === "gorsel") {
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
      // Kaynak uzun olabilir (kitap · kısım · sayfa) → EN FAZLA 2 SATIRA sarılır,
      // taşarsa son satır "…" ile kısaltılır.
      let sat = satirlaraBol(ctx, kaynak, kutuW)
      if (sat.length > 2) {
        const son = sat.slice(1).join(" ")
        let kirp = son
        while (kirp.length > 1 && ctx.measureText(kirp + "…").width > kutuW) kirp = kirp.slice(0, -1)
        sat = [sat[0], kirp.trim() + "…"]
      }
      const satirYuk = b * 1.4
      bloklar.push({ tip: "bosluk", yuk: bo })
      bloklar.push({ tip: "kaynak", boy: b, satirlar: sat, yuk: sat.length * satirYuk, satirYuk })
      toplam += bo + sat.length * satirYuk
    }
    return { bloklar, toplam }
  }

  let alt = 0.45, ust = 1.35, olcek = 0.45
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

export default function GorselOlustur({
  acik, kapat, arapca, meal, kaynak, arapcaFont, theme, isMobile,
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
  const [sonRenkler, setSonRenkler] = useState(() => sonRenkleriOku())
  const ozelRenkMi = !!yaziRengi && !ONERILEN_RENKLER.some(r => r.renk === yaziRengi)

  // Panel her açılışta içeriğe göre mantıklı başlasın
  useEffect(() => {
    if (!acik) return
    setArapcaAcik(!!arapca); setMealAcik(!!meal); setUyari(""); setDurum("")
    setYaziRengi(null); setSonRenkler(sonRenkleriOku())
  }, [acik, arapca, meal])

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

  const olcu = ORANLAR.find(o => o.id === oran) || ORANLAR[0]

  // ── ÇİZİM ───────────────────────────────────────────────────
  const ciz = useCallback(async () => {
    const cv = canvasRef.current
    if (!cv) return
    cv.width = olcu.w; cv.height = olcu.h
    const ctx = cv.getContext("2d")
    const { olcek } = await gorselCiz(ctx, {
      W: olcu.w, H: olcu.h,
      arka: secili,
      cerceve, karartma,
      arapca: arapcaAcik ? arapca : null,
      meal:   mealAcik   ? meal   : null,
      kaynak: kaynakAcik ? kaynak : null,
      imza: imzaAcik,
      arapcaFont,
      yaziRengi,
    })
    setUyari(olcek <= 0.46
      ? "Metin uzun — yazı en küçük okunur boyuta indi. Daha kısa bir bölüm seçersen daha güzel görünür."
      : "")
  }, [olcu, secili, cerceve, karartma, arapca, meal, kaynak, arapcaAcik, mealAcik, kaynakAcik, imzaAcik, arapcaFont, yaziRengi])

  // Fontlar yüklenmeden çizersek canvas yedek fontla çizer → önce fonts.ready bekle
  useEffect(() => {
    if (!acik) return
    let iptal = false
    const calistir = () => { if (!iptal) ciz() }
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(calistir).catch(calistir)
    else calistir()
    return () => { iptal = true }
  }, [acik, ciz])

  // ── İNDİR / PAYLAŞ ──────────────────────────────────────────
  const dosyaAdi = useMemo(() => {
    const t = (kaynak || "vukuf").toLocaleLowerCase("tr-TR")
      .replace(/[çğıöşü]/g, c => ({ ç: "c", ğ: "g", ı: "i", ö: "o", ş: "s", ü: "u" }[c]))
      .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")
    return `vukuf-${t || "gorsel"}.png`
  }, [kaynak])

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
      const dosya = new File([blob], dosyaAdi, { type: "image/png" })
      // iOS'ta <a download> güvenilir değil; önce paylaşım sayfasını dene (Fotoğraflara Kaydet çıkar)
      if (navigator.canShare && navigator.canShare({ files: [dosya] })) {
        await navigator.share({ files: [dosya] })
        setDurum("Paylaşıldı")
      } else {
        const url = URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.href = url; a.download = dosyaAdi
        document.body.appendChild(a); a.click(); a.remove()
        setTimeout(() => URL.revokeObjectURL(url), 4000)
        setDurum("İndirildi")
      }
    } catch (e) {
      if (e && e.name === "AbortError") setDurum("")
      else setDurum("Kaydedilemedi — görsele basılı tutup kaydedebilirsin.")
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
          <span style={{ display: "flex", alignItems: "center", gap: "7px", color: theme.text, fontSize: isMobile ? "14px" : "15px", fontWeight: 600 }}>
            <ImageIcon size={16} color={theme.accent} /> Görsel Oluştur
          </span>
          <button onClick={kapat} aria-label="Kapat" style={{ background: "transparent", border: "none", color: theme.textSecondary, cursor: "pointer", padding: "4px", display: "flex" }}>
            <X size={18} />
          </button>
        </div>

        <div style={{ overflowY: "auto", flex: 1, padding: isMobile ? "10px 12px 14px" : "14px 18px 18px" }}>
          {/* ÖNİZLEME */}
          <div style={{ display: "flex", justifyContent: "center", marginBottom: "12px" }}>
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
          <div style={{ ...seritStil, marginBottom: "12px" }}>
            {ORANLAR.map(o => {
              const I = o.Ikon
              return (
                <button key={o.id} onClick={() => setOran(o.id)} style={cipStil(oran === o.id)}>
                  <I size={12} /> {o.ad} <span style={{ opacity: 0.6 }}>{o.id}</span>
                </button>
              )
            })}
          </div>

          {/* İÇERİK ANAHTARLARI */}
          <p style={kucukBaslik}>İçerik</p>
          <div style={{ ...seritStil, marginBottom: "12px" }}>
            {anahtar("Âyet (Arapça)", arapcaAcik, setArapcaAcik, !arapca)}
            {anahtar("Meal / Metin", mealAcik, setMealAcik, !meal)}
            {anahtar("Kaynak", kaynakAcik, setKaynakAcik, !kaynak)}
            {anahtar("Vukuf imzası", imzaAcik, setImzaAcik, false)}
          </div>

          {/* ARKA PLAN */}
          <p style={kucukBaslik}>Arka Plan</p>
          <div style={{ ...seritStil, marginBottom: "12px" }}>
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
          <div style={{ ...seritStil, marginBottom: "12px" }}>
            {CERCEVELER.map(c => (
              <button key={c.id} onClick={() => setCerceve(c.id)} style={cipStil(cerceve === c.id)}>{c.ad}</button>
            ))}
          </div>

          {/* KARARTMA */}
          <p style={kucukBaslik}>Karartma <span style={{ textTransform: "none", letterSpacing: 0 }}>(yazının okunurluğu)</span></p>
          <div style={{ ...seritStil, marginBottom: "12px" }}>
            {KARARTMALAR.map(k => (
              <button key={k.id} onClick={() => setKarartma(k.id)} style={cipStil(karartma === k.id)}>{k.ad}</button>
            ))}
          </div>

          {/* YAZI RENGİ — otomatik + öneriler + son 5 renk + özel renk */}
          <p style={kucukBaslik}>Yazı Rengi</p>
          <div style={{ ...seritStil, marginBottom: "4px", alignItems: "center" }}>
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
        </div>

        {/* ALT: indir */}
        <div style={{
          padding: "10px 14px", borderTop: `1px solid ${theme.border}`,
          display: "flex", alignItems: "center", gap: "10px", flexShrink: 0,
        }}>
          <span style={{ flex: 1, fontSize: "11px", color: theme.textSecondary, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {durum || `${olcu.w}×${olcu.h} px · PNG`}
          </span>
          <button
            onClick={indir}
            disabled={calisiyor}
            style={{
              display: "flex", alignItems: "center", gap: "7px",
              padding: isMobile ? "10px 16px" : "11px 20px", borderRadius: "10px", border: "none",
              background: theme.accent, color: "#fff", cursor: calisiyor ? "wait" : "pointer",
              fontSize: isMobile ? "13px" : "14px", fontWeight: 600,
            }}
          >
            {calisiyor ? <Loader2 size={15} /> : (navigator.canShare ? <Share2 size={15} /> : <Download size={15} />)}
            Kaydet
          </button>
        </div>
      </div>
    </div>
  )
}
