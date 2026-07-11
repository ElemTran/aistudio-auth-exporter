import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const rootDirectory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const packageDirectory = path.join(rootDirectory, "node_modules", "playwright-core");
const packageJsonPath = path.join(packageDirectory, "package.json");
const generatedDirectory = path.join(rootDirectory, "src", "generated");

function sha256(buffer) {
    return crypto.createHash("sha256").update(buffer).digest("hex");
}

function runZip(archivePath) {
    const result = spawnSync("zip", ["-qr", archivePath, "."], { cwd: packageDirectory, encoding: "utf8" });
    if (result.error || result.status !== 0) {
        throw new Error(`无法压缩 playwright-core：${result.error?.message || result.stderr || "zip 返回非零状态"}`);
    }
}

function main() {
    if (!fs.existsSync(packageJsonPath) || !fs.existsSync(path.join(packageDirectory, "index.js"))) {
        throw new Error("未找到 node_modules/playwright-core；请先运行 bun install。");
    }

    const { version } = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));
    const archiveName = `playwright-core-${version}.zip`;
    const archivePath = path.join(rootDirectory, "assets", archiveName);
    fs.mkdirSync(path.dirname(archivePath), { recursive: true });
    fs.rmSync(archivePath, { force: true });
    runZip(archivePath);

    const archive = fs.readFileSync(archivePath);
    fs.mkdirSync(generatedDirectory, { recursive: true });
    fs.writeFileSync(
        path.join(generatedDirectory, "playwright-core-archive-meta.json"),
        `${JSON.stringify({ archiveName, sha256: sha256(archive), version }, null, 2)}\n`
    );
    console.log(`已内嵌 playwright-core ${version}（${archive.length} 字节，SHA-256: ${sha256(archive)}）。`);
}

try {
    main();
} catch (error) {
    console.error(error.message);
    process.exitCode = 1;
}
