import { jsPDF } from 'jspdf';
import { FeedbackData } from './types';

const DARK_BLUE: [number, number, number] = [28, 40, 50]; // #1C2832
const ACCENT_BLUE: [number, number, number] = [0, 114, 206]; // #0072CE
const GRAY: [number, number, number] = [107, 114, 128];
const GREEN: [number, number, number] = [22, 101, 52];
const ORANGE: [number, number, number] = [154, 52, 18];

export function generatePdf(feedback: FeedbackData): Buffer {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;
  const contentWidth = pageWidth - margin * 2;
  let y = margin;

  const checkPageBreak = (needed: number) => {
    if (y + needed > doc.internal.pageSize.getHeight() - margin) {
      doc.addPage();
      y = margin;
    }
  };

  const addText = (text: string, x: number, fontSize: number, color: [number, number, number], opts?: { bold?: boolean; italic?: boolean; maxWidth?: number }) => {
    doc.setFontSize(fontSize);
    doc.setTextColor(color[0], color[1], color[2]);
    if (opts?.bold && opts?.italic) doc.setFont('helvetica', 'bolditalic');
    else if (opts?.bold) doc.setFont('helvetica', 'bold');
    else if (opts?.italic) doc.setFont('helvetica', 'italic');
    else doc.setFont('helvetica', 'normal');

    const maxW = opts?.maxWidth ?? contentWidth - (x - margin);
    const lines = doc.splitTextToSize(text, maxW);
    const lineHeight = fontSize * 0.45;

    for (const line of lines) {
      checkPageBreak(lineHeight + 2);
      doc.text(line, x, y);
      y += lineHeight;
    }
    return lines.length;
  };

  // ─── Cover page ───
  y = 80;
  const { test_info } = feedback;
  doc.setFontSize(24);
  doc.setTextColor(...DARK_BLUE);
  doc.setFont('helvetica', 'bold');
  const title = test_info.title || 'Kontrolltöö tagasiside';
  const titleLines = doc.splitTextToSize(title, contentWidth);
  titleLines.forEach((line: string) => {
    doc.text(line, pageWidth / 2, y, { align: 'center' });
    y += 10;
  });

  y += 4;
  if (test_info.topic) {
    doc.setFontSize(14);
    doc.setTextColor(...GRAY);
    doc.setFont('helvetica', 'normal');
    doc.text(test_info.topic, pageWidth / 2, y, { align: 'center' });
    y += 8;
  }

  doc.setFontSize(12);
  doc.setTextColor(...DARK_BLUE);
  doc.setFont('helvetica', 'normal');
  doc.text(`${test_info.class} | ${test_info.student}`, pageWidth / 2, y, { align: 'center' });
  y += 6;

  if (test_info.score) {
    doc.setFont('helvetica', 'bold');
    doc.text(`Tulemus: ${test_info.score}`, pageWidth / 2, y, { align: 'center' });
    y += 6;
  }

  y += 4;
  doc.setFontSize(10);
  doc.setTextColor(...GRAY);
  doc.setFont('helvetica', 'italic');
  doc.text('Õpilase tagasiside ja analüüs', pageWidth / 2, y, { align: 'center' });
  y += 6;

  const date = new Date().toLocaleDateString('et-EE', {
    year: 'numeric', month: 'long', day: 'numeric',
  });
  doc.setFont('helvetica', 'normal');
  doc.text(date, pageWidth / 2, y, { align: 'center' });

  // ─── Feedback content ───
  doc.addPage();
  y = margin;

  // Kokkuvõte
  addText('KOKKUVÕTE', margin, 16, ACCENT_BLUE, { bold: true });
  y += 2;
  // Blue left border
  const patternStartY = y;
  addText(feedback.uldine_muster, margin + 4, 11, DARK_BLUE);
  doc.setDrawColor(...ACCENT_BLUE);
  doc.setLineWidth(1);
  doc.line(margin, patternStartY - 4, margin, y);
  y += 6;

  // Mis läks hästi
  addText('Mis läks hästi', margin, 14, GREEN, { bold: true });
  y += 2;
  for (const item of feedback.mis_laks_hasti) {
    checkPageBreak(12);
    addText(`✓ ${item.title}`, margin + 2, 11, DARK_BLUE, { bold: true });
    y += 1;
    addText(item.text, margin + 6, 10, GRAY);
    y += 4;
  }
  y += 4;

  // Mida parandada
  addText('Mida parandada', margin, 14, ORANGE, { bold: true });
  y += 2;
  for (const item of feedback.mida_parandada) {
    checkPageBreak(12);
    addText(`• ${item.title}`, margin + 2, 11, DARK_BLUE, { bold: true });
    y += 1;
    addText(item.text, margin + 6, 10, GRAY);
    y += 4;
  }
  y += 4;

  // Soovitused
  addText('Soovitused edaspidiseks', margin, 14, ACCENT_BLUE, { bold: true });
  y += 2;
  for (const item of feedback.soovitused) {
    checkPageBreak(12);
    addText(item.title, margin + 2, 11, ACCENT_BLUE, { bold: true });
    y += 1;
    addText(item.text, margin + 6, 10, GRAY);
    y += 4;
  }
  y += 4;

  // Pilk ettepoole
  if (feedback.pilk_ettepoole) {
    addText('Pilk ettepoole', margin, 14, DARK_BLUE, { bold: true });
    y += 2;
    addText(feedback.pilk_ettepoole, margin + 2, 10, DARK_BLUE);
    y += 6;
  }

  // Resources
  if (feedback.resources && feedback.resources.length > 0) {
    checkPageBreak(20);
    addText('Kasulikud materjalid', margin, 14, DARK_BLUE, { bold: true });
    y += 2;
    for (const r of feedback.resources) {
      checkPageBreak(12);
      const icon = r.type === 'video' ? '▶' : r.type === 'exercise' ? '✏' : '📖';
      addText(`${icon} ${r.title}`, margin + 2, 10, ACCENT_BLUE, { bold: true });
      addText(r.description, margin + 6, 9, GRAY);
      addText(r.url, margin + 6, 8, ACCENT_BLUE, { italic: true });
      y += 3;
    }
  }

  // Tasks breakdown
  if (feedback.tasks && feedback.tasks.length > 0) {
    doc.addPage();
    y = margin;
    addText('Ülesannete kaupa', margin, 16, DARK_BLUE, { bold: true });
    y += 4;

    for (const task of feedback.tasks) {
      checkPageBreak(30);
      const statusColor: [number, number, number] = task.is_correct === true ? GREEN : task.is_correct === false ? [185, 28, 28] : ORANGE;
      const statusLabel = task.is_correct === true ? 'Õige' : task.is_correct === false ? 'Vale' : 'Osaline';
      const points = task.points_earned != null && task.points_possible != null
        ? ` (${task.points_earned}/${task.points_possible}p)`
        : '';

      addText(`Ülesanne ${task.number} — ${statusLabel}${points}`, margin, 12, statusColor, { bold: true });
      y += 1;
      if (task.question_summary) {
        addText(task.question_summary, margin + 4, 9, GRAY, { italic: true });
        y += 1;
      }
      if (task.student_answer) {
        addText(`Vastus: ${task.student_answer}`, margin + 4, 9, DARK_BLUE);
        y += 1;
      }
      if (task.what_went_right) {
        addText(`✓ ${task.what_went_right}`, margin + 4, 9, GREEN);
        y += 1;
      }
      if (task.what_went_wrong) {
        addText(`• ${task.what_went_wrong}`, margin + 4, 9, ORANGE);
        y += 1;
      }
      if (task.advice) {
        addText(`Soovitus: ${task.advice}`, margin + 4, 9, ACCENT_BLUE);
      }
      y += 6;
    }
  }

  const arrayBuffer = doc.output('arraybuffer');
  return Buffer.from(arrayBuffer);
}
