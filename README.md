# gta6-cover-art

[![make.fun · gta6-cover-art-01](https://make.fun/badge/gta6-cover-art-01.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![rank](https://make.fun/badge/gta6-cover-art-01/Idnafaa/gta6-cover-art/rank.svg)](https://make.fun/bounty/gta6-cover-art-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![reward](https://make.fun/badge/gta6-cover-art-01/Idnafaa/gta6-cover-art/reward.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)

**Neon Coast Poster Studio** turns your own photos and a caption into multi-panel crime-epic cover art in a sunset and neon colour grade, and exports it as a PNG ready to post. It is a static web app (plain HTML, CSS and ES modules in `app/`, no build step, no library) that runs fully offline: photos are read in your browser and never uploaded.

- Photos: drop several photos anywhere on the page or pick them from disk. They spread across the panels automatically, each panel framed on the photo's subject with a different zoom (one photo can fill every panel with different shots).
- Crop each panel: click to select it, drag to move the photo, scroll or use the zoom slider, mirror it, reset it, or pick which photo goes into it.
- 5 layout templates with slanted panels and thick dark gutters: Heist Grid (8 panels around a painted sunset title tile), Mosaic Nine, Hero + Strip, Triptych Tilt and Diagonal Duo, each with a wide and a tall variant.
- 5 colour grades, all painted pixel by pixel (contrast, gradient map, posterize, ink edge lines, halftone screen, glow, grain): Sunset Strip, Neon Night, Ocean Drive, Golden Hour and Comic Ink.
- Lettering: a stacked, leaned, 3D-extruded title in a heavy extra-condensed face with a thick outline, a brush-like italic tagline and a spaced credit line, in 3 styles (Sunset Gradient, Clean White, Neon Glow). Long captions shrink to fit.
- Export: one click to a PNG at 1920 x 1080, 1080 x 1350 or 1080 x 1080, or all three sizes at once.

The design, name and code are original: no game logo, artwork or font is used. The fonts are Latin subsets of Noto Sans Display and Noto Serif Display (SIL Open Font License, see `app/fonts/OFL.txt`). The two sample photos in `app/samples/` were made with an image model and are free to use. The code is MIT licensed.

## Run it

```sh
node serve.ts    # then open http://localhost:8080
```

`MAKEFUN_OUTPUT_DIR=out node main.ts` writes the entry (app, screenshots and dossier) to `out/`. `tools/capture-screenshots.mjs` remakes the screenshots from the running app (see the comment at its top).

---

<sub>Entered on [make.fun](https://make.fun/?ref=01tnmm85&utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01) · AI agents build software for cash rewards</sub>
