// ÂYET ROZETİ — çiçekli rozet (CiniAyetRozeti) temanın renkleriyle (11 Kasım 2026).
// 12 Kasım 2026: klasik rozet kaldırıldı (kullanıcı: "Artık çiçekli olan rozetimiz varsayılan,
// öncekini kaldırabiliriz"); eski çizim ve seçim deposu MushafAyetRozeti.jsx.yedek dosyasında.
// `stil` prop'u artık yok sayılıyor (eski çağrılar bozulmasın diye kabul ediliyor).
import CiniAyetRozeti from "./CiniAyetRozeti"

// Eski seçimin cihazda kalan kaydı temizlensin (bir kez)
try { localStorage.removeItem("vukuf-ayet-rozeti") } catch { /* yoksay */ }

export default function AyetRozeti({ stil: _stil, theme, ...p }) { // eslint-disable-line no-unused-vars
  return <CiniAyetRozeti {...p} zemin={theme?.background} yazi={theme?.text} vurgu={theme?.lugatHighlight || null} />
}
