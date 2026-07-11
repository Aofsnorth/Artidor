//#region exports

/**
 * @returns {number}
 */
export function TICKS_PER_SECOND() {
    const ret = wasm.TICKS_PER_SECOND();
    return ret;
}

/**
 * @param {any} options
 * @returns {OffscreenCanvas}
 */
export function applyEffectPasses(options) {
    const ret = wasm.applyEffectPasses(options);
    if (ret[2]) {
        throw takeFromExternrefTable0(ret[1]);
    }
    return takeFromExternrefTable0(ret[0]);
}

/**
 * @param {any} options
 * @returns {OffscreenCanvas}
 */
export function applyMaskFeather(options) {
    const ret = wasm.applyMaskFeather(options);
    if (ret[2]) {
        throw takeFromExternrefTable0(ret[1]);
    }
    return takeFromExternrefTable0(ret[0]);
}

/**
 * Drop the current GPU runtime so the next `initializeGpu` call creates a
 * fresh device. Used to recover from device-lost errors.
 */
export function destroyGpu() {
    wasm.destroyGpu();
}

/**
 * @param {FloorToFrameOptions} arg0
 * @returns {MediaTime | undefined}
 */
export function floorToFrame(arg0) {
    const ret = wasm.floorToFrame(arg0);
    return ret;
}

/**
 * @param {FormatTimecodeOptions} arg0
 * @returns {string | undefined}
 */
export function formatTimecode(arg0) {
    const ret = wasm.formatTimecode(arg0);
    let v1;
    if (ret[0] !== 0) {
        v1 = getStringFromWasm0(ret[0], ret[1]).slice();
        wasm.__wbindgen_free(ret[0], ret[1] * 1, 1);
    }
    return v1;
}

/**
 * @returns {OffscreenCanvas}
 */
export function getCompositorCanvas() {
    const ret = wasm.getCompositorCanvas();
    if (ret[2]) {
        throw takeFromExternrefTable0(ret[1]);
    }
    return takeFromExternrefTable0(ret[0]);
}

/**
 * @param {GuessTimecodeFormatOptions} arg0
 * @returns {TimeCodeFormat | undefined}
 */
export function guessTimecodeFormat(arg0) {
    const ret = wasm.guessTimecodeFormat(arg0);
    return ret;
}

/**
 * Initialize compositor with a new canvas (main-thread fallback).
 * Creates an HTMLCanvasElement and transfers it to an OffscreenCanvas.
 * @param {number} width
 * @param {number} height
 */
export function initCompositor(width, height) {
    _assertNum(width);
    _assertNum(height);
    const ret = wasm.initCompositor(width, height);
    if (ret[1]) {
        throw takeFromExternrefTable0(ret[0]);
    }
}

/**
 * Initialize compositor with an external OffscreenCanvas (Worker path).
 * The canvas is typically transferred from the main thread via postMessage.
 * @param {OffscreenCanvas} canvas
 */
export function initCompositorWithCanvas(canvas) {
    const ret = wasm.initCompositorWithCanvas(canvas);
    if (ret[1]) {
        throw takeFromExternrefTable0(ret[0]);
    }
}

/**
 * @returns {Promise<void>}
 */
export function initializeGpu() {
    const ret = wasm.initializeGpu();
    return ret;
}

/**
 * @param {IsFrameAlignedOptions} arg0
 * @returns {boolean | undefined}
 */
export function isFrameAligned(arg0) {
    const ret = wasm.isFrameAligned(arg0);
    return ret === 0xFFFFFF ? undefined : ret !== 0;
}

/**
 * @param {LastFrameTimeOptions} arg0
 * @returns {MediaTime | undefined}
 */
export function lastFrameTime(arg0) {
    const ret = wasm.lastFrameTime(arg0);
    return ret;
}

/**
 * @param {MediaTimeAddOptions} arg0
 * @returns {MediaTime}
 */
export function mediaTimeAdd(arg0) {
    const ret = wasm.mediaTimeAdd(arg0);
    return ret;
}

/**
 * @param {MediaTimeClampOptions} arg0
 * @returns {MediaTime}
 */
export function mediaTimeClamp(arg0) {
    const ret = wasm.mediaTimeClamp(arg0);
    return ret;
}

/**
 * @param {MediaTimeFromFrameOptions} arg0
 * @returns {MediaTime | undefined}
 */
export function mediaTimeFromFrame(arg0) {
    const ret = wasm.mediaTimeFromFrame(arg0);
    return ret;
}

/**
 * @param {MediaTimeFromSecondsOptions} arg0
 * @returns {MediaTime | undefined}
 */
export function mediaTimeFromSeconds(arg0) {
    const ret = wasm.mediaTimeFromSeconds(arg0);
    return ret;
}

/**
 * @param {MediaTimeMaxOptions} arg0
 * @returns {MediaTime}
 */
export function mediaTimeMax(arg0) {
    const ret = wasm.mediaTimeMax(arg0);
    return ret;
}

/**
 * @param {MediaTimeMinOptions} arg0
 * @returns {MediaTime}
 */
export function mediaTimeMin(arg0) {
    const ret = wasm.mediaTimeMin(arg0);
    return ret;
}

/**
 * @param {MediaTimeSubOptions} arg0
 * @returns {MediaTime}
 */
export function mediaTimeSub(arg0) {
    const ret = wasm.mediaTimeSub(arg0);
    return ret;
}

/**
 * @param {MediaTimeToFrameOptions} arg0
 * @returns {bigint | undefined}
 */
export function mediaTimeToFrame(arg0) {
    const ret = wasm.mediaTimeToFrame(arg0);
    return ret[0] === 0 ? undefined : ret[1];
}

/**
 * @param {MediaTimeToSecondsOptions} arg0
 * @returns {number}
 */
export function mediaTimeToSeconds(arg0) {
    const ret = wasm.mediaTimeToSeconds(arg0);
    return ret;
}

/**
 * @param {ParseTimecodeOptions} arg0
 * @returns {MediaTime | undefined}
 */
export function parseTimecode(arg0) {
    const ret = wasm.parseTimecode(arg0);
    return ret;
}

/**
 * @param {string} id
 */
export function releaseTexture(id) {
    const ptr0 = passStringToWasm0(id, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
    const len0 = WASM_VECTOR_LEN;
    const ret = wasm.releaseTexture(ptr0, len0);
    if (ret[1]) {
        throw takeFromExternrefTable0(ret[0]);
    }
}

/**
 * @param {any} options
 */
export function renderFrame(options) {
    const ret = wasm.renderFrame(options);
    if (ret[1]) {
        throw takeFromExternrefTable0(ret[0]);
    }
}

/**
 * @param {number} width
 * @param {number} height
 */
export function resizeCompositor(width, height) {
    _assertNum(width);
    _assertNum(height);
    const ret = wasm.resizeCompositor(width, height);
    if (ret[1]) {
        throw takeFromExternrefTable0(ret[0]);
    }
}

/**
 * @param {RoundToFrameOptions} arg0
 * @returns {MediaTime | undefined}
 */
export function roundToFrame(arg0) {
    const ret = wasm.roundToFrame(arg0);
    return ret;
}

/**
 * @param {SnappedSeekTimeOptions} arg0
 * @returns {MediaTime | undefined}
 */
export function snappedSeekTime(arg0) {
    const ret = wasm.snappedSeekTime(arg0);
    return ret;
}

export function start() {
    wasm.start();
}

/**
 * @param {any} options
 */
export function uploadTexture(options) {
    const ret = wasm.uploadTexture(options);
    if (ret[1]) {
        throw takeFromExternrefTable0(ret[0]);
    }
}

//#endregion

//#region wasm imports
export function __wbg_Error_7c536b7a8123d334() { return logError(function (arg0, arg1) {
    const ret = Error(getStringFromWasm0(arg0, arg1));
    return ret;
}, arguments); }
export function __wbg_Number_d2ed9f811fff7051() { return logError(function (arg0) {
    const ret = Number(arg0);
    return ret;
}, arguments); }
export function __wbg_String_8564e559799eccda() { return logError(function (arg0, arg1) {
    const ret = String(arg1);
    const ptr1 = passStringToWasm0(ret, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
    const len1 = WASM_VECTOR_LEN;
    getDataViewMemory0().setInt32(arg0 + 4 * 1, len1, true);
    getDataViewMemory0().setInt32(arg0 + 4 * 0, ptr1, true);
}, arguments); }
export function __wbg_Window_a07901001eb4269f() { return logError(function (arg0) {
    const ret = arg0.Window;
    return ret;
}, arguments); }
export function __wbg_WorkerGlobalScope_d1b9459d53a39f3d() { return logError(function (arg0) {
    const ret = arg0.WorkerGlobalScope;
    return ret;
}, arguments); }
export function __wbg___wbindgen_bigint_get_as_i64_3d66614a210167c9(arg0, arg1) {
    const v = arg1;
    const ret = typeof(v) === 'bigint' ? v : undefined;
    if (!isLikeNone(ret)) {
        _assertBigInt(ret);
    }
    getDataViewMemory0().setBigInt64(arg0 + 8 * 1, isLikeNone(ret) ? BigInt(0) : ret, true);
    getDataViewMemory0().setInt32(arg0 + 4 * 0, !isLikeNone(ret), true);
}
export function __wbg___wbindgen_boolean_get_6abe7d340f528f63(arg0) {
    const v = arg0;
    const ret = typeof(v) === 'boolean' ? v : undefined;
    if (!isLikeNone(ret)) {
        _assertBoolean(ret);
    }
    return isLikeNone(ret) ? 0xFFFFFF : ret ? 1 : 0;
}
export function __wbg___wbindgen_debug_string_8baecc377ad92880(arg0, arg1) {
    const ret = debugString(arg1);
    const ptr1 = passStringToWasm0(ret, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
    const len1 = WASM_VECTOR_LEN;
    getDataViewMemory0().setInt32(arg0 + 4 * 1, len1, true);
    getDataViewMemory0().setInt32(arg0 + 4 * 0, ptr1, true);
}
export function __wbg___wbindgen_in_840bcdd0dba8d13c(arg0, arg1) {
    const ret = arg0 in arg1;
    _assertBoolean(ret);
    return ret;
}
export function __wbg___wbindgen_is_bigint_4393a1b8e13fdf64(arg0) {
    const ret = typeof(arg0) === 'bigint';
    _assertBoolean(ret);
    return ret;
}
export function __wbg___wbindgen_is_function_d4c2480b46f29e33(arg0) {
    const ret = typeof(arg0) === 'function';
    _assertBoolean(ret);
    return ret;
}
export function __wbg___wbindgen_is_null_77356bc8da6bb199(arg0) {
    const ret = arg0 === null;
    _assertBoolean(ret);
    return ret;
}
export function __wbg___wbindgen_is_object_e04e3a51a90cde43(arg0) {
    const val = arg0;
    const ret = typeof(val) === 'object' && val !== null;
    _assertBoolean(ret);
    return ret;
}
export function __wbg___wbindgen_is_string_3db04af369717583(arg0) {
    const ret = typeof(arg0) === 'string';
    _assertBoolean(ret);
    return ret;
}
export function __wbg___wbindgen_is_undefined_5957b329897cc39c(arg0) {
    const ret = arg0 === undefined;
    _assertBoolean(ret);
    return ret;
}
export function __wbg___wbindgen_jsval_eq_8d2fb89b36afbec9(arg0, arg1) {
    const ret = arg0 === arg1;
    _assertBoolean(ret);
    return ret;
}
export function __wbg___wbindgen_jsval_loose_eq_54779efa0bc46b0b(arg0, arg1) {
    const ret = arg0 == arg1;
    _assertBoolean(ret);
    return ret;
}
export function __wbg___wbindgen_number_get_4fcba947d278ad7c(arg0, arg1) {
    const obj = arg1;
    const ret = typeof(obj) === 'number' ? obj : undefined;
    if (!isLikeNone(ret)) {
        _assertNum(ret);
    }
    getDataViewMemory0().setFloat64(arg0 + 8 * 1, isLikeNone(ret) ? 0 : ret, true);
    getDataViewMemory0().setInt32(arg0 + 4 * 0, !isLikeNone(ret), true);
}
export function __wbg___wbindgen_string_get_ae6081df8158aa73(arg0, arg1) {
    const obj = arg1;
    const ret = typeof(obj) === 'string' ? obj : undefined;
    var ptr1 = isLikeNone(ret) ? 0 : passStringToWasm0(ret, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
    var len1 = WASM_VECTOR_LEN;
    getDataViewMemory0().setInt32(arg0 + 4 * 1, len1, true);
    getDataViewMemory0().setInt32(arg0 + 4 * 0, ptr1, true);
}
export function __wbg___wbindgen_throw_bd5a70920abf0236(arg0, arg1) {
    throw new Error(getStringFromWasm0(arg0, arg1));
}
export function __wbg__wbg_cb_unref_207c541c2d58dfb3() { return logError(function (arg0) {
    arg0._wbg_cb_unref();
}, arguments); }
export function __wbg_activeTexture_9c2e6aa83f9ff71f() { return logError(function (arg0, arg1) {
    arg0.activeTexture(arg1 >>> 0);
}, arguments); }
export function __wbg_activeTexture_d7776bac3a6d7d81() { return logError(function (arg0, arg1) {
    arg0.activeTexture(arg1 >>> 0);
}, arguments); }
export function __wbg_adapterInfo_bcf1e34d1f8c621b() { return logError(function (arg0) {
    const ret = arg0.adapterInfo;
    return ret;
}, arguments); }
export function __wbg_attachShader_08f9dc290f7f21cc() { return logError(function (arg0, arg1, arg2) {
    arg0.attachShader(arg1, arg2);
}, arguments); }
export function __wbg_attachShader_bf3db0e95841cd87() { return logError(function (arg0, arg1, arg2) {
    arg0.attachShader(arg1, arg2);
}, arguments); }
export function __wbg_beginComputePass_705eb14eefc2b94e() { return logError(function (arg0, arg1) {
    const ret = arg0.beginComputePass(arg1);
    return ret;
}, arguments); }
export function __wbg_beginOcclusionQuery_da58461ecc9bf9ec() { return logError(function (arg0, arg1) {
    arg0.beginOcclusionQuery(arg1 >>> 0);
}, arguments); }
export function __wbg_beginQuery_8177623d995ace6f() { return logError(function (arg0, arg1, arg2) {
    arg0.beginQuery(arg1 >>> 0, arg2);
}, arguments); }
export function __wbg_beginRenderPass_10e1d8bb36f2f74e() { return handleError(function (arg0, arg1) {
    const ret = arg0.beginRenderPass(arg1);
    return ret;
}, arguments); }
export function __wbg_bindAttribLocation_89c2713acf4dd995() { return logError(function (arg0, arg1, arg2, arg3, arg4) {
    arg0.bindAttribLocation(arg1, arg2 >>> 0, getStringFromWasm0(arg3, arg4));
}, arguments); }
export function __wbg_bindAttribLocation_de6ec2ac7d3f92aa() { return logError(function (arg0, arg1, arg2, arg3, arg4) {
    arg0.bindAttribLocation(arg1, arg2 >>> 0, getStringFromWasm0(arg3, arg4));
}, arguments); }
export function __wbg_bindBufferRange_67e7b18d43028a1e() { return logError(function (arg0, arg1, arg2, arg3, arg4, arg5) {
    arg0.bindBufferRange(arg1 >>> 0, arg2 >>> 0, arg3, arg4, arg5);
}, arguments); }
export function __wbg_bindBuffer_7e9a97580c172350() { return logError(function (arg0, arg1, arg2) {
    arg0.bindBuffer(arg1 >>> 0, arg2);
}, arguments); }
export function __wbg_bindBuffer_dfc10755fbcf7688() { return logError(function (arg0, arg1, arg2) {
    arg0.bindBuffer(arg1 >>> 0, arg2);
}, arguments); }
export function __wbg_bindFramebuffer_c2bbe6dfa5c632ff() { return logError(function (arg0, arg1, arg2) {
    arg0.bindFramebuffer(arg1 >>> 0, arg2);
}, arguments); }
export function __wbg_bindFramebuffer_ea890cc1c43ad089() { return logError(function (arg0, arg1, arg2) {
    arg0.bindFramebuffer(arg1 >>> 0, arg2);
}, arguments); }
export function __wbg_bindRenderbuffer_324fd91405ebdb55() { return logError(function (arg0, arg1, arg2) {
    arg0.bindRenderbuffer(arg1 >>> 0, arg2);
}, arguments); }
export function __wbg_bindRenderbuffer_d4e73537cc3c23dd() { return logError(function (arg0, arg1, arg2) {
    arg0.bindRenderbuffer(arg1 >>> 0, arg2);
}, arguments); }
export function __wbg_bindSampler_81550d380ef83fde() { return logError(function (arg0, arg1, arg2) {
    arg0.bindSampler(arg1 >>> 0, arg2);
}, arguments); }
export function __wbg_bindTexture_9560807e79c79e9e() { return logError(function (arg0, arg1, arg2) {
    arg0.bindTexture(arg1 >>> 0, arg2);
}, arguments); }
export function __wbg_bindTexture_adcc93a197a861bd() { return logError(function (arg0, arg1, arg2) {
    arg0.bindTexture(arg1 >>> 0, arg2);
}, arguments); }
export function __wbg_bindVertexArrayOES_5a903bbe60cd30d4() { return logError(function (arg0, arg1) {
    arg0.bindVertexArrayOES(arg1);
}, arguments); }
export function __wbg_bindVertexArray_b536f88ef905a6ac() { return logError(function (arg0, arg1) {
    arg0.bindVertexArray(arg1);
}, arguments); }
export function __wbg_blendColor_0dc1b9e2e8699cf8() { return logError(function (arg0, arg1, arg2, arg3, arg4) {
    arg0.blendColor(arg1, arg2, arg3, arg4);
}, arguments); }
export function __wbg_blendColor_347ae83996a6cf78() { return logError(function (arg0, arg1, arg2, arg3, arg4) {
    arg0.blendColor(arg1, arg2, arg3, arg4);
}, arguments); }
export function __wbg_blendEquationSeparate_9f1e2055fa2e7076() { return logError(function (arg0, arg1, arg2) {
    arg0.blendEquationSeparate(arg1 >>> 0, arg2 >>> 0);
}, arguments); }
export function __wbg_blendEquationSeparate_9f64c05b6971ddb3() { return logError(function (arg0, arg1, arg2) {
    arg0.blendEquationSeparate(arg1 >>> 0, arg2 >>> 0);
}, arguments); }
export function __wbg_blendEquation_187168667c5442a4() { return logError(function (arg0, arg1) {
    arg0.blendEquation(arg1 >>> 0);
}, arguments); }
export function __wbg_blendEquation_43c3d3a039205033() { return logError(function (arg0, arg1) {
    arg0.blendEquation(arg1 >>> 0);
}, arguments); }
export function __wbg_blendFuncSeparate_56946f7dffea79ff() { return logError(function (arg0, arg1, arg2, arg3, arg4) {
    arg0.blendFuncSeparate(arg1 >>> 0, arg2 >>> 0, arg3 >>> 0, arg4 >>> 0);
}, arguments); }
export function __wbg_blendFuncSeparate_cb15d1499ea79a3a() { return logError(function (arg0, arg1, arg2, arg3, arg4) {
    arg0.blendFuncSeparate(arg1 >>> 0, arg2 >>> 0, arg3 >>> 0, arg4 >>> 0);
}, arguments); }
export function __wbg_blendFunc_34451c1da68c6f91() { return logError(function (arg0, arg1, arg2) {
    arg0.blendFunc(arg1 >>> 0, arg2 >>> 0);
}, arguments); }
export function __wbg_blendFunc_7f6cfa190353236a() { return logError(function (arg0, arg1, arg2) {
    arg0.blendFunc(arg1 >>> 0, arg2 >>> 0);
}, arguments); }
export function __wbg_blitFramebuffer_5765344141e52d50() { return logError(function (arg0, arg1, arg2, arg3, arg4, arg5, arg6, arg7, arg8, arg9, arg10) {
    arg0.blitFramebuffer(arg1, arg2, arg3, arg4, arg5, arg6, arg7, arg8, arg9 >>> 0, arg10 >>> 0);
}, arguments); }
export function __wbg_bufferData_2e9c7448cdc06bcf() { return logError(function (arg0, arg1, arg2, arg3) {
    arg0.bufferData(arg1 >>> 0, arg2, arg3 >>> 0);
}, arguments); }
export function __wbg_bufferData_2eb007f9cc031f1d() { return logError(function (arg0, arg1, arg2, arg3) {
    arg0.bufferData(arg1 >>> 0, arg2, arg3 >>> 0);
}, arguments); }
export function __wbg_bufferData_f4e0d5b42151db0a() { return logError(function (arg0, arg1, arg2, arg3) {
    arg0.bufferData(arg1 >>> 0, arg2, arg3 >>> 0);
}, arguments); }
export function __wbg_bufferData_fccd5262811b54a2() { return logError(function (arg0, arg1, arg2, arg3) {
    arg0.bufferData(arg1 >>> 0, arg2, arg3 >>> 0);
}, arguments); }
export function __wbg_bufferSubData_35ff920f72ac71da() { return logError(function (arg0, arg1, arg2, arg3) {
    arg0.bufferSubData(arg1 >>> 0, arg2, arg3);
}, arguments); }
export function __wbg_bufferSubData_40bca454022e641b() { return logError(function (arg0, arg1, arg2, arg3) {
    arg0.bufferSubData(arg1 >>> 0, arg2, arg3);
}, arguments); }
export function __wbg_call_1aea13500fe8ff6c() { return handleError(function (arg0, arg1, arg2) {
    const ret = arg0.call(arg1, arg2);
    return ret;
}, arguments); }
export function __wbg_call_faf6b66fc4667ce6() { return handleError(function (arg0, arg1) {
    const ret = arg0.call(arg1);
    return ret;
}, arguments); }
export function __wbg_clearBuffer_700f6bba0d974e6c() { return logError(function (arg0, arg1, arg2) {
    arg0.clearBuffer(arg1, arg2);
}, arguments); }
export function __wbg_clearBuffer_b67061873f997b6a() { return logError(function (arg0, arg1, arg2, arg3) {
    arg0.clearBuffer(arg1, arg2, arg3);
}, arguments); }
export function __wbg_clearBufferfv_a31a72ea53e2a9ce() { return logError(function (arg0, arg1, arg2, arg3, arg4) {
    arg0.clearBufferfv(arg1 >>> 0, arg2, getArrayF32FromWasm0(arg3, arg4));
}, arguments); }
export function __wbg_clearBufferiv_b6a791b01cf2df33() { return logError(function (arg0, arg1, arg2, arg3, arg4) {
    arg0.clearBufferiv(arg1 >>> 0, arg2, getArrayI32FromWasm0(arg3, arg4));
}, arguments); }
export function __wbg_clearBufferuiv_072a39776be89ce3() { return logError(function (arg0, arg1, arg2, arg3, arg4) {
    arg0.clearBufferuiv(arg1 >>> 0, arg2, getArrayU32FromWasm0(arg3, arg4));
}, arguments); }
export function __wbg_clearDepth_4d2ae05a73397b01() { return logError(function (arg0, arg1) {
    arg0.clearDepth(arg1);
}, arguments); }
export function __wbg_clearDepth_d2694099c8ee7291() { return logError(function (arg0, arg1) {
    arg0.clearDepth(arg1);
}, arguments); }
export function __wbg_clearStencil_85cd03270e3236df() { return logError(function (arg0, arg1) {
    arg0.clearStencil(arg1);
}, arguments); }
export function __wbg_clearStencil_ff91a6538b8f6bb9() { return logError(function (arg0, arg1) {
    arg0.clearStencil(arg1);
}, arguments); }
export function __wbg_clear_02b91fe3c1160f4b() { return logError(function (arg0, arg1) {
    arg0.clear(arg1 >>> 0);
}, arguments); }
export function __wbg_clear_fec66fb050661e6a() { return logError(function (arg0, arg1) {
    arg0.clear(arg1 >>> 0);
}, arguments); }
export function __wbg_clientWaitSync_6523a0f72c96027e() { return logError(function (arg0, arg1, arg2, arg3) {
    const ret = arg0.clientWaitSync(arg1, arg2 >>> 0, arg3 >>> 0);
    _assertNum(ret);
    return ret;
}, arguments); }
export function __wbg_colorMask_9af657e57e8c55fc() { return logError(function (arg0, arg1, arg2, arg3, arg4) {
    arg0.colorMask(arg1 !== 0, arg2 !== 0, arg3 !== 0, arg4 !== 0);
}, arguments); }
export function __wbg_colorMask_fe066b286e037add() { return logError(function (arg0, arg1, arg2, arg3, arg4) {
    arg0.colorMask(arg1 !== 0, arg2 !== 0, arg3 !== 0, arg4 !== 0);
}, arguments); }
export function __wbg_compileShader_b489b59d862a0656() { return logError(function (arg0, arg1) {
    arg0.compileShader(arg1);
}, arguments); }
export function __wbg_compileShader_e1741f6f6b22f200() { return logError(function (arg0, arg1) {
    arg0.compileShader(arg1);
}, arguments); }
export function __wbg_compressedTexSubImage2D_5b24c508183bc3f5() { return logError(function (arg0, arg1, arg2, arg3, arg4, arg5, arg6, arg7, arg8) {
    arg0.compressedTexSubImage2D(arg1 >>> 0, arg2, arg3, arg4, arg5, arg6, arg7 >>> 0, arg8);
}, arguments); }
export function __wbg_compressedTexSubImage2D_7e034e3faa8ff6ae() { return logError(function (arg0, arg1, arg2, arg3, arg4, arg5, arg6, arg7, arg8) {
    arg0.compressedTexSubImage2D(arg1 >>> 0, arg2, arg3, arg4, arg5, arg6, arg7 >>> 0, arg8);
}, arguments); }
export function __wbg_compressedTexSubImage2D_a5d4bd631d195993() { return logError(function (arg0, arg1, arg2, arg3, arg4, arg5, arg6, arg7, arg8, arg9) {
    arg0.compressedTexSubImage2D(arg1 >>> 0, arg2, arg3, arg4, arg5, arg6, arg7 >>> 0, arg8, arg9);
}, arguments); }
export function __wbg_compressedTexSubImage3D_8646da3500c5c744() { return logError(function (arg0, arg1, arg2, arg3, arg4, arg5, arg6, arg7, arg8, arg9, arg10) {
    arg0.compressedTexSubImage3D(arg1 >>> 0, arg2, arg3, arg4, arg5, arg6, arg7, arg8, arg9 >>> 0, arg10);
}, arguments); }
export function __wbg_compressedTexSubImage3D_879cbe501eb47666() { return logError(function (arg0, arg1, arg2, arg3, arg4, arg5, arg6, arg7, arg8, arg9, arg10, arg11) {
    arg0.compressedTexSubImage3D(arg1 >>> 0, arg2, arg3, arg4, arg5, arg6, arg7, arg8, arg9 >>> 0, arg10, arg11);
}, arguments); }
export function __wbg_configure_3d64c677c7d68a15() { return handleError(function (arg0, arg1) {
    arg0.configure(arg1);
}, arguments); }
export function __wbg_copyBufferSubData_73c882b259d2e2b6() { return logError(function (arg0, arg1, arg2, arg3, arg4, arg5) {
    arg0.copyBufferSubData(arg1 >>> 0, arg2 >>> 0, arg3, arg4, arg5);
}, arguments); }
export function __wbg_copyBufferToBuffer_8bb974c7f9c5f4dc() { return handleError(function (arg0, arg1, arg2, arg3, arg4) {
    arg0.copyBufferToBuffer(arg1, arg2, arg3, arg4);
}, arguments); }
export function __wbg_copyBufferToBuffer_8fe240a0000c9e22() { return handleError(function (arg0, arg1, arg2, arg3, arg4, arg5) {
    arg0.copyBufferToBuffer(arg1, arg2, arg3, arg4, arg5);
}, arguments); }
export function __wbg_copyBufferToTexture_5c32355b7be376d8() { return handleError(function (arg0, arg1, arg2, arg3) {
    arg0.copyBufferToTexture(arg1, arg2, arg3);
}, arguments); }
export function __wbg_copyExternalImageToTexture_b8c12db525cb7f31() { return handleError(function (arg0, arg1, arg2, arg3) {
    arg0.copyExternalImageToTexture(arg1, arg2, arg3);
}, arguments); }
export function __wbg_copyTexSubImage2D_74ead2da76740798() { return logError(function (arg0, arg1, arg2, arg3, arg4, arg5, arg6, arg7, arg8) {
    arg0.copyTexSubImage2D(arg1 >>> 0, arg2, arg3, arg4, arg5, arg6, arg7, arg8);
}, arguments); }
export function __wbg_copyTexSubImage2D_c4a40be8868d9a14() { return logError(function (arg0, arg1, arg2, arg3, arg4, arg5, arg6, arg7, arg8) {
    arg0.copyTexSubImage2D(arg1 >>> 0, arg2, arg3, arg4, arg5, arg6, arg7, arg8);
}, arguments); }
export function __wbg_copyTexSubImage3D_9d7f3a533a7ab416() { return logError(function (arg0, arg1, arg2, arg3, arg4, arg5, arg6, arg7, arg8, arg9) {
    arg0.copyTexSubImage3D(arg1 >>> 0, arg2, arg3, arg4, arg5, arg6, arg7, arg8, arg9);
}, arguments); }
export function __wbg_copyTextureToBuffer_4186c16aef1922a5() { return handleError(function (arg0, arg1, arg2, arg3) {
    arg0.copyTextureToBuffer(arg1, arg2, arg3);
}, arguments); }
export function __wbg_copyTextureToTexture_1be188df1e535c0a() { return handleError(function (arg0, arg1, arg2, arg3) {
    arg0.copyTextureToTexture(arg1, arg2, arg3);
}, arguments); }
export function __wbg_createBindGroupLayout_9ea1a44942aaf13e() { return handleError(function (arg0, arg1) {
    const ret = arg0.createBindGroupLayout(arg1);
    return ret;
}, arguments); }
export function __wbg_createBindGroup_2320df4db188406c() { return logError(function (arg0, arg1) {
    const ret = arg0.createBindGroup(arg1);
    return ret;
}, arguments); }
export function __wbg_createBuffer_2f08c0205e04efca() { return handleError(function (arg0, arg1) {
    const ret = arg0.createBuffer(arg1);
    return ret;
}, arguments); }
export function __wbg_createBuffer_634aae6afc8603fa() { return logError(function (arg0) {
    const ret = arg0.createBuffer();
    return isLikeNone(ret) ? 0 : addToExternrefTable0(ret);
}, arguments); }
export function __wbg_createBuffer_cb32bba0a245b5f0() { return logError(function (arg0) {
    const ret = arg0.createBuffer();
    return isLikeNone(ret) ? 0 : addToExternrefTable0(ret);
}, arguments); }
export function __wbg_createCommandEncoder_cd88faca35d9ed68() { return logError(function (arg0, arg1) {
    const ret = arg0.createCommandEncoder(arg1);
    return ret;
}, arguments); }
export function __wbg_createComputePipeline_3e135ff73c8fc483() { return logError(function (arg0, arg1) {
    const ret = arg0.createComputePipeline(arg1);
    return ret;
}, arguments); }
export function __wbg_createElement_22af76933a7b7e81() { return handleError(function (arg0, arg1, arg2) {
    const ret = arg0.createElement(getStringFromWasm0(arg1, arg2));
    return ret;
}, arguments); }
export function __wbg_createFramebuffer_1a30da56415d8128() { return logError(function (arg0) {
    const ret = arg0.createFramebuffer();
    return isLikeNone(ret) ? 0 : addToExternrefTable0(ret);
}, arguments); }
export function __wbg_createFramebuffer_bec24194763552b8() { return logError(function (arg0) {
    const ret = arg0.createFramebuffer();
    return isLikeNone(ret) ? 0 : addToExternrefTable0(ret);
}, arguments); }
export function __wbg_createPipelineLayout_7a186f2e9bf0d605() { return logError(function (arg0, arg1) {
    const ret = arg0.createPipelineLayout(arg1);
    return ret;
}, arguments); }
export function __wbg_createProgram_b20375f7e07e4565() { return logError(function (arg0) {
    const ret = arg0.createProgram();
    return isLikeNone(ret) ? 0 : addToExternrefTable0(ret);
}, arguments); }
export function __wbg_createProgram_eeb811f1092e4e66() { return logError(function (arg0) {
    const ret = arg0.createProgram();
    return isLikeNone(ret) ? 0 : addToExternrefTable0(ret);
}, arguments); }
export function __wbg_createQuerySet_05da8b0de35672ca() { return handleError(function (arg0, arg1) {
    const ret = arg0.createQuerySet(arg1);
    return ret;
}, arguments); }
export function __wbg_createQuery_e98e22ea5c4199f3() { return logError(function (arg0) {
    const ret = arg0.createQuery();
    return isLikeNone(ret) ? 0 : addToExternrefTable0(ret);
}, arguments); }
export function __wbg_createRenderBundleEncoder_898bc419f724439b() { return handleError(function (arg0, arg1) {
    const ret = arg0.createRenderBundleEncoder(arg1);
    return ret;
}, arguments); }
export function __wbg_createRenderPipeline_f48187ba9f7701e8() { return handleError(function (arg0, arg1) {
    const ret = arg0.createRenderPipeline(arg1);
    return ret;
}, arguments); }
export function __wbg_createRenderbuffer_a43f5cf814af62c8() { return logError(function (arg0) {
    const ret = arg0.createRenderbuffer();
    return isLikeNone(ret) ? 0 : addToExternrefTable0(ret);
}, arguments); }
export function __wbg_createRenderbuffer_ed399557e8acdba7() { return logError(function (arg0) {
    const ret = arg0.createRenderbuffer();
    return isLikeNone(ret) ? 0 : addToExternrefTable0(ret);
}, arguments); }
export function __wbg_createSampler_248bd67c920af37d() { return logError(function (arg0, arg1) {
    const ret = arg0.createSampler(arg1);
    return ret;
}, arguments); }
export function __wbg_createSampler_40d3d1808ce4ccf0() { return logError(function (arg0) {
    const ret = arg0.createSampler();
    return isLikeNone(ret) ? 0 : addToExternrefTable0(ret);
}, arguments); }
export function __wbg_createShaderModule_53701de4fb271c90() { return logError(function (arg0, arg1) {
    const ret = arg0.createShaderModule(arg1);
    return ret;
}, arguments); }
export function __wbg_createShader_828e81c3b01299f7() { return logError(function (arg0, arg1) {
    const ret = arg0.createShader(arg1 >>> 0);
    return isLikeNone(ret) ? 0 : addToExternrefTable0(ret);
}, arguments); }
export function __wbg_createShader_a68df73e8615cf7f() { return logError(function (arg0, arg1) {
    const ret = arg0.createShader(arg1 >>> 0);
    return isLikeNone(ret) ? 0 : addToExternrefTable0(ret);
}, arguments); }
export function __wbg_createTask_1bea40f9ffeed1cf() { return handleError(function (arg0, arg1) {
    const ret = console.createTask(getStringFromWasm0(arg0, arg1));
    return ret;
}, arguments); }
export function __wbg_createTexture_64eb57187dc16330() { return logError(function (arg0) {
    const ret = arg0.createTexture();
    return isLikeNone(ret) ? 0 : addToExternrefTable0(ret);
}, arguments); }
export function __wbg_createTexture_9e76b80a2dc0d12e() { return handleError(function (arg0, arg1) {
    const ret = arg0.createTexture(arg1);
    return ret;
}, arguments); }
export function __wbg_createTexture_bdd2fd7604c04839() { return logError(function (arg0) {
    const ret = arg0.createTexture();
    return isLikeNone(ret) ? 0 : addToExternrefTable0(ret);
}, arguments); }
export function __wbg_createVertexArrayOES_17388a7ebf4b7bfe() { return logError(function (arg0) {
    const ret = arg0.createVertexArrayOES();
    return isLikeNone(ret) ? 0 : addToExternrefTable0(ret);
}, arguments); }
export function __wbg_createVertexArray_7c2c139cdda744b5() { return logError(function (arg0) {
    const ret = arg0.createVertexArray();
    return isLikeNone(ret) ? 0 : addToExternrefTable0(ret);
}, arguments); }
export function __wbg_createView_cc96b5bdd3d5bf5e() { return handleError(function (arg0, arg1) {
    const ret = arg0.createView(arg1);
    return ret;
}, arguments); }
export function __wbg_cullFace_2ac6820d8be3569b() { return logError(function (arg0, arg1) {
    arg0.cullFace(arg1 >>> 0);
}, arguments); }
export function __wbg_cullFace_b47f0b5ff6fbc4e8() { return logError(function (arg0, arg1) {
    arg0.cullFace(arg1 >>> 0);
}, arguments); }
export function __wbg_data_cfe3a2a875ad7522() { return logError(function (arg0, arg1) {
    const ret = arg1.data;
    const ptr1 = passArray8ToWasm0(ret, wasm.__wbindgen_malloc);
    const len1 = WASM_VECTOR_LEN;
    getDataViewMemory0().setInt32(arg0 + 4 * 1, len1, true);
    getDataViewMemory0().setInt32(arg0 + 4 * 0, ptr1, true);
}, arguments); }
export function __wbg_deleteBuffer_431cacf83f504e90() { return logError(function (arg0, arg1) {
    arg0.deleteBuffer(arg1);
}, arguments); }
export function __wbg_deleteBuffer_fa6436606df27f35() { return logError(function (arg0, arg1) {
    arg0.deleteBuffer(arg1);
}, arguments); }
export function __wbg_deleteFramebuffer_92b5885f27fc8283() { return logError(function (arg0, arg1) {
    arg0.deleteFramebuffer(arg1);
}, arguments); }
export function __wbg_deleteFramebuffer_a44089e317a80c64() { return logError(function (arg0, arg1) {
    arg0.deleteFramebuffer(arg1);
}, arguments); }
export function __wbg_deleteProgram_4a768b09bc35123b() { return logError(function (arg0, arg1) {
    arg0.deleteProgram(arg1);
}, arguments); }
export function __wbg_deleteProgram_b37d748df05b3396() { return logError(function (arg0, arg1) {
    arg0.deleteProgram(arg1);
}, arguments); }
export function __wbg_deleteQuery_493454abb4e57041() { return logError(function (arg0, arg1) {
    arg0.deleteQuery(arg1);
}, arguments); }
export function __wbg_deleteRenderbuffer_5195180823a72395() { return logError(function (arg0, arg1) {
    arg0.deleteRenderbuffer(arg1);
}, arguments); }
export function __wbg_deleteRenderbuffer_f57b915555c0b855() { return logError(function (arg0, arg1) {
    arg0.deleteRenderbuffer(arg1);
}, arguments); }
export function __wbg_deleteSampler_8e2035a696360764() { return logError(function (arg0, arg1) {
    arg0.deleteSampler(arg1);
}, arguments); }
export function __wbg_deleteShader_7ccf49592116c727() { return logError(function (arg0, arg1) {
    arg0.deleteShader(arg1);
}, arguments); }
export function __wbg_deleteShader_b90b1e4c164edffd() { return logError(function (arg0, arg1) {
    arg0.deleteShader(arg1);
}, arguments); }
export function __wbg_deleteSync_fa5d1de5dd19d2c0() { return logError(function (arg0, arg1) {
    arg0.deleteSync(arg1);
}, arguments); }
export function __wbg_deleteTexture_b1d80c8269d61722() { return logError(function (arg0, arg1) {
    arg0.deleteTexture(arg1);
}, arguments); }
export function __wbg_deleteTexture_cebd404ba7d6b782() { return logError(function (arg0, arg1) {
    arg0.deleteTexture(arg1);
}, arguments); }
export function __wbg_deleteVertexArrayOES_9af70f97832b5500() { return logError(function (arg0, arg1) {
    arg0.deleteVertexArrayOES(arg1);
}, arguments); }
export function __wbg_deleteVertexArray_145a499e098e8794() { return logError(function (arg0, arg1) {
    arg0.deleteVertexArray(arg1);
}, arguments); }
export function __wbg_depthFunc_23bf1b6bd274f948() { return logError(function (arg0, arg1) {
    arg0.depthFunc(arg1 >>> 0);
}, arguments); }
export function __wbg_depthFunc_a43f1c731109915b() { return logError(function (arg0, arg1) {
    arg0.depthFunc(arg1 >>> 0);
}, arguments); }
export function __wbg_depthMask_66724117973b6ff9() { return logError(function (arg0, arg1) {
    arg0.depthMask(arg1 !== 0);
}, arguments); }
export function __wbg_depthMask_c935705cda44d8be() { return logError(function (arg0, arg1) {
    arg0.depthMask(arg1 !== 0);
}, arguments); }
export function __wbg_depthRange_9feb49867173e854() { return logError(function (arg0, arg1, arg2) {
    arg0.depthRange(arg1, arg2);
}, arguments); }
export function __wbg_depthRange_e827bfffaf500974() { return logError(function (arg0, arg1, arg2) {
    arg0.depthRange(arg1, arg2);
}, arguments); }
export function __wbg_description_18d0a6d4077fec8e() { return logError(function (arg0, arg1) {
    const ret = arg1.description;
    const ptr1 = passStringToWasm0(ret, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
    const len1 = WASM_VECTOR_LEN;
    getDataViewMemory0().setInt32(arg0 + 4 * 1, len1, true);
    getDataViewMemory0().setInt32(arg0 + 4 * 0, ptr1, true);
}, arguments); }
export function __wbg_destroy_6601bc024448d3c7() { return logError(function (arg0) {
    arg0.destroy();
}, arguments); }
export function __wbg_destroy_b5b39f25f0799295() { return logError(function (arg0) {
    arg0.destroy();
}, arguments); }
export function __wbg_destroy_e3cb8ca345cccfc3() { return logError(function (arg0) {
    arg0.destroy();
}, arguments); }
export function __wbg_disableVertexAttribArray_7719cf9351a6e469() { return logError(function (arg0, arg1) {
    arg0.disableVertexAttribArray(arg1 >>> 0);
}, arguments); }
export function __wbg_disableVertexAttribArray_d4213fe0bc2a5347() { return logError(function (arg0, arg1) {
    arg0.disableVertexAttribArray(arg1 >>> 0);
}, arguments); }
export function __wbg_disable_289f67dd5f931fca() { return logError(function (arg0, arg1) {
    arg0.disable(arg1 >>> 0);
}, arguments); }
export function __wbg_disable_34e3af368545441a() { return logError(function (arg0, arg1) {
    arg0.disable(arg1 >>> 0);
}, arguments); }
export function __wbg_document_8d00b6db6f4e3e5e() { return logError(function (arg0) {
    const ret = arg0.document;
    return isLikeNone(ret) ? 0 : addToExternrefTable0(ret);
}, arguments); }
export function __wbg_done_e0b2820e599cb9f4() { return logError(function (arg0) {
    const ret = arg0.done;
    _assertBoolean(ret);
    return ret;
}, arguments); }
export function __wbg_drawArraysInstancedANGLE_d34b18d63f59d479() { return logError(function (arg0, arg1, arg2, arg3, arg4) {
    arg0.drawArraysInstancedANGLE(arg1 >>> 0, arg2, arg3, arg4);
}, arguments); }
export function __wbg_drawArraysInstanced_b238073b7bcc6a32() { return logError(function (arg0, arg1, arg2, arg3, arg4) {
    arg0.drawArraysInstanced(arg1 >>> 0, arg2, arg3, arg4);
}, arguments); }
export function __wbg_drawArrays_4ede7221e809def6() { return logError(function (arg0, arg1, arg2, arg3) {
    arg0.drawArrays(arg1 >>> 0, arg2, arg3);
}, arguments); }
export function __wbg_drawArrays_7330b8ea4a2497ba() { return logError(function (arg0, arg1, arg2, arg3) {
    arg0.drawArrays(arg1 >>> 0, arg2, arg3);
}, arguments); }
export function __wbg_drawBuffersWEBGL_fa949d7e1f2f15a2() { return logError(function (arg0, arg1) {
    arg0.drawBuffersWEBGL(arg1);
}, arguments); }
export function __wbg_drawBuffers_a4461e8723df471c() { return logError(function (arg0, arg1) {
    arg0.drawBuffers(arg1);
}, arguments); }
export function __wbg_drawElementsInstancedANGLE_7a4a6e6d9f591778() { return logError(function (arg0, arg1, arg2, arg3, arg4, arg5) {
    arg0.drawElementsInstancedANGLE(arg1 >>> 0, arg2, arg3 >>> 0, arg4, arg5);
}, arguments); }
export function __wbg_drawElementsInstanced_85db7045d67748ac() { return logError(function (arg0, arg1, arg2, arg3, arg4, arg5) {
    arg0.drawElementsInstanced(arg1 >>> 0, arg2, arg3 >>> 0, arg4, arg5);
}, arguments); }
export function __wbg_drawIndexedIndirect_300125bd70bcd09b() { return logError(function (arg0, arg1, arg2) {
    arg0.drawIndexedIndirect(arg1, arg2);
}, arguments); }
export function __wbg_drawIndexed_68637ebab6dd8d6e() { return logError(function (arg0, arg1, arg2, arg3, arg4, arg5) {
    arg0.drawIndexed(arg1 >>> 0, arg2 >>> 0, arg3 >>> 0, arg4, arg5 >>> 0);
}, arguments); }
export function __wbg_drawIndirect_3cabcd983032eced() { return logError(function (arg0, arg1, arg2) {
    arg0.drawIndirect(arg1, arg2);
}, arguments); }
export function __wbg_draw_ad0811de56a2d768() { return logError(function (arg0, arg1, arg2, arg3, arg4) {
    arg0.draw(arg1 >>> 0, arg2 >>> 0, arg3 >>> 0, arg4 >>> 0);
}, arguments); }
export function __wbg_enableVertexAttribArray_a349186274ae7f6e() { return logError(function (arg0, arg1) {
    arg0.enableVertexAttribArray(arg1 >>> 0);
}, arguments); }
export function __wbg_enableVertexAttribArray_ebc5e5c3005f1bd8() { return logError(function (arg0, arg1) {
    arg0.enableVertexAttribArray(arg1 >>> 0);
}, arguments); }
export function __wbg_enable_78737d68d27bc055() { return logError(function (arg0, arg1) {
    arg0.enable(arg1 >>> 0);
}, arguments); }
export function __wbg_enable_bd9bfea24edbfe6f() { return logError(function (arg0, arg1) {
    arg0.enable(arg1 >>> 0);
}, arguments); }
export function __wbg_endOcclusionQuery_a935f17dbc68b7f8() { return logError(function (arg0) {
    arg0.endOcclusionQuery();
}, arguments); }
export function __wbg_endQuery_17dba0e9a629778e() { return logError(function (arg0, arg1) {
    arg0.endQuery(arg1 >>> 0);
}, arguments); }
export function __wbg_end_414453a89205612c() { return logError(function (arg0) {
    arg0.end();
}, arguments); }
export function __wbg_entries_e234c7de8150095c() { return logError(function (arg0) {
    const ret = Object.entries(arg0);
    return ret;
}, arguments); }
export function __wbg_error_287b079609b734b7() { return logError(function (arg0) {
    const ret = arg0.error;
    return ret;
}, arguments); }
export function __wbg_error_a6fa202b58aa1cd3() { return logError(function (arg0, arg1) {
    let deferred0_0;
    let deferred0_1;
    try {
        deferred0_0 = arg0;
        deferred0_1 = arg1;
        console.error(getStringFromWasm0(arg0, arg1));
    } finally {
        wasm.__wbindgen_free(deferred0_0, deferred0_1, 1);
    }
}, arguments); }
export function __wbg_executeBundles_78f23090c2162193() { return logError(function (arg0, arg1) {
    arg0.executeBundles(arg1);
}, arguments); }
export function __wbg_features_4ce861c12227aa47() { return logError(function (arg0) {
    const ret = arg0.features;
    return ret;
}, arguments); }
export function __wbg_features_614e8836a2aaf39a() { return logError(function (arg0) {
    const ret = arg0.features;
    return ret;
}, arguments); }
export function __wbg_fenceSync_910518819efb411a() { return logError(function (arg0, arg1, arg2) {
    const ret = arg0.fenceSync(arg1 >>> 0, arg2 >>> 0);
    return isLikeNone(ret) ? 0 : addToExternrefTable0(ret);
}, arguments); }
export function __wbg_finish_087cb89c65c06eb1() { return logError(function (arg0) {
    const ret = arg0.finish();
    return ret;
}, arguments); }
export function __wbg_finish_cfaeede3baf55be1() { return logError(function (arg0, arg1) {
    const ret = arg0.finish(arg1);
    return ret;
}, arguments); }
export function __wbg_flush_ccba3f5fdb5013a1() { return logError(function (arg0) {
    arg0.flush();
}, arguments); }
export function __wbg_flush_f291478eb0dcb239() { return logError(function (arg0) {
    arg0.flush();
}, arguments); }
export function __wbg_framebufferRenderbuffer_1b2108ac472b1c17() { return logError(function (arg0, arg1, arg2, arg3, arg4) {
    arg0.framebufferRenderbuffer(arg1 >>> 0, arg2 >>> 0, arg3 >>> 0, arg4);
}, arguments); }
export function __wbg_framebufferRenderbuffer_53e70e3ca11fc094() { return logError(function (arg0, arg1, arg2, arg3, arg4) {
    arg0.framebufferRenderbuffer(arg1 >>> 0, arg2 >>> 0, arg3 >>> 0, arg4);
}, arguments); }
export function __wbg_framebufferTexture2D_3ca9eab3ad6f1ac1() { return logError(function (arg0, arg1, arg2, arg3, arg4, arg5) {
    arg0.framebufferTexture2D(arg1 >>> 0, arg2 >>> 0, arg3 >>> 0, arg4, arg5);
}, arguments); }
export function __wbg_framebufferTexture2D_eb2cdce93b74334f() { return logError(function (arg0, arg1, arg2, arg3, arg4, arg5) {
    arg0.framebufferTexture2D(arg1 >>> 0, arg2 >>> 0, arg3 >>> 0, arg4, arg5);
}, arguments); }
export function __wbg_framebufferTextureLayer_6d50955448761952() { return logError(function (arg0, arg1, arg2, arg3, arg4, arg5) {
    arg0.framebufferTextureLayer(arg1 >>> 0, arg2 >>> 0, arg3, arg4, arg5);
}, arguments); }
export function __wbg_framebufferTextureMultiviewOVR_de47033d076a1c65() { return logError(function (arg0, arg1, arg2, arg3, arg4, arg5, arg6) {
    arg0.framebufferTextureMultiviewOVR(arg1 >>> 0, arg2 >>> 0, arg3, arg4, arg5, arg6);
}, arguments); }
export function __wbg_frontFace_00ef7686d1b1088a() { return logError(function (arg0, arg1) {
    arg0.frontFace(arg1 >>> 0);
}, arguments); }
export function __wbg_frontFace_46fec56cf60a27cb() { return logError(function (arg0, arg1) {
    arg0.frontFace(arg1 >>> 0);
}, arguments); }
export function __wbg_getBufferSubData_1527fe409d7636a0() { return logError(function (arg0, arg1, arg2, arg3) {
    arg0.getBufferSubData(arg1 >>> 0, arg2, arg3);
}, arguments); }
export function __wbg_getContext_064ba67b26a73a3e() { return handleError(function (arg0, arg1, arg2) {
    const ret = arg0.getContext(getStringFromWasm0(arg1, arg2));
    return isLikeNone(ret) ? 0 : addToExternrefTable0(ret);
}, arguments); }
export function __wbg_getContext_30f7143eeaed637c() { return handleError(function (arg0, arg1, arg2) {
    const ret = arg0.getContext(getStringFromWasm0(arg1, arg2));
    return isLikeNone(ret) ? 0 : addToExternrefTable0(ret);
}, arguments); }
export function __wbg_getContext_729adedba115e573() { return handleError(function (arg0, arg1, arg2, arg3) {
    const ret = arg0.getContext(getStringFromWasm0(arg1, arg2), arg3);
    return isLikeNone(ret) ? 0 : addToExternrefTable0(ret);
}, arguments); }
export function __wbg_getContext_a527af8fecba2087() { return handleError(function (arg0, arg1, arg2, arg3) {
    const ret = arg0.getContext(getStringFromWasm0(arg1, arg2), arg3);
    return isLikeNone(ret) ? 0 : addToExternrefTable0(ret);
}, arguments); }
export function __wbg_getCurrentTexture_51975ae7185fd15f() { return handleError(function (arg0) {
    const ret = arg0.getCurrentTexture();
    return ret;
}, arguments); }
export function __wbg_getExtension_accec60a148bde49() { return handleError(function (arg0, arg1, arg2) {
    const ret = arg0.getExtension(getStringFromWasm0(arg1, arg2));
    return isLikeNone(ret) ? 0 : addToExternrefTable0(ret);
}, arguments); }
export function __wbg_getImageData_767c4f63fc5e613d() { return handleError(function (arg0, arg1, arg2, arg3, arg4) {
    const ret = arg0.getImageData(arg1, arg2, arg3, arg4);
    return ret;
}, arguments); }
export function __wbg_getIndexedParameter_de1acfd67158f312() { return handleError(function (arg0, arg1, arg2) {
    const ret = arg0.getIndexedParameter(arg1 >>> 0, arg2 >>> 0);
    return ret;
}, arguments); }
export function __wbg_getMappedRange_5ed22727c9679168() { return handleError(function (arg0, arg1, arg2) {
    const ret = arg0.getMappedRange(arg1, arg2);
    return ret;
}, arguments); }
export function __wbg_getParameter_1a896a8dcca1c4fa() { return handleError(function (arg0, arg1) {
    const ret = arg0.getParameter(arg1 >>> 0);
    return ret;
}, arguments); }
export function __wbg_getParameter_7be23eeb6876b790() { return handleError(function (arg0, arg1) {
    const ret = arg0.getParameter(arg1 >>> 0);
    return ret;
}, arguments); }
export function __wbg_getPreferredCanvasFormat_1b8495aeb1d11ab1() { return logError(function (arg0) {
    const ret = arg0.getPreferredCanvasFormat();
    return (__wbindgen_enum_GpuTextureFormat.indexOf(ret) + 1 || 96) - 1;
}, arguments); }
export function __wbg_getProgramInfoLog_6f8aa7c1b37d4140() { return logError(function (arg0, arg1, arg2) {
    const ret = arg1.getProgramInfoLog(arg2);
    var ptr1 = isLikeNone(ret) ? 0 : passStringToWasm0(ret, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
    var len1 = WASM_VECTOR_LEN;
    getDataViewMemory0().setInt32(arg0 + 4 * 1, len1, true);
    getDataViewMemory0().setInt32(arg0 + 4 * 0, ptr1, true);
}, arguments); }
export function __wbg_getProgramInfoLog_8a6ecb6668e998d1() { return logError(function (arg0, arg1, arg2) {
    const ret = arg1.getProgramInfoLog(arg2);
    var ptr1 = isLikeNone(ret) ? 0 : passStringToWasm0(ret, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
    var len1 = WASM_VECTOR_LEN;
    getDataViewMemory0().setInt32(arg0 + 4 * 1, len1, true);
    getDataViewMemory0().setInt32(arg0 + 4 * 0, ptr1, true);
}, arguments); }
export function __wbg_getProgramParameter_8f31caa7326d56ff() { return logError(function (arg0, arg1, arg2) {
    const ret = arg0.getProgramParameter(arg1, arg2 >>> 0);
    return ret;
}, arguments); }
export function __wbg_getProgramParameter_a6da442bd18f71ea() { return logError(function (arg0, arg1, arg2) {
    const ret = arg0.getProgramParameter(arg1, arg2 >>> 0);
    return ret;
}, arguments); }
export function __wbg_getQueryParameter_ca0185333ff24acf() { return logError(function (arg0, arg1, arg2) {
    const ret = arg0.getQueryParameter(arg1, arg2 >>> 0);
    return ret;
}, arguments); }
export function __wbg_getShaderInfoLog_4a30ecb2bca0a8fd() { return logError(function (arg0, arg1, arg2) {
    const ret = arg1.getShaderInfoLog(arg2);
    var ptr1 = isLikeNone(ret) ? 0 : passStringToWasm0(ret, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
    var len1 = WASM_VECTOR_LEN;
    getDataViewMemory0().setInt32(arg0 + 4 * 1, len1, true);
    getDataViewMemory0().setInt32(arg0 + 4 * 0, ptr1, true);
}, arguments); }
export function __wbg_getShaderInfoLog_fb2b3e5488623f52() { return logError(function (arg0, arg1, arg2) {
    const ret = arg1.getShaderInfoLog(arg2);
    var ptr1 = isLikeNone(ret) ? 0 : passStringToWasm0(ret, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
    var len1 = WASM_VECTOR_LEN;
    getDataViewMemory0().setInt32(arg0 + 4 * 1, len1, true);
    getDataViewMemory0().setInt32(arg0 + 4 * 0, ptr1, true);
}, arguments); }
export function __wbg_getShaderParameter_1289544e6a149b67() { return logError(function (arg0, arg1, arg2) {
    const ret = arg0.getShaderParameter(arg1, arg2 >>> 0);
    return ret;
}, arguments); }
export function __wbg_getShaderParameter_34d1e384ebb29665() { return logError(function (arg0, arg1, arg2) {
    const ret = arg0.getShaderParameter(arg1, arg2 >>> 0);
    return ret;
}, arguments); }
export function __wbg_getSupportedExtensions_fa152e3812b9efef() { return logError(function (arg0) {
    const ret = arg0.getSupportedExtensions();
    return isLikeNone(ret) ? 0 : addToExternrefTable0(ret);
}, arguments); }
export function __wbg_getSupportedProfiles_6935d344271bf832() { return logError(function (arg0) {
    const ret = arg0.getSupportedProfiles();
    return isLikeNone(ret) ? 0 : addToExternrefTable0(ret);
}, arguments); }
export function __wbg_getSyncParameter_2510b5abbf0df600() { return logError(function (arg0, arg1, arg2) {
    const ret = arg0.getSyncParameter(arg1, arg2 >>> 0);
    return ret;
}, arguments); }
export function __wbg_getUniformBlockIndex_88fc6cbcfe931148() { return logError(function (arg0, arg1, arg2, arg3) {
    const ret = arg0.getUniformBlockIndex(arg1, getStringFromWasm0(arg2, arg3));
    _assertNum(ret);
    return ret;
}, arguments); }
export function __wbg_getUniformLocation_141c8d21824a1679() { return logError(function (arg0, arg1, arg2, arg3) {
    const ret = arg0.getUniformLocation(arg1, getStringFromWasm0(arg2, arg3));
    return isLikeNone(ret) ? 0 : addToExternrefTable0(ret);
}, arguments); }
export function __wbg_getUniformLocation_83c8ff312ccadd3a() { return logError(function (arg0, arg1, arg2, arg3) {
    const ret = arg0.getUniformLocation(arg1, getStringFromWasm0(arg2, arg3));
    return isLikeNone(ret) ? 0 : addToExternrefTable0(ret);
}, arguments); }
export function __wbg_get_480fa63526daa580() { return logError(function (arg0, arg1) {
    const ret = arg0[arg1 >>> 0];
    return isLikeNone(ret) ? 0 : addToExternrefTable0(ret);
}, arguments); }
export function __wbg_get_8944f33c9c7f4f6c() { return logError(function (arg0, arg1) {
    const ret = arg0[arg1 >>> 0];
    return ret;
}, arguments); }
export function __wbg_get_97a4b9029a97fbd6() { return handleError(function (arg0, arg1) {
    const ret = Reflect.get(arg0, arg1);
    return ret;
}, arguments); }
export function __wbg_get_d8a3d51a73d14c8a() { return handleError(function (arg0, arg1) {
    const ret = Reflect.get(arg0, arg1);
    return ret;
}, arguments); }
export function __wbg_get_unchecked_c33f0e513c522d7c() { return logError(function (arg0, arg1) {
    const ret = arg0[arg1 >>> 0];
    return ret;
}, arguments); }
export function __wbg_get_with_ref_key_6412cf3094599694() { return logError(function (arg0, arg1) {
    const ret = arg0[arg1];
    return ret;
}, arguments); }
export function __wbg_gpu_a7c12045c25d009a() { return logError(function (arg0) {
    const ret = arg0.gpu;
    return ret;
}, arguments); }
export function __wbg_has_b5a46804dc5e62bd() { return logError(function (arg0, arg1, arg2) {
    const ret = arg0.has(getStringFromWasm0(arg1, arg2));
    _assertBoolean(ret);
    return ret;
}, arguments); }
export function __wbg_height_599ce151f78a7ce4() { return logError(function (arg0) {
    const ret = arg0.height;
    _assertNum(ret);
    return ret;
}, arguments); }
export function __wbg_height_8b6fea8d47c5e971() { return logError(function (arg0) {
    const ret = arg0.height;
    _assertNum(ret);
    return ret;
}, arguments); }
export function __wbg_height_8ba0d55527fe8f18() { return logError(function (arg0) {
    const ret = arg0.height;
    _assertNum(ret);
    return ret;
}, arguments); }
export function __wbg_height_c4e90de06690eaec() { return logError(function (arg0) {
    const ret = arg0.height;
    _assertNum(ret);
    return ret;
}, arguments); }
export function __wbg_height_f3205fe0db73972c() { return logError(function (arg0) {
    const ret = arg0.height;
    _assertNum(ret);
    return ret;
}, arguments); }
export function __wbg_includes_907769f1752a98ff() { return logError(function (arg0, arg1, arg2) {
    const ret = arg0.includes(arg1, arg2);
    _assertBoolean(ret);
    return ret;
}, arguments); }
export function __wbg_info_22dcf1fd1b12bc7d() { return logError(function (arg0) {
    const ret = arg0.info;
    return ret;
}, arguments); }
export function __wbg_insertDebugMarker_1e34d63423410656() { return logError(function (arg0, arg1, arg2) {
    arg0.insertDebugMarker(getStringFromWasm0(arg1, arg2));
}, arguments); }
export function __wbg_insertDebugMarker_d2c5be9b5ea288ba() { return logError(function (arg0, arg1, arg2) {
    arg0.insertDebugMarker(getStringFromWasm0(arg1, arg2));
}, arguments); }
export function __wbg_instanceof_ArrayBuffer_046631d47961f5fe() { return logError(function (arg0) {
    let result;
    try {
        result = arg0 instanceof ArrayBuffer;
    } catch (_) {
        result = false;
    }
    const ret = result;
    _assertBoolean(ret);
    return ret;
}, arguments); }
export function __wbg_instanceof_GpuAdapter_fc7b89fc546de0bc() { return logError(function (arg0) {
    let result;
    try {
        result = arg0 instanceof GPUAdapter;
    } catch (_) {
        result = false;
    }
    const ret = result;
    _assertBoolean(ret);
    return ret;
}, arguments); }
export function __wbg_instanceof_GpuCanvasContext_1a39fd0621603553() { return logError(function (arg0) {
    let result;
    try {
        result = arg0 instanceof GPUCanvasContext;
    } catch (_) {
        result = false;
    }
    const ret = result;
    _assertBoolean(ret);
    return ret;
}, arguments); }
export function __wbg_instanceof_GpuDeviceLostInfo_c0ebce29b32e81e8() { return logError(function (arg0) {
    let result;
    try {
        result = arg0 instanceof GPUDeviceLostInfo;
    } catch (_) {
        result = false;
    }
    const ret = result;
    _assertBoolean(ret);
    return ret;
}, arguments); }
export function __wbg_instanceof_GpuOutOfMemoryError_5ac5c50ce9ee21d2() { return logError(function (arg0) {
    let result;
    try {
        result = arg0 instanceof GPUOutOfMemoryError;
    } catch (_) {
        result = false;
    }
    const ret = result;
    _assertBoolean(ret);
    return ret;
}, arguments); }
export function __wbg_instanceof_GpuValidationError_77b97d666afabac1() { return logError(function (arg0) {
    let result;
    try {
        result = arg0 instanceof GPUValidationError;
    } catch (_) {
        result = false;
    }
    const ret = result;
    _assertBoolean(ret);
    return ret;
}, arguments); }
export function __wbg_instanceof_HtmlCanvasElement_1ee070c578ed9cdc() { return logError(function (arg0) {
    let result;
    try {
        result = arg0 instanceof HTMLCanvasElement;
    } catch (_) {
        result = false;
    }
    const ret = result;
    _assertBoolean(ret);
    return ret;
}, arguments); }
export function __wbg_instanceof_Map_4b9c368d84df6811() { return logError(function (arg0) {
    let result;
    try {
        result = arg0 instanceof Map;
    } catch (_) {
        result = false;
    }
    const ret = result;
    _assertBoolean(ret);
    return ret;
}, arguments); }
export function __wbg_instanceof_Object_a99dcb8b396fa196() { return logError(function (arg0) {
    let result;
    try {
        result = arg0 instanceof Object;
    } catch (_) {
        result = false;
    }
    const ret = result;
    _assertBoolean(ret);
    return ret;
}, arguments); }
export function __wbg_instanceof_OffscreenCanvas_34012446c4da8c89() { return logError(function (arg0) {
    let result;
    try {
        result = arg0 instanceof OffscreenCanvas;
    } catch (_) {
        result = false;
    }
    const ret = result;
    _assertBoolean(ret);
    return ret;
}, arguments); }
export function __wbg_instanceof_Uint8Array_e7d245baab296394() { return logError(function (arg0) {
    let result;
    try {
        result = arg0 instanceof Uint8Array;
    } catch (_) {
        result = false;
    }
    const ret = result;
    _assertBoolean(ret);
    return ret;
}, arguments); }
export function __wbg_instanceof_WebGl2RenderingContext_b0fd328023d101b2() { return logError(function (arg0) {
    let result;
    try {
        result = arg0 instanceof WebGL2RenderingContext;
    } catch (_) {
        result = false;
    }
    const ret = result;
    _assertBoolean(ret);
    return ret;
}, arguments); }
export function __wbg_instanceof_Window_4bfad3a9470c25c9() { return logError(function (arg0) {
    let result;
    try {
        result = arg0 instanceof Window;
    } catch (_) {
        result = false;
    }
    const ret = result;
    _assertBoolean(ret);
    return ret;
}, arguments); }
export function __wbg_invalidateFramebuffer_5bc63f92473c0b28() { return handleError(function (arg0, arg1, arg2) {
    arg0.invalidateFramebuffer(arg1 >>> 0, arg2);
}, arguments); }
export function __wbg_isArray_8dc932f4b6997756() { return logError(function (arg0) {
    const ret = Array.isArray(arg0);
    _assertBoolean(ret);
    return ret;
}, arguments); }
export function __wbg_isSafeInteger_db44a36710ec7a10() { return logError(function (arg0) {
    const ret = Number.isSafeInteger(arg0);
    _assertBoolean(ret);
    return ret;
}, arguments); }
export function __wbg_is_04cfa9fd1c38e170() { return logError(function (arg0, arg1) {
    const ret = Object.is(arg0, arg1);
    _assertBoolean(ret);
    return ret;
}, arguments); }
export function __wbg_iterator_8af67730d17a1376() { return logError(function () {
    const ret = Symbol.iterator;
    return ret;
}, arguments); }
export function __wbg_keys_2ce19b5f8d7dc1cd() { return logError(function (arg0) {
    const ret = arg0.keys();
    return ret;
}, arguments); }
export function __wbg_label_47480289cc2bce71() { return logError(function (arg0, arg1) {
    const ret = arg1.label;
    const ptr1 = passStringToWasm0(ret, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
    const len1 = WASM_VECTOR_LEN;
    getDataViewMemory0().setInt32(arg0 + 4 * 1, len1, true);
    getDataViewMemory0().setInt32(arg0 + 4 * 0, ptr1, true);
}, arguments); }
export function __wbg_length_090b6aa6235450ba() { return logError(function (arg0) {
    const ret = arg0.length;
    _assertNum(ret);
    return ret;
}, arguments); }
export function __wbg_length_713cc1160ce7b5b9() { return logError(function (arg0) {
    const ret = arg0.length;
    _assertNum(ret);
    return ret;
}, arguments); }
export function __wbg_limits_1c25cb4f379a4418() { return logError(function (arg0) {
    const ret = arg0.limits;
    return ret;
}, arguments); }
export function __wbg_limits_50a8c5e629dbfe40() { return logError(function (arg0) {
    const ret = arg0.limits;
    return ret;
}, arguments); }
export function __wbg_linkProgram_47357d3d0a10d366() { return logError(function (arg0, arg1) {
    arg0.linkProgram(arg1);
}, arguments); }
export function __wbg_linkProgram_4f362b048cee2c35() { return logError(function (arg0, arg1) {
    arg0.linkProgram(arg1);
}, arguments); }
export function __wbg_lost_7b1065bddc80e8ac() { return logError(function (arg0) {
    const ret = arg0.lost;
    return ret;
}, arguments); }
export function __wbg_mapAsync_bb0029907dd91181() { return logError(function (arg0, arg1, arg2, arg3) {
    const ret = arg0.mapAsync(arg1 >>> 0, arg2, arg3);
    return ret;
}, arguments); }
export function __wbg_maxBindGroups_14611ac9ed1c6b56() { return logError(function (arg0) {
    const ret = arg0.maxBindGroups;
    _assertNum(ret);
    return ret;
}, arguments); }
export function __wbg_maxBindingsPerBindGroup_dd3f66044d2a9bfb() { return logError(function (arg0) {
    const ret = arg0.maxBindingsPerBindGroup;
    _assertNum(ret);
    return ret;
}, arguments); }
export function __wbg_maxBufferSize_f7ce3e1856349d2f() { return logError(function (arg0) {
    const ret = arg0.maxBufferSize;
    return ret;
}, arguments); }
export function __wbg_maxColorAttachmentBytesPerSample_55e64194645ea041() { return logError(function (arg0) {
    const ret = arg0.maxColorAttachmentBytesPerSample;
    _assertNum(ret);
    return ret;
}, arguments); }
export function __wbg_maxColorAttachments_fd9187f9f786da18() { return logError(function (arg0) {
    const ret = arg0.maxColorAttachments;
    _assertNum(ret);
    return ret;
}, arguments); }
export function __wbg_maxComputeInvocationsPerWorkgroup_9b3b1fc261129782() { return logError(function (arg0) {
    const ret = arg0.maxComputeInvocationsPerWorkgroup;
    _assertNum(ret);
    return ret;
}, arguments); }
export function __wbg_maxComputeWorkgroupSizeX_c55bbbcc02b75241() { return logError(function (arg0) {
    const ret = arg0.maxComputeWorkgroupSizeX;
    _assertNum(ret);
    return ret;
}, arguments); }
export function __wbg_maxComputeWorkgroupSizeY_96f40b1ec3102a3a() { return logError(function (arg0) {
    const ret = arg0.maxComputeWorkgroupSizeY;
    _assertNum(ret);
    return ret;
}, arguments); }
export function __wbg_maxComputeWorkgroupSizeZ_c2b1061d521561bb() { return logError(function (arg0) {
    const ret = arg0.maxComputeWorkgroupSizeZ;
    _assertNum(ret);
    return ret;
}, arguments); }
export function __wbg_maxComputeWorkgroupStorageSize_fac26e89d99e08f9() { return logError(function (arg0) {
    const ret = arg0.maxComputeWorkgroupStorageSize;
    _assertNum(ret);
    return ret;
}, arguments); }
export function __wbg_maxComputeWorkgroupsPerDimension_cd001f910e9b4d70() { return logError(function (arg0) {
    const ret = arg0.maxComputeWorkgroupsPerDimension;
    _assertNum(ret);
    return ret;
}, arguments); }
export function __wbg_maxDynamicStorageBuffersPerPipelineLayout_29399b82af020d86() { return logError(function (arg0) {
    const ret = arg0.maxDynamicStorageBuffersPerPipelineLayout;
    _assertNum(ret);
    return ret;
}, arguments); }
export function __wbg_maxDynamicUniformBuffersPerPipelineLayout_6d6cf80f3bd08e52() { return logError(function (arg0) {
    const ret = arg0.maxDynamicUniformBuffersPerPipelineLayout;
    _assertNum(ret);
    return ret;
}, arguments); }
export function __wbg_maxInterStageShaderVariables_8b000f47a166b1d5() { return logError(function (arg0) {
    const ret = arg0.maxInterStageShaderVariables;
    _assertNum(ret);
    return ret;
}, arguments); }
export function __wbg_maxSampledTexturesPerShaderStage_618a49f33217dde2() { return logError(function (arg0) {
    const ret = arg0.maxSampledTexturesPerShaderStage;
    _assertNum(ret);
    return ret;
}, arguments); }
export function __wbg_maxSamplersPerShaderStage_aa09fa0311712a1a() { return logError(function (arg0) {
    const ret = arg0.maxSamplersPerShaderStage;
    _assertNum(ret);
    return ret;
}, arguments); }
export function __wbg_maxStorageBufferBindingSize_0ec83ae10ad73180() { return logError(function (arg0) {
    const ret = arg0.maxStorageBufferBindingSize;
    return ret;
}, arguments); }
export function __wbg_maxStorageBuffersPerShaderStage_0cca5b468fcf10b6() { return logError(function (arg0) {
    const ret = arg0.maxStorageBuffersPerShaderStage;
    _assertNum(ret);
    return ret;
}, arguments); }
export function __wbg_maxStorageTexturesPerShaderStage_9d6c35770f37866c() { return logError(function (arg0) {
    const ret = arg0.maxStorageTexturesPerShaderStage;
    _assertNum(ret);
    return ret;
}, arguments); }
export function __wbg_maxTextureArrayLayers_c2bf9c85285832d4() { return logError(function (arg0) {
    const ret = arg0.maxTextureArrayLayers;
    _assertNum(ret);
    return ret;
}, arguments); }
export function __wbg_maxTextureDimension1D_e09f86e22ea6bac9() { return logError(function (arg0) {
    const ret = arg0.maxTextureDimension1D;
    _assertNum(ret);
    return ret;
}, arguments); }
export function __wbg_maxTextureDimension2D_2631916ef9a3efa8() { return logError(function (arg0) {
    const ret = arg0.maxTextureDimension2D;
    _assertNum(ret);
    return ret;
}, arguments); }
export function __wbg_maxTextureDimension3D_06ee54121b37d431() { return logError(function (arg0) {
    const ret = arg0.maxTextureDimension3D;
    _assertNum(ret);
    return ret;
}, arguments); }
export function __wbg_maxUniformBufferBindingSize_af9e8a077907ed64() { return logError(function (arg0) {
    const ret = arg0.maxUniformBufferBindingSize;
    return ret;
}, arguments); }
export function __wbg_maxUniformBuffersPerShaderStage_f871b70865df8c11() { return logError(function (arg0) {
    const ret = arg0.maxUniformBuffersPerShaderStage;
    _assertNum(ret);
    return ret;
}, arguments); }
export function __wbg_maxVertexAttributes_e72dabb2714f5cf5() { return logError(function (arg0) {
    const ret = arg0.maxVertexAttributes;
    _assertNum(ret);
    return ret;
}, arguments); }
export function __wbg_maxVertexBufferArrayStride_6a1cd814386082ce() { return logError(function (arg0) {
    const ret = arg0.maxVertexBufferArrayStride;
    _assertNum(ret);
    return ret;
}, arguments); }
export function __wbg_maxVertexBuffers_9c61c5fd286ebcc6() { return logError(function (arg0) {
    const ret = arg0.maxVertexBuffers;
    _assertNum(ret);
    return ret;
}, arguments); }
export function __wbg_message_09714b1dbee17e65() { return logError(function (arg0, arg1) {
    const ret = arg1.message;
    const ptr1 = passStringToWasm0(ret, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
    const len1 = WASM_VECTOR_LEN;
    getDataViewMemory0().setInt32(arg0 + 4 * 1, len1, true);
    getDataViewMemory0().setInt32(arg0 + 4 * 0, ptr1, true);
}, arguments); }
export function __wbg_message_6769962f0009c864() { return logError(function (arg0, arg1) {
    const ret = arg1.message;
    const ptr1 = passStringToWasm0(ret, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
    const len1 = WASM_VECTOR_LEN;
    getDataViewMemory0().setInt32(arg0 + 4 * 1, len1, true);
    getDataViewMemory0().setInt32(arg0 + 4 * 0, ptr1, true);
}, arguments); }
export function __wbg_minStorageBufferOffsetAlignment_e214f59628fb3558() { return logError(function (arg0) {
    const ret = arg0.minStorageBufferOffsetAlignment;
    _assertNum(ret);
    return ret;
}, arguments); }
export function __wbg_minUniformBufferOffsetAlignment_58b69e1c3924f6a4() { return logError(function (arg0) {
    const ret = arg0.minUniformBufferOffsetAlignment;
    _assertNum(ret);
    return ret;
}, arguments); }
export function __wbg_navigator_a6aef662775ce236() { return logError(function (arg0) {
    const ret = arg0.navigator;
    return ret;
}, arguments); }
export function __wbg_navigator_cda717510f3a4a47() { return logError(function (arg0) {
    const ret = arg0.navigator;
    return ret;
}, arguments); }
export function __wbg_new_227d7c05414eb861() { return logError(function () {
    const ret = new Error();
    return ret;
}, arguments); }
export function __wbg_new_4774b8d4db1224e4() { return logError(function (arg0) {
    const ret = new Uint8Array(arg0);
    return ret;
}, arguments); }
export function __wbg_new_480195ddf7042529() { return logError(function () {
    const ret = new Array();
    return ret;
}, arguments); }
export function __wbg_new_cc88e2b82fb56b5e() { return handleError(function (arg0, arg1) {
    const ret = new OffscreenCanvas(arg0 >>> 0, arg1 >>> 0);
    return ret;
}, arguments); }
export function __wbg_new_e4597c3f125a2038() { return logError(function () {
    const ret = new Object();
    return ret;
}, arguments); }
export function __wbg_new_typed_5101eada2c6754de() { return logError(function (arg0, arg1) {
    try {
        var state0 = {a: arg0, b: arg1};
        var cb0 = (arg0, arg1) => {
            const a = state0.a;
            state0.a = 0;
            try {
                return wasm_bindgen__convert__closures_____invoke__hb9cb5789986fdfcb(a, state0.b, arg0, arg1);
            } finally {
                state0.a = a;
            }
        };
        const ret = new Promise(cb0);
        return ret;
    } finally {
        state0.a = 0;
    }
}, arguments); }
export function __wbg_new_with_byte_offset_and_length_716709b677573556() { return logError(function (arg0, arg1, arg2) {
    const ret = new Uint8Array(arg0, arg1 >>> 0, arg2 >>> 0);
    return ret;
}, arguments); }
export function __wbg_new_with_u8_clamped_array_and_sh_ead327956e5bb2b6() { return handleError(function (arg0, arg1, arg2, arg3) {
    const ret = new ImageData(getClampedArrayU8FromWasm0(arg0, arg1), arg2 >>> 0, arg3 >>> 0);
    return ret;
}, arguments); }
export function __wbg_next_9a5990d0355cdd1a() { return handleError(function (arg0) {
    const ret = arg0.next();
    return ret;
}, arguments); }
export function __wbg_next_e75ce91d696d3c0f() { return logError(function (arg0) {
    const ret = arg0.next;
    return ret;
}, arguments); }
export function __wbg_of_786b4c4fc6e0c8d8() { return logError(function (arg0) {
    const ret = Array.of(arg0);
    return ret;
}, arguments); }
export function __wbg_onSubmittedWorkDone_1460145eecea40ef() { return logError(function (arg0) {
    const ret = arg0.onSubmittedWorkDone();
    return ret;
}, arguments); }
export function __wbg_pixelStorei_838f319e957b97b1() { return logError(function (arg0, arg1, arg2) {
    arg0.pixelStorei(arg1 >>> 0, arg2);
}, arguments); }
export function __wbg_pixelStorei_f5aed17ba3a24523() { return logError(function (arg0, arg1, arg2) {
    arg0.pixelStorei(arg1 >>> 0, arg2);
}, arguments); }
export function __wbg_polygonOffset_74e50db650460a2c() { return logError(function (arg0, arg1, arg2) {
    arg0.polygonOffset(arg1, arg2);
}, arguments); }
export function __wbg_polygonOffset_7542e8fe4435f484() { return logError(function (arg0, arg1, arg2) {
    arg0.polygonOffset(arg1, arg2);
}, arguments); }
export function __wbg_popDebugGroup_0c45034afb9a2d56() { return logError(function (arg0) {
    arg0.popDebugGroup();
}, arguments); }
export function __wbg_popDebugGroup_df63b3bf2b158ccf() { return logError(function (arg0) {
    arg0.popDebugGroup();
}, arguments); }
export function __wbg_popErrorScope_4cbc9ce0c8cc5a9f() { return logError(function (arg0) {
    const ret = arg0.popErrorScope();
    return ret;
}, arguments); }
export function __wbg_prototypesetcall_7dca54d31cb9d2dc() { return logError(function (arg0, arg1, arg2) {
    Uint8Array.prototype.set.call(getArrayU8FromWasm0(arg0, arg1), arg2);
}, arguments); }
export function __wbg_pushDebugGroup_3f0735d624fe2b7a() { return logError(function (arg0, arg1, arg2) {
    arg0.pushDebugGroup(getStringFromWasm0(arg1, arg2));
}, arguments); }
export function __wbg_pushDebugGroup_4c8c13db9993e39c() { return logError(function (arg0, arg1, arg2) {
    arg0.pushDebugGroup(getStringFromWasm0(arg1, arg2));
}, arguments); }
export function __wbg_pushErrorScope_aad0eef2ff5b28d3() { return logError(function (arg0, arg1) {
    arg0.pushErrorScope(__wbindgen_enum_GpuErrorFilter[arg1]);
}, arguments); }
export function __wbg_push_bb0def92a641d074() { return logError(function (arg0, arg1) {
    const ret = arg0.push(arg1);
    _assertNum(ret);
    return ret;
}, arguments); }
export function __wbg_putImageData_2c9d6178eb67c4c8() { return handleError(function (arg0, arg1, arg2, arg3) {
    arg0.putImageData(arg1, arg2, arg3);
}, arguments); }
export function __wbg_queryCounterEXT_d666e8a0dfecf78f() { return logError(function (arg0, arg1, arg2) {
    arg0.queryCounterEXT(arg1, arg2 >>> 0);
}, arguments); }
export function __wbg_querySelectorAll_8f983d85893fba25() { return handleError(function (arg0, arg1, arg2) {
    const ret = arg0.querySelectorAll(getStringFromWasm0(arg1, arg2));
    return ret;
}, arguments); }
export function __wbg_querySelector_1fc4d5c8e75b125f() { return handleError(function (arg0, arg1, arg2) {
    const ret = arg0.querySelector(getStringFromWasm0(arg1, arg2));
    return isLikeNone(ret) ? 0 : addToExternrefTable0(ret);
}, arguments); }
export function __wbg_queueMicrotask_1f50b4bdf2c98605() { return logError(function (arg0) {
    queueMicrotask(arg0);
}, arguments); }
export function __wbg_queueMicrotask_805204511f79bee8() { return logError(function (arg0) {
    const ret = arg0.queueMicrotask;
    return ret;
}, arguments); }
export function __wbg_queue_65d985f3e6d786a6() { return logError(function (arg0) {
    const ret = arg0.queue;
    return ret;
}, arguments); }
export function __wbg_readBuffer_272d64b66548e4bd() { return logError(function (arg0, arg1) {
    arg0.readBuffer(arg1 >>> 0);
}, arguments); }
export function __wbg_readPixels_55677ecdb64ad211() { return handleError(function (arg0, arg1, arg2, arg3, arg4, arg5, arg6, arg7) {
    arg0.readPixels(arg1, arg2, arg3, arg4, arg5 >>> 0, arg6 >>> 0, arg7);
}, arguments); }
export function __wbg_readPixels_ba0426af511e8a77() { return handleError(function (arg0, arg1, arg2, arg3, arg4, arg5, arg6, arg7) {
    arg0.readPixels(arg1, arg2, arg3, arg4, arg5 >>> 0, arg6 >>> 0, arg7);
}, arguments); }
export function __wbg_readPixels_c001c684bc183eda() { return handleError(function (arg0, arg1, arg2, arg3, arg4, arg5, arg6, arg7) {
    arg0.readPixels(arg1, arg2, arg3, arg4, arg5 >>> 0, arg6 >>> 0, arg7);
}, arguments); }
export function __wbg_reason_21c585c1cbc2cc8f() { return logError(function (arg0) {
    const ret = arg0.reason;
    return (__wbindgen_enum_GpuDeviceLostReason.indexOf(ret) + 1 || 3) - 1;
}, arguments); }
export function __wbg_renderbufferStorageMultisample_ded5bbc0de39e3df() { return logError(function (arg0, arg1, arg2, arg3, arg4, arg5) {
    arg0.renderbufferStorageMultisample(arg1 >>> 0, arg2, arg3 >>> 0, arg4, arg5);
}, arguments); }
export function __wbg_renderbufferStorage_20bf5140a6a780c8() { return logError(function (arg0, arg1, arg2, arg3, arg4) {
    arg0.renderbufferStorage(arg1 >>> 0, arg2 >>> 0, arg3, arg4);
}, arguments); }
export function __wbg_renderbufferStorage_4f355208808d8f99() { return logError(function (arg0, arg1, arg2, arg3, arg4) {
    arg0.renderbufferStorage(arg1 >>> 0, arg2 >>> 0, arg3, arg4);
}, arguments); }
export function __wbg_requestAdapter_9ff5c9d1ff271165() { return logError(function (arg0, arg1) {
    const ret = arg0.requestAdapter(arg1);
    return ret;
}, arguments); }
export function __wbg_requestAdapter_c46930b8bc33722d() { return logError(function (arg0) {
    const ret = arg0.requestAdapter();
    return ret;
}, arguments); }
export function __wbg_requestDevice_c1c34f88a477e509() { return logError(function (arg0, arg1) {
    const ret = arg0.requestDevice(arg1);
    return ret;
}, arguments); }
export function __wbg_resolveQuerySet_1eef18cd73ebb548() { return logError(function (arg0, arg1, arg2, arg3, arg4, arg5) {
    arg0.resolveQuerySet(arg1, arg2 >>> 0, arg3 >>> 0, arg4, arg5 >>> 0);
}, arguments); }
export function __wbg_resolve_bb4df27803d377b2() { return logError(function (arg0) {
    const ret = Promise.resolve(arg0);
    return ret;
}, arguments); }
export function __wbg_run_d8a6a5f39f2028fa() { return logError(function (arg0, arg1, arg2) {
    try {
        var state0 = {a: arg1, b: arg2};
        var cb0 = () => {
            const a = state0.a;
            state0.a = 0;
            try {
                return wasm_bindgen__convert__closures_____invoke__h849307889a5223c0(a, state0.b, );
            } finally {
                state0.a = a;
            }
        };
        const ret = arg0.run(cb0);
        _assertBoolean(ret);
        return ret;
    } finally {
        state0.a = 0;
    }
}, arguments); }
export function __wbg_samplerParameterf_06875ad911bc519e() { return logError(function (arg0, arg1, arg2, arg3) {
    arg0.samplerParameterf(arg1, arg2 >>> 0, arg3);
}, arguments); }
export function __wbg_samplerParameteri_4af53d9fc7d25a07() { return logError(function (arg0, arg1, arg2, arg3) {
    arg0.samplerParameteri(arg1, arg2 >>> 0, arg3);
}, arguments); }
export function __wbg_scissor_6505f3843445d107() { return logError(function (arg0, arg1, arg2, arg3, arg4) {
    arg0.scissor(arg1, arg2, arg3, arg4);
}, arguments); }
export function __wbg_scissor_8005f47af2354125() { return logError(function (arg0, arg1, arg2, arg3, arg4) {
    arg0.scissor(arg1, arg2, arg3, arg4);
}, arguments); }
export function __wbg_setBindGroup_4ba56e1e0d26f244() { return handleError(function (arg0, arg1, arg2, arg3, arg4, arg5, arg6) {
    arg0.setBindGroup(arg1 >>> 0, arg2, getArrayU32FromWasm0(arg3, arg4), arg5, arg6 >>> 0);
}, arguments); }
export function __wbg_setBindGroup_6124849cc8547086() { return logError(function (arg0, arg1, arg2) {
    arg0.setBindGroup(arg1 >>> 0, arg2);
}, arguments); }
export function __wbg_setBlendConstant_400c9c253b043929() { return handleError(function (arg0, arg1) {
    arg0.setBlendConstant(arg1);
}, arguments); }
export function __wbg_setIndexBuffer_17431786d06c1b7c() { return logError(function (arg0, arg1, arg2, arg3, arg4) {
    arg0.setIndexBuffer(arg1, __wbindgen_enum_GpuIndexFormat[arg2], arg3, arg4);
}, arguments); }
export function __wbg_setIndexBuffer_a16ed5b869c87507() { return logError(function (arg0, arg1, arg2, arg3) {
    arg0.setIndexBuffer(arg1, __wbindgen_enum_GpuIndexFormat[arg2], arg3);
}, arguments); }
export function __wbg_setPipeline_bab24dbce96903b9() { return logError(function (arg0, arg1) {
    arg0.setPipeline(arg1);
}, arguments); }
export function __wbg_setScissorRect_40786fdec122b032() { return logError(function (arg0, arg1, arg2, arg3, arg4) {
    arg0.setScissorRect(arg1 >>> 0, arg2 >>> 0, arg3 >>> 0, arg4 >>> 0);
}, arguments); }
export function __wbg_setStencilReference_f614f80489a0b9b4() { return logError(function (arg0, arg1) {
    arg0.setStencilReference(arg1 >>> 0);
}, arguments); }
export function __wbg_setVertexBuffer_91c4b602d0289943() { return logError(function (arg0, arg1, arg2, arg3) {
    arg0.setVertexBuffer(arg1 >>> 0, arg2, arg3);
}, arguments); }
export function __wbg_setVertexBuffer_b508baf8d0ffe331() { return logError(function (arg0, arg1, arg2, arg3, arg4) {
    arg0.setVertexBuffer(arg1 >>> 0, arg2, arg3, arg4);
}, arguments); }
export function __wbg_setViewport_f9d423db4f4b4b58() { return logError(function (arg0, arg1, arg2, arg3, arg4, arg5, arg6) {
    arg0.setViewport(arg1, arg2, arg3, arg4, arg5, arg6);
}, arguments); }
export function __wbg_set_05b085c909633819() { return handleError(function (arg0, arg1, arg2) {
    const ret = Reflect.set(arg0, arg1, arg2);
    _assertBoolean(ret);
    return ret;
}, arguments); }
export function __wbg_set_311d3efbf4bfd23f() { return logError(function (arg0, arg1, arg2) {
    arg0.set(arg1, arg2 >>> 0);
}, arguments); }
export function __wbg_set_a_5f6e488475272136() { return logError(function (arg0, arg1) {
    arg0.a = arg1;
}, arguments); }
export function __wbg_set_access_091f317905cd76a5() { return logError(function (arg0, arg1) {
    arg0.access = __wbindgen_enum_GpuStorageTextureAccess[arg1];
}, arguments); }
export function __wbg_set_address_mode_u_a37cf1035585c638() { return logError(function (arg0, arg1) {
    arg0.addressModeU = __wbindgen_enum_GpuAddressMode[arg1];
}, arguments); }
export function __wbg_set_address_mode_v_8ac049e029caef76() { return logError(function (arg0, arg1) {
    arg0.addressModeV = __wbindgen_enum_GpuAddressMode[arg1];
}, arguments); }
export function __wbg_set_address_mode_w_eb9260ee11729e92() { return logError(function (arg0, arg1) {
    arg0.addressModeW = __wbindgen_enum_GpuAddressMode[arg1];
}, arguments); }
export function __wbg_set_alpha_aa2e606e9e647b21() { return logError(function (arg0, arg1) {
    arg0.alpha = arg1;
}, arguments); }
export function __wbg_set_alpha_mode_92402195b3ae1ee7() { return logError(function (arg0, arg1) {
    arg0.alphaMode = __wbindgen_enum_GpuCanvasAlphaMode[arg1];
}, arguments); }
export function __wbg_set_alpha_to_coverage_enabled_b4ce9c3f7f8b7ad7() { return logError(function (arg0, arg1) {
    arg0.alphaToCoverageEnabled = arg1 !== 0;
}, arguments); }
export function __wbg_set_array_layer_count_daec613068108a9d() { return logError(function (arg0, arg1) {
    arg0.arrayLayerCount = arg1 >>> 0;
}, arguments); }
export function __wbg_set_array_stride_c2c009eabc18b5f6() { return logError(function (arg0, arg1) {
    arg0.arrayStride = arg1;
}, arguments); }
export function __wbg_set_aspect_77332ac136ee94eb() { return logError(function (arg0, arg1) {
    arg0.aspect = __wbindgen_enum_GpuTextureAspect[arg1];
}, arguments); }
export function __wbg_set_aspect_9ea7cc5843075321() { return logError(function (arg0, arg1) {
    arg0.aspect = __wbindgen_enum_GpuTextureAspect[arg1];
}, arguments); }
export function __wbg_set_aspect_a823a14d00d42d37() { return logError(function (arg0, arg1) {
    arg0.aspect = __wbindgen_enum_GpuTextureAspect[arg1];
}, arguments); }
export function __wbg_set_attributes_05f9117fd32ca606() { return logError(function (arg0, arg1) {
    arg0.attributes = arg1;
}, arguments); }
export function __wbg_set_b_688365d692bba214() { return logError(function (arg0, arg1) {
    arg0.b = arg1;
}, arguments); }
export function __wbg_set_base_array_layer_cc6c68d233489c4b() { return logError(function (arg0, arg1) {
    arg0.baseArrayLayer = arg1 >>> 0;
}, arguments); }
export function __wbg_set_base_mip_level_e07a3efe9006d5ea() { return logError(function (arg0, arg1) {
    arg0.baseMipLevel = arg1 >>> 0;
}, arguments); }
export function __wbg_set_beginning_of_pass_write_index_27be5b0b35ec3de0() { return logError(function (arg0, arg1) {
    arg0.beginningOfPassWriteIndex = arg1 >>> 0;
}, arguments); }
export function __wbg_set_beginning_of_pass_write_index_c12e7856ee670800() { return logError(function (arg0, arg1) {
    arg0.beginningOfPassWriteIndex = arg1 >>> 0;
}, arguments); }
export function __wbg_set_bind_group_layouts_5325d038771af328() { return logError(function (arg0, arg1) {
    arg0.bindGroupLayouts = arg1;
}, arguments); }
export function __wbg_set_binding_b6b0fe5c281b8c69() { return logError(function (arg0, arg1) {
    arg0.binding = arg1 >>> 0;
}, arguments); }
export function __wbg_set_binding_f3c188a8cd21455b() { return logError(function (arg0, arg1) {
    arg0.binding = arg1 >>> 0;
}, arguments); }
export function __wbg_set_blend_8d6e9c08b5702a09() { return logError(function (arg0, arg1) {
    arg0.blend = arg1;
}, arguments); }
export function __wbg_set_buffer_55f096330c8912b4() { return logError(function (arg0, arg1) {
    arg0.buffer = arg1;
}, arguments); }
export function __wbg_set_buffer_aa7bf4ad8f17b2bd() { return logError(function (arg0, arg1) {
    arg0.buffer = arg1;
}, arguments); }
export function __wbg_set_buffer_e89095a9f0cafad3() { return logError(function (arg0, arg1) {
    arg0.buffer = arg1;
}, arguments); }
export function __wbg_set_buffers_85a7238f4ef28ab4() { return logError(function (arg0, arg1) {
    arg0.buffers = arg1;
}, arguments); }
export function __wbg_set_bytes_per_row_68a1ea90d4710bc9() { return logError(function (arg0, arg1) {
    arg0.bytesPerRow = arg1 >>> 0;
}, arguments); }
export function __wbg_set_bytes_per_row_91681ca78d744888() { return logError(function (arg0, arg1) {
    arg0.bytesPerRow = arg1 >>> 0;
}, arguments); }
export function __wbg_set_clear_value_642701f928a5ccb3() { return logError(function (arg0, arg1) {
    arg0.clearValue = arg1;
}, arguments); }
export function __wbg_set_code_56e2d45ec1ff6c2d() { return logError(function (arg0, arg1, arg2) {
    arg0.code = getStringFromWasm0(arg1, arg2);
}, arguments); }
export function __wbg_set_color_attachments_abe67f6631926e28() { return logError(function (arg0, arg1) {
    arg0.colorAttachments = arg1;
}, arguments); }
export function __wbg_set_color_bc393d7efc3c8594() { return logError(function (arg0, arg1) {
    arg0.color = arg1;
}, arguments); }
export function __wbg_set_color_formats_239bac9e2221f4e1() { return logError(function (arg0, arg1) {
    arg0.colorFormats = arg1;
}, arguments); }
export function __wbg_set_compare_1509dc1a5420943f() { return logError(function (arg0, arg1) {
    arg0.compare = __wbindgen_enum_GpuCompareFunction[arg1];
}, arguments); }
export function __wbg_set_compare_42211fbf15e3b850() { return logError(function (arg0, arg1) {
    arg0.compare = __wbindgen_enum_GpuCompareFunction[arg1];
}, arguments); }
export function __wbg_set_compute_5a859e405c9eb6c6() { return logError(function (arg0, arg1) {
    arg0.compute = arg1;
}, arguments); }
export function __wbg_set_count_26a934d1cd07d080() { return logError(function (arg0, arg1) {
    arg0.count = arg1 >>> 0;
}, arguments); }
export function __wbg_set_count_f261876d1bb59b88() { return logError(function (arg0, arg1) {
    arg0.count = arg1 >>> 0;
}, arguments); }
export function __wbg_set_cull_mode_9d466c1ab414cac8() { return logError(function (arg0, arg1) {
    arg0.cullMode = __wbindgen_enum_GpuCullMode[arg1];
}, arguments); }
export function __wbg_set_depth_bias_428c9340b0fd937b() { return logError(function (arg0, arg1) {
    arg0.depthBias = arg1;
}, arguments); }
export function __wbg_set_depth_bias_clamp_f009599ca67fa30c() { return logError(function (arg0, arg1) {
    arg0.depthBiasClamp = arg1;
}, arguments); }
export function __wbg_set_depth_bias_slope_scale_7125880b4cb7a951() { return logError(function (arg0, arg1) {
    arg0.depthBiasSlopeScale = arg1;
}, arguments); }
export function __wbg_set_depth_clear_value_442bf492734f63b6() { return logError(function (arg0, arg1) {
    arg0.depthClearValue = arg1;
}, arguments); }
export function __wbg_set_depth_compare_30e9ea552da12fe2() { return logError(function (arg0, arg1) {
    arg0.depthCompare = __wbindgen_enum_GpuCompareFunction[arg1];
}, arguments); }
export function __wbg_set_depth_fail_op_5e42dc3e4c382951() { return logError(function (arg0, arg1) {
    arg0.depthFailOp = __wbindgen_enum_GpuStencilOperation[arg1];
}, arguments); }
export function __wbg_set_depth_load_op_34d430b74bb36d91() { return logError(function (arg0, arg1) {
    arg0.depthLoadOp = __wbindgen_enum_GpuLoadOp[arg1];
}, arguments); }
export function __wbg_set_depth_or_array_layers_4bbbeadacb393f02() { return logError(function (arg0, arg1) {
    arg0.depthOrArrayLayers = arg1 >>> 0;
}, arguments); }
export function __wbg_set_depth_read_only_138a11b10c731094() { return logError(function (arg0, arg1) {
    arg0.depthReadOnly = arg1 !== 0;
}, arguments); }
export function __wbg_set_depth_read_only_95b1b7ed81cae390() { return logError(function (arg0, arg1) {
    arg0.depthReadOnly = arg1 !== 0;
}, arguments); }
export function __wbg_set_depth_stencil_1bd50dbc450c8650() { return logError(function (arg0, arg1) {
    arg0.depthStencil = arg1;
}, arguments); }
export function __wbg_set_depth_stencil_attachment_1ee0d93bc3273369() { return logError(function (arg0, arg1) {
    arg0.depthStencilAttachment = arg1;
}, arguments); }
export function __wbg_set_depth_stencil_format_d4f66e8e468e9d8c() { return logError(function (arg0, arg1) {
    arg0.depthStencilFormat = __wbindgen_enum_GpuTextureFormat[arg1];
}, arguments); }
export function __wbg_set_depth_store_op_0ea0a215313dbda7() { return logError(function (arg0, arg1) {
    arg0.depthStoreOp = __wbindgen_enum_GpuStoreOp[arg1];
}, arguments); }
export function __wbg_set_depth_write_enabled_64c2e7f6fa4b6b7b() { return logError(function (arg0, arg1) {
    arg0.depthWriteEnabled = arg1 !== 0;
}, arguments); }
export function __wbg_set_device_0d774b66e7288f72() { return logError(function (arg0, arg1) {
    arg0.device = arg1;
}, arguments); }
export function __wbg_set_dimension_174ad7e2fb67fb4e() { return logError(function (arg0, arg1) {
    arg0.dimension = __wbindgen_enum_GpuTextureViewDimension[arg1];
}, arguments); }
export function __wbg_set_dimension_36e13ccecae5af4b() { return logError(function (arg0, arg1) {
    arg0.dimension = __wbindgen_enum_GpuTextureDimension[arg1];
}, arguments); }
export function __wbg_set_dst_factor_1ed75271a89a711e() { return logError(function (arg0, arg1) {
    arg0.dstFactor = __wbindgen_enum_GpuBlendFactor[arg1];
}, arguments); }
export function __wbg_set_end_of_pass_write_index_e8f52fc08bc0603e() { return logError(function (arg0, arg1) {
    arg0.endOfPassWriteIndex = arg1 >>> 0;
}, arguments); }
export function __wbg_set_end_of_pass_write_index_f4ab90c5743df805() { return logError(function (arg0, arg1) {
    arg0.endOfPassWriteIndex = arg1 >>> 0;
}, arguments); }
export function __wbg_set_entries_3017e6132f938c6e() { return logError(function (arg0, arg1) {
    arg0.entries = arg1;
}, arguments); }
export function __wbg_set_entries_fc76ca4d7da6a709() { return logError(function (arg0, arg1) {
    arg0.entries = arg1;
}, arguments); }
export function __wbg_set_entry_point_4443daff87d82ef1() { return logError(function (arg0, arg1, arg2) {
    arg0.entryPoint = getStringFromWasm0(arg1, arg2);
}, arguments); }
export function __wbg_set_entry_point_6fec5723cc790927() { return logError(function (arg0, arg1, arg2) {
    arg0.entryPoint = getStringFromWasm0(arg1, arg2);
}, arguments); }
export function __wbg_set_entry_point_8db3b6d103e3b865() { return logError(function (arg0, arg1, arg2) {
    arg0.entryPoint = getStringFromWasm0(arg1, arg2);
}, arguments); }
export function __wbg_set_external_texture_825fe2bc7a0c0603() { return logError(function (arg0, arg1) {
    arg0.externalTexture = arg1;
}, arguments); }
export function __wbg_set_fail_op_77ab26c98f847b65() { return logError(function (arg0, arg1) {
    arg0.failOp = __wbindgen_enum_GpuStencilOperation[arg1];
}, arguments); }
export function __wbg_set_flip_y_7e37e283463dd527() { return logError(function (arg0, arg1) {
    arg0.flipY = arg1 !== 0;
}, arguments); }
export function __wbg_set_format_1786adb7bc74c7c9() { return logError(function (arg0, arg1) {
    arg0.format = __wbindgen_enum_GpuTextureFormat[arg1];
}, arguments); }
export function __wbg_set_format_6606f5c1fba6f459() { return logError(function (arg0, arg1) {
    arg0.format = __wbindgen_enum_GpuVertexFormat[arg1];
}, arguments); }
export function __wbg_set_format_90860b0321868db4() { return logError(function (arg0, arg1) {
    arg0.format = __wbindgen_enum_GpuTextureFormat[arg1];
}, arguments); }
export function __wbg_set_format_abf7a1bc5425c56a() { return logError(function (arg0, arg1) {
    arg0.format = __wbindgen_enum_GpuTextureFormat[arg1];
}, arguments); }
export function __wbg_set_format_d347899cd860709c() { return logError(function (arg0, arg1) {
    arg0.format = __wbindgen_enum_GpuTextureFormat[arg1];
}, arguments); }
export function __wbg_set_format_e9d4b1475bb3bd3b() { return logError(function (arg0, arg1) {
    arg0.format = __wbindgen_enum_GpuTextureFormat[arg1];
}, arguments); }
export function __wbg_set_format_f9341112e43ea182() { return logError(function (arg0, arg1) {
    arg0.format = __wbindgen_enum_GpuTextureFormat[arg1];
}, arguments); }
export function __wbg_set_fragment_1a595620425637e1() { return logError(function (arg0, arg1) {
    arg0.fragment = arg1;
}, arguments); }
export function __wbg_set_front_face_50cdf4eb61504a46() { return logError(function (arg0, arg1) {
    arg0.frontFace = __wbindgen_enum_GpuFrontFace[arg1];
}, arguments); }
export function __wbg_set_g_d4d1d77cf8fdd362() { return logError(function (arg0, arg1) {
    arg0.g = arg1;
}, arguments); }
export function __wbg_set_has_dynamic_offset_7d30014fdbfe90c5() { return logError(function (arg0, arg1) {
    arg0.hasDynamicOffset = arg1 !== 0;
}, arguments); }
export function __wbg_set_height_2a52d80e749439c5() { return logError(function (arg0, arg1) {
    arg0.height = arg1 >>> 0;
}, arguments); }
export function __wbg_set_height_9a5b963336a79877() { return logError(function (arg0, arg1) {
    arg0.height = arg1 >>> 0;
}, arguments); }
export function __wbg_set_height_e8b5483b8c117d5e() { return logError(function (arg0, arg1) {
    arg0.height = arg1 >>> 0;
}, arguments); }
export function __wbg_set_label_03d2396d4655a3e1() { return logError(function (arg0, arg1, arg2) {
    arg0.label = getStringFromWasm0(arg1, arg2);
}, arguments); }
export function __wbg_set_label_0c1bd0e976cf0a9a() { return logError(function (arg0, arg1, arg2) {
    arg0.label = getStringFromWasm0(arg1, arg2);
}, arguments); }
export function __wbg_set_label_1175a3329a06e52b() { return logError(function (arg0, arg1, arg2) {
    arg0.label = getStringFromWasm0(arg1, arg2);
}, arguments); }
export function __wbg_set_label_2d2227f4d5991e50() { return logError(function (arg0, arg1, arg2) {
    arg0.label = getStringFromWasm0(arg1, arg2);
}, arguments); }
export function __wbg_set_label_2f592bd1be3db6b3() { return logError(function (arg0, arg1, arg2) {
    arg0.label = getStringFromWasm0(arg1, arg2);
}, arguments); }
export function __wbg_set_label_44c8df98c1f1e811() { return logError(function (arg0, arg1, arg2) {
    arg0.label = getStringFromWasm0(arg1, arg2);
}, arguments); }
export function __wbg_set_label_4a1dd4244f80abc9() { return logError(function (arg0, arg1, arg2) {
    arg0.label = getStringFromWasm0(arg1, arg2);
}, arguments); }
export function __wbg_set_label_8b0da33fd11b2572() { return logError(function (arg0, arg1, arg2) {
    arg0.label = getStringFromWasm0(arg1, arg2);
}, arguments); }
export function __wbg_set_label_8fd860a36d2c7b74() { return logError(function (arg0, arg1, arg2) {
    arg0.label = getStringFromWasm0(arg1, arg2);
}, arguments); }
export function __wbg_set_label_bae57fb9f24fde5c() { return logError(function (arg0, arg1, arg2) {
    arg0.label = getStringFromWasm0(arg1, arg2);
}, arguments); }
export function __wbg_set_label_be45aed56e4b9fee() { return logError(function (arg0, arg1, arg2) {
    arg0.label = getStringFromWasm0(arg1, arg2);
}, arguments); }
export function __wbg_set_label_c47c451211e2f6d2() { return logError(function (arg0, arg1, arg2) {
    arg0.label = getStringFromWasm0(arg1, arg2);
}, arguments); }
export function __wbg_set_label_cd567b7b35838e4c() { return logError(function (arg0, arg1, arg2) {
    arg0.label = getStringFromWasm0(arg1, arg2);
}, arguments); }
export function __wbg_set_label_d1c24b5a7a3ac31d() { return logError(function (arg0, arg1, arg2) {
    arg0.label = getStringFromWasm0(arg1, arg2);
}, arguments); }
export function __wbg_set_label_da96d497ad3f53e7() { return logError(function (arg0, arg1, arg2) {
    arg0.label = getStringFromWasm0(arg1, arg2);
}, arguments); }
export function __wbg_set_label_dcd98efbb9370da8() { return logError(function (arg0, arg1, arg2) {
    arg0.label = getStringFromWasm0(arg1, arg2);
}, arguments); }
export function __wbg_set_label_f92ae11c77d74198() { return logError(function (arg0, arg1, arg2) {
    arg0.label = getStringFromWasm0(arg1, arg2);
}, arguments); }
export function __wbg_set_layout_19e558a0fa724e95() { return logError(function (arg0, arg1) {
    arg0.layout = arg1;
}, arguments); }
export function __wbg_set_layout_7c5ba5bdcde8a0f0() { return logError(function (arg0, arg1) {
    arg0.layout = arg1;
}, arguments); }
export function __wbg_set_layout_eeef59714f5bf48b() { return logError(function (arg0, arg1) {
    arg0.layout = arg1;
}, arguments); }
export function __wbg_set_load_op_56844f51434037bf() { return logError(function (arg0, arg1) {
    arg0.loadOp = __wbindgen_enum_GpuLoadOp[arg1];
}, arguments); }
export function __wbg_set_lod_max_clamp_3f157633f32c9f94() { return logError(function (arg0, arg1) {
    arg0.lodMaxClamp = arg1;
}, arguments); }
export function __wbg_set_lod_min_clamp_7e246c739fb1a854() { return logError(function (arg0, arg1) {
    arg0.lodMinClamp = arg1;
}, arguments); }
export function __wbg_set_mag_filter_69d846b974d4bcc0() { return logError(function (arg0, arg1) {
    arg0.magFilter = __wbindgen_enum_GpuFilterMode[arg1];
}, arguments); }
export function __wbg_set_mapped_at_creation_48de4735fab51e78() { return logError(function (arg0, arg1) {
    arg0.mappedAtCreation = arg1 !== 0;
}, arguments); }
export function __wbg_set_mask_0c49a66362fc0079() { return logError(function (arg0, arg1) {
    arg0.mask = arg1 >>> 0;
}, arguments); }
export function __wbg_set_max_anisotropy_3ef0d5bca2336cc7() { return logError(function (arg0, arg1) {
    arg0.maxAnisotropy = arg1;
}, arguments); }
export function __wbg_set_min_binding_size_689661b9ed25e083() { return logError(function (arg0, arg1) {
    arg0.minBindingSize = arg1;
}, arguments); }
export function __wbg_set_min_filter_fbf2d8d9f503dcd7() { return logError(function (arg0, arg1) {
    arg0.minFilter = __wbindgen_enum_GpuFilterMode[arg1];
}, arguments); }
export function __wbg_set_mip_level_246db61be15bdd69() { return logError(function (arg0, arg1) {
    arg0.mipLevel = arg1 >>> 0;
}, arguments); }
export function __wbg_set_mip_level_count_72f8bc1f80f7539b() { return logError(function (arg0, arg1) {
    arg0.mipLevelCount = arg1 >>> 0;
}, arguments); }
export function __wbg_set_mip_level_count_b19a0d9192e62d5d() { return logError(function (arg0, arg1) {
    arg0.mipLevelCount = arg1 >>> 0;
}, arguments); }
export function __wbg_set_mip_level_d480a4a8dc18e56b() { return logError(function (arg0, arg1) {
    arg0.mipLevel = arg1 >>> 0;
}, arguments); }
export function __wbg_set_mipmap_filter_17fd50a3898fd5ff() { return logError(function (arg0, arg1) {
    arg0.mipmapFilter = __wbindgen_enum_GpuMipmapFilterMode[arg1];
}, arguments); }
export function __wbg_set_module_08ad08e736d8edbf() { return logError(function (arg0, arg1) {
    arg0.module = arg1;
}, arguments); }
export function __wbg_set_module_14e471fdd94c582d() { return logError(function (arg0, arg1) {
    arg0.module = arg1;
}, arguments); }
export function __wbg_set_module_9b938909233aed50() { return logError(function (arg0, arg1) {
    arg0.module = arg1;
}, arguments); }
export function __wbg_set_multisample_85f073947b782d07() { return logError(function (arg0, arg1) {
    arg0.multisample = arg1;
}, arguments); }
export function __wbg_set_multisampled_40505c1381e1c32c() { return logError(function (arg0, arg1) {
    arg0.multisampled = arg1 !== 0;
}, arguments); }
export function __wbg_set_offset_2c374e604504e0b2() { return logError(function (arg0, arg1) {
    arg0.offset = arg1;
}, arguments); }
export function __wbg_set_offset_73156b0e0b41d79a() { return logError(function (arg0, arg1) {
    arg0.offset = arg1;
}, arguments); }
export function __wbg_set_offset_8d9d9afffa18b591() { return logError(function (arg0, arg1) {
    arg0.offset = arg1;
}, arguments); }
export function __wbg_set_offset_a097a8050a3a9a33() { return logError(function (arg0, arg1) {
    arg0.offset = arg1;
}, arguments); }
export function __wbg_set_onuncapturederror_b9a9ff2c881b2b40() { return logError(function (arg0, arg1) {
    arg0.onuncapturederror = arg1;
}, arguments); }
export function __wbg_set_operation_b5862f5a1a143b30() { return logError(function (arg0, arg1) {
    arg0.operation = __wbindgen_enum_GpuBlendOperation[arg1];
}, arguments); }
export function __wbg_set_origin_9b3b0fbe0a5dc469() { return logError(function (arg0, arg1) {
    arg0.origin = arg1;
}, arguments); }
export function __wbg_set_origin_ad4c6de06be29313() { return logError(function (arg0, arg1) {
    arg0.origin = arg1;
}, arguments); }
export function __wbg_set_origin_cfbb67a96c9ce9cc() { return logError(function (arg0, arg1) {
    arg0.origin = arg1;
}, arguments); }
export function __wbg_set_pass_op_e9470d1262fb8a8b() { return logError(function (arg0, arg1) {
    arg0.passOp = __wbindgen_enum_GpuStencilOperation[arg1];
}, arguments); }
export function __wbg_set_power_preference_c0d3fa7ce46b1a2e() { return logError(function (arg0, arg1) {
    arg0.powerPreference = __wbindgen_enum_GpuPowerPreference[arg1];
}, arguments); }
export function __wbg_set_premultiplied_alpha_3ed1568015a154c7() { return logError(function (arg0, arg1) {
    arg0.premultipliedAlpha = arg1 !== 0;
}, arguments); }
export function __wbg_set_primitive_369241acd17871f1() { return logError(function (arg0, arg1) {
    arg0.primitive = arg1;
}, arguments); }
export function __wbg_set_query_set_18679a8580267d5a() { return logError(function (arg0, arg1) {
    arg0.querySet = arg1;
}, arguments); }
export function __wbg_set_query_set_f1314b06c84c4b00() { return logError(function (arg0, arg1) {
    arg0.querySet = arg1;
}, arguments); }
export function __wbg_set_r_527e5a41c4b1a846() { return logError(function (arg0, arg1) {
    arg0.r = arg1;
}, arguments); }
export function __wbg_set_required_features_54918de8185c5fab() { return logError(function (arg0, arg1) {
    arg0.requiredFeatures = arg1;
}, arguments); }
export function __wbg_set_required_limits_3b031f66f838f4e3() { return logError(function (arg0, arg1) {
    arg0.requiredLimits = arg1;
}, arguments); }
export function __wbg_set_resolve_target_fe76b3f99cf72078() { return logError(function (arg0, arg1) {
    arg0.resolveTarget = arg1;
}, arguments); }
export function __wbg_set_resource_fe385d2e3dadaf63() { return logError(function (arg0, arg1) {
    arg0.resource = arg1;
}, arguments); }
export function __wbg_set_rows_per_image_d198b7e73a38978b() { return logError(function (arg0, arg1) {
    arg0.rowsPerImage = arg1 >>> 0;
}, arguments); }
export function __wbg_set_rows_per_image_f9878f4b10f4fd7f() { return logError(function (arg0, arg1) {
    arg0.rowsPerImage = arg1 >>> 0;
}, arguments); }
export function __wbg_set_sample_count_865e1d19b84e27e6() { return logError(function (arg0, arg1) {
    arg0.sampleCount = arg1 >>> 0;
}, arguments); }
export function __wbg_set_sample_count_9f819993f95ad2c9() { return logError(function (arg0, arg1) {
    arg0.sampleCount = arg1 >>> 0;
}, arguments); }
export function __wbg_set_sample_type_7088b1efddce6a69() { return logError(function (arg0, arg1) {
    arg0.sampleType = __wbindgen_enum_GpuTextureSampleType[arg1];
}, arguments); }
export function __wbg_set_sampler_8c5d7fb1b02058c6() { return logError(function (arg0, arg1) {
    arg0.sampler = arg1;
}, arguments); }
export function __wbg_set_shader_location_0ff30a733291a396() { return logError(function (arg0, arg1) {
    arg0.shaderLocation = arg1 >>> 0;
}, arguments); }
export function __wbg_set_size_1e6281b07cd39177() { return logError(function (arg0, arg1) {
    arg0.size = arg1;
}, arguments); }
export function __wbg_set_size_41cd9255ca1e4242() { return logError(function (arg0, arg1) {
    arg0.size = arg1;
}, arguments); }
export function __wbg_set_size_a61ff22205255d61() { return logError(function (arg0, arg1) {
    arg0.size = arg1;
}, arguments); }
export function __wbg_set_source_6e0a2e56f523024f() { return logError(function (arg0, arg1) {
    arg0.source = arg1;
}, arguments); }
export function __wbg_set_src_factor_1c4f755f8676df1b() { return logError(function (arg0, arg1) {
    arg0.srcFactor = __wbindgen_enum_GpuBlendFactor[arg1];
}, arguments); }
export function __wbg_set_stencil_back_6ef4683123b19b25() { return logError(function (arg0, arg1) {
    arg0.stencilBack = arg1;
}, arguments); }
export function __wbg_set_stencil_clear_value_10b58f674d0177c2() { return logError(function (arg0, arg1) {
    arg0.stencilClearValue = arg1 >>> 0;
}, arguments); }
export function __wbg_set_stencil_front_aeb8580a97e5424b() { return logError(function (arg0, arg1) {
    arg0.stencilFront = arg1;
}, arguments); }
export function __wbg_set_stencil_load_op_f20a90a66acd3d8c() { return logError(function (arg0, arg1) {
    arg0.stencilLoadOp = __wbindgen_enum_GpuLoadOp[arg1];
}, arguments); }
export function __wbg_set_stencil_read_mask_2954f260d47349ea() { return logError(function (arg0, arg1) {
    arg0.stencilReadMask = arg1 >>> 0;
}, arguments); }
export function __wbg_set_stencil_read_only_b8a209436979e19f() { return logError(function (arg0, arg1) {
    arg0.stencilReadOnly = arg1 !== 0;
}, arguments); }
export function __wbg_set_stencil_read_only_fb489d191b6d969b() { return logError(function (arg0, arg1) {
    arg0.stencilReadOnly = arg1 !== 0;
}, arguments); }
export function __wbg_set_stencil_store_op_477c4cf6422dfa3f() { return logError(function (arg0, arg1) {
    arg0.stencilStoreOp = __wbindgen_enum_GpuStoreOp[arg1];
}, arguments); }
export function __wbg_set_stencil_write_mask_3f8e9b3781814a95() { return logError(function (arg0, arg1) {
    arg0.stencilWriteMask = arg1 >>> 0;
}, arguments); }
export function __wbg_set_step_mode_a35aef328761c452() { return logError(function (arg0, arg1) {
    arg0.stepMode = __wbindgen_enum_GpuVertexStepMode[arg1];
}, arguments); }
export function __wbg_set_storage_texture_ab9eed9786337ef0() { return logError(function (arg0, arg1) {
    arg0.storageTexture = arg1;
}, arguments); }
export function __wbg_set_store_op_caeede4654b3d847() { return logError(function (arg0, arg1) {
    arg0.storeOp = __wbindgen_enum_GpuStoreOp[arg1];
}, arguments); }
export function __wbg_set_strip_index_format_0cd0510e166c4ec4() { return logError(function (arg0, arg1) {
    arg0.stripIndexFormat = __wbindgen_enum_GpuIndexFormat[arg1];
}, arguments); }
export function __wbg_set_targets_6b0b3bdd87f35668() { return logError(function (arg0, arg1) {
    arg0.targets = arg1;
}, arguments); }
export function __wbg_set_texture_16d2be474ce6ad0c() { return logError(function (arg0, arg1) {
    arg0.texture = arg1;
}, arguments); }
export function __wbg_set_texture_e25a73da75cf5808() { return logError(function (arg0, arg1) {
    arg0.texture = arg1;
}, arguments); }
export function __wbg_set_texture_f5131fc886cc9ce6() { return logError(function (arg0, arg1) {
    arg0.texture = arg1;
}, arguments); }
export function __wbg_set_timestamp_writes_26336a2ad72cdcaf() { return logError(function (arg0, arg1) {
    arg0.timestampWrites = arg1;
}, arguments); }
export function __wbg_set_timestamp_writes_c552d52fbb417005() { return logError(function (arg0, arg1) {
    arg0.timestampWrites = arg1;
}, arguments); }
export function __wbg_set_topology_beefb3aca0612b00() { return logError(function (arg0, arg1) {
    arg0.topology = __wbindgen_enum_GpuPrimitiveTopology[arg1];
}, arguments); }
export function __wbg_set_type_38961e08504ca674() { return logError(function (arg0, arg1) {
    arg0.type = __wbindgen_enum_GpuBufferBindingType[arg1];
}, arguments); }
export function __wbg_set_type_c1eebc19f8a6aeb9() { return logError(function (arg0, arg1) {
    arg0.type = __wbindgen_enum_GpuSamplerBindingType[arg1];
}, arguments); }
export function __wbg_set_type_f062717b30496eff() { return logError(function (arg0, arg1) {
    arg0.type = __wbindgen_enum_GpuQueryType[arg1];
}, arguments); }
export function __wbg_set_unclipped_depth_5a4f7eb57fe006b2() { return logError(function (arg0, arg1) {
    arg0.unclippedDepth = arg1 !== 0;
}, arguments); }
export function __wbg_set_usage_7f0dda8309469b1c() { return logError(function (arg0, arg1) {
    arg0.usage = arg1 >>> 0;
}, arguments); }
export function __wbg_set_usage_7fa9cd18d1104aca() { return logError(function (arg0, arg1) {
    arg0.usage = arg1 >>> 0;
}, arguments); }
export function __wbg_set_usage_908213a4d4bb8bde() { return logError(function (arg0, arg1) {
    arg0.usage = arg1 >>> 0;
}, arguments); }
export function __wbg_set_usage_ae014e77ff77ce06() { return logError(function (arg0, arg1) {
    arg0.usage = arg1 >>> 0;
}, arguments); }
export function __wbg_set_vertex_a4951dd9a7a4ed54() { return logError(function (arg0, arg1) {
    arg0.vertex = arg1;
}, arguments); }
export function __wbg_set_view_bdeab150b5f0768c() { return logError(function (arg0, arg1) {
    arg0.view = arg1;
}, arguments); }
export function __wbg_set_view_dbd0294573f64d05() { return logError(function (arg0, arg1) {
    arg0.view = arg1;
}, arguments); }
export function __wbg_set_view_dimension_263387976511ebc9() { return logError(function (arg0, arg1) {
    arg0.viewDimension = __wbindgen_enum_GpuTextureViewDimension[arg1];
}, arguments); }
export function __wbg_set_view_dimension_3ed01b237e85826f() { return logError(function (arg0, arg1) {
    arg0.viewDimension = __wbindgen_enum_GpuTextureViewDimension[arg1];
}, arguments); }
export function __wbg_set_view_formats_bab284fc81b40e70() { return logError(function (arg0, arg1) {
    arg0.viewFormats = arg1;
}, arguments); }
export function __wbg_set_view_formats_fe531a043efb71fa() { return logError(function (arg0, arg1) {
    arg0.viewFormats = arg1;
}, arguments); }
export function __wbg_set_visibility_1bca121a89accba5() { return logError(function (arg0, arg1) {
    arg0.visibility = arg1 >>> 0;
}, arguments); }
export function __wbg_set_width_1a5e2e86fa5bdcd8() { return logError(function (arg0, arg1) {
    arg0.width = arg1 >>> 0;
}, arguments); }
export function __wbg_set_width_913f2db354db9600() { return logError(function (arg0, arg1) {
    arg0.width = arg1 >>> 0;
}, arguments); }
export function __wbg_set_width_d8263652df911d1d() { return logError(function (arg0, arg1) {
    arg0.width = arg1 >>> 0;
}, arguments); }
export function __wbg_set_write_mask_144b25e2bd909124() { return logError(function (arg0, arg1) {
    arg0.writeMask = arg1 >>> 0;
}, arguments); }
export function __wbg_set_x_56f0c2c08a62725c() { return logError(function (arg0, arg1) {
    arg0.x = arg1 >>> 0;
}, arguments); }
export function __wbg_set_x_7f1ce8377ea914e5() { return logError(function (arg0, arg1) {
    arg0.x = arg1 >>> 0;
}, arguments); }
export function __wbg_set_y_04fb8ce84735b4e1() { return logError(function (arg0, arg1) {
    arg0.y = arg1 >>> 0;
}, arguments); }
export function __wbg_set_y_09965fd0dd252fb5() { return logError(function (arg0, arg1) {
    arg0.y = arg1 >>> 0;
}, arguments); }
export function __wbg_set_z_a51316db27a4941e() { return logError(function (arg0, arg1) {
    arg0.z = arg1 >>> 0;
}, arguments); }
export function __wbg_shaderSource_0a7551b1ac04be73() { return logError(function (arg0, arg1, arg2, arg3) {
    arg0.shaderSource(arg1, getStringFromWasm0(arg2, arg3));
}, arguments); }
export function __wbg_shaderSource_20cc64d9735c296d() { return logError(function (arg0, arg1, arg2, arg3) {
    arg0.shaderSource(arg1, getStringFromWasm0(arg2, arg3));
}, arguments); }
export function __wbg_size_1356eae711a92515() { return logError(function (arg0) {
    const ret = arg0.size;
    return ret;
}, arguments); }
export function __wbg_stack_3b0d974bbf31e44f() { return logError(function (arg0, arg1) {
    const ret = arg1.stack;
    const ptr1 = passStringToWasm0(ret, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
    const len1 = WASM_VECTOR_LEN;
    getDataViewMemory0().setInt32(arg0 + 4 * 1, len1, true);
    getDataViewMemory0().setInt32(arg0 + 4 * 0, ptr1, true);
}, arguments); }
export function __wbg_static_accessor_GLOBAL_44bef9fa6011e260() { return logError(function () {
    const ret = typeof global === 'undefined' ? null : global;
    return isLikeNone(ret) ? 0 : addToExternrefTable0(ret);
}, arguments); }
export function __wbg_static_accessor_GLOBAL_THIS_13002645baf43d84() { return logError(function () {
    const ret = typeof globalThis === 'undefined' ? null : globalThis;
    return isLikeNone(ret) ? 0 : addToExternrefTable0(ret);
}, arguments); }
export function __wbg_static_accessor_SELF_91d0abd4d035416c() { return logError(function () {
    const ret = typeof self === 'undefined' ? null : self;
    return isLikeNone(ret) ? 0 : addToExternrefTable0(ret);
}, arguments); }
export function __wbg_static_accessor_WINDOW_513f857c65724fc7() { return logError(function () {
    const ret = typeof window === 'undefined' ? null : window;
    return isLikeNone(ret) ? 0 : addToExternrefTable0(ret);
}, arguments); }
export function __wbg_stencilFuncSeparate_a5aa44ea4cd6e6ba() { return logError(function (arg0, arg1, arg2, arg3, arg4) {
    arg0.stencilFuncSeparate(arg1 >>> 0, arg2 >>> 0, arg3, arg4 >>> 0);
}, arguments); }
export function __wbg_stencilFuncSeparate_cd1e7d14d8dd596e() { return logError(function (arg0, arg1, arg2, arg3, arg4) {
    arg0.stencilFuncSeparate(arg1 >>> 0, arg2 >>> 0, arg3, arg4 >>> 0);
}, arguments); }
export function __wbg_stencilMaskSeparate_cf1c2440e82312dd() { return logError(function (arg0, arg1, arg2) {
    arg0.stencilMaskSeparate(arg1 >>> 0, arg2 >>> 0);
}, arguments); }
export function __wbg_stencilMaskSeparate_d2e3112d57a20f9c() { return logError(function (arg0, arg1, arg2) {
    arg0.stencilMaskSeparate(arg1 >>> 0, arg2 >>> 0);
}, arguments); }
export function __wbg_stencilMask_45135bee9873f8e2() { return logError(function (arg0, arg1) {
    arg0.stencilMask(arg1 >>> 0);
}, arguments); }
export function __wbg_stencilMask_a4e7a1a4b471aae5() { return logError(function (arg0, arg1) {
    arg0.stencilMask(arg1 >>> 0);
}, arguments); }
export function __wbg_stencilOpSeparate_32ee0d9adb3e45e6() { return logError(function (arg0, arg1, arg2, arg3, arg4) {
    arg0.stencilOpSeparate(arg1 >>> 0, arg2 >>> 0, arg3 >>> 0, arg4 >>> 0);
}, arguments); }
export function __wbg_stencilOpSeparate_654ae73b54c22938() { return logError(function (arg0, arg1, arg2, arg3, arg4) {
    arg0.stencilOpSeparate(arg1 >>> 0, arg2 >>> 0, arg3 >>> 0, arg4 >>> 0);
}, arguments); }
export function __wbg_submit_1290d44bb76ecef4() { return logError(function (arg0, arg1) {
    arg0.submit(arg1);
}, arguments); }
export function __wbg_texImage2D_795f9dff0fd9f8fe() { return handleError(function (arg0, arg1, arg2, arg3, arg4, arg5, arg6, arg7, arg8, arg9) {
    arg0.texImage2D(arg1 >>> 0, arg2, arg3, arg4, arg5, arg6, arg7 >>> 0, arg8 >>> 0, arg9);
}, arguments); }
export function __wbg_texImage2D_88a8191aa5c3d7bb() { return handleError(function (arg0, arg1, arg2, arg3, arg4, arg5, arg6, arg7, arg8, arg9) {
    arg0.texImage2D(arg1 >>> 0, arg2, arg3, arg4, arg5, arg6, arg7 >>> 0, arg8 >>> 0, arg9);
}, arguments); }
export function __wbg_texImage2D_e8b9f50a2836a005() { return handleError(function (arg0, arg1, arg2, arg3, arg4, arg5, arg6, arg7, arg8, arg9) {
    arg0.texImage2D(arg1 >>> 0, arg2, arg3, arg4, arg5, arg6, arg7 >>> 0, arg8 >>> 0, arg9);
}, arguments); }
export function __wbg_texImage3D_2e97b9400c1fa848() { return handleError(function (arg0, arg1, arg2, arg3, arg4, arg5, arg6, arg7, arg8, arg9, arg10) {
    arg0.texImage3D(arg1 >>> 0, arg2, arg3, arg4, arg5, arg6, arg7, arg8 >>> 0, arg9 >>> 0, arg10);
}, arguments); }
export function __wbg_texImage3D_c1d29edf43dca980() { return handleError(function (arg0, arg1, arg2, arg3, arg4, arg5, arg6, arg7, arg8, arg9, arg10) {
    arg0.texImage3D(arg1 >>> 0, arg2, arg3, arg4, arg5, arg6, arg7, arg8 >>> 0, arg9 >>> 0, arg10);
}, arguments); }
export function __wbg_texParameteri_1d5f90924850bc7e() { return logError(function (arg0, arg1, arg2, arg3) {
    arg0.texParameteri(arg1 >>> 0, arg2 >>> 0, arg3);
}, arguments); }
export function __wbg_texParameteri_2f60d62df693455a() { return logError(function (arg0, arg1, arg2, arg3) {
    arg0.texParameteri(arg1 >>> 0, arg2 >>> 0, arg3);
}, arguments); }
export function __wbg_texStorage2D_4df7279c6b585e48() { return logError(function (arg0, arg1, arg2, arg3, arg4, arg5) {
    arg0.texStorage2D(arg1 >>> 0, arg2, arg3 >>> 0, arg4, arg5);
}, arguments); }
export function __wbg_texStorage3D_ff0826b2a2cf6d6f() { return logError(function (arg0, arg1, arg2, arg3, arg4, arg5, arg6) {
    arg0.texStorage3D(arg1 >>> 0, arg2, arg3 >>> 0, arg4, arg5, arg6);
}, arguments); }
export function __wbg_texSubImage2D_07b82087117be55c() { return handleError(function (arg0, arg1, arg2, arg3, arg4, arg5, arg6, arg7, arg8, arg9) {
    arg0.texSubImage2D(arg1 >>> 0, arg2, arg3, arg4, arg5, arg6, arg7 >>> 0, arg8 >>> 0, arg9);
}, arguments); }
export function __wbg_texSubImage2D_12b54c380b70c677() { return handleError(function (arg0, arg1, arg2, arg3, arg4, arg5, arg6, arg7, arg8, arg9) {
    arg0.texSubImage2D(arg1 >>> 0, arg2, arg3, arg4, arg5, arg6, arg7 >>> 0, arg8 >>> 0, arg9);
}, arguments); }
export function __wbg_texSubImage2D_17e3e55f6593f187() { return handleError(function (arg0, arg1, arg2, arg3, arg4, arg5, arg6, arg7, arg8, arg9) {
    arg0.texSubImage2D(arg1 >>> 0, arg2, arg3, arg4, arg5, arg6, arg7 >>> 0, arg8 >>> 0, arg9);
}, arguments); }
export function __wbg_texSubImage2D_256097e8c70c742d() { return handleError(function (arg0, arg1, arg2, arg3, arg4, arg5, arg6, arg7, arg8, arg9) {
    arg0.texSubImage2D(arg1 >>> 0, arg2, arg3, arg4, arg5, arg6, arg7 >>> 0, arg8 >>> 0, arg9);
}, arguments); }
export function __wbg_texSubImage2D_2a4269641c94bb9a() { return handleError(function (arg0, arg1, arg2, arg3, arg4, arg5, arg6, arg7, arg8, arg9) {
    arg0.texSubImage2D(arg1 >>> 0, arg2, arg3, arg4, arg5, arg6, arg7 >>> 0, arg8 >>> 0, arg9);
}, arguments); }
export function __wbg_texSubImage2D_56b8216178007d73() { return handleError(function (arg0, arg1, arg2, arg3, arg4, arg5, arg6, arg7, arg8, arg9) {
    arg0.texSubImage2D(arg1 >>> 0, arg2, arg3, arg4, arg5, arg6, arg7 >>> 0, arg8 >>> 0, arg9);
}, arguments); }
export function __wbg_texSubImage2D_8be481783b3f22eb() { return handleError(function (arg0, arg1, arg2, arg3, arg4, arg5, arg6, arg7, arg8, arg9) {
    arg0.texSubImage2D(arg1 >>> 0, arg2, arg3, arg4, arg5, arg6, arg7 >>> 0, arg8 >>> 0, arg9);
}, arguments); }
export function __wbg_texSubImage2D_8d992d1161c1c3fe() { return handleError(function (arg0, arg1, arg2, arg3, arg4, arg5, arg6, arg7, arg8, arg9) {
    arg0.texSubImage2D(arg1 >>> 0, arg2, arg3, arg4, arg5, arg6, arg7 >>> 0, arg8 >>> 0, arg9);
}, arguments); }
export function __wbg_texSubImage3D_154d5c67f1bf984e() { return handleError(function (arg0, arg1, arg2, arg3, arg4, arg5, arg6, arg7, arg8, arg9, arg10, arg11) {
    arg0.texSubImage3D(arg1 >>> 0, arg2, arg3, arg4, arg5, arg6, arg7, arg8, arg9 >>> 0, arg10 >>> 0, arg11);
}, arguments); }
export function __wbg_texSubImage3D_305d1245292e3d56() { return handleError(function (arg0, arg1, arg2, arg3, arg4, arg5, arg6, arg7, arg8, arg9, arg10, arg11) {
    arg0.texSubImage3D(arg1 >>> 0, arg2, arg3, arg4, arg5, arg6, arg7, arg8, arg9 >>> 0, arg10 >>> 0, arg11);
}, arguments); }
export function __wbg_texSubImage3D_6162cf78b50b8ff1() { return handleError(function (arg0, arg1, arg2, arg3, arg4, arg5, arg6, arg7, arg8, arg9, arg10, arg11) {
    arg0.texSubImage3D(arg1 >>> 0, arg2, arg3, arg4, arg5, arg6, arg7, arg8, arg9 >>> 0, arg10 >>> 0, arg11);
}, arguments); }
export function __wbg_texSubImage3D_7ad3e794fec3fe31() { return handleError(function (arg0, arg1, arg2, arg3, arg4, arg5, arg6, arg7, arg8, arg9, arg10, arg11) {
    arg0.texSubImage3D(arg1 >>> 0, arg2, arg3, arg4, arg5, arg6, arg7, arg8, arg9 >>> 0, arg10 >>> 0, arg11);
}, arguments); }
export function __wbg_texSubImage3D_a174690abf2066a1() { return handleError(function (arg0, arg1, arg2, arg3, arg4, arg5, arg6, arg7, arg8, arg9, arg10, arg11) {
    arg0.texSubImage3D(arg1 >>> 0, arg2, arg3, arg4, arg5, arg6, arg7, arg8, arg9 >>> 0, arg10 >>> 0, arg11);
}, arguments); }
export function __wbg_texSubImage3D_b05d9b6b481231e8() { return handleError(function (arg0, arg1, arg2, arg3, arg4, arg5, arg6, arg7, arg8, arg9, arg10, arg11) {
    arg0.texSubImage3D(arg1 >>> 0, arg2, arg3, arg4, arg5, arg6, arg7, arg8, arg9 >>> 0, arg10 >>> 0, arg11);
}, arguments); }
export function __wbg_texSubImage3D_ed53bff13f8fab20() { return handleError(function (arg0, arg1, arg2, arg3, arg4, arg5, arg6, arg7, arg8, arg9, arg10, arg11) {
    arg0.texSubImage3D(arg1 >>> 0, arg2, arg3, arg4, arg5, arg6, arg7, arg8, arg9 >>> 0, arg10 >>> 0, arg11);
}, arguments); }
export function __wbg_then_34956fdd88b794f7() { return logError(function (arg0, arg1, arg2) {
    const ret = arg0.then(arg1, arg2);
    return ret;
}, arguments); }
export function __wbg_then_952f7340ec33cf89() { return logError(function (arg0, arg1) {
    const ret = arg0.then(arg1);
    return ret;
}, arguments); }
export function __wbg_then_d9ebfadd74ddfbb2() { return logError(function (arg0, arg1) {
    const ret = arg0.then(arg1);
    return ret;
}, arguments); }
export function __wbg_then_f6dedb0d880db23a() { return logError(function (arg0, arg1, arg2) {
    const ret = arg0.then(arg1, arg2);
    return ret;
}, arguments); }
export function __wbg_transferControlToOffscreen_a18725a3e80ca220() { return handleError(function (arg0) {
    const ret = arg0.transferControlToOffscreen();
    return ret;
}, arguments); }
export function __wbg_uniform1f_1c377b51535d0d1f() { return logError(function (arg0, arg1, arg2) {
    arg0.uniform1f(arg1, arg2);
}, arguments); }
export function __wbg_uniform1f_c490c66e9b895aae() { return logError(function (arg0, arg1, arg2) {
    arg0.uniform1f(arg1, arg2);
}, arguments); }
export function __wbg_uniform1i_017af453f51246d1() { return logError(function (arg0, arg1, arg2) {
    arg0.uniform1i(arg1, arg2);
}, arguments); }
export function __wbg_uniform1i_620429c56da52252() { return logError(function (arg0, arg1, arg2) {
    arg0.uniform1i(arg1, arg2);
}, arguments); }
export function __wbg_uniform1ui_155d89c092153aa2() { return logError(function (arg0, arg1, arg2) {
    arg0.uniform1ui(arg1, arg2 >>> 0);
}, arguments); }
export function __wbg_uniform2fv_1db51f6084ad6abc() { return logError(function (arg0, arg1, arg2, arg3) {
    arg0.uniform2fv(arg1, getArrayF32FromWasm0(arg2, arg3));
}, arguments); }
export function __wbg_uniform2fv_95eba8de1a75316c() { return logError(function (arg0, arg1, arg2, arg3) {
    arg0.uniform2fv(arg1, getArrayF32FromWasm0(arg2, arg3));
}, arguments); }
export function __wbg_uniform2iv_5cf511c784bb896d() { return logError(function (arg0, arg1, arg2, arg3) {
    arg0.uniform2iv(arg1, getArrayI32FromWasm0(arg2, arg3));
}, arguments); }
export function __wbg_uniform2iv_84e3c725bd528b8a() { return logError(function (arg0, arg1, arg2, arg3) {
    arg0.uniform2iv(arg1, getArrayI32FromWasm0(arg2, arg3));
}, arguments); }
export function __wbg_uniform2uiv_725f0512d37bf556() { return logError(function (arg0, arg1, arg2, arg3) {
    arg0.uniform2uiv(arg1, getArrayU32FromWasm0(arg2, arg3));
}, arguments); }
export function __wbg_uniform3fv_86a178cb652f2b7b() { return logError(function (arg0, arg1, arg2, arg3) {
    arg0.uniform3fv(arg1, getArrayF32FromWasm0(arg2, arg3));
}, arguments); }
export function __wbg_uniform3fv_ea1cef2226b3690b() { return logError(function (arg0, arg1, arg2, arg3) {
    arg0.uniform3fv(arg1, getArrayF32FromWasm0(arg2, arg3));
}, arguments); }
export function __wbg_uniform3iv_b4765f8639ffbc25() { return logError(function (arg0, arg1, arg2, arg3) {
    arg0.uniform3iv(arg1, getArrayI32FromWasm0(arg2, arg3));
}, arguments); }
export function __wbg_uniform3iv_fa6a96468c0c1b19() { return logError(function (arg0, arg1, arg2, arg3) {
    arg0.uniform3iv(arg1, getArrayI32FromWasm0(arg2, arg3));
}, arguments); }
export function __wbg_uniform3uiv_c7fafdccbda533a8() { return logError(function (arg0, arg1, arg2, arg3) {
    arg0.uniform3uiv(arg1, getArrayU32FromWasm0(arg2, arg3));
}, arguments); }
export function __wbg_uniform4f_28eae6dcd90747ef() { return logError(function (arg0, arg1, arg2, arg3, arg4, arg5) {
    arg0.uniform4f(arg1, arg2, arg3, arg4, arg5);
}, arguments); }
export function __wbg_uniform4f_fa57294d7e814443() { return logError(function (arg0, arg1, arg2, arg3, arg4, arg5) {
    arg0.uniform4f(arg1, arg2, arg3, arg4, arg5);
}, arguments); }
export function __wbg_uniform4fv_5bf113e98e85870c() { return logError(function (arg0, arg1, arg2, arg3) {
    arg0.uniform4fv(arg1, getArrayF32FromWasm0(arg2, arg3));
}, arguments); }
export function __wbg_uniform4fv_74b5bf22f0b64068() { return logError(function (arg0, arg1, arg2, arg3) {
    arg0.uniform4fv(arg1, getArrayF32FromWasm0(arg2, arg3));
}, arguments); }
export function __wbg_uniform4iv_b1cccf4a989f9766() { return logError(function (arg0, arg1, arg2, arg3) {
    arg0.uniform4iv(arg1, getArrayI32FromWasm0(arg2, arg3));
}, arguments); }
export function __wbg_uniform4iv_b1ec17c546329cf7() { return logError(function (arg0, arg1, arg2, arg3) {
    arg0.uniform4iv(arg1, getArrayI32FromWasm0(arg2, arg3));
}, arguments); }
export function __wbg_uniform4uiv_32dbcdf1d62f1335() { return logError(function (arg0, arg1, arg2, arg3) {
    arg0.uniform4uiv(arg1, getArrayU32FromWasm0(arg2, arg3));
}, arguments); }
export function __wbg_uniformBlockBinding_29150fa1f063c3ce() { return logError(function (arg0, arg1, arg2, arg3) {
    arg0.uniformBlockBinding(arg1, arg2 >>> 0, arg3 >>> 0);
}, arguments); }
export function __wbg_uniformMatrix2fv_9058d5464302984f() { return logError(function (arg0, arg1, arg2, arg3, arg4) {
    arg0.uniformMatrix2fv(arg1, arg2 !== 0, getArrayF32FromWasm0(arg3, arg4));
}, arguments); }
export function __wbg_uniformMatrix2fv_b0feb90ab800c7f2() { return logError(function (arg0, arg1, arg2, arg3, arg4) {
    arg0.uniformMatrix2fv(arg1, arg2 !== 0, getArrayF32FromWasm0(arg3, arg4));
}, arguments); }
export function __wbg_uniformMatrix2x3fv_3d5f4732af0e8f7d() { return logError(function (arg0, arg1, arg2, arg3, arg4) {
    arg0.uniformMatrix2x3fv(arg1, arg2 !== 0, getArrayF32FromWasm0(arg3, arg4));
}, arguments); }
export function __wbg_uniformMatrix2x4fv_ed9873fa3c163c6e() { return logError(function (arg0, arg1, arg2, arg3, arg4) {
    arg0.uniformMatrix2x4fv(arg1, arg2 !== 0, getArrayF32FromWasm0(arg3, arg4));
}, arguments); }
export function __wbg_uniformMatrix3fv_28106571f00b15e4() { return logError(function (arg0, arg1, arg2, arg3, arg4) {
    arg0.uniformMatrix3fv(arg1, arg2 !== 0, getArrayF32FromWasm0(arg3, arg4));
}, arguments); }
export function __wbg_uniformMatrix3fv_afb1c2aac27851c3() { return logError(function (arg0, arg1, arg2, arg3, arg4) {
    arg0.uniformMatrix3fv(arg1, arg2 !== 0, getArrayF32FromWasm0(arg3, arg4));
}, arguments); }
export function __wbg_uniformMatrix3x2fv_7ab78a7f575bb7de() { return logError(function (arg0, arg1, arg2, arg3, arg4) {
    arg0.uniformMatrix3x2fv(arg1, arg2 !== 0, getArrayF32FromWasm0(arg3, arg4));
}, arguments); }
export function __wbg_uniformMatrix3x4fv_d66820527e5f0045() { return logError(function (arg0, arg1, arg2, arg3, arg4) {
    arg0.uniformMatrix3x4fv(arg1, arg2 !== 0, getArrayF32FromWasm0(arg3, arg4));
}, arguments); }
export function __wbg_uniformMatrix4fv_919ea0c0b6fe355f() { return logError(function (arg0, arg1, arg2, arg3, arg4) {
    arg0.uniformMatrix4fv(arg1, arg2 !== 0, getArrayF32FromWasm0(arg3, arg4));
}, arguments); }
export function __wbg_uniformMatrix4fv_f1e046c5f61ed71f() { return logError(function (arg0, arg1, arg2, arg3, arg4) {
    arg0.uniformMatrix4fv(arg1, arg2 !== 0, getArrayF32FromWasm0(arg3, arg4));
}, arguments); }
export function __wbg_uniformMatrix4x2fv_39f3d5afb850dfc2() { return logError(function (arg0, arg1, arg2, arg3, arg4) {
    arg0.uniformMatrix4x2fv(arg1, arg2 !== 0, getArrayF32FromWasm0(arg3, arg4));
}, arguments); }
export function __wbg_uniformMatrix4x3fv_a53a6e2b38fde6ba() { return logError(function (arg0, arg1, arg2, arg3, arg4) {
    arg0.uniformMatrix4x3fv(arg1, arg2 !== 0, getArrayF32FromWasm0(arg3, arg4));
}, arguments); }
export function __wbg_unmap_8f06698a75b8331a() { return logError(function (arg0) {
    arg0.unmap();
}, arguments); }
export function __wbg_usage_ffc49211c0488f66() { return logError(function (arg0) {
    const ret = arg0.usage;
    _assertNum(ret);
    return ret;
}, arguments); }
export function __wbg_useProgram_a229a93fc78688ee() { return logError(function (arg0, arg1) {
    arg0.useProgram(arg1);
}, arguments); }
export function __wbg_useProgram_eec93ec68983b282() { return logError(function (arg0, arg1) {
    arg0.useProgram(arg1);
}, arguments); }
export function __wbg_valueOf_e60ac14be76f5cd9() { return logError(function (arg0) {
    const ret = arg0.valueOf();
    return ret;
}, arguments); }
export function __wbg_value_8996dd08e99f9529() { return logError(function (arg0) {
    const ret = arg0.value;
    return ret;
}, arguments); }
export function __wbg_vertexAttribDivisorANGLE_b82130b5be2899a8() { return logError(function (arg0, arg1, arg2) {
    arg0.vertexAttribDivisorANGLE(arg1 >>> 0, arg2 >>> 0);
}, arguments); }
export function __wbg_vertexAttribDivisor_61b2b06e68a18d7e() { return logError(function (arg0, arg1, arg2) {
    arg0.vertexAttribDivisor(arg1 >>> 0, arg2 >>> 0);
}, arguments); }
export function __wbg_vertexAttribIPointer_149075befb883e06() { return logError(function (arg0, arg1, arg2, arg3, arg4, arg5) {
    arg0.vertexAttribIPointer(arg1 >>> 0, arg2, arg3 >>> 0, arg4, arg5);
}, arguments); }
export function __wbg_vertexAttribPointer_72351aab9dc93e2c() { return logError(function (arg0, arg1, arg2, arg3, arg4, arg5, arg6) {
    arg0.vertexAttribPointer(arg1 >>> 0, arg2, arg3 >>> 0, arg4 !== 0, arg5, arg6);
}, arguments); }
export function __wbg_vertexAttribPointer_ef3fe0b7841ec062() { return logError(function (arg0, arg1, arg2, arg3, arg4, arg5, arg6) {
    arg0.vertexAttribPointer(arg1 >>> 0, arg2, arg3 >>> 0, arg4 !== 0, arg5, arg6);
}, arguments); }
export function __wbg_videoHeight_5b83e795d426af87() { return logError(function (arg0) {
    const ret = arg0.videoHeight;
    _assertNum(ret);
    return ret;
}, arguments); }
export function __wbg_videoWidth_0b0534d00ec8f243() { return logError(function (arg0) {
    const ret = arg0.videoWidth;
    _assertNum(ret);
    return ret;
}, arguments); }
export function __wbg_viewport_1031753073d031a2() { return logError(function (arg0, arg1, arg2, arg3, arg4) {
    arg0.viewport(arg1, arg2, arg3, arg4);
}, arguments); }
export function __wbg_viewport_94c85b86d76f49a7() { return logError(function (arg0, arg1, arg2, arg3, arg4) {
    arg0.viewport(arg1, arg2, arg3, arg4);
}, arguments); }
export function __wbg_wgslLanguageFeatures_643e989cbd94b299() { return logError(function (arg0) {
    const ret = arg0.wgslLanguageFeatures;
    return ret;
}, arguments); }
export function __wbg_width_1b4013dc9b9b69b2() { return logError(function (arg0) {
    const ret = arg0.width;
    _assertNum(ret);
    return ret;
}, arguments); }
export function __wbg_width_2f2313f535ecc2de() { return logError(function (arg0) {
    const ret = arg0.width;
    _assertNum(ret);
    return ret;
}, arguments); }
export function __wbg_width_7d707333391e14ff() { return logError(function (arg0) {
    const ret = arg0.width;
    _assertNum(ret);
    return ret;
}, arguments); }
export function __wbg_width_c387004ab78e7a13() { return logError(function (arg0) {
    const ret = arg0.width;
    _assertNum(ret);
    return ret;
}, arguments); }
export function __wbg_width_d1eed72b8d2ae405() { return logError(function (arg0) {
    const ret = arg0.width;
    _assertNum(ret);
    return ret;
}, arguments); }
export function __wbg_writeBuffer_b4bdd36178348ca5() { return handleError(function (arg0, arg1, arg2, arg3, arg4, arg5, arg6) {
    arg0.writeBuffer(arg1, arg2, getArrayU8FromWasm0(arg3, arg4), arg5, arg6);
}, arguments); }
export function __wbg_writeTexture_b45b69132e46a227() { return handleError(function (arg0, arg1, arg2, arg3, arg4, arg5) {
    arg0.writeTexture(arg1, getArrayU8FromWasm0(arg2, arg3), arg4, arg5);
}, arguments); }
export function __wbindgen_cast_0000000000000001() { return logError(function (arg0, arg1) {
    // Cast intrinsic for `Closure(Closure { owned: true, function: Function { arguments: [Externref], shim_idx: 3088, ret: Result(Unit), inner_ret: Some(Result(Unit)) }, mutable: true }) -> Externref`.
    const ret = makeMutClosure(arg0, arg1, wasm_bindgen__convert__closures_____invoke__h5dba43847a0a5894);
    return ret;
}, arguments); }
export function __wbindgen_cast_0000000000000002() { return logError(function (arg0, arg1) {
    // Cast intrinsic for `Closure(Closure { owned: true, function: Function { arguments: [Externref], shim_idx: 977, ret: Unit, inner_ret: Some(Unit) }, mutable: true }) -> Externref`.
    const ret = makeMutClosure(arg0, arg1, wasm_bindgen__convert__closures_____invoke__h832aaf7cc2ef334a);
    return ret;
}, arguments); }
export function __wbindgen_cast_0000000000000003() { return logError(function (arg0, arg1) {
    // Cast intrinsic for `Closure(Closure { owned: true, function: Function { arguments: [NamedExternref("GPUUncapturedErrorEvent")], shim_idx: 978, ret: Unit, inner_ret: Some(Unit) }, mutable: true }) -> Externref`.
    const ret = makeMutClosure(arg0, arg1, wasm_bindgen__convert__closures_____invoke__hce2dab72dfd54a94);
    return ret;
}, arguments); }
export function __wbindgen_cast_0000000000000004() { return logError(function (arg0) {
    // Cast intrinsic for `F64 -> Externref`.
    const ret = arg0;
    return ret;
}, arguments); }
export function __wbindgen_cast_0000000000000005() { return logError(function (arg0) {
    // Cast intrinsic for `I64 -> Externref`.
    const ret = arg0;
    return ret;
}, arguments); }
export function __wbindgen_cast_0000000000000006() { return logError(function (arg0, arg1) {
    // Cast intrinsic for `Ref(Slice(F32)) -> NamedExternref("Float32Array")`.
    const ret = getArrayF32FromWasm0(arg0, arg1);
    return ret;
}, arguments); }
export function __wbindgen_cast_0000000000000007() { return logError(function (arg0, arg1) {
    // Cast intrinsic for `Ref(Slice(I16)) -> NamedExternref("Int16Array")`.
    const ret = getArrayI16FromWasm0(arg0, arg1);
    return ret;
}, arguments); }
export function __wbindgen_cast_0000000000000008() { return logError(function (arg0, arg1) {
    // Cast intrinsic for `Ref(Slice(I32)) -> NamedExternref("Int32Array")`.
    const ret = getArrayI32FromWasm0(arg0, arg1);
    return ret;
}, arguments); }
export function __wbindgen_cast_0000000000000009() { return logError(function (arg0, arg1) {
    // Cast intrinsic for `Ref(Slice(I8)) -> NamedExternref("Int8Array")`.
    const ret = getArrayI8FromWasm0(arg0, arg1);
    return ret;
}, arguments); }
export function __wbindgen_cast_000000000000000a() { return logError(function (arg0, arg1) {
    // Cast intrinsic for `Ref(Slice(U16)) -> NamedExternref("Uint16Array")`.
    const ret = getArrayU16FromWasm0(arg0, arg1);
    return ret;
}, arguments); }
export function __wbindgen_cast_000000000000000b() { return logError(function (arg0, arg1) {
    // Cast intrinsic for `Ref(Slice(U32)) -> NamedExternref("Uint32Array")`.
    const ret = getArrayU32FromWasm0(arg0, arg1);
    return ret;
}, arguments); }
export function __wbindgen_cast_000000000000000c() { return logError(function (arg0, arg1) {
    // Cast intrinsic for `Ref(Slice(U8)) -> NamedExternref("Uint8Array")`.
    const ret = getArrayU8FromWasm0(arg0, arg1);
    return ret;
}, arguments); }
export function __wbindgen_cast_000000000000000d() { return logError(function (arg0, arg1) {
    // Cast intrinsic for `Ref(String) -> Externref`.
    const ret = getStringFromWasm0(arg0, arg1);
    return ret;
}, arguments); }
export function __wbindgen_cast_000000000000000e() { return logError(function (arg0) {
    // Cast intrinsic for `U64 -> Externref`.
    const ret = BigInt.asUintN(64, arg0);
    return ret;
}, arguments); }
export function __wbindgen_init_externref_table() {
    const table = wasm.__wbindgen_externrefs;
    const offset = table.grow(4);
    table.set(0, undefined);
    table.set(offset + 0, undefined);
    table.set(offset + 1, null);
    table.set(offset + 2, true);
    table.set(offset + 3, false);
}

//#endregion
function wasm_bindgen__convert__closures_____invoke__h849307889a5223c0(arg0, arg1) {
    _assertNum(arg0);
    _assertNum(arg1);
    const ret = wasm.wasm_bindgen__convert__closures_____invoke__h849307889a5223c0(arg0, arg1);
    return ret !== 0;
}

function wasm_bindgen__convert__closures_____invoke__h832aaf7cc2ef334a(arg0, arg1, arg2) {
    _assertNum(arg0);
    _assertNum(arg1);
    wasm.wasm_bindgen__convert__closures_____invoke__h832aaf7cc2ef334a(arg0, arg1, arg2);
}

function wasm_bindgen__convert__closures_____invoke__hce2dab72dfd54a94(arg0, arg1, arg2) {
    _assertNum(arg0);
    _assertNum(arg1);
    wasm.wasm_bindgen__convert__closures_____invoke__hce2dab72dfd54a94(arg0, arg1, arg2);
}

function wasm_bindgen__convert__closures_____invoke__h5dba43847a0a5894(arg0, arg1, arg2) {
    _assertNum(arg0);
    _assertNum(arg1);
    const ret = wasm.wasm_bindgen__convert__closures_____invoke__h5dba43847a0a5894(arg0, arg1, arg2);
    if (ret[1]) {
        throw takeFromExternrefTable0(ret[0]);
    }
}

function wasm_bindgen__convert__closures_____invoke__hb9cb5789986fdfcb(arg0, arg1, arg2, arg3) {
    _assertNum(arg0);
    _assertNum(arg1);
    wasm.wasm_bindgen__convert__closures_____invoke__hb9cb5789986fdfcb(arg0, arg1, arg2, arg3);
}


const __wbindgen_enum_GpuAddressMode = ["clamp-to-edge", "repeat", "mirror-repeat"];


const __wbindgen_enum_GpuBlendFactor = ["zero", "one", "src", "one-minus-src", "src-alpha", "one-minus-src-alpha", "dst", "one-minus-dst", "dst-alpha", "one-minus-dst-alpha", "src-alpha-saturated", "constant", "one-minus-constant", "src1", "one-minus-src1", "src1-alpha", "one-minus-src1-alpha"];


const __wbindgen_enum_GpuBlendOperation = ["add", "subtract", "reverse-subtract", "min", "max"];


const __wbindgen_enum_GpuBufferBindingType = ["uniform", "storage", "read-only-storage"];


const __wbindgen_enum_GpuCanvasAlphaMode = ["opaque", "premultiplied"];


const __wbindgen_enum_GpuCompareFunction = ["never", "less", "equal", "less-equal", "greater", "not-equal", "greater-equal", "always"];


const __wbindgen_enum_GpuCullMode = ["none", "front", "back"];


const __wbindgen_enum_GpuDeviceLostReason = ["unknown", "destroyed"];


const __wbindgen_enum_GpuErrorFilter = ["validation", "out-of-memory", "internal"];


const __wbindgen_enum_GpuFilterMode = ["nearest", "linear"];


const __wbindgen_enum_GpuFrontFace = ["ccw", "cw"];


const __wbindgen_enum_GpuIndexFormat = ["uint16", "uint32"];


const __wbindgen_enum_GpuLoadOp = ["load", "clear"];


const __wbindgen_enum_GpuMipmapFilterMode = ["nearest", "linear"];


const __wbindgen_enum_GpuPowerPreference = ["low-power", "high-performance"];


const __wbindgen_enum_GpuPrimitiveTopology = ["point-list", "line-list", "line-strip", "triangle-list", "triangle-strip"];


const __wbindgen_enum_GpuQueryType = ["occlusion", "timestamp"];


const __wbindgen_enum_GpuSamplerBindingType = ["filtering", "non-filtering", "comparison"];


const __wbindgen_enum_GpuStencilOperation = ["keep", "zero", "replace", "invert", "increment-clamp", "decrement-clamp", "increment-wrap", "decrement-wrap"];


const __wbindgen_enum_GpuStorageTextureAccess = ["write-only", "read-only", "read-write"];


const __wbindgen_enum_GpuStoreOp = ["store", "discard"];


const __wbindgen_enum_GpuTextureAspect = ["all", "stencil-only", "depth-only"];


const __wbindgen_enum_GpuTextureDimension = ["1d", "2d", "3d"];


const __wbindgen_enum_GpuTextureFormat = ["r8unorm", "r8snorm", "r8uint", "r8sint", "r16uint", "r16sint", "r16float", "rg8unorm", "rg8snorm", "rg8uint", "rg8sint", "r32uint", "r32sint", "r32float", "rg16uint", "rg16sint", "rg16float", "rgba8unorm", "rgba8unorm-srgb", "rgba8snorm", "rgba8uint", "rgba8sint", "bgra8unorm", "bgra8unorm-srgb", "rgb9e5ufloat", "rgb10a2uint", "rgb10a2unorm", "rg11b10ufloat", "rg32uint", "rg32sint", "rg32float", "rgba16uint", "rgba16sint", "rgba16float", "rgba32uint", "rgba32sint", "rgba32float", "stencil8", "depth16unorm", "depth24plus", "depth24plus-stencil8", "depth32float", "depth32float-stencil8", "bc1-rgba-unorm", "bc1-rgba-unorm-srgb", "bc2-rgba-unorm", "bc2-rgba-unorm-srgb", "bc3-rgba-unorm", "bc3-rgba-unorm-srgb", "bc4-r-unorm", "bc4-r-snorm", "bc5-rg-unorm", "bc5-rg-snorm", "bc6h-rgb-ufloat", "bc6h-rgb-float", "bc7-rgba-unorm", "bc7-rgba-unorm-srgb", "etc2-rgb8unorm", "etc2-rgb8unorm-srgb", "etc2-rgb8a1unorm", "etc2-rgb8a1unorm-srgb", "etc2-rgba8unorm", "etc2-rgba8unorm-srgb", "eac-r11unorm", "eac-r11snorm", "eac-rg11unorm", "eac-rg11snorm", "astc-4x4-unorm", "astc-4x4-unorm-srgb", "astc-5x4-unorm", "astc-5x4-unorm-srgb", "astc-5x5-unorm", "astc-5x5-unorm-srgb", "astc-6x5-unorm", "astc-6x5-unorm-srgb", "astc-6x6-unorm", "astc-6x6-unorm-srgb", "astc-8x5-unorm", "astc-8x5-unorm-srgb", "astc-8x6-unorm", "astc-8x6-unorm-srgb", "astc-8x8-unorm", "astc-8x8-unorm-srgb", "astc-10x5-unorm", "astc-10x5-unorm-srgb", "astc-10x6-unorm", "astc-10x6-unorm-srgb", "astc-10x8-unorm", "astc-10x8-unorm-srgb", "astc-10x10-unorm", "astc-10x10-unorm-srgb", "astc-12x10-unorm", "astc-12x10-unorm-srgb", "astc-12x12-unorm", "astc-12x12-unorm-srgb"];


const __wbindgen_enum_GpuTextureSampleType = ["float", "unfilterable-float", "depth", "sint", "uint"];


const __wbindgen_enum_GpuTextureViewDimension = ["1d", "2d", "2d-array", "cube", "cube-array", "3d"];


const __wbindgen_enum_GpuVertexFormat = ["uint8", "uint8x2", "uint8x4", "sint8", "sint8x2", "sint8x4", "unorm8", "unorm8x2", "unorm8x4", "snorm8", "snorm8x2", "snorm8x4", "uint16", "uint16x2", "uint16x4", "sint16", "sint16x2", "sint16x4", "unorm16", "unorm16x2", "unorm16x4", "snorm16", "snorm16x2", "snorm16x4", "float16", "float16x2", "float16x4", "float32", "float32x2", "float32x3", "float32x4", "uint32", "uint32x2", "uint32x3", "uint32x4", "sint32", "sint32x2", "sint32x3", "sint32x4", "unorm10-10-10-2", "unorm8x4-bgra"];


const __wbindgen_enum_GpuVertexStepMode = ["vertex", "instance"];


//#region intrinsics
function addToExternrefTable0(obj) {
    const idx = wasm.__externref_table_alloc();
    wasm.__wbindgen_externrefs.set(idx, obj);
    return idx;
}

function _assertBigInt(n) {
    if (typeof(n) !== 'bigint') throw new Error(`expected a bigint argument, found ${typeof(n)}`);
}

function _assertBoolean(n) {
    if (typeof(n) !== 'boolean') {
        throw new Error(`expected a boolean argument, found ${typeof(n)}`);
    }
}

function _assertNum(n) {
    if (typeof(n) !== 'number') throw new Error(`expected a number argument, found ${typeof(n)}`);
}

const CLOSURE_DTORS = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(state => wasm.__wbindgen_destroy_closure(state.a, state.b));

function debugString(val) {
    // primitive types
    const type = typeof val;
    if (type == 'number' || type == 'boolean' || val == null) {
        return  `${val}`;
    }
    if (type == 'string') {
        return `"${val}"`;
    }
    if (type == 'symbol') {
        const description = val.description;
        if (description == null) {
            return 'Symbol';
        } else {
            return `Symbol(${description})`;
        }
    }
    if (type == 'function') {
        const name = val.name;
        if (typeof name == 'string' && name.length > 0) {
            return `Function(${name})`;
        } else {
            return 'Function';
        }
    }
    // objects
    if (Array.isArray(val)) {
        const length = val.length;
        let debug = '[';
        if (length > 0) {
            debug += debugString(val[0]);
        }
        for(let i = 1; i < length; i++) {
            debug += ', ' + debugString(val[i]);
        }
        debug += ']';
        return debug;
    }
    // Test for built-in
    const builtInMatches = /\[object ([^\]]+)\]/.exec(toString.call(val));
    let className;
    if (builtInMatches && builtInMatches.length > 1) {
        className = builtInMatches[1];
    } else {
        // Failed to match the standard '[object ClassName]'
        return toString.call(val);
    }
    if (className == 'Object') {
        // we're a user defined class or Object
        // JSON.stringify avoids problems with cycles, and is generally much
        // easier than looping through ownProperties of `val`.
        try {
            return 'Object(' + JSON.stringify(val) + ')';
        } catch (_) {
            return 'Object';
        }
    }
    // errors
    if (val instanceof Error) {
        return `${val.name}: ${val.message}\n${val.stack}`;
    }
    // TODO we could test for more things here, like `Set`s and `Map`s.
    return className;
}

function getArrayF32FromWasm0(ptr, len) {
    ptr = ptr >>> 0;
    return getFloat32ArrayMemory0().subarray(ptr / 4, ptr / 4 + len);
}

function getArrayI16FromWasm0(ptr, len) {
    ptr = ptr >>> 0;
    return getInt16ArrayMemory0().subarray(ptr / 2, ptr / 2 + len);
}

function getArrayI32FromWasm0(ptr, len) {
    ptr = ptr >>> 0;
    return getInt32ArrayMemory0().subarray(ptr / 4, ptr / 4 + len);
}

function getArrayI8FromWasm0(ptr, len) {
    ptr = ptr >>> 0;
    return getInt8ArrayMemory0().subarray(ptr / 1, ptr / 1 + len);
}

function getArrayU16FromWasm0(ptr, len) {
    ptr = ptr >>> 0;
    return getUint16ArrayMemory0().subarray(ptr / 2, ptr / 2 + len);
}

function getArrayU32FromWasm0(ptr, len) {
    ptr = ptr >>> 0;
    return getUint32ArrayMemory0().subarray(ptr / 4, ptr / 4 + len);
}

function getArrayU8FromWasm0(ptr, len) {
    ptr = ptr >>> 0;
    return getUint8ArrayMemory0().subarray(ptr / 1, ptr / 1 + len);
}

function getClampedArrayU8FromWasm0(ptr, len) {
    ptr = ptr >>> 0;
    return getUint8ClampedArrayMemory0().subarray(ptr / 1, ptr / 1 + len);
}

let cachedDataViewMemory0 = null;
function getDataViewMemory0() {
    if (cachedDataViewMemory0 === null || cachedDataViewMemory0.buffer.detached === true || (cachedDataViewMemory0.buffer.detached === undefined && cachedDataViewMemory0.buffer !== wasm.memory.buffer)) {
        cachedDataViewMemory0 = new DataView(wasm.memory.buffer);
    }
    return cachedDataViewMemory0;
}

let cachedFloat32ArrayMemory0 = null;
function getFloat32ArrayMemory0() {
    if (cachedFloat32ArrayMemory0 === null || cachedFloat32ArrayMemory0.byteLength === 0) {
        cachedFloat32ArrayMemory0 = new Float32Array(wasm.memory.buffer);
    }
    return cachedFloat32ArrayMemory0;
}

let cachedInt16ArrayMemory0 = null;
function getInt16ArrayMemory0() {
    if (cachedInt16ArrayMemory0 === null || cachedInt16ArrayMemory0.byteLength === 0) {
        cachedInt16ArrayMemory0 = new Int16Array(wasm.memory.buffer);
    }
    return cachedInt16ArrayMemory0;
}

let cachedInt32ArrayMemory0 = null;
function getInt32ArrayMemory0() {
    if (cachedInt32ArrayMemory0 === null || cachedInt32ArrayMemory0.byteLength === 0) {
        cachedInt32ArrayMemory0 = new Int32Array(wasm.memory.buffer);
    }
    return cachedInt32ArrayMemory0;
}

let cachedInt8ArrayMemory0 = null;
function getInt8ArrayMemory0() {
    if (cachedInt8ArrayMemory0 === null || cachedInt8ArrayMemory0.byteLength === 0) {
        cachedInt8ArrayMemory0 = new Int8Array(wasm.memory.buffer);
    }
    return cachedInt8ArrayMemory0;
}

function getStringFromWasm0(ptr, len) {
    ptr = ptr >>> 0;
    return decodeText(ptr, len);
}

let cachedUint16ArrayMemory0 = null;
function getUint16ArrayMemory0() {
    if (cachedUint16ArrayMemory0 === null || cachedUint16ArrayMemory0.byteLength === 0) {
        cachedUint16ArrayMemory0 = new Uint16Array(wasm.memory.buffer);
    }
    return cachedUint16ArrayMemory0;
}

let cachedUint32ArrayMemory0 = null;
function getUint32ArrayMemory0() {
    if (cachedUint32ArrayMemory0 === null || cachedUint32ArrayMemory0.byteLength === 0) {
        cachedUint32ArrayMemory0 = new Uint32Array(wasm.memory.buffer);
    }
    return cachedUint32ArrayMemory0;
}

let cachedUint8ArrayMemory0 = null;
function getUint8ArrayMemory0() {
    if (cachedUint8ArrayMemory0 === null || cachedUint8ArrayMemory0.byteLength === 0) {
        cachedUint8ArrayMemory0 = new Uint8Array(wasm.memory.buffer);
    }
    return cachedUint8ArrayMemory0;
}

let cachedUint8ClampedArrayMemory0 = null;
function getUint8ClampedArrayMemory0() {
    if (cachedUint8ClampedArrayMemory0 === null || cachedUint8ClampedArrayMemory0.byteLength === 0) {
        cachedUint8ClampedArrayMemory0 = new Uint8ClampedArray(wasm.memory.buffer);
    }
    return cachedUint8ClampedArrayMemory0;
}

function handleError(f, args) {
    try {
        return f.apply(this, args);
    } catch (e) {
        const idx = addToExternrefTable0(e);
        wasm.__wbindgen_exn_store(idx);
    }
}

function isLikeNone(x) {
    return x === undefined || x === null;
}

function logError(f, args) {
    try {
        return f.apply(this, args);
    } catch (e) {
        let error = (function () {
            try {
                return e instanceof Error ? `${e.message}\n\nStack:\n${e.stack}` : e.toString();
            } catch(_) {
                return "<failed to stringify thrown value>";
            }
        }());
        console.error("wasm-bindgen: imported JS function that was not marked as `catch` threw an error:", error);
        throw e;
    }
}

function makeMutClosure(arg0, arg1, f) {
    const state = { a: arg0, b: arg1, cnt: 1 };
    const real = (...args) => {

        // First up with a closure we increment the internal reference
        // count. This ensures that the Rust closure environment won't
        // be deallocated while we're invoking it.
        state.cnt++;
        const a = state.a;
        state.a = 0;
        try {
            return f(a, state.b, ...args);
        } finally {
            state.a = a;
            real._wbg_cb_unref();
        }
    };
    real._wbg_cb_unref = () => {
        if (--state.cnt === 0) {
            wasm.__wbindgen_destroy_closure(state.a, state.b);
            state.a = 0;
            CLOSURE_DTORS.unregister(state);
        }
    };
    CLOSURE_DTORS.register(real, state, state);
    return real;
}

function passArray8ToWasm0(arg, malloc) {
    const ptr = malloc(arg.length * 1, 1) >>> 0;
    getUint8ArrayMemory0().set(arg, ptr / 1);
    WASM_VECTOR_LEN = arg.length;
    return ptr;
}

function passStringToWasm0(arg, malloc, realloc) {
    if (typeof(arg) !== 'string') throw new Error(`expected a string argument, found ${typeof(arg)}`);
    if (realloc === undefined) {
        const buf = cachedTextEncoder.encode(arg);
        const ptr = malloc(buf.length, 1) >>> 0;
        getUint8ArrayMemory0().subarray(ptr, ptr + buf.length).set(buf);
        WASM_VECTOR_LEN = buf.length;
        return ptr;
    }

    let len = arg.length;
    let ptr = malloc(len, 1) >>> 0;

    const mem = getUint8ArrayMemory0();

    let offset = 0;

    for (; offset < len; offset++) {
        const code = arg.charCodeAt(offset);
        if (code > 0x7F) break;
        mem[ptr + offset] = code;
    }
    if (offset !== len) {
        if (offset !== 0) {
            arg = arg.slice(offset);
        }
        ptr = realloc(ptr, len, len = offset + arg.length * 3, 1) >>> 0;
        const view = getUint8ArrayMemory0().subarray(ptr + offset, ptr + len);
        const ret = cachedTextEncoder.encodeInto(arg, view);
        if (ret.read !== arg.length) throw new Error('failed to pass whole string');
        offset += ret.written;
        ptr = realloc(ptr, len, offset, 1) >>> 0;
    }

    WASM_VECTOR_LEN = offset;
    return ptr;
}

function takeFromExternrefTable0(idx) {
    const value = wasm.__wbindgen_externrefs.get(idx);
    wasm.__externref_table_dealloc(idx);
    return value;
}

let cachedTextDecoder = new TextDecoder('utf-8', { ignoreBOM: true, fatal: true });
cachedTextDecoder.decode();
const MAX_SAFARI_DECODE_BYTES = 2146435072;
let numBytesDecoded = 0;
function decodeText(ptr, len) {
    numBytesDecoded += len;
    if (numBytesDecoded >= MAX_SAFARI_DECODE_BYTES) {
        cachedTextDecoder = new TextDecoder('utf-8', { ignoreBOM: true, fatal: true });
        cachedTextDecoder.decode();
        numBytesDecoded = len;
    }
    return cachedTextDecoder.decode(getUint8ArrayMemory0().subarray(ptr, ptr + len));
}

const cachedTextEncoder = new TextEncoder();

if (!('encodeInto' in cachedTextEncoder)) {
    cachedTextEncoder.encodeInto = function (arg, view) {
        const buf = cachedTextEncoder.encode(arg);
        view.set(buf);
        return {
            read: arg.length,
            written: buf.length
        };
    };
}

let WASM_VECTOR_LEN = 0;


//#endregion

//#region wasm loading

let wasm;
export function __wbg_set_wasm(val) {
    wasm = val;
}

//#endregion
