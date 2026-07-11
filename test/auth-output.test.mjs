import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, test } from "node:test";
import { saveAuthState } from "../src/auth-output.js";

const temporaryDirectories = [];

afterEach(() => {
    for (const directory of temporaryDirectories.splice(0)) {
        fs.rmSync(directory, { force: true, recursive: true });
    }
});

// 这个测试防止的真实回归是：新认证状态覆盖既有 auth-N.json，导致已登录账号丢失。
test("认证状态按最大序号递增保存且保留 Playwright 状态", () => {
    const outputDirectory = fs.mkdtempSync(path.join(os.tmpdir(), "aistudio-auth-"));
    temporaryDirectories.push(outputDirectory);
    fs.writeFileSync(path.join(outputDirectory, "auth-2.json"), "existing");

    const savedPath = saveAuthState(outputDirectory, { cookies: [{ name: "SID" }], origins: [] }, "user@example.com");

    assert.equal(path.basename(savedPath), "auth-3.json");
    assert.equal(fs.readFileSync(path.join(outputDirectory, "auth-2.json"), "utf8"), "existing");
    assert.deepEqual(JSON.parse(fs.readFileSync(savedPath, "utf8")), {
        accountName: "user@example.com",
        cookies: [{ name: "SID" }],
        origins: [],
    });
});
