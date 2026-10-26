import { useEffect, useState } from "react"
import { okunanSayfaEkle, gunlukOkunanSayfa } from "../data/gecmis"

/* ═══════════════════════════════════════════════════════════════════════════
   SAYFA FARKI BİLDİRİMİ (26 Ekim 2026)
   Kullanıcı: "Eski bir kayıttan yer değiştiriyorsak 'xxx sayfa okundu' bilgisini
   3 sn ekranda kalacak gibi gösterebiliriz. Ya da geri gelinirse '5 sayfa geri
   gelindi' gibi bir bilgi verebiliriz."
   • "Yerine koy" (YerineKoySorusu → onYerine) ile bir kaydın yeri değişince
     KuranOkuma ve OkumaEkrani bunu gösteriyor.
   • bildirim = { nonce, eski, yeni, gecenSn }: eski/yeni sayfa numarası; nonce her yeni
     bildirimde değişir (aynı fark arka arkaya gelse de yeniden görünsün diye);
     gecenSn = eski kaydın konduğu/taşındığı andan bu yana geçen saniye.
   • OKUNDU mu İLERLENDİ mi (26 Ekim 2026, kullanıcı: "normal okuma zamanından kısa
     bir sürede çok ileri sayfa ile değişim yapılırsa 'okudunuz' yerine başka bir şey
     olsun, 'ilerlediniz' olabilir"): sayfa başına en az ENAZ_SANIYE_SAYFA saniye
     geçmemişse "N sayfa ilerlendi" yazılır. Süre bilinmiyorsa (eski kayıtlar) "okundu".
   • BUGÜN TOPLAMI (26 Ekim 2026, kullanıcı: "eser içinde 00:00–23:59 arası toplam
     okunan sayfayı da kontrol etsin"; düzeltme: "1. bildirim: 2 sayfa okundu.
     2. bildirim: 1 sayfa okundu, altta 'xxx eserinde bugün toplam 3 sayfa okundu';
     ilk seferinde toplamı demesine gerek yok"):
     sayfaFarkiOlustur() "okundu" sayılan taşımanın sayfalarını günün toplamına
     ekler (data/gecmis.js → okunanSayfaEkle) ve bildirim.bugun = { sayi, once,
     eser, kuran } verir. İkinci satır yalnız bugün bu eserde DAHA ÖNCE sayılmış
     sayfa varsa (once > 0) çıkar. Geçmiş kapalıysa toplam tutulmaz.
   • Dokunmayı engellemez (pointerEvents: none); 3 sn sonra yavaşça söner.
   ═══════════════════════════════════════════════════════════════════════════ */

// Bir sayfayı okumak için gereken en kısa süre (saniye). Daha hızlı geçilen sayfalar
// "okundu" sayılmaz. Ekran başına prop ile değiştirilebilir (enAzSaniye).
export const ENAZ_SANIYE_SAYFA = 30

export function sayfaFarkiMetni(eski, yeni, gecenSn = null, enAzSaniye = ENAZ_SANIYE_SAYFA) {
  const e = Number(eski), y = Number(yeni)
  if (!Number.isFinite(e) || !Number.isFinite(y)) return null
  const fark = y - e
  if (fark > 0) {
    const hizli = Number.isFinite(gecenSn) && gecenSn >= 0 && gecenSn < fark * enAzSaniye
    return hizli ? `${fark} sayfa ilerlendi` : `${fark} sayfa okundu`
  }
  if (fark < 0) return `${-fark} sayfa geri gelindi`
  return "Kayıt aynı sayfada güncellendi"
}

export function bugunMetni(bugun) {
  if (!bugun || !(Number(bugun.sayi) > 0) || !(Number(bugun.once) > 0)) return null
  const yer = bugun.kuran ? "Kur'ân-ı Kerîm'de" : bugun.eser ? `${bugun.eser} eserinde` : "Bu eserde"
  return `${yer} bugün toplam ${bugun.sayi} sayfa okundu`
}

/* Okuma ekranlarının "yerine koy" anında çağırdığı tek giriş: bildirimi kurar,
   "okundu" sayılıyorsa sayfaları günün toplamına yazar.
   kaynak: "kitap" | "kuran"; eser: gösterilecek ad (Kur'ân'da gerekmez). */
export function sayfaFarkiOlustur({ eski, yeni, gecenSn = null, kaynak, kitapId = null, eser = null, enAzSaniye = ENAZ_SANIYE_SAYFA }) {
  const metin = sayfaFarkiMetni(eski, yeni, gecenSn, enAzSaniye) || ""
  const okundu = metin.endsWith("sayfa okundu")
  let bugun = null
  try {
    if (okundu) {
      const { once, sonra } = okunanSayfaEkle(kaynak, kitapId, eser, eski, yeni)
      bugun = { sayi: sonra, once }
    } else {
      const t = gunlukOkunanSayfa(kaynak, kitapId)
      bugun = { sayi: t, once: t }
    }
  } catch { bugun = null }
  if (bugun) { bugun.eser = eser; bugun.kuran = kaynak === "kuran" }
  return { nonce: Date.now(), eski, yeni, gecenSn, bugun }
}

export default function SayfaFarkiBildirimi({ bildirim, theme, olcek = 1, altBosluk = 0, sure = 3000, enAzSaniye = ENAZ_SANIYE_SAYFA }) {
  const [gorunur, setGorunur] = useState(false)
  const nonce = bildirim ? bildirim.nonce : null

  useEffect(() => {
    if (nonce == null) return
    setGorunur(true)
    const t = setTimeout(() => setGorunur(false), sure)
    return () => clearTimeout(t)
  }, [nonce, sure])

  if (!bildirim) return null
  const metin = sayfaFarkiMetni(bildirim.eski, bildirim.yeni, bildirim.gecenSn, enAzSaniye)
  if (!metin) return null
  const ayniSayfa = Number(bildirim.eski) === Number(bildirim.yeni)
  const bugun = bugunMetni(bildirim.bugun)

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
        borderRadius: bugun ? `${Math.round(16 * olcek)}px` : "999px",
        padding: `${Math.round(8 * olcek)}px ${Math.round(18 * olcek)}px`,
        boxShadow: "0 4px 18px rgba(0,0,0,0.15)",
        fontSize: `${Math.round(13 * olcek)}px`,
        maxWidth: "calc(100vw - 32px)",
        boxSizing: "border-box",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: `${Math.round(3 * olcek)}px`,
        textAlign: "center",
      }}
    >
      <span style={{ display: "flex", alignItems: "baseline", gap: `${Math.round(8 * olcek)}px`, whiteSpace: "nowrap" }}>
        <span style={{ color: theme.accent, fontWeight: 600 }}>{metin}</span>
        {!ayniSayfa && (
          <span style={{ color: theme.textSecondary, fontSize: "0.88em" }}>
            s. {bildirim.eski} → s. {bildirim.yeni}
          </span>
        )}
      </span>
      {bugun && (
        <span style={{ color: theme.textSecondary, fontSize: "0.9em", lineHeight: 1.35 }}>{bugun}</span>
      )}
    </div>
  )
}
