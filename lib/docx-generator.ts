import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
  convertInchesToTwip,
} from 'docx';
import { FeedbackData } from './types';

const DARK_BLUE = '1a5276';

function makeHeading1(text: string): Paragraph {
  return new Paragraph({
    children: [new TextRun({ text, bold: true, size: 36, color: DARK_BLUE, font: 'Arial' })],
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 400, after: 200 },
  });
}

function makeHeading2(text: string): Paragraph {
  return new Paragraph({
    children: [new TextRun({ text, bold: true, size: 28, color: DARK_BLUE, font: 'Arial' })],
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 300, after: 150 },
  });
}

function makeHeading3(text: string): Paragraph {
  return new Paragraph({
    children: [new TextRun({ text, bold: true, size: 24, color: DARK_BLUE, font: 'Arial' })],
    spacing: { before: 200, after: 100 },
  });
}

function makeBodyText(text: string): Paragraph {
  return new Paragraph({
    children: [new TextRun({ text, size: 22, font: 'Arial' })],
    spacing: { after: 150 },
  });
}

function makeBullet(title: string, text: string): Paragraph {
  return new Paragraph({
    children: [
      new TextRun({ text: `• ${title}: `, bold: true, size: 22, font: 'Arial' }),
      new TextRun({ text, size: 22, font: 'Arial' }),
    ],
    spacing: { after: 100 },
    indent: { left: 360 },
  });
}

export async function generateDocx(feedback: FeedbackData): Promise<Buffer> {
  const { test_info } = feedback;
  const date = new Date().toLocaleDateString('et-EE', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const children: Paragraph[] = [
    // Cover page spacing
    new Paragraph({ children: [new TextRun({ text: '', size: 48 })], spacing: { before: 2000 } }),
    new Paragraph({
      children: [new TextRun({ text: test_info.title || 'Kontrolltöö tagasiside', bold: true, size: 52, color: DARK_BLUE, font: 'Arial' })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 },
    }),
    new Paragraph({
      children: [new TextRun({ text: test_info.topic || '', size: 32, color: '555555', font: 'Arial' })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 100 },
    }),
    new Paragraph({
      children: [new TextRun({ text: `${test_info.class} | ${test_info.student}`, size: 28, font: 'Arial' })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 100 },
    }),
    ...(test_info.score ? [new Paragraph({
      children: [new TextRun({ text: `Tulemus: ${test_info.score}`, size: 28, bold: true, font: 'Arial' })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 100 },
    })] : []),
    new Paragraph({
      children: [new TextRun({ text: 'Õpilase tagasiside ja analüüs', size: 24, italics: true, color: '888888', font: 'Arial' })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 100 },
    }),
    new Paragraph({
      children: [new TextRun({ text: date, size: 22, color: '888888', font: 'Arial' })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 2000 },
    }),
    // Page break
    new Paragraph({ children: [new TextRun({ text: '', size: 24 })], pageBreakBefore: true }),
    // Student feedback
    makeHeading1('Õpilase tagasiside'),
    makeHeading2('✓ Mis läks hästi'),
    ...feedback.mis_laks_hasti.map((item) => makeBullet(item.title, item.text)),
    makeHeading2('⚡ Mida parandada'),
    ...feedback.mida_parandada.flatMap((item, i) => [
      makeHeading3(`${i + 1}. ${item.title}`),
      makeBodyText(item.text),
    ]),
    // Drawings section (long version only) — SVG rendered as text description
    ...(feedback.drawings && feedback.drawings.length > 0 ? [
      makeHeading2('Selgitavad joonised'),
      ...feedback.drawings.map((d) => new Paragraph({
        children: [
          new TextRun({ text: `Joonis: ${d.title}`, bold: true, size: 22, font: 'Arial' }),
          new TextRun({ text: ` — ${d.caption}`, size: 22, italics: true, font: 'Arial' }),
        ],
        spacing: { after: 120 },
        indent: { left: 360 },
      })),
    ] : []),
    makeHeading2('Üldine muster'),
    makeBodyText(feedback.uldine_muster),
    makeHeading2('Soovitused edaspidiseks'),
    ...feedback.soovitused.map((item) => makeBullet(item.title, item.text)),
    makeHeading2('Pilk ettepoole'),
    makeBodyText(feedback.pilk_ettepoole),
    // Resources section (if available)
    ...(feedback.resources && feedback.resources.length > 0 ? [
      makeHeading2('Harjutamiseks ja lugemiseks'),
      new Paragraph({
        children: [new TextRun({ text: 'Need materjalid on valitud just Sinu vigade ja arenguvaldkondade põhjal.', size: 20, italics: true, color: '888888', font: 'Arial' })],
        spacing: { after: 150 },
      }),
      ...feedback.resources.map((r) => new Paragraph({
        children: [
          new TextRun({ text: `${r.type === 'video' ? '▶ ' : r.type === 'exercise' ? '✏ ' : '📖 '}${r.title}`, bold: true, size: 22, font: 'Arial' }),
          new TextRun({ text: `\n${r.description}`, size: 20, font: 'Arial' }),
          new TextRun({ text: `\n${r.url}`, size: 18, color: '2980b9', font: 'Arial' }),
        ],
        spacing: { after: 120 },
        indent: { left: 360 },
      })),
    ] : []),
    // Teacher notes page
    new Paragraph({ children: [new TextRun({ text: '', size: 24 })], pageBreakBefore: true }),
    makeHeading1('Märkmed õpetajale'),
    new Paragraph({
      children: [new TextRun({ text: 'See sektsioon on mõeldud ainult õpetajale.', size: 20, italics: true, color: '888888', font: 'Arial' })],
      spacing: { after: 200 },
    }),
    makeBodyText(feedback.markmed_opetajale),
  ];

  const doc = new Document({
    sections: [{
      properties: {
        page: {
          margin: {
            top: convertInchesToTwip(1),
            right: convertInchesToTwip(1),
            bottom: convertInchesToTwip(1),
            left: convertInchesToTwip(1),
          },
        },
      },
      children,
    }],
  });

  const buffer = await Packer.toBuffer(doc);
  return Buffer.from(buffer);
}
