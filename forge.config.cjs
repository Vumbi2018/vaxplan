/**
 * Electron Forge config for VaxPlan Windows installer.
 *
 * Signing & publishing notes (see docs/releases.md):
 *  - Set WINDOWS_CERT_FILE + WINDOWS_CERT_PASSWORD env vars before running
 *    `npm run build:windows` to produce a signed Squirrel installer.
 *  - `publish.config` is read by `electron-updater` at runtime. Pick ONE
 *    feed (GitHub Releases or an S3-compatible bucket) and set the
 *    matching env vars.
 */

const path = require("path");

const certificateFile = process.env.WINDOWS_CERT_FILE || undefined;
const certificatePassword = process.env.WINDOWS_CERT_PASSWORD || undefined;

module.exports = {
  packagerConfig: {
    name: "VaxPlan",
    executableName: "VaxPlan",
    appBundleId: "org.vaxplan.desktop",
    appCategoryType: "public.app-category.healthcare-fitness",
    icon: path.resolve(__dirname, "Resources", "icon"),
    asar: true,
    // Only ship what the runtime needs — keep the installer small enough
    // for low-bandwidth field deployments.
    ignore: [
      /^\/\.agents/,
      /^\/\.local/,
      /^\/\.canvas/,
      /^\/node_modules\/(?!electron-updater|@electron|electron-squirrel-startup)/,
      /^\/scripts/,
      /^\/docs/,
      /^\/data/,
      /^\/migrations/,
      /^\/server/,
      /^\/client\/src/,
      /^\/screenshots/,
      /^\/exports/,
      /^\/attached_assets/,
      /^\/zipFile\.zip/,
    ],
    win32metadata: {
      CompanyName: "VaxPlan",
      ProductName: "VaxPlan",
      FileDescription: "VaxPlan offline-first microplanning workstation",
    },
  },
  rebuildConfig: {},
  makers: [
    {
      name: "@electron-forge/maker-squirrel",
      config: {
        name: "VaxPlan",
        // electron-winstaller generates a NuGet .nuspec and requires both
        // Authors and Description — without these the Squirrel maker fails
        // with "Authors is required. / Description is required." (package.json
        // has no author/description fields).
        authors: "VaxPlan",
        description: "VaxPlan offline-first microplanning workstation",
        setupExe: "VaxPlanSetup.exe",
        setupIcon: path.resolve(__dirname, "Resources", "icon.ico"),
        // Code-signing — both must be set or signing is skipped (a warning
        // is fine for dev builds; production releases MUST be signed).
        ...(certificateFile && certificatePassword
          ? { certificateFile, certificatePassword }
          : {}),
      },
    },
    {
      name: "@electron-forge/maker-zip",
      platforms: ["win32"],
    },
  ],
  publishers: [
    // GitHub Releases is the simplest auto-update feed for small teams.
    // Set GITHUB_TOKEN + populate `publish` repo info to enable.
    ...(process.env.GITHUB_TOKEN && process.env.GITHUB_REPO_OWNER && process.env.GITHUB_REPO_NAME
      ? [
          {
            name: "@electron-forge/publisher-github",
            config: {
              repository: {
                owner: process.env.GITHUB_REPO_OWNER,
                name: process.env.GITHUB_REPO_NAME,
              },
              prerelease: false,
              draft: true,
            },
          },
        ]
      : []),
  ],
};
