# 🌍 WorldIn – Country Data Visualizer

## Project Summary

**WorldIn** is a responsive, interactive web application that visualizes global country data through clear, downloadable charts. It helps users explore detailed information—such as population, area, languages, and currencies—using public APIs and a simple, engaging interface. WorldIn is built entirely with frontend technologies and is designed to be educational, accessible, and visually informative.

---

## Core Features

- **World Dashboard**<br/>
  Displays global world statistics and 6 visual charts (e.g., population, currencies, languages).
  
- **Country Explorer**<br/>
  Select a country to view its full profile with quick facts (e.g. area, timezone, driving side), 3 comparative charts, and a Google Maps integration.
  
- **“Surprise Me” Mode**<br/>
  Takes users to a random country and displays its data and charts (similar page content to the country explorer page).

- **Expandable Chart Modals**<br/>
  View full-screen charts with options to:
  - Change chart type
  - Sort/group data
  - Download chart as PNG

- **Interactive 3D Globe**<br/>
  Homepage with interactive globe and navigation buttons linking to all core features.

---

## Technology Stack

- **Frontend**:  
  - `HTML5` – Used to structure all web pages of the application.
  - `CSS3` (Bootstrap) – Used for consistent styling and responsiveness.
  - `JavaScript (ES6)`– For app interactivity, API requests, data rendering, DOM manipulation and dynamic chart generation.

- **APIs**:  
  - `REST Countries API` – delivers comprehensive data on countries (e.g. population, area, languages).  
  - `QuickChart API` – converts data into image-based charts (PNG format).

- **Development Tools**:  
  `VS Code`, `GitHub`, `Google Maps`, `Async JS`,

  - `GitHub & GitHub Projects` – Used for version control, project board, issue tracking, and team collaboration.
  - `VS Code` – Used for development environment with built-in Git support.
  - `Async JavaScript` – Enables asynchronous API requests and smooth UI updates without blocking the page.

---

## **How It Works**

1. **Homepage & Navigation**
   Users arrive on an interactive 3D globe homepage with buttons to explore global or country-specific data.

3. **World Data Dashboard**
   - The app fetches country data (population, area, languages, etc.) from the REST Countries API.
   - Global stats and charts are generated using QuickChart API and displayed as downloadable PNGs.

4. **Country Selection**
   Users select a country to view detailed info, supporting charts, and a link to Google Maps.

5. **“Surprise Me” Feature**
   Randomly selects and displays a country’s data and charts for spontaneous discovery.

6. **Chart Interaction**
   Clicking a chart opens a modal with options to change type, sort/group data, or download it, alongside detailed insights.

---

## Outcomes & Challenges

- Successfully integrated multiple APIs into a cohesive, user-centered web app.
- Applied modern frontend techniques for modularity, responsiveness, and maintainability.
- Balanced technical constraints with UX design to deliver a functional educational tool.
- Many useful APIs lacked CORS support or required authentication, limiting integration in our frontend-only architecture.
- QuickChart only provides static images, restricting chart interactivity and dynamic user engagement (e.g. tooltips on hover).

> **WorldIn** showcases how web technologies and open data can come together to build powerful, accessible data tools—without requiring a backend.
