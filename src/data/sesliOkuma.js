/* ═══════════════════════════════════════════════════════════════════════════
   VUKUF — SESLİ OKUMA (Web Speech API · speechSynthesis)
   src/data/sesliOkuma.js

   15 Ekim 2026, kullanıcı: "Web Speech API ile kitapları okutalım. Arapça kısımlar
   için bir belirteçle, âyet ise sûre ismi ve âyet numarası okunup meali okunsun;
   kaynağı olmayan (sûresi ibaresi geçmeyen) bölümler için Arapça yazı uyarısı
   verilsin; konuşma Arapçayı destekliyorsa aynı metin içinde açılabilsin."

   YAPI
     • Metin BİRİMLERE bölünür (sayfaBirimleri): her birim tek bir cümle (ya da
       uzun cümlenin bir parçası) + hangi sayfa/satırda olduğu. Okuma ekranı
       okunan satırı ve cümleyi bu bilgiyle vurgular, gerekirse oraya kaydırır.
     • Tamamen Arapça satır blokları:
         – Dipnotunda "<Ad> Sûresi, s:a" geçiyorsa → işaret sesi + "Bakara Sûresi,
           255. âyet. Meali: …" (meal ayet-meal.json'dan; âyetin Arapçası yapay
           sesle OKUNMAZ — tecvid ve edep gereği).
         – Kaynağı yoksa → ayara göre: "Arapça ibare." uyarısı (varsayılan) /
           atla / cihazda Arapça ses varsa Arapça sesle oku.
     • Türkçe satır içindeki Arapça kelimeler: Arapça sesle okuma açıksa ayrı birim
       olarak Arapça sesle, değilse kısa bir duraksamayla atlanır.
     • "(a.s.m.)" gibi kısaltmalar yalnız SÖYLENİRKEN açılır (ekrandaki metne dokunulmaz).

   MOTOR (sesliOkuyucu): cümle cümle konuşur (uzun metni tek seferde vermek bazı
   tarayıcılarda yarıda kesiliyor). Duraklat = durdur + yeri hatırla (pause() bazı
   Android sürümlerinde güvenilmez). Konuşma nesnesi modülde tutulur (aksi hâlde
   bazı tarayıcılar onu çöpe atıp `onend`i hiç çağırmıyor); ayrıca bekçi zamanlayıcı
   `onend` gelmezse sıradakine geçer. Ekran açık kalsın diye Wake Lock istenir
   (iPhone'da ekran kilitlenince konuşma durur).

   ARAPÇA SES (16 Ekim 2026, kullanıcı: "ikili kombinasyon yapabiliriz"):
     • Kaynağı bilinen âyet → "Neml Sûresi, 30. âyet." + HAFIZ KAYDI (everyayah, Kur'ân
       bölümünde seçili kâri ya da burada seçilen) + meal. Kayıt önbellekte değilse ve
       internet yoksa kayıt atlanır, meal okunur. (ayar.ayetSes: "hafiz" | "meal")
     • Kaynağı bilinmeyen Arapça → "Arapça sesle oku" seçiliyse Kerîm (Vukuf sesi,
       isteğe bağlı indirilir) ya da cihazın Arapça sesi (ayar.arSes: "kerim" | "cihaz").
   ═══════════════════════════════════════════════════════════════════════════ */

import { sureAdi } from "./sureAdlari"
import { mp3Url, KARILAR } from "./hooks/useAudioPlayer"

export const SESLI_AYAR_ANAHTAR = "vukuf-sesli-okuma"
export const SESLI_KONUM_ANAHTAR = "vukuf-sesli-konum"     // { kitap: { sayfa, satir } }
// motor: "cihaz" (Web Speech) | "vukuf" (tarayıcı içi Piper — data/vukufSes.js); vukufSes: "antalia" (varsayılan) | "dfki" | "mms" (Fahrettin 16, Fettah 17 Ekim 2026'da çıkarıldı)
export const SESLI_VARSAYILAN = {
  hiz: 1, sesTr: "", sesAr: "", arapca: "uyari", isaret: true, takip: true, motor: "cihaz", vukufSes: "antalia",
  ayetSes: "hafiz",      // kaynağı bilinen âyet: "hafiz" (kayıt + meal) | "meal"
  kari: "",              // "" = Kur'ân bölümünde seçili kâri
  arSes: "kerim",        // kaynağı bilinmeyen Arapça: "kerim" (Vukuf) | "cihaz"
}
/* Hafız kaydı hangi kâriden: sesli okumada seçilen, yoksa Kur'ân bölümündeki seçim */
export function kariSec(ayar) {
  let id = ayar?.kari || ""
  if (!id) { try { id = localStorage.getItem("vukuf-kari") || "" } catch { /* yoksay */ } }
  return KARILAR.some(k => k.id === id) ? id : KARILAR[0].id
}
export { KARILAR }

/* iPhone: ses ancak kullanıcı dokunuşunun İÇİNDE açılabiliyor. Düğmelerin onClick'inde
   çağrılır: hem konuşma motoru hem Vukuf sesi için kullanılan <audio> öğesi açılır. */
let sesOgesi = null
// 16 Ekim 2026: eski sessiz WAV'ın verisi BOŞTU (0 bayt) — iPhone boş sesi çalamayıp öğenin
// kilidini açmayabiliyordu. Artık 0,1 sn gerçek sessizlik (8 kHz, 8 bit).
let sessizUrl = ""
function sessizWav() {
  if (sessizUrl) return sessizUrl
  const n = 800, v = new DataView(new ArrayBuffer(44 + n))
  const yaz = (o, t) => { for (let i = 0; i < t.length; i++) v.setUint8(o + i, t.charCodeAt(i)) }
  yaz(0, "RIFF"); v.setUint32(4, 36 + n, true); yaz(8, "WAVE"); yaz(12, "fmt ")
  v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true)
  v.setUint32(24, 8000, true); v.setUint32(28, 8000, true); v.setUint16(32, 1, true); v.setUint16(34, 8, true)
  yaz(36, "data"); v.setUint32(40, n, true)
  for (let i = 0; i < n; i++) v.setUint8(44 + i, 128)
  // data: adresi (blob değil) — iPhone'da blob adresli ses ilerlemeyebiliyor (aşağıda veriUrlKullan)
  let ikili = ""
  const u8 = new Uint8Array(v.buffer)
  for (let i = 0; i < u8.length; i++) ikili += String.fromCharCode(u8[i])
  sessizUrl = "data:audio/wav;base64," + window.btoa(ikili)
  return sessizUrl
}
export function sesKilidiAc() {
  try {
    if (!sesOgesi && typeof Audio !== "undefined") { sesOgesi = new Audio(); sesOgesi.preload = "auto" }
    if (sesOgesi) { sesOgesi.src = sessizWav(); const p = sesOgesi.play(); if (p && p.catch) p.catch(() => {}) }
  } catch { /* yoksay */ }
  try { if (sesliDestekVar()) window.speechSynthesis.speak(new window.SpeechSynthesisUtterance("")) } catch { /* yoksay */ }
}
export const HIZLAR = [0.8, 1, 1.2, 1.5, 1.8]

const ARAP = "\\u0600-\\u06FF\\u0750-\\u077F\\u08A0-\\u08FF\\uFB50-\\uFDFF\\uFE70-\\uFEFF"
const ARAP_RE = new RegExp(`[${ARAP}]`)
const LATIN_RE = /[A-Za-zÇĞİıÖŞÜçğöşü]/
// Satır içindeki Arapça kelime öbeği (aralarındaki boşluklar dahil)
const ARAP_OBEK_RE = new RegExp(`[${ARAP}][${ARAP}\\s\\u200c\\u200d]*`, "g")

export function sesliDestekVar() {
  return typeof window !== "undefined" && "speechSynthesis" in window && typeof window.SpeechSynthesisUtterance === "function"
}

const VUKUF_SES_IDLERI = ["antalia", "dfki", "mms"]   // Fettah 17 Ekim 2026'da çıkarıldı
export function ayarOku() {
  let a
  try { a = { ...SESLI_VARSAYILAN, ...(JSON.parse(localStorage.getItem(SESLI_AYAR_ANAHTAR)) || {}) } }
  catch { a = { ...SESLI_VARSAYILAN } }
  // Listeden çıkarılmış bir ses seçiliyse (ör. Fahrettin) varsayılana dön
  if (!VUKUF_SES_IDLERI.includes(a.vukufSes)) a.vukufSes = SESLI_VARSAYILAN.vukufSes
  return a
}
export function ayarYaz(parca) {
  const yeni = { ...ayarOku(), ...parca }
  try { localStorage.setItem(SESLI_AYAR_ANAHTAR, JSON.stringify(yeni)) } catch { /* yoksay */ }
  return yeni
}
export function konumOku(kitapId) {
  try { return (JSON.parse(localStorage.getItem(SESLI_KONUM_ANAHTAR)) || {})[kitapId] || null } catch { return null }
}
function konumYaz(kitapId, konum) {
  try {
    const t = JSON.parse(localStorage.getItem(SESLI_KONUM_ANAHTAR)) || {}
    t[kitapId] = konum
    localStorage.setItem(SESLI_KONUM_ANAHTAR, JSON.stringify(t))
  } catch { /* yoksay */ }
}

/* ── SESLER ───────────────────────────────────────────────────────────────── */
// getVoices() ilk çağrıda boş dönebiliyor; `voiceschanged` beklenir (en çok 2 sn)
export function sesleriAl() {
  if (!sesliDestekVar()) return Promise.resolve([])
  const ss = window.speechSynthesis
  const simdi = ss.getVoices()
  if (simdi && simdi.length) return Promise.resolve(simdi)
  return new Promise((cz) => {
    let bitti = false
    const son = () => { if (bitti) return; bitti = true; ss.removeEventListener?.("voiceschanged", son); cz(ss.getVoices() || []) }
    ss.addEventListener?.("voiceschanged", son)
    setTimeout(son, 2000)
  })
}
const dil = (v) => String(v?.lang || "").toLowerCase().replace("_", "-")
export const turkceSesler = (sesler) => sesler.filter(v => dil(v).startsWith("tr"))
export const arapcaSesler = (sesler) => sesler.filter(v => dil(v).startsWith("ar"))
// Doğal/gelişmiş sesler öne; sonra cihazın kendi sesi (internetsiz çalışır)
function puan(v) {
  const ad = String(v.name || "")
  let p = 0
  if (/natural|neural|premium|enhanced|siri/i.test(ad)) p += 4
  if (/google/i.test(ad)) p += 2
  if (v.localService) p += 1
  if (/espeak/i.test(ad)) p -= 5
  return p
}
/* Web Speech API sesin cinsiyetini bildirmiyor; bilinen ses adlarından çıkarılır.
   (Microsoft: Ahmet/Tolga erkek, Emel kadın · Apple: Yelda kadın, Cem erkek) */
export function sesCinsiyeti(v) {
  const ad = String(v?.name || "")
  if (/\b(ahmet|tolga|cem|fettah|fahrettin|mehmet|ali|male)\b/i.test(ad)) return "erkek"
  if (/\b(emel|yelda|seda|filiz|aylin|zeynep|female)\b/i.test(ad)) return "kadin"
  return ""
}
/* Bu tarayıcıda Türkçe ses yoksa nereden bulunacağına dair kısa yol tarifi */
export function turkceSesYolTarifi() {
  const ua = typeof navigator !== "undefined" ? navigator.userAgent : ""
  if (/iPhone|iPad|iPod/i.test(ua)) return "Türkçe ses, Ayarlar › Erişilebilirlik › Seslendirilen İçerik › Sesler › Türkçe bölümünden indirilebilir."
  if (/Android/i.test(ua)) return "Türkçe ses, cihazın Metin okuma (TTS) ayarlarından Türkçe dil paketi indirilerek eklenebilir; erkek ya da kadın ses tipi de orada seçilir."
  if (/Edg\//.test(ua)) return "Edge'de Türkçe doğal sesler internet bağlantısıyla gelir; bağlantı varken yeniden denenebilir."
  if (/Firefox|Floorp|LibreWolf|Waterfox/i.test(ua) && /Linux/i.test(ua)) return "Linux'ta Firefox tabanlı tarayıcılar sesleri speech-dispatcher'dan alır; Türkçe ses için espeak-ng kurulabilir (kalitesi düşüktür). Microsoft Edge'de doğal Türkçe sesler (Ahmet, Emel) hazır gelir."
  if (/Chrome\//.test(ua) && !/Android/i.test(ua)) return "Chrome'un masaüstü sürümünde Türkçe ses bulunmuyor. Microsoft Edge'de doğal Türkçe sesler (Ahmet — erkek, Emel — kadın) hazır gelir."
  return "Türkçe ses, cihazın konuşma (TTS) ayarlarından eklenebilir."
}
export function enIyiSes(liste, tercihAdi) {
  if (!liste || !liste.length) return null
  if (tercihAdi) { const t = liste.find(v => v.name === tercihAdi); if (t) return t }
  return [...liste].sort((a, b) => puan(b) - puan(a))[0]
}

/* ── METİN TEMİZLEME ──────────────────────────────────────────────────────── */
// Yalnız SÖYLENİŞTE açılan kısaltmalar (Risale ve dinî metinlerde sık geçenler)
const KISALTMALAR = [
  [/\(\s*a\.?\s*s\.?\s*m\.?\s*\)/gi, " (aleyhissalâtü vesselâm) "],
  [/\(\s*s\.?\s*a\.?\s*v\.?\s*\)/gi, " (sallallâhu aleyhi ve sellem) "],
  [/\(\s*a\.?\s*s\.?\s*\)/gi, " (aleyhisselâm) "],
  [/\(\s*r\.?\s*a\.?\s*\)/gi, " (radıyallâhu anh) "],
  [/\(\s*k\.?\s*s\.?\s*\)/gi, " (kuddise sirruhû) "],
  [/\(\s*c\.?\s*c\.?\s*\)/gi, " (celle celâlühû) "],
  [/\bHz\.\s*/g, "Hazret-i "],
  [/\bbk\.\s*/gi, "bakınız "],
  [/\bvb\.\s*/gi, "ve benzeri "],
  [/\bvs\.\s*/gi, "vesaire "],
  [/\bs\.\s*(?=\d)/g, "sayfa "],
]
function soylenis(s) {
  let t = s
  for (const [re, yeni] of KISALTMALAR) t = t.replace(re, yeni)
  return t.replace(/[_*•§⟦⟧]/g, " ").replace(/\s+/g, " ").trim()
}
// Ekranda aranacak biçim: işaretler ayıklanır, metin olduğu gibi kalır
function gorunur(s) {
  return String(s || "")
    .replace(/^⟦C⟧/, "")
    .replace(/⟦H\d+⟧/g, "")
    .replace(/\[\s*\d+\s*\]/g, "")
    .replace(/\s+/g, " ")
    .trim()
}

// Cümlelere böl; çok uzun cümleyi noktalı virgül / virgül yakınından ikiye ayır
const AZAMI = 230
// Noktası cümle bitirmeyen kısaltmalar (küçük harfle, noktasız)
const KISA = new Set(["hz", "bk", "bkz", "vb", "vs", "vd", "s", "sh", "c", "cilt", "dr", "prof", "ör", "krş", "nşr", "thk", "trc", "ed", "no", "md", "çev", "haz"])
const BUYUK_RE = /[A-ZÇĞİÖŞÜÂÎÛ"“'‘«(\[0-9]/
// Cümlelere ayır: [.!?…] ardından boşluk ve BÜYÜK harf/rakam/tırnak gelirse sınır;
// "Hz.", "bk. s. 45", "(a.s.m.) buyurmuş" gibi yerlerde bölmez.
function cumleBol(metin) {
  const parcalar = []
  let bas = 0
  for (let i = 0; i < metin.length; i++) {
    const ch = metin[i]
    if (!".!?…".includes(ch)) continue
    let j = i + 1
    while (j < metin.length && /[.!?…"'”’»)\]]/.test(metin[j])) j++
    if (j < metin.length && !/\s/.test(metin[j])) continue          // boşluk yok → sınır değil
    let k = j
    while (k < metin.length && /\s/.test(metin[k])) k++
    if (k < metin.length && !BUYUK_RE.test(metin[k])) continue       // küçük harfle sürüyor
    if (ch === ".") {
      const once = (metin.slice(bas, i).match(/([\p{L}]+)$/u) || [])[1] || ""
      const kucuk = once.toLocaleLowerCase("tr")
      if (once.length === 1 || KISA.has(kucuk)) continue           // kısaltma / tek harf
    }
    parcalar.push(metin.slice(bas, j)); bas = j; i = j - 1
  }
  if (bas < metin.length) parcalar.push(metin.slice(bas))
  return parcalar
}
function cumleler(metin) {
  const ham = cumleBol(metin)
  const cikti = []
  const bol = (c) => {
    c = c.trim()
    if (!c) return
    if (c.length <= AZAMI) { cikti.push(c); return }
    const orta = c.length / 2
    let en = -1, fark = Infinity
    for (const re of [/;\s/g, /,\s/g, /\s/g]) {
      let m
      re.lastIndex = 0
      while ((m = re.exec(c)) !== null) {
        const d = Math.abs(m.index - orta)
        if (d < fark) { fark = d; en = m.index + 1 }
      }
      if (en > 0 && fark < c.length * 0.3) break
    }
    if (en <= 0) { cikti.push(c); return }
    bol(c.slice(0, en)); bol(c.slice(en))
  }
  ham.forEach(bol)
  return cikti
}

/* ── ÂYET ATIFLARI ────────────────────────────────────────────────────────── */
// "<Ad> Sûresi, 2:255" ya da "2:255-257" (aralık en çok 6 âyet)
function ayetAtiflari(text) {
  if (!text) return []
  const re = /([A-Za-zÇĞİÖŞÜçğıöşüâîûôêÂÎÛ'’.\-]+)\s+s[uû]res[iî]\s*[,:]?\s*(\d{1,3})\s*[:：]\s*(\d{1,3})(?:\s*[-–]\s*(\d{1,3}))?/gi
  const gorulen = new Set(), sonuc = []
  let m
  while ((m = re.exec(text)) !== null) {
    const sureNo = +m[2], bas = +m[3], son = m[4] ? Math.min(+m[4], bas + 5) : bas
    if (sureNo < 1 || sureNo > 114 || bas < 1) continue
    for (let a = bas; a <= Math.max(bas, son); a++) {
      const k = `${sureNo}:${a}`
      if (gorulen.has(k)) continue
      gorulen.add(k)
      sonuc.push({ sureNo, ayetNo: a })
    }
  }
  return sonuc
}

/* ── BİRİMLER ─────────────────────────────────────────────────────────────
   sayfa: { sayfa, metin, dipnotlar?, basliklar? }
   secenek: { arapca: "uyari"|"atla"|"oku", arapcaSesVar, ayetMeal, hafiz }
   → [{ sayfa, satir, satirlar?, tip, lang, soyle, goster, isaret }] */
export function sayfaBirimleri(sayfa, secenek, basSatir = 0) {
  const birimler = []
  if (!sayfa || !sayfa.metin) return birimler
  const satirlar = String(sayfa.metin).split("\n")
  const dipnot = { ...(sayfa.dipnotlar || {}) }
  for (const l of satirlar) {
    const m = l.match(/^§\[(\d+)\]\s*(.*)$/)
    if (m && !dipnot[m[1]]) dipnot[m[1]] = m[2]
  }
  const basliklar = new Set((sayfa.basliklar || []).map(b => b.satir))
  const arapSatir = (s) => s.trim() && !s.startsWith("§") && ARAP_RE.test(s) && !LATIN_RE.test(s)
  const arapcaOku = secenek.arapca === "oku" && secenek.arapcaSesVar
  const ekle = (b) => birimler.push({ sayfa: sayfa.sayfa, ...b })

  let i = Math.max(0, basSatir | 0)
  while (i < satirlar.length) {
    const ham = satirlar[i]
    if (!ham.trim() || ham.startsWith("§")) { i++; continue }

    // ── Tamamen Arapça blok
    if (arapSatir(ham)) {
      let j = i, dpMetin = ""
      const blok = []
      while (j < satirlar.length && arapSatir(satirlar[j])) {
        const m = satirlar[j].match(/\[\s*(\d+)\s*\]/)
        if (m && dipnot[m[1]] && !dpMetin) dpMetin = dipnot[m[1]]
        blok.push(j); j++
      }
      let atiflar = ayetAtiflari(dpMetin)
      // Kaynak dipnotta değil de bloğun HEMEN ALTINDAKİ kısa satırdaysa — "(Neml Sûresi, 27:30)" —
      // o satır kaynak sayılır ve ayrıca okunmaz
      if (!atiflar.length) {
        let k = j
        while (k < satirlar.length && !satirlar[k].trim()) k++
        const alt = k < satirlar.length ? gorunur(satirlar[k]) : ""
        if (alt && alt.length <= 90 && !ARAP_RE.test(alt)) {
          const a2 = ayetAtiflari(alt)
          if (a2.length && alt.replace(/[^\p{L}]/gu, "").length <= 40) { atiflar = a2; j = k + 1 }
        }
      }
      if (atiflar.length) {
        atiflar.forEach((a, k) => {
          ekle({ satir: i, satirlar: blok, tip: "ayet", lang: "tr", isaret: k === 0, goster: "",
            soyle: `${sureAdi(a.sureNo)} Sûresi, ${a.ayetNo}. âyet.` })
          // Hafız kaydı (yapay ses değil — gerçek tilâvet)
          if (secenek.hafiz) ekle({ satir: i, satirlar: blok, tip: "kari", lang: "kari", goster: "", soyle: "", sureNo: a.sureNo, ayetNo: a.ayetNo })
          const meal = secenek.ayetMeal?.[a.sureNo]?.[a.ayetNo]
          const mealMetni = typeof meal === "string" ? meal : (meal && (meal.meal || meal.metin)) || ""
          if (mealMetni) {
            cumleler(soylenis(`Meali: ${mealMetni}`)).forEach(c =>
              ekle({ satir: i, satirlar: blok, tip: "meal", lang: "tr", goster: "", soyle: c }))
          }
        })
      } else if (arapcaOku) {
        const metin = blok.map(k => gorunur(satirlar[k])).join(" ")
        ekle({ satir: i, satirlar: blok, tip: "arapca", lang: "ar", isaret: true, goster: "", soyle: metin })
      } else if (secenek.arapca !== "atla") {
        ekle({ satir: i, satirlar: blok, tip: "uyari", lang: "tr", isaret: true, goster: "", soyle: "Arapça ibare." })
      }
      i = j
      continue
    }

    // ── Türkçe satır (içinde Arapça kelimeler olabilir)
    const goster = gorunur(ham)
    const baslik = basliklar.has(i) || /^-\s*\d+\s*-$/.test(goster)
    const tip = baslik ? "baslik" : "metin"
    if (ARAP_RE.test(goster)) {
      // Arapça öbekleri ayır: Türkçe parçalar Türkçe, Arapça parçalar (açıksa) Arapça sesle
      let son = 0, m
      ARAP_OBEK_RE.lastIndex = 0
      const parcalar = []
      while ((m = ARAP_OBEK_RE.exec(goster)) !== null) {
        if (m.index > son) parcalar.push({ ar: false, t: goster.slice(son, m.index) })
        parcalar.push({ ar: true, t: m[0] })
        son = m.index + m[0].length
      }
      if (son < goster.length) parcalar.push({ ar: false, t: goster.slice(son) })
      for (const p of parcalar) {
        if (p.ar) {
          if (arapcaOku && p.t.trim()) ekle({ satir: i, tip: "arapca", lang: "ar", goster: p.t.trim(), soyle: p.t.trim() })
          continue
        }
        cumleler(p.t).forEach(c => {
          const s = soylenis(c)
          if (/[\p{L}\p{N}]/u.test(s)) ekle({ satir: i, tip, lang: "tr", goster: c.trim(), soyle: s })
        })
      }
    } else {
      cumleler(goster).forEach(c => {
        const s = soylenis(c)
        if (/[\p{L}\p{N}]/u.test(s)) ekle({ satir: i, tip, lang: "tr", goster: c.trim(), soyle: s })
      })
    }
    i++
  }
  return birimler
}

/* ── DOKUNULAN KELİMEDEN BAŞLAMA (16 Ekim 2026) ─────────────────────────────
   sec: { satir, ofset, duz } — `duz`: satırın ekranda görünen metni (boşluklar teke
   indirgenmiş, <sup> hariç), `ofset`: dokunulan harfin bu metindeki yeri.
   Satırın cümleleri `duz` içinde sırayla aranır; dokunulan harfi içeren (ya da
   ondan sonra gelen ilk) cümleden itibaren birimler döner. Arapça blokta (birim
   birden çok satırı kapsar) bloğun başından okunur. */
export function secimdenItibaren(liste, sec) {
  const satir = Number(sec.satir) || 0
  const ilk = liste.findIndex(b => b.satir === satir || (b.satirlar || []).includes(satir) || b.satir > satir)
  if (ilk < 0) return []
  if (liste[ilk].satir !== satir) return liste.slice(ilk)
  const duz = String(sec.duz || ""), ofset = Number(sec.ofset) || 0
  const tek = (t) => String(t || "").replace(/\s+/g, " ").trim()
  let k = ilk, poz = 0, sonBulunan = ilk
  while (k < liste.length && liste[k].satir === satir) {
    const g = tek(liste[k].goster)
    if (g) {
      const j = duz.indexOf(g, poz)
      if (j >= 0) {
        if (j + g.length > ofset) break
        poz = j + g.length; sonBulunan = k
      }
    }
    k++
  }
  // Satırın son cümlesinden sonraki boşluğa dokunulduysa o satırın son cümlesi
  if (k >= liste.length || liste[k].satir !== satir) k = sonBulunan
  return liste.slice(k)
}

/* ── İŞARET SESİ — âyet/Arapça bölümden önce kısa, yumuşak bir çan ───────── */
let sesBaglami = null
function isaretCal() {
  return new Promise((cz) => {
    try {
      const AC = window.AudioContext || window.webkitAudioContext
      if (!AC) { cz(); return }
      if (!sesBaglami) sesBaglami = new AC()
      const c = sesBaglami
      if (c.state === "suspended") c.resume()
      const t = c.currentTime + 0.02
      const kazanc = c.createGain()
      kazanc.gain.setValueAtTime(0.0001, t)
      kazanc.gain.exponentialRampToValueAtTime(0.18, t + 0.02)
      kazanc.gain.exponentialRampToValueAtTime(0.0001, t + 0.55)
      kazanc.connect(c.destination)
      for (const [f, g] of [[784, 1], [1176, 0.35]]) {
        const o = c.createOscillator(), og = c.createGain()
        o.type = "sine"; o.frequency.value = f; og.gain.value = g
        o.connect(og); og.connect(kazanc)
        o.start(t); o.stop(t + 0.6)
      }
      setTimeout(cz, 520)
    } catch { cz() }
  })
}

const hataMetni = (e) => String(e?.message || e?.name || e || "").slice(0, 240)

/* ── MOTOR ────────────────────────────────────────────────────────────────── */
function motorKur() {
  const dinleyiciler = new Set()
  let durum = { durum: "kapali", birim: null, sira: 0, hata: "", trSesYok: false, arSesVar: false }
  const yay = (p) => { durum = { ...durum, ...p }; dinleyiciler.forEach(f => f()) }

  let birimler = [], sira = 0, kitap = null, ayar = ayarOku()
  let sayfalar = [], sonSayfaIdx = -1, secenek = null
  let sesTr = null, sesAr = null
  let konusma = null, bekci = 0, nesil = 0, kilit = null
  let vs = null                                    // data/vukufSes.js (yalnız Vukuf sesi seçiliyse yüklenir)
  let sentezler = new Map()                        // birim sırası → Promise<{pcm, ornekleme, sure}> (önden hazırlık)
  let sentezNesli = 0                              // sentezler sıfırlanınca artar → eski istekler atlanır
  let calanUrl = ""
  let yavasSay = 0
  // iPhone: "düğme dönüyor, sonra durdur geliyor ama ses yok" (16 Ekim 2026, kullanıcı).
  // blob: adresli WAV bazı iOS sürümlerinde <audio>da hiç ilerlemiyor → ilk takılmada
  // data: adresine geçilir (oturum boyunca), o da ilerlemezse ayrıntılı hata verilir.
  let veriUrlKullan = false
  const veriUrl = (blob) => new Promise((cz, red) => {
    const o = new FileReader()
    o.onload = () => cz(o.result); o.onerror = () => red(o.error || new Error("Ses verisi hazırlanamadı"))
    o.readAsDataURL(blob)
  })
  const oynaticiDurumu = () => sesOgesi
    ? `oynatıcı ilerlemedi — readyState ${sesOgesi.readyState}, networkState ${sesOgesi.networkState}${sesOgesi.error ? `, hata kodu ${sesOgesi.error.code}` : ""}${veriUrlKullan ? ", data adresi" : ""}`
    : "oynatıcı yok"
  const ONDEN = 4                                  // kaç cümle önden hazırlansın (iki işçi varken ikisi de dolu kalsın)
  let arapcaKapaliKitap = false                    // Evrad ve Ezkâr: Arapça yapay sesle okunmaz (16 Ekim 2026, kullanıcı)
  let kerimAcik = false                            // kaynağı bilinmeyen Arapça Kerîm (Vukuf) sesiyle mi
  // Bu birim Vukuf sesiyle mi okunur? Türkçe: motor "vukuf" · Arapça: Kerîm açıksa
  const vukufBirimMi = (b) => !!vs && !!b && ((b.lang === "tr" && ayar.motor === "vukuf") || (b.lang === "ar" && kerimAcik))
  const birimSesi = (b) => (b.lang === "ar" ? "kareem" : ayar.vukufSes)
  const sentezleriSifirla = () => { sentezler = new Map(); sentezNesli++ }
  const sentezAl = (i) => {
    if (i >= birimler.length) { const s0 = sira; sira = i; doldur(); sira = s0 }
    const b = birimler[i]
    if (!vukufBirimMi(b)) return null
    if (!sentezler.has(i)) {
      const n = sentezNesli
      // Sırası geldiğinde hâlâ gerekli mi? (okuyucu ileri atladıysa / ayar değiştiyse geç)
      const soz = vs.sentezle(b.soyle, birimSesi(b), Number(ayar.hiz) || 1, () => n === sentezNesli && i >= sira)
      soz.catch(() => {})
      sentezler.set(i, soz)
    }
    return sentezler.get(i)
  }
  const ondenHazirla = (i) => { for (let k = 1; k <= ONDEN; k++) sentezAl(i + k) }

  const ekranAcik = async (acik) => {
    try {
      if (acik && !kilit && navigator.wakeLock) kilit = await navigator.wakeLock.request("screen")
      if (!acik && kilit) { await kilit.release(); kilit = null }
    } catch { kilit = null }
  }
  // Sekme geri gelince kilit yeniden istenir (gizlenince tarayıcı bırakıyor)
  if (typeof document !== "undefined") {
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible" && durum.durum === "okuyor") { kilit = null; ekranAcik(true) }
    })
  }

  // Okunacak birim kalmadıysa sıradaki sayfanın birimleri eklenir
  const doldur = () => {
    while (sira >= birimler.length && sonSayfaIdx < sayfalar.length - 1) {
      sonSayfaIdx++
      birimler.push(...sayfaBirimleri(sayfalar[sonSayfaIdx], secenek))
    }
  }

  const sustur = () => {
    nesil++
    clearTimeout(bekci)
    try { if (sesliDestekVar()) window.speechSynthesis.cancel() } catch { /* yoksay */ }
    try { if (sesOgesi) { sesOgesi.onended = null; sesOgesi.onerror = null; sesOgesi.pause() } } catch { /* yoksay */ }
    if (calanUrl) { try { URL.revokeObjectURL(calanUrl) } catch { /* yoksay */ } calanUrl = "" }
    konusma = null
    if (durum.bekliyor) yay({ bekliyor: false })
  }

  const oku = async (i) => {
    sustur()
    const benim = nesil
    sira = Math.max(0, i)
    doldur()
    const b = birimler[sira]
    if (!b) { yay({ durum: "bitti", birim: null }); ekranAcik(false); return }
    yay({ durum: "okuyor", birim: b, sira })
    if (kitap) konumYaz(kitap, { sayfa: b.sayfa, satir: b.satir })
    if (b.isaret && ayar.isaret) { await isaretCal(); if (benim !== nesil) return }

    // ── HAFIZ KAYDI: kaynağı bilinen âyetin tilâveti (everyayah; indirilmişse önbellekten)
    if (b.tip === "kari") {
      if (!sesOgesi) sesOgesi = new Audio()
      let gecti = false
      const ilerleK = () => {
        if (gecti || benim !== nesil) return
        gecti = true; clearTimeout(bekci)
        setTimeout(() => { if (benim === nesil) oku(sira + 1) }, 250)
      }
      sesOgesi.onended = ilerleK
      sesOgesi.onerror = ilerleK                         // internetsiz ve önbellekte yok → meale geç
      try { sesOgesi.playbackRate = 1 } catch { /* yoksay */ }   // tilâvet hızlandırılmaz
      sesOgesi.src = mp3Url(kariSec(ayar), b.sureNo, b.ayetNo)
      // Hiç başlayamazsa takılı kalınmasın
      bekci = setTimeout(() => { if (sesOgesi && sesOgesi.currentTime === 0) ilerleK() }, 12000)
      try { await sesOgesi.play() }
      catch (e) {
        if (benim !== nesil) return
        if (e?.name === "NotAllowedError") { clearTimeout(bekci); yay({ durum: "duraklatildi", hata: "vukufCal", hataAyrinti: "Tarayıcı sesi başlatmaya izin vermedi" }) }
        else ilerleK()
      }
      return
    }

    // ── VUKUF SESİ: Türkçe (motor "vukuf") ve Kerîm açıksa Arapça birimler tarayıcı içi Piper ile
    if (vukufBirimMi(b)) {
      const ilerleV = () => {
        if (benim !== nesil) return
        // Cümle arası: Piper cümle sonuna zaten kısa bir sessizlik koyuyor → ek bekleme çok kısa
        const bekle = b.tip === "baslik" || b.tip === "ayet" ? 300 : 20
        setTimeout(() => { if (benim === nesil) oku(sira + 1) }, bekle)
      }
      let bekleZaman = 0
      try {
        // Kullanılmış sentezleri bırak (bellek); geri gidildiyse eskileri yeniden istenir
        for (const k of [...sentezler.keys()]) if (k < sira) sentezler.delete(k)
        // Cümle hazır değilse ve bekleme uzarsa kullanıcı görsün (düğmede dönen simge + "Ses hazırlanıyor…")
        bekleZaman = setTimeout(() => { if (benim === nesil) yay({ bekliyor: true }) }, 1200)
        let sonuc = await sentezAl(sira)
        if (benim !== nesil) return
        if (!sonuc) {                                      // atlanmış eski istek → yeniden
          sentezler.delete(sira); sonuc = await sentezAl(sira)
          if (benim !== nesil) return
        }
        clearTimeout(bekleZaman)
        if (durum.bekliyor) yay({ bekliyor: false })
        const { pcm, ornekleme, sure } = sonuc || { pcm: new Float32Array(0), ornekleme: 22050, sure: 0 }
        ondenHazirla(sira)                                  // sonraki cümleler çalarken hazırlansın
        // Bu cihaz sesi, okunduğundan YAVAŞ mı üretiyor? → önce ikinci işçi (iki cümle aynı anda),
        // o da yetmezse kullanıcıya bilgi (ölçülen oranla)
        const sesSure = (pcm.length / ornekleme) * 1000
        if (sesSure > 400) {
          // Etkin oran: iki işçi aynı anda iki cümle ürettiğinde süre ikiye bölünür
          const oran = sure / sesSure / Math.max(1, vs.isciSayisi ? vs.isciSayisi() : 1)
          yavasSay = oran > 0.8 ? yavasSay + 1 : 0
          // Antalia'da önce hızlı kip (adım 8 → 4, bellek harcamaz), sonra ikinci işçi
          if (yavasSay >= 2 && birimSesi(b) === "antalia" && vs.hizliKip && vs.hizliKip()) { yavasSay = 0 }
          else if (yavasSay >= 2 && vs.isciSayisi && vs.isciSayisi() < 2 && vs.isciEkle()) { yavasSay = -2 }   // kurulurken birkaç cümle beklenir
          else if (yavasSay >= 3 && !durum.yavas) yay({ yavas: true, uretimOrani: Math.round(oran * 10) / 10 })
        }
        if (!pcm.length) { ilerleV(); return }
        if (!sesOgesi) sesOgesi = new Audio()
        if (calanUrl) { try { URL.revokeObjectURL(calanUrl) } catch { /* yoksay */ } calanUrl = "" }
        const wav = vs.wavYap(pcm, ornekleme)
        let adres
        if (veriUrlKullan) adres = await veriUrl(wav)
        else { calanUrl = URL.createObjectURL(wav); adres = calanUrl }
        if (benim !== nesil) return
        // Takılma: blob adresiyle çalmazsa data adresine geçilip AYNI cümle yeniden denenir
        const takildi = () => {
          if (benim !== nesil) return
          clearTimeout(bekci)
          if (!veriUrlKullan) { veriUrlKullan = true; oku(sira); return }
          console.error("[Sesli okuma]", oynaticiDurumu())
          sustur()
          yay({ durum: "duraklatildi", hata: "vukufCal", hataAyrinti: oynaticiDurumu() })
          ekranAcik(false)
        }
        sesOgesi.onended = () => { clearTimeout(bekci); ilerleV() }
        sesOgesi.onerror = takildi
        try { sesOgesi.playbackRate = 1 } catch { /* yoksay */ }
        sesOgesi.src = adres
        // Çalmaya başladı mı? (play() sözü iPhone'da çözülüp ses hiç ilerlemeyebiliyor)
        clearTimeout(bekci)
        bekci = setTimeout(() => {
          if (benim !== nesil || !sesOgesi) return
          if (sesOgesi.ended || sesOgesi.currentTime > 0.05 || sesOgesi.paused && durum.durum !== "okuyor") return
          takildi()
        }, 3000)
        await sesOgesi.play()
      } catch (e) {
        clearTimeout(bekleZaman)
        if (benim !== nesil) return
        console.error("[Sesli okuma]", e)
        if (e?.name !== "NotAllowedError" && !veriUrlKullan && vs && e?.name !== "Error") { veriUrlKullan = true; oku(sira); return }
        yay({ durum: "duraklatildi", hata: "vukufCal", hataAyrinti: hataMetni(e), bekliyor: false })
      }
      return
    }
    const u = new window.SpeechSynthesisUtterance(b.soyle)
    const ses = b.lang === "ar" ? sesAr : sesTr
    if (ses) u.voice = ses
    u.lang = ses?.lang || (b.lang === "ar" ? "ar-SA" : "tr-TR")
    u.rate = Math.max(0.5, Math.min(2, Number(ayar.hiz) || 1))
    const ilerle = () => {
      if (benim !== nesil) return
      clearTimeout(bekci)
      const bekle = b.tip === "baslik" || b.tip === "ayet" ? 350 : 60
      setTimeout(() => { if (benim === nesil) oku(sira + 1) }, bekle)
    }
    u.onend = ilerle
    u.onerror = (e) => {
      if (benim !== nesil) return
      if (e && (e.error === "interrupted" || e.error === "canceled")) return
      ilerle()
    }
    konusma = u
    // Bekçi: `onend` gelmeyen tarayıcılar için (tahmini süre + pay)
    const tahmin = (b.soyle.length / 13) / u.rate * 1000 + 6000
    const kontrol = () => {
      if (benim !== nesil) return
      if (window.speechSynthesis.speaking) { bekci = setTimeout(kontrol, 1500); return }
      ilerle()
    }
    bekci = setTimeout(kontrol, tahmin)
    try { window.speechSynthesis.speak(u) } catch { ilerle() }
  }

  return {
    abone(f) { dinleyiciler.add(f); return () => dinleyiciler.delete(f) },
    durum: () => durum,
    async baslat({ kitapId, kitapMetni, baslangic, ayetMeal, arapcaKapali }) {
      sustur()
      ayar = ayarOku()
      if (arapcaKapali !== undefined) arapcaKapaliKitap = !!arapcaKapali
      // Evrad ve Ezkâr'da "Arapça sesle oku" seçili olsa da Arapça atlanır (hatalı okuma ihtimali yüksek)
      const arapcaAyari = arapcaKapaliKitap && ayar.arapca === "oku" ? "atla" : ayar.arapca
      sentezleriSifirla(); yavasSay = 0; kerimAcik = false
      yay({ yavas: false, hataAyrinti: "", asama: "", bekliyor: false })
      const arapcaOku = arapcaAyari === "oku"
      // VUKUF SESİ seçiliyse: indirilmiş mi, motor hazır mı?
      if (ayar.motor === "vukuf") {
        yay({ durum: "hazirlaniyor", hata: "", asama: "vukuf" })
        try {
          vs = vs || await import("./vukufSes")
          if (!(await vs.indirilmisMi(vs.sesGrubu(ayar.vukufSes)))) { yay({ durum: "kapali", hata: "vukufYok", birim: null }); return }
          await vs.hazirla(ayar.vukufSes)
        } catch (e) {
          console.error("[Vukuf sesi]", e)
          yay({ durum: "kapali", hata: "vukufHata", hataAyrinti: hataMetni(e), birim: null }); return
        }
      }
      // Kerîm (Arapça Vukuf sesi) indirilmiş mi? Yalnız "Arapça sesle oku" açıkken bakılır
      let kerimVar = false
      if (arapcaOku && ayar.arSes !== "cihaz") {
        try { vs = vs || await import("./vukufSes"); kerimVar = await vs.indirilmisMi("ar") } catch { kerimVar = false }
      }
      if (!sesliDestekVar() && ayar.motor !== "vukuf") { yay({ durum: "kapali", hata: "destek" }); return }
      // iPhone: konuşma ancak kullanıcı dokunuşuyla açılır → boş bir konuşmayla kilit açılır
      try { window.speechSynthesis.speak(new window.SpeechSynthesisUtterance("")) } catch { /* yoksay */ }
      yay({ durum: "hazirlaniyor", hata: "" })
      const sesler = await sesleriAl()
      const trler = turkceSesler(sesler), arlar = arapcaSesler(sesler)
      // Ses listesi DOLU ama içinde Türkçe yoksa okunmaz (Vukuf sesinde cihaz sesi gerekmez) — tarayıcı yabancı bir sesle
      // (ör. Almanca aksanla) okuyordu. Liste tamamen boşsa (bazı Android'ler listeyi geç
      // veriyor) yine de tr-TR diliyle denenir.
      if (ayar.motor !== "vukuf" && sesler.length && !trler.length) {
        yay({ durum: "kapali", hata: "trSes", trSesYok: true, birim: null })
        return
      }
      sesTr = enIyiSes(trler, ayar.sesTr)
      sesAr = enIyiSes(arlar, ayar.sesAr)
      if (kerimVar) {
        try { yay({ durum: "hazirlaniyor" }); await vs.hazirla("kareem"); kerimAcik = true }
        catch (e) { console.error("[Vukuf sesi] Kerîm", e); kerimAcik = false }
      }
      kitap = kitapId
      sayfalar = kitapMetni || []
      secenek = { arapca: arapcaAyari, arapcaSesVar: arapcaAyari === "oku" && (!!sesAr || kerimAcik), ayetMeal, hafiz: ayar.ayetSes !== "meal" }
      const basIdx = Math.max(0, sayfalar.findIndex(s => s.sayfa === baslangic?.sayfa))
      sonSayfaIdx = basIdx
      // Kullanıcı bir kelimeye dokunarak başlattıysa: sayfanın tamamı kurulur, o kelimenin cümlesinden öncesi atılır
      birimler = baslangic && baslangic.ofset != null
        ? secimdenItibaren(sayfaBirimleri(sayfalar[basIdx], secenek, 0), baslangic)
        : sayfaBirimleri(sayfalar[basIdx], secenek, baslangic?.satir || 0)
      yay({ trSesYok: !trler.length, sesListesiBos: !sesler.length, arSesVar: !!sesAr || kerimAcik })
      ekranAcik(true)
      oku(0)
    },
    duraklat() { sustur(); yay({ durum: "duraklatildi" }); ekranAcik(false) },
    devam() { ekranAcik(true); oku(sira) },
    ileri() { oku(sira + 1) },
    geri() {
      // Aynı satırın başındaysa bir önceki satıra, değilse cümle cümle geri
      oku(Math.max(0, sira - 1))
    },
    durdur() { sustur(); birimler = []; sira = 0; yay({ durum: "kapali", birim: null }); ekranAcik(false) },
    // Ayar değişti: hız/ses sıradaki cümleden; Arapça seçeneği kalan birimleri yeniden kurar
    ayarlariYenile(parca) {
      ayar = ayarYaz(parca)
      // Hız ya da Vukuf sesi değişti → önden hazırlanmış sesler geçersiz
      if ("hiz" in parca || "vukufSes" in parca || "motor" in parca) sentezleriSifirla()
      const calisiyor = durum.durum === "okuyor" || durum.durum === "duraklatildi"
      if (!calisiyor) return
      if ("motor" in parca || "vukufSes" in parca || "arapca" in parca || "arSes" in parca || "ayetSes" in parca) {
        // Motor / Arapça / âyet seçeneği değişince bulunulan satırdan yeniden kurulsun
        // (indirme / hazırlık denetimi ve birimler baslat'ta)
        const b = birimler[sira]
        this.baslat({ kitapId: kitap, kitapMetni: sayfalar, baslangic: b ? { sayfa: b.sayfa, satir: b.satir } : null, ayetMeal: secenek?.ayetMeal })
        return
      }
      if (!("hiz" in parca || "sesTr" in parca || "sesAr" in parca)) return   // ör. kâri: sıradaki âyette geçerli
      sesleriAl().then((sesler) => {
        sesTr = enIyiSes(turkceSesler(sesler), ayar.sesTr)
        sesAr = enIyiSes(arapcaSesler(sesler), ayar.sesAr)
        if (durum.durum === "okuyor") oku(sira)
      })
    },
  }
}

export const sesliOkuyucu = motorKur()
