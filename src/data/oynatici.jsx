/* ═══════════════════════════════════════════════════════════════════════════
   VUKUF — UYGULAMA GENELİ OYNATICI
   src/data/oynatici.jsx

   Kullanıcı (6 Ekim 2026): "PlayerBar'daki ses ayarı kısmına devamlı oynatma
   seçeneği; Kur'ân okuma ekranından çıkılsa da oynatıcı devam edebilsin. Bu
   ekrandan çıkınca oynatıcı daha minimalist olsun, okumaya dönülebilsin, göz
   yormamak için küçültülebilsin."

   NİÇİN BURADA: oynatıcı kancası (useAudioPlayer) eskiden KuranOkuma'nın
   içindeydi; ekrandan çıkınca bileşen sökülüyor, kancanın temizliği sesi
   durduruyordu. Artık kanca UYGULAMA KÖKÜNDE bir kez çalışıyor (App.jsx →
   <OynaticiSaglayici>), KuranOkuma ve mini oynatıcı aynı oynatıcıyı
   useOynatici() ile paylaşıyor. "Devamlı oynatma" kapalıysa KuranOkuma
   ekrandan çıkarken sesi kendisi durduruyor (eski davranış).
   ═══════════════════════════════════════════════════════════════════════════ */

import { createContext, useContext, useEffect, useState } from "react"
import useAudioPlayer from "./hooks/useAudioPlayer"

const OynaticiBaglami = createContext(null)

export function OynaticiSaglayici({ children }) {
  const player = useAudioPlayer()
  const uyku = useUykuDurumu(player)
  return (
    <OynaticiBaglami.Provider value={player}>
      <UykuBaglami.Provider value={uyku}>{children}</UykuBaglami.Provider>
    </OynaticiBaglami.Provider>
  )
}

/* ── OTOMATİK DURDURMA (uyku zamanlayıcısı) — 3 Kasım 2026 ─────────────────
   Kullanıcı: "Otomatik durdurma: kullanıcı belli bir süre seçip o süre sonunda
   oynatıcı sonlansın." Zamanlayıcı UYGULAMA KÖKÜNDE (oynatıcının yanında) tutulur:
   Kur'ân ekranından çıkılıp devamlı oynatmayla dinlenirken de çalışır.
   Telefonda sayfa arka plandayken JS sayaçları gecikebildiği için süre ayrıca her
   âyet değişiminde ve uygulamaya dönüldüğünde de denetlenir. Oynatıcı kapanınca
   (elle ya da kendiliğinden) zamanlayıcı da iptal edilir. */
export const UYKU_SURELERI = [0, 5, 10, 15, 30, 45, 60, 90]   // dk; 0 = kapalı
const UykuBaglami = createContext({ dk: 0, bitis: null, kur: () => {} })
export function useOtomatikDurdurma() { return useContext(UykuBaglami) }

function useUykuDurumu(player) {
  const [uyku, setUyku] = useState(null)          // { dk, bitis } | null
  const [, setTik] = useState(0)
  const durdur = player?.durdur
  const doldu = () => uyku && Date.now() >= uyku.bitis
  // Süre dolunca durdur; kalan süre gösterimi için 20 sn'de bir tazele
  useEffect(() => {
    if (!uyku) return
    const t = setTimeout(() => { try { durdur && durdur() } catch { /* yoksay */ } setUyku(null) }, Math.max(0, uyku.bitis - Date.now()))
    const iv = setInterval(() => setTik(n => n + 1), 20000)
    const gorunur = () => { if (document.visibilityState === "visible" && Date.now() >= uyku.bitis) { try { durdur && durdur() } catch { /* yoksay */ } setUyku(null) } }
    document.addEventListener("visibilitychange", gorunur)
    return () => { clearTimeout(t); clearInterval(iv); document.removeEventListener("visibilitychange", gorunur) }
  }, [uyku, durdur])
  // Âyet değişiminde de denetle (arka planda sayaç gecikirse)
  useEffect(() => {
    if (doldu()) { try { durdur && durdur() } catch { /* yoksay */ } setUyku(null) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [player?.aktifAyet])
  // Oynatıcı kapanınca zamanlayıcı da biter
  useEffect(() => { if (player?.durum === "kapali" && uyku) setUyku(null) }, [player?.durum, uyku])
  return {
    dk: uyku ? uyku.dk : 0,
    bitis: uyku ? uyku.bitis : null,
    kur: (dk) => setUyku(dk ? { dk, bitis: Date.now() + dk * 60000 } : null),
  }
}

export function useOynatici() {
  return useContext(OynaticiBaglami)
}

/* ── DEVAMLI OYNATMA AYARI ("vukuf-arka-calma", varsayılan AÇIK) ────────────
   8 Ekim 2026 (kullanıcı kararı): hiç dokunulmamışsa (anahtar yok) açık sayılır;
   PlayerBar'dan kapatılırsa "0" yazılı kalır. */
const ARKA_ANAHTAR = "vukuf-arka-calma"
const aboneler = new Set()
export function arkaCalmaAcikMi() {
  try {
    const v = localStorage.getItem(ARKA_ANAHTAR)
    return v === null ? true : v === "1"
  } catch { return true }
}
export function arkaCalmaAyarla(acik) {
  try { localStorage.setItem(ARKA_ANAHTAR, acik ? "1" : "0") } catch { /* kota */ }
  for (const f of aboneler) f(!!acik)
}
export function useArkaCalma() {
  const [acik, setAcik] = useState(arkaCalmaAcikMi)
  useEffect(() => {
    aboneler.add(setAcik)
    return () => { aboneler.delete(setAcik) }
  }, [])
  return [acik, arkaCalmaAyarla]
}
