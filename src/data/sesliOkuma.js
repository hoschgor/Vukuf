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
   ═══════════════════════════════════════════════════════════════════════════ */

import { sureAdi } from "./sureAdlari"

export const SESLI_AYAR_ANAHTAR = "vukuf-sesli-okuma"
export const SESLI_KONUM_ANAHTAR = "vukuf-sesli-konum"     // { kitap: { sayfa, satir } }
export const SESLI_VARSAYILAN = { hiz: 1, sesTr: "", sesAr: "", arapca: "uyari", isaret: true, takip: true }
export const HIZLAR = [0.8, 1, 1.2, 1.5, 1.8]

const ARAP = "\\u0600-\\u06FF\\u0750-\\u077F\\u08A0-\\u08FF\\uFB50-\\uFDFF\\uFE70-\\uFEFF"
const ARAP_RE = new RegExp(`[${ARAP}]`)
const LATIN_RE = /[A-Za-zÇĞİıÖŞÜçğöşü]/
// Satır içindeki Arapça kelime öbeği (aralarındaki boşluklar dahil)
const ARAP_OBEK_RE = new RegExp(`[${ARAP}][${ARAP}\\s\\u200c\\u200d]*`, "g")

export function sesliDestekVar() {
  return typeof window !== "undefined" && "speechSynthesis" in window && typeof window.SpeechSynthesisUtterance === "function"
}

export function ayarOku() {
  try { return { ...SESLI_VARSAYILAN, ...(JSON.parse(localStorage.getItem(SESLI_AYAR_ANAHTAR)) || {}) } }
  catch { return { ...SESLI_VARSAYILAN } }
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
   secenek: { arapca: "uyari"|"atla"|"oku", arapcaSesVar, ayetMeal }
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

/* ── MOTOR ────────────────────────────────────────────────────────────────── */
function motorKur() {
  const dinleyiciler = new Set()
  let durum = { durum: "kapali", birim: null, sira: 0, hata: "", trSesYok: false, arSesVar: false }
  const yay = (p) => { durum = { ...durum, ...p }; dinleyiciler.forEach(f => f()) }

  let birimler = [], sira = 0, kitap = null, ayar = ayarOku()
  let sayfalar = [], sonSayfaIdx = -1, secenek = null
  let sesTr = null, sesAr = null
  let konusma = null, bekci = 0, nesil = 0, kilit = null

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
    try { window.speechSynthesis.cancel() } catch { /* yoksay */ }
    konusma = null
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
    async baslat({ kitapId, kitapMetni, baslangic, ayetMeal }) {
      if (!sesliDestekVar()) { yay({ durum: "kapali", hata: "destek" }); return }
      sustur()
      ayar = ayarOku()
      // iPhone: konuşma ancak kullanıcı dokunuşuyla açılır → boş bir konuşmayla kilit açılır
      try { window.speechSynthesis.speak(new window.SpeechSynthesisUtterance("")) } catch { /* yoksay */ }
      yay({ durum: "hazirlaniyor", hata: "" })
      const sesler = await sesleriAl()
      const trler = turkceSesler(sesler), arlar = arapcaSesler(sesler)
      // Ses listesi DOLU ama içinde Türkçe yoksa okunmaz — tarayıcı yabancı bir sesle
      // (ör. Almanca aksanla) okuyordu. Liste tamamen boşsa (bazı Android'ler listeyi geç
      // veriyor) yine de tr-TR diliyle denenir.
      if (sesler.length && !trler.length) {
        yay({ durum: "kapali", hata: "trSes", trSesYok: true, birim: null })
        return
      }
      sesTr = enIyiSes(trler, ayar.sesTr)
      sesAr = enIyiSes(arlar, ayar.sesAr)
      kitap = kitapId
      sayfalar = kitapMetni || []
      secenek = { arapca: ayar.arapca, arapcaSesVar: !!sesAr, ayetMeal }
      const basIdx = Math.max(0, sayfalar.findIndex(s => s.sayfa === baslangic?.sayfa))
      sonSayfaIdx = basIdx
      birimler = sayfaBirimleri(sayfalar[basIdx], secenek, baslangic?.satir || 0)
      yay({ trSesYok: !trler.length, sesListesiBos: !sesler.length, arSesVar: !!sesAr })
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
      const calisiyor = durum.durum === "okuyor" || durum.durum === "duraklatildi"
      if (!calisiyor) return
      sesleriAl().then((sesler) => {
        sesTr = enIyiSes(turkceSesler(sesler), ayar.sesTr)
        sesAr = enIyiSes(arapcaSesler(sesler), ayar.sesAr)
        if ("arapca" in parca) {
          const b = birimler[sira]
          if (!b) return
          secenek = { ...secenek, arapca: ayar.arapca, arapcaSesVar: !!sesAr }
          const idx = sayfalar.findIndex(s => s.sayfa === b.sayfa)
          sonSayfaIdx = idx
          birimler = sayfaBirimleri(sayfalar[idx], secenek, b.satir)
          sira = 0
        }
        if (durum.durum === "okuyor") oku(sira)
      })
    },
  }
}

export const sesliOkuyucu = motorKur()
