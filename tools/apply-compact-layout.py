"""Apply the reviewed compact shell without changing game rules or save keys."""
from pathlib import Path
import re


def replace(path, old, new):
    file = Path(path)
    text = file.read_text()
    if old not in text:
        raise RuntimeError(f'Unexpected source in {path}: {old[:90]}')
    file.write_text(text.replace(old, new))


for path in ('arcade/index.html', 'blocks/index.html', 'match3/index.html', 'solitaire/index.html'):
    file = Path(path)
    text = file.read_text()
    if '../shared/compact.css' not in text:
        text = text.replace('</head>', '<link rel="stylesheet" href="../shared/compact.css?v=10">\n<script type="module" src="../shared/play-ui.js?v=10"></script>\n</head>')
    text = re.sub(r'(\.css|\.js)\?v=\d+', r'\1?v=10', text)
    file.write_text(text)
file = Path('index.html')
text = file.read_text()
if './shared/compact.css' not in text:
    text = text.replace('</head>', '<link rel="stylesheet" href="./shared/compact.css?v=10">\n<script src="./shared/host-ui.js?v=10" defer></script>\n</head>')
text = re.sub(r'(\.css|\.js)\?v=\d+', r'\1?v=10', text).replace('MINI GAMES · v9','MINI GAMES · v10')
file.write_text(text)
replace('app.js', "const clientBuild = 'mini-games-v9'", "const clientBuild = 'mini-games-v10'")
replace('sw.js', "const CACHE = 'mini-games-v9';", "const CACHE = 'mini-games-v10';")
replace('sw.js', 'const PRECACHE = [', "const PRECACHE = [\n  './shared/compact.css', './shared/play-ui.js', './shared/host-ui.js',")
replace('solitaire/app.js', 'function getCardWidth(){return Math.min(70, (window.innerWidth-34)/7-2);}', "function layoutNumber(name, fallback) {const n=parseFloat(getComputedStyle(document.querySelector('.shell')).getPropertyValue(name));return Number.isFinite(n)?n:fallback;}\nfunction getCardWidth(){return layoutNumber('--card-w',Math.min(70,(window.innerWidth-34)/7-2));}")
replace('solitaire/app.js', 'function getFaceStep(){return window.innerWidth>=500?27:Math.min(26,Math.max(17,window.innerWidth*.05));}', "function getFaceStep(){return layoutNumber('--face-step',Math.min(26,Math.max(17,window.innerWidth*.05)));}")
replace('solitaire/app.js', 'function getBackStep(){return window.innerWidth>=500?16:Math.min(14,Math.max(10,window.innerWidth*.028));}', "function getBackStep(){return layoutNumber('--back-step',Math.min(14,Math.max(10,window.innerWidth*.028)));}")
replace('solitaire/app.js', "window.addEventListener('resize',paint);", "window.addEventListener('resize',paint);\nwindow.addEventListener('minigames:layout',paint);")
replace('arcade/pinball.js', '    if(!document.hidden){', "    if(!document.hidden&&document.body.dataset.menuOpen!=='true'){")
replace('arcade/pinball.js', '    game.newGame();spaceDownAt=null;', "    game.newGame();spaceDownAt=null;\n    left.classList.remove('is-pressed');right.classList.remove('is-pressed');")
replace('arcade/pinball.js', "  window.addEventListener('keydown',keydown);", "  const menuPause=event=>{if(event.detail.open)blurred();};\n  window.addEventListener('minigames:menu',menuPause);\n  window.addEventListener('keydown',keydown);")
replace('arcade/pinball.js', "      window.removeEventListener('keydown',keydown);", "      window.removeEventListener('minigames:menu',menuPause);\n      window.removeEventListener('keydown',keydown);")
replace('arcade/app.js', '  if(ended||document.hidden)return;', "  if(ended||document.hidden||document.body.dataset.menuOpen==='true')return;")
replace('blocks/js/app.js', 'function suspend() {', "let menuPaused=false;\nwindow.addEventListener('minigames:menu',event=>{\n  if(event.detail.open){menuPaused=engine.phase==='playing';if(menuPaused)suspend();}\n  else if(menuPaused&&engine.phase==='paused'){engine.togglePause();menuPaused=false;previousTime=0;dirty=true;}\n});\nfunction suspend() {")
replace('tests/visual-smoke.mjs', "        await frame.locator('#restart').click();", "        await page.locator('#game-menu-button').click();\n        await frame.locator('#mg-game-menu[open]').waitFor();\n        await frame.locator('#restart').click();\n        await frame.locator('#mg-game-menu').waitFor({state:'hidden'});")
file = Path('tests/responsive-smoke.mjs')
text = file.read_text()
start = text.index('     if(width>=960 && height>=620) {')
end = text.index('\n     }', start) + len('\n     }')
text = text[:start] + "     assert.equal(await frame.locator('.pinball-scoreboard').isVisible(),false,'Secondary cabinet is not in the main play area');" + text[end:]
file.write_text(text)
print('Compact-layout migration applied; engine rules and localStorage keys are unchanged.')
