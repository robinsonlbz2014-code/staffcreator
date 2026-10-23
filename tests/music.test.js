import test from 'node:test';
import assert from 'node:assert/strict';
import {newScore,newPart,pitch,entryPitch,displayPitch,noteTicks,measures,measureTicks,toABC,toMusicXML,toMIDI,timeline,validateScore,INSTRUMENTS,keyForPart} from '../src/music.js';
const n=(midi=60,den=4,extra={})=>({pitches:[pitch('C',4)],rest:false,den,dots:0,...extra});
test('instrument written / concert pitch round trips and keys',()=>{
  const s=newScore();
  for(const ins of INSTRUMENTS){const part=newPart(ins.id);const sounding=entryPitch('C',5,'0',s,part,true);assert.equal(sounding.midi,72+ins.transpose,ins.name);const written=displayPitch(sounding,part,true,s);assert.deepEqual(written,pitch('C',5),ins.name);}
  assert.equal(keyForPart(s,newPart('clarinet')),2);assert.equal(keyForPart(s,newPart('alto-sax')),3);assert.equal(keyForPart(s,newPart('horn')),1);
});
test('key accidentals apply to entry and reset correctly at barlines',()=>{
  const s=newScore();s.key=1;const p=s.parts[0];assert.equal(entryPitch('F',4,'key',s,p).midi,66);
  p.notes=[n(),n(),n(),n(),n()];p.notes[0].pitches=[pitch('F',4,0)];p.notes[4].pitches=[pitch('F',4,0)];assert.equal((toABC(s,p).abc.match(/=F/g)||[]).length,2);
});
test('crossing a bar splits notes and preserves total ticks with automatic ties',()=>{
  const s=newScore(),p=s.parts[0];p.notes=[n(60,2,{dots:1}),n(60,2)];const bars=measures(s,p,false);assert.equal(bars.length,2);assert.equal(bars[0][1].continues,true);assert.equal(bars[1][0].continued,true);assert.equal(bars.flat().reduce((a,b)=>a+b.ticks,0),4800);assert.match(toABC(s,p).abc,/C-/);assert.match(toMusicXML(s),/<tied type="start"\/>/);assert.match(toMusicXML(s),/<tied type="stop"\/>/);
});
test('triplets occupy exactly two nominal notes and reject crossing a bar',()=>{
  const s=newScore(),p=s.parts[0];p.notes=[n(60,8,{tuplet:'a'}),n(60,8,{tuplet:'a'}),n(60,8,{tuplet:'a'})];assert.equal(p.notes.reduce((a,b)=>a+noteTicks(b),0),960);validateScore(s);assert.match(toABC(s,p).abc,/\(3/);assert.match(toMusicXML(s),/<actual-notes>3/);
  p.notes.unshift(n(60,2,{dots:2}));assert.throws(()=>validateScore(s),/Triplets/);
});
test('tied notes play once; rests and staccato affect the timeline',()=>{
  const p=newPart();p.notes=[n(60,4,{tie:true}),n(),{...n(),rest:true,pitches:[]},n(60,4,{articulation:'staccato'})];const t=timeline(p);assert.equal(t.events.length,2);assert.equal(t.events[0].duration,1920*.92);assert.equal(t.events[1].start,2880);assert.equal(t.events[1].duration,432);assert.equal(t.duration,3840);
});
test('MusicXML uses written pitch and transpose; MIDI remains at concert pitch',()=>{
  const s=newScore();s.parts=[newPart('clarinet')];s.parts[0].notes=[n()];const xml=toMusicXML(s);assert.match(xml,/<step>D<\/step>/);assert.match(xml,/<chromatic>-2<\/chromatic>/);assert.match(xml,/<fifths>2<\/fifths>/);assert.match(toMusicXML(s,false),/<step>C<\/step>/);
  const midi=toMIDI(s);assert.equal(new TextDecoder().decode(midi.slice(0,4)),'MThd');assert.equal(midi[11],2);assert.ok(midi.some((v,i)=>v===0x90&&midi[i+1]===60));
});
test('all time signatures produce fully padded measures',()=>{
  const s=newScore();for(const time of ['2/4','3/4','4/4','5/4','6/8','7/8','9/8','12/8','2/2','3/8']){s.time=time;for(const bar of measures(s,s.parts[0]))assert.equal(bar.reduce((sum,q)=>sum+q.ticks,0),measureTicks(s));}
});
test('untrusted project input is validated and XML content escaped',()=>{
  const s=newScore();s.title='<script>&"';assert.match(toMusicXML(s),/&lt;script&gt;&amp;&quot;/);s.parts[0].notes=[n(60,4,{dynamic:'script'})];assert.throws(()=>validateScore(s),/Invalid note/);s.parts[0].notes=[n()];s.parts[0].notes[0].pitches[0].step='CD';assert.throws(()=>validateScore(s),/Invalid pitch/);
});
