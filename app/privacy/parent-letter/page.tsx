import Link from 'next/link';
import PrintButton from './PrintButton';

export const metadata = {
  title: 'Lapsevanema teavitusleping — Õpetaja Tagasiside',
  description: 'Koolile saadetav kiri lapsevanematele AI-põhise tagasiside nõusoleku kohta',
};

export default function ParentLetterPage() {
  return (
    <div style={{ maxWidth: 720, margin: '0 auto', paddingBottom: 64 }}>
      {/* Nav */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <Link href="/privacy" style={{ color: '#1C2832', fontSize: 13, textDecoration: 'none', fontWeight: 600, opacity: 0.6 }}>
          ← Privaatsuspoliitika
        </Link>
      </div>

      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: '#1C2832', margin: 0 }}>
          Koolile saadetav lapsevanema teavituskiri
        </h1>
        <p style={{ fontSize: 13, color: '#1C2832', opacity: 0.65, marginTop: 8, lineHeight: 1.6 }}>
          Kopeeri allolev tekst kooli kirjaplangile või e-kirjasse. Täida koolitusse lisatavad väljad (märgitud nurksulgudes). Kiri vastab GDPR art 13 ja isikuandmete kaitse seaduse §18 nõuetele.
        </p>
      </div>

      {/* Buttons */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 32, flexWrap: 'wrap' }}>
        <PrintButton />
        <Link
          href="/privacy"
          style={{
            display: 'inline-block',
            fontSize: 13,
            fontWeight: 600,
            color: '#1C2832',
            background: '#F8F3DA',
            border: '1.5px solid #DAD0A1',
            padding: '8px 16px',
            borderRadius: 5,
            textDecoration: 'none',
          }}
        >
          Täielik privaatsuspoliitika →
        </Link>
      </div>

      {/* The letter itself */}
      <div
        id="parent-letter"
        style={{
          background: '#fff',
          border: '1.5px solid #DAD0A1',
          borderRadius: 6,
          padding: '40px 48px',
          fontSize: 14,
          lineHeight: 1.85,
          color: '#1C2832',
        }}
      >
        {/* School header placeholder */}
        <div style={{ borderBottom: '1px solid #DAD0A1', paddingBottom: 20, marginBottom: 28, opacity: 0.5, fontSize: 13 }}>
          [KOOLI LOGO JA KONTAKTANDMED]
        </div>

        <p style={{ marginBottom: 20 }}>
          <strong>Lugupeetud lapsevanem,</strong>
        </p>

        <p style={{ marginBottom: 16 }}>
          Meie kool kasutab õpilaste kontrolltöödele individuaalse tagasiside koostamiseks veebiteenust <strong>Õpetaja Tagasiside</strong> (maasiku-unistus.vercel.app), mida arendab OÜ Susilaane (edaspidi <em>teenusepakkuja</em>).
        </p>

        <p style={{ marginBottom: 16 }}>
          Kirjutame teile, et selgitada, kuidas teenus töötab, milliseid andmeid töödeldakse ning küsida teie nõusolekut oma lapse kontrolltööde analüüsimiseks tehisintellekti (AI) abil.
        </p>

        <h2 style={{ fontSize: 15, fontWeight: 700, marginTop: 28, marginBottom: 10 }}>1. Mida teenus teeb?</h2>
        <p style={{ marginBottom: 16 }}>
          Õpetaja pildistab või skannib õpilase täidetud kontrolltöö ning laeb selle Õpetaja Tagasisidee süsteemi. Süsteem saadab pildi Anthropic Claude AI-le, mis genereerib üksikasjaliku tagasiside: mis läks hästi, mis vajab harjutamist ja mida soovitame edasi teha.
        </p>
        <p style={{ marginBottom: 16 }}>
          Enne pildi saatmist <strong>asendatakse õpilase nimi automaatselt pseudonüümiga „Õpilane&quot;</strong> — pärisnimi ei lahku meie serverist. Anthropic ei saa teada, kelle töö see on.
        </p>
        <p style={{ marginBottom: 16 }}>
          Õpetaja vaatab AI-tagasiside üle, teeb vajadusel muudatusi ning jagab lõpliku tulemuse ainult siis, kui ta sellega nõustub. <strong>Otsuse teeb alati õpetaja, mitte masin.</strong>
        </p>

        <h2 style={{ fontSize: 15, fontWeight: 700, marginTop: 28, marginBottom: 10 }}>2. Milliseid andmeid kogutakse?</h2>
        <ul style={{ paddingLeft: 20, margin: '0 0 16px 0', display: 'flex', flexDirection: 'column', gap: 8 }}>
          <li><strong>Kontrolltöö foto</strong> — õpilase käekiri ja vastused. Foto salvestatakse ajutiselt ning kustutatakse automaatselt kohe, kui õpetaja on tulemuse kinnitanud.</li>
          <li><strong>AI-genereeritud tagasisidetekst</strong> — säilitatakse kuni 13 kuud pärast jagamist, seejärel kustutatakse automaatselt.</li>
          <li><strong>Nõusoleku tõend</strong> — teie antud nõusoleku kuupäev ja e-posti aadress säilitatakse GDPR kohustuste täitmiseks kuni konto kustutamiseni.</li>
        </ul>
        <p style={{ marginBottom: 16 }}>
          Andmeid <strong>ei jagata</strong> kolmandate osapooltega peale Anthropic Claude API (analüüsimine) ja Vercel (serveritaristu Euroopas). Andmeid ei müüda ega kasutata reklaamiks.
        </p>

        <h2 style={{ fontSize: 15, fontWeight: 700, marginTop: 28, marginBottom: 10 }}>3. Mis on töötlemise õiguslik alus?</h2>
        <p style={{ marginBottom: 16 }}>
          Kuna teie laps on alaealine, on AI-analüüsi kasutamise õiguslikuks aluseks <strong>lapsevanema nõusolek (GDPR art 6(1)(a))</strong>. Nõusolek on vabatahtlik — selle andmata jätmine ei mõjuta hinde saamist ega kooli osalemist.
        </p>

        <h2 style={{ fontSize: 15, fontWeight: 700, marginTop: 28, marginBottom: 10 }}>4. Teie õigused</h2>
        <p style={{ marginBottom: 8 }}>Teil on igal ajal õigus:</p>
        <ul style={{ paddingLeft: 20, margin: '0 0 16px 0', display: 'flex', flexDirection: 'column', gap: 8 }}>
          <li><strong>Nõusolek tühistada</strong> — misjärel blokeeritakse kõik edasised AI-analüüsid teie lapse tööde jaoks kohe. Juba tehtud analüüse see tagasiulatuvalt ei mõjuta.</li>
          <li><strong>Andmetega tutvuda</strong> — küsida, milliseid andmeid teie lapse kohta hoitakse.</li>
          <li><strong>Kustutamist nõuda</strong> — nõuda kõigi isikuandmete kustutamist (nn õigus olla unustatud).</li>
          <li><strong>Andmed alla laadida</strong> — saada kõik andmed masinloetavas JSON-formaadis.</li>
        </ul>
        <p style={{ marginBottom: 16 }}>
          Õiguste kasutamiseks kirjutage koolile (<strong>[KOOLI E-POST]</strong>) või otse teenusepakkujale:{' '}
          <strong>taavi.tamkivi@gmail.com</strong>. Logitud lapsevanemad saavad nõusoleku tühistada ja andmed alla laadida iseseisvalt aadressil{' '}
          <strong>maasiku-unistus.vercel.app/dashboard/parent</strong>.
        </p>
        <p style={{ marginBottom: 16 }}>
          Kui leiate, et teie andmete töötlemine rikub teie õigusi, on teil õigus esitada kaebus Andmekaitse Inspektsioonile (aki.ee).
        </p>

        <h2 style={{ fontSize: 15, fontWeight: 700, marginTop: 28, marginBottom: 10 }}>5. Nõusoleku avaldus</h2>
        <div style={{
          background: '#F8F3DA',
          border: '1.5px solid #DAD0A1',
          borderRadius: 5,
          padding: '20px 22px',
          marginBottom: 24,
        }}>
          <p style={{ marginBottom: 12, fontWeight: 600 }}>
            Palun täita ja tagastada klassijuhatajale hiljemalt <strong>[KUUPÄEV]</strong>.
          </p>
          <p style={{ marginBottom: 20 }}>
            Annan nõusoleku, et minu lapse <strong>________________________</strong> (nimi) kontrolltöid analüüsitakse Õpetaja Tagasisidee AI-süsteemi abil, tuginedes eespool kirjeldatud tingimustele.
          </p>
          <div style={{ display: 'flex', gap: 40, marginBottom: 20 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 15 }}>
              <input type="checkbox" style={{ width: 18, height: 18, accentColor: '#1C2832' }} />
              <strong>JAH, annan nõusoleku</strong>
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 15 }}>
              <input type="checkbox" style={{ width: 18, height: 18, accentColor: '#1C2832' }} />
              <strong>EI, ei anna nõusolekut</strong>
            </label>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
            <div>
              <div style={{ fontSize: 12, opacity: 0.6, marginBottom: 4 }}>Lapsevanema nimi</div>
              <div style={{ borderBottom: '1.5px solid #1C2832', paddingBottom: 4, minHeight: 28 }}></div>
            </div>
            <div>
              <div style={{ fontSize: 12, opacity: 0.6, marginBottom: 4 }}>Allkiri ja kuupäev</div>
              <div style={{ borderBottom: '1.5px solid #1C2832', paddingBottom: 4, minHeight: 28 }}></div>
            </div>
          </div>
        </div>

        <p style={{ fontSize: 12, color: '#1C2832', opacity: 0.55, marginTop: 24, borderTop: '1px solid #DAD0A1', paddingTop: 16 }}>
          Täielik privaatsuspoliitika: maasiku-unistus.vercel.app/privacy · Teenusepakkuja: OÜ Susilaane · taavi.tamkivi@gmail.com · +372 56634636
        </p>
      </div>

      {/* Print styles — injected at page level */}
      <style>{`
        @media print {
          nav, header, footer, [data-noprint], .no-print { display: none !important; }
          body { background: white !important; }
          #parent-letter {
            border: none !important;
            padding: 0 !important;
            box-shadow: none !important;
          }
        }
      `}</style>
    </div>
  );
}
