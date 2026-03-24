Original prompt: Build an advanced 2D physics-based track builder and rider game inspired by Line Rider, but significantly more powerful, modern, and feature-rich. Since then, the project has been iterated toward a black-and-white classic Line Rider feel with cleaner tools, better camera behavior, reusable teleport portals, configurable gravity zones, crash ejection, and more readable vehicle/rider visuals.

- Completed: Modular HTML/CSS/JS canvas app with editor, vehicles, physics modes, powerups, replay, save/load, and GitHub/Vercel readiness.
- Completed: Restyled from Tron-like UI to black-and-white minimal aesthetic.
- Completed: Added rider attached to vehicles, crash ejection, improved pan tool, first-run walkthrough, auto-follow on play, and removed duplicate/unused controls.
- Completed: Teleport nodes now act as reusable portals instead of one-time pickups.
- Completed: Gravity zones are being made more editable from the UI, and trigger tooling is being removed as redundant.
- In progress: Tightening contact behavior so propulsion only happens on real line contact and improving vehicle/character rendering to feel less abstract.
- Testing: `node --check` has been used repeatedly for syntax verification. Playwright-based validation availability is being checked via the local `develop-web-game` skill workflow.

TODO / next suggestions:
- Playtest the updated contact logic in-browser to confirm hover-propulsion is fully gone and slope riding still feels good.
- Consider removing backend trigger processing/rendering/data model entirely now that the UI tool is gone.
- Consider adding inline labels/help text for gravity zones and teleport portals directly on the canvas when selected.
