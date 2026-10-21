/** Fonctions pures : aucune dépendance à Foundry. Testables sous Node. */
export const BUDGETS = Object.freeze({
  1:{facile:30,standard:60,difficile:100,dangereuse:150},
  2:{facile:60,standard:100,difficile:160,dangereuse:240},
  3:{facile:100,standard:160,difficile:250,dangereuse:350},
  4:{facile:150,standard:250,difficile:350,dangereuse:500},
  5:{facile:220,standard:350,difficile:500,dangereuse:700},
  6:{facile:300,standard:450,difficile:650,dangereuse:900},
  7:{facile:400,standard:600,difficile:850,dangereuse:1200},
  8:{facile:500,standard:750,difficile:1100,dangereuse:1500},
  9:{facile:650,standard:950,difficile:1350,dangereuse:1850},
  10:{facile:800,standard:1200,difficile:1700,dangereuse:2400}
});
export const DIFFICULTIES = {facile:'Facile',standard:'Standard',difficile:'Difficile',dangereuse:'Très dangereuse'};
export const TYPES = {tous:'Tous',machine:'Machines',autre:'Autres attaquants','hors-combat':'Hors combat',mixte:'Mixte'};
export const BIOMES = [
  ['vallee','Vallée de la Dent d’Ambre'],['gorges','Gorges Brisées du Sud'],
  ['plaines','Plaines de Récupération'],['gaia','Forêt-Matrice de GAIA'],
  ['hades','Ruines-Miroirs de HADES'],['hephaistos','Désert Solaire d’HÉPHAÏSTOS'],
  ['titans','Cimetière des Titans'],['elysium','Salles Blanches d’ELYSIUM'],
  ['heliosium','Terres Restaurées d’HelioSium']
];
export const biomeName = key => BIOMES.find(b=>b[0]===key)?.[1] ?? key;
export const norm = v => String(v??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
export function budgetFor(level, difficulty) { return BUDGETS[Number(level)]?.[difficulty] ?? null; }
export function encounterTypeCompatible(type, filter) {
  if(filter==='tous') return true;
  if(filter==='machine') return type==='machine'||type==='mixte';
  if(filter==='autre') return type==='autre'||type==='mixte';
  return type===filter;
}
export function normalizeEntry(raw) {
  const flags=raw.flags?.h0d??{};
  const xp=raw.xp??flags.xp;
  const xpMin=raw.xpMin??flags.xpMin??xp;
  const xpMax=raw.xpMax??flags.xpMax??xp;
  return {
    id:String(raw.id??raw._id??''),
    description:String(raw.description??raw.text??raw.name??''),
    type:String(raw.type??flags.typeRencontre??'inconnu'),
    weight:Number(raw.weight??1),
    xp:Number.isFinite(Number(xp))&&xp!==undefined&&xp!==null?Number(xp):null,
    xpMin:Number.isFinite(Number(xpMin))&&xpMin!==undefined&&xpMin!==null?Number(xpMin):null,
    xpMax:Number.isFinite(Number(xpMax))&&xpMax!==undefined&&xpMax!==null?Number(xpMax):null
  };
}
export function weightedChoice(items, rng=Math.random) {
  const valid=items.filter(i=>Number.isFinite(i.weight)&&i.weight>0);
  const sum=valid.reduce((s,i)=>s+i.weight,0);
  if(!sum) return null;
  const r=Math.min(0.999999999,Math.max(0,Number(rng()))) * sum;
  let count=0;
  for(const item of valid){count+=item.weight;if(r<count)return item;}
  return valid.at(-1);
}
/** Filtrage strict. Par défaut, XP max de la ligne ; n'oublie pas le facteur défavorable. */
export function eligibleTableEntries(entries,{level,difficulty,type='tous',unfavorable=false,allowUnpriced=false}={}) {
  const budget=budgetFor(level,difficulty);
  return entries.map(normalizeEntry).filter(e=>{
    if(!encounterTypeCompatible(e.type,type))return false;
    if(e.xpMax===null) return allowUnpriced && budget===null;
    if(budget===null)return true; // Niveaux 11-15 : pas de barème validé, affichage averti
    return Math.ceil(e.xpMax*(unfavorable?1.25:1))<=budget;
  });
}
export function mergeComposition(entries=[]) {
  const map=new Map();
  for(const entry of entries){
    const id=String(entry.id??'');const qty=Number(entry.qty);
    if(!id||!Number.isInteger(qty)||qty<=0)continue;
    map.set(id,{id,qty:(map.get(id)?.qty??0)+qty});
  }
  return [...map.values()];
}
export function evaluateComposition(entries,registry,costs,{level=3,difficulty='standard',unfavorable=false,allies=[]}={}) {
  const composition=mergeComposition(entries), lines=[],warnings=[];
  let known=0,unknown=0,provisional=0,missing=0;
  for(const {id,qty} of composition){
    const actor=registry.get(id);
    const cost=costs[id];
    if(!actor)missing++;
    if(!cost||!Number.isFinite(cost.xp))unknown++;
    if(cost?.provisional)provisional++;
    if(cost?.xp!==undefined&&Number.isFinite(cost.xp))known+=qty*cost.xp;
    lines.push({id,qty,label:actor?.label??id,threat:actor?.threat??null,source:actor?.source??null,unitXP:cost?.xp??null,subtotal:cost?.xp===undefined?null:qty*cost.xp,provisional:!!cost?.provisional,reference:cost?.source??'',missing:!actor});
  }
  const budget=budgetFor(level,difficulty),baseComplete=unknown===0 && provisional===0 && missing===0;
  const factor=unfavorable?1.25:1;
  const estimated=Math.ceil(known*factor);
  if(unknown)warnings.push(`${unknown} profil(s) sans coût XP individuel documenté : total incomplet.`);
  if(provisional)warnings.push(`${provisional} association(s) coût/profil provisoire(s), à vérifier.`);
  if(missing)warnings.push(`${missing} profil(s) absent(s) des builders actifs.`);
  if(allies.length)warnings.push('PNJ alliés : contribution tactique à arbitrer, non convertie en PJ ni en réduction de budget.');
  if(budget===null)warnings.push('Aucun plafond XP validé dans la macro pour ce niveau (au-delà du niveau 10).');
  if(unfavorable)warnings.push('Majoration historique de +25 % : vérifier que le même danger n’est pas compté deux fois.');
  if(!composition.length)warnings.push('Aucun adversaire sélectionné : rencontre non hostile ou scène d’exploration possible.');
  if(budget!==null && estimated>budget)warnings.push('Le coût XP connu dépasse le budget demandé. Aucune correction automatique imposée.');
  warnings.push('Barème historique de la macro non recalibré pour 3 PJ : prudence sur la difficulté réelle.');
  return {lines,baseKnownXP:known,effectiveKnownXP:estimated,budget,complete:baseComplete,totalXP:baseComplete?estimated:null,withinBudget:baseComplete&&budget!==null?estimated<=budget:null,warnings};
}
/** Complète la composition sans dépasser le budget, exclusivement avec coûts individuels documentés. */
export function suggestComposition(current, pool, registry, costs,opts={},rng=Math.random){
  const level=Number(opts.level??3), difficulty=opts.difficulty??'standard';
  const cap=budgetFor(level,difficulty);
  if(cap===null)return {composition:mergeComposition(current),reason:'Aucun budget validé pour ce niveau.'};
  const multiplier=opts.unfavorable?1.25:1;
  let composition=mergeComposition(current),check=evaluateComposition(composition,registry,costs,opts);
  if(!check.complete && composition.length)return {composition,reason:'Le coût d’au moins un adversaire imposé est inconnu ou provisoire.'};
  let available=pool.filter(p=>registry.has(p.id)&&costs[p.id]&&Number.isFinite(costs[p.id].xp)&&!costs[p.id].provisional&&costs[p.id].xp>0);
  const maxCount=Math.max(1,Math.min(8,Number(opts.maxCount??5)));
  while(composition.reduce((s,e)=>s+e.qty,0)<maxCount){
    const already=composition.reduce((s,e)=>s+(costs[e.id]?.xp??0)*e.qty,0);
    const possibilities=available.filter(p=>Math.ceil((already+costs[p.id].xp)*multiplier)<=cap);
    if(!possibilities.length)break;
    if(composition.length && already*multiplier>=cap*0.75)break;
    const weighted=possibilities.map(p=>({...p,weight:(p.weight??1)*(opts.nearCauldron&&p.id.startsWith('machine:')?2:1)}));
    const chosen=weightedChoice(weighted,rng);
    if(!chosen)break;
    composition=mergeComposition([...composition,{id:chosen.id,qty:1}]);
  }
  return {composition,reason:composition.length?'Composition proposée selon les coûts documentés.':'Aucun profil tarifé disponible pour ce biome.'};
}
export function chance(probability,rng=Math.random){return Number(rng()) < Math.max(0,Math.min(1,Number(probability)/100));}
