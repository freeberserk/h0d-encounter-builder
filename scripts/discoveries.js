import {norm,weightedChoice} from './core.js';

export const DISCOVERY_TABLE_NAME='H0D Encounter — Sources de découvertes';
export const DISCOVERY_SOURCE_LABELS=Object.freeze({
  machine:'Ressources machines',
  creature:'Ressources faune',
  equipment:'Équipement'
});
export const DISCOVERY_DEFAULTS=Object.freeze(
  Object.entries(DISCOVERY_SOURCE_LABELS).map(([id,label])=>({id,label,weight:1}))
);
const MODULE_ID='h0d-encounter-builder';
const tables=()=>Array.from(game?.tables?.contents??game?.tables??[]);
export function findDiscoveryTable(){
  const matches=tables().filter(t=>norm(t.name)===norm(DISCOVERY_TABLE_NAME));
  return matches.sort((a,b)=>Number(!!b.flags?.[MODULE_ID]?.discoverySourceTable)-Number(!!a.flags?.[MODULE_ID]?.discoverySourceTable))[0]??null;
}
/** Une ligne de RollTable représente uniquement une origine ; jamais directement un objet de butin. */
export function normalizeDiscoverySource(row){
  const raw=String(row?.flags?.h0d?.discoverySource??row?.flags?.[MODULE_ID]?.discoverySource??'').trim().toLowerCase();
  const byLabel=Object.entries(DISCOVERY_SOURCE_LABELS).find(([,label])=>norm(label)===norm(row?.description??row?.text??row?.name));
  const id=raw||byLabel?.[0]||'';
  const weight=Number(row?.weight??1);
  if(!Object.hasOwn(DISCOVERY_SOURCE_LABELS,id)||!Number.isFinite(weight)||weight<=0)return null;
  return {id,label:DISCOVERY_SOURCE_LABELS[id],weight};
}
export function discoverySources(table){
  if(!table)return DISCOVERY_DEFAULTS.map(x=>({...x}));
  return (table.results?.contents??Array.from(table.results??[]))
    .map(normalizeDiscoverySource).filter(Boolean);
}
/** Ignore les sources sans candidats disponibles, tout en respectant les poids configurés. */
export function chooseDiscoverySource(table,getCandidates,rng=Math.random){
  const options=discoverySources(table).filter(x=>getCandidates(x.id).some(c=>Number(c.weight??1)>0));
  return weightedChoice(options,rng);
}
export async function ensureDiscoveryTable(){
  const existing=findDiscoveryTable();
  if(existing)return existing; // Ne jamais modifier, remplacer ou dupliquer la table du MJ.
  if(!game.user?.isGM||typeof RollTable==='undefined')return null;
  const rows=DISCOVERY_DEFAULTS.map((source,index)=>({
    type:'text',name:'',description:source.label,weight:source.weight,
    range:[index+1,index+1],drawn:false,
    flags:{h0d:{discoverySource:source.id}}
  }));
  return await RollTable.create({
    name:DISCOVERY_TABLE_NAME,img:'icons/svg/d20-grey.svg',
    description:'Choix automatique de la source des découvertes H0D. Modifier les poids des lignes pour ajuster les probabilités. Ne contient aucun objet et ne remplace pas les tables H0D Loot.',
    formula:'1d3',replacement:true,displayRoll:false,results:rows,
    flags:{[MODULE_ID]:{discoverySourceTable:true,version:1}}
  });
}
