import test from 'node:test';
import assert from 'node:assert/strict';
import {MANUAL_CATEGORIES,factionChoices,manualChoices,collectProfiles,UNCLASSIFIED_FACTION} from '../scripts/integrations.js';
import {EncounterUI} from '../scripts/ui.js';
const modules=new Map();
globalThis.game={modules:{get:id=>modules.get(id)},tables:{contents:[]},settings:{get:()=>[]}};
const sample=new Map([
  ['machine:watcher',{id:'machine:watcher',source:'machine',label:'Watcher standard',threat:1}],
  ['creature:loup',{id:'creature:loup',source:'creature',label:'Loup gris',threat:1}],
  ['faction:pillard',{id:'faction:pillard',source:'faction',label:'Sang-neuf Rouge',threat:2,faction:'pillards-rouges',factionLabel:'Pillards Rouges'}],
  ['faction:maela',{id:'faction:maela',source:'faction',label:'Maela',threat:4,faction:'dent-ambre',factionLabel:"Clan de la Dent d'Ambre"}],
  ['faction:autre',{id:'faction:autre',source:'faction',label:'Inconnu',threat:1}]
]);
test('trois catégories, listes non mélangées',()=>{
 assert.deepEqual(MANUAL_CATEGORIES.map(x=>x[0]),['machine','creature','faction']);
 assert.deepEqual(manualChoices(sample,'machine').map(x=>x.id),['machine:watcher']);
 assert.deepEqual(manualChoices(sample,'creature').map(x=>x.id),['creature:loup']);
 assert.deepEqual(manualChoices(sample,'faction'),[]);
});
test('chaque faction possède son propre groupe et les noms sont issus des profils',()=>{
 assert.deepEqual(manualChoices(sample,'faction','pillards-rouges').map(x=>x.label),['Sang-neuf Rouge']);
 assert.deepEqual(manualChoices(sample,'faction','dent-ambre').map(x=>x.label),['Maela']);
 assert.deepEqual(manualChoices(sample,'faction',UNCLASSIFIED_FACTION).map(x=>x.label),['Inconnu']);
 assert.ok(factionChoices(sample).some(([key,label])=>key==='pillards-rouges'&&label==='Pillards Rouges'));
});
test('une nouvelle faction enregistrée apparaît sans mise à jour du code',()=>{
 const newer=new Map(sample);
 newer.set('faction:future',{id:'faction:future',source:'faction',label:'Explorateur',faction:'future-faction',factionLabel:'Le Peuple Futur'});
 assert.ok(factionChoices(newer).some(([key,label])=>key==='future-faction'&&label==='Le Peuple Futur'));
});
test('modules absents : aucune confusion machine/faune/faction',()=>{
 const onlyMachine=new Map([['machine:watcher',sample.get('machine:watcher')]]);
 assert.deepEqual(manualChoices(onlyMachine,'faction','pillards-rouges'),[]);
 assert.deepEqual(manualChoices(onlyMachine,'creature'),[]);
});
test('interface manuelle affiche les menus, protège les profils et conserve la composition',async()=>{
 const ui=new EncounterUI({costs:{},recipes:{},events:{},seedLoot:{}});
 ui.registry=sample;
 let template=ui.template();
 assert.match(template,/data-key="manualCategory"/);
 assert.match(template,/data-key="manualFaction"/);
 assert.match(template,/data-key="profileId"/);
 ui.state.members=[{id:'machine:watcher',qty:2}];
 ui.state.manualCategory='faction';
 ui.state.manualFaction='pillards-rouges';
 ui.state.profileId='creature:loup';
 await assert.rejects(()=>ui.action('add',null),/catégorie et à la faction/);
 assert.deepEqual(ui.state.members,[{id:'machine:watcher',qty:2}]);
 ui.state.profileId='faction:pillard';
 assert.deepEqual(ui.manualProfiles().map(([id])=>id),['faction:pillard']);
 template=ui.template();
 assert.match(template,/Sang-neuf Rouge/);
});
test('les labels du Faction Builder actif sont préférés aux clés internes',()=>{
 modules.set('h0d-faction-builder',{active:true,api:{
  factions:new Map([['pillards-rouges',{label:'Pillards Rouges'}],['dent-ambre',{label:"Clan de la Dent d'Ambre"}]]),
  archetypes:new Map([['sang-neuf',{label:'Sang-neuf Rouge',factionKey:'pillards-rouges',actor:{props:{H0D_Creature_Menace:'2'}}}]]),
  council:{entries:new Map([['maela',{name:'Maela',role:'Maître chasseur',actor:{props:{H0D_Creature_Menace:'4'}}}]])}
 }});
 const registry=collectProfiles();
 assert.equal(registry.get('faction:sang-neuf').factionLabel,'Pillards Rouges');
 assert.equal(registry.get('faction:council-maela').factionLabel,"Clan de la Dent d'Ambre");
});
