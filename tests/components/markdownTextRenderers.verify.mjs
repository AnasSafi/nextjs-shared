import assert from "node:assert/strict";
import {
    createConvertMarkdownTextToHtml,
    createMarkdownEmailHtmlConverter,
    createSafeMarkdownEmailHtmlConverter,
    sanitizeMarkdownHref,
    sanitizeMarkdownImageSrc,
} from "../../dist/utils/markdown/markdownTextRenderers.js";

const readMultiLang = (value, langCode) => {
    if (!value || typeof value !== "object") return "";
    if (langCode && typeof value[langCode] === "string" && value[langCode].length > 0) {
        return value[langCode];
    }
    for (const key of Object.keys(value)) {
        if (typeof value[key] === "string" && value[key].length > 0) {
            return value[key];
        }
    }
    return "";
};

const deps = {
    fallbackLng: "eng",
    languages: [],
    ATTR_BLOCK_RE_FRAGMENT: String.raw`\{(?:[^{}"']+|"[^"\\]*(?:\\.[^"\\]*)*"|'[^'\\]*(?:\\.[^'\\]*)*')*\}`,
    parseAttrBlock: () => ({}),
    parseMLAttr: () => undefined,
    getPreferredIso3LangFromDom: ({fallbackLng}) => fallbackLng,
    getStringFromMultiLangValueByLang: readMultiLang,
    isLanguageRTL: (iso3) => iso3 === "ara" || iso3 === "heb",
    resolveMediaSrc: (src) => {
        if (!src.startsWith("media:")) return src;
        return `/api/media/${src.slice("media:".length)}`;
    },
};

const convert = createConvertMarkdownTextToHtml(deps);

const webHtml = convert({
    text: '<<B>>Hi<</B>> <<H1>>Title<</H1>> ![alt](https://cdn.example.com/image.png "Caption")',
    target: "web",
});
assert.ok(webHtml.includes("<b>Hi</b>"), "Web output should keep bold tokens.");
assert.ok(
    webHtml.includes('<h1 class="text-5xl font-extrabold">Title</h1>'),
    "Web output should keep heading classes.",
);
assert.ok(webHtml.includes('src="https://cdn.example.com/image.png"'), "Web output should keep image rendering.");

const emailHtml = convert({
    text: "<<H1>>Title<</H1>>",
    target: "email",
    preferredIso3Lang: "eng",
});
assert.ok(emailHtml.includes('<h1 style="font-size:30px;'), "Email output should use inline heading styles.");
assert.ok(emailHtml.includes('lang="eng"'), "Email wrapper should include language.");
assert.ok(emailHtml.includes('dir="ltr"'), "Email wrapper should include direction.");

const unsafeHrefHtml = convert({
    text: "[![alt](https://cdn.example.com/image.png)](javascript:alert(1))",
    target: "email",
    preferredIso3Lang: "eng",
});
assert.ok(!unsafeHrefHtml.includes("<a href="), "Unsafe href should not render anchor.");
assert.ok(unsafeHrefHtml.includes("<img"), "Image should remain when href is unsafe.");

const unsafeImageHtml = convert({
    text: "![alt](javascript:alert(1))",
    target: "email",
    preferredIso3Lang: "eng",
});
assert.ok(!unsafeImageHtml.includes("<img"), "Unsafe email image src should be removed.");

const relativeMediaWithoutBaseUrlHtml = convert({
    text: "![alt](media:123)",
    target: "email",
    preferredIso3Lang: "eng",
});
assert.ok(
    !relativeMediaWithoutBaseUrlHtml.includes("<img"),
    "Relative media URL should be rejected for email when no base URL is provided.",
);

const relativeMediaWithBaseUrlHtml = convert({
    text: "![alt](media:123)",
    target: "email",
    preferredIso3Lang: "eng",
    emailBaseUrl: "https://app.example.com",
});
assert.ok(
    relativeMediaWithBaseUrlHtml.includes('src="https://app.example.com/api/media/123"'),
    "Relative media URL should be absolutized for email when base URL is provided.",
);

const rtlListHtml = convert({
    text: "<<UL>>\n<<LI>>عنصر<</LI>>\n<</UL>>",
    target: "email",
    preferredIso3Lang: "ara",
});
assert.ok(
    rtlListHtml.includes("padding-right:24px;padding-left:0"),
    "RTL email list should use right padding.",
);

const ltrListHtml = convert({
    text: "<<OL>>\n<<LI>>Item<</LI>>\n<</OL>>",
    target: "email",
    preferredIso3Lang: "eng",
});
assert.ok(
    ltrListHtml.includes("padding-left:24px;padding-right:0"),
    "LTR email list should use left padding.",
);

const explicitWrapperHtml = convert({
    text: "Wrapper test",
    target: "email",
    emailLang: "ara",
    emailDir: "rtl",
    wrapEmailContainer: true,
});
assert.ok(
    explicitWrapperHtml.startsWith('<div lang="ara" dir="rtl" style="white-space:pre-line">'),
    "Email wrapper should support explicit lang and dir.",
);

assert.equal(
    sanitizeMarkdownHref("javascript:alert(1)", "web"),
    null,
    "Unsafe href protocol should be rejected.",
);
assert.equal(
    sanitizeMarkdownHref("https://example.com/page", "email"),
    "https://example.com/page",
    "Safe absolute href should be accepted.",
);
assert.equal(
    sanitizeMarkdownImageSrc("/api/media/123", "email"),
    null,
    "Relative image src should be rejected for email target.",
);
assert.equal(
    sanitizeMarkdownImageSrc("/api/media/123", "web"),
    "/api/media/123",
    "Relative image src should be preserved for web target.",
);

const emailConverter = createMarkdownEmailHtmlConverter(deps);
const emailConverterResult = emailConverter("Hello", {
    emailLang: "eng",
    emailDir: "ltr",
});
assert.ok(
    emailConverterResult.includes('lang="eng" dir="ltr"'),
    "Email converter should pass lang/dir options into wrapper.",
);

const safeEmailConverter = createSafeMarkdownEmailHtmlConverter({
    ...deps,
    sanitizeHtml: (html) => html.replace(/Hello/g, "Hi"),
});
const safeConverterResult = safeEmailConverter("Hello");
assert.ok(
    safeConverterResult.includes("Hi"),
    "Safe email converter should enforce sanitizer usage.",
);

console.log("markdownTextRenderers verification passed.");
