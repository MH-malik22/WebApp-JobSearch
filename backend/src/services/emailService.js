import nodemailer from 'nodemailer';
import { env } from '../config/env.js';

let _transport;

function transport() {
  if (_transport) return _transport;

  if (!env.smtpHost) {
    // Dev / local: log emails to stdout instead of sending. Useful for tests
    // and for running the worker without configuring SMTP.
    _transport = {
      sendMail: async (msg) => {
        const preview = (msg.text || msg.html || '').slice(0, 300);
        console.log(
          `[email:console] to=${msg.to} subject="${msg.subject}"\n  ${preview}…`
        );
        return { messageId: `console-${Date.now()}` };
      },
    };
    return _transport;
  }

  _transport = nodemailer.createTransport({
    host: env.smtpHost,
    port: env.smtpPort,
    secure: env.smtpSecure,
    auth: env.smtpUser ? { user: env.smtpUser, pass: env.smtpPass } : undefined,
  });
  return _transport;
}

export async function sendEmail({ to, subject, text, html }) {
  return transport().sendMail({
    from: env.emailFrom,
    to,
    subject,
    text,
    html,
  });
}

const escape = (s = '') =>
  s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

const fmtSalary = (min, max, cur = 'USD') => {
  if (!min && !max) return '';
  const fmt = (n) =>
    new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: cur || 'USD',
      maximumFractionDigits: 0,
    }).format(n);
  return min && max ? `${fmt(min)}–${fmt(max)}` : fmt(min || max);
};

function jobRowHtml(j) {
  const salary = fmtSalary(j.salary_min, j.salary_max, j.salary_currency);
  const tags = (j.tech_stack_tags ?? [])
    .slice(0, 6)
    .map(
      (t) =>
        `<span style="display:inline-block;padding:2px 6px;margin-right:4px;background:#eff6ff;color:#1d4ed8;border-radius:4px;font-size:11px;">${escape(t)}</span>`
    )
    .join('');
  return `
    <tr>
      <td style="padding:12px 0;border-bottom:1px solid #e2e8f0;">
        <div style="font-weight:600;font-size:15px;">
          <a href="${escape(j.apply_url)}" style="color:#1d4ed8;text-decoration:none;">${escape(j.title)}</a>
        </div>
        <div style="font-size:13px;color:#475569;margin-top:2px;">
          ${escape(j.company)}${j.location ? ' · ' + escape(j.location) : ''}${j.is_remote ? ' · Remote' : ''}${salary ? ' · ' + salary : ''}
        </div>
        <div style="margin-top:6px;">${tags}</div>
      </td>
    </tr>
  `;
}

export function renderInstantAlertEmail({ alert, job }) {
  const subject = `New match: ${job.title} — ${job.company}`;
  const text = [
    `New job matching alert "${alert.name}":`,
    '',
    `${job.title} — ${job.company}`,
    `${job.location || ''}${job.is_remote ? ' (Remote)' : ''}`,
    fmtSalary(job.salary_min, job.salary_max, job.salary_currency),
    '',
    `Apply: ${job.apply_url}`,
    '',
    `Manage alerts: ${env.appBaseUrl}/?tab=alerts`,
  ]
    .filter(Boolean)
    .join('\n');
  const html = `
    <div style="font-family:system-ui,sans-serif;max-width:560px;margin:auto;padding:16px;color:#0f172a;">
      <h2 style="margin:0 0 4px 0;font-size:18px;">New match for "${escape(alert.name)}"</h2>
      <p style="margin:0 0 16px 0;color:#64748b;font-size:13px;">CloudOps Job Hunter</p>
      <table style="width:100%;border-collapse:collapse;">${jobRowHtml(job)}</table>
      <p style="margin-top:20px;font-size:12px;color:#64748b;">
        <a href="${env.appBaseUrl}" style="color:#1d4ed8;">Open dashboard</a> ·
        <a href="${env.appBaseUrl}/?tab=alerts" style="color:#1d4ed8;">Manage alerts</a>
      </p>
    </div>
  `;
  return { subject, text, html };
}

export function renderDigestEmail({ user, byAlert }) {
  const totalJobs = Object.values(byAlert).reduce(
    (n, jobs) => n + jobs.length,
    0
  );
  const subject = `Your daily CloudOps digest — ${totalJobs} new ${totalJobs === 1 ? 'job' : 'jobs'}`;

  const sections = Object.entries(byAlert)
    .map(([alertName, jobs]) => {
      if (jobs.length === 0) return '';
      return `
        <h3 style="margin:24px 0 4px;font-size:14px;color:#0f172a;">${escape(alertName)} <span style="font-weight:400;color:#64748b;">(${jobs.length})</span></h3>
        <table style="width:100%;border-collapse:collapse;">
          ${jobs.map(jobRowHtml).join('')}
        </table>
      `;
    })
    .join('');

  const html = `
    <div style="font-family:system-ui,sans-serif;max-width:600px;margin:auto;padding:20px;color:#0f172a;">
      <h2 style="margin:0;font-size:20px;">Daily digest</h2>
      <p style="margin:4px 0 0;color:#64748b;font-size:13px;">${totalJobs} new job${totalJobs === 1 ? '' : 's'} matching your alerts</p>
      ${sections || '<p style="color:#64748b;margin-top:20px;">No new matches today.</p>'}
      <p style="margin-top:24px;font-size:12px;color:#64748b;">
        <a href="${env.appBaseUrl}" style="color:#1d4ed8;">Open dashboard</a> ·
        <a href="${env.appBaseUrl}/?tab=alerts" style="color:#1d4ed8;">Manage alerts</a>
      </p>
    </div>
  `;

  const textLines = [`Daily digest — ${totalJobs} new jobs`, ''];
  for (const [name, jobs] of Object.entries(byAlert)) {
    if (jobs.length === 0) continue;
    textLines.push(`-- ${name} (${jobs.length}) --`);
    for (const j of jobs) {
      textLines.push(
        `• ${j.title} — ${j.company}${j.is_remote ? ' (Remote)' : ''}\n  ${j.apply_url}`
      );
    }
    textLines.push('');
  }
  return { subject, text: textLines.join('\n'), html };
}
