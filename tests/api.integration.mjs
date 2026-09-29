import assert from 'node:assert/strict';
const base=process.env.DAYFLOW_TEST_URL || 'http://127.0.0.1:8787';
const identities={a:{'oai-authenticated-user-id':'dayflow-test-alice','oai-authenticated-user-email':'alice@example.test'},b:{'oai-authenticated-user-id':'dayflow-test-bob','oai-authenticated-user-email':'bob@example.test'}};
async function call(method,body,identity='a',extra={}){const res=await fetch(base+'/api/tasks',{method,headers:{...identities[identity],'Content-Type':'application/json',...extra},body:body?JSON.stringify(body):undefined,signal:AbortSignal.timeout(60000)});const text=await res.text(); if(!res.headers.get("content-type")?.includes("application/json"))throw new Error(method+" "+res.status+" "+text); return {status:res.status,data:JSON.parse(text)};}
const anon=await call('GET',null,'none');assert.equal(anon.status,401);
const invalid=await call('POST',{tasks:[{title:'  '}]});assert.equal(invalid.status,400);
const created=await call('POST',{tasks:[{title:'API verification',project:'Testing',due:'2026-09-30',subtasks:[{id:crypto.randomUUID(),title:'Check persistence',done:false}]}]});assert.equal(created.status,201,JSON.stringify(created));const task=created.data.tasks[0];
try{
 const list=await call('GET');assert.ok(list.data.tasks.some(t=>t.id===task.id));
 const foreign=await call('GET',null,'b');assert.ok(!foreign.data.tasks.some(t=>t.id===task.id));
 const denied=await call('PUT',{id:task.id,version:task.version,task:{...task,title:'Unauthorized edit'}},'b');assert.equal(denied.status,409);
 const changed=await call('PUT',{id:task.id,version:task.version,task:{...task,status:'done'}});assert.equal(changed.status,200);assert.equal(changed.data.task.version,2);assert.equal(changed.data.task.status,'done');
 const stale=await call('PUT',{id:task.id,version:1,task});assert.equal(stale.status,409);

 const deleted=await call('DELETE',{id:task.id,version:2});assert.equal(deleted.status,200);
 const after=await call('GET');assert.ok(!after.data.tasks.some(t=>t.id===task.id));
 const crossOrigin=await call('POST',{tasks:[{title:'Rejected'}]},'a',{origin:'https://untrusted.example'});assert.equal(crossOrigin.status,403);
 console.log('PASS: authentication, validation, persisted CRUD, user isolation, conflict detection, cross-origin protection, deletion.');
}catch(error){console.error(error);process.exitCode=1;}



