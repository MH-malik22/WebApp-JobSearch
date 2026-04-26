import { diffWords } from 'diff';

function DiffLine({ before, after }) {
  if (before === after) {
    return <p className="whitespace-pre-wrap text-sm text-slate-700">{after}</p>;
  }
  const parts = diffWords(before || '', after || '');
  return (
    <p className="whitespace-pre-wrap text-sm leading-relaxed">
      {parts.map((part, i) => {
        if (part.added)
          return (
            <span key={i} className="rounded bg-emerald-100 px-0.5 text-emerald-800">
              {part.value}
            </span>
          );
        if (part.removed)
          return (
            <span key={i} className="rounded bg-red-50 px-0.5 text-red-700 line-through">
              {part.value}
            </span>
          );
        return (
          <span key={i} className="text-slate-700">
            {part.value}
          </span>
        );
      })}
    </p>
  );
}

function pairBullets(originalExp = [], tailoredExp = []) {
  // Pair by index (best we can do without IDs); render extras separately.
  const max = Math.max(originalExp.length, tailoredExp.length);
  const pairs = [];
  for (let i = 0; i < max; i++) {
    pairs.push({
      original: originalExp[i] ?? null,
      tailored: tailoredExp[i] ?? null,
    });
  }
  return pairs;
}

function Section({ title, children }) {
  return (
    <section className="mb-5">
      <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-600">
        {title}
      </h3>
      <div className="space-y-2">{children}</div>
    </section>
  );
}

export default function ResumeDiff({ original, tailored }) {
  if (!original || !tailored) return null;

  const pairs = pairBullets(original.experience || [], tailored.experience || []);

  return (
    <div className="card p-5 text-sm">
      <Section title="Summary">
        <DiffLine before={original.summary || ''} after={tailored.summary || ''} />
      </Section>

      <Section title="Skills">
        <DiffLine
          before={(original.skills || []).join(' • ')}
          after={(tailored.skills || []).join(' • ')}
        />
      </Section>

      <Section title="Experience">
        {pairs.map((p, i) => (
          <div key={i} className="rounded border border-slate-200 p-3">
            <DiffLine
              before={p.original?.header || ''}
              after={p.tailored?.header || ''}
            />
            <p className="mb-2 text-xs text-slate-500">
              {p.tailored?.dates || p.original?.dates}
            </p>
            {(() => {
              const bMax = Math.max(
                p.original?.bullets?.length || 0,
                p.tailored?.bullets?.length || 0
              );
              return Array.from({ length: bMax }).map((_, j) => (
                <DiffLine
                  key={j}
                  before={p.original?.bullets?.[j] || ''}
                  after={p.tailored?.bullets?.[j] || ''}
                />
              ));
            })()}
          </div>
        ))}
      </Section>

      {tailored.highlights?.length ? (
        <Section title="What changed (AI notes)">
          <ul className="list-disc space-y-1 pl-5 text-xs text-slate-600">
            {tailored.highlights.map((h, i) => (
              <li key={i}>{h}</li>
            ))}
          </ul>
        </Section>
      ) : null}
    </div>
  );
}
