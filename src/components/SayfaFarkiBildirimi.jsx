import { useEffect, useState } from "react"

/* ═══════════════════════════════════════════════════════════════════════════
   SAYFA FARKI BİLDİRİMİ (26 Ekim 2026)
   Kullanıcı: "Eski bir kayıttan yer değiştiriyorsak 'xxx sayfa okundu' bilgisini
   3 sn ekranda kalacak gibi gösterebiliriz. Ya da geri gelinirse '5 sayfa geri
   gelindi' gibi bir bilgi verebiliriz."
   • "Yerine koy" (YerineKoySorusu → onYerine) ile bir kaydın yeri değişince
     KuranOkuma ve OkumaEkrani bunu gösteriyor.
   • bildirim = { nonce, eski, yeni }: eski/yeni sayfa numarası; nonce her yeni
     bildirimde değişir (aynı fark arka arkaya gelse de yeniden görünsün diye).
   • Dokunmayı engellemez (pointerEvents: none); 3 sn sonra yavaşça söner.
   ═══════════════════════════════════════════════════════════════════════════ */

export function sayfaFarkiMetni(eski, yeni) {
  const e = Number(eski), y = Number(yeni)
  if (!Number.isFinite(e) || !Number.isFinite(y)) return null
  const fark = y - e
  if (fark > 0) return `${fark} sayfa okundu`
  if (fark < 0) return `${-fark} sayfa geri gelindi`
  return "Kayıt aynı sayfada güncellendi"
}

export default function SayfaFarkiBildirimi({ bildirim, theme, olcek = 1, altBosluk = 0, sure = 3000 }) {
  const [gorunur, setGorunur] = useState(false)
  const nonce = bildirim ? bildirim.nonce : null

  useEffect(() => {
    if (nonce == null) return
    setGorunur(true)
    const t = setTimeout(() => setGorunur(false), sure)
    return () => clearTimeout(t)
  }, [nonce, sure])

  if (!bildirim) return null
  const metin = sayfaFarkiMetni(bildirim.eski, bildirim.yeni)
  if (!metin) return null
  const ayniSayfa = Number(bildirim.eski) === Number(bildirim.yeni)

  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        position: "fixed",
        left: "50%",
        bottom: `calc(${Math.round(altBosluk + 18)}px + env(safe-area-inset-bottom))`,
        transform: `translate(-50%, ${gorunur ? 0 : 10}px)`,
        opacity: gorunur ? 1 : 0,
        transition: "opacity 0.35s ease, transform 0.35s ease",
        pointerEvents: "none",
        zIndex: 520,
        background: theme.surface,
        color: theme.text,
        border: `1px solid ${theme.accent}55`,
        borderRadius: "999px",
        padding: `${Math.round(8 * olcek)}px ${Math.round(18 * olcek)}px`,
        boxShadow: "0 4px 18px rgba(0,0,0,0.15)",
        fontSize: `${Math.round(13 * olcek)}px`,
        whiteSpace: "nowrap",
        display: "flex",
        alignItems: "baseline",
        gap: `${Math.round(8 * olcek)}px`,
      }}
    >
      <span style={{ color: theme.accent, fontWeight: 600 }}>{metin}</span>
      {!ayniSayfa && (
        <span style={{ color: theme.textSecondary, fontSize: "0.88em" }}>
          s. {bildirim.eski} → s. {bildirim.yeni}
        </span>
      )}
    </div>
  )
}
