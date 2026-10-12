# Learn

Free courses, each one deck of slides, with a glossary, teaching material, tutorials and outside
sources: lectures (World Wide Neuro), literature (Europe PMC), articles (The Transmitter), and
conferences and workshops. All behind the `learn` feature flag.

Learn's own settings (`learn-settings.ts`) are set from the Dev settings gear on the Learn page and
kept in the `learn-settings` cookie, so that pages render with them on the server:

- the courses the page leaves off;
- Help made lean (`leanHelp`): without its Overview, Tutorials, Glossary and AI Chat Tools, which
  Learn now covers or does without (`src/ui/segments/help/lean.ts`);
- Help hidden altogether (`hideHelp`): no Help button in the top menu, and no Help page.

The cookie keeps only what differs from the defaults, and is written from the browser, so a change
shows at once. The Help settings are off by default, so that without them Help is as it is. The Dev
settings' Sections and Appearance options are TEMPORARY, kept in the URL, for judging the page's
designs.

Two more platform changes Learn tries out are feature flags of their own, off by default:

- `ai-button`: the AI assistant opened from a round "AI" button in the top menu, rather than its side
  rail;
- `course-toolbar`: the top bar drawn in the style of the courses' bar.

## Pages and files

- `/app/virtual-lab/<lab>/<project>/learn`: the Learn page (`ui/learn-page.tsx`), reached from the
  project's top menu. `?course=<id>` picks the course on show, which comes with one of its figures,
  live (`preview` in the catalogue, drawn by `ui/course-preview.tsx`).
- `/app/learn/<id>?from=<Learn page>&slide=<n>`: a course, full screen, outside the project's
  chrome. `from` is where it leads back to; `slide` resumes it.
- `catalogue.ts` lists the courses: three in development, and the rest under Rough / Misc.
  `slides/` holds each one's slides.
- `progress.ts` keeps where the learner got to in localStorage (`learn/progress/v1`), until progress
  has a home on the platform.
- The figures' data (about 7 MB: the 3D figure's meshes and neurons, and the validation course's
  pictures and films) is in `public/static/learn/`. `fonts.ts` loads the courses' typefaces.

## Copied from the learn app

`components/` and `lib/` are the learn app's own (`src/components`, `src/lib`), with `@/` imports
moved under `@/features/learn/`, Biome's formatting and these changes:

- The settings and the theme live on the course's root (`[data-learn-root]`), not on `<html>`, and
  OBI's look is the default. `src/styles/learn.css` is the learn app's `globals.css`, scoped to
  that root.
- The figures' full-page canvases are portalled into the root, which stacks its own layers.
- A figure shown outside its course, inside `Embedded` (`components/embedded.ts`, the one file
  added), keeps to its box whatever the spill setting, and leaves the arrow keys to the page.
  `.learn-figure` styles it in the OBI theme, at the page's own rems.
- The walkthrough opens on a given slide, reports each slide it shows, and leads back to the Learn
  page. Its opening and that opening's choices are gone.
- Only the figures these courses use are registered (`components/courses/registry.ts`).
- The Python figure renders its side panels as components, which the React Compiler needs.
- A few lines are rewritten for Biome's rules, without changing what they do.
