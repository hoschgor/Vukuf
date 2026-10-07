/* ═══════════════════════════════════════════════════════════════════════════
   VUKUF — MİNİ OYNATICI (Kur'ân okuma ekranı DIŞINDA)
   src/components/MiniOynatici.jsx

   Kullanıcı (6 Ekim 2026): "Kur'ân okuma ekranından çıkılsa dahi oynatıcı
   devam edebilsin; bu ekrandan çıkıldığında playerbar daha minimalist olsun,
   okumaya da dönülebilsin, göz yormamak için küçültülebilsin."

   • Yalnız ses ÇALIYOR/DURAKLATILMIŞKEN ve /kuran DIŞINDAYKEN görünür (orada
     tam PlayerBar var). Devamlı oynatma kapalıysa KuranOkuma çıkarken sesi
     durdurduğu için zaten görünmez.
   • AÇIK hâl (hap): [▶/❚❚] Bakara 142 · kâri  [⏭] [📖 okumaya dön] [⌄] [■ durdur]
     Oynat/duraklat düğmesi Kur'ân ekranındakiyle AYNI mushaf düğmesi: çalarken
     tezhip yavaşça döner (MushafPlayButton) — 7 Ekim 2026, kullanıcı isteği.
   • Hap kitabın üstünde dururken hızlı DİKEY kaydırma alttaki sayfayı kaydırır;
     hapı taşımak için yatay çekmek ya da kısa basılı tutup çekmek gerekir
     (useHapKonumu `kaydirGecir`) — "scroll zorlaştı" şikâyeti, 7 Ekim 2026.
   • KÜÇÜK hâl: tek yuvarlak düğme (çalarken hafif nabız halkası); dokununca
     açılır. Hangi hâlde olduğu hatırlanır ("vukuf-mini-kucuk").
   • Sürüklenebilir; yeri "Geri dön" hapı gibi saklanır ("vukuf-hap-konum-mini").
     Varsayılan: altta ortada; kitap okuma ekranında alttaki bar ve dönüş
     haplarının bir sıra üstünde.
   • "Okumaya dön": çalınan âyet hedef olarak bırakılır, Kur'ân o âyette açılır.
   ═══════════════════════════════════════════════════════════════════════════ */

import { useState, useEffect } from "react"
import { useLocation, useNavigate } from "react-router-dom"
import { SkipForward, BookOpen, ChevronDown, Square } from "lucide-react"
import { useApp } from "../AppContext"
import { useOynatici } from "../data/oynatici"
import { sureAdi } from "../data/sureAdlari"
import { useHapKonumu } from "./DonusDugmesi"
import MushafPlayButton from "./MushafPlayButton"

const KUCUK_ANAHTAR = "vukuf-mini-kucuk"

/* Nabız halkası: yalnız transform + opacity (bileşik katmanda çalışır). Eskiden
   box-shadow canlandırılıyordu; o her karede yeniden boyama ister, kitap
   kaydırılırken iPhone'da akıcılığı düşürebilirdi. */
const NABIZ_CSS = `@keyframes vukuf-mini-nabiz{0%{transform:scale(1);opacity:.55}75%{transform:scale(1.42);opacity:0}100%{transform:scale(1.42);opacity:0}}
.vukuf-mini-nabiz{position:absolute;inset:-1.5px;border-radius:50%;border:2px solid var(--mini-ac);pointer-events:none;animation:vukuf-mini-nabiz 1.8s ease-out infinite;will-change:transform,opacity}
@media (prefers-reduced-motion: reduce){.vukuf-mini-nabiz{animation:none;opacity:0}}
@keyframes vukuf-amb-don{to{transform:rotate(360deg)}}
@keyframes vukuf-amb-ters{to{transform:rotate(-360deg)}}
@keyframes vukuf-amb-dalga{0%,100%{transform:scaleY(.38)}50%{transform:scaleY(1)}}
@keyframes vukuf-amb-isil{0%,100%{opacity:.35}50%{opacity:1}}
.vukuf-amb-don{transform-box:fill-box;transform-origin:center;animation:vukuf-amb-don 16s linear infinite}
.vukuf-amb-ters{transform-box:fill-box;transform-origin:center;animation:vukuf-amb-ters 24s linear infinite}
.vukuf-amb-dalga{transform-box:fill-box;transform-origin:center;animation:vukuf-amb-dalga 1.1s ease-in-out infinite}
.vukuf-amb-isil{animation:vukuf-amb-isil 2.2s ease-in-out infinite}
@media (prefers-reduced-motion: reduce){.vukuf-amb-don,.vukuf-amb-ters,.vukuf-amb-dalga,.vukuf-amb-isil{animation:none}}`

/* ── KÜÇÜK HÂLİN AMBLEMİ (7 Ekim 2026) ─────────────────────────────────────
   Kullanıcı: "küçültülmüş oynatma barındaki nota işareti bizim yapıya hiç uygun
   durmuyor; tezhip çizgileriyle bir şey çizebilir miyiz, içi hareket edebilir,
   dışında efekt olabilir."
   Nota yerine ŞEMSE: iki kareden örülmüş sekiz köşeli yıldız (Rub'u'l-hizb
   yıldızı, mushaf kenar süslerinin aynısı), uçlarının arasında sekiz inci ve
   ortada madalyon.
     • Çalarken: yıldız yavaşça döner, inciler ters yönde döner ve sırayla ışır;
       madalyonun içinde üç "ses dalgası" (uçları yuvarlak, elif gibi ince) nefes
       alır gibi uzayıp kısalır. Dışta nabız halkası (NABIZ_CSS).
     • Duraklatılmışken: hepsi durur, madalyonda oynat üçgeni.
   Yalnız transform/opacity canlandırılıyor (boyama yok) → kaydırmayı yormaz. */
function SemseAmblem({ ac, zemin, calar, boy = 40 }) {
  const uclar = Array.from({ length: 8 }, (_, i) => {
    const a = (Math.PI / 4) * i + Math.PI / 8
    return { x: Math.cos(a) * 45, y: Math.sin(a) * 45, gecik: (i * 0.275).toFixed(2) }
  })
  const don = (ad) => (calar ? ad : undefined)
  return (
    <svg width={boy} height={boy} viewBox="-50 -50 100 100" aria-hidden="true" style={{ display: "block", overflow: "visible" }}>
      {/* Sekiz köşeli yıldız — iki kare */}
      <g className={don("vukuf-amb-don")}>
        <rect x="-27" y="-27" width="54" height="54" fill={`${ac}1c`} stroke={ac} strokeWidth="3.2" strokeLinejoin="round" />
        <rect x="-27" y="-27" width="54" height="54" fill={`${ac}1c`} stroke={ac} strokeWidth="3.2" strokeLinejoin="round" transform="rotate(45)" />
        {/* yıldızın içinde ince ikinci çizgi (tezhip "tahrir"i) */}
        <rect x="-21" y="-21" width="42" height="42" fill="none" stroke={ac} strokeWidth="1" opacity="0.55" />
        <rect x="-21" y="-21" width="42" height="42" fill="none" stroke={ac} strokeWidth="1" opacity="0.55" transform="rotate(45)" />
      </g>
      {/* Uçların arasındaki inciler */}
      <g className={don("vukuf-amb-ters")}>
        {uclar.map((u, i) => (
          <circle key={i} cx={u.x} cy={u.y} r="3" fill={ac}
            className={calar ? "vukuf-amb-isil" : undefined}
            style={calar ? { animationDelay: `${u.gecik}s` } : { opacity: 0.6 }} />
        ))}
      </g>
      {/* Madalyon */}
      <circle r="21" fill={zemin} stroke={ac} strokeWidth="2.2" />
      <circle r="17.5" fill="none" stroke={ac} strokeWidth="0.8" opacity="0.5" />
      {calar ? (
        <g fill={ac}>
          {[-8, 0, 8].map((x, i) => (
            <rect key={x} x={x - 2.5} y="-11" width="5" height="22" rx="2.5"
              className="vukuf-amb-dalga" style={{ animationDelay: `${[0.15, 0, 0.3][i]}s` }} />
          ))}
        </g>
      ) : (
        <path d="M-6 -10 L11 0 L-6 10 Z" fill={ac} strokeLinejoin="round" stroke={ac} strokeWidth="2" />
      )}
    </svg>
  )
}

export default function MiniOynatici() {
  const player = useOynatici()
  const location = useLocation()
  if (!player || player.durum === "kapali" || location.pathname === "/kuran") return null
  return <MiniHap player={player} kitapta={location.pathname.startsWith("/kitap/")} />
}

function MiniHap({ player, kitapta }) {
  const { theme } = useApp()
  const navigate = useNavigate()
  const ac = theme.accent
  const [kucuk, setKucukDurum] = useState(() => {
    try { return localStorage.getItem(KUCUK_ANAHTAR) === "1" } catch { return false }
  })
  const setKucuk = (v) => {
    setKucukDurum(v)
    try { localStorage.setItem(KUCUK_ANAHTAR, v ? "1" : "0") } catch { /* kota */ }
  }
  /* KENDİLİĞİNDEN KÜÇÜL (8 Ekim 2026, kullanıcı: "10 sn sonra en küçültülmüş moda
     geçsin"). Açık hapta 10 sn dokunulmazsa tek yuvarlak düğmeye iner. Hapa her
     dokunuş (düğmeler, sürükleme) süreyi baştan başlatır → kullanırken kapanmaz. */
  const [dokunus, setDokunus] = useState(0)
  useEffect(() => {
    if (kucuk) return
    const t = setTimeout(() => setKucuk(true), 10000)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kucuk, dokunus])

  // Kitap ekranında alttaki bar (~56 px) + dönüş hapları sırası; başka ekranlarda kenar
  const k = useHapKonumu({ ad: "mini", yan: "orta", altta: true, altPay: kitapta ? 64 : 0, ek: kitapta ? 50 : 0, kaydirGecir: true })

  const calar = player.durum === "caliyor"
  const a = player.aktifAyet
  const baslik = a ? (a.besmeleIcin ? `${sureAdi(a.besmeleIcin)} · Besmele` : `${sureAdi(a.sureNo)} ${a.ayetNo}`) : "Kur'ân-ı Kerîm"
  const kari = (player.KARILAR || []).find(x => x.id === player.kariId)?.label || ""

  function oynatDurdur() {
    if (calar) player.duraklat()
    else player.devamEt()
  }
  function okumayaDon() {
    try {
      if (a) {
        const sureNo = a.besmeleIcin || a.sureNo
        const ayetNo = a.besmeleIcin ? null : a.ayetNo
        localStorage.setItem("vukuf-kuran-hedef", JSON.stringify(ayetNo ? { sureNo, ayetNo, kaynak: "oynatici" } : { sureNo, kaynak: "oynatici" }))
      }
    } catch { /* yoksay */ }
    navigate("/kuran")
  }

  const yuvarlak = (vurgu) => ({
    width: "32px", height: "32px", borderRadius: "50%", flexShrink: 0, padding: 0,
    display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer",
    border: "none", background: vurgu ? ac : "transparent", color: vurgu ? "#fff" : theme.textSecondary,
  })

  return (
    <>
      <style>{NABIZ_CSS}</style>
      <div ref={k.ref} className="vukuf-hap" {...k.olaylar}
        onPointerDownCapture={() => { if (!kucuk) setDokunus(n => n + 1) }}
        style={{
        ...k.stil, zIndex: k.surukleniyor ? 130 : 126,
        "--hap-kay": "8px", "--mini-ac": ac,
      }}>
        {kucuk ? (
          /* KÜÇÜK — tek yuvarlak düğme; dokununca açılır */
          <button onClick={() => setKucuk(false)} aria-label={`Oynatıcıyı aç — ${baslik}`} title={`${baslik} · aç`}
            style={{
              position: "relative",
              width: "44px", height: "44px", borderRadius: "50%", padding: 0, cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
              background: theme.surface, border: `1px solid ${ac}`, color: ac,
              boxShadow: k.surukleniyor ? "0 10px 28px rgba(0,0,0,0.32)" : "0 4px 16px rgba(0,0,0,0.22)",
            }}>
            {calar && <span className="vukuf-mini-nabiz" aria-hidden="true" />}
            <SemseAmblem ac={ac} zemin={theme.surface} calar={calar} />
          </button>
        ) : (
          /* AÇIK — sade hap */
          <div style={{
            display: "flex", alignItems: "center", gap: "2px", padding: "4px",
            maxWidth: "min(360px, calc(100vw - 20px))",
            background: theme.surface, border: `1px solid ${ac}`, borderRadius: "24px",
            boxShadow: k.surukleniyor ? "0 10px 28px rgba(0,0,0,0.32)" : "0 4px 16px rgba(0,0,0,0.22)",
          }}>
            {/* OYNAT / DURAKLAT — Kur'ân ekranındaki oynatıcıyla AYNI mushaf düğmesi
                (çalarken göbek duraklat simgesine döner, tezhip yavaşça döner) */}
            <button onClick={oynatDurdur} aria-label={calar ? "Duraklat" : "Devam et"} title={calar ? "Duraklat" : "Devam et"}
              style={{
                display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                background: "none", border: "none", padding: 0, cursor: "pointer", lineHeight: 0,
                color: ac, touchAction: "manipulation",
              }}>
              <MushafPlayButton ac={ac} playing={calar} size={36} />
            </button>
            <span style={{ display: "flex", flexDirection: "column", minWidth: 0, flex: 1, padding: "0 8px 0 6px", lineHeight: 1.15 }}>
              <span style={{ fontSize: "12.5px", fontWeight: 700, color: theme.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{baslik}</span>
              <span style={{ fontSize: "10.5px", color: theme.textSecondary, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {calar ? kari : "Duraklatıldı"}
              </span>
            </span>
            <button onClick={() => player.sonrakiAyet()} aria-label="Sonraki âyet" title="Sonraki âyet" style={yuvarlak(false)}>
              <SkipForward size={15} />
            </button>
            <button onClick={okumayaDon} aria-label="Okumaya dön" title="Okumaya dön — çalınan âyete"
              style={{ ...yuvarlak(false), color: ac, background: `${ac}14` }}>
              <BookOpen size={15} />
            </button>
            <button onClick={() => setKucuk(true)} aria-label="Küçült" title="Küçült" style={yuvarlak(false)}>
              <ChevronDown size={16} />
            </button>
            {/* DURDUR — Kur'ân ekranındaki oynatıcının durdurma düğmesiyle aynı:
                vurgu renginde dolu kare (6 Ekim 2026, kullanıcı isteği) */}
            <button onClick={() => player.durdur()} aria-label="Durdur ve kapat" title="Durdur ve kapat" style={yuvarlak(false)}>
              <Square size={13} fill={ac} color={ac} />
            </button>
          </div>
        )}
      </div>
    </>
  )
}
