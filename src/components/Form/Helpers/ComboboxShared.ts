"use client";

import {
    type CSSProperties,
    type Ref,
    type RefObject,
    useEffect,
    useLayoutEffect,
    useState,
} from "react";
import type {PaginationModel, SelectOptionModel} from "../../../models/core/dbModels";
import {getStringFromMultiLangValueByLang} from "../../../utils/multiLangValueReadUtils";

/* Types & refs */
export type DropdownStrategy = "inline" | "fixed";

export function composeRefs<T>(...refs: Array<Ref<T> | undefined>): (node: T | null) => void {
    return (node: T | null): void => {
        for (const ref of refs) {
            if (!ref) continue;
            if (typeof ref === "function") ref(node);
            else (ref as { current: T | null }).current = node;
        }
    };
}

/* Option list helpers */
export function mergeUniqueById(
    base: SelectOptionModel[] = [],
    incoming: SelectOptionModel[] = []
): SelectOptionModel[] {
    const seen = new Set(base.map((o) => o.id));
    const out: SelectOptionModel[] = [...base];
    for (const it of incoming) {
        if (!seen.has(it.id)) {
            out.push(it);
            seen.add(it.id);
        }
    }
    return out;
}

/* Locale-aware normalization + ranking */
const ARABIC_DIACRITICS_REGEX: RegExp = /[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06ED]/g;
const LAM_ALEF_LIGATURES: RegExp = /[ﻻﻹﻷﻵ]/g;
const BIDI_MARKS: RegExp = /[\u200c\u200d\u200e\u200f\u202a-\u202e]/g;
const NON_WORDS: RegExp = /[^\p{L}\p{N}\s]/gu;

function toWesternDigits(input: string): string {
    return input
        .replace(/[\u0660-\u0669]/g, (d: string): string =>
            String.fromCharCode(d.charCodeAt(0) - 0x0660 + 48)
        )
        .replace(/[\u06F0-\u06F9]/g, (d: string): string =>
            String.fromCharCode(d.charCodeAt(0) - 0x06f0 + 48)
        );
}

export function normalizeForSearch(input: string): string {
    const s1: string = toWesternDigits(input)
        .toLowerCase()
        .normalize("NFKD")
        .replace(ARABIC_DIACRITICS_REGEX, "")
        .replace(/\u0640/g, "")
        .replace(LAM_ALEF_LIGATURES, "لا")
        .replace(BIDI_MARKS, "")
        .replace(/[أإآٱ]/g, "ا")
        .replace(/ؤ/g, "و")
        .replace(/ئ/g, "ي")
        .replace(/ى/g, "ي")
        .replace(/ی/g, "ي")
        .replace(/ک/g, "ك")
        .replace(/ة/g, "ه")
        .replace(NON_WORDS, " ")
        .replace(/\s+/g, " ")
        .trim();

    return s1.replace(/[\u0654\u0655]/g, "");
}

function escapeRegex(s: string): string {
    return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function buildGapRegex(tokens: string[], maxGapWords: number = 3): RegExp | null {
    if (tokens.length < 2) return null;
    const parts: string[] = [];
    for (let i = 0; i < tokens.length; i++) {
        const tok: string = escapeRegex(tokens[i]);
        if (i === 0) parts.push(tok);
        else parts.push(`(?:\\s+\\S+){0,${maxGapWords}}\\s+${tok}`);
    }
    return new RegExp(parts.join(""), "u");
}

export function localFilterRank(
    options: SelectOptionModel[],
    needle: string,
    getLabel: (opt: SelectOptionModel) => string,
    opts?: { softFilter?: boolean }
): SelectOptionModel[] {
    const tokens: string[] = normalizeForSearch(needle).split(/\s+/).filter(Boolean);
    if (tokens.length === 0) return options;

    const softFilter = opts?.softFilter ?? false;

    const gapRe: RegExp | null = buildGapRegex(tokens, 3);
    const rev: string[] = [...tokens].reverse();
    const gapReRev: RegExp | null = buildGapRegex(rev, 3);
    const joined: string = tokens.join(" ");

    type Scored = { opt: SelectOptionModel; score: number };
    const results: Scored[] = [];

    for (const opt of options) {
        const label: string = getLabel(opt);
        const labelNorm: string = normalizeForSearch(label);
        const extras: string[] = (opt.searchTexts ?? []).map(normalizeForSearch);
        const hay: string = `${labelNorm} ${extras.join(" ")}`.trim();

        const present: boolean = tokens.every((t) => hay.includes(t));
        if (!present && !softFilter) continue;

        let score: number;
        if (present) {
            if (labelNorm.includes(joined)) score = 0;
            else if (gapRe && gapRe.test(labelNorm)) score = 1;
            else if (gapRe && gapRe.test(hay)) score = 2;
            else if (gapReRev && gapReRev.test(hay)) score = 3;
            else {
                let s = 0;
                for (const t of tokens) {
                    const idx = hay.indexOf(t);
                    s += idx >= 0 ? idx : 10_000;
                }
                score = 100 + s;
            }
        } else {
            score = 1_000_000;
        }

        results.push({opt, score});
    }

    results.sort((a, b) => a.score - b.score || a.opt.id.localeCompare(b.opt.id));
    return results.map((r) => r.opt);
}

/* Remote pagination */
export function isRemoteSearchCapable(
    pagination: PaginationModel | null,
    loadedCount: number
): boolean {
    const path = pagination?.pagination?.getMorePath;
    if (!path) return false;

    const total = pagination?.pagination?.totalCount;
    if (typeof total === "number") return loadedCount < total;

    return true;
}

/* Dropdown positioning */
export function useFixedDropdownPosition(
    isOpen: boolean,
    strategy: DropdownStrategy,
    anchorRef: RefObject<HTMLDivElement | null>,
    triggerRef?: RefObject<HTMLElement | null>,
    listboxId?: string,
    maxHeightPx: number = 224,
    zIndex: number = 1200
): CSSProperties | undefined {
    const [style, setStyle] = useState<CSSProperties | undefined>(undefined);

    useLayoutEffect(() => {
        if (!isOpen || strategy !== "fixed") {
            setStyle(undefined);
            return;
        }

        const target = resolveTriggerElement(triggerRef, anchorRef, listboxId);
        if (!target) return;

        const update = (): void => {
            const r = target.getBoundingClientRect();
            const gap = 4;
            const viewportWidth = Math.max(document.documentElement.clientWidth, window.innerWidth || 0);
            const spaceBelow = window.innerHeight - (r.bottom + gap);
            const maxH = Math.max(0, Math.min(maxHeightPx, spaceBelow));
            const width = Math.round(r.width);
            const maxLeft = Math.max(0, viewportWidth - width);
            const left = Math.round(Math.min(Math.max(0, r.left), maxLeft));
            const top = Math.round(r.bottom + gap);

            setStyle({
                position: "fixed",
                top,
                left,
                width,
                maxHeight: maxH,
                zIndex,
                visibility: maxH > 0 ? "visible" : "hidden",
            });
        };

        update();
        requestAnimationFrame(update);

        const resizeOpts: AddEventListenerOptions = {passive: true};
        const scrollOpts: AddEventListenerOptions = {passive: true, capture: true};

        const scrollableAncestors = getScrollableAncestors(target);

        window.addEventListener("resize", update, resizeOpts);
        window.addEventListener("scroll", update, scrollOpts);
        for (const node of scrollableAncestors) {
            node.addEventListener("scroll", update, {passive: true});
        }

        let resizeObserver: ResizeObserver | null = null;
        if (typeof ResizeObserver !== "undefined") {
            resizeObserver = new ResizeObserver(update);
            resizeObserver.observe(target);
            if (anchorRef.current && anchorRef.current !== target) {
                resizeObserver.observe(anchorRef.current);
            }
        }

        return () => {
            window.removeEventListener("resize", update);
            window.removeEventListener("scroll", update, true);
            for (const node of scrollableAncestors) {
                node.removeEventListener("scroll", update);
            }
            resizeObserver?.disconnect();
        };
    }, [isOpen, strategy, anchorRef, triggerRef, listboxId, maxHeightPx, zIndex]);

    return style;
}

function resolveTriggerElement(
    triggerRef: RefObject<HTMLElement | null> | undefined,
    anchorRef: RefObject<HTMLDivElement | null>,
    listboxId?: string,
): HTMLElement | null {
    const byRef = triggerRef?.current;
    if (byRef) return byRef;

    if (listboxId) {
        const selector = `[role="combobox"][aria-controls="${listboxId}"]`;
        const byAria = document.querySelector<HTMLElement>(selector);
        if (byAria) return byAria;
    }

    return anchorRef.current;
}

function getScrollableAncestors(el: HTMLElement): HTMLElement[] {
    const nodes: HTMLElement[] = [];
    let node: HTMLElement | null = el.parentElement;

    while (node && node !== document.body && node !== document.documentElement) {
        const style = window.getComputedStyle(node);
        const overflowY = style.overflowY;
        const overflowX = style.overflowX;
        const canScrollY =
            (overflowY === "auto" || overflowY === "scroll" || overflowY === "overlay") &&
            node.scrollHeight > node.clientHeight;
        const canScrollX =
            (overflowX === "auto" || overflowX === "scroll" || overflowX === "overlay") &&
            node.scrollWidth > node.clientWidth;

        if (canScrollY || canScrollX) nodes.push(node);
        node = node.parentElement;
    }

    return nodes;
}

/* Click outside */
export function useClickOutside(
    isOpen: boolean,
    refs: ReadonlyArray<RefObject<HTMLElement>>,
    onClose: () => void
): void {
    useEffect(() => {
        if (!isOpen) return;

        const handler = (evt: MouseEvent): void => {
            const target = evt.target as Node;
            const clickedInside = refs.some((r) => {
                const el = r.current;
                return el ? el.contains(target) : false;
            });
            if (!clickedInside) onClose();
        };

        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, [isOpen, onClose, refs]);
}

/* Label helpers */

export function normalizeLangCode(lng?: string): string {
    const raw = String(lng ?? "").toLowerCase();
    const base = raw.split("-")[0];
    return base === "eng" ? "en" : base;
}

export function getPrimaryLabelFactory(currentLng?: string) {
    return (opt: SelectOptionModel | null | undefined): string => {
        if (!opt) return "";
        const fromUtil = getStringFromMultiLangValueByLang(opt.name, currentLng) as string | undefined;
        if (fromUtil && String(fromUtil).trim()) return String(fromUtil);

        const m = opt.name as Record<string, unknown> | undefined;
        const fallback =
            (m?.en as string) ??
            (m?.eng as string) ??
            (m?.ar as string) ??
            (m ? (Object.values(m)[0] as string) : "");
        return fallback ?? "";
    };
}

export function getAllLanguagesLabelFactory(currentLng?: string) {
    return (opt: SelectOptionModel | null | undefined): string => {
        if (!opt) return "";

        const m = opt.name as Record<string, unknown> | undefined;
        if (!m) return "";

        const entries = Object.entries(m).filter(
            ([, v]) => typeof v === "string" && String(v).trim().length > 0
        ) as Array<[string, string]>;

        if (entries.length === 0) return "";

        const curNorm = normalizeLangCode(currentLng);
        const current = entries.find(([lng]) => normalizeLangCode(lng) === curNorm);
        const others = entries
            .filter(([lng]) => normalizeLangCode(lng) !== curNorm)
            .sort(([a], [b]) => a.localeCompare(b));

        const ordered = [current?.[1], ...others.map(([, v]) => v)].filter(Boolean) as string[];

        const seen = new Set<string>();
        const unique = ordered.filter((v) => {
            const key = v.trim();
            if (!key || seen.has(key)) return false;
            seen.add(key);
            return true;
        });

        return unique.join(" - ");
    };
}

export function getOptionLabelFactory(currentLng?: string, showAll?: boolean) {
    const primary = getPrimaryLabelFactory(currentLng);
    const allLangs = getAllLanguagesLabelFactory(currentLng);
    return (opt: SelectOptionModel | null | undefined) =>
        showAll ? allLangs(opt) : primary(opt);
}
