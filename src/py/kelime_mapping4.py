import json, re

def normalize(k):
    k = re.sub(r'[\u0610-\u061A\u064B-\u065F\u0640\u0670\u06D6-\u06DC\u06DF-\u06E4\u06E7\u06E8\u06EA-\u06ED\u06E1\u08D0-\u08D6\u0615\u0617]', '', k)
    k = re.sub(r'[\u0671\u0622\u0623\u0625]', '\u0627', k)
    k = re.sub(r'\u0627+', '\u0627', k)
    return k.strip()

def eslesir_ayet(yeni_kel, eski_kel):
    """Diyanet (yeni) kelimelerini Uthmani (eski) kelimelerine hizalar.
    Döner: {yeni_id: eski_id}
    Birden fazla yeni kelime tek eski kelimeye map edilebilir.
    """
    yn = [(k['id'], k['arabic']) for k in yeni_kel]
    es = [(k['id'], k['arabic']) for k in eski_kel]
    result = {}

    yi, ei = 0, 0

    while yi < len(yn) and ei < len(es):
        yn_buf_raw = ''
        es_buf_raw = ''
        yn_idx = yi
        es_idx = ei
        eslesti = False

        while yn_idx < len(yn) or es_idx < len(es):
            if len(normalize(yn_buf_raw)) <= len(normalize(es_buf_raw)):
                if yn_idx < len(yn):
                    yn_buf_raw += yn[yn_idx][1]
                    yn_idx += 1
                else:
                    if es_idx < len(es):
                        es_buf_raw += es[es_idx][1]
                        es_idx += 1
                    else:
                        break
            else:
                if es_idx < len(es):
                    es_buf_raw += es[es_idx][1]
                    es_idx += 1
                else:
                    if yn_idx < len(yn):
                        yn_buf_raw += yn[yn_idx][1]
                        yn_idx += 1
                    else:
                        break

            if normalize(yn_buf_raw) == normalize(es_buf_raw):
                eski_map_id = es[ei][0]
                for j in range(yi, yn_idx):
                    result[yn[j][0]] = eski_map_id
                yi = yn_idx
                ei = es_idx
                eslesti = True
                break

            if len(yn_buf_raw) > 80 or len(es_buf_raw) > 80:
                break

        if not eslesti:
            result[yn[yi][0]] = es[ei][0]
            yi += 1
            ei += 1

    last_es = es[-1][0] if es else None
    while yi < len(yn):
        result[yn[yi][0]] = last_es
        yi += 1

    return result

with open('/home/hosgoer/Projeler/vukuf/public/Yedek/kuran-mushaf.json', encoding='utf-8') as f:
    eski = json.load(f)
with open('/home/hosgoer/Projeler/vukuf/public/Yedek/kuran-mushaf-diyanet.bak.json', encoding='utf-8') as f:
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
