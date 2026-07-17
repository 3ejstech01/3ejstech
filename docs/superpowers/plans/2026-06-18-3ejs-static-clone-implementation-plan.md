# 3EJS Static Clone Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task‑by‑task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Produce a lightweight, locally‑only clone of the 3EJS‑main app that runs as a static export with a simple hard‑coded login and no server‑side code.

**Architecture:** Next.js static export (`output: "export"`), client‑only Google Sheets fetch, IndexedDB cache, minimal UI, dark‑mode default.

**Tech Stack:** Next.js 16, TypeScript, Tailwind CSS, Zustand, IndexedDB, Google Sheets Apps Script endpoint.

---

### Task 1: Create a new project folder and copy the source

**Files:**
- Create: `E:\3EJS-static-clone` (new folder)
- Copy: all contents of `E:\3EJS-main` into the new folder

- [ ] **Step 1: Verify target parent exists**
  ```powershell
  Test-Path -LiteralPath "E:\"
  ```
  Expected: `True`

- [ ] **Step 2: Create the clone directory**
  ```powershell
  New-Item -ItemType Directory -Path "E:\3EJS-static-clone"
  ```
  Expected: Directory `E:\3EJS-static-clone` created.

- [ ] **Step 3: Copy the entire source tree**
  ```powershell
  Copy-Item -LiteralPath "E:\3EJS-main\*" -Destination "E:\3EJS-static-clone" -Recurse -Force
  ```
  Expected: All files appear under `E:\3EJS-static-clone`.

- [ ] **Step 4: Verify copy**
  ```powershell
  (Get-ChildItem "E:\3EJS-static-clone" -Recurse | Measure-Object).Count
  ```
  Expected: Same count as original (≈ 250 files).

- [ ] **Step 5: Initialize a fresh Git repo (optional but useful for commits)**
  ```bash
  cd "E:\3EJS-static-clone"
  git init
  git add .
  git commit -m "chore: initial clone copy"
  ```
  Expected: Initial commit recorded.

---

### Task 2: Remove server‑side code (API routes, middleware, role guards, chatbot)

**Files to delete or purge:**
- `src/app/api/` (entire folder)
- `middleware.ts`
- Any imports of `src/lib/auth-guard.ts`, `src/lib/auth-server.ts`, `src/lib/role-permissions.ts`
- `src/components/common/ChatAssistant.tsx`
- `src/components/common/SyncConflictModal.tsx`
- `src/components/common/SyncButton.tsx` (keep the UI button but replace its logic with a simple manual sync trigger)

- [ ] **Step 1: Delete the API folder**
  ```powershell
  Remove-Item -LiteralPath "E:\3EJS-static-clone\src\app\api" -Recurse -Force
  ```
  Expected: Folder removed.

- [ ] **Step 2: Delete the middleware file**
  ```powershell
  Remove-Item -LiteralPath "E:\3EJS-static-clone\middleware.ts"
  ```
  Expected: File removed.

- [ ] **Step 3: Remove role‑based guard imports**
  Search and edit files that import `auth-guard`, `auth-server`, or `role-permissions`.
  Example edit for `src/lib/unified-db.ts` (remove import line and any usage):
  ```diff
  - import { requireRole } from "./auth-guard";
  ```
  Apply similar edits wherever these imports appear.

- [ ] **Step 4: Delete chatbot component**
  ```powershell
  Remove-Item -LiteralPath "E:\3EJS-static-clone\src\components\common\ChatAssistant.tsx"
  ```

- [ ] **Step 5: Remove sync‑conflict UI**
  ```powershell
  Remove-Item -LiteralPath "E:\3EJS-static-clone\src\components\common\SyncConflictModal.tsx"
  ```

- [ ] **Step 6: Update any component that referenced the removed SyncConflictModal**
  Replace the import with a no‑op comment or remove the usage.

- [ ] **Step 7: Commit deletions**
  ```bash
  cd "E:\3EJS-static-clone"
  git add -A
  git commit -m "chore: remove server side code, role guards, chatbot"
  ```

---

### Task 3: Adjust Next.js configuration for static export

**Files to modify:**
- `next.config.ts`
- `package.json`

- [ ] **Step 1: Add `output: "export"` to next.config.ts**
  ```diff
  export default {
+   output: "export",
    // existing config (images, etc.) remains unchanged
  };
  ```

- [ ] **Step 2: Add export script to package.json**
  ```diff
  "scripts": {
    "dev": "next dev",
    "build": "next build",
+   "export": "next export",
    "start": "next start",
    ...
  },
  ```

- [ ] **Step 3: Remove any server‑only next config flags** (e.g., `rewrites`, `api` settings) if present.

- [ ] **Step 4: Commit config changes**
  ```bash
  git add next.config.ts package.json
  git commit -m "chore: enable static export"
  ```

---

### Task 4: Simplify authentication to a hard‑coded local login

**Files to modify/create:**
- `src/context/AuthContext.tsx`
- `src/app/login/page.tsx`
- Possibly remove auth utilities (`src/lib/auth-utils.ts`, `src/lib/auth-server.ts`, `src/lib/session.ts`)

- [ ] **Step 1: Write a failing test for login flow**
  Create: `src/__tests__/auth.test.ts`
  ```ts
  import { render, screen, fireEvent } from "@testing-library/react";
  import LoginPage from "../../app/login/page";

  test("login toggles isLoggedIn after correct credentials", async () => {
    render(<LoginPage />);
    const emailInput = screen.getByLabelText(/email/i);
    const passwordInput = screen.getByLabelText(/password/i);
    const loginBtn = screen.getByRole("button", { name: /login/i });

    fireEvent.change(emailInput, { target: { value: "admin@local" } });
    fireEvent.change(passwordInput, { target: { value: "password" } });
    fireEvent.click(loginBtn);

    // AuthContext sets a flag in localStorage; we check it
    expect(localStorage.getItem("isLoggedIn")).toBe("true");
  });
  ```
  - Expected: Test fails because login logic still checks the old server endpoint.

- [ ] **Step 2: Run the failing test**
  ```bash
  npm run test -- src/__tests__/auth.test.ts
  ```
  Expected: FAIL – `LoginPage` still calls `/api/auth/login`.

- [ ] **Step 3: Implement simple AuthContext**
  Edit `src/context/AuthContext.tsx` to:
  ```tsx
  import React, { createContext, useContext, useState } from "react";

  interface AuthContextProps {
    isLoggedIn: boolean;
    login: (email: string, password: string) => void;
    logout: () => void;
  }

  const AuthContext = createContext<AuthContextProps | undefined>(undefined);

  export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [isLoggedIn, setLoggedIn] = useState<boolean>(
      localStorage.getItem("isLoggedIn") === "true"
    );

    const login = (email: string, password: string) => {
      // Hard‑coded credentials
      if (email === "admin@local" && password === "password") {
        localStorage.setItem("isLoggedIn", "true");
        setLoggedIn(true);
      } else {
        alert("Invalid credentials");
      }
    };

    const logout = () => {
      localStorage.removeItem("isLoggedIn");
      setLoggedIn(false);
    };

    return (
      <AuthContext.Provider value={{ isLoggedIn, login, logout }}>
        {children}
      </AuthContext.Provider>
    );
  };

  export const useAuth = () => {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error("useAuth must be used within AuthProvider");
    return ctx;
  };
  ```

- [ ] **Step 4: Update the login page to use the new context**
  Edit `src/app/login/page.tsx` (simplified example):
  ```tsx
  "use client";
  import { useState } from "react";
  import { useAuth } from "../../../context/AuthContext";

  export default function LoginPage() {
    const { login } = useAuth();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");

    const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      login(email, password);
    };

    return (
      <form onSubmit={handleSubmit} className="max-w-sm mx-auto mt-20">
        <label>Email</label>
        <input value={email} onChange={e => setEmail(e.target.value)} />
        <label>Password</label>
        <input type="password" value={password} onChange={e => setPassword(e.target.value)} />
        <button type="submit">Login</button>
      </form>
    );
  }
  ```

- [ ] **Step 5: Remove now‑unused auth utilities**
  ```powershell
  Remove-Item -LiteralPath "E:\3EJS-static-clone\src\lib\auth-utils.ts"
  Remove-Item -LiteralPath "E:\3EJS-static-clone\src\lib\auth-server.ts"
  Remove-Item -LiteralPath "E:\3EJS-static-clone\src\lib\session.ts"
  ```
  Also delete any imports referencing these files.

- [ ] **Step 6: Run the test again**
  ```bash
  npm run test -- src/__tests__/auth.test.ts
  ```
  Expected: PASS – `isLoggedIn` flag set correctly.

- [ ] **Step 7: Commit auth changes**
  ```bash
  git add src/context/AuthContext.tsx src/app/login/page.tsx src/__tests__/auth.test.ts
  git rm src/lib/auth-utils.ts src/lib/auth-server.ts src/lib/session.ts
  git commit -m "feat: simple hard‑coded local login"
  ```

---

### Task 5: Strip heavy Framer Motion usage and unused animations

**Files to edit:**
- Any component importing `framer-motion` (e.g., `src/components/common/Header.tsx`, `Sidebar.tsx`, `ClientRipple.tsx`)

- [ ] **Step 1: Search for `framer-motion` imports**
  ```bash
  grep -R "framer-motion" src/components/common
  ```
  Expected: List of files.

- [ ] **Step 2: For each listed file, replace `motion.div` (or similar) with a plain `div` and remove animation props**
  Example edit for `Header.tsx`:
  ```diff
  - import { motion } from "framer-motion";
  - const Header = () => (
  -   <motion.header initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
  -     ...
  -   </motion.header>
  - );
  + const Header = () => (
  +   <header className="transition-opacity duration-300" style={{ opacity: 1 }}>
  +     ...
  +   </header>
  + );
  ```
  Apply similar changes to Sidebar, MobileNav, and any other component.

- [ ] **Step 3: Remove the `framer-motion` dependency from `package.json`**
  ```diff
  - "framer-motion": "^12.38.0",
  ```

- [ ] **Step 4: Run `npm install` to prune the package**
  ```bash
  npm install
  ```
  Expected: `framer-motion` removed from `node_modules`.

- [ ] **Step 5: Commit animation cleanup**
  ```bash
  git add src/components/common/*.tsx package.json
  git commit -m "chore: replace framer‑motion with plain divs and drop dependency"
  ```

---

### Task 6: Update unified‑db public API to expose only needed functions

**File to edit:** `src/lib/unified-db.ts`

- [ ] **Step 1: Write a failing test that expects only the listed export names**
  ```ts
  import * as db from "../../lib/unified-db";
  test("public API surface", () => {
    expect(Object.keys(db)).toEqual([
      "getDashboardStats",
      "listSubscribers",
      "upsertSubscriber",
      "deleteSubscriber",
      "listELoad",
      "upsertELoad",
      "deleteELoad",
      "listClawback",
      "listHistorical"
    ]);
  });
  ```
  Expected: Test fails because many internal helpers are exported.

- [ ] **Step 2: Run the failing test**
  ```bash
  npm run test -- src/lib/__tests__/unified-db.public.test.ts
  ```

- [ ] **Step 3: Trim exports in `unified-db.ts`**
  Keep only the functions listed in the design spec (dashboard stats, list/upsert/delete for subscribers, eload, clawback, historical). Remove/export any internal helpers (`syncQueue`, `flushPendingOps`, etc.) that are not needed outside.
  ```diff
  - export { syncQueue, flushPendingOps, ... };
  + export { getDashboardStats, listSubscribers, upsertSubscriber, deleteSubscriber, listELoad, upsertELoad, deleteELoad, listClawback, listHistorical };
  ```

- [ ] **Step 4: Run the test again**
  ```bash
  npm run test -- src/lib/__tests__/unified-db.public.test.ts
  ```
  Expected: PASS.

- [ ] **Step 5: Commit API surface change**
  ```bash
  git add src/lib/unified-db.ts src/lib/__tests__/unified-db.public.test.ts
  git commit -m "refactor: expose minimal public API from unified‑db"
  ```

---

### Task 7: Adjust stores to use the trimmed unified‑db API

**Files:** `src/stores/*.ts`

- [ ] **Step 1: Search for any removed function names (e.g., `flushPendingOps`) and replace with the remaining public calls**
  Example edit for `subscribersStore.ts`:
  ```diff
  - import { upsertSubscriber, deleteSubscriber, syncQueue } from "../lib/unified-db";
  + import { upsertSubscriber, deleteSubscriber } from "../lib/unified-db";
  ```

- [ ] **Step 2: Ensure each store still compiles (run TypeScript type check)**
  ```bash
  npm run typecheck
  ```
  Expected: No errors.

- [ ] **Step 3: Commit store adjustments**
  ```bash
  git add src/stores/*.ts
  git commit -m "refactor: align stores with trimmed unified‑db API"
  ```

---

### Task 8: Add a simple manual sync button (replace removed complex sync UI)

**File to create:** `src/components/common/ManualSyncButton.tsx`

- [ ] **Step 1: Write a failing test for the button click calling `useAutoFlush`**
  ```tsx
  import { render, fireEvent } from "@testing-library/react";
  import ManualSyncButton from "../../components/common/ManualSyncButton";

  test("click triggers sync flush", () => {
    const flushMock = jest.fn();
    jest.spyOn(require("../../hooks/useAutoFlush"), "default").mockReturnValue({ flush: flushMock });
    const { getByRole } = render(<ManualSyncButton />);
    fireEvent.click(getByRole("button"));
    expect(flushMock).toHaveBeenCalled();
  });
  ```
  Expected: FAIL – component does not exist.

- [ ] **Step 2: Implement `ManualSyncButton`**
  ```tsx
  "use client";
  import React from "react";
  import { useAutoFlush } from "../../hooks/useAutoFlush";

  export default function ManualSyncButton() {
    const { flush } = useAutoFlush();
    return (
      <button onClick={flush} className="px-4 py-2 bg-primary text-white rounded">
        Sync Now
      </button>
    );
  }
  ```

- [ ] **Step 3: Run the test**
  ```bash
  npm run test -- src/components/common/__tests__/ManualSyncButton.test.tsx
  ```
  Expected: PASS.

- [ ] **Step 4: Replace old `SyncButton` usage in the Settings page with the new `ManualSyncButton`.**
  Edit `src/app/settings/page.tsx` to import `ManualSyncButton` and render it.

- [ ] **Step 5: Commit sync button addition**
  ```bash
  git add src/components/common/ManualSyncButton.tsx src/app/settings/page.tsx src/components/common/__tests__/ManualSyncButton.test.tsx
  git commit -m "feat: simple manual sync button"
  ```

---

### Task 9: Update README with static‑export instructions and remove Netlify references

**File:** `README.md`

- [ ] **Step 1: Write a failing test that checks the README contains the phrase "Static Export"** (optional but ensures change).
  ```ts
  import fs from "fs";
  test("README mentions static export", () => {
    const readme = fs.readFileSync("README.md", "utf8");
    expect(readme).toMatch(/static export/i);
  });
  ```
  Expected: FAIL – not yet updated.

- [ ] **Step 2: Edit README**
  Replace Netlify deployment section with:
  ```markdown
  ## Static Export

  ```bash
  npm run build && npm run export
  # The generated static site lives in the `out/` folder.
  # To view locally:
  npx serve out
  ```
  ```
  Remove any Netlify badge, `netlify.toml` references, and the `DEPLOY_README.md` link.

- [ ] **Step 3: Run the README test again**
  ```bash
  npm run test -- README.test.ts
  ```
  Expected: PASS.

- [ ] **Step 4: Commit README update**
  ```bash
  git add README.md
  git commit -m "docs: update README for static export, remove Netlify mentions"
  ```

---

### Task 10: Verify the static build works locally

- [ ] **Step 1: Run the static export**
  ```bash
  npm run build && npm run export
  ```
  Expected: `out/` folder created without errors.

- [ ] **Step 2: Serve the folder**
  ```bash
  npx serve out
  ```
  Open `http://localhost:5000` (or the port shown) and verify:
  - Login page appears.
  - After login, the Dashboard loads with KPI cards and charts.
  - Subscriber table, E‑Load page, Clawback page, Historical page, Settings page all render.

- [ ] **Step 3: Run all Jest tests**
  ```bash
  npm run test
  ```
  Expected: All tests PASS.

- [ ] **Step 4: Commit final verification state**
  ```bash
  git add .
  git commit -m "chore: verify static export builds and passes tests"
  ```

---

### Self‑Review Checklist (run after plan is saved)
1. **Spec coverage:** Every requirement from the design spec has a matching task.
2. **No placeholders:** All steps contain concrete code or commands.
3. **Type consistency:** Function names used across tasks match the actual implementations.
4. **Path correctness:** All file paths are absolute and reflect the clone location (`E:\3EJS-static-clone`).

If any gaps are found, add the missing task before execution.

---

**Execution Options**

1. **Subagent‑Driven (recommended)** – I will dispatch a fresh subagent for each task, review after each step, and iterate quickly.
2. **Inline Execution** – I will run the tasks sequentially in this session using `executing-plans`.

Which approach would you like to use?