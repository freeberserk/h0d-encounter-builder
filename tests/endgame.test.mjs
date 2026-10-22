import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {prepareHeliosiumRecipe,heliosiumSynergyWarnings} from '../scripts/endgame.js';
import {collectProfiles,getHeliosiumRecipes} from '../scripts/integrations.js';
import {EncounterUI} from '../scripts/ui.js';
const recipes=[
 {id:'patrouille-reseau',nom:'Patrouille de réseau',generation_aleatoire:'oui',
  members:[{profile:'sentinelle-heliosium',min:1,max:1},{profile:'auxiliaire-restaure',min:2,max:4}],
  logique:'Information + ligne légère'},
 {id:'avatar-invoque',nom:'Avatar invoqué',generation_aleatoire:'conditionnelle',
  members:[{profile:'elu-de-la-convergence',min:1,max:1},{profile:'avatar-invoque',min:1,max:1}],logique:'Élu + composants'},
 {id:'corps-veritable',nom:'Corps véritable',generation_aleatoire:'non',
  members:[{profile:'corps-veritable-dheliosium',min:1,max:1}],logique:'Boss final'},
 {id:'mur-convergence',nom:'Mur de Convergence',generation_aleatoire:'oui',
  members:[{profile:'lancier-de-convergence',min:5,max:5}],logique:'Phalange'}
];
const meta={
 'auxiliaire-restaure':{generation_aleatoire:'oui',nombre_conseille:{max:8}},
 'lancier-de-convergence':{generation_aleatoire:'oui',nombre_conseille:{max:5}},
 'sentinelle-heliosium':{generation_aleatoire:'oui',nombre_conseille:{max:3}},
 'elu-de-la-convergence':{generation_aleatoire:'oui',nombre_conseille:{max:1}},
 'avatar-invoque':{generation_aleatoire:'conditionnelle',nombre_conseille:{max:1}},
 'corps-veritable-dheliosium':{generation_aleatoire:'non',nombre_conseille:{max:1}},
 'artilleur-de-convergence':{generation_aleatoire:'oui',nombre_conseille:{max:2}}
};
const archetypes=new Map(Object.keys(meta).map(id=>[id,{
 key:id,label:id,factionKey:'heliosium',
 encounter:meta[id],actor:{props:{H0D_Creature_Menace:id==='corps-veritable-dheliosium'?'15':'5'}}
}]));
const modules=new Map();
globalThis.game={
 user:{isGM:true,id:'mj'},
 modules:{get:id=>modules.get(id)},
 tables:{contents:[]},
 settings:{get:()=>[]}
};
globalThis.ui={notifications:{info:()=>{},warn:()=>{}}};
modules.set('h0d-faction-builder',{active:true,api:{
 factions:new Map([['heliosium',{label:'HelioSium'}]]),
 archetypes,heliosiumEncounters:recipes
}});
const registry=collectProfiles();
test('les 9 recettes peuvent être exposées sans copier les fiches dans l Encounter Builder',()=>{
 assert.equal(getHeliosiumRecipes().length,4);
 assert.equal(registry.get('faction:auxiliaire-restaure').encounter.nombre_conseille.max,8);
});
test('patrouille : min 2 auxiliaires + sentinelle, non aléatoire',()=>{
 const r=prepareHeliosiumRecipe(recipes[0],registry);
 assert.deepEqual(r.entries,[{id:'faction:sentinelle-heliosium',qty:1},{id:'faction:auxiliaire-restaure',qty:2}]);
 assert.match(r.warnings[0],/préparation manuelle/);
});
test('Avatar interdit sans confirmation des conditions',()=>{
 assert.throws(()=>prepareHeliosiumRecipe(recipes[1],registry),/conditions de scénario/);
 const r=prepareHeliosiumRecipe(recipes[1],registry,{conditionsMet:true});
 assert.equal(r.entries.length,2);
 assert.match(r.warnings.join(' '),/modules/);
});
test('boss final refusé sans confirmation EXPRESSE même si recette sélectionnée',()=>{
 assert.throws(()=>prepareHeliosiumRecipe(recipes[2],registry,{conditionsMet:true}),/UNIQUE/);
 const r=prepareHeliosiumRecipe(recipes[2],registry,{allowFinal:true});
 assert.deepEqual(r.entries,[{id:'faction:corps-veritable-dheliosium',qty:1}]);
 assert.match(r.warnings.join(' '),/jamais tiré au hasard/);
});
test('module Faction absent : aucun monstre final inventé',()=>{
 modules.set('h0d-faction-builder',{active:false,api:{heliosiumEncounters:recipes}});
 assert.deepEqual(getHeliosiumRecipes(),[]);
 modules.set('h0d-faction-builder',{active:true,api:{factions:new Map([['heliosium',{label:'HelioSium'}]]),archetypes,heliosiumEncounters:recipes}});
});
test('synergies documentées, sans bonus XP fictif',()=>{
 const choices=[
  {id:'faction:auxiliaire-restaure',qty:2},{id:'faction:lancier-de-convergence',qty:5},
  {id:'faction:elu-de-la-convergence',qty:1},{id:'faction:artilleur-de-convergence',qty:1}
 ];
 const warnings=heliosiumSynergyWarnings(choices,registry).join(' ');
 assert.match(warnings,/aucun bonus offensif/);
 assert.match(warnings,/Cinq Lanciers/);
 assert.match(warnings,/Élu/);
 assert.match(warnings,/plateforme PV 40/);
 assert.doesNotMatch(warnings,/XP\s*[0-9]/);
});
test('l Avatar sans Élu déclenche une alerte même en manuel',()=>{
 const warnings=heliosiumSynergyWarnings([{id:'faction:avatar-invoque',qty:1}],registry);
 assert.match(warnings.join(' '),/sans Élu/);
});
test('l interface expose la sélection des recettes et une confirmation finale distincte',()=>{
 const dialog=new EncounterUI({recipes:{},costs:{},events:{},seedLoot:{}});
 dialog.registry=registry;
 const markup=dialog.template();
 assert.match(markup,/data-action="loadEndgameRecipe"/);
 assert.match(markup,/data-key="recipeConditions"/);
 assert.match(markup,/data-key="recipeFinal"/);
 assert.match(markup,/jamais aléatoire/);
});
test('mode aléatoire historique ne fait jamais appel aux recettes du boss',()=>{
 const oldRecipes=JSON.parse(readFileSync(new URL('../data/recipes.json',import.meta.url)));
 assert.ok(!JSON.stringify(oldRecipes).includes('corps-veritable-dheliosium'));
});
