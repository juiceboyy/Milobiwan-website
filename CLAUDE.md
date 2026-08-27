# Milobiwan (Mieke) – Dichteres & Spoken Word Website

Website voor Milobiwan (Mieke), dichteres en spoken word artiest die schrijft en voordraagt in Sranantongo, Nederlands en Engels.

## Tech Stack & Architectuur
- **Frontend**: Semantische HTML5, Modulair CSS3 (Custom Properties, CSS Grid, Flexbox, Container Queries), Vanilla ES6+ JavaScript.
- **Audio**: Web Audio API & Custom Spoken Word Ambient / Audio Visualizer Engine.
- **Typografie**: Google Fonts (Cormorant Garamond, Plus Jakarta Sans).
- **Iconen**: Lucide Icons met async load guard.
- **Design Sfeer**: Warme aardetinten, terracotta, diep cacao, goud- en jadelichtjes, Surinaamse cultuurelementen en odo's.

## Ontwikkelrichtlijnen & Regels
- **Bestandsgrootte**: Geen enkel bestand mag groter worden dan 300 regels. Proactief modulariseren indien nodig.
- **DOM Initialisatie**: Gebruik altijd de veilige DOMContentLoaded guard:
  ```javascript
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
  ```
- **Git Push**: Wijzigingen worden automatisch gecommit en gepusht naar de actieve git branch (`test`/`dev` of `main`).

## Lokaal Testen
- Start een lokale webserver:
  ```bash
  npx -y serve .
  # of
  python3 -m http.server 8080
  ```
