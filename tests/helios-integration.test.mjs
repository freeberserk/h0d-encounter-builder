import test from 'node:test';
import assert from 'node:assert/strict';
import {collectProfiles} from '../scripts/integrations.js';
import {EncounterUI} from '../scripts/ui.js';

const archetypes=new Map([
 ['drone-pollinisateur',{
  key:'drone-pollinisateur',label:'Drone pollinisateur',factionKey:'helios',
  incomplete:true,combatReady:false,
  actor:{props:{H0D_Creature_Menace:'1',H0D_Creature_Role:'Pollinisation'}}
 }],
 ['gardien-du-cycle',{
  key:'gardien-du-cycle',label:'Gardien du Cycle',factionKey:'helios',
  incomplete:true,combatReady:false,
  actor:{props:{H0D_Creature_Menace:'',H0D_Creature_Role:'Restauration GAIA'}}
 }],
 ['gardien-nexus',{
  key:'gardien-nexus',label:'Gardien Nexus',factionKey:'helios',
  incomplete:false,combatReady:true,
  actor:{props:{H0D_Creature_Menace:'13',H0D_Creature_Role:'Secours critique'}},
  encounter:{hostileDefault:false,generation_aleatoire:'non'}
 }]
]);
const modules=new Map([['h0d-faction-builder',{active:true,api:{
 factions:new Map([['helios',{label:'HELIOS'}]]),
 archetypes,
 heliosiumEncounters:[]
}}]]);
globalThis.game={
 modules:{get:id=>modules.get(id)},
 settings:{get:()=>[]},
 user:{id:'mj',isGM:true},
 tables:{contents:[]}
};
test('les unités conceptuelles HELIOS sont reprises sans fausse menace 0',()=>{
 const registry=collectProfiles();
 assert.equal(registry.get('faction:drone-pollinisateur').combatReady,false);
 assert.equal(registry.get('faction:gardien-du-cycle').threat,null);
 assert.equal(registry.get('faction:gardien-nexus').combatReady,true);
 assert.equal(registry.get('faction:gardien-nexus').encounter.hostileDefault,false);
});
test('le menu manuel indique référence non chiffrée pour les concepts',()=>{
 const ui=new EncounterUI({costs:{},recipes:{},events:{},seedLoot:{}});
 ui.state.manualCategory='faction';ui.state.manualFaction='helios';
 const choices=ui.manualProfiles();
 assert.match(choices.find(([id])=>id==='faction:drone-pollinisateur')[1],/RÉFÉRENCE NON CHIFFRÉE/);
 assert.match(choices.find(([id])=>id==='faction:gardien-du-cycle')[1],/Menace à définir/);
 assert.match(choices.find(([id])=>id==='faction:gardien-nexus')[1],/CONDITIONNEL \/ MANUEL/);
});
test('la validation narrative prévient que les concepts ne sont pas des Actors jouables',()=>{
 const ui=new EncounterUI({costs:{},recipes:{},events:{},seedLoot:{}});
 const r=ui.createResult({mode:'manuel',entries:[{id:'faction:drone-pollinisateur',qty:1}],extra:false});
 assert.equal(r.eval.complete,false);
 assert.match(r.warnings.join(' '),/NARRATIVE/);
 assert.match(r.warnings.join(' '),/NON CHIFFRÉ/);
});
test('Gardien Nexus : warning de désescalade et de dépendance au câble',()=>{
 const ui=new EncounterUI({costs:{},recipes:{},events:{},seedLoot:{}});
 const r=ui.createResult({mode:'manuel',entries:[{id:'faction:gardien-nexus',qty:1}],extra:false});
 assert.equal(r.eval.complete,false); // pas d XP documenté
 assert.match(r.warnings.join(' '),/docké/);
 assert.match(r.warnings.join(' '),/Canon Gauss seulement connecté ET protocole Éradication/);
});
