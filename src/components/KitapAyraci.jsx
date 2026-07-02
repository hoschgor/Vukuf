export default function KitapAyraci({ kayit, theme, onTikla }) {
  if (!kayit) return null

  const ac = theme?.accent || "#d4af37"

  return (
    <div
      onClick={onTikla}
      style={{
        position: "absolute",
        top: 0,
        right: 0,
        zIndex: 9999,
        cursor: "pointer",
        width: "28px",
        height: "52px",
        opacity: 0.9,
        transition: "all 0.2s ease",
        // filter: "drop-shadow(...)" ← KALDIR
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
        width="28"
        height="52"
        viewBox="0 0 28 52"
        xmlns="http://www.w3.org/2000/svg"
        style={{ display: "block" }}
      >
        <defs>
          <linearGradient id="ayracGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={ac} stopOpacity="0.9" />
            <stop offset="60%" stopColor={ac} stopOpacity="0.75" />
            <stop offset="100%" stopColor={ac} stopOpacity="0.6" />
          </linearGradient>
          <linearGradient id="ayracParlak" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="rgba(255,255,255,0.25)" />
            <stop offset="50%" stopColor="rgba(255,255,255,0)" />
            <stop offset="100%" stopColor="rgba(255,255,255,0.06)" />
          </linearGradient>
        </defs>

        {/* Ana gövde - DÜZ KENARLI, KAVİS SADECE ALTTE */}
        <path
          d="
            M4 0 
            L24 0 
            L24 44 
            L14 38 
            L4 44 
            Z
          "
          fill="url(#ayracGrad)"
          stroke="rgba(255,255,255,0.08)"
          strokeWidth="0.4"
        />

        <path
          d="
            M4 0 
            L24 0 
            L24 44 
            L14 38 
            L4 44 
            Z
          "
          fill="url(#ayracParlak)"
        />

        {/* İç çerçeve */}
        <path
          d="
            M6 2 
            L22 2 
            L22 39 
            L14 35 
            L6 39 
            Z
          "
          fill="none"
          stroke="rgba(255,255,255,0.1)"
          strokeWidth="0.3"
        />

        {/* İç çerçeve 2 */}
        <path
          d="
            M8 4 
            L20 4 
            L20 35 
            L14 32 
            L8 35 
            Z
          "
          fill="none"
          stroke="rgba(255,255,255,0.05)"
          strokeWidth="0.2"
        />

        {/* ========================= */}
        {/* ÜST ZERDÜZ */}
        {/* ========================= */}
        <g transform="translate(14 6)">
          {[0, 60, 120, 180, 240, 300].map((deg, i) => {
            const rad = deg * Math.PI / 180
            const x = Math.cos(rad) * 3.5
            const y = Math.sin(rad) * 3.5
            return (
              <path
                key={`flower-${i}`}
                d={`M ${x} ${y} Q ${x*0.3} ${y*0.3} 0 0 Q ${x*0.3} ${y*0.3} ${x} ${y}`}
                fill="rgba(255,255,255,0.2)"
                stroke="rgba(255,255,255,0.08)"
                strokeWidth="0.2"
              />
            )
          })}
          <circle r="2" fill="rgba(255,255,255,0.25)" />
          <circle r="1" fill={ac} />
        </g>

        {/* ========================= */}
        {/* ORTA İNCİ ZİNCİRİ */}
        {/* ========================= */}
        {[0, 1, 2, 3].map((i) => {
          const y = 17 + i * 4
          return (
            <g key={`pearl-${i}`}>
              <circle
                cx="14"
                cy={y}
                r={i === 1 || i === 2 ? 0.7 : 0.9}
                fill={i === 1 || i === 2 ? "rgba(255,255,255,0.12)" : "rgba(255,255,255,0.25)"}
              />
              {i < 3 && (
                <line
                  x1="14"
                  y1={y}
                  x2="14"
                  y2={y + 4}
                  stroke="rgba(255,255,255,0.05)"
                  strokeWidth="0.2"
                />
              )}
            </g>
          )
        })}

        {/* ========================= */}
        {/* ALT LALE */}
        {/* ========================= */}
        <g transform="translate(14 42)">
          <path
            d="M0 0 C2 -2.5 3.5 -1 0 -5 C-3.5 -1 -2 -2.5 0 0"
            fill="rgba(255,255,255,0.15)"
          />
          <circle r="1" fill="rgba(255,255,255,0.3)" />
          <circle r="0.5" fill={ac} />
        </g>

        {/* ========================= */}
        {/* YAN SÜSLEMELER */}
        {/* ========================= */}
        {[0, 1, 2, 3, 4].map((i) => {
          const y = 12 + i * 6
          return (
            <line
              key={`l-${i}`}
              x1="6"
              y1={y}
              x2="3"
              y2={y}
              stroke="rgba(255,255,255,0.06)"
              strokeWidth="0.3"
            />
          )
        })}
        {[0, 1, 2, 3, 4].map((i) => {
          const y = 12 + i * 6
          return (
            <line
              key={`r-${i}`}
              x1="22"
              y1={y}
              x2="25"
              y2={y}
              stroke="rgba(255,255,255,0.06)"
              strokeWidth="0.3"
            />
          )
        })}
      </svg>
    </div>
  )
}