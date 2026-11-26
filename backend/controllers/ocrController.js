import fs from 'node:fs/promises';
import { ocrStatus,recognizeReceipt } from '../config/ocr.js';
import { fail,ok } from '../utils/responseHandler.js';
export function getOcrStatus(req,res){const status=ocrStatus();return ok(res,{...status,message:status.configured?`Receipt OCR is ready via ${status.engine} using ${status.model}.`:'OCR unavailable: add GEMINI_API_KEY to .env (the Gemini free tier is enough) and restart the API.'});}
export async function processReceipt(req,res,next){if(!req.file)return fail(res,400,'Choose a JPG, PNG, WEBP image, or PDF first.');try{const result=await recognizeReceipt(req.file);return ok(res,result);}catch(error){if(error.status)return fail(res,error.status,error.message);return next(error);}finally{await fs.rm(req.file.path,{force:true}).catch(()=>{});}}
