/* VUKUF — MUSHAF VERİSİNİN TEMBEL YÜKLEYİCİSİ
 s rc/data/mushafVerisi.js                *

 `kuran-mushaf.json` 5 MB. Ses indirme bölümü, hıfz ilerleme haritası gibi
 YAN ekranlar da bu veriye ihtiyaç duyuyor ama uygulama açılışında lazım değil.
 Yükleyici burada TEK KOPYA duruyor: her modül kendi `fetch`ini yazsaydı aynı
 5 MB iki kez inip bellekte iki kez dururdu. Servis işçisi zaten önbelleğe
 aldığı için ikinci çağrı anında dönüyor. */

let bellek = null
let istek = null

export async function mushafYukle() {
    if (bellek) return bellek
        // Aynı anda iki çağrı gelirse İKİ İSTEK ATILMASIN: uçuştaki söz paylaşılıyor.
        if (!istek) {
            istek = fetch("/kuran-mushaf.json")
            .then(y => {
                if (!y.ok) throw new Error("Mushaf verisi alınamadı")
                    return y.json()
            })
            .then(v => { bellek = v; istek = null; return v })
            .catch(e => { istek = null; throw e })
        }
        return istek
}

export const mushafHazirMi = () => !!bellek
