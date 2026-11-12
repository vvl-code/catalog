import test from 'node:test';
import assert from 'node:assert/strict';
import {PIECES, INITIAL_FEN, parseFen, legalMoves, applyMove, squareIndex, gridIndexToBoardIndex, status, chooseAiMove} from '../arcade/chess.js';

const uci = move => move ? ([move[0],move[1]].map(i=>'abcdefgh'[i&7]+(8-(i>>4))).join('')+move[2]) : '';
const perft=(state,depth)=>{
  if(depth===0)return 1;
  let nodes=0;
  for(const move of legalMoves(state))nodes+=perft(applyMove(state,move),depth-1);
  return nodes;
};

test('chess: valid starting board, queens on d-files and White at bottom',()=>{
  const state=parseFen();
  assert.equal(state.b[squareIndex('d1')],'Q');
  assert.equal(state.b[squareIndex('d8')],'q');
  assert.equal(state.b[squareIndex('e1')],'K');
  assert.equal(state.b[squareIndex('e8')],'k');
  assert.equal(state.b[gridIndexToBoardIndex(59)],'Q');
  assert.equal(state.b[gridIndexToBoardIndex(3)],'q');
  assert.equal(state.b[gridIndexToBoardIndex(60)],'K');
  assert.equal(state.b[gridIndexToBoardIndex(4)],'k');
  assert.equal(gridIndexToBoardIndex(56),112); // a1
  assert.equal(gridIndexToBoardIndex(63),119); // h1
  assert.equal(PIECES.q,'♛');
  assert.throws(()=>gridIndexToBoardIndex(64),RangeError);
});

test('chess: opening perft depths 1, 2 and 3',()=>{
  const state=parseFen(INITIAL_FEN);
  assert.equal(perft(state,1),20);
  assert.equal(perft(state,2),400);
  assert.equal(perft(state,3),8902);
});

test('chess: castling rights and move application',()=>{
  const state=parseFen('r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1');
  const moves=legalMoves(state),notations=moves.map(uci);
  assert.equal(notations.includes('e1g1'),true);
  assert.equal(notations.includes('e1c1'),true);
  const castle=moves.find(m=>uci(m)==='e1g1');
  const result=applyMove(state,castle);
  assert.equal(result.b[squareIndex('g1')],'K');
  assert.equal(result.b[squareIndex('f1')],'R');
  assert.equal(result.b[squareIndex('h1')],'.');
  assert.equal(result.c&3,0);
});

test('chess: en-passant capture removes pawn on passed square',()=>{
  const state=parseFen('4k3/8/8/3pP3/8/8/8/4K3 w - d6 0 1');
  const ep=legalMoves(state).find(m=>uci(m)==='e5d6');
  assert.ok(ep);
  const after=applyMove(state,ep);
  assert.equal(after.b[squareIndex('d6')],'P');
  assert.equal(after.b[squareIndex('d5')],'.');
  assert.equal(after.ep,-1);
});

test('chess: four promotion choices and underpromotion',()=>{
  const state=parseFen('4k3/P7/8/8/8/8/8/4K3 w - - 0 1');
  const moves=legalMoves(state).filter(m=>uci(m).startsWith('a7a8'));
  assert.equal(moves.length,4);
  assert.deepEqual(new Set(moves.map(m=>m[2])),new Set(['q','r','b','n']));
  const under=applyMove(state,moves.find(m=>m[2]==='n'));
  assert.equal(under.b[squareIndex('a8')],'N');
});

test('chess: Fool’s Mate is recognized as checkmate',()=>{
  let s=parseFen();
  for(const move of ['f2f3','e7e5','g2g4','d8h4']){
    const found=legalMoves(s).find(m=>uci(m)===move);
    assert.ok(found,move+' should be legal');
    s=applyMove(s,found);
  }
  assert.equal(status(s).done,true);
  assert.match(status(s).text,/Мат/);
});

test('chess: computer always chooses an available legal move',()=>{
  const state=parseFen();
  const whiteOpening=legalMoves(state).find(m=>uci(m)==='e2e4');
  const after=applyMove(state,whiteOpening);
  const move=chooseAiMove(after);
  assert.ok(move);
  assert.equal(legalMoves(after).some(m=>uci(m)===uci(move)),true);
});
