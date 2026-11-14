/* ═══════════════════════════════════════════════════════════════════════════
   VUKUF — KİTAPLIK'TA NAMAZ VAKTİ RAFI (dolabın en üst bölmesi)
   src/components/NamazKutuphaneKarti.jsx

   14 Kasım 2026 — kullanıcı: "Ekstralar bölümündeki Namaz vakitleri için oluşturulan kart,
   kütüphanede üst kısma istek dahilinde alınabilsin … Kütüphanede kartta görünecekler ise,
   Şehir İsmi, alt kısımda cami ve vakitler (kerahat vakitleri ve mübarek günler sayacı
   dahil) miladi ve hicri gün görüntülensin. Sonraki vakitlere tıklama işlevi aynı şekilde
   çalışsın fakat bilgi vermeye gerek yok."
   (2) "Kitaplıktaki kart da küçültülebilsin … Kartı kütüphane parçası gibi yapalım,
   küçüldüğünde de raf gibi görünsün, ekstralar kısmındaki gibi sıradaki vakit ve kalan
   zaman yazsın, kerahat vakti içerisindeysek onu da sağ kısma ufak olarak eklesin."
   (3) [cami içi fotoğrafı] "Bunu da resimli modda kullanabiliriz, raf aralarında boşluk
   olmasın, düzenleme kısmında nasılsa en üstte duracak … Raf açıldığında da resim
   animasyonla gizlenip kart yukarıya çıkabilir."

   ARTIK DOLABIN İÇİNDE: dolabın tacının hemen altında, bütün genişlikte İLK BÖLME
   (Kutuphane.jsx → DOLAP). Aralarında boşluk yok; direkler, üst ray, raf dudağı ve levha
   bandı öbür raflarla aynı parçalar (prop olarak geliyor). Sürüklenmez, hep en üstte.
     • Kapalıyken bir raf gibi: içi resimli modda cami içi fotoğrafı (öbür raf resimleriyle
       aynı renk eşitlemesi — RafIci), çizimli modda boş raf (mum/kandil), sade modda yok;
       altta LEVHA: şehir adı, sıradaki vakit ve kalan süre, kerahat içindeysek sağda küçük
       rozet, en sağda ok. Rafa ya da levhaya dokununca açılır.
     • Açılınca fotoğraf yukarı doğru kapanarak gizlenir, yerine iç pano (cami + vakitler +
       tarih) yükselir. Levhaya dokununca yeniden kapanır. Durum cihazda saklanır.
   Geniş ekranda iç pano 560 px'te ortalanır (cami çizimi bütün dolap eninde dev olmasın).

   Ekstralar → Namaz Vakitleri → İşlevler → "Kütüphane'ye kart olarak ekle" ile görünür
   (data/namazVakitleri.js → useNamazKarti). Vakitler cihazdaki önbellekten okunur.
   Konum seçilmemişse ya da konum bilgisi silinmişse görünmez.
   ═══════════════════════════════════════════════════════════════════════════ */

import { useEffect, useState } from "react"
import { Clock, ChevronDown } from "lucide-react"
import NamazVakitGorunumu from "./NamazVakitGorunumu"
import {
  secimOku, vakitleriGetir, durumHesapla, useNamazKarti, KONUM_SILINDI, kalanMetni, ramazanHedefi, kerahatDurumu,
} from "../data/namazVakitleri"

const KUCUK_ANAHTAR = "vukuf-namaz-kutuphane-kucuk"
export const NAMAZ_RAF_RESMI = { src: "/raflar/namaz-vakti.webp", konum: "50% 58%" }
const GECIS = "0.45s cubic-bezier(.4,0,.2,1)"

/**
 * p: rafPaleti(theme) · Direk / RafIci: Kitaplık'ın dolap parçaları · direkEn: direk eni (px)
 * gorunum: "resimli" | "cizimli" | "sade" · icYuk: öbür rafların iç yüksekliği (px)
 */
export default function NamazKutuphaneKarti(props) {
  const acik = useNamazKarti()
  if (!acik) return null
  return <Raf {...props} />
}

function Raf({ theme, isMobile, p, Direk, RafIci, direkEn, gorunum = "resimli", icYuk }) {
  const [secim, setSecim] = useState(secimOku)
  const [liste, setListe] = useState(null)
  const [seciliVakit, setSeciliVakit] = useState(null)
  const [kucuk, setKucukD] = useState(() => { try { return localStorage.getItem(KUCUK_ANAHTAR) !== "0" } catch { return true } })
  const setKucuk = (v) => { setKucukD(v); try { localStorage.setItem(KUCUK_ANAHTAR, v ? "1" : "0") } catch { /* yoksay */ } }
  const [, setTik] = useState(0)

  useEffect(() => {
    const f = () => { setSecim(null); setListe(null) }
    window.addEventListener(KONUM_SILINDI, f)
    return () => window.removeEventListener(KONUM_SILINDI, f)
  }, [])
  useEffect(() => {
    if (!secim) return
    let iptal = false
    vakitleriGetir(secim.ilceId).then(l => { if (!iptal) setListe(l) }).catch(() => { /* çevrimdışı ve önbellek yok: görünmez */ })
    return () => { iptal = true }
  }, [secim])
  // Levhadaki kerahat sayacı ve mihraptaki süre saniyeli → saniyede bir tazele
  useEffect(() => {
    const t = setInterval(() => setTik(n => n + 1), 1000)
    return () => clearInterval(t)
  }, [])

  const d = liste ? durumHesapla(liste) : null
  if (!secim || !d || !d.bugun) return null
  const yer = `${secim.ilceAdi}${secim.sehirAdi && secim.sehirAdi !== secim.ilceAdi ? " · " + secim.sehirAdi : ""}`

  // Levha yazısı — Ekstralar kartının kapalı hâlindeki özetle aynı
  const simdi = Date.now()
  const ramazan = ramazanHedefi(d)
  const ozet = ramazan
    ? `${ramazan.tur === "iftar" ? "İftara" : "Sahura"} ${kalanMetni(ramazan.an - simdi)} · ${ramazan.ad} ${ramazan.saat}`
    : d.sonraki ? `${d.sonraki.ad} ${d.sonraki.saat} · ${kalanMetni(d.sonraki.an - simdi)} kaldı` : "Günün vakitleri"
  const kerahat = kerahatDurumu(d.bugun)
  const dkSn = (ms) => { const t = Math.max(0, Math.ceil(ms / 1000)); return `${Math.floor(t / 60)} dk ${String(t % 60).padStart(2, "0")} sn` }

  const en = direkEn || (isMobile ? 17 : 26)
  const rayH = isMobile ? 8 : 11
  const ac = theme.accent
  const yuk = icYuk || (isMobile ? 76 : 92)
  const icVar = gorunum !== "sade" && !!RafIci        // kapalıyken rafın içi (resim / çizim)

  return (
    <section aria-label={`Namaz vakitleri · ${yer}`}
      onClick={kucuk ? () => setKucuk(false) : undefined}
      style={{ display: "flex", position: "relative", cursor: kucuk ? "pointer" : "default", userSelect: "none", WebkitUserSelect: "none" }}>
      <style>{`@keyframes vk-kerahat-nabiz { 0%, 100% { opacity: 1 } 50% { opacity: .35 } } .vk-kerahat-nokta { animation: vk-kerahat-nabiz 1.6s ease-in-out infinite }`}</style>
      {Direk && <Direk p={p} en={en} />}
      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
        {/* üst ray */}
        <div style={{ height: `${rayH}px`, flexShrink: 0, background: p.yatay, boxShadow: `inset 0 -1px 0 ${p.oyma}` }} />

        {/* RAFIN İÇİ — kapalıyken görünür; açılınca yukarı doğru kapanır */}
        {icVar && (
          <div aria-hidden={!kucuk} style={{
            display: "grid", gridTemplateRows: kucuk ? "1fr" : "0fr", transition: `grid-template-rows ${GECIS}`,
            background: p.c0,
          }}>
            <div style={{ minHeight: 0, overflow: "hidden", opacity: kucuk ? 1 : 0, transition: `opacity ${GECIS}` }}>
              <RafIci p={p} yuk={yuk} tam={false} detay={false} sirtlar={[]} kapak={null} canli={kucuk}
                tohum="namaz-vakitleri" resim={gorunum === "resimli" ? NAMAZ_RAF_RESMI : null} />
            </div>
          </div>
        )}

        {/* İÇ PANO — açılınca resmin yerine yükselir */}
        <div aria-hidden={kucuk} style={{
          display: "grid", gridTemplateRows: kucuk ? "0fr" : "1fr", transition: `grid-template-rows ${GECIS}`,
          background: `linear-gradient(180deg, ${p.c0} 0%, ${p.c1} 100%)`,
        }}>
          <div style={{ minHeight: 0, overflow: "hidden" }}>
            <div style={{ padding: isMobile ? "6px" : "8px" }}>
              <div style={{
                maxWidth: "560px", margin: "0 auto",
                transform: kucuk ? "translateY(40px)" : "none", opacity: kucuk ? 0 : 1,
                transition: `transform ${GECIS}, opacity ${GECIS}`,
                background: theme.surface, borderRadius: "6px", padding: isMobile ? "8px 8px 10px" : "10px 12px 12px",
                boxShadow: `inset 0 0 0 1px ${p.oyma}, 0 2px 6px rgba(0,0,0,0.35)`,
              }}>
                <NamazVakitGorunumu theme={theme} d={d} seciliVakit={seciliVakit} setSeciliVakit={setSeciliVakit} />
              </div>
            </div>
          </div>
        </div>

        {/* raf dudağı */}
        {(icVar || !kucuk) && <div style={{ height: "4px", flexShrink: 0, background: p.c3, boxShadow: "0 1px 0 rgba(0,0,0,0.4)" }} />}

        {/* LEVHA */}
        <div style={{ background: p.band, padding: isMobile ? "5px 4px 6px" : "6px 6px 8px" }}>
          <button onClick={(e) => { e.stopPropagation(); setKucuk(!kucuk) }} aria-expanded={!kucuk}
            aria-label={kucuk ? `Namaz vakitlerini aç · ${ozet}` : "Namaz vakitlerini kapat"}
            style={{
              width: "100%", minHeight: "44px", boxSizing: "border-box", borderRadius: "5px", cursor: "pointer", fontFamily: "inherit",
              background: theme.surface, color: theme.text, textAlign: "left",
              border: `1px solid ${kerahat || !kucuk ? ac : p.oyma}`,
              boxShadow: `inset 0 0 0 2px ${theme.surface}, inset 0 0 0 3px ${kerahat || !kucuk ? ac + "66" : "rgba(0,0,0,0.18)"}, 0 2px 4px rgba(0,0,0,0.35)`,
              display: "flex", alignItems: "center", gap: "9px",
              padding: isMobile ? "5px 9px" : "5px 12px",
            }}>
            <Clock size={isMobile ? 17 : 19} color={ac} style={{ flexShrink: 0 }} />
            <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", lineHeight: 1.2 }}>
              <span style={{ fontSize: isMobile ? "10.5px" : "11px", letterSpacing: "0.6px", color: theme.textSecondary, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", textTransform: "uppercase" }}>
                {yer}
              </span>
              <span style={{ fontSize: isMobile ? "13px" : "14px", fontWeight: 600, color: theme.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", fontVariantNumeric: "tabular-nums" }}>
                {ozet}
              </span>
            </span>
            {/* Kerahat vakti içindeysek: sağda küçük rozet (kalan süre) */}
            {kerahat && (
              <span role="status" title={`${kerahat.ad} · ${kerahat.basSaat}–${kerahat.bitSaat}`} style={{
                flexShrink: 0, display: "flex", flexDirection: "column", alignItems: "flex-end", lineHeight: 1.15,
                padding: "3px 7px", borderRadius: "7px", border: `1px solid ${ac}`, background: `${ac}14`,
              }}>
                <span style={{ display: "inline-flex", alignItems: "center", gap: "4px", fontSize: "9.5px", fontWeight: 700, color: ac, whiteSpace: "nowrap", letterSpacing: "0.2px" }}>
                  <span className="vk-kerahat-nokta" style={{ width: "5px", height: "5px", borderRadius: "50%", background: ac }} />
                  Kerahat
                </span>
                <span style={{ fontSize: "10px", fontWeight: 600, color: theme.text, whiteSpace: "nowrap", fontVariantNumeric: "tabular-nums" }}>
                  {dkSn(kerahat.bit - simdi)}
                </span>
              </span>
            )}
            <ChevronDown size={18} color={theme.textSecondary}
              style={{ flexShrink: 0, transition: "transform .25s ease", transform: kucuk ? "none" : "rotate(180deg)" }} />
          </button>
        </div>
      </div>
      {Direk && <Direk p={p} en={en} />}
    </section>
  )
}
