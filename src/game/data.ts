import type { DungeonId, JobId, Recipe, ResourceId } from './model';

export const RESOURCES: Record<ResourceId, { name: string; icon: string }> = {
  ironOre: { name: '鉄鉱石', icon: '◆' }, wood: { name: '木材', icon: '▰' }, slimeGel: { name: '魔物ゲル', icon: '●' },
  crystal: { name: '青晶石', icon: '✦' }, ironIngot: { name: '鉄インゴット', icon: '▱' }, plate: { name: '鉄板', icon: '▣' },
  gear: { name: '歯車', icon: '⚙' }, arcaneDust: { name: '魔導粉', icon: '⁕' }
};
export const JOBS: Record<JobId, { name: string; icon: string }> = {
  guardian: { name: 'ガーディアン', icon: '♜' }, warrior: { name: 'ウォリアー', icon: '⚔' }, ranger: { name: 'レンジャー', icon: '➶' },
  mage: { name: 'メイジ', icon: '✧' }, priest: { name: 'プリースト', icon: '✚' }, scout: { name: 'スカウト', icon: '⌖' }
};
export const DUNGEONS: Record<DungeonId, { name: string; subtitle: string; seconds: number; danger: number; loot: Partial<Record<ResourceId, [number, number]>> }> = {
  forest: { name: '始まりの森', subtitle: '苔むす獣道', seconds: 75, danger: 1, loot: { wood: [15, 25], slimeGel: [4, 10], ironOre: [3, 6] } },
  mine: { name: '廃坑', subtitle: '第七採掘区', seconds: 100, danger: 2, loot: { ironOre: [20, 30], crystal: [2, 5], wood: [2, 5] } },
  wetland: { name: '湿地帯', subtitle: '瘴気の水路', seconds: 130, danger: 3, loot: { slimeGel: [12, 20], crystal: [5, 9], arcaneDust: [1, 3] } }
};
export const RECIPES: Recipe[] = [
  { id: 'smelt', machine: 'smelter', inputs: { ironOre: 2 }, output: 'ironIngot', amount: 1, seconds: 4 },
  { id: 'press', machine: 'assembler', inputs: { ironIngot: 2 }, output: 'plate', amount: 1, seconds: 7 },
  { id: 'gear', machine: 'assembler', inputs: { ironIngot: 2, wood: 1 }, output: 'gear', amount: 1, seconds: 9 }
];
