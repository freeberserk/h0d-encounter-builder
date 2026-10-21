import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {
  DISCOVERY_TABLE_NAME,DISCOVERY_DEFAULTS,discoverySources,findDiscoveryTable,
  chooseDiscoverySource,normalizeDiscoverySource,ensureDiscoveryTable
} from '../scripts/discoveries.js';
import {evaluateComposition} from '../scripts/core.js';
import {EncounterUI} from '../scripts/ui.js';
const costs=JSON.parse(readFileSync(new URL('../data/costs.json',import.meta.url)));
const machines=new Map([
 ['machine:watcher',{id:'machine:watcher',label:'Watcher',source:'machine',threat:1}],
 ['machine:scrapper-standard',{id:'machine:scrapper-standard',label:'Scrapper',source:'machine',threat:2}],
 ['faction:pillard',{id:'faction:pillard',label:'Pillard Rouge',source:'faction',faction:'pillards-rouges',threat:2}]
]);
const tables=[];
globalThis.game={
 user:{isGM:true,id:'mj'},
 modules:{get:()=>null},
 tables:{contents:tables},
 settings:{get:()=>[]}
};
globalThis.ui={notifications:{info:()=>{},warn:()=>{},error:()=>{}}};
function mockHtml(){
 return {find:()=>({html(){return this},val(){return this},toggle(){return this},toggleClass(){return this}})};
}
test('le bouton de validation manuelle est visible dans le bloc de composition',()=>{
 const dialogue=new EncounterUI({costs,seedLoot:{},events:{},recipes:{}});
 dialogue.registry=machines;
 const markup=dialogue.template();
 assert.match(markup,/data-action="validateManual"/);
 assert.match(markup,/data-region="manual-budget"/);
 assert.match(markup,/Aléatoire \(table Foundry\)/);
 assert.match(markup,/data-action="openDiscoveryTable"/);
});
test('la validation manuelle calcule 2 Watchers et 1 Scrapper à 70 sur 160 XP',async()=>{
 const dialogue=new EncounterUI({costs,seedLoot:{},events:{},recipes:{}});
 dialogue.registry=machines;
 dialogue.state.members=[{id:'machine:watcher',qty:2},{id:'machine:scrapper-standard',qty:1}];
 dialogue.state.discoveryChance=100;
 await dialogue.action('validateManual',mockHtml());
 assert.equal(dialogue.state.mode,'manuel');
 assert.equal(dialogue.state.last.eval.baseKnownXP,70);
 assert.equal(dialogue.state.last.eval.budget,160);
 assert.equal(dialogue.state.last.eval.budgetState,'within');
 assert.equal(dialogue.state.last.discovery,null); // Valider ne tire PAS de loot
 assert.equal(dialogue.state.last.event,null);
});
test('le dépassement connu est signalé même si un XP manque',()=>{
 const out=evaluateComposition([
  {id:'machine:scrapper-standard',qty:5},{id:'faction:pillard',qty:1}
 ],machines,costs,{level:3,difficulty:'standard'});
 assert.equal(out.complete,false);
 assert.equal(out.certainOverBudget,true);
 assert.equal(out.budgetState,'over');
 assert.equal(out.budgetDelta,-40);
 assert.equal(out.totalXP,null);
});
test('un coût non documenté sous plafond ne certifie jamais la difficulté',()=>{
 const out=evaluateComposition([{id:'faction:pillard',qty:1}],machines,costs,{level:3,difficulty:'standard'});
 assert.equal(out.budgetState,'incomplete');
 assert.equal(out.withinBudget,null);
});
test('la source auto part de trois catégories équiprobables et conserve les poids',()=>{
 assert.deepEqual(DISCOVERY_DEFAULTS.map(x=>[x.id,x.weight]),[
  ['machine',1],['creature',1],['equipment',1]]);
 const table={results:{contents:[
  {type:'text',description:'Ressources machines',weight:6,flags:{h0d:{discoverySource:'machine'}}},
  {type:'text',description:'Ressources faune',weight:2,flags:{h0d:{discoverySource:'creature'}}},
  {type:'text',description:'Équipement',weight:1,flags:{h0d:{discoverySource:'equipment'}}}
 ]}};
 assert.equal(discoverySources(table)[0].weight,6);
 const candidates=()=>[{weight:1}];
 assert.equal(chooseDiscoverySource(table,candidates,()=>0.1).id,'machine');
 assert.equal(chooseDiscoverySource(table,candidates,()=>0.8).id,'creature');
 assert.equal(chooseDiscoverySource(table,candidates,()=>0.99).id,'equipment');
});
test('une source sans candidats ne peut pas être choisie; ligne invalide exclue',()=>{
 const table={results:{contents:[
  {description:'Ressources machines',weight:10,flags:{h0d:{discoverySource:'machine'}}},
  {description:'Équipement',weight:1,flags:{h0d:{discoverySource:'equipment'}}},
  {description:'inconnu',weight:500}
 ]}};
 assert.equal(normalizeDiscoverySource({description:'inconnu',weight:1}),null);
 assert.equal(chooseDiscoverySource(table,id=>id==='equipment'?[{weight:1}]:[],()=>0).id,'equipment');
});
test('la table Foundry est créée une seule fois, sans écraser les modifications MJ',async()=>{
 let creations=0;
 globalThis.RollTable={
  create:async data=>{
   creations++;
   const table={name:data.name,flags:data.flags,results:{contents:data.results},sheet:{render:()=>{}}};
   tables.push(table);
   return table;
  }
 };
 assert.equal(findDiscoveryTable(),null);
 const first=await ensureDiscoveryTable();
 assert.equal(first.name,DISCOVERY_TABLE_NAME);
 assert.equal(first.results.contents.length,3);
 assert.equal(first.results.contents[0].flags.h0d.discoverySource,'machine');
 first.results.contents[0].weight=20;
 const again=await ensureDiscoveryTable();
 assert.equal(again,first);
 assert.equal(again.results.contents[0].weight,20);
 assert.equal(creations,1);
});
