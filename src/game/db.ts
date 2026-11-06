import Dexie, { type EntityTable } from 'dexie';
import type { GameState } from './model';

interface SaveRecord { id: 'main'; state: GameState; }
export const db = new Dexie('forge-depths') as Dexie & { saves: EntityTable<SaveRecord, 'id'> };
db.version(1).stores({ saves: 'id' });
export async function saveGame(state: GameState) { await db.saves.put({ id: 'main', state: structuredClone(state) }); }
export async function loadGame() { return (await db.saves.get('main'))?.state; }
