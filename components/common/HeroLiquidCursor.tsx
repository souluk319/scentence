"use client";

import { useEffect, useRef } from "react";

const TARGET_SIM_WIDTH = 144;
const DENSITY_DISSIPATION = 0.944;
const VELOCITY_DISSIPATION = 0.9;
const DIFFUSION_MIX = 0.34;
const ADVECTION_SCALE = 0.48;

function clamp(value: number, min: number, max: number) {
    return Math.min(max, Math.max(min, value));
}

function sampleField(field: Float32Array, width: number, height: number, x: number, y: number) {
    const px = clamp(x, 0, width - 1);
    const py = clamp(y, 0, height - 1);
    const x0 = Math.floor(px);
    const y0 = Math.floor(py);
    const x1 = Math.min(x0 + 1, width - 1);
    const y1 = Math.min(y0 + 1, height - 1);
    const tx = px - x0;
    const ty = py - y0;

    const i00 = y0 * width + x0;
    const i10 = y0 * width + x1;
    const i01 = y1 * width + x0;
    const i11 = y1 * width + x1;

    const a = field[i00] * (1 - tx) + field[i10] * tx;
    const b = field[i01] * (1 - tx) + field[i11] * tx;
    return a * (1 - ty) + b * ty;
}

export default function HeroLiquidCursor() {
    const rootRef = useRef<HTMLDivElement | null>(null);
    const canvasRef = useRef<HTMLCanvasElement | null>(null);

    useEffect(() => {
        const root = rootRef.current;
        const canvas = canvasRef.current;

        if (!root || !canvas) return;
        if (!window.matchMedia("(pointer: fine)").matches) return;
        if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        const simCanvas = document.createElement("canvas");
        const simCtx = simCanvas.getContext("2d", { willReadFrequently: true });
        if (!simCtx) return;

        let viewWidth = 0;
        let viewHeight = 0;
        let simWidth = 0;
        let simHeight = 0;
        let density = new Float32Array(0);
        let densityNext = new Float32Array(0);
        let velocityX = new Float32Array(0);
        let velocityY = new Float32Array(0);
        let velocityXNext = new Float32Array(0);
        let velocityYNext = new Float32Array(0);
        let imageData: ImageData | null = null;
        let frameId = 0;

        const pointer = {
            active: false,
            x: 0,
            y: 0,
            lastX: 0,
            lastY: 0,
            lastTime: 0,
        };

        const resize = () => {
            const dpr = Math.min(window.devicePixelRatio || 1, 2);

            viewWidth = window.innerWidth;
            viewHeight = window.innerHeight;

            canvas.width = Math.max(1, Math.floor(viewWidth * dpr));
            canvas.height = Math.max(1, Math.floor(viewHeight * dpr));
            canvas.style.width = `${viewWidth}px`;
            canvas.style.height = `${viewHeight}px`;

            simWidth = clamp(Math.round(viewWidth / 10), 96, TARGET_SIM_WIDTH);
            simHeight = clamp(Math.round((viewHeight / Math.max(viewWidth, 1)) * simWidth), 72, 120);

            simCanvas.width = simWidth;
            simCanvas.height = simHeight;

            density = new Float32Array(simWidth * simHeight);
            densityNext = new Float32Array(simWidth * simHeight);
            velocityX = new Float32Array(simWidth * simHeight);
            velocityY = new Float32Array(simWidth * simHeight);
            velocityXNext = new Float32Array(simWidth * simHeight);
            velocityYNext = new Float32Array(simWidth * simHeight);
            imageData = simCtx.createImageData(simWidth, simHeight);
        };

        const splat = (x: number, y: number, dx: number, dy: number, speed: number) => {
            if (!simWidth || !simHeight) return;

            const cx = clamp((x / Math.max(viewWidth, 1)) * simWidth, 0, simWidth - 1);
            const cy = clamp((y / Math.max(viewHeight, 1)) * simHeight, 0, simHeight - 1);
            const directionLength = Math.hypot(dx, dy) || 1;
            const dirX = dx / directionLength;
            const dirY = dy / directionLength;
            const speedNorm = clamp(speed / 2200, 0, 1);
            const baseRadius = Math.max(8, Math.min(simWidth, simHeight) * 0.08);
            const radiusX = baseRadius * (1.1 + speedNorm * 0.9);
            const radiusY = baseRadius * (0.9 + speedNorm * 0.35);
            const strength = 0.22 + speedNorm * 0.52;
            const push = 0.056 + speedNorm * 0.15;

            const left = Math.floor(cx - radiusX - 2);
            const right = Math.ceil(cx + radiusX + 2);
            const top = Math.floor(cy - radiusX - 2);
            const bottom = Math.ceil(cy + radiusX + 2);

            for (let py = top; py <= bottom; py += 1) {
                if (py <= 1 || py >= simHeight - 1) continue;

                for (let px = left; px <= right; px += 1) {
                    if (px <= 1 || px >= simWidth - 1) continue;

                    const ox = px - cx;
                    const oy = py - cy;
                    const along = ox * dirX + oy * dirY;
                    const across = -ox * dirY + oy * dirX;
                    const gaussian = Math.exp(
                        -((along * along) / (radiusX * radiusX) + (across * across) / (radiusY * radiusY)) * 1.6,
                    );

                    if (gaussian < 0.002) continue;

                    const index = py * simWidth + px;
                    density[index] += gaussian * strength;
                    velocityX[index] += dirX * gaussian * push;
                    velocityY[index] += dirY * gaussian * push;
                }
            }
        };

        const onPointerMove = (event: PointerEvent) => {
            const x = event.clientX;
            const y = event.clientY;
            const now = performance.now();

            if (!pointer.active) {
                pointer.active = true;
                pointer.x = x;
                pointer.y = y;
                pointer.lastX = x;
                pointer.lastY = y;
                pointer.lastTime = now;
                splat(x, y, 0.01, 0.01, 200);
                return;
            }

            const dt = Math.max(now - pointer.lastTime, 16);
            const dx = x - pointer.lastX;
            const dy = y - pointer.lastY;
            const distance = Math.hypot(dx, dy);
            const speed = distance / dt * 1000;
            const steps = clamp(Math.round(distance / 18), 1, 4);

            for (let step = 0; step < steps; step += 1) {
                const t = step / steps;
                splat(x - dx * t, y - dy * t, dx, dy, speed);
            }

            pointer.x = x;
            pointer.y = y;
            pointer.lastX = x;
            pointer.lastY = y;
            pointer.lastTime = now;
        };

        const onPointerExit = () => {
            pointer.active = false;
        };

        const updateSimulation = () => {
            if (!simWidth || !simHeight) return;

            for (let y = 1; y < simHeight - 1; y += 1) {
                for (let x = 1; x < simWidth - 1; x += 1) {
                    const index = y * simWidth + x;
                    const left = index - 1;
                    const right = index + 1;
                    const up = index - simWidth;
                    const down = index + simWidth;

                    const averageVX =
                        (velocityX[left] + velocityX[right] + velocityX[up] + velocityX[down]) * 0.25;
                    const averageVY =
                        (velocityY[left] + velocityY[right] + velocityY[up] + velocityY[down]) * 0.25;

                    velocityXNext[index] = (velocityX[index] * 0.62 + averageVX * 0.38) * VELOCITY_DISSIPATION;
                    velocityYNext[index] = (velocityY[index] * 0.62 + averageVY * 0.38) * VELOCITY_DISSIPATION;
                }
            }

            for (let y = 1; y < simHeight - 1; y += 1) {
                for (let x = 1; x < simWidth - 1; x += 1) {
                    const index = y * simWidth + x;
                    const left = index - 1;
                    const right = index + 1;
                    const up = index - simWidth;
                    const down = index + simWidth;

                    const backX = x - velocityXNext[index] * simWidth * ADVECTION_SCALE;
                    const backY = y - velocityYNext[index] * simHeight * ADVECTION_SCALE;
                    const advected = sampleField(density, simWidth, simHeight, backX, backY);
                    const diffuse =
                        (density[left] + density[right] + density[up] + density[down]) * 0.25;

                    densityNext[index] = Math.max(
                        0,
                        (advected * (1 - DIFFUSION_MIX) + diffuse * DIFFUSION_MIX) * DENSITY_DISSIPATION - 0.0006,
                    );
                }
            }

            [velocityX, velocityXNext] = [velocityXNext, velocityX];
            [velocityY, velocityYNext] = [velocityYNext, velocityY];
            [density, densityNext] = [densityNext, density];
        };

        const renderSimulation = () => {
            if (!imageData) return;

            const pixels = imageData.data;
            let hasVisibleDensity = false;

            for (let y = 1; y < simHeight - 1; y += 1) {
                for (let x = 1; x < simWidth - 1; x += 1) {
                    const index = y * simWidth + x;
                    const pixelIndex = index * 4;
                    const value = density[index];

                    if (value < 0.0025) {
                        pixels[pixelIndex] = 0;
                        pixels[pixelIndex + 1] = 0;
                        pixels[pixelIndex + 2] = 0;
                        pixels[pixelIndex + 3] = 0;
                        continue;
                    }

                    hasVisibleDensity = true;

                    const gradientX = density[index + 1] - density[index - 1];
                    const gradientY = density[index + simWidth] - density[index - simWidth];
                    const edge = clamp(Math.hypot(gradientX, gradientY) * 4.1, 0, 1);
                    const bloom = clamp(value * 1.9, 0, 1);
                    const coreSuppression = clamp((value - 0.16) * 5.2, 0, 1);
                    const body = bloom * (1 - coreSuppression * 0.88);
                    const tintShift = 0.5 + 0.5 * Math.sin(x * 0.13 + y * 0.09);

                    const pinkR = 244;
                    const pinkG = 184 + (1 - body) * 24;
                    const pinkB = 208 + (1 - body) * 10;
                    const fringeR = 194 + tintShift * 18;
                    const fringeG = 204 + (1 - tintShift) * 10;
                    const fringeB = 226;
                    const fringeMix = edge * 0.16;

                    pixels[pixelIndex] = pinkR * (1 - fringeMix) + fringeR * fringeMix;
                    pixels[pixelIndex + 1] = pinkG * (1 - fringeMix) + fringeG * fringeMix;
                    pixels[pixelIndex + 2] = pinkB * (1 - fringeMix) + fringeB * fringeMix;
                    pixels[pixelIndex + 3] = clamp(body * 255 * 0.58 + edge * 30, 0, 255);
                }
            }

            simCtx.putImageData(imageData, 0, 0);

            ctx.save();
            ctx.setTransform(1, 0, 0, 1, 0, 0);
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.restore();

            if (!hasVisibleDensity) return;

            const dpr = canvas.width / Math.max(viewWidth, 1);
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
            ctx.imageSmoothingEnabled = true;

            ctx.globalCompositeOperation = "source-over";
            ctx.globalAlpha = 0.48;
            ctx.filter = "blur(30px) saturate(98%)";
            ctx.drawImage(simCanvas, 0, 0, viewWidth, viewHeight);

            ctx.globalAlpha = 0.62;
            ctx.filter = "blur(16px) saturate(96%)";
            ctx.drawImage(simCanvas, 0, 0, viewWidth, viewHeight);

            ctx.globalAlpha = 0.6;
            ctx.filter = "blur(8px)";
            ctx.drawImage(simCanvas, 0, 0, viewWidth, viewHeight);

            ctx.globalAlpha = 0.28;
            ctx.filter = "blur(2px)";
            ctx.drawImage(simCanvas, 0, 0, viewWidth, viewHeight);

            ctx.filter = "none";
            ctx.globalAlpha = 1;
        };

        const loop = () => {
            updateSimulation();
            renderSimulation();
            frameId = window.requestAnimationFrame(loop);
        };

        resize();
        window.addEventListener("resize", resize);
        window.addEventListener("pointermove", onPointerMove, { passive: true });
        window.addEventListener("pointerleave", onPointerExit);
        window.addEventListener("blur", onPointerExit);
        frameId = window.requestAnimationFrame(loop);

        return () => {
            window.removeEventListener("resize", resize);
            window.removeEventListener("pointermove", onPointerMove);
            window.removeEventListener("pointerleave", onPointerExit);
            window.removeEventListener("blur", onPointerExit);
            window.cancelAnimationFrame(frameId);
        };
    }, []);

    return (
        <div
            ref={rootRef}
            aria-hidden="true"
            className="pointer-events-none fixed inset-0 z-10 overflow-hidden"
        >
            <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />
        </div>
    );
}
