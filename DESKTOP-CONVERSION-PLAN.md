# 3EJS Desktop Conversion Plan

> ⚠️ **SUPERSEDED** — This plan explored **Tauri** as the desktop target. The project instead adopted **Electron** (see `ELECTRON-SETUP-COMPLETE.md`, `electron/main.js`, `electron/preload.js`, and the `electron*` / `dist` scripts in `package.json`). There is no `src-tauri/` directory. Keep this document only as historical reference; do not start a Tauri implementation.

## Current Status: Phase 1 - Prerequisites

### ✅ Completed
1. Installed Tauri CLI and API packages via npm
2. Configured Next.js for static export (output: 'export')
3. Added Tauri scripts to package.json

### 🚧 Current Blocker: Rust Toolchain Required

**Problem**: Tauri requires Rust toolchain + Visual Studio Build Tools to compile, which is complex for end-user distribution.

**Solution Options**:

#### Option A: Pre-built Binaries (RECOMMENDED for distribution)
- Developer installs Rust once for building
- Build .exe on developer machine
- Distribute only the .exe (no dependencies needed by end users)
- Users just double-click the .exe to run

#### Option B: Electron (Fallback if Rust is blocker)
- No Rust required, JavaScript-only
- Larger bundle size (~150 MB vs 10 MB)
- Easier development setup
- Still achieves "one-click .exe" goal

## Recommended Path Forward

### FOR DEVELOPMENT (You - the developer):
```powershell
# 1. Install Rust (one-time setup)
# Download from: https://rust up.rs
# Run: rustup-init.exe (press Enter for defaults)

# 2. Install Visual Studio Build Tools
# Download: https://visualstudio.microsoft.com/downloads/#build-tools-for-visual-studio-2022
# Install "Desktop development with C++" workload

# 3. Build the desktop app
npm run tauri:build

# Result: ./src-tauri/target/release/bundle/msi/3EJS Tech_1.0.0_x64_en-US.msi
```

### FOR END USERS (Distribution):
- **No installation needed!**
- Download the .exe or .msi file
- Double-click to install/run
- WebView2 is auto-installed if missing (bundled with Windows 10/11)

## Implementation Steps

### Phase 1: Setup Tauri Project Structure (2-3 hours)
1. Create `src-tauri` directory with Rust backend
2. Configure Tauri IPC commands for:
   - Google Sheets data fetching
   - Local SQLite caching
   - Settings management (store Sheets URL)
3. Set up build pipeline

### Phase 2: Migrate from Next.js API Routes → Tauri Commands (4-6 hours)
Current API routes need to become Tauri IPC commands:

**Before** (API route - requires server):
```typescript
// src/app/api/installations/route.ts
export async function GET(request: Request) {
  const data = await sheets.getAll('Installations');
  return Response.json(data);
}
```

**After** (Tauri command - client-side):
```typescript
// src/lib/tauri-db.ts
import { invoke } from '@tauri-apps/api/core';

export async function getAllInstallations() {
  return await invoke<Installation[]>('get_all_installations');
}
```

```rust
// src-tauri/src/commands/installations.rs
#[tauri::command]
async fn get_all_installations(state: State<'_, AppState>) -> Result<Vec<Installation>, String> {
  let sheets_url = state.config.sheets_url();
  let data = fetch_from_sheets(&sheets_url, "Installations").await?;
  Ok(data)
}
```

### Phase 3: Google Sheets Configuration UI (2 hours)
Add settings page where users can input their Google Sheets Web App URL:

```typescript
// Settings page
<input 
  type="url"
  placeholder="https://script.google.com/macros/s/.../exec"
  value={sheetsUrl}
  onChange={(e) => saveSheetsUrl(e.target.value)}
/>
```

Stored in Tauri's secure storage (OS keychain).

### Phase 4: Offline Support with SQLite (3-4 hours)
- Integrate SQLite for local caching
- Sync strategy: fetch from Sheets, cache locally
- Background sync every 5 minutes
- Offline mode indicator in UI

### Phase 5: Build & Package (1-2 hours)
```powershell
npm run tauri:build
```

Outputs:
- Windows: `.msi` installer + standalone `.exe`
- Size: ~8-12 MB (with WebView2)

### Phase 6: Distribution (1 hour)
- Upload .msi/.exe to GitHub Releases
- Provide download link to users
- Users download and double-click - done!

## Alternative: Quick Electron Conversion (if Rust is blocker)

If Rust installation is too complex, switch to Electron:

```powershell
npm install --save-dev electron electron-builder
```

**Pros**:
- No Rust needed
- Faster development
- Same static export approach

**Cons**:
- 150 MB bundle size (vs 10 MB Tauri)
- Higher memory usage

**Time to convert**: ~4-6 hours total

## Next Immediate Step

**Decision needed**: 

1. **Install Rust + proceed with Tauri** (best performance, smallest size)
   - Run: Download https://rustup.rs and install
   - Then: Run npm run tauri init
   
2. **Switch to Electron** (easier setup, larger bundle)
   - Run: npm install electron electron-builder
   - Then: Configure electron-builder

Which would you prefer?
