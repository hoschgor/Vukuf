/* VUKUF — İZLEME MODU SAHNESİ (hareketli arka plan, geçişler, hava ve ışık)
   src/data/izlemeSahne.js

   Kullanıcı (7 Ekim 2026): "izleme modunda arka plana efekt ekleyebilelim, resmin
   içinde gezebilsin, sınırsız bir döngü gibi görünebilsin; kayma ve diğer güzel
   efektler, kar-yağmur-rüzgâr gibi efektler; galeriden birden fazla resimle slayt
   gösterisi ve geçiş efektleri. Tek resimde âyet değişince resim sabit kalsın,
   efekt aynı şekilde devam etsin."

   Bu dosya YALNIZ ÇİZER (React yok): her işlev o anki zamandan (t, saniye) kareyi
   hesaplıyor, hiçbir durum tutmuyor. Bu yüzden kare atlansa da akış bozulmuyor,
   âyet değişince sahne kaldığı yerden sürüyor (saat bileşen açık kaldıkça işliyor).

   SONSUZ DÖNGÜ: hareketler sinüslerden kuruldu ve frekansları birbirine oranlı
   değil — yol hiçbir zaman "başa sarıp zıplamıyor". "Sonsuz akış"ta resim
   AYNALANARAK yan yana döşeniyor; aynalanan kenarlar birebir aynı piksel olduğu
   için ek yeri görünmüyor ve kayma ucu bucağı olmadan sürüyor. */

export const HAREKETLER = [
  { id: "sabit",   ad: "Sabit" },
  { id: "gezinti", ad: "Gezinti" },
  { id: "nefes",   ad: "Yakınlaş-Uzaklaş" },
  { id: "kaydir",  ad: "Yatay Kayma" },
  { id: "akis",    ad: "Sonsuz Akış" },
]
export const HIZLAR = [
  { id: "yavas", ad: "Yavaş", k: 1 },
  { id: "orta",  ad: "Orta",  k: 1.8 },
  { id: "hizli", ad: "Hızlı", k: 3.2 },
]
export const HAVALAR = [
  { id: "yok",        ad: "Yok" },
  { id: "kar",        ad: "Kar" },
  { id: "tipi",       ad: "Tipi" },
  { id: "yagmur",     ad: "Yağmur" },
  { id: "ruzgar",     ad: "Rüzgâr" },
  { id: "yaprak",     ad: "Yaprak" },
  { id: "yildiz",     ad: "Yıldız" },
  { id: "atesbocegi", ad: "Ateş Böceği" },
  { id: "toz",        ad: "Altın Toz" },
]
export const ISIKLAR = [
  { id: "yok",   ad: "Yok" },
  { id: "huzme", ad: "Işık Hüzmesi" },
  { id: "nur",   ad: "Nur" },
  { id: "sis",   ad: "Sis" },
  { id: "bokeh", ad: "Işık Zerresi" },
]
export const GECISLER = [
  { id: "solma",    ad: "Solarak" },
  { id: "yakinlas", ad: "Yakınlaşarak" },
  { id: "kayma",    ad: "Kayarak" },
  { id: "silme",    ad: "Silerek" },
  { id: "daire",    ad: "Daire" },
  { id: "perde",    ad: "Perde" },
  { id: "karisik",  ad: "Karışık" },
]
export const SLAYT_SURELERI = [8, 15, 30, 60]
export const GECIS_SN = 1.8

const hizK = (hiz) => (HIZLAR.find(h => h.id === hiz) || HIZLAR[0]).k
const yumusak = (p) => (p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2)

/* ── RESİM + KAMERA ─────────────────────────────────────────────────────────
   kaynak: { img, w, h } (img: HTMLImageElement | Canvas). faz: her slayda ayrı
   başlangıç, aynı hareket iki resimde aynı yerden başlamasın. */
export function resimCiz(ctx, W, H, kaynak, hareket, hiz, t, faz = 0) {
  if (!kaynak || !kaynak.img || !kaynak.w || !kaynak.h) return
  const { img, w: iw, h: ih } = kaynak
  const k = hizK(hiz)
  const w = 0.12 * k
  const taban = Math.max(W / iw, H / ih)

  if (hareket === "akis") {
    // Aynalı döşeme: çift sıradakiler düz, tek sıradakiler yatay ters
    const s = taban * 1.06
    const tw = iw * s, th = ih * s
    const y0 = (H - th) / 2 + Math.sin(t * w * 0.4 + faz) * (th - H) * 0.45
    const yol = (t * W * 0.018 * k + faz * tw) % (2 * tw)
    let i = Math.floor(yol / tw)
    let x = i * tw - yol
    while (x < W) {
      if (i % 2 === 0) ctx.drawImage(img, x, y0, tw, th)
      else {
        ctx.save(); ctx.translate(x + tw, y0); ctx.scale(-1, 1)
        ctx.drawImage(img, 0, 0, tw, th)
        ctx.restore()
      }
      x += tw; i++
    }
    return
  }

  let z = 1, ux = 0, uy = 0
  if (hareket === "gezinti") {
    z = 1.17 + 0.05 * Math.sin(t * w * 0.31 + faz)
    ux = Math.sin(t * w * 0.53 + faz * 1.3)
    uy = Math.sin(t * w * 0.37 + 1 + faz * 0.7)
  } else if (hareket === "nefes") {
    z = 1.03 + 0.13 * (0.5 - 0.5 * Math.cos(t * w * 0.45 + faz))
    ux = 0.25 * Math.sin(t * w * 0.17 + faz)
  } else if (hareket === "kaydir") {
    z = 1.25
    ux = Math.sin(t * w * 0.35 + faz)
    uy = 0.15 * Math.sin(t * w * 0.21 + faz)
  }
  const s = taban * z
  const vw = W / s, vh = H / s
  const mx = Math.max(0, (iw - vw) / 2), my = Math.max(0, (ih - vh) / 2)
  const cx = iw / 2 + ux * mx, cy = ih / 2 + uy * my
  ctx.drawImage(img, cx - vw / 2, cy - vh / 2, vw, vh, 0, 0, W, H)
}

/* ── SLAYT GEÇİŞİ ───────────────────────────────────────────────────────────
   ciz1: çıkan, ciz2: gelen (ikisi de tuvali baştan sona boyar). p: 0→1 */
export function gecisCiz(ctx, W, H, ciz1, ciz2, tip, p, sira = 0) {
  if (tip === "karisik") {
    const liste = GECISLER.filter(g => g.id !== "karisik")
    tip = liste[((sira % liste.length) + liste.length) % liste.length].id
  }
  const e = yumusak(Math.min(1, Math.max(0, p)))
  if (tip === "kayma") {
    ctx.save(); ctx.translate(-e * W, 0); ciz1(); ctx.restore()
    ctx.save(); ctx.translate((1 - e) * W, 0); ciz2(); ctx.restore()
    return
  }
  ciz1()
  ctx.save()
  if (tip === "yakinlas") {
    ctx.globalAlpha = e
    const z = 1.14 - 0.14 * e
    ctx.translate(W / 2, H / 2); ctx.scale(z, z); ctx.translate(-W / 2, -H / 2)
    ciz2()
  } else if (tip === "silme") {
    ctx.beginPath(); ctx.rect(0, 0, e * W, H); ctx.clip()
    ciz2()
    ctx.restore(); ctx.save()
    // Silme ucunda ince ışık çizgisi
    if (e > 0 && e < 1) {
      const g = ctx.createLinearGradient(e * W - 18, 0, e * W + 2, 0)
      g.addColorStop(0, "rgba(255,240,205,0)"); g.addColorStop(1, "rgba(255,240,205,0.55)")
      ctx.fillStyle = g; ctx.fillRect(e * W - 18, 0, 20, H)
    }
  } else if (tip === "daire") {
    ctx.beginPath(); ctx.arc(W / 2, H / 2, e * Math.hypot(W, H) / 2 + 1, 0, Math.PI * 2); ctx.clip()
    ciz2()
  } else if (tip === "perde") {
    const N = 9, sw = W / N
    ctx.beginPath()
    for (let i = 0; i < N; i++) {
      const gecik = (i / N) * 0.35
      const q = Math.min(1, Math.max(0, (e - gecik) / 0.65))
      ctx.rect(i * sw, 0, sw * q + 0.5, H)
    }
    ctx.clip()
    ciz2()
  } else {                                   // solma
    ctx.globalAlpha = e
    ciz2()
  }
  ctx.restore()
}

/* ── HAVA (parçacıklar) ─────────────────────────────────────────────────────
   Parçacıklar bir kez üretilir; konumlar her karede zamandan hesaplanır. */
function rastgele(tohum) {
  let t = tohum >>> 0
  return () => { t = (t * 1103515245 + 12345) & 0x7fffffff; return t / 0x7fffffff }
}
const HAVA_ADET = { kar: 130, tipi: 170, yagmur: 170, ruzgar: 60, yaprak: 16, yildiz: 110, atesbocegi: 26, toz: 70 }
export function havaKur(hava, W, H) {
  const n = HAVA_ADET[hava] || 0
  const r = rastgele(20261007)
  const S = Math.min(W, H)
  const p = []
  for (let i = 0; i < n; i++) {
    p.push({ x: r(), y: r(), b: 0.35 + r() * 0.9, h: 0.4 + r() * 0.8, s: r() * Math.PI * 2, o: 0.3 + r() * 0.6, k: S / 900, c: r() })
  }
  return p
}
const sarmala = (v) => ((v % 1) + 1) % 1

export function havaCiz(ctx, hava, ps, W, H, t) {
  if (!ps || !ps.length) return
  const S = Math.min(W, H)
  ctx.save()
  if (hava === "kar" || hava === "tipi") {
    const tipi = hava === "tipi"
    ctx.fillStyle = "#ffffff"
    for (const p of ps) {
      // Derinlik: büyük taneler daha hızlı ve daha parlak (yakındakiler)
      const hiz = (tipi ? 0.13 : 0.045) * p.h * (0.6 + p.b * 0.6)
      const y = sarmala(p.y + t * hiz) * H * 1.1 - H * 0.05
      const x = tipi
        ? sarmala(p.x + t * 0.16 * p.h + Math.sin(t * 2 + p.s) * 0.004) * W * 1.1 - W * 0.05
        : p.x * W + Math.sin(t * 0.8 * p.h + p.s) * S * 0.035
      ctx.globalAlpha = p.o * (tipi ? 0.85 : 0.9)
      ctx.beginPath(); ctx.arc(x, y, p.b * 3 * p.k + 0.4, 0, Math.PI * 2); ctx.fill()
    }
  } else if (hava === "yagmur") {
    ctx.strokeStyle = "#dbe9f5"
    ctx.lineCap = "round"
    const egim = 0.16
    for (const p of ps) {
      const uz = S * 0.035 * p.b
      const y = sarmala(p.y + t * 0.95 * p.h) * (H + uz * 2) - uz
      const x = sarmala(p.x + (y / H) * egim * 0.25) * W
      ctx.globalAlpha = p.o * 0.45
      ctx.lineWidth = Math.max(1, 1.3 * p.b * p.k)
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - uz * egim, y + uz); ctx.stroke()
    }
  } else if (hava === "ruzgar") {
    // Uzun, kıvrımlı rüzgâr çizgileri + savrulan ince zerreler
    ctx.lineCap = "round"
    for (let i = 0; i < ps.length; i++) {
      const p = ps[i]
      if (i % 3 === 0) {
        const yol = sarmala(p.x + t * 0.11 * p.h)          // 0→1 ekranı geçiş
        const x = yol * W * 1.6 - W * 0.3
        const y = p.y * H + Math.sin(t * 0.6 + p.s) * S * 0.03
        const L = S * (0.18 + 0.25 * p.b)
        const a = Math.sin(yol * Math.PI) * 0.34 * p.o
        ctx.strokeStyle = `rgba(255,255,255,${a})`
        ctx.lineWidth = Math.max(1.2, 2.2 * p.k)
        ctx.beginPath()
        ctx.moveTo(x - L, y)
        ctx.bezierCurveTo(x - L * 0.6, y - S * 0.025 * p.b, x - L * 0.3, y + S * 0.03 * p.b, x, y - S * 0.004)
        ctx.stroke()
      } else {
        const x = sarmala(p.x + t * 0.22 * p.h) * W * 1.1 - W * 0.05
        const y = sarmala(p.y + Math.sin(t * 1.3 * p.h + p.s) * 0.02 + t * 0.01) * H
        ctx.globalAlpha = p.o * 0.5
        ctx.fillStyle = "#f3ead6"
        ctx.beginPath(); ctx.arc(x, y, p.b * 1.6 * p.k + 0.3, 0, Math.PI * 2); ctx.fill()
        ctx.globalAlpha = 1
      }
    }
  } else if (hava === "yaprak") {
    const renkler = ["#c8742f", "#b5542a", "#d9a441", "#9c6b30"]
    for (const p of ps) {
      const y = sarmala(p.y + t * 0.045 * p.h) * H * 1.2 - H * 0.1
      const x = sarmala(p.x + t * 0.012 * p.h + Math.sin(t * 0.7 * p.h + p.s) * 0.05) * W * 1.1 - W * 0.05
      const r = S * 0.02 * (0.7 + p.b * 0.6)
      const don = t * 1.1 * p.h + p.s
      ctx.save()
      ctx.translate(x, y); ctx.rotate(don)
      ctx.scale(1, 0.45 + 0.55 * Math.abs(Math.cos(don * 0.8)))   // dönerken incelip kalınlaşır
      ctx.globalAlpha = 0.85
      ctx.fillStyle = renkler[Math.floor(p.c * renkler.length)]
      ctx.beginPath()
      ctx.moveTo(-r, 0)
      ctx.quadraticCurveTo(0, -r * 0.7, r, 0)
      ctx.quadraticCurveTo(0, r * 0.7, -r, 0)
      ctx.fill()
      ctx.strokeStyle = "rgba(60,30,10,0.45)"; ctx.lineWidth = Math.max(0.6, r * 0.08)
      ctx.beginPath(); ctx.moveTo(-r * 0.9, 0); ctx.lineTo(r * 0.9, 0); ctx.stroke()
      ctx.restore()
    }
  } else if (hava === "yildiz") {
    ctx.fillStyle = "#fff6dc"
    for (const p of ps) {
      const par = 0.3 + 0.7 * (0.5 + 0.5 * Math.sin(t * 1.4 * p.h + p.s))
      ctx.globalAlpha = p.o * par
      ctx.beginPath(); ctx.arc(p.x * W, p.y * H * 0.9, p.b * 1.9 * p.k + 0.3, 0, Math.PI * 2); ctx.fill()
    }
    // Arada bir kayan yıldız (her ~11 sn'de bir, 0,9 sn sürer)
    const dongu = 11, an = t % dongu, sira = Math.floor(t / dongu)
    if (an < 0.9) {
      const r = rastgele(sira * 7919 + 3)
      const x0 = W * (0.15 + r() * 0.6), y0 = H * (0.05 + r() * 0.25)
      const q = an / 0.9, L = S * 0.22
      const x = x0 + q * S * 0.35, y = y0 + q * S * 0.12
      const g = ctx.createLinearGradient(x - L, y - L * 0.34, x, y)
      g.addColorStop(0, "rgba(255,250,230,0)"); g.addColorStop(1, `rgba(255,250,230,${0.8 * Math.sin(q * Math.PI)})`)
      ctx.globalAlpha = 1; ctx.strokeStyle = g; ctx.lineWidth = Math.max(1, S * 0.002)
      ctx.beginPath(); ctx.moveTo(x - L, y - L * 0.34); ctx.lineTo(x, y); ctx.stroke()
    }
  } else if (hava === "atesbocegi") {
    ctx.globalCompositeOperation = "lighter"
    for (const p of ps) {
      const x = p.x * W + Math.sin(t * 0.23 * p.h + p.s) * S * 0.12
      const y = (0.35 + p.y * 0.65) * H + Math.cos(t * 0.19 * p.h + p.s * 1.7) * S * 0.09
      const yan = Math.pow(Math.max(0, Math.sin(t * 1.1 * p.h + p.s)), 2)
      if (yan < 0.02) continue
      const r = S * 0.014 * (0.6 + p.b * 0.6)
      const g = ctx.createRadialGradient(x, y, 0, x, y, r)
      g.addColorStop(0, `rgba(240,250,170,${0.9 * yan})`)
      g.addColorStop(0.25, `rgba(205,240,120,${0.45 * yan})`)
      g.addColorStop(1, "rgba(180,230,100,0)")
      ctx.fillStyle = g
      ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill()
    }
  } else if (hava === "toz") {
    ctx.fillStyle = "#e8c877"
    for (const p of ps) {
      const y = sarmala(p.y - t * 0.03 * p.h)
      const x = p.x * W + Math.sin(t * 0.5 * p.h + p.s) * S * 0.05
      ctx.globalAlpha = p.o * (0.35 + 0.35 * Math.sin(t * 1.1 + p.s))
      ctx.beginPath(); ctx.arc(x, y * H, p.b * 2.3 * p.k + 0.3, 0, Math.PI * 2); ctx.fill()
    }
  }
  ctx.restore()
}

/* ── IŞIK ───────────────────────────────────────────────────────────────── */
export function isikCiz(ctx, isik, W, H, t) {
  if (!isik || isik === "yok") return
  const S = Math.min(W, H)
  ctx.save()
  ctx.globalCompositeOperation = "lighter"
  if (isik === "huzme") {
    // Üstten süzülen, yavaşça salınan üç ışık hüzmesi
    for (let i = 0; i < 3; i++) {
      const bx = W * (0.18 + i * 0.3) + Math.sin(t * 0.07 + i * 2.1) * W * 0.07
      const gen = S * (0.10 + 0.05 * i)
      const a = 0.07 + 0.05 * (0.5 + 0.5 * Math.sin(t * 0.35 + i * 1.7))
      const egim = W * 0.28
      const g = ctx.createLinearGradient(0, 0, 0, H)
      g.addColorStop(0, `rgba(255,242,210,${a})`)
      g.addColorStop(0.6, `rgba(255,242,210,${a * 0.35})`)
      g.addColorStop(1, "rgba(255,242,210,0)")
      ctx.fillStyle = g
      for (const kat of [1, 0.6, 0.3]) {           // iç içe → yumuşak kenar
        ctx.beginPath()
        ctx.moveTo(bx - gen * 0.25 * kat, -2)
        ctx.lineTo(bx + gen * 0.25 * kat, -2)
        ctx.lineTo(bx + egim + gen * kat, H + 2)
        ctx.lineTo(bx + egim - gen * kat, H + 2)
        ctx.closePath()
        ctx.globalAlpha = 0.55
        ctx.fill()
      }
    }
  } else if (isik === "nur") {
    const a = 0.10 + 0.06 * Math.sin(t * 0.5)
    const g = ctx.createRadialGradient(W / 2, H * 0.06, 0, W / 2, H * 0.06, Math.max(W, H) * 0.7)
    g.addColorStop(0, `rgba(255,236,190,${a + 0.06})`)
    g.addColorStop(0.45, `rgba(255,236,190,${a * 0.45})`)
    g.addColorStop(1, "rgba(255,236,190,0)")
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H)
  } else if (isik === "sis") {
    ctx.globalCompositeOperation = "source-over"
    for (let i = 0; i < 5; i++) {
      const x = sarmala(i * 0.23 + t * (0.008 + i * 0.003)) * W * 1.6 - W * 0.3
      const y = H * (0.45 + 0.11 * i) + Math.sin(t * 0.1 + i) * H * 0.02
      const rx = W * (0.45 + 0.08 * i), ry = H * 0.12
      ctx.save()
      ctx.translate(x, y); ctx.scale(rx / ry, 1)
      const g = ctx.createRadialGradient(0, 0, 0, 0, 0, ry)
      g.addColorStop(0, "rgba(235,238,242,0.16)")
      g.addColorStop(1, "rgba(235,238,242,0)")
      ctx.fillStyle = g
      ctx.beginPath(); ctx.arc(0, 0, ry, 0, Math.PI * 2); ctx.fill()
      ctx.restore()
    }
  } else if (isik === "bokeh") {
    const r0 = rastgele(77)
    for (let i = 0; i < 22; i++) {
      const px = r0(), py = r0(), pb = r0(), ph = 0.4 + r0() * 0.8, ps = r0() * 6.28
      const x = px * W + Math.sin(t * 0.08 * ph + ps) * S * 0.06
      const y = sarmala(py - t * 0.008 * ph) * H * 1.2 - H * 0.1
      const r = S * (0.025 + 0.055 * pb)
      const a = 0.05 + 0.07 * (0.5 + 0.5 * Math.sin(t * 0.4 * ph + ps))
      const g = ctx.createRadialGradient(x, y, r * 0.2, x, y, r)
      g.addColorStop(0, `rgba(255,226,170,${a})`)
      g.addColorStop(0.75, `rgba(255,226,170,${a * 0.8})`)
      g.addColorStop(1, "rgba(255,226,170,0)")
      ctx.fillStyle = g
      ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill()
    }
  }
  ctx.restore()
}

/* Bu ayarlarla saniyede kaç kare gerekiyor? Hızlı parçacık yoksa 30 yeter (pil). */
export function kareHizi(hava, isik) {
  if (hava === "yagmur" || hava === "tipi" || hava === "ruzgar" || hava === "kar") return 60
  if (isik === "bokeh") return 40
  return 30
}
