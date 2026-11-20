import prisma from '../config/db.js';
import {env} from '../config/env.js';
import {createProductSchema} from '../validation/product.validation.js';
import {calculatePrice} from './pricing.js';

const activeTemplates={templates:{where:{active:true},orderBy:{createdAt:'asc'}}};
function normalizeTemplate(template){return {...template,canvasWidth:Number(template.canvasWidth),canvasHeight:Number(template.canvasHeight)}}
export function normalizeProduct(product){
  const {templates=[],...fields}=product;
  const storedConfiguration=fields.configurationSchema&&typeof fields.configurationSchema==='object'&&!Array.isArray(fields.configurationSchema)?fields.configurationSchema:{};
  return {...fields,basePrice:Number(fields.basePrice),minWidth:Number(fields.minWidth),maxWidth:Number(fields.maxWidth),minHeight:Number(fields.minHeight),maxHeight:Number(fields.maxHeight),defaultWidth:Number(fields.defaultWidth),defaultHeight:Number(fields.defaultHeight),bleedMm:fields.bleedMm===undefined?undefined:Number(fields.bleedMm),configurationSchema:{...storedConfiguration,templates:templates.map(normalizeTemplate)}};
}
function withoutProjectedTemplates(input){
  if(!Object.hasOwn(input,'configurationSchema'))return input;
  const {templates,...configurationSchema}=input.configurationSchema;
  return {...input,configurationSchema};
}
function requireDatabase(){if(!env.hasDatabase){const error=new Error('Database is not configured. Product operations require PostgreSQL.');error.status=503;throw error}}
export async function listProducts(){requireDatabase();const rows=await prisma.product.findMany({where:{active:true},include:activeTemplates,orderBy:{sortOrder:'asc'}});return rows.map(normalizeProduct)}
export async function getProduct(slug){requireDatabase();const product=await prisma.product.findFirst({where:{slug,active:true},include:activeTemplates});return product?normalizeProduct(product):null}
export async function getPrice(input){const product=await getProduct(input.productSlug);if(!product){const error=new Error('Product not found.');error.status=404;throw error}return calculatePrice({...input,product})}
export async function createProduct(input){
  requireDatabase();
  return normalizeProduct(await prisma.product.create({data:withoutProjectedTemplates(input),include:activeTemplates}));
}
export async function updateProduct(slug,input){
  requireDatabase();
  const current=await prisma.product.findUnique({where:{slug},include:activeTemplates});
  if(!current)return null;
  const normalized=normalizeProduct(current);
  createProductSchema.parse({
    slug:normalized.slug,
    name:normalized.name,
    family:normalized.family,
    description:normalized.description,
    basePrice:normalized.basePrice,
    minQuantity:normalized.minQuantity,
    minWidth:normalized.minWidth,
    maxWidth:normalized.maxWidth,
    minHeight:normalized.minHeight,
    maxHeight:normalized.maxHeight,
    defaultWidth:normalized.defaultWidth,
    defaultHeight:normalized.defaultHeight,
    bleedMm:normalized.bleedMm,
    resolutionDpi:normalized.resolutionDpi,
    configurationSchema:normalized.configurationSchema,
    active:normalized.active,
    sortOrder:normalized.sortOrder,
    ...input,
  });
  return normalizeProduct(await prisma.product.update({where:{id:current.id},data:withoutProjectedTemplates(input),include:activeTemplates}));
}

