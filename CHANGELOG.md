# Changelog

All notable changes to this web installer should be documented in this file.

## 0.0.1

- Restored the step-by-step installer flow and refined the UI styling.
- Added keyboard layout selection as a required step for on-screen keypad installs.
- Fixed locale persistence so selected layouts do not collapse to Korean and English only.
- Improved Bluetooth scan and pairing flow for random-address BLE keyboards.
- Added cleanup of Bluetooth pairing data during full uninstall.
- Fixed uninstall so font preservation is respected when the user chooses to keep the font.
- Improved firmware-update recovery flow by restoring before `xochitl` starts and by stopping `xochitl` before repatching when needed.
- Added GitHub bundle preparation script for publishing a webapp-only source bundle.
