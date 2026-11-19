import * as productService from '../services/product.service.js';
import {priceSchema} from '../validation/product.validation.js';
import {successResponse} from '../utils/response.js';

export async function getProducts(req,res,next){try{return successResponse(res,200,'Products fetched successfully.',await productService.listProducts())}catch(error){return next(error)}}
export async function calculateProductPrice(req,res,next){try{const input=priceSchema.parse(req.body);return successResponse(res,200,'Price calculated successfully.',await productService.getPrice(input))}catch(error){return next(error)}}

