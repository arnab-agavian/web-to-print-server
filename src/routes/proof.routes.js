import {Router} from 'express';
import {approveProof,createProof,requestChanges} from '../controllers/proof.controller.js';
import {requireRole,verifyToken} from '../middlewares/auth.middleware.js';
const router=Router();router.use(verifyToken);
router.post('/orders/:orderId',requireRole('admin'),createProof);
router.post('/:id/approve',approveProof);
router.post('/:id/change-request',requestChanges);
export default router;

