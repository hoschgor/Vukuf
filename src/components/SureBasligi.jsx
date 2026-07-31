import { Play, Pause } from "lucide-react"
import MushafPlayButton from "./MushafPlayButton"

export default function SureBasligi({ sure, theme, onTikla, player, vurgulu = false, nonce }) {
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
      data-sure-baslik={sure.id}
      style={{ 
        cursor: "pointer", userSelect: "none", margin: "32px 0 8px", 
        direction: "ltr", position: "relative"  // ← ekle
      }}
      title={`${sure.isim} · ${sure.anlam} · ${sure.yer}`}
    >
      <svg
        width="100%"
        viewBox="0 0 580 110"
        preserveAspectRatio="xMidYMid meet"
      >
        
        {/* ========================================================= */}
        {/* MUSHAF TEZHİBİ V2 - BLOK 1 */}
        {/* Ana çerçeve ve altyapı */}
        {/* ========================================================= */}

        <defs>

          <linearGradient id="tezhipGlow" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={ac} stopOpacity="0.10" />
            <stop offset="50%" stopColor={ac} stopOpacity="0.22" />
            <stop offset="100%" stopColor={ac} stopOpacity="0.10" />
          </linearGradient>

          <linearGradient id="tezhipSoft" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={ac} stopOpacity="0.16" />
            <stop offset="100%" stopColor={ac} stopOpacity="0.02" />
          </linearGradient>

        </defs>

        {/* Dış ana çerçeve */}

        <rect
          x="2"
          y="2"
          width={w-4}
          height={h-4}
          rx="5"
          fill="none"
          stroke={ac}
          strokeWidth="1"
        />

        {/* İkinci çerçeve */}

        <rect
          x="7"
          y="7"
          width={w-14}
          height={h-14}
          rx="4"
          fill="none"
          stroke={ac}
          strokeWidth="0.5"
          strokeOpacity="0.55"
        />

        {/* Üçüncü iç çerçeve */}

        <rect
          x="13"
          y="13"
          width={w-26}
          height={h-26}
          rx="3"
          fill="none"
          stroke={ac}
          strokeWidth="0.35"
          strokeOpacity="0.35"
        />

        {/* ========================================================= */}
        {/* KÖŞE TEZHİPLERİ */}
        {/* ========================================================= */}

        {[
          [18,18],
          [w-18,18],
          [18,h-18],
          [w-18,h-18]
        ].map(([cx,cy],i)=>(
          <g key={`corner-rosette-${i}`}>

            <circle
              cx={cx}
              cy={cy}
              r="7"
              fill="none"
              stroke={ac}
              strokeWidth="0.4"
              strokeOpacity="0.6"
            />

            <circle
              cx={cx}
              cy={cy}
              r="4"
              fill="none"
              stroke={ac}
              strokeWidth="0.35"
              strokeOpacity="0.45"
            />

            <circle
              cx={cx}
              cy={cy}
              r="1.3"
              fill={ac}
              fillOpacity="0.85"
            />

            {[45,135,225,315].map((deg,j)=>(
              <circle
                key={j}
                cx={cx + Math.cos(deg*Math.PI/180)*10}
                cy={cy + Math.sin(deg*Math.PI/180)*10}
                r="1.1"
                fill={ac}
                fillOpacity="0.45"
              />
            ))}

          </g>
        ))}

        {/* ========================================================= */}
        {/* MERKEZ OVAL */}
        {/* ========================================================= */}

        <ellipse
          cx={w/2}
          cy={h/2}
          rx="155"
          ry="34"
          fill="url(#tezhipSoft)"
          stroke={ac}
          strokeWidth="0.6"
          strokeOpacity="0.35"
        />

        <ellipse
          cx={w/2}
          cy={h/2}
          rx="147"
          ry="29"
          fill="none"
          stroke={ac}
          strokeWidth="0.35"
          strokeOpacity="0.28"
        />

        {/* ========================================================= */}
        {/* ÜST TEZHİP ZİNCİRİ */}
        {/* ========================================================= */}

        {Array.from({length:24}).map((_,i)=>{

          const x = 120 + i*14

          return (
            <g key={`top-chain-${i}`}>

              <circle
                cx={x}
                cy="18"
                r="0.8"
                fill={ac}
                fillOpacity="0.35"
              />

              <path
                d={`M ${x-5} 18 Q ${x} 13 ${x+5} 18`}
                fill="none"
                stroke={ac}
                strokeWidth="0.45"
                strokeOpacity="0.35"
              />

            </g>
          )

        })}

        {/* ========================================================= */}
        {/* ALT TEZHİP ZİNCİRİ */}
        {/* ========================================================= */}

        {Array.from({length:24}).map((_,i)=>{

          const x = 120 + i*14

          return (
            <g key={`bottom-chain-${i}`}>

              <circle
                cx={x}
                cy={h-18}
                r="0.8"
                fill={ac}
                fillOpacity="0.35"
              />

              <path
                d={`M ${x-5} ${h-18}
                    Q ${x} ${h-13}
                    ${x+5} ${h-18}`}
                fill="none"
                stroke={ac}
                strokeWidth="0.45"
                strokeOpacity="0.35"
              />

            </g>
          )

        })}

        {/* ========================================================= */}
        {/* BÜYÜK ROZET ALAN İŞARETLERİ */}
        {/* BLOK 2 BURAYA BAĞLANACAK */}
        {/* ========================================================= */}

        <circle
          cx="30"
          cy={h/2}
          r="28"
          fill="url(#tezhipGlow)"
          fillOpacity="0.25"
        />

        <circle
          cx={w-30}
          cy={h/2}
          r="28"
          fill="url(#tezhipGlow)"
          fillOpacity="0.25"
        />
        {/* ========================================================= */}
        {/* MUSHAF TEZHİBİ V2 - BLOK 2 */}
        {/* Büyük Osmanlı rozetleri ve hatayi katmanı */}
        {/* ========================================================= */}

        {/* SOL BÜYÜK ROZET */}

        <g
          transform={`translate(${w-30},55)`}
          className={vurgulu ? "rozet-vurgu-ters" : ""}
          style={{ transformOrigin: `${w-30}px 55px` }}
        >
          {/* 32 inci halkası */}
          {[...Array(32)].map((_,i)=>(
            <circle
              key={`l-pearl-${i}`}
              cx={Math.cos(i*11.25*Math.PI/180)*26}
              cy={Math.sin(i*11.25*Math.PI/180)*26}
              r="1"
              fill={ac}
              fillOpacity="0.35"
            />
          ))}

          {/* 16 uzun yaprak */}
          {[...Array(16)].map((_,i)=>{
            const ang=i*22.5
            const x=Math.cos(ang*Math.PI/180)*18
            const y=Math.sin(ang*Math.PI/180)*18
            return (
              <ellipse
                key={`l-long-${i}`}
                cx={x}
                cy={y}
                rx="6"
                ry="2.2"
                transform={`rotate(${ang} ${x} ${y})`}
                fill={ac}
                fillOpacity="0.75"
              />
            )
          })}

          {/* 16 kısa yaprak */}
          {[...Array(16)].map((_,i)=>{
            const ang=i*22.5+11.25
            const x=Math.cos(ang*Math.PI/180)*10
            const y=Math.sin(ang*Math.PI/180)*10
            return (
              <ellipse
                key={`l-short-${i}`}
                cx={x}
                cy={y}
                rx="3.5"
                ry="1.4"
                transform={`rotate(${ang} ${x} ${y})`}
                fill={ac}
                fillOpacity="0.9"
              />
            )
          })}

          {/* 8 kollu iç yıldız */}
          {[0,45,90,135,180,225,270,315].map((d,i)=>(
            <g key={`l-star-${i}`} transform={`rotate(${d})`}>
              <line
                x1="0" y1="0"
                x2="11" y2="0"
                stroke={ac}
                strokeWidth="0.55"
                strokeOpacity="0.7"
              />
              <line
                x1="6" y1="-2"
                x2="9" y2="0"
                stroke={ac}
                strokeWidth="0.45"
              />
              <line
                x1="6" y1="2"
                x2="9" y2="0"
                stroke={ac}
                strokeWidth="0.45"
              />
            </g>
          ))}

          {/* İç halka */}
          <circle
            r="8"
            fill="none"
            stroke={ac}
            strokeWidth="0.55"
            strokeOpacity="0.7"
          />

          {/* Merkez şemse */}
          <circle r="4" fill={ac} />
          <circle r="1.4" fill="white" fillOpacity="0.35" />

        </g>

        {/* SAĞ BÜYÜK ROZET */}
        <g
          transform="translate(30,55)"
          className={vurgulu ? "rozet-vurgu" : ""}
          style={{ transformOrigin: "30px 55px" }}
        >
          {[...Array(32)].map((_,i)=>(
            <circle
              key={`r-pearl-${i}`}
              cx={Math.cos(i*11.25*Math.PI/180)*26}
              cy={Math.sin(i*11.25*Math.PI/180)*26}
              r="1"
              fill={ac}
              fillOpacity="0.35"
            />
          ))}

          {[...Array(16)].map((_,i)=>{
            const ang=i*22.5
            const x=Math.cos(ang*Math.PI/180)*18
            const y=Math.sin(ang*Math.PI/180)*18
            return (
              <ellipse
                key={`r-long-${i}`}
                cx={x}
                cy={y}
                rx="6"
                ry="2.2"
                transform={`rotate(${ang} ${x} ${y})`}
                fill={ac}
                fillOpacity="0.75"
              />
            )
          })}

          {[...Array(16)].map((_,i)=>{
            const ang=i*22.5+11.25
            const x=Math.cos(ang*Math.PI/180)*10
            const y=Math.sin(ang*Math.PI/180)*10
            return (
              <ellipse
                key={`r-short-${i}`}
                cx={x}
                cy={y}
                rx="3.5"
                ry="1.4"
                transform={`rotate(${ang} ${x} ${y})`}
                fill={ac}
                fillOpacity="0.9"
              />
            )
          })}

          {[0,45,90,135,180,225,270,315].map((d,i)=>(
            <g key={`r-star-${i}`} transform={`rotate(${d})`}>
              <line
                x1="0" y1="0"
                x2="11" y2="0"
                stroke={ac}
                strokeWidth="0.55"
                strokeOpacity="0.7"
              />
              <line
                x1="6" y1="-2"
                x2="9" y2="0"
                stroke={ac}
                strokeWidth="0.45"
              />
              <line
                x1="6" y1="2"
                x2="9" y2="0"
                stroke={ac}
                strokeWidth="0.45"
              />
            </g>
          ))}

          <circle
            r="8"
            fill="none"
            stroke={ac}
            strokeWidth="0.55"
            strokeOpacity="0.7"
          />

          <circle r="4" fill={ac} />
          <circle r="1.4" fill="white" fillOpacity="0.35" />

        </g>

        {/* ========================================================= */}
        {/* ARA HATAYİ ÇİÇEKLERİ */}
        {/* ========================================================= */}

        {[
          [66,55],
          [92,55],
          [w-66,55],
          [w-92,55]
        ].map(([cx,cy],i)=>(
          <g key={`hatayi-${i}`} transform={`translate(${cx},${cy})`}>

            <circle r="1.4" fill={ac} fillOpacity="0.8" />

            {[0,60,120,180,240,300].map((d,j)=>(
              <circle
                key={j}
                cx={Math.cos(d*Math.PI/180)*5.5}
                cy={Math.sin(d*Math.PI/180)*5.5}
                r="1.2"
                fill={ac}
                fillOpacity="0.55"
              />
            ))}

            {[30,90,150,210,270,330].map((d,j)=>{
              const x=Math.cos(d*Math.PI/180)*3.5
              const y=Math.sin(d*Math.PI/180)*3.5
              return (
                <ellipse
                  key={`p-${j}`}
                  cx={x}
                  cy={y}
                  rx="2"
                  ry="1"
                  transform={`rotate(${d} ${x} ${y})`}
                  fill={ac}
                  fillOpacity="0.65"
                />
              )
            })}

          </g>
        ))}

        {/* ========================================================= */}
        {/* İNCE YAN NOKTA ZİNCİRLERİ */}
        {/* ========================================================= */}

        {[22,30,38,72,80,88].map((y,i)=>(
          <g key={`left-chain-${i}`}>
            <circle cx="106" cy={y} r="1.2" fill={ac} fillOpacity="0.45" />
            <circle cx="112" cy={y} r="0.8" fill={ac} fillOpacity="0.35" />
          </g>
        ))}

        {[22,30,38,72,80,88].map((y,i)=>(
          <g key={`right-chain-${i}`}>
            <circle cx={w-106} cy={y} r="1.2" fill={ac} fillOpacity="0.45" />
            <circle cx={w-112} cy={y} r="0.8" fill={ac} fillOpacity="0.35" />
          </g>
        ))}

        {/* ========================================================= */}
        {/* MUSHAF TEZHİBİ V2 - BLOK 3 */}
        {/* ========================================================= */}
        {/* KAR TANESİ MOTİFLERİ - KONTROL EDİLEBİLİR EKSENLER */}
        {/* ========================================================= */}

        {/* 
          KONTROL PARAMETRELERİ:
          - offsetX: Yatay kaydırma (merkeze göre)
          - offsetY: Dikey kaydırma (merkeze göre)
          - spacing: Motifler arası mesafe
        */}
        
        {(() => {
          // ----- AYARLAR -----
          const offsetX = 0;      // Yatay kaydırma (+ sağa, - sola)
          const offsetY = -30;    // Dikey kaydırma (+ aşağı, - yukarı) 
          const spacing = 30;     // Motifler arası mesafe
          // -------------------
          
          const positions = [
            w/2 - 110 + offsetX,   // sol
            w/2 - 80 + offsetX,
            w/2 - 50 + offsetX,
            w/2 + 50 + offsetX,
            w/2 + 80 + offsetX,
            w/2 + 110 + offsetX
          ];
          
          return positions.map((cx, i) => (
            <g key={`snow-${i}`} transform={`translate(${cx}, ${55 + offsetY})`}>
              {[0, 45, 90, 135, 180, 225, 270, 315].map((d, j) => (
                <g key={j} transform={`rotate(${d})`}>
                  <line
                    x1="0"
                    y1="0"
                    x2="10"
                    y2="0"
                    stroke={ac}
                    strokeWidth="0.55"
                    strokeOpacity="0.75"
                  />
                  <line
                    x1="5"
                    y1="-2"
                    x2="8"
                    y2="0"
                    stroke={ac}
                    strokeWidth="0.4"
                  />
                  <line
                    x1="5"
                    y1="2"
                    x2="8"
                    y2="0"
                    stroke={ac}
                    strokeWidth="0.4"
                  />
                </g>
              ))}
              <circle r="1.5" fill={ac} fillOpacity="0.8" />
            </g>
          ));
        })()}

        {/* ========================================================= */}
        {/* ========================================================= */}
        {/* YILDIZ ÇİÇEKLERİ - OVAL DIŞI KONUMLAR */}
        {/* ========================================================= */}
        {/* SOL ÜST KÖŞE ÇİÇEKLERİ */}
        {[
          { x: 55, y: 30 },
          { x: 85, y: 22 },
          { x: 115, y: 18 }
        ].map((pos, idx) => (
          <g key={`flower-ul-${idx}`} transform={`translate(${pos.x}, ${pos.y})`}>
            <circle r="1.2" fill={ac} fillOpacity="0.8" />
            {[0, 60, 120, 180, 240, 300].map((d, j) => (
              <ellipse
                key={j}
                cx={Math.cos(d * Math.PI / 180) * 3.5}
                cy={Math.sin(d * Math.PI / 180) * 3.5}
                rx="1.8"
                ry="0.9"
                transform={`rotate(${d} ${Math.cos(d * Math.PI / 180) * 3.5} ${Math.sin(d * Math.PI / 180) * 3.5})`}
                fill={ac}
                fillOpacity="0.55"
              />
            ))}
          </g>
        ))}

        {/* SAĞ ÜST KÖŞE ÇİÇEKLERİ */}
        {[
          { x: w - 55, y: 30 },
          { x: w - 85, y: 22 },
          { x: w - 115, y: 18 }
        ].map((pos, idx) => (
          <g key={`flower-ur-${idx}`} transform={`translate(${pos.x}, ${pos.y})`}>
            <circle r="1.2" fill={ac} fillOpacity="0.8" />
            {[0, 60, 120, 180, 240, 300].map((d, j) => (
              <ellipse
                key={j}
                cx={Math.cos(d * Math.PI / 180) * 3.5}
                cy={Math.sin(d * Math.PI / 180) * 3.5}
                rx="1.8"
                ry="0.9"
                transform={`rotate(${d} ${Math.cos(d * Math.PI / 180) * 3.5} ${Math.sin(d * Math.PI / 180) * 3.5})`}
                fill={ac}
                fillOpacity="0.55"
              />
            ))}
          </g>
        ))}

        {/* SOL ALT KÖŞE ÇİÇEKLERİ */}
        {[
          { x: 55, y: h - 30 },
          { x: 85, y: h - 22 },
          { x: 115, y: h - 18 }
        ].map((pos, idx) => (
          <g key={`flower-bl-${idx}`} transform={`translate(${pos.x}, ${pos.y})`}>
            <circle r="1.2" fill={ac} fillOpacity="0.8" />
            {[0, 60, 120, 180, 240, 300].map((d, j) => (
              <ellipse
                key={j}
                cx={Math.cos(d * Math.PI / 180) * 3.5}
                cy={Math.sin(d * Math.PI / 180) * 3.5}
                rx="1.8"
                ry="0.9"
                transform={`rotate(${d} ${Math.cos(d * Math.PI / 180) * 3.5} ${Math.sin(d * Math.PI / 180) * 3.5})`}
                fill={ac}
                fillOpacity="0.55"
              />
            ))}
          </g>
        ))}

        {/* SAĞ ALT KÖŞE ÇİÇEKLERİ */}
        {[
          { x: w - 55, y: h - 30 },
          { x: w - 85, y: h - 22 },
          { x: w - 115, y: h - 18 }
        ].map((pos, idx) => (
          <g key={`flower-br-${idx}`} transform={`translate(${pos.x}, ${pos.y})`}>
            <circle r="1.2" fill={ac} fillOpacity="0.8" />
            {[0, 60, 120, 180, 240, 300].map((d, j) => (
              <ellipse
                key={j}
                cx={Math.cos(d * Math.PI / 180) * 3.5}
                cy={Math.sin(d * Math.PI / 180) * 3.5}
                rx="1.8"
                ry="0.9"
                transform={`rotate(${d} ${Math.cos(d * Math.PI / 180) * 3.5} ${Math.sin(d * Math.PI / 180) * 3.5})`}
                fill={ac}
                fillOpacity="0.55"
              />
            ))}
          </g>
        ))}

        {/* ========================================================= */}
        {/* ÜST ARABESK KATMAN 2 */}
        {/* ========================================================= */}

        {Array.from({length:18}).map((_,i)=>{

          const x = 150 + i*16

          return (
            <path
              key={`arabesk-top-${i}`}
              d={`
                M ${x-5} 28
                Q ${x} 22
                ${x+5} 28
              `}
              fill="none"
              stroke={ac}
              strokeWidth="0.35"
              strokeOpacity="0.28"
            />
          )

        })}

        {/* ========================================================= */}
        {/* ALT ARABESK KATMAN 2 */}
        {/* ========================================================= */}

        {Array.from({length:18}).map((_,i)=>{

          const x = 150 + i*16

          return (
            <path
              key={`arabesk-bottom-${i}`}
              d={`
                M ${x-5} ${h-28}
                Q ${x} ${h-22}
                ${x+5} ${h-28}
              `}
              fill="none"
              stroke={ac}
              strokeWidth="0.35"
              strokeOpacity="0.28"
            />
          )

        })}

        {/* ========================================================= */}
        {/* MERKEZ OVAL İÇ SÜSLEMESİ */}
        {/* ========================================================= */}

        {Array.from({length:24}).map((_,i)=>{

          const angle = i * 15
          const x =
            w/2 + Math.cos(angle*Math.PI/180) * 125

          const y =
            h/2 + Math.sin(angle*Math.PI/180) * 18

          return (
            <circle
              key={`oval-dot-${i}`}
              cx={x}
              cy={y}
              r="0.8"
              fill={ac}
              fillOpacity="0.25"
            />
          )

        })}

        {/* ========================================================= */}
        {/* MERKEZ İÇ HALKA */}
        {/* ========================================================= */}

        <ellipse
          cx={w/2}
          cy={h/2}
          rx="118"
          ry="22"
          fill="none"
          stroke={ac}
          strokeWidth="0.35"
          strokeOpacity="0.18"
        />
      
        <ellipse
          cx={w/2}
          cy={h/2}
          rx="108"
          ry="18"
          fill="none"
          stroke={ac}
          strokeWidth="0.25"
          strokeOpacity="0.12"
        />

        {/* ========================================================= */}
        {/* SURE İSMİ - MERKEZ OVAL İÇİ */}
        {/* ========================================================= */}

        {/* Arapça sure ismi */}
        <text
          x={w / 2}
          y={h / 2 + 27}
          textAnchor="middle"
          fontFamily="'surah-name-v2-icon', serif"
          fontSize="60"
          fontWeight="500"
          fill={ac}
          fillOpacity="0.85"
          direction="rtl"
        >
          {String.fromCodePoint(0xE000 + sure.id)}
        </text>

                {/* ========================================================= */}
                {/* GÜL (ROSE) SİMGELERİ - MERKEZ YAKINI */}
                {/* ========================================================= */}

                {/* SOL GÜL */}
                <g transform={`translate(${w/2 - 160}, ${h/2})`}>
                  {/* Dış taç yapraklar (5 büyük) */}
                  {[0, 72, 144, 216, 288].map((ang, i) => {
                    const rad = ang * Math.PI / 180;
                    const x = Math.cos(rad) * 10;
                    const y = Math.sin(rad) * 10;
                    return (
                      <ellipse
                        key={`rose-outer-${i}`}
                        cx={x}
                        cy={y}
                        rx="7"
                        ry="3.5"
                        transform={`rotate(${ang} ${x} ${y})`}
                        fill="none"
                        stroke={ac}
                        strokeWidth="0."
                        strokeOpacity="0.5"
                      />
                    );
                  })}
                  {/* İç taç yapraklar (5 küçük, döndürülmüş) */}
                  {[36, 108, 180, 252, 324].map((ang, i) => {
                    const rad = ang * Math.PI / 180;
                    const x = Math.cos(rad) * 5.5;
                    const y = Math.sin(rad) * 5.5;
                    return (
                      <ellipse
                        key={`rose-inner-${i}`}
                        cx={x}
                        cy={y}
                        rx="4"
                        ry="2"
                        transform={`rotate(${ang} ${x} ${y})`}
                        fill={ac}
                        fillOpacity="0.35"
                      />
                    );
                  })}
                  {/* Merkez nokta */}
                  <circle r="2.2" fill={ac} fillOpacity="0.7" />
                  <circle r="0.9" fill="white" fillOpacity="0.4" />
                </g>

                {/* SAĞ GÜL */}
                <g transform={`translate(${w/2 + 160}, ${h/2})`}>
                  {[0, 72, 144, 216, 288].map((ang, i) => {
                    const rad = ang * Math.PI / 180;
                    const x = Math.cos(rad) * 10;
                    const y = Math.sin(rad) * 10;
                    return (
                      <ellipse
                        key={`rose-outer-${i}`}
                        cx={x}
                        cy={y}
                        rx="7"
                        ry="3.5"
                        transform={`rotate(${ang} ${x} ${y})`}
                        fill="none"
                        stroke={ac}
                        strokeWidth="0.6"
                        strokeOpacity="0.5"
                      />
                    );
                  })}
                  {[36, 108, 180, 252, 324].map((ang, i) => {
                    const rad = ang * Math.PI / 180;
                    const x = Math.cos(rad) * 5.5;
                    const y = Math.sin(rad) * 5.5;
                    return (
                      <ellipse
                        key={`rose-inner-${i}`}
                        cx={x}
                        cy={y}
                        rx="4"
                        ry="2"
                        transform={`rotate(${ang} ${x} ${y})`}
                        fill={ac}
                        fillOpacity="0.35"
                      />
                    );
                  })}
                  <circle r="2.2" fill={ac} fillOpacity="0.7" />
                  <circle r="0.9" fill="white" fillOpacity="0.4" />
                </g>

                {/* ÜST GÜL */}
                <g transform={`translate(${w/2}, ${h/2 - 32})`}>
                  {[0, 72, 144, 216, 288].map((ang, i) => {
                    const rad = ang * Math.PI / 180;
                    const x = Math.cos(rad) * 8;
                    const y = Math.sin(rad) * 8;
                    return (
                      <ellipse
                        key={`rose-outer-${i}`}
                        cx={x}
                        cy={y}
                        rx="6"
                        ry="3"
                        transform={`rotate(${ang} ${x} ${y})`}
                        fill="none"
                        stroke={ac}
                        strokeWidth="0.5"
                        strokeOpacity="0.45"
                      />
                    );
                  })}
                  {[36, 108, 180, 252, 324].map((ang, i) => {
                    const rad = ang * Math.PI / 180;
                    const x = Math.cos(rad) * 4.5;
                    const y = Math.sin(rad) * 4.5;
                    return (
                      <ellipse
                        key={`rose-inner-${i}`}
                        cx={x}
                        cy={y}
                        rx="3.5"
                        ry="1.8"
                        transform={`rotate(${ang} ${x} ${y})`}
                        fill={ac}
                        fillOpacity="0.3"
                      />
                    );
                  })}
                  <circle r="1.8" fill={ac} fillOpacity="0.65" />
                  <circle r="0.7" fill="white" fillOpacity="0.35" />
                </g>

                {/* ALT GÜL */}
                <g transform={`translate(${w/2}, ${h/2 + 32})`}>
                  {[0, 72, 144, 216, 288].map((ang, i) => {
                    const rad = ang * Math.PI / 180;
                    const x = Math.cos(rad) * 8;
                    const y = Math.sin(rad) * 8;
                    return (
                      <ellipse
                        key={`rose-outer-${i}`}
                        cx={x}
                        cy={y}
                        rx="6"
                        ry="3"
                        transform={`rotate(${ang} ${x} ${y})`}
                        fill="none"
                        stroke={ac}
                        strokeWidth="0.5"
                        strokeOpacity="0.45"
                      />
                    );
                  })}
                  {[36, 108, 180, 252, 324].map((ang, i) => {
                    const rad = ang * Math.PI / 180;
                    const x = Math.cos(rad) * 4.5;
                    const y = Math.sin(rad) * 4.5;
                    return (
                      <ellipse
                        key={`rose-inner-${i}`}
                        cx={x}
                        cy={y}
                        rx="3.5"
                        ry="1.8"
                        transform={`rotate(${ang} ${x} ${y})`}
                        fill={ac}
                        fillOpacity="0.3"
                      />
                    );
                  })}
                  <circle r="1.8" fill={ac} fillOpacity="0.65" />
                  <circle r="0.7" fill="white" fillOpacity="0.35" />
                </g>
                        {/* ========================================================= */}
                        {/* ÇEPER GÜLLERİ - FARKLI MOTİF (KARANFİL TARZI) */}
                        {/* ========================================================= */}

                        {/* ÜST SIRA - 5 adet */}
                        {[
                          { x: w/2 - 200, y: 12 },
                          { x: w/2 - 100, y: 10 },
                          { x: w/2, y: 9 },
                          { x: w/2 + 100, y: 10 },
                          { x: w/2 + 200, y: 12 }
                        ].map((pos, idx) => (
                          <g key={`top-border-${idx}`} transform={`translate(${pos.x}, ${pos.y})`}>
                            {/* 6 yapraklı minyatür çiçek */}
                            {[0, 60, 120, 180, 240, 300].map((ang, i) => {
                              const rad = ang * Math.PI / 180;
                              const x = Math.cos(rad) * 5;
                              const y = Math.sin(rad) * 5;
                              return (
                                <path
                                  key={i}
                                  d={`M ${x} ${y} Q ${x*0.6} ${y*0.6} 0 0 Q ${x*0.6} ${y*0.6} ${x} ${y}`}
                                  fill={ac}
                                  fillOpacity="0.5"
                                  stroke={ac}
                                  strokeWidth="0.3"
                                  strokeOpacity="0.7"
                                />
                              );
                            })}
                            <circle r="1.8" fill={ac} fillOpacity="0.9" />
                            <circle r="0.7" fill="white" fillOpacity="0.5" />
                          </g>
                        ))}

                        {/* ALT SIRA - 5 adet */}
                        {[
                          { x: w/2 - 200, y: h - 12 },
                          { x: w/2 - 100, y: h - 10 },
                          { x: w/2, y: h - 9 },
                          { x: w/2 + 100, y: h - 10 },
                          { x: w/2 + 200, y: h - 12 }
                        ].map((pos, idx) => (
                          <g key={`bottom-border-${idx}`} transform={`translate(${pos.x}, ${pos.y})`}>
                            {[0, 60, 120, 180, 240, 300].map((ang, i) => {
                              const rad = ang * Math.PI / 180;
                              const x = Math.cos(rad) * 5;
                              const y = Math.sin(rad) * 5;
                              return (
                                <path
                                  key={i}
                                  d={`M ${x} ${y} Q ${x*0.6} ${y*0.6} 0 0 Q ${x*0.6} ${y*0.6} ${x} ${y}`}
                                  fill={ac}
                                  fillOpacity="0.5"
                                  stroke={ac}
                                  strokeWidth="0.3"
                                  strokeOpacity="0.7"
                                />
                              );
                            })}
                            <circle r="1.8" fill={ac} fillOpacity="0.9" />
                            <circle r="0.7" fill="white" fillOpacity="0.5" />
                          </g>
                        ))}

                        {/* SOL SIRA - 4 adet (üst/alt boşluk bırak) */}
                        {[
                          { x: 14, y: h/2 - 40 },
                          { x: 12, y: h/2 - 15 },
                          { x: 12, y: h/2 + 15 },
                          { x: 14, y: h/2 + 40 }
                        ].map((pos, idx) => (
                          <g key={`left-border-${idx}`} transform={`translate(${pos.x}, ${pos.y})`}>
                            {[0, 60, 120, 180, 240, 300].map((ang, i) => {
                              const rad = ang * Math.PI / 180;
                              const x = Math.cos(rad) * 4.5;
                              const y = Math.sin(rad) * 4.5;
                              return (
                                <path
                                  key={i}
                                  d={`M ${x} ${y} Q ${x*0.5} ${y*0.5} 0 0 Q ${x*0.5} ${y*0.5} ${x} ${y}`}
                                  fill={ac}
                                  fillOpacity="0.45"
                                  stroke={ac}
                                  strokeWidth="0.3"
                                  strokeOpacity="0.6"
                                />
                              );
                            })}
                            <circle r="1.5" fill={ac} fillOpacity="0.85" />
                            <circle r="0.6" fill="white" fillOpacity="0.45" />
                          </g>
                        ))}

                        {/* SAĞ SIRA - 4 adet */}
                        {[
                          { x: w - 14, y: h/2 - 40 },
                          { x: w - 12, y: h/2 - 15 },
                          { x: w - 12, y: h/2 + 15 },
                          { x: w - 14, y: h/2 + 40 }
                        ].map((pos, idx) => (
                          <g key={`right-border-${idx}`} transform={`translate(${pos.x}, ${pos.y})`}>
                            {[0, 60, 120, 180, 240, 300].map((ang, i) => {
                              const rad = ang * Math.PI / 180;
                              const x = Math.cos(rad) * 4.5;
                              const y = Math.sin(rad) * 4.5;
                              return (
                                <path
                                  key={i}
                                  d={`M ${x} ${y} Q ${x*0.5} ${y*0.5} 0 0 Q ${x*0.5} ${y*0.5} ${x} ${y}`}
                                  fill={ac}
                                  fillOpacity="0.45"
                                  stroke={ac}
                                  strokeWidth="0.3"
                                  strokeOpacity="0.6"
                                />
                              );
                            })}
                            <circle r="1.5" fill={ac} fillOpacity="0.85" />
                            <circle r="0.6" fill="white" fillOpacity="0.45" />
                          </g>
                        ))}

                        {/* KÖŞELER - 4 adet (daha süslü) */}
                        {[
                          { x: 22, y: 22 },
                          { x: w - 22, y: 22 },
                          { x: 22, y: h - 22 },
                          { x: w - 22, y: h - 22 }
                        ].map((pos, idx) => (
                          <g key={`corner-${idx}`} transform={`translate(${pos.x}, ${pos.y})`}>
                            {/* 4 yapraklı + ortada tomurcuk */}
                            {[0, 90, 180, 270].map((ang, i) => {
                              const rad = ang * Math.PI / 180;
                              const x = Math.cos(rad) * 6;
                              const y = Math.sin(rad) * 6;
                              return (
                                <ellipse
                                  key={i}
                                  cx={x}
                                  cy={y}
                                  rx="4"
                                  ry="2"
                                  transform={`rotate(${ang} ${x} ${y})`}
                                  fill={ac}
                                  fillOpacity="0.6"
                                  stroke={ac}
                                  strokeWidth="0.4"
                                />
                              );
                            })}
                            {/* Küçük yardımcı yapraklar */}
                            {[45, 135, 225, 315].map((ang, i) => {
                              const rad = ang * Math.PI / 180;
                              const x = Math.cos(rad) * 3.5;
                              const y = Math.sin(rad) * 3.5;
                              return (
                                <circle
                                  key={i}
                                  cx={x}
                                  cy={y}
                                  r="1.2"
                                  fill={ac}
                                  fillOpacity="0.4"
                                />
                              );
                            })}
                            <circle r="2" fill={ac} fillOpacity="0.95" />
                            <circle r="0.9" fill="white" fillOpacity="0.55" />
                          </g>
                        ))}
      </svg>
      {/* Oynat butonu */}
      {player && (() => {
        const caliniyor = player?.durum === "caliyor" && player?.aktifAyet?.sureNo === sure.id && !player?.aktifAyet?.besmeleIcin
        const duraklatildi = player?.durum === "duraklatildi" && player?.aktifAyet?.sureNo === sure.id && !player?.aktifAyet?.besmeleIcin
        return (
          <button
            onClick={(e) => {
              e.stopPropagation()
              if (caliniyor) player.duraklat()
              else if (duraklatildi) player.devamEt()
              else player.sureCal(sure.id, sure.ayetSayisi, 1)
            }}
            style={{
              position: "absolute",
              right: "25%",
              top: "50%",
              transform: "translateY(-50%)",
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: 0,
              lineHeight: 0,
              opacity: 0.85,
              transition: "opacity 0.2s",
              color: theme.accent,
            }}
            onMouseEnter={e => e.currentTarget.style.opacity = "1"}
            onMouseLeave={e => e.currentTarget.style.opacity = "0.85"}
          >
            <MushafPlayButton
              ac={theme.accent}
              playing={caliniyor}
              size={48}
            />
          </button>
        )
      })()}
    </div>
  )
}