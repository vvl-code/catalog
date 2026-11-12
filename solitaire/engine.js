export const SUITS = ['♠', '♥', '♣', '♦'];
export const SUIT_NAMES = ['пики', 'черви', 'трефы', 'бубны'];
export const rank = id => id % 13 + 1;
export const suit = id => Math.floor(id / 13);
export const red = id => suit(id) === 1 || suit(id) === 3;
export const rankName = id => ({1:'A',11:'J',12:'Q',13:'K'}[rank(id)] || String(rank(id)));
export function newGame() {
  const deck = Array.from({length:52}, (_,i)=>i);
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  const tableau = Array.from({length:7},()=>[]);
  for (let c=0;c<7;c++) for(let i=0;i<=c;i++) tableau[c].push({id:deck.pop(),up:i===c});
  return {stock:deck,waste:[],foundations:Array.from({length:4},()=>[]),tableau,score:0,moves:0,won:false};
}
const validId = id => Number.isInteger(id) && id >= 0 && id < 52;
export function validGame(g) {
  if (!g || typeof g !== 'object' || !Array.isArray(g.stock) || !Array.isArray(g.waste) ||
      !Array.isArray(g.foundations) || g.foundations.length!==4 ||
      !Array.isArray(g.tableau) || g.tableau.length!==7 ||
      !Number.isSafeInteger(g.score) || g.score<0 || !Number.isSafeInteger(g.moves) || g.moves<0 ||
      typeof g.won !== 'boolean') return false;
  const all=[...g.stock,...g.waste];
  for(let s=0;s<4;s++){
    const foundation=g.foundations[s];
    if(!Array.isArray(foundation) || foundation.length>13) return false;
    for(let i=0;i<foundation.length;i++){
      if(foundation[i]!==s*13+i) return false;
      all.push(foundation[i]);
    }
  }
  for(const pile of g.tableau){
    if(!Array.isArray(pile)) return false;
    let faceup=false, last=null;
    for(const card of pile){
      if(!card || !validId(card.id) || typeof card.up!=='boolean') return false;
      if(card.up){
        if(last!==null && (red(last)===red(card.id) || rank(last)!==rank(card.id)+1)) return false;
        faceup=true; last=card.id;
      }else{
        if(faceup)return false;
      }
      all.push(card.id);
    }
    if(pile.length && !pile[pile.length-1].up) return false;
  }
  return all.length===52 && all.every(validId) && new Set(all).size===52 &&
    g.won === g.foundations.every(p=>p.length===13);
}
export function selectionCards(g, from) {
  if(!from) return [];
  if(from.kind==='waste') return g.waste.length?[g.waste[g.waste.length-1]]:[];
  if(from.kind==='foundation' && Number.isInteger(from.suit) && from.suit>=0 && from.suit<4){
    const f=g.foundations[from.suit];
    return f.length?[f[f.length-1]]:[];
  }
  if(from.kind==='tableau' && Number.isInteger(from.column) && from.column>=0 && from.column<7 &&
     Number.isInteger(from.index) && from.index>=0){
    const pile=g.tableau[from.column];
    if(from.index>=pile.length || !pile[from.index].up) return [];
    return pile.slice(from.index).map(x=>x.id);
  }
  return [];
}
export function canMove(g,from,to){
  const cards=selectionCards(g,from);
  if(!cards.length || !to || g.won) return false;
  if(to.kind==='tableau' && Number.isInteger(to.column) && to.column>=0 && to.column<7){
    if(from.kind==='tableau' && from.column===to.column) return false;
    const pile=g.tableau[to.column], top=pile[pile.length-1];
    if(!top) return rank(cards[0])===13;
    return top.up && rank(top.id)===rank(cards[0])+1 && red(top.id)!==red(cards[0]);
  }
  if(to.kind==='foundation' && Number.isInteger(to.suit) && to.suit>=0 && to.suit<4){
    if(cards.length!==1 || from.kind==='foundation') return false;
    return suit(cards[0])===to.suit && rank(cards[0])===g.foundations[to.suit].length+1;
  }
  return false;
}
export function moveCards(g,from,to){
  if(!canMove(g,from,to)) return false;
  let ids=[];
  if(from.kind==='tableau'){
    ids=g.tableau[from.column].splice(from.index).map(c=>c.id);
    const pile=g.tableau[from.column], top=pile[pile.length-1];
    if(top && !top.up){top.up=true;g.score+=5;}
  }else if(from.kind==='waste')ids=[g.waste.pop()];
  else if(from.kind==='foundation')ids=[g.foundations[from.suit].pop()];
  if(to.kind==='tableau')g.tableau[to.column].push(...ids.map(id=>({id,up:true})));
  else {g.foundations[to.suit].push(ids[0]);g.score+=10;}
  g.moves++;
  g.won=g.foundations.every(p=>p.length===13);
  return true;
}
export function dealStock(g) {
  if(g.won || (!g.stock.length && !g.waste.length))return false;
  if(g.stock.length)g.waste.push(g.stock.pop());
  else {g.stock=g.waste.slice().reverse();g.waste=[];}
  g.moves++;
  return true;
}
export function hint(g) {
  if(g.won)return null;
  const sources=[];
  if(g.waste.length)sources.push({kind:'waste'});
  for(let c=0;c<7;c++){
    const p=g.tableau[c];
    for(let i=0;i<p.length;i++) if(p[i].up)sources.push({kind:'tableau',column:c,index:i});
  }
  // Prefer moving to foundations and revealing face-down cards.
  for(const from of sources)for(let s=0;s<4;s++){
    const to={kind:'foundation',suit:s};
    if(canMove(g,from,to))return {from,to};
  }
  const ranked=[...sources].sort((a,b)=>{
    const reveal=x=>x.kind==='tableau' && x.index>0 && !g.tableau[x.column][x.index-1].up ? 0 : 1;
    return reveal(a)-reveal(b);
  });
  for(const from of ranked)for(let c=0;c<7;c++){
    if(from.kind==='tableau' && from.index===0 && g.tableau[c].length===0)continue;
    const to={kind:'tableau',column:c};
    if(canMove(g,from,to))return {from,to};
  }
  return g.stock.length||g.waste.length?{from:null,to:{kind:'stock'}}:null;
}
