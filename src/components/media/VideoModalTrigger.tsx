"use client";

import React, {useEffect, useRef, useState} from "react";
import Hls from "hls.js";

export type VideoModalTriggerProps = {
    videoUrl: string;
    mimeType: string;
};

export function VideoModalTrigger({videoUrl, mimeType}: VideoModalTriggerProps) {
    const [isOpen, setIsOpen] = useState(false);
    const videoRef = useRef<HTMLVideoElement>(null);
    const modalRef = useRef<HTMLDivElement>(null);

    const isHls: boolean = mimeType === "application/x-mpegURL";

    // Handle HLS playback
    useEffect((): (() => void) | undefined => {
        if (!isOpen || !isHls || !videoRef.current) return;

        if (Hls.isSupported()) {
            const hls = new Hls();
            hls.loadSource(videoUrl);
            hls.attachMedia(videoRef.current);
            return () => hls.destroy();
        }

        if (videoRef.current.canPlayType("application/vnd.apple.mpegurl")) {
            videoRef.current.src = videoUrl;
        }
    }, [isOpen, videoUrl, isHls]);

    // Close on the outside click
    useEffect((): (() => void) => {
        const handleClickOutside = (e: MouseEvent) => {
            if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
                setIsOpen(false);
            }
        };

        if (isOpen) {
            document.addEventListener("mousedown", handleClickOutside);
        }

        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [isOpen]);

    return (
        <>
            <button
                onClick={(e) => {
                    e.stopPropagation();
                    setIsOpen(true);
                }}
                className="absolute inset-0"
                aria-label="Play video"
            />

            {isOpen && (
                <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center">
                    <div
                        ref={modalRef}
                        className="relative bg-black p-2 rounded-lg shadow-xl flex items-center justify-center max-w-[100vw] max-h-[100vh]"
                    >
                        <button
                            onClick={() => setIsOpen(false)}
                            className="absolute -top-3 -right-3 z-10 bg-white text-black rounded-full w-8 h-8 flex items-center justify-center shadow hover:bg-red-500 hover:text-white transition"
                            aria-label="Close"
                        >
                            ×
                        </button>

                        <video
                            ref={videoRef}
                            controls
                            autoPlay
                            className="max-w-[90vw] max-h-[80vh] rounded"
                        >
                            {!isHls && <source src={videoUrl} type={mimeType} />}
                            Your browser does not support the video tag.
                        </video>
                    </div>
                </div>
            )}
        </>
    );
}
