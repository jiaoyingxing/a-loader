# A Plugins 0.4.2

This release aligns the public repository workflow and license language before the official store submission path.

## Changed

- Changed the repository license from MIT to a custom source-available license.
- Clarified that the source code is publicly available for review, but the project is not open source.
- Added a whitelist-based sync workflow for publishing from the development workspace to the public GitHub repository.
- Stopped tracking `main.js` in the public repository source tree; release builds should use GitHub Release assets.

## Note

The required installation assets remain available from GitHub Releases: `main.js`, `manifest.json`, and `styles.css`.
