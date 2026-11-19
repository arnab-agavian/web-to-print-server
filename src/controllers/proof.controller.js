import * as proofService from '../services/proof.service.js';
import {changeRequestSchema,createProofSchema} from '../validation/proof.validation.js';
import {errorResponse,successResponse} from '../utils/response.js';

export async function createProof(req,res,next){try{const input=createProofSchema.parse(req.body);return successResponse(res,201,'Proof created successfully.',await proofService.createProof(req.params.orderId,input,req.user))}catch(error){return next(error)}}
export async function approveProof(req,res,next){try{const proof=await proofService.approveProof(req.params.id,req.user);return proof?successResponse(res,200,'Proof approved successfully.',proof):errorResponse(res,404,'Proof not found.')}catch(error){return next(error)}}
export async function requestChanges(req,res,next){try{const {message}=changeRequestSchema.parse(req.body);const proof=await proofService.requestProofChange(req.params.id,message,req.user);return proof?successResponse(res,200,'Proof changes requested successfully.',proof):errorResponse(res,404,'Proof not found.')}catch(error){return next(error)}}

