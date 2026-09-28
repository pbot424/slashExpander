const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
function fixture() {
  const records = {}, deliveries = [];
  const chrome = {runtime:{id:'extension',getURL:path=>'chrome-extension://extension/'+path,onMessage:{addListener(){}}},
    storage:{session:{async get(key){return key ? {[key]:records[key]} : records;},async set(value){Object.assign(records,value);},async remove(key){delete records[key];}}},
    windows:{onRemoved:{addListener(){}},async create(){return {id:7,tabs:[{id:8}]};}},
    tabs:{async update(){},async sendMessage(tab,message,options){deliveries.push({tab,message,options});return {ok:true};}}};
  const context = vm.createContext({chrome,Date,URL});
  vm.runInContext(fs.readFileSync(require.resolve('../private-picker-background.js'),'utf8'),context);
  return {context,records,deliveries};
}
const id='11111111-1111-1111-1111-111111111111';
const source={id:'extension',tab:{id:1},frameId:4,documentId:'original-document',url:'https://editor.example/path'};
const picker={id:'extension',tab:{id:8},url:'chrome-extension://extension/picker.html#'+id};
test('only the authorized extension picker can read or complete a pending insertion', async()=>{
  const {context,deliveries} = fixture();
  assert.equal((await context.openPrivateInsertion({requestId:id},source)).ok,true);
  for (const sender of [source,{...picker,tab:{id:9}},{...picker,url:'https://evil.example/'},{...picker,id:'other-extension'}]) {
    assert.equal((await context.privateInsertionMessage({type:'get-private-insertion',requestId:id},sender)).ok,false);
    assert.equal((await context.privateInsertionMessage({type:'finish-private-insertion',requestId:id,resolved:{value:'secret'}},sender)).ok,false);
  }
  assert.equal(deliveries.length,0);
  assert.equal((await context.privateInsertionMessage({type:'get-private-insertion',requestId:id},picker)).ok,true);
  const message={type:'finish-private-insertion',requestId:id,resolved:{value:'chosen text'},commandId:'chosen'};
  assert.equal((await context.privateInsertionMessage(message,picker)).ok,true);
  assert.equal(deliveries.length,1);
  assert.equal(deliveries[0].tab,1);
  assert.equal(deliveries[0].options.frameId,4);
  assert.equal(deliveries[0].options.documentId,'original-document');
  assert.equal((await context.privateInsertionMessage(message,picker)).ok,false);
});
test('expired and malformed requests fail closed',async()=>{
  const {context,records} = fixture();
  assert.equal((await context.openPrivateInsertion({requestId:id},{...source,documentId:undefined})).ok,false);
  assert.equal((await context.openPrivateInsertion({requestId:'invalid'},source)).ok,false);
  await context.openPrivateInsertion({requestId:id},source);
  records['privateInsertion:'+id].expires=Date.now()-1;
  assert.equal((await context.privateInsertionMessage({type:'get-private-insertion',requestId:id},picker)).ok,false);
});
