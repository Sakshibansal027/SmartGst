import { Router } from 'express';
import { calculate,downloadReturnPdf,getReturns } from '../controllers/gstController.js';
import { downloadCsv,downloadPrototypePdf } from '../controllers/reportController.js';
import { getOcrStatus,processReceipt } from '../controllers/ocrController.js';
import { validateInvoiceBody } from '../controllers/invoiceController.js';
import { uploadReceipt } from '../middleware/uploadMiddleware.js';
import { rateLimit } from '../middleware/rateLimit.js';
// Gemini's free tier allows five requests per minute for these models, and it
// enforces that over a rolling window. A fixed window would let five requests
// at the end of one window and five at the start of the next reach Google
// within seconds, so this uses the sliding strategy to mean what it says.
const ocrLimiter=rateLimit({windowMs:60*1000,max:5,strategy:'sliding',key:req=>String(req.user?._id||req.ip),message:'Receipt OCR allows 5 uploads per minute. Wait a moment and try again.'});
const router=Router();
router.post('/calculate',calculate);router.post('/validate',validateInvoiceBody);
router.get('/returns',getReturns);router.get('/returns.pdf',downloadReturnPdf);router.get('/reports.csv',downloadCsv);router.get('/reports.pdf',downloadPrototypePdf);router.get('/ocr/status',getOcrStatus);router.post('/ocr',ocrLimiter,uploadReceipt,processReceipt);
export default router;
