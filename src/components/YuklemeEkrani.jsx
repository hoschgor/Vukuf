import MushafYukleniyorRozeti from "./MushafYukleniyorRozeti"
import GirisCercevesi from "./GirisCercevesi"

// Bekleme/yükleme ekranı — tezhipli Vukuf rozeti ile ortalanmış, tema-uyumlu.
// Kitap ilk açılışları (KuranOkuma / OkumaEkrani / RisaleOkuma) ve benzeri bekleme
// anlarında düz "Yükleniyor..." metni yerine kullanılır.
export default function YuklemeEkrani({
  theme,
  size = 152,
  etiket = null,           // isteğe bağlı alt yazı (rozet zaten kendi halkasıyla "yükleniyor"u anlatır)
  yukseklik = "78vh",
  arkaplan = true,
  fade = true,             // giriş fade animasyonu (örtü olarak kullanılınca kapatılır → çift flaş olmaz)
  // Kenarlardaki mushaf çerçevesi (cetvel + köşebent + dallar). Yalnızca tam ekran
  // kullanımda anlamlı; 78vh gibi sayfa içi bir kutuda kutunun kenarına çizilirdi.
  // Durağan (canli={false}): kitap açılırken art arda gelen yükleme ekranlarında
  // çizim animasyonu her seferinde baştan başlayıp yanıp sönmesin.
  cerceve = yukseklik === "100vh" || yukseklik === "100%",
}) {
  return (
    <div
      style={{
        position: "relative",
        minHeight: yukseklik,
        width: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: "20px",
        background: arkaplan ? theme?.background : "transparent",
        animation: fade ? "vukufYukGiris 0.45s ease" : "none",
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

      {cerceve && <GirisCercevesi ac={theme?.accent || "currentColor"} canli={false} />}

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
