# Learn

Free courses, each one deck of slides, behind the `learn` feature flag and one flag per course
(`learn-brain-modeling`, `learn-python`, `learn-electrical-physics`).

- `/app/virtual-lab/<lab>/<project>/learn`: the Learn page (`ui/learn-page.tsx`), reached from the
  project's top menu. `?course=<id>` picks the course on show, which comes with one of its figures,
  live (`preview` in the catalogue, drawn by `ui/course-preview.tsx`).
- `/app/learn/<id>?from=<Learn page>&slide=<n>`: a course, full screen, outside the project's
  chrome. `from` is where it leads back to; `slide` resumes it.
- `catalogue.ts` lists the courses; `slides/` holds each one's slides.
- `progress.ts` keeps where the learner got to in localStorage (`learn/progress/v1`), until progress
  has a home on the platform.
- Thumbnails are in `public/images/learn/`, and the 3D figure's data is in
  `public/static/learn/heuristics/`. `fonts.ts` loads the courses' typefaces.

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
  page. The opening, its choices, and the widgets and cortex figure these courses never show are
  gone.
- Only the Python and electrical physics figures are registered.
- The Python figure renders its side panels as components, which the React Compiler needs.
- A few lines are rewritten for Biome's rules, without changing what they do.
