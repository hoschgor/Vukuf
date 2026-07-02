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
        width: "48px",
        height: "72px",
        opacity: 0.95,
        transition: "all 0.2s ease",
        filter: "drop-shadow(0 6px 14px rgba(0,0,0,0.25))",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = "scale(1.06)"
        e.currentTarget.style.opacity = "1"
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = "scale(1)"
        e.currentTarget.style.opacity = "0.95"
      }}
    >
      <svg
        width="48"
        height="72"
        viewBox="0 0 48 72"
        xmlns="http://www.w3.org/2000/svg"
        style={{ display: "block" }}
      >
        <defs>
          {/* ALTIN GRADIENT */}
          <linearGradient id="gold" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#f6e27a" />
            <stop offset="40%" stopColor="#d4af37" />
            <stop offset="100%" stopColor="#8d6a19" />
          </linearGradient>

          {/* PARLAKLIK */}
          <linearGradient id="shine" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="rgba(255,255,255,0.35)" />
            <stop offset="50%" stopColor="rgba(255,255,255,0.05)" />
            <stop offset="100%" stopColor="rgba(255,255,255,0)" />
          </linearGradient>

          {/* ANA GÖVDE */}
          <path
            id="baseShape"
            d="
              M8 0
              Q24 4 40 0
              Q44 2 44 8
              V60
              Q44 64 40 66
              L24 56
              L8 66
              Q4 64 4 60
              V8
              Q4 2 8 0
              Z
            "
          />
        </defs>

        {/* DIŞ GÖVDE */}
        <use href="#baseShape" fill="url(#gold)" />

        {/* PARLAK KATMAN */}
        <use href="#baseShape" fill="url(#shine)" />

        {/* İÇ ÇERÇEVE 1 */}
        <path
          d="
            M10 3
            Q24 7 38 3
            Q41 5 41 10
            V58
            Q41 61 38 62
            L24 53
            L10 62
            Q7 61 7 58
            V10
            Q7 5 10 3
            Z
          "
          fill="none"
          stroke="rgba(255,255,255,0.25)"
          strokeWidth="0.6"
        />

        {/* İÇ ÇERÇEVE 2 */}
        <path
          d="
            M13 7
            Q24 10 35 7
            Q37 9 37 12
            V54
            Q37 57 35 58
            L24 50
            L13 58
            Q11 57 11 54
            V12
            Q11 9 13 7
            Z
          "
          fill="none"
          stroke="rgba(255,255,255,0.15)"
          strokeWidth="0.4"
        />

        {/* ========================= */}
        {/* ÜST ŞEMSE (OSMANLI GÜNEŞİ) */}
        {/* ========================= */}
        <g transform="translate(24 14)">
          {[...Array(16)].map((_, i) => {
            const a = (i * 360) / 16
            const rad = (a * Math.PI) / 180
            const x = Math.cos(rad) * 9
            const y = Math.sin(rad) * 9

            return (
              <ellipse
                key={i}
                cx={x}
                cy={y}
                rx="4.2"
                ry="1.6"
                transform={`rotate(${a} ${x} ${y})`}
                fill="rgba(255,255,255,0.25)"
              />
            )
          })}

          <circle r="6" fill="rgba(255,255,255,0.15)" />
          <circle r="3.5" fill="url(#gold)" />
          <circle r="1.5" fill={ac} />
        </g>

        {/* İNCE IŞINLAR */}
        {[0, 45, 90, 135].map((a, i) => (
          <line
            key={i}
            x1="24"
            y1="14"
            x2={24 + Math.cos((a * Math.PI) / 180) * 10}
            y2={14 + Math.sin((a * Math.PI) / 180) * 10}
            stroke="rgba(255,255,255,0.12)"
            strokeWidth="0.5"
          />
        ))}
                {/* ========================= */}
        {/* ORTA İNCİ ZİNCİRİ */}
        {/* ========================= */}
        {[0, 1, 2, 3, 4].map((i) => {
          const y = 30 + i * 6
          return (
            <g key={i}>
              <circle
                cx="24"
                cy={y}
                r={i % 2 === 0 ? 1.3 : 0.8}
                fill="rgba(255,255,255,0.35)"
              />
              {i < 4 && (
                <line
                  x1="24"
                  y1={y}
                  x2="24"
                  y2={y + 6}
                  stroke="rgba(255,255,255,0.08)"
                />
              )}
            </g>
          )
        })}

        {/* ========================= */}
        {/* RUMİ YAN MOTİFLER */}
        {/* ========================= */}
        {[0, 1, 2].map((i) => {
          const y = 28 + i * 10
          return (
            <path
              key={i}
              d="
                M12 0
                C10 4, 14 6, 12 10
                C10 14, 14 16, 12 20
              "
              transform={`translate(0 ${y})`}
              stroke="rgba(255,255,255,0.18)"
              fill="none"
              strokeWidth="0.5"
            />
          )
        })}

        {/* ========================= */}
        {/* ALT LALE MOTİFİ */}
        {/* ========================= */}
        <g transform="translate(24 60)">
          <path
            d="
              M0 0
              C4 -4, 6 -2, 0 -10
              C-6 -2, -4 -4, 0 0
            "
            fill="rgba(255,255,255,0.25)"
          />
          <circle r="1.6" fill={ac} />
        </g>

        {/* ========================= */}
        {/* DIŞ SPARKLE NOKTALARI */}
        {/* ========================= */}
        {[...Array(10)].map((_, i) => {
          const a = (i * 36)
          const rad = (a * Math.PI) / 180
          return (
            <circle
              key={i}
              cx={24 + Math.cos(rad) * 18}
              cy={36 + Math.sin(rad) * 20}
              r="0.6"
              fill="rgba(255,255,255,0.12)"
            />
          )
        })}

        {/* ALT KAPANIŞ ÇERÇEVE */}
        <path
          d="
            M8 66
            Q24 72 40 66
          "
          fill="none"
          stroke="rgba(255,255,255,0.18)"
          strokeWidth="0.6"
        />
      </svg>
    </div>
  )
}