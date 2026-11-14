TerraTrace 🛰️

Satellite Evidence for Smarter Industrial Siting

TerraTrace is a web-based geospatial platform intended to help users explore industrial facilities worldwide, investigate environmental conditions around them, and eventually evaluate locations for new industrial and energy projects using satellite-derived evidence.
This repository currently contains the interactive frontend and global facility explorer. Satellite monitoring analyses and site-suitability recommendations are planned modules and are not yet operational in the supplied version.

Frontend & Integration

My responsibility in the TerraTrace team is the frontend interface, interactive visualization, user experience, and integration of future analytical modules. The current implementation focuses on making the underlying facility inventory accessible through an interactive map and providing an interface into which monitoring and site-selection capabilities can later be integrated.

Current implementation

Interactive global facility map

Displays worldwide power-generation and industrial facilities on a zoomable map.

Uses React Leaflet / Leaflet and Esri World Street Map tiles.

Groups nearby facilities into numbered, color-coded clusters to manage dense map regions; zooming in separates facilities.

Shows cluster breakdowns by facility type and individual facility information, when available, including name, operational status, capacity, starting year, operator/owner, dataset, IDs, coordinates, and a source link.

Provides a facility-type legend with clickable category toggles and a live count of visible map markers.

Search and geolocation

Searches locations using OpenStreetMap Nominatim.

Accepts geographic coordinates in decimal degrees and supported degrees–minutes–seconds notation.

Moves/zooms the map to the selected result, places a location pin, and displays its label and coordinates.

Displays returned polygon boundaries where available; otherwise uses the location's bounding box.

Performs reverse geocoding for coordinate searches when available.

Filters and counts

The collapsible sidebar supports:

Facility category: 16 facility classes, including solar, wind, coal power, oil/gas power, hydropower, nuclear, bioenergy, geothermal, iron and steel, cement and concrete, chemicals, coal mining, LNG terminals, oil/gas extraction, iron ore mining, and coal terminals.

Facility status: operating, under construction, pre-construction, announced, retired, mothballed, cancelled/shelved, and unknown/other.

Power capacity: under 50 MW, 50–250 MW, 250–1,000 MW, or above 1,000 MW. Capacity filters apply to power facilities; industrial production-capacity units are not compared against MW.

Country: searchable, multi-select country list.

Counts: overall matching facility count and a filtered breakdown by facility category; these are based on records rather than the number of clustered map markers.

The initial filter configuration selects India, Operating facilities, all facility types, and all capacity ranges. Users can change these selections.

Interface and navigation

Introductory welcome dialog explaining the project and basic usage, with a Next button to enter the map.

Top-bar Monitor and Explore dropdowns.

Collapsible filter sidebar, loading state, error message for missing/invalid facility data, and responsive styles in the supplied CSS.

Planned modules (not yet implemented)

The following are visible in the interface as disabled “Soon” options. They do not currently run satellite analysis or site-suitability calculations.

Monitor — satellite environmental indicators	Explore — new-project siting

Air pollution (NO₂)	Nuclear power plant

Getting started
Prerequisites
Node.js and npm (use a current Node.js version compatible with Vite 8; verify with `node --version`).
Internet access for map tiles and Nominatim location search.
Run locally
```bash
# From the TerraTrace project directory
npm install
npm run dev
```
Open the local URL displayed by Vite in the terminal (typically `http://localhost:5173`).
Other commands
```bash
npm run lint       # Run Oxlint
npm run build      # Build the production application into dist/
npm run preview    # Preview the production build locally
```
Important: Keep `public/data/facilities.json` in place. The app fetches it from `/data/facilities.json` and checks for schema version 3, matching facility-type order, and matching status order. An absent or incompatible file displays a data-loading error. No environment variables are required by the inspected frontend code.
How to use
Start the application and select Next on the TerraTrace welcome dialog.
Use the left-hand filters to choose countries, facility types, statuses, and power-capacity ranges.
Pan and zoom the map; click numbered clusters to view their type breakdown or zoom in to see individual facilities.
Click an individual facility marker to review its available details and source link.
Use the map search to find a place or enter coordinates, then inspect its mapped boundary.
Open Monitor or Explore to see planned environmental and siting modules; these options are currently informational placeholders.
Project structure
```text
TerraTrace/
├── index.html
├── package.json
├── package-lock.json
├── vite.config.js
├── .oxlintrc.json
├── public/
│   ├── data/
│   │   ├── facilities.json          # Runtime facility inventory (schema v3)
│   │   ├── *.csv                    # Additional supplied data/reference files
│   │   └── *.xlsx                   # Additional supplied tracker workbooks
│   ├── favicon.svg
│   └── icons.svg
├── src/
│   ├── App.jsx                      # Map, search, filters, popups, menus and UI state
│   ├── App.css                      # Application interface styling
│   ├── index.css                    # Global styling
│   ├── main.jsx                     # React application entry point
│   └── assets/
└── README.md

Esri World Street Map for basemap tiles (attribution is displayed by the map layer).
Source tracker files included in the archive should retain their own applicable source and licensing acknowledgments, including relevant Global Energy Monitor tracker credits.
---
Current project stage: Functional frontend facility-exploration prototype; satellite monitoring and industrial site recommendations are in development.
