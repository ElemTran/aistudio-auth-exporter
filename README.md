# AIStudioAuth Windows 导出器

从 GitHub Release 下载唯一的 `AIStudioAuth-win-x64.exe`，双击运行。首次运行会把内嵌的 Camoufox 与 Playwright Core 解压到 `%LOCALAPPDATA%\AIStudioAuth\`；该过程不下载浏览器、npm 包或其他资源，后续运行会复用已解压的版本。

浏览器打开后，手动登录 Google AI Studio。成功进入 AI Studio 后，程序会自动在 EXE 同目录创建 `auth\auth-N.json`。将该文件复制到 AIStudioToAPI 部署目录的 `configs/auth/`，例如 Docker 部署的 `auth/` 挂载目录。

`auth-N.json` 是高敏感度登录状态：不要提交到 Git、不要发送给他人；Google 可能使其失效，失效后请重新导出。

## 命令行

```powershell
.\AIStudioAuth-win-x64.exe --output D:\aistudio-auth
```

`--headless` 可用于已有可交互登录状态的自动化场景；正常手动登录请不要使用它。

## 维护者构建

需要 Node.js `22`。常规 pkg 需在 Windows 原生构建；Linux 仅可运行测试，不能生成发布用 Windows EXE：

```powershell
npm ci
npm test
npm run build
```

构建脚本下载锁定版本的 Windows x64 Camoufox，并将锁定版本的 Playwright Core 压缩。两者均记录 SHA-256 后作为 ZIP 二进制资源内嵌到 Node/pkg 生成的 EXE。因此 Release 仅有一个 EXE，但体积会大于原始浏览器 ZIP。发布 tag（`v*`）会通过 Windows GitHub Actions 创建 Release。

## Windows 验收

在 Windows 10/11 x64 实机执行 Release EXE，确认：日志出现 `pw:api <= launch succeeded`、不出现 `Cannot find module ... playwright-core/package.json`、Camoufox 能启动、可完成 Google 登录、生成的 `auth-N.json` 被 AIStudioToAPI 成功加载。
