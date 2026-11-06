import { DUNGEONS, RECIPES } from './data';
import type { Equipment, GameState, ResourceId } from './model';

export function rand(state: GameState) {
  let x = state.seed | 0; x ^= x << 13; x ^= x >>> 17; x ^= x << 5; state.seed = x >>> 0;
  return state.seed / 4294967296;
}
const canPay = (s: GameState, cost: Partial<Record<ResourceId, number>>) => Object.entries(cost).every(([k, v]) => s.resources[k as ResourceId] >= (v ?? 0));
const pay = (s: GameState, cost: Partial<Record<ResourceId, number>>) => Object.entries(cost).forEach(([k, v]) => { s.resources[k as ResourceId] -= v ?? 0; });

export function rollEquipment(s: GameState, level = 1): Equipment {
  const q = rand(s), rr = rand(s);
  const quality = q < .1 ? ['粗悪', .8] as const : q < .65 ? ['普通', 1] as const : q < .9 ? ['良質', 1.15] as const : q < .99 ? ['優秀', 1.3] as const : ['傑作', 1.5] as const;
  const rarity = rr < .5 ? 'Common' : rr < .8 ? 'Uncommon' : rr < .95 ? 'Rare' : rr < .995 ? 'Epic' : 'Legendary';
  return { id: `eq-${s.seed}-${s.now}`, name: rarity === 'Legendary' ? '星喰らいの鉄剣' : '鍛造鉄剣', level, quality: quality[0], multiplier: quality[1], atk: Math.round((10 + level * 3) * quality[1]), rarity, locked: false };
}
export function addLog(s: GameState, text: string, tone: 'good' | 'warn' | 'info' = 'info') {
  s.logs.unshift({ id: s.now + s.seed, time: s.now, text, tone }); s.logs = s.logs.slice(0, 20);
}
export function step(s: GameState, seconds: number) {
  s.now += seconds * 1000;
  if (s.expedition.active) {
    s.expedition.progress += seconds;
    const partyDef = s.adventurers.filter(a => a.selected).reduce((n, a) => n + a.def, 0);
    s.expedition.hp = Math.max(1, s.expedition.hp - seconds * Math.max(.05, DUNGEONS[s.dungeon].danger * 1.8 - partyDef * .008));
    if (s.expedition.progress >= s.expedition.duration) completeExpedition(s);
  }
  if (s.factoryEnabled) runFactory(s, seconds);
  if (s.research.current) {
    s.research.progress += seconds * Math.min(1, s.power.supply / Math.max(1, s.power.demand));
    if (s.research.progress >= s.research.duration) { s.research.completed.push(s.research.current); addLog(s, `研究「${s.research.current}」が完了`, 'good'); s.research.current = null; s.research.progress = 0; }
  }
}
function completeExpedition(s: GameState) {
  const d = DUNGEONS[s.dungeon];
  Object.entries(d.loot).forEach(([id, range]) => { const [a, b] = range!; s.resources[id as ResourceId] += Math.floor(a + rand(s) * (b - a + 1)); });
  s.gold += 12 * d.danger; s.insight += d.danger; s.expedition.runs++; s.expedition.floor = (s.expedition.floor % 10) + 1;
  s.adventurers.filter(a => a.selected).forEach(a => { a.exp += 22 * d.danger; const need = Math.floor(100 * a.level ** 1.5); if (a.exp >= need && a.level < 100) { a.exp -= need; a.level++; a.maxHp = Math.round(a.maxHp * 1.04); a.hp = a.maxHp; a.atk = Math.round(a.atk * 1.03); } });
  if (rand(s) < .16) { const eq = rollEquipment(s, Math.max(1, d.danger * 3)); s.equipment.unshift(eq); addLog(s, `${d.name}から ${eq.quality} ${eq.name} を持ち帰った`, 'good'); }
  addLog(s, `${d.name}の周回完了。素材を倉庫へ納品`, 'good'); s.expedition.progress = 0; s.expedition.hp = s.expedition.maxHp;
}
function runFactory(s: GameState, seconds: number) {
  const powerRate = Math.min(1, s.power.supply / Math.max(1, s.power.demand));
  for (const m of s.machines) {
    const recipe = RECIPES.find(r => r.machine === m.type); if (!recipe || !canPay(s, recipe.inputs)) { m.progress = 0; continue; }
    // Keep a small ingot reserve so the player can always complete the first sword loop.
    if (m.type === 'assembler' && s.resources.ironIngot < 8) { m.progress = 0; continue; }
    m.progress += seconds * powerRate;
    while (m.progress >= recipe.seconds && canPay(s, recipe.inputs)) { pay(s, recipe.inputs); s.resources[recipe.output] += recipe.amount; m.progress -= recipe.seconds; }
  }
}
export function simulateOffline(s: GameState, seconds: number) {
  const capped = Math.min(seconds, 86400); const before = { ...s.resources }; let left = capped;
  while (left > 0) { const chunk = Math.min(5, left); step(s, chunk); left -= chunk; }
  const gained = Object.entries(s.resources).filter(([k, v]) => v > before[k as ResourceId]).map(([k, v]) => `${k} +${v - before[k as ResourceId]}`).slice(0, 3).join(' / ');
  if (capped > 60) addLog(s, `オフライン進行 ${Math.floor(capped / 60)}分：${gained || '変化なし'}`, 'good');
}
