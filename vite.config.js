import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { writeFileSync } from 'node:fs'
import { join } from 'node:path'

/* ── VARLIK LİSTESİ (29 Eylül 2026) ─────────────────────────────────────────
   Sayfalar artık ayrı parçalar hâlinde yükleniyor (App.jsx → lazy). Açılış
   yalnız Kitaplık'ı indiriyor; Kur'ân, okuma ekranı, lügat… açıldıkları anda.
   ÇEVRİMDIŞI TUZAĞI: servis işçisi /assets/* dosyalarını yalnız İSTENDİKLERİ
   an önbelleğe alıyordu. Eskiden tek paket vardı, açılışta hepsi iniyordu;
   bölününce hiç açılmamış bir sayfanın parçası önbellekte OLMAZDI ve çevrimdışı
   açılamazdı.
   ÇÖZÜM: derleme sonunda bütün /assets dosyalarının listesi `dist/varlik-
   listesi.json`a yazılıyor; sw.js kurulumda bu listeyi okuyup hepsini önden
   önbelleğe alıyor. İndirilen veri miktarı eskisiyle aynı (eskiden de hepsi
   iniyordu) ama artık AYRIŞTIRILMIYOR — telefon yalnız açılan sayfanın kodunu
   işliyor.
   `writeBundle`: çıktı diske yazıldıktan sonra, CSS dahil her dosya kesinleşmiş
   hâlde. Yalnız `vite build`de çalışır; geliştirme sunucusunu etkilemez. */
function varlikListesi() {
  return {
    name: 'vukuf-varlik-listesi',
    apply: 'build',
    enforce: 'post',
    writeBundle(secenek, paket) {
      const dosyalar = Object.keys(paket)
        .filter(ad => ad.startsWith('assets/'))
        .map(ad => '/' + ad)
        .sort()
      writeFileSync(
        join(secenek.dir, 'varlik-listesi.json'),
        JSON.stringify({ olusturma: new Date().toISOString(), dosyalar }, null, 1),
      )
    },
  }
}

export default defineConfig({
  plugins: [react(), varlikListesi()],
  base: '/',
  server: {
    host: '0.0.0.0',
    port: 5173,
    strictPort: false,
  },
})
