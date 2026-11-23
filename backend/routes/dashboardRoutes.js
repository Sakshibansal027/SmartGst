import { Router } from 'express';
import { getDashboard } from '../controllers/dashboardController.js';
import { addTask,deleteTask,listTasks,toggleTask } from '../controllers/complianceController.js';
const router=Router();
router.get('/',getDashboard);router.get('/tasks',listTasks);router.post('/tasks',addTask);router.patch('/tasks/:id',toggleTask);router.delete('/tasks/:id',deleteTask);
export default router;
