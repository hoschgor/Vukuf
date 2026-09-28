export const themes = {
  sepia: {
    name: "Sepya",
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
  dark: {
    name: "Koyu",
    background: "#0f0f1b",
    surface: "#16213e",
    text: "#a5a5a5",
    textSecondary: "#a0a0b0",
    accent: "#6892de",        // eski #5b92f2 — aynı mavi, doygunluk %85 → %64 (neon parlaması azaldı)
    lugatHighlight: "#e8dd7c",
    arabicHighlight: "#fac400",
    ayetNoRengi: "#92c2f6",
    border: "#2d2d4e",
  },
  light: {
    name: "Açık",
    background: "#ffffff",
    surface: "#ffffff",
    text: "#222222",
    textSecondary: "#064716",
    accent: "#2c7a4b",
    lugatHighlight: "#c0392b",
    arabicHighlight: "#1b8850",
    ayetNoRengi: "#0bbc5a",
    border: "#dddddd",
  },
  night: {
    name: "Gece",
    background: "#0d0d0d",
    surface: "#1a1a1a",
    text: "#a5a5a5",
    textSecondary: "#888888",
    accent: "#24dbb4",        // eski #04f6c1 — aynı turkuaz, doygunluk %97 → %72 (neon yumuşadı)
    lugatHighlight: "#37cf6a",
    arabicHighlight: "#00fac8",
    ayetNoRengi: "#8fe8d4",
    border: "#2a2a2a",
  },
  coffee: {
    // ODUNSU: koyu ceviz zemin, meşe vurgu, sıcak (grimsi değil) yazı.
    // Eski değerler yanlarında — geri almak istenen satır tek tek döndürülebilir.
    name: "Kahve",
    background: "#14100c",    // eski #0d0d0d (saf siyaha yakın) → koyu ceviz
    surface: "#231811",       // eski #1a100a → ceviz tahtası
    text: "#bcae9a",          // eski #a5a5a5 (soğuk gri) → sıcak kâğıt tonu
    textSecondary: "#a8896a", // eski #99785d
    accent: "#b5875c",        // eski #9e714f → meşe
    lugatHighlight: "#a8896a",// eski #99785d — önceki gibi ikincil yazıyla aynı
    arabicHighlight: "#f0ad60",
    ayetNoRengi: "#948114",
    border: "#3a2b1e",        // eski #302010
  },
  highcontrast:{
    name: "Yüksek Karşıtlık",
    background: "#1c1c1c",
    surface: "#1c1c1c",
    text: "#f4ecd8",
    textSecondary: "#eeb311",
    accent: "#eeb311",
    lugatHighlight: "#4eace2",
    arabicHighlight: "#fff700",
    ayetNoRengi: "#fad900",
    border: "#363636",
  }
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
