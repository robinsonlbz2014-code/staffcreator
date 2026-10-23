# Staff & Sound

A browser-based sheet music creator for GitHub Pages. No backend, account, API key, or build step is required to run the published app.

## Features

- Whole through 64th notes and rests; single and double dots; triplet groups.
- Single notes, chords of up to eight pitches, and natural / sharp / flat / double accidentals.
- Multiple instrument parts (up to 12), treble / bass / alto / tenor clefs, 10 time signatures, and all 15 major key signatures.
- 32 instrument presets, including piano hands, strings, woodwinds, brass, guitars, mallets, and voice. Automatic written-pitch transposition and concert-pitch view preserve sounding pitch when the instrument changes.
- Click notes to edit them, insert notes before or after a selection, remove notes, undo / redo, add dynamics, articulations, ties, slurs, and lyrics.
- Multi-part playback, mute controls, online General MIDI samples, and an offline synthesized fallback. Dynamics, staccato, tenuto, accents, and ties affect playback.
- Automatic local browser saving, editable JSON project backups, and JSON project opening.
- Print / Save as PDF, MusicXML 4.0, Standard MIDI format 1, and SVG exports. Export all parts or one part.

## Publish on GitHub Pages

1. Upload this project to a new GitHub repository named `staff-and-sound` (or any name you prefer).
2. Open **Settings → Pages** in the repository.
3. Under **Build and deployment**, choose **Deploy from a branch**.
4. Select the **main** branch and **/docs** folder, then click **Save**.
5. Wait for the Pages deployment. GitHub shows the live site link on this screen.

The `docs/` folder is already built and committed. All asset paths are relative so the app works on project Pages URLs and custom domains. `.nojekyll` disables Jekyll processing. You do not need Node.js to publish or use the finished app.

## Development

Requires Node.js 20+.

```sh
npm ci
npm test
npm run build
```

Serve `docs/` with any static HTTP server, for example `python3 -m http.server 8080 --directory docs`. Use an HTTP server rather than opening `index.html` as a local file for predictable browser storage and downloads.

Source files live in `src/`. `build.mjs` bundles the JavaScript and copies the HTML, CSS, favicon, and third-party license notices to `docs/`. Rebuild and commit `docs/` after making changes.

## Writing music

Select a duration, octave, and accidental, then tap a pitch or type **A–G**. **R** adds a rest. **Space** plays/stops; **Esc** clears selection; **Ctrl/⌘ Z** undoes. Keyboard shortcuts are inactive while typing in a field.

Click a note in the preview to replace its pitch, change rhythm, or edit its details. Insert before/after adds between existing notes. Finish editing returns to appending. A triplet button adds three equal notes; select individual triplet notes to change their pitches. Deleting a triplet or changing its duration affects the group. Triplets must fit inside a bar.

Notes crossing barlines automatically split with ties. Manual ties connect consecutive identical notes or chords. Chords support pitches in multiple octaves. For piano, add separate right-hand and left-hand parts; the display shows these as separate staves. All parts start together and play in sync.

Instrument pitch shows the written notes and transposed key for each instrument; Concert pitch shows sounding notes. MIDI always exports sounding pitch, with General MIDI program changes. MusicXML includes each written part’s transposition. The Concert key control changes the key signature; it does not transpose existing notes.

## Scope and limits

This is a practical first score editor, not a full professional engraving suite. Parts display independently rather than as vertically aligned conductor systems. It does not include drums, tablature, repeats, grace notes, arbitrary tuplets, multiple rhythmic voices on one staff, minor-key selectors, MusicXML/MIDI import, or audio recording. Clefs are notation-only; changing a clef preserves pitch. Instrument ranges and physical playability are not enforced.

Slurs and fermatas print as notation marks; they do not change playback timing. Built-in instrument timbres are synthesized approximations when samples are disabled or unavailable. Online samples are optional and may take a few seconds to load.

Scores are stored in localStorage for the current browser and website origin. Clearing browser data, changing domains, or using another device does not preserve them. Download a project backup for durable storage or transfer. Project import validates supported fields, sizes, pitches, and rhythm groups.

## Dependencies and licenses

App source: MIT (see `LICENSE`). Engraving: [abcjs](https://github.com/paulrosen/abcjs) 6.7.2, MIT. Sample playback: [soundfont-player](https://github.com/danigb/soundfont-player) 0.12.0, MIT. Bundling: esbuild.

Optional instrument samples come from FluidR3 GM via [midi-js-soundfonts](https://github.com/gleitz/midi-js-soundfonts), CC BY 3.0. The app contacts the sample host only when playback with instrument samples is enabled. No score data is sent to that host. Third-party license text is included in `docs/THIRD_PARTY_NOTICES.txt`.

## Verification

`npm test` covers pitch/transposition round trips for all presets, key accidentals, notes crossing barlines, triplet durations and validation, playback ties and articulation, MusicXML written-pitch metadata, MIDI concert pitches, time signatures, and untrusted project data. The UI was also exercised in a browser for score selection, instrument transposition, note entry, and playback.
