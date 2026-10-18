/* ═══════════════════════════════════════════════════════════════════════════
   VUKUF — PAYLAŞIM (bağlantı, mesaj, gelen bağlantı)
   src/data/paylasim.js

   Kullanıcı (18 Ekim 2026): "Paylaşma butonu. Okuma Ekranında butona basınca kelime ya
   da cümle seçilecek; KuranOkuma için âyet rakam rozeti seçilecek. Paylaşma ekranı
   açılacak — WhatsApp, Facebook ya da farklı bir alana yönlendirecek, isterse
   bağlantıyı kopyalayacak. Bağlantı önce ana sayfayı açacak, ana sayfadan kurulan bir
   köprüye gider gibi seçilen bölüme gidilip açılacak; arama butonundan gider gibi
   gösterilecek."
   Kararlar (kullanıcı seçti):
     • Eser: mesaj = “seçilen metin” + "— Eser adı, s. N" + bağlantı
     • Kur'ân: mesaj = yalnız "Bakara Sûresi, 255. âyet" + bağlantı (Arapça/meal yok)
     • Varınca: "Paylaşılan yer" notu + köprü düğmesi ana sayfaya (Kitaplık) döner.

   BAĞLANTI BİÇİMİ — her zaman sitenin KÖKÜ (ana sayfa) + sorgu:
     Eser   : https://<site>/?k=<kitapId>&s=<sayfa>&r=<satır>&m=<cümlenin ilk 6 kelimesi>
              (yalnız kelime paylaşıldıysa m=<kelime>&t=k). Bağlantı kısa kalsın diye cümlenin
              tamamı değil BAŞI taşınıyor; varınca satırda o baş bulunup cümle tamamlanarak
              vurgulanıyor (paylasimSecim.js cumleyeGenislet).
     Âyet   : https://<site>/?a=<sûre>:<âyet>
   Kök adres seçildi çünkü: (1) sunucu her durumda index.html'i verir (derin yol 404
   olmaz), (2) kullanıcı isteği — önce ana sayfa açılır, oradan geçilir.

   GELİNCE (App.jsx): sorgu okunur, adres çubuğundan silinir (yenileyince tekrar
   gitmesin), hedef Arama'nın kullandığı anahtarlara yazılır ve kısa bir "paylaşılan
   bölüm açılıyor" kartından sonra o ekrana geçilir:
     Eser  → "vukuf-arama-hedef" { kitapId, aranan, sayfaNo, satirIdx, kaynak:"paylasim" }
     Âyet  → "vukuf-kuran-hedef" { sureNo, ayetNo, kaynak:"paylasim" }
     ikisi → "vukuf-donus" = "paylasim" (köprü düğmesi); hedefteki `not` → "Paylaşılan yer" kartı
   (Yeni anahtar açılmadı: bu iki hedef anahtarı zaten "geçici" sayılıyor, yedeğe girmiyor.)
   ═══════════════════════════════════════════════════════════════════════════ */

import { kitaplar } from "./kitaplar"
import { sureAdi } from "./sureAdlari"

export const PAYLASIM_DONUS = "paylasim"
const METIN_AZAMI = 300
const BAS_KELIME = 6
const ilkKelimeler = (t, n = BAS_KELIME) => String(t || "").replace(/\s+/g, " ").trim().split(" ").slice(0, n).join(" ")

const kok = () => `${window.location.origin}/`
const kitapAdiBul = (id) => {
  const k = kitaplar.find(x => String(x.id) === String(id))
  return (k && (k.baslik || k.isim)) || ""
}

/* Uzun metni kelime sınırında kısalt (bağlantıda yalnız vurgulamak için kullanılıyor) */
function kisalt(metin, n = METIN_AZAMI) {
  const t = String(metin || "").replace(/\s+/g, " ").trim()
  if (t.length <= n) return t
  const kes = t.slice(0, n)
  const bosluk = kes.lastIndexOf(" ")
  return (bosluk > n * 0.6 ? kes.slice(0, bosluk) : kes).trim()
}

export const ayetEtiketi = (sureNo, ayetNo, ad) =>
  `${ad || sureAdi(sureNo)} Sûresi${ayetNo ? `, ${ayetNo}. âyet` : ""}`

/* ── BAĞLANTI ─────────────────────────────────────────────────────────────── */
export function kitapBaglantisi({ kitapId, sayfa, satir, metin, kelimeMi = false }) {
  const p = new window.URLSearchParams()
  p.set("k", String(kitapId))
  p.set("s", String(sayfa || 1))
  p.set("r", String(satir || 0))
  const m = kelimeMi ? kisalt(metin, 60) : ilkKelimeler(metin)
  if (m) p.set("m", m)
  if (m && kelimeMi) p.set("t", "k")
  return `${kok()}?${p.toString()}`
}
export function ayetBaglantisi({ sureNo, ayetNo }) {
  return `${kok()}?a=${sureNo}${ayetNo ? `:${ayetNo}` : ""}`
}

/* ── MESAJ ────────────────────────────────────────────────────────────────────
   { metin, baglanti, govde } — govde: bağlantısız kısım (Telegram/X bağlantıyı ayrı alır) */
export function paylasimMesaji(v) {
  if (!v) return { baglanti: "", govde: "", metin: "", konu: "" }
  if (v.tip === "ayet") {
    const baglanti = ayetBaglantisi(v)
    const govde = `${ayetEtiketi(v.sureNo, v.ayetNo, v.sureAdi)} · Kur'ân-ı Kerîm`
    return { baglanti, govde, metin: `${govde}\n${baglanti}`, konu: govde }
  }
  const kelimeMi = v.secim === "kelime" && !!v.kelime
  const secili = (kelimeMi ? v.kelime : v.cumle) || v.cumle || v.kelime || ""
  const baglanti = kitapBaglantisi({ kitapId: v.kitapId, sayfa: v.sayfa, satir: v.satir, metin: secili, kelimeMi })
  const ad = v.kitapAdi || kitapAdiBul(v.kitapId)
  const kaynak = [ad, v.sayfa ? `s. ${v.sayfa}` : ""].filter(Boolean).join(", ")
  const govde = `“${secili}”${kaynak ? `\n— ${kaynak}` : ""}`
  return { baglanti, govde, metin: `${govde}\n\n${baglanti}`, konu: ad || "Vukuf" }
}

/* ── HEDEFLER (paylaşma penceresindeki düğmeler) ──────────────────────────────
   ac(m): açılacak adres. `uygulama: true` → aynı sekmede (mailto/sms). */
const e = encodeURIComponent
export const PAYLASIM_HEDEFLERI = [
  { id: "whatsapp", ad: "WhatsApp", renk: "#25D366", ac: (m) => `https://wa.me/?text=${e(m.metin)}` },
  { id: "telegram", ad: "Telegram", renk: "#2AABEE", ac: (m) => `https://t.me/share/url?url=${e(m.baglanti)}&text=${e(m.govde)}` },
  // Facebook yalnız bağlantıyı alıyor (metin parametresi yıllardır yok sayılıyor) → mesaj panoya da kopyalanır
  { id: "facebook", ad: "Facebook", renk: "#1877F2", ac: (m) => `https://www.facebook.com/sharer/sharer.php?u=${e(m.baglanti)}`, panoya: true },
  { id: "x", ad: "X", renk: "#14171A", ac: (m) => `https://twitter.com/intent/tweet?text=${e(m.govde)}&url=${e(m.baglanti)}` },
  { id: "eposta", ad: "E-posta", ac: (m) => `mailto:?subject=${e(m.konu)}&body=${e(m.metin)}`, uygulama: true },
  { id: "sms", ad: "Mesaj", ac: (m) => `sms:?&body=${e(m.metin)}`, uygulama: true },
]

export async function panoyaKopyala(metin) {
  try {
    if (navigator.clipboard && window.isSecureContext) { await navigator.clipboard.writeText(metin); return true }
  } catch { /* aşağıdaki yola düş */ }
  try {
    const t = document.createElement("textarea")
    t.value = metin
    t.setAttribute("readonly", "")
    t.style.cssText = "position:fixed;top:0;left:0;opacity:0;font-size:16px"
    document.body.appendChild(t)
    t.select(); t.setSelectionRange(0, metin.length)
    const ok = document.execCommand("copy")
    t.remove()
    return ok
  } catch { return false }
}

/* ── GELEN BAĞLANTI ───────────────────────────────────────────────────────── */
export function gelenPaylasim(arama = typeof window !== "undefined" ? window.location.search : "") {
  let p
  try { p = new window.URLSearchParams(arama || "") } catch { return null }
  if (p.has("a")) {
    const [s, a] = String(p.get("a") || "").split(":").map(x => parseInt(x, 10))
    if (!(s >= 1 && s <= 114)) return null
    const ayetNo = a >= 1 ? a : null
    return { tip: "ayet", sureNo: s, ayetNo, etiket: ayetEtiketi(s, ayetNo) }
  }
  if (p.has("k")) {
    const kitapId = String(p.get("k") || "").trim()
    if (!kitapId || !kitaplar.some(x => String(x.id) === kitapId)) return null
    const sayfa = Math.max(1, parseInt(p.get("s"), 10) || 1)
    const satir = Math.max(0, parseInt(p.get("r"), 10) || 0)
    const metin = kisalt(p.get("m") || "")
    const kelimeMi = p.get("t") === "k"
    const ad = kitapAdiBul(kitapId)
    return { tip: "kitap", kitapId, sayfa, satir, metin, kelimeMi, etiket: [ad, `s. ${sayfa}`].filter(Boolean).join(", ") }
  }
  return null
}

/* Hedefi okuma ekranlarının açılışta okuduğu anahtarlara yaz → gidilecek yol */
export function paylasimiHazirla(h) {
  try {
    if (h.tip === "ayet") {
      localStorage.setItem("vukuf-kuran-hedef", JSON.stringify(h.ayetNo
        ? { sureNo: h.sureNo, ayetNo: h.ayetNo, kaynak: PAYLASIM_DONUS, not: h.etiket || "" }
        : { sureNo: h.sureNo, kaynak: PAYLASIM_DONUS, not: h.etiket || "" }))
    } else {
      localStorage.setItem("vukuf-arama-hedef", JSON.stringify({
        kitapId: h.kitapId, aranan: h.metin || "", sayfaNo: h.sayfa, satirIdx: h.satir, kaynak: PAYLASIM_DONUS, not: h.etiket || "",
        genislet: !h.kelimeMi && !!h.metin,      // cümlenin başı geldi → varınca cümlenin tamamı
      }))
    }
    localStorage.setItem("vukuf-donus", PAYLASIM_DONUS)
  } catch { /* gizli mod vb. — yine de ekran açılır */ }
  return h.tip === "ayet" ? "/kuran" : `/kitap/${encodeURIComponent(h.kitapId)}`
}
