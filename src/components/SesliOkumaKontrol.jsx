/* ═══════════════════════════════════════════════════════════════════════════
   VUKUF — SESLİ OKUMA DENETİMİ (okuma ekranı)
   src/components/SesliOkumaKontrol.jsx

   15 Ekim 2026. Bardaki "Sesli oku" düğmesi bunu açar; açılınca ekranda en üstte
   görünen satırdan okumaya başlar. Altta küçük bir hap:
       ⏮  ⏯  ⏭   1×   ⌖   ⚙   ✕
   ⌖ "Ekrandaki yerden" — elle kaydırdıktan sonra okumayı oraya taşır.
   ⚙ Türkçe ses, Arapça ibareler (uyarı / atla / Arapça sesle), işaret sesi, takip.

   VURGU: okunan satır hafif zeminle, okunan cümle (destekleyen tarayıcıda) CSS
   Custom Highlight ile işaretlenir — metnin DOM'una dokunulmaz. TAKİP: okunan satır
   görünür alanın dışına çıkınca yumuşakça kaydırılır; kullanıcı son 5 sn içinde
   elle kaydırdıysa araya girilmez. Sayfa henüz çizilmemişse `onSayfayaGit` çağrılır.
   Metin motoru: data/sesliOkuma.js
   ═══════════════════════════════════════════════════════════════════════════ */

import { useEffect, useRef, useState, useSyncExternalStore } from "react"
import { SkipBack, SkipForward, Play, Pause, X, Settings2, Crosshair, Loader2 } from "lucide-react"
import {
  sesliOkuyucu, sesliDestekVar, ayarOku, HIZLAR, sesleriAl, turkceSesler, arapcaSesler, enIyiSes, konumOku,
  sesCinsiyeti, turkceSesYolTarifi,
} from "../data/sesliOkuma"

const HIGHLIGHT_AD = "vukuf-sesli"

function useSesliDurum() {
  return useSyncExternalStore(sesliOkuyucu.abone, sesliOkuyucu.durum, sesliOkuyucu.durum)
}

/* Paragrafta cümleyi bul → Range. <sup> içindekiler (dipnot no, haşiye "H") atlanır;
   boşluklar tek boşluğa indirgenerek eşleştirilir. */
function cumleAraligi(kok, aranan, baslangic = 0) {
  if (!kok || !aranan) return null
  const tw = document.createTreeWalker(kok, NodeFilter.SHOW_TEXT)
  const parcalar = []
  let duz = "", n
  while ((n = tw.nextNode())) {
    if (n.parentElement && n.parentElement.closest("sup")) continue
    const t = n.nodeValue || ""
    for (let i = 0; i < t.length; i++) {
      const ch = /\s/.test(t[i]) ? " " : t[i]
      if (ch === " " && (duz.endsWith(" ") || !duz.length)) continue
      parcalar.push([n, i]); duz += ch
    }
  }
  const hedef = aranan.replace(/\s+/g, " ").trim()
  let i = duz.indexOf(hedef, baslangic)
  if (i < 0) i = duz.indexOf(hedef)
  if (i < 0) return null
  const [bn, bo] = parcalar[i], [sn, so] = parcalar[i + hedef.length - 1]
  try {
    const r = document.createRange()
    r.setStart(bn, bo); r.setEnd(sn, so + 1)
    return { r, son: i + hedef.length }
  } catch { return null }
}

export default function SesliOkumaKontrol({
  acik, kapat, theme, isMobile, olcek = 1, kitapId, kitapMetni,
  baslangicAl, scrollEl, onSayfayaGit, altPay = 16,
}) {
  const d = useSesliDurum()
  const [ayar, setAyar] = useState(() => ayarOku())
  const [ayarAcik, setAyarAcik] = useState(false)
  const [sesler, setSesler] = useState({ tr: [], ar: [] })
  const elleRef = useRef(0)
  const isaretliRef = useRef([])
  const cumleKonumRef = useRef({ satirAnahtar: "", son: 0 })
  const ac = theme.accent
  const px = (v) => `${Math.round(v * olcek)}px`

  // Açılınca başla; kapanınca dur
  useEffect(() => {
    if (!acik) return
    if (!sesliDestekVar()) return
    let iptal = false
    ;(async () => {
      const meal = (await import("../data/ayet-meal.json")).default
      if (iptal) return
      // Ekrandaki yerden başla; aynı sayfada daha ileride kalınmışsa KALDIĞI YERDEN sürsün
      const ekran = baslangicAl() || { sayfa: kitapMetni?.[0]?.sayfa, satir: 0 }
      const kayit = konumOku(kitapId)
      const bas = kayit && kayit.sayfa === ekran.sayfa && kayit.satir > ekran.satir ? kayit : ekran
      sesliOkuyucu.baslat({ kitapId, kitapMetni, baslangic: bas, ayetMeal: meal })
    })()
    sesleriAl().then(v => { if (!iptal) setSesler({ tr: turkceSesler(v), ar: arapcaSesler(v) }) })
    return () => { iptal = true; sesliOkuyucu.durdur() }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [acik, kitapId])

  // Elle kaydırma: takip 5 sn araya girmesin
  useEffect(() => {
    const el = scrollEl?.()
    if (!acik || !el) return
    const elle = () => { elleRef.current = Date.now() }
    el.addEventListener("wheel", elle, { passive: true })
    el.addEventListener("touchmove", elle, { passive: true })
    return () => { el.removeEventListener("wheel", elle); el.removeEventListener("touchmove", elle) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [acik])

  // Vurgu + takip
  useEffect(() => {
    const temizle = () => {
      isaretliRef.current.forEach(el => el.classList.remove("sesli-satir"))
      isaretliRef.current = []
      try { if (window.CSS && window.CSS.highlights) window.CSS.highlights.delete(HIGHLIGHT_AD) } catch { /* yoksay */ }
    }
    const b = d.birim
    if (!acik || !b) { temizle(); return }
    let deneme = 0, zaman = 0
    const uygula = () => {
      temizle()
      const nolar = b.satirlar && b.satirlar.length ? b.satirlar : [b.satir]
      const els = nolar.map(s => document.querySelector(`[data-satir="${b.sayfa}-${s}"]`)).filter(Boolean)
      if (!els.length) {
        // Sayfa henüz çizilmedi → oraya git, sonra yeniden dene
        if (deneme === 0 && ayar.takip) onSayfayaGit?.(b.sayfa, b.satir)
        if (deneme++ < 20) zaman = setTimeout(uygula, 150)
        return
      }
      els.forEach(el => el.classList.add("sesli-satir"))
      isaretliRef.current = els
      // Cümle vurgusu (Custom Highlight API varsa)
      const anahtar = `${b.sayfa}-${b.satir}`
      if (cumleKonumRef.current.satirAnahtar !== anahtar) cumleKonumRef.current = { satirAnahtar: anahtar, son: 0 }
      if (b.goster && window.CSS && window.CSS.highlights && typeof window.Highlight === "function") {
        const bul = cumleAraligi(els[0], b.goster, cumleKonumRef.current.son)
        if (bul) {
          cumleKonumRef.current.son = bul.son
          try { window.CSS.highlights.set(HIGHLIGHT_AD, new window.Highlight(bul.r)) } catch { /* yoksay */ }
        }
      }
      // Takip: görünür alanın dışındaysa yumuşakça kaydır
      const kap = scrollEl?.()
      if (ayar.takip && kap && Date.now() - elleRef.current > 5000) {
        const kr = kap.getBoundingClientRect(), er = els[0].getBoundingClientRect()
        const ust = kr.top + kr.height * 0.12, alt = kr.top + kr.height * 0.72
        if (er.top < ust || er.top > alt) {
          kap.scrollBy({ top: er.top - (kr.top + kr.height * 0.3), behavior: "smooth" })
        }
      }
    }
    uygula()
    return () => clearTimeout(zaman)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [acik, d.birim])

  // Bitti → kısa süre sonra kendiliğinden kapanmaz; düğme "baştan değil, kaldığı yerden" yeniden başlatır
  const ayarDegis = (parca) => { setAyar(a => ({ ...a, ...parca })); sesliOkuyucu.ayarlariYenile(parca) }

  if (!acik) return null
  const destek = sesliDestekVar()
  const okuyor = d.durum === "okuyor"
  const hazirlaniyor = d.durum === "hazirlaniyor"
  const trSes = enIyiSes(sesler.tr, ayar.sesTr)

  const dugme = (icerik, onClick, etiket, vurgu) => (
    <button onClick={onClick} title={etiket} aria-label={etiket}
      style={{
        width: px(36), height: px(36), borderRadius: "999px", border: "none", cursor: "pointer", flexShrink: 0,
        display: "flex", alignItems: "center", justifyContent: "center",
        background: vurgu ? ac : "transparent", color: vurgu ? "#fff" : theme.text,
      }}>{icerik}</button>
  )
  const cip = (secili, etiket, onClick, kapali) => (
    <button onClick={kapali ? undefined : onClick} disabled={kapali}
      style={{
        padding: "6px 10px", borderRadius: "999px", fontSize: "12px", fontFamily: "inherit", cursor: kapali ? "not-allowed" : "pointer",
        border: `1px solid ${secili ? ac : theme.border}`, background: secili ? `${ac}18` : "transparent",
        color: kapali ? `${theme.textSecondary}88` : (secili ? ac : theme.text), fontWeight: secili ? 700 : 500,
      }}>{etiket}</button>
  )
  const bilgi = !destek ? "Bu tarayıcı sesli okumayı desteklemiyor."
    : d.durum === "bitti" ? "Kitabın sonuna gelindi."
    : d.hata === "trSes" ? `Bu tarayıcıda Türkçe ses bulunamadı; yabancı aksanla okumamak için okuma başlatılmadı. ${turkceSesYolTarifi()}`
    : d.sesListesiBos ? `Tarayıcı ses listesi vermedi; Türkçe okunmaya çalışılıyor. Ses duyulmazsa: ${turkceSesYolTarifi()}`
    : null

  return (
    <>
      <style>{`
        .sesli-satir { background: ${ac}14; border-radius: 6px; box-shadow: 0 0 0 4px ${ac}14; transition: background .25s; }
        ::highlight(${HIGHLIGHT_AD}) { background-color: ${ac}38; }
      `}</style>
      <div role="region" aria-label="Sesli okuma" style={{
        position: "fixed", left: "50%", transform: "translateX(-50%)", bottom: `calc(${altPay}px + env(safe-area-inset-bottom))`,
        zIndex: 140, maxWidth: "calc(100vw - 20px)", display: "flex", flexDirection: "column", alignItems: "center", gap: "6px",
      }}>
        {/* AYARLAR */}
        {ayarAcik && destek && (
          <div style={{
            width: "min(340px, calc(100vw - 20px))", background: theme.surface, border: `1px solid ${theme.border}`,
            borderRadius: "14px", padding: "12px 12px 10px", boxShadow: "0 10px 30px rgba(0,0,0,0.22)", color: theme.text,
            fontSize: "12.5px", maxHeight: "60vh", overflowY: "auto",
          }}>
            <div style={{ fontWeight: 700, marginBottom: "6px" }}>Ses</div>
            {sesler.tr.length ? (
              <select value={trSes?.name || ""} onChange={e => ayarDegis({ sesTr: e.target.value })}
                style={{ width: "100%", padding: "7px 8px", borderRadius: "9px", border: `1px solid ${theme.border}`, background: theme.background, color: theme.text, fontFamily: "inherit", fontSize: "12.5px" }}>
                {[...sesler.tr].sort((a, b) => (sesCinsiyeti(b) === "erkek") - (sesCinsiyeti(a) === "erkek") || String(a.name).localeCompare(b.name)).map(v => {
                  const c = sesCinsiyeti(v)
                  return <option key={v.name} value={v.name}>{v.name.replace(/^Microsoft\s+|\s+-\s+Turkish.*$/gi, "")}{c ? ` — ${c === "erkek" ? "erkek" : "kadın"}` : ""}{v.localService ? "" : " · internet"}</option>
                })}
              </select>
            ) : <div style={{ color: theme.textSecondary, lineHeight: 1.5 }}>Türkçe ses bulunamadı. {turkceSesYolTarifi()}</div>}
            {sesler.tr.length > 0 && !sesler.tr.some(v => sesCinsiyeti(v) === "erkek") && (
              <div style={{ color: theme.textSecondary, fontSize: "11px", lineHeight: 1.5, marginTop: "6px" }}>
                Bu tarayıcıda erkek Türkçe ses görünmüyor. {turkceSesYolTarifi()}
              </div>
            )}

            <div style={{ fontWeight: 700, margin: "12px 0 6px" }}>Kaynağı belirtilmemiş Arapça ibareler</div>
            <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
              {cip(ayar.arapca === "uyari", "Haber ver", () => ayarDegis({ arapca: "uyari" }))}
              {cip(ayar.arapca === "atla", "Atla", () => ayarDegis({ arapca: "atla" }))}
              {cip(ayar.arapca === "oku", "Arapça sesle oku", () => ayarDegis({ arapca: "oku" }), !sesler.ar.length)}
            </div>
            <div style={{ color: theme.textSecondary, fontSize: "11px", lineHeight: 1.5, marginTop: "6px" }}>
              Kaynağında sûre ve âyet numarası geçen ibarelerde sûre adı ve âyet numarası, ardından meali okunur; âyetin Arapçası yapay sesle okunmaz.
              {!sesler.ar.length ? " Bu cihazda Arapça ses bulunmadığı için Arapça okuma kapalı." : ""}
            </div>

            <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginTop: "12px" }}>
              {cip(ayar.isaret, ayar.isaret ? "İşaret sesi açık" : "İşaret sesi kapalı", () => ayarDegis({ isaret: !ayar.isaret }))}
              {cip(ayar.takip, ayar.takip ? "Okunan yeri takip et" : "Takip kapalı", () => ayarDegis({ takip: !ayar.takip }))}
            </div>
          </div>
        )}

        {bilgi && (
          <div style={{
            maxWidth: "min(360px, calc(100vw - 20px))", background: theme.surface, border: `1px solid ${theme.border}`,
            borderRadius: "12px", padding: "8px 12px", fontSize: "12px", color: theme.textSecondary, lineHeight: 1.5,
            boxShadow: "0 6px 18px rgba(0,0,0,0.15)", textAlign: "center",
          }}>{bilgi}</div>
        )}

        {/* HAP */}
        <div style={{
          display: "flex", alignItems: "center", gap: px(2), padding: px(4),
          background: theme.surface, border: `1px solid ${theme.border}`, borderRadius: "999px",
          boxShadow: "0 8px 26px rgba(0,0,0,0.2)", color: theme.text,
        }}>
          {destek && <>
            {dugme(<SkipBack size={Math.round(17 * olcek)} />, () => sesliOkuyucu.geri(), "Önceki cümle")}
            {dugme(
              hazirlaniyor ? <Loader2 size={Math.round(18 * olcek)} style={{ animation: "sesliDon .9s linear infinite" }} />
                : okuyor ? <Pause size={Math.round(18 * olcek)} /> : <Play size={Math.round(18 * olcek)} />,
              () => {
                if (okuyor) sesliOkuyucu.duraklat()
                else if (d.durum === "duraklatildi") sesliOkuyucu.devam()
                else import("../data/ayet-meal.json").then(m => sesliOkuyucu.baslat({ kitapId, kitapMetni, baslangic: baslangicAl(), ayetMeal: m.default }))
              },
              okuyor ? "Duraklat" : "Oku", true)}
            {dugme(<SkipForward size={Math.round(17 * olcek)} />, () => sesliOkuyucu.ileri(), "Sonraki cümle")}
            <button
              onClick={() => { const i = HIZLAR.indexOf(Number(ayar.hiz)); const y = HIZLAR[(i + 1) % HIZLAR.length]; ayarDegis({ hiz: y }) }}
              title="Okuma hızı" aria-label="Okuma hızı"
              style={{
                minWidth: px(40), height: px(30), borderRadius: "999px", border: `1px solid ${theme.border}`, cursor: "pointer",
                background: "transparent", color: theme.text, fontFamily: "inherit", fontSize: px(12), fontWeight: 700, margin: `0 ${px(2)}`,
              }}>{String(ayar.hiz).replace(".", ",")}×</button>
            {dugme(<Crosshair size={Math.round(16 * olcek)} />, () => {
              import("../data/ayet-meal.json").then(m => sesliOkuyucu.baslat({ kitapId, kitapMetni, baslangic: baslangicAl(), ayetMeal: m.default }))
            }, "Ekrandaki yerden oku")}
            {dugme(<Settings2 size={Math.round(16 * olcek)} />, () => setAyarAcik(v => !v), "Sesli okuma ayarları", ayarAcik)}
          </>}
          {dugme(<X size={Math.round(17 * olcek)} />, kapat, "Sesli okumayı kapat")}
        </div>
        <style>{`@keyframes sesliDon { to { transform: rotate(360deg) } }`}</style>
      </div>
    </>
  )
}
