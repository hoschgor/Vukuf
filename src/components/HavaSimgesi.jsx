/* ═══════════════════════════════════════════════════════════════════════════
   VUKUF — HAVA SİMGESİ (cami sahnesinin göğünde ve Kitaplık rafının levhasında)
   src/components/HavaSimgesi.jsx

   15 Kasım 2026 — kullanıcı: "Yağmurlu ise yağmur damlası, karlı ise kar tanesi, kapalı ise
   bulut çizimi ile birlikte verebiliriz." Cami çizimiyle aynı dil: yüzey renginde dolu,
   vurgu renginde ince çizgili bulut; altında damlalar (yağmur), kar taneleri (kar), şimşek
   (fırtına), sis çizgileri (sis). Açık havada bulut yok (gökteki güneş/ay zaten var);
   parçalı bulutta tek küçük bulut. Damlalar ve taneler hafifçe süzülür (azaltılmış
   hareket tercihinde durur).

   HavaGlifi: <g> — 40×26 birimlik kutu (0,0 sol üst). Hem sahnenin SVG'sine gömülür
   (CamiVakit) hem kendi küçük <svg>'siyle kullanılır (HavaSimgesi).
   ═══════════════════════════════════════════════════════════════════════════ */

export const HAVA_CSS = `@keyframes vk-hava-damla { 0% { transform: translateY(-1.5px); opacity: 0 } 25% { opacity: 1 } 100% { transform: translateY(3.5px); opacity: 0 } }
@keyframes vk-hava-tane { 0% { transform: translateY(-1px); opacity: .2 } 40% { opacity: 1 } 100% { transform: translateY(3px); opacity: .15 } }
.vk-hava-damla { animation: vk-hava-damla 1.3s linear infinite }
.vk-hava-tane { animation: vk-hava-tane 2.6s ease-in-out infinite }
@media (prefers-reduced-motion: reduce) { .vk-hava-damla, .vk-hava-tane { animation: none } }`

function Bulut({ x = 0, y = 0, s = 1, dolgu, cizgi }) {
  return (
    <path transform={`translate(${x} ${y}) scale(${s})`}
      d="M7 17 C3 17 1.5 14.5 2.2 12.4 C2.9 10.2 5 9.3 6.8 9.7 C7.4 6.2 10.4 4 13.8 4.4 C16.6 4.7 18.7 6.6 19.4 9 C20.4 8.4 21.8 8.2 23 8.7 C25.5 9.6 26.6 12.2 25.8 14.5 C25.2 16.1 23.8 17 22.2 17 Z"
      fill={dolgu} stroke={cizgi} strokeWidth={1 / s} strokeLinejoin="round" />
  )
}
function KarTanesi({ x, y, r, renk }) {
  return (
    <g transform={`translate(${x} ${y})`} stroke={renk} strokeWidth="0.8" strokeLinecap="round">
      {[0, 60, 120].map(a => <line key={a} x1={-r} y1="0" x2={r} y2="0" transform={`rotate(${a})`} />)}
    </g>
  )
}

/** tur: acik | parcali | kapali | sis | yagmur | kar | firtina */
export function HavaGlifi({ tur, dolgu, cizgi, vurgu, hareket = true }) {
  if (!tur || tur === "acik") return null
  const tek = tur === "parcali"
  return (
    <g>
      {/* arkadaki küçük bulut (kapalı ve yağışlı havada) */}
      {!tek && <Bulut x={14} y={-2} s={0.78} dolgu={dolgu} cizgi={cizgi} />}
      <Bulut x={tek ? 6 : 2} y={tek ? 2 : 1} s={tek ? 0.95 : 1.05} dolgu={dolgu} cizgi={cizgi} />
      {tur === "yagmur" && [6, 13, 20].map((x, i) => (
        <path key={x} className={hareket ? "vk-hava-damla" : undefined} style={{ animationDelay: `${i * 0.35}s` }}
          d={`M${x + 1} 20.5 Q${x - 0.6} 23 ${x + 0.2} 24.2 Q${x + 1.2} 25 ${x + 1.9} 24.2 Q${x + 2.5} 23 ${x + 1} 20.5 Z`}
          fill={vurgu} />
      ))}
      {tur === "kar" && [[7, 22.5], [14, 24], [21, 22.5]].map(([x, y], i) => (
        <g key={x} className={hareket ? "vk-hava-tane" : undefined} style={{ animationDelay: `${i * 0.6}s` }}>
          <KarTanesi x={x} y={y} r={1.9} renk={vurgu} />
        </g>
      ))}
      {tur === "firtina" && (
        <path d="M14 18.5 L11 23 L13.6 23 L12 26.5 L17 21.4 L14.4 21.4 L16 18.5 Z" fill={vurgu} />
      )}
      {tur === "sis" && [21, 24].map((y, i) => (
        <line key={y} x1={4 + i * 3} y1={y} x2={24 - i * 2} y2={y} stroke={cizgi} strokeWidth="1" strokeLinecap="round" opacity={0.75} />
      ))}
    </g>
  )
}

/** Küçük satır içi simge + derece (Kitaplık levhası) */
export default function HavaSimgesi({ hava, theme, boy = 18, yazi = 13 }) {
  if (!hava) return null
  const bulutlu = hava.tur && hava.tur !== "acik"
  return (
    <span title={`${hava.derece}°`} style={{ display: "inline-flex", alignItems: "center", gap: "3px", flexShrink: 0, color: theme.text }}>
      <style>{HAVA_CSS}</style>
      {bulutlu ? (
        <svg width={Math.round(boy * 36 / 28)} height={boy} viewBox="0 -2 36 28" aria-hidden="true" style={{ overflow: "visible" }}>
          <HavaGlifi tur={hava.tur} dolgu={theme.surface} cizgi={theme.accent} vurgu={theme.accent} />
        </svg>
      ) : (
        <svg width={boy} height={boy} viewBox="-12 -12 24 24" aria-hidden="true">
          {hava.gunduz ? (
            <g>
              {Array.from({ length: 8 }, (_, i) => (
                <line key={i} x1="0" y1="-7.5" x2="0" y2="-10" stroke="#e39b2d" strokeWidth="1.4" strokeLinecap="round" transform={`rotate(${i * 45})`} />
              ))}
              <circle r="5.2" fill="#f6c453" stroke="#e39b2d" strokeWidth="1" />
            </g>
          ) : (
            <path d="M3 -8 A8.5 8.5 0 1 0 8 4 A7 7 0 1 1 3 -8 Z" fill={theme.accent} />
          )}
        </svg>
      )}
      <span style={{ fontSize: `${yazi}px`, fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>{hava.derece}°</span>
    </span>
  )
}
