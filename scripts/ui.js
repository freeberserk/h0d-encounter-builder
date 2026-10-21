import {BIOMES,DIFFICULTIES,TYPES,norm,budgetFor,eligibleTableEntries,weightedChoice,mergeComposition,evaluateComposition,suggestComposition,proposeTableScenario,chance,biomeName} from './core.js';
import {collectProfiles,getTableData,buildBiomePool,findRecipe,lootCandidates,resolveLoot,integrationStatus} from './integrations.js';
const MID='h0d-encounter-builder';
const escapeHTML=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const esc=escapeHTML;
const opt=(list,current)=>list.map(([key,name])=>`<option value="${esc(key)}" ${String(key)===String(current)?'selected':''}>${esc(name)}</option>`).join('');
const fmt=n=>n===null?'non chiffré':`${n} XP`;
const messageHTML = result => {
  const rows=(result.eval?.lines??[]).map(line=>`<li>${line.qty} × <strong>${esc(line.label)}</strong> · Menace ${line.threat??'?'} · ${line.subtotal===null?'XP inconnu':`${line.subtotal} XP`} ${line.missing?'<em>(profil absent)</em>':''}${line.reference?`<small> · Source : ${esc(line.reference)}</small>`:''}</li>`).join('');
  const warnings=(result.warnings??[]).map(t=>`<li>${esc(t)}</li>`).join('');
  return `<div class="h0d-encounter-output">
    <h2>${esc(result.title??'Rencontre proposée')}</h2>
    <p><b>Biome :</b> ${esc(biomeName(result.biome))} · <b>Niveau :</b> ${result.level} · <b>Difficulté :</b> ${esc(DIFFICULTIES[result.difficulty]??result.difficulty)} · <b>3 PJ fixes</b></p>
    <p><b>Budget historique :</b> ${fmt(result.budget)}</p>
    ${result.description?`<p><b>Situation :</b> ${esc(result.description)}</p>`:''}
    ${rows?`<p><b>Profils identifiés à préparer :</b></p><ul>${rows}</ul>`:''}
    ${result.unlinkedDescriptions?.length?`<p><b>Autres adversaires mentionnés dans les tables (profil non associé) :</b></p><ul>${result.unlinkedDescriptions.map(t=>`<li>${esc(t)}</li>`).join('')}</ul>`:''}
    ${!rows&&!result.unlinkedDescriptions?.length?'<p><b>Composition :</b> Aucun adversaire (scène hors combat ou événement narratif).</p>':''}
    ${result.eval?`<p><b>Menace cumulée des profils identifiés :</b> ${result.eval.lines.reduce((a,b)=>a+(Number(b.threat??0)*b.qty),0)} · <b>Coût des profils identifiés :</b> ${fmt(result.eval.effectiveKnownXP)} ${result.eval.complete?'(calcul complet)':'(partiel / non validé)'} · <b>Budget :</b> ${result.eval.withinBudget===null?'non certifié':result.eval.withinBudget?'respecté':'dépassé'}</p>`:''}
    ${result.tableXP!==undefined&&result.tableXP!==null?`<p><b>Coût historique des situations sélectionnées :</b> ${result.tableXPMin!==result.tableXPMax?`${result.tableXPMin}–${result.tableXPMax}`:result.tableXP} XP (historique)</p>`:''}
    ${result.event?`<p><b>Événement indépendant :</b> ${esc(result.event.name)} — ${esc(result.event.description)} <em>(coût et DD à arbitrer)</em></p>`:''}
    ${result.discovery?`<p><b>Découverte possible :</b> ${esc(result.discovery.label)} · ${esc(result.discovery.source??'Catalogue')} <em>(suggestion, pas d’attribution automatique)</em></p>`:''}
    ${result.allies.length?`<p><b>Alliés :</b> ${result.allies.map(a=>`${a.qty} × ${esc(a.label)} (${esc(a.role)})`).join(', ')} — non comptés comme PJ supplémentaires.</p>`:''}
    ${warnings?`<p><b>Points d’attention :</b></p><ul>${warnings}</ul>`:''}
    <p><small>Validation MJ requise. Aucun Actor, Item ou Token créé.</small></p>
  </div>`;
};
export class EncounterUI {
  constructor(data){this.data=data;this.registry=collectProfiles();this.costs=data.costs;this.state={
    biome:'gorges',level:3,difficulty:'standard',type:'tous',unfavorable:false,nearCauldron:false,
    mode:'table',profileId:'',qty:1,allyId:'',allyQty:1,allyRole:'combat',members:[],allies:[],
    eventChance:30,discoveryChance:20,discoverySource:'machine',selectedSave:'',sceneTitle:'',last:null
  };this.dialog=null;}
  open(){
    if(this.dialog?.rendered){this.dialog.bringToTop();return this.dialog;}
    this.registry=collectProfiles();
    this.dialog=new Dialog({
      title:'H0D — Encounter Builder',content:this.template(),
      buttons:{close:{label:'Fermer'}},
      default:'close',
      render:html=>this.bind(html),
      close:()=>{this.dialog=null;}
    },{width:780,classes:['h0d-encounter-dialog']}).render(true);
    return this.dialog;
  }
  get saves(){return game.settings.get(MID,'savedEncounters')??[];}
  optionProfiles(excludeSource=''){
    return [...this.registry.values()].filter(x=>x.source!==excludeSource).sort((a,b)=>a.label.localeCompare(b.label,'fr')).map(x=>[x.id,`${x.label} · M${x.threat} · ${x.source}`]);
  }
  template(){
    const s=this.state;const valid=this.optionProfiles();
    const status=integrationStatus();
    const integrations=Object.entries(status).map(([key,ok])=>`<span class="h0d-chip ${ok?'on':'off'}">${esc(key)} ${ok?'✓':'–'}</span>`).join('');
    return `<section class="h0d-encounter-wrap">
      <p class="h0d-intro">Chef d’orchestre des rencontres H0D · aucune fiche ou token créé</p>
      <div class="h0d-integrations">${integrations}</div>
      <div class="h0d-field-row h0d-row-3">
        <label>Mode <select data-key="mode">${opt([['table','Tirage dans une RollTable'],['auto','Composition proposée'],['manuel','Composition manuelle']],s.mode)}</select></label>
        <label>Biome <select data-key="biome">${opt(BIOMES,s.biome)}</select></label>
        <label>Niveau moyen des 3 PJ <input data-key="level" type="number" value="${s.level}" min="1" max="15"/></label>
      </div>
      <div class="h0d-field-row h0d-row-3">
        <label>Difficulté <select data-key="difficulty">${opt(Object.entries(DIFFICULTIES),s.difficulty)}</select></label>
        <label>Type de rencontre (tirage et proposition) <select data-key="type">${opt(Object.entries(TYPES),s.type)}</select></label>
        <label><span class="h0d-label">Facteur défavorable</span><input data-key="unfavorable" type="checkbox" ${s.unfavorable?'checked':''}/> +25 % XP (macro historique)</label>
      </div>
      <label class="h0d-toggle"><input data-key="nearCauldron" type="checkbox" ${s.nearCauldron?'checked':''}/> À proximité d’un Creuset (privilégier les machines dans la composition proposée ; pas de bonus XP automatique)</label>
      <div class="h0d-card h0d-manual">
        <h3>Composition personnalisée / adversaires imposés</h3>
        <div class="h0d-field-row h0d-row-2">
          <label>Profil dans les builders <select data-key="profileId">${opt([['','— Choisir —'],...valid],s.profileId)}</select></label>
          <label>Quantité <input data-key="qty" type="number" value="${s.qty}" min="1" max="50"/></label>
        </div>
        <div class="h0d-buttons"><button type="button" data-action="add">Ajouter / verrouiller</button><button type="button" data-action="fill">Proposer un complément</button><button type="button" data-action="clear">Vider</button></div>
        <div data-region="composition" class="h0d-composition"></div>
      </div>
      <div class="h0d-card">
        <h3>Événements et découvertes facultatifs</h3>
        <div class="h0d-field-row h0d-row-3">
          <label>Chance événement (%) <input data-key="eventChance" type="number" value="${s.eventChance}" min="0" max="100"/></label>
          <label>Chance découverte (%) <input data-key="discoveryChance" type="number" value="${s.discoveryChance}" min="0" max="100"/></label>
          <label>Source découverte <select data-key="discoverySource">${opt([['machine','Ressources machines'],['creature','Ressources faune'],['equipment','Équipement'],['aucune','Aucune']],s.discoverySource)}</select></label>
        </div>
        <small>Ces tirages sont indépendants de l’affrontement. Les événements n’ont pas de coût XP ni de DD inventé.</small>
      </div>
      <details class="h0d-card"><summary>Alliés PNJ (seconde expédition)</summary>
        <div class="h0d-field-row h0d-row-3">
          <label>Profil PNJ <select data-key="allyId">${opt([['','— Choisir —'],...valid.filter(p=>p[0].startsWith('faction:'))],s.allyId)}</select></label>
          <label>Quantité <input data-key="allyQty" type="number" min="1" max="50" value="${s.allyQty}"/></label>
          <label>Rôle <select data-key="allyRole">${opt([['combat','Combattant actif'],['appui','Soutien'],['hors','Non engagé']],s.allyRole)}</select></label>
        </div>
        <div class="h0d-buttons"><button type="button" data-action="addAlly">Ajouter allié</button><button type="button" data-action="clearAllies">Retirer les alliés</button></div>
        <div data-region="allies"></div><small>Le nombre de PJ reste fixé à trois ; aucun bonus numérique PNJ non documenté n’est inventé.</small>
      </details>
      <div class="h0d-buttons h0d-primary-actions">
        <button type="button" class="h0d-primary" data-action="generate">Générer / valider</button>
        <button type="button" data-action="editLast">Modifier composition</button>
        <button type="button" data-action="rerollExtra">Relancer événements / loot</button>
        <button type="button" data-action="chat">Envoyer au chat MJ</button>
      </div>
      <div data-region="output" class="h0d-output"><p>Choisis un mode puis clique sur « Générer / valider ».</p></div>
      <details class="h0d-card"><summary>Enregistrer / réutiliser une composition</summary>
        <div class="h0d-field-row h0d-row-2"><label>Nom <input data-key="sceneTitle" placeholder="Ex. Patrouille des Gorges" value="${esc(s.sceneTitle)}"/></label>
        <label>Compositions sauvegardées <select data-key="selectedSave">${opt([['','— Choisir —'],...this.saves.map(x=>[x.id,x.title])],s.selectedSave)}</select></label></div>
        <div class="h0d-buttons"><button type="button" data-action="save">Sauvegarder</button><button type="button" data-action="load">Charger</button></div>
        <small>Enregistre uniquement la composition et les paramètres du MJ. N’ajoute rien aux RollTables et n’écrase aucun profil.</small>
      </details>
    </section>`;
  }
  bind(html){
    const s=this.state;
    const update=el=>{const key=el.dataset.key;if(!key)return;let v=el.type==='checkbox'?el.checked:el.value;if(['qty','allyQty','level','eventChance','discoveryChance'].includes(key))v=Number(v);s[key]=v;};
    html.on('change input','[data-key]',e=>update(e.currentTarget));
    html.on('click','[data-action]',async e=>{
      e.preventDefault();const action=e.currentTarget.dataset.action;this.clickedId=e.currentTarget.dataset.id??null;
      try{await this.action(action,html)}catch(error){console.error(MID,error);ui.notifications.error(`Encounter Builder : ${error.message}`);}
    });
    this.paint(html);
  }
  paint(html){
    const s=this.state;
    html.find('[data-region="composition"]').html(s.members.length?`<ul>${s.members.map(m=>{
      const profile=this.registry.get(m.id);return `<li>${m.qty} × ${esc(profile?.label??m.id)} · M${profile?.threat??'?'} <button type="button" data-action="remove" data-id="${esc(m.id)}">Retirer</button></li>`;
    }).join('')}</ul>`:'<p class="h0d-muted">Aucun adversaire imposé.</p>');
    html.find('[data-region="allies"]').html(s.allies.map(m=>`<p>${m.qty} × ${esc(m.label)} (${esc(m.role)})</p>`).join(''));
    if(s.last)html.find('[data-region="output"]').html(messageHTML(s.last));
  }
  extra(){
    const s=this.state;
    const selectedEvents=this.data.events[s.biome]??[];
    // La proximité des Creusets n'invente aucun bonus numérique ; elle oriente la composition.
    const event=chance(s.eventChance)?weightedChoice(selectedEvents.map(e=>({...e,weight:1}))):null;
    const origin=s.discoverySource;
    const candidates=origin==='aucune'?[]:lootCandidates(origin,this.data.seedLoot);
    const discovery=chance(s.discoveryChance)?resolveLoot(weightedChoice(candidates)):null;
    return {event,discovery};
  }
  createResult({description='',mode,entries=[],tableEntries=[],extra=true,extraWarnings=[]}={}){
    const s=this.state;
    const sourceRows=tableEntries;
    const missingRows=sourceRows.filter(row=>row.type!=='hors-combat'&&!Array.isArray(findRecipe(s.biome,row.description,this.data.recipes)));
    const unlinkedDescriptions=missingRows.map(row=>row.description);
    const evaluated=evaluateComposition(entries,this.registry,this.costs,{level:s.level,difficulty:s.difficulty,unfavorable:s.unfavorable,allies:s.allies});
    const evalResult=entries.length?{...evaluated,
      complete:evaluated.complete&&!missingRows.length,
      withinBudget:missingRows.length?null:evaluated.withinBudget,
      totalXP:missingRows.length?null:evaluated.totalXP}:null;
    const additions=extra?this.extra():{event:s.last?.event??null,discovery:s.last?.discovery??null};
    const warnings=[...extraWarnings];
    if(missingRows.length)warnings.push(`${missingRows.length} situation(s) sans correspondance de profil validée : consulter le texte original et sélectionner les Actors manuellement ; validation XP globale impossible.`);
    if(sourceRows.length){
      if(sourceRows.some(r=>r.xpMax===null))warnings.push('XP non renseignés dans une table source.');
      warnings.push('XP des RollTables = valeurs historiques, non recalibrées pour trois PJ.');
    }
    const hasHistorical=sourceRows.length>0&&sourceRows.every(r=>r.xp!==null&&r.xpMin!==null&&r.xpMax!==null);
    const result={title:s.sceneTitle||'Rencontre proposée',mode,biome:s.biome,level:s.level,difficulty:s.difficulty,
      budget:budgetFor(s.level,s.difficulty),description,entries:mergeComposition(entries),unlinkedDescriptions,
      eval:evalResult,
      tableXP:hasHistorical?sourceRows.reduce((sum,r)=>sum+r.xp,0):null,
      tableXPMin:hasHistorical?sourceRows.reduce((sum,r)=>sum+r.xpMin,0):null,
      tableXPMax:hasHistorical?sourceRows.reduce((sum,r)=>sum+r.xpMax,0):null,
      allies:[...s.allies],warnings:[...warnings,...(evalResult?evalResult.warnings:[])],...additions};
    s.last=result;return result;
  }
  resultFromTableRows(rows,mode,origin,assembled=false){
    const s=this.state;
    const entries=[];
    for(const row of rows){
      const recipe=findRecipe(s.biome,row.description,this.data.recipes);
      if(Array.isArray(recipe))entries.push(...recipe);
    }
    this.createResult({mode,entries,
      description:rows.map(r=>r.description).join(assembled?' + ':' ; '),
      tableEntries:rows,
      extraWarnings:[`Source de la table : ${origin==='foundry'?'monde Foundry':'export embarqué'}.`,
        ...(assembled?['Composition mixte obtenue en associant deux situations existantes ; XP historiques additionnés, aucune fiche inventée.']:[])]});
  }
  async action(action,html){
    const s=this.state;
    if(action==='add'){
      if(!this.registry.has(s.profileId))throw new Error('Choisis un profil présent dans un builder actif.');
      if(!Number.isInteger(s.qty)||s.qty<1||s.qty>50)throw new Error('Quantité invalide (1–50).');
      s.members=mergeComposition([...s.members,{id:s.profileId,qty:s.qty}]);this.paint(html);return;
    }
    if(action==='remove'){
      const id=this.clickedId;
      if(id)s.members=s.members.filter(m=>m.id!==id);
      this.paint(html);return;
    }
    if(action==='clear'){s.members=[];s.last=null;html.find('[data-region="output"]').empty();this.paint(html);return;}
    if(action==='addAlly'){
      const profile=this.registry.get(s.allyId);
      if(!profile||profile.source!=='faction')throw new Error('Choisis un PNJ du Faction Builder.');
      if(!Number.isInteger(s.allyQty)||s.allyQty<1||s.allyQty>50)throw new Error('Quantité PNJ invalide.');
      s.allies.push({id:profile.id,label:profile.label,qty:s.allyQty,role:s.allyRole});this.paint(html);return;
    }
    if(action==='clearAllies'){s.allies=[];this.paint(html);return;}
    if(action==='fill'){
      const suggestion=suggestComposition(s.members,buildBiomePool(s.biome,this.data.recipes),this.registry,this.costs,{level:s.level,difficulty:s.difficulty,unfavorable:s.unfavorable,nearCauldron:s.nearCauldron,type:s.type});
      s.members=suggestion.composition;
      this.createResult({mode:'manuel',entries:s.members,description:'Composition proposée en conservant les adversaires imposés.',extraWarnings:[suggestion.reason]});
      this.paint(html);return;
    }
    if(action==='generate'){
      if(!Number.isInteger(s.level)||s.level<1||s.level>15)throw new Error('Niveau attendu de 1 à 15.');
      if(s.mode==='table'||s.mode==='auto'){
        const table=getTableData(s.biome,this.data.seedTables);
        const scenario=proposeTableScenario(table.results,{
          level:s.level,difficulty:s.difficulty,type:s.type,
          unfavorable:s.unfavorable,nearCauldron:s.nearCauldron
        });
        if(!scenario)throw new Error(`Aucune rencontre de type « ${TYPES[s.type]??s.type} » dans ce biome pour ce budget. Aucune machine ajoutée en remplacement.`);
        this.resultFromTableRows(scenario.entries,s.mode,table.origin,scenario.assembled);
        if(s.mode==='auto')s.members=mergeComposition(s.last.entries);
      }else{
        this.createResult({mode:'manuel',entries:s.members,description:'Rencontre composée librement par le MJ.'});
      }
      this.paint(html);return;
    }
    if(action==='editLast'){
      if(!s.last)throw new Error('Génère d’abord une rencontre.');
      if(!s.last.entries?.length)throw new Error('Cette rencontre ne contient pas de composition associée aux builders. Tu peux choisir manuellement les adversaires.');
      s.members=mergeComposition(s.last.entries);s.mode='manuel';
      html.find('[data-key="mode"]').val('manuel');
      ui.notifications.info('Composition reprise en mode manuel. Tu peux ajouter ou retirer des profils.');
      this.paint(html);return;
    }
    if(action==='rerollExtra'){
      if(!s.last)throw new Error('Génère d’abord une rencontre.');
      Object.assign(s.last,this.extra());this.paint(html);return;
    }
    if(action==='chat'){
      if(!s.last)throw new Error('Génère une rencontre avant publication.');
      await ChatMessage.create({content:messageHTML(s.last),whisper:[game.user.id],speaker:{alias:'H0D Encounter Builder'}});
      ui.notifications.info('Rencontre envoyée dans le chat privé MJ.');return;
    }
    if(action==='save'){
      if(!s.sceneTitle.trim())throw new Error('Indique un nom pour cette rencontre.');
      if(!s.members.length)throw new Error('Ajoute au moins un adversaire avant de sauvegarder cette composition.');
      const id=globalThis.foundry?.utils?.randomID?.()??String(Date.now());
      const saves=[...this.saves,{id,title:s.sceneTitle.trim(),config:{biome:s.biome,level:s.level,difficulty:s.difficulty,unfavorable:s.unfavorable,nearCauldron:s.nearCauldron,members:mergeComposition(s.members),allies:s.allies}}];
      await game.settings.set(MID,'savedEncounters',saves);
      const select=html.find('[data-key="selectedSave"]');select.append(`<option value="${esc(id)}">${esc(s.sceneTitle)}</option>`);select.val(id);s.selectedSave=id;
      ui.notifications.info('Composition sauvegardée dans les paramètres du monde.');return;
    }
    if(action==='load'){
      const item=this.saves.find(x=>x.id===s.selectedSave);
      if(!item)throw new Error('Choisis une composition sauvegardée.');
      Object.assign(s,item.config,{mode:'manuel',sceneTitle:item.title,last:null});
      // Actualiser les champs après restauration ; aucun document Foundry n’est créé.
      for(const key of ['biome','level','difficulty','mode','unfavorable','nearCauldron','sceneTitle']){
        const el=html.find(`[data-key="${key}"]`);if(el.length){if(el.attr('type')==='checkbox')el.prop('checked',!!s[key]);else el.val(s[key]);}
      }
      html.find('[data-region="output"]').empty();this.paint(html);
      ui.notifications.info('Composition chargée.');return;
    }
  }
}
