import fs from 'node:fs/promises';
import { config } from './env.js';

// Receipt extraction runs on Google's Gemini API (free tier is sufficient).
// Files are sent inline as base64, which is why the upload cap stays at 10 MB:
// base64 inflates by ~33%, keeping the request under Gemini's 20 MB inline limit.
export const PROVIDER = 'Google Gemini Vision API';
const MAX_INLINE_BYTES = 10 * 1024 * 1024;
const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/webp', 'application/pdf']);
const GSTIN_RE = /^\d{2}[A-Z]{5}\d{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;

const STATE_NAMES={'01':'Jammu & Kashmir','02':'Himachal Pradesh','03':'Punjab','04':'Chandigarh','05':'Uttarakhand','06':'Haryana','07':'Delhi','08':'Rajasthan','09':'Uttar Pradesh','10':'Bihar','11':'Sikkim','12':'Arunachal Pradesh','13':'Nagaland','14':'Manipur','15':'Mizoram','16':'Tripura','17':'Meghalaya','18':'Assam','19':'West Bengal','20':'Jharkhand','21':'Odisha','22':'Chhattisgarh','23':'Madhya Pradesh','24':'Gujarat','26':'Dadra & Nagar Haveli and Daman & Diu','27':'Maharashtra','29':'Karnataka','30':'Goa','31':'Lakshadweep','32':'Kerala','33':'Tamil Nadu','34':'Puducherry','35':'Andaman & Nicobar Islands','36':'Telangana','37':'Andhra Pradesh','38':'Ladakh','97':'Other Territory'};
const STATE_LIST = Object.values(STATE_NAMES);
function stateForGstin(gstin){return gstin?STATE_NAMES[gstin.slice(0,2)]||'':'';}
function findStateName(text){const found=/(?:place\s*of\s*supply|state)\s*[:#-]\s*([A-Za-z&. ]{3,40})/i.exec(text)?.[1]?.trim().toLowerCase();return found?STATE_LIST.find(name=>name.toLowerCase()===found)||'':'';}
function findPartyName(text){const found=/(?:supplier|seller|vendor|billed\s*(?:by|from)|bill\s*from|from)\s*(?:name)?\s*[:#-]\s*([A-Za-z0-9&.,'()\-/ ]{2,60})/i.exec(text)?.[1];return found?found.trim().replace(/\s{2,}/g,' '):'';}

export function ocrStatus(){return{provider:'gemini',engine:PROVIDER,configured:Boolean(config.geminiApiKey),missing:config.geminiApiKey?[]:['GEMINI_API_KEY'],model:config.geminiModel,apiVersion:config.geminiApiVersion};}

function toIsoDate(rawDate){const value=String(rawDate||'').trim();const iso=/^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if(iso){const y=Number(iso[1]),m=Number(iso[2]),d=Number(iso[3]),check=new Date(Date.UTC(y,m-1,d));return check.getUTCFullYear()===y&&check.getUTCMonth()===m-1&&check.getUTCDate()===d?`${iso[1]}-${iso[2]}-${iso[3]}`:'';}
  const dateParts=/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$/.exec(value);if(!dateParts)return '';
  const day=Number(dateParts[1]),month=Number(dateParts[2]),year=Number(dateParts[3].length===2?(Number(dateParts[3])<50?'20':'19')+dateParts[3]:dateParts[3]),check=new Date(Date.UTC(year,month-1,day));
  return check.getUTCFullYear()===year&&check.getUTCMonth()===month-1&&check.getUTCDate()===day?`${year}-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}`:'';
}

// Kept from the Tesseract era as a safety net: if the model answers with plain
// prose instead of JSON, these patterns still recover the common fields.
export function extractReceiptFields(text){const find=(regex)=>text.match(regex)?.[1]?.trim()||'',rawDate=find(/(?:invoice\s*(?:date)?|bill\s*date|date)\s*[:#-]?\s*(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})/i),date=toIsoDate(rawDate);const gstin=find(/\b(\d{2}[A-Z]{5}\d{4}[A-Z][1-9A-Z]Z[0-9A-Z])\b/i).toUpperCase();return{number:find(/(?:invoice\s*(?:no|number)|bill\s*(?:no|number))\s*[:#-]?\s*([A-Z0-9/-]+)/i),date,gstin,hsn:find(/(?:HSN|SAC)\s*[:#-]?\s*(\d{4,8})/i),amount:find(/(?:taxable\s*(?:value|amount)|subtotal)\s*[:₹ ]*([\d,]+(?:\.\d{1,2})?)/i).replaceAll(',',''),party:findPartyName(text),state:stateForGstin(gstin)||findStateName(text)};}

const clean=(value,max=80)=>String(value??'').replace(/\s+/g,' ').trim().slice(0,max);

// Model output is treated as untrusted input: every field is re-validated here,
// so a hallucinated GSTIN or a non-existent date never reaches the review form.
export function normalizeFields(raw={}){
  const gstin=clean(raw.gstin,15).toUpperCase(),validGstin=GSTIN_RE.test(gstin)?gstin:'';
  const rawAmount=String(raw.amount??'').replace(/[^0-9.]/g,''),amountValue=rawAmount&&Number.isFinite(Number(rawAmount))?Number(rawAmount).toFixed(2):'';
  const stateName=clean(raw.state,60),state=STATE_LIST.find(name=>name.toLowerCase()===stateName.toLowerCase())||stateForGstin(validGstin);
  return{number:clean(raw.number,40).toUpperCase(),date:toIsoDate(raw.date),gstin:validGstin,hsn:clean(raw.hsn,10).replace(/[^0-9]/g,''),amount:amountValue,party:clean(raw.party,120),state};
}

const RECEIPT_SCHEMA={type:'OBJECT',properties:{number:{type:'STRING'},date:{type:'STRING'},party:{type:'STRING'},gstin:{type:'STRING'},hsn:{type:'STRING'},amount:{type:'STRING'},state:{type:'STRING'}},required:['number','date','party','gstin','hsn','amount','state']};

const PROMPT=['Transcribe the fields of this Indian GST purchase bill or invoice.','Return only JSON matching the schema. Copy values exactly as printed; never calculate, complete or invent a value.','- number: invoice or bill number, "" if absent.','- date: convert to YYYY-MM-DD, "" if unreadable or absent.','- party: the supplier or seller business name, "" if absent.','- gstin: the 15-character GSTIN of the supplier, uppercase, "" if absent.','- hsn: HSN or SAC code, digits only, "" if absent.','- amount: taxable value before GST, digits and a decimal point only, "" if absent.','- state: the place-of-supply state name if printed, else "".'].join('\n');

async function defaultGenerate({apiKey,model,apiVersion,mimeType,data}){
  const {GoogleGenAI}=await import('@google/genai');
  // JSON mode (responseMimeType/responseSchema) exists only on the v1beta API;
  // the SDK otherwise defaults to v1 and Google rejects the request with
  // 400 INVALID_ARGUMENT "JSON mode is not enabled for api version v1".
  const response=await new GoogleGenAI({apiKey,apiVersion}).models.generateContent({
    model,
    contents:[{role:'user',parts:[{text:PROMPT},{inlineData:{mimeType,data}}]}],
    config:{responseMimeType:'application/json',responseSchema:RECEIPT_SCHEMA,temperature:0}
  });
  return response.text??'';
}

const ocrError=(message,status)=>Object.assign(new Error(message),{status,isOcrError:true});

// Google reports failures as a JSON string; surface the human message.
function providerReason(detail){
  try{const parsed=JSON.parse(detail);if(parsed?.error?.message)return String(parsed.error.message);}catch{}
  return detail;
}

// Turns SDK/network failures into messages that name the real cause. Never
// collapse an INVALID_ARGUMENT into "unreadable file": that hid a misconfigured
// request behind a message blaming the user's photo.
function mapProviderError(error){
  if(error?.isOcrError)return error;
  const raw=String(error?.message||''),reason=providerReason(raw),status=Number(error?.status??error?.code);
  if(status===429||/RESOURCE_EXHAUSTED|quota|rate limit/i.test(raw))return ocrError('Gemini free-tier rate limit reached (about 5 requests per minute). Wait a minute and try again.',429);
  if(status===401||status===403||/API[_ ]?KEY|permission denied|unauthenticated/i.test(raw))return ocrError('Gemini rejected the API key. Check GEMINI_API_KEY in .env.',502);
  if(/JSON mode is not enabled|api version/i.test(reason))return ocrError(`Gemini needs API version v1beta for JSON mode. Set GEMINI_API_VERSION=v1beta. (${reason})`,502);
  if(status===400)return ocrError(`Gemini rejected the request: ${reason.slice(0,200)}`,422);
  return ocrError(`The receipt OCR request to Gemini failed. ${reason.slice(0,200)}`.trim(),502);
}

function parseModelJson(text){
  if(!text)return null;
  try{const direct=JSON.parse(text);if(direct&&typeof direct==='object')return direct;}catch{}
  const block=/\{[\s\S]*\}/.exec(String(text));
  if(!block)return null;
  try{const inner=JSON.parse(block[0]);return inner&&typeof inner==='object'?inner:null;}catch{return null;}
}

export async function recognizeReceipt(file,{generate=defaultGenerate,apiKey=config.geminiApiKey,model=config.geminiModel,apiVersion=config.geminiApiVersion}={}){
  if(!apiKey)throw ocrError('Receipt OCR is not configured. Add GEMINI_API_KEY to .env (the Gemini free tier is enough) and restart the API.',503);
  if(!file?.path)throw ocrError('Choose a JPG, PNG, WEBP image, or PDF first.',400);
  if(!ALLOWED_MIME.has(file.mimetype))throw ocrError('Upload a JPG, PNG, WEBP image or PDF.',400);
  const bytes=await fs.readFile(file.path);
  if(bytes.length>MAX_INLINE_BYTES)throw ocrError('File is too large. Maximum size is 10 MB.',413);
  let text='';
  try{text=await generate({apiKey,model,apiVersion,mimeType:file.mimetype,data:bytes.toString('base64'),prompt:PROMPT});}
  catch(error){throw mapProviderError(error);}
  const parsed=parseModelJson(text),fields=normalizeFields(parsed??extractReceiptFields(text));
  return{text,fields,engine:`${PROVIDER} (${model})`,provider:'gemini',model,fallback:!parsed};
}
