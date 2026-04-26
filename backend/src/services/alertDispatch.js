import {
  findUnnotifiedMatches,
  listEnabledAlertsWithUsers,
  recordNotifications,
} from './alertsService.js';
import {
  renderDigestEmail,
  renderInstantAlertEmail,
  sendEmail,
} from './emailService.js';
import { alertsSent } from '../config/metrics.js';

// After every scrape we run this. For each enabled "instant" or "both" alert
// we look back a small window for fresh matches, send one email per match
// (with logo + summary), and persist the (alert,job) pair so we never resend.
export async function dispatchInstantAlerts({ sinceHours = 6 } = {}) {
  const alerts = await listEnabledAlertsWithUsers('instant');
  let sent = 0;

  for (const alert of alerts) {
    try {
      const jobs = await findUnnotifiedMatches(alert, { sinceHours });
      if (jobs.length === 0) continue;

      // Cap blast radius — if a brand new alert matches 200 jobs from the
      // recent window, only email the top 5 most recent.
      const top = jobs.slice(0, 5);

      for (const job of top) {
        const { subject, text, html } = renderInstantAlertEmail({ alert, job });
        await sendEmail({ to: alert.user_email, subject, text, html });
        sent += 1;
        alertsSent.inc({ kind: 'instant' });
      }

      // Mark every matched job as notified, even ones we capped out of the
      // email — otherwise the next run would hammer the same user.
      await recordNotifications(
        alert.id,
        jobs.map((j) => j.id)
      );
    } catch (err) {
      console.error(`[alertDispatch] alert ${alert.id} failed:`, err.message);
    }
  }
  return { alerts: alerts.length, emails: sent };
}

export async function dispatchDigests({ sinceHours = 24 } = {}) {
  const alerts = await listEnabledAlertsWithUsers('digest');

  // Group alerts by user so each user gets one digest with sections per alert.
  const byUser = new Map();
  for (const a of alerts) {
    if (!byUser.has(a.user_id)) {
      byUser.set(a.user_id, { email: a.user_email, alerts: [] });
    }
    byUser.get(a.user_id).alerts.push(a);
  }

  let sent = 0;
  for (const [userId, { email, alerts: userAlerts }] of byUser) {
    const byAlert = {};
    let total = 0;
    const recordedJobIdsByAlert = {};

    for (const alert of userAlerts) {
      const jobs = await findUnnotifiedMatches(alert, { sinceHours });
      byAlert[alert.name] = jobs.slice(0, 8); // cap section size
      total += jobs.length;
      recordedJobIdsByAlert[alert.id] = jobs.map((j) => j.id);
    }

    if (total === 0) continue;

    try {
      const { subject, text, html } = renderDigestEmail({
        user: { id: userId, email },
        byAlert,
      });
      await sendEmail({ to: email, subject, text, html });
      sent += 1;
      alertsSent.inc({ kind: 'digest' });

      for (const [alertId, jobIds] of Object.entries(recordedJobIdsByAlert)) {
        await recordNotifications(alertId, jobIds);
      }
    } catch (err) {
      console.error(`[digest] user ${userId} failed:`, err.message);
    }
  }
  return { users: byUser.size, emails: sent };
}
