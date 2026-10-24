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
const heroState = { wash: 0 };
// Hero variants for the client to choose from: ?hero=a…f (the choice is remembered on this device)
const params = new URLSearchParams(location.search);
const VARIANTS = ['a', 'b', 'c', 'd', 'e', 'f'];
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
  // One pinned stage, several scenes. Fractions of the hero's scroll:
  //   0.00-0.26 wash the car, titles swap      0.34-0.48 route scene slides in from the right
  //   0.52-0.90 the light travels the route    0.90-1.00 CTA, hold
  const c = gsap.utils.clamp(0, 1);
  const route = $('[data-route]', hero)!;
  const routePath = $<SVGPathElement>('[data-route-path]', route)!;
  const routeLight = $('[data-route-light]', route)!;
  const routeSvg = routePath.ownerSVGElement!;
  const routeDraw = $<SVGSVGElement>('[data-route-draw]', route)!;
  const stops = $$<HTMLElement>('[data-stop]', route);
  const cta = $('[data-route-cta]', route)!;
  const shots = $$<HTMLElement>('[data-shot]', route);
  const len = routePath.getTotalLength();
  // place the stops on the curve (the svg stretches, so map viewBox units to pixels)
  const placeStops = () => {
    const b = routeSvg.getBoundingClientRect(), m = routeSvg.parentElement!.getBoundingClientRect();
    const at = (t: number) => {
      const pt = routePath.getPointAtLength(t * len);
      return { x: b.left - m.left + (pt.x / 1000) * b.width, y: b.top - m.top + (pt.y / 200) * b.height };
    };
    stops.forEach((st) => { const p = at(Number(st.dataset.t)); st.style.left = `${p.x}px`; st.style.top = `${p.y}px`; });
    return at;
  };
  let at = placeStops();
  addEventListener('resize', () => { at = placeStops(); });

  ScrollTrigger.create({
    trigger: hero, start: 'top top', end: 'bottom bottom', scrub: true,
    onUpdate: (s) => {
      const p = s.progress;
      heroState.wash = c(p / 0.26);
      const r = c((p - 0.52) / 0.38);
      const pt = at(r);
      // the blue line is revealed up to the light (the route only moves rightwards)
      const sb = routeSvg.getBoundingClientRect(), mb = routeSvg.parentElement!.getBoundingClientRect();
      routeDraw.style.clipPath = `inset(-30px ${Math.max(0, 100 - ((pt.x - (sb.left - mb.left)) / sb.width) * 100)}% -30px 0)`;
      routeLight.style.transform = `translate(${pt.x}px, ${pt.y}px)`;
      routeLight.style.opacity = p > 0.5 && p < 0.995 ? '1' : '0';
      stops.forEach((st, i) => {
        const on = r >= Number(st.dataset.t) - 0.01;
        st.classList.toggle('is-on', on);
        // the first picture is already there as the scene slides in
        shots[i]?.classList.toggle('is-on', i === 0 ? p >= 0.4 : on);
      });
      cta.classList.toggle('is-on', r >= 0.98);
    },
  });
  const media = $$('.hero__still, .hero__gl, .hero__front, .hero__shade, .hero__copy', hero);
  const tl = gsap.timeline({ scrollTrigger: { trigger: hero, start: 'top top', end: 'bottom bottom', scrub: 0.6 } });
  tl.to($$('.ln > span', heroA), { yPercent: -110, stagger: 0.02, duration: 0.06, ease: 'none' }, 0.1)
    .to($('[data-hero-cue]'), { opacity: 0, duration: 0.03 }, 0.02)
    .to($$('.ln > span', heroB), { y: 0, stagger: 0.02, duration: 0.07, ease: 'none' }, 0.15)
    .to($$('.hero__lead, .hero__acts', heroB), { opacity: 1, y: 0, stagger: 0.02, duration: 0.05 }, 0.21)
    // the next scene pulls in from the right and pushes the car away to the left
    .to(route, { xPercent: -100, duration: 0.14, ease: 'power2.inOut' }, 0.34)
    .to(media, { xPercent: -28, opacity: 0.35, duration: 0.14, ease: 'power2.inOut' }, 0.34)
    .from($$('.route__head > *', route), { x: 80, opacity: 0, stagger: 0.02, duration: 0.1, ease: 'power2.out' }, 0.4)
    .to({}, { duration: 0.01 }, 0.99);
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
  const stepsList = $('[data-polish-steps]', polish)!;
  const steps = $$<HTMLElement>('li', stepsList);
  ScrollTrigger.create({
    trigger: polish, start: 'top top', end: 'bottom bottom', scrub: true,
    onUpdate: (s) => {
      pp = s.progress;
      words.forEach((w, i) => w.classList.toggle("is-lit", pp > 0.04 + i * 0.3));
      before.style.opacity = String(pp < 0.86 ? 1 : 0);
      after.style.opacity = String(pp < 0.86 ? 0 : 1);
      // stages light up with the spreading correction; the rule fills between them
      steps.forEach((li) => li.classList.toggle('is-on', pp >= Number(li.dataset.at)));
      stepsList.style.setProperty('--fill', String(Math.min(1, Math.max(0, (pp - 0.12) / 0.7))));
    },
  });
  initPolishGL($<HTMLCanvasElement>('[data-polish-gl]', polish)!, () => pp)
    .then((ok) => { if (ok) polish.classList.add('is-gl'); })
    .catch(() => {});
}

/* Realizacje: native scroll-snap + arrows, counter, mouse drag, lazy video */
const track = $('[data-work-track]');
if (track) {
  // Realizacje: an endless row that drifts slowly on its own. Three copies of the posters; the drift
  // stays inside the middle copy and wraps by one copy width, so the jump is invisible.
  // Hover, drag, swipe, the wheel or an open close-up pause it; it picks up again a moment later.
  const items = $$<HTMLElement>('[data-poster]', track);
  const n = items.length / 3;
  const idx = $('[data-work-i]')!;
  const prev = $<HTMLButtonElement>('[data-work-prev]')!;
  const next = $<HTMLButtonElement>('[data-work-next]')!;
  const step = () => items[1].offsetLeft - items[0].offsetLeft;
  const loop = () => items[n].offsetLeft - items[0].offsetLeft;
  // the drift's home: first poster of the middle copy lined up with the page's left text edge
  const head = $('.work__head')!;
  const edge = () => head.getBoundingClientRect().left + parseFloat(getComputedStyle(head).paddingLeft);
  const origin = () => items[n].offsetLeft - items[0].offsetLeft - edge();
  let pos = 0, hold = 0, hover = false, open = false, seen = false, last = performance.now();
  const wrap = () => {
    const L = loop(), o = origin();
    if (track.scrollLeft < o - 1) track.scrollLeft += L;
    else if (track.scrollLeft >= o + L) track.scrollLeft -= L;
  };
  const start = () => { track.scrollLeft = origin(); pos = track.scrollLeft; };
  start();
  addEventListener('resize', start);
  const pause = (ms = 2600) => { hold = performance.now() + ms; };
  const speed = matchMedia('(pointer: coarse)').matches ? 16 : 22; // px per second
  const tick = (t: number) => {
    const dt = Math.min(0.05, (t - last) / 1000); last = t;
    if (seen && !hover && !open && !reduced && t > hold) {
      pos += speed * dt;
      track.scrollLeft = pos;
      if (Math.abs(track.scrollLeft - pos) > 2) pos = track.scrollLeft; // browser rounded or clamped it
    } else pos = track.scrollLeft;
    wrap();
    pos = Math.abs(pos - track.scrollLeft) > 2 ? track.scrollLeft : pos;
    const i = ((Math.round((track.scrollLeft - origin()) / step()) % n) + n) % n;
    idx.textContent = String(i + 1);
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
  new IntersectionObserver(([e]) => { seen = e.isIntersecting; }).observe(track);
  track.addEventListener('pointerenter', (e) => { if (e.pointerType === 'mouse') hover = true; });
  track.addEventListener('pointerleave', () => { hover = false; pause(800); });
  ['wheel', 'touchstart', 'keydown', 'focusin'].forEach((ev) => track.addEventListener(ev, () => pause(), { passive: true }));
  const go = (dir: number) => { pause(3200); wrap(); track.scrollTo({ left: track.scrollLeft + dir * step(), behavior: 'smooth' }); };
  prev.addEventListener('click', () => go(-1));
  next.addEventListener('click', () => go(1));

  // mouse drag (touch scrolls natively)
  let down = false, sx = 0, sl = 0, moved = false;
  track.addEventListener('pointerdown', (e) => {
    if (e.pointerType !== 'mouse') return;
    down = true; moved = false; sx = e.clientX; sl = track.scrollLeft; pause(3000);
  });
  addEventListener('pointermove', (e) => {
    if (!down) return;
    const dx = e.clientX - sx;
    if (Math.abs(dx) > 4) { moved = true; track.classList.add('is-drag'); }
    track.scrollLeft = sl - dx;
    pause(2600);
  });
  addEventListener('pointerup', () => {
    if (!down) return;
    down = false;
    track.classList.remove('is-drag');
  });
  track.addEventListener('click', (e) => { if (moved) { e.preventDefault(); e.stopPropagation(); moved = false; } }, true);

  // close-up of a job: his clip plays, the page underneath stops
  const cases = $$<HTMLDialogElement>('[data-case]');
  const close = (d: HTMLDialogElement) => d.close();
  cases.forEach((d) => {
    const v = $<HTMLVideoElement>('video', d)!;
    d.addEventListener('close', () => { v.pause(); open = false; lenis?.start(); pause(1500); });
    d.addEventListener('click', (e) => { if (e.target === d) close(d); }); // click on the dimmed backdrop
    $('[data-case-close]', d)!.addEventListener('click', () => close(d));
    $('[data-case-go]', d)!.addEventListener('click', () => close(d));
  });
  $$<HTMLButtonElement>('[data-case-open]', track).forEach((b) => b.addEventListener('click', () => {
    const d = cases[Number(b.dataset.caseOpen)];
    if (!d) return;
    const v = $<HTMLVideoElement>('video', d)!;
    if (!v.src) v.src = v.dataset.caseSrc!;
    open = true; lenis?.stop();
    d.showModal();
    v.muted = true;
    v.play().catch(() => {});
  }));
  const vids = $$<HTMLVideoElement>('video[data-src]');
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
    out.textContent = parts.join('\n');
    // the customer's own words go at the end of the SMS
    const note = val('note');
    const text = [...parts, note].filter(Boolean).join('\n');
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
