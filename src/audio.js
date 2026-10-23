import Soundfont from 'soundfont-player';
import {preset,timeline,PPQ} from './music.js';
let context,voices=[],sampleCache=new Map(),timers=[],generation=0;
export function audioContext(){context??=new (window.AudioContext||window.webkitAudioContext)();return context;}
function synth(midi,when,duration,velocity,family) {
  const ctx=audioContext(),gain=ctx.createGain(),osc=ctx.createOscillator();
  osc.type=family==='winds'?'sine':family==='brass'?'sawtooth':family==='strings'?'triangle':family==='keys'?'triangle':'sine';
  osc.frequency.value=440*2**((midi-69)/12);const level=velocity*(family==='brass'?0.045:0.12);
  gain.gain.setValueAtTime(0,when);gain.gain.linearRampToValueAtTime(level,when+0.015);gain.gain.exponentialRampToValueAtTime(Math.max(.001,level*(family==='plucked'||family==='keys'||family==='mallet'?0.2:0.8)),when+Math.max(.04,duration*.8));gain.gain.exponentialRampToValueAtTime(.0001,when+duration+.07);
  const filter=ctx.createBiquadFilter();filter.type='lowpass';filter.frequency.value=family==='brass'?2400:family==='strings'?1800:4000;
  osc.connect(filter).connect(gain).connect(ctx.destination);osc.start(when);osc.stop(when+duration+.1);voices.push(osc);
  osc.onended=()=>{osc.disconnect();filter.disconnect();gain.disconnect();voices=voices.filter(v=>v!==osc);};
}
async function samples(instrument) {
  if(!sampleCache.has(instrument))sampleCache.set(instrument,Soundfont.instrument(audioContext(),instrument,{soundfont:'FluidR3_GM',format:'mp3'}).catch(()=>{sampleCache.delete(instrument);return null;}));
  return sampleCache.get(instrument);
}
export function stopAudio() {generation++;for(const t of timers)clearTimeout(t);timers=[];for(const v of voices){try{v.stop();}catch{}}voices=[];}
export async function preview(pitches,instrument) {
  try{const ctx=audioContext();await ctx.resume();for(const p of pitches)synth(p.midi,ctx.currentTime+.01,.28,.55,preset(instrument).family);}catch{}
}
export async function playScore(score,{useSamples=true,onState=()=>{},onTick=()=>{},onEnd=()=>{}}={}) {
  stopAudio();const token=generation,ctx=audioContext();await ctx.resume();
  const parts=score.parts.filter(p=>!p.muted);if(!parts.length)throw new Error('Unmute an instrument to hear your score.');
  if(!parts.some(p=>p.notes.some(n=>!n.rest)))throw new Error('Add some notes to hear your score.');
  let instruments=new Map();
  if(useSamples) {
    onState('Loading instrument samples…');
    const names=[...new Set(parts.map(p=>preset(p.instrument).sound))];
    const result=await Promise.race([Promise.all(names.map(async name=>[name,await samples(name)])),new Promise(resolve=>setTimeout(()=>resolve([]),6500))]);
    instruments=new Map(result);
  }
  if(token!==generation)return;
  onState(instruments.size&&[...instruments.values()].every(Boolean)?'Playing instrument samples':'Playing synthesized preview');
  const seconds=60/score.tempo/PPQ,origin=ctx.currentTime+.12,total=Math.max(...parts.map(p=>timeline(p).duration));
  // Schedule a short window at a time, so large scores do not allocate every voice at once.
  const queue=parts.flatMap(part=>timeline(part).events.map(e=>({...e,part}))).sort((a,b)=>a.start-b.start);let next=0;
  const schedule=()=>{
    if(token!==generation)return;
    const now=ctx.currentTime;
    while(next<queue.length && origin+queue[next].start*seconds<now+.35) {
      const e=queue[next++],ins=preset(e.part.instrument),when=Math.max(now,origin+e.start*seconds),duration=e.duration*seconds;
      const sample=instruments.get(ins.sound);
      if(sample){const voice=sample.play(e.midi,when,{duration,gain:e.velocity*.65});voices.push(voice);}
      else synth(e.midi,when,duration,e.velocity,ins.family);
    }
    onTick(Math.max(0,(now-origin)/seconds),total);
    if(now>=origin+total*seconds+.15){stopAudio();onEnd();return;}
    timers.push(setTimeout(schedule,70));if(timers.length>30)timers=timers.slice(-20);
  };schedule();
}
