const vm = require('node:vm');
const {readFileSync} = require('node:fs');
const assert = require('node:assert/strict');
const test = require('node:test');
const root = require('node:path').resolve(__dirname, '..');
async function check(isTrusted, hotkey = false) {
 const listeners={}; let messages = 0;
 class Element {}
 class Input extends Element {
  constructor(){super();this.type='text';this.value='/audit';this.selectionStart=this.selectionEnd=6;this.isConnected=true;}
  matches(){return false;} focus(){} setSelectionRange(a,b){this.selectionStart=a;this.selectionEnd=b;}
  setRangeText(v,start,end){this.value=this.value.slice(0,start)+v+this.value.slice(end);}
  dispatchEvent(){}
 }
 const context=vm.createContext({console,AbortController,setTimeout,clearTimeout,queueMicrotask,URL,
  HTMLElement:Element,HTMLInputElement:Input,HTMLTextAreaElement:class extends Element {},InputEvent:class {},
  window:{addEventListener:(name,handler)=>listeners[name]=handler},location:{hostname:'untrusted.test'},
  chrome:{runtime:{id:'audit-extension',sendMessage:async()=>{messages++;return {ok:true};},onMessage:{addListener(){},removeListener(){}}},storage:{local:{get:async()=>({})},onChanged:{addListener(){},removeListener(){}}}},
  SlashStore:{getState:async()=>({commands:[{id:'audit',shortcut:'/audit',expansion:'SYNTHETIC_PRIVATE_SNIPPET',enabled:true}],sections:[],settings:{expandOnSpace:true,expandOnTab:true,expandOnEnter:true,excludedSites:[]}})}
 });
 for(const file of ['shared/template-engine.js','shared/expansion-core.js'])vm.runInContext(readFileSync(root+'/'+file,'utf8'),context);
 const source=readFileSync(root+'/content/content.js','utf8');
 vm.runInContext(source,context);await new Promise(resolve=>setImmediate(resolve));
 const input=new Input();listeners.keydown({key:' ',code:'Space',isTrusted,ctrlKey:hotkey,shiftKey:hotkey,composedPath:()=>[input],preventDefault(){},stopPropagation(){}});
 return {value:input.value,messages};
}

test('synthetic delimiter and picker events cannot disclose snippets or open a window',async()=>{
  for (const hotkey of [false,true]) {
    const result=await check(false,hotkey);
    assert.equal(result.value,'/audit');
    assert.equal(result.messages,0);
  }
});
test('trusted delimiter input still expands locally',async()=>{
  const result=await check(true);
  assert.equal(result.value,'SYNTHETIC_PRIVATE_SNIPPET ');
  assert.equal(result.messages,1);
});
