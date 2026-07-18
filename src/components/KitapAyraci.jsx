export default function KitapAyraci({ kayit, theme, onTikla }) {
  if (!kayit) return null

  const ac = theme?.accent || "#d4af37"

  return (
    <div
      onClick={onTikla}
      style={{
        position: "absolute",
        top: -30,
        right: 0,
        zIndex: 9999,
        cursor: "pointer",
        width: "60px",
        height: "32px",
        overflow: "visible",
        opacity: 0.8,
        transition: "all 0.2s ease",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = "scale(1.06)"
        e.currentTarget.style.opacity = "1"
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = "scale(1)"
        e.currentTarget.style.opacity = "0.9"
      }}
    >
      <svg
        width="60"
        height="32"
        viewBox="0 0 60 32"
        style={{ overflow: "visible", color: ac }}
      >
        {/* Hurma dalı - ana gövde */}
        <path
          d="M0 16 C8 14, 14 15, 22 16 C26 16.5, 30 15.5, 34 16"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.2"
          strokeLinecap="round"
          opacity=".7"
        />

        {/* Hurma dalı - yaprakçıklar (üst) */}
        <path
          d="M4 15.5 C5 13, 7 11, 9 12"
          fill="none"
          stroke="currentColor"
          strokeWidth=".6"
          strokeLinecap="round"
          opacity=".4"
        />
        <path
          d="M8 15.8 C9 13.2, 11 11.5, 13 12.5"
          fill="none"
          stroke="currentColor"
          strokeWidth=".6"
          strokeLinecap="round"
          opacity=".4"
        />
        <path
          d="M12 16 C13 13.5, 15 12, 17 13"
          fill="none"
          stroke="currentColor"
          strokeWidth=".6"
          strokeLinecap="round"
          opacity=".4"
        />
        <path
          d="M16 16.2 C17 13.8, 19 12.5, 21 13.5"
          fill="none"
          stroke="currentColor"
          strokeWidth=".6"
          strokeLinecap="round"
          opacity=".35"
        />
        <path
          d="M20 16 C21 13.8, 23 12.8, 25 13.8"
          fill="none"
          stroke="currentColor"
          strokeWidth=".6"
          strokeLinecap="round"
          opacity=".35"
        />
        <path
          d="M24 16.3 C25 14.2, 27 13.2, 29 14"
          fill="none"
          stroke="currentColor"
          strokeWidth=".5"
          strokeLinecap="round"
          opacity=".3"
        />

        {/* Hurma dalı - yaprakçıklar (alt) */}
        <path
          d="M4 16.5 C5 18.5, 7 19.5, 9 18.5"
          fill="none"
          stroke="currentColor"
          strokeWidth=".6"
          strokeLinecap="round"
          opacity=".4"
        />
        <path
          d="M8 16.2 C9 18, 11 19.2, 13 18.2"
          fill="none"
          stroke="currentColor"
          strokeWidth=".6"
          strokeLinecap="round"
          opacity=".4"
        />
        <path
          d="M12 16 C13 17.8, 15 19, 17 18"
          fill="none"
          stroke="currentColor"
          strokeWidth=".6"
          strokeLinecap="round"
          opacity=".4"
        />
        <path
          d="M16 15.8 C17 17.5, 19 18.5, 21 17.5"
          fill="none"
          stroke="currentColor"
          strokeWidth=".6"
          strokeLinecap="round"
          opacity=".35"
        />
        <path
          d="M20 16 C21 17.5, 23 18.2, 25 17.2"
          fill="none"
          stroke="currentColor"
          strokeWidth=".6"
          strokeLinecap="round"
          opacity=".35"
        />
        <path
          d="M24 15.7 C25 17, 27 17.8, 29 17"
          fill="none"
          stroke="currentColor"
          strokeWidth=".5"
          strokeLinecap="round"
          opacity=".3"
        />

        {/* Hurma dalı - ince damarlar */}
        <path
          d="M0 16 C6 15.5, 12 16.5, 18 16 C22 15.5, 26 16, 30 15.5 C33 15.2, 35 15.8, 37 15.5"
          fill="none"
          stroke="currentColor"
          strokeWidth=".3"
          strokeLinecap="round"
          opacity=".2"
        />

        {/* Motif - PlayButton tarzı */}
        <g transform="translate(40 16)">
          {/* En dıştaki küçük noktalar */}
          {[...Array(24)].map((_, i) => {
            const a = i * 15 * Math.PI / 180
            return (
              <circle 
                key={i} 
                cx={Math.cos(a) * 14} 
                cy={Math.sin(a) * 14} 
                r=".5" 
                fill="currentColor" 
                opacity=".3"
              />
            )
          })}

          {/* Orta boy elipsler */}
          {[...Array(16)].map((_, i) => {
            const a = i * 22.5
            const r = 10.5
            const x = Math.cos(a * Math.PI / 180) * r
            const y = Math.sin(a * Math.PI / 180) * r
            return (
              <ellipse
                key={"l"+i}
                cx={x}
                cy={y}
                rx="3.2"
                ry="1.2"
                transform={`rotate(${a} ${x} ${y})`}
                fill="currentColor"
                opacity=".7"
              />
            )
          })}

          {/* İçteki küçük elipsler */}
          {[...Array(16)].map((_, i) => {
            const a = i * 22.5 + 11.25
            const r = 7
            const x = Math.cos(a * Math.PI / 180) * r
            const y = Math.sin(a * Math.PI / 180) * r
            return (
              <ellipse
                key={"s"+i}
                cx={x}
                cy={y}
                rx="1.8"
                ry=".7"
                transform={`rotate(${a} ${x} ${y})`}
                fill="currentColor"
                opacity=".85"
              />
            )
          })}

          {/* Dış halka */}
          <circle
            r="8.5"
            fill="none"
            stroke="currentColor"
            strokeWidth=".6"
            opacity=".45"
          />

          {/* İç halka */}
          <circle
            r="5.5"
            fill="none"
            stroke="currentColor"
            strokeWidth=".4"
            opacity=".35"
          />

          {/* İç noktalar */}
          {[...Array(8)].map((_, i) => {
            const a = i * 45 * Math.PI / 180
            return (
              <circle 
                key={"p"+i} 
                cx={Math.cos(a) * 4.2} 
                cy={Math.sin(a) * 4.2} 
                r=".4" 
                fill="currentColor" 
                opacity=".5"
              />
            )
          })}

          {/* Merkez */}
          <circle
            r="2.5"
            fill="currentColor"
            opacity=".9"
          />
          <circle
            r="1"
            fill={theme?.background || "#fff"}
            opacity=".4"
          />
        </g>
      </svg>
    </div>
  )
}