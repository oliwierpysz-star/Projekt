import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';
import { initHeroGL } from './hero-gl';
import { initPolishGL } from './polish-gl';

gsap.registerPlugin(ScrollTrigger);
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const $ = <T extends Element = HTMLElement>(s: string, r: ParentNode = document) => r.querySelector<T>(s);
const $$ = <T extends Element = HTMLElement>(s: string, r: ParentNode = document) => [...r.querySelectorAll<T>(s)];

/* Smooth scroll on desktop only; touch keeps native scrolling */
let lenis: Lenis | null = null;
if (!reduced && matchMedia('(pointer: fine)').matches) {
  lenis = new Lenis({ lerp: 0.11 });
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add((t) => lenis!.raf(t * 1000));
  gsap.ticker.lagSmoothing(0);
}
$$<HTMLAnchorElement>('a[href^="#"]').forEach((a) =>
  a.addEventListener('click', (e) => {
    const id = a.getAttribute('href')!;
    const el = id === '#top' ? document.body : $(id);
    if (!el) return;
    e.preventDefault();
    closeMenu();
    if (lenis) lenis.scrollTo(el as HTMLElement, { offset: 0 });
    else (el as HTMLElement).scrollIntoView({ behavior: reduced ? 'auto' : 'smooth' });
  }),
);

/* Nav: hide on scroll down, show on scroll up; mark current section */
const nav = $('[data-nav]')!;
let lastY = 0;
addEventListener('scroll', () => {
  const y = scrollY;
  nav.classList.toggle('is-hidden', y > 200 && y > lastY && !document.body.classList.contains('menu-open'));
  lastY = y;
}, { passive: true });
const links = $$<HTMLAnchorElement>('[data-navlink]');
const sectionIO = new IntersectionObserver((entries) => {
  entries.forEach((e) => {
    if (!e.isIntersecting) return;
    links.forEach((l) => l.setAttribute('aria-current', String(l.getAttribute('href') === `#${e.target.id}`)));
  });
}, { rootMargin: '-45% 0px -50% 0px' });
$$('main section[id]').forEach((s) => sectionIO.observe(s));

/* Mobile menu */
const menuBtn = $<HTMLButtonElement>('[data-menu-btn]')!;
const menu = $('[data-menu]')!;
function closeMenu() {
  menu.hidden = true;
  menuBtn.setAttribute('aria-expanded', 'false');
  menuBtn.textContent = 'Menu';
  document.body.classList.remove('menu-open');
  lenis?.start();
}
menuBtn.addEventListener('click', () => {
  const open = menu.hidden;
  if (!open) return closeMenu();
  menu.hidden = false;
  menuBtn.setAttribute('aria-expanded', 'true');
  menuBtn.textContent = 'Zamknij';
  document.body.classList.add('menu-open');
  lenis?.stop();
  if (!reduced) gsap.from($$('a, p', menu), { y: 24, opacity: 0, stagger: 0.05, duration: 0.6, ease: 'expo.out' });
});
addEventListener('keydown', (e) => { if (e.key === 'Escape' && !menu.hidden) closeMenu(); });

/* Hero: scroll washes the car */
const hero = $('[data-hero]')!;
const heroA = $('[data-hero-a]')!;
const heroB = $('[data-hero-b]')!;
const heroState = { wash: 0, foam: 0, rinse: 0 };
// Hero variants for the client to choose from: ?hero=a|b|c|d (the choice is remembered on this device)
const params = new URLSearchParams(location.search);
const VARIANTS = ['a', 'b', 'c', 'd', 'e'];
let variant = 'a';
try { variant = params.get('hero') || sessionStorage.getItem('hero') || 'a'; } catch { variant = params.get('hero') || 'a'; }
if (!VARIANTS.includes(variant)) variant = 'a';
if (params.has('hero')) {
  try { sessionStorage.setItem('hero', variant); } catch {}
  const pick = $('[data-hero-pick]')!;
  pick.hidden = false;
  $$('a', pick).forEach((a) => a.setAttribute('aria-current', String(a.getAttribute('href') === `?hero=${variant}`)));
}
hero.classList.add(`hero--${variant}`);
if (variant !== 'a') {
  const pic = $('.hero__still')!;
  $<HTMLSourceElement>('source', pic)!.srcset = `/hero/${variant}/clean-phone.webp`;
  $<HTMLImageElement>('img', pic)!.src = `/hero/${variant}/clean-desktop.webp`;
}
if (!reduced) {
  ScrollTrigger.create({
    trigger: hero, start: 'top top', end: 'bottom bottom', scrub: true,
    onUpdate: (s) => {
      const c = gsap.utils.clamp(0, 1);
      heroState.wash = c(s.progress / 0.5);
      heroState.foam = c((s.progress - 0.64) / 0.18);
      heroState.rinse = c((s.progress - 0.82) / 0.16);
    },
  });
  const tl = gsap.timeline({ scrollTrigger: { trigger: hero, start: 'top top', end: 'bottom bottom', scrub: 0.6 } });
  tl.to($$('.ln > span', heroA), { yPercent: -110, stagger: 0.03, duration: 0.12, ease: 'none' }, 0.22)
    .to($('[data-hero-cue]'), { opacity: 0, duration: 0.06 }, 0.03)
    .to($$('.ln > span', heroB), { y: 0, stagger: 0.04, duration: 0.14, ease: 'none' }, 0.32)
    .to($$('.hero__lead, .hero__acts', heroB), { opacity: 1, y: 0, stagger: 0.04, duration: 0.1 }, 0.44)
    .to(heroB, { opacity: 0, y: -30, duration: 0.06, ease: 'none' }, 0.6)
    .to($('.hero__shade', hero), { opacity: 0, duration: 0.1, ease: 'none' }, 0.64)
    .to({}, { duration: 0.22 }, 0.78);
  // intro: first title rises on load
  gsap.from($$('.ln > span', heroA), { yPercent: 110, stagger: 0.08, duration: 1.1, ease: 'expo.out', delay: 0.15 });
  initHeroGL($<HTMLCanvasElement>('[data-hero-gl]')!, () => heroState, variant, $<HTMLCanvasElement>('[data-hero-front]')!)
    .then((ok) => { if (ok) hero.classList.add('is-gl'); })
    .catch(() => {});
}

/* Section titles rise out of their line; leads fade up */
if (!reduced) {
  $$('.rise').forEach((el) =>
    gsap.to($$('.ln > span', el), {
      y: 0, yPercent: 0, stagger: 0.08, duration: 1.1, ease: 'expo.out',
      scrollTrigger: { trigger: el, start: 'top 85%' },
    }),
  );
  $$('.rise-fade').forEach((el) =>
    gsap.from(el, { opacity: 0, y: 18, duration: 1, ease: 'expo.out', scrollTrigger: { trigger: el, start: 'top 90%' } }),
  );

  /* Light-bar sweep: the house reveal */
  const sweep = (el: HTMLElement, delay = 0) => {
    const o = { p: 0 };
    gsap.to(o, {
      p: 1, duration: 1.1, delay, ease: 'power3.inOut',
      onUpdate: () => {
        el.style.clipPath = `inset(0 ${100 - o.p * 100}% 0 0)`;
        el.style.setProperty('--bar', `calc(${o.p * 100}% - 2px)`);
        el.style.setProperty('--bar-o', String(o.p < 0.98 ? 1 : 0));
      },
      onComplete: () => { el.style.clipPath = 'none'; },
    });
  };
  ScrollTrigger.batch('.sweep', {
    start: 'top 88%', once: true,
    onEnter: (els) => els.forEach((el, i) => sweep(el as HTMLElement, i * 0.08)),
  });

  /* Route: line draws with scroll, stops light up */
  const route = $('[data-route]');
  if (route) {
    const paths = $$<SVGPathElement>('[data-route-path], [data-route-path-v]', route);
    const stops = $$('[data-stop]', route);
    gsap.to(paths, {
      strokeDashoffset: 0, ease: 'none',
      scrollTrigger: {
        trigger: route, start: 'top 75%', end: 'bottom 55%', scrub: 0.5,
        onUpdate: (s) => stops.forEach((st, i) => st.classList.toggle('is-on', s.progress >= i / (stops.length - 1) - 0.02)),
      },
    });
  }

  /* Numbers roll */
  $$<HTMLElement>('[data-count]').forEach((el) => {
    const end = Number(el.dataset.count);
    const o = { v: 0 };
    gsap.to(o, {
      v: end, duration: 1.8, ease: 'expo.out',
      scrollTrigger: { trigger: el, start: 'top 88%' },
      onUpdate: () => { el.textContent = Math.round(o.v).toLocaleString('pl-PL'); },
    });
  });

  /* E-book: book turns toward you with scroll, gloss slides */
  const book = $('[data-book-obj]');
  if (book) {
    gsap.fromTo(book, { rotateY: -38, rotateX: 10 }, {
      rotateY: -14, rotateX: 3, ease: 'none',
      scrollTrigger: { trigger: book, start: 'top bottom', end: 'bottom 30%', scrub: 0.6 },
      onUpdate() { book.style.setProperty('--gloss', `${100 - this.progress() * 100}%`); },
    });
  }
}

/* Korekta: scroll polishes the paint */
const polish = $('[data-polish]');
if (polish && !reduced) {
  let pp = 0;
  const words = $$('.w', polish);
  const before = $('[data-polish-before]', polish)!, after = $('[data-polish-after]', polish)!;
  const leads = $$('[data-polish-lead]', polish);
  ScrollTrigger.create({
    trigger: polish, start: 'top top', end: 'bottom bottom', scrub: true,
    onUpdate: (s) => {
      pp = s.progress;
      words.forEach((w, i) => w.classList.toggle('is-lit', pp > 0.12 + i * 0.3));
      before.style.opacity = String(pp < 0.86 ? 1 : 0);
      after.style.opacity = String(pp < 0.86 ? 0 : 1);
    },
  });
  gsap.to(leads, { opacity: 1, y: 0, stagger: 0.08, ease: 'none', scrollTrigger: { trigger: polish, start: '88% bottom', end: '97% bottom', scrub: 0.5 } });
  initPolishGL($<HTMLCanvasElement>('[data-polish-gl]', polish)!, () => pp)
    .then((ok) => { if (ok) polish.classList.add('is-gl'); })
    .catch(() => {});
}

/* Realizacje: native scroll-snap + arrows, counter, mouse drag, lazy video */
const track = $('[data-work-track]');
if (track) {
  const items = $$('[data-poster]', track);
  const idx = $('[data-work-i]')!;
  const prev = $<HTMLButtonElement>('[data-work-prev]')!;
  const next = $<HTMLButtonElement>('[data-work-next]')!;
  const step = () => (items[1] ? (items[1] as HTMLElement).offsetLeft - (items[0] as HTMLElement).offsetLeft : track.clientWidth);
  const update = () => {
    const i = Math.min(items.length - 1, Math.round(track.scrollLeft / step()));
    idx.textContent = String(i + 1);
    prev.disabled = track.scrollLeft < 8;
    next.disabled = track.scrollLeft > track.scrollWidth - track.clientWidth - 8;
  };
  track.addEventListener('scroll', update, { passive: true });
  prev.addEventListener('click', () => track.scrollBy({ left: -step(), behavior: 'smooth' }));
  next.addEventListener('click', () => track.scrollBy({ left: step(), behavior: 'smooth' }));
  update();

  let down = false, sx = 0, sl = 0, moved = false;
  track.addEventListener('pointerdown', (e) => {
    if (e.pointerType !== 'mouse') return;
    down = true; moved = false; sx = e.clientX; sl = track.scrollLeft;
  });
  addEventListener('pointermove', (e) => {
    if (!down) return;
    const dx = e.clientX - sx;
    if (Math.abs(dx) > 4) { moved = true; track.classList.add('is-drag'); }
    track.scrollLeft = sl - dx;
  });
  addEventListener('pointerup', () => {
    if (!down) return;
    down = false;
    track.classList.remove('is-drag');
    if (moved) {
      const i = Math.round(track.scrollLeft / step());
      track.scrollTo({ left: i * step(), behavior: 'smooth' });
    }
  });
  track.addEventListener('click', (e) => { if (moved) { e.preventDefault(); e.stopPropagation(); moved = false; } }, true);

  const vids = $$<HTMLVideoElement>('video[data-src]', track);
  const vio = new IntersectionObserver((entries) => entries.forEach((e) => {
    const v = e.target as HTMLVideoElement;
    if (e.isIntersecting) {
      if (!v.src) v.src = v.dataset.src!;
      if (!reduced) v.play().catch(() => {});
    } else v.pause();
  }), { threshold: 0.25 });
  vids.forEach((v) => vio.observe(v));
}

/* Darmowa wycena: build the SMS */
const form = $<HTMLFormElement>('[data-quote]');
if (form) {
  const out = $('[data-quote-out]', form)!;
  const sms = $<HTMLAnchorElement>('[data-quote-sms]', form)!;
  const copy = $<HTMLButtonElement>('[data-quote-copy]', form)!;
  const val = (n: string) => (form.elements.namedItem(n) as HTMLInputElement).value.trim();
  const picked = (sel: string) => $$<HTMLButtonElement>(`${sel} [aria-pressed="true"]`, form).map((b) => b.dataset.val!);
  const build = () => {
    const car = val('car'), city = val('city'), when = val('when'), name = val('name');
    const size = picked('[data-single="size"]')[0];
    const svc = picked('[data-multi="svc"]');
    const parts = [
      `Dzień dobry${name ? `, tu ${name}` : ''}. Proszę o wycenę.`,
      car || size ? `Auto: ${[car, size && `(${size.toLowerCase()})`].filter(Boolean).join(' ')}` : '',
      svc.length ? `Usługa: ${svc.join(', ').toLowerCase()}` : '',
      city ? `Miejscowość: ${city}` : '',
      when ? `Termin: ${when}` : '',
    ].filter(Boolean);
    const text = parts.join('\n');
    out.textContent = text;
    sms.href = `sms:+48881265265?&body=${encodeURIComponent(text)}`;
    return text;
  };
  $$<HTMLButtonElement>('[data-single] .chip', form).forEach((b) => b.addEventListener('click', () => {
    $$<HTMLButtonElement>('.chip', b.parentElement!).forEach((x) => x.setAttribute('aria-pressed', String(x === b && x.getAttribute('aria-pressed') !== 'true')));
    build();
  }));
  $$<HTMLButtonElement>('[data-multi] .chip', form).forEach((b) => b.addEventListener('click', () => {
    b.setAttribute('aria-pressed', String(b.getAttribute('aria-pressed') !== 'true'));
    build();
  }));
  form.addEventListener('input', build);
  copy.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(build());
      copy.firstChild!.textContent = 'Skopiowano ';
      setTimeout(() => (copy.firstChild!.textContent = 'Skopiuj treść '), 2200);
    } catch { /* clipboard blocked: text stays visible to copy by hand */ }
  });
  build();
}

/* Fit big wordmarks exactly to their container width */
const fit = () => $$<HTMLElement>('[data-fit]').forEach((el) => {
  el.style.fontSize = '100px';
  const w = el.parentElement!.clientWidth - parseFloat(getComputedStyle(el.parentElement!).paddingLeft) * 2;
  el.style.fontSize = `${Math.floor((100 * w) / el.scrollWidth * 0.995)}px`;
});
fit();
document.fonts?.ready.then(fit);
addEventListener('resize', fit);

addEventListener('load', () => ScrollTrigger.refresh());
