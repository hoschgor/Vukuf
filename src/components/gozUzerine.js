/* ═══════════════════════════════════════════════════════════════════════════
   VUKUF — ÜZERİNE GELİNCE BELİREN GÖZ (gizle/göster) — ortak stil
   src/components/gozUzerine.js

   11 Kasım 2026 — kullanıcı: "web için gizleme için kullandığımız göz simgesini hover
   efekti ile verelim, nasılsa PC'de yorulmaz. Ana menüde de bu şekilde yapabiliriz."
   Düzenleme kipinde (Kitaplık, Ekstralar) gizleme kipi kapalıyken de fareli cihazlarda
   satırın / rafın üzerine gelince göz belirir. Dokunmatikte hiç görünmez — orada araç
   çubuğundaki göz düğmesi gizleme kipini açar.
   Kullanım: düğmeye className="vk-goz-uzerine" (satır içi `display` VERİLMEZ — sınıf
   yönetir); kapsayıcıya data-goz-kap="" (yoksa doğrudan ebeveynin üzerine gelmek yeter).
   ═══════════════════════════════════════════════════════════════════════════ */

export const GOZ_UZERINE_CSS = `.vk-goz-uzerine{display:none}
@media (hover:hover) and (pointer:fine){
.vk-goz-uzerine{display:flex;opacity:0;transition:opacity .15s ease}
*:hover>.vk-goz-uzerine,[data-goz-kap]:hover .vk-goz-uzerine,.vk-goz-uzerine:focus-visible{opacity:1}}`
