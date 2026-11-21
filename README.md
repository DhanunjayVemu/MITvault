# PYQvault — MIT Manipal Previous Year Questions

A searchable PYQ archive built with Next.js (App Router) and Tailwind CSS,
styled after [component.gallery](https://component.gallery), with a
light/dark theme toggle.

## Getting started

```bash
npm install
npm run dev
```

Then open http://localhost:3000.

## Editing the papers

All subjects and paper links live in `data/pyq-data.ts`. Each semester has a
list of subjects, and each subject has a list of papers:

```ts
{ code: "CS204", name: "Design & Analysis of Algorithms", papers: [
  { year: "2024", exam: "End Sem", url: "https://.../cs204-2024-endsem.pdf" },
] }
```

Replace `url: "#"` placeholders with real links — either hosted files (Drive,
S3, Supabase storage, etc.) or local PDFs dropped into `public/papers/` and
referenced as `/papers/filename.pdf`.

## Theme

Colors are defined as CSS variables in `app/globals.css` — light values on
`:root`, dark values on `.dark`. `components/ThemeToggle.tsx` flips the
`dark` class on `<html>` and remembers the choice in `localStorage`. A small
inline script in `app/layout.tsx` applies the saved (or system) theme before
paint, so there's no flash of the wrong theme on load.

## Structure

- `app/layout.tsx` — fonts (Instrument Serif, Instrument Sans, JetBrains Mono), theme-init script, metadata
- `app/globals.css` — light/dark color tokens and design tokens
- `components/HomeClient.tsx` — page state: selected semester + search, background grid
- `components/PathBreadcrumb.tsx` — the file-path line that appears once a semester is picked
- `components/SemesterTabs.tsx` — the Sem 1–8 selector boxes
- `components/SubjectCard.tsx` — one subject with its paper links
- `components/ThemeToggle.tsx` — light/dark switch
- `data/pyq-data.ts` — all content

## Build

```bash
npm run build
npm start
```
