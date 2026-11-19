import test from 'node:test';
import assert from 'node:assert/strict';
import {catalog} from '../src/data/catalog.js';
import {calculatePrice} from '../src/services/pricing.js';

test('applies the 100-unit volume tier and exact tax',()=>{const result=calculatePrice({product:catalog[0],width:100,height:100,quantity:100});assert.equal(result.discountPercent,16);assert.equal(result.unitPrice,1.51);assert.equal(result.subtotal,151);assert.equal(result.tax,27.18);assert.equal(result.total,178.18)});
test('rejects quantities below the product minimum',()=>assert.throws(()=>calculatePrice({product:catalog[1],width:210,height:148,quantity:10}),/Minimum quantity/));
test('rejects dimensions outside the product range',()=>assert.throws(()=>calculatePrice({product:catalog[2],width:20,height:20,quantity:10}),/outside/));

