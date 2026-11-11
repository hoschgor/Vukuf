/* ═══════════════════════════════════════════════════════════════════════════
   VUKUF — KİLİT EKRANI DÜĞMELERİ İÇİN "DIŞ SES" KAYDI
   src/data/disSes.js

   11 Kasım 2026 — Ekstralar → Kur'an Dinle. Tarayıcıda kilit ekranı / kulaklık
   düğmeleri (mediaSession) için her eylemin TEK bir işleyicisi olabiliyor; Kur'ân
   oynatıcısı (data/hooks/useAudioPlayer.js) bunları açılışta bir kez kuruyor. Kur'an
   Dinle çalarken o düğmeler Kur'ân oynatıcısını değil, Kur'an Dinle'yi yönetsin diye:
   Kur'an Dinle başlayınca kendini buraya kaydeder; oynatıcının işleyicileri önce
   `disSesEylem()` sorar, kayıt varsa eylemi ona bırakır. Kur'ân oynatıcısı ya da
   radyo başlayınca kayıt kalkar → düğmeler eskisi gibi oynatıcıya döner.
   ═══════════════════════════════════════════════════════════════════════════ */

let dis = null

export function disSesKaydet(o) { dis = o || null }
export function disSesBirak(o) { if (!o || dis === o) dis = null }
export function disSesVarMi() { return !!dis }

// Kayıtlı dış ses bu eylemi karşılıyorsa çalıştırır ve true döner
export function disSesEylem(ad) {
  const f = dis && dis[ad]
  if (typeof f !== "function") return false
  try { f() } catch { /* yoksay */ }
  return true
}
