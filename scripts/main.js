import {EncounterUI} from './ui.js';
import {collectProfiles,integrationStatus,getTableData,buildBiomePool,getHeliosiumRecipes} from './integrations.js';
import {evaluateComposition,suggestComposition,budgetFor,eligibleTableEntries,weightedChoice,BIOMES} from './core.js';
import {ensureDiscoveryTable,findDiscoveryTable,discoverySources} from './discoveries.js';
import {prepareHeliosiumRecipe,heliosiumSynergyWarnings} from './endgame.js';
const ID='h0d-encounter-builder';
const VERSION='0.1.5';
const data={seedTables:{},seedLoot:{},recipes:{},events:{},costs:{}};
let uiInstance=null;
async function loadData(){
  for(const [key,path] of [['seedTables','seed-tables'],['seedLoot','seed-loot'],['recipes','recipes'],['events','events'],['costs','costs']]){
    try{
      const r=await fetch(`modules/${ID}/data/${path}.json`);
      if(!r.ok)throw new Error(`HTTP ${r.status}`);
      data[key]=await r.json();
    }catch(e){console.error(`${ID} | ${path}:`,e);data[key]={};}
  }
}
function open(){
  if(!game.user?.isGM){ui.notifications.warn('H0D Encounter Builder : réservé aux MJ.');return null;}
  return (uiInstance??=new EncounterUI(data)).open();
}
async function ensureMacro(){
  if(!game.user?.isGM)return;
  const name='H0D — Encounter Builder';
  const command='game.h0dEncounterBuilder.open();';
  let macro=game.macros?.getName(name);
  if(!macro)macro=await Macro.create({name,type:'script',scope:'global',img:'icons/svg/dice-target.svg',command});
  else if(macro.command!==command)await macro.update({command});
}
Hooks.once('init',()=>{
  game.settings.register(ID,'savedEncounters',{name:'Compositions sauvegardées H0D',scope:'world',config:false,type:Array,default:[]});
});
Hooks.once('ready',async()=>{
  await loadData();
  if(game.user?.isGM){
    try{await ensureDiscoveryTable()}
    catch(e){console.warn(ID+' | Création de la table des découvertes impossible :',e);ui.notifications?.warn?.('Encounter Builder : création automatique de la table des découvertes impossible.');}
  }
  const api={
    version:VERSION,open,
    profiles:()=>collectProfiles(),
    status:integrationStatus,
    discoveryTable:findDiscoveryTable,
    discoverySources:()=>discoverySources(findDiscoveryTable()),
    ensureDiscoveryTable,
    biomes:BIOMES,
    getTable:biome=>getTableData(biome,data.seedTables),
    getPool:biome=>buildBiomePool(biome,data.recipes),
    validate:(composition,options={})=>evaluateComposition(composition,collectProfiles(),data.costs,options),
    suggest:(composition,biome,options={})=>suggestComposition(composition,buildBiomePool(biome,data.recipes),collectProfiles(),data.costs,options),
    budget:budgetFor,
    heliosiumRecipes:getHeliosiumRecipes,
    prepareHeliosiumRecipe:(recipeId,opts={})=>prepareHeliosiumRecipe(getHeliosiumRecipes().find(r=>r.id===recipeId),collectProfiles(),opts),
    endgameWarnings:composition=>heliosiumSynergyWarnings(composition,collectProfiles()),
    eligible:(biome,options)=>eligibleTableEntries(getTableData(biome,data.seedTables).results,options),
    data:()=>({tables:Object.keys(data.seedTables),recipes:Object.keys(data.recipes),events:Object.keys(data.events),costs:Object.keys(data.costs)})
  };
  game.h0dEncounterBuilder=api;
  const mod=game.modules?.get(ID);if(mod)mod.api=api;
  try{await ensureMacro()}catch(e){console.warn(ID+' | Impossible de créer la macro de lancement',e);}
  console.log(`${ID} | v${VERSION} prêt · ${collectProfiles().size} profils visibles`);
});
