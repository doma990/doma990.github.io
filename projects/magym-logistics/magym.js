const search = document.querySelector('#schema-search');
const domain = document.querySelector('#schema-domain');
const relations = [...document.querySelectorAll('.schema-relation')];
const count = document.querySelector('.schema-result-count');
const empty = document.querySelector('.schema-empty');
function filterSchema() {
  const query = search.value.trim().toLowerCase();
  relations.forEach(relation => {
    relation.hidden = (domain.value !== 'all' && relation.dataset.domain !== domain.value) || !relation.textContent.toLowerCase().includes(query);
  });
  const visible = relations.filter(relation => !relation.hidden).length;
  count.textContent = `${visible} ${visible === 1 ? 'relation' : 'relations'}`;
  empty.hidden = visible !== 0;
}
search.addEventListener('input', filterSchema);
domain.addEventListener('change', filterSchema);
document.querySelector('#schema-reset').addEventListener('click', () => {
  search.value = ''; domain.value = 'all'; filterSchema(); search.focus();
});
function revealRelation(id, scroll = true) {
  const target = document.getElementById(id);
  if (!target?.classList.contains('schema-relation')) return;
  search.value = ''; domain.value = 'all'; filterSchema(); target.open = true;
  if (scroll) target.scrollIntoView({block:'start', behavior:'auto'});
}
document.querySelectorAll('a[href^="#relation-"]').forEach(link => {
  link.addEventListener('click', event => {
    event.preventDefault();
    const id = link.hash.slice(1); revealRelation(id);
    history.replaceState(null, '', '#' + id);
    const summary = document.getElementById(id)?.querySelector('summary');
    summary?.focus({preventScroll:true});
  });
});
revealRelation(location.hash.slice(1));
addEventListener('hashchange', () => revealRelation(location.hash.slice(1)));
const viewport = document.querySelector('.erd-viewport');
const diagram = document.querySelector('#eerd-image');
const zoomLevel = document.querySelector('#zoom-level');
const zoomIn = document.querySelector('[data-zoom="in"]');
const zoomOut = document.querySelector('[data-zoom="out"]');
let zoom = 1, fitWidth = 0, maxZoom = 8;
function fitDiagram() {
  if (!diagram.naturalWidth || !viewport.clientWidth) return;
  fitWidth = Math.min(viewport.clientWidth, viewport.clientHeight * diagram.naturalWidth / diagram.naturalHeight);
  maxZoom = Math.max(8, diagram.naturalWidth / fitWidth);
  zoom = 1; setZoom(1); viewport.scrollTo(0,0);
}
function setZoom(next) {
  const previous = zoom;
  const centerX = viewport.scrollLeft + viewport.clientWidth / 2;
  const centerY = viewport.scrollTop + viewport.clientHeight / 2;
  zoom = Math.max(1,Math.min(maxZoom,next));
  diagram.style.width = Math.round(fitWidth * zoom) + 'px';
  zoomLevel.value = Math.round(zoom * 100) + '%';
  zoomOut.disabled = zoom === 1; zoomIn.disabled = zoom === maxZoom;
  if (previous !== zoom) viewport.scrollTo(Math.max(0,centerX * zoom / previous - viewport.clientWidth / 2), Math.max(0,centerY * zoom / previous - viewport.clientHeight / 2));
}
zoomIn.addEventListener('click', () => setZoom(zoom * 1.6));
zoomOut.addEventListener('click', () => setZoom(zoom / 1.6));
document.querySelector('[data-zoom="fit"]').addEventListener('click', fitDiagram);
if (diagram.complete) fitDiagram(); else diagram.addEventListener('load', fitDiagram, {once:true});
addEventListener('resize', fitDiagram);
let drag;
viewport.addEventListener('pointerdown', event => {
  if (event.pointerType !== 'mouse' || event.button !== 0 || zoom === 1) return;
  drag = {x:event.clientX,y:event.clientY,left:viewport.scrollLeft,top:viewport.scrollTop};
  viewport.setPointerCapture(event.pointerId); viewport.classList.add('dragging'); event.preventDefault();
});
viewport.addEventListener('pointermove', event => {
  if (!drag) return;
  viewport.scrollLeft = drag.left - event.clientX + drag.x;
  viewport.scrollTop = drag.top - event.clientY + drag.y;
});
function endDrag(){drag=undefined;viewport.classList.remove('dragging');}
viewport.addEventListener('pointerup',endDrag);viewport.addEventListener('pointercancel',endDrag);viewport.addEventListener('lostpointercapture',endDrag);
