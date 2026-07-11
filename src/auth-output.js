import fs from "node:fs";
import path from "node:path";

export function getNextAuthPath(outputDirectory) {
    fs.mkdirSync(outputDirectory, { recursive: true });
    const indices = fs
        .readdirSync(outputDirectory)
        .map(name => name.match(/^auth-(\d+)\.json$/))
        .filter(Boolean)
        .map(match => Number.parseInt(match[1], 10));
    const nextIndex = indices.length === 0 ? 0 : Math.max(...indices) + 1;
    return path.join(outputDirectory, `auth-${nextIndex}.json`);
}

export function saveAuthState(outputDirectory, state, accountName = "unknown") {
    const authPath = getNextAuthPath(outputDirectory);
    fs.writeFileSync(authPath, JSON.stringify({ ...state, accountName }));
    return authPath;
}
