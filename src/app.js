import ABCJS from 'abcjs';
import {INSTRUMENTS,KEYS,PPQ,preset,uid,clone,newPart,newScore,demoScore,pitchName,entryPitch,displayPitch,spellMidi,noteTicks,measureTicks,partTicks,measures,toABC,toMusicXML,toMIDI,validateScore,keyForPart,samePitches} from './music.js';
import {playScore,stopAudio,preview} from './audio.js';
const $=id=>document.getElementById(id),STORAGE='staff-and-sound.project.v1';
let score,selected=null,insertAt=null,activeId,written=true,den=4,dots=0,chord=[],lastPitch=null,playing=false,history=[],future=[],rendered=[],toastTimer,confirmAction;
try {const saved=localStorage.getItem(STORAGE);score=saved?validateScore(JSON.parse(saved)):demoScore();}catch{score=demoScore();}
activeId=score.parts[0].id;
const active=()=>score.parts.find(p=>p.id===activeId)||score.parts[0];
const selectedNote=()=>selected&&score.parts.find(p=>p.id===selected.partId)?.notes[selected.index];
function toast(message){clearTimeout(toastTimer);$('toast').textContent=message;$('toast').classList.add('visible');toastTimer=setTimeout(()=>$('toast').classList.remove('visible'),4500);}
function persist(){try{localStorage.setItem(STORAGE,JSON.stringify(score));$('save-status').textContent='Saved on this device';}catch{$('save-status').textContent='Storage full · save a project backup';}}
function stop(){stopAudio();playing=false;$('play').textContent='▶';$('play').setAttribute('aria-label','Play score');$('transport-label').textContent='Ready when you are';$('transport-sub').textContent='Listen to your full arrangement';document.querySelectorAll('.note-playing').forEach(el=>el.classList.remove('note-playing'));}
function commit(fn){const before=JSON.stringify(score);stop();try{fn();validateScore(score);}catch(e){score=JSON.parse(before);toast(e.message);render();return false;}if(before!==JSON.stringify(score)){history.push(before);if(history.length>80)history.shift();future=[];persist();}render();return true;}
function undo(redo=false){const from=redo?future:history,to=redo?history:future;if(!from.length)return;stop();to.push(JSON.stringify(score));score=JSON.parse(from.pop());selected=null;insertAt=null;activeId=score.parts.some(p=>p.id===activeId)?activeId:score.parts[0].id;persist();render();}
function setSelected(part,index){insertAt=null;activeId=part.id;selected={partId:part.id,index};const n=selectedNote();den=n.den;dots=n.dots;if(n.pitches[0]){lastPitch=n.pitches[0];$('octave').value=displayPitch(n.pitches[0],part,written,score).octave;}render();}
function options(select){INSTRUMENTS.forEach(i=>{const o=document.createElement('option');o.value=i.id;o.textContent=i.name;select.append(o);});}
options($('instrument'));options($('add-instrument'));
KEYS.forEach((key,i)=>{const o=document.createElement('option');o.value=i-7;o.textContent=`${key.replace('b','♭').replace('#','♯')} major`; $('key').append(o);});
const icons={keys:'♮',strings:'𝄞',winds:'♪',brass:'♩',plucked:'♬',mallet:'♩',voice:'♫'};
function renderParts(){
  $('parts-list').replaceChildren();
  for(const part of score.parts){const p=preset(part.instrument),card=document.createElement('div');card.className='part-card'+(part.id===activeId?' active':'');
    const select=document.createElement('button');select.className='part-select';select.setAttribute('aria-label',`Select ${p.name}`);select.setAttribute('aria-pressed',part.id===activeId);
    const icon=document.createElement('span');icon.className='part-icon';icon.textContent=icons[p.family];select.append(icon);
    const details=document.createElement('span'),name=document.createElement('strong'),small=document.createElement('small');name.textContent=p.name;small.textContent=`${part.clef} clef · ${part.notes.length} notes`;details.append(name,small);select.append(details);select.onclick=()=>{activeId=part.id;selected=null;insertAt=null;insertAt=null;chord=[];const oct=part.clef==='bass'?3:4;$('octave').value=oct;render();};card.append(select);
    const mute=document.createElement('button');mute.className='mute';mute.textContent=part.muted?'Muted ◌':'Sound on ◉';mute.setAttribute('aria-label',`${part.muted?'Unmute':'Mute'} ${p.name}`);mute.setAttribute('aria-pressed',!!part.muted);mute.onclick=()=>commit(()=>part.muted=!part.muted);card.append(mute);
    if(score.parts.length>1){const remove=document.createElement('button');remove.className='remove-part';remove.textContent='×';remove.setAttribute('aria-label',`Remove ${p.name}`);remove.title='Remove part (Undo restores it)';remove.onclick=()=>commit(()=>{score.parts=score.parts.filter(p=>p.id!==part.id);if(activeId===part.id){activeId=score.parts[0].id;selected=null;}});card.append(remove);}
    $('parts-list').append(card);
  }$('part-count').textContent=String(score.parts.length).padStart(2,'0');$('add-part').disabled=score.parts.length>=12;
}
function renderScores(parts=null,printWidth=0){
  const root=$('notation');root.replaceChildren();rendered=[];
  const visible=parts||($('part-view').value==='active'?[active()]:score.parts);
  const hasNotes=visible.some(p=>p.notes.length);$('sheet-empty').hidden=hasNotes;
  for(const part of visible){
    const p=preset(part.instrument),section=document.createElement('section');section.className='notation-part';section.dataset.partId=part.id;
    const label=document.createElement('div');label.className='part-score-label';label.textContent=p.name;label.setAttribute('role','button');label.tabIndex=0;label.setAttribute('aria-label',`Select ${p.name} staff`);label.onclick=()=>{activeId=part.id;selected=null;insertAt=null;render();};label.onkeydown=e=>{if(e.key==='Enter')label.click();};const info=document.createElement('small');info.textContent=`${part.clef} · ${KEYS[keyForPart(score,part,written)+7].replace('b','♭').replace('#','♯')} major${part.muted?' · muted':''}`;label.append(info);section.append(label);
    const div=document.createElement('div');div.className='notation-render';section.append(div);root.append(section);
    const {abc,maps}=toABC(score,part,written),width=printWidth||Math.max(280,div.clientWidth-8);
    const tunes=ABCJS.renderAbc(div,abc,{responsive:'resize',staffwidth:width,paddingtop:10,paddingbottom:14,paddingleft:5,paddingright:5,add_classes:true,selectTypes:['note'],oneSvgPerLine:true,wrap:{minSpacing:1.7,maxSpacing:2.4,preferredMeasuresPerLine:4},stafftopmargin:20,selectionColor:'#71974f',foregroundColor:'#29352d',clickListener:(elem)=>{const m=maps.find(m=>elem.endChar>m.start&&elem.endChar<=m.end);if(m)setSelected(part,m.index);}});
    const tune=tunes[0];
    for(const el of tune?.engraver?.selectables||[]){const ch=el.absEl?.abcelem?.endChar,m=maps.find(m=>ch>m.start&&ch<=m.end);if(m&&el.svgEl){el.svgEl.dataset.noteIndex=m.index;el.svgEl.dataset.partId=part.id;el.svgEl.setAttribute('aria-label',`${p.name}, note ${m.index+1}, ${part.notes[m.index].rest?'rest':part.notes[m.index].pitches.map(p=>pitchName(displayPitch(p,part,written,score))).join(', ')}`);if(selected?.partId===part.id&&selected.index===m.index)el.svgEl.classList.add('note-selected');}}
    rendered.push({part,tune,abc,maps,div});
  }
  const bars=Math.max(...score.parts.map(p=>measures(score,p).length));$('measure-count').textContent=`${bars} ${bars===1?'measure':'measures'}`;
}
function renderEntry(){
  document.querySelectorAll('[data-den]').forEach(b=>{const yes=Number(b.dataset.den)===den;b.classList.toggle('active',yes);b.setAttribute('aria-pressed',yes);});$('dots').value=dots;
  $('pitch-keys').replaceChildren();
  for(const step of 'CDEFGAB'){
    const p=entryPitch(step,Number($('octave').value),$('accidental').value,score,active(),written),shown=displayPitch(p,active(),written,score),b=document.createElement('button');
    b.className='pitch-key'+(chord.some(q=>q.midi===p.midi)?' chosen':'');b.setAttribute('aria-label',`Add ${pitchName(shown)}`);b.title=`${pitchName(shown)} (${step} key)`;
    const name=document.createElement('strong');name.textContent=step;const sub=document.createElement('small');sub.textContent=`octave ${shown.octave}`;const acc=document.createElement('span');acc.className='acc';acc.textContent=({'-2':'𝄫','-1':'♭',0:'',1:'♯',2:'𝄪'})[shown.alter]||'';b.append(name,sub,acc);b.onclick=()=>enterPitch(step);$('pitch-keys').append(b);
  }
  const chordMode=$('chord-mode').checked;$('chord-actions').hidden=!chordMode;$('entry-hint').hidden=chordMode;$('chord-pitches').textContent=chord.length?chord.map(p=>pitchName(displayPitch(p,active(),written,score))).join(' · '):'Choose pitches';$('add-chord').disabled=!chord.length;
  $('entry-mode').textContent=selected?`Editing note ${selected.index+1} · ${preset(active().instrument).name}`:insertAt!==null?`Inserting at note ${insertAt+1} · ${preset(active().instrument).name}`:`Adding to the end of ${preset(active().instrument).name}`;
}
function renderInspector(){
  const n=selectedNote();$('inspector-fields').disabled=!n;$('inspector-empty').hidden=!!n;$('selected-badge').textContent=n?String(selected.index+1).padStart(2,'0'):'—';
  $('note-dynamic').value=n?.dynamic||'';$('note-articulation').value=n?.articulation||'';$('note-tie').checked=!!n?.tie;$('note-slur-start').checked=!!n?.slurStart;$('note-slur-end').checked=!!n?.slurEnd;$('note-lyric').value=n?.lyric||'';
  $('pitch-down').disabled=!n||n.rest;$('pitch-up').disabled=!n||n.rest;$('note-tie').disabled=!n||n.rest;
  $('selection-status').textContent=n?`Note ${selected.index+1} · ${n.rest?'rest':n.pitches.map(p=>pitchName(displayPitch(p,active(),written,score))).join(' + ')}${n.tuplet?' · triplet':''}`:'Click a note on the staff to edit it';
  const used=partTicks(active())%measureTicks(score),capacity=measureTicks(score);$('rhythm-status').textContent=`Bar ${Math.floor(partTicks(active())/capacity)+1} · ${Math.round((capacity-used)/PPQ*100)/100} quarter beats free`;
}
function render(){
  if(!selected && insertAt!==null && insertAt>active().notes.length)insertAt=null;
  $('score-title').value=score.title;$('composer').value=score.composer;$('tempo').value=score.tempo;$('time').value=score.time;$('key').value=score.key;$('instrument').value=active().instrument;$('clef').value=active().clef;
  $('score-metadata').textContent=`${score.time}  ·  ♩ = ${score.tempo}  ·  ${written?'INSTRUMENT PITCH':'CONCERT PITCH'}`;
  $('written').classList.toggle('active',written);$('concert').classList.toggle('active',!written);$('written').setAttribute('aria-pressed',written);$('concert').setAttribute('aria-pressed',!written);
  const ins=preset(active().instrument);$('transposition-info').textContent=ins.transpose?`Written C sounds ${pitchName(entryPitch('C',4,0,score,active(),true))}. Switching instruments preserves concert pitches.`:'Concert-pitch instrument. Written and sounding notes match.';
  $('undo').disabled=!history.length;$('redo').disabled=!future.length;
  renderParts();renderScores();renderInspector();renderEntry();
}
function note(pitches,rest=false){return {id:uid(),pitches,rest,den,dots,dynamic:'',articulation:'',tie:false};}
function addNote(pitches,rest=false){
  if(!rest&&pitches.some(p=>p.midi<0||p.midi>127)){toast('That pitch is outside the MIDI range. Choose another octave.');return;}
  commit(()=>{
    const n=selectedNote();
    if(n){n.pitches=clone(pitches);n.rest=rest;if(!n.tuplet){n.den=den;n.dots=dots;}n.tie=false;}
    else {if(active().notes.length>=5000)throw new Error('This part is full. Add a new part.');if(insertAt===null)active().notes.push(note(clone(pitches),rest));else{active().notes.splice(insertAt,0,note(clone(pitches),rest));insertAt++;}}
  });if(!rest&&pitches.length)preview(pitches,active().instrument);
}
function enterPitch(step){
  const p=entryPitch(step,Number($('octave').value),$('accidental').value,score,active(),written);lastPitch=p;
  if($('chord-mode').checked){const i=chord.findIndex(q=>q.midi===p.midi);if(i>=0)chord.splice(i,1);else if(chord.length<8)chord.push(p);else{toast('Use up to eight pitches in one chord.');return;}preview([p],active().instrument);renderEntry();}
  else addNote([p]);
}
function changeRhythm(){const n=selectedNote();if(!n){renderEntry();return;}commit(()=>{if(n.tuplet){if(dots)throw new Error('Triplets use undotted durations.');for(const q of active().notes.filter(q=>q.tuplet===n.tuplet)){q.den=den;q.dots=0;}}else{n.den=den;n.dots=dots;}});}
function ensureTuplets(part){const capacity=measureTicks(score);let t=0;for(let i=0;i<part.notes.length;i++){const n=part.notes[i];if(n.tuplet&&(i===0||part.notes[i-1].tuplet!==n.tuplet)){const group=part.notes.slice(i,i+3);if(group.length!==3||group.some(q=>q.tuplet!==n.tuplet))throw new Error('Keep triplet groups together.');const length=group.reduce((a,q)=>a+noteTicks(q),0);if((t%capacity)+length>capacity+0.01)throw new Error('Triplets must fit inside one bar. Choose a shorter duration or add rests first.');}t+=noteTicks(n);}}
function download(content,type,extension){const blob=new Blob([content],{type}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=(score.title.replace(/[^a-z0-9\u00c0-\uffff_-]+/gi,'-').replace(/^-|-$/g,'')||'my-score')+extension;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),30000);}
function saveProject(){download(JSON.stringify(score,null,2),'application/json','.staff.json');toast('Editable project downloaded.');}
function exportParts(){return $('export-parts').value==='active'?[active()]:score.parts;}
function fresh(action,title){confirmAction=action;$('confirm-title').textContent=title;$('confirm-dialog').showModal();}
async function play(){
  if(playing){stop();return;}
  playing=true;$('play').textContent='Ⅱ';$('play').setAttribute('aria-label','Stop playback');$('transport-label').textContent='Preparing playback…';
  try{await playScore(score,{useSamples:$('samples').checked,onState:text=>{$('transport-label').textContent=text;},onTick:(ticks,total)=>{
    $('transport-sub').textContent=`${Math.floor(ticks/PPQ*60/score.tempo)}s / ${Math.ceil(total/PPQ*60/score.tempo)}s · quarter = ${score.tempo}`;
    for(const r of rendered){let t=0,index=-1;r.part.notes.forEach((n,i)=>{if(ticks>=t&&ticks<t+noteTicks(n))index=i;t+=noteTicks(n);});for(const el of r.div.querySelectorAll('[data-note-index]'))el.classList.toggle('note-playing',!r.part.muted&&Number(el.dataset.noteIndex)===index);}
  },onEnd:stop});}catch(e){stop();toast(e.message||'Audio is not available in this browser. Try exporting MIDI.');}
}
$('play').onclick=play;$('stop').onclick=stop;
$('add-part').onclick=()=>{if(score.parts.length>=12)return;commit(()=>{const p=newPart($('add-instrument').value);score.parts.push(p);activeId=p.id;selected=null;insertAt=null;chord=[];$('octave').value=p.clef==='bass'?3:4;});};
$('instrument').onchange=e=>commit(()=>{active().instrument=e.target.value;active().clef=preset(active().instrument).clef;selected=null;insertAt=null;chord=[];});
$('clef').onchange=e=>commit(()=>active().clef=e.target.value);
$('score-title').onchange=e=>commit(()=>score.title=e.target.value.trim()||'Untitled composition');$('composer').onchange=e=>commit(()=>score.composer=e.target.value);
$('tempo').onchange=e=>{const n=Number(e.target.value);if(!Number.isFinite(n)){render();return;}commit(()=>score.tempo=Math.max(30,Math.min(300,Math.round(n))));};
$('time').onchange=e=>commit(()=>{score.time=e.target.value;score.parts.forEach(ensureTuplets);});$('key').onchange=e=>commit(()=>score.key=Number(e.target.value));
$('written').onclick=()=>{written=true;chord=[];render();};$('concert').onclick=()=>{written=false;chord=[];render();};$('part-view').onchange=()=>renderScores();
$('undo').onclick=()=>undo();$('redo').onclick=()=>undo(true);
$('durations').onclick=e=>{const b=e.target.closest('[data-den]');if(b){den=Number(b.dataset.den);changeRhythm();}};
$('dots').onchange=e=>{dots=Number(e.target.value);changeRhythm();};$('accidental').onchange=renderEntry;$('octave').onchange=renderEntry;
$('add-rest').onclick=()=>addNote([],true);
$('chord-mode').onchange=()=>{chord=[];renderEntry();};$('clear-chord').onclick=()=>{chord=[];renderEntry();};$('add-chord').onclick=()=>{if(chord.length){addNote(chord);chord=[];renderEntry();}};
$('add-triplet').onclick=()=>{
  if(selected||insertAt!==null){toast('Switch to adding at the end before adding a triplet group.');return;}
  if(dots){toast('Set dots to None to add a triplet.');return;}
  const ps=chord.length?clone(chord):[lastPitch||entryPitch('C',Number($('octave').value),'key',score,active(),written)];
  commit(()=>{const group=uid();active().notes.push(...[0,1,2].map(()=>({...note(clone(ps)),tuplet:group,dots:0})));ensureTuplets(active());});chord=[];renderEntry();
};
for(const [id,key] of [['note-dynamic','dynamic'],['note-articulation','articulation'],['note-lyric','lyric']])$(id).onchange=e=>{if(selectedNote())commit(()=>selectedNote()[key]=e.target.value);};
for(const [id,key] of [['note-slur-start','slurStart'],['note-slur-end','slurEnd']])$(id).onchange=e=>{if(selectedNote())commit(()=>selectedNote()[key]=e.target.checked);};
$('note-tie').onchange=e=>{const n=selectedNote(),next=active().notes[selected.index+1];if(e.target.checked&&(!next||next.rest||!samePitches(n,next))){e.target.checked=false;toast('A tie needs an identical note or chord immediately after it.');return;}commit(()=>n.tie=e.target.checked);};
function shiftPitch(amount){const n=selectedNote();if(!n||n.rest)return;commit(()=>{n.pitches=n.pitches.map(p=>{if(p.midi+amount<0||p.midi+amount>127)throw new Error('Pitch is outside the MIDI range.');return spellMidi(p.midi+amount,score.key);});n.tie=false;});preview(selectedNote()?.pitches||[],active().instrument);}
$('pitch-down').onclick=()=>shiftPitch(-1);$('pitch-up').onclick=()=>shiftPitch(1);
$('delete-note').onclick=()=>{if(!selectedNote())return;commit(()=>{const n=selectedNote();active().notes=n.tuplet?active().notes.filter(q=>q.tuplet!==n.tuplet):active().notes.filter((_,i)=>i!==selected.index);selected=null;});};
$('append-mode').onclick=()=>{selected=null;insertAt=null;render();};
for(const [id,after] of [['insert-before',false],['insert-after',true]])$(id).onclick=()=>{const n=selectedNote();if(!n)return;let i=selected.index;if(n.tuplet){while(i>0&&active().notes[i-1].tuplet===n.tuplet)i--;if(after)i+=3;}else if(after)i++;selected=null;insertAt=i;render();};
$('new-score').onclick=()=>fresh(()=>{score=newScore();activeId=score.parts[0].id;selected=null;insertAt=null;chord=[];},'Create a new score?');
$('load-demo').onclick=()=>fresh(()=>{score=demoScore();activeId=score.parts[0].id;selected=null;insertAt=null;chord=[];},'Load the example melody?');
$('confirm-cancel').onclick=()=>$('confirm-dialog').close();$('confirm-backup').onclick=saveProject;$('confirm-yes').onclick=()=>{commit(confirmAction);$('confirm-dialog').close();};
$('save').onclick=saveProject;$('open').onclick=()=>$('file-input').click();
$('file-input').onchange=async e=>{const file=e.target.files[0];if(!file)return;try{if(file.size>5e6)throw new Error('Choose a project smaller than 5 MB.');const imported=validateScore(JSON.parse(await file.text()));imported.parts.forEach(p=>{const old=score;score=imported;try{ensureTuplets(p);}finally{score=old;}});fresh(()=>{score=imported;activeId=score.parts[0].id;selected=null;insertAt=null;chord=[];},'Open this project?');}catch(err){toast(err.message||'Could not open that project.');}e.target.value='';};
$('export-open').onclick=()=>$('export-dialog').showModal();$('help').onclick=()=>$('help-dialog').showModal();
$('export-xml').onclick=()=>{download(toMusicXML(score,written,exportParts()),'application/vnd.recordare.musicxml+xml','.musicxml');toast('MusicXML downloaded.');};
$('export-midi').onclick=()=>{download(toMIDI(score,exportParts()),'audio/midi','.mid');toast('Concert-pitch MIDI downloaded.');};
const esc=s=>String(s).replace(/[<>&"']/g,c=>({'<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;',"'":'&apos;'}[c]));
$('export-svg').onclick=()=>{
  renderScores(exportParts(),900);let y=120;const fragments=[];
  for(const r of rendered){fragments.push(`<text x="45" y="${y}" font-family="Georgia,serif" font-size="15" fill="#29352d">${esc(preset(r.part.instrument).name)}</text>`);y+=15;for(const svg of r.div.querySelectorAll('svg')){const box=svg.getAttribute('viewBox')?.split(/\s+/).map(Number)||[0,0,900,150],h=box[3]*900/box[2];const copied=svg.cloneNode(true);copied.setAttribute('x',40);copied.setAttribute('y',y);copied.setAttribute('width',900);copied.setAttribute('height',h);copied.removeAttribute('style');copied.querySelectorAll('.note-selected,.note-playing').forEach(e=>{e.classList.remove('note-selected','note-playing');});fragments.push(copied.outerHTML);y+=h;}y+=30;}
  const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="980" height="${y+30}" viewBox="0 0 980 ${y+30}"><rect width="100%" height="100%" fill="white"/><text x="490" y="48" text-anchor="middle" font-family="Georgia,serif" font-size="28" fill="#29352d">${esc(score.title)}</text><text x="490" y="77" text-anchor="middle" font-family="Georgia,serif" font-size="14" fill="#64735a">${esc(score.composer)}</text>${fragments.join('')}</svg>`;
  download(svg,'image/svg+xml','.svg');renderScores();toast('Sheet music SVG downloaded.');
};
let printing=false;
$('print').onclick=()=>{stop();$('export-dialog').close();printing=true;renderScores(exportParts(),700);requestAnimationFrame(()=>window.print());};
window.addEventListener('beforeprint',()=>{if(!printing)renderScores(null,700);});window.addEventListener('afterprint',()=>{printing=false;renderScores();});
window.addEventListener('keydown',e=>{
  if(document.querySelector('dialog[open]'))return;
  const typing=['INPUT','SELECT','TEXTAREA'].includes(e.target.tagName)||e.target.isContentEditable;if(typing)return;
  if((e.metaKey||e.ctrlKey)&&e.key.toLowerCase()==='z'){e.preventDefault();undo(e.shiftKey);return;}if(e.metaKey||e.ctrlKey||e.altKey)return;
  if(e.code==='Space'){e.preventDefault();play();}else if(/^[a-g]$/i.test(e.key)){e.preventDefault();enterPitch(e.key.toUpperCase());}else if(e.key.toLowerCase()==='r'){e.preventDefault();addNote([],true);}else if(e.key==='Escape'){selected=null;insertAt=null;chord=[];render();}else if(e.key==='Delete'||e.key==='Backspace'){e.preventDefault();$('delete-note').click();}
});
let resizeTimer;window.addEventListener('resize',()=>{clearTimeout(resizeTimer);resizeTimer=setTimeout(()=>{if(!printing)renderScores();},200);});
window.addEventListener('pagehide',stop);persist();render();
