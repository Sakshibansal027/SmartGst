import { Router } from 'express';
import { createInvoice,deleteInvoice,listInvoices,updateInvoice,validateInvoiceBody } from '../controllers/invoiceController.js';
const router=Router();
router.get('/',listInvoices);router.post('/',createInvoice);router.post('/validate',validateInvoiceBody);router.put('/:id',updateInvoice);router.delete('/:id',deleteInvoice);
export default router;
