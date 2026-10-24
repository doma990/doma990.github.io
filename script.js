const year=document.getElementById('year');if(year)year.textContent=new Date().getFullYear();
const toggle = document.querySelector('.theme-toggle');
const root = document.documentElement;
let changingTheme = false;
const sunIcon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5"/></svg>';
const moonIcon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round" aria-hidden="true"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79Z"/></svg>';
function syncTheme() {
  if (!toggle) return;
  const isDark = root.dataset.theme !== 'light';
  const label = isDark ? 'Switch to light theme' : 'Switch to dark theme';
  toggle.setAttribute('aria-label', label);
  toggle.title = label;
  toggle.innerHTML = isDark ? sunIcon : moonIcon;
}
function setTheme(theme) {
  root.dataset.theme = theme;
  try { localStorage.setItem('portfolio-theme', theme); } catch {}
  syncTheme();
}
async function changeTheme() {
  if (changingTheme) return;
  const theme = root.dataset.theme === 'light' ? 'dark' : 'light';
  if (typeof document.startViewTransition !== 'function' || typeof root.animate !== 'function' || matchMedia('(prefers-reduced-motion: reduce)').matches) {
    setTheme(theme);
    return;
  }
  const bounds = toggle.getBoundingClientRect();
  const x = bounds.left + bounds.width / 2;
  const y = bounds.top + bounds.height / 2;
  const radius = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y)) + 2;
  changingTheme = true;
  toggle.setAttribute('aria-busy', 'true');
  let transition;
  try {
    transition = document.startViewTransition(() => setTheme(theme));
    await transition.ready;
    const reveal = root.animate(
      { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${radius}px at ${x}px ${y}px)`] },
      { duration: 600, easing: 'cubic-bezier(0.4, 0, 0.2, 1)', pseudoElement: '::view-transition-new(root)' }
    );
    await reveal.finished;
    await transition.finished;
  } catch {
    transition?.skipTransition();
    setTheme(theme);
  } finally {
    changingTheme = false;
    toggle.removeAttribute('aria-busy');
  }
}
syncTheme();
toggle?.addEventListener('click', changeTheme);
const filters=[...document.querySelectorAll('[data-filter]')];const cards=[...document.querySelectorAll('.project-card')];
function applyFilter(value){filters.forEach(b=>{const active=b.dataset.filter===value;b.classList.toggle('active',active);b.setAttribute('aria-pressed',String(active))});cards.forEach(c=>c.hidden=value!=='all'&&c.dataset.category!==value);const count=document.querySelector('.project-count');if(count){const visibleCount=cards.filter(c=>!c.hidden).length;count.textContent=visibleCount+' '+(visibleCount===1?'project':'projects');}}
const filterHashes={all:'#projects',guc:'#guc-projects',independent:'#independent-projects'};
const hashFilters={'#guc-projects':'guc','#academic-projects':'guc','#independent-projects':'independent'};
filters.forEach(b=>b.addEventListener('click',()=>{applyFilter(b.dataset.filter);history.replaceState(null,'',filterHashes[b.dataset.filter]||'#projects')}));
function filterHash(){if(filters.length)applyFilter(hashFilters[location.hash]||'all')};filterHash();addEventListener('hashchange',filterHash);
const sectionLinks=[...document.querySelectorAll('.project-sidebar nav a')];
if(sectionLinks.length&&'IntersectionObserver'in window){const observer=new IntersectionObserver(entries=>{entries.forEach(e=>{if(e.isIntersecting){sectionLinks.forEach(a=>{const active=a.hash==='#'+e.target.id;a.classList.toggle('section-active',active);if(active)a.setAttribute('aria-current','location');else a.removeAttribute('aria-current')})}})},{rootMargin:'-15% 0px -65% 0px'});sectionLinks.forEach(a=>{const target=document.getElementById(a.hash.slice(1));if(target)observer.observe(target)})}
