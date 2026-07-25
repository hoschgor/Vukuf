export default function AyetNo({ no, sure, theme, onClick }) {
  const ac = theme.accent
  
  return (
    <span
      onClick={onClick}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: "16px",
        fontFamily: "PlayfairDisplay, serif",
        color: ac,
        backgroundColor: `${ac}10`,
        borderRadius: "20px",
        padding: "2px 8px",
        marginLeft: "12px",
        marginRight: "4px",
        cursor: "pointer",
        border: `0.5px solid ${ac}30`,
        transition: "all 0.15s ease",
        letterSpacing: "0.5px",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.backgroundColor = `${ac}20`
        e.currentTarget.style.transform = "scale(1.02)"
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = `${ac}10`
        e.currentTarget.style.transform = "scale(1)"
      }}
    >
      ﴿ {no} ﴾
    </span>
  )
}