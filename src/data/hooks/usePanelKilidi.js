import { useEffect } from "react"

// ════════════════════════════════════════════════════════════════
// PANEL KAYDIRMA KİLİDİ
//
// Bir menü/panel açıkken mobilde parmakla kaydırınca ARKADAKİ SAYFA kımıldıyordu
// (lastik gibi gerilip geri geliyordu). İstenen: arka taraf HİÇ kımıldamasın; bunun
// yerine AÇIK OLAN PANEL küçük bir sarsıntı yapıp "burası kaymıyor" desin.
//
// Nasıl çalışır:
//  • Belge düzeyinde tek bir touchmove dinleyicisi kurulur (passive: false).
//  • DOM'da açık panel yoksa hiçbir şey yapılmaz → normal okuma kaydırması bozulmaz.
//  • Panel varsa: dokunulan yerin PANEL İÇİNDEKİ kaydırılabilir bir kutusu varsa
//    (ör. uzun ayar listesi) dokunmaya karışılmaz; yoksa olay iptal edilir (arka sayfa
//    kımıldamaz) ve panel(ler) kısa bir sarsıntı animasyonu oynatır.
//  • Yukarı yürüyüş panelin sınırında durur → panelin dışındaki okuma konteyneri
//    "kaydırılabilir" sayılıp arka sayfanın kaymasına izin verilmez.
//
// Panel kutularının sınıfı: .vukuf-panel (KuranOkuma + ortak bileşenler) veya
// .okuma-panel (OkumaEkrani'de zaten vardı).
// ════════════════════════════════════════════════════════════════

const PANEL_SECICI = ".vukuf-panel, .okuma-panel"
const STIL_ID = "vukuf-panel-sarsinti-stil"

// Sarsıntı `translate` (bağımsız özellik) ile yapılır; paneller ortalamak için
// `transform: translateX(-50%)` kullandığından transform'a dokunulmaz.
function stiliKur() {
  if (typeof document === "undefined" || document.getElementById(STIL_ID)) return
  const s = document.createElement("style")
  s.id = STIL_ID
  // Panel İÇİNDEKİ her kaydırılabilir kutu, sonuna gelince kaydırmayı arka sayfaya
  // ZİNCİRLEMESİN. Tek yerden verilir; her panele ayrı ayrı yazmaya gerek kalmaz.
  s.textContent = `.vukuf-panel,.okuma-panel,.vukuf-panel *,.okuma-panel *{overscroll-behavior:contain}
  @keyframes vukufPanelSarsinti{
    0%{translate:0 0}
    22%{translate:0 -7px}
    52%{translate:0 5px}
    78%{translate:0 -2px}
    100%{translate:0 0}
  }`
  document.head.appendChild(s)
}

// Dokunulan noktadan yukarı yürü: panelin İÇİNDE gerçekten kaydırılabilir bir kutu var mı?
function panelIcindeKaydirilabilir(el) {
  let n = el
  while (n && n !== document.body) {
    if (n.scrollHeight > n.clientHeight + 2) {
      const ov = getComputedStyle(n).overflowY
      if (ov === "auto" || ov === "scroll") return true
    }
    // Panel sınırına geldik: dışarısı (okuma konteyneri) sayılmaz
    if (n.classList && (n.classList.contains("vukuf-panel") || n.classList.contains("okuma-panel"))) return false
    n = n.parentElement
  }
  return false
}

export default function usePanelKilidi() {
  useEffect(() => {
    stiliKur()
    let sonSarsinti = 0
    const sars = (paneller) => {
      const simdi = Date.now()
      if (simdi - sonSarsinti < 480) return   // üst üste tetiklenmesin
      sonSarsinti = simdi
      paneller.forEach(p => {
        p.style.animation = "none"
        void p.offsetWidth                     // yeniden akış → animasyon baştan oynasın
        p.style.animation = "vukufPanelSarsinti 0.36s cubic-bezier(.36,.07,.19,.97)"
      })
    }
    const dokunHareket = (e) => {
      const paneller = document.querySelectorAll(PANEL_SECICI)
      if (!paneller.length) return                       // açık panel yok → karışma
      const t = e.target
      // Kendi dokunma işini yapan öğelere KARIŞMA: kaydırıcılar (range/color), metin
      // girişleri ve sürükle-bırak listeleri. Aksi hâlde slider çekilemez, sıralama bozulur.
      if (t && t.closest && t.closest("input, textarea, select, [data-panel-surukle]")) return
      if (panelIcindeKaydirilabilir(t)) return            // panelin kendi listesi kaysın
      if (e.cancelable) e.preventDefault()               // arka sayfa HİÇ kımıldamasın
      sars(paneller)
    }
    document.addEventListener("touchmove", dokunHareket, { passive: false })
    return () => document.removeEventListener("touchmove", dokunHareket)
  }, [])
}
