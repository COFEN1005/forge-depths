export type ResourceId = 'ironOre' | 'wood' | 'slimeGel' | 'crystal' | 'ironIngot' | 'plate' | 'gear' | 'arcaneDust';
export type JobId = 'guardian' | 'warrior' | 'ranger' | 'mage' | 'priest' | 'scout';
export type DungeonId = 'forest' | 'mine' | 'wetland';
export type MachineType = 'input' | 'belt' | 'smelter' | 'assembler' | 'output' | 'generator';

export interface Adventurer {
  id: string; name: string; job: JobId; level: number; exp: number; hp: number; maxHp: number;
  atk: number; def: number; selected: boolean; equipped?: Equipment;
}
export interface Equipment {
  id: string; name: string; level: number; quality: '粗悪' | '普通' | '良質' | '優秀' | '傑作';
  multiplier: number; atk: number; rarity: 'Common' | 'Uncommon' | 'Rare' | 'Epic' | 'Legendary'; locked: boolean;
}
export interface Machine { id: string; type: MachineType; x: number; y: number; rotation: number; progress: number; }
export interface LogItem { id: number; time: number; tone: 'good' | 'warn' | 'info'; text: string; }
export interface GameState {
  schema: 1; seed: number; lastSavedAt: number; now: number; gold: number; insight: number;
  resources: Record<ResourceId, number>; adventurers: Adventurer[]; equipment: Equipment[];
  dungeon: DungeonId; expedition: { active: boolean; progress: number; duration: number; floor: number; hp: number; maxHp: number; runs: number };
  machines: Machine[]; power: { supply: number; demand: number }; factoryEnabled: boolean;
  research: { current: string | null; progress: number; duration: number; completed: string[] };
  logs: LogItem[];
}

export interface Recipe { id: string; machine: MachineType; inputs: Partial<Record<ResourceId, number>>; output: ResourceId; amount: number; seconds: number; }
