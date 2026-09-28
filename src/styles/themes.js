/* ═══════════════════════════════════════════════════════════════════════════
   TEMALAR (28 Eylül 2026 — yeniden düzenlendi)

   Kullanıcı kararı: eski temalardan YALNIZ SEPYA kaldı (değerleri AYNEN);
   Açık · Koyu · Gece · Kahve · Yüksek Karşıtlık kaldırıldı, yerlerine
   yaygın kullanılan, rahat okunan tonlar geldi. İstenen tonlar ve karşılıkları:
     gül kurusu → Kurugül · gül → Gülnar · lavanta → Leylak
     menekşe → Erguvan · sedir → Ardıç · okyanus → Derya
   Ek olarak: Fildişi, Kar, Adaçayı, Seher (aydınlık) · Arduvaz, Kehribar,
   Zifir (karanlık). Sıra = seçicideki sıra; ton (aydınlık/karanlık) zemin
   parlaklığından hesaplanıyor (AppContext `temaTonu`), burada alan yok.

   OKUNURLUK ÖLÇÜLDÜ (WCAG karşıtlık, hem zemin hem yüzey üzerinde):
     yazı ≥ 7 (AAA) · ikincil yazı, vurgu, lügat, Arapça harf ≥ 4.5 ·
     âyet no ≥ 3 (işaret, metin değil). Yeni temaların hepsi geçiyor.
   Koyu temalarda yazı saf beyaz DEĞİL (#c8–#e0 arası) — siyah zeminde saf
   beyaz harflerin etrafında ışıma yapıp uzun okumada göz yoruyor.
   Renk değiştirirken bu sınırları koru.

   `aciklama` alanı seçicideki alt satır; renk düzenleyici onu kullanmıyor.
   Kaldırılan temaların kimlikleri `ESKI_TEMALAR` ile yenilere çevriliyor —
   kayıtlı tema/favori eski kimlikteyse kullanıcı rastgele bir temaya düşmesin.
   ═══════════════════════════════════════════════════════════════════════════ */

export const themes = {
  // ── AYDINLIK ──────────────────────────────────────────────────────────
  sepia: {   // eski temadan kalan tek tema — değerleri AYNEN
    name: "Sepya",
    aciklama: "Göz yormayan sıcak ton",
    background: "#f4ecd8",
    surface: "#ede0c4",
    text: "#3b2f2f",
    textSecondary: "#6b4c3b",
    accent: "#8b5e3c",
    lugatHighlight: "#c0392b",
    arabicHighlight: "#0000fa",
    ayetNoRengi: "#0000fa",
    border: "#d4b896",
  },
  fildisi: {
    name: "Fildişi",
    aciklama: "Kırık beyaz, mürekkep mavisi",
    background: "#f7f3ea",
    surface: "#eee8da",
    text: "#2e2a25",
    textSecondary: "#5b5347",
    accent: "#3d5a80",
    lugatHighlight: "#a33a2c",
    arabicHighlight: "#1d4fa0",
    ayetNoRengi: "#2f5fb0",
    border: "#ddd4c2",
  },
  kar: {
    name: "Kar",
    aciklama: "Temiz beyaz sayfa",
    background: "#ffffff",
    surface: "#f4f5f7",
    text: "#1f2328",
    textSecondary: "#4d5561",
    accent: "#1f6f5c",
    lugatHighlight: "#b3261e",
    arabicHighlight: "#0b57d0",
    ayetNoRengi: "#12805f",
    border: "#e1e4e8",
  },
  kurugul: {   // istenen: gül kurusu
    name: "Kurugül",
    aciklama: "Solgun gül yaprağı",
    background: "#f6ebe9",
    surface: "#eedcd8",
    text: "#3d2a2c",
    textSecondary: "#6b4a4e",
    accent: "#94495a",
    lugatHighlight: "#8a3b12",
    arabicHighlight: "#1f5a99",
    ayetNoRengi: "#94495a",
    border: "#dfc5c0",
  },
  leylak: {   // istenen: lavanta
    name: "Leylak",
    aciklama: "Yumuşak eflatun",
    background: "#f3f0f7",
    surface: "#e9e3f1",
    text: "#2c2638",
    textSecondary: "#574c6b",
    accent: "#664899",
    lugatHighlight: "#a3305f",
    arabicHighlight: "#3535a8",
    ayetNoRengi: "#664899",
    border: "#d7cde6",
  },
  adacayi: {
    name: "Adaçayı",
    aciklama: "Dinlendirici yeşil",
    background: "#eef1e8",
    surface: "#e2e8d9",
    text: "#25302a",
    textSecondary: "#4b594c",
    accent: "#46633a",
    lugatHighlight: "#9c3d2e",
    arabicHighlight: "#1f5e8c",
    ayetNoRengi: "#3a7346",
    border: "#cbd4bd",
  },
  seher: {
    name: "Seher",
    aciklama: "Şafak öncesi serin mavi",
    background: "#eef2f6",
    surface: "#e2e8ef",
    text: "#1f2a36",
    textSecondary: "#465464",
    accent: "#2c5a84",
    lugatHighlight: "#ab3f2b",
    arabicHighlight: "#6a3a9e",
    ayetNoRengi: "#2c6aa3",
    border: "#cdd7e2",
  },
  // ── KARANLIK ──────────────────────────────────────────────────────────
  gulnar: {   // istenen: gül
    name: "Gülnar",
    aciklama: "Nar çiçeği, koyu gül",
    background: "#1c1216",
    surface: "#28191f",
    text: "#dccbcf",
    textSecondary: "#b99aa1",
    accent: "#d98a9b",
    lugatHighlight: "#e8c07a",
    arabicHighlight: "#f2b880",
    ayetNoRengi: "#e39aab",
    border: "#3d2830",
  },
  erguvan: {   // istenen: menekşe
    name: "Erguvan",
    aciklama: "Derin mor",
    background: "#17131f",
    surface: "#221b2e",
    text: "#d9d2e6",
    textSecondary: "#a99cc0",
    accent: "#b18fe0",
    lugatHighlight: "#e7c46f",
    arabicHighlight: "#f0b7e0",
    ayetNoRengi: "#c7a6f0",
    border: "#342a45",
  },
  ardic: {   // istenen: sedir
    name: "Ardıç",
    aciklama: "Koyu orman yeşili",
    background: "#111a16",
    surface: "#1a2620",
    text: "#d3ddd4",
    textSecondary: "#9fb3a5",
    accent: "#7fb48f",
    lugatHighlight: "#e3c26f",
    arabicHighlight: "#a8d88a",
    ayetNoRengi: "#9cc9a9",
    border: "#2a3a31",
  },
  derya: {   // istenen: okyanus
    name: "Derya",
    aciklama: "Gece denizi",
    background: "#0e1822",
    surface: "#152331",
    text: "#d0dbe6",
    textSecondary: "#98adc2",
    accent: "#5fa8d3",
    lugatHighlight: "#e8c880",
    arabicHighlight: "#7fd6e6",
    ayetNoRengi: "#8cc4ea",
    border: "#243647",
  },
  arduvaz: {
    name: "Arduvaz",
    aciklama: "Yumuşak kurşuni",
    background: "#1e2124",
    surface: "#272b2f",
    text: "#d4d7db",
    textSecondary: "#a3a9b0",
    accent: "#8fb0cf",
    lugatHighlight: "#e6c27a",
    arabicHighlight: "#f2c46d",
    ayetNoRengi: "#9dc0e0",
    border: "#383d43",
  },
  kehribar: {
    name: "Kehribar",
    aciklama: "Sıcak amber ve ceviz",
    background: "#16110b",
    surface: "#221a11",
    text: "#e0d2bb",
    textSecondary: "#b9a07e",
    accent: "#d9a25a",
    lugatHighlight: "#9cc3a0",
    arabicHighlight: "#f0ad60",
    ayetNoRengi: "#d9a25a",
    border: "#3a2d1c",
  },
  zifir: {
    name: "Zifir",
    aciklama: "Tam siyah, OLED için",
    background: "#000000",
    surface: "#111111",
    text: "#c8c8c8",
    textSecondary: "#8f8f8f",
    accent: "#e0b050",
    lugatHighlight: "#6fcf97",
    arabicHighlight: "#7fd1c7",
    ayetNoRengi: "#e0b050",
    border: "#262626",
  },
}

// Kaldırılan temalar → en yakın yeni tema (renk ailesi ve ton korunarak)
export const ESKI_TEMALAR = {
  light: "kar",            // beyaz zemin
  dark: "derya",           // lacivert gece
  night: "zifir",          // tam karanlık
  coffee: "kehribar",      // odunsu koyu kahve
  highcontrast: "zifir",   // en yüksek karşıtlık şimdi Zifir'de
}

export const defaultTheme = "sepia"
export const defaultCustomTheme = {
  name: "Özel",
  background: "#f4ecd8",
  surface: "#ede0c4",
  text: "#3b2f2f",
  textSecondary: "#6b4c3b",
  accent: "#8b5e3c",
  lugatHighlight: "#c0392b",
  arabicHighlight: "#0000fa",
  ayetNoRengi: "#0000fa",
  border: "#d4b896",
}