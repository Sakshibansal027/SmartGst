export const demoRates=[0,5,12,18,28];
export function validateInvoice(x,existing=[],excludeId=null){
  const errors=[],warnings=[];
  for(const[key,label]of[['kind','Transaction type'],['number','Invoice number'],['date','Invoice date'],['party','Customer or supplier'],['state','Place of supply'],['description','Item description'],['hsn','HSN/SAC code']])if(!String(x[key]??'').trim())errors.push(`${label} is required.`);
  if(x.gstin&&!/^\d{2}[A-Z]{5}\d{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/.test(String(x.gstin).toUpperCase()))warnings.push('GSTIN format is invalid; verify the 15-character GSTIN.');
  const amount=Number(x.amount),rate=Number(x.rate);
  if(!Number.isFinite(amount)||amount<=0)errors.push('Taxable amount must be greater than zero.');
  if(!demoRates.includes(rate))errors.push('Choose a configured demo GST rate: 0%, 5%, 12%, 18% or 28%.');
  if(!['sale','purchase'].includes(x.kind))errors.push('Transaction type must be sales or purchase.');
  if(x.number&&existing.some(row=>row.kind===x.kind&&row.number.toLowerCase()===String(x.number).toLowerCase()&&String(row.id)!==String(excludeId)))errors.push('Duplicate invoice number for this transaction type.');
  return{valid:!errors.length,errors,warnings,status:errors.length?'Error':warnings.length?'Warning':'Valid'};
}
export function validateProfile(x){const errors=[];for(const k of ['business','owner','state'])if(!String(x[k]||'').trim())errors.push(`${k} is required.`);if(x.gstin&&!/^\d{2}[A-Z]{5}\d{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/.test(String(x.gstin).toUpperCase()))errors.push('GSTIN format is invalid.');return errors;}
