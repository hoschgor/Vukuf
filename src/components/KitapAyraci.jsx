export default function KitapAyraci({ kayit, theme, onTikla, vurgulu = false }) {
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
        opacity: 0.95,
        transition: "all 0.2s ease",
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
        width="60"
        height="32"
        viewBox="0 0 60 32"
        style={{ overflow: "visible", color: ac, filter: "drop-shadow(0 1px 1.5px rgba(0,0,0,0.2))" }}
      >
        {/* Hurma dalı - ana gövde */}
        <path d="M0 16 C8 14, 14 15, 22 16 C26 16.5, 30 15.5, 34 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" opacity=".9" />

        {/* Hurma dalı - yaprakçıklar (üst) */}
        <path d="M4 15.5 C5 13, 7 11, 9 12" fill="none" stroke="currentColor" strokeWidth=".7" strokeLinecap="round" opacity=".55" />
        <path d="M8 15.8 C9 13.2, 11 11.5, 13 12.5" fill="none" stroke="currentColor" strokeWidth=".7" strokeLinecap="round" opacity=".55" />
        <path d="M12 16 C13 13.5, 15 12, 17 13" fill="none" stroke="currentColor" strokeWidth=".7" strokeLinecap="round" opacity=".55" />
        <path d="M16 16.2 C17 13.8, 19 12.5, 21 13.5" fill="none" stroke="currentColor" strokeWidth=".7" strokeLinecap="round" opacity=".5" />
        <path d="M20 16 C21 13.8, 23 12.8, 25 13.8" fill="none" stroke="currentColor" strokeWidth=".7" strokeLinecap="round" opacity=".5" />
        <path d="M24 16.3 C25 14.2, 27 13.2, 29 14" fill="none" stroke="currentColor" strokeWidth=".6" strokeLinecap="round" opacity=".45" />

        {/* Hurma dalı - yaprakçıklar (alt) */}
        <path d="M4 16.5 C5 18.5, 7 19.5, 9 18.5" fill="none" stroke="currentColor" strokeWidth=".7" strokeLinecap="round" opacity=".55" />
        <path d="M8 16.2 C9 18, 11 19.2, 13 18.2" fill="none" stroke="currentColor" strokeWidth=".7" strokeLinecap="round" opacity=".55" />
        <path d="M12 16 C13 17.8, 15 19, 17 18" fill="none" stroke="currentColor" strokeWidth=".7" strokeLinecap="round" opacity=".55" />
        <path d="M16 15.8 C17 17.5, 19 18.5, 21 17.5" fill="none" stroke="currentColor" strokeWidth=".7" strokeLinecap="round" opacity=".5" />
        <path d="M20 16 C21 17.5, 23 18.2, 25 17.2" fill="none" stroke="currentColor" strokeWidth=".7" strokeLinecap="round" opacity=".5" />
        <path d="M24 15.7 C25 17, 27 17.8, 29 17" fill="none" stroke="currentColor" strokeWidth=".6" strokeLinecap="round" opacity=".45" />

        {/* Motif - rozet */}
        <g transform="translate(40 16)">
          <g
            className={vurgulu ? "ayrac-vurgu" : ""}
            style={{ transformOrigin: "0px 0px", opacity: 0.95, ...(vurgulu ? { animation: "ayrac-vurgu-anim 1.6s ease-in-out both" } : {}) }}
          >
            {/* En dıştaki küçük noktalar */}
            {[...Array(24)].map((_, i) => {
              const a = i * 15 * Math.PI / 180
              return <circle key={i} cx={Math.cos(a) * 14} cy={Math.sin(a) * 14} r=".55" fill="currentColor" opacity=".45" />
            })}
            {/* Orta boy elipsler */}
            {[...Array(16)].map((_, i) => {
              const a = i * 22.5
              const r = 10.5
              const x = Math.cos(a * Math.PI / 180) * r
              const y = Math.sin(a * Math.PI / 180) * r
              return <ellipse key={"l" + i} cx={x} cy={y} rx="3.2" ry="1.2" transform={`rotate(${a} ${x} ${y})`} fill="currentColor" opacity=".9" />
            })}
          </g>
          {/* İçteki küçük elipsler */}
          {[...Array(16)].map((_, i) => {
            const a = i * 22.5 + 11.25
            const r = 7
            const x = Math.cos(a * Math.PI / 180) * r
            const y = Math.sin(a * Math.PI / 180) * r
            return <ellipse key={"s" + i} cx={x} cy={y} rx="1.8" ry=".7" transform={`rotate(${a} ${x} ${y})`} fill="currentColor" opacity=".95" />
          })}
          {/* Dış halka */}
          <circle r="8.5" fill="none" stroke="currentColor" strokeWidth=".8" opacity=".65" />
          {/* İç halka */}
          <circle r="5.5" fill="none" stroke="currentColor" strokeWidth=".5" opacity=".5" />
          {/* İç noktalar */}
          {[...Array(8)].map((_, i) => {
            const a = i * 45 * Math.PI / 180
            return <circle key={"p" + i} cx={Math.cos(a) * 4.2} cy={Math.sin(a) * 4.2} r=".45" fill="currentColor" opacity=".65" />
          })}
          {/* Merkez */}
          <circle r="2.6" fill="currentColor" opacity="1" />
          <circle r="1" fill={theme?.background || "#fff"} opacity=".5" />
        </g>
      </svg>
    </div>
  )
}
