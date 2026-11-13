import {test} from 'node:test';
import assert from 'node:assert/strict';
import {cleanupCatalog} from './support/catalog-cleanup.mjs';
test('partial catalog setup restores settings and deletes every created identity without requiring member',async()=>{
 const calls=[]; await cleanupCatalog({users:{admin:{id:'admin'}},deleteOrders:()=>assert.fail(),restore:()=>calls.push('restore'),deleteUser:id=>calls.push(id)});assert.deepEqual(calls,['restore','admin']);
});
test('failed order cleanup cannot prevent backup restoration and remaining user cleanup',async()=>{
 const calls=[];await assert.rejects(cleanupCatalog({users:{member:{id:'member'},admin:{id:'admin'}},deleteOrders:()=>{throw Error('injected SQL outage');},restore:()=>calls.push('restore'),deleteUser:id=>{calls.push(id);if(id==='member')throw Error('injected Auth outage');}}),AggregateError);assert.deepEqual(calls,['restore','member','admin']);
});
