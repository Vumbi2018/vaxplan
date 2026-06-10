# Releasing VaxPlan Installers

This guide describes how to cut a new release of the VaxPlan **Windows
desktop installer** and the **Android installer** (sideload `.apk` and
Play-ready `.aab`). It is the source of truth for the build, sign, and
distribution steps referenced from Task #232.

Audience: anyone with access to the build machine and the signing
material — not necessarily the original author of the offline stack.

---

## 1. Versioning

VaxPlan uses a single `package.json` `version` field for both the web
app and the Electron / Capacitor builds.

1. Decide the new version per semver:
   - Bug fixes only → patch bump (e.g. `1.4.2` → `1.4.3`)
   - Backwards-compatible features → minor bump (`1.4.x` → `1.5.0`)
   - Breaking change to the local replica schema or the sync API →
     major bump (`1.x` → `2.0.0`) and document the IndexedDB migration.
2. Update `package.json` `version`.
3. Update the Android `versionCode` (monotonically increasing integer) and
   `versionName` in `android/app/build.gradle` to match.
4. Commit with message `release: vX.Y.Z` and tag `git tag vX.Y.Z`.

---

## 2. Build the Windows installer

Prerequisites on the build machine:

- Windows 10 or later (PowerShell 5+).
- Node.js v20 LTS.
- The signing certificate (`.pfx` or `.p12`) and its password — store
  these outside the repo. Treat the password like any other secret.

Steps:

```powershell
# 1. Pull the tagged release commit
git checkout vX.Y.Z

# 2. Install deps
npm ci

# 3. Provide signing material via environment (PowerShell session only).
#    Never paste these into the repo or a shared script.
$env:WINDOWS_CERT_FILE     = "C:\secure\vaxplan-codesign.pfx"
$env:WINDOWS_CERT_PASSWORD = (Read-Host -AsSecureString)

# 4. (Optional) Publish to GitHub Releases. Set the repo and a PAT with
#    `repo` scope. Omitting these still produces the installer locally.
$env:GITHUB_TOKEN       = "<personal access token>"
$env:GITHUB_REPO_OWNER  = "your-org"
$env:GITHUB_REPO_NAME   = "vaxplan"

# 5. Build
npm run build:windows
```

The script does, in order:

1. `npm run build` — Vite production bundle into `dist/public/`.
2. Compiles `electron/*.ts` → `electron-dist/*.js`.
3. Installs `@electron-forge/cli` and the Squirrel / zip makers on first
   run.
4. Patches `package.json#main` to `electron-dist/main.js`.
5. Runs `electron-forge make` using `forge.config.cjs`.

Outputs land under `out/make/`:

- `out/make/squirrel.windows/x64/VaxPlanSetup.exe` — the signed installer
  to distribute.
- `out/make/zip/win32/x64/VaxPlan-*.zip` — portable build (no installer).

**Verify the build before publishing:**

1. Install `VaxPlanSetup.exe` on a clean Windows VM.
2. Log in once with a live network connection. Confirm the first-run
   sync screen appears and finishes.
3. Disconnect from the network. Close the app. Reopen — you should
   still be signed in and able to use every page.
4. Reconnect. The sync status badge in the header should flip to
   "Synced X seconds ago".
5. Ship a `vX.Y.Z+1` to the same feed and reopen the installed app to
   confirm auto-update lands the new version on next launch.

### Auto-update feed

`electron-updater` reads its feed from the Forge publisher config at
build time. The current setup uses the GitHub Releases publisher when
the `GITHUB_TOKEN` / `GITHUB_REPO_OWNER` / `GITHUB_REPO_NAME` env vars
are set. To switch to an S3-compatible bucket:

1. Add `@electron-forge/publisher-s3` and configure it in
   `forge.config.cjs`.
2. Set `S3_BUCKET`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`,
   `AWS_REGION` and re-run the build.

### Code-signing certificate rotation

When the certificate is renewed:

1. Replace the `.pfx` on the build machine.
2. Update the `WINDOWS_CERT_PASSWORD` you keep in your password manager.
3. Cut a fresh build immediately and verify Windows reports the new
   publisher in the SmartScreen prompt.

---

## 3. Build the Android installer

Prerequisites on the build machine:

- Java JDK 17 or later (Temurin is fine).
- Android SDK with platform `android-34` and build-tools `34.x` installed
  (Android Studio installs both).
- A release keystore (`.jks`) and its password — generate once with
  `keytool` and keep it in a secure store.

Generate a keystore (one-time):

```powershell
keytool -genkey -v -keystore vaxplan-release.jks `
        -keyalg RSA -keysize 2048 -validity 10000 `
        -alias vaxplan
```

Configure the keystore for Gradle by placing
`android/keystore.properties` (gitignored):

```
storeFile=C:/secure/vaxplan-release.jks
storePassword=********
keyAlias=vaxplan
keyPassword=********
```

Then build:

```powershell
git checkout vX.Y.Z
npm ci
npm run build:android          # debug APK for sideload testing
npm run build:android:release  # signed APK + AAB for Play Store
```

Outputs:

- `android/app/build/outputs/apk/release/app-release.apk` — sign-and-go
  sideload installer.
- `android/app/build/outputs/bundle/release/app-release.aab` — upload to
  the Play Console.

**Verify the build:**

1. Sideload the APK onto a low-end Android tablet
   (`adb install -r app-release.apk`).
2. Log in once online, then enable airplane mode and walk every page —
   map, microplans, session work, stock, dashboards.
3. Re-enable mobile data and confirm the sync badge clears the outbox.
4. Bump the version and re-upload the AAB to a Play Console internal
   testing track to verify the in-app update banner appears.

### Keystore rotation

Play Store will reject builds signed with a different keystore than the
one originally uploaded. **Never lose the keystore.** Back it up to at
least two encrypted offsite locations. If you must rotate, use Play App
Signing's key upgrade flow.

---

## 4. Distribution

| Channel               | Windows                                              | Android                                              |
| --------------------- | ---------------------------------------------------- | ---------------------------------------------------- |
| Direct download       | Host `VaxPlanSetup.exe` on the tenant's portal       | Host `app-release.apk` on the tenant's portal        |
| Auto-update           | electron-updater pulls from the configured feed      | In-app update check compares against `/api/app/version`|
| Mass deployment       | Ship MSI via SCCM / Intune (wrap the EXE)            | Push APK via MDM (Microsoft Intune, Google Workspace) |
| Public store          | Microsoft Store (optional, requires extra packaging) | Google Play (upload the AAB)                         |

The tenant's portal URL is typically
`https://<tenant>.vaxplan.app/downloads/`, served by the existing
`/uploads/` static handler.

---

## 5. End-user install guide (one-pager to bundle with the download)

### Windows laptop

1. Download `VaxPlanSetup.exe` from your Ministry's VaxPlan portal.
2. Double-click it. Windows SmartScreen may warn you the first time —
   click **More info** → **Run anyway**.
3. After install, VaxPlan opens automatically. Sign in once with your
   work email **while connected to the internet**. The setup screen
   downloads your maps and facility list (usually 2–5 minutes).
4. You can now disconnect and use VaxPlan in the field. Reconnect at the
   end of the day and it syncs automatically.

### Android tablet

1. Download `app-release.apk` from your Ministry's VaxPlan portal (or
   install via Google Play if available).
2. If your tablet asks for permission to install from "unknown sources",
   allow it for your browser only.
3. Open VaxPlan, sign in once online, wait for setup, then take the
   tablet into the field. Sync happens automatically when you're back
   on Wi-Fi or mobile data.

---

## 6. Troubleshooting

| Symptom                                                | Fix                                                                                                                          |
| ------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------- |
| Windows install fails with SmartScreen "unknown publisher" | The build wasn't signed. Provide `WINDOWS_CERT_FILE` + `WINDOWS_CERT_PASSWORD` and rebuild.                                  |
| Android build error "keystore not found"               | Create `android/keystore.properties` per Section 3.                                                                          |
| Sync badge stuck on "Syncing…" after install           | Open **Settings → Sync conflicts**. If any rows are listed, resolve them; otherwise check the server logs for `/api/sync/batch` errors. |
| First-run sync screen never advances                   | The user is offline. Connect to the internet and tap **Retry**. As a last resort, **Continue anyway** lets them into a limited app. |
| Auto-update never lands                                | Confirm `package.json#version` was bumped and the new release is published to the feed referenced in `forge.config.cjs`.       |
