SHAPE TAP DELUXE - COMPLETE VERSION (Tiers 1-4)
===============================================

This is the full-featured version with ALL enhancements including campaign mode,
advanced physics, daily challenges, and Progressive Web App (PWA) support.

FILE STRUCTURE:
---------------

📄 index.html           - Main HTML file (clean, references external files)
📁 css/
   └── styles.css       - All styles with glassmorphism and animations
📁 js/
   └── game.js          - All game logic and mechanics
📁 assets/
   ├── icon-192.png     - PWA icon (192x192) - Generate using generate-icons.html
   ├── icon-512.png     - PWA icon (512x512) - Generate using generate-icons.html
   └── generate-icons.html - Tool to create app icons
📄 manifest.json        - PWA manifest for installability
📄 sw.js                - Service worker for offline functionality

FEATURES INCLUDED:
------------------

✅ Tier 1: Visual Feedback & Polish
   - Screen shake, particle effects, combo display
   - Volume control, enhanced UI/UX
   - Glassmorphism design, animated backgrounds

✅ Tier 2: Power-ups & Game Modes
   - 4 power-ups: Freeze, Slow, Double Points, Time Extend
   - Special shapes: Golden, Bomb, Rainbow
   - 4 game modes: Classic, Endless, Zen, Speed Run
   - Progression system with levels and XP

✅ Tier 3: Social & Customization
   - Share scores, customization shop
   - Themes (Ocean, Fire) and particles (Stars, Hearts)
   - Critical hits, analytics dashboard
   - Mobile haptic feedback

✅ Tier 4: Campaign & Physics
   - 50-level campaign mode with star ratings
   - Advanced physics: shape collisions, portals, gravity zones
   - Daily challenges with seeded procedural generation
   - Obstacle mechanics

✅ PWA Features:
   - Installable on mobile and desktop
   - Offline play support via service worker
   - App manifest with icons and shortcuts
   - Responsive design for all screen sizes

HOW TO GENERATE ICONS:
----------------------

1. Open assets/generate-icons.html in your browser
2. Right-click on the 192x192 canvas and "Save image as..." → icon-192.png
3. Right-click on the 512x512 canvas and "Save image as..." → icon-512.png
4. Save both images to the assets/ folder

RUNNING THE GAME:
-----------------

For local development:
→ Open index.html directly in your browser, or
→ Use a local server (recommended for PWA features):
  - Python: python -m http.server 8000
  - Node.js: npx http-server
  - VS Code: Live Server extension

For PWA installation:
→ Serve via HTTPS (required for service workers)
→ Browser will show "Install App" option

RESPONSIVE DESIGN:
------------------

The game automatically adjusts for:
- Mobile devices (portrait mode optimized)
- Tablets
- Desktop screens
- Different viewport sizes

Canvas sizing:
- Max height: 60vh on desktop, 50vh on mobile
- Width: Scales proportionally
- Scrollable interface for small screens

TECHNICAL NOTES:
----------------

- All game state persists in localStorage
- Physics runs at 60 FPS
- Elastic collision detection for shape interactions
- Seeded random for reproducible daily challenges
- WebAudio API for sound effects
- Touch and mouse input supported

BROWSER COMPATIBILITY:
----------------------

Tested on:
- Chrome/Edge (recommended)
- Firefox
- Safari
- Mobile browsers (iOS Safari, Chrome Mobile)

PWA features require modern browser with:
- Service Worker support
- Web App Manifest support
- HTTPS for installation

PERFORMANCE:
------------

Optimized for smooth 60 FPS gameplay on:
- Modern smartphones (2018+)
- Tablets
- Desktop/laptop computers

For best performance:
- Close unnecessary browser tabs
- Enable hardware acceleration
- Use latest browser version

TROUBLESHOOTING:
----------------

Game not loading?
→ Check browser console for errors
→ Ensure all files are in correct folders
→ Clear browser cache and reload

PWA not installing?
→ Serve via HTTPS (localhost works for testing)
→ Ensure icons exist in assets/ folder
→ Check manifest.json is accessible

Performance issues?
→ Lower difficulty setting
→ Reduce number of shapes (edit game.js)
→ Disable particles in customization

No sound?
→ Check volume slider in settings
→ Verify browser allows audio autoplay
→ Try user interaction before starting game

CREDITS:
--------

Shape Tap Deluxe - Premium Tap Game
Developed with: HTML5 Canvas, JavaScript, CSS3
Features: Campaign, Physics, PWA support
Version: 2.0 (All Tiers)
