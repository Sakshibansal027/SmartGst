import { localeCode } from '../locales/i18n.js';
export const money = n => new Intl.NumberFormat(localeCode(), { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(Number(n || 0));
export function fmtDate(s){return s?new Date(s+'T00:00:00').toLocaleDateString(localeCode(),{day:'2-digit',month:'short',year:'numeric'}):'—'}
