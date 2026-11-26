# Media fetch: driver photos and team logos

Finds a portrait for every driver and an official logo for every team on **Wikidata / Wikimedia Commons**, cuts the drivers out (transparent background, chest-up, 1:1 500x500) and fits logos into a transparent square. Every photo is checked: a face finder frames the head at the same size for everyone, and cars, groups, photos with two people and wrongly cut pictures are rejected (another photo of the same person is tried instead, preferring one from their racing years). Nothing is guessed from search results: a driver is accepted only when the Wikidata person has the **same birth date** as in the app's history data, and a team only when Wikidata has an official **logo file** for it (so no random photos or cars).

## Run it (on your PC, from the project folder)

```
npm run media:remote -- --limit 5     # small test first (about 5 drivers + 5 teams), the first install downloads ~300 MB
npm run media:remote                  # then everything that has no picture yet (long; it can be stopped with Ctrl+C and resumed)
```
Open `tools/media-fetch/out/review.html`. Orange cards need a closer look. To reject a picture, add its id to `tools/media-fetch/reject.txt` (one per line) or delete its png from `out/drivers` / `out/logos`.

```
npm run media:publish                 # copies the approved pictures to remote-media/ and writes remote-media/index.json
git add -A
git commit -m "media"
git push
```
The app reads `remote-media/index.json` from GitHub (raw.githubusercontent.com, main branch) and downloads each picture the first time it is shown; no APK build and no `eas update` needed for new pictures (only for this app version itself).

Options: `--drivers`, `--logos`, `--since 1990`, `--only max_verstappen,ferrari`, `--all-drivers` (also drivers that already have a photo in assets/drivers, normally skipped), `--redo`.
`npm run media:publish -- --replace-logos` makes the published logos replace logos you already have in `assets/logos` (otherwise your own files win).

## Notes
- Drivers with no free photo on Wikidata stay without one (the app keeps its number/initials design). They are listed under "Not found" in the review page.
- Old photos are often black and white or low resolution; cut-outs of them can be rough, which is what the review is for.
- Licences differ per file (see `remote-media/CREDITS.json`). Fine for a private app; check before publishing anywhere public.
- `node selftest.js` checks the picture logic offline.

## Pictures it could not find (add them yourself)
After every run the tool writes `tools/media-fetch/out/missing.md` and `missing.csv`: every driver and team without a picture, newest drivers first, with the exact file name to use and a Commons search link.
To add one: save any photo (the background is cut out for you) as `tools/media-fetch/manual/drivers/<id>.png` (logos: `manual/logos/<id>.png`), then run `npm run media:remote` and `npm run media:publish` again. Your own files always win over downloaded ones. A finished transparent square picture can be named `<id>.keep.png` to be used untouched.
The phone can also share a list: Settings > About and data > Missing pictures (only what that phone has looked at so far).

## Face finder
`facenet.js` + `vendor/face-rfb-320.onnx` (Ultra-Light-Fast-Generic-Face-Detector, MIT) runs on the same onnx runtime as the cut-out engine; `vendor/pico.js` + `vendor/facefinder` (pico, MIT) is the simple fallback. Both work offline.

## After a tool update
When the picture rules change (`RULES` in fetch.js) the first run redoes every picture once. Publishing then also takes down pictures that are now rejected or unusable.
