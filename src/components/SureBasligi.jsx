export default function SureBasligi({ sure, theme, onTikla }) {
  const ac = theme.accent
  const w = 580
  const h = 110

  const hexToRgb = (hex) => {
    const r = parseInt(hex.slice(1,3),16)
    const g = parseInt(hex.slice(3,5),16)
    const b = parseInt(hex.slice(5,7),16)
    return { r, g, b }
  }

  const rgb = hexToRgb(ac.length === 7 ? ac : "#8b5e3c")

  return (
    <div
      onClick={onTikla}
      style={{ cursor: "pointer", userSelect: "none", margin: "32px 0 8px", direction: "ltr" }}
      title={`${sure.isim} · ${sure.anlam} · ${sure.yer}`}
    >
      <svg
        width="100%"
        viewBox={`0 0 ${w} ${h}`}
        preserveAspectRatio="xMidYMid meet"
        xmlns="http://www.w3.org/2000/svg"
        role="img"
      >
        <title>{sure.isim} Suresi</title>

        {/* ========== FAZ 1 — MİMARİ ========== */}
        
        {/* Dış çerçeve */}
        <rect x="3" y="3" width={w-6} height={h-6}
          fill="none"
          stroke={ac}
          strokeWidth="1.2"
          rx="6"
          strokeOpacity="0.7"
        />
        
        {/* İç çerçeve */}
        <rect x="10" y="10" width={w-20} height={h-20}
          fill="none"
          stroke={ac}
          strokeWidth="0.6"
          strokeDasharray="6 4"
          rx="3"
          strokeOpacity="0.5"
        />

        {/* Köşe rumi çıkıntıları */}
        {[[16,16], [w-16,16], [16,h-16], [w-16,h-16]].map(([cx,cy], idx) => (
          <g key={`cikinti-${idx}`}>
            <path
              d={`M${cx-8},${cy} Q${cx-4},${cy-8} ${cx},${cy-8} Q${cx+4},${cy-8} ${cx+8},${cy}`}
              fill="none"
              stroke={ac}
              strokeWidth="0.8"
              strokeOpacity="0.5"
            />
            <path
              d={`M${cx},${cy-8} Q${cx+8},${cy-4} ${cx+8},${cy} Q${cx+8},${cy+4} ${cx},${cy+8}`}
              fill="none"
              stroke={ac}
              strokeWidth="0.8"
              strokeOpacity="0.5"
            />
            <circle cx={cx} cy={cy} r="3" fill="none" stroke={ac} strokeWidth="0.6" strokeOpacity="0.4"/>
            <circle cx={cx} cy={cy} r="1" fill={ac} fillOpacity="0.6"/>
          </g>
        ))}

        {/* Merkez oval alan */}
        <ellipse cx={w/2} cy={h/2} rx="160" ry="35"
          fill={ac}
          fillOpacity="0.05"
          stroke={ac}
          strokeWidth="0.5"
          strokeOpacity="0.25"
        />

        {/* ========== FAZ 2 — OSMANLI ROZETLERİ (Sol) ========== */}
        <g transform="translate(38, 55)">
          {/* 32 inci halkası */}
          {Array.from({length: 32}).map((_, i) => {
            const angle = i * 11.25 * Math.PI/180
            return (
              <circle
                key={`sol-inci-${i}`}
                cx={Math.cos(angle) * 26}
                cy={Math.sin(angle) * 26}
                r="1.2"
                fill={ac}
                fillOpacity={i % 2 === 0 ? 0.5 : 0.3}
              />
            )
          })}
          
          {/* 16 uzun yaprak */}
          {Array.from({length: 16}).map((_, i) => {
            const angle = i * 22.5 * Math.PI/180
            return (
              <ellipse
                key={`sol-uzun-${i}`}
                cx={Math.cos(angle) * 20}
                cy={Math.sin(angle) * 20}
                rx="5" ry="2.5"
                fill={ac}
                fillOpacity="0.5"
                transform={`rotate(${i*22.5}, ${Math.cos(angle)*20}, ${Math.sin(angle)*20})`}
              />
            )
          })}
          
          {/* 16 kısa yaprak */}
          {Array.from({length: 16}).map((_, i) => {
            const angle = (i * 22.5 + 11.25) * Math.PI/180
            return (
              <ellipse
                key={`sol-kisa-${i}`}
                cx={Math.cos(angle) * 14}
                cy={Math.sin(angle) * 14}
                rx="3.5" ry="1.8"
                fill={ac}
                fillOpacity="0.7"
                transform={`rotate(${i*22.5+11.25}, ${Math.cos(angle)*14}, ${Math.sin(angle)*14})`}
              />
            )
          })}
          
          {/* 8 kollu yıldız */}
          {Array.from({length: 8}).map((_, i) => {
            const angle = i * 45 * Math.PI/180
            return (
              <path
                key={`sol-yildiz-${i}`}
                d={`M${Math.cos(angle)*9},${Math.sin(angle)*9} 
                   L${Math.cos(angle+0.4)*5},${Math.sin(angle+0.4)*5}
                   L${Math.cos(angle+0.8)*9},${Math.sin(angle+0.8)*9}`}
                fill={ac}
                fillOpacity="0.8"
              />
            )
          })}
          
          {/* Merkez şemse */}
          <circle cx="0" cy="0" r="5" fill={ac} fillOpacity="0.85"/>
          <circle cx="0" cy="0" r="2.5" fill={ac} fillOpacity="0.5"/>
          <circle cx="0" cy="0" r="1" fill="white" fillOpacity="0.3"/>
        </g>

        {/* ========== FAZ 2 — OSMANLI ROZETLERİ (Sağ) ========== */}
        <g transform={`translate(${w-38}, 55)`}>
          {Array.from({length: 32}).map((_, i) => {
            const angle = i * 11.25 * Math.PI/180
            return (
              <circle
                key={`sag-inci-${i}`}
                cx={Math.cos(angle) * 26}
                cy={Math.sin(angle) * 26}
                r="1.2"
                fill={ac}
                fillOpacity={i % 2 === 0 ? 0.5 : 0.3}
              />
            )
          })}
          {Array.from({length: 16}).map((_, i) => {
            const angle = i * 22.5 * Math.PI/180
            return (
              <ellipse
                key={`sag-uzun-${i}`}
                cx={Math.cos(angle) * 20}
                cy={Math.sin(angle) * 20}
                rx="5" ry="2.5"
                fill={ac}
                fillOpacity="0.5"
                transform={`rotate(${i*22.5}, ${Math.cos(angle)*20}, ${Math.sin(angle)*20})`}
              />
            )
          })}
          {Array.from({length: 16}).map((_, i) => {
            const angle = (i * 22.5 + 11.25) * Math.PI/180
            return (
              <ellipse
                key={`sag-kisa-${i}`}
                cx={Math.cos(angle) * 14}
                cy={Math.sin(angle) * 14}
                rx="3.5" ry="1.8"
                fill={ac}
                fillOpacity="0.7"
                transform={`rotate(${i*22.5+11.25}, ${Math.cos(angle)*14}, ${Math.sin(angle)*14})`}
              />
            )
          })}
          {Array.from({length: 8}).map((_, i) => {
            const angle = i * 45 * Math.PI/180
            return (
              <path
                key={`sag-yildiz-${i}`}
                d={`M${Math.cos(angle)*9},${Math.sin(angle)*9} 
                   L${Math.cos(angle+0.4)*5},${Math.sin(angle+0.4)*5}
                   L${Math.cos(angle+0.8)*9},${Math.sin(angle+0.8)*9}`}
                fill={ac}
                fillOpacity="0.8"
              />
            )
          })}
          <circle cx="0" cy="0" r="5" fill={ac} fillOpacity="0.85"/>
          <circle cx="0" cy="0" r="2.5" fill={ac} fillOpacity="0.5"/>
          <circle cx="0" cy="0" r="1" fill="white" fillOpacity="0.3"/>
        </g>

        {/* ========== FAZ 3 — HATAİ ÇİÇEKLERİ (Sol) ========== */}
        <g transform="translate(78, 48)">
          <ellipse cx="0" cy="0" rx="3" ry="1.5" fill={ac} fillOpacity="0.6" transform="rotate(0)"/>
          <ellipse cx="0" cy="0" rx="3" ry="1.5" fill={ac} fillOpacity="0.6" transform="rotate(60)"/>
          <ellipse cx="0" cy="0" rx="3" ry="1.5" fill={ac} fillOpacity="0.6" transform="rotate(120)"/>
          <circle cx="0" cy="0" r="1.5" fill={ac} fillOpacity="0.8"/>
          {/* Tomurcuk */}
          <ellipse cx="6" cy="-4" rx="2" ry="1.2" fill={ac} fillOpacity="0.5" transform="rotate(30, 6, -4)"/>
          {/* Yaprak */}
          <path d="M-4,5 Q-8,8 -6,12 Q-3,9 -4,5" fill={ac} fillOpacity="0.4"/>
        </g>

        <g transform="translate(78, 62)">
          <ellipse cx="0" cy="0" rx="2.5" ry="1.2" fill={ac} fillOpacity="0.5" transform="rotate(0)"/>
          <ellipse cx="0" cy="0" rx="2.5" ry="1.2" fill={ac} fillOpacity="0.5" transform="rotate(90)"/>
          <circle cx="0" cy="0" r="1" fill={ac} fillOpacity="0.7"/>
        </g>

        {/* ========== FAZ 3 — HATAİ ÇİÇEKLERİ (Sağ) ========== */}
        <g transform={`translate(${w-78}, 48)`}>
          <ellipse cx="0" cy="0" rx="3" ry="1.5" fill={ac} fillOpacity="0.6" transform="rotate(0)"/>
          <ellipse cx="0" cy="0" rx="3" ry="1.5" fill={ac} fillOpacity="0.6" transform="rotate(60)"/>
          <ellipse cx="0" cy="0" rx="3" ry="1.5" fill={ac} fillOpacity="0.6" transform="rotate(120)"/>
          <circle cx="0" cy="0" r="1.5" fill={ac} fillOpacity="0.8"/>
          <ellipse cx="-6" cy="-4" rx="2" ry="1.2" fill={ac} fillOpacity="0.5" transform="rotate(-30, -6, -4)"/>
          <path d="M4,5 Q8,8 6,12 Q3,9 4,5" fill={ac} fillOpacity="0.4"/>
        </g>

        <g transform={`translate(${w-78}, 62)`}>
          <ellipse cx="0" cy="0" rx="2.5" ry="1.2" fill={ac} fillOpacity="0.5" transform="rotate(0)"/>
          <ellipse cx="0" cy="0" rx="2.5" ry="1.2" fill={ac} fillOpacity="0.5" transform="rotate(90)"/>
          <circle cx="0" cy="0" r="1" fill={ac} fillOpacity="0.7"/>
        </g>

        {/* ========== FAZ 4 — KAR TANESİ BÖLGESİ (Crosshair yerine) ========== */}
        
        {/* Sol kar tanesi bölgesi */}
        <g transform="translate(110, 55)">
          {/* 8 kollu kar tanesi */}
          {Array.from({length: 8}).map((_, i) => {
            const angle = i * 45 * Math.PI/180
            return (
              <g key={`kar-8-${i}`}>
                <line x1="0" y1="0" x2={Math.cos(angle)*12} y2={Math.sin(angle)*12} 
                  stroke={ac} strokeWidth="0.6" strokeOpacity="0.5"/>
                {[-20,20].map(offset => (
                  <line
                    key={`kar-dal-${offset}`}
                    x1={Math.cos(angle)*7}
                    y1={Math.sin(angle)*7}
                    x2={Math.cos((angle+offset)*Math.PI/180)*9}
                    y2={Math.sin((angle+offset)*Math.PI/180)*9}
                    stroke={ac}
                    strokeWidth="0.4"
                    strokeOpacity="0.3"
                  />
                ))}
              </g>
            )
          })}
          
          {/* 12 kollu yıldız */}
          {Array.from({length: 12}).map((_, i) => {
            const angle = i * 30 * Math.PI/180
            return (
              <circle
                key={`kar-12-${i}`}
                cx={Math.cos(angle)*6}
                cy={Math.sin(angle)*6}
                r="0.8"
                fill={ac}
                fillOpacity="0.4"
              />
            )
          })}
          
          <circle cx="0" cy="0" r="2.5" fill={ac} fillOpacity="0.6"/>
          <circle cx="0" cy="0" r="1" fill="white" fillOpacity="0.25"/>
        </g>

        {/* Sağ kar tanesi bölgesi */}
        <g transform={`translate(${w-110}, 55)`}>
          {Array.from({length: 8}).map((_, i) => {
            const angle = i * 45 * Math.PI/180
            return (
              <g key={`rkar-8-${i}`}>
                <line x1="0" y1="0" x2={Math.cos(angle)*12} y2={Math.sin(angle)*12} 
                  stroke={ac} strokeWidth="0.6" strokeOpacity="0.5"/>
                {[-20,20].map(offset => (
                  <line
                    key={`rkar-dal-${offset}`}
                    x1={Math.cos(angle)*7}
                    y1={Math.sin(angle)*7}
                    x2={Math.cos((angle+offset)*Math.PI/180)*9}
                    y2={Math.sin((angle+offset)*Math.PI/180)*9}
                    stroke={ac}
                    strokeWidth="0.4"
                    strokeOpacity="0.3"
                  />
                ))}
              </g>
            )
          })}
          {Array.from({length: 12}).map((_, i) => {
            const angle = i * 30 * Math.PI/180
            return (
              <circle
                key={`rkar-12-${i}`}
                cx={Math.cos(angle)*6}
                cy={Math.sin(angle)*6}
                r="0.8"
                fill={ac}
                fillOpacity="0.4"
              />
            )
          })}
          <circle cx="0" cy="0" r="2.5" fill={ac} fillOpacity="0.6"/>
          <circle cx="0" cy="0" r="1" fill="white" fillOpacity="0.25"/>
        </g>

        {/* ========== FAZ 5 — ARABESK AĞ ========== */}
        
        {/* Üst rumi kıvrımlar */}
        {[145, 195, 245, 295, 345, 395, 435].map((x, i) => (
          <g key={`ust-kivrim-${i}`}>
            <path
              d={`M${x},20 Q${x+10},12 ${x+20},20`}
              fill="none"
              stroke={ac}
              strokeWidth="0.5"
              strokeOpacity="0.35"
            />
            <circle cx={x+10} cy={14} r="1" fill={ac} fillOpacity="0.4"/>
          </g>
        ))}

        {/* Alt rumi kıvrımlar */}
        {[145, 195, 245, 295, 345, 395, 435].map((x, i) => (
          <g key={`alt-kivrim-${i}`}>
            <path
              d={`M${x},${h-20} Q${x+10},${h-12} ${x+20},${h-20}`}
              fill="none"
              stroke={ac}
              strokeWidth="0.5"
              strokeOpacity="0.35"
            />
            <circle cx={x+10} cy={h-16} r="1" fill={ac} fillOpacity="0.4"/>
          </g>
        ))}

        {/* Nokta zincirleri - üst */}
        {Array.from({length: 18}).map((_, i) => {
          const x = 130 + i * 18
          if (x > w-130) return null
          return (
            <circle
              key={`ust-nokta-${i}`}
              cx={x}
              cy="26"
              r="0.8"
              fill={ac}
              fillOpacity={i % 2 === 0 ? 0.4 : 0.2}
            />
          )
        })}

        {/* Nokta zincirleri - alt */}
        {Array.from({length: 18}).map((_, i) => {
          const x = 130 + i * 18
          if (x > w-130) return null
          return (
            <circle
              key={`alt-nokta-${i}`}
              cx={x}
              cy={h-26}
              r="0.8"
              fill={ac}
              fillOpacity={i % 2 === 0 ? 0.4 : 0.2}
            />
          )
        })}

        {/* Yarım palmet motifleri - üst */}
        {[160, 220, 280, 340, 400].map((x, i) => (
          <g key={`ust-palmet-${i}`}>
            <path
              d={`M${x},24 Q${x+5},18 ${x+10},24 Q${x+5},22 ${x},24`}
              fill={ac}
              fillOpacity="0.25"
            />
            <path
              d={`M${x+10},24 Q${x+15},18 ${x+20},24 Q${x+15},22 ${x+10},24`}
              fill={ac}
              fillOpacity="0.25"
            />
          </g>
        ))}

        {/* Yarım palmet motifleri - alt */}
        {[160, 220, 280, 340, 400].map((x, i) => (
          <g key={`alt-palmet-${i}`}>
            <path
              d={`M${x},${h-24} Q${x+5},${h-18} ${x+10},${h-24} Q${x+5},${h-22} ${x},${h-24}`}
              fill={ac}
              fillOpacity="0.25"
            />
            <path
              d={`M${x+10},${h-24} Q${x+15},${h-18} ${x+20},${h-24} Q${x+15},${h-22} ${x+10},${h-24}`}
              fill={ac}
              fillOpacity="0.25"
            />
          </g>
        ))}

        {/* ========== FAZ 6 — METİN ALANI ========== */}

        {/* Sure sıra numarası - sol */}
        <text
          x={w/2 - 140}
          y={h/2 + 5}
          textAnchor="middle"
          fontFamily="PlayfairDisplay, Georgia, serif"
          fontSize="13"
          fill={ac}
          fillOpacity="0.7"
        >
          {sure.id}
        </text>

        {/* Arapça sure ismi - ortada */}
        <text
          x={w/2}
          y={h/2 + 12}
          textAnchor="middle"
          fontFamily="Scheherazade New, 'Traditional Arabic', serif"
          fontSize="30"
          fill={ac}
          direction="rtl"
        >
          {sure.isimArapca}
        </text>

        {/* Ayet sayısı - sağ */}
        <text
          x={w/2 + 140}
          y={h/2 + 5}
          textAnchor="middle"
          fontFamily="PlayfairDisplay, Georgia, serif"
          fontSize="11"
          fill={ac}
          fillOpacity="0.7"
        >
          {sure.ayetSayisi} âyet
        </text>

      </svg>
    </div>
  )
}