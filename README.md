# v4: the page is a shot

The whole portfolio behaves like a scene in an animation package. Scrolling moves the
playhead, each section is a key, and the hero is a live IK rig.

Local: <http://localhost:4173/> (the previous site lives in `v4/`)

```
./
  index.html          all content (edit text here)
  css/style.css       design tokens at the top (:root)
  js/main.js          every interaction, split into numbered sections
  img/                originals
  img/web/            optimized WebP copies the site actually loads
  cv/                 Oguz_EMIR_Resume.pdf
```

## What's in it

| Section | Idea |
| --- | --- |
| Loader | counts frames 0000 → 0024, then wipes up (once per session) |
| Hero (SH000) | a FABRIK IK chain with bend limits that chases the cursor (or your finger). Skin / Joints / Wire display layers. The name letters sit on springs, drop in with overshoot and react to the mouse |
| Timeline HUD | fixed at the bottom. Scroll = playhead, sections = keyframes. Drag the ruler to scrub, click a key to jump, **Space** plays the page, **, / .** jump to the previous / next key, 0.5× / 1× / 2× speed |
| Character sheet (SH010) | portrait and a Maya-style Outliner |
| Shots (SH020) | the seven games, each with its store link |
| Dopesheet (SH030) | career as tracks on a time ruler with a "now" line. Click a track to expand it |
| Channel box (SH040) | skills, each with a small animation curve and a ball riding it |
| Playground (SH050) | a working graph editor: drag the tangents, and the ball shows spacing with onion skin, squash & stretch and arcs |
| Awards, Contact | education (featured), the two award projects, email copy button, socials, CV |

## Notes

- There's no build step and no framework. Fonts come from Google Fonts.
- `prefers-reduced-motion` is respected: no loader, no springs, and the rig renders one still pose.
- After editing CSS/JS, bump `?v=` on the two links in `index.html` so browsers don't serve an old cached copy.
