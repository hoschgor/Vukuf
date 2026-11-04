/* ═══════════════════════════════════════════════════════════════════════════
   VUKUF — SAAT ŞERİDİ (iPhone ana ekran uygulamasında durum çubuğu)
   src/data/saatSeridi.js

   5 Kasım 2026 — kullanıcı: "vercel ile yüklediğimde perde sorunu oluyor … perde
   bazen geliyor, bazen gidiyor. Bu sebeple odaklama da karışabiliyor. Kendi
   uygulamamızda daha rahat kontrol edebiliriz hatta kaldırabiliriz gibi bile geliyor."
   SEBEP (araştırma): Vercel değil iOS. iOS 26.1'den beri `black-translucent` ile ana
   ekrana eklenen web uygulamalarında sistem saat şeridinin üstüne bir gölge/bulanıklık
   (perde) çiziyor; sayfadan kapatılamıyor (WebKit 301994, 317153). Tek kesin çare
   şeridi opak yapmak: `default` → şerit `theme-color` ile boyanır, sayfa saatin
   ALTINDAN başlar, `env(safe-area-inset-top)` 0 olur (yerleşim kendiliğinden toparlanır).
   Kullanıcı "Ayarlardan seçilsin" dedi:
     "saydam" (varsayılan, eski davranış) — içerik saatin altına uzanır, perde iOS'ta
     "tema"   — perde yok, şerit tema renginde
   ⚠ iOS bu ayarı ana ekrana EKLENİRKEN saklıyor (uygulama simgesi gibi): seçim, uygulama
   ana ekrandan silinip yeniden eklenince geçerli olur. index.html açılışta bu anahtara
   göre durum çubuğu etiketini ve theme-color'u yazıyor; burada seçim anında da
   yazılıyor ki sayfa yenilenmeden "Ana Ekrana Ekle" yeni ayarı alsın.
   ═══════════════════════════════════════════════════════════════════════════ */

export const SERIT_ANAHTAR = "vukuf-saat-seridi"         // "saydam" | "tema"
const RENK_ANAHTAR = "vukuf-saat-seridi-renk"             // index.html ilk boyama için
export const SERIT_OLAY = "vukuf-saat-seridi"

export function saatSeridiOku() {
  try { return localStorage.getItem(SERIT_ANAHTAR) === "tema" ? "tema" : "saydam" } catch { return "saydam" }
}

/* Etiketleri seçime ve tema rengine göre yaz. Saydam kipte theme-color HİÇ olmamalı
   (App.jsx notu: varken saat şeridi opak tema bandına dönüyordu). */
export function saatSeridiUygula(renk) {
  if (typeof document === "undefined") return
  const mod = saatSeridiOku()
  try {
    const st = document.querySelector('meta[name="apple-mobile-web-app-status-bar-style"]')
    const istenen = mod === "tema" ? "default" : "black-translucent"
    if (st && st.getAttribute("content") !== istenen) st.setAttribute("content", istenen)
    const metalar = document.querySelectorAll('meta[name="theme-color"]')
    if (mod === "tema" && renk) {
      let m = metalar[0]
      metalar.forEach((x, i) => { if (i > 0) x.remove() })
      if (!m) { m = document.createElement("meta"); m.setAttribute("name", "theme-color"); document.head.appendChild(m) }
      if (m.getAttribute("content") !== renk) m.setAttribute("content", renk)
      try { localStorage.setItem(RENK_ANAHTAR, renk) } catch { /* yoksay */ }
    } else if (mod !== "tema") {
      metalar.forEach(x => x.remove())
    }
  } catch { /* yoksay */ }
}

export function saatSeridiYaz(mod, renk) {
  try { localStorage.setItem(SERIT_ANAHTAR, mod === "tema" ? "tema" : "saydam") } catch { /* yoksay */ }
  saatSeridiUygula(renk)
  try { window.dispatchEvent(new CustomEvent(SERIT_OLAY, { detail: mod })) } catch { /* yoksay */ }
}
