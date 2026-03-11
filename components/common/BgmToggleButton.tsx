"use client";

import { AudioLines } from "lucide-react";
import { useBgm } from "@/components/common/BgmProvider";

export default function BgmToggleButton({ theme = "light" }: { theme?: "light" | "dark" }) {
    const { isEnabled, isPlaying, toggle } = useBgm();
    const isActive = isEnabled && isPlaying;
    const iconTone = theme === "dark"
        ? (isActive ? "text-[#F4F8FF]" : "text-white/58")
        : (isActive ? "text-[#17202E]" : "text-[#17202E]/46");
    const slashTone = theme === "dark" ? "bg-white/62" : "bg-[#17202E]/34";

    return (
        <button
            type="button"
            onClick={() => void toggle()}
            aria-pressed={isEnabled}
            aria-label={isEnabled ? "배경음악 끄기" : "배경음악 켜기"}
            title={isEnabled ? "BGM OFF" : "BGM ON"}
            className="group relative -ml-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center transition-transform duration-300 active:scale-[0.97] md:h-9 md:w-9"
        >
            <span
                className={`absolute inset-[-4px] rounded-full transition-opacity duration-300 ${isActive
                    ? "animate-bgm-audio-glow opacity-100"
                    : "opacity-0"}`}
            />
            <span className="relative flex h-7 w-7 items-center justify-center md:h-8 md:w-8">
                <AudioLines
                    aria-hidden="true"
                    strokeWidth={1.85}
                    className={`bgm-audio-lines h-[15px] w-[15px] md:h-4 md:w-4 ${iconTone} ${isActive ? "animate-bgm-audio-live" : ""}`}
                />
            </span>
            {!isEnabled && (
                <span className={`absolute h-[1.5px] w-7 rotate-[-30deg] rounded-full ${slashTone}`} />
            )}
        </button>
    );
}
