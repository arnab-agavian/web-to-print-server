import {Router} from 'express';
import {downloadProductionFile,getAnalytics,getJobs,updateStatus} from '../controllers/admin.controller.js';
import {requireRole,verifyToken} from '../middlewares/auth.middleware.js';
const router=Router();router.use(verifyToken,requireRole('admin'));
router.get('/jobs',getJobs);
router.put('/jobs/:id/status',updateStatus);
router.get('/jobs/:id/production-file',downloadProductionFile);
router.get('/analytics',getAnalytics);
export default router;

