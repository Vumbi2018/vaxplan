import { spawn } from "child_process";
import * as path from "path";

const SEED_SCRIPTS = [
  "server/migrations/003-seed-zambia.ts",
  "server/migrations/004-seed-south-sudan.ts",
  "server/migrations/006-seed-png.ts",
  "server/migrations/010-seed-south-africa.ts",
  "server/migrations/006-seed-demo-operational.ts",
  "scripts/seed-ssd-accounts.ts",
];

function runScript(scriptPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const fullPath = path.resolve(process.cwd(), scriptPath);
    console.log(`\n==================================================`);
    console.log(`Running seed script: ${scriptPath}`);
    console.log(`==================================================`);

    const child = spawn("npx", ["tsx", "--env-file=.env", fullPath], {
      stdio: "inherit",
      shell: true,
    });

    child.on("close", (code) => {
      if (code === 0) {
        console.log(`SUCCESS: ${scriptPath} finished successfully.`);
        resolve();
      } else {
        console.error(`ERROR: ${scriptPath} exited with code ${code}`);
        reject(new Error(`Script ${scriptPath} failed.`));
      }
    });

    child.on("error", (err) => {
      console.error(`Failed to start script ${scriptPath}:`, err);
      reject(err);
    });
  });
}

async function runAll() {
  console.log("Starting full VaxPlan database seeding sequence...");
  for (const script of SEED_SCRIPTS) {
    try {
      await runScript(script);
    } catch (err) {
      console.error(`Seeding sequence interrupted by failure.`);
      process.exit(1);
    }
  }
  console.log("\n==================================================");
  console.log("All VaxPlan database seed scripts completed successfully!");
  console.log("==================================================");
  process.exit(0);
}

runAll();
