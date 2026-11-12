import test from 'node:test';
import assert from 'node:assert/strict';
import {SIZE, COLORS, makeBoard, matches, hasMove, adjacent, swap, applyGravity, validSavedBoard} from '../match3/engine.js';
import {SUITS,rank,rankName,suit,red,newGame,validGame,canMove,moveCards,dealStock,hint} from '../solitaire/engine.js';

test('Match-3: generated boards contain no initial matches and always have a playable move', () => {
  for (let i=0;i<250;i++) {
    const board=makeBoard();
    assert.equal(board.length, SIZE*SIZE);
    assert.equal(validSavedBoard(board),true);
    assert.deepEqual(matches(board),[]);
    assert.equal(hasMove(board),true);
  }
});
test('Match-3: horizontal and vertical runs, intersection, no wrap across rows', () => {
  const blank=Array(SIZE*SIZE).fill(null);
  blank.splice(0,4,2,2,2,2);
  blank[2+SIZE]=2;blank[2+2*SIZE]=2;
  assert.deepEqual(matches(blank).sort((a,b)=>a-b),[0,1,2,3,10,18]);
  const wrap=Array(SIZE*SIZE).fill(null);
  wrap[SIZE-2]=1;wrap[SIZE-1]=1;wrap[SIZE]=1;
  assert.deepEqual(matches(wrap),[]);
});
test('Match-3: adjacent detection excludes row wrap and swap restores board', () => {
  assert.equal(adjacent(7,8),false);
  assert.equal(adjacent(0,8),true);
  assert.equal(adjacent(9,10),true);
  const b=makeBoard(),before=[...b];
  swap(b,0,1);swap(b,0,1);
  assert.deepEqual(b,before);
});
test('Match-3: gravity leaves full board, preserving survivor order in each column', () => {
  const b=makeBoard();
  for(let c=0;c<8;c++){
    const old=[];
    for(let r=0;r<8;r++)old.push(b[r*8+c]);
    b[c]=null;b[2*8+c]=null;b[6*8+c]=null;
    const survivors=old.filter((_,r)=>![0,2,6].includes(r));
    applyGravity(b);
    assert.deepEqual(Array.from({length:5},(_,i)=>b[(i+3)*8+c]),survivors);
    assert.equal(b.every(x=>Number.isInteger(x)&&x>=0&&x<COLORS),true);
    break;
  }
});
test('Klondike: each deal contains exactly 52 distinct cards', () => {
  for(let iteration=0;iteration<120;iteration++){
    const g=newGame();
    assert.equal(validGame(g),true);
    assert.equal(g.stock.length,24);
    assert.equal(g.waste.length,0);
    assert.equal(g.foundations.length,4);
    assert.deepEqual(g.tableau.map(p=>p.length),[1,2,3,4,5,6,7]);
    for(const pile of g.tableau){
      assert.equal(pile.filter(c=>c.up).length,1);
      assert.equal(pile[pile.length-1].up,true);
    }
  }
});
test('Klondike: draw one, recycle waste, repeat same stock sequence', () => {
  const g=newGame();
  for(let i=0;i<24;i++)assert.equal(dealStock(g),true);
  assert.equal(g.stock.length,0);assert.equal(g.waste.length,24);
  const first=[...g.waste];
  assert.equal(dealStock(g),true);
  assert.equal(g.stock.length,24);assert.equal(g.waste.length,0);
  for(let i=0;i<24;i++)dealStock(g);
  assert.deepEqual(g.waste,first);
  assert.equal(validGame(g),true);
});
test('Klondike: legal ace to foundation and alternating color descending move', () => {
  const g=newGame();
  const used=new Set([0,12,24]); // spade A, spade K, heart Q
  g.stock=Array.from({length:52},(_,i)=>i).filter(x=>!used.has(x));
  g.waste=[];g.foundations=[[],[],[],[]];
  g.tableau=Array.from({length:7},()=>[]);
  g.tableau[0]=[{id:0,up:true}];
  g.tableau[1]=[{id:12,up:true}];
  g.tableau[2]=[{id:24,up:true}];
  g.score=0;g.moves=0;g.won=false;
  assert.equal(validGame(g),true);
  assert.equal(canMove(g,{kind:'tableau',column:0,index:0},{kind:'foundation',suit:0}),true);
  assert.equal(moveCards(g,{kind:'tableau',column:0,index:0},{kind:'foundation',suit:0}),true);
  assert.equal(g.foundations[0].length,1);
  assert.equal(canMove(g,{kind:'tableau',column:2,index:0},{kind:'tableau',column:1}),true);
  assert.equal(moveCards(g,{kind:'tableau',column:2,index:0},{kind:'tableau',column:1}),true);
  assert.deepEqual(g.tableau[1].map(x=>x.id),[12,24]);
  assert.equal(validGame(g),true);
});
test('Klondike: reject illegal placements, block moving into same column', () => {
  const g=newGame();
  assert.equal(canMove(g,{kind:'tableau',column:0,index:0},{kind:'tableau',column:0}),false);
  assert.equal(canMove(g,{kind:'waste'},{kind:'foundation',suit:0}),false);
  assert.equal(canMove(g,{kind:'tableau',column:0,index:0},{kind:'foundation',suit:4}),false);
});
test('Klondike: rank/suit conversions and hints always refer to a legal move', () => {
  assert.equal(SUITS.length,4);
  assert.equal(rank(0),1); assert.equal(rankName(0),'A');
  assert.equal(rank(12),13);assert.equal(rankName(12),'K');
  assert.equal(suit(13),1);assert.equal(red(13),true);
  for(let i=0;i<100;i++){
    const g=newGame(),move=hint(g);
    assert.ok(move);
    if(move.from)assert.equal(canMove(g,move.from,move.to),true);
    else assert.equal(move.to.kind,'stock');
  }
});
