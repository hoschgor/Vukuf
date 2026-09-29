import { useEffect, useLayoutEffect, useRef, useState } from "react"
import { Sun, Moon, Pencil } from "lucide-react"
import { useApp, temaTonu } from "../AppContext"
import { themes } from "../styles/themes"
import { mushafYukle, mushafHazirMi } from "../data/mushafVerisi"
import { tecvidAyikla, ozelOkuyusAyikla } from "./MushafKelime"
import MushafAyetRozeti from "./MushafAyetRozeti"
import { dalPaleti } from "./DalSusu"
// Yatay telefonda kart düzeni iki sütun, satır düzeni çok sütun (bkz. yatayDuzen.js)
import "./yatayDuzen"

/* ═══════════════════════════════════════════════════════════════════════════
   TEMA SEÇİCİ — CAMİ + MİHRAP + TEZHİP ROZETLERİ (28 Eylül 2026)
   Üç yerde AYNI bileşen:
     • Navbar → AYARLAR → Tema         (duzen="kart")
     • OkumaEkrani → tema paneli        (duzen="satir": dar, 240 px panel)
     • KuranOkuma → tema paneli         (duzen="satir")

   Kullanıcı kararı: "çoğu uygulama bu kartları kullanıyor, bize özgü olmalı".
   Beş taslaktan ikisi seçildi ve birleştirildi:
     ÜSTTE  CAMİ silüeti, ortasında MİHRAP — CANLI ÖNİZLEME — seçili temanın kendi
            renkleriyle besmele, âyet halkası, meal yerine içeriksiz çizgiler
            (uydurma meal yok), lügat rengi, ad kartuşta. Renkler geçişli değişir.
     ALTTA  her tema sekiz yapraklı bir TEZHİP ROZETİ: dış yapraklar zemin,
            iç yapraklar yüzey, çizgiler vurgu, göbek âyet no rengi. Seçili
            rozetin çevresinde yavaş dönen kesikli halka (hareket azaltma
            tercihinde durur).

   Ton anahtarı: Aydınlık · Karanlık · Otomatik (mantık AppContext'te).
   Otomatik'te iki rozet grubu; her tonun favorisi halkalı. Öbür tonun bir
   rozetine dokunulunca önizleme onu gösterir ve "… uygulanacak" notu çıkar.
   ═══════════════════════════════════════════════════════════════════════════ */

// Sıra ve açıklamalar themes.js'ten (tek kaynak): yeni tema eklemek için
// yalnız oraya bir nesne yazmak yeter, seçici kendiliğinden gösterir.
const TEMALAR = Object.entries(themes).map(([id, t]) => ({ id, aciklama: t.aciklama || "" }))

const TON_ADI = { acik: "Aydınlık", koyu: "Karanlık" }

// "Otomatik" simgesi: yarısı dolu daire. lucide'ın SunMoon'u sürüme göre
// bulunmayabildiği için satır içi çiziliyor (bağımlılıksız).
function OtoSimge({ size = 14 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 3a9 9 0 0 1 0 18z" fill="currentColor" stroke="none" />
    </svg>
  )
}

// dar=true (240 px okuma paneli): simge üstte, ad altta — yan yana "Aydınlık"
// sığmıyor ve "Aydı…" diye kesiliyordu.
function TonAnahtari({ theme, tonModu, tonSec, dar }) {
  const secenekler = [
    { id: "acik", ad: "Aydınlık", Simge: Sun },
    { id: "koyu", ad: "Karanlık", Simge: Moon },
    { id: "oto",  ad: "Otomatik", Simge: OtoSimge },
  ]
  return (
    <div role="radiogroup" aria-label="Tema tonu" style={{
      display: "flex", gap: "3px", padding: "3px", borderRadius: "11px",
      background: theme.background, border: `1px solid ${theme.border}`,
    }}>
      {secenekler.map(({ id, ad, Simge }) => {
        const sec = tonModu === id
        return (
          <button
            key={id}
            role="radio"
            aria-checked={sec}
            onClick={() => tonSec(id)}
            style={{
              flex: 1, minWidth: 0,
              display: "flex", flexDirection: dar ? "column" : "row",
              alignItems: "center", justifyContent: "center", gap: dar ? "2px" : "5px",
              padding: dar ? "5px 2px" : "7px 4px", borderRadius: "8px",
              fontSize: dar ? "10.5px" : "12px", fontWeight: sec ? 600 : 400, fontFamily: "inherit",
              color: sec ? theme.accent : theme.textSecondary,
              background: sec ? theme.surface : "transparent",
              // Açık temada surface = background olabiliyor → seçili hâl kenarla da belli olsun
              border: `1px solid ${sec ? `${theme.accent}55` : "transparent"}`,
              boxShadow: sec ? "0 1px 3px rgba(0,0,0,0.16)" : "none",
              cursor: "pointer", whiteSpace: "nowrap",
            }}
          >
            <Simge size={dar ? 15 : 14} />
            <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>{ad}</span>
          </button>
        )
      })}
    </div>
  )
}


// Rozet halkasının dönüşü ve dokunma geri bildirimi — bir kez eklenir.
const STIL = `
@keyframes vukufRozetDon { to { transform: rotate(360deg) } }
.vukuf-rozet-halka { transform-origin: 32px 32px; animation: vukufRozetDon 26s linear infinite }
.vukuf-rozet-dugme svg.vukuf-rozet { transition: transform .15s ease }
.vukuf-rozet-dugme:active svg.vukuf-rozet { transform: scale(.93) }
@media (prefers-reduced-motion: reduce) { .vukuf-rozet-halka { animation: none } }
`

const GECIS = "fill .35s ease, stroke .35s ease"

/* ── CAMİ ÖNİZLEME ───────────────────────────────────────────────────────
   Kullanıcı: "mihrap çok geniş oldu, üst kısmı camiye benzetip orta kısma
   mihrap çiz; çiçekleri bölüm içlerine al". viewBox 300×262, genişliğe göre
   ölçeklenir. Parçalar ve renkleri (hepsi seçili temadan):
     kubbe · yan kubbeler · kasnak pencereleri · iki kalem minare  → yüzey + vurgu
     cephe (gövde)                                                → yüzey / kenarlık
     kitabe (tema adı)                                            → zemin + vurgu çerçeve
     ORTADA MİHRAP nişi                                           → ZEMİN — içinde besmele,
       âyet halkası, meal yerine içeriksiz çizgiler (uydurma meal yok), lügat parçası
     ROZETLER: ana kubbede, iki yan kanatta ve mihrap köşeliklerinde — seçicideki
       çiçeğin aynısı (RozetSekli), temanın kendi renkleriyle
   Boyamalar `style` ile: tema değişince renkler CSS geçişiyle döner. */
function RozetSekli({ cx, cy, r, t }) {
  const k = r / 32
  const dis = [], ic = []
  for (let i = 0; i < 8; i++) {
    dis.push(<ellipse key={"d" + i} cx="32" cy="13" rx="7.5" ry="12" transform={`rotate(${i * 45} 32 32)`}
      style={{ fill: t.background, stroke: t.border, strokeWidth: 1.2, transition: GECIS }} />)
    ic.push(<ellipse key={"i" + i} cx="32" cy="17.5" rx="4" ry="7" transform={`rotate(${i * 45 + 22.5} 32 32)`}
      style={{ fill: t.surface, stroke: t.accent, strokeWidth: 1.1, transition: GECIS }} />)
  }
  return (
    <g transform={`translate(${cx - r} ${cy - r}) scale(${k})`}>
      {dis}{ic}
      <circle cx="32" cy="32" r="10" style={{ fill: t.background, stroke: t.accent, strokeWidth: 1.6, transition: GECIS }} />
      <circle cx="32" cy="32" r="4" style={{ fill: t.ayetNoRengi, transition: GECIS }} />
    </g>
  )
}

/* Yatık hilal (alem): ağzı SAĞ ÜSTE bakan, 45° eğik. Yerel koordinatta ağız
   +x yönünde: dış çember (0,0) R, iç çember (0.45R,0) 0.82R; iki büyük yay
   kesişim noktalarında birleşiyor. OTURUŞ (kullanıcı örnekleriyle): hilal
   direğin TAM ÜSTÜNDE ORTALI — dış çemberin EN ALT noktası direk ucuna
   (ux,uy) değiyor; o nokta hilalin dolu sırtında kaldığı için (boynuzlar
   ağız yönünden ±54°, alt nokta ağızdan 135° uzakta) direk gövdeye girer. */
function hilalYolu(ux, uy, R, aci = -45) {
  const d = 0.45 * R, r2 = 0.82 * R
  const kx = (R * R - r2 * r2 + d * d) / (2 * d)
  const ky = Math.sqrt(Math.max(0, R * R - kx * kx))
  const cx = ux, cy = uy - R * 0.96   // hafif gömülü: direk ile hilal arasında boşluk kalmasın
  return {
    d: `M${kx} ${-ky} A${R} ${R} 0 1 0 ${kx} ${ky} A${r2} ${r2} 0 1 1 ${kx} ${-ky} Z`,
    transform: `translate(${cx.toFixed(2)} ${cy.toFixed(2)}) rotate(${aci})`,
  }
}

/* ── ÖNİZLEME METİNLERİ ────────────────────────────────────────────────────
   ÂYET (Bakara 2:32) ELLE YAZILMADI: `kuran-mushaf.json`dan, uygulamanın
   kendi yükleyicisiyle (mushafYukle) okunuyor; kelimeler sayfadaki gibi
   tecvid/özel-okuyuş işaretlerinden ayıklanıyor (KuranOkuma'daki panel
   örneğiyle aynı yol). 5 MB'lık veri yalnız Tema bölümü açıkken ve boşta
   yükleniyor; bellekteyse (Kur'ân ekranı açılmışsa) anında geliyor. Yüklenemezse
   (çevrimdışı ilk açılış) niş boş çizgilerle kalıyor — uydurma metin yok.
   SÖZ: İmam Gazâlî, İhyâ — Kitâbü'l-İlm: ilmin fazileti bahsi (ilim kendi zatında
   lezzetlidir, bu yüzden kendisi için istenir; âhiret saadetine de vesiledir). Kısa
   Türkçe ifadesi — birebir tercüme değil, kullanıcı doğrulayacak. Kullanıcı "ağır
   olmasın, ümit verici olsun" dedi (önceki iki söz: "amelsiz ilim cünûndur",
   "yüz sene ilim okusan…"). Ortadaki "saadet" lügat kelimesi, temanın lügat rengiyle. */
const ORNEK_SURE = 2, ORNEK_AYET = 32
let ornekAyetBellek = null   // { kelimeler: [...] } — modül ömrü boyunca bir kez
function ornekAyetMetni(m) {
  const sure = (m || []).find(x => x.id === ORNEK_SURE)
  const ayet = sure && (sure.ayetler || []).find(a => a.no === ORNEK_AYET)
  if (!ayet || !Array.isArray(ayet.kelimeler) || !ayet.kelimeler.length) return null
  const k = ayet.kelimeler.map(kel => {
    try { return ozelOkuyusAyikla(tecvidAyikla(kel).metin).metin.replace(/\s+/g, " ").trim() } catch { return "" }
  }).filter(Boolean)
  return k.length ? k.join(" ") : null
}
function useOrnekAyet(etkin) {
  const [metin, setMetin] = useState(ornekAyetBellek)
  useEffect(() => {
    if (!etkin || metin) return
    let iptal = false
    const al = () => mushafYukle()
      .then(m => { const t = ornekAyetMetni(m); if (t) { ornekAyetBellek = t; if (!iptal) setMetin(t) } })
      .catch(() => {})
    // Bellekteyse hemen; değilse panel açılış animasyonunu bozmamak için biraz sonra
    const z = setTimeout(al, mushafHazirMi() ? 0 : 350)
    return () => { iptal = true; clearTimeout(z) }
  }, [etkin, metin])
  return metin
}

/* Âyet sonu rozetinin bir yarısı — MushafAyetRozeti'nin (GorselOlustur'daki canvas
   sürümüyle aynı yollar) sol parçası. Yan kanatlarda pencere yerine: solda açılış,
   sağda aynalanmış kapanış; mihrabı âyet gibi çerçeveliyor. */
function RozetYarisi({ x, y, k = 1, ayna = false, renk }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${ayna ? -k : k} ${k})`} style={{ fill: renk, transition: GECIS }}>
      <path d="M0 -19 C-11 -18.5 -17 -10 -17 0 C-17 10 -11 18.5 0 19 C-6 13 -6.5 -13 0 -19 Z" opacity=".92" />
      <path d="M-2 -14 C-7 -13.5 -12 -6.5 -12 0 C-12 6.5 -7 13.5 -2 14" fill="none" stroke={renk} strokeWidth=".6" opacity=".45" />
      <path d="M-8 -24 C-9.5 -17 -8 -8.5 -7 0 C-8 8.5 -9.5 17 -8 24" fill="none" stroke={renk} strokeWidth=".8" opacity=".5" />
      <path d="M-2 -19 C1 -22 3 -26 2 -31 C-2 -30 -6 -24 -1 -18.5 Z" />
      <path d="M-2 19 C1 22 3 26 2 31 C-2 30 -6 24 -1 18.5 Z" />
      <path d="M-8 -17 C-12 -18 -15.5 -16.5 -17 -13.5 C-14.5 -13 -12 -14 -10.5 -16 C-11 -13.5 -12.5 -11.5 -15.5 -11 C-12.5 -10 -9 -12 -7.5 -15 Z" opacity=".85" />
      <path d="M-8 17 C-12 18 -15.5 16.5 -17 13.5 C-14.5 13 -12 14 -10.5 16 C-11 13.5 -12.5 11.5 -15.5 11 C-12.5 10 -9 12 -7.5 15 Z" opacity=".85" />
      <path d="M-16.5 -1.8 L-15 0 L-16.5 1.8 L-18 0 Z" opacity=".55" />
      <path d="M-5.5 -7.5 C-7.5 -8.5 -10 -8 -11 -6 C-9 -5.5 -7 -6 -5.5 -7.5 Z" opacity=".7" />
      <path d="M-5.5 7.5 C-7.5 8.5 -10 8 -11 6 C-9 5.5 -7 6 -5.5 7.5 Z" opacity=".7" />
      <circle cx="-12" cy="-22" r="0.9" opacity=".5" /><circle cx="-14.5" cy="-20.5" r="0.5" opacity=".35" />
      <circle cx="-12" cy="22" r="0.9" opacity=".5" /><circle cx="-14.5" cy="20.5" r="0.5" opacity=".35" />
      <circle cx="-9" cy="-3.5" r="0.7" opacity=".55" /><circle cx="-9" cy="3.5" r="0.7" opacity=".55" />
      <path d="M-4 -19 C-6 -24 -9 -27 -14 -27 C-11 -24 -8 -21 -4 -19 Z" opacity=".7" />
      <path d="M-1 -19 C1 -24 3 -27 8 -27 C5 -24 2 -21 -1 -19 Z" opacity=".5" />
      <path d="M-4 19 C-6 24 -9 27 -14 27 C-11 24 -8 21 -4 19 Z" opacity=".7" />
      <path d="M-1 19 C1 24 3 27 8 27 C5 24 2 21 -1 19 Z" opacity=".5" />
    </g>
  )
}

// viewBox ve yerleşim — metin katmanı (HTML) aynı sayılardan % hesaplıyor
const VB_Y = -2, VB_G = 300, VB_Y2 = 340
const ZEMIN = 334
const AYIRAC_Y = 283   // âyet ile söz arasındaki süs dalı
const SOZ_UST = 290
const yuzde = (x, y) => ({ left: `${(x / VB_G) * 100}%`, top: `${((y - VB_Y) / (VB_Y2 - VB_Y)) * 100}%` })

// Sivri yaprak: p kök, a açı, L boy, W yarı en (DalSusu'daki yaprağın küçüğü)
function yaprakYolu(x, y, a, L, W) {
  const dx = Math.cos(a), dy = Math.sin(a), px = -dy, py = dx
  const ux = x + dx * L, uy = y + dy * L
  const c1x = x + dx * L * 0.4 + px * W, c1y = y + dy * L * 0.4 + py * W
  const c2x = x + dx * L * 0.4 - px * W, c2y = y + dy * L * 0.4 - py * W
  const r = (n) => n.toFixed(2)
  return `M${r(x)} ${r(y)} Q${r(c1x)} ${r(c1y)} ${r(ux)} ${r(uy)} Q${r(c2x)} ${r(c2y)} ${r(x)} ${r(y)}Z`
}
function AyiracDali({ y, t }) {
  const { dal, koyu } = dalPaleti(t.accent, t.background)
  const dolgu = koyu ? 0.3 : 0.38, cizgi = koyu ? 0.85 : 0.72
  const s = { transition: GECIS }
  // Simetrik değil: sol kol biraz uzun, yapraklar farklı açılarda; ortada küçük gonca
  const yapraklar = [
    [118, y + 1.2, -2.6, 7, 2.2], [126, y - 1.6, -0.9, 6, 1.9], [136, y + 2.0, 0.9, 6.5, 2.1],
    [164, y - 1.8, -1.2, 6.5, 2.0], [174, y + 1.6, 1.0, 6, 1.9], [182, y - 0.8, -0.35, 7, 2.2],
  ]
  return (
    <g>
      <path d={`M108 ${y + 2} C122 ${y - 5}, 132 ${y + 5}, 146 ${y} M154 ${y} C168 ${y - 5}, 178 ${y + 5}, 192 ${y - 1.5}`}
        style={{ ...s, fill: "none", stroke: dal, strokeWidth: 1.05, strokeLinecap: "round", opacity: 0.85 }} />
      {yapraklar.map(([x, yy, a, L, W], i) => (
        <path key={i} d={yaprakYolu(x, yy, a, L, W)}
          style={{ ...s, fill: dal, fillOpacity: dolgu, stroke: dal, strokeOpacity: cizgi, strokeWidth: 0.6 }} />
      ))}
      <RozetSekli cx={150} cy={y} r={4.2} t={t} />
    </g>
  )
}

function CamiOnizleme({ t, ad }) {
  const f = (fill, stroke, sw, ek) => ({ fill, stroke, strokeWidth: sw, transition: GECIS, ...ek })
  const yuzey = f(t.surface, t.border, 1.2)
  const hat = f(t.surface, t.accent, 1.1)
  const ayet = useOrnekAyet(true)
  // Sûre adı hattı (SureBasligi/MealPopup ile aynı kaynak: surah-name-v2-icon,
  // U+E000 + sûre no). Font yüklenmediyse HİÇ yazılmıyor — PUA glifi yedek yazı
  // tipinde boş kutu çıkarırdı.
  const [hatVar, setHatVar] = useState(false)
  useEffect(() => {
    if (typeof document === "undefined" || !document.fonts) return
    let iptal = false
    document.fonts.load("26px 'surah-name-v2-icon'", "\uE001")
      .then(y => { if (!iptal) setHatVar(!!(y && y.length)) })
      .catch(() => {})
    return () => { iptal = true }
  }, [])

  // Kutu genişliği → yazı boyları (1 birim = gen/300 px). ResizeObserver: panel
  // genişliği değişince (dönme, masaüstü) yazılar çizimle birlikte ölçeklenir.
  const kutuRef = useRef(null)
  const [gen, setGen] = useState(290)
  useEffect(() => {
    const el = kutuRef.current
    if (!el) return
    const olc = () => { const w = el.clientWidth; if (w) setGen(p => (Math.abs(p - w) > 0.5 ? w : p)) }
    olc()
    let ro
    try { ro = new ResizeObserver(olc); ro.observe(el) } catch {}
    return () => { try { ro && ro.disconnect() } catch {} }
  }, [])
  const k = gen / VB_G

  // Âyet nişe sığmazsa (uzun satır kırılımı, font yüklenmeden ölçüm) yazı küçülür
  const ayetRef = useRef(null)
  const [ayetOlcek, setAyetOlcek] = useState(1)
  useLayoutEffect(() => { setAyetOlcek(1) }, [ayet, gen])
  useLayoutEffect(() => {
    const el = ayetRef.current
    if (!el || !ayet) return
    // En fazla %20 küçülür — okunaklılık sınırı (ilk sürümde %62'ye kadar iniyor,
    // kullanıcı "hiç okunmuyor" dedi). Yer darlığı artık alanı büyüterek çözülüyor.
    if (el.scrollHeight > el.clientHeight + 1 && ayetOlcek > 0.8) setAyetOlcek(o => +(o * 0.94).toFixed(3))
  })
  // Kullanıcı: "piksel biraz artmalı, rozet de dengeli büyümeli; 2 satırdan fazla olabilir"
  const ayetFs = Math.max(14, 14.6 * k * ayetOlcek)

  const minare = (x) => (
    <g>
      {/* gövde, iki şerefe, külah, alem */}
      <rect x={x - 6} y="46" width="12" height={ZEMIN - 46} style={yuzey} />
      <rect x={x - 9} y="84" width="18" height="4" rx="1" style={hat} />
      <rect x={x - 9} y="128" width="18" height="4" rx="1" style={hat} />
      <path d={`M${x - 6} 46 L${x} 12 L${x + 6} 46 Z`} style={f(t.accent, t.accent, 1, { fillOpacity: 0.85 })} />
      <line x1={x} y1="12" x2={x} y2="6" style={f("none", t.accent, 1.1)} />
      {/* yatık hilal */}
      <path {...hilalYolu(x, 6.4, 3.1)} style={f(t.accent, "none", 0)} />
    </g>
  )
  const pencere = (x, y, g, h) => (
    <path d={`M${x} ${y + h} L${x} ${y + g / 2} Q${x} ${y}, ${x + g / 2} ${y - 2} Q${x + g} ${y}, ${x + g} ${y + g / 2} L${x + g} ${y + h} Z`}
      style={f(t.background, t.accent, 0.9)} />
  )
  const katman = { position: "absolute", boxSizing: "border-box", pointerEvents: "none" }
  return (
    <div ref={kutuRef} style={{ position: "relative", width: "100%" }}>
      <svg viewBox={`0 ${VB_Y} ${VB_G} ${VB_Y2 - VB_Y}`} width="100%" role="img" aria-label={`${ad} önizlemesi`}
        style={{ display: "block", overflow: "visible", filter: "drop-shadow(0 4px 10px rgba(0,0,0,.12))" }}>
        {minare(20)}
        {minare(280)}

        {/* yan kubbeler + ana kubbe (kasnağıyla) + alem */}
        <path d="M46 112 A32 24 0 0 1 110 112 Z" style={hat} />
        <path d="M190 112 A32 24 0 0 1 254 112 Z" style={hat} />
        <rect x="98" y="88" width="104" height="24" style={yuzey} />
        {[108, 128, 162, 182].map(x => <g key={x}>{pencere(x, 94, 10, 14)}</g>)}
        <path d="M94 90 A56 50 0 0 1 206 90 Z" style={hat} />
        {/* kubbe alemi: direk + iki top + yatık hilal (kubbe içi çiçek kaldırıldı) */}
        <line x1="150" y1="40" x2="150" y2="21" style={f("none", t.accent, 1.4)} />
        <circle cx="150" cy="32" r="2.8" style={f(t.accent, "none", 0)} />
        <circle cx="150" cy="25" r="2" style={f(t.accent, "none", 0)} />
        <path {...hilalYolu(150, 21.5, 7)} style={f(t.accent, "none", 0)} />

        {/* cephe */}
        <rect x="32" y="112" width="236" height={ZEMIN - 112} style={yuzey} />

        {/* kitabe: tema adı */}
        <rect x="100" y="118" width="100" height="20" rx="2" style={f(t.background, t.accent, 1)} />
        <text x="150" y="132.5" textAnchor="middle"
          style={{ fill: t.text, transition: GECIS, fontSize: 12.5, fontWeight: 600, fontFamily: "inherit" }}>
          {ad}
        </text>

        {/* yan kanatlar: çiçek + âyet rozetinin açılış / kapanış yarısı */}
        <RozetSekli cx={49} cy={160} r={12} t={t} />
        <RozetSekli cx={251} cy={160} r={12} t={t} />
        <RozetYarisi x={54} y={246} k={0.95} renk={t.ayetNoRengi || t.accent} />
        <RozetYarisi x={246} y={246} k={0.95} ayna renk={t.ayetNoRengi || t.accent} />

        {/* MİHRAP: çerçeve (pîştak) + sivri kemerli niş — metin için genişletildi */}
        <rect x="68" y="144" width="164" height={ZEMIN - 144} style={f(t.surface, t.accent, 1.1)} />
        <path d={`M78 ${ZEMIN} L78 190 C78 168, 124 162, 150 150 C176 162, 222 168, 222 190 L222 ${ZEMIN} Z`}
          style={f(t.background, t.accent, 1.1)} />
        <RozetSekli cx={80} cy={156} r={7} t={t} />
        <RozetSekli cx={220} cy={156} r={7} t={t} />

        {/* âyet henüz yüklenmediyse yer tutucu çizgiler */}
        {!ayet && <>
          <rect x="100" y="198" width="100" height="4" rx="2" style={f(t.textSecondary, "none", 0, { opacity: 0.35 })} />
          <rect x="108" y="210" width="84" height="4" rx="2" style={f(t.textSecondary, "none", 0, { opacity: 0.35 })} />
          <rect x="116" y="222" width="68" height="4" rx="2" style={f(t.textSecondary, "none", 0, { opacity: 0.35 })} />
        </>}

        {/* ÂYET · SÖZ AYIRACI — minik dal (kullanıcı: "kırmızı çizgi yerine minik
            bir dal, tema renkleriyle; alttaki âyet meali sanılmasın"). Renk, meal
            penceresindeki dal süsüyle aynı hesaptan (dalPaleti). */}
        <AyiracDali y={AYIRAC_Y} t={t} />

        {/* zemin çizgisi */}
        <line x1="2" y1={ZEMIN + 0.5} x2="298" y2={ZEMIN + 0.5} style={f("none", t.border, 1.4)} />
      </svg>

      {/* ── NİŞ İÇİ METİN KATMANI (HTML — satır kırma için) ── */}
      {ayet && (
        <div ref={ayetRef} lang="ar" dir="rtl" style={{
          ...katman, ...yuzde(81, 172), width: `${(138 / VB_G) * 100}%`, height: `${((AYIRAC_Y - 6 - 172) / (VB_Y2 - VB_Y)) * 100}%`,
          display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden",
          textAlign: "center", color: t.text, transition: "color .35s ease",
          fontFamily: "'KFGQPC Uthmanic', serif", fontSize: `${ayetFs}px`, lineHeight: 1.7,
          unicodeBidi: "isolate",
        }}>
          <span>
            {ayet}
            {" "}
            <span style={{ display: "inline-block", verticalAlign: "middle" }}>
              <MushafAyetRozeti sayi={ORNEK_AYET} size={ayetFs * 1.9} ac={t.ayetNoRengi || t.accent} />
            </span>
            {/* Rozetin yanında sûre adı hattı ("Sûretü'l-Bakara") — kaynak gösterir gibi */}
            {hatVar && (
              <span style={{
                display: "inline-block", verticalAlign: "middle", whiteSpace: "nowrap",
                fontFamily: "'surah-name-v2-icon', serif", fontSize: `${ayetFs * 1.55}px`, lineHeight: 1,
                color: t.accent, opacity: 0.9, transition: "color .35s ease", marginInlineStart: `${ayetFs * 0.35}px`,
              }}>{String.fromCodePoint(0xE000 + ORNEK_SURE)}</span>
            )}
          </span>
        </div>
      )}
      {/* Söz nişin DİBİNE yaslı (kullanıcı: "alttaki yazı en altta bitsin") —
          âyetle arasında süs dalı var, meal sanılmasın diye. */}
      <div style={{
        ...katman, ...yuzde(82, SOZ_UST), width: `${(136 / VB_G) * 100}%`,
        height: `${((ZEMIN - 5 - SOZ_UST) / (VB_Y2 - VB_Y)) * 100}%`,
        display: "flex", flexDirection: "column", justifyContent: "flex-end",
        textAlign: "center", color: t.textSecondary, transition: "color .35s ease",
        fontSize: `${Math.max(9.5, 8.6 * k)}px`, lineHeight: 1.35, fontFamily: "inherit",
      }}>
        <div style={{ color: t.text, transition: "color .35s ease" }}>
          İlim bizzat lezzetlidir; âhiret{" "}
          <span style={{ color: t.lugatHighlight, borderBottom: `1px dotted ${t.lugatHighlight}`, transition: "color .35s ease" }}>saadetine</span>
          {" "}de vesiledir.
        </div>
        <div style={{ fontSize: `${Math.max(8.5, 7.2 * k)}px`, marginTop: `${1.5 * k}px`, opacity: 0.85 }}>İmam Gazâlî · İhyâ, Kitâbü'l-İlm</div>
      </div>
    </div>
  )
}

/* ── TEZHİP ROZETİ ───────────────────────────────────────────────────────
   Dış 8 yaprak: zemin / kenarlık · iç 8 yaprak (yarım adım dönük): yüzey /
   vurgu · göbek: zemin + âyet no rengi. Seçiliyse kesikli halka (panel
   vurgusuyla — rozetin kendi rengiyle değil, hangi temada olunursa görünsün). */
function Rozet({ t, secili, boyut, halkaRengi }) {
  const dis = [], ic = []
  for (let i = 0; i < 8; i++) {
    dis.push(<ellipse key={"d" + i} cx="32" cy="13" rx="7.5" ry="12" transform={`rotate(${i * 45} 32 32)`}
      style={{ fill: t.background, stroke: t.border, strokeWidth: 1.2 }} />)
    ic.push(<ellipse key={"i" + i} cx="32" cy="17.5" rx="4" ry="7" transform={`rotate(${i * 45 + 22.5} 32 32)`}
      style={{ fill: t.surface, stroke: t.accent, strokeWidth: 0.9 }} />)
  }
  return (
    <svg className="vukuf-rozet" width={boyut} height={boyut} viewBox="0 0 64 64" aria-hidden="true"
      style={{ display: "block", overflow: "visible" }}>
      {secili && (
        <circle className="vukuf-rozet-halka" cx="32" cy="32" r="31.5" fill="none"
          stroke={halkaRengi} strokeWidth="1.6" strokeDasharray="3.2 3" />
      )}
      {dis}{ic}
      <circle cx="32" cy="32" r="10" style={{ fill: t.background, stroke: t.accent, strokeWidth: 1.5 }} />
      <circle cx="32" cy="32" r="4" style={{ fill: t.ayetNoRengi }} />
    </svg>
  )
}

/**
 * @param theme    görünen (uygulanmış) tema — panelin kendi renkleri için
 * @param duzen    "kart" (Ayarlar, geniş) | "satir" (dar okuma paneli)
 * @param onOzel   Özel'e dokunulunca (düzenleme panelini açar)
 * @param onSec    (id, uygulandiMi) — hazır temaya dokunulunca, seçimden SONRA
 * @param kalemBoyu satir düzeninde Özel kalem simgesinin boyu (okuma barı ölçeği)
 * (sutun eski düzenden kalma; kabul ediliyor, kullanılmıyor)
 */
export default function TemaSecici({ theme, duzen = "kart", onOzel, onSec, kalemBoyu }) {
  const {
    currentTheme, setCurrentTheme, customTheme,
    tonModu, tonSec, tonFavori, sistemTonu,
  } = useApp()
  const dar = duzen === "satir"
  const oto = tonModu === "oto"
  const gruplar = oto ? ["acik", "koyu"] : [tonModu]
  const ozelTon = temaTonu(customTheme)

  // Otomatik'te öbür tonun rozetine dokununca tema hemen uygulanmıyor; önizleme
  // yine de onu göstersin. Görünen tema ya da mod değişince sıfırlanır.
  const [onizId, setOnizId] = useState(null)
  useEffect(() => { setOnizId(null) }, [currentTheme, tonModu])
  const gosterilen = onizId || currentTheme
  const gt = gosterilen === "custom" ? customTheme : (themes[gosterilen] || theme)
  const gAd = gosterilen === "custom" ? "Özel" : gt.name
  const gAciklama = gosterilen === "custom" ? "Kişisel renk ayarları" : (gt.aciklama || "")
  const bekleyenTon = onizId ? temaTonu(gt) : null

  function ogeler(ton) {
    const liste = TEMALAR
      .filter(x => themes[x.id] && temaTonu(themes[x.id]) === ton)
      .map(x => ({ ...x, t: themes[x.id] }))
    // Özel: Otomatik'te yalnız kendi tonunun grubunda (iki kez görünmesin);
    // elle seçilmiş tonda her zaman sonda — oluşturma/düzenleme kapısı kaybolmasın.
    if (!oto || ozelTon === ton) {
      liste.push({ id: "custom", aciklama: "Kişisel renk ayarları", t: customTheme, ozel: true })
    }
    return liste
  }

  function sec(id) {
    if (id === "custom") { onOzel && onOzel(); return }
    const uygulandi = !oto || temaTonu(themes[id]) === sistemTonu
    setCurrentTheme(id)
    setOnizId(uygulandi ? null : id)
    onSec && onSec(id, uygulandi)
  }

  const seciliMi = (id, ton) => (oto ? tonFavori[ton] === id : currentTheme === id)
  const boyut = dar ? 44 : 54

  return (
    <div className={dar ? "yp-tam" : "vts-kart"}>
    {/* YATAY TELEFON (kart düzeni): cami önizleme solda sabit, ton anahtarı ve
        rozetler sağda — kabuk ≥540 px ise (yatayDuzen.js, kap sorgusu). Kap
        kendi kendini biçimleyemediği için ızgara bu iç sarmalayıcıda. */}
    <div className={dar ? undefined : "vts-kart-ic"}>
      <style>{STIL}</style>
      <TonAnahtari theme={theme} tonModu={tonModu} tonSec={tonSec} dar={dar} />

      {/* ── Cami önizleme (ortada mihrap) — YALNIZ Ayarlar'da. Okuma panelleri
          dar ve zaten arkalarında sayfanın kendisi görünüyor; orada cami yok,
          liste satırlarında soldaki küçük kutu yerine tezhip çiçeği var. ── */}
      {!dar && <div className="vts-onizleme">
      {/* Önizleme panel genişliğince büyür (400 px'e kadar) — mihraptaki âyet ve
          söz küçük ekranda da okunaklı kalsın (kullanıcı: "böyle hiç okunmuyor"). */}
      <div className="vts-cami" style={{ maxWidth: "400px", margin: "18px auto 0", padding: "0 2px" }}>
        <CamiOnizleme t={gt} ad={gAd} />
      </div>
      <div style={{
        textAlign: "center", fontSize: dar ? "10.5px" : "11.5px", color: theme.textSecondary,
        margin: "6px 4px 0", minHeight: "1.3em", lineHeight: 1.35,
      }}>
        {bekleyenTon
          ? <>Cihaz {TON_ADI[bekleyenTon].toLocaleLowerCase("tr")} tona geçince uygulanacak</>
          : gAciklama}
      </div>
      </div>}

      {oto && (
        <div style={{ fontSize: "11px", color: theme.textSecondary, margin: "10px 2px 0", lineHeight: 1.4, textAlign: dar ? "left" : "center" }}>
          Cihazın ayarına uyar — şu an <b style={{ color: theme.text, fontWeight: 600 }}>{TON_ADI[sistemTonu]}</b>.
          Her ton için bir tema seç.
        </div>
      )}

      {/* ── Rozetler ── */}
      {gruplar.map(ton => (
        <div key={ton} style={{ marginTop: dar ? "12px" : "16px" }}>
          {oto && (
            <div style={{
              fontSize: "10.5px", letterSpacing: "1px", color: theme.textSecondary,
              margin: "0 2px 8px", display: "flex", alignItems: "center", gap: "6px",
            }}>
              {ton === "acik" ? <Sun size={11} /> : <Moon size={11} />}
              {ton === "acik" ? "AYDINLIKTA" : "KARANLIKTA"}
              {ton === sistemTonu && <span style={{ color: theme.accent, letterSpacing: 0 }}>· şu an</span>}
            </div>
          )}
          {dar ? (
            /* Okuma paneli: önceki satır düzeni — soldaki önizleme kutusu yerine rozet.
               Yatay telefonda satırlar 2-3 sütuna dağılıyor (vts-satirlar). */
            <div className="vts-satirlar">
              {ogeler(ton).map(x => {
                const secili = seciliMi(x.id, ton)
                const ad = x.ozel ? "Özel" : x.t.name
                return (
                  <button
                    key={x.id}
                    className="vukuf-rozet-dugme"
                    onClick={() => sec(x.id)}
                    aria-label={ad}
                    aria-pressed={secili}
                    style={{
                      width: "100%", boxSizing: "border-box", display: "flex", alignItems: "center", gap: "10px",
                      padding: "6px 8px", borderRadius: "8px", fontSize: "13px", fontFamily: "inherit",
                      color: secili ? theme.accent : theme.text,
                      background: secili ? `${theme.accent}15` : "transparent",
                      border: "none", cursor: "pointer", marginBottom: "2px",
                    }}
                  >
                    <span style={{ flexShrink: 0, padding: "2px" }}>
                      <Rozet t={x.t} secili={secili} boyut={32} halkaRengi={theme.accent} />
                    </span>
                    <span style={{ flex: 1, minWidth: 0, textAlign: "left" }}>
                      <span style={{ display: "block", fontSize: "13px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {ad}
                        {oto && currentTheme === x.id && <span style={{ fontSize: "9.5px", color: theme.accent, marginLeft: "6px" }}>şu an</span>}
                      </span>
                      <span style={{ display: "block", fontSize: "10px", color: theme.textSecondary }}>{x.aciklama}</span>
                    </span>
                    {x.ozel
                      ? <Pencil size={kalemBoyu || 12} color={theme.textSecondary} />
                      : secili && <span style={{ fontSize: "10px", color: theme.accent }}>✓</span>}
                  </button>
                )
              })}
            </div>
          ) : (
          <div style={{
              display: "grid",
              gridTemplateColumns: `repeat(auto-fill, minmax(${dar ? 62 : 74}px, 1fr))`,
              gap: dar ? "10px 2px" : "14px 4px",
            }}>
              {ogeler(ton).map(x => {
                const secili = seciliMi(x.id, ton)
                const ad = x.ozel ? "Özel" : x.t.name
                return (
                  <button
                    key={x.id}
                    className="vukuf-rozet-dugme"
                    onClick={() => sec(x.id)}
                    title={`${ad} — ${x.aciklama}`}
                    aria-label={ad}
                    aria-pressed={secili}
                    style={{
                      display: "flex", flexDirection: "column", alignItems: "center", gap: "5px",
                      padding: "4px 0", background: "none", border: "none", cursor: "pointer",
                      fontFamily: "inherit", minWidth: 0, position: "relative",
                    }}
                  >
                    <Rozet t={x.t} secili={secili} boyut={boyut} halkaRengi={theme.accent} />
                    {x.ozel && (
                      <span style={{
                        position: "absolute", top: `${boyut - 12}px`, left: "50%", marginLeft: `${boyut / 2 - 12}px`,
                        width: "18px", height: "18px", borderRadius: "50%", display: "flex",
                        alignItems: "center", justifyContent: "center",
                        background: theme.surface, border: `1px solid ${theme.border}`,
                      }}>
                        <Pencil size={10} color={theme.textSecondary} />
                      </span>
                    )}
                    <span style={{
                      fontSize: dar ? "10.5px" : "11.5px", maxWidth: "100%",
                      overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                      color: secili ? theme.accent : theme.textSecondary,
                      fontWeight: secili ? 600 : 400,
                    }}>{ad}</span>
                    {oto && currentTheme === x.id && (
                      <span style={{ fontSize: "9.5px", color: theme.accent, marginTop: "-4px" }}>şu an</span>
                    )}
                  </button>
                )
              })}
            </div>
          )}
        </div>
      ))}
    </div>
    </div>
  )
}
