# AGENTS.md

## Projekti kontekst

See on spec-driven prototüüp. Projekti eesmärk, sihtrühm ja skoop tulevad `docs/` kaustas olevast knowledge base'ist.

Codexi roll on ehitada täpselt seda, mis on dokumenteeritud. Kui dokumentatsioon on ebaselge või vastuoluline, tuleb enne koodi muutmist küsida täpsustust või uuendada spec'i.

## Knowledge base

Enne koodimuudatusi loe vajadusel neid faile:

- `docs/konstitutsioon.md` - miks me seda ehitame, kelle jaoks ja milliste edu kriteeriumidega.
- `docs/spec.md` - mida lahendus kasutaja vaates teeb ja mida see teadlikult ei tee.
- `docs/prd.md` - kontrollitav nõuete nimekiri koos staatustega.
- `docs/ehituslogi.md` - juba tehtud otsused, kompromissid ja avastused.

Kui mõni fail puudub, aita see enne ehitamist luua.

## Spec-driven tööloogika

Töö käib kolmes faasis:

1. Defineeri: täpsusta probleem, sihtrühm, kontekst, põhimõtted ja edu kriteeriumid.
2. Spetsifitseeri: kirjelda kasutajalood, funktsionaalsus, piirangud ja visuaalne visioon.
3. Ehita: realiseeri üks kasutajalugu või nõue korraga.

Ära hüppa otse ehitusse, kui `konstitutsioon.md`, `spec.md` või `prd.md` ei anna piisavat konteksti.

## Codexi tööpõhimõtted

- Ehita üks kasutajalugu või PRD nõue korraga.
- Kontrolli enne ehitamist `docs/prd.md`, et sama nõuet ei ehitataks uuesti.
- Kui nõue on valmis, uuenda `docs/prd.md` staatust.
- Kui ehitamise käigus tekib uus otsus, piirang või skoopimuutus, uuenda enne jätkamist `docs/spec.md` või `docs/ehituslogi.md`.
- Kui kasutaja palub midagi, mis läheb spec'iga vastuollu, too vastuolu selgelt välja ja küsi kinnitust.
- Hoia lahendus prototüübile sobivalt lihtne. Ära lisa keerukat arhitektuuri, kui spec seda ei nõua.
- Kasutajale nähtav funktsionaalsus peab lähtuma edu kriteeriumidest, mitte tehnilisest mugavusest.

## PRD reegel

`docs/prd.md` on projekti tööjärjekord. Iga nõue peab olema konkreetne ja kontrollitav.

Soovituslik formaat:

- `[ ] F1: Kasutaja saab ...`
- `[x] F2: Süsteem teeb ... - seotud fail: src/...`
- `[ ] N1: Liides töötab mobiilis alates 360px laiusest`

Pärast iga valmis ehitatud nõuet märgi see tehtuks ja lisa vajadusel viide seotud failile.

## Definition of Done

Muudatus on valmis ainult siis, kui:

- see vastab `docs/spec.md` kirjeldatud kasutajaloole või nõudele;
- `docs/prd.md` staatus on uuendatud;
- olulised otsused või kompromissid on lisatud `docs/ehituslogi.md`;
- lahendus töötab projekti olemasoleva käivitus- ja testimisviisi järgi;
- kasutajale nähtav käitumine ei lähe vastuollu konstitutsiooni edu kriteeriumidega;
- Codex on kasutajalt küsinud, kas tulemus vastab ootusele, ja kasutaja on selle kinnitanud.

Kui kasutaja ei kinnita tulemust, käsitle tagasisidet uue iteratsioonina: uuenda vajadusel spec'i, PRD-d või ehituslogi ning jätka parandustega.

## Kui kontekst on puudulik

Kui dokumentatsioon puudub või on liiga üldine, ära leiuta vaikimisi kogu toodet valmis. Küsi täpsustust või paku minimaalne järgmine dokumenteerimissamm.
