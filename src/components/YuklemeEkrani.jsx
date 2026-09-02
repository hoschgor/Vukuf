import MushafYukleniyorRozeti from "./MushafYukleniyorRozeti"

// Bekleme/yükleme ekranı — tezhipli Vukuf rozeti ile ortalanmış, tema-uyumlu.
// Kitap ilk açılışları (KuranOkuma / OkumaEkrani / RisaleOkuma) ve benzeri bekleme
// anlarında düz "Yükleniyor..." metni yerine kullanılır.
export default function YuklemeEkrani({
  theme,
  size = 152,
  etiket = null,           // isteğe bağlı alt yazı (rozet zaten kendi halkasıyla "yükleniyor"u anlatır)
  yukseklik = "78vh",
  arkaplan = true,
}) {
  return (
    <div
      style={{
        minHeight: yukseklik,
        width: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: "20px",
        background: arkaplan ? theme?.background : "transparent",
        animation: "vukufYukGiris 0.45s ease",
      }}
    >
      <style>{`
        @keyframes vukufYukGiris { from { opacity: 0 } to { opacity: 1 } }
        @keyframes vukufYukNefes {
          0%, 100% { transform: scale(1);    opacity: 0.92; }
          50%      { transform: scale(1.035); opacity: 1;    }
        }
        @media (prefers-reduced-motion: reduce) {
          .vukuf-yuk-nefes { animation: none !important; }
        }
      `}</style>

      <div
        className="vukuf-yuk-nefes"
        style={{ animation: "vukufYukNefes 2.6s ease-in-out infinite", willChange: "transform" }}
      >
        <MushafYukleniyorRozeti size={size} ac={theme?.accent || "currentColor"} />
      </div>

      {etiket && (
        <div style={{
          fontSize: "12px",
          letterSpacing: "3px",
          textTransform: "uppercase",
          color: theme?.textSecondary,
          opacity: 0.75,
        }}>
          {etiket}
        </div>
      )}
    </div>
  )
}
