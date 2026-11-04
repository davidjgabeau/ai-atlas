import { spawn } from "node:child_process";

function run(command, args, env = process.env) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: "inherit", env });
    child.on("error", reject);
    child.on("exit", (code) => code === 0 ? resolve() : reject(new Error(`${command} ${args.join(" ")} exited ${code}`)));
  });
}

await run("npm", ["run", "build"]);
// A one-time, explicitly selected deployment can import reviewed public records
// using server-side credentials. This never adds a public write endpoint.
if (process.env.ATLAS_IMPORT_REVIEWED === "1") {
  const args = ["tsx", "scripts/import-reviewed-research.ts", "--apply", "--backup-dir=.next/reviewed-import-backup"];
  if (process.env.ATLAS_IMPORT_ONLY) args.push(`--company=${process.env.ATLAS_IMPORT_ONLY}`);
  await run("npx", args);
}
if (process.env.ATLAS_REFRESH_SOURCES === "1") {
  const env = { ...process.env, ENABLE_AUTO_PUBLISH: "false", AUTO_ARCHIVE_INELIGIBLE_COMPANIES: "false" };
  const tasks = ["news:refresh", "jobs:refresh", "agent:refresh"];
  const results = await Promise.allSettled(tasks.map((task) => run("npm", ["run", task], env)));
  results.forEach((result, index) => { if (result.status === "rejected") console.warn(`Source collection incomplete: ${tasks[index]}. Inspect its log and the dated coverage in the research desk.`); });
}
