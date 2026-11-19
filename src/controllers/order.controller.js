import * as orderService from '../services/order.service.js';
import {createOrderSchema} from '../validation/order.validation.js';
import {errorResponse,successResponse} from '../utils/response.js';

export async function getOrders(req,res,next){try{return successResponse(res,200,'Orders fetched successfully.',await orderService.listOrders(req.user))}catch(error){return next(error)}}
export async function getOrderById(req,res,next){try{const order=await orderService.getOrder(req.params.id,req.user);return order?successResponse(res,200,'Order fetched successfully.',order):errorResponse(res,404,'Order not found.')}catch(error){return next(error)}}
export async function placeOrder(req,res,next){try{const input=createOrderSchema.parse(req.body);return successResponse(res,201,'Order placed successfully.',await orderService.createOrder(input,req.user))}catch(error){return next(error)}}
export async function reorder(req,res,next){try{const order=await orderService.reorder(req.params.id,req.user);return order?successResponse(res,201,'Reorder placed successfully.',order):errorResponse(res,404,'Order not found.')}catch(error){return next(error)}}

