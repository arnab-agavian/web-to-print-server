import {sendError} from '../utils/response.js';
export function notFound(req,res){return sendError(res,404,`Route ${req.method} ${req.originalUrl} was not found.`)}

