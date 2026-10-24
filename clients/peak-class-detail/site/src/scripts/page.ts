// Subpages (Realizacje): nav that hides on scroll, the phone menu, and the job close-ups.
import { initCases } from './cases';

const $ = <T extends Element = HTMLElement>(s: string, r: ParentNode = document) => r.querySelector<T>(s);

const nav = $('[data-nav]');
let lastY = 0;
addEventListener('scroll', () => {
  const y = scrollY;
  nav?.classList.toggle('is-hidden', y > 200 && y > lastY && !document.body.classList.contains('menu-open'));
  lastY = y;
}, { passive: true });

const menuBtn = $<HTMLButtonElement>('[data-menu-btn]');
const menu = $('[data-menu]');
const closeMenu = () => {
  if (!menu || !menuBtn) return;
  menu.hidden = true;
  menuBtn.setAttribute('aria-expanded', 'false');
  menuBtn.textContent = 'Menu';
  document.body.classList.remove('menu-open');
};
menuBtn?.addEventListener('click', () => {
  if (!menu) return;
  if (!menu.hidden) return closeMenu();
  menu.hidden = false;
  menuBtn.setAttribute('aria-expanded', 'true');
  menuBtn.textContent = 'Zamknij';
  document.body.classList.add('menu-open');
});
addEventListener('keydown', (e) => { if (e.key === 'Escape') closeMenu(); });

initCases();
