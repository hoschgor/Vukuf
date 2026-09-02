import React from "react"

export default function MushafYukleniyorRozeti({
  size = 150,
  ac = "currentColor",
  aktif = true,
  kitap = true,
  halka = true,   // alttaki dönen "yükleniyor" çemberi (giriş splash'ında kapatılabilir)
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="-100 -100 200 200"
      style={{
        color: ac,
        overflow: "visible",
        display: "block",
        transform: aktif ? "scale(1)" : "scale(0.96)",
        transition: "transform 0.3s ease",
      }}
      aria-label="Yükleniyor"
      role="img"
    >
      {/* =========================================================
          DIŞ ROZET ÇERÇEVESİ
      ========================================================= */}
      {/* Sol üst / sağ üst / sol alt / sağ alt süs noktaları */}
      <g
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {/* Üst yay */}
        <path
          d="
            M-62 -43
            C-48 -61 -28 -70 0 -70
            C28 -70 48 -61 62 -43
          "
          strokeWidth="1.8"
          opacity="0.65"
        />
        {/* Üst iç yay */}
        <path
          d="
            M-57 -45
            C-43 -58 -25 -65 0 -65
            C25 -65 43 -58 57 -45
          "
          strokeWidth="0.7"
          opacity="0.35"
        />
        {/* Alt yay */}
        <path
          d="
            M-62 43
            C-48 61 -28 70 0 70
            C28 70 48 61 62 43
          "
          strokeWidth="1.8"
          opacity="0.65"
        />
        {/* Alt iç yay */}
        <path
          d="
            M-57 45
            C-43 58 -25 65 0 65
            C25 65 43 58 57 45
          "
          strokeWidth="0.7"
          opacity="0.35"
        />
        {/* Sol yay */}
        <path
          d="
            M-43 -62
            C-61 -48 -70 -28 -70 0
            C-70 28 -61 48 -43 62
          "
          strokeWidth="1.8"
          opacity="0.65"
        />
        {/* Sağ yay */}
        <path
          d="
            M43 -62
            C61 -48 70 -28 70 0
            C70 28 61 48 43 62
          "
          strokeWidth="1.8"
          opacity="0.65"
        />
      </g>
      {/* =========================================================
          ÜST TEZHİP SÜSÜ
      ========================================================= */}
      <g
        fill="currentColor"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {/* Ana üst yaprak */}
        <path
          d="
            M0 -72
            C-7 -79 -8 -87 0 -94
            C8 -87 7 -79 0 -72
            Z
          "
          opacity="0.75"
        />
        {/* İç yaprak */}
        <path
          d="
            M0 -73
            C-3 -81 -2 -86 0 -89
            C2 -86 3 -81 0 -73
            Z
          "
          opacity="0.95"
        />
        {/* Sol kıvrım */}
        <path
          d="
            M-3 -73
            C-12 -76 -17 -82 -18 -87
            C-11 -85 -6 -81 -3 -75
            C-10 -80 -16 -79 -21 -77
            C-16 -72 -10 -70 -3 -73
            Z
          "
          opacity="0.6"
        />
        {/* Sağ kıvrım */}
        <path
          d="
            M3 -73
            C12 -76 17 -82 18 -87
            C11 -85 6 -81 3 -75
            C10 -80 16 -79 21 -77
            C16 -72 10 -70 3 -73
            Z
          "
          opacity="0.6"
        />
        {/* Üst noktalar */}
        <circle cx="-25" cy="-67" r="1.8" opacity="0.55" />
        <circle cx="25" cy="-67" r="1.8" opacity="0.55" />
        <circle cx="-31" cy="-63" r="0.9" opacity="0.35" />
        <circle cx="31" cy="-63" r="0.9" opacity="0.35" />
      </g>
      {/* =========================================================
          ALT TEZHİP SÜSÜ
      ========================================================= */}
      <g
        fill="currentColor"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        transform="rotate(180)"
      >
        <path
          d="
            M0 -72
            C-7 -79 -8 -87 0 -94
            C8 -87 7 -79 0 -72
            Z
          "
          opacity="0.75"
        />
        <path
          d="
            M0 -73
            C-3 -81 -2 -86 0 -89
            C2 -86 3 -81 0 -73
            Z
          "
          opacity="0.95"
        />
        <path
          d="
            M-3 -73
            C-12 -76 -17 -82 -18 -87
            C-11 -85 -6 -81 -3 -75
            C-10 -80 -16 -79 -21 -77
            C-16 -72 -10 -70 -3 -73
            Z
          "
          opacity="0.6"
        />
        <path
          d="
            M3 -73
            C12 -76 17 -82 18 -87
            C11 -85 6 -81 3 -75
            C10 -80 16 -79 21 -77
            C16 -72 10 -70 3 -73
            Z
          "
          opacity="0.6"
        />
        <circle cx="-25" cy="-67" r="1.8" opacity="0.55" />
        <circle cx="25" cy="-67" r="1.8" opacity="0.55" />
      </g>
      {/* =========================================================
          SOL TEZHİP SÜSÜ
      ========================================================= */}
      <g
        fill="currentColor"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        transform="rotate(-90)"
      >
        <path
          d="
            M0 -72
            C-7 -79 -8 -87 0 -94
            C8 -87 7 -79 0 -72
            Z
          "
          opacity="0.55"
        />
        <path
          d="
            M-3 -73
            C-11 -77 -16 -82 -18 -87
            C-11 -85 -6 -81 -3 -75
            Z
          "
          opacity="0.5"
        />
        <path
          d="
            M3 -73
            C11 -77 16 -82 18 -87
            C11 -85 6 -81 3 -75
            Z
          "
          opacity="0.5"
        />
        <circle cx="0" cy="-80" r="2" opacity="0.65" />
      </g>
      {/* =========================================================
          SAĞ TEZHİP SÜSÜ
      ========================================================= */}
      <g
        fill="currentColor"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        transform="rotate(90)"
      >
        <path
          d="
            M0 -72
            C-7 -79 -8 -87 0 -94
            C8 -87 7 -79 0 -72
            Z
          "
          opacity="0.55"
        />
        <path
          d="
            M-3 -73
            C-11 -77 -16 -82 -18 -87
            C-11 -85 -6 -81 -3 -75
            Z
          "
          opacity="0.5"
        />
        <path
          d="
            M3 -73
            C11 -77 16 -82 18 -87
            C11 -85 6 -81 3 -75
            Z
          "
          opacity="0.5"
        />
        <circle cx="0" cy="-80" r="2" opacity="0.65" />
      </g>
      {/* =========================================================
          MERKEZ V + KİTAP
      ========================================================= */}
      <g>
        {/* V harfinin hafif gölgesi */}
        <path
          d="
            M-29 -38
            L-14 -38
            L0 16
            L14 -38
            L29 -38
            L9 45
            L-9 45
            Z
          "
          fill="currentColor"
          opacity="0.12"
          transform="translate(1.5 2)"
        />
        {/* V harfi */}
        <path
          d="
            M-30 -40
            L-15 -40
            L0 15
            L15 -40
            L30 -40
            L9 44
            L-9 44
            Z
          "
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinejoin="round"
          opacity="0.95"
        />
        {/* V içi */}
        <path
          d="
            M-25 -36
            L-12 -36
            L0 9
            L12 -36
            L25 -36
            L6 39
            L-6 39
            Z
          "
          fill="currentColor"
          opacity="0.08"
        />
        {/* =====================================================
            KİTAP
        ===================================================== */}
        {kitap && (
          <g transform="translate(22 19) rotate(-8)">
            {/* Kitabın alt kapağı */}
            <path
              d="
                M0 7
                L24 -5
                L38 1
                L14 15
                Z
              "
              fill="currentColor"
              opacity="0.8"
            />
            {/* Sayfa kısmı */}
            <path
              d="
                M2 1
                L25 -10
                L35 -5
                L12 7
                Z
              "
              fill="currentColor"
              opacity="0.28"
            />
            {/* Kitap üst kapağı */}
            <path
              d="
                M0 -2
                L25 -15
                L38 -9
                L13 5
                Z
              "
              fill="currentColor"
              opacity="0.95"
            />
            {/* Kitap sırtı */}
            <path
              d="
                M0 -2
                L0 7
                L13 15
                L13 5
                Z
              "
              fill="currentColor"
              opacity="0.55"
            />
            {/* Kitap sayfa çizgisi */}
            <path
              d="M13 5 L35 -7"
              fill="none"
              stroke="currentColor"
              strokeWidth="1"
              opacity="0.5"
            />
          </g>
        )}
      </g>
      {/* =========================================================
          YÜKLENİYOR ÇEMBERİ
      ========================================================= */}
      {halka && (
      <g transform="translate(0 62)">
        {/* Sabit çok hafif halka */}
        <circle
          cx="0"
          cy="0"
          r="7"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.4"
          opacity="0.12"
        />
        {/* Dönen halka */}
        <circle
          cx="0"
          cy="0"
          r="7"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeDasharray="25 19"
          opacity="0.85"
        >
          <animateTransform
            attributeName="transform"
            type="rotate"
            from="0 0 0"
            to="360 0 0"
            dur="0.9s"
            repeatCount="indefinite"
          />
        </circle>
      </g>
      )}
      {/* =========================================================
          KÜÇÜK DEKORATİF NOKTALAR
      ========================================================= */}
      <g fill="currentColor">
        <circle cx="-73" cy="0" r="1.8" opacity="0.45" />
        <circle cx="-78" cy="0" r="0.8" opacity="0.25" />
        <circle cx="73" cy="0" r="1.8" opacity="0.45" />
        <circle cx="78" cy="0" r="0.8" opacity="0.25" />
        <circle cx="-48" cy="-58" r="1.2" opacity="0.35" />
        <circle cx="48" cy="-58" r="1.2" opacity="0.35" />
        <circle cx="-48" cy="58" r="1.2" opacity="0.35" />
        <circle cx="48" cy="58" r="1.2" opacity="0.35" />
      </g>
    </svg>
  )
}
