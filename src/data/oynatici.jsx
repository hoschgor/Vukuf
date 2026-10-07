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
  return <OynaticiBaglami.Provider value={player}>{children}</OynaticiBaglami.Provider>
}

export function useOynatici() {
  return useContext(OynaticiBaglami)
}

/* ── DEVAMLI OYNATMA AYARI ("vukuf-arka-calma", varsayılan KAPALI) ────────── */
const ARKA_ANAHTAR = "vukuf-arka-calma"
const aboneler = new Set()
export function arkaCalmaAcikMi() {
  try { return localStorage.getItem(ARKA_ANAHTAR) === "1" } catch { return false }
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
