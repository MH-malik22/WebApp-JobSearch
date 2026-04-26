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

// --- Resumes -------------------------------------------------------------

export async function fetchResumes() {
  const { data } = await api.get('/resumes');
  return data.resumes;
}

export async function fetchResume(id) {
  const { data } = await api.get(`/resumes/${id}`);
  return data.resume;
}

export async function uploadResume({ name, file, isBase = false }) {
  const form = new FormData();
  form.append('name', name);
  form.append('isBase', String(isBase));
  if (file) form.append('file', file);
  const { data } = await api.post('/resumes', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data.resume;
}

export async function pasteResume({ name, text, isBase = false }) {
  const { data } = await api.post('/resumes', { name, text, isBase });
  return data.resume;
}

export async function updateResumeRemote(id, payload) {
  const { data } = await api.patch(`/resumes/${id}`, payload);
  return data.resume;
}

export async function deleteResumeRemote(id) {
  await api.delete(`/resumes/${id}`);
}

// --- Tailoring -----------------------------------------------------------

export async function scoreResume(payload) {
  const { data } = await api.post('/tailor/score', payload);
  return data;
}

export async function tailorResume(payload) {
  const { data } = await api.post('/tailor', payload, { timeout: 120_000 });
  return data;
}

export async function generateCoverLetter(payload) {
  const { data } = await api.post('/tailor/cover-letter', payload, {
    timeout: 120_000,
  });
  return data;
}

export async function fetchSavedTailored() {
  const { data } = await api.get('/tailor/saved');
  return data.tailored;
}

export async function fetchSavedTailoredById(id) {
  const { data } = await api.get(`/tailor/saved/${id}`);
  return data.tailored;
}

// --- Alerts --------------------------------------------------------------

export async function fetchAlerts() {
  const { data } = await api.get('/alerts');
  return data.alerts;
}

export async function createAlert(payload) {
  const { data } = await api.post('/alerts', payload);
  return data.alert;
}

export async function updateAlert(id, payload) {
  const { data } = await api.patch(`/alerts/${id}`, payload);
  return data.alert;
}

export async function deleteAlert(id) {
  await api.delete(`/alerts/${id}`);
}

// --- Applications --------------------------------------------------------

export async function fetchApplications() {
  const { data } = await api.get('/applications');
  return data.applications;
}

export async function fetchApplicationStats() {
  const { data } = await api.get('/applications/stats');
  return data.stats;
}

export async function createApplication(payload) {
  const { data } = await api.post('/applications', payload);
  return data.application;
}

export async function updateApplication(id, payload) {
  const { data } = await api.patch(`/applications/${id}`, payload);
  return data.application;
}

export async function deleteApplication(id) {
  await api.delete(`/applications/${id}`);
}

// --- Alerts --------------------------------------------------------------

export async function fetchAlerts() {
  const { data } = await api.get('/alerts');
  return data.alerts;
}

export async function createAlert(payload) {
  const { data } = await api.post('/alerts', payload);
  return data.alert;
}

export async function updateAlert(id, payload) {
  const { data } = await api.patch(`/alerts/${id}`, payload);
  return data.alert;
}

export async function deleteAlert(id) {
  await api.delete(`/alerts/${id}`);
}

// --- Applications --------------------------------------------------------

export async function fetchApplications() {
  const { data } = await api.get('/applications');
  return data.applications;
}

export async function fetchApplicationStats() {
  const { data } = await api.get('/applications/stats');
  return data.stats;
}

export async function createApplication(payload) {
  const { data } = await api.post('/applications', payload);
  return data.application;
}

export async function updateApplication(id, payload) {
  const { data } = await api.patch(`/applications/${id}`, payload);
  return data.application;
}

export async function deleteApplication(id) {
  await api.delete(`/applications/${id}`);
}
