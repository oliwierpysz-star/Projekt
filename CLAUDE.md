# How I work and what I like

(Paste this at the start of a new project, or save it as CLAUDE.md in the project's repository.)

I'm Oliwier Pysz. I design and build high-end websites, mostly pitch demos for local businesses in Śląsk, plus my own projects (my portfolio, ChatForge AI). Talk to me in English. All client-facing copy is in Polish, in your own words: nothing copied from a client's old site beyond titles, prices and headings, and no invented facts, reviews, years or results. Prices and medical or legal claims get confirmed by the client before launch.

Past sites, for reference: my portfolio (ice/chrome on black), ChatForge AI (high-tech), NejtEvents (all-dark warm, gold), CSG Detailing (car detailing studio), Any Moto Garage (biker film), ARIA Animal Spa (Vogue magazine), ANKOR (goldsmith, engraving), Legato (music school, watercolour), Green Art (aquariums, underwater), Pracownia Solska (tailor), Estei Doktor Clinic (aesthetic clinic, carved plaster).

## Every site needs a world, a theme and a message

- One concept from the client's own world is the character of the whole site, not a style preset. Examples:
  - my portfolio froze into ice, with a dragon's eye you dive into;
  - Green Art takes you under water, through the tank;
  - Any Moto is a leather jacket patch, riding with the pack;
  - ANKOR is hand-engraved gold;
  - ARIA is a Vogue issue;
  - Legato is watercolour that comes alive;
  - Estei is drawings carved into a sunlit wall.
- A message, three words or one sentence, that the design carries. Examples: "Chłód. Precyzja. Odwaga." (portfolio), "Muzyka jest pasją, emocją" (Legato). Propose one with the concept.
- Bold choices. Commit to one strong direction and show it built. Don't hedge with safe options, and don't ask me ten questions first. If you have two real directions, build the first and describe the second in one line.
- AI images and videos to build the theme. I generate them myself (image models, Kling for video). You write precise prompts per image, with a style reference, ratio and what must stay empty for text. Cut-outs and layering are welcome: the title behind the subject, a subject standing in front of the masthead. AI images are never presented as real customers, patients, results or the client's own work.

## Hero

- Eye-catching and bold: the first screen must make someone stop.
- Ways it has worked:
  - a living picture (shader, light, wind, particles, frost the cursor wipes);
  - a film;
  - layered cut-outs with type between them;
  - something you touch (a cursor that dries fur, an inspection lamp, a glint on metal).
- Rules: the title is never buried; on phones the hero still carries the concept, rebuilt for a tall screen, not just shrunk.

## Movement and transitions

- Sections with their own moments, connected by transitions where they fit. Examples:
  - diving into the eye;
  - ice freezing over and shattering into the next part;
  - a roller shutter rolling up;
  - a curtain or arch opening into the next room;
  - the camera going deeper into the tank;
  - a hero that rinses out as you scroll on. Not every section needs one; a few calm scrolls give rhythm.
- Scroll-in animations:
  - titles rising out of their line;
  - words lighting up as you read;
  - photos revealed by wipes, masks or cut shapes;
  - numbers rolling;
  - things that react to scroll (an engine revving on a dyno).
- Something quietly alive in the background: drifting light, fine gold lines, shadows of a curtain or leaves, gold flakes. Never dead, static sections.
- One motion language per site. Effects shouldn't compete. Smooth always: measured 60 fps, nothing laggy, nothing that crashes an iPhone.
- No scroll hijacking on touch. Carousels use native scroll-snap with drag, arrows and a counter, not scroll-jacked rails.

## Look

- Dark or light, whatever fits the client. Dark is great for my portfolio, aquariums, events and nightlife; light for clinics, tailors, schools. Either way: one palette family, and the sections are shades of it flowing into each other with no seams, no lines or stripes between sections. Don't drop one heavy dark block into an otherwise light site.
- Tactile, physical materials when they fit the world: carved or engraved, pressed, paper, plaster, porcelain, leather, metal, glass, water, real light.
- Depth: layers, 3D or bent photo effects, things in front of and behind the type. No flat, boxy sections.
- Type:
  - a distinctive display face per site, often a big serif with an italic accent word, or wide or condensed caps;
  - plain readable body text;
  - pick fonts with full Polish characters (ą ć ę ł ń ó ś ź ż). If a title font looks generic I'll ask for another.
- Editorial and poster compositions: photos through cut shapes, type interacting with the image, one accent colour on B&W, hairline frames, small tracked captions as part of a composition.
- Interactive centrepiece tied to the trade. Examples:
  - a size and price picker (car detailing);
  - an engraving you type on a 3D ring (jeweller);
  - a dyno chart scroll revs (motorbikes);
  - a work-order slip that builds an SMS;
  - an area filter on a carved figure (clinic);
  - a playable demo (ChatForge).
- Actions as text: words with a thin underline and an arrow; the phone number as a plain number that reacts on hover. Real buttons or pills only where they are filters or choices, laid out as an even grid.

## What I reject (don't do)

- Generic and "AI-made" looks: card grids, glass boxes, standard buttons, the SaaS-template look; anything that "looks AI-generated, no feeling, mostly static". I've thrown out whole concepts for that.
- Stretched or oversized client photos: full-screen low-quality photos, upright Instagram photos stretched into wide banners. Portrait photos stay upright in tall frames.
- Gimmicks:
  - cursor-following hover photos;
  - big blurry particles;
  - hover zoom on everything;
  - a contents page that does nothing;
  - repeating the same illustration twice on a site.
- Fussy chrome:
  - tiny uppercase kickers or eyebrows above every title;
  - numbered section markers by reflex;
  - raised plaques when the world is carved;
  - glow on letters;
  - sticky boxes;
  - gaps;
  - lines between sections.
- Bad text and layout: long text walls (main info open, minor info in fold-outs); titles sitting too low; anything cut off at the edges (heads, letter tails, accents like Ś Ż).

## Phones have their own laws

- Title first, always; the key element (the interactive part, photo or figure) right after it.
- Compact, desktop-like compositions scaled down (photo beside heading, fields side by side, a figure beside the list it answers), not huge stacked full-width blocks.
- Small, quiet body text (~0.95–1rem), headings ~2–2.3rem, tighter section padding. One idea per screen.
- No scroll boxes inside the page, no sideways chip strips; lists show ~5 items plus "Wszystkie (N) →".
- An element that reacts to a choice stays in view next to what it answers.
- Menu in the site's own palette, centred, with the current page marked. Forms in short labelled groups; on a contact page the form comes right after the title.
- iPhone Safari closes tabs that use too much memory: no huge blurred, blended or masked layers, nothing animating constantly at 3× density.

## How we work

- Stack: Astro (static), GSAP + ScrollTrigger and Lenis when there's motion, three.js or WebGL for the big moments. Optional sound behind an entrance choice ("z dźwiękiem / bez dźwięku").
- Localhost first. Iterate there; build and zip only when I say it's finished, then overwrite the same zip.
- Verify everything yourself (screenshots at phone 390×844, desktop and 4K, plus measurements and scripts) before telling me it's done, but keep screenshots lean: I watch my usage.
- Change only what I name. When I send screenshots with feedback, answer every point.
- Launch quality:
  - PageSpeed 90+ on mobile: don't preload fonts ahead of the hero image; give phones smaller image copies; no hidden variants that still download;
  - all of the client's old addresses keep working (redirects);
  - structured data, link-preview (Open Graph) image and tags;
  - a custom 404 in the site's style;
  - the demo hidden from Google until launch.
- Ask first: before downloading or installing anything, deleting files, or sending anything on my behalf. Accounts (domain, hosting, payments) belong to the client, with me as a collaborator.
- Billing: I bill as a działalność nierejestrowana; flag anything that touches its limits.

## Inspiration

I collect references in `Pulpit/Site inspo`. They're inspiration only, never assets or generation references: editorial posters, cut-shape photo reveals, type with image, one accent on B&W, a figure between giant letters, a portrait through vertical shards.
