# Photos, cars and logos

Drop files in these folders, then run `npm run media` and restart with `npx expo start -c`.
The file name is the Jolpica id (run `npm run media:ids` for the exact list). PNG with transparent background is best; JPG and WebP also work.

| Folder | What | Size (px) | Framing |
|---|---|---|---|
| `drivers/` | Driver portrait, e.g. `max_verstappen.png` | 500 x 500 (1:1) | Official portrait, facing front, chest and up, transparent background. Same framing for every driver. |
| `cars/` | 2026 car, e.g. `ferrari.png` | 1600 x 600 (8:3) | Side or three-quarter view, cut out, nose pointing right, a little empty space on all sides. |
| `logos/` | Team logo, e.g. `ferrari.png` | 512 x 512 (1:1) | Cut out, white or single-colour version works best on the dark gradients. |
| `principals/` | Team principal, named by team id, e.g. `ferrari.png` | 500 x 500 (1:1) | Same framing as the driver portraits. |
| `engineers/` | Race engineer, named by driver id, e.g. `max_verstappen.png` | 500 x 500 (1:1) | Photo only, shown on the driver's season tab. |
| `numbers/` | White driver number, named by driver id | about 876 x 455-709 | Transparent PNG, shown in the driver profile and Paddock card. |
| `app/logo.png` | The app logo (top left of every screen) | any, wide or square | Transparent PNG. |

Missing files are fine: the app shows a team-coloured gradient with the driver number or team initials instead.
