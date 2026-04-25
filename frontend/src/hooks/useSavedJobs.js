import { useCallback, useEffect, useState } from 'react';

const KEY = 'cloudops:savedJobs';

export function useSavedJobs() {
  const [ids, setIds] = useState(() => {
    try {
      return new Set(JSON.parse(localStorage.getItem(KEY) || '[]'));
    } catch {
      return new Set();
    }
  });

  useEffect(() => {
    localStorage.setItem(KEY, JSON.stringify([...ids]));
  }, [ids]);

  const toggle = useCallback((job) => {
    setIds((prev) => {
      const next = new Set(prev);
      if (next.has(job.id)) next.delete(job.id);
      else next.add(job.id);
      return next;
    });
  }, []);

  const isSaved = useCallback((id) => ids.has(id), [ids]);

  return { savedIds: ids, toggle, isSaved };
}
