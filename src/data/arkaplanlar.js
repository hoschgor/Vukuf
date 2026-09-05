// ════════════════════════════════════════════════════════════════
// GÖRSEL OLUŞTURUCU — ARKA PLANLAR
//
// İki tür arka plan var:
//   1) DESENLER  → kodla çizilir, dosya gerektirmez, her zaman çalışır (telif sorunu yok).
//   2) GORSELLER → public/arkaplan/ klasörüne KENDİ koyduğun fotoğraflar.
//
// KENDİ FOTOĞRAFINI EKLEMEK İÇİN:
//   • Dosyayı  public/arkaplan/  klasörüne at   (ör. public/arkaplan/kabe.jpg)
//   • Aşağıdaki GORSELLER dizisine bir satır ekle:
//         { id: "kabe", ad: "Kâbe", src: "/arkaplan/kabe.jpg", koyu: true },
//     koyu: true  → görsel KOYU (yazı beyaz olur)
//     koyu: false → görsel AÇIK  (yazı koyu olur)
//   • Dosya yoksa liste otomatik gizler; uygulama hata vermez.
//
// Aşağıdaki GORSELLER kayıtları hazır bekliyor: aynı isimle dosya koyarsan
// kendiliğinden listede belirir, koymazsan hiç görünmez.
// ════════════════════════════════════════════════════════════════

export const GORSELLER = [
  { id: "kabe",     ad: "Kâbe",             src: "/arkaplan/kabe.jpg",     koyu: true },
  { id: "nebevi",   ad: "Mescid-i Nebevî",  src: "/arkaplan/nebevi.jpg",   koyu: true },
  { id: "aksa",     ad: "Mescid-i Aksâ",    src: "/arkaplan/aksa.jpg",     koyu: true },
  { id: "manzara",  ad: "Manzara",          src: "/arkaplan/manzara.jpg",  koyu: true },
  { id: "cami",     ad: "Cami İçi",         src: "/arkaplan/cami.jpg",     koyu: true },
  { id: "hat",      ad: "Hat / Tezhip",     src: "/arkaplan/hat.jpg",      koyu: false },
]

// ── Yardımcılar ────────────────────────────────────────────────
const dikeyGrad = (ctx, w, h, duraklar) => {
  const g = ctx.createLinearGradient(0, 0, 0, h)
  duraklar.forEach(([p, c]) => g.addColorStop(p, c))
  ctx.fillStyle = g; ctx.fillRect(0, 0, w, h)
}
const capGrad = (ctx, w, h, duraklar) => {
  const g = ctx.createLinearGradient(0, 0, w, h)
  duraklar.forEach(([p, c]) => g.addColorStop(p, c))
  ctx.fillStyle = g; ctx.fillRect(0, 0, w, h)
}
// Merkezden dışa doğru kararan yumuşak vinyet — metni öne çıkarır
const vinyet = (ctx, w, h, guc = 0.55, renk = "0,0,0") => {
  const r = Math.max(w, h) * 0.75
  const g = ctx.createRadialGradient(w / 2, h / 2, r * 0.18, w / 2, h / 2, r)
  g.addColorStop(0, `rgba(${renk},0)`)
  g.addColorStop(1, `rgba(${renk},${guc})`)
  ctx.fillStyle = g; ctx.fillRect(0, 0, w, h)
}
// Sekiz köşeli yıldız (İslami geometride "hatâyî/rub el-hizb" motifi) — ton üstü ton
const yildizDoku = (ctx, w, h, adim, renk, kalinlik) => {
  ctx.save()
  ctx.strokeStyle = renk; ctx.lineWidth = kalinlik
  for (let y = -adim; y < h + adim; y += adim) {
    for (let x = -adim; x < w + adim; x += adim) {
      const r = adim * 0.42
      ctx.beginPath()
      for (let i = 0; i < 8; i++) {
        const a1 = (Math.PI / 4) * i
        const a2 = a1 + Math.PI / 4
        ctx.moveTo(x + adim / 2 + r * Math.cos(a1), y + adim / 2 + r * Math.sin(a1))
        ctx.lineTo(x + adim / 2 + r * Math.cos(a2 + Math.PI / 2), y + adim / 2 + r * Math.sin(a2 + Math.PI / 2))
      }
      ctx.stroke()
    }
  }
  ctx.restore()
}
const yildizlar = (ctx, w, h, adet, renk) => {
  ctx.save()
  ctx.fillStyle = renk
  let tohum = 20250905
  const rast = () => { tohum = (tohum * 1103515245 + 12345) & 0x7fffffff; return tohum / 0x7fffffff }
  for (let i = 0; i < adet; i++) {
    const x = rast() * w, y = rast() * h * 0.75, r = rast() * (Math.min(w, h) / 900) * 2.2 + 0.6
    ctx.globalAlpha = 0.25 + rast() * 0.65
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill()
  }
  ctx.restore()
}
const kagitDoku = (ctx, w, h, guc = 0.05) => {
  ctx.save()
  let tohum = 7717
  const rast = () => { tohum = (tohum * 1103515245 + 12345) & 0x7fffffff; return tohum / 0x7fffffff }
  const n = Math.round((w * h) / 2600)
  for (let i = 0; i < n; i++) {
    ctx.globalAlpha = guc * rast()
    ctx.fillStyle = rast() > 0.5 ? "#000" : "#fff"
    ctx.fillRect(rast() * w, rast() * h, 2, 2)
  }
  ctx.restore()
}

// ── Kodla çizilen arka planlar ─────────────────────────────────
export const DESENLER = [
  {
    id: "zumrut", ad: "Zümrüt Gece", koyu: true,
    ciz(ctx, w, h) {
      dikeyGrad(ctx, w, h, [[0, "#0b2b22"], [0.55, "#0f3d30"], [1, "#061a14"]])
      yildizDoku(ctx, w, h, Math.min(w, h) / 6, "rgba(212,175,55,0.10)", Math.max(1, w / 900))
      vinyet(ctx, w, h, 0.5)
    },
  },
  {
    id: "altin", ad: "Altın Karanlık", koyu: true,
    ciz(ctx, w, h) {
      dikeyGrad(ctx, w, h, [[0, "#151208"], [0.5, "#221b0d"], [1, "#0b0906"]])
      const g = ctx.createRadialGradient(w / 2, h * 0.42, 0, w / 2, h * 0.42, Math.max(w, h) * 0.6)
      g.addColorStop(0, "rgba(212,175,55,0.22)")
      g.addColorStop(1, "rgba(212,175,55,0)")
      ctx.fillStyle = g; ctx.fillRect(0, 0, w, h)
      vinyet(ctx, w, h, 0.55)
    },
  },
  {
    id: "lacivert", ad: "Lâcivert Semâ", koyu: true,
    ciz(ctx, w, h) {
      dikeyGrad(ctx, w, h, [[0, "#050a1c"], [0.6, "#0d1738"], [1, "#1b2450"]])
      yildizlar(ctx, w, h, Math.round((w * h) / 9000), "#ffffff")
      vinyet(ctx, w, h, 0.4)
    },
  },
  {
    id: "gunbatimi", ad: "Çöl Gün Batımı", koyu: true,
    ciz(ctx, w, h) {
      dikeyGrad(ctx, w, h, [[0, "#2a1436"], [0.45, "#7a2f3a"], [0.78, "#c9662f"], [1, "#e8a44a"]])
      vinyet(ctx, w, h, 0.45)
    },
  },
  {
    id: "mermer", ad: "Mermer", koyu: false,
    ciz(ctx, w, h) {
      capGrad(ctx, w, h, [[0, "#fbfaf7"], [0.5, "#eeebe4"], [1, "#e2ded4"]])
      ctx.save()
      ctx.strokeStyle = "rgba(120,110,95,0.13)"
      let tohum = 4242
      const rast = () => { tohum = (tohum * 1103515245 + 12345) & 0x7fffffff; return tohum / 0x7fffffff }
      for (let i = 0; i < 26; i++) {
        ctx.lineWidth = (rast() * 2 + 0.4) * (w / 1080)
        ctx.beginPath()
        let x = rast() * w, y = -10
        ctx.moveTo(x, y)
        while (y < h + 10) { x += (rast() - 0.45) * w * 0.09; y += h * 0.07; ctx.lineTo(x, y) }
        ctx.stroke()
      }
      ctx.restore()
      kagitDoku(ctx, w, h, 0.04)
    },
  },
  {
    id: "krem", ad: "Krem Kâğıt", koyu: false,
    ciz(ctx, w, h) {
      dikeyGrad(ctx, w, h, [[0, "#faf3e3"], [1, "#efe3ca"]])
      kagitDoku(ctx, w, h, 0.06)
      vinyet(ctx, w, h, 0.16, "120,95,55")
    },
  },
  {
    id: "geometrik", ad: "Geometrik Motif", koyu: true,
    ciz(ctx, w, h) {
      dikeyGrad(ctx, w, h, [[0, "#12212b"], [1, "#0a1218"]])
      yildizDoku(ctx, w, h, Math.min(w, h) / 9, "rgba(140,190,200,0.12)", Math.max(1, w / 1100))
      yildizDoku(ctx, w, h, Math.min(w, h) / 4.5, "rgba(212,175,55,0.09)", Math.max(1, w / 800))
      vinyet(ctx, w, h, 0.5)
    },
  },
  {
    id: "gul", ad: "Gül Kurusu", koyu: true,
    ciz(ctx, w, h) {
      capGrad(ctx, w, h, [[0, "#3a1b22"], [0.55, "#5c2a33"], [1, "#231016"]])
      yildizDoku(ctx, w, h, Math.min(w, h) / 7, "rgba(240,220,200,0.07)", Math.max(1, w / 1000))
      vinyet(ctx, w, h, 0.45)
    },
  },
  {
    id: "duz-koyu", ad: "Düz Koyu", koyu: true,
    ciz(ctx, w, h) { ctx.fillStyle = "#111417"; ctx.fillRect(0, 0, w, h) },
  },
  {
    id: "duz-acik", ad: "Düz Açık", koyu: false,
    ciz(ctx, w, h) { ctx.fillStyle = "#f7f5f0"; ctx.fillRect(0, 0, w, h) },
  },
]

export default { DESENLER, GORSELLER }
