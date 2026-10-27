import assert from "node:assert/strict";
import {execFileSync} from "node:child_process";
import {mkdtemp, mkdir, readFile, rm, symlink, writeFile} from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {createRequire} from "node:module";
import test from "node:test";
import postcss from "postcss";
import tailwind from "@tailwindcss/postcss";

const require = createRequire(import.meta.url);
const packageRoot = fileURLToPath(new URL("../../", import.meta.url));
const colors = [
    "purple", "slate", "gray", "zinc", "neutral", "stone", "red", "orange", "amber",
    "yellow", "lime", "green", "emerald", "teal", "cyan", "sky", "blue",
    "indigo", "violet", "fuchsia", "pink", "rose",
    "mauve", "olive", "mist", "taupe",
];

test("the published package generates pagination colors in an isolated Tailwind v4 consumer", async () => {
    const fixture = await mkdtemp(path.join(os.tmpdir(), "shared-pagination-tailwind-"));
    try {
        const consumer = path.join(fixture, "consumer");
        const installedPackage = path.join(consumer, "node_modules/@nextjs-shared/shared");
        await mkdir(installedPackage, {recursive: true});
        const npm = process.platform === "win32" ? "npm.cmd" : "npm";
        const [packed] = JSON.parse(execFileSync(npm, [
            "pack", "--ignore-scripts", "--json", "--pack-destination", fixture,
        ], {cwd: packageRoot, encoding: "utf8"}));
        assert.ok(packed.files.some((file) => file.path === "tailwind.css"));
        assert.ok(packed.files.some((file) => file.path === "dist/components/Tables/PaginationControls.js"));
        execFileSync("tar", [
            "-xzf", path.join(fixture, packed.filename), "-C", installedPackage, "--strip-components=1",
        ]);
        const tailwindRoot = path.dirname(require.resolve("tailwindcss/package.json"));
        await symlink(tailwindRoot, path.join(consumer, "node_modules/tailwindcss"), "junction");
        await writeFile(path.join(consumer, ".gitignore"), "node_modules\n");
        const cssPath = path.join(consumer, "src/app/[lng]/globals.css");
        await mkdir(path.dirname(cssPath), {recursive: true});
        const input = [
            '@import "tailwindcss";',
            '@import "@nextjs-shared/shared/tailwind.css";',
            '@custom-variant dark (&:where([data-theme=dark], [data-theme=dark] *));',
        ].join("\n");
        await writeFile(cssPath, input);
        assert.equal((await readFile(path.join(installedPackage, "tailwind.css"), "utf8")).trim(), '@source "./dist";');

        // No component markup or expected utility names exist in the consumer.
        // All candidates must come from the package's exported @source entry.
        for (const optimize of [false, true]) {
            const result = await postcss([tailwind({base: consumer, optimize})]).process(input, {from: cssPath});
            const root = postcss.parse(result.css);
            for (const color of colors) {
                for (const [variant, shade] of [["", "600"], ["dark\\:", "700"]]) {
                    const selector = `.${variant}bg-${color}-${shade}`;
                    let found = false;
                    root.walkRules((rule) => {
                        if (!rule.selector.includes(selector)) return;
                        rule.walkDecls("background-color", (declaration) => {
                            if (declaration.value === `var(--color-${color}-${shade})`) found = true;
                        });
                    });
                    assert.ok(found, `Missing ${selector} background (optimize=${optimize})`);
                }
            }
            // Also prove the scan covers the rest of the component's states.
            assert.ok(result.css.includes(".text-white"));
            assert.ok(result.css.includes(".bg-gray-200"));
            assert.ok(result.css.includes("data-theme=dark") || result.css.includes('data-theme="dark"'));
        }
    } finally {
        await rm(fixture, {recursive: true, force: true});
    }
});
