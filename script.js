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
const filters = [...document.querySelectorAll('[data-filter]')];
const cards = [...document.querySelectorAll('.project-card')];
const carousel = document.querySelector('.project-carousel');
const track = document.getElementById('project-carousel-track');
const previousProject = document.querySelector('[data-carousel-prev]');
const nextProject = document.querySelector('[data-carousel-next]');
const carouselPosition = document.querySelector('.carousel-position');
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
let currentCard = null;
let requestedCard = null;
let carouselWidth = 0;
let scrollFrame = 0;
let resizeFrame = 0;
let scrollIdleTimer;

function visibleCards() {
  return cards.filter(card => !card.hidden);
}
function selectCard(card) {
  const visible = visibleCards();
  currentCard = card || visible[0] || null;
  cards.forEach(item => item.classList.toggle('is-current', item === currentCard));
  const index = visible.indexOf(currentCard);
  if (carouselPosition) carouselPosition.textContent = `${index + 1} / ${visible.length}`;
  if (previousProject) previousProject.disabled = index <= 0;
  if (nextProject) nextProject.disabled = index < 0 || index === visible.length - 1;
}
function centerCard(card, behavior = 'instant') {
  if (!track || !card) return;
  const item = card.getBoundingClientRect();
  const viewport = track.getBoundingClientRect();
  const left = track.scrollLeft + item.left + item.width / 2 - viewport.left - track.clientWidth / 2;
  track.scrollTo({ left, behavior });
}
function layoutCarousel(force = false) {
  if (!track || !carousel) return;
  const width = track.clientWidth;
  if (!force && width === carouselWidth) return;
  carouselWidth = width;
  const card = requestedCard || currentCard;
  requestedCard = null;
  selectCard(card);
  centerCard(card);
}
function nearestCard() {
  if (!track) return null;
  const viewport = track.getBoundingClientRect();
  const center = viewport.left + track.clientWidth / 2;
  return visibleCards().reduce((nearest, card) => {
    const bounds = card.getBoundingClientRect();
    const distance = Math.abs(bounds.left + bounds.width / 2 - center);
    return !nearest || distance < nearest.distance ? { card, distance } : nearest;
  }, null)?.card;
}
function goToCard(card) {
  if (!card) return;
  requestedCard = card;
  selectCard(card);
  centerCard(card, reducedMotion.matches ? 'instant' : 'smooth');
}
function stepProject(direction) {
  const visible = visibleCards();
  const index = visible.indexOf(requestedCard || currentCard);
  goToCard(visible[Math.max(0, Math.min(visible.length - 1, index + direction))]);
}
function applyFilter(value) {
  filters.forEach(button => {
    const active = button.dataset.filter === value;
    button.classList.toggle('active', active);
    button.setAttribute('aria-pressed', String(active));
  });
  cards.forEach(card => { card.hidden = value !== 'all' && card.dataset.category !== value; });
  const visible = visibleCards();
  visible.forEach((card, index) => {
    card.setAttribute('role', 'group');
    card.setAttribute('aria-roledescription', 'slide');
    card.setAttribute('aria-label', `${index + 1} of ${visible.length}: ${card.querySelector('h3 a').textContent}`);
  });
  const count = document.querySelector('.project-count');
  if (count) count.textContent = `${visible.length} ${visible.length === 1 ? 'project' : 'projects'}`;
  selectCard(visible[0]);
  layoutCarousel(true);
}
const filterHashes = { all: '#projects', guc: '#guc-projects', independent: '#independent-projects' };
const hashFilters = { '#guc-projects': 'guc', '#academic-projects': 'guc', '#independent-projects': 'independent' };
filters.forEach(button => button.addEventListener('click', () => {
  applyFilter(button.dataset.filter);
  history.replaceState(null, '', filterHashes[button.dataset.filter] || '#projects');
}));
function filterHash() {
  if (filters.length) applyFilter(hashFilters[location.hash] || 'all');
}
filterHash();
addEventListener('hashchange', filterHash);

if (track && carousel) {
  carousel.classList.add('carousel-ready');
  document.querySelector('.carousel-controls').hidden = false;
  previousProject.addEventListener('click', () => stepProject(-1));
  nextProject.addEventListener('click', () => stepProject(1));
  track.addEventListener('scroll', () => {
    if (!scrollFrame) scrollFrame = requestAnimationFrame(() => {
      scrollFrame = 0;
      selectCard(nearestCard());
    });
    clearTimeout(scrollIdleTimer);
    scrollIdleTimer = setTimeout(() => {
      requestedCard = null;
      selectCard(nearestCard());
    }, 150);
  }, { passive: true });
  // Native swipes and trackpad gestures choose the physically centered card.
  track.addEventListener('pointerdown', () => { requestedCard = null; }, { passive: true });
  track.addEventListener('wheel', () => { requestedCard = null; }, { passive: true });
  track.addEventListener('keydown', event => {
    if (event.target !== track) return;
    const keys = ['ArrowLeft', 'ArrowRight', 'Home', 'End'];
    if (!keys.includes(event.key) || event.altKey || event.ctrlKey || event.metaKey) return;
    event.preventDefault();
    if (event.key === 'Home') goToCard(visibleCards()[0]);
    else if (event.key === 'End') goToCard(visibleCards().at(-1));
    else stepProject(event.key === 'ArrowLeft' ? -1 : 1);
  });
  track.addEventListener('focusin', event => {
    carousel.classList.remove('reveal-pending');
    const card = event.target.closest('.project-card');
    if (card) goToCard(card);
  });
  const resizeCarousel = () => {
    cancelAnimationFrame(resizeFrame);
    resizeFrame = requestAnimationFrame(() => layoutCarousel());
  };
  if ('ResizeObserver' in window) new ResizeObserver(resizeCarousel).observe(carousel);
  addEventListener('resize', resizeCarousel);

  // Fade the row once on entry; every horizontal slide remains available.
  if ('IntersectionObserver' in window && !reducedMotion.matches) {
    const bounds = carousel.getBoundingClientRect();
    if (bounds.top >= innerHeight - 32 || bounds.bottom <= 0) {
      carousel.classList.add('reveal-pending');
      const revealObserver = new IntersectionObserver(entries => {
        if (entries.some(entry => entry.isIntersecting)) {
          carousel.classList.remove('reveal-pending');
          revealObserver.disconnect();
        }
      }, { threshold: 0.08, rootMargin: '0px 0px -32px 0px' });
      revealObserver.observe(carousel);
      reducedMotion.addEventListener('change', event => {
        if (event.matches) {
          carousel.classList.remove('reveal-pending');
          revealObserver.disconnect();
        }
      });
    }
  }
}

const sectionLinks=[...document.querySelectorAll('.project-sidebar nav a')];
if(sectionLinks.length&&'IntersectionObserver'in window){const observer=new IntersectionObserver(entries=>{entries.forEach(e=>{if(e.isIntersecting){sectionLinks.forEach(a=>{const active=a.hash==='#'+e.target.id;a.classList.toggle('section-active',active);if(active)a.setAttribute('aria-current','location');else a.removeAttribute('aria-current')})}})},{rootMargin:'-15% 0px -65% 0px'});sectionLinks.forEach(a=>{const target=document.getElementById(a.hash.slice(1));if(target)observer.observe(target)})}
