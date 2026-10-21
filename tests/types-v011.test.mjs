import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {normalizeEntry,eligibleTableEntries,proposeTableScenario} from '../scripts/core.js';
import {EncounterUI} from '../scripts/ui.js';
const data=key=>JSON.parse(readFileSync(new URL('../data/'+key+'.json',import.meta.url)));
const seed=data('seed-tables'),recipes=data('recipes'),costs=data('costs');
const gorges=seed.gorges.results;
globalThis.game={modules:{get:()=>null},tables:{contents:[]},settings:{get:()=>[]}};
test('le vrai type Foundry prévaut sur le format text',()=>{
 const raw={type:'text',description:'Pillards',flags:{h0d:{xp:40,typeRencontre:'autre'}}};
 assert.equal(normalizeEntry(raw).type,'autre');
 assert.equal(eligibleTableEntries([raw],{level:3,difficulty:'standard',type:'autre'}).length,1);
 assert.equal(eligibleTableEntries([raw],{level:3,difficulty:'standard',type:'machine'}).length,0);
});
test('proposition Autre exclut les machines dans les Gorges',()=>{
 for(const rng of [()=>0,()=>0.5,()=>0.999]){
  const result=proposeTableScenario(gorges,{level:3,difficulty:'standard',type:'autre'},rng);
  assert.equal(result.entries[0].type,'autre');
 }
});
test('proposition Mixte assemble machine et autre sans dépasser les XP max',()=>{
 const result=proposeTableScenario(gorges,{level:3,difficulty:'standard',type:'mixte'},()=>0);
 assert.deepEqual(result.entries.map(x=>x.type),['machine','autre']);
 assert.ok(result.entries.reduce((s,x)=>s+x.xpMax,0)<=160);
});
test('proposition Mixte sans budget suffisant refuse',()=>{
 const src=[{type:'machine',xp:80,description:'M'},{type:'autre',xp:80,description:'A'}];
 assert.equal(proposeTableScenario(src,{level:2,difficulty:'facile',type:'mixte'}),null);
});
test('adversaires non résolus sont affichés et le total non certifié',()=>{
 const ui=new EncounterUI({costs,recipes,events:{},seedLoot:{}});
 ui.registry=new Map([['machine:watcher',{label:'Watcher',source:'machine',threat:1}]]);
 ui.resultFromTableRows([gorges.find(x=>x.description==='2 Watchers ensablés'),gorges.find(x=>x.description==='2 Pillards Rouges recrues')],'auto','local',true);
 assert.deepEqual(ui.state.last.unlinkedDescriptions,['2 Pillards Rouges recrues']);
 assert.equal(ui.state.last.eval.complete,false);
 assert.equal(ui.state.last.eval.withinBudget,null);
});
