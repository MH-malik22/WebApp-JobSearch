import { useCallback, useEffect, useState } from 'react';
import {
  fetchSavedJobIds,
  saveJobRemote,
  unsaveJobRemote,
} from '../lib/api.js';
import { useAuth } from './useAuth.jsx';

const KEY = 'cloudops:savedJobs';

function loadLocal() {
  try {
    return new Set(JSON.parse(localStorage.getItem(KEY) || '[]'));
  } catch {
    return new Set();
  }
}

function persistLocal(ids) {
  localStorage.setItem(KEY, JSON.stringify([...ids]));
}

export function useSavedJobs() {
  const { user } = useAuth();
  const [ids, setIds] = useState(() => loadLocal());

  useEffect(() => {
    if (!user) {
      setIds(loadLocal());
      return;
    }
    let cancelled = false;
    fetchSavedJobIds()
      .then((arr) => {
        if (!cancelled) setIds(new Set(arr));
      })
      .catch(() => {
        if (!cancelled) setIds(loadLocal());
      });
    return () => {
      cancelled = true;
    };
  }, [user]);

  const toggle = useCallback(
    async (job) => {
      const next = new Set(ids);
      const wasSaved = next.has(job.id);
      if (wasSaved) next.delete(job.id);
      else next.add(job.id);
      setIds(next);

      if (user) {
        try {
          if (wasSaved) await unsaveJobRemote(job.id);
          else await saveJobRemote(job.id);
        } catch {
          setIds(ids); // revert on failure
        }
      } else {
        persistLocal(next);
      }
    },
    [ids, user]
  );

  const isSaved = useCallback((id) => ids.has(id), [ids]);

  return { savedIds: ids, toggle, isSaved };
}
