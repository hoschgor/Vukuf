/* ═══════════════════════════════════════════════════════════════════════════
   VUKUF — AYAR PANELİ YARDIMCILARI
   src/components/PanelAyirac.jsx

   Aa (yazı tercihleri) panelinin ortak parçaları. Üçü de HEM mushaf
   (KuranOkuma) HEM Risale (OkumaEkrani) panelinde kullanılıyor; iki dosyaya iki
   kopya konsaydı biri diğerinden sessizce ayrışırdı — bu projede aynı bilginin
   iki yerde tutulması daha önce iki ayrı hataya yol açmıştı (vakıf renk tablosu
   ile harf tablosunun ayrışması). Tek kaynak.

   ── 1) PanelAyirac — bölüm ayracı ─────────────────────────────────────────
   NİÇİN ÇİZGİ DEĞİL DE ÇİZGİ + ELMAS: bölümler arası boşluğu büyütmek
   yetmiyordu; "yazı boyutu / satır aralığı / harf aralığı" arka arkaya üç
   başlık + üç kaydırıcı olarak gelince göz birinin nerede bittiğini seçemiyor.
   Düz bir çizgi bunu çözer ama paneli forma benzetir. Ortadaki küçük elmas,
   uygulamanın başka yerinde de kullanılan "çizgi + süs + çizgi" ayraç diline
   uyuyor (bkz. lâhika bölüm ayracı) ve bitişi boşluktan çok daha net söylüyor.
   Çizgiler kenarlara doğru SÖNÜYOR: dar panelde keskin biten bir çizgi kutuyu
   ikiye bölünmüş gösteriyordu. ANİMASYON YOK — ayar panelinde dikkat dağıtır.

   ── 2) PanelAcilir — açılır kapanır bölüm ─────────────────────────────────
   Panel çok uzamıştı: her kaydırıcı bir başlık + bir satır demek, altı kaydırıcı
   tek başına ekranı dolduruyordu. Kaydırıcıları tek bir düğmenin altına almak,
   panelin varsayılan hâlini üç dört satıra indiriyor. Düğme kapalıyken de o anki
   değerleri ÖZET olarak yazıyor — açmadan bakabilmek için; "gizle" ile "sakla"
   arasındaki fark bu.
   AYNI ANDA TEK BÖLÜM AÇIK: ikisi birden açılırsa panel yine uzuyor ve kısaltma
   çabası boşa gidiyor (kütüphanedeki raflarda da aynı kural benimsendi).

   ── 3) panelBolumeHizala — açılan bölüme odaklanma ────────────────────────
   YUKARI açılan bölüm (yazı tipi listesi, düğmenin üstünde): panel, içeriğin
   EKLEDİĞİ yükseklik kadar kaydırılır → düğme piksel piksel yerinde kalır,
   içerik tam onun üstünde belirir. Önce `scrollIntoView({block:"end"})` vardı;
   o paneli düğme dibe oturana kadar kaydırıyor, önizleme başlığını ve içeriğin
   üst kısmını birlikte geçiyordu.
   AŞAĞI açılan bölüm: içerik panelin altından taşıyorsa EN AZ gerektiği kadar
   kaydırılır, ama düğmeyi yukarıdan kaçıracak kadar değil — açılan bölümün
   başlığı hep görünür kalır, yoksa kullanıcı neyin açıldığını göremez.
   Marjlar da sayılıyor; sayılmazsa içeriğin marjı kadar kayma kalıyor.
   ═══════════════════════════════════════════════════════════════════════════ */

import { ChevronDown, ChevronUp } from "lucide-react"

export default function PanelAyirac({ theme, bosluk = 14 }) {
  const cizgi = (yon) => ({
    flex: 1, height: "1px",
    background: `linear-gradient(to ${yon}, transparent, ${theme.border})`,
  })
  return (
    <div
      aria-hidden="true"
      style={{
        display: "flex", alignItems: "center", gap: "8px",
        margin: `${bosluk}px 0`,
      }}
    >
      <span style={cizgi("right")} />
      <span style={{
        width: "5px", height: "5px", borderRadius: "1px",
        transform: "rotate(45deg)", flexShrink: 0,
        background: theme.accent, opacity: 0.5,
      }} />
      <span style={cizgi("left")} />
    </div>
  )
}

// Açılır kapanır bölüm. `yon="yukari"` → içerik düğmenin ÜSTÜNDE (panelin
// dibindeki bölümler için; aşağı açılsa panel dışında kalıp görünmüyordu).
// Ok yönü içeriğin açıldığı yönü gösterir.
export function PanelAcilir({
  theme, Ikon, etiket, ozet, acik, onDegis,
  yon = "asagi", dugmeRef, icerikRef, children,
}) {
  const yukari = yon === "yukari"
  const dugme = (
    <button
      ref={dugmeRef}
      onClick={onDegis}
      aria-expanded={acik}
      style={{
        width: "100%", display: "flex", alignItems: "center", gap: "8px",
        padding: "9px 10px", borderRadius: "9px", cursor: "pointer",
        background: acik ? `${theme.accent}0d` : "transparent",
        border: `1px solid ${acik ? `${theme.accent}44` : theme.border}`,
        color: theme.text,
      }}
    >
      {Ikon && <Ikon size={15} color={theme.accent} style={{ flexShrink: 0 }} />}
      <span style={{ flex: 1, minWidth: 0, textAlign: "left" }}>
        <span style={{ display: "block", fontSize: "10px", letterSpacing: "1px", color: theme.textSecondary }}>{etiket}</span>
        {ozet != null && (
          <span style={{
            display: "block", fontSize: "12px", fontWeight: 600,
            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
          }}>{ozet}</span>
        )}
      </span>
      {/* Ok, uygulamanın her yerindeki kuralla aynı (kütüphane rafları, yazı tipi
          düğmesi): AÇIKSA YUKARI (tıklarsan kapanır), kapalıysa aşağı. Bir ara
          açılma yönüne bağlanmıştı ama o, kapalı düğmede yukarı ok gösteriyordu —
          "bu zaten açık" der gibi oluyordu. */}
      {acik
        ? <ChevronUp size={16} color={theme.textSecondary} style={{ flexShrink: 0 }} />
        : <ChevronDown size={16} color={theme.textSecondary} style={{ flexShrink: 0 }} />}
    </button>
  )
  // display:none — unmount DEĞİL: kaydırıcıların DOM'u korunur, açılıp kapanırken
  // odak ve değer durumları yeniden kurulmaz; ölçüm (offsetHeight) de tek karede biter.
  const icerik = (
    <div
      ref={icerikRef}
      style={{
        display: acik ? "block" : "none",
        [yukari ? "marginBottom" : "marginTop"]: acik ? "10px" : "0",
      }}
    >
      {children}
    </div>
  )
  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      {yukari ? <>{icerik}{dugme}</> : <>{dugme}{icerik}</>}
    </div>
  )
}

// Açılan bölüm görünür olsun diye paneli en az gerektiği kadar kaydırır.
// Dönüş: ölçüm yapılabildiyse true (içerik henüz boyanmadıysa false → çağıran
// bir kare sonra yeniden dener).
export function panelBolumeHizala(panel, icerik, yon = "asagi", dugme = null) {
  if (!panel || !icerik || !icerik.offsetHeight) return false
  const st = window.getComputedStyle(icerik)
  const yer = icerik.offsetHeight + (parseFloat(st.marginTop) || 0) + (parseFloat(st.marginBottom) || 0)
  const enFazla = Math.max(0, panel.scrollHeight - panel.clientHeight)
  let hedef = panel.scrollTop
  if (yon === "yukari") {
    // İçerik düğmenin üstünde açıldı → düğmeyi yerinde tutmak için aynı kadar in.
    hedef = panel.scrollTop + yer
  } else {
    const pr = panel.getBoundingClientRect()
    const ir = icerik.getBoundingClientRect()
    const tasma = ir.bottom - pr.bottom
    if (tasma > 0) {
      // Düğmenin üstten kaçmasına izin verilen pay (hep görünür kalsın).
      const pay = dugme ? Math.max(0, dugme.getBoundingClientRect().top - pr.top) : tasma
      hedef = panel.scrollTop + Math.min(tasma, pay)
    }
  }
  panel.scrollTo({ top: Math.max(0, Math.min(enFazla, hedef)), behavior: "smooth" })
  return true
}
