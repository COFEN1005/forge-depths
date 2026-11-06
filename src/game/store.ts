import { create } from 'zustand';
import { DUNGEONS } from './data';
import { addLog, rollEquipment, simulateOffline, step } from './engine';
import { db, loadGame, saveGame } from './db';
import type { Adventurer, DungeonId, GameState, Machine, MachineType, ResourceId } from './model';

const heroes: Adventurer[] = [
  ['a1','ブラム','guardian',300,20,30], ['a2','カイ','warrior',220,35,18], ['a3','リネット','ranger',160,40,10],
  ['a4','ミラ','mage',140,8,8], ['a5','セラ','priest',170,8,12], ['a6','ニコ','scout',170,32,12]
].map(([id,name,job,hp,atk,def], i) => ({ id, name, job, level:1, exp:0, hp, maxHp:hp, atk, def, selected:i<4 })) as Adventurer[];
const machines: Machine[] = [
  { id:'m1',type:'input',x:2,y:6,rotation:0,progress:0 }, { id:'m2',type:'belt',x:4,y:6,rotation:0,progress:0 },
  { id:'m3',type:'belt',x:6,y:6,rotation:0,progress:0 }, { id:'m4',type:'smelter',x:8,y:5,rotation:0,progress:0 },
  { id:'m5',type:'belt',x:12,y:6,rotation:0,progress:0 }, { id:'m6',type:'assembler',x:14,y:5,rotation:0,progress:0 },
  { id:'m7',type:'output',x:18,y:6,rotation:0,progress:0 }, { id:'m8',type:'generator',x:10,y:11,rotation:0,progress:0 }
];
function initial(): GameState {
  const now = Date.now(); return { schema:1, seed:0x1a2b3c4d, lastSavedAt:now, now, gold:80, insight:0,
    resources:{ ironOre:14,wood:12,slimeGel:4,crystal:0,ironIngot:0,plate:0,gear:0,arcaneDust:0 }, adventurers:heroes, equipment:[], dungeon:'forest',
    expedition:{active:false,progress:0,duration:DUNGEONS.forest.seconds,floor:1,hp:100,maxHp:100,runs:0}, machines, power:{supply:40,demand:18}, factoryEnabled:true,
    research:{current:null,progress:0,duration:90,completed:[]}, logs:[{id:1,time:now,tone:'info',text:'工房が再稼働しました。遠征隊の帰還を待っています。'}] };
}

function cloneState(s: GameState): GameState {
  return structuredClone({
    schema:s.schema,seed:s.seed,lastSavedAt:s.lastSavedAt,now:s.now,gold:s.gold,insight:s.insight,
    resources:s.resources,adventurers:s.adventurers,equipment:s.equipment,dungeon:s.dungeon,
    expedition:s.expedition,machines:s.machines,power:s.power,factoryEnabled:s.factoryEnabled,
    research:s.research,logs:s.logs
  });
}

interface Actions {
  hydrate(): Promise<void>; tick(seconds: number): void; startExpedition(): void; pauseExpedition(): void; setDungeon(id: DungeonId): void;
  toggleHero(id: string): void; placeMachine(type: MachineType, x: number, y: number): void; removeMachine(id:string):void;
  toggleFactory(): void; craftSword(): void; equip(id:string): void; toggleLock(id:string):void; dismantle(id:string):void;
  startResearch(name:string):void; save(): Promise<void>; hardReset():Promise<void>;
}
export const useGame = create<GameState & Actions>((set, get) => ({
  ...initial(),
  hydrate: async () => { const saved = await loadGame(); if (!saved) return; const elapsed=(Date.now()-saved.lastSavedAt)/1000; simulateOffline(saved,elapsed); saved.lastSavedAt=Date.now(); set(saved); },
  tick: seconds => set(s => { const n=cloneState(s); step(n,seconds); return n; }),
  startExpedition: () => set(s => { const n=cloneState(s); if(n.adventurers.filter(a=>a.selected).length!==4){addLog(n,'遠征隊は4人必要です','warn');return n;} n.expedition.active=true;addLog(n,`${DUNGEONS[n.dungeon].name}へ出撃`);return n; }),
  pauseExpedition: () => set(s=>({expedition:{...s.expedition,active:false}})),
  setDungeon: id => set(s=>({dungeon:id,expedition:{...s.expedition,duration:DUNGEONS[id].seconds,progress:0}})),
  toggleHero: id => set(s=>{ const n=cloneState(s); const h=n.adventurers.find(a=>a.id===id)!; if(!h.selected&&n.adventurers.filter(a=>a.selected).length>=4){addLog(n,'編成は最大4人です','warn');return n;} h.selected=!h.selected;return n;}),
  placeMachine:(type,x,y)=>set(s=>{const n=cloneState(s);if(n.machines.some(m=>Math.abs(m.x-x)<2&&Math.abs(m.y-y)<2)){addLog(n,'その場所には配置できません','warn');return n;}n.machines.push({id:`m-${n.now}-${n.seed}`,type,x,y,rotation:0,progress:0});n.power.demand+=type==='smelter'?6:type==='assembler'?8:0;return n;}),
  removeMachine:id=>set(s=>{const m=s.machines.find(x=>x.id===id);return {machines:s.machines.filter(x=>x.id!==id),power:{...s.power,demand:Math.max(0,s.power.demand-(m?.type==='smelter'?6:m?.type==='assembler'?8:0))}}}),
  toggleFactory:()=>set(s=>({factoryEnabled:!s.factoryEnabled})),
  craftSword:()=>set(s=>{const n=cloneState(s);if(n.resources.ironIngot<4||n.resources.wood<2){addLog(n,'鉄インゴット4・木材2が必要です','warn');return n;}n.resources.ironIngot-=4;n.resources.wood-=2;const eq=rollEquipment(n,Math.max(1,Math.floor(n.expedition.runs/3)+1));n.equipment.unshift(eq);addLog(n,`${eq.quality} ${eq.name} を製造`,'good');return n;}),
  equip:id=>set(s=>{const n=cloneState(s);const eq=n.equipment.find(e=>e.id===id);const hero=n.adventurers.find(a=>a.selected);if(eq&&hero){hero.equipped=eq;addLog(n,`${hero.name}が${eq.name}を装備`,'good');}return n;}),
  toggleLock:id=>set(s=>({equipment:s.equipment.map(e=>e.id===id?{...e,locked:!e.locked}:e)})),
  dismantle:id=>set(s=>{const e=s.equipment.find(x=>x.id===id);if(!e||e.locked)return {};return {equipment:s.equipment.filter(x=>x.id!==id),resources:{...s.resources,ironIngot:s.resources.ironIngot+2}};}),
  startResearch:name=>set(s=>{if(s.research.current||s.insight<2)return {};return {insight:s.insight-2,research:{...s.research,current:name,progress:0}};}),
  save:async()=>{const s=get();s.lastSavedAt=Date.now();await saveGame(cloneState(s));},
  hardReset:async()=>{await db.saves.clear();set(initial());}
}));

export const resourceOrder: ResourceId[]=['ironOre','ironIngot','wood','slimeGel','crystal','plate','gear','arcaneDust'];
