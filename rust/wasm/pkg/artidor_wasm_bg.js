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

/**
 * @param {any} options
 */
export function uploadTexture(options) {
    const ret = wasm.uploadTexture(options);
    if (ret[1]) {
        throw takeFromExternrefTable0(ret[0]);
    }
}
export function __wbg_Error_92b29b0548f8b746(arg0, arg1) {
    const ret = Error(getStringFromWasm0(arg0, arg1));
    return ret;
}
export function __wbg_Number_9a4e0ecb0fa16705(arg0) {
    const ret = Number(arg0);
    return ret;
}
export function __wbg_String_8564e559799eccda(arg0, arg1) {
    const ret = String(arg1);
    const ptr1 = passStringToWasm0(ret, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
    const len1 = WASM_VECTOR_LEN;
    getDataViewMemory0().setInt32(arg0 + 4 * 1, len1, true);
    getDataViewMemory0().setInt32(arg0 + 4 * 0, ptr1, true);
}
export function __wbg_Window_a07901001eb4269f(arg0) {
    const ret = arg0.Window;
    return ret;
}
export function __wbg_WorkerGlobalScope_d1b9459d53a39f3d(arg0) {
    const ret = arg0.WorkerGlobalScope;
    return ret;
}
export function __wbg___wbindgen_bigint_get_as_i64_d968e41184ae354f(arg0, arg1) {
    const v = arg1;
    const ret = typeof(v) === 'bigint' ? v : undefined;
    getDataViewMemory0().setBigInt64(arg0 + 8 * 1, isLikeNone(ret) ? BigInt(0) : ret, true);
    getDataViewMemory0().setInt32(arg0 + 4 * 0, !isLikeNone(ret), true);
}
export function __wbg___wbindgen_boolean_get_fa956cfa2d1bd751(arg0) {
    const v = arg0;
    const ret = typeof(v) === 'boolean' ? v : undefined;
    return isLikeNone(ret) ? 0xFFFFFF : ret ? 1 : 0;
}
export function __wbg___wbindgen_debug_string_c25d447a39f5578f(arg0, arg1) {
    const ret = debugString(arg1);
    const ptr1 = passStringToWasm0(ret, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
    const len1 = WASM_VECTOR_LEN;
    getDataViewMemory0().setInt32(arg0 + 4 * 1, len1, true);
    getDataViewMemory0().setInt32(arg0 + 4 * 0, ptr1, true);
}
export function __wbg___wbindgen_in_aca499c5de7ff5e5(arg0, arg1) {
    const ret = arg0 in arg1;
    return ret;
}
export function __wbg___wbindgen_is_bigint_2f76dc55065b4273(arg0) {
    const ret = typeof(arg0) === 'bigint';
    return ret;
}
export function __wbg___wbindgen_is_function_1ff95bcc5517c252(arg0) {
    const ret = typeof(arg0) === 'function';
    return ret;
}
export function __wbg___wbindgen_is_null_ea9085d691f535d3(arg0) {
    const ret = arg0 === null;
    return ret;
}
export function __wbg___wbindgen_is_object_a27215656b807791(arg0) {
    const val = arg0;
    const ret = typeof(val) === 'object' && val !== null;
    return ret;
}
export function __wbg___wbindgen_is_string_ea5e6cc2e4141dfe(arg0) {
    const ret = typeof(arg0) === 'string';
    return ret;
}
export function __wbg___wbindgen_is_undefined_c05833b95a3cf397(arg0) {
    const ret = arg0 === undefined;
    return ret;
}
export function __wbg___wbindgen_jsval_eq_e659fcf7b0e32763(arg0, arg1) {
    const ret = arg0 === arg1;
    return ret;
}
export function __wbg___wbindgen_jsval_loose_eq_db4c3b15f63fc170(arg0, arg1) {
    const ret = arg0 == arg1;
    return ret;
}
export function __wbg___wbindgen_number_get_394265ed1e1b84ee(arg0, arg1) {
    const obj = arg1;
    const ret = typeof(obj) === 'number' ? obj : undefined;
    getDataViewMemory0().setFloat64(arg0 + 8 * 1, isLikeNone(ret) ? 0 : ret, true);
    getDataViewMemory0().setInt32(arg0 + 4 * 0, !isLikeNone(ret), true);
}
export function __wbg___wbindgen_string_get_b0ca35b86a603356(arg0, arg1) {
    const obj = arg1;
    const ret = typeof(obj) === 'string' ? obj : undefined;
    var ptr1 = isLikeNone(ret) ? 0 : passStringToWasm0(ret, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
    var len1 = WASM_VECTOR_LEN;
    getDataViewMemory0().setInt32(arg0 + 4 * 1, len1, true);
    getDataViewMemory0().setInt32(arg0 + 4 * 0, ptr1, true);
}
export function __wbg___wbindgen_throw_344f42d3211c4765(arg0, arg1) {
    throw new Error(getStringFromWasm0(arg0, arg1));
}
export function __wbg__wbg_cb_unref_fffb441def202758(arg0) {
    arg0._wbg_cb_unref();
}
export function __wbg_activeTexture_92b04d918019d603(arg0, arg1) {
    arg0.activeTexture(arg1 >>> 0);
}
export function __wbg_activeTexture_d12958674e97a118(arg0, arg1) {
    arg0.activeTexture(arg1 >>> 0);
}
export function __wbg_attachShader_5f7f4077e124e23b(arg0, arg1, arg2) {
    arg0.attachShader(arg1, arg2);
}
export function __wbg_attachShader_8971266b4c9bc514(arg0, arg1, arg2) {
    arg0.attachShader(arg1, arg2);
}
export function __wbg_beginQuery_042a1f99e870066c(arg0, arg1, arg2) {
    arg0.beginQuery(arg1 >>> 0, arg2);
}
export function __wbg_beginRenderPass_10e1d8bb36f2f74e() { return handleError(function (arg0, arg1) {
    const ret = arg0.beginRenderPass(arg1);
    return ret;
}, arguments); }
export function __wbg_bindAttribLocation_0fe5da7e01ac0d15(arg0, arg1, arg2, arg3, arg4) {
    arg0.bindAttribLocation(arg1, arg2 >>> 0, getStringFromWasm0(arg3, arg4));
}
export function __wbg_bindAttribLocation_94202d7a59ab7863(arg0, arg1, arg2, arg3, arg4) {
    arg0.bindAttribLocation(arg1, arg2 >>> 0, getStringFromWasm0(arg3, arg4));
}
export function __wbg_bindBufferRange_f5c29912db0476e9(arg0, arg1, arg2, arg3, arg4, arg5) {
    arg0.bindBufferRange(arg1 >>> 0, arg2 >>> 0, arg3, arg4, arg5);
}
export function __wbg_bindBuffer_1e00cfb4321ef9a4(arg0, arg1, arg2) {
    arg0.bindBuffer(arg1 >>> 0, arg2);
}
export function __wbg_bindBuffer_a01497b1abdcdd9a(arg0, arg1, arg2) {
    arg0.bindBuffer(arg1 >>> 0, arg2);
}
export function __wbg_bindFramebuffer_390311eff3896937(arg0, arg1, arg2) {
    arg0.bindFramebuffer(arg1 >>> 0, arg2);
}
export function __wbg_bindFramebuffer_658e4b06f7ee8bb4(arg0, arg1, arg2) {
    arg0.bindFramebuffer(arg1 >>> 0, arg2);
}
export function __wbg_bindRenderbuffer_75e8469e930840fa(arg0, arg1, arg2) {
    arg0.bindRenderbuffer(arg1 >>> 0, arg2);
}
export function __wbg_bindRenderbuffer_c3d0c4b8cd1c3891(arg0, arg1, arg2) {
    arg0.bindRenderbuffer(arg1 >>> 0, arg2);
}
export function __wbg_bindSampler_ce608f0de9d31acf(arg0, arg1, arg2) {
    arg0.bindSampler(arg1 >>> 0, arg2);
}
export function __wbg_bindTexture_28eff4bbd8aaab54(arg0, arg1, arg2) {
    arg0.bindTexture(arg1 >>> 0, arg2);
}
export function __wbg_bindTexture_9b04b1b7c00d4dd6(arg0, arg1, arg2) {
    arg0.bindTexture(arg1 >>> 0, arg2);
}
export function __wbg_bindVertexArrayOES_5cad2205a17e8990(arg0, arg1) {
    arg0.bindVertexArrayOES(arg1);
}
export function __wbg_bindVertexArray_427eeac0c1764d8a(arg0, arg1) {
    arg0.bindVertexArray(arg1);
}
export function __wbg_blendColor_793b560dc69ddd0b(arg0, arg1, arg2, arg3, arg4) {
    arg0.blendColor(arg1, arg2, arg3, arg4);
}
export function __wbg_blendColor_eae0cd578a2c7d15(arg0, arg1, arg2, arg3, arg4) {
    arg0.blendColor(arg1, arg2, arg3, arg4);
}
export function __wbg_blendEquationSeparate_043e2f50f6ecb2d3(arg0, arg1, arg2) {
    arg0.blendEquationSeparate(arg1 >>> 0, arg2 >>> 0);
}
export function __wbg_blendEquationSeparate_c7e2b2261c94e1c5(arg0, arg1, arg2) {
    arg0.blendEquationSeparate(arg1 >>> 0, arg2 >>> 0);
}
export function __wbg_blendEquation_455b8986ededabc0(arg0, arg1) {
    arg0.blendEquation(arg1 >>> 0);
}
export function __wbg_blendEquation_f5c5272993f6cb01(arg0, arg1) {
    arg0.blendEquation(arg1 >>> 0);
}
export function __wbg_blendFuncSeparate_37156309688f8f88(arg0, arg1, arg2, arg3, arg4) {
    arg0.blendFuncSeparate(arg1 >>> 0, arg2 >>> 0, arg3 >>> 0, arg4 >>> 0);
}
export function __wbg_blendFuncSeparate_3ee6d939a9f3938b(arg0, arg1, arg2, arg3, arg4) {
    arg0.blendFuncSeparate(arg1 >>> 0, arg2 >>> 0, arg3 >>> 0, arg4 >>> 0);
}
export function __wbg_blendFunc_114dc7056ccfeb8d(arg0, arg1, arg2) {
    arg0.blendFunc(arg1 >>> 0, arg2 >>> 0);
}
export function __wbg_blendFunc_a854d7e4459150ba(arg0, arg1, arg2) {
    arg0.blendFunc(arg1 >>> 0, arg2 >>> 0);
}
export function __wbg_blitFramebuffer_a1215976f663b058(arg0, arg1, arg2, arg3, arg4, arg5, arg6, arg7, arg8, arg9, arg10) {
    arg0.blitFramebuffer(arg1, arg2, arg3, arg4, arg5, arg6, arg7, arg8, arg9 >>> 0, arg10 >>> 0);
}
export function __wbg_bufferData_073a7c6abef7a55f(arg0, arg1, arg2, arg3) {
    arg0.bufferData(arg1 >>> 0, arg2, arg3 >>> 0);
}
export function __wbg_bufferData_3d4f29bdfb1fa46c(arg0, arg1, arg2, arg3) {
    arg0.bufferData(arg1 >>> 0, arg2, arg3 >>> 0);
}
export function __wbg_bufferData_90ef588bac2be2f5(arg0, arg1, arg2, arg3) {
    arg0.bufferData(arg1 >>> 0, arg2, arg3 >>> 0);
}
export function __wbg_bufferData_ce4f44d56e9ddab5(arg0, arg1, arg2, arg3) {
    arg0.bufferData(arg1 >>> 0, arg2, arg3 >>> 0);
}
export function __wbg_bufferSubData_bae930b21e9c1c48(arg0, arg1, arg2, arg3) {
    arg0.bufferSubData(arg1 >>> 0, arg2, arg3);
}
export function __wbg_bufferSubData_ce9854d3d337e2cf(arg0, arg1, arg2, arg3) {
    arg0.bufferSubData(arg1 >>> 0, arg2, arg3);
}
export function __wbg_call_8a2dd23819f8a60a() { return handleError(function (arg0, arg1) {
    const ret = arg0.call(arg1);
    return ret;
}, arguments); }
export function __wbg_call_a6e5c5dce5018821() { return handleError(function (arg0, arg1, arg2) {
    const ret = arg0.call(arg1, arg2);
    return ret;
}, arguments); }
export function __wbg_clearBufferfv_2e0f1a0ea56de859(arg0, arg1, arg2, arg3, arg4) {
    arg0.clearBufferfv(arg1 >>> 0, arg2, getArrayF32FromWasm0(arg3, arg4));
}
export function __wbg_clearBufferiv_0360269bf6e34c54(arg0, arg1, arg2, arg3, arg4) {
    arg0.clearBufferiv(arg1 >>> 0, arg2, getArrayI32FromWasm0(arg3, arg4));
}
export function __wbg_clearBufferuiv_df94a395d4915377(arg0, arg1, arg2, arg3, arg4) {
    arg0.clearBufferuiv(arg1 >>> 0, arg2, getArrayU32FromWasm0(arg3, arg4));
}
export function __wbg_clearDepth_8b5d226aae155082(arg0, arg1) {
    arg0.clearDepth(arg1);
}
export function __wbg_clearDepth_ca9b22d41551b513(arg0, arg1) {
    arg0.clearDepth(arg1);
}
export function __wbg_clearStencil_58f2af46612bccae(arg0, arg1) {
    arg0.clearStencil(arg1);
}
export function __wbg_clearStencil_a66fe23df6313fc7(arg0, arg1) {
    arg0.clearStencil(arg1);
}
export function __wbg_clear_53d71d234e14e4c1(arg0, arg1) {
    arg0.clear(arg1 >>> 0);
}
export function __wbg_clear_dd06a0da4ce8e13f(arg0, arg1) {
    arg0.clear(arg1 >>> 0);
}
export function __wbg_clientWaitSync_cf8e49f8ba228377(arg0, arg1, arg2, arg3) {
    const ret = arg0.clientWaitSync(arg1, arg2 >>> 0, arg3 >>> 0);
    return ret;
}
export function __wbg_colorMask_44ebb91cad2502f2(arg0, arg1, arg2, arg3, arg4) {
    arg0.colorMask(arg1 !== 0, arg2 !== 0, arg3 !== 0, arg4 !== 0);
}
export function __wbg_colorMask_a4d164c2039b5731(arg0, arg1, arg2, arg3, arg4) {
    arg0.colorMask(arg1 !== 0, arg2 !== 0, arg3 !== 0, arg4 !== 0);
}
export function __wbg_compileShader_9bdfd792722cf704(arg0, arg1) {
    arg0.compileShader(arg1);
}
export function __wbg_compileShader_fc2e4b73240d4fd7(arg0, arg1) {
    arg0.compileShader(arg1);
}
export function __wbg_compressedTexSubImage2D_c1362291573c7268(arg0, arg1, arg2, arg3, arg4, arg5, arg6, arg7, arg8, arg9) {
    arg0.compressedTexSubImage2D(arg1 >>> 0, arg2, arg3, arg4, arg5, arg6, arg7 >>> 0, arg8, arg9);
}
export function __wbg_compressedTexSubImage2D_da01674d2975d1ae(arg0, arg1, arg2, arg3, arg4, arg5, arg6, arg7, arg8) {
    arg0.compressedTexSubImage2D(arg1 >>> 0, arg2, arg3, arg4, arg5, arg6, arg7 >>> 0, arg8);
}
export function __wbg_compressedTexSubImage2D_dd6dc580749eb5cf(arg0, arg1, arg2, arg3, arg4, arg5, arg6, arg7, arg8) {
    arg0.compressedTexSubImage2D(arg1 >>> 0, arg2, arg3, arg4, arg5, arg6, arg7 >>> 0, arg8);
}
export function __wbg_compressedTexSubImage3D_04cb8b046c4321fe(arg0, arg1, arg2, arg3, arg4, arg5, arg6, arg7, arg8, arg9, arg10, arg11) {
    arg0.compressedTexSubImage3D(arg1 >>> 0, arg2, arg3, arg4, arg5, arg6, arg7, arg8, arg9 >>> 0, arg10, arg11);
}
export function __wbg_compressedTexSubImage3D_af0228a80ffd5993(arg0, arg1, arg2, arg3, arg4, arg5, arg6, arg7, arg8, arg9, arg10) {
    arg0.compressedTexSubImage3D(arg1 >>> 0, arg2, arg3, arg4, arg5, arg6, arg7, arg8, arg9 >>> 0, arg10);
}
export function __wbg_configure_3d64c677c7d68a15() { return handleError(function (arg0, arg1) {
    arg0.configure(arg1);
}, arguments); }
export function __wbg_copyBufferSubData_cdf61f74aa6e0902(arg0, arg1, arg2, arg3, arg4, arg5) {
    arg0.copyBufferSubData(arg1 >>> 0, arg2 >>> 0, arg3, arg4, arg5);
}
export function __wbg_copyExternalImageToTexture_b8c12db525cb7f31() { return handleError(function (arg0, arg1, arg2, arg3) {
    arg0.copyExternalImageToTexture(arg1, arg2, arg3);
}, arguments); }
export function __wbg_copyTexSubImage2D_8daea651fc408645(arg0, arg1, arg2, arg3, arg4, arg5, arg6, arg7, arg8) {
    arg0.copyTexSubImage2D(arg1 >>> 0, arg2, arg3, arg4, arg5, arg6, arg7, arg8);
}
export function __wbg_copyTexSubImage2D_c73f91f1d7022402(arg0, arg1, arg2, arg3, arg4, arg5, arg6, arg7, arg8) {
    arg0.copyTexSubImage2D(arg1 >>> 0, arg2, arg3, arg4, arg5, arg6, arg7, arg8);
}
export function __wbg_copyTexSubImage3D_bfe7a14dac9ad777(arg0, arg1, arg2, arg3, arg4, arg5, arg6, arg7, arg8, arg9) {
    arg0.copyTexSubImage3D(arg1 >>> 0, arg2, arg3, arg4, arg5, arg6, arg7, arg8, arg9);
}
export function __wbg_copyTextureToBuffer_4186c16aef1922a5() { return handleError(function (arg0, arg1, arg2, arg3) {
    arg0.copyTextureToBuffer(arg1, arg2, arg3);
}, arguments); }
export function __wbg_createBindGroupLayout_9ea1a44942aaf13e() { return handleError(function (arg0, arg1) {
    const ret = arg0.createBindGroupLayout(arg1);
    return ret;
}, arguments); }
export function __wbg_createBindGroup_2320df4db188406c(arg0, arg1) {
    const ret = arg0.createBindGroup(arg1);
    return ret;
}
export function __wbg_createBuffer_01568a9d930d90dd(arg0) {
    const ret = arg0.createBuffer();
    return isLikeNone(ret) ? 0 : addToExternrefTable0(ret);
}
export function __wbg_createBuffer_2075765bde5035d5(arg0) {
    const ret = arg0.createBuffer();
    return isLikeNone(ret) ? 0 : addToExternrefTable0(ret);
}
export function __wbg_createBuffer_2f08c0205e04efca() { return handleError(function (arg0, arg1) {
    const ret = arg0.createBuffer(arg1);
    return ret;
}, arguments); }
export function __wbg_createCommandEncoder_cd88faca35d9ed68(arg0, arg1) {
    const ret = arg0.createCommandEncoder(arg1);
    return ret;
}
export function __wbg_createElement_fcbc0805de826d62() { return handleError(function (arg0, arg1, arg2) {
    const ret = arg0.createElement(getStringFromWasm0(arg1, arg2));
    return ret;
}, arguments); }
export function __wbg_createFramebuffer_b24d2c80a8b9e7cc(arg0) {
    const ret = arg0.createFramebuffer();
    return isLikeNone(ret) ? 0 : addToExternrefTable0(ret);
}
export function __wbg_createFramebuffer_de0d521f546e7534(arg0) {
    const ret = arg0.createFramebuffer();
    return isLikeNone(ret) ? 0 : addToExternrefTable0(ret);
}
export function __wbg_createPipelineLayout_7a186f2e9bf0d605(arg0, arg1) {
    const ret = arg0.createPipelineLayout(arg1);
    return ret;
}
export function __wbg_createProgram_118becaac3a20318(arg0) {
    const ret = arg0.createProgram();
    return isLikeNone(ret) ? 0 : addToExternrefTable0(ret);
}
export function __wbg_createProgram_538c9777a4ac084f(arg0) {
    const ret = arg0.createProgram();
    return isLikeNone(ret) ? 0 : addToExternrefTable0(ret);
}
export function __wbg_createQuery_047c7c524e4ac4f8(arg0) {
    const ret = arg0.createQuery();
    return isLikeNone(ret) ? 0 : addToExternrefTable0(ret);
}
export function __wbg_createRenderPipeline_f48187ba9f7701e8() { return handleError(function (arg0, arg1) {
    const ret = arg0.createRenderPipeline(arg1);
    return ret;
}, arguments); }
export function __wbg_createRenderbuffer_71af5c0d615e9271(arg0) {
    const ret = arg0.createRenderbuffer();
    return isLikeNone(ret) ? 0 : addToExternrefTable0(ret);
}
export function __wbg_createRenderbuffer_9d801bf44c314f44(arg0) {
    const ret = arg0.createRenderbuffer();
    return isLikeNone(ret) ? 0 : addToExternrefTable0(ret);
}
export function __wbg_createSampler_248bd67c920af37d(arg0, arg1) {
    const ret = arg0.createSampler(arg1);
    return ret;
}
export function __wbg_createSampler_70c8392d98896235(arg0) {
    const ret = arg0.createSampler();
    return isLikeNone(ret) ? 0 : addToExternrefTable0(ret);
}
export function __wbg_createShaderModule_53701de4fb271c90(arg0, arg1) {
    const ret = arg0.createShaderModule(arg1);
    return ret;
}
export function __wbg_createShader_78bc8b7e9a88e1a8(arg0, arg1) {
    const ret = arg0.createShader(arg1 >>> 0);
    return isLikeNone(ret) ? 0 : addToExternrefTable0(ret);
}
export function __wbg_createShader_7d139f2d50f77365(arg0, arg1) {
    const ret = arg0.createShader(arg1 >>> 0);
    return isLikeNone(ret) ? 0 : addToExternrefTable0(ret);
}
export function __wbg_createTexture_0ee0fa5f924f3d14(arg0) {
    const ret = arg0.createTexture();
    return isLikeNone(ret) ? 0 : addToExternrefTable0(ret);
}
export function __wbg_createTexture_9e76b80a2dc0d12e() { return handleError(function (arg0, arg1) {
    const ret = arg0.createTexture(arg1);
    return ret;
}, arguments); }
export function __wbg_createTexture_d13f98e0d3d912f4(arg0) {
    const ret = arg0.createTexture();
    return isLikeNone(ret) ? 0 : addToExternrefTable0(ret);
}
export function __wbg_createVertexArrayOES_2fa3e59eebd5f674(arg0) {
    const ret = arg0.createVertexArrayOES();
    return isLikeNone(ret) ? 0 : addToExternrefTable0(ret);
}
export function __wbg_createVertexArray_baf9eef7ea5a2c7a(arg0) {
    const ret = arg0.createVertexArray();
    return isLikeNone(ret) ? 0 : addToExternrefTable0(ret);
}
export function __wbg_createView_cc96b5bdd3d5bf5e() { return handleError(function (arg0, arg1) {
    const ret = arg0.createView(arg1);
    return ret;
}, arguments); }
export function __wbg_cullFace_62bbea3bef0e6b99(arg0, arg1) {
    arg0.cullFace(arg1 >>> 0);
}
export function __wbg_cullFace_f1c75ae19b07eaf3(arg0, arg1) {
    arg0.cullFace(arg1 >>> 0);
}
export function __wbg_data_d6abbdd903c05db4(arg0, arg1) {
    const ret = arg1.data;
    const ptr1 = passArray8ToWasm0(ret, wasm.__wbindgen_malloc);
    const len1 = WASM_VECTOR_LEN;
    getDataViewMemory0().setInt32(arg0 + 4 * 1, len1, true);
    getDataViewMemory0().setInt32(arg0 + 4 * 0, ptr1, true);
}
export function __wbg_deleteBuffer_08eb938e35c27967(arg0, arg1) {
    arg0.deleteBuffer(arg1);
}
export function __wbg_deleteBuffer_1ca3ffe668a488e7(arg0, arg1) {
    arg0.deleteBuffer(arg1);
}
export function __wbg_deleteFramebuffer_963cd69957209d37(arg0, arg1) {
    arg0.deleteFramebuffer(arg1);
}
export function __wbg_deleteFramebuffer_d1a36e889b009344(arg0, arg1) {
    arg0.deleteFramebuffer(arg1);
}
export function __wbg_deleteProgram_09bd45a51105b2f6(arg0, arg1) {
    arg0.deleteProgram(arg1);
}
export function __wbg_deleteProgram_132e191baa9fa84f(arg0, arg1) {
    arg0.deleteProgram(arg1);
}
export function __wbg_deleteQuery_0d1dcc4402a86ee1(arg0, arg1) {
    arg0.deleteQuery(arg1);
}
export function __wbg_deleteRenderbuffer_52bdbf5ab2cbe62a(arg0, arg1) {
    arg0.deleteRenderbuffer(arg1);
}
export function __wbg_deleteRenderbuffer_ca999f7883b777af(arg0, arg1) {
    arg0.deleteRenderbuffer(arg1);
}
export function __wbg_deleteSampler_0abb528566c4ab3b(arg0, arg1) {
    arg0.deleteSampler(arg1);
}
export function __wbg_deleteShader_3120790d36063afe(arg0, arg1) {
    arg0.deleteShader(arg1);
}
export function __wbg_deleteShader_993edb4beb3c4d53(arg0, arg1) {
    arg0.deleteShader(arg1);
}
export function __wbg_deleteSync_9b0e43580942a0f6(arg0, arg1) {
    arg0.deleteSync(arg1);
}
export function __wbg_deleteTexture_2b163b157ea1be24(arg0, arg1) {
    arg0.deleteTexture(arg1);
}
export function __wbg_deleteTexture_bdc2202d7a50dcea(arg0, arg1) {
    arg0.deleteTexture(arg1);
}
export function __wbg_deleteVertexArrayOES_7fa59c32cfdfa6fa(arg0, arg1) {
    arg0.deleteVertexArrayOES(arg1);
}
export function __wbg_deleteVertexArray_475d4e969aac1dd0(arg0, arg1) {
    arg0.deleteVertexArray(arg1);
}
export function __wbg_depthFunc_455cfeb8a9d2fb4c(arg0, arg1) {
    arg0.depthFunc(arg1 >>> 0);
}
export function __wbg_depthFunc_74a8f8acf8973c86(arg0, arg1) {
    arg0.depthFunc(arg1 >>> 0);
}
export function __wbg_depthMask_4bd6c73b1339d257(arg0, arg1) {
    arg0.depthMask(arg1 !== 0);
}
export function __wbg_depthMask_a644a67deced3257(arg0, arg1) {
    arg0.depthMask(arg1 !== 0);
}
export function __wbg_depthRange_38b2287ffbea14fd(arg0, arg1, arg2) {
    arg0.depthRange(arg1, arg2);
}
export function __wbg_depthRange_5e90d4d236280ff5(arg0, arg1, arg2) {
    arg0.depthRange(arg1, arg2);
}
export function __wbg_description_18d0a6d4077fec8e(arg0, arg1) {
    const ret = arg1.description;
    const ptr1 = passStringToWasm0(ret, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
    const len1 = WASM_VECTOR_LEN;
    getDataViewMemory0().setInt32(arg0 + 4 * 1, len1, true);
    getDataViewMemory0().setInt32(arg0 + 4 * 0, ptr1, true);
}
export function __wbg_destroy_b5b39f25f0799295(arg0) {
    arg0.destroy();
}
export function __wbg_disableVertexAttribArray_160060fbd7e97de0(arg0, arg1) {
    arg0.disableVertexAttribArray(arg1 >>> 0);
}
export function __wbg_disableVertexAttribArray_c7915eb0de6dd8f1(arg0, arg1) {
    arg0.disableVertexAttribArray(arg1 >>> 0);
}
export function __wbg_disable_1659d1b7d50c31e7(arg0, arg1) {
    arg0.disable(arg1 >>> 0);
}
export function __wbg_disable_40c3975167c1ee07(arg0, arg1) {
    arg0.disable(arg1 >>> 0);
}
export function __wbg_document_179650d6cb13c263(arg0) {
    const ret = arg0.document;
    return isLikeNone(ret) ? 0 : addToExternrefTable0(ret);
}
export function __wbg_done_89b2b13e91a60321(arg0) {
    const ret = arg0.done;
    return ret;
}
export function __wbg_drawArraysInstancedANGLE_d58dbd2d38fdebaa(arg0, arg1, arg2, arg3, arg4) {
    arg0.drawArraysInstancedANGLE(arg1 >>> 0, arg2, arg3, arg4);
}
export function __wbg_drawArraysInstanced_51b161548a3f10c4(arg0, arg1, arg2, arg3, arg4) {
    arg0.drawArraysInstanced(arg1 >>> 0, arg2, arg3, arg4);
}
export function __wbg_drawArrays_676becae0149ed65(arg0, arg1, arg2, arg3) {
    arg0.drawArrays(arg1 >>> 0, arg2, arg3);
}
export function __wbg_drawArrays_b0c59a6e158122f2(arg0, arg1, arg2, arg3) {
    arg0.drawArrays(arg1 >>> 0, arg2, arg3);
}
export function __wbg_drawBuffersWEBGL_c9b47f7f207125cf(arg0, arg1) {
    arg0.drawBuffersWEBGL(arg1);
}
export function __wbg_drawBuffers_1c1ec9b292442a2a(arg0, arg1) {
    arg0.drawBuffers(arg1);
}
export function __wbg_drawElementsInstancedANGLE_9b58c4013373b180(arg0, arg1, arg2, arg3, arg4, arg5) {
    arg0.drawElementsInstancedANGLE(arg1 >>> 0, arg2, arg3 >>> 0, arg4, arg5);
}
export function __wbg_drawElementsInstanced_c7f96ea02e6d5326(arg0, arg1, arg2, arg3, arg4, arg5) {
    arg0.drawElementsInstanced(arg1 >>> 0, arg2, arg3 >>> 0, arg4, arg5);
}
export function __wbg_draw_ad0811de56a2d768(arg0, arg1, arg2, arg3, arg4) {
    arg0.draw(arg1 >>> 0, arg2 >>> 0, arg3 >>> 0, arg4 >>> 0);
}
export function __wbg_enableVertexAttribArray_4c08219124740f14(arg0, arg1) {
    arg0.enableVertexAttribArray(arg1 >>> 0);
}
export function __wbg_enableVertexAttribArray_7470ba2dcf2606e3(arg0, arg1) {
    arg0.enableVertexAttribArray(arg1 >>> 0);
}
export function __wbg_enable_28bbeed576131d1f(arg0, arg1) {
    arg0.enable(arg1 >>> 0);
}
export function __wbg_enable_611804c0ac1504ce(arg0, arg1) {
    arg0.enable(arg1 >>> 0);
}
export function __wbg_endQuery_a50f7fc49cfe56e9(arg0, arg1) {
    arg0.endQuery(arg1 >>> 0);
}
export function __wbg_end_414453a89205612c(arg0) {
    arg0.end();
}
export function __wbg_entries_015dc610cd81ede0(arg0) {
    const ret = Object.entries(arg0);
    return ret;
}
export function __wbg_error_a6fa202b58aa1cd3(arg0, arg1) {
    let deferred0_0;
    let deferred0_1;
    try {
        deferred0_0 = arg0;
        deferred0_1 = arg1;
        console.error(getStringFromWasm0(arg0, arg1));
    } finally {
        wasm.__wbindgen_free(deferred0_0, deferred0_1, 1);
    }
}
export function __wbg_fenceSync_fe2cdba4a0d73679(arg0, arg1, arg2) {
    const ret = arg0.fenceSync(arg1 >>> 0, arg2 >>> 0);
    return isLikeNone(ret) ? 0 : addToExternrefTable0(ret);
}
export function __wbg_finish_087cb89c65c06eb1(arg0) {
    const ret = arg0.finish();
    return ret;
}
export function __wbg_finish_cfaeede3baf55be1(arg0, arg1) {
    const ret = arg0.finish(arg1);
    return ret;
}
export function __wbg_flush_db77b4a63d6b337d(arg0) {
    arg0.flush();
}
export function __wbg_flush_e03c08da6863b5ab(arg0) {
    arg0.flush();
}
export function __wbg_framebufferRenderbuffer_4404cf9f9cb76937(arg0, arg1, arg2, arg3, arg4) {
    arg0.framebufferRenderbuffer(arg1 >>> 0, arg2 >>> 0, arg3 >>> 0, arg4);
}
export function __wbg_framebufferRenderbuffer_ba8bd5e008ee87eb(arg0, arg1, arg2, arg3, arg4) {
    arg0.framebufferRenderbuffer(arg1 >>> 0, arg2 >>> 0, arg3 >>> 0, arg4);
}
export function __wbg_framebufferTexture2D_3c2abd606fc53f31(arg0, arg1, arg2, arg3, arg4, arg5) {
    arg0.framebufferTexture2D(arg1 >>> 0, arg2 >>> 0, arg3 >>> 0, arg4, arg5);
}
export function __wbg_framebufferTexture2D_e1fb64212fcda219(arg0, arg1, arg2, arg3, arg4, arg5) {
    arg0.framebufferTexture2D(arg1 >>> 0, arg2 >>> 0, arg3 >>> 0, arg4, arg5);
}
export function __wbg_framebufferTextureLayer_f2d9db097bfbb863(arg0, arg1, arg2, arg3, arg4, arg5) {
    arg0.framebufferTextureLayer(arg1 >>> 0, arg2 >>> 0, arg3, arg4, arg5);
}
export function __wbg_framebufferTextureMultiviewOVR_28d492b9dc484220(arg0, arg1, arg2, arg3, arg4, arg5, arg6) {
    arg0.framebufferTextureMultiviewOVR(arg1 >>> 0, arg2 >>> 0, arg3, arg4, arg5, arg6);
}
export function __wbg_frontFace_29ef7151de8b5ed9(arg0, arg1) {
    arg0.frontFace(arg1 >>> 0);
}
export function __wbg_frontFace_fc6d98dafa42de87(arg0, arg1) {
    arg0.frontFace(arg1 >>> 0);
}
export function __wbg_getBufferSubData_11018928c908ac2c(arg0, arg1, arg2, arg3) {
    arg0.getBufferSubData(arg1 >>> 0, arg2, arg3);
}
export function __wbg_getContext_7476e39fa008047e() { return handleError(function (arg0, arg1, arg2, arg3) {
    const ret = arg0.getContext(getStringFromWasm0(arg1, arg2), arg3);
    return isLikeNone(ret) ? 0 : addToExternrefTable0(ret);
}, arguments); }
export function __wbg_getContext_ca12bb65aab778a4() { return handleError(function (arg0, arg1, arg2, arg3) {
    const ret = arg0.getContext(getStringFromWasm0(arg1, arg2), arg3);
    return isLikeNone(ret) ? 0 : addToExternrefTable0(ret);
}, arguments); }
export function __wbg_getContext_e79ddf6a9cb3cc76() { return handleError(function (arg0, arg1, arg2) {
    const ret = arg0.getContext(getStringFromWasm0(arg1, arg2));
    return isLikeNone(ret) ? 0 : addToExternrefTable0(ret);
}, arguments); }
export function __wbg_getContext_fd298c901058eb31() { return handleError(function (arg0, arg1, arg2) {
    const ret = arg0.getContext(getStringFromWasm0(arg1, arg2));
    return isLikeNone(ret) ? 0 : addToExternrefTable0(ret);
}, arguments); }
export function __wbg_getCurrentTexture_51975ae7185fd15f() { return handleError(function (arg0) {
    const ret = arg0.getCurrentTexture();
    return ret;
}, arguments); }
export function __wbg_getExtension_101c7e41de3e4d90() { return handleError(function (arg0, arg1, arg2) {
    const ret = arg0.getExtension(getStringFromWasm0(arg1, arg2));
    return isLikeNone(ret) ? 0 : addToExternrefTable0(ret);
}, arguments); }
export function __wbg_getImageData_dde272ef8dd682f4() { return handleError(function (arg0, arg1, arg2, arg3, arg4) {
    const ret = arg0.getImageData(arg1, arg2, arg3, arg4);
    return ret;
}, arguments); }
export function __wbg_getIndexedParameter_6d7a5bcccaa0f3e2() { return handleError(function (arg0, arg1, arg2) {
    const ret = arg0.getIndexedParameter(arg1 >>> 0, arg2 >>> 0);
    return ret;
}, arguments); }
export function __wbg_getMappedRange_5ed22727c9679168() { return handleError(function (arg0, arg1, arg2) {
    const ret = arg0.getMappedRange(arg1, arg2);
    return ret;
}, arguments); }
export function __wbg_getParameter_039a5899307fab55() { return handleError(function (arg0, arg1) {
    const ret = arg0.getParameter(arg1 >>> 0);
    return ret;
}, arguments); }
export function __wbg_getParameter_d39f59581389af1b() { return handleError(function (arg0, arg1) {
    const ret = arg0.getParameter(arg1 >>> 0);
    return ret;
}, arguments); }
export function __wbg_getPreferredCanvasFormat_1b8495aeb1d11ab1(arg0) {
    const ret = arg0.getPreferredCanvasFormat();
    return (__wbindgen_enum_GpuTextureFormat.indexOf(ret) + 1 || 96) - 1;
}
export function __wbg_getProgramInfoLog_c4762e0513468a26(arg0, arg1, arg2) {
    const ret = arg1.getProgramInfoLog(arg2);
    var ptr1 = isLikeNone(ret) ? 0 : passStringToWasm0(ret, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
    var len1 = WASM_VECTOR_LEN;
    getDataViewMemory0().setInt32(arg0 + 4 * 1, len1, true);
    getDataViewMemory0().setInt32(arg0 + 4 * 0, ptr1, true);
}
export function __wbg_getProgramInfoLog_d1ce570463a68779(arg0, arg1, arg2) {
    const ret = arg1.getProgramInfoLog(arg2);
    var ptr1 = isLikeNone(ret) ? 0 : passStringToWasm0(ret, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
    var len1 = WASM_VECTOR_LEN;
    getDataViewMemory0().setInt32(arg0 + 4 * 1, len1, true);
    getDataViewMemory0().setInt32(arg0 + 4 * 0, ptr1, true);
}
export function __wbg_getProgramParameter_b9995b56c258ac86(arg0, arg1, arg2) {
    const ret = arg0.getProgramParameter(arg1, arg2 >>> 0);
    return ret;
}
export function __wbg_getProgramParameter_c8d1154fbb3c0890(arg0, arg1, arg2) {
    const ret = arg0.getProgramParameter(arg1, arg2 >>> 0);
    return ret;
}
export function __wbg_getQueryParameter_919125495ccb17ca(arg0, arg1, arg2) {
    const ret = arg0.getQueryParameter(arg1, arg2 >>> 0);
    return ret;
}
export function __wbg_getShaderInfoLog_5cee2add982c7165(arg0, arg1, arg2) {
    const ret = arg1.getShaderInfoLog(arg2);
    var ptr1 = isLikeNone(ret) ? 0 : passStringToWasm0(ret, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
    var len1 = WASM_VECTOR_LEN;
    getDataViewMemory0().setInt32(arg0 + 4 * 1, len1, true);
    getDataViewMemory0().setInt32(arg0 + 4 * 0, ptr1, true);
}
export function __wbg_getShaderInfoLog_bc236afe696c1283(arg0, arg1, arg2) {
    const ret = arg1.getShaderInfoLog(arg2);
    var ptr1 = isLikeNone(ret) ? 0 : passStringToWasm0(ret, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
    var len1 = WASM_VECTOR_LEN;
    getDataViewMemory0().setInt32(arg0 + 4 * 1, len1, true);
    getDataViewMemory0().setInt32(arg0 + 4 * 0, ptr1, true);
}
export function __wbg_getShaderParameter_3394e75dcb97f380(arg0, arg1, arg2) {
    const ret = arg0.getShaderParameter(arg1, arg2 >>> 0);
    return ret;
}
export function __wbg_getShaderParameter_cbcc0995e8e16214(arg0, arg1, arg2) {
    const ret = arg0.getShaderParameter(arg1, arg2 >>> 0);
    return ret;
}
export function __wbg_getSupportedExtensions_2a7458ec45e82560(arg0) {
    const ret = arg0.getSupportedExtensions();
    return isLikeNone(ret) ? 0 : addToExternrefTable0(ret);
}
export function __wbg_getSupportedProfiles_90a4f330938d0241(arg0) {
    const ret = arg0.getSupportedProfiles();
    return isLikeNone(ret) ? 0 : addToExternrefTable0(ret);
}
export function __wbg_getSyncParameter_d8f6c145657a3550(arg0, arg1, arg2) {
    const ret = arg0.getSyncParameter(arg1, arg2 >>> 0);
    return ret;
}
export function __wbg_getUniformBlockIndex_cfee6ff6d323c784(arg0, arg1, arg2, arg3) {
    const ret = arg0.getUniformBlockIndex(arg1, getStringFromWasm0(arg2, arg3));
    return ret;
}
export function __wbg_getUniformLocation_24ef46cdda2148ab(arg0, arg1, arg2, arg3) {
    const ret = arg0.getUniformLocation(arg1, getStringFromWasm0(arg2, arg3));
    return isLikeNone(ret) ? 0 : addToExternrefTable0(ret);
}
export function __wbg_getUniformLocation_788a34295dd6fabe(arg0, arg1, arg2, arg3) {
    const ret = arg0.getUniformLocation(arg1, getStringFromWasm0(arg2, arg3));
    return isLikeNone(ret) ? 0 : addToExternrefTable0(ret);
}
export function __wbg_get_507a50627bffa49b(arg0, arg1) {
    const ret = arg0[arg1 >>> 0];
    return ret;
}
export function __wbg_get_78f252d074a84d0b() { return handleError(function (arg0, arg1) {
    const ret = Reflect.get(arg0, arg1);
    return ret;
}, arguments); }
export function __wbg_get_b2053e9bfdf3ca8e(arg0, arg1) {
    const ret = arg0[arg1 >>> 0];
    return isLikeNone(ret) ? 0 : addToExternrefTable0(ret);
}
export function __wbg_get_c7eb1f358a7654df() { return handleError(function (arg0, arg1) {
    const ret = Reflect.get(arg0, arg1);
    return ret;
}, arguments); }
export function __wbg_get_unchecked_6e0ad6d2a41b06f6(arg0, arg1) {
    const ret = arg0[arg1 >>> 0];
    return ret;
}
export function __wbg_get_with_ref_key_6412cf3094599694(arg0, arg1) {
    const ret = arg0[arg1];
    return ret;
}
export function __wbg_gpu_a7c12045c25d009a(arg0) {
    const ret = arg0.gpu;
    return ret;
}
export function __wbg_height_1ac64d880e0a71ae(arg0) {
    const ret = arg0.height;
    return ret;
}
export function __wbg_height_46f95580d0507f0a(arg0) {
    const ret = arg0.height;
    return ret;
}
export function __wbg_height_5b881707f59cdee5(arg0) {
    const ret = arg0.height;
    return ret;
}
export function __wbg_height_6eec812c213259a1(arg0) {
    const ret = arg0.height;
    return ret;
}
export function __wbg_height_f2cc35b336f266f1(arg0) {
    const ret = arg0.height;
    return ret;
}
export function __wbg_includes_78c9a3115b08eddc(arg0, arg1, arg2) {
    const ret = arg0.includes(arg1, arg2);
    return ret;
}
export function __wbg_info_22dcf1fd1b12bc7d(arg0) {
    const ret = arg0.info;
    return ret;
}
export function __wbg_instanceof_ArrayBuffer_4480b9e0068a8adb(arg0) {
    let result;
    try {
        result = arg0 instanceof ArrayBuffer;
    } catch (_) {
        result = false;
    }
    const ret = result;
    return ret;
}
export function __wbg_instanceof_GpuAdapter_fc7b89fc546de0bc(arg0) {
    let result;
    try {
        result = arg0 instanceof GPUAdapter;
    } catch (_) {
        result = false;
    }
    const ret = result;
    return ret;
}
export function __wbg_instanceof_GpuCanvasContext_1a39fd0621603553(arg0) {
    let result;
    try {
        result = arg0 instanceof GPUCanvasContext;
    } catch (_) {
        result = false;
    }
    const ret = result;
    return ret;
}
export function __wbg_instanceof_HtmlCanvasElement_ed02ed9136056019(arg0) {
    let result;
    try {
        result = arg0 instanceof HTMLCanvasElement;
    } catch (_) {
        result = false;
    }
    const ret = result;
    return ret;
}
export function __wbg_instanceof_Map_e5b5e3db98422fcc(arg0) {
    let result;
    try {
        result = arg0 instanceof Map;
    } catch (_) {
        result = false;
    }
    const ret = result;
    return ret;
}
export function __wbg_instanceof_Object_33f20e6f12439f3e(arg0) {
    let result;
    try {
        result = arg0 instanceof Object;
    } catch (_) {
        result = false;
    }
    const ret = result;
    return ret;
}
export function __wbg_instanceof_OffscreenCanvas_6d10a4c8fe267acb(arg0) {
    let result;
    try {
        result = arg0 instanceof OffscreenCanvas;
    } catch (_) {
        result = false;
    }
    const ret = result;
    return ret;
}
export function __wbg_instanceof_Uint8Array_309b927aaf7a3fc7(arg0) {
    let result;
    try {
        result = arg0 instanceof Uint8Array;
    } catch (_) {
        result = false;
    }
    const ret = result;
    return ret;
}
export function __wbg_instanceof_WebGl2RenderingContext_90225152e4e3c799(arg0) {
    let result;
    try {
        result = arg0 instanceof WebGL2RenderingContext;
    } catch (_) {
        result = false;
    }
    const ret = result;
    return ret;
}
export function __wbg_instanceof_Window_05ba1ee4f6781663(arg0) {
    let result;
    try {
        result = arg0 instanceof Window;
    } catch (_) {
        result = false;
    }
    const ret = result;
    return ret;
}
export function __wbg_invalidateFramebuffer_343bbfb15e6835fd() { return handleError(function (arg0, arg1, arg2) {
    arg0.invalidateFramebuffer(arg1 >>> 0, arg2);
}, arguments); }
export function __wbg_isArray_0677c962b281d01a(arg0) {
    const ret = Array.isArray(arg0);
    return ret;
}
export function __wbg_isSafeInteger_04f36e4056f1b851(arg0) {
    const ret = Number.isSafeInteger(arg0);
    return ret;
}
export function __wbg_is_7b9d0b289033c7de(arg0, arg1) {
    const ret = Object.is(arg0, arg1);
    return ret;
}
export function __wbg_iterator_6f722e4a93058b71() {
    const ret = Symbol.iterator;
    return ret;
}
export function __wbg_label_47480289cc2bce71(arg0, arg1) {
    const ret = arg1.label;
    const ptr1 = passStringToWasm0(ret, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
    const len1 = WASM_VECTOR_LEN;
    getDataViewMemory0().setInt32(arg0 + 4 * 1, len1, true);
    getDataViewMemory0().setInt32(arg0 + 4 * 0, ptr1, true);
}
export function __wbg_length_1f0964f4a5e2c6d8(arg0) {
    const ret = arg0.length;
    return ret;
}
export function __wbg_length_370319915dc99107(arg0) {
    const ret = arg0.length;
    return ret;
}
export function __wbg_limits_50a8c5e629dbfe40(arg0) {
    const ret = arg0.limits;
    return ret;
}
export function __wbg_linkProgram_4e047fb3197a0348(arg0, arg1) {
    arg0.linkProgram(arg1);
}
export function __wbg_linkProgram_d7c71c539c8c6a43(arg0, arg1) {
    arg0.linkProgram(arg1);
}
export function __wbg_mapAsync_bb0029907dd91181(arg0, arg1, arg2, arg3) {
    const ret = arg0.mapAsync(arg1 >>> 0, arg2, arg3);
    return ret;
}
export function __wbg_maxBindGroups_14611ac9ed1c6b56(arg0) {
    const ret = arg0.maxBindGroups;
    return ret;
}
export function __wbg_maxBindingsPerBindGroup_dd3f66044d2a9bfb(arg0) {
    const ret = arg0.maxBindingsPerBindGroup;
    return ret;
}
export function __wbg_maxBufferSize_f7ce3e1856349d2f(arg0) {
    const ret = arg0.maxBufferSize;
    return ret;
}
export function __wbg_maxColorAttachmentBytesPerSample_55e64194645ea041(arg0) {
    const ret = arg0.maxColorAttachmentBytesPerSample;
    return ret;
}
export function __wbg_maxColorAttachments_fd9187f9f786da18(arg0) {
    const ret = arg0.maxColorAttachments;
    return ret;
}
export function __wbg_maxComputeInvocationsPerWorkgroup_9b3b1fc261129782(arg0) {
    const ret = arg0.maxComputeInvocationsPerWorkgroup;
    return ret;
}
export function __wbg_maxComputeWorkgroupSizeX_c55bbbcc02b75241(arg0) {
    const ret = arg0.maxComputeWorkgroupSizeX;
    return ret;
}
export function __wbg_maxComputeWorkgroupSizeY_96f40b1ec3102a3a(arg0) {
    const ret = arg0.maxComputeWorkgroupSizeY;
    return ret;
}
export function __wbg_maxComputeWorkgroupSizeZ_c2b1061d521561bb(arg0) {
    const ret = arg0.maxComputeWorkgroupSizeZ;
    return ret;
}
export function __wbg_maxComputeWorkgroupStorageSize_fac26e89d99e08f9(arg0) {
    const ret = arg0.maxComputeWorkgroupStorageSize;
    return ret;
}
export function __wbg_maxComputeWorkgroupsPerDimension_cd001f910e9b4d70(arg0) {
    const ret = arg0.maxComputeWorkgroupsPerDimension;
    return ret;
}
export function __wbg_maxDynamicStorageBuffersPerPipelineLayout_29399b82af020d86(arg0) {
    const ret = arg0.maxDynamicStorageBuffersPerPipelineLayout;
    return ret;
}
export function __wbg_maxDynamicUniformBuffersPerPipelineLayout_6d6cf80f3bd08e52(arg0) {
    const ret = arg0.maxDynamicUniformBuffersPerPipelineLayout;
    return ret;
}
export function __wbg_maxInterStageShaderVariables_8b000f47a166b1d5(arg0) {
    const ret = arg0.maxInterStageShaderVariables;
    return ret;
}
export function __wbg_maxSampledTexturesPerShaderStage_618a49f33217dde2(arg0) {
    const ret = arg0.maxSampledTexturesPerShaderStage;
    return ret;
}
export function __wbg_maxSamplersPerShaderStage_aa09fa0311712a1a(arg0) {
    const ret = arg0.maxSamplersPerShaderStage;
    return ret;
}
export function __wbg_maxStorageBufferBindingSize_0ec83ae10ad73180(arg0) {
    const ret = arg0.maxStorageBufferBindingSize;
    return ret;
}
export function __wbg_maxStorageBuffersPerShaderStage_0cca5b468fcf10b6(arg0) {
    const ret = arg0.maxStorageBuffersPerShaderStage;
    return ret;
}
export function __wbg_maxStorageTexturesPerShaderStage_9d6c35770f37866c(arg0) {
    const ret = arg0.maxStorageTexturesPerShaderStage;
    return ret;
}
export function __wbg_maxTextureArrayLayers_c2bf9c85285832d4(arg0) {
    const ret = arg0.maxTextureArrayLayers;
    return ret;
}
export function __wbg_maxTextureDimension1D_e09f86e22ea6bac9(arg0) {
    const ret = arg0.maxTextureDimension1D;
    return ret;
}
export function __wbg_maxTextureDimension2D_2631916ef9a3efa8(arg0) {
    const ret = arg0.maxTextureDimension2D;
    return ret;
}
export function __wbg_maxTextureDimension3D_06ee54121b37d431(arg0) {
    const ret = arg0.maxTextureDimension3D;
    return ret;
}
export function __wbg_maxUniformBufferBindingSize_af9e8a077907ed64(arg0) {
    const ret = arg0.maxUniformBufferBindingSize;
    return ret;
}
export function __wbg_maxUniformBuffersPerShaderStage_f871b70865df8c11(arg0) {
    const ret = arg0.maxUniformBuffersPerShaderStage;
    return ret;
}
export function __wbg_maxVertexAttributes_e72dabb2714f5cf5(arg0) {
    const ret = arg0.maxVertexAttributes;
    return ret;
}
export function __wbg_maxVertexBufferArrayStride_6a1cd814386082ce(arg0) {
    const ret = arg0.maxVertexBufferArrayStride;
    return ret;
}
export function __wbg_maxVertexBuffers_9c61c5fd286ebcc6(arg0) {
    const ret = arg0.maxVertexBuffers;
    return ret;
}
export function __wbg_minStorageBufferOffsetAlignment_e214f59628fb3558(arg0) {
    const ret = arg0.minStorageBufferOffsetAlignment;
    return ret;
}
export function __wbg_minUniformBufferOffsetAlignment_58b69e1c3924f6a4(arg0) {
    const ret = arg0.minUniformBufferOffsetAlignment;
    return ret;
}
export function __wbg_navigator_51379c10a84aeec9(arg0) {
    const ret = arg0.navigator;
    return ret;
}
export function __wbg_navigator_99621db14b3f1099(arg0) {
    const ret = arg0.navigator;
    return ret;
}
export function __wbg_new_227d7c05414eb861() {
    const ret = new Error();
    return ret;
}
export function __wbg_new_25e75d1f0df4d87a() { return handleError(function (arg0, arg1) {
    const ret = new OffscreenCanvas(arg0 >>> 0, arg1 >>> 0);
    return ret;
}, arguments); }
export function __wbg_new_32b398fb48b6d94a() {
    const ret = new Array();
    return ret;
}
export function __wbg_new_cd45aabdf6073e84(arg0) {
    const ret = new Uint8Array(arg0);
    return ret;
}
export function __wbg_new_da52cf8fe3429cb2() {
    const ret = new Object();
    return ret;
}
export function __wbg_new_typed_1824d93f294193e5(arg0, arg1) {
    try {
        var state0 = {a: arg0, b: arg1};
        var cb0 = (arg0, arg1) => {
            const a = state0.a;
            state0.a = 0;
            try {
                return wasm_bindgen__convert__closures_____invoke__h33bc222f80de2d45(a, state0.b, arg0, arg1);
            } finally {
                state0.a = a;
            }
        };
        const ret = new Promise(cb0);
        return ret;
    } finally {
        state0.a = 0;
    }
}
export function __wbg_new_with_byte_offset_and_length_54c7724ee3ec7d82(arg0, arg1, arg2) {
    const ret = new Uint8Array(arg0, arg1 >>> 0, arg2 >>> 0);
    return ret;
}
export function __wbg_new_with_u8_clamped_array_and_sh_2767e4741c267d25() { return handleError(function (arg0, arg1, arg2, arg3) {
    const ret = new ImageData(getClampedArrayU8FromWasm0(arg0, arg1), arg2 >>> 0, arg3 >>> 0);
    return ret;
}, arguments); }
export function __wbg_next_6dbf2c0ac8cde20f(arg0) {
    const ret = arg0.next;
    return ret;
}
export function __wbg_next_71f2aa1cb3d1e37e() { return handleError(function (arg0) {
    const ret = arg0.next();
    return ret;
}, arguments); }
export function __wbg_of_85f52f8b6491a7ca(arg0) {
    const ret = Array.of(arg0);
    return ret;
}
export function __wbg_onSubmittedWorkDone_1460145eecea40ef(arg0) {
    const ret = arg0.onSubmittedWorkDone();
    return ret;
}
export function __wbg_pixelStorei_2a93b18efde9acf8(arg0, arg1, arg2) {
    arg0.pixelStorei(arg1 >>> 0, arg2);
}
export function __wbg_pixelStorei_c844cd0db4f1fde6(arg0, arg1, arg2) {
    arg0.pixelStorei(arg1 >>> 0, arg2);
}
export function __wbg_polygonOffset_4eb460adf41db6cd(arg0, arg1, arg2) {
    arg0.polygonOffset(arg1, arg2);
}
export function __wbg_polygonOffset_eccb68e40a18f861(arg0, arg1, arg2) {
    arg0.polygonOffset(arg1, arg2);
}
export function __wbg_prototypesetcall_4770620bbe4688a0(arg0, arg1, arg2) {
    Uint8Array.prototype.set.call(getArrayU8FromWasm0(arg0, arg1), arg2);
}
export function __wbg_push_d2ae3af0c1217ae6(arg0, arg1) {
    const ret = arg0.push(arg1);
    return ret;
}
export function __wbg_putImageData_8a61c7c9190c0c00() { return handleError(function (arg0, arg1, arg2, arg3) {
    arg0.putImageData(arg1, arg2, arg3);
}, arguments); }
export function __wbg_queryCounterEXT_b74a4567ddfeecf0(arg0, arg1, arg2) {
    arg0.queryCounterEXT(arg1, arg2 >>> 0);
}
export function __wbg_querySelectorAll_7e98cbe256deaadd() { return handleError(function (arg0, arg1, arg2) {
    const ret = arg0.querySelectorAll(getStringFromWasm0(arg1, arg2));
    return ret;
}, arguments); }
export function __wbg_querySelector_fd7d157ebe17cd16() { return handleError(function (arg0, arg1, arg2) {
    const ret = arg0.querySelector(getStringFromWasm0(arg1, arg2));
    return isLikeNone(ret) ? 0 : addToExternrefTable0(ret);
}, arguments); }
export function __wbg_queueMicrotask_0ab5b2d2393e99b9(arg0) {
    const ret = arg0.queueMicrotask;
    return ret;
}
export function __wbg_queueMicrotask_6a09b7bc46549209(arg0) {
    queueMicrotask(arg0);
}
export function __wbg_queue_65d985f3e6d786a6(arg0) {
    const ret = arg0.queue;
    return ret;
}
export function __wbg_readBuffer_4271437a70aae481(arg0, arg1) {
    arg0.readBuffer(arg1 >>> 0);
}
export function __wbg_readPixels_5f013a7d85b23800() { return handleError(function (arg0, arg1, arg2, arg3, arg4, arg5, arg6, arg7) {
    arg0.readPixels(arg1, arg2, arg3, arg4, arg5 >>> 0, arg6 >>> 0, arg7);
}, arguments); }
export function __wbg_readPixels_82c9dee754d58176() { return handleError(function (arg0, arg1, arg2, arg3, arg4, arg5, arg6, arg7) {
    arg0.readPixels(arg1, arg2, arg3, arg4, arg5 >>> 0, arg6 >>> 0, arg7);
}, arguments); }
export function __wbg_readPixels_c7861e25836bf57b() { return handleError(function (arg0, arg1, arg2, arg3, arg4, arg5, arg6, arg7) {
    arg0.readPixels(arg1, arg2, arg3, arg4, arg5 >>> 0, arg6 >>> 0, arg7);
}, arguments); }
export function __wbg_renderbufferStorageMultisample_5c6e5d20c0eaa6ba(arg0, arg1, arg2, arg3, arg4, arg5) {
    arg0.renderbufferStorageMultisample(arg1 >>> 0, arg2, arg3 >>> 0, arg4, arg5);
}
export function __wbg_renderbufferStorage_0a8de92542893819(arg0, arg1, arg2, arg3, arg4) {
    arg0.renderbufferStorage(arg1 >>> 0, arg2 >>> 0, arg3, arg4);
}
export function __wbg_renderbufferStorage_ab5f745ff8efce3d(arg0, arg1, arg2, arg3, arg4) {
    arg0.renderbufferStorage(arg1 >>> 0, arg2 >>> 0, arg3, arg4);
}
export function __wbg_requestAdapter_9ff5c9d1ff271165(arg0, arg1) {
    const ret = arg0.requestAdapter(arg1);
    return ret;
}
export function __wbg_requestAdapter_c46930b8bc33722d(arg0) {
    const ret = arg0.requestAdapter();
    return ret;
}
export function __wbg_requestDevice_c1c34f88a477e509(arg0, arg1) {
    const ret = arg0.requestDevice(arg1);
    return ret;
}
export function __wbg_resolve_2191a4dfe481c25b(arg0) {
    const ret = Promise.resolve(arg0);
    return ret;
}
export function __wbg_samplerParameterf_0b3308eeb1faa3a1(arg0, arg1, arg2, arg3) {
    arg0.samplerParameterf(arg1, arg2 >>> 0, arg3);
}
export function __wbg_samplerParameteri_7b1b4091de49aabb(arg0, arg1, arg2, arg3) {
    arg0.samplerParameteri(arg1, arg2 >>> 0, arg3);
}
export function __wbg_scissor_105e756596bc35df(arg0, arg1, arg2, arg3, arg4) {
    arg0.scissor(arg1, arg2, arg3, arg4);
}
export function __wbg_scissor_573b844152316b8d(arg0, arg1, arg2, arg3, arg4) {
    arg0.scissor(arg1, arg2, arg3, arg4);
}
export function __wbg_setBindGroup_4ba56e1e0d26f244() { return handleError(function (arg0, arg1, arg2, arg3, arg4, arg5, arg6) {
    arg0.setBindGroup(arg1 >>> 0, arg2, getArrayU32FromWasm0(arg3, arg4), arg5, arg6 >>> 0);
}, arguments); }
export function __wbg_setBindGroup_6124849cc8547086(arg0, arg1, arg2) {
    arg0.setBindGroup(arg1 >>> 0, arg2);
}
export function __wbg_setPipeline_bab24dbce96903b9(arg0, arg1) {
    arg0.setPipeline(arg1);
}
export function __wbg_setVertexBuffer_91c4b602d0289943(arg0, arg1, arg2, arg3) {
    arg0.setVertexBuffer(arg1 >>> 0, arg2, arg3);
}
export function __wbg_setVertexBuffer_b508baf8d0ffe331(arg0, arg1, arg2, arg3, arg4) {
    arg0.setVertexBuffer(arg1 >>> 0, arg2, arg3, arg4);
}
export function __wbg_set_61e45ae8061eca11(arg0, arg1, arg2) {
    arg0.set(arg1, arg2 >>> 0);
}
export function __wbg_set_8535240470bf2500() { return handleError(function (arg0, arg1, arg2) {
    const ret = Reflect.set(arg0, arg1, arg2);
    return ret;
}, arguments); }
export function __wbg_set_a_5f6e488475272136(arg0, arg1) {
    arg0.a = arg1;
}
export function __wbg_set_access_091f317905cd76a5(arg0, arg1) {
    arg0.access = __wbindgen_enum_GpuStorageTextureAccess[arg1];
}
export function __wbg_set_address_mode_u_a37cf1035585c638(arg0, arg1) {
    arg0.addressModeU = __wbindgen_enum_GpuAddressMode[arg1];
}
export function __wbg_set_address_mode_v_8ac049e029caef76(arg0, arg1) {
    arg0.addressModeV = __wbindgen_enum_GpuAddressMode[arg1];
}
export function __wbg_set_address_mode_w_eb9260ee11729e92(arg0, arg1) {
    arg0.addressModeW = __wbindgen_enum_GpuAddressMode[arg1];
}
export function __wbg_set_alpha_aa2e606e9e647b21(arg0, arg1) {
    arg0.alpha = arg1;
}
export function __wbg_set_alpha_mode_92402195b3ae1ee7(arg0, arg1) {
    arg0.alphaMode = __wbindgen_enum_GpuCanvasAlphaMode[arg1];
}
export function __wbg_set_alpha_to_coverage_enabled_b4ce9c3f7f8b7ad7(arg0, arg1) {
    arg0.alphaToCoverageEnabled = arg1 !== 0;
}
export function __wbg_set_array_layer_count_daec613068108a9d(arg0, arg1) {
    arg0.arrayLayerCount = arg1 >>> 0;
}
export function __wbg_set_array_stride_c2c009eabc18b5f6(arg0, arg1) {
    arg0.arrayStride = arg1;
}
export function __wbg_set_aspect_77332ac136ee94eb(arg0, arg1) {
    arg0.aspect = __wbindgen_enum_GpuTextureAspect[arg1];
}
export function __wbg_set_aspect_9ea7cc5843075321(arg0, arg1) {
    arg0.aspect = __wbindgen_enum_GpuTextureAspect[arg1];
}
export function __wbg_set_aspect_a823a14d00d42d37(arg0, arg1) {
    arg0.aspect = __wbindgen_enum_GpuTextureAspect[arg1];
}
export function __wbg_set_attributes_05f9117fd32ca606(arg0, arg1) {
    arg0.attributes = arg1;
}
export function __wbg_set_b_688365d692bba214(arg0, arg1) {
    arg0.b = arg1;
}
export function __wbg_set_base_array_layer_cc6c68d233489c4b(arg0, arg1) {
    arg0.baseArrayLayer = arg1 >>> 0;
}
export function __wbg_set_base_mip_level_e07a3efe9006d5ea(arg0, arg1) {
    arg0.baseMipLevel = arg1 >>> 0;
}
export function __wbg_set_beginning_of_pass_write_index_27be5b0b35ec3de0(arg0, arg1) {
    arg0.beginningOfPassWriteIndex = arg1 >>> 0;
}
export function __wbg_set_bind_group_layouts_5325d038771af328(arg0, arg1) {
    arg0.bindGroupLayouts = arg1;
}
export function __wbg_set_binding_b6b0fe5c281b8c69(arg0, arg1) {
    arg0.binding = arg1 >>> 0;
}
export function __wbg_set_binding_f3c188a8cd21455b(arg0, arg1) {
    arg0.binding = arg1 >>> 0;
}
export function __wbg_set_blend_8d6e9c08b5702a09(arg0, arg1) {
    arg0.blend = arg1;
}
export function __wbg_set_buffer_55f096330c8912b4(arg0, arg1) {
    arg0.buffer = arg1;
}
export function __wbg_set_buffer_aa7bf4ad8f17b2bd(arg0, arg1) {
    arg0.buffer = arg1;
}
export function __wbg_set_buffer_e89095a9f0cafad3(arg0, arg1) {
    arg0.buffer = arg1;
}
export function __wbg_set_buffers_85a7238f4ef28ab4(arg0, arg1) {
    arg0.buffers = arg1;
}
export function __wbg_set_bytes_per_row_68a1ea90d4710bc9(arg0, arg1) {
    arg0.bytesPerRow = arg1 >>> 0;
}
export function __wbg_set_bytes_per_row_91681ca78d744888(arg0, arg1) {
    arg0.bytesPerRow = arg1 >>> 0;
}
export function __wbg_set_clear_value_642701f928a5ccb3(arg0, arg1) {
    arg0.clearValue = arg1;
}
export function __wbg_set_code_56e2d45ec1ff6c2d(arg0, arg1, arg2) {
    arg0.code = getStringFromWasm0(arg1, arg2);
}
export function __wbg_set_color_attachments_abe67f6631926e28(arg0, arg1) {
    arg0.colorAttachments = arg1;
}
export function __wbg_set_color_bc393d7efc3c8594(arg0, arg1) {
    arg0.color = arg1;
}
export function __wbg_set_compare_1509dc1a5420943f(arg0, arg1) {
    arg0.compare = __wbindgen_enum_GpuCompareFunction[arg1];
}
export function __wbg_set_compare_42211fbf15e3b850(arg0, arg1) {
    arg0.compare = __wbindgen_enum_GpuCompareFunction[arg1];
}
export function __wbg_set_count_26a934d1cd07d080(arg0, arg1) {
    arg0.count = arg1 >>> 0;
}
export function __wbg_set_cull_mode_9d466c1ab414cac8(arg0, arg1) {
    arg0.cullMode = __wbindgen_enum_GpuCullMode[arg1];
}
export function __wbg_set_depth_bias_428c9340b0fd937b(arg0, arg1) {
    arg0.depthBias = arg1;
}
export function __wbg_set_depth_bias_clamp_f009599ca67fa30c(arg0, arg1) {
    arg0.depthBiasClamp = arg1;
}
export function __wbg_set_depth_bias_slope_scale_7125880b4cb7a951(arg0, arg1) {
    arg0.depthBiasSlopeScale = arg1;
}
export function __wbg_set_depth_clear_value_442bf492734f63b6(arg0, arg1) {
    arg0.depthClearValue = arg1;
}
export function __wbg_set_depth_compare_30e9ea552da12fe2(arg0, arg1) {
    arg0.depthCompare = __wbindgen_enum_GpuCompareFunction[arg1];
}
export function __wbg_set_depth_fail_op_5e42dc3e4c382951(arg0, arg1) {
    arg0.depthFailOp = __wbindgen_enum_GpuStencilOperation[arg1];
}
export function __wbg_set_depth_load_op_34d430b74bb36d91(arg0, arg1) {
    arg0.depthLoadOp = __wbindgen_enum_GpuLoadOp[arg1];
}
export function __wbg_set_depth_or_array_layers_4bbbeadacb393f02(arg0, arg1) {
    arg0.depthOrArrayLayers = arg1 >>> 0;
}
export function __wbg_set_depth_read_only_138a11b10c731094(arg0, arg1) {
    arg0.depthReadOnly = arg1 !== 0;
}
export function __wbg_set_depth_stencil_1bd50dbc450c8650(arg0, arg1) {
    arg0.depthStencil = arg1;
}
export function __wbg_set_depth_stencil_attachment_1ee0d93bc3273369(arg0, arg1) {
    arg0.depthStencilAttachment = arg1;
}
export function __wbg_set_depth_store_op_0ea0a215313dbda7(arg0, arg1) {
    arg0.depthStoreOp = __wbindgen_enum_GpuStoreOp[arg1];
}
export function __wbg_set_depth_write_enabled_64c2e7f6fa4b6b7b(arg0, arg1) {
    arg0.depthWriteEnabled = arg1 !== 0;
}
export function __wbg_set_device_0d774b66e7288f72(arg0, arg1) {
    arg0.device = arg1;
}
export function __wbg_set_dimension_174ad7e2fb67fb4e(arg0, arg1) {
    arg0.dimension = __wbindgen_enum_GpuTextureViewDimension[arg1];
}
export function __wbg_set_dimension_36e13ccecae5af4b(arg0, arg1) {
    arg0.dimension = __wbindgen_enum_GpuTextureDimension[arg1];
}
export function __wbg_set_dst_factor_1ed75271a89a711e(arg0, arg1) {
    arg0.dstFactor = __wbindgen_enum_GpuBlendFactor[arg1];
}
export function __wbg_set_end_of_pass_write_index_e8f52fc08bc0603e(arg0, arg1) {
    arg0.endOfPassWriteIndex = arg1 >>> 0;
}
export function __wbg_set_entries_3017e6132f938c6e(arg0, arg1) {
    arg0.entries = arg1;
}
export function __wbg_set_entries_fc76ca4d7da6a709(arg0, arg1) {
    arg0.entries = arg1;
}
export function __wbg_set_entry_point_6fec5723cc790927(arg0, arg1, arg2) {
    arg0.entryPoint = getStringFromWasm0(arg1, arg2);
}
export function __wbg_set_entry_point_8db3b6d103e3b865(arg0, arg1, arg2) {
    arg0.entryPoint = getStringFromWasm0(arg1, arg2);
}
export function __wbg_set_external_texture_825fe2bc7a0c0603(arg0, arg1) {
    arg0.externalTexture = arg1;
}
export function __wbg_set_fail_op_77ab26c98f847b65(arg0, arg1) {
    arg0.failOp = __wbindgen_enum_GpuStencilOperation[arg1];
}
export function __wbg_set_flip_y_7e37e283463dd527(arg0, arg1) {
    arg0.flipY = arg1 !== 0;
}
export function __wbg_set_format_1786adb7bc74c7c9(arg0, arg1) {
    arg0.format = __wbindgen_enum_GpuTextureFormat[arg1];
}
export function __wbg_set_format_6606f5c1fba6f459(arg0, arg1) {
    arg0.format = __wbindgen_enum_GpuVertexFormat[arg1];
}
export function __wbg_set_format_90860b0321868db4(arg0, arg1) {
    arg0.format = __wbindgen_enum_GpuTextureFormat[arg1];
}
export function __wbg_set_format_abf7a1bc5425c56a(arg0, arg1) {
    arg0.format = __wbindgen_enum_GpuTextureFormat[arg1];
}
export function __wbg_set_format_d347899cd860709c(arg0, arg1) {
    arg0.format = __wbindgen_enum_GpuTextureFormat[arg1];
}
export function __wbg_set_format_e9d4b1475bb3bd3b(arg0, arg1) {
    arg0.format = __wbindgen_enum_GpuTextureFormat[arg1];
}
export function __wbg_set_format_f9341112e43ea182(arg0, arg1) {
    arg0.format = __wbindgen_enum_GpuTextureFormat[arg1];
}
export function __wbg_set_fragment_1a595620425637e1(arg0, arg1) {
    arg0.fragment = arg1;
}
export function __wbg_set_front_face_50cdf4eb61504a46(arg0, arg1) {
    arg0.frontFace = __wbindgen_enum_GpuFrontFace[arg1];
}
export function __wbg_set_g_d4d1d77cf8fdd362(arg0, arg1) {
    arg0.g = arg1;
}
export function __wbg_set_has_dynamic_offset_7d30014fdbfe90c5(arg0, arg1) {
    arg0.hasDynamicOffset = arg1 !== 0;
}
export function __wbg_set_height_7d9d8f892e6964c6(arg0, arg1) {
    arg0.height = arg1 >>> 0;
}
export function __wbg_set_height_bbeef8f354041577(arg0, arg1) {
    arg0.height = arg1 >>> 0;
}
export function __wbg_set_height_e8b5483b8c117d5e(arg0, arg1) {
    arg0.height = arg1 >>> 0;
}
export function __wbg_set_label_03d2396d4655a3e1(arg0, arg1, arg2) {
    arg0.label = getStringFromWasm0(arg1, arg2);
}
export function __wbg_set_label_0c1bd0e976cf0a9a(arg0, arg1, arg2) {
    arg0.label = getStringFromWasm0(arg1, arg2);
}
export function __wbg_set_label_1175a3329a06e52b(arg0, arg1, arg2) {
    arg0.label = getStringFromWasm0(arg1, arg2);
}
export function __wbg_set_label_2d2227f4d5991e50(arg0, arg1, arg2) {
    arg0.label = getStringFromWasm0(arg1, arg2);
}
export function __wbg_set_label_2f592bd1be3db6b3(arg0, arg1, arg2) {
    arg0.label = getStringFromWasm0(arg1, arg2);
}
export function __wbg_set_label_8fd860a36d2c7b74(arg0, arg1, arg2) {
    arg0.label = getStringFromWasm0(arg1, arg2);
}
export function __wbg_set_label_bae57fb9f24fde5c(arg0, arg1, arg2) {
    arg0.label = getStringFromWasm0(arg1, arg2);
}
export function __wbg_set_label_be45aed56e4b9fee(arg0, arg1, arg2) {
    arg0.label = getStringFromWasm0(arg1, arg2);
}
export function __wbg_set_label_c47c451211e2f6d2(arg0, arg1, arg2) {
    arg0.label = getStringFromWasm0(arg1, arg2);
}
export function __wbg_set_label_cd567b7b35838e4c(arg0, arg1, arg2) {
    arg0.label = getStringFromWasm0(arg1, arg2);
}
export function __wbg_set_label_d1c24b5a7a3ac31d(arg0, arg1, arg2) {
    arg0.label = getStringFromWasm0(arg1, arg2);
}
export function __wbg_set_label_dcd98efbb9370da8(arg0, arg1, arg2) {
    arg0.label = getStringFromWasm0(arg1, arg2);
}
export function __wbg_set_label_f92ae11c77d74198(arg0, arg1, arg2) {
    arg0.label = getStringFromWasm0(arg1, arg2);
}
export function __wbg_set_layout_7c5ba5bdcde8a0f0(arg0, arg1) {
    arg0.layout = arg1;
}
export function __wbg_set_layout_eeef59714f5bf48b(arg0, arg1) {
    arg0.layout = arg1;
}
export function __wbg_set_load_op_56844f51434037bf(arg0, arg1) {
    arg0.loadOp = __wbindgen_enum_GpuLoadOp[arg1];
}
export function __wbg_set_lod_max_clamp_3f157633f32c9f94(arg0, arg1) {
    arg0.lodMaxClamp = arg1;
}
export function __wbg_set_lod_min_clamp_7e246c739fb1a854(arg0, arg1) {
    arg0.lodMinClamp = arg1;
}
export function __wbg_set_mag_filter_69d846b974d4bcc0(arg0, arg1) {
    arg0.magFilter = __wbindgen_enum_GpuFilterMode[arg1];
}
export function __wbg_set_mapped_at_creation_48de4735fab51e78(arg0, arg1) {
    arg0.mappedAtCreation = arg1 !== 0;
}
export function __wbg_set_mask_0c49a66362fc0079(arg0, arg1) {
    arg0.mask = arg1 >>> 0;
}
export function __wbg_set_max_anisotropy_3ef0d5bca2336cc7(arg0, arg1) {
    arg0.maxAnisotropy = arg1;
}
export function __wbg_set_min_binding_size_689661b9ed25e083(arg0, arg1) {
    arg0.minBindingSize = arg1;
}
export function __wbg_set_min_filter_fbf2d8d9f503dcd7(arg0, arg1) {
    arg0.minFilter = __wbindgen_enum_GpuFilterMode[arg1];
}
export function __wbg_set_mip_level_246db61be15bdd69(arg0, arg1) {
    arg0.mipLevel = arg1 >>> 0;
}
export function __wbg_set_mip_level_count_72f8bc1f80f7539b(arg0, arg1) {
    arg0.mipLevelCount = arg1 >>> 0;
}
export function __wbg_set_mip_level_count_b19a0d9192e62d5d(arg0, arg1) {
    arg0.mipLevelCount = arg1 >>> 0;
}
export function __wbg_set_mip_level_d480a4a8dc18e56b(arg0, arg1) {
    arg0.mipLevel = arg1 >>> 0;
}
export function __wbg_set_mipmap_filter_17fd50a3898fd5ff(arg0, arg1) {
    arg0.mipmapFilter = __wbindgen_enum_GpuMipmapFilterMode[arg1];
}
export function __wbg_set_module_08ad08e736d8edbf(arg0, arg1) {
    arg0.module = arg1;
}
export function __wbg_set_module_14e471fdd94c582d(arg0, arg1) {
    arg0.module = arg1;
}
export function __wbg_set_multisample_85f073947b782d07(arg0, arg1) {
    arg0.multisample = arg1;
}
export function __wbg_set_multisampled_40505c1381e1c32c(arg0, arg1) {
    arg0.multisampled = arg1 !== 0;
}
export function __wbg_set_offset_2c374e604504e0b2(arg0, arg1) {
    arg0.offset = arg1;
}
export function __wbg_set_offset_73156b0e0b41d79a(arg0, arg1) {
    arg0.offset = arg1;
}
export function __wbg_set_offset_8d9d9afffa18b591(arg0, arg1) {
    arg0.offset = arg1;
}
export function __wbg_set_offset_a097a8050a3a9a33(arg0, arg1) {
    arg0.offset = arg1;
}
export function __wbg_set_operation_b5862f5a1a143b30(arg0, arg1) {
    arg0.operation = __wbindgen_enum_GpuBlendOperation[arg1];
}
export function __wbg_set_origin_9b3b0fbe0a5dc469(arg0, arg1) {
    arg0.origin = arg1;
}
export function __wbg_set_origin_ad4c6de06be29313(arg0, arg1) {
    arg0.origin = arg1;
}
export function __wbg_set_origin_cfbb67a96c9ce9cc(arg0, arg1) {
    arg0.origin = arg1;
}
export function __wbg_set_pass_op_e9470d1262fb8a8b(arg0, arg1) {
    arg0.passOp = __wbindgen_enum_GpuStencilOperation[arg1];
}
export function __wbg_set_power_preference_c0d3fa7ce46b1a2e(arg0, arg1) {
    arg0.powerPreference = __wbindgen_enum_GpuPowerPreference[arg1];
}
export function __wbg_set_premultiplied_alpha_3ed1568015a154c7(arg0, arg1) {
    arg0.premultipliedAlpha = arg1 !== 0;
}
export function __wbg_set_primitive_369241acd17871f1(arg0, arg1) {
    arg0.primitive = arg1;
}
export function __wbg_set_query_set_18679a8580267d5a(arg0, arg1) {
    arg0.querySet = arg1;
}
export function __wbg_set_r_527e5a41c4b1a846(arg0, arg1) {
    arg0.r = arg1;
}
export function __wbg_set_required_features_54918de8185c5fab(arg0, arg1) {
    arg0.requiredFeatures = arg1;
}
export function __wbg_set_required_limits_3b031f66f838f4e3(arg0, arg1) {
    arg0.requiredLimits = arg1;
}
export function __wbg_set_resolve_target_fe76b3f99cf72078(arg0, arg1) {
    arg0.resolveTarget = arg1;
}
export function __wbg_set_resource_fe385d2e3dadaf63(arg0, arg1) {
    arg0.resource = arg1;
}
export function __wbg_set_rows_per_image_d198b7e73a38978b(arg0, arg1) {
    arg0.rowsPerImage = arg1 >>> 0;
}
export function __wbg_set_rows_per_image_f9878f4b10f4fd7f(arg0, arg1) {
    arg0.rowsPerImage = arg1 >>> 0;
}
export function __wbg_set_sample_count_865e1d19b84e27e6(arg0, arg1) {
    arg0.sampleCount = arg1 >>> 0;
}
export function __wbg_set_sample_type_7088b1efddce6a69(arg0, arg1) {
    arg0.sampleType = __wbindgen_enum_GpuTextureSampleType[arg1];
}
export function __wbg_set_sampler_8c5d7fb1b02058c6(arg0, arg1) {
    arg0.sampler = arg1;
}
export function __wbg_set_shader_location_0ff30a733291a396(arg0, arg1) {
    arg0.shaderLocation = arg1 >>> 0;
}
export function __wbg_set_size_1e6281b07cd39177(arg0, arg1) {
    arg0.size = arg1;
}
export function __wbg_set_size_41cd9255ca1e4242(arg0, arg1) {
    arg0.size = arg1;
}
export function __wbg_set_size_a61ff22205255d61(arg0, arg1) {
    arg0.size = arg1;
}
export function __wbg_set_source_6e0a2e56f523024f(arg0, arg1) {
    arg0.source = arg1;
}
export function __wbg_set_src_factor_1c4f755f8676df1b(arg0, arg1) {
    arg0.srcFactor = __wbindgen_enum_GpuBlendFactor[arg1];
}
export function __wbg_set_stencil_back_6ef4683123b19b25(arg0, arg1) {
    arg0.stencilBack = arg1;
}
export function __wbg_set_stencil_clear_value_10b58f674d0177c2(arg0, arg1) {
    arg0.stencilClearValue = arg1 >>> 0;
}
export function __wbg_set_stencil_front_aeb8580a97e5424b(arg0, arg1) {
    arg0.stencilFront = arg1;
}
export function __wbg_set_stencil_load_op_f20a90a66acd3d8c(arg0, arg1) {
    arg0.stencilLoadOp = __wbindgen_enum_GpuLoadOp[arg1];
}
export function __wbg_set_stencil_read_mask_2954f260d47349ea(arg0, arg1) {
    arg0.stencilReadMask = arg1 >>> 0;
}
export function __wbg_set_stencil_read_only_fb489d191b6d969b(arg0, arg1) {
    arg0.stencilReadOnly = arg1 !== 0;
}
export function __wbg_set_stencil_store_op_477c4cf6422dfa3f(arg0, arg1) {
    arg0.stencilStoreOp = __wbindgen_enum_GpuStoreOp[arg1];
}
export function __wbg_set_stencil_write_mask_3f8e9b3781814a95(arg0, arg1) {
    arg0.stencilWriteMask = arg1 >>> 0;
}
export function __wbg_set_step_mode_a35aef328761c452(arg0, arg1) {
    arg0.stepMode = __wbindgen_enum_GpuVertexStepMode[arg1];
}
export function __wbg_set_storage_texture_ab9eed9786337ef0(arg0, arg1) {
    arg0.storageTexture = arg1;
}
export function __wbg_set_store_op_caeede4654b3d847(arg0, arg1) {
    arg0.storeOp = __wbindgen_enum_GpuStoreOp[arg1];
}
export function __wbg_set_strip_index_format_0cd0510e166c4ec4(arg0, arg1) {
    arg0.stripIndexFormat = __wbindgen_enum_GpuIndexFormat[arg1];
}
export function __wbg_set_targets_6b0b3bdd87f35668(arg0, arg1) {
    arg0.targets = arg1;
}
export function __wbg_set_texture_16d2be474ce6ad0c(arg0, arg1) {
    arg0.texture = arg1;
}
export function __wbg_set_texture_e25a73da75cf5808(arg0, arg1) {
    arg0.texture = arg1;
}
export function __wbg_set_texture_f5131fc886cc9ce6(arg0, arg1) {
    arg0.texture = arg1;
}
export function __wbg_set_timestamp_writes_c552d52fbb417005(arg0, arg1) {
    arg0.timestampWrites = arg1;
}
export function __wbg_set_topology_beefb3aca0612b00(arg0, arg1) {
    arg0.topology = __wbindgen_enum_GpuPrimitiveTopology[arg1];
}
export function __wbg_set_type_38961e08504ca674(arg0, arg1) {
    arg0.type = __wbindgen_enum_GpuBufferBindingType[arg1];
}
export function __wbg_set_type_c1eebc19f8a6aeb9(arg0, arg1) {
    arg0.type = __wbindgen_enum_GpuSamplerBindingType[arg1];
}
export function __wbg_set_unclipped_depth_5a4f7eb57fe006b2(arg0, arg1) {
    arg0.unclippedDepth = arg1 !== 0;
}
export function __wbg_set_usage_7f0dda8309469b1c(arg0, arg1) {
    arg0.usage = arg1 >>> 0;
}
export function __wbg_set_usage_7fa9cd18d1104aca(arg0, arg1) {
    arg0.usage = arg1 >>> 0;
}
export function __wbg_set_usage_908213a4d4bb8bde(arg0, arg1) {
    arg0.usage = arg1 >>> 0;
}
export function __wbg_set_usage_ae014e77ff77ce06(arg0, arg1) {
    arg0.usage = arg1 >>> 0;
}
export function __wbg_set_vertex_a4951dd9a7a4ed54(arg0, arg1) {
    arg0.vertex = arg1;
}
export function __wbg_set_view_bdeab150b5f0768c(arg0, arg1) {
    arg0.view = arg1;
}
export function __wbg_set_view_dbd0294573f64d05(arg0, arg1) {
    arg0.view = arg1;
}
export function __wbg_set_view_dimension_263387976511ebc9(arg0, arg1) {
    arg0.viewDimension = __wbindgen_enum_GpuTextureViewDimension[arg1];
}
export function __wbg_set_view_dimension_3ed01b237e85826f(arg0, arg1) {
    arg0.viewDimension = __wbindgen_enum_GpuTextureViewDimension[arg1];
}
export function __wbg_set_view_formats_bab284fc81b40e70(arg0, arg1) {
    arg0.viewFormats = arg1;
}
export function __wbg_set_view_formats_fe531a043efb71fa(arg0, arg1) {
    arg0.viewFormats = arg1;
}
export function __wbg_set_visibility_1bca121a89accba5(arg0, arg1) {
    arg0.visibility = arg1 >>> 0;
}
export function __wbg_set_width_1a5e2e86fa5bdcd8(arg0, arg1) {
    arg0.width = arg1 >>> 0;
}
export function __wbg_set_width_49ac9b7d914afc85(arg0, arg1) {
    arg0.width = arg1 >>> 0;
}
export function __wbg_set_width_8e30d010cd66830d(arg0, arg1) {
    arg0.width = arg1 >>> 0;
}
export function __wbg_set_write_mask_144b25e2bd909124(arg0, arg1) {
    arg0.writeMask = arg1 >>> 0;
}
export function __wbg_set_x_56f0c2c08a62725c(arg0, arg1) {
    arg0.x = arg1 >>> 0;
}
export function __wbg_set_x_7f1ce8377ea914e5(arg0, arg1) {
    arg0.x = arg1 >>> 0;
}
export function __wbg_set_y_04fb8ce84735b4e1(arg0, arg1) {
    arg0.y = arg1 >>> 0;
}
export function __wbg_set_y_09965fd0dd252fb5(arg0, arg1) {
    arg0.y = arg1 >>> 0;
}
export function __wbg_set_z_a51316db27a4941e(arg0, arg1) {
    arg0.z = arg1 >>> 0;
}
export function __wbg_shaderSource_4cf90af97621ff49(arg0, arg1, arg2, arg3) {
    arg0.shaderSource(arg1, getStringFromWasm0(arg2, arg3));
}
export function __wbg_shaderSource_c3469dc2221dd528(arg0, arg1, arg2, arg3) {
    arg0.shaderSource(arg1, getStringFromWasm0(arg2, arg3));
}
export function __wbg_stack_3b0d974bbf31e44f(arg0, arg1) {
    const ret = arg1.stack;
    const ptr1 = passStringToWasm0(ret, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
    const len1 = WASM_VECTOR_LEN;
    getDataViewMemory0().setInt32(arg0 + 4 * 1, len1, true);
    getDataViewMemory0().setInt32(arg0 + 4 * 0, ptr1, true);
}
export function __wbg_static_accessor_GLOBAL_4ef717fb391d88b7() {
    const ret = typeof global === 'undefined' ? null : global;
    return isLikeNone(ret) ? 0 : addToExternrefTable0(ret);
}
export function __wbg_static_accessor_GLOBAL_THIS_8d1badc68b5a74f4() {
    const ret = typeof globalThis === 'undefined' ? null : globalThis;
    return isLikeNone(ret) ? 0 : addToExternrefTable0(ret);
}
export function __wbg_static_accessor_SELF_146583524fe1469b() {
    const ret = typeof self === 'undefined' ? null : self;
    return isLikeNone(ret) ? 0 : addToExternrefTable0(ret);
}
export function __wbg_static_accessor_WINDOW_f2829a2234d7819e() {
    const ret = typeof window === 'undefined' ? null : window;
    return isLikeNone(ret) ? 0 : addToExternrefTable0(ret);
}
export function __wbg_stencilFuncSeparate_35136c4e5153406f(arg0, arg1, arg2, arg3, arg4) {
    arg0.stencilFuncSeparate(arg1 >>> 0, arg2 >>> 0, arg3, arg4 >>> 0);
}
export function __wbg_stencilFuncSeparate_814300446c2969ef(arg0, arg1, arg2, arg3, arg4) {
    arg0.stencilFuncSeparate(arg1 >>> 0, arg2 >>> 0, arg3, arg4 >>> 0);
}
export function __wbg_stencilMaskSeparate_49367b0b5883a8bd(arg0, arg1, arg2) {
    arg0.stencilMaskSeparate(arg1 >>> 0, arg2 >>> 0);
}
export function __wbg_stencilMaskSeparate_63976cc45fb94d84(arg0, arg1, arg2) {
    arg0.stencilMaskSeparate(arg1 >>> 0, arg2 >>> 0);
}
export function __wbg_stencilMask_1c99b79b516d12dd(arg0, arg1) {
    arg0.stencilMask(arg1 >>> 0);
}
export function __wbg_stencilMask_9a844dc58a89992f(arg0, arg1) {
    arg0.stencilMask(arg1 >>> 0);
}
export function __wbg_stencilOpSeparate_b2cb9af05b803e02(arg0, arg1, arg2, arg3, arg4) {
    arg0.stencilOpSeparate(arg1 >>> 0, arg2 >>> 0, arg3 >>> 0, arg4 >>> 0);
}
export function __wbg_stencilOpSeparate_c77fcb47561d0aee(arg0, arg1, arg2, arg3, arg4) {
    arg0.stencilOpSeparate(arg1 >>> 0, arg2 >>> 0, arg3 >>> 0, arg4 >>> 0);
}
export function __wbg_submit_1290d44bb76ecef4(arg0, arg1) {
    arg0.submit(arg1);
}
export function __wbg_texImage2D_3813406af5bf54c8() { return handleError(function (arg0, arg1, arg2, arg3, arg4, arg5, arg6, arg7, arg8, arg9) {
    arg0.texImage2D(arg1 >>> 0, arg2, arg3, arg4, arg5, arg6, arg7 >>> 0, arg8 >>> 0, arg9);
}, arguments); }
export function __wbg_texImage2D_5abd8779d1d033c7() { return handleError(function (arg0, arg1, arg2, arg3, arg4, arg5, arg6, arg7, arg8, arg9) {
    arg0.texImage2D(arg1 >>> 0, arg2, arg3, arg4, arg5, arg6, arg7 >>> 0, arg8 >>> 0, arg9);
}, arguments); }
export function __wbg_texImage2D_8d168171984f2a40() { return handleError(function (arg0, arg1, arg2, arg3, arg4, arg5, arg6, arg7, arg8, arg9) {
    arg0.texImage2D(arg1 >>> 0, arg2, arg3, arg4, arg5, arg6, arg7 >>> 0, arg8 >>> 0, arg9);
}, arguments); }
export function __wbg_texImage3D_bdd9bebe42ed1f52() { return handleError(function (arg0, arg1, arg2, arg3, arg4, arg5, arg6, arg7, arg8, arg9, arg10) {
    arg0.texImage3D(arg1 >>> 0, arg2, arg3, arg4, arg5, arg6, arg7, arg8 >>> 0, arg9 >>> 0, arg10);
}, arguments); }
export function __wbg_texImage3D_ef16a1f721b3f908() { return handleError(function (arg0, arg1, arg2, arg3, arg4, arg5, arg6, arg7, arg8, arg9, arg10) {
    arg0.texImage3D(arg1 >>> 0, arg2, arg3, arg4, arg5, arg6, arg7, arg8 >>> 0, arg9 >>> 0, arg10);
}, arguments); }
export function __wbg_texParameteri_1fc451e0964fc91c(arg0, arg1, arg2, arg3) {
    arg0.texParameteri(arg1 >>> 0, arg2 >>> 0, arg3);
}
export function __wbg_texParameteri_9d0daa263d3a863f(arg0, arg1, arg2, arg3) {
    arg0.texParameteri(arg1 >>> 0, arg2 >>> 0, arg3);
}
export function __wbg_texStorage2D_7f947efc63dac273(arg0, arg1, arg2, arg3, arg4, arg5) {
    arg0.texStorage2D(arg1 >>> 0, arg2, arg3 >>> 0, arg4, arg5);
}
export function __wbg_texStorage3D_f8f2e4b3386736f9(arg0, arg1, arg2, arg3, arg4, arg5, arg6) {
    arg0.texStorage3D(arg1 >>> 0, arg2, arg3 >>> 0, arg4, arg5, arg6);
}
export function __wbg_texSubImage2D_047380bb2660e4f9() { return handleError(function (arg0, arg1, arg2, arg3, arg4, arg5, arg6, arg7, arg8, arg9) {
    arg0.texSubImage2D(arg1 >>> 0, arg2, arg3, arg4, arg5, arg6, arg7 >>> 0, arg8 >>> 0, arg9);
}, arguments); }
export function __wbg_texSubImage2D_5058af3d30a8e205() { return handleError(function (arg0, arg1, arg2, arg3, arg4, arg5, arg6, arg7, arg8, arg9) {
    arg0.texSubImage2D(arg1 >>> 0, arg2, arg3, arg4, arg5, arg6, arg7 >>> 0, arg8 >>> 0, arg9);
}, arguments); }
export function __wbg_texSubImage2D_6a376bfc3a31436b() { return handleError(function (arg0, arg1, arg2, arg3, arg4, arg5, arg6, arg7, arg8, arg9) {
    arg0.texSubImage2D(arg1 >>> 0, arg2, arg3, arg4, arg5, arg6, arg7 >>> 0, arg8 >>> 0, arg9);
}, arguments); }
export function __wbg_texSubImage2D_98c43894eb217aa7() { return handleError(function (arg0, arg1, arg2, arg3, arg4, arg5, arg6, arg7, arg8, arg9) {
    arg0.texSubImage2D(arg1 >>> 0, arg2, arg3, arg4, arg5, arg6, arg7 >>> 0, arg8 >>> 0, arg9);
}, arguments); }
export function __wbg_texSubImage2D_bed5e7a3cd81d409() { return handleError(function (arg0, arg1, arg2, arg3, arg4, arg5, arg6, arg7, arg8, arg9) {
    arg0.texSubImage2D(arg1 >>> 0, arg2, arg3, arg4, arg5, arg6, arg7 >>> 0, arg8 >>> 0, arg9);
}, arguments); }
export function __wbg_texSubImage2D_d1af697e69f8a9e4() { return handleError(function (arg0, arg1, arg2, arg3, arg4, arg5, arg6, arg7, arg8, arg9) {
    arg0.texSubImage2D(arg1 >>> 0, arg2, arg3, arg4, arg5, arg6, arg7 >>> 0, arg8 >>> 0, arg9);
}, arguments); }
export function __wbg_texSubImage2D_d3cd09d0ffcb27be() { return handleError(function (arg0, arg1, arg2, arg3, arg4, arg5, arg6, arg7, arg8, arg9) {
    arg0.texSubImage2D(arg1 >>> 0, arg2, arg3, arg4, arg5, arg6, arg7 >>> 0, arg8 >>> 0, arg9);
}, arguments); }
export function __wbg_texSubImage2D_e107b4f88c19b920() { return handleError(function (arg0, arg1, arg2, arg3, arg4, arg5, arg6, arg7, arg8, arg9) {
    arg0.texSubImage2D(arg1 >>> 0, arg2, arg3, arg4, arg5, arg6, arg7 >>> 0, arg8 >>> 0, arg9);
}, arguments); }
export function __wbg_texSubImage3D_45e498ae6298998c() { return handleError(function (arg0, arg1, arg2, arg3, arg4, arg5, arg6, arg7, arg8, arg9, arg10, arg11) {
    arg0.texSubImage3D(arg1 >>> 0, arg2, arg3, arg4, arg5, arg6, arg7, arg8, arg9 >>> 0, arg10 >>> 0, arg11);
}, arguments); }
export function __wbg_texSubImage3D_4fdd4cd95a2925c2() { return handleError(function (arg0, arg1, arg2, arg3, arg4, arg5, arg6, arg7, arg8, arg9, arg10, arg11) {
    arg0.texSubImage3D(arg1 >>> 0, arg2, arg3, arg4, arg5, arg6, arg7, arg8, arg9 >>> 0, arg10 >>> 0, arg11);
}, arguments); }
export function __wbg_texSubImage3D_6cb6cfd732dad145() { return handleError(function (arg0, arg1, arg2, arg3, arg4, arg5, arg6, arg7, arg8, arg9, arg10, arg11) {
    arg0.texSubImage3D(arg1 >>> 0, arg2, arg3, arg4, arg5, arg6, arg7, arg8, arg9 >>> 0, arg10 >>> 0, arg11);
}, arguments); }
export function __wbg_texSubImage3D_8077e90ec309c414() { return handleError(function (arg0, arg1, arg2, arg3, arg4, arg5, arg6, arg7, arg8, arg9, arg10, arg11) {
    arg0.texSubImage3D(arg1 >>> 0, arg2, arg3, arg4, arg5, arg6, arg7, arg8, arg9 >>> 0, arg10 >>> 0, arg11);
}, arguments); }
export function __wbg_texSubImage3D_93b38c69acb735c8() { return handleError(function (arg0, arg1, arg2, arg3, arg4, arg5, arg6, arg7, arg8, arg9, arg10, arg11) {
    arg0.texSubImage3D(arg1 >>> 0, arg2, arg3, arg4, arg5, arg6, arg7, arg8, arg9 >>> 0, arg10 >>> 0, arg11);
}, arguments); }
export function __wbg_texSubImage3D_c9e5a071796d412f() { return handleError(function (arg0, arg1, arg2, arg3, arg4, arg5, arg6, arg7, arg8, arg9, arg10, arg11) {
    arg0.texSubImage3D(arg1 >>> 0, arg2, arg3, arg4, arg5, arg6, arg7, arg8, arg9 >>> 0, arg10 >>> 0, arg11);
}, arguments); }
export function __wbg_texSubImage3D_feebaf7f0f4594c6() { return handleError(function (arg0, arg1, arg2, arg3, arg4, arg5, arg6, arg7, arg8, arg9, arg10, arg11) {
    arg0.texSubImage3D(arg1 >>> 0, arg2, arg3, arg4, arg5, arg6, arg7, arg8, arg9 >>> 0, arg10 >>> 0, arg11);
}, arguments); }
export function __wbg_then_16d107c451e9905d(arg0, arg1, arg2) {
    const ret = arg0.then(arg1, arg2);
    return ret;
}
export function __wbg_then_4a0b9283a66c4a8a(arg0, arg1, arg2) {
    const ret = arg0.then(arg1, arg2);
    return ret;
}
export function __wbg_then_6ec10ae38b3e92f7(arg0, arg1) {
    const ret = arg0.then(arg1);
    return ret;
}
export function __wbg_transferControlToOffscreen_9f1c9bd56e30dc6d() { return handleError(function (arg0) {
    const ret = arg0.transferControlToOffscreen();
    return ret;
}, arguments); }
export function __wbg_uniform1f_62692c8fa8e7bf1e(arg0, arg1, arg2) {
    arg0.uniform1f(arg1, arg2);
}
export function __wbg_uniform1f_b79d0c5667f9fb40(arg0, arg1, arg2) {
    arg0.uniform1f(arg1, arg2);
}
export function __wbg_uniform1i_5830de6702add20a(arg0, arg1, arg2) {
    arg0.uniform1i(arg1, arg2);
}
export function __wbg_uniform1i_7621f908f78177df(arg0, arg1, arg2) {
    arg0.uniform1i(arg1, arg2);
}
export function __wbg_uniform1ui_cd7ad5581093b3df(arg0, arg1, arg2) {
    arg0.uniform1ui(arg1, arg2 >>> 0);
}
export function __wbg_uniform2fv_1b43656b33177d21(arg0, arg1, arg2, arg3) {
    arg0.uniform2fv(arg1, getArrayF32FromWasm0(arg2, arg3));
}
export function __wbg_uniform2fv_948dab6a82b428ac(arg0, arg1, arg2, arg3) {
    arg0.uniform2fv(arg1, getArrayF32FromWasm0(arg2, arg3));
}
export function __wbg_uniform2iv_859048b9d60f46ae(arg0, arg1, arg2, arg3) {
    arg0.uniform2iv(arg1, getArrayI32FromWasm0(arg2, arg3));
}
export function __wbg_uniform2iv_f84a24961c0cfcd0(arg0, arg1, arg2, arg3) {
    arg0.uniform2iv(arg1, getArrayI32FromWasm0(arg2, arg3));
}
export function __wbg_uniform2uiv_8a9cb3155271213b(arg0, arg1, arg2, arg3) {
    arg0.uniform2uiv(arg1, getArrayU32FromWasm0(arg2, arg3));
}
export function __wbg_uniform3fv_8ecb5ebb510b7bce(arg0, arg1, arg2, arg3) {
    arg0.uniform3fv(arg1, getArrayF32FromWasm0(arg2, arg3));
}
export function __wbg_uniform3fv_95d1933ea1440725(arg0, arg1, arg2, arg3) {
    arg0.uniform3fv(arg1, getArrayF32FromWasm0(arg2, arg3));
}
export function __wbg_uniform3iv_09abae5eabd6b9d6(arg0, arg1, arg2, arg3) {
    arg0.uniform3iv(arg1, getArrayI32FromWasm0(arg2, arg3));
}
export function __wbg_uniform3iv_a3a7008990fd84f0(arg0, arg1, arg2, arg3) {
    arg0.uniform3iv(arg1, getArrayI32FromWasm0(arg2, arg3));
}
export function __wbg_uniform3uiv_3c0b163732f5b8f0(arg0, arg1, arg2, arg3) {
    arg0.uniform3uiv(arg1, getArrayU32FromWasm0(arg2, arg3));
}
export function __wbg_uniform4f_9ff60fc65b0ed726(arg0, arg1, arg2, arg3, arg4, arg5) {
    arg0.uniform4f(arg1, arg2, arg3, arg4, arg5);
}
export function __wbg_uniform4f_b25e39808b830021(arg0, arg1, arg2, arg3, arg4, arg5) {
    arg0.uniform4f(arg1, arg2, arg3, arg4, arg5);
}
export function __wbg_uniform4fv_4ca8c114ca3de099(arg0, arg1, arg2, arg3) {
    arg0.uniform4fv(arg1, getArrayF32FromWasm0(arg2, arg3));
}
export function __wbg_uniform4fv_674a247aeb15012d(arg0, arg1, arg2, arg3) {
    arg0.uniform4fv(arg1, getArrayF32FromWasm0(arg2, arg3));
}
export function __wbg_uniform4iv_45ab52abcb3f882c(arg0, arg1, arg2, arg3) {
    arg0.uniform4iv(arg1, getArrayI32FromWasm0(arg2, arg3));
}
export function __wbg_uniform4iv_d02934d7b94df609(arg0, arg1, arg2, arg3) {
    arg0.uniform4iv(arg1, getArrayI32FromWasm0(arg2, arg3));
}
export function __wbg_uniform4uiv_0d1a8ed214f10c31(arg0, arg1, arg2, arg3) {
    arg0.uniform4uiv(arg1, getArrayU32FromWasm0(arg2, arg3));
}
export function __wbg_uniformBlockBinding_a9ed6b750199e03c(arg0, arg1, arg2, arg3) {
    arg0.uniformBlockBinding(arg1, arg2 >>> 0, arg3 >>> 0);
}
export function __wbg_uniformMatrix2fv_769725d64641341f(arg0, arg1, arg2, arg3, arg4) {
    arg0.uniformMatrix2fv(arg1, arg2 !== 0, getArrayF32FromWasm0(arg3, arg4));
}
export function __wbg_uniformMatrix2fv_9284424cc6aac672(arg0, arg1, arg2, arg3, arg4) {
    arg0.uniformMatrix2fv(arg1, arg2 !== 0, getArrayF32FromWasm0(arg3, arg4));
}
export function __wbg_uniformMatrix2x3fv_dba00c4fc8eefe47(arg0, arg1, arg2, arg3, arg4) {
    arg0.uniformMatrix2x3fv(arg1, arg2 !== 0, getArrayF32FromWasm0(arg3, arg4));
}
export function __wbg_uniformMatrix2x4fv_d801a561c3c18169(arg0, arg1, arg2, arg3, arg4) {
    arg0.uniformMatrix2x4fv(arg1, arg2 !== 0, getArrayF32FromWasm0(arg3, arg4));
}
export function __wbg_uniformMatrix3fv_33e96c7d29dc1e22(arg0, arg1, arg2, arg3, arg4) {
    arg0.uniformMatrix3fv(arg1, arg2 !== 0, getArrayF32FromWasm0(arg3, arg4));
}
export function __wbg_uniformMatrix3fv_568aa181379c8a75(arg0, arg1, arg2, arg3, arg4) {
    arg0.uniformMatrix3fv(arg1, arg2 !== 0, getArrayF32FromWasm0(arg3, arg4));
}
export function __wbg_uniformMatrix3x2fv_ce43e8186ea60a1e(arg0, arg1, arg2, arg3, arg4) {
    arg0.uniformMatrix3x2fv(arg1, arg2 !== 0, getArrayF32FromWasm0(arg3, arg4));
}
export function __wbg_uniformMatrix3x4fv_8abccc5745b0dd90(arg0, arg1, arg2, arg3, arg4) {
    arg0.uniformMatrix3x4fv(arg1, arg2 !== 0, getArrayF32FromWasm0(arg3, arg4));
}
export function __wbg_uniformMatrix4fv_25115a23e04f6db7(arg0, arg1, arg2, arg3, arg4) {
    arg0.uniformMatrix4fv(arg1, arg2 !== 0, getArrayF32FromWasm0(arg3, arg4));
}
export function __wbg_uniformMatrix4fv_423b958042692150(arg0, arg1, arg2, arg3, arg4) {
    arg0.uniformMatrix4fv(arg1, arg2 !== 0, getArrayF32FromWasm0(arg3, arg4));
}
export function __wbg_uniformMatrix4x2fv_1ac2bf986a322e3f(arg0, arg1, arg2, arg3, arg4) {
    arg0.uniformMatrix4x2fv(arg1, arg2 !== 0, getArrayF32FromWasm0(arg3, arg4));
}
export function __wbg_uniformMatrix4x3fv_8640fa85b90ea910(arg0, arg1, arg2, arg3, arg4) {
    arg0.uniformMatrix4x3fv(arg1, arg2 !== 0, getArrayF32FromWasm0(arg3, arg4));
}
export function __wbg_unmap_8f06698a75b8331a(arg0) {
    arg0.unmap();
}
export function __wbg_useProgram_182d120fe476921b(arg0, arg1) {
    arg0.useProgram(arg1);
}
export function __wbg_useProgram_49495850b446fa56(arg0, arg1) {
    arg0.useProgram(arg1);
}
export function __wbg_value_a5d5488a9589444a(arg0) {
    const ret = arg0.value;
    return ret;
}
export function __wbg_vertexAttribDivisorANGLE_978337b09d11ed84(arg0, arg1, arg2) {
    arg0.vertexAttribDivisorANGLE(arg1 >>> 0, arg2 >>> 0);
}
export function __wbg_vertexAttribDivisor_fb31b5ed9bc856da(arg0, arg1, arg2) {
    arg0.vertexAttribDivisor(arg1 >>> 0, arg2 >>> 0);
}
export function __wbg_vertexAttribIPointer_de08a8d8b625e253(arg0, arg1, arg2, arg3, arg4, arg5) {
    arg0.vertexAttribIPointer(arg1 >>> 0, arg2, arg3 >>> 0, arg4, arg5);
}
export function __wbg_vertexAttribPointer_a8f0af57269c2067(arg0, arg1, arg2, arg3, arg4, arg5, arg6) {
    arg0.vertexAttribPointer(arg1 >>> 0, arg2, arg3 >>> 0, arg4 !== 0, arg5, arg6);
}
export function __wbg_vertexAttribPointer_b300c8e000cdac93(arg0, arg1, arg2, arg3, arg4, arg5, arg6) {
    arg0.vertexAttribPointer(arg1 >>> 0, arg2, arg3 >>> 0, arg4 !== 0, arg5, arg6);
}
export function __wbg_videoHeight_1420ccecd0b8b9a1(arg0) {
    const ret = arg0.videoHeight;
    return ret;
}
export function __wbg_videoWidth_3c582f863b387cd5(arg0) {
    const ret = arg0.videoWidth;
    return ret;
}
export function __wbg_viewport_affdf15c559df1e2(arg0, arg1, arg2, arg3, arg4) {
    arg0.viewport(arg1, arg2, arg3, arg4);
}
export function __wbg_viewport_e8a16ca4a5085e5f(arg0, arg1, arg2, arg3, arg4) {
    arg0.viewport(arg1, arg2, arg3, arg4);
}
export function __wbg_width_05a6fecf7eca198d(arg0) {
    const ret = arg0.width;
    return ret;
}
export function __wbg_width_6d9315ecc7140ff6(arg0) {
    const ret = arg0.width;
    return ret;
}
export function __wbg_width_c1e3781335067e0c(arg0) {
    const ret = arg0.width;
    return ret;
}
export function __wbg_width_d2f212a0df13e242(arg0) {
    const ret = arg0.width;
    return ret;
}
export function __wbg_width_f9b3cbe357a34b85(arg0) {
    const ret = arg0.width;
    return ret;
}
export function __wbg_writeTexture_b45b69132e46a227() { return handleError(function (arg0, arg1, arg2, arg3, arg4, arg5) {
    arg0.writeTexture(arg1, getArrayU8FromWasm0(arg2, arg3), arg4, arg5);
}, arguments); }
export function __wbindgen_cast_0000000000000001(arg0, arg1) {
    // Cast intrinsic for `Closure(Closure { owned: true, function: Function { arguments: [Externref], shim_idx: 2514, ret: Result(Unit), inner_ret: Some(Result(Unit)) }, mutable: true }) -> Externref`.
    const ret = makeMutClosure(arg0, arg1, wasm_bindgen__convert__closures_____invoke__h49b96db86b53e7f6);
    return ret;
}
export function __wbindgen_cast_0000000000000002(arg0, arg1) {
    // Cast intrinsic for `Closure(Closure { owned: true, function: Function { arguments: [Externref], shim_idx: 481, ret: Unit, inner_ret: Some(Unit) }, mutable: true }) -> Externref`.
    const ret = makeMutClosure(arg0, arg1, wasm_bindgen__convert__closures_____invoke__h7639701990bf035a);
    return ret;
}
export function __wbindgen_cast_0000000000000003(arg0) {
    // Cast intrinsic for `F64 -> Externref`.
    const ret = arg0;
    return ret;
}
export function __wbindgen_cast_0000000000000004(arg0) {
    // Cast intrinsic for `I64 -> Externref`.
    const ret = arg0;
    return ret;
}
export function __wbindgen_cast_0000000000000005(arg0, arg1) {
    // Cast intrinsic for `Ref(Slice(F32)) -> NamedExternref("Float32Array")`.
    const ret = getArrayF32FromWasm0(arg0, arg1);
    return ret;
}
export function __wbindgen_cast_0000000000000006(arg0, arg1) {
    // Cast intrinsic for `Ref(Slice(I16)) -> NamedExternref("Int16Array")`.
    const ret = getArrayI16FromWasm0(arg0, arg1);
    return ret;
}
export function __wbindgen_cast_0000000000000007(arg0, arg1) {
    // Cast intrinsic for `Ref(Slice(I32)) -> NamedExternref("Int32Array")`.
    const ret = getArrayI32FromWasm0(arg0, arg1);
    return ret;
}
export function __wbindgen_cast_0000000000000008(arg0, arg1) {
    // Cast intrinsic for `Ref(Slice(I8)) -> NamedExternref("Int8Array")`.
    const ret = getArrayI8FromWasm0(arg0, arg1);
    return ret;
}
export function __wbindgen_cast_0000000000000009(arg0, arg1) {
    // Cast intrinsic for `Ref(Slice(U16)) -> NamedExternref("Uint16Array")`.
    const ret = getArrayU16FromWasm0(arg0, arg1);
    return ret;
}
export function __wbindgen_cast_000000000000000a(arg0, arg1) {
    // Cast intrinsic for `Ref(Slice(U32)) -> NamedExternref("Uint32Array")`.
    const ret = getArrayU32FromWasm0(arg0, arg1);
    return ret;
}
export function __wbindgen_cast_000000000000000b(arg0, arg1) {
    // Cast intrinsic for `Ref(Slice(U8)) -> NamedExternref("Uint8Array")`.
    const ret = getArrayU8FromWasm0(arg0, arg1);
    return ret;
}
export function __wbindgen_cast_000000000000000c(arg0, arg1) {
    // Cast intrinsic for `Ref(String) -> Externref`.
    const ret = getStringFromWasm0(arg0, arg1);
    return ret;
}
export function __wbindgen_cast_000000000000000d(arg0) {
    // Cast intrinsic for `U64 -> Externref`.
    const ret = BigInt.asUintN(64, arg0);
    return ret;
}
export function __wbindgen_init_externref_table() {
    const table = wasm.__wbindgen_externrefs;
    const offset = table.grow(4);
    table.set(0, undefined);
    table.set(offset + 0, undefined);
    table.set(offset + 1, null);
    table.set(offset + 2, true);
    table.set(offset + 3, false);
}
function wasm_bindgen__convert__closures_____invoke__h7639701990bf035a(arg0, arg1, arg2) {
    wasm.wasm_bindgen__convert__closures_____invoke__h7639701990bf035a(arg0, arg1, arg2);
}

function wasm_bindgen__convert__closures_____invoke__h49b96db86b53e7f6(arg0, arg1, arg2) {
    const ret = wasm.wasm_bindgen__convert__closures_____invoke__h49b96db86b53e7f6(arg0, arg1, arg2);
    if (ret[1]) {
        throw takeFromExternrefTable0(ret[0]);
    }
}

function wasm_bindgen__convert__closures_____invoke__h33bc222f80de2d45(arg0, arg1, arg2, arg3) {
    wasm.wasm_bindgen__convert__closures_____invoke__h33bc222f80de2d45(arg0, arg1, arg2, arg3);
}


const __wbindgen_enum_GpuAddressMode = ["clamp-to-edge", "repeat", "mirror-repeat"];


const __wbindgen_enum_GpuBlendFactor = ["zero", "one", "src", "one-minus-src", "src-alpha", "one-minus-src-alpha", "dst", "one-minus-dst", "dst-alpha", "one-minus-dst-alpha", "src-alpha-saturated", "constant", "one-minus-constant", "src1", "one-minus-src1", "src1-alpha", "one-minus-src1-alpha"];


const __wbindgen_enum_GpuBlendOperation = ["add", "subtract", "reverse-subtract", "min", "max"];


const __wbindgen_enum_GpuBufferBindingType = ["uniform", "storage", "read-only-storage"];


const __wbindgen_enum_GpuCanvasAlphaMode = ["opaque", "premultiplied"];


const __wbindgen_enum_GpuCompareFunction = ["never", "less", "equal", "less-equal", "greater", "not-equal", "greater-equal", "always"];


const __wbindgen_enum_GpuCullMode = ["none", "front", "back"];


const __wbindgen_enum_GpuFilterMode = ["nearest", "linear"];


const __wbindgen_enum_GpuFrontFace = ["ccw", "cw"];


const __wbindgen_enum_GpuIndexFormat = ["uint16", "uint32"];


const __wbindgen_enum_GpuLoadOp = ["load", "clear"];


const __wbindgen_enum_GpuMipmapFilterMode = ["nearest", "linear"];


const __wbindgen_enum_GpuPowerPreference = ["low-power", "high-performance"];


const __wbindgen_enum_GpuPrimitiveTopology = ["point-list", "line-list", "line-strip", "triangle-list", "triangle-strip"];


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

function addToExternrefTable0(obj) {
    const idx = wasm.__externref_table_alloc();
    wasm.__wbindgen_externrefs.set(idx, obj);
    return idx;
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
    return decodeText(ptr >>> 0, len);
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


let wasm;
export function __wbg_set_wasm(val) {
    wasm = val;
}
