import json, re

def normalize(k):
    k = re.sub(r'[\u0610-\u061A\u064B-\u065F\u0640\u0670\u06D6-\u06DC\u06DF-\u06E4\u06E7\u06E8\u06EA-\u06ED\u06E1\u08D0-\u08D6\u0615\u0617]', '', k)
    k = re.sub(r'[\u0671\u0622\u0623\u0625]', '\u0627', k)
    return k.strip()

def eslesir_ayet(yeni_kel, eski_kel):
    yn = [(k['id'], normalize(k['arabic'])) for k in yeni_kel]
    es = [(k['id'], normalize(k['arabic'])) for k in eski_kel]
    result = {}

    yi = 0
    ei = 0

    while yi < len(yn):
        if ei >= len(es):
            result[yn[yi][0]] = es[-1][0]
            yi += 1
            continue

        yn_buf = ''
        es_buf = ''
        yn_idx = yi
        es_idx = ei
        eslesti = False

        while yn_idx < len(yn) or es_idx < len(es):
            if len(yn_buf) <= len(es_buf):
                if yn_idx < len(yn):
                    yn_buf += yn[yn_idx][1]
                    yn_idx += 1
                else:
                    es_buf += es[es_idx][1]
                    es_idx += 1
                    continue
            else:
                if es_idx < len(es):
                    es_buf += es[es_idx][1]
                    es_idx += 1
                else:
                    yn_buf += yn[yn_idx][1]
                    yn_idx += 1
                    continue

            if yn_buf == es_buf:
                eski_map_id = es[ei][0]
                for j in range(yi, yn_idx):
                    result[yn[j][0]] = eski_map_id
                yi = yn_idx
                ei = es_idx
                eslesti = True
                break

            # Aşırı büyüme durumunda dur
            if len(yn_buf) > 50 or len(es_buf) > 50:
                break

        if not eslesti:
            result[yn[yi][0]] = es[ei][0]
            yi += 1
            ei += 1

    return result

with open('/home/hosgoer/Projeler/vukuf/public/Yedek/kuran-mushaf.json', encoding='utf-8') as f:
    eski = json.load(f)
with open('/home/hosgoer/Projeler/vukuf/public/kuran-mushaf.json', encoding='utf-8') as f:
    yeni = json.load(f)

mapping = {}
hata = 0

for si, sure in enumerate(yeni):
    for ai, ayet in enumerate(sure['ayetler']):
        yeni_kel = ayet['kelimeler']
        try:
            eski_kel = eski[si]['ayetler'][ai]['kelimeler']
        except IndexError:
            hata += 1
            continue
        sonuc = eslesir_ayet(yeni_kel, eski_kel)
        mapping.update(sonuc)

print(f'Mapping: {len(mapping):,} kelime')
print(f'Hata: {hata}')

print('\nNeml 29:')
for k in yeni[26]['ayetler'][28]['kelimeler']:
    print(f'  {k["id"]} -> {mapping.get(k["id"], "YOK")}')

print('\nBakara 40:')
for k in yeni[1]['ayetler'][39]['kelimeler']:
    print(f'  {k["id"]} -> {mapping.get(k["id"], "YOK")}')

with open('/home/hosgoer/Projeler/vukuf/src/data/kelime-mapping.json', 'w', encoding='utf-8') as f:
    json.dump(mapping, f, ensure_ascii=False, separators=(',',':'))
print('\nKaydedildi.')