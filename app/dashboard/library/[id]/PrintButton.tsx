'use client';

export default function PrintButton({
  title,
  subject,
  grade,
  content,
}: {
  title: string;
  subject: string;
  grade: string;
  content: string;
}) {
  function handlePrint() {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    // Escape HTML in all user-controlled strings
    function esc(s: string) {
      return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }
    const escaped = esc(content);
    const safeTitle = esc(title);
    const safeSubject = esc(subject);
    const safeGrade = esc(grade);

    printWindow.document.write(`<!DOCTYPE html>
<html><head>
<meta charset="utf-8">
<title>${safeTitle}</title>
<style>
  body {
    font-family: Georgia, 'Times New Roman', serif;
    max-width: 700px;
    margin: 40px auto;
    padding: 0 20px;
    font-size: 14px;
    line-height: 1.8;
    color: #000;
  }
  h1 { font-size: 20px; margin-bottom: 4px; }
  .meta { font-size: 12px; color: #666; margin: 0 0 24px; }
  .content { white-space: pre-wrap; }
  .footer {
    margin-top: 40px;
    padding-top: 12px;
    border-top: 1px solid #ccc;
    font-size: 11px;
    color: #999;
  }
  @media print {
    body { margin: 20px auto; }
  }
</style>
</head><body>
  <h1>${safeTitle}</h1>
  <p class="meta">${safeSubject} · ${safeGrade}. klass</p>
  <p style="margin-bottom:20px">Nimi: _________________________________ &nbsp;&nbsp; Kuupäev: _______________</p>
  <div class="content">${escaped}</div>
  <div class="footer">Õpetaja Tagasiside · fyysika-tagasiside.vercel.app</div>
</body></html>`);
    printWindow.document.close();
    printWindow.print();
  }

  return (
    <button
      onClick={handlePrint}
      style={{
        background: 'none',
        border: '1.5px solid #DAD0A1',
        padding: '5px 12px',
        fontSize: 12,
        fontWeight: 600,
        color: '#1C2832',
        cursor: 'pointer',
      }}
    >
      🖨 Prindi
    </button>
  );
}
