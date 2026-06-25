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
export function __wbg_Error_fdd633d4bb5dd76a(arg0, arg1) {
    const ret = Error(getStringFromWasm0(arg0, arg1));
    return ret;
}
export function __wbg_Number_c4bdf66bb78f7977(arg0) {
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
export function __wbg_Window_65ef42d29dc8174d(arg0) {
    const ret = arg0.Window;
    return ret;
}
export function __wbg_WorkerGlobalScope_d272430d4a323303(arg0) {
    const ret = arg0.WorkerGlobalScope;
    return ret;
}
export function __wbg___wbindgen_bigint_get_as_i64_d9e915702856f831(arg0, arg1) {
    const v = arg1;
    const ret = typeof(v) === 'bigint' ? v : undefined;
    getDataViewMemory0().setBigInt64(arg0 + 8 * 1, isLikeNone(ret) ? BigInt(0) : ret, true);
    getDataViewMemory0().setInt32(arg0 + 4 * 0, !isLikeNone(ret), true);
}
export function __wbg___wbindgen_boolean_get_edaed31a367ce1bd(arg0) {
    const v = arg0;
    const ret = typeof(v) === 'boolean' ? v : undefined;
    return isLikeNone(ret) ? 0xFFFFFF : ret ? 1 : 0;
}
export function __wbg___wbindgen_debug_string_8a447059637473e2(arg0, arg1) {
    const ret = debugString(arg1);
    const ptr1 = passStringToWasm0(ret, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
    const len1 = WASM_VECTOR_LEN;
    getDataViewMemory0().setInt32(arg0 + 4 * 1, len1, true);
    getDataViewMemory0().setInt32(arg0 + 4 * 0, ptr1, true);
}
export function __wbg___wbindgen_in_4990f46af709e33c(arg0, arg1) {
    const ret = arg0 in arg1;
    return ret;
}
export function __wbg___wbindgen_is_bigint_90b5ccfe67c78460(arg0) {
    const ret = typeof(arg0) === 'bigint';
    return ret;
}
export function __wbg___wbindgen_is_function_acc5528be2b923f2(arg0) {
    const ret = typeof(arg0) === 'function';
    return ret;
}
export function __wbg___wbindgen_is_null_6d937fbfb6478470(arg0) {
    const ret = arg0 === null;
    return ret;
}
export function __wbg___wbindgen_is_object_0beba4a1980d3eea(arg0) {
    const val = arg0;
    const ret = typeof(val) === 'object' && val !== null;
    return ret;
}
export function __wbg___wbindgen_is_string_1fca8072260dd261(arg0) {
    const ret = typeof(arg0) === 'string';
    return ret;
}
export function __wbg___wbindgen_is_undefined_721f8decd50c87a3(arg0) {
    const ret = arg0 === undefined;
    return ret;
}
export function __wbg___wbindgen_jsval_eq_4e8c38722cb8ff51(arg0, arg1) {
    const ret = arg0 === arg1;
    return ret;
}
export function __wbg___wbindgen_jsval_loose_eq_4b9aba9e5b3c4582(arg0, arg1) {
    const ret = arg0 == arg1;
    return ret;
}
export function __wbg___wbindgen_number_get_1cc01dd708740256(arg0, arg1) {
    const obj = arg1;
    const ret = typeof(obj) === 'number' ? obj : undefined;
    getDataViewMemory0().setFloat64(arg0 + 8 * 1, isLikeNone(ret) ? 0 : ret, true);
    getDataViewMemory0().setInt32(arg0 + 4 * 0, !isLikeNone(ret), true);
}
export function __wbg___wbindgen_string_get_71bb4348194e31f0(arg0, arg1) {
    const obj = arg1;
    const ret = typeof(obj) === 'string' ? obj : undefined;
    var ptr1 = isLikeNone(ret) ? 0 : passStringToWasm0(ret, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
    var len1 = WASM_VECTOR_LEN;
    getDataViewMemory0().setInt32(arg0 + 4 * 1, len1, true);
    getDataViewMemory0().setInt32(arg0 + 4 * 0, ptr1, true);
}
export function __wbg___wbindgen_throw_ea4887a5f8f9a9db(arg0, arg1) {
    throw new Error(getStringFromWasm0(arg0, arg1));
}
export function __wbg__wbg_cb_unref_33c39e13d73b25f6(arg0) {
    arg0._wbg_cb_unref();
}
export function __wbg_activeTexture_1d5359b20df41710(arg0, arg1) {
    arg0.activeTexture(arg1 >>> 0);
}
export function __wbg_activeTexture_525ee3068cb9e8d5(arg0, arg1) {
    arg0.activeTexture(arg1 >>> 0);
}
export function __wbg_attachShader_3477e67517b09b6b(arg0, arg1, arg2) {
    arg0.attachShader(arg1, arg2);
}
export function __wbg_attachShader_683d1070365e7066(arg0, arg1, arg2) {
    arg0.attachShader(arg1, arg2);
}
export function __wbg_beginQuery_dad334d972fed3cc(arg0, arg1, arg2) {
    arg0.beginQuery(arg1 >>> 0, arg2);
}
export function __wbg_beginRenderPass_865cbdfaecf89f93() { return handleError(function (arg0, arg1) {
    const ret = arg0.beginRenderPass(arg1);
    return ret;
}, arguments); }
export function __wbg_bindAttribLocation_79b5d26727094518(arg0, arg1, arg2, arg3, arg4) {
    arg0.bindAttribLocation(arg1, arg2 >>> 0, getStringFromWasm0(arg3, arg4));
}
export function __wbg_bindAttribLocation_d56d3c40331af7ed(arg0, arg1, arg2, arg3, arg4) {
    arg0.bindAttribLocation(arg1, arg2 >>> 0, getStringFromWasm0(arg3, arg4));
}
export function __wbg_bindBufferRange_16a9d90becc2a7d7(arg0, arg1, arg2, arg3, arg4, arg5) {
    arg0.bindBufferRange(arg1 >>> 0, arg2 >>> 0, arg3, arg4, arg5);
}
export function __wbg_bindBuffer_d3111de6861cb875(arg0, arg1, arg2) {
    arg0.bindBuffer(arg1 >>> 0, arg2);
}
export function __wbg_bindBuffer_e95efaf0d4851845(arg0, arg1, arg2) {
    arg0.bindBuffer(arg1 >>> 0, arg2);
}
export function __wbg_bindFramebuffer_217a1f4d28c6bc77(arg0, arg1, arg2) {
    arg0.bindFramebuffer(arg1 >>> 0, arg2);
}
export function __wbg_bindFramebuffer_63e837a5dc0accfb(arg0, arg1, arg2) {
    arg0.bindFramebuffer(arg1 >>> 0, arg2);
}
export function __wbg_bindRenderbuffer_7f84d28a1462a95a(arg0, arg1, arg2) {
    arg0.bindRenderbuffer(arg1 >>> 0, arg2);
}
export function __wbg_bindRenderbuffer_d608b211c51ed147(arg0, arg1, arg2) {
    arg0.bindRenderbuffer(arg1 >>> 0, arg2);
}
export function __wbg_bindSampler_3c7002cb6d56ae8f(arg0, arg1, arg2) {
    arg0.bindSampler(arg1 >>> 0, arg2);
}
export function __wbg_bindTexture_7ab28ff4ff3dc506(arg0, arg1, arg2) {
    arg0.bindTexture(arg1 >>> 0, arg2);
}
export function __wbg_bindTexture_ffc56f1e5c5526c6(arg0, arg1, arg2) {
    arg0.bindTexture(arg1 >>> 0, arg2);
}
export function __wbg_bindVertexArrayOES_1cb63a86715ea7d5(arg0, arg1) {
    arg0.bindVertexArrayOES(arg1);
}
export function __wbg_bindVertexArray_c391bd47303d75cd(arg0, arg1) {
    arg0.bindVertexArray(arg1);
}
export function __wbg_blendColor_15f26633b646e542(arg0, arg1, arg2, arg3, arg4) {
    arg0.blendColor(arg1, arg2, arg3, arg4);
}
export function __wbg_blendColor_a0ba1cdcecc3a34c(arg0, arg1, arg2, arg3, arg4) {
    arg0.blendColor(arg1, arg2, arg3, arg4);
}
export function __wbg_blendEquationSeparate_8240ddfa32266109(arg0, arg1, arg2) {
    arg0.blendEquationSeparate(arg1 >>> 0, arg2 >>> 0);
}
export function __wbg_blendEquationSeparate_aed0a34303d3e6ae(arg0, arg1, arg2) {
    arg0.blendEquationSeparate(arg1 >>> 0, arg2 >>> 0);
}
export function __wbg_blendEquation_7dadb4db540a42da(arg0, arg1) {
    arg0.blendEquation(arg1 >>> 0);
}
export function __wbg_blendEquation_8bfa69f639ae92da(arg0, arg1) {
    arg0.blendEquation(arg1 >>> 0);
}
export function __wbg_blendFuncSeparate_3eef699c291dbc87(arg0, arg1, arg2, arg3, arg4) {
    arg0.blendFuncSeparate(arg1 >>> 0, arg2 >>> 0, arg3 >>> 0, arg4 >>> 0);
}
export function __wbg_blendFuncSeparate_456410f9919bed39(arg0, arg1, arg2, arg3, arg4) {
    arg0.blendFuncSeparate(arg1 >>> 0, arg2 >>> 0, arg3 >>> 0, arg4 >>> 0);
}
export function __wbg_blendFunc_713c504adab14f98(arg0, arg1, arg2) {
    arg0.blendFunc(arg1 >>> 0, arg2 >>> 0);
}
export function __wbg_blendFunc_b15af02643e188f1(arg0, arg1, arg2) {
    arg0.blendFunc(arg1 >>> 0, arg2 >>> 0);
}
export function __wbg_blitFramebuffer_ea96ada8bba07582(arg0, arg1, arg2, arg3, arg4, arg5, arg6, arg7, arg8, arg9, arg10) {
    arg0.blitFramebuffer(arg1, arg2, arg3, arg4, arg5, arg6, arg7, arg8, arg9 >>> 0, arg10 >>> 0);
}
export function __wbg_bufferData_26132561617ce8fb(arg0, arg1, arg2, arg3) {
    arg0.bufferData(arg1 >>> 0, arg2, arg3 >>> 0);
}
export function __wbg_bufferData_5df9bdb32e189eee(arg0, arg1, arg2, arg3) {
    arg0.bufferData(arg1 >>> 0, arg2, arg3 >>> 0);
}
export function __wbg_bufferData_64e9905f2b3d3a6f(arg0, arg1, arg2, arg3) {
    arg0.bufferData(arg1 >>> 0, arg2, arg3 >>> 0);
}
export function __wbg_bufferData_99bbbc63f02251c4(arg0, arg1, arg2, arg3) {
    arg0.bufferData(arg1 >>> 0, arg2, arg3 >>> 0);
}
export function __wbg_bufferSubData_2270f1b9db71e642(arg0, arg1, arg2, arg3) {
    arg0.bufferSubData(arg1 >>> 0, arg2, arg3);
}
export function __wbg_bufferSubData_44db8a3b4a70b57d(arg0, arg1, arg2, arg3) {
    arg0.bufferSubData(arg1 >>> 0, arg2, arg3);
}
export function __wbg_call_5575218572ead796() { return handleError(function (arg0, arg1, arg2) {
    const ret = arg0.call(arg1, arg2);
    return ret;
}, arguments); }
export function __wbg_call_8e98ed2f3c86c4b5() { return handleError(function (arg0, arg1) {
    const ret = arg0.call(arg1);
    return ret;
}, arguments); }
export function __wbg_clearBufferfv_6b77b9402254a2bf(arg0, arg1, arg2, arg3, arg4) {
    arg0.clearBufferfv(arg1 >>> 0, arg2, getArrayF32FromWasm0(arg3, arg4));
}
export function __wbg_clearBufferiv_0f056544010eef3e(arg0, arg1, arg2, arg3, arg4) {
    arg0.clearBufferiv(arg1 >>> 0, arg2, getArrayI32FromWasm0(arg3, arg4));
}
export function __wbg_clearBufferuiv_1d2d93401c0904a3(arg0, arg1, arg2, arg3, arg4) {
    arg0.clearBufferuiv(arg1 >>> 0, arg2, getArrayU32FromWasm0(arg3, arg4));
}
export function __wbg_clearDepth_05c17028494ee4dd(arg0, arg1) {
    arg0.clearDepth(arg1);
}
export function __wbg_clearDepth_ac6b54f112feeaf7(arg0, arg1) {
    arg0.clearDepth(arg1);
}
export function __wbg_clearStencil_56d6a6308294a749(arg0, arg1) {
    arg0.clearStencil(arg1);
}
export function __wbg_clearStencil_917833d1e2ac56e4(arg0, arg1) {
    arg0.clearStencil(arg1);
}
export function __wbg_clear_dadcb3e2929388b0(arg0, arg1) {
    arg0.clear(arg1 >>> 0);
}
export function __wbg_clear_ff8cfdf420f7dde6(arg0, arg1) {
    arg0.clear(arg1 >>> 0);
}
export function __wbg_clientWaitSync_7580165bd2eff461(arg0, arg1, arg2, arg3) {
    const ret = arg0.clientWaitSync(arg1, arg2 >>> 0, arg3 >>> 0);
    return ret;
}
export function __wbg_colorMask_b0ab9d429a1efa0a(arg0, arg1, arg2, arg3, arg4) {
    arg0.colorMask(arg1 !== 0, arg2 !== 0, arg3 !== 0, arg4 !== 0);
}
export function __wbg_colorMask_f111e3e5796458f4(arg0, arg1, arg2, arg3, arg4) {
    arg0.colorMask(arg1 !== 0, arg2 !== 0, arg3 !== 0, arg4 !== 0);
}
export function __wbg_compileShader_f5625b583b2c9fd6(arg0, arg1) {
    arg0.compileShader(arg1);
}
export function __wbg_compileShader_fcf3f3d2891f73f9(arg0, arg1) {
    arg0.compileShader(arg1);
}
export function __wbg_compressedTexSubImage2D_44c06107dab236a8(arg0, arg1, arg2, arg3, arg4, arg5, arg6, arg7, arg8) {
    arg0.compressedTexSubImage2D(arg1 >>> 0, arg2, arg3, arg4, arg5, arg6, arg7 >>> 0, arg8);
}
export function __wbg_compressedTexSubImage2D_7f963168c14c0082(arg0, arg1, arg2, arg3, arg4, arg5, arg6, arg7, arg8) {
    arg0.compressedTexSubImage2D(arg1 >>> 0, arg2, arg3, arg4, arg5, arg6, arg7 >>> 0, arg8);
}
export function __wbg_compressedTexSubImage2D_9d66d6214713bbfb(arg0, arg1, arg2, arg3, arg4, arg5, arg6, arg7, arg8, arg9) {
    arg0.compressedTexSubImage2D(arg1 >>> 0, arg2, arg3, arg4, arg5, arg6, arg7 >>> 0, arg8, arg9);
}
export function __wbg_compressedTexSubImage3D_73e1f9f3aa71a2da(arg0, arg1, arg2, arg3, arg4, arg5, arg6, arg7, arg8, arg9, arg10, arg11) {
    arg0.compressedTexSubImage3D(arg1 >>> 0, arg2, arg3, arg4, arg5, arg6, arg7, arg8, arg9 >>> 0, arg10, arg11);
}
export function __wbg_compressedTexSubImage3D_e47c04fef5551d29(arg0, arg1, arg2, arg3, arg4, arg5, arg6, arg7, arg8, arg9, arg10) {
    arg0.compressedTexSubImage3D(arg1 >>> 0, arg2, arg3, arg4, arg5, arg6, arg7, arg8, arg9 >>> 0, arg10);
}
export function __wbg_configure_c0a3d80e97c0e7b1() { return handleError(function (arg0, arg1) {
    arg0.configure(arg1);
}, arguments); }
export function __wbg_copyBufferSubData_a944f33b601b822d(arg0, arg1, arg2, arg3, arg4, arg5) {
    arg0.copyBufferSubData(arg1 >>> 0, arg2 >>> 0, arg3, arg4, arg5);
}
export function __wbg_copyExternalImageToTexture_305b23364c470d9e() { return handleError(function (arg0, arg1, arg2, arg3) {
    arg0.copyExternalImageToTexture(arg1, arg2, arg3);
}, arguments); }
export function __wbg_copyTexSubImage2D_3c7de20db5e2b39f(arg0, arg1, arg2, arg3, arg4, arg5, arg6, arg7, arg8) {
    arg0.copyTexSubImage2D(arg1 >>> 0, arg2, arg3, arg4, arg5, arg6, arg7, arg8);
}
export function __wbg_copyTexSubImage2D_4b1ba73bf053b4e6(arg0, arg1, arg2, arg3, arg4, arg5, arg6, arg7, arg8) {
    arg0.copyTexSubImage2D(arg1 >>> 0, arg2, arg3, arg4, arg5, arg6, arg7, arg8);
}
export function __wbg_copyTexSubImage3D_8ba04135d122a27a(arg0, arg1, arg2, arg3, arg4, arg5, arg6, arg7, arg8, arg9) {
    arg0.copyTexSubImage3D(arg1 >>> 0, arg2, arg3, arg4, arg5, arg6, arg7, arg8, arg9);
}
export function __wbg_copyTextureToBuffer_a9b82ac765521aab() { return handleError(function (arg0, arg1, arg2, arg3) {
    arg0.copyTextureToBuffer(arg1, arg2, arg3);
}, arguments); }
export function __wbg_createBindGroupLayout_59891d473ac8665d() { return handleError(function (arg0, arg1) {
    const ret = arg0.createBindGroupLayout(arg1);
    return ret;
}, arguments); }
export function __wbg_createBindGroup_4cb86ff853df5c69(arg0, arg1) {
    const ret = arg0.createBindGroup(arg1);
    return ret;
}
export function __wbg_createBuffer_0e42c2e1f7bbaeeb(arg0) {
    const ret = arg0.createBuffer();
    return isLikeNone(ret) ? 0 : addToExternrefTable0(ret);
}
export function __wbg_createBuffer_3fa0256cba655273() { return handleError(function (arg0, arg1) {
    const ret = arg0.createBuffer(arg1);
    return ret;
}, arguments); }
export function __wbg_createBuffer_9f602b2dbcbf409c(arg0) {
    const ret = arg0.createBuffer();
    return isLikeNone(ret) ? 0 : addToExternrefTable0(ret);
}
export function __wbg_createCommandEncoder_98e3b731629054b4(arg0, arg1) {
    const ret = arg0.createCommandEncoder(arg1);
    return ret;
}
export function __wbg_createElement_9e23ac95e40e302c() { return handleError(function (arg0, arg1, arg2) {
    const ret = arg0.createElement(getStringFromWasm0(arg1, arg2));
    return ret;
}, arguments); }
export function __wbg_createFramebuffer_4a250944a4542bbc(arg0) {
    const ret = arg0.createFramebuffer();
    return isLikeNone(ret) ? 0 : addToExternrefTable0(ret);
}
export function __wbg_createFramebuffer_ab73f30b5dc97415(arg0) {
    const ret = arg0.createFramebuffer();
    return isLikeNone(ret) ? 0 : addToExternrefTable0(ret);
}
export function __wbg_createPipelineLayout_270b4fd0b4230373(arg0, arg1) {
    const ret = arg0.createPipelineLayout(arg1);
    return ret;
}
export function __wbg_createProgram_4c8164d471c10346(arg0) {
    const ret = arg0.createProgram();
    return isLikeNone(ret) ? 0 : addToExternrefTable0(ret);
}
export function __wbg_createProgram_f11c63f59f41b82a(arg0) {
    const ret = arg0.createProgram();
    return isLikeNone(ret) ? 0 : addToExternrefTable0(ret);
}
export function __wbg_createQuery_f013132b870a71ef(arg0) {
    const ret = arg0.createQuery();
    return isLikeNone(ret) ? 0 : addToExternrefTable0(ret);
}
export function __wbg_createRenderPipeline_4c120add6a62a442() { return handleError(function (arg0, arg1) {
    const ret = arg0.createRenderPipeline(arg1);
    return ret;
}, arguments); }
export function __wbg_createRenderbuffer_556000dbb01f5026(arg0) {
    const ret = arg0.createRenderbuffer();
    return isLikeNone(ret) ? 0 : addToExternrefTable0(ret);
}
export function __wbg_createRenderbuffer_5ada3a0bc7cf3a43(arg0) {
    const ret = arg0.createRenderbuffer();
    return isLikeNone(ret) ? 0 : addToExternrefTable0(ret);
}
export function __wbg_createSampler_95bff4f5405a3dd1(arg0, arg1) {
    const ret = arg0.createSampler(arg1);
    return ret;
}
export function __wbg_createSampler_9fe50152a2524319(arg0) {
    const ret = arg0.createSampler();
    return isLikeNone(ret) ? 0 : addToExternrefTable0(ret);
}
export function __wbg_createShaderModule_f0aa469466c7bdaa(arg0, arg1) {
    const ret = arg0.createShaderModule(arg1);
    return ret;
}
export function __wbg_createShader_27d9388313f3b14e(arg0, arg1) {
    const ret = arg0.createShader(arg1 >>> 0);
    return isLikeNone(ret) ? 0 : addToExternrefTable0(ret);
}
export function __wbg_createShader_9c5cd42709d915ff(arg0, arg1) {
    const ret = arg0.createShader(arg1 >>> 0);
    return isLikeNone(ret) ? 0 : addToExternrefTable0(ret);
}
export function __wbg_createTexture_28341edbcc7d129e() { return handleError(function (arg0, arg1) {
    const ret = arg0.createTexture(arg1);
    return ret;
}, arguments); }
export function __wbg_createTexture_3eed23cb87dd35fc(arg0) {
    const ret = arg0.createTexture();
    return isLikeNone(ret) ? 0 : addToExternrefTable0(ret);
}
export function __wbg_createTexture_8455c703424c567b(arg0) {
    const ret = arg0.createTexture();
    return isLikeNone(ret) ? 0 : addToExternrefTable0(ret);
}
export function __wbg_createVertexArrayOES_4bbd1b38563aab57(arg0) {
    const ret = arg0.createVertexArrayOES();
    return isLikeNone(ret) ? 0 : addToExternrefTable0(ret);
}
export function __wbg_createVertexArray_8685feb21901c932(arg0) {
    const ret = arg0.createVertexArray();
    return isLikeNone(ret) ? 0 : addToExternrefTable0(ret);
}
export function __wbg_createView_d04a0f9bdd723238() { return handleError(function (arg0, arg1) {
    const ret = arg0.createView(arg1);
    return ret;
}, arguments); }
export function __wbg_cullFace_774780fb4177aab8(arg0, arg1) {
    arg0.cullFace(arg1 >>> 0);
}
export function __wbg_cullFace_94f24b4fd5e9038b(arg0, arg1) {
    arg0.cullFace(arg1 >>> 0);
}
export function __wbg_data_411cafdcea483b74(arg0, arg1) {
    const ret = arg1.data;
    const ptr1 = passArray8ToWasm0(ret, wasm.__wbindgen_malloc);
    const len1 = WASM_VECTOR_LEN;
    getDataViewMemory0().setInt32(arg0 + 4 * 1, len1, true);
    getDataViewMemory0().setInt32(arg0 + 4 * 0, ptr1, true);
}
export function __wbg_deleteBuffer_d0fb5f1492ee8c6f(arg0, arg1) {
    arg0.deleteBuffer(arg1);
}
export function __wbg_deleteBuffer_d758283bea6e0ccf(arg0, arg1) {
    arg0.deleteBuffer(arg1);
}
export function __wbg_deleteFramebuffer_4c0996be4bc30a67(arg0, arg1) {
    arg0.deleteFramebuffer(arg1);
}
export function __wbg_deleteFramebuffer_8953b325144192fe(arg0, arg1) {
    arg0.deleteFramebuffer(arg1);
}
export function __wbg_deleteProgram_0135c6926e75af75(arg0, arg1) {
    arg0.deleteProgram(arg1);
}
export function __wbg_deleteProgram_eff668280dcb01ca(arg0, arg1) {
    arg0.deleteProgram(arg1);
}
export function __wbg_deleteQuery_ef51ea0a52420103(arg0, arg1) {
    arg0.deleteQuery(arg1);
}
export function __wbg_deleteRenderbuffer_ada86fd85d32984f(arg0, arg1) {
    arg0.deleteRenderbuffer(arg1);
}
export function __wbg_deleteRenderbuffer_c9320d711ddf649b(arg0, arg1) {
    arg0.deleteRenderbuffer(arg1);
}
export function __wbg_deleteSampler_5c045e0cc55813d4(arg0, arg1) {
    arg0.deleteSampler(arg1);
}
export function __wbg_deleteShader_3339454254c7147c(arg0, arg1) {
    arg0.deleteShader(arg1);
}
export function __wbg_deleteShader_79dbaaed69b7ca3b(arg0, arg1) {
    arg0.deleteShader(arg1);
}
export function __wbg_deleteSync_37ca83c429c43d8a(arg0, arg1) {
    arg0.deleteSync(arg1);
}
export function __wbg_deleteTexture_3acb672a45f9998a(arg0, arg1) {
    arg0.deleteTexture(arg1);
}
export function __wbg_deleteTexture_c1c58550dc55af5c(arg0, arg1) {
    arg0.deleteTexture(arg1);
}
export function __wbg_deleteVertexArrayOES_287cf2a2e8a27b13(arg0, arg1) {
    arg0.deleteVertexArrayOES(arg1);
}
export function __wbg_deleteVertexArray_8ee078fdb1fb1ffe(arg0, arg1) {
    arg0.deleteVertexArray(arg1);
}
export function __wbg_depthFunc_31b183b5b8ee478e(arg0, arg1) {
    arg0.depthFunc(arg1 >>> 0);
}
export function __wbg_depthFunc_eaca1bc79f7bf216(arg0, arg1) {
    arg0.depthFunc(arg1 >>> 0);
}
export function __wbg_depthMask_3a9074b08d1f68e5(arg0, arg1) {
    arg0.depthMask(arg1 !== 0);
}
export function __wbg_depthMask_cab7f2ae7f0e559c(arg0, arg1) {
    arg0.depthMask(arg1 !== 0);
}
export function __wbg_depthRange_797a71ba3b79267a(arg0, arg1, arg2) {
    arg0.depthRange(arg1, arg2);
}
export function __wbg_depthRange_c24a808b3496e0a9(arg0, arg1, arg2) {
    arg0.depthRange(arg1, arg2);
}
export function __wbg_description_f6ebcdce701b056b(arg0, arg1) {
    const ret = arg1.description;
    const ptr1 = passStringToWasm0(ret, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
    const len1 = WASM_VECTOR_LEN;
    getDataViewMemory0().setInt32(arg0 + 4 * 1, len1, true);
    getDataViewMemory0().setInt32(arg0 + 4 * 0, ptr1, true);
}
export function __wbg_destroy_a1ad55d8110037a7(arg0) {
    arg0.destroy();
}
export function __wbg_disableVertexAttribArray_25f8b2d699a4387a(arg0, arg1) {
    arg0.disableVertexAttribArray(arg1 >>> 0);
}
export function __wbg_disableVertexAttribArray_b395358ec5084c39(arg0, arg1) {
    arg0.disableVertexAttribArray(arg1 >>> 0);
}
export function __wbg_disable_4dca6ee0ccc91e4a(arg0, arg1) {
    arg0.disable(arg1 >>> 0);
}
export function __wbg_disable_cb1b3e6c1cee5202(arg0, arg1) {
    arg0.disable(arg1 >>> 0);
}
export function __wbg_document_2634180a4c694068(arg0) {
    const ret = arg0.document;
    return isLikeNone(ret) ? 0 : addToExternrefTable0(ret);
}
export function __wbg_done_b62d4a7d2286852a(arg0) {
    const ret = arg0.done;
    return ret;
}
export function __wbg_drawArraysInstancedANGLE_83c84d616f54261b(arg0, arg1, arg2, arg3, arg4) {
    arg0.drawArraysInstancedANGLE(arg1 >>> 0, arg2, arg3, arg4);
}
export function __wbg_drawArraysInstanced_999df3e7f5c8762b(arg0, arg1, arg2, arg3, arg4) {
    arg0.drawArraysInstanced(arg1 >>> 0, arg2, arg3, arg4);
}
export function __wbg_drawArrays_10e1254aa4524ae9(arg0, arg1, arg2, arg3) {
    arg0.drawArrays(arg1 >>> 0, arg2, arg3);
}
export function __wbg_drawArrays_42dbb4b0349c8f34(arg0, arg1, arg2, arg3) {
    arg0.drawArrays(arg1 >>> 0, arg2, arg3);
}
export function __wbg_drawBuffersWEBGL_3bfb30349766d902(arg0, arg1) {
    arg0.drawBuffersWEBGL(arg1);
}
export function __wbg_drawBuffers_558d96e52e754731(arg0, arg1) {
    arg0.drawBuffers(arg1);
}
export function __wbg_drawElementsInstancedANGLE_a73eba5955ee33fa(arg0, arg1, arg2, arg3, arg4, arg5) {
    arg0.drawElementsInstancedANGLE(arg1 >>> 0, arg2, arg3 >>> 0, arg4, arg5);
}
export function __wbg_drawElementsInstanced_fdc96cf6adbebc12(arg0, arg1, arg2, arg3, arg4, arg5) {
    arg0.drawElementsInstanced(arg1 >>> 0, arg2, arg3 >>> 0, arg4, arg5);
}
export function __wbg_draw_92eb37d6b3b2aab4(arg0, arg1, arg2, arg3, arg4) {
    arg0.draw(arg1 >>> 0, arg2 >>> 0, arg3 >>> 0, arg4 >>> 0);
}
export function __wbg_enableVertexAttribArray_4f0f3da1ae1fd116(arg0, arg1) {
    arg0.enableVertexAttribArray(arg1 >>> 0);
}
export function __wbg_enableVertexAttribArray_7fc50a6fdbc03eb3(arg0, arg1) {
    arg0.enableVertexAttribArray(arg1 >>> 0);
}
export function __wbg_enable_c6e523307311617a(arg0, arg1) {
    arg0.enable(arg1 >>> 0);
}
export function __wbg_enable_d1f42f78be33a553(arg0, arg1) {
    arg0.enable(arg1 >>> 0);
}
export function __wbg_endQuery_161170c5280a8293(arg0, arg1) {
    arg0.endQuery(arg1 >>> 0);
}
export function __wbg_end_d49513b309f4ca43(arg0) {
    arg0.end();
}
export function __wbg_entries_c261c3fa1f281256(arg0) {
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
export function __wbg_fenceSync_56efc7cc79111e54(arg0, arg1, arg2) {
    const ret = arg0.fenceSync(arg1 >>> 0, arg2 >>> 0);
    return isLikeNone(ret) ? 0 : addToExternrefTable0(ret);
}
export function __wbg_finish_6c7bba424ffe1bbc(arg0, arg1) {
    const ret = arg0.finish(arg1);
    return ret;
}
export function __wbg_finish_c40b67ff2af88e0c(arg0) {
    const ret = arg0.finish();
    return ret;
}
export function __wbg_flush_7ae42f071230db6b(arg0) {
    arg0.flush();
}
export function __wbg_flush_eb3fb8da2ec00d57(arg0) {
    arg0.flush();
}
export function __wbg_framebufferRenderbuffer_52ae9fcc29125a07(arg0, arg1, arg2, arg3, arg4) {
    arg0.framebufferRenderbuffer(arg1 >>> 0, arg2 >>> 0, arg3 >>> 0, arg4);
}
export function __wbg_framebufferRenderbuffer_f9d75924fbe9024a(arg0, arg1, arg2, arg3, arg4) {
    arg0.framebufferRenderbuffer(arg1 >>> 0, arg2 >>> 0, arg3 >>> 0, arg4);
}
export function __wbg_framebufferTexture2D_367ab597a005e8d9(arg0, arg1, arg2, arg3, arg4, arg5) {
    arg0.framebufferTexture2D(arg1 >>> 0, arg2 >>> 0, arg3 >>> 0, arg4, arg5);
}
export function __wbg_framebufferTexture2D_3a558e14f56720d2(arg0, arg1, arg2, arg3, arg4, arg5) {
    arg0.framebufferTexture2D(arg1 >>> 0, arg2 >>> 0, arg3 >>> 0, arg4, arg5);
}
export function __wbg_framebufferTextureLayer_2312acdc74f97676(arg0, arg1, arg2, arg3, arg4, arg5) {
    arg0.framebufferTextureLayer(arg1 >>> 0, arg2 >>> 0, arg3, arg4, arg5);
}
export function __wbg_framebufferTextureMultiviewOVR_bab62b45b7debf2c(arg0, arg1, arg2, arg3, arg4, arg5, arg6) {
    arg0.framebufferTextureMultiviewOVR(arg1 >>> 0, arg2 >>> 0, arg3, arg4, arg5, arg6);
}
export function __wbg_frontFace_9bdcf2a758e989e5(arg0, arg1) {
    arg0.frontFace(arg1 >>> 0);
}
export function __wbg_frontFace_c9bb1fa659ffd276(arg0, arg1) {
    arg0.frontFace(arg1 >>> 0);
}
export function __wbg_getBufferSubData_92680d3a2f7be029(arg0, arg1, arg2, arg3) {
    arg0.getBufferSubData(arg1 >>> 0, arg2, arg3);
}
export function __wbg_getContext_422b32d0ee4b8076() { return handleError(function (arg0, arg1, arg2, arg3) {
    const ret = arg0.getContext(getStringFromWasm0(arg1, arg2), arg3);
    return isLikeNone(ret) ? 0 : addToExternrefTable0(ret);
}, arguments); }
export function __wbg_getContext_486aab500e1c34c9() { return handleError(function (arg0, arg1, arg2) {
    const ret = arg0.getContext(getStringFromWasm0(arg1, arg2));
    return isLikeNone(ret) ? 0 : addToExternrefTable0(ret);
}, arguments); }
export function __wbg_getContext_70c2d1bed75d4122() { return handleError(function (arg0, arg1, arg2) {
    const ret = arg0.getContext(getStringFromWasm0(arg1, arg2));
    return isLikeNone(ret) ? 0 : addToExternrefTable0(ret);
}, arguments); }
export function __wbg_getContext_9fd4db9b1cf155db() { return handleError(function (arg0, arg1, arg2, arg3) {
    const ret = arg0.getContext(getStringFromWasm0(arg1, arg2), arg3);
    return isLikeNone(ret) ? 0 : addToExternrefTable0(ret);
}, arguments); }
export function __wbg_getCurrentTexture_274b67f871b2dea5() { return handleError(function (arg0) {
    const ret = arg0.getCurrentTexture();
    return ret;
}, arguments); }
export function __wbg_getExtension_11824edd67a143d8() { return handleError(function (arg0, arg1, arg2) {
    const ret = arg0.getExtension(getStringFromWasm0(arg1, arg2));
    return isLikeNone(ret) ? 0 : addToExternrefTable0(ret);
}, arguments); }
export function __wbg_getImageData_f8c683c68faf1d8c() { return handleError(function (arg0, arg1, arg2, arg3, arg4) {
    const ret = arg0.getImageData(arg1, arg2, arg3, arg4);
    return ret;
}, arguments); }
export function __wbg_getIndexedParameter_2b18df6fca85f751() { return handleError(function (arg0, arg1, arg2) {
    const ret = arg0.getIndexedParameter(arg1 >>> 0, arg2 >>> 0);
    return ret;
}, arguments); }
export function __wbg_getMappedRange_59829576da3edd39() { return handleError(function (arg0, arg1, arg2) {
    const ret = arg0.getMappedRange(arg1, arg2);
    return ret;
}, arguments); }
export function __wbg_getParameter_7f7f23cae98f2c81() { return handleError(function (arg0, arg1) {
    const ret = arg0.getParameter(arg1 >>> 0);
    return ret;
}, arguments); }
export function __wbg_getParameter_91a344e1a84a4669() { return handleError(function (arg0, arg1) {
    const ret = arg0.getParameter(arg1 >>> 0);
    return ret;
}, arguments); }
export function __wbg_getPreferredCanvasFormat_6f629398d892f0c9(arg0) {
    const ret = arg0.getPreferredCanvasFormat();
    return (__wbindgen_enum_GpuTextureFormat.indexOf(ret) + 1 || 96) - 1;
}
export function __wbg_getProgramInfoLog_35410850de9ccefe(arg0, arg1, arg2) {
    const ret = arg1.getProgramInfoLog(arg2);
    var ptr1 = isLikeNone(ret) ? 0 : passStringToWasm0(ret, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
    var len1 = WASM_VECTOR_LEN;
    getDataViewMemory0().setInt32(arg0 + 4 * 1, len1, true);
    getDataViewMemory0().setInt32(arg0 + 4 * 0, ptr1, true);
}
export function __wbg_getProgramInfoLog_cd84be80942f345b(arg0, arg1, arg2) {
    const ret = arg1.getProgramInfoLog(arg2);
    var ptr1 = isLikeNone(ret) ? 0 : passStringToWasm0(ret, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
    var len1 = WASM_VECTOR_LEN;
    getDataViewMemory0().setInt32(arg0 + 4 * 1, len1, true);
    getDataViewMemory0().setInt32(arg0 + 4 * 0, ptr1, true);
}
export function __wbg_getProgramParameter_039391d5ba319f50(arg0, arg1, arg2) {
    const ret = arg0.getProgramParameter(arg1, arg2 >>> 0);
    return ret;
}
export function __wbg_getProgramParameter_bbc667347ac2e882(arg0, arg1, arg2) {
    const ret = arg0.getProgramParameter(arg1, arg2 >>> 0);
    return ret;
}
export function __wbg_getQueryParameter_0599e85ddb81220b(arg0, arg1, arg2) {
    const ret = arg0.getQueryParameter(arg1, arg2 >>> 0);
    return ret;
}
export function __wbg_getShaderInfoLog_495bddda98172699(arg0, arg1, arg2) {
    const ret = arg1.getShaderInfoLog(arg2);
    var ptr1 = isLikeNone(ret) ? 0 : passStringToWasm0(ret, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
    var len1 = WASM_VECTOR_LEN;
    getDataViewMemory0().setInt32(arg0 + 4 * 1, len1, true);
    getDataViewMemory0().setInt32(arg0 + 4 * 0, ptr1, true);
}
export function __wbg_getShaderInfoLog_f423ce6d280ccca0(arg0, arg1, arg2) {
    const ret = arg1.getShaderInfoLog(arg2);
    var ptr1 = isLikeNone(ret) ? 0 : passStringToWasm0(ret, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
    var len1 = WASM_VECTOR_LEN;
    getDataViewMemory0().setInt32(arg0 + 4 * 1, len1, true);
    getDataViewMemory0().setInt32(arg0 + 4 * 0, ptr1, true);
}
export function __wbg_getShaderParameter_4eb65cfb174ceb22(arg0, arg1, arg2) {
    const ret = arg0.getShaderParameter(arg1, arg2 >>> 0);
    return ret;
}
export function __wbg_getShaderParameter_93cc1f20f1dd0b1e(arg0, arg1, arg2) {
    const ret = arg0.getShaderParameter(arg1, arg2 >>> 0);
    return ret;
}
export function __wbg_getSupportedExtensions_fbc6e8f81b1f5dbd(arg0) {
    const ret = arg0.getSupportedExtensions();
    return isLikeNone(ret) ? 0 : addToExternrefTable0(ret);
}
export function __wbg_getSupportedProfiles_e24289cb9a71b3f0(arg0) {
    const ret = arg0.getSupportedProfiles();
    return isLikeNone(ret) ? 0 : addToExternrefTable0(ret);
}
export function __wbg_getSyncParameter_9a2bda340ebe166f(arg0, arg1, arg2) {
    const ret = arg0.getSyncParameter(arg1, arg2 >>> 0);
    return ret;
}
export function __wbg_getUniformBlockIndex_3bf387d80cee898d(arg0, arg1, arg2, arg3) {
    const ret = arg0.getUniformBlockIndex(arg1, getStringFromWasm0(arg2, arg3));
    return ret;
}
export function __wbg_getUniformLocation_340155dc706d3fea(arg0, arg1, arg2, arg3) {
    const ret = arg0.getUniformLocation(arg1, getStringFromWasm0(arg2, arg3));
    return isLikeNone(ret) ? 0 : addToExternrefTable0(ret);
}
export function __wbg_getUniformLocation_ab63f569a4e41744(arg0, arg1, arg2, arg3) {
    const ret = arg0.getUniformLocation(arg1, getStringFromWasm0(arg2, arg3));
    return isLikeNone(ret) ? 0 : addToExternrefTable0(ret);
}
export function __wbg_get_197a3fe98f169e38(arg0, arg1) {
    const ret = arg0[arg1 >>> 0];
    return ret;
}
export function __wbg_get_37b48b8fa52d1f2c(arg0, arg1) {
    const ret = arg0[arg1 >>> 0];
    return isLikeNone(ret) ? 0 : addToExternrefTable0(ret);
}
export function __wbg_get_9a29be2cb383ed9a() { return handleError(function (arg0, arg1) {
    const ret = Reflect.get(arg0, arg1);
    return ret;
}, arguments); }
export function __wbg_get_dddb90ff5d27a080() { return handleError(function (arg0, arg1) {
    const ret = Reflect.get(arg0, arg1);
    return ret;
}, arguments); }
export function __wbg_get_unchecked_54a4374c38e08460(arg0, arg1) {
    const ret = arg0[arg1 >>> 0];
    return ret;
}
export function __wbg_get_with_ref_key_6412cf3094599694(arg0, arg1) {
    const ret = arg0[arg1];
    return ret;
}
export function __wbg_gpu_cbd27ad0589bc0b3(arg0) {
    const ret = arg0.gpu;
    return ret;
}
export function __wbg_height_3ad24dc28193a959(arg0) {
    const ret = arg0.height;
    return ret;
}
export function __wbg_height_519497d37234f77b(arg0) {
    const ret = arg0.height;
    return ret;
}
export function __wbg_height_5a65f00c2e236c0e(arg0) {
    const ret = arg0.height;
    return ret;
}
export function __wbg_height_8fb50acea2970780(arg0) {
    const ret = arg0.height;
    return ret;
}
export function __wbg_height_a04613570d793df2(arg0) {
    const ret = arg0.height;
    return ret;
}
export function __wbg_includes_83dff8d05da243c5(arg0, arg1, arg2) {
    const ret = arg0.includes(arg1, arg2);
    return ret;
}
export function __wbg_info_91a8fcd51fd17fff(arg0) {
    const ret = arg0.info;
    return ret;
}
export function __wbg_instanceof_ArrayBuffer_2a7bb09fee70c2da(arg0) {
    let result;
    try {
        result = arg0 instanceof ArrayBuffer;
    } catch (_) {
        result = false;
    }
    const ret = result;
    return ret;
}
export function __wbg_instanceof_GpuAdapter_1297a3a5ce0db3ff(arg0) {
    let result;
    try {
        result = arg0 instanceof GPUAdapter;
    } catch (_) {
        result = false;
    }
    const ret = result;
    return ret;
}
export function __wbg_instanceof_GpuCanvasContext_13613277d7bf3768(arg0) {
    let result;
    try {
        result = arg0 instanceof GPUCanvasContext;
    } catch (_) {
        result = false;
    }
    const ret = result;
    return ret;
}
export function __wbg_instanceof_HtmlCanvasElement_8ce29a370a2b10a4(arg0) {
    let result;
    try {
        result = arg0 instanceof HTMLCanvasElement;
    } catch (_) {
        result = false;
    }
    const ret = result;
    return ret;
}
export function __wbg_instanceof_Map_afa18d5840c04c15(arg0) {
    let result;
    try {
        result = arg0 instanceof Map;
    } catch (_) {
        result = false;
    }
    const ret = result;
    return ret;
}
export function __wbg_instanceof_Object_60be3eaa7a661141(arg0) {
    let result;
    try {
        result = arg0 instanceof Object;
    } catch (_) {
        result = false;
    }
    const ret = result;
    return ret;
}
export function __wbg_instanceof_OffscreenCanvas_be4f56ade081603c(arg0) {
    let result;
    try {
        result = arg0 instanceof OffscreenCanvas;
    } catch (_) {
        result = false;
    }
    const ret = result;
    return ret;
}
export function __wbg_instanceof_Uint8Array_f080092dc70f5d58(arg0) {
    let result;
    try {
        result = arg0 instanceof Uint8Array;
    } catch (_) {
        result = false;
    }
    const ret = result;
    return ret;
}
export function __wbg_instanceof_WebGl2RenderingContext_b30fc72a0130431a(arg0) {
    let result;
    try {
        result = arg0 instanceof WebGL2RenderingContext;
    } catch (_) {
        result = false;
    }
    const ret = result;
    return ret;
}
export function __wbg_instanceof_Window_0d356b88a2f77c42(arg0) {
    let result;
    try {
        result = arg0 instanceof Window;
    } catch (_) {
        result = false;
    }
    const ret = result;
    return ret;
}
export function __wbg_invalidateFramebuffer_08fe15b00b070e47() { return handleError(function (arg0, arg1, arg2) {
    arg0.invalidateFramebuffer(arg1 >>> 0, arg2);
}, arguments); }
export function __wbg_isArray_145a34fd0a38d37b(arg0) {
    const ret = Array.isArray(arg0);
    return ret;
}
export function __wbg_isSafeInteger_a3389a198582f5f6(arg0) {
    const ret = Number.isSafeInteger(arg0);
    return ret;
}
export function __wbg_is_de5b366c746e004c(arg0, arg1) {
    const ret = Object.is(arg0, arg1);
    return ret;
}
export function __wbg_iterator_cc47ba25a2be735a() {
    const ret = Symbol.iterator;
    return ret;
}
export function __wbg_label_9a8583e3a20fafc7(arg0, arg1) {
    const ret = arg1.label;
    const ptr1 = passStringToWasm0(ret, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
    const len1 = WASM_VECTOR_LEN;
    getDataViewMemory0().setInt32(arg0 + 4 * 1, len1, true);
    getDataViewMemory0().setInt32(arg0 + 4 * 0, ptr1, true);
}
export function __wbg_length_589238bdcf171f0e(arg0) {
    const ret = arg0.length;
    return ret;
}
export function __wbg_length_c6054974c0a6cdb9(arg0) {
    const ret = arg0.length;
    return ret;
}
export function __wbg_limits_25f7265ea0cad6c5(arg0) {
    const ret = arg0.limits;
    return ret;
}
export function __wbg_linkProgram_6a2eee02a03b9b00(arg0, arg1) {
    arg0.linkProgram(arg1);
}
export function __wbg_linkProgram_e23a348b0f6e0c4f(arg0, arg1) {
    arg0.linkProgram(arg1);
}
export function __wbg_mapAsync_e3cfbd141919d03c(arg0, arg1, arg2, arg3) {
    const ret = arg0.mapAsync(arg1 >>> 0, arg2, arg3);
    return ret;
}
export function __wbg_maxBindGroups_7e4965b5daa53b23(arg0) {
    const ret = arg0.maxBindGroups;
    return ret;
}
export function __wbg_maxBindingsPerBindGroup_5d11588150650215(arg0) {
    const ret = arg0.maxBindingsPerBindGroup;
    return ret;
}
export function __wbg_maxBufferSize_b59f147488bf047a(arg0) {
    const ret = arg0.maxBufferSize;
    return ret;
}
export function __wbg_maxColorAttachmentBytesPerSample_726ea37aedfb839a(arg0) {
    const ret = arg0.maxColorAttachmentBytesPerSample;
    return ret;
}
export function __wbg_maxColorAttachments_62ecca7ef94d78e4(arg0) {
    const ret = arg0.maxColorAttachments;
    return ret;
}
export function __wbg_maxComputeInvocationsPerWorkgroup_a14458d75e0b90ac(arg0) {
    const ret = arg0.maxComputeInvocationsPerWorkgroup;
    return ret;
}
export function __wbg_maxComputeWorkgroupSizeX_6b8c17d5e4738e77(arg0) {
    const ret = arg0.maxComputeWorkgroupSizeX;
    return ret;
}
export function __wbg_maxComputeWorkgroupSizeY_13b5de41c6e0bc2a(arg0) {
    const ret = arg0.maxComputeWorkgroupSizeY;
    return ret;
}
export function __wbg_maxComputeWorkgroupSizeZ_b12d7f3e670aa0a2(arg0) {
    const ret = arg0.maxComputeWorkgroupSizeZ;
    return ret;
}
export function __wbg_maxComputeWorkgroupStorageSize_886498bc3b0baa23(arg0) {
    const ret = arg0.maxComputeWorkgroupStorageSize;
    return ret;
}
export function __wbg_maxComputeWorkgroupsPerDimension_144b6bbf6ac24451(arg0) {
    const ret = arg0.maxComputeWorkgroupsPerDimension;
    return ret;
}
export function __wbg_maxDynamicStorageBuffersPerPipelineLayout_d81239ef90f4f920(arg0) {
    const ret = arg0.maxDynamicStorageBuffersPerPipelineLayout;
    return ret;
}
export function __wbg_maxDynamicUniformBuffersPerPipelineLayout_0cca7d1cb9e5adf7(arg0) {
    const ret = arg0.maxDynamicUniformBuffersPerPipelineLayout;
    return ret;
}
export function __wbg_maxInterStageShaderVariables_4504147f810dd43d(arg0) {
    const ret = arg0.maxInterStageShaderVariables;
    return ret;
}
export function __wbg_maxSampledTexturesPerShaderStage_54e5ed0537676c83(arg0) {
    const ret = arg0.maxSampledTexturesPerShaderStage;
    return ret;
}
export function __wbg_maxSamplersPerShaderStage_71315fab0d7f34b1(arg0) {
    const ret = arg0.maxSamplersPerShaderStage;
    return ret;
}
export function __wbg_maxStorageBufferBindingSize_779fd522aaaa6f90(arg0) {
    const ret = arg0.maxStorageBufferBindingSize;
    return ret;
}
export function __wbg_maxStorageBuffersPerShaderStage_c99b4f72aaf19e34(arg0) {
    const ret = arg0.maxStorageBuffersPerShaderStage;
    return ret;
}
export function __wbg_maxStorageTexturesPerShaderStage_5403c17d11da5280(arg0) {
    const ret = arg0.maxStorageTexturesPerShaderStage;
    return ret;
}
export function __wbg_maxTextureArrayLayers_eca9fa36b3d46099(arg0) {
    const ret = arg0.maxTextureArrayLayers;
    return ret;
}
export function __wbg_maxTextureDimension1D_a7d9d7ecd19aae9b(arg0) {
    const ret = arg0.maxTextureDimension1D;
    return ret;
}
export function __wbg_maxTextureDimension2D_c6a3937eb3ab18df(arg0) {
    const ret = arg0.maxTextureDimension2D;
    return ret;
}
export function __wbg_maxTextureDimension3D_d941aa547d9e0801(arg0) {
    const ret = arg0.maxTextureDimension3D;
    return ret;
}
export function __wbg_maxUniformBufferBindingSize_1e8c92a2094b7ce7(arg0) {
    const ret = arg0.maxUniformBufferBindingSize;
    return ret;
}
export function __wbg_maxUniformBuffersPerShaderStage_83cde6650612f178(arg0) {
    const ret = arg0.maxUniformBuffersPerShaderStage;
    return ret;
}
export function __wbg_maxVertexAttributes_dd313a3540d56e88(arg0) {
    const ret = arg0.maxVertexAttributes;
    return ret;
}
export function __wbg_maxVertexBufferArrayStride_6fd082d9954d1f4a(arg0) {
    const ret = arg0.maxVertexBufferArrayStride;
    return ret;
}
export function __wbg_maxVertexBuffers_bbd14712ac158c6f(arg0) {
    const ret = arg0.maxVertexBuffers;
    return ret;
}
export function __wbg_minStorageBufferOffsetAlignment_726c386298254510(arg0) {
    const ret = arg0.minStorageBufferOffsetAlignment;
    return ret;
}
export function __wbg_minUniformBufferOffsetAlignment_6df1f95f5974788e(arg0) {
    const ret = arg0.minUniformBufferOffsetAlignment;
    return ret;
}
export function __wbg_navigator_017bc45e84c473cc(arg0) {
    const ret = arg0.navigator;
    return ret;
}
export function __wbg_navigator_935098efd1dc7fe5(arg0) {
    const ret = arg0.navigator;
    return ret;
}
export function __wbg_new_227d7c05414eb861() {
    const ret = new Error();
    return ret;
}
export function __wbg_new_2e117a478906f062() {
    const ret = new Object();
    return ret;
}
export function __wbg_new_36e147a8ced3c6e0() {
    const ret = new Array();
    return ret;
}
export function __wbg_new_55041f0354b8ea99() { return handleError(function (arg0, arg1) {
    const ret = new OffscreenCanvas(arg0 >>> 0, arg1 >>> 0);
    return ret;
}, arguments); }
export function __wbg_new_81880fb5002cb255(arg0) {
    const ret = new Uint8Array(arg0);
    return ret;
}
export function __wbg_new_typed_00a409eb4ec4f2d9(arg0, arg1) {
    try {
        var state0 = {a: arg0, b: arg1};
        var cb0 = (arg0, arg1) => {
            const a = state0.a;
            state0.a = 0;
            try {
                return wasm_bindgen__convert__closures_____invoke__h193aabdc3d7c65f4(a, state0.b, arg0, arg1);
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
export function __wbg_new_with_byte_offset_and_length_f2b65504a914f37a(arg0, arg1, arg2) {
    const ret = new Uint8Array(arg0, arg1 >>> 0, arg2 >>> 0);
    return ret;
}
export function __wbg_new_with_u8_clamped_array_and_sh_adb3f647b0414eb2() { return handleError(function (arg0, arg1, arg2, arg3) {
    const ret = new ImageData(getClampedArrayU8FromWasm0(arg0, arg1), arg2 >>> 0, arg3 >>> 0);
    return ret;
}, arguments); }
export function __wbg_next_0c4066e251d2eff9() { return handleError(function (arg0) {
    const ret = arg0.next();
    return ret;
}, arguments); }
export function __wbg_next_402fa10b59ab20c3(arg0) {
    const ret = arg0.next;
    return ret;
}
export function __wbg_of_62183ea089c00bfa(arg0) {
    const ret = Array.of(arg0);
    return ret;
}
export function __wbg_onSubmittedWorkDone_5f36409816d68e04(arg0) {
    const ret = arg0.onSubmittedWorkDone();
    return ret;
}
export function __wbg_pixelStorei_55ad4c67b699537c(arg0, arg1, arg2) {
    arg0.pixelStorei(arg1 >>> 0, arg2);
}
export function __wbg_pixelStorei_a78a504be58d1d0a(arg0, arg1, arg2) {
    arg0.pixelStorei(arg1 >>> 0, arg2);
}
export function __wbg_polygonOffset_06dc6468c12a57e1(arg0, arg1, arg2) {
    arg0.polygonOffset(arg1, arg2);
}
export function __wbg_polygonOffset_a4f07d97b9b0dced(arg0, arg1, arg2) {
    arg0.polygonOffset(arg1, arg2);
}
export function __wbg_prototypesetcall_d721637c7ca66eb8(arg0, arg1, arg2) {
    Uint8Array.prototype.set.call(getArrayU8FromWasm0(arg0, arg1), arg2);
}
export function __wbg_push_f724b5db8acf89d2(arg0, arg1) {
    const ret = arg0.push(arg1);
    return ret;
}
export function __wbg_putImageData_07049afdff5e311f() { return handleError(function (arg0, arg1, arg2, arg3) {
    arg0.putImageData(arg1, arg2, arg3);
}, arguments); }
export function __wbg_queryCounterEXT_ebb00bcc96221671(arg0, arg1, arg2) {
    arg0.queryCounterEXT(arg1, arg2 >>> 0);
}
export function __wbg_querySelectorAll_ffda3c891a9eb29a() { return handleError(function (arg0, arg1, arg2) {
    const ret = arg0.querySelectorAll(getStringFromWasm0(arg1, arg2));
    return ret;
}, arguments); }
export function __wbg_querySelector_1f3658f4b48e268b() { return handleError(function (arg0, arg1, arg2) {
    const ret = arg0.querySelector(getStringFromWasm0(arg1, arg2));
    return isLikeNone(ret) ? 0 : addToExternrefTable0(ret);
}, arguments); }
export function __wbg_queueMicrotask_1c9b3800e321a967(arg0) {
    const ret = arg0.queueMicrotask;
    return ret;
}
export function __wbg_queueMicrotask_311744e534a929a3(arg0) {
    queueMicrotask(arg0);
}
export function __wbg_queue_7bbf92178b06da19(arg0) {
    const ret = arg0.queue;
    return ret;
}
export function __wbg_readBuffer_361ec5474f3aae49(arg0, arg1) {
    arg0.readBuffer(arg1 >>> 0);
}
export function __wbg_readPixels_05377f8b6fa1d8eb() { return handleError(function (arg0, arg1, arg2, arg3, arg4, arg5, arg6, arg7) {
    arg0.readPixels(arg1, arg2, arg3, arg4, arg5 >>> 0, arg6 >>> 0, arg7);
}, arguments); }
export function __wbg_readPixels_5840000f3e22f3ce() { return handleError(function (arg0, arg1, arg2, arg3, arg4, arg5, arg6, arg7) {
    arg0.readPixels(arg1, arg2, arg3, arg4, arg5 >>> 0, arg6 >>> 0, arg7);
}, arguments); }
export function __wbg_readPixels_5bf204799ed2272f() { return handleError(function (arg0, arg1, arg2, arg3, arg4, arg5, arg6, arg7) {
    arg0.readPixels(arg1, arg2, arg3, arg4, arg5 >>> 0, arg6 >>> 0, arg7);
}, arguments); }
export function __wbg_renderbufferStorageMultisample_d64a8abb8689a968(arg0, arg1, arg2, arg3, arg4, arg5) {
    arg0.renderbufferStorageMultisample(arg1 >>> 0, arg2, arg3 >>> 0, arg4, arg5);
}
export function __wbg_renderbufferStorage_2918fb696fd45663(arg0, arg1, arg2, arg3, arg4) {
    arg0.renderbufferStorage(arg1 >>> 0, arg2 >>> 0, arg3, arg4);
}
export function __wbg_renderbufferStorage_3049e13db5c4e60e(arg0, arg1, arg2, arg3, arg4) {
    arg0.renderbufferStorage(arg1 >>> 0, arg2 >>> 0, arg3, arg4);
}
export function __wbg_requestAdapter_0049683abd339828(arg0, arg1) {
    const ret = arg0.requestAdapter(arg1);
    return ret;
}
export function __wbg_requestAdapter_67400a4450a20436(arg0) {
    const ret = arg0.requestAdapter();
    return ret;
}
export function __wbg_requestDevice_921f0a221b4492fa(arg0, arg1) {
    const ret = arg0.requestDevice(arg1);
    return ret;
}
export function __wbg_resolve_d82363d90af6928a(arg0) {
    const ret = Promise.resolve(arg0);
    return ret;
}
export function __wbg_samplerParameterf_3157ba41c0f4d97a(arg0, arg1, arg2, arg3) {
    arg0.samplerParameterf(arg1, arg2 >>> 0, arg3);
}
export function __wbg_samplerParameteri_f85a29156e790189(arg0, arg1, arg2, arg3) {
    arg0.samplerParameteri(arg1, arg2 >>> 0, arg3);
}
export function __wbg_scissor_6c024669fbf4fe72(arg0, arg1, arg2, arg3, arg4) {
    arg0.scissor(arg1, arg2, arg3, arg4);
}
export function __wbg_scissor_f9696c630e464977(arg0, arg1, arg2, arg3, arg4) {
    arg0.scissor(arg1, arg2, arg3, arg4);
}
export function __wbg_setBindGroup_851043cf286f55f2() { return handleError(function (arg0, arg1, arg2, arg3, arg4, arg5, arg6) {
    arg0.setBindGroup(arg1 >>> 0, arg2, getArrayU32FromWasm0(arg3, arg4), arg5, arg6 >>> 0);
}, arguments); }
export function __wbg_setBindGroup_b546d112a2d27da3(arg0, arg1, arg2) {
    arg0.setBindGroup(arg1 >>> 0, arg2);
}
export function __wbg_setPipeline_b0ecc74bdf8be629(arg0, arg1) {
    arg0.setPipeline(arg1);
}
export function __wbg_setVertexBuffer_1d85cc2da6e137a7(arg0, arg1, arg2, arg3, arg4) {
    arg0.setVertexBuffer(arg1 >>> 0, arg2, arg3, arg4);
}
export function __wbg_setVertexBuffer_7f434cea2ca9b640(arg0, arg1, arg2, arg3) {
    arg0.setVertexBuffer(arg1 >>> 0, arg2, arg3);
}
export function __wbg_set_272b80acaf9a75e8(arg0, arg1, arg2) {
    arg0.set(arg1, arg2 >>> 0);
}
export function __wbg_set_4564f7dc44fcb0c9() { return handleError(function (arg0, arg1, arg2) {
    const ret = Reflect.set(arg0, arg1, arg2);
    return ret;
}, arguments); }
export function __wbg_set_a_66601ffa2f4cbde8(arg0, arg1) {
    arg0.a = arg1;
}
export function __wbg_set_access_08d6bdbda9aaa266(arg0, arg1) {
    arg0.access = __wbindgen_enum_GpuStorageTextureAccess[arg1];
}
export function __wbg_set_address_mode_u_f80c73fc36e83289(arg0, arg1) {
    arg0.addressModeU = __wbindgen_enum_GpuAddressMode[arg1];
}
export function __wbg_set_address_mode_v_3dee7a0095c326a6(arg0, arg1) {
    arg0.addressModeV = __wbindgen_enum_GpuAddressMode[arg1];
}
export function __wbg_set_address_mode_w_e2be52f6efa2d9c7(arg0, arg1) {
    arg0.addressModeW = __wbindgen_enum_GpuAddressMode[arg1];
}
export function __wbg_set_alpha_bb6680aaf01cdc62(arg0, arg1) {
    arg0.alpha = arg1;
}
export function __wbg_set_alpha_mode_84140629c3b15c51(arg0, arg1) {
    arg0.alphaMode = __wbindgen_enum_GpuCanvasAlphaMode[arg1];
}
export function __wbg_set_alpha_to_coverage_enabled_cac9212446be9cab(arg0, arg1) {
    arg0.alphaToCoverageEnabled = arg1 !== 0;
}
export function __wbg_set_array_layer_count_01e36293bee85e02(arg0, arg1) {
    arg0.arrayLayerCount = arg1 >>> 0;
}
export function __wbg_set_array_stride_34f4a147a16bff79(arg0, arg1) {
    arg0.arrayStride = arg1;
}
export function __wbg_set_aspect_0675b2844dd12eb1(arg0, arg1) {
    arg0.aspect = __wbindgen_enum_GpuTextureAspect[arg1];
}
export function __wbg_set_aspect_7829cca737701915(arg0, arg1) {
    arg0.aspect = __wbindgen_enum_GpuTextureAspect[arg1];
}
export function __wbg_set_aspect_e09cb246c2df6f46(arg0, arg1) {
    arg0.aspect = __wbindgen_enum_GpuTextureAspect[arg1];
}
export function __wbg_set_attributes_7ee8e82215809bfa(arg0, arg1) {
    arg0.attributes = arg1;
}
export function __wbg_set_b_103abfb3e69345a3(arg0, arg1) {
    arg0.b = arg1;
}
export function __wbg_set_base_array_layer_ff3450be9aa7d232(arg0, arg1) {
    arg0.baseArrayLayer = arg1 >>> 0;
}
export function __wbg_set_base_mip_level_43e77e5d237ede24(arg0, arg1) {
    arg0.baseMipLevel = arg1 >>> 0;
}
export function __wbg_set_beginning_of_pass_write_index_abea1e4e6c6095e1(arg0, arg1) {
    arg0.beginningOfPassWriteIndex = arg1 >>> 0;
}
export function __wbg_set_bind_group_layouts_078241cf2822c39e(arg0, arg1) {
    arg0.bindGroupLayouts = arg1;
}
export function __wbg_set_binding_d683cd9c1d4bcfed(arg0, arg1) {
    arg0.binding = arg1 >>> 0;
}
export function __wbg_set_binding_e9ba14423117de0a(arg0, arg1) {
    arg0.binding = arg1 >>> 0;
}
export function __wbg_set_blend_9eab91d6edf500f9(arg0, arg1) {
    arg0.blend = arg1;
}
export function __wbg_set_buffer_598ab98a251b8f91(arg0, arg1) {
    arg0.buffer = arg1;
}
export function __wbg_set_buffer_73d9f6fea9c41867(arg0, arg1) {
    arg0.buffer = arg1;
}
export function __wbg_set_buffer_88dfc353992be57b(arg0, arg1) {
    arg0.buffer = arg1;
}
export function __wbg_set_buffers_93f3f75d7338864f(arg0, arg1) {
    arg0.buffers = arg1;
}
export function __wbg_set_bytes_per_row_0bdd54b7fc03c765(arg0, arg1) {
    arg0.bytesPerRow = arg1 >>> 0;
}
export function __wbg_set_bytes_per_row_4d62ead4cbf1cd75(arg0, arg1) {
    arg0.bytesPerRow = arg1 >>> 0;
}
export function __wbg_set_clear_value_c1a82bbe9a80b6ab(arg0, arg1) {
    arg0.clearValue = arg1;
}
export function __wbg_set_code_6a0d763da082dcfb(arg0, arg1, arg2) {
    arg0.code = getStringFromWasm0(arg1, arg2);
}
export function __wbg_set_color_495aa415ae5a39c9(arg0, arg1) {
    arg0.color = arg1;
}
export function __wbg_set_color_attachments_6705c6b1e98a3040(arg0, arg1) {
    arg0.colorAttachments = arg1;
}
export function __wbg_set_compare_8aedfdbdc96ff4d7(arg0, arg1) {
    arg0.compare = __wbindgen_enum_GpuCompareFunction[arg1];
}
export function __wbg_set_compare_a9a06469832600ec(arg0, arg1) {
    arg0.compare = __wbindgen_enum_GpuCompareFunction[arg1];
}
export function __wbg_set_count_34ecf81b3ad7e448(arg0, arg1) {
    arg0.count = arg1 >>> 0;
}
export function __wbg_set_cull_mode_8e533f32672a379b(arg0, arg1) {
    arg0.cullMode = __wbindgen_enum_GpuCullMode[arg1];
}
export function __wbg_set_depth_bias_07f95aa380a3e46e(arg0, arg1) {
    arg0.depthBias = arg1;
}
export function __wbg_set_depth_bias_clamp_968b03f74984c77b(arg0, arg1) {
    arg0.depthBiasClamp = arg1;
}
export function __wbg_set_depth_bias_slope_scale_478b204b4910400f(arg0, arg1) {
    arg0.depthBiasSlopeScale = arg1;
}
export function __wbg_set_depth_clear_value_25268aa6b7cae2e0(arg0, arg1) {
    arg0.depthClearValue = arg1;
}
export function __wbg_set_depth_compare_c017fcac5327dfbb(arg0, arg1) {
    arg0.depthCompare = __wbindgen_enum_GpuCompareFunction[arg1];
}
export function __wbg_set_depth_fail_op_8484012cd5e4987c(arg0, arg1) {
    arg0.depthFailOp = __wbindgen_enum_GpuStencilOperation[arg1];
}
export function __wbg_set_depth_load_op_ed90e4eaf314a16c(arg0, arg1) {
    arg0.depthLoadOp = __wbindgen_enum_GpuLoadOp[arg1];
}
export function __wbg_set_depth_or_array_layers_f8981011496f12e7(arg0, arg1) {
    arg0.depthOrArrayLayers = arg1 >>> 0;
}
export function __wbg_set_depth_read_only_90cca09674f446be(arg0, arg1) {
    arg0.depthReadOnly = arg1 !== 0;
}
export function __wbg_set_depth_stencil_attachment_be8301fa499cd3db(arg0, arg1) {
    arg0.depthStencilAttachment = arg1;
}
export function __wbg_set_depth_stencil_d536398c1b29bb38(arg0, arg1) {
    arg0.depthStencil = arg1;
}
export function __wbg_set_depth_store_op_8e9b1d0e47077643(arg0, arg1) {
    arg0.depthStoreOp = __wbindgen_enum_GpuStoreOp[arg1];
}
export function __wbg_set_depth_write_enabled_adc2094871d66639(arg0, arg1) {
    arg0.depthWriteEnabled = arg1 !== 0;
}
export function __wbg_set_device_47147a331245777f(arg0, arg1) {
    arg0.device = arg1;
}
export function __wbg_set_dimension_b4da3979dc699ef8(arg0, arg1) {
    arg0.dimension = __wbindgen_enum_GpuTextureViewDimension[arg1];
}
export function __wbg_set_dimension_d4f0c50e75083b7f(arg0, arg1) {
    arg0.dimension = __wbindgen_enum_GpuTextureDimension[arg1];
}
export function __wbg_set_dst_factor_e44fc612d5e5bff4(arg0, arg1) {
    arg0.dstFactor = __wbindgen_enum_GpuBlendFactor[arg1];
}
export function __wbg_set_end_of_pass_write_index_1cd39b9bafe090cc(arg0, arg1) {
    arg0.endOfPassWriteIndex = arg1 >>> 0;
}
export function __wbg_set_entries_070b048e4bea0c29(arg0, arg1) {
    arg0.entries = arg1;
}
export function __wbg_set_entries_f9b7f3d4e9faccf4(arg0, arg1) {
    arg0.entries = arg1;
}
export function __wbg_set_entry_point_0116a9f5d58cf0aa(arg0, arg1, arg2) {
    arg0.entryPoint = getStringFromWasm0(arg1, arg2);
}
export function __wbg_set_entry_point_f04e91eced449196(arg0, arg1, arg2) {
    arg0.entryPoint = getStringFromWasm0(arg1, arg2);
}
export function __wbg_set_external_texture_cf122b1392d58f37(arg0, arg1) {
    arg0.externalTexture = arg1;
}
export function __wbg_set_fail_op_e7eb17ed0228b457(arg0, arg1) {
    arg0.failOp = __wbindgen_enum_GpuStencilOperation[arg1];
}
export function __wbg_set_flip_y_c75446cb371a71ee(arg0, arg1) {
    arg0.flipY = arg1 !== 0;
}
export function __wbg_set_format_119bda0a3d0b3f47(arg0, arg1) {
    arg0.format = __wbindgen_enum_GpuTextureFormat[arg1];
}
export function __wbg_set_format_27c63de9b0ec1cb3(arg0, arg1) {
    arg0.format = __wbindgen_enum_GpuTextureFormat[arg1];
}
export function __wbg_set_format_75eb905a003c2f61(arg0, arg1) {
    arg0.format = __wbindgen_enum_GpuTextureFormat[arg1];
}
export function __wbg_set_format_8b8359f261ea64b9(arg0, arg1) {
    arg0.format = __wbindgen_enum_GpuVertexFormat[arg1];
}
export function __wbg_set_format_a5d373801c562623(arg0, arg1) {
    arg0.format = __wbindgen_enum_GpuTextureFormat[arg1];
}
export function __wbg_set_format_b08d87d5f33bcd89(arg0, arg1) {
    arg0.format = __wbindgen_enum_GpuTextureFormat[arg1];
}
export function __wbg_set_format_c1a342a37ced3e12(arg0, arg1) {
    arg0.format = __wbindgen_enum_GpuTextureFormat[arg1];
}
export function __wbg_set_fragment_41044c9110c69c90(arg0, arg1) {
    arg0.fragment = arg1;
}
export function __wbg_set_front_face_9c9f0518a3109d98(arg0, arg1) {
    arg0.frontFace = __wbindgen_enum_GpuFrontFace[arg1];
}
export function __wbg_set_g_a39877021b450e75(arg0, arg1) {
    arg0.g = arg1;
}
export function __wbg_set_has_dynamic_offset_69725fed837748fe(arg0, arg1) {
    arg0.hasDynamicOffset = arg1 !== 0;
}
export function __wbg_set_height_975770494a218d52(arg0, arg1) {
    arg0.height = arg1 >>> 0;
}
export function __wbg_set_height_ad5056ea051acd78(arg0, arg1) {
    arg0.height = arg1 >>> 0;
}
export function __wbg_set_height_ef298446b359b0c5(arg0, arg1) {
    arg0.height = arg1 >>> 0;
}
export function __wbg_set_label_26577513096f145b(arg0, arg1, arg2) {
    arg0.label = getStringFromWasm0(arg1, arg2);
}
export function __wbg_set_label_2816ddca7866dcfa(arg0, arg1, arg2) {
    arg0.label = getStringFromWasm0(arg1, arg2);
}
export function __wbg_set_label_2a41a6f671383447(arg0, arg1, arg2) {
    arg0.label = getStringFromWasm0(arg1, arg2);
}
export function __wbg_set_label_325c5e4b70c1568f(arg0, arg1, arg2) {
    arg0.label = getStringFromWasm0(arg1, arg2);
}
export function __wbg_set_label_37d0faa0c9b7dee4(arg0, arg1, arg2) {
    arg0.label = getStringFromWasm0(arg1, arg2);
}
export function __wbg_set_label_3e306b2e8f9db666(arg0, arg1, arg2) {
    arg0.label = getStringFromWasm0(arg1, arg2);
}
export function __wbg_set_label_5514e44725004e89(arg0, arg1, arg2) {
    arg0.label = getStringFromWasm0(arg1, arg2);
}
export function __wbg_set_label_570d3dee0e80279e(arg0, arg1, arg2) {
    arg0.label = getStringFromWasm0(arg1, arg2);
}
export function __wbg_set_label_58fbc9fcc6363f16(arg0, arg1, arg2) {
    arg0.label = getStringFromWasm0(arg1, arg2);
}
export function __wbg_set_label_5c952448f9d59f36(arg0, arg1, arg2) {
    arg0.label = getStringFromWasm0(arg1, arg2);
}
export function __wbg_set_label_782e33de78d86641(arg0, arg1, arg2) {
    arg0.label = getStringFromWasm0(arg1, arg2);
}
export function __wbg_set_label_837a3b8ff99c2db3(arg0, arg1, arg2) {
    arg0.label = getStringFromWasm0(arg1, arg2);
}
export function __wbg_set_label_8df6673e1e141fcc(arg0, arg1, arg2) {
    arg0.label = getStringFromWasm0(arg1, arg2);
}
export function __wbg_set_layout_a6ee8e74696bc0c8(arg0, arg1) {
    arg0.layout = arg1;
}
export function __wbg_set_layout_d701bf37a1e489c6(arg0, arg1) {
    arg0.layout = arg1;
}
export function __wbg_set_load_op_e8ff3e1c81f7398d(arg0, arg1) {
    arg0.loadOp = __wbindgen_enum_GpuLoadOp[arg1];
}
export function __wbg_set_lod_max_clamp_a9f93b2e2ae9023d(arg0, arg1) {
    arg0.lodMaxClamp = arg1;
}
export function __wbg_set_lod_min_clamp_342b47161f1fa002(arg0, arg1) {
    arg0.lodMinClamp = arg1;
}
export function __wbg_set_mag_filter_28e863ff1a386f86(arg0, arg1) {
    arg0.magFilter = __wbindgen_enum_GpuFilterMode[arg1];
}
export function __wbg_set_mapped_at_creation_7f0aad21612f3e22(arg0, arg1) {
    arg0.mappedAtCreation = arg1 !== 0;
}
export function __wbg_set_mask_a18cbdfc03a4cbd9(arg0, arg1) {
    arg0.mask = arg1 >>> 0;
}
export function __wbg_set_max_anisotropy_19e574a7e9cb009a(arg0, arg1) {
    arg0.maxAnisotropy = arg1;
}
export function __wbg_set_min_binding_size_d70e460d165d9144(arg0, arg1) {
    arg0.minBindingSize = arg1;
}
export function __wbg_set_min_filter_5275c8a3815f9f0c(arg0, arg1) {
    arg0.minFilter = __wbindgen_enum_GpuFilterMode[arg1];
}
export function __wbg_set_mip_level_09f903ba22486513(arg0, arg1) {
    arg0.mipLevel = arg1 >>> 0;
}
export function __wbg_set_mip_level_8d4dfc5d506cb37f(arg0, arg1) {
    arg0.mipLevel = arg1 >>> 0;
}
export function __wbg_set_mip_level_count_04af0d33c4905fac(arg0, arg1) {
    arg0.mipLevelCount = arg1 >>> 0;
}
export function __wbg_set_mip_level_count_dcb2ad32716506a5(arg0, arg1) {
    arg0.mipLevelCount = arg1 >>> 0;
}
export function __wbg_set_mipmap_filter_ae5e0e814693019b(arg0, arg1) {
    arg0.mipmapFilter = __wbindgen_enum_GpuMipmapFilterMode[arg1];
}
export function __wbg_set_module_0933874708065f3b(arg0, arg1) {
    arg0.module = arg1;
}
export function __wbg_set_module_a7a131494850e5f7(arg0, arg1) {
    arg0.module = arg1;
}
export function __wbg_set_multisample_e857cbfca335c7f1(arg0, arg1) {
    arg0.multisample = arg1;
}
export function __wbg_set_multisampled_4ce4c32144215354(arg0, arg1) {
    arg0.multisampled = arg1 !== 0;
}
export function __wbg_set_offset_0e56098d94f81ccd(arg0, arg1) {
    arg0.offset = arg1;
}
export function __wbg_set_offset_baf6780761c43b24(arg0, arg1) {
    arg0.offset = arg1;
}
export function __wbg_set_offset_e316586bb85f0bd6(arg0, arg1) {
    arg0.offset = arg1;
}
export function __wbg_set_offset_eabaf12fe1c98ce7(arg0, arg1) {
    arg0.offset = arg1;
}
export function __wbg_set_operation_a91e5763a8313c6b(arg0, arg1) {
    arg0.operation = __wbindgen_enum_GpuBlendOperation[arg1];
}
export function __wbg_set_origin_24a61b4427e330e9(arg0, arg1) {
    arg0.origin = arg1;
}
export function __wbg_set_origin_9726209f22511ffa(arg0, arg1) {
    arg0.origin = arg1;
}
export function __wbg_set_origin_f7cd05478d9232f0(arg0, arg1) {
    arg0.origin = arg1;
}
export function __wbg_set_pass_op_eef0c5885ae707c3(arg0, arg1) {
    arg0.passOp = __wbindgen_enum_GpuStencilOperation[arg1];
}
export function __wbg_set_power_preference_7d669fb9b41f7bf2(arg0, arg1) {
    arg0.powerPreference = __wbindgen_enum_GpuPowerPreference[arg1];
}
export function __wbg_set_premultiplied_alpha_e49848a873888b3d(arg0, arg1) {
    arg0.premultipliedAlpha = arg1 !== 0;
}
export function __wbg_set_primitive_3462e090c7a78969(arg0, arg1) {
    arg0.primitive = arg1;
}
export function __wbg_set_query_set_62d86bdf10d64d37(arg0, arg1) {
    arg0.querySet = arg1;
}
export function __wbg_set_r_40fe44b2d9a401f4(arg0, arg1) {
    arg0.r = arg1;
}
export function __wbg_set_required_features_3d00070d09235d7d(arg0, arg1) {
    arg0.requiredFeatures = arg1;
}
export function __wbg_set_required_limits_e0de55a49a48e3dc(arg0, arg1) {
    arg0.requiredLimits = arg1;
}
export function __wbg_set_resolve_target_6e7eda03a6886624(arg0, arg1) {
    arg0.resolveTarget = arg1;
}
export function __wbg_set_resource_fe1f979fce4afee2(arg0, arg1) {
    arg0.resource = arg1;
}
export function __wbg_set_rows_per_image_1f4a56a3c5d57e93(arg0, arg1) {
    arg0.rowsPerImage = arg1 >>> 0;
}
export function __wbg_set_rows_per_image_c616c70e60a35618(arg0, arg1) {
    arg0.rowsPerImage = arg1 >>> 0;
}
export function __wbg_set_sample_count_2b8ac49e1626ac13(arg0, arg1) {
    arg0.sampleCount = arg1 >>> 0;
}
export function __wbg_set_sample_type_3cecbd4699e2e5fb(arg0, arg1) {
    arg0.sampleType = __wbindgen_enum_GpuTextureSampleType[arg1];
}
export function __wbg_set_sampler_12544c21977075c1(arg0, arg1) {
    arg0.sampler = arg1;
}
export function __wbg_set_shader_location_03356bf6a6da4332(arg0, arg1) {
    arg0.shaderLocation = arg1 >>> 0;
}
export function __wbg_set_size_0c20f73abce8f1ce(arg0, arg1) {
    arg0.size = arg1;
}
export function __wbg_set_size_cf04b4174c30722b(arg0, arg1) {
    arg0.size = arg1;
}
export function __wbg_set_size_f1207de283144c72(arg0, arg1) {
    arg0.size = arg1;
}
export function __wbg_set_source_7eb2b03d1177a7c8(arg0, arg1) {
    arg0.source = arg1;
}
export function __wbg_set_src_factor_c3668d4122497276(arg0, arg1) {
    arg0.srcFactor = __wbindgen_enum_GpuBlendFactor[arg1];
}
export function __wbg_set_stencil_back_8d01a6c0477059b0(arg0, arg1) {
    arg0.stencilBack = arg1;
}
export function __wbg_set_stencil_clear_value_1f380af0bd0d9255(arg0, arg1) {
    arg0.stencilClearValue = arg1 >>> 0;
}
export function __wbg_set_stencil_front_f881c15b2d170653(arg0, arg1) {
    arg0.stencilFront = arg1;
}
export function __wbg_set_stencil_load_op_5cde31e71a964b58(arg0, arg1) {
    arg0.stencilLoadOp = __wbindgen_enum_GpuLoadOp[arg1];
}
export function __wbg_set_stencil_read_mask_d79993adcfc418ab(arg0, arg1) {
    arg0.stencilReadMask = arg1 >>> 0;
}
export function __wbg_set_stencil_read_only_ac984029b821315e(arg0, arg1) {
    arg0.stencilReadOnly = arg1 !== 0;
}
export function __wbg_set_stencil_store_op_262e1df7b92404d3(arg0, arg1) {
    arg0.stencilStoreOp = __wbindgen_enum_GpuStoreOp[arg1];
}
export function __wbg_set_stencil_write_mask_94ec6249877e083e(arg0, arg1) {
    arg0.stencilWriteMask = arg1 >>> 0;
}
export function __wbg_set_step_mode_241a8d5515fa964b(arg0, arg1) {
    arg0.stepMode = __wbindgen_enum_GpuVertexStepMode[arg1];
}
export function __wbg_set_storage_texture_36be4834c501acab(arg0, arg1) {
    arg0.storageTexture = arg1;
}
export function __wbg_set_store_op_a95e8da4555c6010(arg0, arg1) {
    arg0.storeOp = __wbindgen_enum_GpuStoreOp[arg1];
}
export function __wbg_set_strip_index_format_62c417aa65a4d277(arg0, arg1) {
    arg0.stripIndexFormat = __wbindgen_enum_GpuIndexFormat[arg1];
}
export function __wbg_set_targets_6664b7e6ec5da9d3(arg0, arg1) {
    arg0.targets = arg1;
}
export function __wbg_set_texture_292332b872bf75e8(arg0, arg1) {
    arg0.texture = arg1;
}
export function __wbg_set_texture_64823aa8aca790b5(arg0, arg1) {
    arg0.texture = arg1;
}
export function __wbg_set_texture_738e6f6215515de3(arg0, arg1) {
    arg0.texture = arg1;
}
export function __wbg_set_timestamp_writes_3854a564715b0ac7(arg0, arg1) {
    arg0.timestampWrites = arg1;
}
export function __wbg_set_topology_914716698f5868bb(arg0, arg1) {
    arg0.topology = __wbindgen_enum_GpuPrimitiveTopology[arg1];
}
export function __wbg_set_type_17a1387b620bc902(arg0, arg1) {
    arg0.type = __wbindgen_enum_GpuBufferBindingType[arg1];
}
export function __wbg_set_type_d4edb621ec2051e0(arg0, arg1) {
    arg0.type = __wbindgen_enum_GpuSamplerBindingType[arg1];
}
export function __wbg_set_unclipped_depth_e23e3091db2ac351(arg0, arg1) {
    arg0.unclippedDepth = arg1 !== 0;
}
export function __wbg_set_usage_41b7d18f3f220e6c(arg0, arg1) {
    arg0.usage = arg1 >>> 0;
}
export function __wbg_set_usage_6ae4d85589906117(arg0, arg1) {
    arg0.usage = arg1 >>> 0;
}
export function __wbg_set_usage_e167dd772123f679(arg0, arg1) {
    arg0.usage = arg1 >>> 0;
}
export function __wbg_set_usage_f084cd416060ceee(arg0, arg1) {
    arg0.usage = arg1 >>> 0;
}
export function __wbg_set_vertex_29812f650590fa45(arg0, arg1) {
    arg0.vertex = arg1;
}
export function __wbg_set_view_32a8132aec6de194(arg0, arg1) {
    arg0.view = arg1;
}
export function __wbg_set_view_506e5beadab34e99(arg0, arg1) {
    arg0.view = arg1;
}
export function __wbg_set_view_dimension_4a840560a13b4860(arg0, arg1) {
    arg0.viewDimension = __wbindgen_enum_GpuTextureViewDimension[arg1];
}
export function __wbg_set_view_dimension_9ae69db849267b1a(arg0, arg1) {
    arg0.viewDimension = __wbindgen_enum_GpuTextureViewDimension[arg1];
}
export function __wbg_set_view_formats_4d0b943f593dd219(arg0, arg1) {
    arg0.viewFormats = arg1;
}
export function __wbg_set_view_formats_cba8520bf0d83d62(arg0, arg1) {
    arg0.viewFormats = arg1;
}
export function __wbg_set_visibility_bbbf3d2b70571950(arg0, arg1) {
    arg0.visibility = arg1 >>> 0;
}
export function __wbg_set_width_031bdecd763c5855(arg0, arg1) {
    arg0.width = arg1 >>> 0;
}
export function __wbg_set_width_0f26635b289b3c67(arg0, arg1) {
    arg0.width = arg1 >>> 0;
}
export function __wbg_set_width_f9e631f4ee129e5c(arg0, arg1) {
    arg0.width = arg1 >>> 0;
}
export function __wbg_set_write_mask_949f521dcf3da2b5(arg0, arg1) {
    arg0.writeMask = arg1 >>> 0;
}
export function __wbg_set_x_15a4c893b3366fab(arg0, arg1) {
    arg0.x = arg1 >>> 0;
}
export function __wbg_set_x_7aa02c5d013f6852(arg0, arg1) {
    arg0.x = arg1 >>> 0;
}
export function __wbg_set_y_80ad367d70451024(arg0, arg1) {
    arg0.y = arg1 >>> 0;
}
export function __wbg_set_y_c631920a1c51a694(arg0, arg1) {
    arg0.y = arg1 >>> 0;
}
export function __wbg_set_z_7c526101c55ea2ae(arg0, arg1) {
    arg0.z = arg1 >>> 0;
}
export function __wbg_shaderSource_628c37a476ae65f9(arg0, arg1, arg2, arg3) {
    arg0.shaderSource(arg1, getStringFromWasm0(arg2, arg3));
}
export function __wbg_shaderSource_66dce75b25a1a407(arg0, arg1, arg2, arg3) {
    arg0.shaderSource(arg1, getStringFromWasm0(arg2, arg3));
}
export function __wbg_stack_3b0d974bbf31e44f(arg0, arg1) {
    const ret = arg1.stack;
    const ptr1 = passStringToWasm0(ret, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
    const len1 = WASM_VECTOR_LEN;
    getDataViewMemory0().setInt32(arg0 + 4 * 1, len1, true);
    getDataViewMemory0().setInt32(arg0 + 4 * 0, ptr1, true);
}
export function __wbg_static_accessor_GLOBAL_THIS_2fee5048bcca5938() {
    const ret = typeof globalThis === 'undefined' ? null : globalThis;
    return isLikeNone(ret) ? 0 : addToExternrefTable0(ret);
}
export function __wbg_static_accessor_GLOBAL_ce44e66a4935da8c() {
    const ret = typeof global === 'undefined' ? null : global;
    return isLikeNone(ret) ? 0 : addToExternrefTable0(ret);
}
export function __wbg_static_accessor_SELF_44f6e0cb5e67cdad() {
    const ret = typeof self === 'undefined' ? null : self;
    return isLikeNone(ret) ? 0 : addToExternrefTable0(ret);
}
export function __wbg_static_accessor_WINDOW_168f178805d978fe() {
    const ret = typeof window === 'undefined' ? null : window;
    return isLikeNone(ret) ? 0 : addToExternrefTable0(ret);
}
export function __wbg_stencilFuncSeparate_a17b2b1cc34fa948(arg0, arg1, arg2, arg3, arg4) {
    arg0.stencilFuncSeparate(arg1 >>> 0, arg2 >>> 0, arg3, arg4 >>> 0);
}
export function __wbg_stencilFuncSeparate_ec603976be9569a4(arg0, arg1, arg2, arg3, arg4) {
    arg0.stencilFuncSeparate(arg1 >>> 0, arg2 >>> 0, arg3, arg4 >>> 0);
}
export function __wbg_stencilMaskSeparate_3bf2cb54cc370b58(arg0, arg1, arg2) {
    arg0.stencilMaskSeparate(arg1 >>> 0, arg2 >>> 0);
}
export function __wbg_stencilMaskSeparate_cabcdf843acbf5f1(arg0, arg1, arg2) {
    arg0.stencilMaskSeparate(arg1 >>> 0, arg2 >>> 0);
}
export function __wbg_stencilMask_485dcb5965c79a71(arg0, arg1) {
    arg0.stencilMask(arg1 >>> 0);
}
export function __wbg_stencilMask_f9fe198f7fd6fc9c(arg0, arg1) {
    arg0.stencilMask(arg1 >>> 0);
}
export function __wbg_stencilOpSeparate_5c4dbe1cf597c5ed(arg0, arg1, arg2, arg3, arg4) {
    arg0.stencilOpSeparate(arg1 >>> 0, arg2 >>> 0, arg3 >>> 0, arg4 >>> 0);
}
export function __wbg_stencilOpSeparate_6cf50803475d2640(arg0, arg1, arg2, arg3, arg4) {
    arg0.stencilOpSeparate(arg1 >>> 0, arg2 >>> 0, arg3 >>> 0, arg4 >>> 0);
}
export function __wbg_submit_b3bbead76cbf7627(arg0, arg1) {
    arg0.submit(arg1);
}
export function __wbg_texImage2D_0e0f37b9fb297d01() { return handleError(function (arg0, arg1, arg2, arg3, arg4, arg5, arg6, arg7, arg8, arg9) {
    arg0.texImage2D(arg1 >>> 0, arg2, arg3, arg4, arg5, arg6, arg7 >>> 0, arg8 >>> 0, arg9);
}, arguments); }
export function __wbg_texImage2D_0e537dc331652de3() { return handleError(function (arg0, arg1, arg2, arg3, arg4, arg5, arg6, arg7, arg8, arg9) {
    arg0.texImage2D(arg1 >>> 0, arg2, arg3, arg4, arg5, arg6, arg7 >>> 0, arg8 >>> 0, arg9);
}, arguments); }
export function __wbg_texImage2D_7bc3001cb8602ed2() { return handleError(function (arg0, arg1, arg2, arg3, arg4, arg5, arg6, arg7, arg8, arg9) {
    arg0.texImage2D(arg1 >>> 0, arg2, arg3, arg4, arg5, arg6, arg7 >>> 0, arg8 >>> 0, arg9);
}, arguments); }
export function __wbg_texImage3D_30dbf7234481b8f5() { return handleError(function (arg0, arg1, arg2, arg3, arg4, arg5, arg6, arg7, arg8, arg9, arg10) {
    arg0.texImage3D(arg1 >>> 0, arg2, arg3, arg4, arg5, arg6, arg7, arg8 >>> 0, arg9 >>> 0, arg10);
}, arguments); }
export function __wbg_texImage3D_8647ef58aef5b912() { return handleError(function (arg0, arg1, arg2, arg3, arg4, arg5, arg6, arg7, arg8, arg9, arg10) {
    arg0.texImage3D(arg1 >>> 0, arg2, arg3, arg4, arg5, arg6, arg7, arg8 >>> 0, arg9 >>> 0, arg10);
}, arguments); }
export function __wbg_texParameteri_c6efffcecb474d2f(arg0, arg1, arg2, arg3) {
    arg0.texParameteri(arg1 >>> 0, arg2 >>> 0, arg3);
}
export function __wbg_texParameteri_fe6210a493d48a16(arg0, arg1, arg2, arg3) {
    arg0.texParameteri(arg1 >>> 0, arg2 >>> 0, arg3);
}
export function __wbg_texStorage2D_ed5df596c5f1e3af(arg0, arg1, arg2, arg3, arg4, arg5) {
    arg0.texStorage2D(arg1 >>> 0, arg2, arg3 >>> 0, arg4, arg5);
}
export function __wbg_texStorage3D_160b0197bc190f04(arg0, arg1, arg2, arg3, arg4, arg5, arg6) {
    arg0.texStorage3D(arg1 >>> 0, arg2, arg3 >>> 0, arg4, arg5, arg6);
}
export function __wbg_texSubImage2D_1b2ff28f994c325e() { return handleError(function (arg0, arg1, arg2, arg3, arg4, arg5, arg6, arg7, arg8, arg9) {
    arg0.texSubImage2D(arg1 >>> 0, arg2, arg3, arg4, arg5, arg6, arg7 >>> 0, arg8 >>> 0, arg9);
}, arguments); }
export function __wbg_texSubImage2D_3884b5a5c27ca5c4() { return handleError(function (arg0, arg1, arg2, arg3, arg4, arg5, arg6, arg7, arg8, arg9) {
    arg0.texSubImage2D(arg1 >>> 0, arg2, arg3, arg4, arg5, arg6, arg7 >>> 0, arg8 >>> 0, arg9);
}, arguments); }
export function __wbg_texSubImage2D_5c630043f1c56716() { return handleError(function (arg0, arg1, arg2, arg3, arg4, arg5, arg6, arg7, arg8, arg9) {
    arg0.texSubImage2D(arg1 >>> 0, arg2, arg3, arg4, arg5, arg6, arg7 >>> 0, arg8 >>> 0, arg9);
}, arguments); }
export function __wbg_texSubImage2D_89866a04ecd0a76b() { return handleError(function (arg0, arg1, arg2, arg3, arg4, arg5, arg6, arg7, arg8, arg9) {
    arg0.texSubImage2D(arg1 >>> 0, arg2, arg3, arg4, arg5, arg6, arg7 >>> 0, arg8 >>> 0, arg9);
}, arguments); }
export function __wbg_texSubImage2D_bbd523c9ebd9fa99() { return handleError(function (arg0, arg1, arg2, arg3, arg4, arg5, arg6, arg7, arg8, arg9) {
    arg0.texSubImage2D(arg1 >>> 0, arg2, arg3, arg4, arg5, arg6, arg7 >>> 0, arg8 >>> 0, arg9);
}, arguments); }
export function __wbg_texSubImage2D_ce2585a1bf3d56d9() { return handleError(function (arg0, arg1, arg2, arg3, arg4, arg5, arg6, arg7, arg8, arg9) {
    arg0.texSubImage2D(arg1 >>> 0, arg2, arg3, arg4, arg5, arg6, arg7 >>> 0, arg8 >>> 0, arg9);
}, arguments); }
export function __wbg_texSubImage2D_d14d9c0a1f627c31() { return handleError(function (arg0, arg1, arg2, arg3, arg4, arg5, arg6, arg7, arg8, arg9) {
    arg0.texSubImage2D(arg1 >>> 0, arg2, arg3, arg4, arg5, arg6, arg7 >>> 0, arg8 >>> 0, arg9);
}, arguments); }
export function __wbg_texSubImage2D_f03448e182b0820d() { return handleError(function (arg0, arg1, arg2, arg3, arg4, arg5, arg6, arg7, arg8, arg9) {
    arg0.texSubImage2D(arg1 >>> 0, arg2, arg3, arg4, arg5, arg6, arg7 >>> 0, arg8 >>> 0, arg9);
}, arguments); }
export function __wbg_texSubImage3D_09a97a968b93253d() { return handleError(function (arg0, arg1, arg2, arg3, arg4, arg5, arg6, arg7, arg8, arg9, arg10, arg11) {
    arg0.texSubImage3D(arg1 >>> 0, arg2, arg3, arg4, arg5, arg6, arg7, arg8, arg9 >>> 0, arg10 >>> 0, arg11);
}, arguments); }
export function __wbg_texSubImage3D_0fdbd843482bb916() { return handleError(function (arg0, arg1, arg2, arg3, arg4, arg5, arg6, arg7, arg8, arg9, arg10, arg11) {
    arg0.texSubImage3D(arg1 >>> 0, arg2, arg3, arg4, arg5, arg6, arg7, arg8, arg9 >>> 0, arg10 >>> 0, arg11);
}, arguments); }
export function __wbg_texSubImage3D_355efde0dc047913() { return handleError(function (arg0, arg1, arg2, arg3, arg4, arg5, arg6, arg7, arg8, arg9, arg10, arg11) {
    arg0.texSubImage3D(arg1 >>> 0, arg2, arg3, arg4, arg5, arg6, arg7, arg8, arg9 >>> 0, arg10 >>> 0, arg11);
}, arguments); }
export function __wbg_texSubImage3D_5a238709d114b609() { return handleError(function (arg0, arg1, arg2, arg3, arg4, arg5, arg6, arg7, arg8, arg9, arg10, arg11) {
    arg0.texSubImage3D(arg1 >>> 0, arg2, arg3, arg4, arg5, arg6, arg7, arg8, arg9 >>> 0, arg10 >>> 0, arg11);
}, arguments); }
export function __wbg_texSubImage3D_933e4cd41cc5376d() { return handleError(function (arg0, arg1, arg2, arg3, arg4, arg5, arg6, arg7, arg8, arg9, arg10, arg11) {
    arg0.texSubImage3D(arg1 >>> 0, arg2, arg3, arg4, arg5, arg6, arg7, arg8, arg9 >>> 0, arg10 >>> 0, arg11);
}, arguments); }
export function __wbg_texSubImage3D_bd32c8e29e470904() { return handleError(function (arg0, arg1, arg2, arg3, arg4, arg5, arg6, arg7, arg8, arg9, arg10, arg11) {
    arg0.texSubImage3D(arg1 >>> 0, arg2, arg3, arg4, arg5, arg6, arg7, arg8, arg9 >>> 0, arg10 >>> 0, arg11);
}, arguments); }
export function __wbg_texSubImage3D_c3538b28040daac9() { return handleError(function (arg0, arg1, arg2, arg3, arg4, arg5, arg6, arg7, arg8, arg9, arg10, arg11) {
    arg0.texSubImage3D(arg1 >>> 0, arg2, arg3, arg4, arg5, arg6, arg7, arg8, arg9 >>> 0, arg10 >>> 0, arg11);
}, arguments); }
export function __wbg_then_05edfc8a4fea5106(arg0, arg1, arg2) {
    const ret = arg0.then(arg1, arg2);
    return ret;
}
export function __wbg_then_2a84678a50976959(arg0, arg1, arg2) {
    const ret = arg0.then(arg1, arg2);
    return ret;
}
export function __wbg_then_591b6b3a75ee817a(arg0, arg1) {
    const ret = arg0.then(arg1);
    return ret;
}
export function __wbg_transferControlToOffscreen_0d5602a41dfef27f() { return handleError(function (arg0) {
    const ret = arg0.transferControlToOffscreen();
    return ret;
}, arguments); }
export function __wbg_uniform1f_3acd3f3eb50b5e11(arg0, arg1, arg2) {
    arg0.uniform1f(arg1, arg2);
}
export function __wbg_uniform1f_d34e4b454f7c8e73(arg0, arg1, arg2) {
    arg0.uniform1f(arg1, arg2);
}
export function __wbg_uniform1i_cd9a7f990128ea48(arg0, arg1, arg2) {
    arg0.uniform1i(arg1, arg2);
}
export function __wbg_uniform1i_e4f13604354c28ae(arg0, arg1, arg2) {
    arg0.uniform1i(arg1, arg2);
}
export function __wbg_uniform1ui_36c94692177ebf76(arg0, arg1, arg2) {
    arg0.uniform1ui(arg1, arg2 >>> 0);
}
export function __wbg_uniform2fv_17592f4dad9798fb(arg0, arg1, arg2, arg3) {
    arg0.uniform2fv(arg1, getArrayF32FromWasm0(arg2, arg3));
}
export function __wbg_uniform2fv_39277cf2d3cb83c7(arg0, arg1, arg2, arg3) {
    arg0.uniform2fv(arg1, getArrayF32FromWasm0(arg2, arg3));
}
export function __wbg_uniform2iv_c5e863975dd780d8(arg0, arg1, arg2, arg3) {
    arg0.uniform2iv(arg1, getArrayI32FromWasm0(arg2, arg3));
}
export function __wbg_uniform2iv_d5d29ebbc466977d(arg0, arg1, arg2, arg3) {
    arg0.uniform2iv(arg1, getArrayI32FromWasm0(arg2, arg3));
}
export function __wbg_uniform2uiv_418ba3bf6a230dd5(arg0, arg1, arg2, arg3) {
    arg0.uniform2uiv(arg1, getArrayU32FromWasm0(arg2, arg3));
}
export function __wbg_uniform3fv_7723e142be50856f(arg0, arg1, arg2, arg3) {
    arg0.uniform3fv(arg1, getArrayF32FromWasm0(arg2, arg3));
}
export function __wbg_uniform3fv_dbe44b778e6b89e8(arg0, arg1, arg2, arg3) {
    arg0.uniform3fv(arg1, getArrayF32FromWasm0(arg2, arg3));
}
export function __wbg_uniform3iv_bea3976522e15d48(arg0, arg1, arg2, arg3) {
    arg0.uniform3iv(arg1, getArrayI32FromWasm0(arg2, arg3));
}
export function __wbg_uniform3iv_d75d3a5f86d54be4(arg0, arg1, arg2, arg3) {
    arg0.uniform3iv(arg1, getArrayI32FromWasm0(arg2, arg3));
}
export function __wbg_uniform3uiv_71c1efc24a662de9(arg0, arg1, arg2, arg3) {
    arg0.uniform3uiv(arg1, getArrayU32FromWasm0(arg2, arg3));
}
export function __wbg_uniform4f_4410d2faaa7e5dda(arg0, arg1, arg2, arg3, arg4, arg5) {
    arg0.uniform4f(arg1, arg2, arg3, arg4, arg5);
}
export function __wbg_uniform4f_a5008773cfb47d1a(arg0, arg1, arg2, arg3, arg4, arg5) {
    arg0.uniform4f(arg1, arg2, arg3, arg4, arg5);
}
export function __wbg_uniform4fv_85ad5d23234895d2(arg0, arg1, arg2, arg3) {
    arg0.uniform4fv(arg1, getArrayF32FromWasm0(arg2, arg3));
}
export function __wbg_uniform4fv_9e670a001c77dca0(arg0, arg1, arg2, arg3) {
    arg0.uniform4fv(arg1, getArrayF32FromWasm0(arg2, arg3));
}
export function __wbg_uniform4iv_1d57c6b8e5c0e447(arg0, arg1, arg2, arg3) {
    arg0.uniform4iv(arg1, getArrayI32FromWasm0(arg2, arg3));
}
export function __wbg_uniform4iv_a9aaa92f2f458ec2(arg0, arg1, arg2, arg3) {
    arg0.uniform4iv(arg1, getArrayI32FromWasm0(arg2, arg3));
}
export function __wbg_uniform4uiv_c5d45f5dbdae727a(arg0, arg1, arg2, arg3) {
    arg0.uniform4uiv(arg1, getArrayU32FromWasm0(arg2, arg3));
}
export function __wbg_uniformBlockBinding_829a71912ad79a04(arg0, arg1, arg2, arg3) {
    arg0.uniformBlockBinding(arg1, arg2 >>> 0, arg3 >>> 0);
}
export function __wbg_uniformMatrix2fv_b666dc80e084ddbc(arg0, arg1, arg2, arg3, arg4) {
    arg0.uniformMatrix2fv(arg1, arg2 !== 0, getArrayF32FromWasm0(arg3, arg4));
}
export function __wbg_uniformMatrix2fv_cd6e1725152efce9(arg0, arg1, arg2, arg3, arg4) {
    arg0.uniformMatrix2fv(arg1, arg2 !== 0, getArrayF32FromWasm0(arg3, arg4));
}
export function __wbg_uniformMatrix2x3fv_6a6221d5300ad184(arg0, arg1, arg2, arg3, arg4) {
    arg0.uniformMatrix2x3fv(arg1, arg2 !== 0, getArrayF32FromWasm0(arg3, arg4));
}
export function __wbg_uniformMatrix2x4fv_68bc9cd1e2d67339(arg0, arg1, arg2, arg3, arg4) {
    arg0.uniformMatrix2x4fv(arg1, arg2 !== 0, getArrayF32FromWasm0(arg3, arg4));
}
export function __wbg_uniformMatrix3fv_2ccfe6ff9f4f57ec(arg0, arg1, arg2, arg3, arg4) {
    arg0.uniformMatrix3fv(arg1, arg2 !== 0, getArrayF32FromWasm0(arg3, arg4));
}
export function __wbg_uniformMatrix3fv_da8c388748c5739b(arg0, arg1, arg2, arg3, arg4) {
    arg0.uniformMatrix3fv(arg1, arg2 !== 0, getArrayF32FromWasm0(arg3, arg4));
}
export function __wbg_uniformMatrix3x2fv_1083b1ecb80866a1(arg0, arg1, arg2, arg3, arg4) {
    arg0.uniformMatrix3x2fv(arg1, arg2 !== 0, getArrayF32FromWasm0(arg3, arg4));
}
export function __wbg_uniformMatrix3x4fv_d4cc158d92dbd1ce(arg0, arg1, arg2, arg3, arg4) {
    arg0.uniformMatrix3x4fv(arg1, arg2 !== 0, getArrayF32FromWasm0(arg3, arg4));
}
export function __wbg_uniformMatrix4fv_61b1a000cfdc35cc(arg0, arg1, arg2, arg3, arg4) {
    arg0.uniformMatrix4fv(arg1, arg2 !== 0, getArrayF32FromWasm0(arg3, arg4));
}
export function __wbg_uniformMatrix4fv_c8ba105f2ce3edf8(arg0, arg1, arg2, arg3, arg4) {
    arg0.uniformMatrix4fv(arg1, arg2 !== 0, getArrayF32FromWasm0(arg3, arg4));
}
export function __wbg_uniformMatrix4x2fv_cb66ed882d29c550(arg0, arg1, arg2, arg3, arg4) {
    arg0.uniformMatrix4x2fv(arg1, arg2 !== 0, getArrayF32FromWasm0(arg3, arg4));
}
export function __wbg_uniformMatrix4x3fv_99e2e5fabf39e8b6(arg0, arg1, arg2, arg3, arg4) {
    arg0.uniformMatrix4x3fv(arg1, arg2 !== 0, getArrayF32FromWasm0(arg3, arg4));
}
export function __wbg_unmap_817a2e3248a553fb(arg0) {
    arg0.unmap();
}
export function __wbg_useProgram_0e1cd86765304939(arg0, arg1) {
    arg0.useProgram(arg1);
}
export function __wbg_useProgram_ab2ee2a13a1fd909(arg0, arg1) {
    arg0.useProgram(arg1);
}
export function __wbg_value_49f783bb59765962(arg0) {
    const ret = arg0.value;
    return ret;
}
export function __wbg_vertexAttribDivisorANGLE_ffd803d04b545670(arg0, arg1, arg2) {
    arg0.vertexAttribDivisorANGLE(arg1 >>> 0, arg2 >>> 0);
}
export function __wbg_vertexAttribDivisor_f17a8585267be92f(arg0, arg1, arg2) {
    arg0.vertexAttribDivisor(arg1 >>> 0, arg2 >>> 0);
}
export function __wbg_vertexAttribIPointer_23b6d6b8b8b79b4d(arg0, arg1, arg2, arg3, arg4, arg5) {
    arg0.vertexAttribIPointer(arg1 >>> 0, arg2, arg3 >>> 0, arg4, arg5);
}
export function __wbg_vertexAttribPointer_36c76a0c7e4f0239(arg0, arg1, arg2, arg3, arg4, arg5, arg6) {
    arg0.vertexAttribPointer(arg1 >>> 0, arg2, arg3 >>> 0, arg4 !== 0, arg5, arg6);
}
export function __wbg_vertexAttribPointer_4e5d289c5d224210(arg0, arg1, arg2, arg3, arg4, arg5, arg6) {
    arg0.vertexAttribPointer(arg1 >>> 0, arg2, arg3 >>> 0, arg4 !== 0, arg5, arg6);
}
export function __wbg_videoHeight_3d8d9632b96e72e7(arg0) {
    const ret = arg0.videoHeight;
    return ret;
}
export function __wbg_videoWidth_b9990366012201e7(arg0) {
    const ret = arg0.videoWidth;
    return ret;
}
export function __wbg_viewport_a0ca330f9b85397e(arg0, arg1, arg2, arg3, arg4) {
    arg0.viewport(arg1, arg2, arg3, arg4);
}
export function __wbg_viewport_b5bd46a0d111c83c(arg0, arg1, arg2, arg3, arg4) {
    arg0.viewport(arg1, arg2, arg3, arg4);
}
export function __wbg_width_21574923e23732ce(arg0) {
    const ret = arg0.width;
    return ret;
}
export function __wbg_width_42c66a46c4d6f7c1(arg0) {
    const ret = arg0.width;
    return ret;
}
export function __wbg_width_b66bcbdc3c062766(arg0) {
    const ret = arg0.width;
    return ret;
}
export function __wbg_width_c8740d5bdf596189(arg0) {
    const ret = arg0.width;
    return ret;
}
export function __wbg_width_ca7775f863f3ddbb(arg0) {
    const ret = arg0.width;
    return ret;
}
export function __wbg_writeTexture_acb28796746826c8() { return handleError(function (arg0, arg1, arg2, arg3, arg4, arg5) {
    arg0.writeTexture(arg1, getArrayU8FromWasm0(arg2, arg3), arg4, arg5);
}, arguments); }
export function __wbindgen_cast_0000000000000001(arg0, arg1) {
    // Cast intrinsic for `Closure(Closure { owned: true, function: Function { arguments: [Externref], shim_idx: 2514, ret: Result(Unit), inner_ret: Some(Result(Unit)) }, mutable: true }) -> Externref`.
    const ret = makeMutClosure(arg0, arg1, wasm_bindgen__convert__closures_____invoke__h6c25144d5ae393cd);
    return ret;
}
export function __wbindgen_cast_0000000000000002(arg0, arg1) {
    // Cast intrinsic for `Closure(Closure { owned: true, function: Function { arguments: [Externref], shim_idx: 483, ret: Unit, inner_ret: Some(Unit) }, mutable: true }) -> Externref`.
    const ret = makeMutClosure(arg0, arg1, wasm_bindgen__convert__closures_____invoke__h520279ff82b23738);
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
function wasm_bindgen__convert__closures_____invoke__h520279ff82b23738(arg0, arg1, arg2) {
    wasm.wasm_bindgen__convert__closures_____invoke__h520279ff82b23738(arg0, arg1, arg2);
}

function wasm_bindgen__convert__closures_____invoke__h6c25144d5ae393cd(arg0, arg1, arg2) {
    const ret = wasm.wasm_bindgen__convert__closures_____invoke__h6c25144d5ae393cd(arg0, arg1, arg2);
    if (ret[1]) {
        throw takeFromExternrefTable0(ret[0]);
    }
}

function wasm_bindgen__convert__closures_____invoke__h193aabdc3d7c65f4(arg0, arg1, arg2, arg3) {
    wasm.wasm_bindgen__convert__closures_____invoke__h193aabdc3d7c65f4(arg0, arg1, arg2, arg3);
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
