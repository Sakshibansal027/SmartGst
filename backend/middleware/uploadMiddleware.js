import multer from 'multer';
import { config } from '../config/env.js';
const allowed=new Set(['image/jpeg','image/png','image/webp','application/pdf']);
export const uploadReceipt=multer({dest:config.uploadDir,limits:{fileSize:10*1024*1024,files:1},fileFilter(req,file,cb){if(!allowed.has(file.mimetype))return cb(Object.assign(new Error('Upload a JPG, PNG, WEBP image or PDF.'),{status:400}));cb(null,true);}}).single('file');
