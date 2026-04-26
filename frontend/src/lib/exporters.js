import { saveAs } from 'file-saver';
import jsPDF from 'jspdf';
import { Document, Packer, Paragraph, HeadingLevel, TextRun } from 'docx';

export function resumeToText(resume) {
  const lines = [];
  if (resume.summary) {
    lines.push('PROFESSIONAL SUMMARY', '', resume.summary, '');
  }
  if (resume.skills?.length) {
    lines.push('SKILLS', '', resume.skills.join(' • '), '');
  }
  if (resume.experience?.length) {
    lines.push('EXPERIENCE', '');
    for (const exp of resume.experience) {
      lines.push(exp.header || '');
      if (exp.dates) lines.push(exp.dates);
      for (const b of exp.bullets || []) lines.push(`• ${b}`);
      lines.push('');
    }
  }
  if (resume.projects?.length) {
    lines.push('PROJECTS', '', ...resume.projects.map((p) => `• ${p}`), '');
  }
  if (resume.education?.length) {
    lines.push('EDUCATION', '', ...resume.education, '');
  }
  if (resume.certifications?.length) {
    lines.push('CERTIFICATIONS', '', ...resume.certifications, '');
  }
  return lines.join('\n').trim() + '\n';
}

export function downloadText(resume, filename = 'resume.txt') {
  const blob = new Blob([resumeToText(resume)], { type: 'text/plain;charset=utf-8' });
  saveAs(blob, filename);
}

export function downloadPdf(resume, filename = 'resume.pdf') {
  const doc = new jsPDF({ unit: 'pt', format: 'letter' });
  const margin = 48;
  const pageWidth = doc.internal.pageSize.getWidth();
  const maxW = pageWidth - margin * 2;
  let y = margin;

  const writeHeading = (text) => {
    if (y > 740) { doc.addPage(); y = margin; }
    doc.setFont('helvetica', 'bold').setFontSize(13);
    doc.text(text.toUpperCase(), margin, y);
    y += 16;
    doc.setLineWidth(0.5);
    doc.line(margin, y - 8, pageWidth - margin, y - 8);
  };

  const writeBody = (text, opts = {}) => {
    doc.setFont('helvetica', opts.bold ? 'bold' : 'normal');
    doc.setFontSize(opts.size ?? 10);
    const lines = doc.splitTextToSize(text, maxW - (opts.indent ?? 0));
    for (const line of lines) {
      if (y > 760) { doc.addPage(); y = margin; }
      doc.text(line, margin + (opts.indent ?? 0), y);
      y += (opts.size ?? 10) + 4;
    }
  };

  if (resume.summary) {
    writeHeading('Professional Summary');
    writeBody(resume.summary);
    y += 6;
  }
  if (resume.skills?.length) {
    writeHeading('Skills');
    writeBody(resume.skills.join(' • '));
    y += 6;
  }
  if (resume.experience?.length) {
    writeHeading('Experience');
    for (const exp of resume.experience) {
      if (exp.header) writeBody(exp.header, { bold: true, size: 11 });
      if (exp.dates) writeBody(exp.dates, { size: 9 });
      for (const b of exp.bullets || []) writeBody(`• ${b}`, { indent: 12 });
      y += 4;
    }
  }
  if (resume.projects?.length) {
    writeHeading('Projects');
    for (const p of resume.projects) writeBody(`• ${p}`, { indent: 12 });
  }
  if (resume.education?.length) {
    writeHeading('Education');
    for (const e of resume.education) writeBody(e);
  }
  if (resume.certifications?.length) {
    writeHeading('Certifications');
    for (const c of resume.certifications) writeBody(`• ${c}`, { indent: 12 });
  }

  doc.save(filename);
}

function p(text, opts = {}) {
  return new Paragraph({
    spacing: { after: opts.after ?? 80 },
    bullet: opts.bullet,
    heading: opts.heading,
    children: [
      new TextRun({
        text: text || '',
        bold: opts.bold,
        size: opts.size,
      }),
    ],
  });
}

export async function downloadDocx(resume, filename = 'resume.docx') {
  const children = [];
  if (resume.summary) {
    children.push(p('Professional Summary', { heading: HeadingLevel.HEADING_1 }));
    children.push(p(resume.summary));
  }
  if (resume.skills?.length) {
    children.push(p('Skills', { heading: HeadingLevel.HEADING_1 }));
    children.push(p(resume.skills.join(' • ')));
  }
  if (resume.experience?.length) {
    children.push(p('Experience', { heading: HeadingLevel.HEADING_1 }));
    for (const exp of resume.experience) {
      if (exp.header) children.push(p(exp.header, { bold: true }));
      if (exp.dates) children.push(p(exp.dates, { size: 18 }));
      for (const b of exp.bullets || [])
        children.push(p(b, { bullet: { level: 0 } }));
    }
  }
  if (resume.projects?.length) {
    children.push(p('Projects', { heading: HeadingLevel.HEADING_1 }));
    for (const proj of resume.projects)
      children.push(p(proj, { bullet: { level: 0 } }));
  }
  if (resume.education?.length) {
    children.push(p('Education', { heading: HeadingLevel.HEADING_1 }));
    for (const e of resume.education) children.push(p(e));
  }
  if (resume.certifications?.length) {
    children.push(p('Certifications', { heading: HeadingLevel.HEADING_1 }));
    for (const c of resume.certifications)
      children.push(p(c, { bullet: { level: 0 } }));
  }

  const doc = new Document({ sections: [{ children }] });
  const blob = await Packer.toBlob(doc);
  saveAs(blob, filename);
}

export async function copyText(resume) {
  await navigator.clipboard.writeText(resumeToText(resume));
}
