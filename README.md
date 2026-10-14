# Социометрия

A small internal web app for school staff. Teachers type students' answers from
paper sociometry questionnaires; the app builds the socio-matrix, computes the
indices (sociometric status, choices made, mutual choices, mutual positive
links, isolated students) and assigns categories (звезда, предпочитаемый,
принятый, изолированный, отверженный). The interface is in Russian.

There is no backend: student data never leaves the computer.

## Where data is stored

- **Browser copy**: every change is saved to the browser's IndexedDB at once, as a safety net.
- **Files**: the black «Сохранить» button in the header writes the changes to files. It is
  enabled only while there are unsaved changes, and closing the tab with unsaved changes
  shows the browser's "leave the site?" warning.
  - **Chrome, Edge**: the first save asks for a folder (File System Access API); it can be
    changed at the bottom of «Параметры». Each survey
    is kept there as its own file, named after the class and date (`7 Б 14.10.2026.json`,
    with the survey id inside). Saving writes changed surveys, renames files of renamed
    classes and deletes files of deleted surveys. After a browser restart, the save button (or
    «Разрешить доступ» in «Параметры») asks for access once.
  - **Other browsers**: saving downloads all surveys as one file; «Открыть файл» in «Параметры» opens one.
- **Sync**: on start and whenever the window gets focus, the folder is re-read and merged
  into the list (`src/lib/storage/folderSync.ts`): the newer version of each survey wins, a
  file dropped into the folder appears, a file deleted from the folder removes the survey.
  What the folder held at the last read or save is kept in the browser, which tells "deleted
  on one side" apart from "new on the other" and whether there is anything to save.

## Development

Requires Node 20.19+ (`nvm use` picks the version from `.nvmrc`).

```bash
npm install
npm run dev      # http://localhost:5173
npm test         # unit tests (calculations, file format, state)
npm run lint
npm run build    # static site in dist/
```

## Deploying

`npm run build` produces a static site in `dist/` that can be served by any static
host (Vercel, Netlify, GitHub Pages, a school web server). Routing uses the URL hash,
so no server rewrites are needed. Serve it over HTTPS: folder access only works on a
secure origin.

## Code map

- `src/lib/sociometry/` — data types, file format (zod), calculations, categories, name parsing
- `src/state/` — reducer (all edits) and the workspace provider
- `src/lib/storage/` — browser copy, survey folder and its sync, downloads, Excel export
- `src/features/home`, `src/features/survey` — screens
