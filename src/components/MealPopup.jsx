/* VUKUF — MEAL PENCERESİ (meal modu)
   src/components/MealPopup.jsx

   PlayerBar'daki çeviri düğmesi bunu açar: çalmakta olan âyetin meali, okumayı
   kapatmayacak kadar küçük bir tezhipli pencerede durur ve âyet ilerledikçe
   kendiliğinden değişir. Konum/genişlik/yazı boyu `data/izlemeAyar.js`de;
   kenarındaki dişli ortak ayar panelini açıyor (izleme ayarları da orada).

   AyetPopup'tan AYRI bir bileşen: o, dokunulan âyet için açılan ve arkasını
   kilitleyen bir kutu; bu ise okuma sürerken açık kalan, arkaya dokunmayı
   engellemeyen bir şerit. Aynı bileşene iki işi birden yaptırmak ikisini de
   bozardı. */

import { useEffect, useRef, useState } from "react"
import { X, Settings2 } from "lucide-react"
import { useIzlemeAyar } from "../data/izlemeAyar"
import MealIzlemeAyarlari from "./MealIzlemeAyarlari"

const GENISLIK = {
  dar:   "min(340px, 90vw)",
  orta:  "min(440px, 94vw)",
  genis: "min(580px, 96vw)",
}

// Sûre adı hattı SureBasligi.jsx ile aynı kaynaktan: surah-name-v2-icon, U+E000 + sûre no
const sureAdiGlifi = (no) => (no >= 1 && no <= 114 ? String.fromCodePoint(0xE000 + no) : "")

/* Köşe rozeti — sûre başlığındaki köşe tezhibinin küçültülmüş hâli. */
function KoseRozeti({ ac, boy = 15 }) {
  return (
    <svg width={boy} height={boy} viewBox="-10 -10 20 20" aria-hidden="true">
      <circle r="7" fill="none" stroke={ac} strokeWidth="0.7" strokeOpacity="0.55" />
      <circle r="4" fill="none" stroke={ac} strokeWidth="0.6" strokeOpacity="0.4" />
      {[45, 135, 225, 315].map(d => (
        <circle key={d} cx={Math.cos(d * Math.PI / 180) * 9} cy={Math.sin(d * Math.PI / 180) * 9}
          r="1" fill={ac} fillOpacity="0.45" />
      ))}
      <circle r="1.4" fill={ac} fillOpacity="0.85" />
    </svg>
  )
}

/* Üst kenarın ortasındaki şemse — çerçeve çizgisini kırarak başlığı taçlandırır. */
function UstSemse({ ac, zemin }) {
  return (
    <svg width="46" height="14" viewBox="-23 -7 46 14" aria-hidden="true" style={{ display: "block" }}>
      <rect x="-23" y="-7" width="46" height="14" fill={zemin} />
      <path d="M-21 0 H-9" stroke={ac} strokeWidth="0.8" strokeOpacity="0.45" />
      <path d="M9 0 H21" stroke={ac} strokeWidth="0.8" strokeOpacity="0.45" />
      {[0, 60, 120].map(d => (
        <ellipse key={d} rx="6" ry="2.4" transform={`rotate(${d})`} fill="none" stroke={ac} strokeWidth="0.7" strokeOpacity="0.6" />
      ))}
      <circle r="1.6" fill={ac} fillOpacity="0.9" />
      <circle cx="-7" r="1" fill={ac} fillOpacity="0.5" />
      <circle cx="7" r="1" fill={ac} fillOpacity="0.5" />
    </svg>
  )
}

export default function MealPopup({
  acik, sure, ayetNo, meal, besmeleMi = false,
  theme, isMobile, altBosluk = 96, ustBosluk = 0, onOlcum, onKapat,
}) {
  const [ayar, guncelle] = useIzlemeAyar()
  const [ayarAcik, setAyarAcik] = useState(false)
  const suruklemeRef = useRef(null)
  // Sürüklerken her hareket olayında localStorage'a yazmamak için geçici konum;
  // parmak kalkınca bir kez kaydediliyor.
  const [gecici, setGecici] = useState(null)

  // Âyet değişince metin kutusu başa sarsın — önceki âyetin sonunda kalmasın.
  const metinRef = useRef(null)
  useEffect(() => { if (metinRef.current) metinRef.current.scrollTop = 0 }, [sure?.id, ayetNo])

  // Hat fontu gerçekten yüklenmediyse sûre adı HİÇ yazılmıyor: PUA glifi yedek
  // yazı tipinde boş kutu (□) çıkar ve başlıkta anlamsız bir kare kalırdı.
  const [hatVar, setHatVar] = useState(false)
  useEffect(() => {
    if (typeof document === "undefined" || !document.fonts) return
    let iptal = false
    document.fonts.load("26px 'surah-name-v2-icon'", "\uE001")
      .then(y => { if (!iptal) setHatVar(!!(y && y.length)) })
      .catch(() => {})
    return () => { iptal = true }
  }, [])

  // ── ÖLÇÜM — ebeveyne bildiriliyor ────────────────────────────────────────
  // KuranOkuma, âyete odaklanırken (gözlük) hizalama payına bu ölçüyü katıyor;
  // yoksa pencere ÜSTTEYKEN odaklanan âyet pencerenin arkasında kalıyor.
  // Aynı değer tekrar bildirilmiyor — her render'da yeni nesne göndermek sonsuz
  // güncelleme döngüsü açardı.
  const m = ayar.meal
  const kokRef = useRef(null)
  const sonOlcuRef = useRef(null)
  const olcumRef = useRef(onOlcum)
  useEffect(() => { olcumRef.current = onOlcum }, [onOlcum])
  useEffect(() => {
    if (!acik) {
      if (sonOlcuRef.current) { sonOlcuRef.current = null; olcumRef.current?.(null) }
      return
    }
    const el = kokRef.current
    if (!el) return
    const bildir = () => {
      const yuk = Math.ceil(el.offsetHeight)
      const onceki = sonOlcuRef.current
      if (onceki && onceki.yuk === yuk && onceki.konum === m.konum) return
      sonOlcuRef.current = { yuk, konum: m.konum }
      olcumRef.current?.({ yuk, konum: m.konum })
    }
    bildir()
    const ro = new ResizeObserver(bildir)
    ro.observe(el)
    return () => ro.disconnect()
  }, [acik, m.konum, m.genislik, m.yaziBoyu])
  // Bileşen tamamen kalkarsa ölçüm de düşsün (pay kilitli kalmasın).
  useEffect(() => () => { olcumRef.current?.(null) }, [])

  if (!acik) return null

  const ac = theme.accent
  const glif = m.hat && hatVar && sure ? sureAdiGlifi(sure.id) : ""

  // Bar yüksekliklerinin İÇİNDE güvenli alan payı zaten var (barın paddingBottom'u
  // env(...) ile hesaplanıyor). Bar o tarafta değilse pay burada ekleniyor — yoksa
  // çentikli cihazda iki kez sayılıp pencere ortaya kayıyordu.
  const konumStil =
    m.konum === "ust"
      ? { top: ustBosluk > 0 ? `${ustBosluk + 10}px` : "calc(env(safe-area-inset-top) + 10px)" }
      : m.konum === "orta"
        ? { top: "50%" }
        : { bottom: altBosluk > 0 ? `${altBosluk + 10}px` : "calc(env(safe-area-inset-bottom) + 10px)" }

  const kaydir = gecici === null ? m.kaydir : gecici
  const donusum = `translateX(-50%)${m.konum === "orta" ? " translateY(-50%)" : ""} translateY(${kaydir}px)`

  function suruklemeBasla(e) {
    // Sürükleme yalnız başlık satırından; metin kutusu kendi kaydırmasını korusun.
    if (e.button === 2) return
    // DÜĞMEDEN BAŞLAMAZ: `setPointerCapture` başlığa alınınca pointerup da başlığa
    // gidiyor ve alttaki düğmenin `click` olayı HİÇ oluşmuyordu — dişli ve kapat
    // çalışmıyordu (testte yakalandı).
    if (e.target && e.target.closest && e.target.closest("button")) return
    suruklemeRef.current = { y0: e.clientY, bas: m.kaydir }
    setGecici(m.kaydir)
    try { e.currentTarget.setPointerCapture(e.pointerId) } catch { /* yoksay */ }
  }
  function surukle(e) {
    const s = suruklemeRef.current
    if (!s) return
    const sinir = Math.round(window.innerHeight * 0.4)
    setGecici(Math.max(-sinir, Math.min(sinir, s.bas + (e.clientY - s.y0))))
  }
  function suruklemeBitir() {
    if (suruklemeRef.current && gecici !== null && gecici !== m.kaydir) guncelle("meal", { kaydir: gecici })
    suruklemeRef.current = null
    setGecici(null)
  }

  const dugme = (baslik, Ikon, tikla) => (
    <button onClick={tikla} title={baslik} aria-label={baslik} style={{
      display: "flex", alignItems: "center", justifyContent: "center",
      width: "26px", height: "26px", borderRadius: "50%", flexShrink: 0,
      border: "none", background: "transparent", color: theme.textSecondary,
      cursor: "pointer", padding: 0, touchAction: "manipulation",
    }}><Ikon size={14} /></button>
  )

  return (
    <>
      <div
        ref={kokRef}
        className="meal-pencere"
        style={{
          position: "fixed", left: "50%", transform: donusum, ...konumStil,
          width: GENISLIK[m.genislik] || GENISLIK.orta,
          zIndex: 92,
          background: theme.surface,
          border: `1px solid ${ac}55`,
          borderRadius: "14px",
          boxShadow: "0 6px 26px rgba(0,0,0,0.22)",
          padding: "10px 14px 12px",
          boxSizing: "border-box",
        }}
      >
        {/* İç çerçeve + köşe rozetleri: sûre başlığındaki çift çerçeve düzeninin küçüğü */}
        <div aria-hidden="true" style={{
          position: "absolute", inset: "4px", borderRadius: "10px",
          border: `1px solid ${ac}2e`, pointerEvents: "none",
        }} />
        {[["-7px", "-7px", null, null], [null, "-7px", "-7px", null], ["-7px", null, null, "-7px"], [null, null, "-7px", "-7px"]]
          .map(([sol, ust, sag, alt], i) => (
            <div key={i} aria-hidden="true" style={{
              position: "absolute", left: sol, top: ust, right: sag, bottom: alt,
              pointerEvents: "none", opacity: 0.9,
            }}><KoseRozeti ac={ac} /></div>
          ))}
        <div aria-hidden="true" style={{
          position: "absolute", top: "-7px", left: "50%", transform: "translateX(-50%)", pointerEvents: "none",
        }}><UstSemse ac={ac} zemin={theme.surface} /></div>

        {/* BAŞLIK — sürükleme tutamağı da bu satır */}
        <div
          onPointerDown={suruklemeBasla}
          onPointerMove={surukle}
          onPointerUp={suruklemeBitir}
          onPointerCancel={suruklemeBitir}
          style={{
            display: "flex", alignItems: "center", gap: "8px",
            cursor: "grab", touchAction: "none", userSelect: "none",
            paddingBottom: "6px", marginBottom: "6px",
            borderBottom: `1px solid ${theme.border}`,
          }}
        >
          {glif && (
            <span style={{
              fontFamily: "'surah-name-v2-icon', serif", fontSize: "26px", lineHeight: 1,
              color: ac, opacity: 0.9, flexShrink: 0, direction: "rtl",
            }}>{glif}</span>
          )}
          <span style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            <span style={{ fontSize: "12.5px", fontWeight: 600, color: ac }}>{sure?.isim || "—"}</span>
            {!besmeleMi && ayetNo ? (
              <span style={{ fontSize: "11.5px", color: theme.textSecondary, marginLeft: "6px" }}>{ayetNo}. âyet</span>
            ) : null}
          </span>
          {dugme("Meal ve izleme ayarları", Settings2, () => setAyarAcik(true))}
          {dugme("Meal penceresini kapat", X, onKapat)}
        </div>

        {/* MEAL */}
        <div ref={metinRef} style={{
          fontSize: `${m.yaziBoyu}px`, lineHeight: 1.75, color: theme.text,
          maxHeight: isMobile ? "24vh" : "30vh", overflowY: "auto",
          whiteSpace: "pre-line", direction: "ltr",
        }}>
          {besmeleMi
            ? "Rahmân ve Rahîm olan Allah'ın adıyla."
            : (meal || (
              <span style={{ color: theme.textSecondary, fontStyle: "italic" }}>
                Bu âyet için meal henüz eklenmemiş.
              </span>
            ))}
        </div>
      </div>

      <MealIzlemeAyarlari
        acik={ayarAcik} kapat={() => setAyarAcik(false)}
        theme={theme} isMobile={isMobile} odak="meal"
      />
    </>
  )
}
