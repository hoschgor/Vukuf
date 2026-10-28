/* VUKUF — MENÜ GİBİ BAR ("orta" bar konumu)
   src/components/OrtaMenu.jsx

   28 Ekim 2026 — kullanıcı: "Android'de alttan Google araması çıkıyor, bar kapanıyor;
   bardaki hiçbir öğe kullanılamıyor bazen. Bar açıkken öğeler ortalansın, arka hafif
   kararsın, öğeler güzel bir çerçeve içinde görünsün; çift dokunmayla açılsın, başka
   yere dokununca kapansın." Ardından: "Kur'an-ı Kerîm ekranında da yapalım; menüyü
   tezhip çizgileri, dallarla süsleyelim, öğeler biraz büyüsün, arka biraz daha kapansın.
   Menü modundaysak altta bilgi şeridi olsun/olmasın ayarı; içerikleri bar öğelerinin
   açık/kapalı ayarından gelsin. İki kez dokununca seçili metin gidebiliyor, telefonun
   'Kopyala' çubuğu da görüntüye engel olabiliyor."

   OkumaEkrani ve KuranOkuma bu dosyayı ORTAK kullanır:
     • barKonumOku / barKonumYaz — "ust" | "alt" | "orta". Üst/Alt iki ekranda ORTAK
       anahtarda ("vukuf-bar-konum"); "orta" ayrı bayrakta ("vukuf-bar-orta") → orta'dan
       çıkınca önceki Üst/Alt tercihi geri gelir.
     • useOrtaBilgi        — alt bilgi şeridi açık mı (ortak, varsayılan açık)
     • useOrtaMenu         — açık/kapalı, çift dokunma/tıklama, Esc, ilk açılış notu,
                             panel açılınca kapanma, SEÇİMİ KORUMA
     • OrtaMenuCercevesi   — perde + tezhipli, dallı çerçeve (içine ekranın Bar'ı konur)
     • BilgiSeridi         — altta yarı saydam bilgi şeridi
     • OrtaIpucu           — "iki kez dokunabilirsiniz" notu
     • BarKonumSecici      — Ayarlar'daki Üst · Alt · Menü + bilgi şeridi anahtarı

   ── SEÇİMİ KORUMA ─────────────────────────────────────────────────────────────
   Telefonda iki kez dokunmak, ilk dokunuşta metin seçimini kaldırıyor. Bu yüzden seçim
   olduğu ANDA (selectionchange) Range olarak saklanır; seçim kalktıktan sonra kısa süre
   (SECIM_TAZE_MS) içinde menü açılırsa korunur: metin CSS Custom Highlight ile
   işaretli kalır, menünün başında gösterilir ve görsel gibi işler onu kullanır.
   Menü açılınca tarayıcı seçimi BİLEREK kaldırılır: telefonun "Kopyala / Paylaş"
   çubuğu ve alttaki Google araması menünün önünü kapatmasın. Menü, seçili yerin
   üstüne değil öbür yarıya açılır. */

import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from "react"
import { hexHsl, hsl } from "./rafGorselleri"
import IosSwitch from "./IosSwitch"

export const ORTA_ANAHTAR = "vukuf-bar-orta"
export const ORTA_BILGI_ANAHTAR = "vukuf-orta-bilgi"
const KONUM_ANAHTAR = "vukuf-bar-konum"
const IPUCU_ANAHTAR = "vukuf-orta-ipucu"
const IPUCU_SAYISI = 3
const CIFT_ARALIK_MS = 400      // iki dokunuş arası en çok (olay zamanıyla)
const CIFT_MESAFE = 40          // iki dokunuş arası en çok (px)
const SECIM_TAZE_MS = 1500      // seçim kalktıktan sonra bu süre içinde açılırsa korunur
const VURGU_ADI = "vukuf-korunan-secim"

/** Menüde bar öğeleri bu oranda büyür (arayüz boyutunun üstüne) */
export const ORTA_OLCEK = 1.12
/** Perdenin koyuluğu */
const PERDE = 0.34

/* Çift dokunmanın SAYILMADIĞI yerler (düğmeler, alanlar, paneller, menünün kendisi) */
const DISARI = "button, a, input, textarea, select, label, [role=dialog], [role=button], .okuma-panel, .vukuf-panel, .okuma-bar, .mushaf-bar"

// ── KONUM ────────────────────────────────────────────────────────────────────
export function barKonumOku() {
  try {
    if (localStorage.getItem(ORTA_ANAHTAR) === "1") return "orta"
    return localStorage.getItem(KONUM_ANAHTAR) || "alt"
  } catch { return "alt" }
}
export function barKonumYaz(k) {
  try {
    localStorage.setItem(ORTA_ANAHTAR, k === "orta" ? "1" : "0")
    if (k !== "orta") localStorage.setItem(KONUM_ANAHTAR, k)
  } catch { /* yoksay */ }
}

// ── BİLGİ ŞERİDİ AYARI ──────────────────────────────────────────────────────
export function useOrtaBilgi() {
  const [acik, setAcik] = useState(() => {
    try { return localStorage.getItem(ORTA_BILGI_ANAHTAR) !== "0" } catch { return true }
  })
  useEffect(() => {
    try { localStorage.setItem(ORTA_BILGI_ANAHTAR, acik ? "1" : "0") } catch { /* yoksay */ }
  }, [acik])
  return [acik, setAcik]
}

// ── SEÇİM VURGUSU (CSS Custom Highlight; desteklemeyen tarayıcıda sessizce yok) ──
function vurgula(aralik) {
  try {
    if (typeof CSS === "undefined" || !CSS.highlights || typeof Highlight === "undefined") return
    CSS.highlights.set(VURGU_ADI, new Highlight(aralik))
  } catch { /* yoksay */ }
}
function vurguyuKaldir() {
  try { if (typeof CSS !== "undefined" && CSS.highlights) CSS.highlights.delete(VURGU_ADI) } catch { /* yoksay */ }
}

/**
 * useOrtaMenu — menü gibi barın bütün davranışı.
 * @param aktif        bar konumu "orta" mı
 * @param engelli      () => bool — true iken çift dokunma menüyü AÇMAZ (panel açık vb.)
 * @param haric        (el) => bool — bu öğeye dokunuş sayılmaz (ör. lügat penceresinin içi)
 * @param secimKapsami seçim bu seçiciye uyan bir öğenin içindeyse korunur (ör. "[data-satir]")
 * @param metinAl      (selection) => string — seçilen metni ayıklar (yoksa toString)
 * @param acilinca     menü açılırken çağrılır (ör. açık lügat penceresini kapat)
 * @param kapatanlar   bool dizisi — biri KAPALIDAN AÇIĞA geçince menü kapanır (paneller)
 */
export function useOrtaMenu({ aktif, engelli, haric, secimKapsami = null, metinAl = null, acilinca, kapatanlar = [] }) {
  const [acik, setAcik] = useState(false)
  const [ipucu, setIpucu] = useState(false)
  const [korunan, setKorunan] = useState(null)      // { metin, ust, alt } | null
  const [konum, setKonum] = useState("orta")         // menü ekranın neresinde: ust | orta | alt
  const acilisRef = useRef(0)
  const secimRef = useRef(null)                      // { aralik, metin, bitti }
  const acikRef = useRef(false)
  acikRef.current = acik
  // Her render'da tazelenen geri çağırmalar (dinleyiciler yeniden kurulmasın)
  const cb = useRef({})
  cb.current = { engelli, haric, metinAl, acilinca }

  // Konum "orta"dan çıkınca menü kapanır
  useEffect(() => { if (!aktif) { setAcik(false); setIpucu(false) } }, [aktif])

  // Açık → kapalı: seçim vurgusu da kalkar
  useEffect(() => {
    if (acik) return
    vurguyuKaldir()
    setKorunan(null)
  }, [acik])
  useEffect(() => () => vurguyuKaldir(), [])

  // SEÇİMİ İZLE
  useEffect(() => {
    if (!aktif) return
    const izle = () => {
      if (acikRef.current) return
      const sel = window.getSelection ? window.getSelection() : null
      if (!sel) return
      if (sel.rangeCount && !sel.isCollapsed) {
        const r = sel.getRangeAt(0)
        const kok = r.commonAncestorContainer
        const el = kok.nodeType === 1 ? kok : kok.parentElement
        if (secimKapsami && !(el?.closest?.(secimKapsami) || el?.querySelector?.(secimKapsami))) return
        let metin = ""
        try { metin = cb.current.metinAl ? cb.current.metinAl(sel) : sel.toString() } catch { metin = "" }
        metin = String(metin || "").replace(/\s+/g, " ").trim()
        if (metin) secimRef.current = { aralik: r.cloneRange(), metin, bitti: null }
      } else if (secimRef.current && secimRef.current.bitti == null) {
        secimRef.current.bitti = Date.now()
      }
    }
    document.addEventListener("selectionchange", izle)
    return () => document.removeEventListener("selectionchange", izle)
  }, [aktif, secimKapsami])

  const ac = useCallback(() => {
    const s = secimRef.current
    let k = null, yer = "orta"
    if (s && (s.bitti == null || Date.now() - s.bitti < SECIM_TAZE_MS)) {
      let rect = null
      try { rect = s.aralik.getBoundingClientRect() } catch { rect = null }
      k = { metin: s.metin }
      vurgula(s.aralik)
      if (rect && rect.height) {
        // Seçili yer ekranın hangi yarısındaysa menü ÖBÜR yarıya açılır
        const h = window.innerHeight || 800
        const orta = (rect.top + rect.bottom) / 2
        yer = orta < h / 2 ? "alt" : "ust"
      }
    }
    secimRef.current = null
    // Telefonun "Kopyala…" çubuğu ve alttaki arama menünün önünü kapatmasın
    try { window.getSelection()?.removeAllRanges() } catch { /* yoksay */ }
    acilisRef.current = Date.now()
    try { cb.current.acilinca?.() } catch { /* yoksay */ }
    setKorunan(k)
    setKonum(yer)
    setIpucu(false)
    setAcik(true)
  }, [])
  // Açan dokunuşun "hayalet tıklaması" perdeye düşüp menüyü hemen kapatmasın
  const kapat = useCallback(() => {
    if (Date.now() - acilisRef.current < 400) return
    setAcik(false)
  }, [])
  const hemenKapat = useCallback(() => setAcik(false), [])
  const secimiBirak = useCallback(() => { vurguyuKaldir(); setKorunan(null) }, [])

  // Bir panel / mod AÇILINCA menü kapanır (yalnız kapalı→açık geçişi)
  const oncekiRef = useRef(kapatanlar)
  useEffect(() => {
    const once = oncekiRef.current
    oncekiRef.current = kapatanlar
    if (acikRef.current && kapatanlar.some((v, i) => v && !once[i])) setAcik(false)
  })

  // Esc
  useEffect(() => {
    if (!acik) return
    const tus = (e) => { if (e.key === "Escape") setAcik(false) }
    window.addEventListener("keydown", tus)
    return () => window.removeEventListener("keydown", tus)
  }, [acik])

  // İlk birkaç açılışta kısa not
  useEffect(() => {
    if (!aktif) return
    let sayi = 0
    try { sayi = parseInt(localStorage.getItem(IPUCU_ANAHTAR) || "0", 10) || 0 } catch { /* yoksay */ }
    if (sayi >= IPUCU_SAYISI) return
    try { localStorage.setItem(IPUCU_ANAHTAR, String(sayi + 1)) } catch { /* yoksay */ }
    setIpucu(true)
    const t = setTimeout(() => setIpucu(false), 3500)
    return () => clearTimeout(t)
  }, [aktif])

  // ÇİFT DOKUNMA / ÇİFT TIKLAMA — PENCERE düzeyinde, yakalama evresinde. Kaydırma kabında
  // dinlenince, ilk dokunuşun açtığı bir pencerenin (lügat, kelime/âyet) saydam perdesine
  // düşen ikinci dokunuş sayılmıyordu (tarayıcıda doğrulandı).
  useEffect(() => {
    if (!aktif) return
    let bas = null, son = null, sonDokunma = -1e9
    const sayilmaz = (el) => {
      if (acikRef.current) return true
      try { if (cb.current.engelli?.()) return true } catch { /* yoksay */ }
      try { if (el && cb.current.haric?.(el)) return true } catch { /* yoksay */ }
      return !!el?.closest?.(DISARI)
    }
    // ZAMAN: olayın OLUŞTUĞU an (e.timeStamp), işlendiği an değil. Mushafta ilk dokunuş
    // (kelime) ağır bir çizim başlatıyor; ikinci dokunuş ancak o bitince işleniyor ve
    // Date.now() ile aralık 350 ms'yi aşıp çift dokunma kaçıyordu (tarayıcıda doğrulandı).
    const dene = (x, y, el, simdi) => {
      if (sayilmaz(el)) { son = null; return false }
      if (son && simdi - son.t < CIFT_ARALIK_MS && Math.abs(x - son.x) < CIFT_MESAFE && Math.abs(y - son.y) < CIFT_MESAFE) {
        son = null
        ac()
        return true
      }
      son = { x, y, t: simdi }
      return false
    }
    const basla = (e) => {
      const t = e.touches[0]
      bas = (t && e.touches.length === 1) ? { x: t.clientX, y: t.clientY, t: e.timeStamp } : null
    }
    const bitir = (e) => {
      sonDokunma = e.timeStamp
      const t = e.changedTouches[0], b = bas
      bas = null
      if (!b || !t) return
      if (Math.abs(t.clientX - b.x) > 10 || Math.abs(t.clientY - b.y) > 10 || e.timeStamp - b.t > 300) { son = null; return }
      // İkinci dokunuşun tıklaması iptal: açılan perdeye ya da bir kelimeye düşmesin
      if (dene(t.clientX, t.clientY, e.target, e.timeStamp) && e.cancelable) e.preventDefault()
    }
    const tikla = (e) => {
      if (e.timeStamp - sonDokunma < 800) return   // dokunmanın ürettiği tıklama zaten sayıldı
      dene(e.clientX, e.clientY, e.target, e.timeStamp)
    }
    // Masaüstü: çift tıklama kelime SEÇMESİN (önceki seçim korunabilsin)
    const fareBas = (e) => {
      if (e.detail >= 2 && !sayilmaz(e.target)) e.preventDefault()
    }
    window.addEventListener("touchstart", basla, { capture: true, passive: true })
    window.addEventListener("touchend", bitir, { capture: true, passive: false })
    window.addEventListener("click", tikla, true)
    window.addEventListener("mousedown", fareBas, true)
    return () => {
      window.removeEventListener("touchstart", basla, { capture: true })
      window.removeEventListener("touchend", bitir, { capture: true })
      window.removeEventListener("click", tikla, true)
      window.removeEventListener("mousedown", fareBas, true)
    }
  }, [aktif, ac])

  return { acik, ac, kapat, hemenKapat, ipucu, korunan, secimiBirak, konum }
}

// ── SÜSLER ──────────────────────────────────────────────────────────────────
/* 28 Ekim 2026 (4. tasarım) — kullanıcının örnek görsellerine göre: çifte altın
   cetvelli kartuş; yanlarda kenar sivrilip dışa doğru bir HATÂYÎ PALMETİ (beş
   sivri yaprak, içleri temanın renginde), üstte ve altta küçük palmet tepelik,
   köşelerde rûmî kıvrımlar, kenar boyunca ince dallar. Süsler DOLGULU ve altın
   GRADYANLI (yaldız hissi), koyu altın kontur. Yaprak içleri temanın vurgu rengi
   (sıcak kahve vurgulu temalarda lâcivert — örnekteki Sepya gibi). */

/** Temaya göre altın ve süs renkleri */
export function altinTonlari(theme) {
  const [, , bl] = hexHsl(theme?.background || "#ffffff")
  const koyu = bl < 0.45
  const [ah, as] = hexHsl(theme?.accent || "#a5662b")
  // Kahve/turuncu vurgu (Sepya, Kehribar…) altınla karışır → lâcivert kullan
  const sicakKahve = ah >= 15 && ah <= 50
  const h = sicakKahve ? 205 : ah
  const s = sicakKahve ? 0.5 : Math.max(0.42, Math.min(0.7, as + 0.08))
  return {
    koyu,
    altinAcik: koyu ? "#f4dd9c" : "#ecd38e",
    altin: koyu ? "#d6b25c" : "#c99e40",
    altinKoyu: koyu ? "#8f6a2a" : "#8a6322",
    cizgi: koyu ? "#cfa955" : "#a87e2c",
    altinSoluk: koyu ? "rgba(214,178,92,0.42)" : "rgba(168,126,44,0.35)",
    renk: hsl(h, s, koyu ? 0.52 : 0.42),
    renkAcik: hsl(h, s * 0.9, koyu ? 0.7 : 0.62),
    renkKoyu: hsl(h, s, koyu ? 0.34 : 0.28),
  }
}

/* Sivri yaprak (rûmî/hatâyî yaprağı): dip (0,0), uç (bk, -L). bk: ucun yana kıvrılması */
function yaprakYolu(L, w, bk = 0) {
  return `M0 0 C${w} ${-L * 0.05} ${w * 1.15} ${-L * 0.45} ${w * 0.45 + bk * 0.4} ${-L * 0.74}`
    + ` C${w * 0.2 + bk * 0.7} ${-L * 0.86} ${bk * 0.9} ${-L * 0.93} ${bk} ${-L}`
    + ` C${bk * 0.6 - w * 0.12} ${-L * 0.9} ${-w * 0.3 + bk * 0.3} ${-L * 0.84} ${-w * 0.5 + bk * 0.25} ${-L * 0.72}`
    + ` C${-w * 1.15} ${-L * 0.45} ${-w} ${-L * 0.05} 0 0 Z`
}
function SivriYaprak({ L, w, bk = 0, aci = 0, x = 0, y = 0, ic = true, a, g }) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${aci})`}>
      <path d={yaprakYolu(L, w, bk)} fill={`url(#${g}-a)`} stroke={a.altinKoyu} strokeWidth="0.7" strokeLinejoin="round" />
      {ic && <path d={yaprakYolu(L * 0.66, w * 0.5, bk * 0.6)} transform={`translate(0 ${-L * 0.1})`}
        fill={`url(#${g}-r)`} stroke={a.renkKoyu} strokeWidth="0.35" />}
    </g>
  )
}

/* HATÂYÎ PALMETİ — dip (0,0), yukarı bakar. 5 yaprak + kadeh. */
function Palmet({ a, g, olcek = 1, x = 0, y = 0, aci = 0 }) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${aci}) scale(${olcek})`}>
      <SivriYaprak a={a} g={g} L={14} w={4.6} aci={-78} bk={-3.5} ic={false} />
      <SivriYaprak a={a} g={g} L={14} w={4.6} aci={78} bk={3.5} ic={false} />
      <SivriYaprak a={a} g={g} L={21} w={6.2} aci={-40} bk={-4} />
      <SivriYaprak a={a} g={g} L={21} w={6.2} aci={40} bk={4} />
      <SivriYaprak a={a} g={g} L={28} w={7.4} aci={0} />
      {/* kadeh */}
      <path d="M-8 1.5 C-6 -4 6 -4 8 1.5 C5 4.5 -5 4.5 -8 1.5 Z" fill={`url(#${g}-a)`} stroke={a.altinKoyu} strokeWidth="0.7" />
      <circle cx="0" cy="0.5" r="1.6" fill={a.renk} />
    </g>
  )
}

/* Kıvrık dal: (0,0)'dan başlayıp `yon` yönünde kenar boyunca uzanan ince dal + yapraklar + uçta helezon */
function KenarDali({ a, g, uzun = 46 }) {
  const u = uzun
  return (
    <g>
      <path d={`M0 0 C${u * 0.25} -7 ${u * 0.55} -8 ${u * 0.75} -3.5 C${u * 0.88} -0.5 ${u} -1 ${u} -4.5 C${u} -7.5 ${u * 0.94} -8 ${u * 0.92} -6`}
        fill="none" stroke={a.cizgi} strokeWidth="1.1" strokeLinecap="round" />
      <SivriYaprak a={a} g={g} L={9} w={3} x={u * 0.32} y={-6.2} aci={55} bk={2} ic={false} />
      <SivriYaprak a={a} g={g} L={8} w={2.8} x={u * 0.6} y={-6} aci={-120} bk={-2} ic={false} />
      <circle cx={u * 0.48} cy="-9.5" r="1.3" fill={a.altin} />
    </g>
  )
}

/* UZUN KENAR DALI — üst/alt kenarda köşe ile orta dal arasındaki boşluğu doldurur.
   (0,0)'dan +x yönüne dalgalanarak uzanır (y eksi = dışarı); iki yanda yapraklar,
   ortada küçük bir lâle goncası, uçta helezon. 29 Ekim 2026 — kullanıcı: "alt ve üst
   kısımda boş kalan yerlere dallar atabiliriz, geri kalanı değiştirmeyelim." */
function UzunDal({ a, g, uzun }) {
  const u = Math.max(24, uzun)
  return (
    <g>
      <path d={`M0 -1 C${u * 0.18} -9 ${u * 0.34} -9 ${u * 0.5} -4 C${u * 0.66} 1 ${u * 0.8} 0 ${u * 0.92} -5`
        + ` C${u * 0.97} -8 ${u} -10 ${u * 0.97} -12 C${u * 0.94} -13.5 ${u * 0.91} -11.5 ${u * 0.93} -10`}
        fill="none" stroke={a.cizgi} strokeWidth="1" strokeLinecap="round" />
      <SivriYaprak a={a} g={g} L={8.5} w={2.9} x={u * 0.2} y={-7.4} aci={62} bk={2} ic={false} />
      <SivriYaprak a={a} g={g} L={7.5} w={2.6} x={u * 0.42} y={-5.6} aci={-128} bk={-2} ic={false} />
      <SivriYaprak a={a} g={g} L={7} w={2.5} x={u * 0.76} y={-1.6} aci={-60} bk={-1.5} ic={false} />
      {/* gonca: dal ortasından dışa bakan küçük lâle */}
      <path d={`M${u * 0.5} -4 C${u * 0.52} -8 ${u * 0.55} -10 ${u * 0.57} -12`} fill="none" stroke={a.cizgi} strokeWidth="0.8" strokeLinecap="round" />
      <SivriYaprak a={a} g={g} L={8} w={3.4} x={u * 0.57} y={-11.5} aci={12} />
      <circle cx={u * 0.3} cy="-11.5" r="1.1" fill={a.altin} />
      <circle cx={u * 0.84} cy="-8.5" r="1" fill={a.altin} />
    </g>
  )
}

/* Köşe rûmîsi: köşenin dışına, köşegen yönde (sol üst; öbürleri aynası) */
function KoseRumi({ a, g }) {
  return (
    <g>
      <path d="M8 -1 C2 -9 -8 -8 -9 -1 C-10 5 -4 9 -1 8" fill="none" stroke={a.cizgi} strokeWidth="1.1" strokeLinecap="round" />
      <path d="M-1 8 C-8 2 -9 -8 -1 9" fill="none" stroke={a.cizgi} strokeWidth="0" />
      <SivriYaprak a={a} g={g} L={13} w={4.2} x={0} y={0} aci={-45} bk={0} />
      <SivriYaprak a={a} g={g} L={9} w={3.2} x={1} y={1} aci={-90} bk={-2} ic={false} />
      <SivriYaprak a={a} g={g} L={9} w={3.2} x={1} y={1} aci={0} bk={2} ic={false} />
    </g>
  )
}

const TASMA_YAN = 46, TASMA_UST = 34
const R_KOSE = 16       // çerçeve köşe yarıçapı
const SIVRI = 9         // yan kenarın ortada dışa sivrilme miktarı
const SIVRI_UST = 6     // üst/alt kenarın ortada sivrilme miktarı

/* Çerçeve yolu: köşeleri yuvarlak, kenar ortaları hafifçe dışa sivri (kartuş) */
function kartusYolu(W, H, ic = 0) {
  const R = Math.max(4, R_KOSE - ic), cx = W / 2, cy = H / 2
  const s = Math.max(0, SIVRI - ic * 0.6), su = Math.max(0, SIVRI_UST - ic * 0.6)
  const x0 = ic, y0 = ic, x1 = W - ic, y1 = H - ic
  const yanB = Math.min(30, (H - 2 * R) / 2 - 2)   // sivrinin kenar boyunca yarı boyu
  const ustB = Math.min(34, (W - 2 * R) / 2 - 2)
  return [
    `M${x0 + R} ${y0}`,
    `L${cx - ustB} ${y0}`, `C${cx - ustB * 0.4} ${y0} ${cx - 6} ${y0 - su * 0.4} ${cx} ${y0 - su}`,
    `C${cx + 6} ${y0 - su * 0.4} ${cx + ustB * 0.4} ${y0} ${cx + ustB} ${y0}`,
    `L${x1 - R} ${y0}`, `Q${x1} ${y0} ${x1} ${y0 + R}`,
    `L${x1} ${cy - yanB}`, `C${x1} ${cy - yanB * 0.4} ${x1 + s * 0.4} ${cy - 6} ${x1 + s} ${cy}`,
    `C${x1 + s * 0.4} ${cy + 6} ${x1} ${cy + yanB * 0.4} ${x1} ${cy + yanB}`,
    `L${x1} ${y1 - R}`, `Q${x1} ${y1} ${x1 - R} ${y1}`,
    `L${cx + ustB} ${y1}`, `C${cx + ustB * 0.4} ${y1} ${cx + 6} ${y1 + su * 0.4} ${cx} ${y1 + su}`,
    `C${cx - 6} ${y1 + su * 0.4} ${cx - ustB * 0.4} ${y1} ${cx - ustB} ${y1}`,
    `L${x0 + R} ${y1}`, `Q${x0} ${y1} ${x0} ${y1 - R}`,
    `L${x0} ${cy + yanB}`, `C${x0} ${cy + yanB * 0.4} ${x0 - s * 0.4} ${cy + 6} ${x0 - s} ${cy}`,
    `C${x0 - s * 0.4} ${cy - 6} ${x0} ${cy - yanB * 0.4} ${x0} ${cy - yanB}`,
    `L${x0} ${y0 + R}`, `Q${x0} ${y0} ${x0 + R} ${y0}`, "Z",
  ].join(" ")
}

/* Bütün çerçeve ve süsler: kutunun ölçüsüne göre tek SVG (dokunuş yutmaz) */
function TezhipCerceve({ en, boy, theme, g }) {
  const a = altinTonlari(theme)
  const W = en, H = boy, cx = W / 2, cy = H / 2
  const zeminUst = theme.surface
  return (
    <svg aria-hidden="true" width={W + 2 * TASMA_YAN} height={H + 2 * TASMA_UST}
      viewBox={`${-TASMA_YAN} ${-TASMA_UST} ${W + 2 * TASMA_YAN} ${H + 2 * TASMA_UST}`}
      style={{ position: "absolute", left: -TASMA_YAN, top: -TASMA_UST, pointerEvents: "none", overflow: "visible",
        filter: `drop-shadow(0 10px 22px rgba(0,0,0,${a.koyu ? 0.55 : 0.32}))` }}>
      <defs>
        <linearGradient id={`${g}-a`} x1="0" y1="0" x2="0.3" y2="1">
          <stop offset="0" stopColor={a.altinAcik} />
          <stop offset="0.55" stopColor={a.altin} />
          <stop offset="1" stopColor={a.altinKoyu} />
        </linearGradient>
        <linearGradient id={`${g}-r`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={a.renkAcik} />
          <stop offset="1" stopColor={a.renkKoyu} />
        </linearGradient>
        <radialGradient id={`${g}-z`} cx="0.5" cy="0.42" r="0.75">
          <stop offset="0.55" stopColor={zeminUst} />
          <stop offset="1" stopColor={theme.background} />
        </radialGradient>
        <linearGradient id={`${g}-c`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={a.altinAcik} />
          <stop offset="0.5" stopColor={a.altin} />
          <stop offset="1" stopColor={a.altinKoyu} />
        </linearGradient>
      </defs>

      {/* köşe rûmîleri (zeminin ARKASINDA kalır; yalnız dışa taşan kısmı görünür) */}
      <g transform="translate(2 2) scale(1.35)"><KoseRumi a={a} g={g} /></g>
      <g transform={`translate(${W - 2} 2) scale(-1.35 1.35)`}><KoseRumi a={a} g={g} /></g>
      <g transform={`translate(2 ${H - 2}) scale(1.35 -1.35)`}><KoseRumi a={a} g={g} /></g>
      <g transform={`translate(${W - 2} ${H - 2}) scale(-1.35 -1.35)`}><KoseRumi a={a} g={g} /></g>

      {/* kenar dalları: üst/alt tepeliğin iki yanından ve yan palmetlerin üstünden/altından */}
      {[[cx - 10, 0, 180, 1], [cx + 10, 0, 0, 1], [cx - 10, H, 180, -1], [cx + 10, H, 0, -1]].map(([x, y, d, sy], i) => (
        <g key={"u" + i} transform={`translate(${x} ${y}) scale(${d ? -1 : 1} ${sy})`}><KenarDali a={a} g={g} uzun={Math.min(52, W * 0.16)} /></g>
      ))}
      {/* üst/alt boşluklar: köşe rûmîsinden orta dala doğru uzun dal */}
      {(() => {
        const orta = Math.min(52, W * 0.16)              // orta dalların boyu (yukarıdaki ile aynı)
        const bas = R_KOSE + 12                          // köşe rûmîsinden sonra
        const uzun = cx - 10 - orta - bas - 6            // orta dala değmeden
        if (uzun < 24) return null
        return [[bas, 0, 1, 1], [W - bas, 0, -1, 1], [bas, H, 1, -1], [W - bas, H, -1, -1]].map(([x, y, sx, sy], i) => (
          <g key={"d" + i} transform={`translate(${x} ${y}) scale(${sx} ${sy})`}><UzunDal a={a} g={g} uzun={uzun} /></g>
        ))
      })()}
      {[[0, cy - 12, -1, 1], [0, cy + 12, -1, -1], [W, cy - 12, 1, 1], [W, cy + 12, 1, -1]].map(([x, y, sx, sy], i) => (
        <g key={"y" + i} transform={`translate(${x} ${y}) rotate(${sx < 0 ? -90 : 90}) scale(${sx < 0 ? sy : -sy} 1)`}>
          <KenarDali a={a} g={g} uzun={Math.min(34, H * 0.3)} />
        </g>
      ))}

      {/* zemin + çifte altın cetvel */}
      <path d={kartusYolu(W, H)} fill={`url(#${g}-z)`} stroke={`url(#${g}-c)`} strokeWidth="2.2" />
      <path d={kartusYolu(W, H, 5)} fill="none" stroke={a.cizgi} strokeWidth="0.8" strokeOpacity="0.9" />
      <path d={kartusYolu(W, H, 7.5)} fill="none" stroke={a.altinSoluk} strokeWidth="0.5" />

      {/* yan palmetler (dışa bakar) */}
      <Palmet a={a} g={g} x={-SIVRI + 2} y={cy} aci={-90} olcek={1.15} />
      <Palmet a={a} g={g} x={W + SIVRI - 2} y={cy} aci={90} olcek={1.15} />
      {/* üst / alt tepelik */}
      <Palmet a={a} g={g} x={cx} y={-SIVRI_UST + 1} aci={0} olcek={0.72} />
      <Palmet a={a} g={g} x={cx} y={H + SIVRI_UST - 1} aci={180} olcek={0.72} />
      {/* köşelerde iç süs noktası */}
      {[[11, 11], [W - 11, 11], [11, H - 11], [W - 11, H - 11]].map(([x, y], i) => (
        <path key={"n" + i} transform={`translate(${x} ${y}) rotate(45)`} d="M0 -2.6 L2.6 0 L0 2.6 L-2.6 0 Z" fill={`url(#${g}-a)`} stroke={a.altinKoyu} strokeWidth="0.4" />
      ))}
    </svg>
  )
}

// ── ÇERÇEVE ─────────────────────────────────────────────────────────────────
/**
 * OrtaMenuCercevesi — perde + ortada tezhipli kartuş. İçine ekranın Bar'ı konur.
 * Bar DOM'da hep durur (ölçüm ve geçiş için); kapalıyken görünmez ve dokunulmaz.
 * Zemin ve çerçeve SVG'de çizilir (kartuşun sivri kenarları kutu dışına taşar).
 */
export function OrtaMenuCercevesi({ menu, theme, olcek = 1, etiket = "Okuma menüsü", children }) {
  const { acik, kapat, korunan, secimiBirak, konum } = menu
  const ac = theme.accent
  const a = altinTonlari(theme)
  const g = "vkt" + useId().replace(/[^a-zA-Z0-9]/g, "")
  const kutuRef = useRef(null)
  const [olcu, setOlcu] = useState(null)
  useLayoutEffect(() => {
    const el = kutuRef.current
    if (!el) return
    const olc = () => setOlcu(o => (o && o.en === el.offsetWidth && o.boy === el.offsetHeight ? o : { en: el.offsetWidth, boy: el.offsetHeight }))
    olc()
    if (typeof ResizeObserver === "undefined") return
    const ro = new ResizeObserver(olc)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  const ust = konum === "ust" ? "27%" : konum === "alt" ? "71%" : "50%"
  return (
    <>
      <style>{`::highlight(${VURGU_ADI}) { background-color: ${ac}55; color: inherit; }`}</style>
      <div
        aria-hidden="true"
        onClick={kapat}
        onTouchMove={acik ? (e) => e.preventDefault() : undefined}
        style={{
          position: "fixed", inset: 0, zIndex: 89,
          background: `rgba(0,0,0,${PERDE})`,
          opacity: acik ? 1 : 0, pointerEvents: acik ? "auto" : "none",
          transition: "opacity .22s ease",
        }}
      />
      <div
        ref={kutuRef}
        role="dialog" aria-label={etiket} aria-hidden={!acik}
        style={{
          position: "fixed", left: "50%", top: ust, zIndex: 90,
          transform: `translate(-50%, -50%) scale(${acik ? 1 : 0.95})`,
          // Yanlarda palmetlere yer
          width: `min(calc(100vw - ${2 * TASMA_YAN}px), ${Math.round(460 * olcek)}px)`,
          maxHeight: `min(84vh, calc(100vh - ${2 * TASMA_UST + 40}px))`,
          boxSizing: "border-box", padding: "18px 22px",
          display: "flex", flexDirection: "column",
          color: theme.text,
          opacity: acik ? 1 : 0, pointerEvents: acik ? "auto" : "none",
          transition: "opacity .22s ease, transform .22s ease, top .22s ease",
        }}
      >
        {olcu && <TezhipCerceve en={olcu.en} boy={olcu.boy} theme={theme} g={g} />}

        <div style={{ position: "relative", overflowY: "auto", overscrollBehavior: "contain", padding: "2px", minHeight: 0 }}>
          {korunan && (
            <div style={{
              display: "flex", alignItems: "center", gap: "8px", margin: "0 8px 10px",
              padding: "6px 8px 6px 12px", borderRadius: "10px",
              background: `${ac}10`, border: `1px dashed ${a.altinSoluk}`,
            }}>
              <span style={{ fontSize: `${Math.round(12 * olcek)}px`, color: theme.textSecondary, flexShrink: 0 }}>Seçili:</span>
              <span style={{ flex: 1, minWidth: 0, fontSize: `${Math.round(12.5 * olcek)}px`, color: theme.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontStyle: "italic" }}>
                “{korunan.metin}”
              </span>
              <button onClick={secimiBirak} title="Seçimi bırak" aria-label="Seçimi bırak"
                style={{ flexShrink: 0, border: "none", background: "transparent", color: theme.textSecondary, cursor: "pointer", fontSize: "16px", lineHeight: 1, padding: "2px 4px" }}>
                ×
              </button>
            </div>
          )}
          {children}
        </div>
      </div>
    </>
  )
}

// ── İLK AÇILIŞ NOTU ─────────────────────────────────────────────────────────
export function OrtaIpucu({ menu, theme, metin = "Menüyü açmak için metne iki kez dokunabilirsiniz." }) {
  if (!menu.ipucu || menu.acik) return null
  return (
    <div role="status" style={{
      position: "fixed", left: "50%", top: "calc(env(safe-area-inset-top) + 18px)", transform: "translateX(-50%)",
      zIndex: 499, background: theme.surface, color: theme.text, border: `1px solid ${theme.accent}`,
      borderRadius: "12px", padding: "9px 14px", fontSize: "12.5px", lineHeight: 1.4, maxWidth: "92vw",
      boxShadow: "0 4px 20px rgba(0,0,0,0.18)", pointerEvents: "none", textAlign: "center",
    }}>
      {metin}
    </div>
  )
}

// ── ALT BİLGİ ŞERİDİ ────────────────────────────────────────────────────────
/**
 * BilgiSeridi — menü modunda altta yarı saydam bilgi şeridi. Dokunuşları YUTMAZ
 * (pointerEvents none): altındaki metne dokunulabilir, çift dokunma da çalışır.
 * @param ogeler  React düğümleri (null olanlar atlanır); aralarına ince nokta konur
 * @param onYukseklik (px) — sayfanın alt payı / hap konumları için
 */
export function BilgiSeridi({ theme, ogeler, olcek = 1, altPay = 0, onYukseklik }) {
  const ref = useRef(null)
  const dolu = (ogeler || []).filter(Boolean)
  const cbRef = useRef(onYukseklik)
  cbRef.current = onYukseklik
  const altPayRef = useRef(altPay)
  altPayRef.current = altPay
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) { cbRef.current?.(0); return }
    const olc = () => {
      const r = el.getBoundingClientRect()
      cbRef.current?.(Math.max(0, Math.ceil((window.innerHeight || 0) - r.top) - altPayRef.current))
    }
    olc()
    let ro
    try { ro = new ResizeObserver(olc); ro.observe(el) } catch { ro = null }
    window.addEventListener("resize", olc)
    return () => { try { ro && ro.disconnect() } catch { /* yoksay */ }; window.removeEventListener("resize", olc) }
  }, [dolu.length, altPay])
  useEffect(() => () => cbRef.current?.(0), [])
  if (!dolu.length) return null
  return (
    <div ref={ref} aria-label="Okuma bilgisi" style={{
      position: "fixed", left: "50%", transform: "translateX(-50%)",
      // altPay: altta başka bir çubuk varsa (mushafta oynatıcı) onun üstünde durur
      // zIndex 70: sûre menüsü / içindekiler (80+) ve paneller şeridin ÜSTÜNDE kalır
      bottom: `calc(max(6px, env(safe-area-inset-bottom)) + ${altPay}px)`, zIndex: 70,
      display: "flex", alignItems: "center", gap: "8px", maxWidth: "calc(100vw - 24px)", boxSizing: "border-box",
      padding: `${Math.round(4 * olcek)}px ${Math.round(12 * olcek)}px`, borderRadius: "999px",
      background: `${theme.surface}c4`, border: `1px solid ${theme.accent}30`,
      backdropFilter: "blur(6px)", WebkitBackdropFilter: "blur(6px)",
      color: theme.accent, fontSize: `${Math.round(11 * olcek)}px`, whiteSpace: "nowrap",
      pointerEvents: "none", opacity: 0.92,
    }}>
      {dolu.map((o, i) => (
        <span key={i} style={{ display: "flex", alignItems: "center", gap: "8px", minWidth: 0 }}>
          {i > 0 && <span aria-hidden="true" style={{ width: "3px", height: "3px", borderRadius: "50%", background: theme.accent, opacity: 0.5, flexShrink: 0 }} />}
          <span style={{ display: "flex", alignItems: "center", gap: "4px", minWidth: 0, overflow: "hidden", textOverflow: "ellipsis" }}>{o}</span>
        </span>
      ))}
    </div>
  )
}

// ── AYARLAR: BAR KONUMU ─────────────────────────────────────────────────────
function MenuSimgesi({ boy }) {
  return (
    <svg width={boy} height={boy} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
      <rect x="3.5" y="5" width="17" height="14" rx="3" />
      <path d="M8 10h.01M12 10h.01M16 10h.01M8 14h.01M12 14h.01M16 14h.01" />
    </svg>
  )
}

/**
 * BarKonumSecici — Üst · Alt · Menü düğmeleri; Menü seçiliyken açıklama ve
 * "Alt bilgi şeridi" anahtarı. Simgeler ekranın kendi Ust/Alt simgeleri olarak verilir.
 */
export function BarKonumSecici({ theme, deger, onSec, UstIkon, AltIkon, ikonBoy = 13, yaziBoy = 13, bilgiAcik, onBilgi }) {
  const SECENEK = [
    { k: "ust", ad: "Üst", Ikon: UstIkon },
    { k: "alt", ad: "Alt", Ikon: AltIkon },
    { k: "orta", ad: "Menü", Ikon: null },
  ]
  return (
    <>
      <div style={{ display: "flex", gap: "6px" }}>
        {SECENEK.map(({ k, ad, Ikon }) => (
          <button key={k} onClick={() => onSec(k)} aria-pressed={deger === k} style={{
            flex: 1, padding: "8px 4px", borderRadius: "8px", fontSize: `${yaziBoy}px`, fontFamily: "inherit",
            background: deger === k ? theme.accent : `${theme.accent}15`,
            color: deger === k ? "#fff" : theme.text,
            display: "flex", alignItems: "center", justifyContent: "center", gap: "4px",
            border: "none", cursor: "pointer",
          }}>
            {Ikon ? <Ikon size={ikonBoy} /> : <MenuSimgesi boy={ikonBoy} />}
            {ad}
          </button>
        ))}
      </div>
      {deger === "orta" && (
        <>
          <div style={{ fontSize: `${Math.max(11, yaziBoy - 1.5)}px`, color: theme.textSecondary, lineHeight: 1.45, marginTop: "7px" }}>
            Bar ekranda durmaz; metne iki kez dokununca ortada menü olarak açılır, başka bir yere dokununca kapanır.
          </div>
          <div onClick={() => onBilgi(!bilgiAcik)} role="button" aria-pressed={bilgiAcik} style={{
            width: "100%", padding: "7px 10px", marginTop: "6px", borderRadius: "8px", fontSize: `${yaziBoy}px`,
            color: theme.text, boxSizing: "border-box",
            cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px",
          }}>
            <span>
              Altta bilgi şeridi
              <span style={{ display: "block", fontSize: `${Math.max(10.5, yaziBoy - 2)}px`, color: theme.textSecondary, marginTop: "2px", lineHeight: 1.4 }}>
                Sayfa, süre gibi bilgiler; bar öğelerinin açık/kapalı ayarına göre.
              </span>
            </span>
            <IosSwitch acik={bilgiAcik} theme={theme} boyut={0.82} />
          </div>
        </>
      )}
    </>
  )
}
