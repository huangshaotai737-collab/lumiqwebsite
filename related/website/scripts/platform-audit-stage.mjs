export async function runAuditStage(context, stage, operation, {timeoutMs, record}) {
 const startedAt=Date.now();
 await record({...context,stage,status:'started',at:new Date(startedAt).toISOString()});
 let timer;
 try {
  const result=await Promise.race([
   Promise.resolve().then(operation),
   new Promise((_,reject)=>{
    timer=setTimeout(()=>{
     const error=new Error(`${context.engine} ${context.locale||''}${context.route||''} ${stage} exceeded ${timeoutMs}ms`);
     error.code='AUDIT_OPERATION_TIMEOUT';
     reject(error);
    },timeoutMs);
   }),
  ]);
  await record({...context,stage,status:'completed',durationMs:Date.now()-startedAt,at:new Date().toISOString()});
  return result;
 }catch(error){
  const code=error.code||(error.name==='TimeoutError'?'AUDIT_OPERATION_TIMEOUT':'AUDIT_OPERATION_ERROR');
  error.audit={...context,stage,code,message:error.message};
  await record({...error.audit,status:'failed',durationMs:Date.now()-startedAt,at:new Date().toISOString()});
  throw error;
 }finally{
  clearTimeout(timer);
 }
}
