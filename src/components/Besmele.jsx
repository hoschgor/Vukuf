import { useMediaQuery } from '../data/hooks/useMediaQuery'

function KucukRozet({ x, y, ac, caliniyor }) {
  const cicekIcerik = (
    <>
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
      {[...Array(8)].map((_, i) => {
        const ang = i * 45
        const cx = Math.cos(ang * Math.PI / 180) * 9
        const cy = Math.sin(ang * Math.PI / 180) * 9
        return (
          <ellipse
            key={`long-${i}`}
            cx={cx} cy={cy} rx="4" ry="1.5"
            transform={`rotate(${ang} ${cx} ${cy})`}
            fill={ac} fillOpacity="0.65"
          />
        )
      })}
      {[...Array(8)].map((_, i) => {
        const ang = i * 45 + 22.5
        const cx = Math.cos(ang * Math.PI / 180) * 5
        const cy = Math.sin(ang * Math.PI / 180) * 5
        return (
          <ellipse
            key={`short-${i}`}
            cx={cx} cy={cy} rx="2.5" ry="1"
            transform={`rotate(${ang} ${cx} ${cy})`}
            fill={ac} fillOpacity="0.8"
          />
        )
      })}
      {[0, 90, 180, 270].map((d, i) => (
        <g key={`star-${i}`} transform={`rotate(${d})`}>
          <line x1="0" y1="0" x2="7" y2="0" stroke={ac} strokeWidth="0.45" strokeOpacity="0.65" />
          <line x1="4" y1="-1.5" x2="6" y2="0" stroke={ac} strokeWidth="0.35" />
          <line x1="4" y1="1.5" x2="6" y2="0" stroke={ac} strokeWidth="0.35" />
        </g>
      ))}
      <circle r="5" fill="none" stroke={ac} strokeWidth="0.45" strokeOpacity="0.6" />
      <circle r="2.5" fill={ac} fillOpacity="0.85" />
      <circle r="1" fill="white" fillOpacity="0.3" />
    </>
  )

  return (
    <g transform={`translate(${x}, ${y})`}>
      <g>
        {cicekIcerik}
        {caliniyor && (
          <animateTransform
            attributeName="transform"
            type="rotate"
            from="0 0 0"
            to="360 0 0"
            dur="12s"
            repeatCount="indefinite"
          />
        )}
      </g>
    </g>
  )
}

export default function Besmele({ theme, sureId, sureNo, ayetSayisi, player }) {
  if (sureId === 9) return null

  const isMobile = useMediaQuery('(max-width: 768px)')

  const ac = theme.accent
  const w = 500
  const h = 70

  // Sadece bu sure için Besmele çalınıyorsa true olacak
  const caliniyor =
    player?.durum === "caliyor" &&
    player?.aktifAyet?.besmeleIcin === sureNo

  return (
    <div style={{
      textAlign: "center",
      direction: "rtl",
      margin: isMobile ? "0px 0 4px" : "0px 0 0px",
      padding: isMobile ? "0px 0px" : "0",
      position: "relative",
    }}>
      <div style={{
        position: "relative",
        display: "inline-block",
        maxWidth: "100%",
        width: "100%",
      }}>
        <svg
          width="100%"
          viewBox="0 0 500 70"
          preserveAspectRatio="xMidYMid meet"
          style={{
            maxWidth: isMobile ? "100%" : "100%",
            margin: "0 auto",
            display: "block",
          }}
        >
          <style>{`
            @keyframes rozetSpin {
              from { transform: rotate(0deg); }
              to { transform: rotate(360deg); }
            }
          `}</style>

          <defs>
            <linearGradient id="besmeleGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor={ac} stopOpacity="0.05" />
              <stop offset="50%" stopColor={ac} stopOpacity="0.12" />
              <stop offset="100%" stopColor={ac} stopOpacity="0.05" />
            </linearGradient>

            {/* Alt çizgi için uçları eriyen (fade-out) gradyan */}
            <linearGradient id="altCizgiGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor={ac} stopOpacity="0" />
              <stop offset="18%" stopColor={ac} stopOpacity="0.75" />
              <stop offset="50%" stopColor={ac} stopOpacity="1" />
              <stop offset="82%" stopColor={ac} stopOpacity="0.75" />
              <stop offset="100%" stopColor={ac} stopOpacity="0" />
            </linearGradient>
          </defs>

          <rect x="2" y="2" width={w - 4} height={h - 4} rx="4"
            fill="url(#besmeleGrad)" stroke={ac} strokeWidth={caliniyor ? "1" : "0.6"}
            strokeOpacity={caliniyor ? "0.7" : "0.4"}
            style={{ transition: "stroke-width 0.3s, stroke-opacity 0.3s" }} />

          <rect x="6" y="6" width={w - 12} height={h - 12} rx="3"
            fill="none" stroke={ac} strokeWidth="0.35" strokeOpacity="0.25" />

          <KucukRozet x={28} y={h / 2} ac={ac} caliniyor={caliniyor} />
          <KucukRozet x={w - 28} y={h / 2} ac={ac} caliniyor={caliniyor} />

          {Array.from({ length: 14 }).map((_, i) => {
            const x = 80 + i * 24
            return (
              <g key={`top-chain-${i}`}>
                <circle cx={x} cy="11" r="0.5" fill={ac} fillOpacity="0.2" />
                <path d={`M ${x - 3.5} 11 Q ${x} 8.5 ${x + 3.5} 11`}
                  fill="none" stroke={ac} strokeWidth="0.3" strokeOpacity="0.2" />
              </g>
            )
          })}

          {Array.from({ length: 14 }).map((_, i) => {
            const x = 80 + i * 24
            return (
              <g key={`bottom-chain-${i}`}>
                <circle cx={x} cy={h - 11} r="0.5" fill={ac} fillOpacity="0.2" />
                <path d={`M ${x - 3.5} ${h - 11} Q ${x} ${h - 8.5} ${x + 3.5} ${h - 11}`}
                  fill="none" stroke={ac} strokeWidth="0.3" strokeOpacity="0.2" />
              </g>
            )
          })}

          <text
            x={w / 2} y={h / 2 + 13}
            textAnchor="middle"
            fontFamily="Symbols1"
            fontSize={isMobile ? "55" : "55"}
            fontWeight="500"
            fill={ac} fillOpacity={caliniyor ? "0.95" : "0.7"}
            direction="rtl"
            style={{ transition: "fill-opacity 0.3s" }}
          >
           {String.fromCodePoint(0xF021)}
          </text>

          {/* Çalarken beliren alt çizgi — gradyanla uçları eriyen çizgi,
              ortada küçük bir eşkenar dörtgen (diamond) süslemesi ile */}
          <g style={{
            opacity: caliniyor ? 1 : 0,
            transition: "opacity 0.4s ease",
          }}>
            <rect
              x={w / 2 - (caliniyor ? 110 : 0)}
              y={h / 2 + 25.3}  // ← 13.3 → 33.3
              width={caliniyor ? 220 : 0}
              height="1.7"
              fill="url(#altCizgiGrad)"
              style={{ transition: "width 0.5s ease, x 0.5s ease" }}
            />
            <g transform={`translate(${w / 2}, ${h / 2 + 25.9})`}>  {/* ← 13.9 → 33.9 */}
              <rect
                x="-2.5" y="-2.5" width="5" height="5"
                fill={ac} fillOpacity="0.85"
                transform="rotate(45)"
              />
              <rect
                x="-1" y="-1" width="2" height="2"
                fill="white" fillOpacity="0.4"
                transform="rotate(45)"
              />
            </g>
          </g>
        </svg>
      </div>
    </div>
  )
}
