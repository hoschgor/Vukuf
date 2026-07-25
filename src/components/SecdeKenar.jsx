export default function SecdeKenar({ secdeAyetleri, theme, arapcaFont, onTikla }) {
  if (!secdeAyetleri?.length) return null

  return (
    <div
      style={{
        position: "absolute",
        right: "-36px",
        top: "50%",
        transform: "translateY(-50%)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "12px",
        zIndex: 10,
      }}
    >
      {secdeAyetleri.map((ayet, i) => (
        <button
          key={i}
          onClick={() => onTikla?.(ayet)}
          title={`Secde âyeti — ${ayet.sureNo}:${ayet.ayetNo}`}
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "3px",
            background: "none",
            border: "none",
            cursor: "pointer",
            padding: "4px",
          }}
        >
          {/* Rozet SVG */}
          <svg width="18" height="18" viewBox="0 0 24 24">
            <path
              d="M12 2 L14.5 8.5 L21.5 8.5 L16 13 L18.5 20 L12 16 L5.5 20 L8 13 L2.5 8.5 L9.5 8.5 Z"
              fill="none"
              stroke="#2e7d4f"
              strokeWidth="1.5"
              strokeLinejoin="round"
            />
            <circle cx="12" cy="11" r="2.5" fill="#2e7d4f" />
          </svg>

          {/* Dikey Arapça */}
          <span
            style={{
              writingMode: "vertical-rl",
              fontSize: "10px",
              fontFamily: arapcaFont,
              color: "#2e7d4f",
              letterSpacing: "1px",
              lineHeight: 1,
            }}
          >
            سَجْدَة
          </span>
        </button>
      ))}
    </div>
  )
}
