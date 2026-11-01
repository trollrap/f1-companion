# 🏎️ F1 Companion App v1.4.0

Welcome to the ultimate F1 Companion App! This comprehensive app delivers race schedules, standings, driver and team profiles, historical data, comparison tools, and custom predictions.

## 🚀 Version 1.4.0 Updates & Action Plan

### 1. 🛠️ Project Management & UI Bug Fixes

* ⏸️ **MotoGP Integration Paused:** Temporarily put on hold for future releases; primary focus shifted to core F1 stability and requested features.

* 🖼️ **Home Screen Banner Fix:**

  * Removed the broken top screen container causing layout overflow across the app.

  * Restored the **in-app logo** back to its original asset/styling inside the app.

* 🤏 **Navigation Dragging:** Added support for draggable/reorderable menu selection cards (drag anywhere left or right).

* 👆 **Pull-to-Refresh Sensitivity:** Adjusted touch slope and displacement threshold to fix sensitive and annoying refresh triggers.

### 2. 📅 Standings, Paddock & Calendar Updates

* ⏳ **Calendar Session Logic:**

  * Next race banner now updates **only after the current race weekend is fully completed** (same for individual sessions).

* 🔴 **Status Badge Refresh:**

  * Replaced green "LIVE" badge with a **red** background indicator.

  * Replaced wording from "LIVE" to **"IN PROGRESS"** across calendar views.

* ⏱️ **Next Race Header Card:**

  * Added a small hero box directly above race results displaying **only the upcoming session**, session time, and a mini countdown timer.

* 🏷️ **Completed Driver Indicators:** Added a small styled box displaying the **3-letter driver code** next to the completed checkmark in current season views.

* 🗓️ **2027 Season Support:** Integrated the newly released **2027 F1 Calendar** into the season selector menu (next season option removed from standings as requested).

* 🏁 **Past Race & Track Profiles:**

  * Tapping past races opens full weekend results (where available) and historical track layout profiles.

  * Integrated Starting Grid (starting position) data into simplified race result views without cluttering strategy info.

  * Tapping the **Lap Record** opens the Qualifying session where it was set.

  * Tapping **First Grand Prix** opens the results of the inaugural race.

### 3. 🔍 Paddock & Search Enhancements

* 🔎 **Paddock Header Search Bar:** Placed a persistent search bar above the Paddock menu options (Teams & Drivers) allowing real-time filtering of everyone to view profiles, complete with filter options for `All`, `Drivers`, or `Teams`.

* 🏎️ **Paddock Card Redesign:**

  * Removed large faded logo backgrounds behind team cards.

  * Standardized team logos to display normally on the left side.

  * Moved driver line-up text directly right above the logo in a smaller font size.

* 👔 **Cadillac TP Correction:** Corrected Cadillac F1 Team Principal metadata to **Marcin Budkowski**.

### 4. 📊 Driver Profile & Season Comparison System

* 🔽 **Stats Visibility Toggle:**

  * Default driver profile view shows only the **first 2 rows** of season stats.

  * Added an expanding button positioned over the bottom shadow gradient to display all stats with an option to hide again (applies across all seasons).

* 🧑‍🔧 **Engineer Card Layout:** Reduced engineer box dimensions in current season profiles (optimized since engineer photos are not displayed).

* 📜 **Career History & Rebranding:**

  * Display past team history further below under career stats.

  * For historical team names, included a small subtle text tag indicating the **current active team name** (e.g., *"Currently [Current Team Name]"*).

* 🔢 **Past Driver Number Collisions:** Handled historical driver numbers without conflicting with current active grid numbers.

* ⚔️ **Enhanced Comparison Engine:**

  * Direct team-to-team comparisons supported in the same way as drivers.

  * Integrated a **universal driver search bar** before showing the year's grid to find any driver to ever race in F1 history.

  * Comparison routing logic:

    * **No common season:** Compares aggregate season-by-season stats side-by-side.

    * **Multiple common seasons:** Triggers season selection menu (matching standard app flow).

    * **Past season selected:** Direct comparison against the full grid of that specific historical year.

### 5. 📈 Charts, Predictions & Social Image Export

* 🔄 **Interactive Season Chart:** Enabled smooth horizontal touch gestures (swiping left/right while zoomed in) to navigate between rounds seamlessly.

* 🎯 **Enhanced Predictions Visuals:**

  * Enlarged preview cards for Pole prediction, Full Name, and Team Logo.

  * Added automated outcome verification: **Green Checkmark** on the top right for correct predictions, **Red X** for incorrect predictions once the weekend concludes.

* 📸 **Export & Download:** Added a single-tap button at the bottom of the comparison and predictions views to generate and download high-res shareable summary images.

### 6. 🌐 Localization & Greek Language Support (Beta)

* 🇬🇷 **Greek Language Option [Beta]:** Added language selection in Settings tagged with a **[Beta]** badge.

* 🗣️ **Translation Scope:**

  * All UI labels, menus, country names, session names, and push notifications switch to Greek when selected.

  * Preserved untranslated proper nouns (Team names, Driver names, Track location names, and Team Principals).

* 🔤 **Typography:** Included unicode-supported font with full Greek character set rendering.