import axios from 'axios';

const baseURL = import.meta.env.VITE_API_URL || '/api';
const TOKEN_KEY = 'cloudops:token';

export const api = axios.create({ baseURL, timeout: 15_000 });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export function setToken(token) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

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

export async function refreshJobs(source = 'all') {
  const { data } = await api.post('/jobs/refresh', { source });
  return data;
}

// --- Auth ----------------------------------------------------------------

export async function register(email, password) {
  const { data } = await api.post('/auth/register', { email, password });
  setToken(data.token);
  return data.user;
}

export async function login(email, password) {
  const { data } = await api.post('/auth/login', { email, password });
  setToken(data.token);
  return data.user;
}

export async function fetchMe() {
  const { data } = await api.get('/auth/me');
  return data.user;
}

export function logout() {
  setToken(null);
}

// --- Saved jobs ----------------------------------------------------------

export async function fetchSavedJobIds() {
  const { data } = await api.get('/saved-jobs/ids');
  return data.ids;
}

export async function fetchSavedJobs() {
  const { data } = await api.get('/saved-jobs');
  return data.jobs;
}

export async function saveJobRemote(jobId) {
  await api.post(`/saved-jobs/${jobId}`);
}

export async function unsaveJobRemote(jobId) {
  await api.delete(`/saved-jobs/${jobId}`);
}
