/* ═══════════════════════════════════════════════════════════════════════════
   VUKUF — ÇERÇEVELİ SİMGELER ve AMBLEM DÜĞMESİ (ortak, her bölümde aynı)
   src/components/CerceveliSimge.jsx

   15 Kasım 2026 — kullanıcı: "Geri dönme ve minimize butonlarını bize özgü bir şeyler
   yapabilir miyiz, merkezinde butonun amacı belli olsun, etrafı da bize özgü bir şeyler
   olsun … diğer kısımlarda da bu simgeleri kullandığımız için OOP gibi kullanırız."
   Seçimler: "Minimize ve geri dön butonları lâle olacak. Sonraki, önceki ve ses butonu
   farklı bir çerçeve olabilir. Sekiz köşeli yıldız …" · "En baştaki kısım, bölümlere özel
   yaptığımız gibi kalacak" (amblem çalarken dokununca duraklatır, durunca devam ettirir) ·
   "tamamen durdur butonunu da bölümü kapamak için çarpı butonu yerine kullanacağız".

   Yapı (kalıtım gibi): ÇERÇEVE kaydı (lâle, yıldız …) + ortadaki İŞARET (lucide simgesi ya da
   çocuk öğe). Yeni bir çerçeve CERCEVELER'e eklenir; hazır türevler aşağıda:
     <CerceveliSimge cerceve="lale" Ikon={Undo2} ac={…} />     — genel
     <DonusSimgesi ac /> · <KucultSimgesi ac /> · <OkumayaDonSimgesi ac />
     <OncekiSimgesi ac /> · <SonrakiSimgesi ac /> · <OnSaniyeSimgesi yon ac /> · <SesSimgesi ses ac />
     <DurdurSimgesi ac />   — bölümü kapatan "tamamen durdur" (çarpı)
     (hepsi şemse çerçevesinde — aşağıdaki 15 Kasım (4) notu)
     <AmblemDugmesi …>{amblem}</AmblemDugmesi>   — baştaki hareketli amblem = oynat/duraklat
   Çerçeve vurgu renginde (ac) çizilir; ortadaki işaret düğmenin yazı rengini (currentColor)
   alır — kısık ses kırmızısı gibi durum renkleri kendiliğinden geçer.

   İŞARETLER BİZE ÖZEL ÇİZİLİR (15 Kasım 2026 — kullanıcı: "Butonlar içindeki simgeler biraz
   büyük duruyor, kutu içlerine sığmalı ve net görünmeli, gerekirse bize özel şekilde
   çizebiliriz"): GLIFLER kaydındaki yollar çerçeveyle AYNI SVG'de, çerçevenin iç alanına
   (lâlenin gövdesi, yıldızın iç madalyonu) göre ölçeklenip çizilir; çizgi kalınlığı çerçeve
   biriminde sabit → küçük boyda da keskin. Oynatma işaretleri (üçgen, hoparlör) DOLU.

   15 Kasım 2026 (3) — kullanıcı: "Tamamen durdurma için kullandığımız butonları da Tepeli
   madalyon (tezhip) simgesi içine çarpı işareti koyarak verebiliriz. Durdurma butonu için de
   yaptığımız özel simgelerde ilk başta 10 sn görünecek şekilde bir durdurma simgesini
   animasyon ile gösterebiliriz" → MADALYON çerçevesi + "carpi" işareti (DurdurSimgesi);
   AmblemDugmesi çalmaya başlayınca 10 sn boyunca köşede nabız atan ❚❚ rozeti gösterir.

   15 Kasım 2026 (4) — kullanıcı: "Böyle de çok karışık olduğunu gözlemledim, simgelerin hepsini
   Şemse (sekiz köşe) içine alalım, çok boğmayalım sade dursun da istiyorum, bize özel de dursun
   istiyorum." → BÜTÜN türevler tek çerçeve: ŞEMSE — iki karenin BİRLEŞİK dış çizgisi (iç
   kesişme çizgileri yok), açık zemin, iç süs yok. Düğmeler yalnız ortadaki işaretle ayrışır.
   Lâle, yıldız ve madalyon kayıtta duruyor (ileride başka yerde kullanılabilir).

   15 Kasım 2026 (5) — kullanıcı: "Geri dönme butonları için de o bölümün simgesinin minik halini
   koyabiliriz. Sekiz köşe içine minik bir anten simgesi, Ekstralardaki Kur'an dinleme için …
   rahle simgesi, OkumaEkranına dönmek için de uygun bir şey, Kur'an-ı Kerim için … tezhip süsü.
   Duraklatıldığı anda da, simgelerin kenarlarına değil de … simgelerin içine devam etme
   simgelerini yerleştirelim … Anten için, devam etme butonu simgenin dışında değil içinde olmalı."
   → DonusSimgesi({ bolum }): radyo = anten, dinle = rahle üstünde mushaf, kuran = tezhip
     (dört yapraklı gül + inciler), okuma = yazılı açık kitap, tv = ekran; bolum yoksa dönüş oku.
   → AmblemDugmesi köşe rozetlerini bıraktı: çocuğu bir İŞLEV olursa ona { isaret } verir —
     "oynat" (dururken) ya da "duraklat" (çalmaya başlayınca 10 sn, nabızla); amblem işareti
     KENDİ İÇİNDE çizer (DinleAmblemi sağ sayfada, RadyoAmblemi anten başında, KitapAmblem sağ
     sayfada — Kur'ân'daki mushaf düğmesi gibi).
   ═══════════════════════════════════════════════════════════════════════════ */

import { useEffect, useState } from "react"

// ── ÇERÇEVE KAYDI — 32×32 birim; `merkez`: işaretin ortası, `oran`: işaretin boya oranı ──
export const CERCEVELER = {
  /* ŞEMSE — sekiz köşe; tek dış çizgi, açık zemin. Ortak ve varsayılan çerçeve. */
  semse: {
    merkez: { x: 16, y: 16 }, kutu: 11,
    ciz: (ac, sw) => (
      <path d="M16 2.42 L19.98 6.4 L25.6 6.4 L25.6 12.02 L29.58 16 L25.6 19.98 L25.6 25.6 L19.98 25.6 L16 29.58 L12.02 25.6 L6.4 25.6 L6.4 19.98 L2.42 16 L6.4 12.02 L6.4 6.4 L12.02 6.4 Z"
        fill={`${ac}18`} stroke={ac} strokeWidth={sw} strokeLinejoin="round" />
    ),
  },
  /* LÂLE — açık lâle; sap ve iki yaprak. Gezinme düğmeleri (geri dön, küçült, okumaya dön). */
  lale: {
    merkez: { x: 16, y: 13.4 }, kutu: 9.2,
    ciz: (ac, sw) => (
      <>
        <path d="M16 2.6 C18.9 5.2 19.9 8.2 19.7 10.8 C21.7 8.4 24.3 7.4 26.2 7.8 C25.8 14.6 22.6 20.4 16 21.4 C9.4 20.4 6.2 14.6 5.8 7.8 C7.7 7.4 10.3 8.4 12.3 10.8 C12.1 8.2 13.1 5.2 16 2.6 Z"
          fill={`${ac}22`} stroke={ac} strokeWidth={sw} strokeLinejoin="round" />
        <path d="M16 21.4 V29.4 M16 27.2 C13.2 26.8 11 25 10.2 22.6 C12.9 22.8 14.9 24.4 16 26.6 M16 27.2 C18.8 26.8 21 25 21.8 22.6 C19.1 22.8 17.1 24.4 16 26.6"
          fill="none" stroke={ac} strokeWidth={sw * 0.75} strokeLinecap="round" strokeLinejoin="round" />
      </>
    ),
  },
  /* SEKİZ KÖŞELİ YILDIZ — iki kare (oynatıcının şemse amblemiyle aynı aile) ve içte ince
     madalyon. Oynatma düğmeleri (önceki, sonraki, ±10 sn, ses). */
  yildiz: {
    merkez: { x: 16, y: 16 }, kutu: 9.6,
    ciz: (ac, sw) => (
      <>
        <g fill={`${ac}1c`} stroke={ac} strokeWidth={sw} strokeLinejoin="round">
          <rect x="6.2" y="6.2" width="19.6" height="19.6" rx="1.4" />
          <rect x="6.2" y="6.2" width="19.6" height="19.6" rx="1.4" transform="rotate(45 16 16)" />
        </g>
        <circle cx="16" cy="16" r="8.4" fill="none" stroke={ac} strokeWidth={sw * 0.5} opacity="0.55" />
      </>
    ),
  },
  /* TEPELİKLİ MADALYON (tezhip) — yuvarlak gövde, dört yanında sivri tepelik. Bölümü kapatan
     "tamamen durdur" düğmesi (içinde çarpı). */
  madalyon: {
    merkez: { x: 16, y: 16 }, kutu: 8.6,
    ciz: (ac, sw) => (
      <>
        <path d="M16 1.8 C17.6 3.6 18.4 5 18.3 6.6 A9.4 9.4 0 0 1 25.4 13.7 C27 13.6 28.4 14.4 30.2 16 C28.4 17.6 27 18.4 25.4 18.3 A9.4 9.4 0 0 1 18.3 25.4 C18.4 27 17.6 28.4 16 30.2 C14.4 28.4 13.6 27 13.7 25.4 A9.4 9.4 0 0 1 6.6 18.3 C5 18.4 3.6 17.6 1.8 16 C3.6 14.4 5 13.6 6.6 13.7 A9.4 9.4 0 0 1 13.7 6.6 C13.6 5 14.4 3.6 16 1.8 Z"
          fill={`${ac}1c`} stroke={ac} strokeWidth={sw} strokeLinejoin="round" />
        <circle cx="16" cy="16" r="7.4" fill="none" stroke={ac} strokeWidth={sw * 0.5} opacity="0.55" />
      </>
    ),
  },
}

/* İŞARET KAYDI — 24×24 işaret biriminde (lucide ile aynı ızgara); `dolu`: içi boyanır.
   `yazi`: ortaya yazı (±10 sn'deki "10"). */
export const GLIFLER = {
  donus:   { yollar: [{ d: "M9 14 4 9l5-5" }, { d: "M4 9h10.5a5.5 5.5 0 0 1 0 11H11" }] },
  kucult:  { yollar: [{ d: "M5 12h14" }], cizgi: 1.15 },
  carpi:   { yollar: [{ d: "M6.5 6.5l11 11M17.5 6.5l-11 11" }], cizgi: 1.1 },
  // ── Bölüm simgeleri (geri dön düğmeleri) — bölümün kendi ambleminin minik hâli
  // Anten: kafes kule (iki çapraz kuşak) + tepede top; yanlarda tek, ince dalga (k: çizgi çarpanı)
  anten:   { yollar: [{ d: "M12 7.6 7.4 21.6M12 7.6l4.6 14M9.2 16.1h5.6M10.5 12h3" }, { d: "M9.9 5.4a2.1 2.1 0 1 0 4.2 0a2.1 2.1 0 1 0 -4.2 0Z", dolu: true }, { d: "M7.2 2.2a4.6 4.6 0 0 0 0 6.4M16.8 2.2a4.6 4.6 0 0 1 0 6.4", k: 0.7 }], cizgi: 1.05 },
  rahle:   { yollar: [{ d: "M12 7.6C9.6 5.7 6.4 5.3 3.6 6.2V13.6C6.4 12.8 9.6 13.2 12 15.2Z" }, { d: "M12 7.6C14.4 5.7 17.6 5.3 20.4 6.2V13.6C17.6 12.8 14.4 13.2 12 15.2Z" }, { d: "M7.8 16.6 16.2 21.6M16.2 16.6 7.8 21.6" }], cizgi: 0.95 },
  // Tezhip: sekiz damla yapraklı gül (Kur'ân'daki mushaf düğmesinin göbeği gibi) + aralarda inciler + göbek
  tezhip:  { yollar: [{ d: "M12.00 8.60 Q10.10 6.40 12.00 2.60 Q13.90 6.40 12.00 8.60ZM14.40 9.60 Q14.62 6.70 18.65 5.35 Q17.30 9.38 14.40 9.60ZM15.40 12.00 Q17.60 10.10 21.40 12.00 Q17.60 13.90 15.40 12.00ZM14.40 14.40 Q17.30 14.62 18.65 18.65 Q14.62 17.30 14.40 14.40ZM12.00 15.40 Q13.90 17.60 12.00 21.40 Q10.10 17.60 12.00 15.40ZM9.60 14.40 Q9.38 17.30 5.35 18.65 Q6.70 14.62 9.60 14.40ZM8.60 12.00 Q6.40 13.90 2.60 12.00 Q6.40 10.10 8.60 12.00ZM9.60 9.60 Q6.70 9.38 5.35 5.35 Q9.38 6.70 9.60 9.60Z", dolu: true }, { d: "M14.06 4.98a0.85 0.85 0 1 0 1.70 0a0.85 0.85 0 1 0 -1.70 0ZM18.17 9.09a0.85 0.85 0 1 0 1.70 0a0.85 0.85 0 1 0 -1.70 0ZM18.17 14.91a0.85 0.85 0 1 0 1.70 0a0.85 0.85 0 1 0 -1.70 0ZM14.06 19.02a0.85 0.85 0 1 0 1.70 0a0.85 0.85 0 1 0 -1.70 0ZM8.24 19.02a0.85 0.85 0 1 0 1.70 0a0.85 0.85 0 1 0 -1.70 0ZM4.13 14.91a0.85 0.85 0 1 0 1.70 0a0.85 0.85 0 1 0 -1.70 0ZM4.13 9.09a0.85 0.85 0 1 0 1.70 0a0.85 0.85 0 1 0 -1.70 0ZM8.24 4.98a0.85 0.85 0 1 0 1.70 0a0.85 0.85 0 1 0 -1.70 0Z", dolu: true }, { d: "M10.5 12a1.5 1.5 0 1 0 3 0a1.5 1.5 0 1 0 -3 0Z", dolu: true }], cizgi: 0.9 },
  // Gözlük (odak — okunan âyetler / cümleler)
  gozluk:  { yollar: [{ d: "M2.8 13.6a3.7 3.7 0 1 0 7.4 0a3.7 3.7 0 1 0 -7.4 0ZM13.8 13.6a3.7 3.7 0 1 0 7.4 0a3.7 3.7 0 1 0 -7.4 0Z" }, { d: "M10.2 12.8q1.8-1.4 3.6 0M3.4 11.6 5.2 7.4M20.6 11.6 18.8 7.4" }], cizgi: 0.95 },
  sayfa:   { yollar: [{ d: "M12 6.4C9.5 4.7 6 4.3 3 5.1V17.6C6 16.8 9.5 17.2 12 18.9Z" }, { d: "M12 6.4C14.5 4.7 18 4.3 21 5.1V17.6C18 16.8 14.5 17.2 12 18.9Z" }, { d: "M5.6 8.9C7.2 8.6 8.8 8.8 10 9.5M5.6 12C7.2 11.7 8.8 11.9 10 12.6M14 9.5C15.2 8.8 16.8 8.6 18.4 8.9M14 12.6C15.2 11.9 16.8 11.7 18.4 12" }], cizgi: 0.8 },
  tv:      { yollar: [{ d: "M4.5 7.5h15a1.5 1.5 0 0 1 1.5 1.5v8a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 17V9a1.5 1.5 0 0 1 1.5-1.5Z" }, { d: "M8.5 3.5 12 7l3.5-3.5M9 21.5h6" }], cizgi: 0.85 },
  kitap:   { yollar: [{ d: "M2 4h6a4 4 0 0 1 4 4v13a3 3 0 0 0-3-3H2z" }, { d: "M22 4h-6a4 4 0 0 0-4 4v13a3 3 0 0 1 3-3h7z" }], cizgi: 0.9 },
  sonraki: { yollar: [{ d: "M5 5.5 15 12 5 18.5Z", dolu: true }, { d: "M19 5v14" }] },
  onceki:  { yollar: [{ d: "M19 5.5 9 12l10 6.5Z", dolu: true }, { d: "M5 5v14" }] },
  ses2:    { yollar: [{ d: "M2.5 9H6.5L11.5 5V19L6.5 15H2.5Z", dolu: true }, { d: "M15.5 8.6a4.8 4.8 0 0 1 0 6.8" }, { d: "M18.8 5.4a9.3 9.3 0 0 1 0 13.2" }] },
  ses1:    { yollar: [{ d: "M2.5 9H6.5L11.5 5V19L6.5 15H2.5Z", dolu: true }, { d: "M15.5 8.6a4.8 4.8 0 0 1 0 6.8" }] },
  ses0:    { yollar: [{ d: "M2.5 9H6.5L11.5 5V19L6.5 15H2.5Z", dolu: true }, { d: "M15.5 9l6 6M21.5 9l-6 6" }] },
  geri10:  { yollar: [{ d: "M3.5 12a8.5 8.5 0 1 0 8.5-8.5 9.2 9.2 0 0 0-6.4 2.6L3.5 8" }, { d: "M3.5 3.5V8H8" }], yazi: "10", cizgi: 0.8 },
  ileri10: { yollar: [{ d: "M20.5 12a8.5 8.5 0 1 1-8.5-8.5 9.2 9.2 0 0 1 6.4 2.6L20.5 8" }, { d: "M20.5 3.5V8H16" }], yazi: "10", cizgi: 0.8 },
}

/**
 * Çerçeve + ortada işaret.
 * cerceve: CERCEVELER anahtarı · glif: GLIFLER anahtarı (bize özel çizim) · Ikon: lucide simgesi
 * (glif yoksa; çerçevenin iç alanına sığdırılır) · boy: px · ac: çerçeve rengi
 */
export default function CerceveliSimge({ cerceve = "semse", glif, Ikon, ac = "currentColor", boy = 30, children }) {
  const c = CERCEVELER[cerceve] || CERCEVELER.semse
  const g = glif ? GLIFLER[glif] : null
  const o = c.kutu / 24                                   // işaret birimi → çerçeve birimi
  const cizgi = (boy < 26 ? 1.7 : 1.5) * (g?.cizgi || 1) // çerçeve biriminde
  const ib = Math.round((c.kutu / 32) * boy)
  return (
    <span aria-hidden="true" style={{ position: "relative", display: "inline-block", width: `${boy}px`, height: `${boy}px`, flexShrink: 0, lineHeight: 0 }}>
      <svg width={boy} height={boy} viewBox="0 0 32 32" style={{ position: "absolute", inset: 0, overflow: "visible" }}>
        {c.ciz(ac, boy < 26 ? 1.6 : 1.35)}
        {g && (
          <g transform={`translate(${c.merkez.x - 12 * o} ${c.merkez.y - 12 * o}) scale(${o})`}
            fill="none" stroke="currentColor" strokeWidth={cizgi / o} strokeLinecap="round" strokeLinejoin="round">
            {g.yollar.map((y, i) => <path key={i} d={y.d} fill={y.dolu ? "currentColor" : "none"} strokeWidth={y.dolu ? (cizgi * 0.6) / o : y.k ? (cizgi * y.k) / o : undefined} />)}
            {g.yazi && (
              <text x="12" y="12.2" textAnchor="middle" dominantBaseline="central" fill="currentColor" stroke="none"
                style={{ fontSize: "9.5px", fontWeight: 800, fontFamily: "system-ui, sans-serif" }}>{g.yazi}</text>
            )}
          </g>
        )}
      </svg>
      {!g && (Ikon || children) && (
        <span style={{
          position: "absolute", left: `${(c.merkez.x / 32) * 100}%`, top: `${(c.merkez.y / 32) * 100}%`,
          width: `${ib}px`, height: `${ib}px`, transform: "translate(-50%, -50%)",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          {Ikon && <Ikon size={ib} strokeWidth={2.2} />}
          {children}
        </span>
      )}
    </span>
  )
}

// ── HAZIR TÜREVLER ───────────────────────────────────────────────────────────
/** Geri dön: bolum "radyo" | "dinle" | "kuran" | "okuma" | "tv" → o bölümün minik simgesi */
const BOLUM_GLIF = { radyo: "anten", dinle: "rahle", kuran: "tezhip", okuma: "sayfa", tv: "tv" }
export const DonusSimgesi = ({ bolum, ...p }) => <CerceveliSimge cerceve="semse" glif={BOLUM_GLIF[bolum] || "donus"} {...p} />
export const KucultSimgesi = (p) => <CerceveliSimge cerceve="semse" glif="kucult" {...p} />
export const OkumayaDonSimgesi = (p) => <CerceveliSimge cerceve="semse" glif="kitap" {...p} />
/** Odak (gözlük) — Kur'ân ve sesli okuma haplarında okunan yerlere odaklanma */
export const OdakSimgesi = (p) => <CerceveliSimge cerceve="semse" glif="gozluk" {...p} />
export const OncekiSimgesi = (p) => <CerceveliSimge cerceve="semse" glif="onceki" {...p} />
export const SonrakiSimgesi = (p) => <CerceveliSimge cerceve="semse" glif="sonraki" {...p} />
/** ±10 sn: yon -1 geri, 1 ileri */
export const OnSaniyeSimgesi = ({ yon = 1, ...p }) => <CerceveliSimge cerceve="semse" glif={yon < 0 ? "geri10" : "ileri10"} {...p} />
/** Ses düzeyine göre: 0 kısık, <0.5 az, üstü tam */
export const SesSimgesi = ({ ses = 1, ...p }) => <CerceveliSimge cerceve="semse" glif={ses === 0 ? "ses0" : ses < 0.5 ? "ses1" : "ses2"} {...p} />
/** Bölümü kapatan "tamamen durdur" — şemse içinde çarpı */
export const DurdurSimgesi = (p) => <CerceveliSimge cerceve="semse" glif="carpi" {...p} />

/* AMBLEM DÜĞMESİ — hapın ve çaların başındaki bölüme özel hareketli amblem (Kur'ân'da
   mushaf düğmesi gibi) oynat/duraklat düğmesi olur: çalarken dokununca duraklatır, hareket
   durunca yine dokununca devam eder. Çocuğu bir işlevse ({ isaret }) ile çağrılır ve amblem
   işareti KENDİ İÇİNDE çizer: "oynat" dururken; "duraklat" çalmaya başlayınca 10 sn (nabızla).
   Bağlanırken amblemin çevresinde ince bir halka döner. */
export const AMBLEM_DUGMESI_CSS = `@keyframes vk-amb-dug-don { to { transform: rotate(360deg) } }
.vk-amb-dug-yuk { animation: vk-amb-dug-don .9s linear infinite }
@keyframes vk-amb-isaret-nabiz { 0%, 100% { opacity: 1 } 50% { opacity: .35 } }
.vk-amb-isaret-nabiz { animation: vk-amb-isaret-nabiz 1.3s ease-in-out infinite }
@media (prefers-reduced-motion: reduce) { .vk-amb-dug-yuk { animation-duration: 2.4s } .vk-amb-isaret-nabiz { animation: none } }`
export function AmblemDugmesi({ calar, yukleniyor = false, onClick, ac, etiket = "", children }) {
  const ad = calar || yukleniyor ? "Duraklat" : "Devam et"
  // DURAKLATMA İPUCU: çalma başlayınca (ya da düğme çalarken ilk görününce) 10 sn
  const [ipucu, setIpucu] = useState(false)
  useEffect(() => {
    if (!calar) { setIpucu(false); return }
    setIpucu(true)
    const t = setTimeout(() => setIpucu(false), 10000)
    return () => clearTimeout(t)
  }, [calar])
  const isaret = !calar && !yukleniyor ? "oynat" : calar && ipucu ? "duraklat" : null
  return (
    <button onClick={onClick} aria-label={etiket ? `${etiket} — ${ad.toLocaleLowerCase("tr-TR")}` : ad} title={ad}
      style={{
        position: "relative", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
        background: "none", border: "none", padding: 0, cursor: "pointer", lineHeight: 0, touchAction: "manipulation",
      }}>
      <style>{AMBLEM_DUGMESI_CSS}</style>
      {typeof children === "function" ? children({ isaret }) : children}
      {yukleniyor && (
        <span className="vk-amb-dug-yuk" aria-hidden="true" style={{
          position: "absolute", inset: "-2px", borderRadius: "50%",
          border: "2px solid transparent", borderTopColor: ac, borderRightColor: `${ac}66`,
        }} />
      )}
    </button>
  )
}

/** Amblemlerin içinde çizilen oynat/duraklat işareti — (x, y) ortası, b boyu (amblem biriminde) */
export function AmblemIsareti({ isaret, x = 0, y = 0, b = 8, ac }) {
  if (!isaret) return null
  if (isaret === "oynat") {
    return <path d={`M${x - b * 0.36} ${y - b * 0.5} L${x + b * 0.5} ${y} L${x - b * 0.36} ${y + b * 0.5} Z`} fill={ac} stroke={ac} strokeWidth={b * 0.12} strokeLinejoin="round" />
  }
  const w = b * 0.26, h = b
  return (
    <g className="vk-amb-isaret-nabiz">
      <rect x={x - b * 0.36} y={y - h / 2} width={w} height={h} rx={w * 0.3} fill={ac} />
      <rect x={x + b * 0.1} y={y - h / 2} width={w} height={h} rx={w * 0.3} fill={ac} />
    </g>
  )
}
