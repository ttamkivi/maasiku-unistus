const { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, LevelFormat, BorderStyle, ShadingType, Table, TableRow, TableCell, WidthType, Header, Footer, PageNumber, PageBreak } = require('docx');
const fs = require('fs');

const border = { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" };
const borders = { top: border, bottom: border, left: border, right: border };
const cellMargins = { top: 80, bottom: 80, left: 120, right: 120 };

const doc = new Document({
  styles: {
    default: { document: { run: { font: "Arial", size: 22 } } },
    paragraphStyles: [
      { id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 36, bold: true, font: "Arial", color: "1A5276" },
        paragraph: { spacing: { before: 360, after: 200 }, outlineLevel: 0 } },
      { id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 28, bold: true, font: "Arial", color: "2E75B6" },
        paragraph: { spacing: { before: 240, after: 120 }, outlineLevel: 1 } },
      { id: "Heading3", name: "Heading 3", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 24, bold: true, font: "Arial", color: "34495E" },
        paragraph: { spacing: { before: 200, after: 100 }, outlineLevel: 2 } },
    ]
  },
  numbering: {
    config: [
      { reference: "steps",
        levels: [{ level: 0, format: LevelFormat.DECIMAL, text: "%1.", alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] },
      { reference: "bullets",
        levels: [{ level: 0, format: LevelFormat.BULLET, text: "\u2022", alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] },
    ]
  },
  sections: [
    {
      properties: {
        page: {
          size: { width: 11906, height: 16838 },
          margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 }
        }
      },
      headers: {
        default: new Header({
          children: [new Paragraph({
            alignment: AlignmentType.RIGHT,
            children: [new TextRun({ text: "Maasiku Unistus \u2014 Pilootjuhend", font: "Arial", size: 18, color: "999999", italics: true })]
          })]
        })
      },
      footers: {
        default: new Footer({
          children: [new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [new TextRun({ text: "Lk ", size: 18, color: "999999" }), new TextRun({ children: [PageNumber.CURRENT], size: 18, color: "999999" })]
          })]
        })
      },
      children: [
        // Title
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 100 },
          children: [new TextRun({ text: "Maasiku Unistus", size: 48, bold: true, font: "Arial", color: "1A5276" })]
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 400 },
          children: [new TextRun({ text: "\u00D5petaja pilootjuhend", size: 32, font: "Arial", color: "2E75B6" })]
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 600 },
          children: [new TextRun({ text: "Tere tulemast! See juhend aitab Sul alustada AI-p\u00F5hise tagasiside andmisega oma \u00F5pilastele.", size: 24, font: "Arial", italics: true })]
        }),

        // Section 1: What is it?
        new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun("Mis see on?")] }),
        new Paragraph({
          spacing: { after: 200 },
          children: [new TextRun("Maasiku Unistus on AI t\u00F6\u00F6riist, mis aitab Sul kontrolllt\u00F6\u00F6de p\u00F5hjal igale \u00F5pilasele personaalset tagasisidet anda. Sa pildistad v\u00F5i skaneerid paberil olevad kontrolllt\u00F6\u00F6d, AI anal\u00FC\u00FCsib need ja koostab igale \u00F5pilasele konstruktiivse tagasiside eesti keeles \u2014 riikliku ainekava j\u00E4rgi.")]
        }),

        // Important box
        new Table({
          width: { size: 9026, type: WidthType.DXA },
          columnWidths: [9026],
          rows: [new TableRow({
            children: [new TableCell({
              borders: { top: { style: BorderStyle.SINGLE, size: 2, color: "2E75B6" }, bottom: { style: BorderStyle.SINGLE, size: 2, color: "2E75B6" }, left: { style: BorderStyle.SINGLE, size: 6, color: "2E75B6" }, right: { style: BorderStyle.SINGLE, size: 2, color: "2E75B6" } },
              shading: { fill: "EBF5FB", type: ShadingType.CLEAR },
              width: { size: 9026, type: WidthType.DXA },
              margins: { top: 120, bottom: 120, left: 200, right: 200 },
              children: [new Paragraph({
                children: [
                  new TextRun({ text: "Oluline: ", bold: true }),
                  new TextRun("AI ei asenda Sind. Sa vaatad iga tagasiside enne jagamist \u00FCle, muudad kui vaja, ja otsustad ise, mida \u00F5pilasele jagada.")
                ]
              })]
            })]
          })]
        }),

        new Paragraph({ spacing: { before: 300 }, children: [] }),

        // Section 2: First steps
        new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun("Esimesed sammud")] }),

        new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("1. Registreeru")] }),
        new Paragraph({ numbering: { reference: "bullets", level: 0 }, children: [new TextRun("Mine rakenduse avalehele")] }),
        new Paragraph({ numbering: { reference: "bullets", level: 0 }, children: [new TextRun({ text: "Vajuta \"Registreeru\"" })] }),
        new Paragraph({ numbering: { reference: "bullets", level: 0 }, children: [new TextRun("Sisesta oma nimi, e-post ja parool (v\u00E4hemalt 8 t\u00E4hem\u00E4rki)")] }),
        new Paragraph({ numbering: { reference: "bullets", level: 0 }, spacing: { after: 200 }, children: [new TextRun("Vali rolliks \u00D5petaja")] }),

        new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("2. Seadistamine (onboarding)")] }),
        new Paragraph({ numbering: { reference: "bullets", level: 0 }, children: [new TextRun("Peale sisselogimist suunatakse Sind seadistamislehele")] }),
        new Paragraph({ numbering: { reference: "bullets", level: 0 }, children: [new TextRun("Vali oma kool ja aine")] }),
        new Paragraph({ numbering: { reference: "bullets", level: 0 }, spacing: { after: 200 }, children: [new TextRun("Lisa oma klass (nt \"9.B\")")] }),

        new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("3. \u00D5pilaste lisamine")] }),
        new Paragraph({ numbering: { reference: "bullets", level: 0 }, children: [new TextRun("Mine \"Minu klass\" lehele")] }),
        new Paragraph({ numbering: { reference: "bullets", level: 0 }, children: [new TextRun("Lisa \u00F5pilased nimekirja (k\u00E4sitsi v\u00F5i impordi)")] }),
        new Paragraph({ numbering: { reference: "bullets", level: 0 }, spacing: { after: 200 }, children: [new TextRun("Iga \u00F5pilase jaoks on vaja lapsevanema n\u00F5usolekut")] }),

        new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("4. Lapsevanema n\u00F5usoleku k\u00FCsimine")] }),
        new Paragraph({ numbering: { reference: "bullets", level: 0 }, children: [new TextRun("Mine \"Lapsevanema load\" lehele")] }),
        new Paragraph({ numbering: { reference: "bullets", level: 0 }, children: [new TextRun("Lisa vanema e-posti aadress iga \u00F5pilase juurde")] }),
        new Paragraph({ numbering: { reference: "bullets", level: 0 }, children: [new TextRun("S\u00FC steem saadab vanemale n\u00F5usolekukirja e-postiga")] }),
        new Paragraph({ numbering: { reference: "bullets", level: 0 }, children: [new TextRun("Vanem saab anda n\u00F5usoleku lingile vajutades")] }),

        // Important consent box
        new Paragraph({ spacing: { before: 100 }, children: [] }),
        new Table({
          width: { size: 9026, type: WidthType.DXA },
          columnWidths: [9026],
          rows: [new TableRow({
            children: [new TableCell({
              borders: { top: { style: BorderStyle.SINGLE, size: 2, color: "E67E22" }, bottom: { style: BorderStyle.SINGLE, size: 2, color: "E67E22" }, left: { style: BorderStyle.SINGLE, size: 6, color: "E67E22" }, right: { style: BorderStyle.SINGLE, size: 2, color: "E67E22" } },
              shading: { fill: "FEF5E7", type: ShadingType.CLEAR },
              width: { size: 9026, type: WidthType.DXA },
              margins: { top: 120, bottom: 120, left: 200, right: 200 },
              children: [new Paragraph({
                children: [
                  new TextRun({ text: "NB: ", bold: true }),
                  new TextRun("AI anal\u00FC\u00FCs t\u00F6\u00F6tab ainult nende \u00F5pilaste jaoks, kelle vanemad on n\u00F5usoleku andnud.")
                ]
              })]
            })]
          })]
        }),

        new Paragraph({ children: [new PageBreak()] }),

        // Section 3: Test analysis step by step
        new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun("Kontrolllt\u00F6\u00F6 anal\u00FC\u00FCs \u2014 samm-sammult")] }),

        new Paragraph({ heading: HeadingLevel.HEADING_3, children: [new TextRun("Samm 1: Loo kontrolllt\u00F6\u00F6")] }),
        new Paragraph({ numbering: { reference: "steps", level: 0 }, children: [new TextRun("Mine \"Kontrolllt\u00F6\u00F6d\" \u2192 \"Uus kontrolllt\u00F6\u00F6\"")] }),
        new Paragraph({ numbering: { reference: "steps", level: 0 }, children: [new TextRun("Sisesta pealkiri (nt \"Mehaanika KT nr 2\") ja vali aine")] }),
        new Paragraph({ numbering: { reference: "steps", level: 0 }, spacing: { after: 200 }, children: [new TextRun("Vajuta \"Loo\"")] }),

        new Paragraph({ heading: HeadingLevel.HEADING_3, children: [new TextRun("Samm 2: Skaneeri t\u00F6\u00F6d")] }),
        new Paragraph({ numbering: { reference: "steps", level: 0 }, children: [new TextRun("Ava oma kontrolllt\u00F6\u00F6 leht")] }),
        new Paragraph({ numbering: { reference: "steps", level: 0 }, children: [new TextRun("Vajuta \"Lae \u00FCles skaneeritud PDF\"")] }),
        new Paragraph({ numbering: { reference: "steps", level: 0 }, children: [new TextRun("Skaneeri k\u00F5ik paberid \u00FChe PDF-ina (nt telefoni skaneerimis\u00E4pp v\u00F5i kooli skanner)")] }),
        new Paragraph({ numbering: { reference: "steps", level: 0 }, spacing: { after: 200 }, children: [new TextRun("Rakendus t\u00FCkeldab PDF-i lehtedeks ja tuvastab \u00F5pilaste nimed automaatselt")] }),

        new Paragraph({ heading: HeadingLevel.HEADING_3, children: [new TextRun("Samm 3: Nimede kinnitamine")] }),
        new Paragraph({ numbering: { reference: "steps", level: 0 }, children: [new TextRun("AI \u00FCritab iga lehe pealt \u00F5pilase nime tuvastada")] }),
        new Paragraph({ numbering: { reference: "steps", level: 0 }, children: [new TextRun("Rohelisega m\u00E4rgitud = kindel tuvastus, kollasega = kahtlane")] }),
        new Paragraph({ numbering: { reference: "steps", level: 0 }, children: [new TextRun("Kontrolli ja paranda kui vaja")] }),
        new Paragraph({ numbering: { reference: "steps", level: 0 }, spacing: { after: 200 }, children: [new TextRun("Vajuta \"Kinnita\"")] }),

        new Paragraph({ heading: HeadingLevel.HEADING_3, children: [new TextRun("Samm 4: AI anal\u00FC\u00FCs")] }),
        new Paragraph({ numbering: { reference: "steps", level: 0 }, children: [new TextRun("Vajuta \"Anal\u00FC\u00FCsi k\u00F5ik\"")] }),
        new Paragraph({ numbering: { reference: "steps", level: 0 }, children: [new TextRun("AI anal\u00FC\u00FCsib iga \u00F5pilase t\u00F6\u00F6d (~30 sekundit t\u00F6\u00F6 kohta)")] }),
        new Paragraph({ numbering: { reference: "steps", level: 0 }, spacing: { after: 200 }, children: [new TextRun("\u00D5pilased, kellel pole n\u00F5usolekut, j\u00E4etakse vahele (n\u00E4ed hoiatust)")] }),

        new Paragraph({ heading: HeadingLevel.HEADING_3, children: [new TextRun("Samm 5: Tagasiside \u00FClevaatus")] }),
        new Paragraph({ numbering: { reference: "steps", level: 0 }, children: [new TextRun("Iga \u00F5pilase tagasiside ilmub olekusse \"Mustand\"")] }),
        new Paragraph({ numbering: { reference: "steps", level: 0 }, children: [new TextRun("Ava tagasiside ja vaata \u00FCle: tugevused, arengukohad, j\u00E4rgmised sammud, m\u00E4rkmed \u00F5petajale")] }),
        new Paragraph({ numbering: { reference: "steps", level: 0 }, children: [new TextRun("Muuda teksti kui vaja")] }),
        new Paragraph({ numbering: { reference: "steps", level: 0 }, spacing: { after: 200 }, children: [new TextRun("Vajuta \"Kinnita\" kui oled rahul")] }),

        new Paragraph({ heading: HeadingLevel.HEADING_3, children: [new TextRun("Samm 6: Jagamine \u00F5pilasega")] }),
        new Paragraph({ numbering: { reference: "bullets", level: 0 }, children: [new TextRun("E-postiga (saadab .docx manusena)")] }),
        new Paragraph({ numbering: { reference: "bullets", level: 0 }, spacing: { after: 200 }, children: [new TextRun("Lingiga (\u00F5pilane n\u00E4eb oma t\u00F6\u00F6laual)")] }),

        // Section 4: What the feedback contains
        new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun("Mida tagasiside sisaldab?")] }),
        new Paragraph({ spacing: { after: 100 }, children: [new TextRun("Iga \u00F5pilane saab personaalse raporti:")] }),

        new Table({
          width: { size: 9026, type: WidthType.DXA },
          columnWidths: [2500, 6526],
          rows: [
            new TableRow({ children: [
              new TableCell({ borders, width: { size: 2500, type: WidthType.DXA }, margins: cellMargins, shading: { fill: "2E75B6", type: ShadingType.CLEAR },
                children: [new Paragraph({ children: [new TextRun({ text: "Osa", bold: true, color: "FFFFFF" })] })] }),
              new TableCell({ borders, width: { size: 6526, type: WidthType.DXA }, margins: cellMargins, shading: { fill: "2E75B6", type: ShadingType.CLEAR },
                children: [new Paragraph({ children: [new TextRun({ text: "Kirjeldus", bold: true, color: "FFFFFF" })] })] }),
            ]}),
            ...([
              ["\u00D5ppe-eesm\u00E4rk", "Mida see kontrolllt\u00F6\u00F6 hindas"],
              ["Tugevused", "Mida sa juba h\u00E4sti tead (konkreetsete n\u00E4idetega t\u00F6\u00F6st)"],
              ["Arengukohad", "Mida parandada, koos veat\u00FC\u00FCbiga (arvutusviga, v\u00E4\u00E4rarusaam, valemisegadus jne)"],
              ["J\u00E4rgmised sammud", "Konkreetsed tegevused, mida homme teha saab"],
              ["\u00D5ppeteekond", "Kuidas see teema seostub j\u00E4rgmiste peat\u00FCkkidega"],
              ["M\u00E4rkmed \u00F5petajale", "Ainult Sulle \u2014 mustrid, t\u00E4helepanekud, soovitused"],
            ].map(([col1, col2], i) => new TableRow({ children: [
              new TableCell({ borders, width: { size: 2500, type: WidthType.DXA }, margins: cellMargins,
                shading: { fill: i % 2 === 0 ? "F8F9FA" : "FFFFFF", type: ShadingType.CLEAR },
                children: [new Paragraph({ children: [new TextRun({ text: col1, bold: true })] })] }),
              new TableCell({ borders, width: { size: 6526, type: WidthType.DXA }, margins: cellMargins,
                shading: { fill: i % 2 === 0 ? "F8F9FA" : "FFFFFF", type: ShadingType.CLEAR },
                children: [new Paragraph({ children: [new TextRun(col2)] })] }),
            ]})))
          ]
        }),

        new Paragraph({ spacing: { before: 200 }, children: [] }),
        new Table({
          width: { size: 9026, type: WidthType.DXA },
          columnWidths: [9026],
          rows: [new TableRow({
            children: [new TableCell({
              borders: { top: { style: BorderStyle.SINGLE, size: 2, color: "27AE60" }, bottom: { style: BorderStyle.SINGLE, size: 2, color: "27AE60" }, left: { style: BorderStyle.SINGLE, size: 6, color: "27AE60" }, right: { style: BorderStyle.SINGLE, size: 2, color: "27AE60" } },
              shading: { fill: "EAFAF1", type: ShadingType.CLEAR },
              width: { size: 9026, type: WidthType.DXA },
              margins: { top: 120, bottom: 120, left: 200, right: 200 },
              children: [new Paragraph({
                children: [
                  new TextRun({ text: "NB: ", bold: true }),
                  new TextRun("Tagasiside ei sisalda hinnet ega v\u00F5rdlust klassikaaslastega. See on teadlik valik \u2014 uuringud n\u00E4itavad, et \u00F5pilased ignoreerivad tagasisidet kui hinne on n\u00E4htav.")
                ]
              })]
            })]
          })]
        }),

        new Paragraph({ children: [new PageBreak()] }),

        // FAQ
        new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun("Sagedased k\u00FCsimused")] }),

        ...([
          ["Kas AI n\u00E4eb \u00F5pilase nime?", "Ei. \u00D5pilase nimi asendatakse anon\u00FC\u00FCmse koodiga enne AI-le saatmist."],
          ["Kas fotosid salvestatakse?", "Fotod t\u00F6\u00F6deldakse ja kustutatakse automaatselt. Salvestatakse ainult tekstiline tagasiside."],
          ["Mis juhtub kui AI teeb vea?", "Seet\u00F5ttu vaatad Sa iga tagasiside \u00FCle. AI on abivahend, mitte asendaja. Muuda vabalt k\u00F5ike enne jagamist."],
          ["Kas see t\u00F6\u00F6tab ainult f\u00FC\u00FCsikas?", "Praegu toetab s\u00FC steem k\u00F5iki aineid, aga f\u00FC\u00FCsika ainekava on k\u00F5ige p\u00F5hjalikumalt sisse ehitatud. Teised ained saavad \u00FCldisemat tagasisidet."],
          ["Mis juhtub \u00F5pilastega, kellel pole n\u00F5usolekut?", "Nende t\u00F6id AI ei anal\u00FC\u00FCsi. Sa saad neile endiselt k\u00E4sitsi tagasisidet anda."],
        ].flatMap(([q, a]) => [
          new Paragraph({ spacing: { before: 200 }, children: [new TextRun({ text: "K: " + q, bold: true, color: "1A5276" })] }),
          new Paragraph({ spacing: { after: 100 }, children: [new TextRun(a)] }),
        ])),

        // Troubleshooting
        new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun("Kui midagi ei t\u00F6\u00F6ta")] }),
        new Paragraph({ numbering: { reference: "bullets", level: 0 }, children: [
          new TextRun({ text: "Probleemid sisselogimisega: ", bold: true }),
          new TextRun("vajuta \"Unustasid parooli?\" ja j\u00E4rgi juhiseid")
        ]}),
        new Paragraph({ numbering: { reference: "bullets", level: 0 }, children: [
          new TextRun({ text: "AI anal\u00FC\u00FCs eba\u00F5nnestub: ", bold: true }),
          new TextRun("proovi uuesti; kui p\u00FCsib, anna meile teada")
        ]}),
        new Paragraph({ numbering: { reference: "bullets", level: 0 }, children: [
          new TextRun({ text: "Foto on liiga udune: ", bold: true }),
          new TextRun("AI ei saa halvasti loetavat teksti anal\u00FC\u00FCsida \u2014 tee uus, selgem foto")
        ]}),

        new Paragraph({ spacing: { before: 300 }, children: [] }),
        new Table({
          width: { size: 9026, type: WidthType.DXA },
          columnWidths: [9026],
          rows: [new TableRow({
            children: [new TableCell({
              borders: { top: { style: BorderStyle.SINGLE, size: 2, color: "2E75B6" }, bottom: { style: BorderStyle.SINGLE, size: 2, color: "2E75B6" }, left: { style: BorderStyle.SINGLE, size: 6, color: "2E75B6" }, right: { style: BorderStyle.SINGLE, size: 2, color: "2E75B6" } },
              shading: { fill: "EBF5FB", type: ShadingType.CLEAR },
              width: { size: 9026, type: WidthType.DXA },
              margins: { top: 120, bottom: 120, left: 200, right: 200 },
              children: [new Paragraph({
                children: [
                  new TextRun({ text: "Tagasiside ja abipalved: ", bold: true }),
                  new TextRun("vajuta rakenduses \"Tagasiside\" nuppu v\u00F5i kirjuta otse aadressile taavi.tamkivi@gmail.com")
                ]
              })]
            })]
          })]
        }),

        new Paragraph({ spacing: { before: 400 }, alignment: AlignmentType.CENTER, children: [
          new TextRun({ text: "See on protot\u00FC\u00FCp. Sinu tagasiside aitab meil toote paremaks teha. Ait\u00E4h, et katsetad!", italics: true, color: "7F8C8D" })
        ]}),
      ]
    }
  ]
});

Packer.toBuffer(doc).then(buffer => {
  fs.writeFileSync("/sessions/nice-zen-gauss/mnt/Teachers feedback/Opetaja_pilootjuhend.docx", buffer);
  console.log("OK: Teacher guide created");
});
