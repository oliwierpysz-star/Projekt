// Close-ups of jobs (JobCase.astro): open from any [data-case-open="<slug>"], swipe/drag/arrow
// through the strip, the clip in view plays, everything stops when it closes.
export function initCases(hooks: { onOpen?: () => void; onClose?: () => void } = {}) {
  const $ = <T extends Element = HTMLElement>(s: string, r: ParentNode = document) => r.querySelector<T>(s);
  const $$ = <T extends Element = HTMLElement>(s: string, r: ParentNode = document) => [...r.querySelectorAll<T>(s)];
  const cases = new Map($$<HTMLDialogElement>('[data-case]').map((d) => [d.dataset.case!, d]));

  cases.forEach((d) => {
    const strip = $('[data-case-strip]', d)!;
    const items = $$<HTMLElement>('.case__item', strip);
    const vids = $$<HTMLVideoElement>('video', d);
    const idx = $('[data-case-i]', d);
    const at = () => {
      const x = strip.scrollLeft + strip.clientWidth * 0.3;
      let i = 0;
      items.forEach((it, k) => { if (it.offsetLeft - strip.offsetLeft <= x) i = k; });
      return i;
    };
    strip.addEventListener('scroll', () => { if (idx) idx.textContent = String(at() + 1); }, { passive: true });
    const go = (dir: number) => {
      const i = Math.max(0, Math.min(items.length - 1, at() + dir));
      strip.scrollTo({ left: items[i].offsetLeft - items[0].offsetLeft, behavior: 'smooth' });
    };
    $('[data-case-prev]', d)?.addEventListener('click', () => go(-1));
    $('[data-case-next]', d)?.addEventListener('click', () => go(1));
    strip.addEventListener('keydown', (e) => { if (e.key === 'ArrowRight') go(1); if (e.key === 'ArrowLeft') go(-1); });

    // mouse drag (touch scrolls natively)
    let down = false, sx = 0, sl = 0, moved = false;
    strip.addEventListener('pointerdown', (e) => {
      if (e.pointerType !== 'mouse' || (e.target as HTMLElement).closest('video')) return;
      down = true; moved = false; sx = e.clientX; sl = strip.scrollLeft;
    });
    addEventListener('pointermove', (e) => {
      if (!down) return;
      const dx = e.clientX - sx;
      if (Math.abs(dx) > 4) { moved = true; strip.classList.add('is-drag'); }
      strip.scrollLeft = sl - dx;
    });
    addEventListener('pointerup', () => {
      if (!down) return;
      down = false; strip.classList.remove('is-drag');
      if (moved) go(0);
    });

    // only the clip in view plays
    const io = new IntersectionObserver((es) => es.forEach((e) => {
      const v = e.target as HTMLVideoElement;
      if (e.isIntersecting && d.open) v.play().catch(() => {}); else v.pause();
    }), { root: strip, threshold: 0.6 });
    vids.forEach((v) => io.observe(v));

    d.addEventListener('close', () => { vids.forEach((v) => v.pause()); hooks.onClose?.(); });
    d.addEventListener('click', (e) => { if (e.target === d) d.close(); }); // the dimmed backdrop
    $('[data-case-close]', d)!.addEventListener('click', () => d.close());
    $('[data-case-go]', d)?.addEventListener('click', () => d.close());
  });

  document.addEventListener('click', (e) => {
    const b = (e.target as HTMLElement).closest<HTMLElement>('[data-case-open]');
    if (!b) return;
    const d = cases.get(b.dataset.caseOpen!);
    if (!d) return;
    e.preventDefault();
    $$<HTMLVideoElement>('video', d).forEach((v) => { if (!v.src) v.src = v.dataset.caseSrc!; });
    const strip = $('[data-case-strip]', d)!;
    strip.scrollLeft = 0;
    hooks.onOpen?.();
    d.showModal();
    strip.focus({ preventScroll: true });
    const first = $<HTMLVideoElement>('video', d);
    first?.play().catch(() => {});
  });
}
