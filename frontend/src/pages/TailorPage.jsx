import { Sparkles } from 'lucide-react';

export default function TailorPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 text-center">
      <Sparkles className="mx-auto mb-3 h-10 w-10 text-brand-600" />
      <h1 className="text-2xl font-semibold">Tailor Resume</h1>
      <p className="mx-auto mt-2 max-w-xl text-sm text-slate-600">
        Coming in Phase 3: upload your base resume, pick a saved job, and get a
        Claude-tailored resume with an ATS match score and missing-keyword report.
      </p>
      <ul className="mx-auto mt-6 max-w-md space-y-2 text-left text-sm text-slate-600">
        <li>· PDF / DOCX / paste-text resume parsing</li>
        <li>· Side-by-side diff of original vs tailored sections</li>
        <li>· ATS match score and keyword gap analysis</li>
        <li>· Export to PDF / DOCX / plain text</li>
        <li>· Optional cover-letter generator</li>
      </ul>
    </div>
  );
}
