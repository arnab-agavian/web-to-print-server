import prisma from '../config/db.js';
import {env} from '../config/env.js';
import {demoOrders} from '../data/demoStore.js';
import {getProduct} from './product.service.js';
import {calculatePrice} from './pricing.js';
import {notifyOrderPlaced} from './notification.service.js';

const orderInclude={items:{include:{product:{select:{id:true,slug:true,name:true,family:true}},design:true}},proofs:{orderBy:{version:'desc'}},events:{orderBy:{createdAt:'desc'}}};
const orderNumber=()=>`DH-${String(Date.now()).slice(-6)}`;
export async function listOrders(user){if(!env.hasDatabase)return demoOrders.filter(order=>user.role==='admin'||order.customer_id===user.id);return prisma.order.findMany({where:user.role==='admin'?{}:{customerId:user.id},include:orderInclude,orderBy:{createdAt:'desc'}})}
export async function getOrder(id,user){if(!env.hasDatabase)return demoOrders.find(order=>order.id===id&&(user.role==='admin'||order.customer_id===user.id))||null;return prisma.order.findFirst({where:{id,...(user.role==='admin'?{}:{customerId:user.id})},include:{...orderInclude,productionFiles:user.role==='admin'}})}
export async function createOrder(input,user){const product=await getProduct(input.productSlug);if(!product){const error=new Error('Product not found.');error.status=404;throw error}const price=calculatePrice({...input,product});if(!env.hasDatabase){const order={id:crypto.randomUUID(),order_number:orderNumber(),customer_id:user.id,customer_name:user.fullName||user.email,customer_email:user.email,product_id:product.id,product_name:product.name,quantity:input.quantity,subtotal:price.subtotal,tax:price.tax,total:price.total,currency:price.currency,status:'order',proof_status:'not_started',production_ready:false,created_at:new Date().toISOString(),configuration:{...input.configuration,width:input.width,height:input.height,material:input.material}};demoOrders.unshift(order);await notifyOrderPlaced({order,user});return {order,price}}
  const order=await prisma.$transaction(async tx=>{
    const created=await tx.order.create({data:{orderNumber:orderNumber(),customerId:user.id,status:'order',subtotal:price.subtotal,tax:price.tax,total:price.total,currency:price.currency,configuration:input.configuration,items:{create:{productId:product.id,designId:input.designId||null,quantity:input.quantity,unitPrice:price.unitPrice,widthMm:input.width,heightMm:input.height,material:input.material,configuration:input.configuration}}},include:orderInclude});
    await tx.orderEvent.create({data:{orderId:created.id,actorId:user.id,eventType:'order_created',metadata:{total:price.total}}});return created;
  });await notifyOrderPlaced({order,user});return {order,price};
}
export async function reorder(id,user){if(!env.hasDatabase){const source=demoOrders.find(order=>order.id===id&&order.customer_id===user.id);if(!source)return null;const copy={...source,id:crypto.randomUUID(),order_number:orderNumber(),status:'order',proof_status:'not_started',production_ready:false,created_at:new Date().toISOString()};demoOrders.unshift(copy);await notifyOrderPlaced({order:copy,user,reordered:true});return copy}
  const source=await prisma.order.findFirst({where:{id,customerId:user.id},include:{items:true}});if(!source)return null;
  const reordered=await prisma.order.create({data:{orderNumber:orderNumber(),customerId:user.id,status:'order',subtotal:source.subtotal,tax:source.tax,total:source.total,currency:source.currency,configuration:source.configuration,reorderedFromId:source.id,items:{create:source.items.map(item=>({productId:item.productId,designId:item.designId,quantity:item.quantity,unitPrice:item.unitPrice,widthMm:item.widthMm,heightMm:item.heightMm,material:item.material,configuration:item.configuration}))},events:{create:{actorId:user.id,eventType:'order_reordered',metadata:{sourceOrderId:source.id}}}},include:orderInclude});
  await notifyOrderPlaced({order:reordered,user,reordered:true});return reordered;
}

