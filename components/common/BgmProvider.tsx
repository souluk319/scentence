"use client";

import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";

type BgmContextValue = {
    isEnabled: boolean;
    isPlaying: boolean;
    toggle: () => Promise<void>;
};

const BGM_STORAGE_KEY = "scentence-bgm-enabled";
const BGM_PLAYLIST = ["/audio/main-bgm1.mp3"];
const DEFAULT_VOLUME = 0.18;

const BgmContext = createContext<BgmContextValue | null>(null);

export function BgmProvider({ children }: { children: ReactNode }) {
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const [isEnabled, setIsEnabled] = useState(false);
    const [isPlaying, setIsPlaying] = useState(false);
    const [isHydrated, setIsHydrated] = useState(false);
    const [currentTrackIndex, setCurrentTrackIndex] = useState(0);

    useEffect(() => {
        setIsHydrated(true);

        const savedPreference = window.localStorage.getItem(BGM_STORAGE_KEY);
        if (savedPreference === "true") {
            setIsEnabled(true);
        }
    }, []);

    useEffect(() => {
        if (!isHydrated) {
            return;
        }

        window.localStorage.setItem(BGM_STORAGE_KEY, String(isEnabled));
    }, [isEnabled, isHydrated]);

    useEffect(() => {
        const audio = audioRef.current;
        if (!audio) {
            return;
        }

        audio.volume = DEFAULT_VOLUME;
        audio.loop = BGM_PLAYLIST.length === 1;

        const handlePlay = () => setIsPlaying(true);
        const handlePause = () => setIsPlaying(false);
        const handleEnded = () => {
            if (BGM_PLAYLIST.length <= 1) {
                audio.currentTime = 0;
                void audio.play().catch(() => undefined);
                return;
            }

            setCurrentTrackIndex((prev) => (prev + 1) % BGM_PLAYLIST.length);
        };

        audio.addEventListener("play", handlePlay);
        audio.addEventListener("pause", handlePause);
        audio.addEventListener("ended", handleEnded);

        return () => {
            audio.removeEventListener("play", handlePlay);
            audio.removeEventListener("pause", handlePause);
            audio.removeEventListener("ended", handleEnded);
        };
    }, []);

    useEffect(() => {
        const audio = audioRef.current;
        if (!audio) {
            return;
        }

        audio.src = BGM_PLAYLIST[currentTrackIndex];
        audio.load();

        if (!isEnabled) {
            return;
        }

        void audio.play().catch(() => {
            setIsPlaying(false);
        });
    }, [currentTrackIndex]);

    useEffect(() => {
        const audio = audioRef.current;
        if (!audio) {
            return;
        }

        if (!isEnabled) {
            audio.pause();
            return;
        }

        if (!audio.src) {
            audio.src = BGM_PLAYLIST[currentTrackIndex];
            audio.load();
        }

        void audio.play().catch(() => {
            setIsPlaying(false);
        });
    }, [isEnabled]);

    useEffect(() => {
        if (!isEnabled || isPlaying) {
            return;
        }

        const retryPlayback = () => {
            const audio = audioRef.current;
            if (!audio) {
                return;
            }

            void audio.play().catch(() => undefined);
        };

        window.addEventListener("pointerdown", retryPlayback, { once: true, passive: true });
        window.addEventListener("keydown", retryPlayback, { once: true });

        return () => {
            window.removeEventListener("pointerdown", retryPlayback);
            window.removeEventListener("keydown", retryPlayback);
        };
    }, [isEnabled, isPlaying]);

    async function toggle() {
        const audio = audioRef.current;
        const nextEnabled = !isEnabled;

        setIsEnabled(nextEnabled);

        if (!audio) {
            return;
        }

        if (!nextEnabled) {
            audio.pause();
            return;
        }

        try {
            await audio.play();
        } catch {
            setIsPlaying(false);
        }
    }

    return (
        <BgmContext.Provider value={{ isEnabled, isPlaying, toggle }}>
            {children}
            <audio ref={audioRef} preload="auto" />
        </BgmContext.Provider>
    );
}

export function useBgm() {
    const context = useContext(BgmContext);

    if (!context) {
        throw new Error("useBgm must be used within a BgmProvider");
    }

    return context;
}
