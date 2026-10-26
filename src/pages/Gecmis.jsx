/* VUKUF — GEÇMİŞ EKRANI (/gecmis)
   src/pages/Gecmis.jsx

   Aramalar ve okuma oturumları, gün gün. Veri ve kurallar: src/data/gecmis.js

   ── KULLANIM ────────────────────────────────────────────────────────────────
   • Bir kayda DOKUN → altında açılır:
       Okuma : iki yumuşak kart — BAŞLANGIÇ (okumaya başlanan yer) ve BİTİŞ
               (kalınan yer). Karta dokununca oraya gidilir. Başlangıç ile
               bitiş aynı yerse tek kart.
       Arama : "Aramayı tekrarla".
     Açılan kısmın sağ altında küçük "Sil" — tek kaydı siler (5 sn "Geri al").
   • Birden fazla silmek: üstteki "Seç" ya da bir kayda BASILI TUT → seçim
     kipi; kayıtların başında onay kutuları, üst şeritte "Tümünü seç · Sil".
   • "Temizle" bütün geçmişi siler (onay ister).
   • Buradan bir yere gidilince oradaki sağdaki köprü düğmesi "Geçmiş'e dön".
   • OKUNAN SAYFALAR (26 Ekim 2026, kullanıcı: "Geçmiş sayfasında bir buton ile
     açılıp kapanabilir, toplam okunan sayfa miktarları gösterilebilir, detay
     istenirse alta oradaki gibi açılır kısım ve sayfalar gösterilebilir"):
     filtrenin altında "Okunan sayfalar" şeridi (kapalıyken bugünün toplamı);
     dokununca açılır: Bugün / Son 7 gün / Son 30 gün + eser eser döküm; esere
     dokununca o eserde kayıt taşımaları gün gün ("s. 40 → 43, s. 50 → 52"). Açık/kapalı
     hatırlanır. Gün başlıklarında da "· N sayfa". Sayım: data/gecmis.js.
   • OKUMA ÖZETİ (26 Ekim 2026, kullanıcı: "Ayarlar'da Okunan sayfalar ve yalnız bu
     sayfada görüntülenecek geçen süre açılıp kapanabilsin; eser bazında toplam
     süre ve totalde toplam süre de bu kısma"): şerit artık sayfa + süre özeti.
     Dönem kutularında toplam sayfa ve toplam süre, eser satırlarında eserin
     sayfa ve süresi. Ayarlar → Geçmiş'teki iki anahtar neyin görüneceğini seçer
     (sayfa kapalıysa yalnız süre, süre kapalıysa yalnız sayfa; ikisi kapalıysa
     şerit hiç görünmez). Süre kapalıyken kayıt rozetleri ve gün başlıklarındaki
     süre de gizlenir.
   • DÖNEMLİK ÖZET (26 Ekim 2026, kullanıcı: "Dönemlik özet seçeneği olsun, belirli
     tarih seçilebilsin, haftalık-aylık ya da yıllık özet gibi kısım seçilebilsin;
     toplam geçirilen süre ve toplam okunan sayfa, eser bazında ya da toplu halde"):
     özet şeridinin içinde "Son günler | Dönemlik" seçimi. Dönemlik: Gün · Hafta ·
     Ay · Yıl; ‹ › ile önceki/sonraki dönem, ortadaki tarihe dokununca takvimden
     gün seçilir (o günü içeren dönem). Toplu: dönem toplamları + gün gün (yılda ay
     ay) çubuklar; Eser eser: eserlerin sayfa ve süresi. Hafta pazartesi başlar.
   • Gün başlıklarında "3 okuma · 22 dk · 5 sayfa"; kayıt satırında süre rozetinin
     yanında o oturumda okunan sayfa ("22 dk · 12 s.").  */

import { useEffect, useMemo, useRef, useState } from "react"
import { useNavigate } from "react-router-dom"
import {
  History, BookOpen, BookMarked, Search, Trash2, CheckSquare, Square, CheckCircle2,
  CircleDot, Bookmark, ChevronRight, ChevronDown, ChevronLeft, X, RotateCcw, Info, Settings, CalendarDays,
} from "lucide-react"
import { Secim } from "../components/AyarOgeleri"
import { useApp } from "../AppContext"
import {
  useGecmis, useGecmisAyari, gecmisSil, gecmisTemizle, gecmisGeriKoy, gecmisKopruHazirla,
  useOkunanSayfalar, okunanSayfalar, gunKodu, gunToplami, aralikMetni,
  okumaSureleri, useGecmisBayragi, OKUNAN_SAYFA_AYAR, GECEN_SURE_AYAR,
  useOkumaSureKaydi, oturumSayfaSayisi,
  // gecmisTeshisOku, depoBoyutu,   // ⏸ teşhis satırı (yorumda)
} from "../data/gecmis"

const FILTRELER = [
  { id: "hepsi", ad: "Tümü" },
  { id: "okuma", ad: "Okumalar" },
  { id: "arama", ad: "Aramalar" },
]

// Okunan sayfalar bölümünün dönemleri (bugünle birlikte geriye doğru gün sayısı)
const DONEMLER = [
  { id: "bugun", ad: "Bugün", gun: 1 },
  { id: "hafta", ad: "Son 7 gün", gun: 7 },
  { id: "ay", ad: "Son 30 gün", gun: 30 },
]

// Özet için: hiç süre yoksa "0 dk" (sureYazi "1 dk'dan az" der)
const sureOzet = (sn) => (sn > 0 ? sureYazi(sn) : "0 dk")
function sureYazi(sn) {
  const dk = Math.round((sn || 0) / 60)
  if (dk < 1) return "1 dk'dan az"
  if (dk < 60) return `${dk} dk`
  return `${Math.floor(dk / 60)} sa${dk % 60 ? ` ${dk % 60} dk` : ""}`
}
const saatYazi = (z) => {
  try { return new Date(z).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" }) } catch { return "" }
}
function gunAnahtari(z) {
  const d = new Date(z)
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
}
function gunAdi(z) {
  const d = new Date(z)
  const bugun = new Date()
  const dun = new Date(); dun.setDate(dun.getDate() - 1)
  if (gunAnahtari(d) === gunAnahtari(bugun)) return "Bugün"
  if (gunAnahtari(d) === gunAnahtari(dun)) return "Dün"
  try {
    return d.toLocaleDateString("tr-TR", {
      day: "numeric", month: "long", weekday: "long",
      year: d.getFullYear() !== bugun.getFullYear() ? "numeric" : undefined,
    })
  } catch { return "" }
}
/* Bir dönemin toplamı ve eser eser dökümü (sayfalar: okunanSayfalar, süreler:
   okumaSureleri çıktısı). Farklı günlerde aynı sayfalar yeniden okunduysa her
   gün ayrıca sayılır. eserler[i].gunler: [{ gun, ad, toplam, araliklar, sure }]
   (en yeni gün başta) */
function donemToplami(sayfaGunleri, sureGunleri, gunSayisi) {
  const eserler = new Map()
  let toplam = 0, sure = 0
  const eser = (a, v) => {
    if (!eserler.has(a)) eserler.set(a, { anahtar: a, baslik: v.baslik, kaynak: v.kaynak, sayi: 0, sure: 0, gunler: new Map() })
    return eserler.get(a)
  }
  const gunu = (e, kod, ad) => {
    if (!e.gunler.has(kod)) e.gunler.set(kod, { gun: kod, ad, toplam: 0, araliklar: [], sure: 0 })
    return e.gunler.get(kod)
  }
  for (let i = 0; i < gunSayisi; i++) {
    const d = new Date(); d.setDate(d.getDate() - i)
    const kod = gunKodu(d), ad = gunAdi(d)
    for (const [a, v] of sayfaGunleri.get(kod) || []) {
      toplam += v.toplam
      const e = eser(a, v); e.sayi += v.toplam
      const g = gunu(e, kod, ad); g.toplam += v.toplam; g.araliklar = v.araliklar
    }
    for (const [a, v] of sureGunleri.get(kod) || []) {
      sure += v.sure
      const e = eser(a, v); e.sure += v.sure
      gunu(e, kod, ad).sure += v.sure
    }
  }
  const liste = [...eserler.values()].map(e => ({ ...e, gunler: [...e.gunler.values()] }))
  liste.sort((x, y) => (y.sayi - x.sayi) || (y.sure - x.sure))
  return { toplam, sure, eserler: liste }
}
const SAYFALAR_ACIK_ANAHTAR = "vukuf-gecmis-sayfalar-acik"

/* ══ DÖNEMLİK ÖZET ══════════════════════════════════════════════════════════
   tur: gun · hafta · ay · yil; tarih: dönemin içindeki herhangi bir gün.
   okunan / sureler: Map(gunKodu → Map(eser → {…})) — sayfalar ve süreler. */
const AYLAR_KISA = ["Oca", "Şub", "Mar", "Nis", "May", "Haz", "Tem", "Ağu", "Eyl", "Eki", "Kas", "Ara"]
const gunBasi = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate())
const isoGun = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
function donemAraligi(tur, tarih) {
  const d = gunBasi(tarih)
  if (tur === "gun") return { bas: d, bit: d }
  if (tur === "hafta") {
    const bas = new Date(d); bas.setDate(d.getDate() - ((d.getDay() + 6) % 7))   // pazartesi
    const bit = new Date(bas); bit.setDate(bas.getDate() + 6)
    return { bas, bit }
  }
  if (tur === "ay") return { bas: new Date(d.getFullYear(), d.getMonth(), 1), bit: new Date(d.getFullYear(), d.getMonth() + 1, 0) }
  return { bas: new Date(d.getFullYear(), 0, 1), bit: new Date(d.getFullYear(), 11, 31) }
}
function donemEtiketi(tur, { bas, bit }) {
  const tr = (d, o) => { try { return d.toLocaleDateString("tr-TR", o) } catch { return "" } }
  if (tur === "gun") return tr(bas, { day: "numeric", month: "long", year: "numeric", weekday: "long" })
  if (tur === "ay") return tr(bas, { month: "long", year: "numeric" })
  if (tur === "yil") return String(bas.getFullYear())
  const ayniAy = bas.getMonth() === bit.getMonth(), ayniYil = bas.getFullYear() === bit.getFullYear()
  if (ayniAy) return `${bas.getDate()}–${tr(bit, { day: "numeric", month: "long", year: "numeric" })}`
  return `${tr(bas, { day: "numeric", month: "long", ...(ayniYil ? {} : { year: "numeric" }) })} – ${tr(bit, { day: "numeric", month: "long", year: "numeric" })}`
}
function donemKaydir(tur, tarih, yon) {
  const d = gunBasi(tarih)
  if (tur === "gun") d.setDate(d.getDate() + yon)
  else if (tur === "hafta") d.setDate(d.getDate() + 7 * yon)
  else if (tur === "ay") { d.setDate(1); d.setMonth(d.getMonth() + yon) }
  else { d.setMonth(0, 1); d.setFullYear(d.getFullYear() + yon) }
  return d
}
/* Dönemin toplamları, eserler ve alt dilimler (gün; yılda ay) */
function donemHesapla(tur, aralik, okunan, sureler) {
  const bugun = gunBasi(new Date())
  const son = aralik.bit < bugun ? aralik.bit : bugun
  const eserler = new Map(), dilimler = new Map()
  let sayi = 0, sure = 0, gunSayisi = 0
  for (let d = new Date(aralik.bas); d <= son; d.setDate(d.getDate() + 1)) {
    const kod = gunKodu(d)
    const dk = tur === "yil" ? `${d.getFullYear()}-${d.getMonth()}` : kod
    let gunVar = false
    const eser = (a, v) => {
      if (!eserler.has(a)) eserler.set(a, { anahtar: a, baslik: v.baslik, kaynak: v.kaynak, sayi: 0, sure: 0 })
      return eserler.get(a)
    }
    const dilim = () => {
      if (!dilimler.has(dk)) dilimler.set(dk, {
        anahtar: dk, sayi: 0, sure: 0,
        ad: tur === "yil" ? (() => { try { return d.toLocaleDateString("tr-TR", { month: "long" }) } catch { return AYLAR_KISA[d.getMonth()] } })()
          : (() => { try { return d.toLocaleDateString("tr-TR", { day: "numeric", month: "short", weekday: "short" }) } catch { return kod } })(),
      })
      return dilimler.get(dk)
    }
    for (const [a, v] of okunan.get(kod) || []) {
      if (!(v.toplam > 0)) continue
      sayi += v.toplam; eser(a, v).sayi += v.toplam; dilim().sayi += v.toplam; gunVar = true
    }
    for (const [a, v] of sureler.get(kod) || []) {
      if (!(v.sure > 0)) continue
      sure += v.sure; eser(a, v).sure += v.sure; dilim().sure += v.sure; gunVar = true
    }
    if (gunVar) gunSayisi++
  }
  // Haftada 7 gün, yılda 12 ay HEP görünsün (boşlar "—"); ayda yalnız okunan günler
  let dilimListe = [...dilimler.values()]
  if (tur === "hafta" || tur === "yil") {
    const hepsi = []
    if (tur === "hafta") {
      for (let i = 0; i < 7; i++) {
        const d = new Date(aralik.bas); d.setDate(aralik.bas.getDate() + i)
        const kod = gunKodu(d)
        let ad = kod
        try { ad = d.toLocaleDateString("tr-TR", { day: "numeric", month: "short", weekday: "short" }) } catch { /* yoksay */ }
        hepsi.push(dilimler.get(kod) || { anahtar: kod, ad, sayi: 0, sure: 0, gelecek: d > bugun })
      }
    } else {
      for (let m = 0; m < 12; m++) {
        const dk = `${aralik.bas.getFullYear()}-${m}`
        const d = new Date(aralik.bas.getFullYear(), m, 1)
        let ad = AYLAR_KISA[m]
        try { ad = d.toLocaleDateString("tr-TR", { month: "long" }) } catch { /* yoksay */ }
        hepsi.push(dilimler.get(dk) || { anahtar: dk, ad, sayi: 0, sure: 0, gelecek: d > bugun })
      }
    }
    dilimListe = hepsi
  }
  return {
    sayi, sure, gunSayisi,
    eserler: [...eserler.values()].sort((x, y) => (y.sayi - x.sayi) || (y.sure - x.sure)),
    dilimler: dilimListe,
  }
}

function DonemlikOzet({ theme, okunan, sureler, sayfaAcik, sureAcik, ozetMetni }) {
  const ac = theme.accent
  const [tur, setTur] = useState("hafta")
  const [tarih, setTarih] = useState(() => new Date())
  const [gorunum, setGorunum] = useState("toplu")     // "toplu" | "eser"
  const aralik = useMemo(() => donemAraligi(tur, tarih), [tur, tarih])
  const r = useMemo(() => donemHesapla(tur, aralik, okunan, sureler), [tur, aralik, okunan, sureler])
  const bugun = gunBasi(new Date())
  const ilerisiYok = donemKaydir(tur, tarih, 1) > bugun && donemAraligi(tur, donemKaydir(tur, tarih, 1)).bas > bugun
  const bugunIcinde = aralik.bas <= bugun && bugun <= aralik.bit
  const olcu = (v) => (sayfaAcik ? v.sayi : v.sure)             // çubuk ölçüsü
  const satirlar = tur === "gun" || gorunum === "eser" ? r.eserler : r.dilimler
  const enCok = Math.max(1, ...satirlar.map(olcu))

  const okDugme = (yon, pasif) => (
    <button onClick={() => !pasif && setTarih(donemKaydir(tur, tarih, yon))} disabled={pasif}
      aria-label={yon < 0 ? "Önceki dönem" : "Sonraki dönem"} style={{
        width: "32px", height: "32px", borderRadius: "50%", flexShrink: 0, padding: 0,
        display: "flex", alignItems: "center", justifyContent: "center", cursor: pasif ? "default" : "pointer",
        border: `1px solid ${theme.border}`, background: "transparent", color: pasif ? `${theme.textSecondary}55` : ac,
      }}>
      {yon < 0 ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
    </button>
  )
  const kutu = (deger, ad) => (
    <div style={{
      display: "flex", flexDirection: "column", alignItems: "center", gap: "2px", minWidth: 0,
      padding: "9px 4px", borderRadius: "11px", border: `1px solid ${theme.border}`,
    }}>
      <span style={{ fontSize: "18px", fontWeight: 700, color: ac, lineHeight: 1.2, whiteSpace: "nowrap", fontVariantNumeric: "tabular-nums" }}>{deger}</span>
      <span style={{ fontSize: "11px", color: theme.textSecondary, whiteSpace: "nowrap" }}>{ad}</span>
    </div>
  )
  const kutular = [
    sayfaAcik && kutu(r.sayi, "sayfa"),
    sureAcik && kutu(sureOzet(r.sure), "süre"),
    tur !== "gun" && kutu(r.gunSayisi, "okunan gün"),
  ].filter(Boolean)

  return (
    <div>
      <Secim theme={theme} kucuk deger={tur} onSec={setTur}
        secenekler={[{ id: "gun", ad: "Gün" }, { id: "hafta", ad: "Hafta" }, { id: "ay", ad: "Ay" }, { id: "yil", ad: "Yıl" }]} />

      {/* Dönem gezgini — ortadaki tarihe dokununca takvim açılır */}
      <div style={{ display: "flex", alignItems: "center", gap: "8px", margin: "10px 0 4px" }}>
        {okDugme(-1, false)}
        <label style={{
          position: "relative", flex: 1, minWidth: 0, display: "flex", alignItems: "center", justifyContent: "center", gap: "6px",
          padding: "7px 10px", borderRadius: "10px", cursor: "pointer",
          border: `1px solid ${ac}44`, background: `${ac}0d`, color: theme.text,
          fontSize: "13px", fontWeight: 600, textAlign: "center",
        }}>
          <CalendarDays size={14} color={ac} style={{ flexShrink: 0 }} />
          <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{donemEtiketi(tur, aralik)}</span>
          <input type="date" aria-label="Tarih seç" value={isoGun(tarih)} max={isoGun(bugun)}
            onChange={(e) => {
              const [y, m, g] = (e.target.value || "").split("-").map(Number)
              if (y && m && g) setTarih(new Date(y, m - 1, g))
            }}
            style={{ position: "absolute", inset: 0, opacity: 0, width: "100%", height: "100%", cursor: "pointer", border: "none", padding: 0 }} />
        </label>
        {okDugme(1, ilerisiYok)}
      </div>
      <div style={{ minHeight: "18px", textAlign: "center", marginBottom: "6px" }}>
        {!bugunIcinde && (
          <button onClick={() => setTarih(new Date())} style={{
            border: "none", background: "transparent", color: ac, cursor: "pointer",
            fontSize: "11.5px", fontWeight: 600, fontFamily: "inherit", padding: "2px 6px",
          }}>Bu döneme dön</button>
        )}
      </div>

      {kutular.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: `repeat(${kutular.length}, minmax(0, 1fr))`, gap: "8px" }}>{kutular}</div>
      )}

      {tur !== "gun" && (
        <div style={{ margin: "10px 0 4px" }}>
          <Secim theme={theme} kucuk deger={gorunum} onSec={setGorunum}
            secenekler={[{ id: "toplu", ad: tur === "yil" ? "Ay ay" : "Gün gün" }, { id: "eser", ad: "Eser eser" }]} />
        </div>
      )}

      <div style={{ marginTop: "6px" }}>
        {satirlar.length && (r.sayi > 0 || r.sure > 0) ? satirlar.map((v, i) => {
          const eserMi = tur === "gun" || gorunum === "eser"
          const Ikon = eserMi ? (v.kaynak === "kuran" ? BookMarked : BookOpen) : null
          const bos = !(v.sayi > 0 || v.sure > 0)
          const oran = olcu(v) / enCok
          return (
            <div key={v.anahtar} style={{
              display: "flex", alignItems: "center", gap: "8px", padding: "6px 2px",
              borderTop: i ? `1px solid ${theme.border}` : "none", fontSize: "12.5px",
              opacity: v.gelecek ? 0.4 : 1,
            }}>
              {Ikon && <Ikon size={13} color={ac} style={{ flexShrink: 0 }} />}
              <span style={{
                flexShrink: 0, width: eserMi ? "auto" : "6.2em", flex: eserMi ? "1 1 auto" : "0 0 auto", minWidth: 0,
                whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", color: theme.text,
              }}>{v.baslik || v.ad}</span>
              {!eserMi && (
                <span style={{ flex: 1, minWidth: "20px", height: "6px", borderRadius: "3px", background: `${ac}14`, overflow: "hidden" }}>
                  <span style={{ display: "block", height: "100%", width: `${Math.round(oran * 100)}%`, background: ac, borderRadius: "3px" }} />
                </span>
              )}
              <span style={{ flexShrink: 0, color: bos ? theme.textSecondary : theme.text, fontWeight: bos ? 400 : 600, fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}>
                {bos ? "—" : ozetMetni(v.sayi, v.sure)}
              </span>
            </div>
          )
        }) : (
          <div style={{ padding: "8px 2px", fontSize: "12.5px", color: theme.textSecondary, textAlign: "center" }}>
            Bu dönemde okuma kaydı yok.
          </div>
        )}
      </div>
    </div>
  )
}

export default function Gecmis() {
  const { theme } = useApp()
  const navigate = useNavigate()
  const liste = useGecmis()
  const [acik, setAcik] = useGecmisAyari()
  const [filtre, setFiltre] = useState("hepsi")
  const [donem, setDonem] = useState("bugun")        // okunan sayfalar: seçili dönem
  const [sayfalarAcik, setSayfalarAcik] = useState(() => {
    try { return localStorage.getItem(SAYFALAR_ACIK_ANAHTAR) === "1" } catch { return false }
  })
  const [acikEser, setAcikEser] = useState(null)     // okunan sayfalar: dökümü açık eser
  const sayfalarDegis = () => setSayfalarAcik(a => {
    try { localStorage.setItem(SAYFALAR_ACIK_ANAHTAR, a ? "0" : "1") } catch { /* yoksay */ }
    return !a
  })
  const [kapatSor, setKapatSor] = useState(false)    // boş sayfada "Geçmişi kapat" onayı
  const [acilan, setAcilan] = useState(null)         // açık (genişletilmiş) kaydın id'si
  const [secim, setSecim] = useState(null)           // null = seçim kipi kapalı; Set = seçilenler
  const [geriAl, setGeriAl] = useState(null)         // { kayitlar, metin }
  const geriAlZaman = useRef(null)
  const basiliRef = useRef({ t: null, x: 0, y: 0, tetiklendi: false })

  useEffect(() => () => { if (geriAlZaman.current) clearTimeout(geriAlZaman.current) }, [])

  const ac = theme.accent
  const gorunen = useMemo(() => liste.filter(e => filtre === "hepsi" || e.tur === filtre), [liste, filtre])
  const sayilar = useMemo(() => ({
    hepsi: liste.length,
    okuma: liste.filter(e => e.tur === "okuma").length,
    arama: liste.filter(e => e.tur === "arama").length,
  }), [liste])
  // Okunan sayfalar: gün → eser → sayfalar; dönem toplamları
  const okunanHam = useOkunanSayfalar()
  const okunan = useMemo(() => okunanSayfalar(okunanHam), [okunanHam])
  const sureKaydi = useOkumaSureKaydi()             // gün gün süre (dönemlik özet; liste 400 kayıtla sınırlı)
  const sureler = useMemo(() => okumaSureleri(liste, sureKaydi), [liste, sureKaydi])
  const [ozetKip, setOzetKip] = useState("son")      // "son" (Bugün/7/30) | "donem" (dönemlik özet)
  const donemSonuclari = useMemo(() => {
    const o = {}
    for (const d of DONEMLER) o[d.id] = donemToplami(okunan, sureler, d.gun)
    return o
  }, [okunan, sureler])
  // Ayarlar → Geçmiş: Okunan sayfalar · Geçen süre (ikisi de varsayılan açık)
  const [sayfaAcik] = useGecmisBayragi(OKUNAN_SAYFA_AYAR)
  const [sureAcik] = useGecmisBayragi(GECEN_SURE_AYAR)
  // "12 sayfa · 40 dk" — kapalı olan kısım yazılmaz
  const ozetMetni = (sayi, sn) => [sayfaAcik && `${sayi} sayfa`, sureAcik && sureOzet(sn)].filter(Boolean).join(" · ")
  const sayfaGoster = filtre !== "arama"
  // Gün gün gruplar (liste zaten en yeni başta)
  const gruplar = useMemo(() => {
    const m = new Map()
    for (const e of gorunen) {
      const z = e.son || e.z
      const k = gunAnahtari(z)
      if (!m.has(k)) m.set(k, { anahtar: k, kod: gunKodu(z), ad: gunAdi(z), kayitlar: [], sure: 0, okuma: 0 })
      const g = m.get(k)
      g.kayitlar.push(e)
      if (e.tur === "okuma") { g.okuma++; g.sure += e.sure || 0 }
    }
    return [...m.values()]
  }, [gorunen])

  function sil(idler, metin) {
    const kume = new Set(idler)
    const silinen = liste.filter(e => kume.has(e.id))
    if (!silinen.length) return
    gecmisSil(idler)
    setAcilan(null)
    if (geriAlZaman.current) clearTimeout(geriAlZaman.current)
    setGeriAl({ kayitlar: silinen, metin })
    geriAlZaman.current = setTimeout(() => setGeriAl(null), 5000)
  }
  function hepsiniTemizle() {
    if (!window.confirm(`Bütün geçmiş (${liste.length} kayıt) silinsin mi?`)) return
    gecmisTemizle()
    setSecim(null); setAcilan(null); setGeriAl(null)
  }
  function git(kayit, uc) {
    const yol = gecmisKopruHazirla(kayit, uc)
    if (yol) navigate(yol)
  }
  const secimDegistir = (id) => setSecim(s => {
    const y = new Set(s || [])
    if (y.has(id)) y.delete(id); else y.add(id)
    return y
  })

  // BASILI TUT → seçim kipi (450 ms; parmak kayarsa iptal — kaydırma bozulmasın)
  const basiliBasla = (e, id) => {
    const b = basiliRef.current
    b.tetiklendi = false
    b.x = e.clientX; b.y = e.clientY
    if (b.t) clearTimeout(b.t)
    b.t = setTimeout(() => {
      b.tetiklendi = true
      setAcilan(null)
      setSecim(s => { const y = new Set(s || []); y.add(id); return y })
      try { navigator.vibrate && navigator.vibrate(12) } catch { /* yoksay */ }
    }, 450)
  }
  const basiliHareket = (e) => {
    const b = basiliRef.current
    if (b.t && (Math.abs(e.clientX - b.x) > 8 || Math.abs(e.clientY - b.y) > 8)) { clearTimeout(b.t); b.t = null }
  }
  const basiliBitti = () => { const b = basiliRef.current; if (b.t) { clearTimeout(b.t); b.t = null } }

  function satirTikla(e) {
    if (basiliRef.current.tetiklendi) { basiliRef.current.tetiklendi = false; return }
    if (secim) { secimDegistir(e.id); return }
    setAcilan(a => (a === e.id ? null : e.id))
  }

  const kart = {
    background: theme.surface, border: `1px solid ${theme.border}`,
    borderRadius: "14px", marginBottom: "12px", overflow: "hidden",
  }
  const hap = (vurgulu, tehlike) => ({
    display: "inline-flex", alignItems: "center", gap: "5px", flexShrink: 0,
    padding: "6px 12px", borderRadius: "999px", cursor: "pointer",
    fontSize: "12px", fontWeight: 600, fontFamily: "inherit",
    border: `1px solid ${tehlike ? "#c0392b" : vurgulu ? ac : theme.border}`,
    background: vurgulu ? ac : "transparent",
    color: tehlike ? "#c0392b" : vurgulu ? "#fff" : theme.textSecondary,
  })

  /* Başlangıç / Bitiş kartı — sade, iki satır, dokunması kolay */
  const UcKarti = ({ ikon: Ikon, etiket, metin, onClick, tam }) => (
    <button onClick={onClick} style={{
      gridColumn: tam ? "1 / -1" : undefined,
      display: "flex", alignItems: "center", gap: "10px", textAlign: "left", minWidth: 0,
      padding: "10px 12px", borderRadius: "12px", cursor: "pointer", fontFamily: "inherit",
      border: `1px solid ${ac}33`, background: `${ac}0d`, color: theme.text,
    }}>
      <span style={{
        width: "28px", height: "28px", borderRadius: "50%", flexShrink: 0,
        display: "flex", alignItems: "center", justifyContent: "center",
        background: `${ac}1f`, color: ac,
      }}><Ikon size={14} /></span>
      <span style={{ flex: 1, minWidth: 0 }}>
        <span style={{ display: "block", fontSize: "10px", fontWeight: 700, letterSpacing: "0.06em", color: ac }}>
          {etiket.toLocaleUpperCase("tr")}
        </span>
        {/* İki satıra kadar kayar (dar ekranda "Bakara …" diye kesilmesin) */}
        <span style={{
          fontSize: "13px", fontWeight: 600, lineHeight: 1.3, overflow: "hidden",
          display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", wordBreak: "break-word",
        }}>
          {metin}
        </span>
      </span>
      <ChevronRight size={15} color={theme.textSecondary} style={{ flexShrink: 0 }} />
    </button>
  )

  return (
    <div style={{
      minHeight: "100vh", background: theme.background, color: theme.text,
      padding: "18px 14px calc(70px + env(safe-area-inset-bottom))",
      maxWidth: "760px", margin: "0 auto", boxSizing: "border-box",
    }}>
      {/* ── BAŞLIK ── */}
      <div style={{ display: "flex", alignItems: "center", gap: "9px", marginBottom: "14px" }}>
        <History size={20} color={ac} />
        <h1 style={{ margin: 0, fontSize: "19px", fontWeight: 600 }}>Geçmiş</h1>
        <div style={{ flex: 1 }} />
        {acik && liste.length > 0 && !secim && (
          <>
            <button onClick={() => { setSecim(new Set()); setAcilan(null) }} style={hap(false)}>
              <CheckSquare size={13} /> Seç
            </button>
            <button onClick={hepsiniTemizle} style={hap(false, true)}>
              <Trash2 size={13} /> Temizle
            </button>
          </>
        )}
      </div>

      {!acik ? (
        <div style={{ ...kart, padding: "16px", fontSize: "13.5px", lineHeight: 1.6, color: theme.textSecondary }}>
          Geçmiş kapalı; arama ve okuma kaydı tutulmuyor. Açınca aramalarınız ve okuduğunuz
          yerler, tarih ve süreleriyle burada listelenir.
          <div style={{ marginTop: "12px" }}>
            <button onClick={() => setAcik(true)} style={hap(true)}>
              <History size={13} /> Geçmişi aç
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* ── SEÇİM ŞERİDİ (yapışkan) ── */}
          {secim && (
            <div style={{
              position: "sticky", top: "calc(50px + env(safe-area-inset-top))", zIndex: 5,
              display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap",
              padding: "8px 10px", marginBottom: "12px", borderRadius: "12px",
              background: theme.surface, border: `1px solid ${ac}`, boxShadow: "0 4px 14px rgba(0,0,0,0.12)",
            }}>
              <button onClick={() => setSecim(null)} aria-label="Seçimi bırak" style={{
                width: "28px", height: "28px", borderRadius: "50%", border: "none", padding: 0,
                display: "flex", alignItems: "center", justifyContent: "center",
                background: "transparent", color: theme.textSecondary, cursor: "pointer",
              }}><X size={16} /></button>
              <span style={{ flex: 1, fontSize: "13px", fontWeight: 600 }}>
                {secim.size ? `${secim.size} kayıt seçili` : "Silinecekleri seçin"}
              </span>
              <button onClick={() => setSecim(s => (s && s.size === gorunen.length ? new Set() : new Set(gorunen.map(e => e.id))))}
                style={hap(false)}>
                {secim.size === gorunen.length && gorunen.length ? "Seçimi kaldır" : "Tümünü seç"}
              </button>
              <button disabled={!secim.size} onClick={() => { sil([...secim], `${secim.size} kayıt silindi`); setSecim(null) }}
                style={{ ...hap(!!secim.size), opacity: secim.size ? 1 : 0.5, cursor: secim.size ? "pointer" : "default" }}>
                <Trash2 size={13} /> Sil
              </button>
            </div>
          )}

          {/* ── FİLTRE ── */}
          {liste.length > 0 && (
            <div role="radiogroup" style={{
              display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: "3px",
              padding: "3px", borderRadius: "11px", marginBottom: "14px",
              background: `${ac}0f`, border: `1px solid ${theme.border}`,
            }}>
              {FILTRELER.map(f => (
                <button key={f.id} role="radio" aria-checked={filtre === f.id} onClick={() => setFiltre(f.id)} style={{
                  minHeight: "32px", borderRadius: "8px", border: "none", cursor: "pointer", fontFamily: "inherit",
                  fontSize: "12.5px", fontWeight: 600,
                  background: filtre === f.id ? ac : "transparent", color: filtre === f.id ? "#fff" : theme.textSecondary,
                }}>
                  {f.ad} <span style={{ opacity: 0.75, fontWeight: 500 }}>{sayilar[f.id]}</span>
                </button>
              ))}
            </div>
          )}

          {/* ── OKUMA ÖZETİ (okunan sayfalar + süre) ── Kapalıyken tek şerit (bugünün
              özeti); açılınca Bugün / Son 7 gün / Son 30 gün + eser eser; esere
              dokununca gün gün sayfalar ve süre. Gösterilecek bir şey yoksa görünmez. */}
          {sayfaGoster && !secim && ((sayfaAcik && donemSonuclari.ay.toplam > 0) || (sureAcik && donemSonuclari.ay.sure > 0)) && (() => {
            const sec = donemSonuclari[donem]
            const eserler = sec.eserler.filter(v => (sayfaAcik && v.sayi > 0) || (sureAcik && v.sure > 0))
            const baslik = sayfaAcik && sureAcik ? "Okuma özeti" : sayfaAcik ? "Okunan sayfalar" : "Okuma süresi"
            return (
              <div style={{ ...kart }}>
                <button onClick={sayfalarDegis} aria-expanded={sayfalarAcik} style={{
                  width: "100%", display: "flex", alignItems: "center", gap: "9px",
                  padding: "11px 14px", border: "none", background: "transparent", cursor: "pointer",
                  fontFamily: "inherit", color: theme.text, textAlign: "left",
                }}>
                  <BookOpen size={16} color={ac} style={{ flexShrink: 0 }} />
                  <span style={{ flex: 1, minWidth: 0, fontSize: "14px", fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{baslik}</span>
                  <span style={{ fontSize: "12px", color: theme.textSecondary, whiteSpace: "nowrap" }}>
                    Bugün <b style={{ color: ac, fontVariantNumeric: "tabular-nums" }}>{ozetMetni(donemSonuclari.bugun.toplam, donemSonuclari.bugun.sure)}</b>
                  </span>
                  <ChevronDown size={16} color={theme.textSecondary} style={{
                    flexShrink: 0, transition: "transform 0.2s", transform: sayfalarAcik ? "rotate(180deg)" : "none",
                  }} />
                </button>
                {sayfalarAcik && (
                  <div style={{ padding: "0 12px 10px" }}>
                    <div style={{ marginBottom: "10px" }}>
                      <Secim theme={theme} kucuk deger={ozetKip} onSec={setOzetKip}
                        secenekler={[{ id: "son", ad: "Son günler" }, { id: "donem", ad: "Dönemlik özet", Ikon: CalendarDays }]} />
                    </div>
                    {ozetKip === "donem" ? (
                      <DonemlikOzet theme={theme} okunan={okunan} sureler={sureler}
                        sayfaAcik={sayfaAcik} sureAcik={sureAcik} ozetMetni={ozetMetni} />
                    ) : (<>
                    <div role="radiogroup" style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: "8px" }}>
                      {DONEMLER.map(d => {
                        const secili = donem === d.id
                        const r = donemSonuclari[d.id]
                        return (
                          <button key={d.id} role="radio" aria-checked={secili} onClick={() => { setDonem(d.id); setAcikEser(null) }} style={{
                            display: "flex", flexDirection: "column", alignItems: "center", gap: "2px",
                            padding: "9px 4px", borderRadius: "11px", cursor: "pointer", fontFamily: "inherit",
                            border: `1px solid ${secili ? ac : theme.border}`, background: secili ? `${ac}14` : "transparent",
                            color: theme.text, minWidth: 0,
                          }}>
                            {/* Ana sayı: sayfa (kapalıysa süre); süre ikinci satırda */}
                            <span style={{ fontSize: sayfaAcik ? "20px" : "15px", fontWeight: 700, lineHeight: 1.2, color: secili ? ac : theme.text, fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}>
                              {sayfaAcik ? r.toplam : sureOzet(r.sure)}
                            </span>
                            {sayfaAcik && sureAcik && (
                              <span style={{ fontSize: "11px", fontWeight: 600, color: secili ? ac : theme.textSecondary, whiteSpace: "nowrap" }}>{sureOzet(r.sure)}</span>
                            )}
                            <span style={{ fontSize: "11px", color: theme.textSecondary, whiteSpace: "nowrap" }}>{d.ad}</span>
                          </button>
                        )
                      })}
                    </div>
                    <div style={{ marginTop: "8px" }}>
                      {eserler.length ? eserler.map((v, i) => {
                        const Ikon = v.kaynak === "kuran" ? BookMarked : BookOpen
                        const acikMi = acikEser === v.anahtar
                        return (
                          <div key={v.anahtar} style={{ borderTop: i ? `1px solid ${theme.border}` : "none" }}>
                            <button onClick={() => setAcikEser(a => (a === v.anahtar ? null : v.anahtar))} aria-expanded={acikMi} style={{
                              width: "100%", display: "flex", alignItems: "center", gap: "9px", padding: "8px 4px",
                              border: "none", background: "transparent", cursor: "pointer", fontFamily: "inherit",
                              fontSize: "13px", color: theme.text, textAlign: "left",
                            }}>
                              <Ikon size={14} color={ac} style={{ flexShrink: 0 }} />
                              <span style={{ flex: 1, minWidth: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{v.baslik}</span>
                              <span style={{ flexShrink: 0, fontWeight: 600, color: theme.textSecondary, fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}>{ozetMetni(v.sayi, v.sure)}</span>
                              <ChevronDown size={14} color={theme.textSecondary} style={{
                                flexShrink: 0, transition: "transform 0.2s", transform: acikMi ? "rotate(180deg)" : "none",
                              }} />
                            </button>
                            {acikMi && (
                              <div style={{
                                margin: "0 4px 8px 27px", padding: "8px 10px", borderRadius: "10px",
                                background: `${ac}0d`, border: `1px solid ${ac}33`,
                                fontSize: "12px", lineHeight: 1.55, color: theme.text,
                              }}>
                                {v.gunler.map(gn => {
                                  const sayfaVar = sayfaAcik && gn.toplam > 0
                                  return (
                                    <div key={gn.gun} style={{ display: "flex", gap: "8px" }}>
                                      {donem !== "bugun" && (
                                        <span style={{ flexShrink: 0, minWidth: "4.5em", color: theme.textSecondary }}>{gn.ad}</span>
                                      )}
                                      <span style={{ flex: 1, minWidth: 0, wordBreak: "break-word" }}>
                                        {sayfaVar ? aralikMetni(gn.araliklar) : ""}
                                        <span style={{ color: theme.textSecondary }}>
                                          {sayfaVar ? " · " : ""}{ozetMetni(gn.toplam, gn.sure)}
                                        </span>
                                      </span>
                                    </div>
                                  )
                                })}
                              </div>
                            )}
                          </div>
                        )
                      }) : (
                        <div style={{ padding: "6px 4px", fontSize: "12.5px", color: theme.textSecondary }}>
                          {donem === "bugun" ? "Bugün henüz okuma kaydı yok." : "Bu dönemde okuma kaydı yok."}
                        </div>
                      )}
                    </div>
                    </>)}
                  </div>
                )}
              </div>
            )
          })()}

          {/* Liste BOŞKEN kısa bilgi (8 Ekim 2026, kullanıcı: "çok fazla bilgi var; başlık
              ve tek cümle yeter"). Kapatma yolu yalnız "Geçmişi kapat"a dokununca, onay
              kutusunun içinde gösteriliyor. */}
          {!liste.length && (
            <div style={{ ...kart, padding: "16px", fontSize: "13px", lineHeight: 1.6, color: theme.textSecondary }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", color: theme.text, fontWeight: 600, fontSize: "14px", marginBottom: "4px" }}>
                <History size={17} color={ac} /> Henüz kayıt yok
              </div>
              <p style={{ margin: 0 }}>
                Arama yaptıkça ve okudukça kayıtlarınız burada, tarihe göre listelenir.
                Kayıtlarınız cihazınız üzerinde tutulur.
              </p>
              {!kapatSor ? (
                <div style={{ marginTop: "12px" }}>
                  <button onClick={() => setKapatSor(true)} style={hap(false)}>
                    <Info size={13} /> Geçmişi kapat
                  </button>
                </div>
              ) : (
                <div style={{
                  marginTop: "12px", padding: "12px", borderRadius: "10px",
                  border: `1px solid ${ac}55`, background: `${ac}0d`,
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "7px", color: theme.text, fontWeight: 600, marginBottom: "4px" }}>
                    <Settings size={14} color={ac} /> Geçmiş kapatılsın mı?
                  </div>
                  <p style={{ margin: "0 0 10px" }}>
                    Kapatınca yeni kayıt tutulmaz ve ana menüdeki Geçmiş sayfası gizlenir.
                    Bu ayar ana ekrandaki <b>Ayarlar (dişli) → Geçmiş → "Geçmişi tut"</b> bölümündedir;
                    yeniden açmak için oradan açabilirsiniz.
                  </p>
                  <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                    <button onClick={() => { setKapatSor(false); setAcik(false) }} style={hap(true)}>Kapat</button>
                    <button onClick={() => setKapatSor(false)} style={hap(false)}>Vazgeç</button>
                  </div>
                </div>
              )}
            </div>
          )}
          {liste.length > 0 && !gorunen.length && (
            <div style={{ ...kart, padding: "18px 16px", fontSize: "13px", color: theme.textSecondary, display: "flex", gap: "8px", alignItems: "center" }}>
              <CheckCircle2 size={16} color={ac} />
              Bu türde kayıt yok.
            </div>
          )}

          {/* ── GÜNLER ── */}
          {gruplar.map(g => {
            const gunSayfa = sayfaGoster && sayfaAcik ? gunToplami(okunan, g.kod) : 0
            // Günün süresi: oturumlar ile gün gün süre kaydının büyüğü (özetle aynı sayı)
            let gunSure = 0
            for (const v of (sureler.get(g.kod) || new Map()).values()) gunSure += v.sure
            gunSure = Math.max(gunSure, g.sure)
            return (
            <div key={g.anahtar} style={{ marginBottom: "6px" }}>
              <div style={{
                display: "flex", alignItems: "baseline", gap: "8px", padding: "0 4px 7px",
                fontSize: "11.5px", color: theme.textSecondary,
              }}>
                <span style={{ fontWeight: 700, letterSpacing: "0.05em" }}>{g.ad.toLocaleUpperCase("tr")}</span>
                {g.okuma > 0 && <span>· {g.okuma} okuma{sureAcik ? ` · ${sureYazi(gunSure)}` : ""}{gunSayfa > 0 ? ` · ${gunSayfa} sayfa` : ""}</span>}
              </div>
              <div style={kart}>
                {g.kayitlar.map((e, i) => {
                  const secili = !!secim && secim.has(e.id)
                  const acikMi = acilan === e.id && !secim
                  const okuma = e.tur === "okuma"
                  const Ikon = !okuma ? Search : e.kaynak === "kuran" ? BookMarked : BookOpen
                  const ayniYer = okuma && e.bas && e.bitis && e.bas.etiket === e.bitis.etiket
                  return (
                    <div key={e.id} style={{ borderTop: i ? `1px solid ${theme.border}` : "none", background: secili ? `${ac}12` : "transparent" }}>
                      <div
                        role="button" tabIndex={0}
                        onClick={() => satirTikla(e)}
                        onPointerDown={(ev) => basiliBasla(ev, e.id)}
                        onPointerMove={basiliHareket}
                        onPointerUp={basiliBitti}
                        onPointerCancel={basiliBitti}
                        onContextMenu={(ev) => ev.preventDefault()}
                        style={{
                          display: "flex", alignItems: "center", gap: "11px", padding: "11px 14px",
                          cursor: "pointer", userSelect: "none", WebkitUserSelect: "none", WebkitTouchCallout: "none",
                        }}>
                        {secim ? (
                          secili ? <CheckSquare size={18} color={ac} style={{ flexShrink: 0 }} />
                            : <Square size={18} color={theme.textSecondary} style={{ flexShrink: 0 }} />
                        ) : (
                          <span style={{
                            width: "32px", height: "32px", borderRadius: "10px", flexShrink: 0,
                            display: "flex", alignItems: "center", justifyContent: "center",
                            background: `${ac}14`, color: ac,
                          }}><Ikon size={15} /></span>
                        )}
                        <span style={{ flex: 1, minWidth: 0 }}>
                          <span style={{ display: "block", fontSize: "14px", fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                            {okuma ? e.baslik : `“${e.sorgu}”`}
                          </span>
                          <span style={{ display: "block", fontSize: "11.5px", color: theme.textSecondary, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                            {okuma
                              ? (ayniYer ? e.bas.etiket : `${e.bas?.etiket || ""} → ${e.bitis?.etiket || ""}`)
                              : (e.ayrinti || "Arama")}
                          </span>
                        </span>
                        <span style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "3px", flexShrink: 0 }}>
                          <span style={{ fontSize: "11.5px", color: theme.textSecondary }}>{saatYazi(e.z)}</span>
                          {/* Süre ve bu oturumda okunan sayfa: "22 dk · 12 s." */}
                          {okuma && (() => {
                            const sf = sayfaAcik ? oturumSayfaSayisi(e, okunanHam) : 0
                            const parca = [sureAcik && sureYazi(e.sure), sf > 0 && `${sf} s.`].filter(Boolean)
                            return parca.length ? (
                              <span title={sf > 0 ? `${sf} sayfa okundu` : undefined} style={{
                                fontSize: "10.5px", fontWeight: 700, color: ac, whiteSpace: "nowrap",
                                background: `${ac}14`, borderRadius: "999px", padding: "1px 7px",
                              }}>{parca.join(" · ")}</span>
                            ) : null
                          })()}
                        </span>
                      </div>

                      {/* AÇILAN KISIM — köprüler + tek kayıt silme */}
                      {acikMi && (
                        <div style={{ padding: "0 14px 12px" }}>
                          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "8px" }}>
                            {okuma ? (ayniYer ? (
                              <UcKarti ikon={Bookmark} etiket="Okunan yer" metin={e.bitis.etiket} tam onClick={() => git(e, "bitis")} />
                            ) : (
                              <>
                                <UcKarti ikon={CircleDot} etiket="Başlangıç" metin={e.bas.etiket} onClick={() => git(e, "bas")} />
                                <UcKarti ikon={Bookmark} etiket="Bitiş" metin={e.bitis.etiket} onClick={() => git(e, "bitis")} />
                              </>
                            )) : (
                              <UcKarti ikon={Search} etiket="Aramayı tekrarla" metin={e.sorgu} tam onClick={() => git(e)} />
                            )}
                          </div>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "8px" }}>
                            <span style={{ fontSize: "11px", color: theme.textSecondary }}>
                              {okuma ? `${saatYazi(e.z)} – ${saatYazi(e.son || e.z)}` : ""}
                            </span>
                            <button onClick={() => sil([e.id], "Kayıt silindi")} style={{
                              display: "inline-flex", alignItems: "center", gap: "4px", padding: "4px 8px",
                              borderRadius: "999px", border: "none", background: "transparent", cursor: "pointer",
                              fontFamily: "inherit", fontSize: "11.5px", color: theme.textSecondary,
                            }}>
                              <Trash2 size={12} /> Sil
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
            )
          })}

          {liste.length > 0 && !secim && (
            <p style={{ fontSize: "11px", color: theme.textSecondary, textAlign: "center", margin: "6px 0 0" }}>
              Bir kayda basılı tutarak birden fazlasını seçebilirsiniz.
            </p>
          )}
        </>
      )}

      {/* ── KAYIT DURUMU (teşhis) — YORUMDA (4 Ekim 2026: sorun çözüldü).
          Okuma kaydının son adımı + depo doluluğu; bir eser kaydolmazsa hangi
          adımda kaldığı buradan okunur. Gerekirse aşağıdaki bloğu yorumdan
          çıkarın ve importtaki gecmisTeshisOku, depoBoyutu'yu geri ekleyin.
      {acik && (() => {
        const t = gecmisTeshisOku()
        const mb = depoBoyutu() / (1024 * 1024)
        const dolu = mb > 4.5
        return (
          <div style={{
            marginTop: "18px", fontSize: "10.5px", lineHeight: 1.6, textAlign: "center",
            color: t?.hata || dolu ? "#c0392b" : theme.textSecondary, opacity: t?.hata || dolu ? 1 : 0.75,
          }}>
            {t && <>Kayıt durumu: {saatYazi(t.z)} · {t.olay}{t.ayrinti ? ` · ${t.ayrinti}` : ""}<br /></>}
            Tarayıcı deposu: {mb.toFixed(2)} MB{dolu ? " — dolmak üzere; Ayarlar → Veriler'den yer açın" : ""}
          </div>
        )
      })()}

      */}

      {/* ── GERİ AL bildirimi ── */}
      {geriAl && (
        <div style={{
          position: "fixed", left: "50%", transform: "translateX(-50%)",
          bottom: "calc(18px + env(safe-area-inset-bottom))", zIndex: 120,
          display: "flex", alignItems: "center", gap: "10px",
          padding: "6px 6px 6px 14px", borderRadius: "999px",
          background: theme.surface, border: `1px solid ${ac}`, boxShadow: "0 6px 20px rgba(0,0,0,0.22)",
          fontSize: "13px", whiteSpace: "nowrap",
        }}>
          {geriAl.metin}
          <button onClick={() => { gecmisGeriKoy(geriAl.kayitlar); setGeriAl(null) }} style={{ ...hap(true), padding: "5px 11px" }}>
            <RotateCcw size={13} /> Geri al
          </button>
        </div>
      )}
    </div>
  )
}
