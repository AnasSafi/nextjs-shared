import {MultiLangValue} from "@/models/core/localeModels";

export function isAcceptedLocale(localeCode: string): boolean {
    return acceptedLocales.includes(localeCode.toLowerCase());
}

export const acceptedLocales = [
    "abk",
    "aar",
    "afr",
    "aka",
    "sqi",
    "amh",
    "ara",
    "arg",
    "hye",
    "asm",
    "ava",
    "ave",
    "aym",
    "aze",
    "bam",
    "bak",
    "eus",
    "bel",
    "ben",
    "bis",
    "bos",
    "bre",
    "bul",
    "mya",
    "cat",
    "cha",
    "che",
    "nya",
    "zho",
    "chu",
    "chv",
    "cor",
    "cos",
    "cre",
    "hrv",
    "ces",
    "dan",
    "div",
    "nld",
    "dzo",
    "eng",
    "epo",
    "est",
    "ewe",
    "fao",
    "fij",
    "fin",
    "fra",
    "fry",
    "ful",
    "gla",
    "glg",
    "kat",
    "deu",
    "ell",
    "grn",
    "guj",
    "hat",
    "kal",
    "hau",
    "heb",
    "her",
    "hin",
    "hmo",
    "hun",
    "isl",
    "ido",
    "ibo",
    "ind",
    "ina",
    "ile",
    "iku",
    "ipk",
    "gle",
    "ita",
    "jpn",
    "jav",
    "kan",
    "kau",
    "kas",
    "kaz",
    "khm",
    "kik",
    "kin",
    "kir",
    "kom",
    "kon",
    "kor",
    "kua",
    "kur",
    "lao",
    "lat",
    "lav",
    "lim",
    "lin",
    "lit",
    "lub",
    "ltz",
    "mkd",
    "mlg",
    "msa",
    "mal",
    "mlt",
    "glv",
    "mri",
    "mar",
    "mah",
    "mon",
    "nau",
    "nav",
    "nde",
    "nbl",
    "ndo",
    "nep",
    "nor",
    "nob",
    "nno",
    "iii",
    "oci",
    "oji",
    "ori",
    "orm",
    "oss",
    "pli",
    "pus",
    "fas",
    "pol",
    "por",
    "pan",
    "que",
    "ron",
    "roh",
    "run",
    "rus",
    "sme",
    "smo",
    "sag",
    "san",
    "srd",
    "srp",
    "sna",
    "snd",
    "sin",
    "slk",
    "slv",
    "som",
    "sot",
    "spa",
    "sun",
    "swa",
    "ssw",
    "swe",
    "tgl",
    "tah",
    "tgk",
    "tam",
    "tat",
    "tel",
    "tha",
    "bod",
    "tir",
    "ton",
    "tso",
    "tsn",
    "tur",
    "tuk",
    "twi",
    "uig",
    "ukr",
    "urd",
    "uzb",
    "ven",
    "vie",
    "vol",
    "wln",
    "cym",
    "wol",
    "xho",
    "yid",
    "yor",
    "zha",
    "zul"
];

export const rtlLocalesThreeChar = [
    "ara", // Arabic
    "heb", // Hebrew
    "fas", // Persian
    "urd", // Urdu
    "pus", // Pashto
    "uig", // Uyghur
    "div", // Dhivehi
    "yid"  // Yiddish
] as const;

export function isLocaleRTL(localeCode: string): boolean {
    const code = (localeCode || "").trim().toLowerCase();
    if (!code) return false;

    const threeChar =
        code.length === 3
            ? code
            : code.length === 2
                ? convertToThreeCharLocale(code)
                : null;

    if (!threeChar) return false;

    return (rtlLocalesThreeChar as readonly string[]).includes(threeChar);
}

// Mapping of 2-char locales to 3-char ISO locales
export const localeMap: { [key: string]: string } = {
    "ab": "abk", "aa": "aar", "af": "afr", "ak": "aka", "sq": "sqi", "am": "amh", "ar": "ara", "an": "arg", "hy": "hye",
    "as": "asm", "av": "ava", "ae": "ave", "ay": "aym", "az": "aze", "bm": "bam", "ba": "bak", "eu": "eus", "be": "bel",
    "bn": "ben", "bi": "bis", "bs": "bos", "br": "bre", "bg": "bul", "my": "mya", "ca": "cat", "ch": "cha", "ce": "che",
    "ny": "nya", "zh": "zho", "cu": "chu", "cv": "chv", "kw": "cor", "co": "cos", "cr": "cre", "hr": "hrv", "cs": "ces",
    "da": "dan", "dv": "div", "nl": "nld", "dz": "dzo", "en": "eng", "eo": "epo", "et": "est", "ee": "ewe", "fo": "fao",
    "fj": "fij", "fi": "fin", "fr": "fra", "fy": "fry", "ff": "ful", "gd": "gla", "gl": "glg", "ka": "kat", "de": "deu",
    "el": "ell", "gn": "grn", "gu": "guj", "ht": "hat", "kl": "kal", "ha": "hau", "he": "heb", "hz": "her", "hi": "hin",
    "ho": "hmo", "hu": "hun", "is": "isl", "io": "ido", "ig": "ibo", "id": "ind", "ia": "ina", "ie": "ile", "iu": "iku",
    "ik": "ipk", "ga": "gle", "it": "ita", "ja": "jpn", "jv": "jav", "kn": "kan", "kr": "kau", "ks": "kas", "kk": "kaz",
    "km": "khm", "ki": "kik", "rw": "kin", "ky": "kir", "kv": "kom", "kg": "kon", "ko": "kor", "kj": "kua", "ku": "kur",
    "lo": "lao", "la": "lat", "lv": "lav", "li": "lim", "ln": "lin", "lt": "lit", "lu": "lub", "lb": "ltz", "mk": "mkd",
    "mg": "mlg", "ms": "msa", "ml": "mal", "mt": "mlt", "gv": "glv", "mi": "mri", "mr": "mar", "mh": "mah", "mn": "mon",
    "na": "nau", "nv": "nav", "nd": "nde", "nr": "nbl", "ng": "ndo", "ne": "nep", "no": "nor", "nb": "nob", "nn": "nno",
    "ii": "iii", "oc": "oci", "oj": "oji", "or": "ori", "om": "orm", "os": "oss", "pi": "pli", "ps": "pus", "fa": "fas",
    "pl": "pol", "pt": "por", "pa": "pan", "qu": "que", "ro": "ron", "rm": "roh", "rn": "run", "ru": "rus", "se": "sme",
    "sm": "smo", "sg": "sag", "sa": "san", "sc": "srd", "sr": "srp", "sn": "sna", "sd": "snd", "si": "sin", "sk": "slk",
    "sl": "slv", "so": "som", "st": "sot", "es": "spa", "su": "sun", "sw": "swa", "ss": "ssw", "sv": "swe", "tl": "tgl",
    "ty": "tah", "tg": "tgk", "ta": "tam", "tt": "tat", "te": "tel", "th": "tha", "bo": "bod", "ti": "tir", "to": "ton",
    "ts": "tso", "tn": "tsn", "tr": "tur", "tk": "tuk", "tw": "twi", "ug": "uig", "uk": "ukr", "ur": "urd", "uz": "uzb",
    "ve": "ven", "vi": "vie", "vo": "vol", "wa": "wln", "cy": "cym", "wo": "wol", "xh": "xho", "yi": "yid", "yo": "yor",
    "za": "zha", "zu": "zul"
};

// Function to convert 2-char locale to 3-char locale
export function convertToThreeCharLocale(locale: string): string | null {
    return localeMap[locale] || null;
}

// Mapping of 3-char locales to 2-char ISO locales
const threeToTwoCharLocaleMap: { [key: string]: string } = {
    "abk": "ab", "aar": "aa", "afr": "af", "aka": "ak", "sqi": "sq", "amh": "am", "ara": "ar", "arg": "an",
    "hye": "hy", "asm": "as", "ava": "av", "ave": "ae", "aym": "ay", "aze": "az", "bam": "bm", "bak": "ba",
    "eus": "eu", "bel": "be", "ben": "bn", "bis": "bi", "bos": "bs", "bre": "br", "bul": "bg", "mya": "my",
    "cat": "ca", "cha": "ch", "che": "ce", "nya": "ny", "zho": "zh", "chu": "cu", "chv": "cv", "cor": "kw",
    "cos": "co", "cre": "cr", "hrv": "hr", "ces": "cs", "dan": "da", "div": "dv", "nld": "nl", "dzo": "dz",
    "eng": "en", "epo": "eo", "est": "et", "ewe": "ee", "fao": "fo", "fij": "fj", "fin": "fi", "fra": "fr",
    "fry": "fy", "ful": "ff", "gla": "gd", "glg": "gl", "kat": "ka", "deu": "de", "ell": "el", "grn": "gn",
    "guj": "gu", "hat": "ht", "kal": "kl", "hau": "ha", "heb": "he", "her": "hz", "hin": "hi", "hmo": "ho",
    "hun": "hu", "isl": "is", "ido": "io", "ibo": "ig", "ind": "id", "ina": "ia", "ile": "ie", "iku": "iu",
    "ipk": "ik", "gle": "ga", "ita": "it", "jpn": "ja", "jav": "jv", "kan": "kn", "kau": "kr", "kas": "ks",
    "kaz": "kk", "khm": "km", "kik": "ki", "kin": "rw", "kir": "ky", "kom": "kv", "kon": "kg", "kor": "ko",
    "kua": "kj", "kur": "ku", "lao": "lo", "lat": "la", "lav": "lv", "lim": "li", "lin": "ln", "lit": "lt",
    "lub": "lu", "ltz": "lb", "mkd": "mk", "mlg": "mg", "msa": "ms", "mal": "ml", "mlt": "mt", "glv": "gv",
    "mri": "mi", "mar": "mr", "mah": "mh", "mon": "mn", "nau": "na", "nav": "nv", "nde": "nd", "nbl": "nr",
    "ndo": "ng", "nep": "ne", "nor": "no", "nob": "nb", "nno": "nn", "iii": "ii", "oci": "oc", "oji": "oj",
    "ori": "or", "orm": "om", "oss": "os", "pli": "pi", "pus": "ps",  "fas": "fa", "pol": "pl", "por": "pt",
    "pan": "pa", "que": "qu", "ron": "ro", "roh": "rm", "run": "rn", "rus": "ru", "sme": "se", "smo": "sm",
    "sag": "sg", "san": "sa", "srd": "sc", "srp": "sr", "sna": "sn", "snd": "sd", "sin": "si", "slk": "sk",
    "slv": "sl", "som": "so", "sot": "st", "spa": "es", "sun": "su", "swa": "sw", "ssw": "ss", "swe": "sv",
    "tgl": "tl", "tah": "ty", "tgk": "tg", "tam": "ta", "tat": "tt", "tel": "te", "tha": "th", "bod": "bo",
    "tir": "ti", "ton": "to", "tso": "ts", "tsn": "tn", "tur": "tr", "tuk": "tk", "twi": "tw", "uig": "ug",
    "ukr": "uk", "urd": "ur", "uzb": "uz", "ven": "ve", "vie": "vi", "vol": "vo", "wln": "wa", "cym": "cy",
    "wol": "wo", "xho": "xh", "yid": "yi", "yor": "yo", "zha": "za", "zul": "zu"
};

// Function to convert 3-char locale to 2-char locale
export function convertToTwoCharLocale(locale: string): string | null {
    return threeToTwoCharLocaleMap[locale] || null;
}

// Function to map MultiLangValue keys to two-char locales
export function mapKeysToTwoCharLocales(input: MultiLangValue): MultiLangValue {
    const output: MultiLangValue = {};
    for (const [key, value] of Object.entries(input)) {
        const twoCharKey = convertToTwoCharLocale(key);
        if (twoCharKey && typeof value === "string") {
            output[twoCharKey] = value;
        }
    }
    return output;
}

// Function to map MultiLangValue keys to three-char locales
export function mapKeysToThreeCharLocales(input: MultiLangValue): MultiLangValue {
    const output: MultiLangValue = {};
    for (const [key, value] of Object.entries(input)) {
        const threeCharKey = convertToThreeCharLocale(key);
        if (threeCharKey && typeof value === "string") {
            output[threeCharKey] = value;
        }
    }
    return output;
}

export function hasAtLeastOneNonEmptyValue(obj: MultiLangValue): boolean {
    return Object.values(obj).some((value: string | undefined): boolean => value?.trim() !== "");
}