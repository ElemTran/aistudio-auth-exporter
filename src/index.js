import path from "node:path";
import { createRequire } from "node:module";
import { saveAuthState } from "./auth-output.js";
import { ensureCamoufox, ensurePlaywrightCore } from "./camoufox.js";

const AI_STUDIO_URL = "https://aistudio.google.com/u/0/prompts/new_chat";

function printHelp() {
    console.log("用法：AIStudioAuth-win-x64.exe [--output <目录>] [--headless]");
    console.log("\n选项：\n  --output <目录>  认证文件输出目录（默认：EXE 同目录的 auth）\n  --headless       无界面运行，不适合手动登录\n  -h, --help       显示帮助");
}

function parseArguments(argumentsList) {
    const options = { headless: false };
    for (let index = 0; index < argumentsList.length; index++) {
        const argument = argumentsList[index];
        if (argument === "-h" || argument === "--help") return { help: true };
        if (argument === "--headless") {
            options.headless = true;
            continue;
        }
        if (argument === "--output") {
            const outputDirectory = argumentsList[++index];
            if (!outputDirectory || outputDirectory.startsWith("-")) throw new Error("--output 缺少目录参数。");
            options.outputDirectory = path.resolve(outputDirectory);
            continue;
        }
        throw new Error(`未知参数：${argument}`);
    }
    return options;
}

async function getAccountName(page) {
    const content = await page.content().catch(() => "");
    return content.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/)?.[0] || "unknown";
}

async function main() {
    const options = parseArguments(process.argv.slice(2));
    if (options.help) return printHelp();

    const outputDirectory = options.outputDirectory || path.join(path.dirname(process.execPath), "auth");
    console.log("正在准备内嵌 Camoufox 和 Playwright Core；首次运行会在本机解压，之后将直接复用。");
    const playwrightCoreDirectory = ensurePlaywrightCore();
    const requirePlaywrightCore = createRequire(path.join(playwrightCoreDirectory, "package.json"));
    const { firefox } = requirePlaywrightCore("./index.js");
    const browser = await firefox.launch({ executablePath: ensureCamoufox(), headless: options.headless });
    try {
        const context = await browser.newContext();
        const page = await context.newPage();
        console.log("请在打开的 Camoufox 中完成 Google AI Studio 登录。登录成功后将自动导出认证文件。");
        await page.goto(AI_STUDIO_URL);
        // ponytail: 轮询代替 waitForFunction，pkg 打包后函数序列化会失败
        const deadline = Date.now() + 900000;
        while (Date.now() < deadline) {
            const title = await page.title();
            if (title.includes("AI Studio")) break;
            await page.waitForTimeout(1000);
        }
        await page.waitForTimeout(2000);
        const authPath = saveAuthState(outputDirectory, await context.storageState(), await getAccountName(page));
        console.log(`认证文件已保存：${authPath}`);
    } finally {
        await browser.close();
    }
}

main().catch(error => {
    console.error(`错误：${error.message}`);
    process.exitCode = 1;
});
