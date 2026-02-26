"use client";

import React from "react";
import type {JSX} from "react";
import {captionAttrToUi, IMAGE_OBJECT_FIT_VARIANTS, IMAGE_SIZE_VARIANTS} from "../../../models/markdown/markdownTokens";
import {OpenMarkdownImageModel} from "../../../models/markdown/markdownModels";
import {InsertMarkdownImageResult} from "../../../models/markdown/markdownImageModels";
import {
    buildMarkdownImage,
    findImageTokenAtStrict,
    parseMLAttr,
    scanImageTokens
} from "../../../utils/markdown/markdownImageHelpers";


type ImageToken = ReturnType<typeof scanImageTokens>[number];

export type MarkdownControlsDeps = {
    iconPath: string;

    NextImage: (props: {
        src: string;
        alt: string;
        width: number;
        height: number;
        className?: string;
    }) => JSX.Element;

    useMarkdownImageModal: () => {
        openModal: (args: { data?: OpenMarkdownImageModel }) => Promise<InsertMarkdownImageResult | null>;
    };
};

export type MarkdownControlsProps = {
    markdownGroups?: Array<{
        name: string;
        items: Array<{ name: string }>;
    }>;
    textareaRef: React.RefObject<HTMLTextAreaElement | null>;
    setValue: (value: string) => void;
    currentLang?: string;
};

export function createMarkdownControls(deps: MarkdownControlsDeps) {
    const {iconPath, NextImage, useMarkdownImageModal} = deps;

    return function MarkdownControls(
        {
            markdownGroups,
            textareaRef,
            setValue,
            currentLang,
        }: MarkdownControlsProps): JSX.Element {
        const {openModal: openManageMarkdownImageModal} = useMarkdownImageModal();

        const isSizeVariant = (v?: string): v is (typeof IMAGE_SIZE_VARIANTS)[number] =>
            typeof v === "string" && (IMAGE_SIZE_VARIANTS as readonly string[]).includes(v);

        const isFitToken = (v?: string): v is (typeof IMAGE_OBJECT_FIT_VARIANTS)[number] =>
            typeof v === "string" && (IMAGE_OBJECT_FIT_VARIANTS as readonly string[]).includes(v);

        const toSizeVariant = (v?: string) => (isSizeVariant(v) ? v : undefined);
        const toFit = (v?: string) => (isFitToken(v) ? v : undefined);

        const replaceRange = (start: number, end: number, text: string) => {
            const textarea: HTMLTextAreaElement | null = textareaRef.current;
            if (!textarea) return;

            const {value: current} = textarea;
            const before = current.slice(0, start);
            const after = current.slice(end);
            const nextValue = `${before}${text}${after}`;
            setValue(nextValue);

            const newCaret = before.length + text.length;
            requestAnimationFrame(() => {
                const el = textareaRef.current;
                if (!el) return;
                el.selectionStart = newCaret;
                el.selectionEnd = newCaret;
                el.focus();
            });
        };

        const insertAtCursor = (textToInsert: string) => {
            const textarea: HTMLTextAreaElement | null = textareaRef.current;
            if (!textarea) return;

            const {selectionStart, selectionEnd, value: current} = textarea;
            const before: string = current.slice(0, selectionStart);
            const after: string = current.slice(selectionEnd);
            const needsLeadingNewline: boolean = before.length > 0 && !before.endsWith("\n");
            const insert = `${needsLeadingNewline ? "\n" : ""}${textToInsert}\n`;
            const nextValue = `${before}${insert}${after}`;
            setValue(nextValue);

            const newCaret: number = before.length + insert.length;
            requestAnimationFrame(() => {
                const el = textareaRef.current;
                if (!el) return;
                el.selectionStart = newCaret;
                el.selectionEnd = newCaret;
                el.focus();
            });
        };

        const imageModal = async () => {
            const textarea: HTMLTextAreaElement | null = textareaRef.current;
            let initialData: OpenMarkdownImageModel | undefined;
            let token: ImageToken | null = null;

            if (textarea) {
                const caret: number = textarea.selectionStart ?? 0;
                token = findImageTokenAtStrict(textarea.value, caret);

                if (token) {
                    const a: Record<string, string> = token.attrs ?? {};

                    let mediaId: string | undefined = a["media-id"];
                    if (!mediaId && token.src.startsWith("media:")) {
                        mediaId = token.src.slice("media:".length);
                    }

                    initialData = {
                        markdownImageId: mediaId ?? null,
                        markdownImage: mediaId,
                        source: mediaId ? "device" : "httpUrl",
                        httpUrl: mediaId ? "" : token.src,

                        altText: parseMLAttr(a["alt-json"]) ?? (token.alt ? {default: token.alt} : undefined),
                        caption: parseMLAttr(a["caption-json"]) ?? (token.title ? {default: token.title} : undefined),
                        linkUrl: (token.link ?? a["link"]) || undefined,
                        alignment: (() => {
                            const v = a["align"];
                            if (v === "start" || v === "center" || v === "end" || v === "left" || v === "right") return v;
                            return null;
                        })(),
                        captionPosition: captionAttrToUi(a["caption-position"]),

                        size: toSizeVariant(a["size"]),
                        width: a["width"] && /^\d+$/.test(a["width"]) ? Number(a["width"]) : undefined,
                        height: a["height"] && /^\d+$/.test(a["height"]) ? Number(a["height"]) : undefined,
                        ratio: a["ratio"] || undefined,
                        fit: toFit(a["fit"]),
                    };
                }
            }

            const result: InsertMarkdownImageResult | null = await openManageMarkdownImageModal({data: initialData});
            if (result && (result.mediaId || result.url)) {
                const md = buildMarkdownImage(result, currentLang);
                if (token) {
                    replaceRange(token.start, token.end, md);
                } else {
                    insertAtCursor(md);
                }
            }
        };

        const getActionFunction = (itemName: string): (() => void) => {
            switch (itemName) {
                case "Bold":
                    return () => wrapText("<<B>>", "<</B>>");
                case "Italic":
                    return () => wrapText("<<I>>", "<</I>>");
                case "Underline":
                    return () => wrapText("<<U>>", "<</U>>");
                case "Strikethrough":
                    return () => wrapText("<<S>>", "<</S>>");
                case "Subscript":
                    return () => wrapText("<<SUB>>", "<</SUB>>");
                case "Superscript":
                    return () => wrapText("<<SUP>>", "<</SUP>>");
                case "Heading1":
                    return () => wrapText("<<H1>>", "<</H1>>");
                case "Heading2":
                    return () => wrapText("<<H2>>", "<</H2>>");
                case "Heading3":
                    return () => wrapText("<<H3>>", "<</H3>>");
                case "Heading4":
                    return () => wrapText("<<H4>>", "<</H4>>");
                case "Heading5":
                    return () => wrapText("<<H5>>", "<</H5>>");
                case "Heading6":
                    return () => wrapText("<<H6>>", "<</H6>>");
                case "BulletedList":
                    return () => wrapList("Bulleted");
                case "NumberedList":
                    return () => wrapList("Numbered");
                case "AlignJustify":
                    return () => wrapText("<<TEXT_ALIGN_JUSTIFY>>", "<</TEXT_ALIGN_JUSTIFY>>");
                case "AlignLeft":
                    return () => wrapText("<<TEXT_ALIGN_LEFT>>", "<</TEXT_ALIGN_LEFT>>");
                case "AlignCenter":
                    return () => wrapText("<<TEXT_ALIGN_CENTER>>", "<</TEXT_ALIGN_CENTER>>");
                case "AlignRight":
                    return () => wrapText("<<TEXT_ALIGN_RIGHT>>", "<</TEXT_ALIGN_RIGHT>>");
                case "Image":
                    return () => {
                        void imageModal();
                    };
                default:
                    return () => {
                    };
            }
        };

        const wrapList = (listType: "Numbered" | "Bulleted") => {
            const textarea: HTMLTextAreaElement | null = textareaRef.current;
            if (!textarea) return;

            const {selectionStart, selectionEnd} = textarea;
            const text = textarea.value;

            const beforeText = text.substring(0, selectionStart);
            const selectedText = text.substring(selectionStart, selectionEnd);
            const afterText = text.substring(selectionEnd);

            const wrappedLines = selectedText
                .split("\n")
                .map((line) => (line.trim() === "" ? "" : `<<LI>>${line}<</LI>>`))
                .join("\n");

            const listTag = listType === "Numbered" ? "OL" : "UL";
            const newValue = beforeText + `<<${listTag}>>\n` + wrappedLines + `\n<</${listTag}>>` + afterText;

            setValue(newValue || "");

            const newCursorPos = selectionStart + `<<${listTag}>>\n`.length;
            textarea.selectionStart = newCursorPos;
            textarea.selectionEnd = newCursorPos;
        };

        const wrapText = (before: string, after: string = before) => {
            const textarea: HTMLTextAreaElement | null = textareaRef.current;
            if (!textarea) return;

            const {selectionStart, selectionEnd} = textarea;
            const text = textarea.value;
            if (selectionStart === selectionEnd) return;

            const beforeText = text.substring(0, selectionStart);
            const selectedText = text.substring(selectionStart, selectionEnd);
            const afterText = text.substring(selectionEnd);

            let newValue: string;
            let newCursorPos: number;

            const startsWithBefore = selectedText.startsWith(before);
            const endsWithAfter = selectedText.endsWith(after);

            if (startsWithBefore && endsWithAfter) {
                const unwrappedText = selectedText.substring(before.length, selectedText.length - after.length);
                newValue = beforeText + unwrappedText + afterText;
                newCursorPos = selectionStart;
            } else {
                newValue = beforeText + before + selectedText + after + afterText;
                newCursorPos = selectionStart + before.length + selectedText.length + after.length;
            }

            setValue(newValue || "");
            textarea.selectionStart = newCursorPos;
            textarea.selectionEnd = newCursorPos;
        };

        const isActionAvailable = (actionName: string): boolean => {
            return markdownGroups
                ? markdownGroups.some((group) => group.items.some((item) => item.name === actionName))
                : true;
        };

        function renderButtons() {
            return markdownGroups?.map((group, index) => (
                <div key={index} className="flex flex-wrap gap-2 my-2">
                    {group.items.map((item) => {
                        if (isActionAvailable(item.name)) {
                            return (
                                <button
                                    key={item.name}
                                    type="button"
                                    onClick={getActionFunction(item.name)}
                                    className="px-3 py-2 text-xs font-medium text-center inline-flex items-center text-black bg-gray-200 rounded-lg hover:bg-gray-300 focus:ring-4 focus:outline-hidden focus:ring-gray-300 dark:bg-gray-300 dark:hover:bg-gray-400 dark:focus:ring-gray-800"
                                    aria-label={item.name}
                                    title={item.name}
                                >
                                    <NextImage
                                        width={100}
                                        height={100}
                                        src={`${iconPath}/${item.name.toLowerCase()}.svg`}
                                        alt={item.name}
                                        className="w-4 h-4"
                                    />
                                </button>
                            );
                        }
                        return null;
                    })}
                </div>
            ));
        }

        return <div className="editor-controls">{renderButtons()}</div>;
    };
}