import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import fs from 'node:fs/promises';
import path from 'node:path';
import { config } from './env.js';
const exec=promisify(execFile);
export function ocrStatus(){return{configured:Boolean(config.tesseractPath),missing:config.tesseractPath?[]:['TESSERACT_PATH'],language:config.tesseractLanguage,pdfConverter:config.pdftoppmPath};}
export function extractReceiptFields(text){const find=(regex)=>text.match(regex)?.[1]?.trim()||'',rawDate=find(/(?:invoice\s*(?:date)?|bill\s*date|date)\s*[:#-]?\s*(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})/i),dateParts=/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$/.exec(rawDate);let date='';if(dateParts){const day=Number(dateParts[1]),month=Number(dateParts[2]),year=Number(dateParts[3].length===2?(Number(dateParts[3])<50?'20':'19')+dateParts[3]:dateParts[3]),check=new Date(Date.UTC(year,month-1,day));if(check.getUTCFullYear()===year&&check.getUTCMonth()===month-1&&check.getUTCDate()===day)date=`${year}-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}`;}return{number:find(/(?:invoice\s*(?:no|number)|bill\s*(?:no|number))\s*[:#-]?\s*([A-Z0-9/-]+)/i),date,gstin:find(/\b(\d{2}[A-Z]{5}\d{4}[A-Z][1-9A-Z]Z[0-9A-Z])\b/i).toUpperCase(),hsn:find(/(?:HSN|SAC)\s*[:#-]?\s*(\d{4,8})/i),amount:find(/(?:taxable\s*(?:value|amount)|subtotal)\s*[:₹ ]*([\d,]+(?:\.\d{1,2})?)/i).replaceAll(',','')};}
async function imageText(file){if(!config.tesseractPath)throw Object.assign(new Error('OCR is not configured. Install Tesseract OCR and set TESSERACT_PATH in .env.'),{status:503});const{stdout}=await exec(config.tesseractPath,[file,'stdout','-l',config.tesseractLanguage],{windowsHide:true,maxBuffer:8*1024*1024});return stdout.trim();}
export async function recognizeReceipt(file){let texts=[];if(file.mimetype==='application/pdf'){
  const dir=await fs.mkdtemp(path.join(path.dirname(file.path),'pdf-')),prefix=path.join(dir,'page');
  try{await exec(config.pdftoppmPath,['-png','-r','200','-f','1','-l','5',file.path,prefix],{windowsHide:true,timeout:30000});const pages=(await fs.readdir(dir)).filter(x=>x.endsWith('.png')).sort().slice(0,5);for(const page of pages)texts.push(await imageText(path.join(dir,page)));}
  catch(error){if(error.status===503)throw error;throw Object.assign(new Error('Could not process this PDF. Verify PDFTOPPM_PATH and that the PDF is readable.'),{status:422});}
  finally{await fs.rm(dir,{recursive:true,force:true});}
}else texts.push(await imageText(file.path));
 const text=texts.join('\n\n');return{text,fields:extractReceiptFields(text),engine:'Tesseract OCR'};
}
