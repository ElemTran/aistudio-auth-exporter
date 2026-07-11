import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDirectory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outputDirectory = path.join(rootDirectory, "dist");
const outputPath = path.join(outputDirectory, "AIStudioAuth-win-x64.exe");

function run(command, argumentsList) {
    const result = spawnSync(command, argumentsList, { cwd: rootDirectory, stdio: "pipe" });
    process.stdout.write(result.stdout?.toString() || "");
    process.stderr.write(result.stderr?.toString() || "");
    if (result.error || result.status !== 0) {
        throw new Error(`${command} 执行失败：${result.error?.message || result.stderr?.toString().trim() || `退出码 ${result.status}`}`);
    }
}

fs.rmSync(outputDirectory, { force: true, recursive: true });
fs.mkdirSync(outputDirectory, { recursive: true });
run(process.execPath, ["scripts/embed-camoufox.mjs"]);
run(process.execPath, ["scripts/embed-playwright-core.mjs"]);
run("npx", ["pkg",
    "--target",
    "node22-win-x64",
    "--output",
    outputPath,
    "package.json",
]);
console.log(`已生成 ${outputPath}`);
