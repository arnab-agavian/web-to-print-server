import {Router} from 'express';
import {calculateProductPrice,getProducts} from '../controllers/product.controller.js';
const router=Router();
router.get('/',getProducts);
router.post('/price',calculateProductPrice);
export default router;

