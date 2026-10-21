import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {budgetFor,normalizeEntry,eligibleTableEntries,weightedChoice,evaluateComposition,suggestComposition,mergeComposition,chance} from '../scripts/core.js';
const data=key=>JSON.parse(readFileSync(new URL('../data/'+key+'.json',import.meta.url)));
const costs=data('costs');
const tables=data('seed-tables');
const recipes=data('recipes');
const registry=new Map([
  ['machine:watcher',{label:'Watcher standard',source:'machine',threat:1}],
  ['machine:scrapper-standard',{label:'Scrapper standard',source:'machine',threat:2}],
  ['machine:redeye-watcher',{label:'Redeye Watcher',source:'machine',threat:2}],
  ['machine:longleg',{label:'Longleg',source:'machine',threat:3}],
  ['machine:tisseur-elys9',{label:'Tisseur ELYS-9',source:'machine',threat:3}],
  ['faction:maraudeur',{label:'Maraudeur Rouge',source:'faction',threat:3}]
]);

test('les sept tables v2 sont présentes, les deux autres restent explicitement indisponibles',()=>{
  assert.equal(Object.values(tables).filter(x=>x.available).length,7);
  assert.equal(tables.gorges.results.length,12);
  assert.equal(tables.vallee.version,2);
  assert.equal(tables.plaines.available,false);
  assert.equal(tables.heliosium.available,false);
});
test('budget niveau 3 et absence de barème au-delà du niveau 10',()=>{
  assert.equal(budgetFor(3,'facile'),100);
  assert.equal(budgetFor(3,'standard'),160);
  assert.equal(budgetFor(11,'standard'),null);
});
test('2 Watchers + 1 Scrapper = 70 XP documentés',()=>{
  const out=evaluateComposition([{id:'machine:watcher',qty:2},{id:'machine:scrapper-standard',qty:1}],registry,costs,{level:3,difficulty:'standard'});
  assert.equal(out.baseKnownXP,70);
  assert.equal(out.totalXP,70);
  assert.equal(out.budget,160);
  assert.equal(out.complete,true);
  assert.equal(out.withinBudget,true);
});
test('facteur défavorable applique +25 % sans convertir les alliés en PJ',()=>{
  const out=evaluateComposition([{id:'machine:watcher',qty:2},{id:'machine:scrapper-standard',qty:1}],registry,costs,{level:3,difficulty:'standard',unfavorable:true,allies:[{id:'faction:maela',qty:1}]});
  assert.equal(out.totalXP,88);
  assert.match(out.warnings.join(' '),/PNJ alliés/);
});
test('XP inconnu n\'est jamais traité comme 0',()=>{
  const out=evaluateComposition([{id:'faction:maraudeur',qty:1}],registry,costs,{level:3,difficulty:'standard'});
  assert.equal(out.complete,false);
  assert.equal(out.totalXP,null);
  assert.equal(out.baseKnownXP,0);
  assert.match(out.warnings.join(' '),/sans coût XP/);
});
test('profil inconnu et rapprochement provisoire ne sont pas certifiés',()=>{
  const unknown=evaluateComposition([{id:'machine:fantome',qty:1}],registry,costs,{level:3});
  assert.equal(unknown.complete,false);
  const provisional=evaluateComposition([{id:'creature:serpent-venimeux',qty:1}],new Map([['creature:serpent-venimeux',{label:'Serpent'}]]),costs,{level:3});
  assert.equal(provisional.complete,false);
  assert.equal(provisional.totalXP,null);
});
test('tirage de table ne dépasse pas le budget même en repli',()=>{
  const l2=eligibleTableEntries(tables.gorges.results,{level:2,difficulty:'facile',type:'machine'});
  assert.ok(l2.length>0);
  assert.ok(l2.every(e=>e.xpMax<=60));
  const l2bad=eligibleTableEntries(tables.gorges.results,{level:1,difficulty:'facile',type:'mixte'});
  assert.equal(l2bad.length,0);
  assert.ok(!l2.map(e=>e.description).includes('1 Sawtooth attiré par les signaux'));
});
test('les XP maximum contrôlent les rencontres à coût variable',()=>{
  const entries=[{description:'1d3 chiens',xp:30,xpMin:10,xpMax:30,weight:1}];
  assert.equal(eligibleTableEntries(entries,{level:1,difficulty:'facile'}).length,1);
  assert.equal(eligibleTableEntries(entries,{level:1,difficulty:'facile',unfavorable:true}).length,0);
});
test('les poids de table sont respectés',()=>{
  const list=[{id:'a',weight:1},{id:'b',weight:3}];
  assert.equal(weightedChoice(list,()=>0.1).id,'a');
  assert.equal(weightedChoice(list,()=>0.5).id,'b');
  assert.equal(weightedChoice([],()=>0.5),null);
});
test('événement à 0 % impossible, à 100 % garanti',()=>{
  assert.equal(chance(0,()=>0.5),false);
  assert.equal(chance(100,()=>0.5),true);
});
test('composition fusionnée sans duplicate et aucun dépassement en suggestion',()=>{
  assert.deepEqual(mergeComposition([{id:'machine:watcher',qty:1},{id:'machine:watcher',qty:2}]),[{id:'machine:watcher',qty:3}]);
  const pool=[{id:'machine:watcher',weight:1},{id:'machine:scrapper-standard',weight:1},{id:'machine:longleg',weight:1}];
  const suggested=suggestComposition([{id:'machine:watcher',qty:2}],pool,registry,costs,{level:2,difficulty:'standard',maxCount:4},()=>0);
  assert.ok(suggested.composition.some(p=>p.id==='machine:watcher'&&p.qty>=2));
  const out=evaluateComposition(suggested.composition,registry,costs,{level:2,difficulty:'standard'});
  assert.ok(out.totalXP<=100);
});
test('pas de composition aléatoire dangereusement non chiffrée',()=>{
  const result=suggestComposition([], [{id:'faction:maraudeur',weight:1}],registry,costs,{level:3});
  assert.equal(result.composition.length,0);
  assert.match(result.reason,/Aucun profil tarifé/);
});
test('source structurée des Gorges contient les deux Watchers et le Scrapper',()=>{
  assert.deepEqual(recipes.gorges['2 Watchers ensablés'],[{id:'machine:watcher',qty:2,context:'ensablés'}]);
  assert.deepEqual(recipes.gorges['1 Scrapper fouillant une épave'],[{id:'machine:scrapper-standard',qty:1,context:'fouille une épave'}]);
  assert.equal(recipes.gorges['2 Pillards Rouges recrues'],null);
});
test('normalisation accepte le champ description de Foundry v14 et flags XP',()=>{
  const result=normalizeEntry({description:'Vautours',weight:2,flags:{h0d:{xp:0,typeRencontre:'hors-combat'}}});
  assert.equal(result.description,'Vautours');assert.equal(result.xp,0);assert.equal(result.type,'hors-combat');assert.equal(result.weight,2);
  const unknown=normalizeEntry({description:'Inconnu'});assert.equal(unknown.xp,null);
});
