# Legal audit and checklists

This is a practical engineering audit, not legal advice. Before launching to the public (or charging money), have a lawyer in your country read it. Audit date: 28 Oct 2026, against the code in this project.

## Result for the six risks

| # | Risk | Applies to the app today? | Status |
|---|---|---|---|
| 1 | Age gate at signup | Yes since v10: the optional local profile asks for a date of birth first. No accounts or servers. | Built to the spec below: neutral screen, DOB not stored, result stored, block persists. Threshold is `MIN_AGE = 16` in `src/lib/age.js`; confirm the policy with a lawyer. Set the store age rating to match. |
| 2 | Self-hosted fonts | The app: already done. The HTML preview page: it loaded Google Fonts. | App bundles Rajdhani, Chakra Petch and Exo 2 from npm packages (`@expo-google-fonts/*`), so no request to Google at runtime. The preview page now embeds the fonts too (fixed 29 Oct). |
| 3 | Session replay | No. No analytics, crash reporter, ad SDK or recorder (checked `package.json`, `app.json` and `src`). | Nothing to fix. If you add one later, see below. |
| 4 | Marketing email: unsubscribe link and postal address | No. The app collects no email address. | Nothing to fix now. Footer template below. |
| 5 | Renewal term next to the subscribe button | No. There are no purchases or subscriptions. | Nothing to fix now. Rules below. |
| 6 | DMCA agent | Not yet. It matters once users can upload or post content (profile photos, comments). | Walkthrough below. |

What the app does send over the network: requests to OpenF1 and Jolpica for race data (those services can see the device IP address). Favourites, notification choices and cache stay on the device. In-app text for this is in Settings > Legal and privacy. For the store privacy forms this means: no data collected by the developer.

## Bigger risk than the six: F1 intellectual property
- "F1", "Formula 1", team names and logos, driver names in a logo style, and official photos are trademarks or copyrighted works of Formula One group companies, teams or photographers. A fan app that uses them can be rejected by the app stores or receive a takedown.
- Do not use the F1 logo or team logos unless you hold a licence. Do not use official or press photos you did not license. Plain text names of drivers and teams to identify them is the normal fan-app practice; images are the high-risk part.
- The working title "F1 Companion" uses the F1 mark. Before publishing in a store, pick a name that does not contain F1 or Formula 1 (for example "Grid Companion"), and keep the "unofficial, not affiliated" notice (already in the app).
- For the photos and logos you plan to add: use only images you own, have a written licence for, or that are explicitly free to use (and keep the licence). Cars and drivers photographed by you are fine. Keep a list of where each image came from.
- API terms: I could not read OpenF1's or Jolpica's full terms of use from my environment. Read both before any commercial use (ads, subscriptions) and follow any attribution rule. The app already credits both on the Legal screen.

## Profile feature (built in v10 as local-only; spec kept for any online version)
**Age gate (risk 1).** Put it before collecting any personal data.
- Ask for date of birth (or "year of birth") with a neutral screen: no pre-filled value, no hint of the required age, no "you must be 13".
- Thresholds: under 13 blocks signup in the US (COPPA); in the EU the age of digital consent is between 13 and 16 depending on the country, so a safe rule is "16 or older, or 13 plus parental consent where the country allows". Choose one policy with a lawyer.
- If under the limit: show a polite block, store nothing about the person, and remember on the device that the gate failed so that going back and changing the date does not work.
- Store only the result ("age confirmed") and not the birth date, unless you need it.
- Also set the store age rating and the declared audience to match.

**Session replay (risk 3), if you ever add analytics.** Prefer no replay at all. If you use it: ask for opt-in consent first, mask every input and every profile screen by default, never record password or email fields, list the tool and its purpose in the privacy policy, and sign the vendor's data processing agreement.

**Marketing email (risk 4).** Every marketing email needs: a one-click unsubscribe link that works for at least 30 days, a valid postal address of the sender (street address or registered P.O. box), an honest sender name and subject, and a clear note that it is marketing. Honour an unsubscribe within 10 business days (US CAN-SPAM). In the EU and UK collect opt-in consent first and keep a record of it. Footer template:

    You get this email because you signed up at <app name>.
    Unsubscribe: <one-click link>
    <Company or your name>, <street address>, <postal code> <city>, <country>

**Subscriptions (risk 5).** Next to the subscribe button, in readable size, show: price, billing period, that it renews automatically until cancelled, and how to cancel. Example: "EUR 2.99 per month, renews every month until you cancel. Cancel anytime in Settings." Apple and Google require this too, and several US states and the EU have auto-renewal rules. Rules change often, so check them when you build it.

## Walkthrough: register a DMCA designated agent (risk 6)
Only needed when your service stores content that users upload or post. It gives you the "safe harbor" in US law (17 U.S.C. 512(c)): you are not liable for users' infringing uploads if you follow the takedown process. Details below are as of my knowledge; check the current form and fee on the US Copyright Office site.
1. Decide who the "service provider" is: you personally, or your company. It is the legal name that appears in the directory.
2. Go to the Copyright Office DMCA Designated Agent Directory (dmca.copyright.gov) and create an account.
3. Register the service provider: legal name, every other name the service is known by (app name, website domain), and a physical address.
4. Designate the agent: a person or a role such as "Copyright Agent", with postal address, phone and email. A role-based email address (for example copyright@yourdomain) is better than a personal one.
5. Pay the registration fee (about USD 6 at the time of writing) online.
6. Publish the agent's name or role, address and email where the public can find it, for example on a Copyright page linked from the app and from the store listing.
7. Put a repeat-infringer policy and a takedown process into your Terms: how to send a notice, what you do (remove quickly, tell the uploader), and how the uploader can send a counter-notice.
8. The designation expires after 3 years. Put the renewal date in your calendar, and update the entry whenever the agent's details change.
9. Keep a log of notices and what you did.
