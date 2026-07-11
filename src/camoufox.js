import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import archiveMetadata from "./generated/camoufox-archive-meta.json" with { type: "json" };
import playwrightCoreMetadata from "./generated/playwright-core-archive-meta.json" with { type: "json" };

const rootDirectory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function findExecutable(directory) {
    if (!fs.existsSync(directory)) return null;
    const pending = [directory];
    while (pending.length > 0) {
        const current = pending.pop();
        for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
            const entryPath = path.join(current, entry.name);
            if (entry.isFile() && entry.name.toLowerCase() === "camoufox.exe") return entryPath;
            if (entry.isDirectory()) pending.push(entryPath);
        }
    }
    return null;
}

function extractArchive(archivePath, destinationDirectory) {
    const result = spawnSync(
        "powershell.exe",
        [
            "-NoLogo",
            "-NoProfile",
            "-NonInteractive",
            "-Command",
            "Expand-Archive -LiteralPath $env:AISTUDIO_AUTH_ARCHIVE -DestinationPath $env:AISTUDIO_AUTH_DESTINATION -Force",
        ],
        {
            encoding: "utf8",
            env: {
                ...process.env,
                AISTUDIO_AUTH_ARCHIVE: archivePath,
                AISTUDIO_AUTH_DESTINATION: destinationDirectory,
            },
        }
    );
    if (result.error || result.status !== 0) {
        throw new Error(`Camoufox 解压失败：${result.error?.message || result.stderr || "PowerShell 返回非零状态"}`);
    }
}

function ensureEmbeddedArchive(metadata, installationDirectory, isInstalled) {
    if (isInstalled()) return installationDirectory;

    const archive = fs.readFileSync(path.join(rootDirectory, "assets", metadata.archiveName));
    const archiveHash = crypto.createHash("sha256").update(archive).digest("hex");
    if (archiveHash !== metadata.sha256) {
        throw new Error(`内嵌 ${metadata.archiveName} 完整性校验失败。请重新下载 EXE。`);
    }

    fs.mkdirSync(installationDirectory, { recursive: true });
    const temporaryArchivePath = path.join(os.tmpdir(), metadata.archiveName);
    fs.writeFileSync(temporaryArchivePath, archive);
    try {
        extractArchive(temporaryArchivePath, installationDirectory);
    } finally {
        fs.rmSync(temporaryArchivePath, { force: true });
    }
    if (!isInstalled()) {
        throw new Error(`${metadata.archiveName} 解压完成，但未找到所需文件。`);
    }
    return installationDirectory;
}

export function ensureCamoufox() {
    const installationDirectory = path.join(
        process.env.LOCALAPPDATA || path.join(os.homedir(), "AppData", "Local"),
        "AIStudioAuth",
        "camoufox",
        archiveMetadata.version
    );
    const existingExecutable = fs.existsSync(installationDirectory) ? findExecutable(installationDirectory) : null;
    if (existingExecutable) return existingExecutable;

    ensureEmbeddedArchive(archiveMetadata, installationDirectory, () => Boolean(findExecutable(installationDirectory)));

    const executablePath = findExecutable(installationDirectory);
    if (!executablePath) throw new Error("Camoufox 解压完成，但未找到 camoufox.exe。" );
    return executablePath;
}

export function ensurePlaywrightCore() {
    const installationDirectory = path.join(
        process.env.LOCALAPPDATA || path.join(os.homedir(), "AppData", "Local"),
        "AIStudioAuth",
        "playwright-core",
        playwrightCoreMetadata.version
    );
    ensureEmbeddedArchive(
        playwrightCoreMetadata,
        installationDirectory,
        () => fs.existsSync(path.join(installationDirectory, "package.json"))
    );
    const packageJson = JSON.parse(fs.readFileSync(path.join(installationDirectory, "package.json"), "utf8"));
    if (packageJson.version !== playwrightCoreMetadata.version || !fs.existsSync(path.join(installationDirectory, "index.js"))) {
        throw new Error("解压后的 playwright-core 无效。请删除本地 AIStudioAuth 目录后重试。");
    }
    return installationDirectory;
}
