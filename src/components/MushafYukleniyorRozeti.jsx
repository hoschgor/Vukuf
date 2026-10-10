import { useId } from "react"

/* ═══════════════════════════════════════════════════════════════════════════
   VUKUF — MUSHAF YÜKLENİYOR ROZETİ (giriş ekranı + sayfa yükleniyor)
   src/components/MushafYukleniyorRozeti.jsx

   ── 10 EKİM 2026: SÜSLEME VE KİTAP YENİLENDİ ───────────────────────────────
   Kullanıcı: "Kenarlar süslenebilir, yuvarlağın etrafı süslenebilir; kitap kısmı
   kötü duruyor ve çok sade kaldı." Beğendiği örnek: dört yönde kafes desenli
   badem yapraklar, aralarında ince çizgi demetlerinden kıvrılan yapraklar.
   • ÇERÇEVE: çift halka + aralarında boncuk dizisi.
   • DÖRT YÖN: kafes (şebeke) desenli badem yaprak; ucu halkaya değer, geniş
     tarafı dışarıda. Kafes clipPath ile yaprağın içine kırpılıyor.
   • ÇAPRAZLAR: her köşede iki yana kıvrılan, beşer ince çizgiden oluşan
     yaprak demeti; tabanda parlak, uçta solgun (gradyan).
   • KİTAP: eski izometrik kutu yerine ciltli, kapağı çerçeveli, yuvarlak sırtlı,
     sayfa katmanları görünen ve şeridi sarkan bir mushaf. V'nin sağ bacağının
     ARKASINDA durur (maske ile V'nin altında kalan kısmı gizlenir) — uygulama
     simgesindeki düzenin aynısı.
   • Renk yine tek: `ac` (currentColor); tonlar opaklıkla. Açık/koyu temada aynı.
   • Arayüz değişmedi: size, ac, aktif, kitap, halka.
   ═══════════════════════════════════════════════════════════════════════════ */

// Kafesli badem yaprak: ucu (0,-71) halkaya, gövdesi dışarı (-y yönü)
// Kavisli kenarlı, iki ucu sivri badem: içteki uç uzun ve ince (örnekteki gibi)
const BADEM = "M0 -71 C6 -77 13 -83 15 -90 C13 -96 6 -100 0 -105 C-6 -100 -13 -96 -15 -90 C-13 -83 -6 -77 0 -71 Z"
// Kafes çizgileri (yaprağın kutusu boyunca iki yönde çapraz)
const KAFES = (() => {
  const c = []
  for (let k = -40; k <= 40; k += 5.2) {
    c.push(`M${-16 + k} -104 L${16 + k} -66`)
    c.push(`M${16 - k} -104 L${-16 - k} -66`)
  }
  return c.join(" ")
})()

// İnce çizgi demeti yaprağı: taban (0,-72) yakınında toplanır, dışa doğru açılıp kıvrılır
// Uçları birleşen demet: hepsi aynı tabandan çıkıp aynı uçta buluşur, ortada açılır
// (örnekteki kıvrık, alev gibi yaprak). Uç, halkadan dışarı ve yana doğru.
const DEMET = [0, 1, 2, 3, 4].map(i =>
  `M0 -72 C${0.5 + i * 0.4} -${82 + i * 3.2} ${12 + i * 1.6} -${93 + i * 2.6} 30 -${90 + i * 0.4}`)

export default function MushafYukleniyorRozeti({
  size = 150,
  ac = "currentColor",
  aktif = true,
  kitap = true,
  halka = true,   // alttaki dönen "yükleniyor" çemberi (giriş splash'ında kapatılabilir)
  don = false,    // ortadaki halka (çift çember + boncuklar) kendi etrafında yavaşça döner; süsler, V ve kitap sabit
  donSure = 24,   // bir tam tur (sn)
}) {
  const uid = useId().replace(/:/g, "")
  const id = (ad) => `${uid}-${ad}`

  // V harfinin dış hattı (kitabı maskelemek ve çizmek için ortak)
  const V_DIS = "M-30 -40 L-15 -40 L0 15 L15 -40 L30 -40 L9 44 L-9 44 Z"

  return (
    <svg
      width={size}
      height={size}
      viewBox="-104 -104 208 208"
      style={{
        color: ac,
        overflow: "visible",
        display: "block",
        transform: aktif ? "scale(1)" : "scale(0.96)",
        transition: "transform 0.3s ease",
      }}
      aria-label="Yükleniyor"
      role="img"
    >
      <defs>
        <clipPath id={id("badem")}><path d={BADEM} /></clipPath>
        {/* yaprak demeti: tabanda parlak, uca doğru solar */}
        <linearGradient id={id("demet")} gradientUnits="userSpaceOnUse" x1="0" y1="-72" x2="30" y2="-92">
          <stop offset="0" stopColor="currentColor" stopOpacity="0.95" />
          <stop offset="1" stopColor="currentColor" stopOpacity="0.35" />
        </linearGradient>
        {/* badem: dış (geniş) tarafı parlak, halkaya değen ucu koyulaşır */}
        <linearGradient id={id("badem-ton")} gradientUnits="userSpaceOnUse" x1="0" y1="-101" x2="0" y2="-71">
          <stop offset="0" stopColor="currentColor" stopOpacity="1" />
          <stop offset="1" stopColor="currentColor" stopOpacity="0.55" />
        </linearGradient>
        {/* kitap V'nin arkasında: V'nin kapladığı yer kitaptan oyulur */}
        <mask id={id("v-oyuk")} maskUnits="userSpaceOnUse" x="-104" y="-104" width="208" height="208">
          <rect x="-104" y="-104" width="208" height="208" fill="#fff" />
          <path d={V_DIS} fill="#000" stroke="#000" strokeWidth="7" strokeLinejoin="round" />
        </mask>
      </defs>

      {/* DÖNEN HALKA (10 Ekim 2026, giriş ekranı): yalnız çift çember + boncuk
          dizisi döner (kullanıcı: "çiçekler duracaktı, sadece ortadaki yuvarlak
          dönecekti"). Bademler, demetler, V ve kitap yerinde. Hareket azaltma
          tercihi açıksa durur. */}
      {don && <style>{`
        .vk-rozet-don { transform-box: fill-box; transform-origin: center; animation: vkRozetDon ${donSure}s linear infinite; }
        @keyframes vkRozetDon { to { transform: rotate(360deg); } }
        @media (prefers-reduced-motion: reduce) { .vk-rozet-don { animation: none; } }
      `}</style>}
      <g className={don ? "vk-rozet-don" : undefined}>
      {/* =========================================================
          ÇERÇEVE: çift halka + boncuk dizisi (YALNIZ BU DÖNER)
      ========================================================= */}
      <g fill="none" stroke="currentColor">
        <circle r="70" strokeWidth="1.6" opacity="0.75" />
        <circle r="64.5" strokeWidth="0.6" opacity="0.35" />
      </g>
      {/* ZENCEREK (10 Ekim 2026): iki çember arasındaki minik boncuklar yerine tezhip
          zincirinden küçük motifler — 15°'de bir halkaya dik duran damla yaprak,
          aralarında minik nokta. Dönerken dizi kesintisiz; dururken bademlerin
          önü boş kalır. */}
      <g fill="currentColor">
        {Array.from({ length: 48 }, (_, i) => i * 7.5).filter(a => don || (a % 90 > 9 && a % 90 < 81)).map(a => (
          a % 15 === 0
            ? <path key={a} transform={`rotate(${a})`} opacity="0.7"
                d="M0 -70.4 C2 -68.8 2.1 -66.3 0 -64.2 C-2.1 -66.3 -2 -68.8 0 -70.4 Z" />
            : <circle key={a} r="0.6" opacity="0.45"
                cx={67.3 * Math.sin(a * Math.PI / 180)} cy={-67.3 * Math.cos(a * Math.PI / 180)} />
        ))}
      </g>

      </g>

      {/* =========================================================
          DÖRT YÖN: kafesli badem yapraklar
      ========================================================= */}
      {[0, 90, 180, 270].map(d => (
        <g key={d} transform={`rotate(${d})`}>
          <g clipPath={`url(#${id("badem")})`}>
            <path d={KAFES} fill="none" stroke={`url(#${id("badem-ton")})`} strokeWidth="1.3" />
          </g>
          <path d={BADEM} fill="none" stroke={`url(#${id("badem-ton")})`} strokeWidth="2.2" strokeLinejoin="round" />
          {/* halkaya değdiği yerde küçük düğüm */}
          <circle cy="-70" r="1.9" fill="currentColor" opacity="0.9" />
        </g>
      ))}

      {/* =========================================================
          ÇAPRAZLAR: iki yana kıvrılan çizgi demetleri
      ========================================================= */}
      {[45, 135, 225, 315].map(d => (
        <g key={d} fill="none" stroke={`url(#${id("demet")})`} strokeWidth="0.85" strokeLinecap="round">
          <g transform={`rotate(${d - 7})`}>
            {DEMET.map((p, i) => <path key={i} d={p} transform="scale(-1 1)" />)}
          </g>
          <g transform={`rotate(${d + 7})`}>
            {DEMET.map((p, i) => <path key={i} d={p} />)}
          </g>
          {/* demetlerin dibinde nokta */}
          <circle cx={70 * Math.sin(d * Math.PI / 180)} cy={-70 * Math.cos(d * Math.PI / 180)} r="1.5"
            fill="currentColor" stroke="none" opacity="0.8" />
        </g>
      ))}

      {/* =========================================================
          KİTAP — V'nin sağ bacağının arkasında yatan ciltli mushaf
      ========================================================= */}
      {kitap && (
        <g mask={`url(#${id("v-oyuk")})`}>
          <g transform="translate(-1 17) rotate(-6) scale(1.18)">
            {/* alt kapak (sayfaların altından taşan) */}
            <path d="M1 11.5 L41 -3.5 Q43 -2.8 42.6 -1 L13.6 16.8 Q12 17.6 10.6 16.9 Z" fill="currentColor" opacity="0.55" />
            {/* sayfa bloğu (ön yüz) */}
            <path d="M12.6 6.8 L40.8 -5.6 L40.8 -0.6 L12.6 12.6 Z" fill="currentColor" opacity="0.38" />
            {/* sayfa katman çizgileri */}
            <g stroke="currentColor" strokeWidth="0.45" opacity="0.6">
              <path d="M13 8.3 L40.6 -4.2" />
              <path d="M13 9.7 L40.6 -2.9" />
              <path d="M13 11.1 L40.6 -1.6" />
            </g>
            {/* sırt (yuvarlak, solda) */}
            <path d="M0 0 C-3.4 2.4 -3.4 9 1 11.5 L12.6 12.6 L12.6 6.8 Z" fill="currentColor" opacity="0.7" />
            <path d="M12.6 6.8 C9.6 8.2 9.6 11.6 12.6 12.6" fill="none" stroke="currentColor" strokeWidth="1.1" opacity="0.95" />
            {/* üst kapak */}
            <path d="M0 0 L27 -11.4 Q28.6 -12 30.2 -11.3 L42 -6.4 Q43.2 -5.7 42 -4.9 L14.6 7.3 Q13 8 11.4 7.3 Z" fill="currentColor" opacity="0.95" />
            {/* kapaktaki çerçeve (şemse yeri) — zemin rengiyle değil, koyu tonla oyulmuş gibi */}
            <path d="M6 0.2 L27.4 -8.8 L36.4 -5.1 L15 4.2 Z" fill="none" stroke="#000" strokeOpacity="0.35" strokeWidth="0.7" strokeLinejoin="round" />
            <path d="M21.2 -2.6 l2.2 -1 l2.2 1 l-2.2 1 z" fill="#000" fillOpacity="0.35" />
            {/* ayraç şeridi (sayfalardan sarkan) */}
            <path d="M31 -1.6 L33 -2.5 L33.6 7.5 L32.2 6.3 L30.9 8 Z" fill="currentColor" opacity="0.85" />
          </g>
        </g>
      )}

      {/* =========================================================
          MERKEZ V
      ========================================================= */}
      <g>
        <path d={V_DIS} fill="currentColor" opacity="0.12" transform="translate(1.5 2)" />
        <path d={V_DIS} fill="none" stroke="currentColor" strokeWidth="3" strokeLinejoin="round" opacity="0.95" />
        <path d="M-25 -36 L-12 -36 L0 9 L12 -36 L25 -36 L6 39 L-6 39 Z" fill="currentColor" opacity="0.08" />
      </g>

      {/* =========================================================
          YÜKLENİYOR ÇEMBERİ
      ========================================================= */}
      {halka && (
        <g transform="translate(0 56)">
          <circle cx="0" cy="0" r="6" fill="none" stroke="currentColor" strokeWidth="1.3" opacity="0.12" />
          <circle cx="0" cy="0" r="6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeDasharray="21 17" opacity="0.85">
            <animateTransform attributeName="transform" type="rotate" from="0 0 0" to="360 0 0" dur="0.9s" repeatCount="indefinite" />
          </circle>
        </g>
      )}
    </svg>
  )
}
