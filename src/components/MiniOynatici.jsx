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

import { useState } from "react"
import { useLocation, useNavigate } from "react-router-dom"
import { Play, SkipForward, BookOpen, ChevronDown, Square, Music2 } from "lucide-react"
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
@media (prefers-reduced-motion: reduce){.vukuf-mini-nabiz{animation:none;opacity:0}}`

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
      <div ref={k.ref} className="vukuf-hap" {...k.olaylar} style={{
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
              background: theme.surface, border: `1.5px solid ${ac}`, color: ac,
              boxShadow: k.surukleniyor ? "0 10px 28px rgba(0,0,0,0.32)" : "0 4px 16px rgba(0,0,0,0.22)",
            }}>
            {calar && <span className="vukuf-mini-nabiz" aria-hidden="true" />}
            {calar ? <Music2 size={18} /> : <Play size={17} style={{ marginLeft: "2px" }} />}
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
