export const PPQ = 960;
export const KEYS = ['Cb','Gb','Db','Ab','Eb','Bb','F','C','G','D','A','E','B','F#','C#'];
const STEPS = 'CDEFGAB';
const NATURAL = [0,2,4,5,7,9,11];
export const INSTRUMENTS = [
  ['piano','Piano · right hand','treble',0,0,0,'acoustic_grand_piano','keys'],
  ['piano-bass','Piano · left hand','bass',0,0,0,'acoustic_grand_piano','keys'],
  ['violin','Violin','treble',0,0,40,'violin','strings'],
  ['viola','Viola','alto',0,0,41,'viola','strings'],
  ['cello','Cello','bass',0,0,42,'cello','strings'],
  ['bass','Double bass','bass',-12,-7,43,'contrabass','strings'],
  ['flute','Flute','treble',0,0,73,'flute','winds'],
  ['piccolo','Piccolo','treble',12,7,72,'piccolo','winds'],
  ['oboe','Oboe','treble',0,0,68,'oboe','winds'],
  ['clarinet','B♭ clarinet','treble',-2,-1,71,'clarinet','winds'],
  ['bassoon','Bassoon','bass',0,0,70,'bassoon','winds'],
  ['soprano-sax','B♭ soprano sax','treble',-2,-1,64,'soprano_sax','winds'],
  ['alto-sax','E♭ alto sax','treble',-9,-5,65,'alto_sax','winds'],
  ['tenor-sax','B♭ tenor sax','treble',-14,-8,66,'tenor_sax','winds'],
  ['baritone-sax','E♭ baritone sax','treble',-21,-12,67,'baritone_sax','winds'],
  ['trumpet','B♭ trumpet','treble',-2,-1,56,'trumpet','brass'],
  ['horn','F horn','treble',-7,-4,60,'french_horn','brass'],
  ['trombone','Trombone','bass',0,0,57,'trombone','brass'],
  ['tuba','Tuba','bass',0,0,58,'tuba','brass'],
  ['euphonium','Euphonium','bass',0,0,58,'tuba','brass'],
  ['guitar','Acoustic guitar','treble',-12,-7,24,'acoustic_guitar_nylon','plucked'],
  ['electric-guitar','Electric guitar','treble',-12,-7,27,'electric_guitar_clean','plucked'],
  ['electric-bass','Electric bass','bass',-12,-7,33,'electric_bass_finger','plucked'],
  ['harp','Harp','treble',0,0,46,'orchestral_harp','plucked'],
  ['ukulele','Ukulele','treble',0,0,24,'acoustic_guitar_nylon','plucked'],
  ['recorder','Soprano recorder','treble',12,7,74,'recorder','winds'],
  ['organ','Organ','treble',0,0,19,'church_organ','keys'],
  ['accordion','Accordion','treble',0,0,21,'accordion','keys'],
  ['marimba','Marimba','treble',0,0,12,'marimba','mallet'],
  ['vibraphone','Vibraphone','treble',0,0,11,'vibraphone','mallet'],
  ['voice','Voice','treble',0,0,53,'voice_oohs','voice'],
  ['tenor-voice','Tenor voice','treble',-12,-7,53,'voice_oohs','voice'],
].map(([id,name,clef,transpose,diatonic,program,sound,family])=>({id,name,clef,transpose,diatonic,program,sound,family}));
export const preset = id => INSTRUMENTS.find(i=>i.id===id) || INSTRUMENTS[0];
export const uid = () => Math.random().toString(36).slice(2,10);
export const clone = o => JSON.parse(JSON.stringify(o));
export function newPart(instrument='piano') { return {id:uid(),instrument,clef:preset(instrument).clef,notes:[],muted:false}; }
export function newScore() { return {schemaVersion:1,title:'Untitled composition',composer:'',tempo:100,time:'4/4',key:0,parts:[newPart()]}; }
export function keyAlter(step,fifths) {
  const order = fifths>0?'FCGDAEB':'BEADGCF';
  return order.slice(0,Math.abs(fifths)).includes(step) ? Math.sign(fifths) : 0;
}
export function pitch(step,octave,alter=0) { return {step,octave,alter,midi:12*(octave+1)+NATURAL[STEPS.indexOf(step)]+alter}; }
export function keyForPart(score,part,written=true) {
  const p=preset(part.instrument); let f=score.key + (written ? -p.transpose*7+p.diatonic*12 : 0);
  while(f>7) f-=12; while(f< -7) f+=12; return f;
}
export function spellMidi(midi,fifths=0) {
  let best, cost=Infinity;
  for(let octave=Math.floor(midi/12)-2;octave<=Math.floor(midi/12);octave++) for(const step of STEPS) {
    const alter=midi-pitch(step,octave).midi;
    if(Math.abs(alter)>2) continue;
    const c=Math.abs(alter-keyAlter(step,fifths))*3+Math.abs(alter)+(fifths<0&&alter>0||fifths>=0&&alter<0?0.2:0);
    if(c<cost) {cost=c;best=pitch(step,octave,alter);}
  }
  return best;
}
export function transposePitch(p,semitones,diatonic) {
  let index=p.octave*7+STEPS.indexOf(p.step)+diatonic;
  let octave=Math.floor(index/7),step=STEPS[((index%7)+7)%7];
  return pitch(step,octave,p.midi+semitones-pitch(step,octave).midi);
}
export function displayPitch(p,part,written=true,score=null) {
  if(!written) return p;
  const i=preset(part.instrument), result=transposePitch(p,-i.transpose,-i.diatonic);
  const rawKey=score?score.key-i.transpose*7+i.diatonic*12:0;
  return Math.abs(result.alter)>2||Math.abs(rawKey)>7 ? spellMidi(result.midi,score?keyForPart(score,part,true):0) : result;
}
export function entryPitch(step,octave,accidental,score,part,written=true) {
  const alter=accidental==='key'?keyAlter(step,keyForPart(score,part,written)):Number(accidental);
  const p=pitch(step,octave,alter),i=preset(part.instrument);
  return written?transposePitch(p,i.transpose,i.diatonic):p;
}
export const pitchName=p=>p.step+({'-2':'𝄫','-1':'♭',0:'',1:'♯',2:'𝄪'}[p.alter]??'')+p.octave;
export const noteTicks=n=>PPQ*4/n.den*(n.dots===2?1.75:n.dots===1?1.5:1)*(n.tuplet?2/3:1);
export const measureTicks=score=>{const [n,d]=score.time.split('/').map(Number);return n*PPQ*4/d;};
export const partTicks=part=>part.notes.reduce((sum,n)=>sum+noteTicks(n),0);
const VALUES=[];
for(const den of [1,2,4,8,16,32,64]) for(const dots of [2,1,0]) VALUES.push({den,dots,ticks:noteTicks({den,dots})});
VALUES.sort((a,b)=>b.ticks-a.ticks);
export function measures(score,part,pad=true) {
  const capacity=measureTicks(score),out=[[]]; let used=0,abs=0;
  part.notes.forEach((note,index)=>{
    let left=noteTicks(note), offset=0;
    while(left>0.01) {
      if(used>=capacity-0.01) {out.push([]);used=0;}
      const max=Math.min(left,capacity-used);
      const value=note.tuplet&&max>=left-0.01 ? {den:note.den,dots:note.dots,ticks:left} : VALUES.find(v=>v.ticks<=max+0.01);
      if(!value) throw new Error('Unsupported rhythm at measure boundary.');
      const ticks=Math.round(value.ticks);
      out.at(-1).push({note,index,...value,ticks,start:abs,offset,continued:offset>0,continues:left>ticks+0.01});
      used+=ticks;abs+=ticks;left-=ticks;offset+=ticks;
    }
  });
  if(pad && used<capacity) {
    let left=capacity-used;
    while(left>0) { const v=VALUES.find(v=>v.ticks<=left); if(!v)break;
      out.at(-1).push({note:{rest:true,pitches:[],den:v.den,dots:v.dots},...v,index:-1,start:abs,padding:true}); left-=v.ticks; abs+=v.ticks; }
  }
  return out;
}
const frac=(a,b)=>{let x=a,y=b;while(y){const t=y;y=x%y;x=t;}return a/x===b/x?'':b/x===1?String(a/x):`${a/x}/${b/x}`;};
const abcPitch=(p,fifths,accState)=>{
  const key=p.step+p.octave, prior=accState.has(key)?accState.get(key):keyAlter(p.step,fifths);
  const a=p.alter===prior?'':({'-2':'__','-1':'_',0:'=',1:'^',2:'^^'}[p.alter]||'');accState.set(key,p.alter);
  return a+(p.octave>=5?p.step.toLowerCase()+"'".repeat(p.octave-5):p.step+','.repeat(Math.max(0,4-p.octave)));
};
export function toABC(score,part,written=true) {
  const fifths=keyForPart(score,part,written), maps=[];
  let abc=`X:1\nM:${score.time}\nL:1/4\nQ:1/4=${score.tempo}\nK:${KEYS[fifths+7]} clef=${part.clef}\n`;
  const bars=measures(score,part,true);
  bars.forEach((bar,bi)=>{
    let accState=new Map();
    for(const s of bar) {
      const n=s.note, start=abc.length;
      let prefix='';
      if(!s.continued) {
        if(n.dynamic)prefix+=`!${n.dynamic}!`;
        if(n.articulation)prefix+=`!${n.articulation}!`;
        if(n.slurStart)prefix+='(';
        if(n.tuplet && (s.index===0||part.notes[s.index-1]?.tuplet!==n.tuplet))prefix+='(3';
        if(n.lyric)prefix+='"_'+n.lyric.replace(/["\\\r\n]/g,'').slice(0,100)+'"';
      }
      const pitches=n.rest?'z':n.pitches.map(p=>abcPitch(displayPitch(p,part,written,score),fifths,accState));
      let value=n.rest?'z':pitches.length===1?pitches[0]:`[${pitches.join('')}]`;
      const nominal=s.ticks*(n.tuplet?1.5:1);
      value+=frac(nominal,PPQ);
      const next=part.notes[s.index+1];
      if(!n.rest&&(s.continues || n.tie&&next&&!next.rest&&samePitches(n,next)))value+='-';
      if(n.slurEnd&&!s.continues)value+=')';
      abc+=prefix+value+' ';
      if(s.index>=0)maps.push({start,end:abc.length,index:s.index});
    }
    abc+=(bi===bars.length-1?'|]':'|')+((bi+1)%4===0?'\n':' ');
  });
  return {abc,maps};
}
export const samePitches=(a,b)=>a.pitches.length===b.pitches.length && [...a.pitches].map(p=>p.midi).sort().join() === [...b.pitches].map(p=>p.midi).sort().join();
export function timeline(part) {
  const events=[];let t=0,velocity=0.65;
  part.notes.forEach((n,i)=>{
    if(n.dynamic)velocity={ppp:0.2,pp:0.3,p:0.4,mp:0.52,mf:0.65,f:0.8,ff:0.92,fff:1}[n.dynamic]||0.65;
    const ticks=noteTicks(n);let duration=ticks, j=i;
    const tiedFrom=i>0&&part.notes[i-1].tie&&samePitches(part.notes[i-1],n);
    if(!n.rest&&!tiedFrom) {
      while(part.notes[j].tie&&part.notes[j+1]&&!part.notes[j+1].rest&&samePitches(part.notes[j],part.notes[j+1])) {j++;duration+=noteTicks(part.notes[j]);}
      const gate=n.articulation==='staccato'?0.45:n.articulation==='tenuto'?0.99:0.92;
      for(const p of n.pitches)events.push({midi:p.midi,start:t,duration:Math.max(30,duration*gate),velocity:n.articulation==='accent'?Math.min(1,velocity*1.2):velocity,index:i});
    }
    t+=ticks;
  });return {events,duration:t};
}
const escapeXML=s=>String(s).replace(/[<>&"']/g,c=>({'<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;',"'":'&apos;'}[c]));
const XMLTYPES={1:'whole',2:'half',4:'quarter',8:'eighth',16:'16th',32:'32nd',64:'64th'};
export function toMusicXML(score,written=true,parts=score.parts) {
  const [beats,beatType]=score.time.split('/');
  let xml=`<?xml version="1.0" encoding="UTF-8"?>\n<!DOCTYPE score-partwise PUBLIC "-//Recordare//DTD MusicXML 4.0 Partwise//EN" "http://www.musicxml.org/dtds/partwise.dtd">\n<score-partwise version="4.0"><work><work-title>${escapeXML(score.title)}</work-title></work><identification><creator type="composer">${escapeXML(score.composer)}</creator></identification><part-list>`;
  parts.forEach((part,i)=>{const p=preset(part.instrument);xml+=`<score-part id="P${i+1}"><part-name>${escapeXML(p.name)}</part-name><score-instrument id="I${i+1}"><instrument-name>${escapeXML(p.name)}</instrument-name></score-instrument><midi-instrument id="I${i+1}"><midi-channel>${i+1>=10?i+2:i+1}</midi-channel><midi-program>${p.program+1}</midi-program></midi-instrument></score-part>`;});xml+='</part-list>';
  const all=parts.map(p=>measures(score,p,true)),max=Math.max(...all.map(m=>m.length));
  parts.forEach((part,i)=>{
    const p=preset(part.instrument);xml+=`<part id="P${i+1}">`;
    for(let b=0;b<max;b++) {
      xml+=`<measure number="${b+1}">`;
      if(b===0) {
        const [sign,line,oct]=({treble:['G',2,0],bass:['F',4,0],alto:['C',3,0],tenor:['C',4,0],'treble-8':['G',2,-1]})[part.clef];
        xml+=`<attributes><divisions>${PPQ}</divisions><key><fifths>${keyForPart(score,part,written)}</fifths></key><time><beats>${beats}</beats><beat-type>${beatType}</beat-type></time><clef><sign>${sign}</sign><line>${line}</line>${oct?`<clef-octave-change>${oct}</clef-octave-change>`:''}</clef>`;
        // The octave on a treble-8 clef already supplies the octave displacement.
        const octaveInClef=part.clef==='treble-8'?-12:0;
        const chromatic=written?p.transpose-octaveInClef:0,diatonic=written?p.diatonic-(octaveInClef?-7:0):0;
        if(chromatic)xml+=`<transpose><diatonic>${diatonic}</diatonic><chromatic>${chromatic}</chromatic></transpose>`;
        xml+='</attributes>';
        xml+=`<direction placement="above"><direction-type><metronome><beat-unit>quarter</beat-unit><per-minute>${score.tempo}</per-minute></metronome></direction-type><sound tempo="${score.tempo}"/></direction>`;
      }
      const bar=all[i][b]||[{note:{rest:true,pitches:[]},ticks:measureTicks(score),padding:true,den:4,dots:0,index:-1,fullRest:true}];
      for(const s of bar) {
        const n=s.note,next=part.notes[s.index+1],prev=part.notes[s.index-1];
        if(n.dynamic&&!s.continued)xml+=`<direction><direction-type><dynamics><${n.dynamic}/></dynamics></direction-type></direction>`;
        const tieStart=!n.rest&&(s.continues||n.tie&&next&&samePitches(n,next)),tieStop=!n.rest&&(s.continued||prev?.tie&&samePitches(prev,n));
        const ps=n.rest?[null]:n.pitches;
        ps.forEach((pp,k)=>{
          const d=pp?displayPitch(pp,part,written,score):null;
          xml+='<note>'+(k?'<chord/>':'')+(d?`<pitch><step>${d.step}</step>${d.alter?`<alter>${d.alter}</alter>`:''}<octave>${d.octave}</octave></pitch>`:`<rest${s.fullRest?' measure="yes"':''}/>`)+`<duration>${s.ticks}</duration>`;
          if(tieStop)xml+='<tie type="stop"/>';if(tieStart)xml+='<tie type="start"/>';
          if(!s.fullRest)xml+=`<type>${XMLTYPES[s.den]}</type>`+'<dot/>'.repeat(s.dots||0);
          if(n.tuplet)xml+='<time-modification><actual-notes>3</actual-notes><normal-notes>2</normal-notes></time-modification>';
          if(tieStart||tieStop||n.articulation||n.slurStart||n.slurEnd||n.tuplet) {
            xml+='<notations>'+(tieStop?'<tied type="stop"/>':'')+(tieStart?'<tied type="start"/>':'');
            if(n.slurStart&&!s.continued)xml+='<slur type="start" number="1"/>';
            if(n.slurEnd&&!s.continues)xml+='<slur type="stop" number="1"/>';
            if(n.articulation==='fermata')xml+='<fermata/>';
            else if(n.articulation)xml+=`<articulations><${n.articulation}/></articulations>`;
            if(n.tuplet&&(s.index===0||prev?.tuplet!==n.tuplet))xml+='<tuplet type="start"/>';
            if(n.tuplet&&next?.tuplet!==n.tuplet)xml+='<tuplet type="stop"/>';
            xml+='</notations>';
          }
          if(n.lyric&&!k&&!s.continued)xml+=`<lyric><text>${escapeXML(n.lyric)}</text></lyric>`;
          xml+='</note>';
        });
      }
      if(b===max-1)xml+='<barline location="right"><bar-style>light-heavy</bar-style></barline>';
      xml+='</measure>';
    }xml+='</part>';
  });return xml+'</score-partwise>';
}
const be=(n,len)=>Array.from({length:len},(_,i)=>n>>>((len-i-1)*8)&255);
const vlq=n=>{let a=[n&127];while(n>>=7)a.unshift((n&127)|128);return a;};
const ascii=s=>[...s].map(c=>c.charCodeAt(0));
const chunk=(id,body)=>[...ascii(id),...be(body.length,4),...body];
export function toMIDI(score,parts=score.parts) {
  const tempo=Math.round(60000000/score.tempo),[n,d]=score.time.split('/').map(Number);
  const tracks=[chunk('MTrk',[0,255,81,3,...be(tempo,3),0,255,88,4,n,Math.log2(d),24,8,0,255,89,2,score.key&255,0,0,255,47,0])];
  parts.forEach((part,i)=>{
    const ch=i>=9?i+1:i,p=preset(part.instrument),{events,duration}=timeline(part),ev=[];
    const name=new TextEncoder().encode(p.name);let body=[0,255,3,...vlq(name.length),...name,0,0xc0|ch,p.program];
    for(const e of events) {ev.push({t:Math.round(e.start),data:[0x90|ch,e.midi,Math.round(e.velocity*110)]});ev.push({t:Math.round(e.start+e.duration),data:[0x80|ch,e.midi,0]});}
    ev.sort((a,b)=>a.t-b.t||a.data[0]-b.data[0]);let last=0;
    for(const e of ev){body.push(...vlq(e.t-last),...e.data);last=e.t;}
    body.push(...vlq(Math.max(0,Math.round(duration)-last)),255,47,0);tracks.push(chunk('MTrk',body));
  });return new Uint8Array([...chunk('MThd',[0,1,...be(tracks.length,2),...be(PPQ,2)]),...tracks.flat()]);
}
export function validateScore(s) {
  if(!s||s.schemaVersion!==1||typeof s.title!=='string'||s.title.length>200||typeof s.composer!=='string'||s.composer.length>200||!Number.isFinite(s.tempo)||s.tempo<30||s.tempo>300||!['2/4','3/4','4/4','5/4','6/8','7/8','9/8','12/8','2/2','3/8'].includes(s.time)||!Number.isInteger(s.key)||Math.abs(s.key)>7||!Array.isArray(s.parts)||!s.parts.length||s.parts.length>12)throw new Error('This is not a supported Staff & Sound project.');
  const ids=new Set();let count=0;
  for(const p of s.parts) {
    if(typeof p.id!=='string'||ids.has(p.id)||!INSTRUMENTS.some(i=>i.id===p.instrument)||!['treble','bass','alto','tenor','treble-8'].includes(p.clef)||!Array.isArray(p.notes)||p.notes.length>5000)throw new Error('Invalid instrument part.');ids.add(p.id);
    let elapsed=0;
    for(let ni=0;ni<p.notes.length;ni++) {
      const n=p.notes[ni];
      count++;
      if(![1,2,4,8,16,32,64].includes(n.den)||![0,1,2].includes(n.dots)||typeof n.rest!=='boolean'||!Array.isArray(n.pitches)||n.pitches.length>8||(!n.rest&&!n.pitches.length)||!['','ppp','pp','p','mp','mf','f','ff','fff'].includes(n.dynamic||'')||!['','staccato','tenuto','accent','fermata'].includes(n.articulation||'')||typeof(n.lyric||'')!=='string'||(n.lyric||'').length>100)throw new Error('Invalid note data.');
      for(const q of n.pitches)if(![...STEPS].includes(q.step)||!Number.isInteger(q.octave)||!Number.isInteger(q.alter)||Math.abs(q.alter)>2||!Number.isInteger(q.midi)||q.midi<0||q.midi>127||pitch(q.step,q.octave,q.alter).midi!==q.midi)throw new Error('Invalid pitch.');
      if(n.tuplet&&(ni===0||p.notes[ni-1].tuplet!==n.tuplet)) {
        const group=p.notes.slice(ni,ni+3);
        if(typeof n.tuplet!=='string'||group.length!==3||group.some(x=>x.tuplet!==n.tuplet||x.den!==n.den||x.dots!==0)||p.notes[ni+3]?.tuplet===n.tuplet)throw new Error('Invalid triplet group.');
        if((elapsed%measureTicks(s))+group.reduce((sum,x)=>sum+noteTicks(x),0)>measureTicks(s)+.01)throw new Error('Triplets must fit inside one bar. Choose a shorter duration or add rests first.');
      }
      elapsed+=noteTicks(n);
    }
    measures(s,p);
  }
  if(count>10000)throw new Error('Project is too large (10,000 notes maximum).');
  return clone(s);
}
export function demoScore() {
  const s=newScore();s.title='A little room for wonder';s.composer='Your next idea starts here';s.tempo=108;
  const melody=['E4','G4','A4','G4','E4','D4','C4','D4','E4','G4','C5','B4','A4','G4','E4','D4'];
  s.parts[0].notes=melody.map((name,i)=>({id:uid(),rest:false,pitches:[pitch(name[0],Number(name[1]))],den:4,dots:0,dynamic:i===0?'mp':'',articulation:i===8?'accent':'',tie:false}));
  return s;
}
