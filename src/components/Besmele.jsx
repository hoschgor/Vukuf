// components/Besmele.jsx
import { Play, Pause, Volume2 } from "lucide-react"
import { useMediaQuery } from '../data/hooks/useMediaQuery' // Mobil tespiti için

/**
 * Besmele
 * ───────
 * Konum: src/components/Besmele.jsx
 *
 * Yeni prop'lar:
 *   player     → useAudioPlayer() dönüşü (opsiyonel, yoksa ses butonu gizlenir)
 *   sureNo     → hangi surenin besmelesi (sureCal için)
 *   ayetSayisi → o surenin toplam ayet sayısı
 */
export default function Besmele({ theme, sureId, sureNo, ayetSayisi, player }) {
  if (sureId === 9) return null

  // 📱 Mobil kontrolü
  const isMobile = useMediaQuery('(max-width: 768px)')
  
  const ac = theme.accent
  const w = 500
  const h = 52

  // Ses durumu
  const caliniyor =
    player?.durum === "caliyor" &&
    player?.aktifAyet?.sureNo === sureNo

  function sesTikla(e) {
    e.stopPropagation()
    if (!player) return

    if (caliniyor) {
      player.duraklat()
    } else if (player.durum === "duraklatildi" && player.aktifAyet?.sureNo === sureNo) {
      player.devamEt()
    } else {
      // Sureyi baştan çal
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
      // 📱 Mobilde padding ekle
      margin: isMobile ? "0px 0 4px" : "0px 0 0px",
      padding: isMobile ? "0px 0px" : "0", // Mobilde iç boşluk
      position: "relative",
    }}>
      <svg
        width="100%"
        viewBox="0 0 500 52"
        preserveAspectRatio="xMidYMid meet"
        style={{
          // 📱 Mobilde SVG boyutunu küçült
          maxWidth: isMobile ? "100%" : "100%",
          margin: "0 auto",
        }}
      >
        <defs>
          <linearGradient id="besmeleGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={ac} stopOpacity="0.05" />
            <stop offset="50%" stopColor={ac} stopOpacity="0.12" />
            <stop offset="100%" stopColor={ac} stopOpacity="0.05" />
          </linearGradient>
        </defs>

        {/* Ana çerçeve */}
        <rect x="2" y="2" width={w-4} height={h-4} rx="4"
          fill="url(#besmeleGrad)" stroke={ac} strokeWidth="0.6" strokeOpacity="0.4" />

        {/* İç çerçeve */}
        <rect x="6" y="6" width={w-12} height={h-12} rx="3"
          fill="none" stroke={ac} strokeWidth="0.35" strokeOpacity="0.25" />

        {/* Sol rozet */}
        <KucukRozet x={28} y={h/2} />

        {/* Sağ rozet */}
        <KucukRozet x={w-28} y={h/2} />

        {/* Üst süs zinciri */}
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

        {/* Alt süs zinciri */}
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

        {/* Besmele metni */}
        <text
          x={w/2} y={h/2 + 7}
          textAnchor="middle"
          fontFamily="'Scheherazade New', 'Traditional Arabic', 'Noto Naskh Arabic', serif"
          fontSize={isMobile ? "16" : "18"} // 📱 Mobilde yazı boyutunu küçült
          fontWeight="500"
          fill={ac} fillOpacity="0.7"
          direction="rtl"
        >
          بِسۡمِ ٱللَّهِ ٱلرَّحۡمَٰنِ ٱلرَّحِيمِ
        </text>

        {/* Ses butonu — SVG içinde foreignObject ile */}
        {player && (
          <foreignObject
            x={isMobile ? "70%" : "135%"}   // Yüzdelik konum (mobilde daha solda)
            y={isMobile ? "20%" : "100%"}
            width="5%"                     // Yüzdelik boyut (ekranla orantılı)
            height="4%"                    // Yüzdelik boyut (ekranla orantılı)
            style={{ overflow: "visible", transform: "translate(-50%, -50%)" }}
          >
            <button
              onClick={sesTikla}
              title={caliniyor ? "Duraklat" : "Sureyi dinle"}
              style={{
                width: "100%",
                height: "100%",
                aspectRatio: "1/1",
                borderRadius: "50%",
                border: `1.5px solid ${ac}40`,
                background: caliniyor ? ac : `${ac}18`,
                color: caliniyor ? "#fff" : ac,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: 0,
                margin: 0,
                transition: "all 0.15s",
                boxShadow: "none",
                transform: "scale(1)",
                position: "relative",
                zIndex: 10,
                fontSize: "clamp(8px, 1.2vw, 14px)", // Otomatik icon boyutu
              }}
            >
              {caliniyor ? <Pause size="1em" /> : <Play size="1em" />}
            </button>
          </foreignObject>
        )}
      </svg>
    </div>
  )
}