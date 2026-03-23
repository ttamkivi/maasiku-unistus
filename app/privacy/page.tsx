import Link from 'next/link';

function Section({ number, title, children }: { number: number; title: string; children: React.ReactNode }) {
  return (
    <section style={{ borderBottom: '1px solid #DAD0A1', paddingBottom: 24 }}>
      <div style={{ borderLeft: '4px solid #DAD0A1', paddingLeft: 14, marginBottom: 12 }}>
        <h2 style={{ fontWeight: 700, color: '#1C2832', fontSize: 16, margin: 0 }}>
          {number}. {title}
        </h2>
      </div>
      <div style={{ fontSize: 14, color: '#1C2832', lineHeight: 1.75 }}>
        {children}
      </div>
    </section>
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

export default function PrivacyPage() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, paddingBottom: 48 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <Link href="/" style={{ color: '#1C2832', fontSize: 13, textDecoration: 'none', fontWeight: 600, opacity: 0.6 }}>← Tagasi</Link>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: '#1C2832', margin: 0 }}>Privaatsuspoliitika</h1>
      </div>

      <div style={{ background: '#F8F3DA', padding: '12px 16px', borderLeft: '4px solid #DAD0A1' }}>
        <p style={{ fontSize: 13, color: '#1C2832', margin: 0, lineHeight: 1.6 }}>
          Viimati uuendatud: <strong>23.03.2026</strong>. See privaatsuspoliitika kirjeldab, kuidas OÜ Susilaane töötleb isikuandmeid Maasiku Unistuse teenuse raames.
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 24, background: '#fff', border: '1px solid #DAD0A1', padding: '24px 28px' }}>

        <Section number={1} title="Vastutav töötleja">
          <p style={{ margin: 0 }}>
            <strong>OÜ Susilaane</strong><br />
            E-post: <a href="mailto:taavi.tamkivi@gmail.com" style={{ color: '#1C2832', textDecoration: 'underline' }}>taavi.tamkivi@gmail.com</a><br />
            Telefon: +372 56634636
          </p>
          <p style={{ marginTop: 10 }}>
            Isikuandmete kaitsega seotud küsimuste ja päringutega pöörduge ülaltoodud e-posti aadressil.
          </p>
        </Section>

        <Section number={2} title="Milliseid andmeid töödeldakse">
          <p style={{ margin: 0, marginBottom: 8 }}>Töötleme järgmisi isikuandmeid:</p>
          <BulletList items={[
            <><strong>Kasutajakonto andmed:</strong> nimi, e-posti aadress, krüpteeritud parool, kasutajaroll (õpetaja/õpilane/lapsevanem).</>,
            <><strong>Seanssiandmed:</strong> autentimistoken küpsisena, seansi aegumisaeg.</>,
            <><strong>Kontrolltööde fotod:</strong> üleslaaditud pildid (base64 formaadis), mis võivad sisaldada õpilase nime, käekirja ja vastuseid. Fotod salvestatakse meie andmebaasi ning kustutatakse automaatselt pärast seda, kui õpetaja on tulemuse kinnitanud (APPROVED / SHARED staatus).</>,
            <><strong>AI-genereeritud tagasiside:</strong> kontrolltöö analüüsi tulemused salvestatakse andmebaasi (rawFeedback, editedFeedback väljad) ja kustutatakse automaatselt 13 kuud pärast jagamist. <strong>Tähtis:</strong> enne Anthropic API-le saatmist asendatakse õpilase nimi pseudonüümiga „Õpilane&quot; — pärisnimi ei lahku meie serverist.</>,
            <><strong>Nõusolekuandmed:</strong> lapsevanema antud AI-analüüsi nõusolekud koos kuupäeva, e-posti aadressi ja IP-aadressiga (audit trail GDPR tõendamiseks).</>,
            <><strong>Audit-logi kirjed:</strong> kasutajate toimingud (sisselogimine, tulemuste kinnitamine, andmete eksport/kustutamine) säilitatakse 90 päeva.</>,
            <><strong>Küpsiste nõusolek:</strong> nõusoleku aeg ja kasutaja ID (kui sisselogitud).</>,
            <><strong>Tagasiside arendajale (vabatahtlik):</strong> tüüp, kirjeldus, e-posti aadress vastuse jaoks.</>,
          ]} />
        </Section>

        <Section number={3} title="Töötlemise eesmärgid">
          <BulletList items={[
            'Kasutajakonto haldamine ja autentimine.',
            'Kontrolltöödele isikustatud hariduslike tagasiside genereerimine AI abil.',
            'Teenuse turvalisuse tagamine ja väärkasutuse ennetamine.',
            'Seadusest tulenevate kohustuste täitmine.',
            'Teenuse arendamine kasutajate tagasiside põhjal.',
          ]} />
        </Section>

        <Section number={4} title="Töötlemise õiguslik alus">
          <BulletList items={[
            <><strong>GDPR art 6(1)(a) — Nõusolek:</strong> küpsiste kasutamiseks, vabatahtlike andmete töötlemiseks ning alaealiste õpilaste kontrolltööde AI-analüüsimiseks (lapsevanema kirjalik nõusolek).</>,
            <><strong>GDPR art 6(1)(b) — Lepingu täitmine:</strong> kasutajakonto loomine ja teenuse osutamine.</>,
            <><strong>GDPR art 6(1)(e) — Avaliku ülesande täitmine:</strong> riikliku õppekava raames hariduslike eesmärkide toetamine (PGS alusel).</>,
            <><strong>GDPR art 6(1)(f) — Õigustatud huvi:</strong> teenuse turvalisuse tagamine, pettuste ennetamine ja audit-logi säilitamine.</>,
            <><strong>GDPR art 9 ei kohaldu:</strong> töötlemise käigus ei koguta eriliiki isikuandmeid (terviseandmeid, biomeetrilisi andmeid vms).</>,
          ]} />
        </Section>

        <Section number={5} title="Andmete säilitamine">
          <BulletList items={[
            <><strong>Kasutajakonto:</strong> kuni konto kustutamise taotluseni. Kustutamisel anonümiseeritakse nimi ja e-post (kirje säilib audit-logi viidete jaoks).</>,
            <><strong>Seanssiandmed:</strong> 30 päeva, seejärel automaatne kustutamine. Aegunud seansid kustutatakse igaöise cronjobiga 7-päevase järelannetähtajaga.</>,
            <><strong>Kontrolltööde fotod (base64):</strong> kustutatakse automaatselt, kui tulemus saab staatuse APPROVED, SHARED või ARCHIVED. Maksimaalne säilitusaeg on seega üks õppeaasta.</>,
            <><strong>AI-genereeritud tagasiside tekst:</strong> kustutatakse automaatselt 13 kuud pärast jagamist (ligikaudselt: jooksev õppeaasta + 1 kuu).</>,
            <><strong>Nõusolekuandmed:</strong> kustutatakse koos lapse profiiliga (konto kustutamisel).</>,
            <><strong>Audit-logi kirjed:</strong> 90 päeva, seejärel automaatne kustutamine.</>,
            <><strong>Küpsiste nõusolek:</strong> 12 kuud.</>,
          ]} />
        </Section>

        <Section number={6} title="Kolmandad osapooled">
          <p style={{ margin: '0 0 8px 0' }}>Edastame andmeid ainult järgmistele partneritele teenuse osutamiseks:</p>
          <BulletList items={[
            <><strong>Anthropic (Claude API):</strong> kontrolltööde fotod saadetakse analüüsimiseks. Enne saatmist pseudonümiseeritakse õpilase nimi — Anthropic API ei saa pärisnime. Anthropic ei kasuta API andmeid mudelite treenimiseks (API kasutustingimuste §4 kohaselt). Andmeedastus USA-sse toimub EL–USA andmekaitse raamistiku alusel. Pseudonümiseerimine rakendab GDPR art 25 (lõimitud andmekaitse) nõuet minimeerida isikuandmete edastamist kolmandatele osapooltele.</>,
            <><strong>Vercel:</strong> hosting ja serveritaristu (Euroopa piirkond).</>,
          ]} />
          <p style={{ marginTop: 10, margin: '10px 0 0 0' }}>
            Andmeid ei jagata turunduslikel eesmärkidel ega müüda kolmandatele osapooltele.
          </p>
        </Section>

        <Section number={7} title="Teie õigused">
          <p style={{ margin: '0 0 8px 0' }}>GDPR alusel on teil järgmised õigused:</p>
          <BulletList items={[
            <><strong>Juurdepääsu õigus (art 15):</strong> saate küsida, milliseid andmeid teie kohta töödeldakse. Sisselogitud kasutajad saavad oma andmed alla laadida otse oma profiililehelt (JSON-formaadis).</>,
            <><strong>Parandamise õigus (art 16):</strong> saate lasta oma andmeid parandada.</>,
            <><strong>Kustutamise õigus (art 17):</strong> saate nõuda oma andmete kustutamist (&quot;õigus olla unustatud&quot;). Sisselogitud kasutajad saavad konto kustutamise käivitada otse oma profiililehelt.</>,
            <><strong>Töötlemise piiramise õigus (art 18):</strong> teatud juhtudel saate töötlemist piirata.</>,
            <><strong>Nõusoleku tagasivõtmine:</strong> lapsevanemad saavad AI-analüüsi nõusoleku igal ajal tühistada oma profiililehel. Nõusoleku tagasivõtmine ei mõjuta enne tühistamist toimunud töötlust.</>,
            <><strong>Andmete ülekandmise õigus (art 20):</strong> saate oma andmed masinloetavas formaadis kätte (JSON allalaadimine profiililehel).</>,
            <><strong>Vastuväite esitamise õigus (art 21):</strong> saate esitada vastuväite õigustatud huvi alusel töötlemisele.</>,
          ]} />
          <p style={{ marginTop: 12, margin: '12px 0 0 0' }}>
            Õiguste kasutamiseks kirjutage:{' '}
            <a href="mailto:taavi.tamkivi@gmail.com" style={{ color: '#1C2832', textDecoration: 'underline' }}>
              taavi.tamkivi@gmail.com
            </a>
            . Vastame 30 päeva jooksul.
          </p>
          <p style={{ marginTop: 8, margin: '8px 0 0 0' }}>
            Kui leiate, et teie andmete töötlemine rikub teie õigusi, on teil õigus esitada kaebus{' '}
            <a href="https://www.aki.ee" target="_blank" rel="noopener noreferrer" style={{ color: '#1C2832', textDecoration: 'underline' }}>
              Andmekaitse Inspektsioonile (aki.ee)
            </a>.
          </p>
        </Section>

        <Section number={8} title="Küpsised">
          <p style={{ margin: 0 }}>
            Kasutame ainult seansi haldamiseks vajalikke küpsiseid (<code>mu_session</code>). Need on funktsionaalsed küpsised, mis on vajalikud teenuse toimimiseks. Jälgimisküpsiseid ega reklaamiküpsiseid ei kasutata.
          </p>
          <p style={{ marginTop: 8, margin: '8px 0 0 0' }}>
            Küpsise sisu on krüpteeritud autentimistoken; see ei sisalda isikuandmeid otse.
          </p>
        </Section>

        <Section number={9} title="Kontakt ja päringud">
          <p style={{ margin: 0 }}>
            Privaatsusküsimuste, andmetega tutvumise taotluste ja kustutamistaotluste jaoks:
          </p>
          <p style={{ marginTop: 8, margin: '8px 0 0 0' }}>
            <strong>E-post:</strong>{' '}
            <a href="mailto:taavi.tamkivi@gmail.com" style={{ color: '#1C2832', textDecoration: 'underline' }}>
              taavi.tamkivi@gmail.com
            </a>
            <br />
            <strong>Telefon:</strong> +372 56634636
          </p>
        </Section>

      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
        <p style={{ fontSize: 13, color: '#1C2832', margin: 0, opacity: 0.65 }}>
          Viimati uuendatud: 23.03.2026
        </p>
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
          <Link
            href="/privacy/parent-letter"
            style={{ fontSize: 13, color: '#1C2832', fontWeight: 600, textDecoration: 'underline' }}
          >
            Lapsevanema teavituskiri →
          </Link>
          <Link
            href="/legal"
            style={{ fontSize: 13, color: '#1C2832', fontWeight: 600, textDecoration: 'underline' }}
          >
            Õiguslik teave →
          </Link>
        </div>
      </div>
    </div>
  );
}
