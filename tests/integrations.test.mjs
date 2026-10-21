import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {collectProfiles,findEncounterTable,getTableData,buildBiomePool,findRecipe,lootCandidates,integrationStatus} from '../scripts/integrations.js';
const seed=JSON.parse(readFileSync(new URL('../data/seed-tables.json',import.meta.url)));
const recipes=JSON.parse(readFileSync(new URL('../data/recipes.json',import.meta.url)));
const seedLoot=JSON.parse(readFileSync(new URL('../data/seed-loot.json',import.meta.url)));
const modules=new Map();
const tableWorld=[];
globalThis.game={modules:{get:id=>modules.get(id)},tables:{contents:tableWorld}};
const active=(id,api)=>modules.set(id,{active:true,api});

test('lecture des API machine, créature, faction et Conseil sans créer d’acteur',()=>{
  active('h0d-machine-builder',{machines:{watcher:{label:'Watcher standard',actor:{threat:1}}}});
  active('h0d-creature-builder',{creatures:new Map([['serpent-venimeux',{label:'Serpent venimeux',actor:{props:{H0D_Creature_Menace:'1'}}}]])});
  active('h0d-faction-builder',{archetypes:new Map([['pillard',{label:'Pillard Rouge',factionKey:'pillards-rouges',actor:{props:{H0D_Creature_Menace:'2'}}}]]),council:{entries:new Map([['maela',{name:'Maela',role:'Maître chasseur',actor:{props:{H0D_Creature_Menace:'4'}}}]])}});
  const profiles=collectProfiles();
  assert.equal(profiles.size,4);
  assert.equal(profiles.get('machine:watcher').threat,1);
  assert.equal(profiles.get('faction:council-maela').label,'Maela');
  assert.equal(profiles.get('creature:serpent-venimeux').threat,1);
});
test('la table Foundry la plus récente (V2) prévaut sur V1 et sur le secours intégré',()=>{
  tableWorld.length=0;
  const old={name:'Rencontre — Vallée de la Dent d’Ambre',flags:{h0d:{version:1}},results:{contents:[{description:'v1',flags:{h0d:{xp:1}}}]}};
  const cur={name:old.name,flags:{h0d:{version:2}},results:{contents:[{description:'v2',flags:{h0d:{xp:2}}}]}};
  tableWorld.push(old,cur);
  assert.equal(findEncounterTable('vallee'),cur);
  const read=getTableData('vallee',seed);
  assert.equal(read.origin,'foundry');assert.equal(read.results[0].description,'v2');
  tableWorld.length=0;
  assert.equal(getTableData('gorges',seed).origin,'local');
  assert.equal(getTableData('plaines',seed).origin,'absent');
});
test('table de recettes garde les cas non résolus séparés',()=>{
  const pool=buildBiomePool('gorges',recipes);
  assert.ok(pool.some(x=>x.id==='machine:watcher'));
  assert.equal(findRecipe('gorges','2 Pillards Rouges recrues',recipes),null);
  assert.deepEqual(findRecipe('gorges','Vautours noirs autour d’une carcasse',recipes),[]);
});
test('ressources sans RollTable : secours des exports H0D Loot',()=>{
  assert.equal(lootCandidates('machine',seedLoot).length,11);
  assert.equal(lootCandidates('creature',seedLoot).length,4);
  assert.equal(lootCandidates('equipment',seedLoot).length,0); // module équipement désactivé : aucun objet inventé
  assert.equal(integrationStatus().machine,true);
  assert.equal(integrationStatus().loot,false);
});
