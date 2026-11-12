// Legal chess engine, 0x88 board. No network, dependencies, or chess assets.
export const INITIAL_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
export const PIECES = Object.freeze({K:'♔',Q:'♕',R:'♖',B:'♗',N:'♘',P:'♙',k:'♚',q:'♛',r:'♜',b:'♝',n:'♞',p:'♟'});
const DIAG=[-17,-15,15,17], ORTHO=[-16,-1,1,16], KNIGHT=[-33,-31,-18,-14,14,18,31,33], KING=[...DIAG,...ORTHO];
const inBounds = i=>i>=0&&i<128&&!(i&0x88);
const color = p=>!p||p==='.'?0:p===p.toUpperCase()?1:-1;
const pos = i=>'abcdefgh'[i&7]+(8-(i>>4));
export const coordinate = pos;
export const squareIndex = s=>(8-Number(s[1]))*16+'abcdefgh'.indexOf(s[0]);
export const gridIndexToBoardIndex = index => {if(!Number.isInteger(index)||index<0||index>=64)throw new RangeError('Invalid board cell');return (index>>3)*16+(index&7);};
export function parseFen(fen=INITIAL_FEN) {
  const parts=fen.trim().split(/\s+/);
  if(parts.length<4||!/^[wb]$/.test(parts[1]))throw new Error('Invalid FEN');
  const b=Array(128).fill('.');
  const ranks=parts[0].split('/');
  if(ranks.length!==8)throw new Error('Invalid ranks');
  for(let r=0;r<8;r++){
    let file=0;
    for(const char of ranks[r]){
      if(/[1-8]/.test(char))file+=Number(char);
      else{if(!/[prnbqkPRNBQK]/.test(char)||file>=8)throw new Error('Invalid piece');b[r*16+file++]=char;}
    }
    if(file!==8)throw new Error('Invalid rank width');
  }
  if(b.filter(x=>x==='K').length!==1||b.filter(x=>x==='k').length!==1)throw new Error('Missing king');
  const castling=(parts[2].includes('K')?1:0)|(parts[2].includes('Q')?2:0)|(parts[2].includes('k')?4:0)|(parts[2].includes('q')?8:0);
  return {b,t:parts[1]==='w'?1:-1,c:castling,ep:parts[3]==='-'?-1:squareIndex(parts[3]),half:Number(parts[4]||0),full:Number(parts[5]||1)};
}
export function attacked(s,target,by){
  for(let f=0;f<128;f++){
    if(!inBounds(f)||color(s.b[f])!==by)continue;
    const p=s.b[f].toLowerCase();
    if(p==='p'){if(target===f-16*by-1||target===f-16*by+1)return true;continue;}
    const directions=p==='n'?KNIGHT:p==='b'?DIAG:p==='r'?ORTHO:KING;
    for(const d of directions){
      for(let t=f+d;inBounds(t);t+=d){
        if(t===target)return true;
        if(s.b[t]!=='.'||p==='n'||p==='k')break;
      }
    }
  }
  return false;
}
export const inCheck=(s,who=s.t)=>attacked(s,s.b.indexOf(who===1?'K':'k'),-who);
export function applyMove(s,m){
  const [f,t,promotion,flag]=m;
  const b=s.b.slice(),piece=b[f],captured=b[t];
  if(color(piece)!==s.t)throw new Error('Wrong turn');
  let c=s.c;
  b[f]='.';b[t]=promotion?(s.t===1?promotion.toUpperCase():promotion):piece;
  if(flag==='ep')b[t+16*s.t]='.';
  if(flag==='castle'){
    const rookFrom=t>f?f+3:f-4,rookTo=t>f?f+1:f-1;
    b[rookTo]=b[rookFrom];b[rookFrom]='.';
  }
  if(piece==='K')c&=~3;
  if(piece==='k')c&=~12;
  const bits={119:1,112:2,7:4,0:8};
  if(piece.toLowerCase()==='r')c&=~(bits[f]||0);
  if(captured.toLowerCase()==='r')c&=~(bits[t]||0);
  return {b,t:-s.t,c,ep:piece.toLowerCase()==='p'&&Math.abs(t-f)===32?(t+f)/2:-1,
    half:piece.toLowerCase()==='p'||captured!=='.'||flag==='ep'?0:s.half+1,
    full:s.full+(s.t===-1?1:0)};
}
export function pseudoMoves(s){
  const moves=[];
  for(let f=0;f<128;f++){
    if(!inBounds(f)||color(s.b[f])!==s.t)continue;
    const p=s.b[f].toLowerCase();
    const add=(t,flag='')=>{
      if(s.b[t].toLowerCase()==='k')return;
      if(p==='p'&&((t>>4)===0||(t>>4)===7))
        for(const q of ['q','r','b','n'])moves.push([f,t,q,flag]);
      else moves.push([f,t,'',flag]);
    };
    if(p==='p'){
      const ahead=f-16*s.t;
      if(inBounds(ahead)&&s.b[ahead]==='.'){
        add(ahead);
        const leap=ahead-16*s.t;
        if((f>>4)===(s.t===1?6:1)&&s.b[leap]==='.')add(leap);
      }
      for(const d of [-1,1]){
        const t=ahead+d;
        if(!inBounds(t))continue;
        if(color(s.b[t])===-s.t)add(t);
        else if(t===s.ep&&s.b[t]==='.'&&s.b[t+16*s.t]===(s.t===1?'p':'P'))add(t,'ep');
      }
      continue;
    }
    const directions=p==='n'?KNIGHT:p==='b'?DIAG:p==='r'?ORTHO:p==='q'?KING:KING;
    for(const d of directions)for(let t=f+d;inBounds(t);t+=d){
      if(color(s.b[t])===s.t)break;
      add(t);
      if(s.b[t]!=='.'||p==='n'||p==='k')break;
    }
    if(p==='k'&&!inCheck(s)){
      const home=s.t===1?116:4,rook=s.t===1?'R':'r',rights=s.t===1?[1,2]:[4,8];
      if(f!==home)continue;
      if((s.c&rights[0])&&s.b[f+3]===rook&&s.b[f+1]==='.'&&s.b[f+2]==='.'&&!attacked(s,f+1,-s.t)&&!attacked(s,f+2,-s.t))add(f+2,'castle');
      if((s.c&rights[1])&&s.b[f-4]===rook&&s.b[f-1]==='.'&&s.b[f-2]==='.'&&s.b[f-3]==='.'&&!attacked(s,f-1,-s.t)&&!attacked(s,f-2,-s.t))add(f-2,'castle');
    }
  }
  return moves;
}
export const legalMoves=s=>pseudoMoves(s).filter(m=>!inCheck(applyMove(s,m),s.t));
export function status(s) {
  const moves=legalMoves(s),checking=inCheck(s);
  if(!moves.length)return {done:true,text:checking?(s.t===1?'Мат. Чёрные победили.':'Мат. Белые победили.'):'Пат. Ничья.'};
  if(s.half>=100)return {done:true,text:'Ничья: 50 ходов без взятия и хода пешкой.'};
  return {done:false,text:checking?'Шах!':'Игра продолжается.'};
}
const weights={p:100,n:320,b:335,r:500,q:900,k:10000};
function score(s){
  let n=0;
  for(let i=0;i<128;i++)if(inBounds(i)){
    const p=s.b[i];
    if(p!=='.'){const v=weights[p.toLowerCase()]; n+=color(p)*v;}
  }
  return n;
}
export function chooseAiMove(s){
  const moves=legalMoves(s);if(!moves.length)return null;
  let best=-Infinity,choices=[];
  for(const move of moves){
    const next=applyMove(s,move);
    let value=s.t*score(next);
    const replies=legalMoves(next);
    if(!replies.length)value=inCheck(next)?1e8:0;
    else{
      // Two half-move search, intentionally light for mobile CPUs.
      let replyWorst=Infinity;
      for(const reply of replies){
        const v=s.t*score(applyMove(next,reply));
        if(v<replyWorst)replyWorst=v;
      }
      value=replyWorst;
    }
    value+=(Math.random()-.5)*12;
    if(value>best){best=value;choices=[move];}
    else if(Math.abs(value-best)<.01)choices.push(move);
  }
  return choices[Math.floor(Math.random()*choices.length)];
}
