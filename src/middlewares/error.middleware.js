import {sendError} from '../utils/response.js';
export function errorHandler(error,req,res,next){
  if(error?.name==='ZodError')return sendError(res,400,'Validation failed.',{errors:error.issues.map(issue=>({field:issue.path.join('.'),message:issue.message}))});
  if(error?.code==='P2002')return sendError(res,409,'A record with this unique value already exists.');
  if(error?.code==='P2025')return sendError(res,404,'Record not found.');
  console.error(error);
  return sendError(res,error.status||error.statusCode||500,error.message||'Internal server error.');
}

