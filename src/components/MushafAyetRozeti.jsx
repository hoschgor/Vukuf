

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
    yazi.length === 1 ? 50 : yazi.length === 2 ? 52 : 52

  return (
    <svg
      width={size}
      height={size}
      viewBox="-65 -30 130 60"
      style={{
        color: ac,
        overflow: "visible",
        display: "block",
      }}
    >
      {/* Sol taraf */}
      <g transform="translate(-50 0)">
        {/* Ana gövde - dış kavis (ince) */}
        <path
          d="
            M0 -19
            C-11 -18.5
             -17 -10
             -17 0
            C-17 10
             -11 18.5
             0 19
            C-6 13
             -6.5 -13
             0 -19
            Z
          "
          fill="currentColor"
          opacity=".92"
        />

        {/* İç ince kavis çizgisi */}
        <path
          d="
            M-2 -14
            C-7 -13.5 -12 -6.5 -12 0
            C-12 6.5 -7 13.5 -2 14
          "
          fill="none"
          stroke="currentColor"
          strokeWidth=".6"
          opacity=".45"
        />

        {/* Merkez sarmaşık gövdesi */}
        <path
          d="
            M-8 -24
            C-9.5 -17 -8 -8.5 -7 0
            C-8 8.5 -9.5 17 -8 24
          "
          fill="none"
          stroke="currentColor"
          strokeWidth=".8"
          opacity=".5"
        />

        {/* Üst rumî tepe süsü - içe bakan */}
        <path
          d="
            M-2 -19
            C1 -22 3 -26 2 -31
            C-2 -30 -6 -24 -1 -18.5
            Z
          "
          fill="currentColor"
        />

        {/* Alt rumî tepe süsü - içe bakan */}
        <path
          d="
            M-2 19
            C1 22 3 26 2 31
            C-2 30 -6 24 -1 18.5
            Z
          "
          fill="currentColor"
        />

        {/* Üst yaprak kümesi */}
        <path
          d="
            M-8 -17
            C-12 -18 -15.5 -16.5 -17 -13.5
            C-14.5 -13 -12 -14 -10.5 -16
            C-11 -13.5 -12.5 -11.5 -15.5 -11
            C-12.5 -10 -9 -12 -7.5 -15
            Z
          "
          fill="currentColor"
          opacity=".85"
        />

        {/* Alt yaprak kümesi */}
        <path
          d="
            M-8 17
            C-12 18 -15.5 16.5 -17 13.5
            C-14.5 13 -12 14 -10.5 16
            C-11 13.5 -12.5 11.5 -15.5 11
            C-12.5 10 -9 12 -7.5 15
            Z
          "
          fill="currentColor"
          opacity=".85"
        />

        {/* Orta baklava/elmas süs */}
        <path
          d="M-16.5 -1.8 L-15 0 L-16.5 1.8 L-18 0 Z"
          fill="currentColor"
          opacity=".55"
        />

        {/* Küçük yaprak - orta üst */}
        <path
          d="
            M-5.5 -7.5
            C-7.5 -8.5 -10 -8 -11 -6
            C-9 -5.5 -7 -6 -5.5 -7.5
            Z
          "
          fill="currentColor"
          opacity=".7"
        />

        {/* Küçük yaprak - orta alt */}
        <path
          d="
            M-5.5 7.5
            C-7.5 8.5 -10 8 -11 6
            C-9 5.5 -7 6 -5.5 7.5
            Z
          "
          fill="currentColor"
          opacity=".7"
        />

        {/* Nokta kümeleri */}
        <circle cx="-12" cy="-22" r="0.9" fill="currentColor" opacity=".5" />
        <circle cx="-14.5" cy="-20.5" r="0.5" fill="currentColor" opacity=".35" />
        <circle cx="-12" cy="22" r="0.9" fill="currentColor" opacity=".5" />
        <circle cx="-14.5" cy="20.5" r="0.5" fill="currentColor" opacity=".35" />

        <circle cx="-9" cy="-3.5" r="0.7" fill="currentColor" opacity=".55" />
        <circle cx="-9" cy="3.5" r="0.7" fill="currentColor" opacity=".55" />

        {/* Üstte dışa bakan rumi süs */}
        <path
          d="
            M-4 -19
            C-6 -24 -9 -27 -14 -27
            C-11 -24 -8 -21 -4 -19
            Z
          "
          fill="currentColor"
          opacity=".7"
        />
        <path
          d="
            M-1 -19
            C1 -24 3 -27 8 -27
            C5 -24 2 -21 -1 -19
            Z
          "
          fill="currentColor"
          opacity=".5"
        />

        {/* Altta dışa bakan rumi süs */}
        <path
          d="
            M-4 19
            C-6 24 -9 27 -14 27
            C-11 24 -8 21 -4 19
            Z
          "
          fill="currentColor"
          opacity=".7"
        />
        <path
          d="
            M-1 19
            C1 24 3 27 8 27
            C5 24 2 21 -1 19
            Z
          "
          fill="currentColor"
          opacity=".5"
        />
      </g>

      {/* Sağ taraf (ayna) */}
      <g transform="translate(50 0) scale(-1 1)">
        {/* Ana gövde - dış kavis (ince) */}
        <path
          d="
            M0 -19
            C-11 -18.5
             -17 -10
             -17 0
            C-17 10
             -11 18.5
             0 19
            C-6 13
             -6.5 -13
             0 -19
            Z
          "
          fill="currentColor"
          opacity=".92"
        />

        {/* İç ince kavis çizgisi */}
        <path
          d="
            M-2 -14
            C-7 -13.5 -12 -6.5 -12 0
            C-12 6.5 -7 13.5 -2 14
          "
          fill="none"
          stroke="currentColor"
          strokeWidth=".6"
          opacity=".45"
        />

        {/* Merkez sarmaşık gövdesi */}
        <path
          d="
            M-8 -24
            C-9.5 -17 -8 -8.5 -7 0
            C-8 8.5 -9.5 17 -8 24
          "
          fill="none"
          stroke="currentColor"
          strokeWidth=".8"
          opacity=".5"
        />

        {/* Üst rumî tepe süsü - içe bakan */}
        <path
          d="
            M-2 -19
            C1 -22 3 -26 2 -31
            C-2 -30 -6 -24 -1 -18.5
            Z
          "
          fill="currentColor"
        />

        {/* Alt rumî tepe süsü - içe bakan */}
        <path
          d="
            M-2 19
            C1 22 3 26 2 31
            C-2 30 -6 24 -1 18.5
            Z
          "
          fill="currentColor"
        />

        {/* Üst yaprak kümesi */}
        <path
          d="
            M-8 -17
            C-12 -18 -15.5 -16.5 -17 -13.5
            C-14.5 -13 -12 -14 -10.5 -16
            C-11 -13.5 -12.5 -11.5 -15.5 -11
            C-12.5 -10 -9 -12 -7.5 -15
            Z
          "
          fill="currentColor"
          opacity=".85"
        />

        {/* Alt yaprak kümesi */}
        <path
          d="
            M-8 17
            C-12 18 -15.5 16.5 -17 13.5
            C-14.5 13 -12 14 -10.5 16
            C-11 13.5 -12.5 11.5 -15.5 11
            C-12.5 10 -9 12 -7.5 15
            Z
          "
          fill="currentColor"
          opacity=".85"
        />

        {/* Orta baklava/elmas süs */}
        <path
          d="M-16.5 -1.8 L-15 0 L-16.5 1.8 L-18 0 Z"
          fill="currentColor"
          opacity=".55"
        />

        {/* Küçük yaprak - orta üst */}
        <path
          d="
            M-5.5 -7.5
            C-7.5 -8.5 -10 -8 -11 -6
            C-9 -5.5 -7 -6 -5.5 -7.5
            Z
          "
          fill="currentColor"
          opacity=".7"
        />

        {/* Küçük yaprak - orta alt */}
        <path
          d="
            M-5.5 7.5
            C-7.5 8.5 -10 8 -11 6
            C-9 5.5 -7 6 -5.5 7.5
            Z
          "
          fill="currentColor"
          opacity=".7"
        />

        {/* Nokta kümeleri */}
        <circle cx="-12" cy="-22" r="0.9" fill="currentColor" opacity=".5" />
        <circle cx="-14.5" cy="-20.5" r="0.5" fill="currentColor" opacity=".35" />
        <circle cx="-12" cy="22" r="0.9" fill="currentColor" opacity=".5" />
        <circle cx="-14.5" cy="20.5" r="0.5" fill="currentColor" opacity=".35" />

        <circle cx="-9" cy="-3.5" r="0.7" fill="currentColor" opacity=".55" />
        <circle cx="-9" cy="3.5" r="0.7" fill="currentColor" opacity=".55" />

        {/* Üstte dışa bakan rumi süs */}
        <path
          d="
            M-4 -19
            C-6 -24 -9 -27 -14 -27
            C-11 -24 -8 -21 -4 -19
            Z
          "
          fill="currentColor"
          opacity=".7"
        />
        <path
          d="
            M-1 -19
            C1 -24 3 -27 8 -27
            C5 -24 2 -21 -1 -19
            Z
          "
          fill="currentColor"
          opacity=".5"
        />

        {/* Altta dışa bakan rumi süs */}
        <path
          d="
            M-4 19
            C-6 24 -9 27 -14 27
            C-11 24 -8 21 -4 19
            Z
          "
          fill="currentColor"
          opacity=".7"
        />
        <path
          d="
            M-1 19
            C1 24 3 27 8 27
            C5 24 2 21 -1 19
            Z
          "
          fill="currentColor"
          opacity=".5"
        />
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