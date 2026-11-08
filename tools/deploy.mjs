// Публікує готову папку dist/ у гілку gh-pages (GitHub Pages).
// Запуск з кореня проєкту:  npm run deploy   (спершу збирає сайт)
import { execSync } from "node:child_process";
import { rmSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const DIST = join(ROOT, "dist");
if (!existsSync(join(DIST, "index.html"))) { console.error("Немає dist/index.html — спершу: node build.mjs"); process.exit(1); }

const sh = (cmd, cwd = DIST) => execSync(cmd, { cwd, stdio: ["ignore", "pipe", "inherit"] }).toString().trim();
const remote = sh("git remote get-url origin", ROOT);
const stamp = new Date().toISOString().slice(0, 16).replace("T", " ");
const msg = `Deploy ${stamp}\n\nCo-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`;

rmSync(join(DIST, ".git"), { recursive: true, force: true });
try {
  sh("git init -q -b gh-pages");
  sh("git add -A");
  execSync(`git commit -q -F -`, { cwd: DIST, input: msg, stdio: ["pipe", "ignore", "inherit"] });
  sh(`git push -q -f "${remote}" gh-pages`);
  console.log(`✓ Опубліковано в gh-pages (${remote})`);
} finally {
  rmSync(join(DIST, ".git"), { recursive: true, force: true });
}
