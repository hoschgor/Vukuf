// components/Besmele.jsx
export default function Besmele({ theme, sureId }) {
  if (sureId === 9) return null
  
  const ac = theme.accent
  const w = 500
  const h = 52

  // Küçük rozet çizen fonksiyon
  const KucukRozet = ({ x, y }) => (
    <g transform={`translate(${x}, ${y})`}>
      {/* 12 inci halkası (küçük) */}
      {[...Array(12)].map((_, i) => (
        <circle
          key={`pearl-${i}`}
          cx={Math.cos(i * 30 * Math.PI / 180) * 12}
          cy={Math.sin(i * 30 * Math.PI / 180) * 12}
          r="0.8"
          fill={ac}
          fillOpacity="0.3"
        />
      ))}

      {/* 8 uzun yaprak (küçük) */}
      {[...Array(8)].map((_, i) => {
        const ang = i * 45
        const cx = Math.cos(ang * Math.PI / 180) * 9
        const cy = Math.sin(ang * Math.PI / 180) * 9
        return (
          <ellipse
            key={`long-${i}`}
            cx={cx}
            cy={cy}
            rx="4"
            ry="1.5"
            transform={`rotate(${ang} ${cx} ${cy})`}
            fill={ac}
            fillOpacity="0.65"
          />
        )
      })}

      {/* 8 kısa yaprak */}
      {[...Array(8)].map((_, i) => {
        const ang = i * 45 + 22.5
        const cx = Math.cos(ang * Math.PI / 180) * 5
        const cy = Math.sin(ang * Math.PI / 180) * 5
        return (
          <ellipse
            key={`short-${i}`}
            cx={cx}
            cy={cy}
            rx="2.5"
            ry="1"
            transform={`rotate(${ang} ${cx} ${cy})`}
            fill={ac}
            fillOpacity="0.8"
          />
        )
      })}

      {/* 4 kollu iç yıldız */}
      {[0, 90, 180, 270].map((d, i) => (
        <g key={`star-${i}`} transform={`rotate(${d})`}>
          <line x1="0" y1="0" x2="7" y2="0" stroke={ac} strokeWidth="0.45" strokeOpacity="0.65" />
          <line x1="4" y1="-1.5" x2="6" y2="0" stroke={ac} strokeWidth="0.35" />
          <line x1="4" y1="1.5" x2="6" y2="0" stroke={ac} strokeWidth="0.35" />
        </g>
      ))}

      {/* İç halka */}
      <circle r="5" fill="none" stroke={ac} strokeWidth="0.45" strokeOpacity="0.6" />

      {/* Merkez şemse */}
      <circle r="2.5" fill={ac} fillOpacity="0.85" />
      <circle r="1" fill="white" fillOpacity="0.3" />
    </g>
  )

  return (
    <div style={{
      textAlign: "center",
      direction: "rtl",
      margin: "46px 0 8px",
      position: "relative",
    }}>
      <svg
        width="100%"
        viewBox="0 0 500 52"
        preserveAspectRatio="xMidYMid meet"
      >
        <defs>
          <linearGradient id="besmeleGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={ac} stopOpacity="0.05" />
            <stop offset="50%" stopColor={ac} stopOpacity="0.12" />
            <stop offset="100%" stopColor={ac} stopOpacity="0.05" />
          </linearGradient>
        </defs>

        {/* Ana çerçeve */}
        <rect
          x="2"
          y="2"
          width={w-4}
          height={h-4}
          rx="4"
          fill="url(#besmeleGrad)"
          stroke={ac}
          strokeWidth="0.6"
          strokeOpacity="0.4"
        />

        {/* İç çerçeve */}
        <rect
          x="6"
          y="6"
          width={w-12}
          height={h-12}
          rx="3"
          fill="none"
          stroke={ac}
          strokeWidth="0.35"
          strokeOpacity="0.25"
        />

        {/* SOL KÜÇÜK ROZET */}
        <KucukRozet x={28} y={h/2} />

        {/* SAĞ KÜÇÜK ROZET */}
        <KucukRozet x={w-28} y={h/2} />

        {/* Üst ince süs zinciri */}
        {Array.from({ length: 14 }).map((_, i) => {
          const x = 80 + i * 24
          return (
            <g key={`top-chain-${i}`}>
              <circle cx={x} cy="11" r="0.5" fill={ac} fillOpacity="0.2" />
              <path
                d={`M ${x-3.5} 11 Q ${x} 8.5 ${x+3.5} 11`}
                fill="none"
                stroke={ac}
                strokeWidth="0.3"
                strokeOpacity="0.2"
              />
            </g>
          )
        })}

        {/* Alt ince süs zinciri */}
        {Array.from({ length: 14 }).map((_, i) => {
          const x = 80 + i * 24
          return (
            <g key={`bottom-chain-${i}`}>
              <circle cx={x} cy={h-11} r="0.5" fill={ac} fillOpacity="0.2" />
              <path
                d={`M ${x-3.5} ${h-11} Q ${x} ${h-8.5} ${x+3.5} ${h-11}`}
                fill="none"
                stroke={ac}
                strokeWidth="0.3"
                strokeOpacity="0.2"
              />
            </g>
          )
        })}

        {/* Besmele metni */}
        <text
          x={w/2}
          y={h/2 + 7}
          textAnchor="middle"
          fontFamily="'Scheherazade New', 'Traditional Arabic', 'Noto Naskh Arabic', serif"
          fontSize="18"
          fontWeight="500"
          fill={ac}
          fillOpacity="0.7"
          direction="rtl"
        >
          بِسۡمِ ٱللَّهِ ٱلرَّحۡمَٰنِ ٱلرَّحِيمِ
        </text>
      </svg>
    </div>
  )
}