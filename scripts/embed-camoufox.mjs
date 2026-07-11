import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDirectory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const version = "135.0.1-beta.24";
const archiveName = `camoufox-${version}-win.x86_64.zip`;
const archiveUrl = `https://github.com/daijro/camoufox/releases/download/v${version}/${archiveName}`;
const archivePath = path.join(rootDirectory, "assets", archiveName);
const generatedDirectory = path.join(rootDirectory, "src", "generated");
const metadataOutputPath = path.join(generatedDirectory, "camoufox-archive-meta.json");

function sha256(buffer) {
    return crypto.createHash("sha256").update(buffer).digest("hex");
}

async function downloadArchive() {
    console.log(`下载 ${archiveUrl}`);
    const response = await fetch(archiveUrl, { redirect: "follow" });
    if (!response.ok) {
        throw new Error(`Camoufox 下载失败：HTTP ${response.status}`);
    }
    const archive = Buffer.from(await response.arrayBuffer());
    if (archive.subarray(0, 4).toString("hex") !== "504b0304") {
        throw new Error("Camoufox 下载内容不是 ZIP 文件。");
    }
    fs.mkdirSync(path.dirname(archivePath), { recursive: true });
    fs.writeFileSync(archivePath, archive);
    return archive;
}

async function main() {
    const archive = fs.existsSync(archivePath) ? fs.readFileSync(archivePath) : await downloadArchive();
    if (archive.subarray(0, 4).toString("hex") !== "504b0304") {
        throw new Error("本地 Camoufox 文件不是 ZIP 文件；请删除 assets 中的 ZIP 后重试。");
    }

    fs.mkdirSync(generatedDirectory, { recursive: true });
    fs.writeFileSync(
        metadataOutputPath,
        `${JSON.stringify({ archiveName, sha256: sha256(archive), version }, null, 2)}\n`
    );
    console.log(`已内嵌 ${archiveName}（${archive.length} 字节，SHA-256: ${sha256(archive)}）。`);
}

main().catch(error => {
    console.error(error.message);
    process.exitCode = 1;
});
