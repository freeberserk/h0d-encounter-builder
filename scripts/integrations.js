import {BIOMES,biomeName,norm,normalizeEntry} from './core.js';
const MODULE_ID='h0d-encounter-builder';
const readMap = x => x instanceof Map ? [...x.entries()]:Object.entries(x??{});
const sourceApi = (moduleId,globalKey) => {
  const mod=game.modules?.get(moduleId);
  return mod?.active ? (mod.api??game[globalKey]??null) : null;
};
export function integrationStatus(){
  return {
    machine:!!sourceApi('h0d-machine-builder','h0dMachineBuilder'),
    creature:!!sourceApi('h0d-creature-builder','h0dCreatureBuilder'),
    faction:!!sourceApi('h0d-faction-builder','h0dFactionBuilder'),
    equipment:!!sourceApi('h0d-equipment-builder','h0dEquipmentBuilder'),
    loot:!!sourceApi('h0d-loot','h0dLoot')
  };
}
export const MANUAL_CATEGORIES=Object.freeze([['machine','Machines'],['creature','Faune'],['faction','Factions']]);
export const UNCLASSIFIED_FACTION='__sans-faction__';
/** La liste des factions provient exclusivement des profils visibles du Faction Builder. */
export function factionChoices(registry){
  const names=new Map();
  for(const profile of (registry?.values?.()??[])){
    if(profile.source!=='faction')continue;
    const key=String(profile.faction??'').trim()||UNCLASSIFIED_FACTION;
    const label=String(profile.factionLabel??'').trim()||(key===UNCLASSIFIED_FACTION?'Sans faction':key.replace(/-/g,' '));
    if(!names.has(key))names.set(key,label);
  }
  return [...names.entries()].sort((a,b)=>a[1].localeCompare(b[1],'fr'));
}
export function manualChoices(registry,category='machine',faction=''){
  return [...(registry?.values?.()??[])].filter(p=>
    p.source===category&&(category!=='faction'||(faction!==''&&(String(p.faction??'').trim()||UNCLASSIFIED_FACTION)===faction))
  ).sort((a,b)=>a.label.localeCompare(b.label,'fr'));
}
export function collectProfiles(){
  const registry=new Map();
  const machine=sourceApi('h0d-machine-builder','h0dMachineBuilder');
  for(const [key,value] of readMap(machine?.machines)){
    registry.set('machine:'+key,{id:'machine:'+key,label:value.label??key,source:'machine',threat:Number(value.actor?.threat??0),role:value.actor?.role??'',originalKey:key});
  }
  const creatures=sourceApi('h0d-creature-builder','h0dCreatureBuilder');
  for(const [key,value] of readMap(creatures?.creatures)){
    registry.set('creature:'+key,{id:'creature:'+key,label:value.label??key,source:'creature',threat:Number(value.actor?.props?.H0D_Creature_Menace??0),role:value.actor?.props?.H0D_Creature_Role??'',originalKey:key});
  }
  const factions=sourceApi('h0d-faction-builder','h0dFactionBuilder');
  const names=new Map(readMap(factions?.factions).map(([key,value])=>[key,value?.label??key]));
  const factionLabel=key=>names.get(key)??String(key??'').replace(/-/g,' ');
  for(const [key,value] of readMap(factions?.archetypes)){
    registry.set('faction:'+key,{id:'faction:'+key,label:value.label??key,source:'faction',threat:Number(value.actor?.props?.H0D_Creature_Menace??0),role:value.actor?.props?.H0D_Creature_Role??'',faction:value.factionKey??'',factionLabel:factionLabel(value.factionKey),originalKey:key,encounter:value.encounter??null});
  }
  for(const [key,value] of readMap(factions?.council?.entries)){
    registry.set('faction:council-'+key,{
      id:'faction:council-'+key,label:value.name??key,source:'faction',
      threat:Number(value.actor?.props?.H0D_Creature_Menace??0),
      role:value.role??'',faction:'dent-ambre',factionLabel:factionLabel('dent-ambre'),originalKey:key,unique:true
    });
  }
  return registry;
}
/** Recettes de fin de campagne exposées par le Faction Builder actif (jamais de tirage automatique). */
export function getHeliosiumRecipes(){
  const api=sourceApi('h0d-faction-builder','h0dFactionBuilder');
  return Array.isArray(api?.heliosiumEncounters)?api.heliosiumEncounters:[];
}
function worldTables(){return Array.from(game.tables?.contents??game.tables??[]);}
export function findEncounterTable(biome){
  const name='Rencontre — '+biomeName(biome);
  const normalized=norm(name);
  const candidates=worldTables().filter(t=>norm(t.name)===normalized);
  if(!candidates.length)return null;
  // Deux éditions exportées de la Vallée : la plus récente/versionnée gagne.
  return [...candidates].sort((a,b)=>(Number(b.flags?.h0d?.version??0)-Number(a.flags?.h0d?.version??0))||
    Number(b._stats?.modifiedTime??0)-Number(a._stats?.modifiedTime??0))[0];
}
export function getTableData(biome,seeds){
  const table=findEncounterTable(biome);
  if(table){
    const contents=table.results?.contents??Array.from(table.results??[]);
    return {origin:'foundry',name:table.name,results:contents.map(normalizeEntry),version:table.flags?.h0d?.version??null};
  }
  const seed=seeds[biome];
  return {origin:seed?.available?'local':'absent',name:biomeName(biome),results:(seed?.results??[]).map(normalizeEntry),version:seed?.version??null};
}
export function buildBiomePool(biome,recipes){
  const map=new Map();
  for(const items of Object.values(recipes[biome]??{})){
    if(!Array.isArray(items))continue;
    for(const item of items){
      const old=map.get(item.id);
      map.set(item.id,{id:item.id,weight:(old?.weight??0)+1});
    }
  }
  return [...map.values()];
}
export function findRecipe(biome,description,recipes){
  const entries=Object.entries(recipes[biome]??{});
  const key=norm(description);
  const entry=entries.find(([name])=>norm(name)===key);
  return entry?entry[1]:null;
}
const getLootTable=(origin)=>{
  const name=origin==='creature'?'H0D Loot — Ressources créature':'H0D Loot — Ressources machine';
  return worldTables().find(t=>norm(t.name)===norm(name))??null;
};
export function lootCandidates(origin,resources){
  if(origin==='equipment'){
    const api=sourceApi('h0d-equipment-builder','h0dEquipmentBuilder');
    return (api?.getReferenceCatalog?.()??[]).map(d=>({id:d.key,label:d.name??d.key,source:'H0D Equipment Builder',weight:1,detail:`${d.kind??'Équipement'} · palier ${d.tier??'non précisé'}`}));
  }
  const table=getLootTable(origin);
  if(table){
    return (table.results?.contents??Array.from(table.results??[])).map(r=>({
      id:r.flags?.['h0d-loot']?.resourceId??null,
      label:String(r.description??r.text??r.name??'Ressource sans nom'),
      source:table.name,weight:Number(r.weight??1),detail:'Suggestion de découverte, pas de transfert d’objet'
    })).filter(r=>r.weight>0);
  }
  return (resources[origin]??[]).map(r=>({...r,source:'Export H0D Loot embarqué (secours)'}));
}
export function resolveLoot(candidate){
  if(!candidate)return null;
  const api=sourceApi('h0d-loot','h0dLoot');
  const found=candidate.id ? api?.getResource?.(candidate.id):null;
  return {...candidate,detail:found?.name?`${found.name} · ${candidate.detail??''}`:candidate.detail};
}
export function availableBiomes(){return BIOMES;}
export const moduleBase = `modules/${MODULE_ID}`;
