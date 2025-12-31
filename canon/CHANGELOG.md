# Changelog

## 2025-12-31

### Fixed
- Node dragging now correctly tracks cursor position. Previously, nodes would "run away" from the pointer because drag calculations used raw viewport coordinates instead of converting to SVG viewBox coordinates. Added `clientToSvg` helper function to handle the coordinate transform.
