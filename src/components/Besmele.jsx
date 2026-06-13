// components/Besmele.jsx
export default function Besmele({ theme, sureId }) {
  // Tevbe Suresi (9) için besmele gösterilmez
  if (sureId === 9) return null
  
  const ac = theme.accent
  
  return (
    <div style={{
      textAlign: "center",
      direction: "rtl",
      margin: "16px 0 8px",
      position: "relative",
    }}>
      <svg
        width="100%"
        viewBox="0 0 500 60"
        preserveAspectRatio="xMidYMid meet"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Hafif altın çizgi */}
        <line x1="50" y1="30" x2="200" y2="30" stroke={ac} strokeWidth="0.3" strokeOpacity="0.2"/>
        <line x1="300" y1="30" x2="450" y2="30" stroke={ac} strokeWidth="0.3" strokeOpacity="0.2"/>
        
        {/* Küçük süs noktaları */}
        <circle cx="210" cy="30" r="1.5" fill={ac} fillOpacity="0.3"/>
        <circle cx="250" cy="30" r="1" fill={ac} fillOpacity="0.2"/>
        <circle cx="290" cy="30" r="1.5" fill={ac} fillOpacity="0.3"/>
        
        {/* Besmele metni */}
        <text
          x="250"
          y="45"
          textAnchor="middle"
          fontFamily="'Scheherazade New', 'Traditional Arabic', serif"
          fontSize="22"
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