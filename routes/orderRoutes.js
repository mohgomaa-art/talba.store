import express from 'express';
import * as orderCtrl from '../controllers/orderController.js';

const router = express.Router();

router.post('/', orderCtrl.createOrder);
router.get('/:id', orderCtrl.getOrderStatus);

export default router;
