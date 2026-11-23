import { Router } from 'express';
import { addTask,deleteTask,listTasks,toggleTask } from '../controllers/complianceController.js';
const router=Router();router.get('/',listTasks);router.post('/',addTask);router.patch('/:id',toggleTask);router.delete('/:id',deleteTask);export default router;
