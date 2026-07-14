// src/data/kuran.js
import sureler from "./kuran.json"

export { sureler }

export function sureGetir(sureNo) {
  return sureler.find(s => s.id === sureNo) || null
}

export function ayetGetir(sureNo, ayetNo) {
  const sure = sureGetir(sureNo)
  return sure?.ayetler.find(a => a.no === ayetNo) || null
}

export function tumSureler() {
  return sureler.map(s => ({
    id: s.id,
    isim: s.isim,
    isimArapca: s.isimArapca,
    anlam: s.anlam,
    yer: s.yer,
    ayetSayisi: s.ayetSayisi,
  }))
}