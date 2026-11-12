/**
 * Visual motion controller for Klondike.
 * Drag a face-up card with every card below it, and animate completed moves.
 * All clones are presentation-only; game rules/state remain in engine.js.
 */
export function createCardMotion() {
  const reduced = () => window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches === true;
  const findCard = id => document.querySelector('[data-card-id="' + id + '"]');
  const active = new Set();

  function collect(ids) {
    const entries = ids.map(id => {
      const element = findCard(id);
      if (!element) return null;
      const rect = element.getBoundingClientRect();
      const clone = element.cloneNode(true);
      clone.classList.remove('selected', 'hint');
      clone.classList.add('motion-clone');
      clone.removeAttribute('id');
      clone.removeAttribute('data-source');
      clone.removeAttribute('data-dest');
      clone.setAttribute('aria-hidden','true');
      clone.tabIndex = -1;
      clone.disabled = true;
      Object.assign(clone.style, {
        position: 'fixed',
        left: rect.left + 'px',
        top: rect.top + 'px',
        width: rect.width + 'px',
        height: rect.height + 'px',
        transform: 'translate(0px, 0px)',
        opacity: '1',
        pointerEvents: 'none',
        zIndex: '2000'
      });
      return {id, rect, clone, source: element, destination: null};
    }).filter(Boolean);
    if (!entries.length) return null;
    return {entries, mounted:false, dx:0, dy:0, finished:false};
  }

  function mount(snapshot) {
    if (!snapshot || snapshot.finished || snapshot.mounted || reduced()) return;
    snapshot.mounted = true;
    active.add(snapshot);
    for (const [i, entry] of snapshot.entries.entries()) {
      entry.clone.style.zIndex = String(2000+i);
      document.body.appendChild(entry.clone);
    }
  }

  function follow(snapshot, dx, dy) {
    if (!snapshot || snapshot.finished || reduced()) return;
    mount(snapshot);
    snapshot.dx = dx;
    snapshot.dy = dy;
    for (const entry of snapshot.entries) {
      entry.clone.style.transform = 'translate(' + dx + 'px, ' + dy + 'px)';
      if (entry.source.isConnected) entry.source.style.opacity = '0.3';
    }
  }

  function cleanup(snapshot) {
    if (!snapshot || snapshot.finished) return;
    snapshot.finished = true;
    for (const entry of snapshot.entries) {
      entry.clone.remove();
      if (entry.source.isConnected) entry.source.style.opacity = '';
      if (entry.destination?.isConnected) entry.destination.style.opacity = '';
    }
    active.delete(snapshot);
  }

  function animate(snapshot, duration = 340) {
    if (!snapshot) return;
    if (reduced() || !('animate' in Element.prototype)) {
      cleanup(snapshot);
      return;
    }
    mount(snapshot);
    const promises = [];
    for (const entry of snapshot.entries) {
      const destination = findCard(entry.id);
      if (!destination) continue;
      entry.destination = destination;
      destination.style.opacity = '0';
      const rect = destination.getBoundingClientRect();
      const dx = rect.left - entry.rect.left;
      const dy = rect.top - entry.rect.top;
      const animation = entry.clone.animate([
        {transform:'translate(' + snapshot.dx + 'px,' + snapshot.dy + 'px)', opacity:1},
        {transform:'translate(' + dx + 'px,' + dy + 'px)', opacity:1}
      ],{duration,fill:'forwards',easing:'cubic-bezier(.22,.7,.25,1)'});
      promises.push(animation.finished.catch(() => {}));
    }
    if (!promises.length) {cleanup(snapshot);return;}
    Promise.allSettled(promises).then(() => cleanup(snapshot));
  }

  function reject(snapshot) {
    if (!snapshot) return;
    if (reduced() || !snapshot.mounted || !('animate' in Element.prototype)) {
      cleanup(snapshot);return;
    }
    const promises = snapshot.entries.map(entry =>
      entry.clone.animate([
        {transform:'translate(' + snapshot.dx + 'px,' + snapshot.dy + 'px)',opacity:1},
        {transform:'translate(0px,0px)',opacity:.75}
      ], {duration:160,fill:'forwards',easing:'ease-out'}).finished.catch(() => {})
    );
    Promise.allSettled(promises).then(() => cleanup(snapshot));
  }

  function dealFrom(originRect, id) {
    const destination = findCard(id);
    if (!destination || !originRect || reduced() || !('animate' in Element.prototype)) return;
    const entryRect = destination.getBoundingClientRect();
    const clone = destination.cloneNode(true);
    clone.classList.add('motion-clone');
    clone.disabled = true;
    clone.removeAttribute('data-source');
    clone.setAttribute('aria-hidden','true');
    Object.assign(clone.style, {
      position:'fixed', left:originRect.left + 'px', top:originRect.top + 'px',
      width:entryRect.width + 'px', height:entryRect.height + 'px',
      zIndex:'2000', pointerEvents:'none'
    });
    destination.style.opacity='0';
    document.body.appendChild(clone);
    const animation = clone.animate([
      {transform:'translate(0px,0px) rotateY(90deg)',opacity:.7},
      {transform:'translate(' + (entryRect.left-originRect.left) + 'px,' + (entryRect.top-originRect.top) + 'px) rotateY(0)',opacity:1}
    ],{duration:350,fill:'forwards',easing:'ease-out'});
    animation.finished.catch(()=>{}).finally(()=>{
      clone.remove();
      if (destination.isConnected) destination.style.opacity='';
    });
  }

  function stopAll() {for (const snapshot of [...active]) cleanup(snapshot);}

  return {collect,follow,animate,reject,dealFrom,stopAll};
}
