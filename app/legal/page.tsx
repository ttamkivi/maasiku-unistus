import Link from 'next/link';

function SectionCard({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        background: '#fff',
        border: '1px solid #DAD0A1',
        borderLeft: '4px solid #DAD0A1',
        padding: '20px 24px',
      }}
    >
      {children}
    </div>
  );
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2
      style={{
        fontWeight: 700,
        color: '#1C2832',
        fontSize: 16,
        marginBottom: 12,
        marginTop: 0,
      }}
    >
      {children}
    </h2>
  );
}

function Para({ children }: { children: React.ReactNode }) {
  return (
    <p style={{ fontSize: 14, color: '#1C2832', lineHeight: 1.75, marginTop: 8 }}>
      {children}
    </p>
  );
}

function BulletList({ items }: { items: React.ReactNode[] }) {
  return (
    <ul style={{ display: 'flex', flexDirection: 'column', gap: 6, margin: '8px 0 0 0', padding: 0 }}>
      {items.map((item, i) => (
        <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 14, color: '#1C2832', lineHeight: 1.6, listStyle: 'none' }}>
          <span style={{ color: '#DAD0A1', flexShrink: 0, fontWeight: 700, marginTop: 1 }}>•</span>
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

export default function LegalPage() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, paddingBottom: 48 }}>
      {/* Page header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <Link href="/" style={{ color: '#1C2832', fontSize: 13, textDecoration: 'none', fontWeight: 600, opacity: 0.6 }}>← Tagasi</Link>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: '#1C2832', margin: 0 }}>
          Õiguslik teave
        </h1>
      </div>

      <div style={{ background: '#F8F3DA', padding: '12px 16px', borderLeft: '4px solid #DAD0A1' }}>
        <p style={{ fontSize: 13, color: '#1C2832', margin: 0, lineHeight: 1.6 }}>
          See leht sisaldab Maasiku Unistuse teenuse kasutamise õiguslikku teavet, andmekaitsepõhimõtteid ning turvalisuse kirjeldust.
        </p>
      </div>

      {/* 1. Teenuse omanik */}
      <SectionCard>
        <SectionHeading>1. Teenuse omanik</SectionHeading>
        <Para>
          Teenust haldab ja arendab:
        </Para>
        <BulletList items={[
          <><strong>Ettevõte:</strong> OÜ Susilaane</>,
<><strong>E-post:</strong> <a href="mailto:taavi.tamkivi@gmail.com" style={{ color: '#1C2832', textDecoration: 'underline' }}>taavi.tamkivi@gmail.com</a></>,
          <><strong>Telefon:</strong> +372 56634636</>,
        ]} />
      </SectionCard>

      {/* 2. Kasutustingimused */}
      <SectionCard>
        <SectionHeading>2. Kasutustingimused</SectionHeading>
        <Para>
          Maasiku Unistuse kasutamisega nõustute järgmiste tingimustega:
        </Para>
        <p style={{ fontSize: 14, fontWeight: 600, color: '#1C2832', marginTop: 14, marginBottom: 4 }}>Lubatud kasutus:</p>
        <BulletList items={[
          'Teenust võivad kasutada õpetajad füüsika kontrolltööde isikustatud tagasiside genereerimiseks.',
          'Üles laadida võib kuni 8 lehekülge ühe kontrolltöö kohta.',
          'Genereeritud tagasisidet võib kasutada hariduslikel eesmärkidel ja edastada lapsevanemale või õpilasele.',
          'Alla laadida ja välja printida tagasisidet .docx formaadis.',
        ]} />
        <p style={{ fontSize: 14, fontWeight: 600, color: '#1C2832', marginTop: 14, marginBottom: 4 }}>Keelatud kasutus:</p>
        <BulletList items={[
          'Ei tohi töödelda õpilaste andmeid ilma lapsevanema teadliku nõusolekuta.',
          'Ei tohi kasutada AI-genereeritud tagasisidet lõpliku ametliku hindena ilma õpetaja ülevaatuseta.',
          'Ei tohi jagada genereeritud tagasisidet kolmandate osapooltega ilma lapsevanemate loata.',
          'Ei tohi laadida üles fotosid, mis sisaldavad teiste isikute isikuandmeid.',
          'Ei tohi kasutada teenust ärilise suuremahulise töötluse eesmärgil ilma eraldi litsentsita.',
          'Ei tohi pöördprojekteerida, kopeerida ega taaskasutada rakenduse lähtekoodi ärilistel eesmärkidel.',
        ]} />
      </SectionCard>

      {/* 3. Andmekaitse (GDPR) */}
      <SectionCard>
        <SectionHeading>3. Andmekaitse (GDPR)</SectionHeading>
        <p style={{ fontSize: 14, fontWeight: 600, color: '#1C2832', marginTop: 0, marginBottom: 4 }}>Kogutavad andmed:</p>
        <BulletList items={[
          'Kasutajakonto andmed: nimi, e-posti aadress, parool (krüpteeritud).',
          'Seanssiandmed: autentimisküpsised seansi haldamiseks.',
          'Üleslaaditud kontrolltööde fotod — töödeldakse mälus ja edastatakse Anthropic Claude API-le; serverisse ei salvestata.',
          'Küpsiste nõusolek (timestamp, kasutaja ID kui sisselogitud).',
          'Tagasiside arendajale (vabatahtlik): tüüp, sõnum, e-post.',
        ]} />
        <p style={{ fontSize: 14, fontWeight: 600, color: '#1C2832', marginTop: 14, marginBottom: 4 }}>Töötlemise õiguslik alus (GDPR art 6):</p>
        <BulletList items={[
          <><strong>Art 6(1)(a) — Nõusolek:</strong> küpsiste ja vabatahtlike andmete töötlemiseks.</>,
          <><strong>Art 6(1)(b) — Lepingu täitmine:</strong> kasutajakonto ja teenuse osutamiseks.</>,
          <><strong>Art 6(1)(e) — Avaliku ülesande täitmine:</strong> riikliku õppekava raames hariduslike eesmärkide toetamiseks.</>,
        ]} />
        <p style={{ fontSize: 14, fontWeight: 600, color: '#1C2832', marginTop: 14, marginBottom: 4 }}>Andmete säilitamine:</p>
        <BulletList items={[
          'Kasutajakonto andmed: kuni konto kustutamiseni.',
          'Seanssiandmed: 30 päeva.',
          'Kontrolltööde fotod: ei salvestata — töödeldakse ainult mälus API kõne ajal (~15–45 sek).',
          'Genereeritud tagasiside: ei salvestata serveris, edastatakse brauserisse.',
          <>Muud andmed: vaikimisi <strong>12 kuud</strong>, pärast mida kustutatakse automaatselt.</>,
        ]} />
        <p style={{ fontSize: 14, fontWeight: 600, color: '#1C2832', marginTop: 14, marginBottom: 4 }}>Teie õigused:</p>
        <BulletList items={[
          'Õigus tutvuda oma andmetega (GDPR art 15).',
          'Õigus andmete parandamisele (art 16).',
          'Õigus andmete kustutamisele ehk "õigus olla unustatud" (art 17).',
          'Õigus andmete ülekandmisele (art 20).',
          'Õigus esitada kaebus Andmekaitse Inspektsioonile (aki.ee).',
        ]} />
      </SectionCard>

      {/* 4. Turvalisus */}
      <SectionCard>
        <SectionHeading>4. Turvalisus</SectionHeading>
        <BulletList items={[
          <><strong>Krüpteerimine transiidis:</strong> kogu andmeedastus toimub HTTPS/TLS 1.3 protokolliga.</>,
          <><strong>Andmebaas:</strong> SQLite kasutajakontode haldamiseks juurdepääsukontrollidega; fotosid ega tagasisideid ei salvestata.</>,
          <><strong>Serveripoolsed API võtmed:</strong> Anthropic API võtmed on ainult serveripool ning kliendikoodile ligipääsmatud.</>,
          <><strong>Kolmandate osapooltega jagamine:</strong> andmeid ei jagata kolmandate osapooltega ilma teie nõusolekuta, välja arvatud Anthropic Claude API, mis on vajalik põhifunktsionaalsuse jaoks.</>,
          <><strong>Juurdepääsu kontroll:</strong> seansipõhine autentimine kõigi kaitstud ressursside jaoks.</>,
        ]} />
      </SectionCard>

      {/* 5. AI kasutamine */}
      <SectionCard>
        <SectionHeading>5. AI kasutamine</SectionHeading>
        <Para>
          Kontrolltööde fotod edastatakse analüüsimiseks <strong>Anthropic Claude API</strong>-le järgmistel tingimustel:
        </Para>
        <BulletList items={[
          'Anthropic ei kasuta API kaudu saadetud andmeid oma mudelite treenimiseks (vt Anthropic kasutuspoliitika).',
          'Fotod töödeldakse transientselt — neid ei salvestata Anthropici serverites pärast töötlemise lõppu.',
          'Andmeedastus USA-sse toimub EL–USA andmekaitse raamistiku (Data Privacy Framework) alusel.',
          'AI-genereeritud tagasiside on abivahend, mitte ametlik hinnang. Õpetaja vastutab sisu ülevaatamise eest enne edastamist.',
          'Vastavalt EL AI seadusele (2024/1689) peavad õpilased teadma, et tagasiside on AI-genereeritud.',
        ]} />
        <div style={{ background: '#F8F3DA', padding: '10px 14px', borderLeft: '3px solid #DAD0A1', marginTop: 12 }}>
          <p style={{ fontSize: 13, color: '#1C2832', margin: 0, lineHeight: 1.6 }}>
            <strong>Oluline:</strong> AI-genereeritud tagasiside ei asenda õpetaja professionaalset hinnangut. Õpetaja peab tagasiside üle vaatama enne selle õpilasele edastamist.
          </p>
        </div>
      </SectionCard>

      {/* 6. Kehtivad seadused */}
      <SectionCard>
        <SectionHeading>6. Kehtivad seadused</SectionHeading>
        <Para>Teenuse osutamisel järgime järgmisi õigusakte:</Para>
        <BulletList items={[
          <><strong>Isikuandmete kaitse üldmäärus (GDPR)</strong> — Euroopa Parlamendi ja nõukogu määrus (EL) 2016/679, 27. aprill 2016.</>,
          <><strong>Isikuandmete kaitse seadus (IKS) 2018</strong> — Eesti siseriiklik seadus (RT I, 04.01.2019, 11), mis rakendab GDPRi Eestis.</>,
          <><strong>Põhikooli- ja gümnaasiumiseadus (PGS)</strong> — reguleerib õpilaste andmete töötlemist haridusasutuses ja õpetajate kohustusi.</>,
          <><strong>EL tehisintellekti määrus (AI Act)</strong> — Euroopa Parlamendi ja nõukogu määrus (EL) 2024/1689 kõrge riskiga AI kasutuse kohta haridussektoris.</>,
        ]} />
      </SectionCard>

      {/* Last updated */}
      <div style={{ background: '#F8F3DA', padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
        <p style={{ fontSize: 13, color: '#1C2832', margin: 0, opacity: 0.75 }}>
          Viimati uuendatud: 22.03.2026
        </p>
        <Link
          href="/privacy"
          style={{ fontSize: 13, color: '#1C2832', fontWeight: 600, textDecoration: 'underline' }}
        >
          Loe privaatsuspoliitikat →
        </Link>
      </div>
    </div>
  );
}
