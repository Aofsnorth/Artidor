/* @ts-self-types="./artidor_wasm.d.ts" */
import * as wasm from "./artidor_wasm_bg.wasm";
import { __wbg_set_wasm } from "./artidor_wasm_bg.js";

__wbg_set_wasm(wasm);
wasm.__wbindgen_start();
export {
    TICKS_PER_SECOND, applyEffectPasses, applyMaskFeather, destroyGpu, floorToFrame, formatTimecode, getCompositorCanvas, guessTimecodeFormat, initCompositor, initCompositorWithCanvas, initializeGpu, isFrameAligned, lastFrameTime, mediaTimeAdd, mediaTimeClamp, mediaTimeFromFrame, mediaTimeFromSeconds, mediaTimeMax, mediaTimeMin, mediaTimeSub, mediaTimeToFrame, mediaTimeToSeconds, parseTimecode, releaseTexture, renderFrame, resizeCompositor, roundToFrame, snappedSeekTime, uploadTexture
} from "./artidor_wasm_bg.js";
