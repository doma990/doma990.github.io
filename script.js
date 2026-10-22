document.getElementById('year').textContent = new Date().getFullYear();
const menus = document.querySelectorAll('.nav-menu');
document.addEventListener('click', event => {
  menus.forEach(menu => {
    if (!menu.contains(event.target) || event.target.closest('a')) menu.open = false;
  });
});
document.addEventListener('keydown', event => {
  if (event.key === 'Escape') menus.forEach(menu => {
    if (menu.open) { menu.open = false; menu.querySelector('summary').focus(); }
  });
});
