import React from "react"

const ARAPCA = "٠١٢٣٤٥٦٧٨٩"

const arapcaRakam = (n) =>
  String(n)
    .split("")
    .map((d) => ARAPCA[+d] ?? d)
    .join("")

export default function MushafAyetRozeti({
  sayi,
  size = 60,
  ac = "currentColor",
}) {
  const yazi = arapcaRakam(sayi)

  const fontSize =
    yazi.length === 1 ? 50 :
    yazi.length === 2 ? 52 : 52

  return (
    <svg
      width={size}
      height={size}
      viewBox="-65 -30 130 60"
      style={{
        color: ac,
        overflow: "visible",
        display: "block"
      }}
    >
      {/* Sol taraf */}
      <g transform="translate(-50 0)">
        {/* Ana parantez */}
        <path
          d="
            M0 -18
            C-12 -18
             -18 -10
             -18 0
            C-18 10
             -12 18
             0 18
            C-6 13
             -6 -13
             0 -18
            Z
          "
          fill="currentColor"
          opacity=".9"
        />

        {/* İç parantez */}
        <path
          d="
            M-2.5 -13
            C-7 -13 -12 -6 -12 0
            C-12 6 -7 13 -2.5 13
          "
          fill="none"
          stroke="currentColor"
          strokeWidth=".7"
          opacity=".55"
        />

        {/* Üst rumî - içe dönük */}
        <path
          d="
            M-4 -18
                C0 -22 4 -27 2 -33
                C-4 -31 -8 -24 -2 -17
                C2 -14 0 -14 -4 -18
          "
          fill="currentColor"
        />

        {/* Alt rumî - içe dönük */}
        <path
          d="
            M-4 18
            C0 22 4 27 2 33
            C-4 31 -8 24 -2 17
            C2 14 0 14 -4 18
            Z
          "
          fill="currentColor"
        />

        {/* Orta süs - üst */}
        <circle cx="-12" cy="-8" r="1.2" fill="currentColor" opacity=".6"/>
        <circle cx="-12" cy="-8" r="0.5" fill="currentColor" opacity=".3"/>

        {/* Orta süs - alt */}
        <circle cx="-12" cy="8" r="1.2" fill="currentColor" opacity=".6"/>
        <circle cx="-12" cy="8" r="0.5" fill="currentColor" opacity=".3"/>

        <circle cx="-18" cy="-25" r="1.1" fill="currentColor" opacity=".45"/>
        <circle cx="-18" cy="25" r="1.1" fill="currentColor" opacity=".45"/>
      </g>

      {/* Sağ taraf */}
      <g transform="translate(50 0) scale(-1 1)">
        {/* Ana parantez */}
        <path
          d="
            M0 -18
            C-12 -18
             -18 -10
             -18 0
            C-18 10
             -12 18
             0 18
            C-6 13
             -6 -13
             0 -18
            Z
          "
          fill="currentColor"
          opacity=".9"
        />

        {/* İç parantez */}
        <path
          d="
            M-2.5 -13
            C-7 -13 -12 -6 -12 0
            C-12 6 -7 13 -2.5 13
          "
          fill="none"
          stroke="currentColor"
          strokeWidth=".7"
          opacity=".55"
        />

        {/* Üst rumî - içe dönük */}
        <path
          d="
            M-4 -18
            C0 -22 4 -27 2 -33
            C-4 -31 -8 -24 -2 -17
            C2 -14 0 -14 -4 -18
            Z
          "
          fill="currentColor"
        />

        {/* Alt rumî - içe dönük */}
        <path
          d="
            M-4 18
            C0 22 4 27 2 33
            C-4 31 -8 24 -2 17
            C2 14 0 14 -4 18
            Z
          "
          fill="currentColor"
        />

        {/* Orta süs - üst */}
        <circle cx="-12" cy="-8" r="1.2" fill="currentColor" opacity=".6"/>
        <circle cx="-12" cy="-8" r="0.5" fill="currentColor" opacity=".3"/>

        {/* Orta süs - alt */}
        <circle cx="-12" cy="8" r="1.2" fill="currentColor" opacity=".6"/>
        <circle cx="-12" cy="8" r="0.5" fill="currentColor" opacity=".3"/>

        <circle cx="-18" cy="-25" r="1.1" fill="currentColor" opacity=".45"/>
        <circle cx="-18" cy="25" r="1.1" fill="currentColor" opacity=".45"/>
      </g>

      {/* Rakam */}
      <text
        x="0"
        y="3"
        textAnchor="middle"
        dominantBaseline="middle"
        fontFamily="'Scheherazade New', serif"
        fontWeight="900"
        fontSize={fontSize}
        fill="currentColor"
        letterSpacing="-2.5"
      >
        {yazi}
      </text>

    </svg>
  )
}