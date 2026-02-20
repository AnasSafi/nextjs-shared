import {useCallback, useRef, useState} from "react";
import type {ChangeEvent} from "react";
import type {MultiLangValue} from "../../models/core/localeModels";
import type {RepeaterRowModel, WithRowId} from "../../models/core/repeaterModels";
import {LanguageConfig} from "../../i18n/languageConfigUtils";
import {generateEmptyMultiLangValueFromLanguages, isMultiLangValueFromLanguages} from "../../utils/formUtils";

type State = Record<string, unknown>;
type FormControlEl = HTMLInputElement | HTMLTextAreaElement;

const isRecord = (v: unknown): v is Record<string, unknown> =>
    typeof v === "object" && v !== null && !Array.isArray(v);

const isWithRowId = (v: unknown): v is WithRowId => isRecord(v) && typeof v.rowId === "string";

const hasSections = (v: unknown): v is {sections: Array<Record<string, unknown>>} =>
    isRecord(v) && Array.isArray(v.sections);

const hasProp = <K extends string>(v: unknown, k: K): v is Record<K, unknown> => isRecord(v) && k in v;

const safeParseJson = (s: string): unknown => {
    try {
        return JSON.parse(s);
    } catch {
        return null;
    }
};

const deepClone = <T,>(v: T): T => {
    if (typeof structuredClone === "function") return structuredClone(v);
    return JSON.parse(JSON.stringify(v)) as T;
};

export function createUseFormInput(languages: LanguageConfig[]) {
    return function useFormInput<T extends object>(initialState: T, locale: string) {
        const initialRef = useRef<T>(initialState);
        const [state, setState] = useState<T>(initialState);

        const handleInputChange = useCallback(
            (event: ChangeEvent<FormControlEl>, shouldDelete = false) => {
                const target = event.target as FormControlEl;
                const {name, value} = target;

                const inputEl = target as HTMLInputElement;
                const inputType = inputEl.type;
                const checked = inputEl.checked ?? false;

                const isCheckbox = inputType === "checkbox";
                const isRadio = inputType === "radio";
                const inputValue: unknown = isCheckbox ? checked : value;

                setState((prevState) => {
                    const prev = prevState as unknown as State;

                    const updateState = (patch: Partial<State> | null): T => {
                        if (!patch) return prevState;
                        return {...(prev as Record<string, unknown>), ...patch} as T;
                    };

                    const getDynamicProperty = <U,>(object: State, key: string, defaultValue: U): U => {
                        return key in object ? (object[key] as U) : defaultValue;
                    };

                    // 1) pattern: arrayName[idx][prop]
                    const handleNestedArray = (): Partial<State> | null => {
                        const rx = /(\w+)\[([^\]]+)]\[(\w+)]/;
                        const match = name.match(rx);
                        if (!match) return null;

                        const [, arrayName, arrayIndexStr, property] = match;
                        const raw = getDynamicProperty<unknown>(prev, arrayName, []);

                        const rawArray = Array.isArray(raw) ? raw : hasSections(raw) ? raw.sections : null;

                        if (!Array.isArray(rawArray)) return null;

                        const newArray = rawArray.slice();
                        const idx = newArray.findIndex((obj) => isWithRowId(obj) && String(obj.rowId) === arrayIndexStr);
                        if (idx === -1) return null;

                        const row = newArray[idx];
                        if (!isRecord(row)) return null;

                        const current = row[property];
                        const strVal = typeof inputValue === "string" ? inputValue : String(inputValue);
                        const nextValue = isMultiLangValueFromLanguages(languages, current)
                            ? {
                                ...(current as MultiLangValue),
                                [locale]: strVal,
                            }
                            : inputValue;

                        newArray[idx] = {...(row as Record<string, unknown>), [property]: nextValue};

                        if (!Array.isArray(raw) && hasSections(raw)) {
                            return {[arrayName]: {...(raw as Record<string, unknown>), sections: newArray}};
                        }
                        return {[arrayName]: newArray};
                    };

                    // 2) repeater: arrayName[sections][rowId][prop]
                    const handleRepeaterArray = (): T | Partial<State> | null => {
                        const rx = /(\w+)\[sections]\[([^\]]+)]\[([^\]]+)]/;
                        const match = name.match(rx);
                        if (!match) return null;

                        const [, arrayName, rowId, property] = match;
                        const model = getDynamicProperty<RepeaterRowModel<WithRowId>>(
                            prev,
                            arrayName,
                            {sections: [], toDeleteSections: []},
                        );

                        const sections = model.sections ?? [];
                        const idx = sections.findIndex((s) => isWithRowId(s) && s.rowId === rowId);
                        if (idx === -1) return null;

                        const row = sections[idx] as Record<string, unknown>;
                        const current = row[property];
                        const strVal = typeof inputValue === "string" ? inputValue : String(inputValue);
                        const nextValue = isMultiLangValueFromLanguages(languages, current)
                            ? {
                                ...(current as MultiLangValue),
                                [locale]: strVal,
                            }
                            : inputValue;

                        const nextSections = sections.slice();
                        nextSections[idx] = {...(row as Record<string, unknown>), [property]: nextValue} as WithRowId;

                        const base =
                            hasProp(prev, arrayName) && isRecord(prev[arrayName]) ? (prev[arrayName] as Record<string, unknown>) : {};
                        return {
                            ...(prev as Record<string, unknown>),
                            [arrayName]: {
                                ...base,
                                sections: nextSections,
                                toDeleteSections: model.toDeleteSections ?? [],
                            },
                        } as T;
                    };

                    // 3) nested repeater: main[sections][row1][midKey][sections][row2][prop]
                    const handleNestedRepeaterArray = (): T | null => {
                        const rx = /(\w+)\[sections]\[([^\]]+)]\[([\w]+)]\[sections]\[([^\]]+)]\[([\w]+)]/;
                        const match = name.match(rx);
                        if (!match) return null;

                        const [, mainArray, firstRowId, midKey, secondRowId, property] = match;
                        const cloned = deepClone(prevState) as unknown as State;

                        if (!hasProp(cloned, mainArray) || !hasSections((cloned as Record<string, unknown>)[mainArray])) return null;

                        const mainModel = (cloned as Record<string, unknown>)[mainArray] as {
                            sections: Array<Record<string, unknown>>;
                        };
                        const firstIdx = mainModel.sections.findIndex((s) => isWithRowId(s) && s.rowId === firstRowId);
                        if (firstIdx === -1) return null;

                        const firstSection = mainModel.sections[firstIdx] as Record<string, unknown>;
                        if (!hasProp(firstSection, midKey) || !hasSections(firstSection[midKey])) {
                            firstSection[midKey] = {sections: [] as Array<Record<string, unknown>>};
                        }
                        const midSection = firstSection[midKey] as {sections: Array<Record<string, unknown>>};

                        let nestedIdx = midSection.sections.findIndex((s) => isWithRowId(s) && s.rowId === secondRowId);
                        if (nestedIdx === -1) {
                            midSection.sections.push({rowId: secondRowId, [property]: {} as unknown});
                            nestedIdx = midSection.sections.length - 1;
                        }

                        const nested = midSection.sections[nestedIdx] as Record<string, unknown>;
                        const current = nested[property];
                        const strVal = typeof inputValue === "string" ? inputValue : String(inputValue);
                        nested[property] = isMultiLangValueFromLanguages(languages, current)
                            ? {
                                ...(current as MultiLangValue),
                                [locale]: strVal,
                            }
                            : inputValue;

                        return cloned as unknown as T;
                    };

                    // 4) dynamic keys: name="items[key:abc123]"
                    const handleDynamicKeys = (): Partial<State> | null => {
                        const match = name.match(/([^[]+)\[key:(.*)]/);
                        if (!match) return null;

                        const [, dynamicName, key] = match;

                        type DynamicKeyItem = {id: string; value: unknown};
                        const existing = getDynamicProperty<DynamicKeyItem[]>(prev, dynamicName, []);

                        let next = existing.map((it) => (it.id === key ? {...it, value: inputValue} : it));
                        if (shouldDelete) {
                            next = existing.filter((it) => it.id !== key);
                        } else if (!existing.some((it) => it.id === key)) {
                            next = [...existing, {id: key, value: inputValue}];
                        }
                        return {[dynamicName]: next};
                    };

                    // 5) array-like inputs (…[]), checkbox[], radio
                    const handleArrayInputs = (): Partial<State> | null => {
                        if (inputType !== "checkbox" && name.endsWith("[]")) {
                            const arrayName = name.slice(0, -2);
                            const parsed = typeof inputValue === "string" ? safeParseJson(inputValue) : [];
                            const existing = getDynamicProperty<unknown[]>(prev, arrayName, []);
                            const next = Array.isArray(parsed)
                                ? parsed.filter((x) => x !== null)
                                : parsed !== null
                                    ? [parsed]
                                    : existing;
                            return {[arrayName]: next};
                        }

                        if (inputType === "checkbox" && name.endsWith("[]")) {
                            const arrayName = name.slice(0, -2);
                            const existing = getDynamicProperty<unknown[]>(prev, arrayName, []);
                            let next = existing;

                            if (checked) {
                                next = existing.includes(value) ? existing : [...existing, value];
                            } else {
                                next = existing.filter((x) => x !== value);
                            }
                            return {[arrayName]: next};
                        }

                        if (isRadio) {
                            // Only update when checked=true
                            return checked ? {[name]: value} : null;
                        }

                        return null;
                    };

                    // 6) flat or MultiLangValue (self-heal using initialRef expected shape)
                    const handleMultiLangFlat = (): Partial<State> => {
                        const existing = prev[name];
                        const expected = (initialRef.current as unknown as State)[name];
                        const strVal = typeof inputValue === "string" ? inputValue : String(inputValue);

                        if (
                            isMultiLangValueFromLanguages(languages, existing) ||
                            isMultiLangValueFromLanguages(languages, expected)
                        ) {
                            const base: MultiLangValue = isMultiLangValueFromLanguages(languages, existing)
                                ? (existing as MultiLangValue)
                                : generateEmptyMultiLangValueFromLanguages(languages);
                            return {[name]: {...base, [locale]: strVal}};
                        }
                        return {[name]: inputValue};
                    };

                    return updateState(
                        handleNestedArray() ??
                        handleDynamicKeys() ??
                        handleArrayInputs() ??
                        handleNestedRepeaterArray() ??
                        handleRepeaterArray() ??
                        handleMultiLangFlat(),
                    );
                });
            },
            [locale],
        );

        const setBodyData = useCallback((data: T) => {
            setState(data);
        }, []);

        const reset = useCallback(() => {
            setState(initialRef.current);
        }, []);

        return {state, handleInputChange, setBodyData, reset};
    };
}