import { useEffect, useMemo, useState } from 'react';
import { DUNGEONS, JOBS, RESOURCES } from './game/data';
import { resourceOrder, useGame } from './game/store';
import type { MachineType } from './game/model';

const machineMeta: Record<MachineType,{name:string;icon:string;size:number}>={
  input:{name:'搬入口',icon:'⇥',size:2},belt:{name:'ベルト',icon:'»',size:1},smelter:{name:'精錬炉',icon:'♨',size:2},
  assembler:{name:'組立機',icon:'⚒',size:3},output:{name:'搬出口',icon:'⇤',size:2},generator:{name:'発電機',icon:'ϟ',size:2}
};
type Tab='expedition'|'factory'|'guild'|'research';
function fmt(n:number){return n>=1000?`${(n/1000).toFixed(1)}k`:Math.floor(n).toString()}

export default function App(){
  const g=useGame(); const [tab,setTab]=useState<Tab>('expedition'); const [speed,setSpeed]=useState(1); const [offline,setOffline]=useState<string|null>(null);
  useEffect(()=>{void g.hydrate().then(()=>{const logs=useGame.getState().logs;if(logs[0]?.text.startsWith('オフライン'))setOffline(logs[0].text)});},[]);
  useEffect(()=>{const id=setInterval(()=>g.tick(.25*speed),250);return()=>clearInterval(id)},[speed]);
  useEffect(()=>{const id=setInterval(()=>void g.save(),30000);const save=()=>void useGame.getState().save();addEventListener('beforeunload',save);return()=>{clearInterval(id);removeEventListener('beforeunload',save)}},[]);
  const powerRate=Math.min(100,Math.round(g.power.supply/Math.max(1,g.power.demand)*100));
  return <div className="app-shell">
    <header className="topbar">
      <div className="brand"><span className="brand-rune">F</span><div><h1>FORGE DEPTHS</h1><small>深淵工房 / GUILD 07</small></div></div>
      <div className="top-stats"><span><i className="gold">◆</i>{fmt(g.gold)}<small>コイン</small></span><span><i className="blue">✦</i>{g.insight}<small>知見</small></span><span><i className={powerRate<80?'red':'green'}>ϟ</i>{g.power.supply}/{g.power.demand}kW<small>電力 {powerRate}%</small></span></div>
      <div className="controls"><button onClick={()=>setSpeed(speed===1?2:speed===2?4:1)}>時間 ×{speed}</button><button title="セーブ" onClick={()=>void g.save()}>保存</button></div>
    </header>
    <div className="resource-rail">{resourceOrder.map(id=><div key={id}><b>{RESOURCES[id].icon}</b><span>{RESOURCES[id].name}</span><strong>{fmt(g.resources[id])}</strong></div>)}</div>
    <main>
      <aside className="nav">
        {([['expedition','遠征','⚔'],['factory','工場','⚙'],['guild','ギルド','♜'],['research','研究','⌘']] as const).map(([id,label,icon])=><button className={tab===id?'active':''} onClick={()=>setTab(id)} key={id}><i>{icon}</i>{label}{id==='guild'&&g.equipment.length>0?<em>{g.equipment.length}</em>:null}</button>)}
        <div className="nav-status"><span className="pulse"/> SIMULATION<br/>ONLINE</div>
      </aside>
      <section className="content">
        {offline&&<div className="offline"><span>☾</span><div><b>おかえりなさい、工房長</b><p>{offline}</p></div><button onClick={()=>setOffline(null)}>受け取る</button></div>}
        {tab==='expedition'&&<Expedition/>}{tab==='factory'&&<Factory/>}{tab==='guild'&&<Guild/>}{tab==='research'&&<Research/>}
      </section>
      <aside className="activity"><h3>稼働記録 <span>LIVE</span></h3>{g.logs.slice(0,8).map(l=><div className={`log ${l.tone}`} key={l.id}><time>{new Date(l.time).toLocaleTimeString('ja-JP',{hour:'2-digit',minute:'2-digit'})}</time><p>{l.text}</p></div>)}</aside>
    </main>
  </div>
}

function Expedition(){const g=useGame();const d=DUNGEONS[g.dungeon];const party=g.adventurers.filter(a=>a.selected);const pct=Math.min(100,g.expedition.progress/g.expedition.duration*100);return <>
  <div className="section-title"><div><small>EXPEDITION CONTROL</small><h2>遠征指令室</h2></div><div className="party-summary">編成 <b>{party.length}/4</b>　周回 <b>{g.expedition.runs}</b></div></div>
  <div className="expedition-layout">
    <div className="dungeon-card"><div className="dungeon-art"><span>DEPTH {g.expedition.floor.toString().padStart(2,'0')}</span><div><small>{d.subtitle}</small><h3>{d.name}</h3></div></div>
      <div className="dungeon-select">{Object.entries(DUNGEONS).map(([id,x],i)=><button key={id} disabled={i>0&&g.expedition.runs<i*2} className={g.dungeon===id?'active':''} onClick={()=>g.setDungeon(id as keyof typeof DUNGEONS)}><span>{i>0&&g.expedition.runs<i*2?'🔒':`0${i+1}`}</span><div><b>{x.name}</b><small>危険度 {'◆'.repeat(x.danger)}</small></div></button>)}</div>
    </div>
    <div className="run-card"><div className="run-head"><span className={g.expedition.active?'pulse':''}/><div><small>{g.expedition.active?'AUTO EXPLORING':'STANDBY'}</small><b>{g.expedition.active?'自動探索中':'出撃待機'}</b></div><strong>{Math.ceil(g.expedition.duration-g.expedition.progress)}s</strong></div>
      <div className="battle-scene"><div className="heroes">{party.map((a,i)=><span key={a.id} style={{left:12+i*11+'%',bottom:15+(i%2)*14+'%'}}>{JOBS[a.job].icon}</span>)}</div><div className="enemy">♞<i>{Math.round(40+g.expedition.floor*8)}%</i></div><div className="scanline"/></div>
      <div className="bars"><label>遠征進行 <b>{Math.floor(pct)}%</b></label><progress value={pct} max="100"/><label>隊列HP <b>{Math.floor(g.expedition.hp)}%</b></label><progress className="hp" value={g.expedition.hp} max={g.expedition.maxHp}/></div>
      <button className={`primary ${g.expedition.active?'danger':''}`} onClick={g.expedition.active?g.pauseExpedition:g.startExpedition}>{g.expedition.active?'■ 遠征を中断':'▶ 自動周回を開始'}</button>
    </div>
  </div>
  <h3 className="subhead">遠征隊編成 <small>クリックで入れ替え</small></h3><div className="hero-grid">{g.adventurers.map(a=><button onClick={()=>g.toggleHero(a.id)} className={`hero-card ${a.selected?'selected':''}`} key={a.id}><div className="portrait">{JOBS[a.job].icon}<i>Lv.{a.level}</i></div><div><b>{a.name}</b><small>{JOBS[a.job].name}</small><span>ATK {a.atk}　DEF {a.def}</span></div>{a.selected&&<em>{party.findIndex(x=>x.id===a.id)+1}</em>}</button>)}</div>
  </>}

function Factory(){const g=useGame();const [tool,setTool]=useState<MachineType>('belt');const [selected,setSelected]=useState<string|null>(null);const cells=useMemo(()=>Array.from({length:12*20}),[]);return <>
  <div className="section-title"><div><small>FACTORY FLOOR / 24×24</small><h2>第一製造区画</h2></div><button className={g.factoryEnabled?'toggle on':'toggle'} onClick={g.toggleFactory}><i/>{g.factoryEnabled?'稼働中':'停止中'}</button></div>
  <div className="factory-layout"><div className="toolbox"><h3>建設メニュー</h3>{Object.entries(machineMeta).map(([id,m])=><button className={tool===id?'active':''} onClick={()=>setTool(id as MachineType)} key={id}><i>{m.icon}</i><span>{m.name}<small>{m.size}×{m.size}</small></span></button>)}<div className="powerbox"><small>POWER NETWORK</small><b>{g.power.supply} kW</b><progress value={g.power.demand} max={g.power.supply}/><span>需要 {g.power.demand} kW</span></div></div>
    <div className="factory-board">{cells.map((_,i)=>{const x=i%20,y=Math.floor(i/20);return <button aria-label={`${x},${y}`} key={i} onClick={()=>g.placeMachine(tool,x,y)}/>})}{g.machines.map(m=><div onClick={e=>{e.stopPropagation();setSelected(selected===m.id?null:m.id)}} className={`machine ${m.type} ${selected===m.id?'selected':''}`} key={m.id} style={{left:`${m.x*5}%`,top:`${m.y*8.333}%`}}><i>{machineMeta[m.type].icon}</i><small>{machineMeta[m.type].name}</small>{m.type==='belt'&&<b>››</b>}</div>)}<div className="flow-label">RAW MATERIAL FLOW →</div></div>
    {selected&&<div className="machine-panel"><small>SELECTED UNIT</small><h3>{machineMeta[g.machines.find(m=>m.id===selected)?.type||'belt'].name}</h3><p>進捗</p><progress value={g.machines.find(m=>m.id===selected)?.progress||0} max="9"/><button onClick={()=>{g.removeMachine(selected);setSelected(null)}}>設備を撤去</button></div>}</div>
  <div className="production-strip"><div><i>♨</i><span>精錬炉<small>鉄鉱石 2 → インゴット 1</small></span><b>{g.factoryEnabled?'稼働':'停止'}</b></div><div><i>⚒</i><span>組立機<small>インゴット 2 + 木材 1 → 部品</small></span><b>{g.factoryEnabled?'稼働':'停止'}</b></div><div className="tip">設備を選んでグリッドへ配置。詰まりと電力需要を見ながらラインを拡張しよう。</div></div>
  </>}

function Guild(){const g=useGame();return <><div className="section-title"><div><small>GUILD ARMORY</small><h2>装備工房</h2></div><button className="primary compact" onClick={g.craftSword}>⚒ 鉄の剣を製造</button></div>
  <div className="recipe-banner"><div><b>鍛造鉄剣</b><small>武器 / 必要素材</small></div><span>▱ 4　＋　▰ 2</span><p>品質とレアリティは製造ごとに抽選されます。</p></div>
  <div className="equipment-grid">{g.equipment.length===0?<div className="empty"><span>⚔</span><h3>装備庫は空です</h3><p>鉄インゴットを精錬して、最初の剣を製造しましょう。</p></div>:g.equipment.map(e=><div className={`equipment ${e.rarity.toLowerCase()}`} key={e.id}><button className="lock" onClick={()=>g.toggleLock(e.id)}>{e.locked?'◆':'◇'}</button><div className="sword">⚔</div><small>{e.rarity} / Lv.{e.level}</small><h3>{e.name}</h3><b>{e.quality} <i>×{e.multiplier.toFixed(2)}</i></b><p>攻撃力 <strong>+{e.atk}</strong></p><div><button onClick={()=>g.equip(e.id)}>装備</button><button disabled={e.locked} onClick={()=>g.dismantle(e.id)}>解体</button></div></div>)}</div></>}

function Research(){const g=useGame();const items=[['高温精錬','精錬速度 +20%'],['荷役術式','搬入口の速度 +1/s'],['遠征隊枠 I','第2パーティーを解放'],['品質保証','良質以上の確率 +5%']];return <><div className="section-title"><div><small>ARCANE RESEARCH</small><h2>研究施設</h2></div><div className="party-summary">保有知見 <b>{g.insight}</b></div></div>
  {g.research.current&&<div className="research-active"><div><small>RESEARCHING</small><h3>{g.research.current}</h3></div><progress value={g.research.progress} max={g.research.duration}/><b>{Math.floor(g.research.progress/g.research.duration*100)}%</b></div>}
  <div className="research-grid">{items.map(([name,desc],i)=>{const done=g.research.completed.includes(name);return <div className={done?'done':''} key={name}><i>{['♨','⇥','⚑','✦'][i]}</i><small>分野 {i%2?'冒険':'生産'}</small><h3>{name}</h3><p>{desc}</p><button disabled={done||!!g.research.current||g.insight<2} onClick={()=>g.startResearch(name)}>{done?'完了済み':'知見 2 で研究'}</button></div>})}</div></>}
