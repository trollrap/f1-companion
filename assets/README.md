# Photos, cars and logos

Drop files in these folders, then run `npm run media` and restart with `npx expo start -c`.
The file name is the Jolpica id (run `npm run media:ids` for the exact list). PNG with transparent background is best; JPG and WebP also work.

| Folder | What | Size (px) | Framing |
|---|---|---|---|
| `drivers/` | Driver portrait, e.g. `max_verstappen.png` | 500 x 500 (1:1) | Official portrait, facing front, chest and up, transparent background. Same framing for every driver. |
| `cars/` | 2026 car, e.g. `ferrari.png` | 1600 x 600 (8:3) | Side or three-quarter view, cut out, nose pointing right, a little empty space on all sides. |
| `logos/` | Team logo, e.g. `ferrari.png` | 512 x 512 (1:1) | Cut out, white or single-colour version works best on the dark gradients. |

Missing files are fine: the app shows a team-coloured gradient with the driver number or team initials instead.
