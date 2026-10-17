import {File} from 'node:buffer';
﻿import {beforeEach,afterEach,describe,it,expect,vi} from 'vitest';
import {storagePrefix,readPreference,writePreference,readSelection,prepareFiles,packFiles,unpackFiles} from '../../src/shared/device-storage.js';
let data;
beforeEach(()=>{data=new Map();vi.stubGlobal('localStorage',{getItem:key=>data.get(key)??null,setItem:(key,value)=>data.set(key,value)});});
afterEach(()=>vi.unstubAllGlobals());
describe('device preferences',()=>{
 it('restores supported selections and rejects stale or unknown values',()=>{
  writePreference('selection:math','place-value');expect(readSelection('math',['place-value'],'math-test')).toBe('place-value');expect(readSelection('math',['math-test'],'math-test')).toBe('math-test');
  data.set(storagePrefix+'selection:math',JSON.stringify({version:99,data:'place-value'}));expect(readSelection('math',['place-value'],'math-test')).toBe('math-test');
 });
 it('recovers from corrupt records and storage denial',()=>{
  data.set(storagePrefix+'bad','{not JSON');expect(readPreference('bad','default')).toBe('default');vi.stubGlobal('localStorage',{getItem(){throw new Error('blocked');}});expect(readPreference('bad','default')).toBe('default');
 });
 it('reports quota failure without discarding the last complete saved preference',()=>{
  expect(writePreference('settings:test',{size:24})).toBe(true);const set=localStorage.setItem;localStorage.setItem=()=>{throw new DOMException('Full','QuotaExceededError');};expect(writePreference('settings:test',{size:48})).toBe(false);localStorage.setItem=set;expect(readPreference('settings:test')).toEqual({size:24});
 });
 it('ignores records and writes from a session predating Clear saved data',()=>{
  writePreference('settings:test',{size:24});data.set(storagePrefix+'cleared','new-session');expect(readPreference('settings:test','default')).toBe('default');expect(writePreference('settings:test',{size:48})).toBe(false);
 });
});

it('round-trips source bytes and metadata without Blob persistence or text encoding',async()=>{
 vi.stubGlobal('File',File);const file=new File([new Uint8Array([0,255,13,10,128])],'fixture.pdf',{type:'application/pdf',lastModified:1234});
 await prepareFiles([file]);const record=structuredClone(packFiles([file]));expect(record[0].bytes).toBeInstanceOf(ArrayBuffer);
 const [restored]=unpackFiles(record);expect(restored.name).toBe('fixture.pdf');expect(restored.type).toBe('application/pdf');expect(restored.lastModified).toBe(1234);expect([...new Uint8Array(await restored.arrayBuffer())]).toEqual([0,255,13,10,128]);
 expect(packFiles([restored])[0].bytes).toBeInstanceOf(ArrayBuffer);
});
