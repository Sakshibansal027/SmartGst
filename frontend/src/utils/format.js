import { localeCode } from '../locales/i18n.js';
export const money = n => new Intl.NumberFormat(localeCode(), { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(Number(n || 0));
// A migrated row can still carry a full ISO timestamp. Appending 'T00:00:00' to
// that yields an Invalid Date, so the time component is stripped first.
export const dateOnly = s => String(s ?? '').slice(0, 10);
export function fmtDate(s){const d=dateOnly(s);return d?new Date(d+'T00:00:00').toLocaleDateString(localeCode(),{day:'2-digit',month:'short',year:'numeric'}):'—'}
