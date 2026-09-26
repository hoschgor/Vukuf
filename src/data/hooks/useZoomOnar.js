/* VUKUF — KLAVYE YAKINLAŞMASINI GERİ ALMA
 *  src/data/hooks/useZoomOnar.js
 *
 *  SORUN: iOS Safari, yazı boyutu 16px'in ALTINDA olan bir input/textarea'ya
 *  odaklanınca sayfayı kendiliğinden yakınlaştırıyor (klavye açılırken "zoom in").
 *  Yazı bitip alan odaktan çıkınca GERİ AÇMIYOR — sayfa büyümüş kalıyor.
 *
 *  ── ESKİ ÇÖZÜM NEDEN ÇALIŞMIYORDU ──────────────────────────────────────────
 *  KuranOkuma ve OkumaEkrani'nda `ZOOM_SIFIRLA` adında bir efekt vardı ve iki
 *  sebeple bu sorunu HİÇ çözemezdi:
 *    1) Bayrağı `false` idi, yani tamamen kapalıydı (ekran döndürmeyi bozduğu
 *       için kapatılmıştı).
 *    2) Açık olsa da çözemezdi: `visualViewport` 'resize' olayında "pencere
 *       ölçüsü değiştiyse bu pinch değildir, karışma" diye bir kapı vardı.
 *       KLAVYE AÇILIŞI TAM OLARAK PENCERE ÖLÇÜSÜNÜ DEĞİŞTİRİR. Yani klavyeden
 *       gelen yakınlaşma her seferinde o kapıdan elenirdi.
 *  Ayrıca eski kod meta etiketini sabit bir metne geri yazıyordu ve o metinde
 *  `viewport-fit=cover` YOKTU — çentik yerleşimini bozacak bir yan etki.
 *
 *  ── YENİ YAKLAŞIM: ÖNCE ÖNLE, GEREKİRSE ONAR ───────────────────────────────
 *  (1) ÖNLEME (asıl çözüm): alana dokunulduğu anda, yazı boyutu 16px'in
 *      altındaysa geçici olarak 16px'e çıkarılıyor. iOS yakınlaştırma kararını
 *      ODAKLANMA ANINDA veriyor; 16px gördüğünde hiç yakınlaştırmıyor. Alan
 *      odaktan çıkınca boyut aynen geri konuyor.
 *      Not: bu iş STİL SAYFASIYLA yapılamaz — bu projedeki inputların yazı
 *      boyutu SATIR İÇİ (inline) stille veriliyor, stil sayfası onu ezemez.
 *  (2) ONARIM (yedek): buna rağmen yakınlaşma olduysa (ör. kullanıcı parmakla
 *      pinch yaptı) alan odaktan çıkarken meta etiketine kısa bir süre
 *      `maximum-scale=1` EKLENİYOR ve hemen geri alınıyor. Eklenerek yazıldığı
 *      için `viewport-fit=cover` gibi mevcut ayarlar korunuyor.
 *
 *  Dönme sırasında hiç karışmıyor (`kilitRef`), çünkü iOS'ta dönme anında meta
 *  etiketine yazmak yerleşimi eski genişlikte donduruyor — projenin bilinen
 *  tuzağı bu. */

import { useEffect } from "react"

const META_SEC = 'meta[name="viewport"]'

const ALAN_SEC = [
    'input:not([type="checkbox"]):not([type="radio"]):not([type="range"])',
    'input:not([type="button"]):not([type="submit"]):not([type="reset"])',
    "textarea",
"select",
'[contenteditable="true"]',
].join(",")

const alanMi = (el) => !!(el && el.matches && el.matches(ALAN_SEC))

export default function useZoomOnar({ etkin = true, kilitRef = null } = {}) {
    useEffect(() => {
        if (!etkin) return
            if (typeof window === "undefined" || !window.visualViewport) return
                // Yalnız dokunmatik: fareli ortamda ne klavye yakınlaşması var ne de
                // meta etiketine dokunmanın bir faydası.
                try { if (!window.matchMedia("(pointer: coarse)").matches) return } catch { return }

                const gorunum = window.visualViewport
                // Geçici olarak büyütülen alanların ESKİ satır içi değeri burada duruyor.
                // WeakMap: boş metin ("") de geçerli bir eski değer olduğu için dataset ile
                // "var mı yok mu" ayrımı yapılamıyordu.
                const eskiBoy = new WeakMap()

                const buyut = (el) => {
                    if (!alanMi(el) || eskiBoy.has(el)) return
                        let boy = 16
                        try { boy = parseFloat(window.getComputedStyle(el).fontSize) || 16 } catch { return }
                        if (boy >= 16) return                       // iOS bunu yakınlaştırmıyor
                            eskiBoy.set(el, el.style.fontSize || "")
                            el.style.fontSize = "16px"
                }

                const geriKoy = (el) => {
                    if (!el || !eskiBoy.has(el)) return
                        el.style.fontSize = eskiBoy.get(el)
                        eskiBoy.delete(el)
                }

                /* Meta etiketine KISA SÜRELİ `maximum-scale=1` — yakınlaşmayı 1'e çeker.
                 *      Kalıcı bırakılmıyor: kalıcı olsa parmakla yakınlaştırma tamamen ölür ve
                 *      dönmede yerleşim donar. */
                const olcegiGeriCek = () => {
                    const meta = document.querySelector(META_SEC)
                    if (!meta) return
                        const asil = meta.content
                        if (/maximum-scale/.test(asil)) return      // zaten kilitli, karışma
                            meta.content = `${asil}, maximum-scale=1.0`
                            setTimeout(() => { meta.content = asil }, 120)
                }

                let zamanlayici = 0

                const dokunuldu = (e) => {
                    const el = e.target
                    if (alanMi(el)) buyut(el)
                }

                const odaklandi = (e) => {
                    if (zamanlayici) { clearTimeout(zamanlayici); zamanlayici = 0 }
                    buyut(e.target)
                }

                const odakBirakti = (e) => {
                    const el = e.target
                    if (!alanMi(el)) return
                        if (zamanlayici) clearTimeout(zamanlayici)
                            // Bir alandan diğerine geçişte (ör. arama → not) araya girmiyoruz:
                            // 260 ms sonra hâlâ bir yazı alanı odaktaysa yazma sürüyor demektir.
                            zamanlayici = setTimeout(() => {
                                zamanlayici = 0
                                geriKoy(el)
                                if (alanMi(document.activeElement)) return
                                    if (kilitRef && kilitRef.current) return          // ekran dönüyor
                                        if (gorunum.scale <= 1.02) return                 // zaten yakınlaşma yok
                                            olcegiGeriCek()
                            }, 260)
                }

                // Yakalama (capture) aşaması: odaklanma gerçekleşmeden önce boyutu
                // büyütebilmek için pointerdown da dinleniyor.
                document.addEventListener("pointerdown", dokunuldu, true)
                document.addEventListener("focusin", odaklandi, true)
                document.addEventListener("focusout", odakBirakti, true)
                return () => {
                    if (zamanlayici) clearTimeout(zamanlayici)
                        document.removeEventListener("pointerdown", dokunuldu, true)
                        document.removeEventListener("focusin", odaklandi, true)
                        document.removeEventListener("focusout", odakBirakti, true)
                }
    }, [etkin, kilitRef])
}
