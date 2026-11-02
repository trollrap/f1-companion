# 🏎️ F1 Companion App — Version 1.8.0

The ultimate Formula 1 companion app for race tracking, historical statistics, driver & team comparisons, custom fantasy seasons, and multi-motorsport results.

---

## 🚀 What's New in Version 1.8.0

### 🏠 Home Screen & Customization
- **Favorites Quick-Swap Button:** Added a small swap button right next to **"Your Drivers"** on the home screen to quickly toggle between your favorited drivers and teams.
- **Default Home View Option:** Setting in preferences allowing you to choose whether **Drivers** or **Teams** load first on the home screen.
- **Custom App Accent Colors:** Customize your app's visual style with pre-selected team color themes or pick any custom accent using an interactive color picker!
- **First-Time Welcome Flow:** Added an onboarding screen for new users featuring app highlights, permission setup, and custom local username selection.
- **Improved Sports Dropdown:** Replaced the side box with a clean dropdown menu directly built into the app header logo to switch to **MotoGP** and **Football** modes.

---

### 👤 Driver & Team Profiles
- **Redesigned Champion Badge:** World Champion gold background highlights have been updated to ensure the driver's underlying official team colors stay true and authentic.
- **Enhanced Stats Fade & Layout:** 
  - Smooth shadow gradient behind the 2-row season stats preview with expand/collapse options.
  - Reordered profile sections: **Race Engineer** box is now positioned directly above **Last 5 Races**.
  - Optimized Race Engineer box dimensions.
- **Interactive Past Race Links:** Tapping a past season race from a driver profile opens the full weekend result, automatically auto-scrolls to that driver, and briefly marks them with a temporary dark highlight.
- **Favorited Past Seasons:** Favorited historical drivers and teams now display organized under a dedicated **"Past Seasons"** section. Active teams favorited from a past year auto-link to their current identity.
- **Fixed Team Stats & Rebranding:** 
  - Restored team profile season stats across all past seasons.
  - Team career overview renamed to **"Total / History"** (instead of "Career").

---

### 🔍 Search & Paddock Enhancements
- **Paddock Search Bar:** Placed a persistent search bar above the Paddock menu supporting real-time filtering (`All`, `Drivers`, `Teams`).
- **Standardized Driver Avatars:** Search results for drivers now display 1:1 formatted driver photos matching the Standings view layout.
- **Current Season Search Priority:** Current grid drivers and teams are prioritized at the top of search results.
- **Cleaned Paddock Cards:** Team logos displayed clearly on the left side, with driver lineups cleanly formatted above in a compact size.
- **Team Principal Metadata:** Corrected Cadillac F1 Team Principal to **Marcin Budkowski**.

---

### ⚖️ Comparison System & Fixes
- **Fixed Team Comparisons:** Fully restored team comparison capabilities across both current and historical seasons.
- **Universal Historical Comparisons:** Compare any driver or team across F1 history:
  - Search bar to find any driver to ever race before selecting a season.
  - **Single / Multiple Common Seasons:** Automatically opens side-by-side breakdown or common season selector.
  - **No Common Seasons:** Direct comparison of lifetime stats side-by-side.
- **Legacy Driver Numbers:** Drivers from previous eras with duplicate numbers no longer conflict with current active driver grid numbers.

---

### 🏁 Race Weekend, Results & Strategy Controls
- **Grid View Post-Qualifying:** Once qualifying concludes, the race section displays the starting grid including any applied grid penalties.
- **Post-Race Penalty Updates:** Applied post-race penalties automatically adjust final classification results.
- **Tire Strategy Toggle:** Added a toggle button to show or hide tire strategy data in race result views.
- **Fixed Calculation Errors:** Resolved all `NaN` calculation issues in timing and results tables.
- **Rich Track Profiles:** Tapping the **Lap Record** opens that qualifying session; tapping **First Grand Prix** opens the results of the inaugural race.
- **Fix for Jolpica World Champions:** Resolved HTTP 400 errors for the champions list feed.

---

### 🎮 Custom Fantasy Season Simulator & "Fun" Mode
- **Custom User Driver Profile:** Create your own driver profile with custom photo, number, team assignment, and career stats.
- **Fantasy Season Manager:**
  - Create multiple custom fantasy seasons stored locally in your database.
  - Customize grid size, team lineups, and custom calendars/races.
  - Simulate season outcomes race-by-race, session-by-session, or all at once.
- **"That's Me" Profile Option:** Set your custom profile as an active driver inside any fantasy season grid.
- **Exportable Results:** Export compact, shareable summary cards for any simulated session or race outcome.

---

### 📰 Motorsport News Feed
- **RSS News Reader:** Added a dedicated **News** button next to Paddock featuring articles from Formula 1, Motorsport.com, and reliable sources.
- **In-App Reading:** Open full news articles with inline images directly inside the app.
- **Source Notifications:** Customize push notifications per news source.

---

### 🌐 Greek Language Support (Beta)
- **Greek Localization [Beta]:** Option in Settings to set app UI language to Greek (including push notifications and country names).
- **Preserved Proper Nouns:** Driver names, Team names, Locations, and Team Principals remain in official English formatting.
- **Full Font Support:** Embedded fonts supporting Greek unicode character sets.

---

### 📊 Predictions & Comparison Image Export
- **Social Image Share:** Fixed and upgraded the **Save / Export Image** functionality for predictions and comparisons.
- **Enhanced Prediction Cards:** Larger driver preview, full name, team logo, and automated verification badges (**Green Checkmark** for correct predictions, **Red X** for incorrect) once the race weekend completes.