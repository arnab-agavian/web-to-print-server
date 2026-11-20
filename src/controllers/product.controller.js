import * as productService from '../services/product.service.js';
import {createProductSchema,priceSchema,updateProductSchema} from '../validation/product.validation.js';
import {errorResponse,successResponse} from '../utils/response.js';

export async function getProducts(req,res,next){try{return successResponse(res,200,'Products fetched successfully.',await productService.listProducts())}catch(error){return next(error)}}
export async function getProduct(req,res,next){try{const product=await productService.getProduct(req.params.slug);return product?successResponse(res,200,'Product fetched successfully.',product):errorResponse(res,404,'Product not found.')}catch(error){return next(error)}}
export async function createProduct(req,res,next){try{const input=createProductSchema.parse(req.body);return successResponse(res,201,'Product created successfully.',await productService.createProduct(input))}catch(error){return next(error)}}
export async function updateProduct(req,res,next){try{const input=updateProductSchema.parse(req.body);const product=await productService.updateProduct(req.params.slug,input);return product?successResponse(res,200,'Product updated successfully.',product):errorResponse(res,404,'Product not found.')}catch(error){return next(error)}}
export async function calculateProductPrice(req,res,next){try{const input=priceSchema.parse(req.body);return successResponse(res,200,'Price calculated successfully.',await productService.getPrice(input))}catch(error){return next(error)}}

