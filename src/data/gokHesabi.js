/* ═══════════════════════════════════════════════════════════════════════════
   VUKUF — GÖK HESABI: AYIN KONUMU, EVRESİ ve GÖRÜNEN EĞİMİ (internetsiz)
   src/data/gokHesabi.js

   16 Kasım 2026 — kullanıcı: (ayın görünümü için) "Daha güzel olur, o şekilde yapalım."
   Önceki çizim evreyi ortalama sinodik aydan alıyor, ay her gece akşamdan sabaha aynı yayda
   yürüyor ve aydınlık kenar hep dik çiziliyordu. Bu dosya bulunulan yer ve an için:
     • ayın ufka göre yüksekliği ve yönü (ufkun altındaysa gökte çizilmez),
     • aydınlık oranı (0 yeni ay … 1 dolunay) ve büyüyor/küçülüyor bilgisi,
     • aydınlık kenarın GÖRÜNEN açısı (zenitten saat yönünün tersine) — enleme ve saate göre
       değişen "yatık hilal" görünümü buradan gelir.
   Yöntem: Meeus'un kısaltılmış Ay/Güneş formülleri (astronomy-answers / suncalc ile aynı
   denklemler; birkaç dakikalık ve ~0,5°'lik doğruluk — çizim için fazlasıyla yeterli).
   NOT: Hicrî tarih ve dinî günler bu hesaptan GELMEZ; onlar Diyanet'in kendi verisidir
   (vakit verisindeki HicriTarihUzun ve DINI_GUNLER).
   ═══════════════════════════════════════════════════════════════════════════ */

const RAD = Math.PI / 180
const GUN = 86400000
const J1970 = 2440588, J2000 = 2451545
const gunSayisi = (ms) => ms / GUN - 0.5 + J1970 - J2000      // J2000'den beri gün
const E = RAD * 23.4397                                       // ekliptik eğikliği

const sagAcilim = (l, b) => Math.atan2(Math.sin(l) * Math.cos(E) - Math.tan(b) * Math.sin(E), Math.cos(l))
const dikAcilim = (l, b) => Math.asin(Math.sin(b) * Math.cos(E) + Math.cos(b) * Math.sin(E) * Math.sin(l))
const azimut = (H, phi, dec) => Math.atan2(Math.sin(H), Math.cos(H) * Math.sin(phi) - Math.tan(dec) * Math.cos(phi))
const yukseklik = (H, phi, dec) => Math.asin(Math.sin(phi) * Math.sin(dec) + Math.cos(phi) * Math.cos(dec) * Math.cos(H))
const yildizZamani = (d, lw) => RAD * (280.16 + 360.9856235 * d) - lw

function gunesKoord(d) {
  const M = RAD * (357.5291 + 0.98560028 * d)
  const C = RAD * (1.9148 * Math.sin(M) + 0.02 * Math.sin(2 * M) + 0.0003 * Math.sin(3 * M))
  const L = M + C + RAD * 102.9372 + Math.PI
  return { dec: dikAcilim(L, 0), ra: sagAcilim(L, 0) }
}
function ayKoord(d) {
  const L = RAD * (218.316 + 13.176396 * d)
  const M = RAD * (134.963 + 13.064993 * d)
  const F = RAD * (93.272 + 13.22935 * d)
  const l = L + RAD * 6.289 * Math.sin(M)
  const b = RAD * 5.128 * Math.sin(F)
  const uzaklik = 385001 - 20905 * Math.cos(M)
  return { ra: sagAcilim(l, b), dec: dikAcilim(l, b), uzaklik }
}

/**
 * Ay, `ms` anında, (lat, lng) konumundan:
 * { yukseklik (rad), azimut (rad; güneyden batıya +), kesir 0..1, buyuyen, egim (rad) }
 * egim: aydınlık kenarın ortasının yönü — zenitten (yukarıdan) SAAT YÖNÜNÜN TERSİNE.
 */
export function ayDurumu(ms, lat, lng) {
  const d = gunSayisi(ms)
  const lw = RAD * -lng, phi = RAD * lat
  const m = ayKoord(d), s = gunesKoord(d)
  const H = yildizZamani(d, lw) - m.ra
  let h = yukseklik(H, phi, m.dec)
  h -= Math.asin(6378.14 / m.uzaklik) * Math.cos(h)                    // ay paralaksı (yerden görünüş, ~1°)
  { const hh = Math.max(h, 0); h += 0.0002967 / Math.tan(hh + 0.00312536 / (hh + 0.08901179)) }   // kırılma (yaklaşık)
  const paralaktik = Math.atan2(Math.sin(H), Math.tan(phi) * Math.cos(m.dec) - Math.sin(m.dec) * Math.cos(H))
  // Aydınlanma
  const sUzak = 149598000
  const phiAci = Math.acos(Math.sin(s.dec) * Math.sin(m.dec) + Math.cos(s.dec) * Math.cos(m.dec) * Math.cos(s.ra - m.ra))
  const inc = Math.atan2(sUzak * Math.sin(phiAci), m.uzaklik - sUzak * Math.cos(phiAci))
  const aci = Math.atan2(Math.cos(s.dec) * Math.sin(s.ra - m.ra),
    Math.sin(s.dec) * Math.cos(m.dec) - Math.cos(s.dec) * Math.sin(m.dec) * Math.cos(s.ra - m.ra))
  return {
    yukseklik: h,
    azimut: azimut(H, phi, m.dec),
    kesir: (1 + Math.cos(inc)) / 2,
    buyuyen: aci < 0,
    egim: aci - paralaktik,
  }
}
