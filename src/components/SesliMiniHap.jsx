/* ═══════════════════════════════════════════════════════════════════════════
   VUKUF — SESLİ OKUMA KÜÇÜK HAPI (okuma ekranı DIŞINDA)
   src/components/SesliMiniHap.jsx

   17 Ekim 2026, kullanıcı: "Buraya da ses arttırma düğmesi ve sürekli oynatma ayarı
   ekleyelim." Sesli okumada "Devamlı okuma" açıksa okuma ekranından çıkınca okuma
   sürer; o sırada öbür ekranlarda bu küçük hap görünür (Kur'ân oynatıcısının
   MiniOynatici'si gibi):  [▶/❚❚]  Kitap adı · Sesli okuma  [📖 okumaya dön]  [■ durdur]
   • Yalnız okuma SÜRERKEN ve sesli okuma denetimi (SesliOkumaKontrol) AÇIK DEĞİLKEN.
   • "Okumaya dön": kitap açılır, denetim kendiliğinden açılıp süren okumaya bağlanır.
   • Sürüklenebilir; yeri "vukuf-hap-konum-sesli-mini"de saklanır (useHapKonumu).
   • KÜÇÜK hâl (17 Ekim 2026, kullanıcı: "Devamlı oynatmayı da küçük modda verebilelim,
     KuranOkuma için olan çok güzeldi … normal eserler için farklı bir şey çizerek"):
     Kur'ân'daki şemse yerine RAHLE ÜSTÜNDE AÇIK KİTAP (KitapAmblem). ⌄ ile ya da
     10 sn dokunulmazsa küçülür; dokununca açılır; hâl "vukuf-sesli-mini-kucuk"te.
   MiniOynatici içinden çizilir (App.jsx'e dokunmadan).
   ═══════════════════════════════════════════════════════════════════════════ */

import { useState, useEffect, useSyncExternalStore } from "react"
import { useLocation, useNavigate } from "react-router-dom"
import { Play, Pause, BookOpen, Square, Loader2, ChevronDown } from "lucide-react"
import { useApp } from "../AppContext"
import { sesliOkuyucu, sesKilidiAc } from "../data/sesliOkuma"
import { useHapKonumu } from "./DonusDugmesi"

const KUCUK_ANAHTAR = "vukuf-sesli-mini-kucuk"

/* Yalnız transform + opacity canlandırılıyor (boyama yok) → kitap kaydırılırken
   iPhone'u yormaz. Adlar Kur'ân mini oynatıcısınınkinden ayrı (ikisi birlikte açık olabilir). */
const KITAP_CSS = `@keyframes vukuf-sk-nabiz{0%{transform:scale(1);opacity:.55}75%{transform:scale(1.42);opacity:0}100%{transform:scale(1.42);opacity:0}}
.vukuf-sk-nabiz{position:absolute;inset:-1.5px;border-radius:50%;border:2px solid var(--sk-ac);pointer-events:none;animation:vukuf-sk-nabiz 2.2s ease-out infinite;will-change:transform,opacity}
@keyframes vukuf-sk-don{to{transform:rotate(360deg)}}
@keyframes vukuf-sk-satir{0%{transform:scaleX(0);opacity:1}13%{transform:scaleX(1);opacity:1}24%{transform:scaleX(1);opacity:0}100%{transform:scaleX(1);opacity:0}}
@keyframes vukuf-sk-isil{0%,100%{opacity:.25}50%{opacity:.8}}
@keyframes vukuf-sk-don-cevir{0%,100%{transform:rotate(0)}50%{transform:rotate(-4deg)}}
.vukuf-sk-don{transform-box:fill-box;transform-origin:center;animation:vukuf-sk-don 40s linear infinite}
.vukuf-sk-satir{transform-box:fill-box;transform-origin:left center;animation:vukuf-sk-satir 4.8s linear infinite both}
.vukuf-sk-isil{animation:vukuf-sk-isil 1.4s ease-in-out infinite}
.vukuf-sk-kitap{transform-box:fill-box;transform-origin:50% 100%;animation:vukuf-sk-don-cevir 4.8s ease-in-out infinite}
@media (prefers-reduced-motion: reduce){.vukuf-sk-nabiz,.vukuf-sk-don,.vukuf-sk-satir,.vukuf-sk-isil,.vukuf-sk-kitap{animation:none}.vukuf-sk-nabiz{opacity:0}}`

/* ── KÜÇÜK HÂLİN AMBLEMİ: RAHLE ÜSTÜNDE AÇIK KİTAP ───────────────────────────
   • Dışta tesbih taneleri gibi noktalı halka (okurken çok yavaş döner) ve ince çerçeve.
   • Ortada madalyon; içinde X bacaklı rahle ve üstünde açık kitap; her sayfada üç satır.
   • OKURKEN: satırlar sırayla soldan sağa "okunur" — okuma ekranındaki cümle vurgusu
     gibi bir ışık satırı süpürüp söner (önce sol sayfa, sonra sağ). Kitap rahlede
     hafifçe salınır; dışta nabız halkası.
   • HAZIRLANIRKEN: satırlar yavaşça ışıyıp söner.
   • DURAKLATILMIŞKEN: hepsi durur; sağ sayfada satırlar yerine oynat üçgeni. */
const SOL_SATIR = [-9, -3, 3].map(y => ({ x: -22, y }))
const SAG_SATIR = [-9, -3, 3].map(y => ({ x: 5, y }))
function KitapAmblem({ ac, zemin, hal, boy = 40 }) {
  const okur = hal === "okuyor", hazir = hal === "hazirlaniyor"
  const tesbih = Array.from({ length: 16 }, (_, i) => {
    const a = (Math.PI / 8) * i
    return { x: Math.cos(a) * 45, y: Math.sin(a) * 45, buyuk: i % 4 === 0 }
  })
  const satir = (st, i, kaynak) => (
    <g key={kaynak + i}>
      <rect x={st.x} y={st.y - 1.2} width="17" height="2.4" rx="1.2" fill={ac}
        opacity={okur ? 0.3 : 0.45} className={hazir ? "vukuf-sk-isil" : undefined}
        style={hazir ? { animationDelay: `${(i + (kaynak === "sag" ? 3 : 0)) * 0.12}s` } : undefined} />
      {okur && (
        <rect x={st.x - 1} y={st.y - 2.4} width="19" height="4.8" rx="2.4" fill={ac}
          className="vukuf-sk-satir" style={{ animationDelay: `${(i + (kaynak === "sag" ? 3 : 0)) * 0.8}s` }} />
      )}
    </g>
  )
  return (
    <svg width={boy} height={boy} viewBox="-50 -50 100 100" aria-hidden="true" style={{ display: "block", overflow: "visible" }}>
      {/* Tesbih halkası */}
      <g className={okur ? "vukuf-sk-don" : undefined}>
        {tesbih.map((t, i) => <circle key={i} cx={t.x} cy={t.y} r={t.buyuk ? 3.2 : 2} fill={ac} opacity={t.buyuk ? 0.9 : 0.55} />)}
      </g>
      {/* Madalyon */}
      <circle r="38" fill={zemin} stroke={ac} strokeWidth="2.2" />
      <circle r="34" fill="none" stroke={ac} strokeWidth="0.8" opacity="0.5" />
      <g transform="translate(0 -1.5) scale(1.12)">
      {/* Rahle (X bacaklar) */}
      <g stroke={ac} strokeWidth="3" strokeLinecap="round">
        <path d="M-15 9 L13 25" /><path d="M15 9 L-13 25" />
      </g>
      {/* Açık kitap */}
      <g className={okur ? "vukuf-sk-kitap" : undefined}>
        <path d="M-27 -16 Q-13 -21 0 -15 L0 10 Q-13 5 -27 9 Z" fill={`${ac}1c`} stroke={ac} strokeWidth="2.4" strokeLinejoin="round" />
        <path d="M27 -16 Q13 -21 0 -15 L0 10 Q13 5 27 9 Z" fill={`${ac}1c`} stroke={ac} strokeWidth="2.4" strokeLinejoin="round" />
        {SOL_SATIR.map((st, i) => satir(st, i, "sol"))}
        {hal === "duraklatildi"
          ? <path d="M9 -11 L20 -3.5 L9 4 Z" fill={ac} stroke={ac} strokeWidth="1.6" strokeLinejoin="round" />
          : SAG_SATIR.map((st, i) => satir(st, i, "sag"))}
      </g>
      </g>
    </svg>
  )
}

export default function SesliMiniHap() {
  const d = useSyncExternalStore(sesliOkuyucu.abone, sesliOkuyucu.durum, sesliOkuyucu.durum)
  const location = useLocation()
  const suruyor = ["okuyor", "duraklatildi", "hazirlaniyor"].includes(d.durum)
  if (!suruyor || d.kontrolAcik) return null
  return <Hap d={d} kitapta={location.pathname.startsWith("/kitap/")} />
}

function Hap({ d, kitapta }) {
  const { theme } = useApp()
  const navigate = useNavigate()
  const location = useLocation()
  const ac = theme.accent
  // Kur'ân küçük oynatıcısı ("mini") da görünüyorsa HAP_ADLARI sırası sayesinde ondan kaçar
  const k = useHapKonumu({ ad: "sesli-mini", yan: "orta", altta: true, altPay: kitapta ? 64 : 0, ek: kitapta ? 50 : 0, kaydirGecir: true })
  const b = sesliOkuyucu.bilgi()
  const okuyor = d.durum === "okuyor"
  const hazirlaniyor = d.durum === "hazirlaniyor" || (okuyor && d.bekliyor)
  const hal = hazirlaniyor ? "hazirlaniyor" : okuyor ? "okuyor" : "duraklatildi"

  const [kucuk, setKucukDurum] = useState(() => {
    try { return localStorage.getItem(KUCUK_ANAHTAR) === "1" } catch { return false }
  })
  const setKucuk = (v) => {
    setKucukDurum(v)
    try { localStorage.setItem(KUCUK_ANAHTAR, v ? "1" : "0") } catch { /* kota */ }
  }
  // Kur'ân mini oynatıcısındaki gibi: açık hapta 10 sn dokunulmazsa küçülür
  const [dokunus, setDokunus] = useState(0)
  useEffect(() => {
    if (kucuk) return
    const t = setTimeout(() => setKucuk(true), 10000)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kucuk, dokunus])
  const ad = b.kitapAdi || "Sesli okuma"
  const golge = k.surukleniyor ? "0 10px 28px rgba(0,0,0,0.32)" : "0 4px 16px rgba(0,0,0,0.22)"

  const yuvarlak = (vurgu) => ({
    width: "32px", height: "32px", borderRadius: "50%", flexShrink: 0, padding: 0,
    display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer",
    border: "none", background: vurgu ? ac : "transparent", color: vurgu ? "#fff" : theme.textSecondary,
  })
  const okumayaDon = () => {
    if (!b.kitapId) return
    const yol = `/kitap/${b.kitapId}`
    // Zaten o kitaptaysak yol değişmez → okuma ekranına "denetimi aç" haberi
    if (decodeURI(location.pathname) === yol || location.pathname === yol) {
      window.dispatchEvent(new CustomEvent("vukuf-sesli-ac", { detail: { kitapId: b.kitapId } }))
    } else navigate(yol)
  }

  return (
    <div ref={k.ref} className="vukuf-hap" {...k.olaylar}
      onPointerDownCapture={() => { if (!kucuk) setDokunus(n => n + 1) }}
      style={{ ...k.stil, zIndex: k.surukleniyor ? 130 : 126, "--hap-kay": "8px", "--sk-ac": ac }}>
      <style>{KITAP_CSS}</style>
      {kucuk ? (
        <button onClick={() => setKucuk(false)} aria-label={`Sesli okumayı aç — ${ad}`} title={`${ad} · ${okuyor ? "sesli okuma" : hazirlaniyor ? "hazırlanıyor" : "duraklatıldı"}`}
          style={{
            position: "relative",
            width: "44px", height: "44px", borderRadius: "50%", padding: 0, cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
            background: theme.surface, border: `1px solid ${ac}`, color: ac, boxShadow: golge,
          }}>
          {okuyor && !hazirlaniyor && <span className="vukuf-sk-nabiz" aria-hidden="true" />}
          <KitapAmblem ac={ac} zemin={theme.surface} hal={hal} />
        </button>
      ) : (
      <div style={{
        display: "flex", alignItems: "center", gap: "2px", padding: "4px",
        maxWidth: "min(340px, calc(100vw - 20px))",
        background: theme.surface, border: `1px solid ${ac}`, borderRadius: "24px",
        boxShadow: golge,
      }}>
        <button
          onClick={() => {
            if (okuyor) sesliOkuyucu.duraklat()
            else { sesKilidiAc(); sesliOkuyucu.devam() }
          }}
          aria-label={okuyor ? "Duraklat" : "Devam et"} title={okuyor ? "Duraklat" : "Devam et"}
          style={yuvarlak(true)}>
          {hazirlaniyor ? <Loader2 size={15} style={{ animation: "sesliMiniDon .9s linear infinite" }} />
            : okuyor ? <Pause size={15} /> : <Play size={15} />}
        </button>
        <span style={{ display: "flex", flexDirection: "column", minWidth: 0, flex: 1, padding: "0 8px 0 6px", lineHeight: 1.15 }}>
          <span style={{ fontSize: "12.5px", fontWeight: 700, color: theme.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {ad}
          </span>
          <span style={{ fontSize: "10.5px", color: theme.textSecondary, whiteSpace: "nowrap" }}>
            {okuyor ? `Sesli okuma${d.birim?.sayfa ? ` · s. ${d.birim.sayfa}` : ""}` : "Duraklatıldı"}
          </span>
        </span>
        <button onClick={okumayaDon} aria-label="Okumaya dön" title="Okumaya dön — okunan yere"
          style={{ ...yuvarlak(false), color: ac, background: `${ac}14` }}>
          <BookOpen size={15} />
        </button>
        <button onClick={() => setKucuk(true)} aria-label="Küçült" title="Küçült" style={yuvarlak(false)}>
          <ChevronDown size={16} />
        </button>
        <button onClick={() => sesliOkuyucu.durdur()} aria-label="Sesli okumayı durdur" title="Durdur" style={yuvarlak(false)}>
          <Square size={13} fill={ac} color={ac} />
        </button>
      </div>
      )}
      <style>{`@keyframes sesliMiniDon { to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}
