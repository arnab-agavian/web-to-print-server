import prisma from '../config/db.js';
import {env} from '../config/env.js';
import {catalog} from '../data/catalog.js';
import {calculatePrice} from './pricing.js';

function normalize(product){return {...product,basePrice:Number(product.basePrice),minWidth:Number(product.minWidth),maxWidth:Number(product.maxWidth),minHeight:Number(product.minHeight),maxHeight:Number(product.maxHeight),defaultWidth:Number(product.defaultWidth),defaultHeight:Number(product.defaultHeight),bleedMm:product.bleedMm===undefined?undefined:Number(product.bleedMm)}}
export async function listProducts(){if(!env.hasDatabase)return catalog;const rows=await prisma.product.findMany({where:{active:true},orderBy:{sortOrder:'asc'}});return rows.map(normalize)}
export async function getProduct(slug){if(!env.hasDatabase)return catalog.find(product=>product.slug===slug)||null;const product=await prisma.product.findFirst({where:{slug,active:true}});return product?normalize(product):null}
export async function getPrice(input){const product=await getProduct(input.productSlug);if(!product){const error=new Error('Product not found.');error.status=404;throw error}return calculatePrice({...input,product})}

