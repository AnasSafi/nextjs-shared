export type LocaleCode = string;
export type MultiLangValue = Partial<Record<LocaleCode, string>>;

export type TranslationNode = MultiLangValue | { [key: string]: TranslationNode };
export type Translations = { [key: string]: TranslationNode };

export type ForcePlusMode = "auto" | "always" | "never";

export type TranslateFn = (key: string) => string;