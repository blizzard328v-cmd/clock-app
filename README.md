# Clock

A clock web app with USA time, an optional second country clock, and alerts.

## Run it
Open `index.html` in any modern browser. No build step or server needed.

## Files
- `index.html` - page structure
- `style.css` - styles (light and dark themes, day/night colours)
- `script.js` - clocks, time zones, alerts, sound

## Notes
- Alerts ring while the page is open.
- Settings and alerts are saved in the browser (localStorage).
- The Bricolage Grotesque font loads from Google Fonts; without internet it falls back to system fonts.
- To add countries, edit the `COUNTRIES` list at the top of `script.js` (name, city, IANA time zone).
