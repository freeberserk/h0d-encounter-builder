import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {collectProfiles,resolveProfileCosts} from '../scripts/integrations.js';

const costs=JSON.parse(readFileSync(new URL('../data/costs.json',import.meta.url),'utf8'));
const modules=new Map();
globalThis.game={modules:{get:id=>modules.get(id)}};

function setup(version='new'){
  const profiles=new Map([
    ['loup-solitaire',{label:'Loup solitaire',actor:{props:{H0D_Creature_Menace:'2',H0D_Creature_XP:version==='new'?'35':'0'}}}],
    ['serpent-venimeux',{label:'Serpent venimeux',actor:{props:{H0D_Creature_Menace:'1',H0D_Creature_XP:version==='new'?'15':'0'}}}],
    ['bete-alpha-biome',{label:'Bête alpha de biome',actor:{props:{H0D_Creature_Menace:'7',H0D_Creature_XP:version==='new'?'450':'0'}}}],
    ['petit-nuisible',{label:'Petit nuisible',actor:{props:{H0D_Creature_Menace:'0',H0D_Creature_XP:'0'}}}],
    ['profil-incomplet',{label:'Incomplet',actor:{props:{H0D_Creature_Menace:'2'}}}]
  ]);
  modules.set('h0d-creature-builder',{active:true,api:{creatures:profiles}});
  return collectProfiles();
}

test('un XP validé complète un profil sans coût individuel',()=>{
  const reg=setup();
  const resolved=resolveProfileCosts(reg,costs);
  assert.equal(resolved['creature:bete-alpha-biome'].xp,450);
  assert.equal(resolved['creature:petit-nuisible'].xp,0);
  assert.equal(resolved['creature:profil-incomplet'],undefined);
});
test('le coût individuel documenté prévaut sur le profil et la valeur provisoire est remplacée',()=>{
  const reg=setup();
  const resolved=resolveProfileCosts(reg,costs);
  assert.equal(resolved['creature:loup-solitaire'].xp,35);
  assert.equal(resolved['creature:loup-solitaire'].source,costs['creature:loup-solitaire'].source);
  assert.equal(resolved['creature:serpent-venimeux'].xp,15);
  assert.equal(resolved['creature:serpent-venimeux'].provisional,undefined);
  assert.equal(costs['creature:serpent-venimeux'].xp,20,'le fichier historique reste intact');
});
test('ne pas convertir les XP=0 des anciennes versions de profils dangereux en coût 0',()=>{
  const reg=setup('old');
  assert.equal(reg.get('creature:bete-alpha-biome').xp,null);
  const resolved=resolveProfileCosts(reg,costs);
  assert.equal(resolved['creature:bete-alpha-biome'],undefined);
  assert.equal(resolved['creature:serpent-venimeux'].provisional,true);
});
test('ne pas écraser un coût documenté et ne pas modifier les données sources',()=>{
  const reg=setup();
  const local={'creature:bete-alpha-biome':{xp:500,source:'MJ'}};
  const resolved=resolveProfileCosts(reg,local);
  assert.equal(resolved['creature:bete-alpha-biome'].xp,500);
  assert.equal(local['creature:bete-alpha-biome'].xp,500);
});
