// ÂYET ROZETİ — seçili stile göre Çini ya da Klasik rozeti çizer (11 Kasım 2026).
// `stil` verilirse onu kullanır (MushafSayfa stili bir kez okuyup geçiriyor — her rozet ayrı
// abone olmasın); verilmezse ayarı kendisi okur (bilgi paneli, tema önizlemesi vb.).
import MushafAyetRozeti from "./MushafAyetRozeti"
import CiniAyetRozeti from "./CiniAyetRozeti"
import { useAyetRozeti } from "../data/ayetRozeti"

function Sec({ stil, theme, ...p }) {
  if (stil === "klasik" || !theme) return <MushafAyetRozeti {...p} />
  return <CiniAyetRozeti {...p} zemin={theme.background} yazi={theme.text} vurgu={theme.lugatHighlight || null} />
}
function Kendi(props) {
  const stil = useAyetRozeti()
  return <Sec {...props} stil={stil} />
}
export default function AyetRozeti({ stil, ...props }) {
  return stil ? <Sec {...props} stil={stil} /> : <Kendi {...props} />
}
