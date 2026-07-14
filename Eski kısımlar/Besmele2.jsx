// components/Besmele.jsx
import { Play, Pause } from "lucide-react"
import { useMediaQuery } from '../data/hooks/useMediaQuery'

export default function Besmele({ theme, sureId, sureNo, ayetSayisi, player }) {
  if (sureId === 9) return null

  const isMobile = useMediaQuery('(max-width: 768px)')
  
  const ac = theme.accent
  const w = 500
  const h = 52

  const caliniyor =
    player?.durum === "caliyor" &&
    (player?.aktifAyet?.sureNo === sureNo ||
    player?.aktifAyet?.besmeleIcin === sureNo)

  function sesTikla(e) {
    e.stopPropagation()
    if (!player) return

    if (caliniyor) {
      player.duraklat()
    } else if (player.durum === "duraklatildi" && player.aktifAyet?.sureNo === sureNo) {
      player.devamEt()
    } else {
      player.sureCal(sureNo, ayetSayisi, 1)
    }
  }

  const KucukRozet = ({ x, y }) => (
    <g transform={`translate(${x}, ${y})`}>
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
    </g>
  )

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
          viewBox="0 0 500 52"
          preserveAspectRatio="xMidYMid meet"
          style={{
            maxWidth: isMobile ? "100%" : "100%",
            margin: "0 auto",
            display: "block",
          }}
        >
          <defs>
            <linearGradient id="besmeleGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor={ac} stopOpacity="0.05" />
              <stop offset="50%" stopColor={ac} stopOpacity="0.12" />
              <stop offset="100%" stopColor={ac} stopOpacity="0.05" />
            </linearGradient>
          </defs>

          <rect x="2" y="2" width={w-4} height={h-4} rx="4"
            fill="url(#besmeleGrad)" stroke={ac} strokeWidth="0.6" strokeOpacity="0.4" />
          <rect x="6" y="6" width={w-12} height={h-12} rx="3"
            fill="none" stroke={ac} strokeWidth="0.35" strokeOpacity="0.25" />

          <KucukRozet x={28} y={h/2} />
          <KucukRozet x={w-28} y={h/2} />

          {Array.from({ length: 14 }).map((_, i) => {
            const x = 80 + i * 24
            return (
              <g key={`top-chain-${i}`}>
                <circle cx={x} cy="11" r="0.5" fill={ac} fillOpacity="0.2" />
                <path d={`M ${x-3.5} 11 Q ${x} 8.5 ${x+3.5} 11`}
                  fill="none" stroke={ac} strokeWidth="0.3" strokeOpacity="0.2" />
              </g>
            )
          })}

          {Array.from({ length: 14 }).map((_, i) => {
            const x = 80 + i * 24
            return (
              <g key={`bottom-chain-${i}`}>
                <circle cx={x} cy={h-11} r="0.5" fill={ac} fillOpacity="0.2" />
                <path d={`M ${x-3.5} ${h-11} Q ${x} ${h-8.5} ${x+3.5} ${h-11}`}
                  fill="none" stroke={ac} strokeWidth="0.3" strokeOpacity="0.2" />
              </g>
            )
          })}

          <text
            x={w/2} y={h/2 + 7}
            textAnchor="middle"
            fontFamily="'Scheherazade New', 'Traditional Arabic', 'Noto Naskh Arabic', serif"
            fontSize={isMobile ? "16" : "18"}
            fontWeight="500"
            fill={ac} fillOpacity="0.7"
            direction="rtl"
          >
            بِسۡمِ ٱللَّهِ ٱلرَّحۡمَٰنِ ٱلرَّحِيمِ
          </text>
        </svg> 
      </div>
    </div>
  )
}