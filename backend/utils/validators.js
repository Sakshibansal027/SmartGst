export const demoRates=[0,5,12,18,28];
const ISO_DATE=/^(\d{4})-(\d{2})-(\d{2})(?:[T\s].*)?$/,ISO_TIME=/^[T\s](\d{2}):(\d{2})(?::(\d{2})(?:\.\d+)?)?(?:Z|[+-]\d{2}:?\d{2})?$/i;
// Every financial-year filter compares date strings against 'YYYY-04-01', so a
// malformed-but-nonempty date does not throw: the record silently drops out of
// the dashboard, the returns summary and the reports. Validate on the way in.
// A full ISO timestamp is accepted because migrated legacy rows may carry one,
// and an unrelated format should not block editing such a record.
export function isIsoDate(value){
  const text=String(value??'').trim(),match=ISO_DATE.exec(text);
  if(!match)return false;
  const year=Number(match[1]),month=Number(match[2]),day=Number(match[3]);
  if(month<1||month>12||day<1)return false;
  const check=new Date(Date.UTC(year,month-1,day));
  if(check.getUTCFullYear()!==year||check.getUTCMonth()!==month-1||check.getUTCDate()!==day)return false;
  const time=text.slice(10);
  if(!time)return true;
  const parts=ISO_TIME.exec(time);
  if(!parts)return false;
  const hours=Number(parts[1]),minutes=Number(parts[2]),seconds=parts[3]===undefined?0:Number(parts[3]);
  return hours<=23&&minutes<=59&&seconds<=59;
}
// An accepted timestamp must be stored as a bare date: the rest of the app
// compares date strings against 'YYYY-04-01' and formats with new Date(s+'T00:00:00'),
// which produces "Invalid Date" when a time component is still attached.
export function toDateOnly(value){
  return String(value??'').trim().slice(0,10);
}
export function validateInvoice(x,existing=[],excludeId=null){
  const errors=[],warnings=[];
  for(const[key,label]of[['kind','Transaction type'],['number','Invoice number'],['date','Invoice date'],['party','Customer or supplier'],['state','Place of supply'],['description','Item description'],['hsn','HSN/SAC code']])if(!String(x[key]??'').trim())errors.push(`${label} is required.`);
  // Only format-check a date that is present; an empty one already reported as required.
  const date=String(x.date??'').trim();
  if(date&&!isIsoDate(date))errors.push('Invoice date must be a real date in YYYY-MM-DD format.');
  else if(date&&date.slice(0,10)>new Date().toISOString().slice(0,10))warnings.push('Invoice date is in the future; check it before saving.');
  if(x.gstin&&!/^\d{2}[A-Z]{5}\d{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/.test(String(x.gstin).toUpperCase()))warnings.push('GSTIN format is invalid; verify the 15-character GSTIN.');
  const amount=Number(x.amount),rate=Number(x.rate);
  if(!Number.isFinite(amount)||amount<=0)errors.push('Taxable amount must be greater than zero.');
  if(!demoRates.includes(rate))errors.push('Choose a configured demo GST rate: 0%, 5%, 12%, 18% or 28%.');
  if(!['sale','purchase'].includes(x.kind))errors.push('Transaction type must be sales or purchase.');
  if(x.number&&existing.some(row=>row.kind===x.kind&&row.number.toLowerCase()===String(x.number).toLowerCase()&&String(row.id)!==String(excludeId)))errors.push('Duplicate invoice number for this transaction type.');
  return{valid:!errors.length,errors,warnings,status:errors.length?'Error':warnings.length?'Warning':'Valid'};
}
export function validateProfile(x){const errors=[];for(const k of ['business','owner','state'])if(!String(x[k]||'').trim())errors.push(`${k} is required.`);if(x.gstin&&!/^\d{2}[A-Z]{5}\d{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/.test(String(x.gstin).toUpperCase()))errors.push('GSTIN format is invalid.');return errors;}
