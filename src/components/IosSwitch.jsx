// iOS tarzı aç/kapa anahtarı — GÖRSEL (tıklama üst satır/ebeveyn tarafından yönetilir,
// böylece buton-içinde-buton sorunu olmaz). Tema rengine uyar.
export default function IosSwitch({ acik, theme, boyut = 1 }) {
  const W = 46 * boyut
  const H = 28 * boyut
  const K = 22 * boyut   // topuz çapı
  const P = 3 * boyut    // kenar boşluğu
  return (
    <span
      role="switch"
      aria-checked={acik}
      style={{
        display: "inline-block", flexShrink: 0, position: "relative",
        width: `${W}px`, height: `${H}px`, borderRadius: "999px",
        background: acik ? theme.accent : (theme.border || "#ccc"),
        transition: "background 0.25s ease",
        verticalAlign: "middle",
      }}
    >
      <span style={{
        position: "absolute", top: `${P}px`,
        left: acik ? `${W - K - P}px` : `${P}px`,
        width: `${K}px`, height: `${K}px`, borderRadius: "50%", background: "#fff",
        transition: "left 0.25s cubic-bezier(.4,.1,.3,1)",
        boxShadow: "0 1px 3px rgba(0,0,0,0.3)",
      }} />
    </span>
  )
}
