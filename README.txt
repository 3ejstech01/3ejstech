3EJS Tech - Local Edition
==========================

QUICK START
-----------
1. Make sure Node.js 18 or newer is installed.
   If you don't have it, the launcher will open the download page for you.
   Get it here: https://nodejs.org/en/download  (use the LTS version)

2. Double-click  start.bat

3. Your browser will open to http://localhost:3001

4. Pick any user name from the login screen to enter the app
   (the app is password-less in local mode - this is intentional for demo use)


WHAT THE ZIP CONTAINS
---------------------
  start.bat        - This launcher (double-click to run)
  README.txt       - This file
  .env.local       - Pre-configured with the backend Web App URL
  package.json     - Pinned dependency list
  package-lock.json
  src/             - App source code
  public/          - Static assets (logos, backgrounds)
  node_modules/    - Installed production dependencies (no dev tools)
  .next/           - Pre-built production app (no rebuild needed)


STOPPING THE SERVER
-------------------
Close the black command window or press Ctrl+C inside it.


TROUBLESHOOTING
---------------
- Port 3001 already in use?
  Edit start.bat and change  -p 3001  to another port (e.g. 3002).

- Browser didn't open?
  Manually visit http://localhost:3001

- Black window closes immediately?
  Right-click start.bat and choose "Run as administrator".

- Need a fresh start?
  Delete the .next folder and double-click start.bat to rebuild.


DATA AND PRIVACY
----------------
This is a fully local copy. No telemetry. No accounts.