// The page never receives the picker library or form DOM. Only this extension
// window can complete a request, bound to its original tab, frame and document.
const PRIVATE_INSERT_PREFIX = 'privateInsertion:';
const privatePickerUrl = chrome.runtime.getURL('picker.html');
async function readPrivateInsertion(id) {
  if (typeof id !== 'string' || !/^[0-9a-f-]{36}$/.test(id)) return null;
  const key = PRIVATE_INSERT_PREFIX + id;
  const record = (await chrome.storage.session.get(key))[key];
  return record?.expires > Date.now() ? record : null;
}
function isPrivatePicker(sender, record) {
  return sender.id === chrome.runtime.id && sender.url?.split('#')[0] === privatePickerUrl
    && sender.tab?.id === record.pickerTabId;
}
async function openPrivateInsertion(message, sender) {
  if (sender.id !== chrome.runtime.id || !Number.isInteger(sender.tab?.id)
      || typeof sender.documentId !== 'string' || !/^[0-9a-f-]{36}$/.test(message.requestId || '')) return {ok:false};
  const window = await chrome.windows.create({url:'about:blank',type:'popup',width:660,height:660,focused:true});
  const record = {tabId:sender.tab.id, frameId:sender.frameId, documentId:sender.documentId,
    pickerTabId:window.tabs[0].id, windowId:window.id, commandId:message.commandId,
    hostname:new URL(sender.url).hostname, expires:Date.now()+10*60*1000};
  await chrome.storage.session.set({[PRIVATE_INSERT_PREFIX + message.requestId]:record});
  await chrome.tabs.update(record.pickerTabId, {url:privatePickerUrl+'#'+message.requestId});
  return {ok:true};
}
async function privateInsertionMessage(message, sender) {
  if (message.type === 'open-private-insertion') return openPrivateInsertion(message, sender);
  const record = await readPrivateInsertion(message.requestId);
  if (!record || !isPrivatePicker(sender, record)) return {ok:false};
  if (message.type === 'get-private-insertion') return {ok:true, request:{commandId:record.commandId,hostname:record.hostname}};
  if (typeof message.resolved?.value !== 'string' || message.resolved.value.length > 100000) return {ok:false};
  await chrome.storage.session.remove(PRIVATE_INSERT_PREFIX + message.requestId);
  return chrome.tabs.sendMessage(record.tabId, {type:'complete-private-insertion', requestId:message.requestId,
    resolved:message.resolved, commandId:message.commandId}, {documentId:record.documentId,frameId:record.frameId});
}
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (!['open-private-insertion','get-private-insertion','finish-private-insertion'].includes(message?.type)) return false;
  privateInsertionMessage(message, sender).then(sendResponse).catch(() => sendResponse({ok:false}));
  return true;
});
chrome.windows.onRemoved.addListener(async windowId => {
  const entries = await chrome.storage.session.get(null);
  for (const [key, record] of Object.entries(entries)) {
    if (!key.startsWith(PRIVATE_INSERT_PREFIX) || (record.windowId !== windowId && record.expires > Date.now())) continue;
    await chrome.storage.session.remove(key);
    await chrome.tabs.sendMessage(record.tabId, {type:'complete-private-insertion', requestId:key.slice(PRIVATE_INSERT_PREFIX.length),canceled:true},
      {documentId:record.documentId,frameId:record.frameId}).catch(() => {});
  }
});
