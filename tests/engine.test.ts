import { describe, expect, it } from 'vitest';
import { rollEquipment, simulateOffline, step } from '../src/game/engine';
import type { GameState } from '../src/game/model';

function state(): GameState { const now=1; return {schema:1,seed:12345,lastSavedAt:now,now,gold:0,insight:0,resources:{ironOre:20,wood:10,slimeGel:0,crystal:0,ironIngot:0,plate:0,gear:0,arcaneDust:0},adventurers:[],equipment:[],dungeon:'forest',expedition:{active:false,progress:0,duration:75,floor:1,hp:100,maxHp:100,runs:0},machines:[{id:'s',type:'smelter',x:0,y:0,rotation:0,progress:0}],power:{supply:10,demand:6},factoryEnabled:true,research:{current:null,progress:0,duration:90,completed:[]},logs:[]}; }

describe('simulation',()=>{
  it('is deterministic for the same PRNG state',()=>{const a=state(),b=state();expect(rollEquipment(a)).toEqual(rollEquipment(b));expect(a.seed).toBe(b.seed)});
  it('conserves recipe inputs and outputs',()=>{const s=state();step(s,8);expect(s.resources.ironOre).toBe(16);expect(s.resources.ironIngot).toBe(2)});
  it('does not simulate more than 24 offline hours',()=>{const a=state(),b=state();simulateOffline(a,86400);simulateOffline(b,86400*3);expect(a.resources).toEqual(b.resources)});
});
