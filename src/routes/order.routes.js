import {Router} from 'express';
import {getOrderById,getOrders,placeOrder,reorder} from '../controllers/order.controller.js';
import {verifyToken} from '../middlewares/auth.middleware.js';
const router=Router();router.use(verifyToken);
router.get('/',getOrders);
router.post('/',placeOrder);
router.get('/:id',getOrderById);
router.post('/:id/reorder',reorder);
export default router;

