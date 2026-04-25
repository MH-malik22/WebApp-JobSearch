import axios from 'axios';

const baseURL = import.meta.env.VITE_API_URL || '/api';
export const api = axios.create({ baseURL, timeout: 15_000 });

export async function fetchJobs(params = {}) {
  const { data } = await api.get('/jobs', { params });
  return data;
}

export async function fetchJob(id) {
  const { data } = await api.get(`/jobs/${id}`);
  return data.job;
}

export async function fetchTechStack() {
  const { data } = await api.get('/jobs/meta/tech-stack');
  return data.tags;
}

export async function refreshJobs() {
  const { data } = await api.post('/jobs/refresh');
  return data;
}
