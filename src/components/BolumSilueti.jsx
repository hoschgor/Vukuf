/* ═══════════════════════════════════════════════════════════════════════════
   VUKUF — BÖLÜM SİLÜETLERİ (açık kart başlığının sağında, soluk)
   src/components/BolumSilueti.jsx

   Her bölüm kendi konusuna uygun bir silüetle tanınır: namaz vakitleri cami, hutbe minber,
   Kur'an dinleme rahle üstünde açık mushaf (mushaf: ses dalgasız), yakındaki camiler tezhipli pusula, kıble Kâbe,
   kandiller asma kandil, radyo anten kulesi, TV eski televizyon, zikirmatik tesbih, takip
   seccade. Tek renk dolgu (currentColor); her silüetin kendi dar viewBox'ı var [x0, genişlik, çizim]
   → açık başlıkta ok halkasının sağındaki ~60 px'e sığar.
   ═══════════════════════════════════════════════════════════════════════════ */

const SILUETLER = {
  cami: [21, 79, (
    <g>
      <path d="M23 16 L25 4 L27 16 Z M93 16 L95 4 L97 16 Z" />
      <path d="M23 16 H27 V64 H23 Z M93 16 H97 V64 H93 Z" />
      <path d="M21.5 28 H28.5 V30.5 H21.5 Z M91.5 28 H98.5 V30.5 H91.5 Z" />
      <path d="M40 54 Q40 30 60 25 Q80 30 80 54 Z" />
      <path d="M59.3 14 H60.7 V25 H59.3 Z" /><circle cx="60" cy="12.5" r="1.9" />
      <path d="M31 54 Q31 44 40 41.5 V54 Z M89 54 Q89 44 80 41.5 V54 Z" />
      <path d="M29 52 H91 V64 H29 Z" />
    </g>
  )],
  minber: [12, 78, (
    <g fillRule="evenodd">
      <path d="M14 64 V38 Q21 28 28 38 V64 Z M17.5 64 V42 Q21 36 24.5 42 V64 Z" />
      <path d="M28 64 V52 L70 24 V64 Z" />
      <path d="M28 40 L70 12 L70 15.5 L28 43.5 Z" />
      <path d="M70 26 H86 V64 H70 Z M74 64 V46 Q78 40 82 46 V64 Z" />
      <path d="M68 22 H88 V26 H68 Z" />
      <path d="M70 22 L78 4 L86 22 Z" />
    </g>
  )],
  rahle: [27, 66, (
    <g>
      <path d="M60 30 Q46 21 30 24 L33 36 Q47 33 60 40 Z M60 30 Q74 21 90 24 L87 36 Q73 33 60 40 Z" />
      <path d="M33 38 L38 38 L92 64 L84 64 Z M87 38 L82 38 L28 64 L36 64 Z" />
      <path d="M53 17 Q60 12 67 17 M47 11 Q60 2 73 11" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
    </g>
  )],
  mushaf: [27, 66, (
    <g>
      <path d="M60 30 Q46 21 30 24 L33 36 Q47 33 60 40 Z M60 30 Q74 21 90 24 L87 36 Q73 33 60 40 Z" />
      <path d="M33 38 L38 38 L92 64 L84 64 Z M87 38 L82 38 L28 64 L36 64 Z" />
    </g>
  )],
  pusula: [26, 68, (
    <g transform="translate(28 0)">
      <circle cx="32" cy="32" r="30" fill="none" stroke="currentColor" strokeWidth="2.4" />
      <circle cx="32" cy="32" r="24" fill="none" stroke="currentColor" strokeWidth="1.2" />
      {Array.from({ length: 16 }, (_, i) => {
        const a = (i * Math.PI) / 8
        return <circle key={i} cx={32 + 27 * Math.cos(a)} cy={32 + 27 * Math.sin(a)} r={i % 2 ? 0.9 : 1.6} />
      })}
      <path d="M32 6 L36 28 L58 32 L36 36 L32 58 L28 36 L6 32 L28 28 Z" />
      <path d="M32 14 L34 30 L50 32 L34 34 L32 50 L30 34 L14 32 L30 30 Z" transform="rotate(45 32 32)" opacity="0.7" />
      <circle cx="32" cy="32" r="3" fill="none" stroke="currentColor" strokeWidth="1.4" />
    </g>
  )],
  kabe: [24, 76, (
    <g fillRule="evenodd">
      <path d="M26 20 H70 V64 H26 Z M26 29 H70 V33 H26 Z M45 64 V50 Q48 46 51 50 V64 Z" />
      <path d="M70 20 L98 26 V64 H70 Z M70 29 L98 34 V38 L70 33 Z" opacity="0.75" />
    </g>
  )],
  kandil: [36, 68, (
    <g>
      <path d="M60 0 V8 M60 8 L44 30 M60 8 L76 30 M60 8 V30" fill="none" stroke="currentColor" strokeWidth="1.6" />
      <circle cx="60" cy="8" r="2.4" />
      <path d="M38 30 H82 L76 44 Q60 54 44 44 Z" />
      <path d="M56 52 H64 L62 60 H58 Z" />
      <path d="M60 18 Q55 24 60 29 Q65 24 60 18 Z" opacity="0.75" />
      <path d="M94 10 A9 9 0 1 0 103 22 A7 7 0 1 1 94 10 Z" />
    </g>
  )],
  anten: [30, 60, (
    <g fill="none" stroke="currentColor" strokeLinejoin="round">
      <path d="M48 64 L60 14 L72 64 Z" strokeWidth="3" />
      <path d="M52 48 L68 48 M55 34 L65 34 M52 48 L65 34 M68 48 L55 34 M50 56 L70 56 M50 56 L68 48 M70 56 L52 48" strokeWidth="1.6" />
      <circle cx="60" cy="11" r="3.4" fill="currentColor" stroke="none" />
      <path d="M50 4 Q44 11 50 18 M70 4 Q76 11 70 18 M43 0 Q34 11 43 22 M77 0 Q86 11 77 22" strokeWidth="2.2" strokeLinecap="round" />
    </g>
  )],
  tv: [19, 82, (
    <g fillRule="evenodd">
      <path d="M50 18 L40 2 M70 18 L80 2" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M26 18 H94 Q100 18 100 24 V54 Q100 60 94 60 H26 Q20 60 20 54 V24 Q20 18 26 18 Z M28 25 H82 V53 H28 Z" />
      <path d="M44 53 Q44 41 55 39 Q66 41 66 53 Z M54.4 33 H55.6 V39 H54.4 Z" opacity="0.7" />
      <circle cx="91" cy="32" r="3" /><circle cx="91" cy="44" r="3" />
      <path d="M32 60 L28 64 H34 L37 60 Z M88 60 L92 64 H86 L83 60 Z" />
    </g>
  )],
  tesbih: [25, 70, (
    <g>
      {Array.from({ length: 22 }, (_, i) => {
        const a = (i / 22) * 2 * Math.PI
        return <circle key={i} cx={60 + 30 * Math.cos(a)} cy={26 + 18 * Math.sin(a)} r="3.4" />
      })}
      <path d="M57 44 H63 L62 52 H58 Z" />
      <path d="M60 52 L54 64 M60 52 L60 64 M60 52 L66 64" fill="none" stroke="currentColor" strokeWidth="1.4" />
    </g>
  )],
  seccade: [34, 52, (
    <g fillRule="evenodd">
      <path d="M36 4 H84 V60 H36 Z M42 54 V22 Q60 6 78 22 V54 Z" />
      <path d="M48 54 V26 Q60 15 72 26 V54 Z M52 54 V29 Q60 21 68 29 V54 Z" />
      <path d="M38 60 V64 M44 60 V64 M50 60 V64 M56 60 V64 M62 60 V64 M68 60 V64 M74 60 V64 M80 60 V64" fill="none" stroke="currentColor" strokeWidth="1.4" />
    </g>
  )],
  kitap: [22, 76, (
    <g>
      <path d="M60 22 Q44 12 24 14 V54 Q44 52 60 62 Z M60 22 Q76 12 96 14 V54 Q76 52 60 62 Z" />
    </g>
  )],
}

export const SILUET_ADLARI = Object.keys(SILUETLER)

/** ad: SILUETLER anahtarı · renk · yukseklik (px) · enGenis: genişlik sınırı (aşarsa küçülür) · stil */
export default function BolumSilueti({ ad, renk = "currentColor", yukseklik = 54, enGenis = Infinity, opaklik = 0.22, stil }) {
  const k = SILUETLER[ad]
  if (!k) return null
  const [x0, w, s] = k
  const h = Math.min(yukseklik, (enGenis * 64) / w)
  return (
    <svg aria-hidden="true" viewBox={`${x0} 0 ${w} 64`} height={h} width={(h * w) / 64}
      style={{ color: renk, fill: "currentColor", opacity: opaklik, pointerEvents: "none", display: "block", ...stil }}>
      {s}
    </svg>
  )
}
