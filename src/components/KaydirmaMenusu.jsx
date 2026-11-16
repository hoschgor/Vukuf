/* ═══════════════════════════════════════════════════════════════════════════
   VUKUF — KAYDIRMA MENÜSÜ (otomatik kaydırma açıkken, ekranın altında)
   src/components/KaydirmaMenusu.jsx

   16 Kasım 2026 — kullanıcı: "herhangi bir yere basıldığında … alt kısımda kaydırma menüsü
   açılsın, hız seçimi rakam girilerek ya da sürüklenebilen şekilde olsun … modu kapamak için,
   kaydırma menüsü üzerine çarpı işareti koyalım, rahat görülebilir olsun."
   İçerik: hız sürgüsü (1–40, sürüklenir) + rakam kutusu (yazılarak) + belirgin çarpı (modu
   kapatır). Bir süre dokunulmazsa kendiliğinden gizlenir; okuma alanına dokunmak da açar/kapatır.
   Kullanan: KuranOkuma, OkumaEkrani (motor: data/hooks/useOtoKaydirma.js).
   ═══════════════════════════════════════════════════════════════════════════ */

import { useEffect, useRef, useState } from "react"
import { createPortal } from "react-dom"
import { X, ChevronsDown } from "lucide-react"
import { OTO_EN_AZ, OTO_EN_COK, otoHizSinirla } from "../data/hooks/useOtoKaydirma"

const GIZLEME_MS = 6000

/**
 * acik: menü görünür mü · hiz / setHiz · onGizle(): menüyü kapat · onModuKapat(): kaydırmayı bitir
 * altPay: alttaki bar vb. için boşluk (px) · olcek: arayüz ölçeği
 */
export default function KaydirmaMenusu({ acik, hiz, setHiz, onGizle, onModuKapat, theme, altPay = 0, olcek = 1 }) {
  const ac = theme.accent
  const [yazi, setYazi] = useState(String(hiz))
  const odakRef = useRef(false)
  useEffect(() => { if (!odakRef.current) setYazi(String(hiz)) }, [hiz])
  // Dokunulmazsa gizlen (yazarken / sürüklerken sayaç yenilenir)
  const zamanRef = useRef(null)
  const sayacYenile = () => {
    if (zamanRef.current) clearTimeout(zamanRef.current)
    zamanRef.current = setTimeout(() => { if (!odakRef.current) onGizle && onGizle() }, GIZLEME_MS)
  }
  useEffect(() => {
    if (!acik) { if (zamanRef.current) clearTimeout(zamanRef.current); return }
    sayacYenile()
    return () => { if (zamanRef.current) clearTimeout(zamanRef.current) }
  }, [acik]) // eslint-disable-line react-hooks/exhaustive-deps
  if (!acik || typeof document === "undefined") return null
  const px = (n) => `${Math.round(n * olcek)}px`
  const yuzde = ((hiz - OTO_EN_AZ) / (OTO_EN_COK - OTO_EN_AZ)) * 100
  const uygula = () => { const v = otoHizSinirla(yazi); setHiz(v); setYazi(String(v)) }

  return createPortal(
    <div role="dialog" aria-label="Otomatik kaydırma"
      onPointerDown={(e) => { e.stopPropagation(); sayacYenile() }}
      onClick={(e) => e.stopPropagation()}
      style={{
        position: "fixed", left: 0, right: 0, margin: "0 auto", zIndex: 480,
        bottom: `calc(${altPay + 12}px + env(safe-area-inset-bottom))`,
        width: `min(${Math.round(440 * olcek)}px, calc(100vw - 24px))`, boxSizing: "border-box",
        display: "flex", alignItems: "center", gap: px(10),
        padding: `${px(8)} ${px(8)} ${px(8)} ${px(14)}`, borderRadius: "999px",
        background: theme.surface, color: theme.text, border: `1.5px solid ${ac}`,
        boxShadow: "0 8px 26px rgba(0,0,0,0.22)", animation: "vk-km-gir .18s ease-out",
      }}>
      <style>{`@keyframes vk-km-gir { from { opacity: 0; transform: translateY(10px) } to { opacity: 1; transform: none } }
.vk-km-surgu { -webkit-appearance: none; appearance: none; height: 6px; border-radius: 3px; outline: none; cursor: pointer; touch-action: none }
.vk-km-surgu::-webkit-slider-thumb { -webkit-appearance: none; width: 22px; height: 22px; border-radius: 50%; background: var(--km-ac); border: 3px solid var(--km-zemin); box-shadow: 0 1px 4px rgba(0,0,0,.3) }
.vk-km-sayi::-webkit-inner-spin-button, .vk-km-sayi::-webkit-outer-spin-button { -webkit-appearance: none; margin: 0 }
.vk-km-surgu::-moz-range-thumb { width: 18px; height: 18px; border-radius: 50%; background: var(--km-ac); border: 3px solid var(--km-zemin) }`}</style>
      <ChevronsDown size={Math.round(18 * olcek)} color={ac} style={{ flexShrink: 0 }} aria-hidden="true" />
      <input type="range" className="vk-km-surgu" min={OTO_EN_AZ} max={OTO_EN_COK} step="1" value={hiz}
        aria-label="Kaydırma hızı" onChange={(e) => { setHiz(Number(e.target.value)); sayacYenile() }}
        style={{
          flex: 1, minWidth: 0, "--km-ac": ac, "--km-zemin": theme.surface,
          background: `linear-gradient(90deg, ${ac} ${yuzde}%, ${theme.border} ${yuzde}%)`,
        }} />
      <input type="number" inputMode="numeric" className="vk-km-sayi" min={OTO_EN_AZ} max={OTO_EN_COK} value={yazi} aria-label="Kaydırma hızı (1–40)"
        onFocus={(e) => { odakRef.current = true; e.target.select() }}
        onBlur={() => { odakRef.current = false; uygula(); sayacYenile() }}
        onChange={(e) => { setYazi(e.target.value.replace(/\D/g, "").slice(0, 2)); sayacYenile() }}
        onKeyDown={(e) => { if (e.key === "Enter") e.currentTarget.blur() }}
        style={{
          width: px(48), flexShrink: 0, textAlign: "center", padding: `${px(5)} ${px(2)}`, borderRadius: px(9),
          border: `1px solid ${theme.border}`, background: theme.background, color: theme.text,
          fontFamily: "inherit", fontSize: px(15), fontWeight: 700, fontVariantNumeric: "tabular-nums",
          MozAppearance: "textfield",
        }} />
      {/* Modu kapat — belirgin */}
      <button onClick={() => onModuKapat && onModuKapat()} aria-label="Otomatik kaydırmayı kapat" title="Otomatik kaydırmayı kapat"
        style={{
          width: px(38), height: px(38), borderRadius: "50%", flexShrink: 0, padding: 0, cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "center",
          border: "none", background: ac, color: "#fff", boxShadow: `0 2px 8px ${ac}66`,
        }}>
        <X size={Math.round(20 * olcek)} strokeWidth={2.6} />
      </button>
    </div>,
    document.body,
  )
}
