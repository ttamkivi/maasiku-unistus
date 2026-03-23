import { FeedbackData } from './types';

export const demoData: FeedbackData[] = [
  {
    "test_info": {
      "title": "Tunnikontroll II",
      "topic": "Laineoptika",
      "class": "12. klass",
      "score": "62 punkti",
      "student": "Otto",
      "course": "F7 — Võnkumised ja lained"
    },
    "mis_laks_hasti": [
      {
        "title": "Valguse murdumise arvutused",
        "text": "Sa oskasid murdumisseadust (sinα/sinγ = n₂/n₁) korrektselt rakendada ja tegid murdumisnurga arvutuse õigesti, sealhulgas kriitilise nurga leidmise. See näitab, et Sa mõistad, kuidas valgus käitub kahe keskkonna piirpinnal — see on laineoptika üks põhialuseid."
      },
      {
        "title": "Läätsevalemi kasutamine (ül. 15)",
        "text": "See oli kontrolltöö kõige keerulisem arvutusülesanne — Sa pidid üles seadma ruutvõrrandi ja lahendama selle korrektselt. Sa said sellega väga hästi hakkama: D = 10 dpt, leidsid mõlemad kujutise kaugused ja tegid ka õige järelduse, et üks kujutis on tõeline ja teine näiv. See on tugev matemaatiline ja füüsikaline arusaam."
      },
      {
        "title": "Murdumisnäitaja mõistmine",
        "text": "Sa teadsid, et absoluutne murdumisnäitaja näitab, mitu korda on valguse kiirus vaakumis suurem kui aines — see on oluline kontseptuaalne alus kogu optika jaoks."
      },
      {
        "title": "Seisulaine joonis (ül. 13)",
        "text": "Sa joonistasid seisulaine korrektse mustri, näidates sõlmi ja kõhtusid. Samuti selgitasid seisulaine tekkimise mehhanismi."
      }
    ],
    "mida_parandada": [
      {
        "title": "Valikvastuste vead (ül. 1–7)",
        "text": "Mitmes valikvastuses olid vastused ebatäpsed. Valikvastused nõuavad, et Sa loeksid iga varianti hoolikalt ja kaaluksid, kas see sobib täielikult, mitte ainult osaliselt.\n\nSoovitus: Loe iga vastusevariant eraldi läbi ja küsi endalt: kas see on alati tõene? Sageli on üks vastusevariant \"peaaegu õige\" — see on tavaliselt vale vastus, sest füüsikas loeb täpsus."
      },
      {
        "title": "Interferentsi ja difraktsiooni arvutused (ül. 9–10)",
        "text": "Interferentsi tingimustes läksid valemid segamini. Maksimumi tingimus: Δ = kλ, miinimumi tingimus: Δ = (2k+1)λ/2.\n\nSoovitus: Õpi need kaks valemit paarisena. Meelespidamiseks: maksimumis on lihtsalt kλ (terve arv lainepikkusi — lained tugevdavad), miinimumis on pool lainepikkust rohkem."
      },
      {
        "title": "Lainepikkuse arvutused (ül. 11)",
        "text": "Valem v = fλ on õige, aga kui sagedus on megahertsides (MHz), tuleb see enne arvutamist hertsidesse teisendada. Sa kirjutasid 40 MHz, aga arvutuses kasutasid 40 ilma teisendamata.\n\nSoovitus: Kirjuta ühikud alati välja iga arvu kõrval. Kui näed \"MHz\", teisenda kohe: 40 MHz = 40 × 10⁶ Hz."
      },
      {
        "title": "Huygensi-Fresneli printsiibi selgitus (ül. 14)",
        "text": "Tekstiline selgitus jäi liiga lühikeseks. Küsimus palus Huygensi-Fresneli printsiibi abil selgitamist — tuleb mainida sekundaarseid laineallikaid lainepinnal.\n\nSoovitus: Kasuta alati sõnu \"elementaarlained\", \"lainefront\" ja \"ümbrik\" — need on märksõnad, mis näitavad õiget printsiipi."
      }
    ],
    "uldine_muster": "Sinu töös on selge muster: arvutusülesanded on Sinu tugev pool, eriti keerulisemad ülesanded nagu läätsevalemi ruutvõrrandi lahendamine. Nõrgem pool on kontseptuaalsed küsimused ja teoreetilised selgitused — valikvastustes ja kirjeldavates vastustes, kus tuleb kasutada täpseid füüsikalisi termineid.",
    "soovitused": [
      {
        "title": "Interferentsi ja difraktsiooni valemite kordamine",
        "text": "Koosta endale üks A4 leht, kuhu kirjutad kõik interferentsi ja difraktsiooni valemid koos lühikese selgitusega, millal millist kasutada."
      },
      {
        "title": "Huygensi-Fresneli printsiip vajab süvendamist",
        "text": "See printsiip ühendab kõik lainenähtused — peegeldumine, murdumine, difraktsioon. Kui Sa mõistad seda ühte printsiipi hästi, saad sellega selgitada pea kõiki optilisi nähtusi."
      },
      {
        "title": "Ühikud, ühikud, ühikud",
        "text": "Kirjuta iga arvu kõrvale ühik — alati. Eriti ohtlikud on eesliited: mega (10⁶), kilo (10³), nano (10⁻⁹). Üks hea harjumus: tee arvutuse alguses kohe kõik SI põhiühikutesse."
      }
    ],
    "pilk_ettepoole": "Järgmine kursus on F8 — Kvantoptika ja aatomi- ning tuumafüüsika. Seal on fotoefekt, mille puhul on väga oluline eristada valguse laine- ja osakese-omadusi. Kui Sa praegu kinnistaksid valguse dualismi olemuse, annab see F8 kursuses tugeva eelise. Samuti tulevad kasuks Sinu head arvutusoskused — Einsteini fotoefekti valem nõuab täpselt samasugust arvutuskäiku, mida Sa läätsevalemi juures juba hästi oskad.",
    "markmed_opetajale": "Õpilane sai 62 punkti, mis on keskmine tulemus. Tugevuseks on arvutusoskused — eriti keerulisem läätsevalemi ülesanne, mis nõuab ruutvõrrandi lahendamist. Peamised puudujäägid on kontseptuaalses mõistmises: valikvastustes tehti mitu viga. Soovitus: selle õpilasega tasub teha lisatööd kontseptuaalsete küsimuste osas — paluda tal selgitada füüsikalisi nähtusi oma sõnadega, ilma valemiteta."
  },
  {
    "test_info": {
      "title": "Kontrolltöö nr 1",
      "topic": "Soojusõpetus",
      "class": "9. klass",
      "score": "Hinne A",
      "student": "Jaan",
      "course": "Põhikool — Soojusõpetus"
    },
    "mis_laks_hasti": [
      {
        "title": "Soojushulga valem Q = cmΔt",
        "text": "Sa kasutad seda valemit enesekindlalt ja oskad selle ümber kirjutada nii erisoojuse kui ka temperatuurimuutuse leidmiseks. See on soojusõpetuse kõige olulisem valem ja Sa valdad seda hästi."
      },
      {
        "title": "Kütteväärtuse arvutus (ül. 11)",
        "text": "Diislikütuse ülesandes pidid Sa kõigepealt liitritest kilogrammidesse teisendama (kasutades tihedust) ja seejärel arvutama eraldunud soojushulga valemiga Q = qm. Sa tegid mõlemad sammud korrektselt."
      },
      {
        "title": "Kalorimeetria ülesanded (ül. 12–13)",
        "text": "Sa proovisid lahendada ka kontrolltöö kõige keerulisemaid ülesandeid, kus tuleb rakendada soojusliku tasakaalu põhimõtet. Sa kirjutasid välja mõlema keha soojushulgad ja seadsid need võrdseks — see lähenemine on täpselt õige."
      },
      {
        "title": "Arvutuskäigu põhjalikkus",
        "text": "Sa kirjutad alati välja antud suurused, valemi ja arvutuskäigu. See on väga hea harjumus, mis aitab ka keerulisemate ülesannete puhul."
      }
    ],
    "mida_parandada": [
      {
        "title": "Aine olekute omadused (ül. 1)",
        "text": "Tabelis läksid mõned omadused sassi. Peamine erinevus vedela ja gaasi vahel: vedelal on kindel ruumala, gaasil ei ole.\n\nSoovitus: Mõtle nii — kui valad vee klaasi, jääb veetase kindlale kõrgusele (kindel ruumala). Aga kui avad gaasipudeli, levib gaas kogu ruumi (pole kindlat ruumala)."
      },
      {
        "title": "Soojuspaisumise selgitus (ül. 3)",
        "text": "Selgitus jäi lühikeseks. Õige vastus peab sisaldama: kõrgemal temperatuuril liiguvad aineosakesed kiiremini, nende võnkeamplituud kasvab ja osakesed vajavad rohkem ruumi.\n\nSoovitus: Kasuta alati kolmeosalist selgitust: põhjus → mehhanism → tulemus."
      },
      {
        "title": "Soojusülekande liigid",
        "text": "Kolme liigi eristamine tekitas ebakindlust. Soojusjuhtivus = osakesed ei liigu, ainult energia kandub edasi. Konvektsioon = aine ise liigub. Kiirgus = ainet pole vajagi.\n\nSoovitus: Küsi iga olukorra kohta: kas aine liigub? Kas osakesed annavad energiat edasi? Kas soojus tuleb kaugemalt ilma aineta?"
      },
      {
        "title": "Kalorimeetria faasiüleminekud (ül. 12–13)",
        "text": "Kui keha läbib faasiüleminekut (nt jää → vesi), tuleb soojushulka arvutada kahes osas: esmalt sulamissoojus (Q = λm) ja seejärel vee soojenemine (Q = cmΔt).\n\nSoovitus: Joonista endale \"soojuse teekond\" — iga nool = eraldi arvutus. See aitab ühtegi etappi mitte vahele jätta."
      }
    ],
    "uldine_muster": "Hinne A räägib enda eest — Sa said selle kontrolltööga väga hästi hakkama. Sinu arvutusoskus on tugev. Parandamise koht on kontseptuaalsed küsimused ja selgitused — aine olekute omadused ja soojusülekande liigid. Need teadmised on Sul tegelikult olemas, sa pead lihtsalt harjutama neid täpsemalt sõnastama.",
    "soovitused": [
      {
        "title": "Tee endale spikker aine kolme oleku kohta",
        "text": "Kolm tulpa: tahke, vedel, gaas. Iga tulba alla: kuju, ruumala, kokkusurutavus, voolamine, osakeste liikumine."
      },
      {
        "title": "Harjuta kontseptuaalset selgitamist",
        "text": "Võta iga soojusnähtus ja selgita seda 2–3 lausega, kasutades sõnu \"aineosakesed\", \"liikumine\", \"energia\"."
      },
      {
        "title": "Kalorimeetria: joonista alati \"soojuse teekond\"",
        "text": "Iga etapi jaoks on oma valem: Q = cmΔt (soojenemine/jahtumine), Q = λm (sulamine/tahkumine), Q = Lm (aurustumine/kondenseerumine)."
      }
    ],
    "pilk_ettepoole": "Järgmine suur teema 9. klassis on elektriõpetus. Seal tulevad uued valemid (Ohmi seadus, jada- ja rööpühendus), aga lähenemine on sarnane: antud suurused → valem → arvutus → vastus. Sinu tugev arvutusoskus tuleb seal väga kasuks. Soojusõpetuse ja elektriõpetuse ühendab Joule'i-Lenzi seadus (Q = I²Rt).",
    "markmed_opetajale": "Õpilane sai hinde A, tugev sooritus. Arvutusoskused väga head. Peamine arendamise koht on kontseptuaalne mõistmine: aine olekute tabel sisaldas vigu ja soojuspaisumise selgitus jäi lühike. Soovitus: paluda tal selgitada iga nähtust aineosakeste abil — see arendab sügavamat mõistmist."
  },
  {
    "test_info": {
      "title": "Kontrolltöö nr 3",
      "topic": "Elektriõpetus — alused",
      "class": "9. klass",
      "score": null,
      "student": "Jaan",
      "course": "Põhikool — Elektriõpetus"
    },
    "mis_laks_hasti": [
      {
        "title": "Laetud kehade vastastikmõju (ül. 6)",
        "text": "Sa tead, et ühenimelised laengud tõukuvad ja erinimelised tõmbuvad. Joonistel märkisid Sa jõusuunad õigesti. See on elektriõpetuse kõige põhilisem reegel ja Sa valdad seda kindlalt."
      },
      {
        "title": "Elektrilaengu arvutus (ül. 9)",
        "text": "Sa arvutasid elektronide kogulaengu valemiga q = ne. See nõuab korrektselt töötamist väga suurte ja väga väikeste arvudega — ja Sa said sellega hakkama."
      },
      {
        "title": "Elektriskeemide joonistamine (ül. 15–17)",
        "text": "Sa joonistasid mitu vooluringi skeemi, mis sisaldasid patareid, lülitit, lampi, takistit ja mõõteseadmeid. Põhistruktuur oli õige."
      },
      {
        "title": "Mõõteseadmete näitude lugemine (ül. 12)",
        "text": "Sa lugesid ampermeetri skaalalt näidu, määrasid jaotise väärtuse ja leidsid voolutugevuse. See praktiline oskus on oluline."
      }
    ],
    "mida_parandada": [
      {
        "title": "Juht ja isolaator — täpsem klassifitseerimine (ül. 7–8)",
        "text": "Juht on aine, milles on vabu laengukandjaid. Isolaator (dielektrik) on aine, milles vabu laengukandjaid praktiliselt ei ole.\n\nSoovitus: Metallid on alati juhid, plastid ja klaas on alati isolaatorid. Erijuht: puhas vesi on isolaator, aga kraanivesi on juht (sisaldab ioone)."
      },
      {
        "title": "Elektriskeemide detailid (ül. 15–17)",
        "text": "Ampermeeter peab olema jadamisi, voltmeeter rööbiti, lüliti peab olema peavooluringis.\n\nSoovitus: Pärast skeemi joonistamist tee \"sõrmetesti\" — jälgi sõrmega vooluringi mööda. Kui ring on katkestatud, siis vool ei saa voolata."
      },
      {
        "title": "Voolutugevuse ja laengu seosed (ül. 13–14)",
        "text": "Valem q = It: laeng = voolutugevus korda aeg. Voolutugevus 1A tähendab, et iga sekundi jooksul läbib juhi ristlõiget 1 kulon laengut.\n\nSoovitus: Alusta lihtsatest arvudest ja kontrolli, kas vastus tundub mõistlik."
      },
      {
        "title": "Astendajatega arvutused (ül. 19–20)",
        "text": "Kümne astmetega arvutamine nõuab hoolikust. Kirjuta kõik arvud kümne astmetesse: 30 000 000 000 = 3 × 10¹⁰. Siis korruta eraldi arvud ja eraldi astmed.\n\nSoovitus: Harjuta \"eraldi korrutamist\" — see muudab astendajatega töö automaatseks."
      }
    ],
    "uldine_muster": "Elektriõpetuse põhimõisted on paigas: laeng, vool, pinge, juht ja isolaator. Keerulisemad kohad on elektriskeemide detailid (mõõteseadmete paigutamine) ja arvutused väga suurte/väikeste arvudega (astendajad).",
    "soovitused": [
      {
        "title": "Joonista iga päev üks elektriskeem",
        "text": "Leiuta ise vooluringe: 2 lampi jadamisi, 3 lampi rööbiti, lüliti mis kustutab ainult ühe lambi. Kontrolli \"sõrmetestiga\"."
      },
      {
        "title": "Harjuta kümne astmetega arvutamist",
        "text": "2 × 10³ × 3 × 10⁴ = 6 × 10⁷. Kui see läheb automaatseks, ei teki enam probleeme elementaarlaengu arvutustega."
      },
      {
        "title": "Õpi pähe kolm põhilist valemit",
        "text": "q = ne (laeng), I = q/t (voolutugevus), U = A/q (pinge). Need kolm katavad kõik elektriõpetuse alguse arvutused."
      }
    ],
    "pilk_ettepoole": "Järgmine samm on Ohmi seadus ja jada- ning rööpühendus. Valem I = U/R ühendab voolutugevuse, pinge ja takistuse. Sinu praegune hea arusaam voolutugevusest ja pingest on oluline eeldus. Skeemide joonistamise oskus tuleb samuti väga kasuks.",
    "markmed_opetajale": "Põhimõisted on paigas. Peamised puudujäägid: juhtide/isolaatorite klassifitseerimine, skeemide mõõteseadmete paigutamine, ja astendajatega arvutamine. Soovitus: anda 3–4 skeemiharjutust ja harjutada astendajatega arvutamist eraldi enne Ohmi seaduse juurde minekut."
  },
  {
    "test_info": {
      "title": "Kontrolltöö",
      "topic": "Ohmi seadus, jada- ja rööpühendus",
      "class": "9. klass",
      "score": null,
      "student": "Jaan",
      "course": "Põhikool — Elektriõpetus"
    },
    "mis_laks_hasti": [
      {
        "title": "Ohmi seaduse põhivalem",
        "text": "Sa tead, et I = U/R, ja oskad seda ümber kirjutada nii pinge kui ka takistuse leidmiseks. See on kogu elektriõpetuse alus ja Sa kasutad seda enesekindlalt."
      },
      {
        "title": "Eritakistuse valem (ül. 2)",
        "text": "Sa teadsid, et R = ρl/S ja oskasid selle ümber kirjutada pikkuse leidmiseks. See näitab, et Sa mõistad, kuidas juhi materjal, pikkus ja ristlõikepindala mõjutavad takistust."
      },
      {
        "title": "Skeemide lugemine",
        "text": "Sa oskad elektriskeemilt eristada, millised takistid on jadaühenduses ja millised rööpühenduses."
      },
      {
        "title": "Arvutuskäigu üleskirjutamine",
        "text": "Sa kirjutad valemid välja, asetad arvud sisse ja jõuad vastuseni samm-sammult. Isegi kui vastuses tekib viga, näeb õpetaja, kus Sa mõtled õigesti."
      }
    ],
    "mida_parandada": [
      {
        "title": "Jada- ja rööpühenduse reeglid (ül. 1)",
        "text": "Mõned reeglid läksid omavahel sassi. Jadaühendus: I = I₁ = I₂, U = U₁ + U₂, R = R₁ + R₂. Rööpühendus: U = U₁ = U₂, I = I₁ + I₂, 1/R = 1/R₁ + 1/R₂.\n\nSoovitus: Jadaühendus on nagu üks pikk toru — vool ei saa kuskilt juurde tulla. Rööpühendus on nagu teehark — surve on mõlemas harus sama, aga vool jaguneb."
      },
      {
        "title": "Kogutakistuse arvutamine liitahelates (ül. 3–4)",
        "text": "Ülesannetes, kus ahel sisaldab nii jada- kui rööpühendust korraga, tuli ülesanne lahendada sammhaaval: kõigepealt rööpühenduse kogutakistus, siis liita jadaühenduses.\n\nSoovitus: Märgi skeemile rööpühendused, arvuta nende takistus eraldi, asenda ühe takistiga. Nüüd on lihtsam jadaühendus."
      },
      {
        "title": "Pinge ja voolutugevuse leidmine liitahelas (ül. 5–6)",
        "text": "Kui kogutakistus jäi valeks, kandsid kõik järgnevad arvutused selle vea edasi.\n\nSoovitus: Kasuta kolmesammulist lahenduskäiku: (1) leia kogutakistus, (2) leia kogu voolutugevus I = U/R, (3) leia iga haru pinge/vool. Kontrolli ühikud igal sammul."
      },
      {
        "title": "Mõõteseadmete ühendamine skeemil",
        "text": "Ampermeeter jadamisi (mõõdab voolutugevust), voltmeeter rööbiti (mõõdab pinget kahe punkti vahel).\n\nSoovitus: Kui näed A-tähega seadet, küsi: millist voolutugevust see mõõdab? Kui V-tähega, küsi: millise elemendi otstest see pinget mõõdab?"
      }
    ],
    "uldine_muster": "Põhivalemid on paigas ja arvutuskäik on loogiline. Nõrgem pool on jada- ja rööpühenduse reeglite täpne eristamine ning nende rakendamine liitahelates. Üksikuid valemeid Sa tead, aga kui tuleb mitu asja korraga kokku panna, tekivad vead. See on täiesti normaalne 9. klassi tasemel.",
    "soovitused": [
      {
        "title": "Koosta endale A4 spikker jada- vs rööpühenduse reeglitest",
        "text": "Pane kõrvuti: vasakule jadaühendus, paremale rööpühendus. Kasuta värve — roheline voolutugevuse jaoks, sinine pinge jaoks, punane takistuse jaoks."
      },
      {
        "title": "Harjuta liitahelate lahendamist sammhaaval",
        "text": "Iga kord, kui lahendad liitahelat, joonista iga sammu järel ahel ümber — asenda rööpühendus ühe takistiga, kuni järele jääb lihtne jadaühendus."
      },
      {
        "title": "Kontrolli vastuseid terve mõistusega",
        "text": "Rööpühenduse kogutakistus peab olema väiksem kui kõige väiksem üksik takistus — alati! Jadaühenduse oma peab olema suurem."
      },
      {
        "title": "Ühikud iga arvu juurde",
        "text": "Kirjuta alati ühik arvu kõrvale: Ω, V, A, mm², Ω·mm²/m. Eriti oluline eritakistuse ülesannetes."
      }
    ],
    "pilk_ettepoole": "Järgmine teema on elektrivoolu töö ja võimsus (A = IUt ja N = IU). Need valemid ehitavad otse Ohmi seaduse peale. Samuti tulevad Joule'i-Lenzi seadus (Q = I²Rt) ja elektriohutuse teemad — praktilised ülesanded, kus Sinu hea arvutusoskus tuleb väga kasuks.",
    "markmed_opetajale": "Ohmi seaduse põhivalem ja eritakistuse valem on paigas. Nõrkus on jada- ja rööpühenduse reeglite eristamine, mis kandub edasi liitahelate ülesannetesse. Soovitus: harjutada liitahelate \"lahtivõtmist\" visuaalselt, ja anda kontseptuaalseid harjutusi (ilma arvutusteta) reeglite kinnistamiseks."
  }
];
