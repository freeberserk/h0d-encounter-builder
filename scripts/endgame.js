/**
 * H0D — Équipes et avertissements HelioSium.
 * Seules les recettes issues du PDF Endgame sont proposées.
 * Aucune génération aléatoire du boss, aucun XP inventé.
 */
const cleanNumber=value=>Number.isInteger(Number(value))?Number(value):null;
const isHelio=profile=>profile?.source==="faction"&&profile?.faction==="heliosium";

/**
 * Préparer manuellement une recette officielle de l'armée HelioSium.
 * Toutes les quantités minimales sont conservées ; le MJ peut ensuite compléter,
 * augmenter jusqu'au maximum conseillé ou remplacer les rôles génériques.
 */
export function prepareHeliosiumRecipe(recipe,registry,{allowFinal=false,conditionsMet=false}={}){
 if(!recipe||!Array.isArray(recipe.members)||!recipe.members.length)
  throw new Error("Sélectionne une composition HelioSium valide.");
 const final=recipe.generation_aleatoire==="non";
 const conditional=recipe.generation_aleatoire==="conditionnelle";
 if(final&&!allowFinal)throw new Error(
  "Le Corps véritable est un boss final UNIQUE. Active expressément la confirmation « Boss final » pour préparer cette scène."
 );
 if(conditional&&!conditionsMet)throw new Error(
  "Cette composition dépend de conditions de scénario. Coche la confirmation des prérequis avant de la charger."
 );
 const members=[];
 for(const part of recipe.members){
  const id="faction:"+String(part.profile??"");
  const profile=registry.get(id);
  if(!isHelio(profile))throw new Error(
   "Profil HelioSium absent du Faction Builder actif : "+String(part.profile)
  );
  if(profile.encounter?.generation_aleatoire==="non"&&!allowFinal)
   throw new Error("Boss final : sélection manuelle explicite uniquement.");
  if(profile.encounter?.generation_aleatoire==="conditionnelle"&&!conditionsMet)
   throw new Error("Avatar conditionnel : présence d’un Élu et de composants à confirmer.");
  const min=cleanNumber(part.min),max=cleanNumber(part.max);
  if(min===null||min<1||min>50||max===null||max<min||max>50)
   throw new Error("Effectifs documentés invalides pour "+profile.label);
  members.push({id,qty:min});
 }
 const notes=["Modèle du PDF HelioSium, préparation manuelle uniquement : le coût XP individuel reste inconnu."];
 if(recipe.id==="noyau-escorte")notes.push(
   "À compléter manuellement par 3–5 troupes. L'Archange peut être remplacé par un Avatar si Élu et composants disponibles."
 );
 if(recipe.id==="detachement-adaptatif")notes.push(
   "À compléter manuellement par 4–8 unités complémentaires. L'Officier ne constitue pas seul un détachement."
 );
 if(recipe.id==="avatar-invoque")notes.push(
   "Choisir exactement deux modules cohérents avec les machines/composants de la scène ; aucune invocation gratuite."
 );
 if(final)notes.push("Boss de fin de campagne : phases, relais et Portes Mortes, jamais tiré au hasard.");
 return {entries:members,warnings:notes,description:recipe.nom+" — "+recipe.logique};
}
/** Avertissements tactiques sans convertir la Menace ni les synergies en XP. */
export function heliosiumSynergyWarnings(entries,registry){
 const count=new Map();
 for(const item of entries??[]){
  const id=String(item.id??"");
  const profile=registry.get(id);
  if(!isHelio(profile))continue;
  const qty=Number(item.qty??0);
  if(Number.isInteger(qty)&&qty>0)count.set(profile.originalKey,(count.get(profile.originalKey)??0)+qty);
 }
 if(!count.size)return [];
 const n=id=>count.get(id)??0;
 const warnings=["HelioSium : rôles complémentaires et liaison réseau ; la Menace cumulée ne mesure pas la synergie tactique."];
 if(n("auxiliaire-restaure")>=2)warnings.push(
   "Deux Auxiliaires adjacents : +1 DEF de face, aucun bonus offensif de prise en tenaille."
 );
 if(n("lancier-de-convergence")>=5)warnings.push(
   "Cinq Lanciers : phalange optimale (+2 DEF de face, +2 contre poussée/renversement) et Mur de lances collectif."
 );
 else if(n("lancier-de-convergence")>=3)warnings.push(
   "Trois ou quatre Lanciers : ligne d’allonge continue ; Mur de lances collectif selon portée."
 );
 else if(n("lancier-de-convergence")>=2)warnings.push(
   "Deux Lanciers adjacents : +1 DEF de face. Phalange idéale à cinq."
 );
 if(n("artilleur-de-convergence"))warnings.push(
   "Artilleur : opérateur PV 38 / DEF 15 / ATQ +4 et plateforme PV 40 / DEF 16 / ATQ +7 sont deux entités distinctes."
 );
 if(n("elu-de-la-convergence"))warnings.push(
   "Élu : priorité absolue du réseau ; sa mort détruit une portion du réseau local et désynchronise les unités."
 );
 if(n("avatar-invoque")){
  warnings.push("Avatar : condition impérative = Élu présent et machines/composants disponibles ; choisir deux modules de scène.");
  if(!n("elu-de-la-convergence"))warnings.push(
   "Composition INCOHÉRENTE : Avatar présent sans Élu. Corriger ou justifier explicitement la situation."
  );
 }
 if(n("archange-heliosium"))warnings.push(
   "Archange : interception et protection prioritaire d'un Élu ; corps et pièces ciblables."
 );
 if(n("officier-de-convergence"))warnings.push(
   "Officier : tactique adaptative, apprentissage persistant uniquement si le MJ le valide."
 );
 if(n("corps-veritable-dheliosium"))warnings.push(
   "Corps véritable : boss final UNIQUE, hors tirages aléatoires. Titan PV 1300 puis Cœur exposé PV 850 en phase distincte ; objectifs et Portes Mortes indispensables."
 );
 for(const [id,qty] of count){
  const profile=registry.get("faction:"+id);
  const max=cleanNumber(profile?.encounter?.nombre_conseille?.max);
  if(max!==null&&max>=0&&qty>max)warnings.push(
    profile.label+" : "+qty+" unités > maximum conseillé de "+max+" (avertissement MJ, non bloquant)."
  );
 }
 return warnings;
}
