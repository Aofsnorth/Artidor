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
 * @returns {HTMLCanvasElement}
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
export function __wbg_Error_fdd633d4bb5dd76a() { return logError(function (arg0, arg1) {
    const ret = Error(getStringFromWasm0(arg0, arg1));
    return ret;
}, arguments); }
export function __wbg_Number_c4bdf66bb78f7977() { return logError(function (arg0) {
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
export function __wbg_Window_65ef42d29dc8174d() { return logError(function (arg0) {
    const ret = arg0.Window;
    return ret;
}, arguments); }
export function __wbg_WorkerGlobalScope_d272430d4a323303() { return logError(function (arg0) {
    const ret = arg0.WorkerGlobalScope;
    return ret;
}, arguments); }
export function __wbg___wbindgen_bigint_get_as_i64_d9e915702856f831(arg0, arg1) {
    const v = arg1;
    const ret = typeof(v) === 'bigint' ? v : undefined;
    if (!isLikeNone(ret)) {
        _assertBigInt(ret);
    }
    getDataViewMemory0().setBigInt64(arg0 + 8 * 1, isLikeNone(ret) ? BigInt(0) : ret, true);
    getDataViewMemory0().setInt32(arg0 + 4 * 0, !isLikeNone(ret), true);
}
export function __wbg___wbindgen_boolean_get_edaed31a367ce1bd(arg0) {
    const v = arg0;
    const ret = typeof(v) === 'boolean' ? v : undefined;
    if (!isLikeNone(ret)) {
        _assertBoolean(ret);
    }
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
    _assertBoolean(ret);
    return ret;
}
export function __wbg___wbindgen_is_bigint_90b5ccfe67c78460(arg0) {
    const ret = typeof(arg0) === 'bigint';
    _assertBoolean(ret);
    return ret;
}
export function __wbg___wbindgen_is_function_acc5528be2b923f2(arg0) {
    const ret = typeof(arg0) === 'function';
    _assertBoolean(ret);
    return ret;
}
export function __wbg___wbindgen_is_null_6d937fbfb6478470(arg0) {
    const ret = arg0 === null;
    _assertBoolean(ret);
    return ret;
}
export function __wbg___wbindgen_is_object_0beba4a1980d3eea(arg0) {
    const val = arg0;
    const ret = typeof(val) === 'object' && val !== null;
    _assertBoolean(ret);
    return ret;
}
export function __wbg___wbindgen_is_string_1fca8072260dd261(arg0) {
    const ret = typeof(arg0) === 'string';
    _assertBoolean(ret);
    return ret;
}
export function __wbg___wbindgen_is_undefined_721f8decd50c87a3(arg0) {
    const ret = arg0 === undefined;
    _assertBoolean(ret);
    return ret;
}
export function __wbg___wbindgen_jsval_eq_4e8c38722cb8ff51(arg0, arg1) {
    const ret = arg0 === arg1;
    _assertBoolean(ret);
    return ret;
}
export function __wbg___wbindgen_jsval_loose_eq_4b9aba9e5b3c4582(arg0, arg1) {
    const ret = arg0 == arg1;
    _assertBoolean(ret);
    return ret;
}
export function __wbg___wbindgen_number_get_1cc01dd708740256(arg0, arg1) {
    const obj = arg1;
    const ret = typeof(obj) === 'number' ? obj : undefined;
    if (!isLikeNone(ret)) {
        _assertNum(ret);
    }
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
export function __wbg__wbg_cb_unref_33c39e13d73b25f6() { return logError(function (arg0) {
    arg0._wbg_cb_unref();
}, arguments); }
export function __wbg_activeTexture_1d5359b20df41710() { return logError(function (arg0, arg1) {
    arg0.activeTexture(arg1 >>> 0);
}, arguments); }
export function __wbg_activeTexture_525ee3068cb9e8d5() { return logError(function (arg0, arg1) {
    arg0.activeTexture(arg1 >>> 0);
}, arguments); }
export function __wbg_adapterInfo_092e774447fcfdf0() { return logError(function (arg0) {
    const ret = arg0.adapterInfo;
    return ret;
}, arguments); }
export function __wbg_attachShader_3477e67517b09b6b() { return logError(function (arg0, arg1, arg2) {
    arg0.attachShader(arg1, arg2);
}, arguments); }
export function __wbg_attachShader_683d1070365e7066() { return logError(function (arg0, arg1, arg2) {
    arg0.attachShader(arg1, arg2);
}, arguments); }
export function __wbg_beginComputePass_43b0c6751d870fcf() { return logError(function (arg0, arg1) {
    const ret = arg0.beginComputePass(arg1);
    return ret;
}, arguments); }
export function __wbg_beginOcclusionQuery_258903e0012f8d0b() { return logError(function (arg0, arg1) {
    arg0.beginOcclusionQuery(arg1 >>> 0);
}, arguments); }
export function __wbg_beginQuery_dad334d972fed3cc() { return logError(function (arg0, arg1, arg2) {
    arg0.beginQuery(arg1 >>> 0, arg2);
}, arguments); }
export function __wbg_beginRenderPass_865cbdfaecf89f93() { return handleError(function (arg0, arg1) {
    const ret = arg0.beginRenderPass(arg1);
    return ret;
}, arguments); }
export function __wbg_bindAttribLocation_79b5d26727094518() { return logError(function (arg0, arg1, arg2, arg3, arg4) {
    arg0.bindAttribLocation(arg1, arg2 >>> 0, getStringFromWasm0(arg3, arg4));
}, arguments); }
export function __wbg_bindAttribLocation_d56d3c40331af7ed() { return logError(function (arg0, arg1, arg2, arg3, arg4) {
    arg0.bindAttribLocation(arg1, arg2 >>> 0, getStringFromWasm0(arg3, arg4));
}, arguments); }
export function __wbg_bindBufferRange_16a9d90becc2a7d7() { return logError(function (arg0, arg1, arg2, arg3, arg4, arg5) {
    arg0.bindBufferRange(arg1 >>> 0, arg2 >>> 0, arg3, arg4, arg5);
}, arguments); }
export function __wbg_bindBuffer_d3111de6861cb875() { return logError(function (arg0, arg1, arg2) {
    arg0.bindBuffer(arg1 >>> 0, arg2);
}, arguments); }
export function __wbg_bindBuffer_e95efaf0d4851845() { return logError(function (arg0, arg1, arg2) {
    arg0.bindBuffer(arg1 >>> 0, arg2);
}, arguments); }
export function __wbg_bindFramebuffer_217a1f4d28c6bc77() { return logError(function (arg0, arg1, arg2) {
    arg0.bindFramebuffer(arg1 >>> 0, arg2);
}, arguments); }
export function __wbg_bindFramebuffer_63e837a5dc0accfb() { return logError(function (arg0, arg1, arg2) {
    arg0.bindFramebuffer(arg1 >>> 0, arg2);
}, arguments); }
export function __wbg_bindRenderbuffer_7f84d28a1462a95a() { return logError(function (arg0, arg1, arg2) {
    arg0.bindRenderbuffer(arg1 >>> 0, arg2);
}, arguments); }
export function __wbg_bindRenderbuffer_d608b211c51ed147() { return logError(function (arg0, arg1, arg2) {
    arg0.bindRenderbuffer(arg1 >>> 0, arg2);
}, arguments); }
export function __wbg_bindSampler_3c7002cb6d56ae8f() { return logError(function (arg0, arg1, arg2) {
    arg0.bindSampler(arg1 >>> 0, arg2);
}, arguments); }
export function __wbg_bindTexture_7ab28ff4ff3dc506() { return logError(function (arg0, arg1, arg2) {
    arg0.bindTexture(arg1 >>> 0, arg2);
}, arguments); }
export function __wbg_bindTexture_ffc56f1e5c5526c6() { return logError(function (arg0, arg1, arg2) {
    arg0.bindTexture(arg1 >>> 0, arg2);
}, arguments); }
export function __wbg_bindVertexArrayOES_1cb63a86715ea7d5() { return logError(function (arg0, arg1) {
    arg0.bindVertexArrayOES(arg1);
}, arguments); }
export function __wbg_bindVertexArray_c391bd47303d75cd() { return logError(function (arg0, arg1) {
    arg0.bindVertexArray(arg1);
}, arguments); }
export function __wbg_blendColor_15f26633b646e542() { return logError(function (arg0, arg1, arg2, arg3, arg4) {
    arg0.blendColor(arg1, arg2, arg3, arg4);
}, arguments); }
export function __wbg_blendColor_a0ba1cdcecc3a34c() { return logError(function (arg0, arg1, arg2, arg3, arg4) {
    arg0.blendColor(arg1, arg2, arg3, arg4);
}, arguments); }
export function __wbg_blendEquationSeparate_8240ddfa32266109() { return logError(function (arg0, arg1, arg2) {
    arg0.blendEquationSeparate(arg1 >>> 0, arg2 >>> 0);
}, arguments); }
export function __wbg_blendEquationSeparate_aed0a34303d3e6ae() { return logError(function (arg0, arg1, arg2) {
    arg0.blendEquationSeparate(arg1 >>> 0, arg2 >>> 0);
}, arguments); }
export function __wbg_blendEquation_7dadb4db540a42da() { return logError(function (arg0, arg1) {
    arg0.blendEquation(arg1 >>> 0);
}, arguments); }
export function __wbg_blendEquation_8bfa69f639ae92da() { return logError(function (arg0, arg1) {
    arg0.blendEquation(arg1 >>> 0);
}, arguments); }
export function __wbg_blendFuncSeparate_3eef699c291dbc87() { return logError(function (arg0, arg1, arg2, arg3, arg4) {
    arg0.blendFuncSeparate(arg1 >>> 0, arg2 >>> 0, arg3 >>> 0, arg4 >>> 0);
}, arguments); }
export function __wbg_blendFuncSeparate_456410f9919bed39() { return logError(function (arg0, arg1, arg2, arg3, arg4) {
    arg0.blendFuncSeparate(arg1 >>> 0, arg2 >>> 0, arg3 >>> 0, arg4 >>> 0);
}, arguments); }
export function __wbg_blendFunc_713c504adab14f98() { return logError(function (arg0, arg1, arg2) {
    arg0.blendFunc(arg1 >>> 0, arg2 >>> 0);
}, arguments); }
export function __wbg_blendFunc_b15af02643e188f1() { return logError(function (arg0, arg1, arg2) {
    arg0.blendFunc(arg1 >>> 0, arg2 >>> 0);
}, arguments); }
export function __wbg_blitFramebuffer_ea96ada8bba07582() { return logError(function (arg0, arg1, arg2, arg3, arg4, arg5, arg6, arg7, arg8, arg9, arg10) {
    arg0.blitFramebuffer(arg1, arg2, arg3, arg4, arg5, arg6, arg7, arg8, arg9 >>> 0, arg10 >>> 0);
}, arguments); }
export function __wbg_bufferData_26132561617ce8fb() { return logError(function (arg0, arg1, arg2, arg3) {
    arg0.bufferData(arg1 >>> 0, arg2, arg3 >>> 0);
}, arguments); }
export function __wbg_bufferData_5df9bdb32e189eee() { return logError(function (arg0, arg1, arg2, arg3) {
    arg0.bufferData(arg1 >>> 0, arg2, arg3 >>> 0);
}, arguments); }
export function __wbg_bufferData_64e9905f2b3d3a6f() { return logError(function (arg0, arg1, arg2, arg3) {
    arg0.bufferData(arg1 >>> 0, arg2, arg3 >>> 0);
}, arguments); }
export function __wbg_bufferData_99bbbc63f02251c4() { return logError(function (arg0, arg1, arg2, arg3) {
    arg0.bufferData(arg1 >>> 0, arg2, arg3 >>> 0);
}, arguments); }
export function __wbg_bufferSubData_2270f1b9db71e642() { return logError(function (arg0, arg1, arg2, arg3) {
    arg0.bufferSubData(arg1 >>> 0, arg2, arg3);
}, arguments); }
export function __wbg_bufferSubData_44db8a3b4a70b57d() { return logError(function (arg0, arg1, arg2, arg3) {
    arg0.bufferSubData(arg1 >>> 0, arg2, arg3);
}, arguments); }
export function __wbg_call_5575218572ead796() { return handleError(function (arg0, arg1, arg2) {
    const ret = arg0.call(arg1, arg2);
    return ret;
}, arguments); }
export function __wbg_call_8e98ed2f3c86c4b5() { return handleError(function (arg0, arg1) {
    const ret = arg0.call(arg1);
    return ret;
}, arguments); }
export function __wbg_clearBuffer_1a66bf0852937316() { return logError(function (arg0, arg1, arg2) {
    arg0.clearBuffer(arg1, arg2);
}, arguments); }
export function __wbg_clearBuffer_8b28969d396ae40b() { return logError(function (arg0, arg1, arg2, arg3) {
    arg0.clearBuffer(arg1, arg2, arg3);
}, arguments); }
export function __wbg_clearBufferfv_6b77b9402254a2bf() { return logError(function (arg0, arg1, arg2, arg3, arg4) {
    arg0.clearBufferfv(arg1 >>> 0, arg2, getArrayF32FromWasm0(arg3, arg4));
}, arguments); }
export function __wbg_clearBufferiv_0f056544010eef3e() { return logError(function (arg0, arg1, arg2, arg3, arg4) {
    arg0.clearBufferiv(arg1 >>> 0, arg2, getArrayI32FromWasm0(arg3, arg4));
}, arguments); }
export function __wbg_clearBufferuiv_1d2d93401c0904a3() { return logError(function (arg0, arg1, arg2, arg3, arg4) {
    arg0.clearBufferuiv(arg1 >>> 0, arg2, getArrayU32FromWasm0(arg3, arg4));
}, arguments); }
export function __wbg_clearDepth_05c17028494ee4dd() { return logError(function (arg0, arg1) {
    arg0.clearDepth(arg1);
}, arguments); }
export function __wbg_clearDepth_ac6b54f112feeaf7() { return logError(function (arg0, arg1) {
    arg0.clearDepth(arg1);
}, arguments); }
export function __wbg_clearStencil_56d6a6308294a749() { return logError(function (arg0, arg1) {
    arg0.clearStencil(arg1);
}, arguments); }
export function __wbg_clearStencil_917833d1e2ac56e4() { return logError(function (arg0, arg1) {
    arg0.clearStencil(arg1);
}, arguments); }
export function __wbg_clear_dadcb3e2929388b0() { return logError(function (arg0, arg1) {
    arg0.clear(arg1 >>> 0);
}, arguments); }
export function __wbg_clear_ff8cfdf420f7dde6() { return logError(function (arg0, arg1) {
    arg0.clear(arg1 >>> 0);
}, arguments); }
export function __wbg_clientWaitSync_7580165bd2eff461() { return logError(function (arg0, arg1, arg2, arg3) {
    const ret = arg0.clientWaitSync(arg1, arg2 >>> 0, arg3 >>> 0);
    _assertNum(ret);
    return ret;
}, arguments); }
export function __wbg_colorMask_b0ab9d429a1efa0a() { return logError(function (arg0, arg1, arg2, arg3, arg4) {
    arg0.colorMask(arg1 !== 0, arg2 !== 0, arg3 !== 0, arg4 !== 0);
}, arguments); }
export function __wbg_colorMask_f111e3e5796458f4() { return logError(function (arg0, arg1, arg2, arg3, arg4) {
    arg0.colorMask(arg1 !== 0, arg2 !== 0, arg3 !== 0, arg4 !== 0);
}, arguments); }
export function __wbg_compileShader_f5625b583b2c9fd6() { return logError(function (arg0, arg1) {
    arg0.compileShader(arg1);
}, arguments); }
export function __wbg_compileShader_fcf3f3d2891f73f9() { return logError(function (arg0, arg1) {
    arg0.compileShader(arg1);
}, arguments); }
export function __wbg_compressedTexSubImage2D_44c06107dab236a8() { return logError(function (arg0, arg1, arg2, arg3, arg4, arg5, arg6, arg7, arg8) {
    arg0.compressedTexSubImage2D(arg1 >>> 0, arg2, arg3, arg4, arg5, arg6, arg7 >>> 0, arg8);
}, arguments); }
export function __wbg_compressedTexSubImage2D_7f963168c14c0082() { return logError(function (arg0, arg1, arg2, arg3, arg4, arg5, arg6, arg7, arg8) {
    arg0.compressedTexSubImage2D(arg1 >>> 0, arg2, arg3, arg4, arg5, arg6, arg7 >>> 0, arg8);
}, arguments); }
export function __wbg_compressedTexSubImage2D_9d66d6214713bbfb() { return logError(function (arg0, arg1, arg2, arg3, arg4, arg5, arg6, arg7, arg8, arg9) {
    arg0.compressedTexSubImage2D(arg1 >>> 0, arg2, arg3, arg4, arg5, arg6, arg7 >>> 0, arg8, arg9);
}, arguments); }
export function __wbg_compressedTexSubImage3D_73e1f9f3aa71a2da() { return logError(function (arg0, arg1, arg2, arg3, arg4, arg5, arg6, arg7, arg8, arg9, arg10, arg11) {
    arg0.compressedTexSubImage3D(arg1 >>> 0, arg2, arg3, arg4, arg5, arg6, arg7, arg8, arg9 >>> 0, arg10, arg11);
}, arguments); }
export function __wbg_compressedTexSubImage3D_e47c04fef5551d29() { return logError(function (arg0, arg1, arg2, arg3, arg4, arg5, arg6, arg7, arg8, arg9, arg10) {
    arg0.compressedTexSubImage3D(arg1 >>> 0, arg2, arg3, arg4, arg5, arg6, arg7, arg8, arg9 >>> 0, arg10);
}, arguments); }
export function __wbg_configure_c0a3d80e97c0e7b1() { return handleError(function (arg0, arg1) {
    arg0.configure(arg1);
}, arguments); }
export function __wbg_copyBufferSubData_a944f33b601b822d() { return logError(function (arg0, arg1, arg2, arg3, arg4, arg5) {
    arg0.copyBufferSubData(arg1 >>> 0, arg2 >>> 0, arg3, arg4, arg5);
}, arguments); }
export function __wbg_copyBufferToBuffer_3b119149df2dc5eb() { return handleError(function (arg0, arg1, arg2, arg3, arg4) {
    arg0.copyBufferToBuffer(arg1, arg2, arg3, arg4);
}, arguments); }
export function __wbg_copyBufferToBuffer_9e5aea97d7828aa3() { return handleError(function (arg0, arg1, arg2, arg3, arg4, arg5) {
    arg0.copyBufferToBuffer(arg1, arg2, arg3, arg4, arg5);
}, arguments); }
export function __wbg_copyBufferToTexture_46f05a7a84552c50() { return handleError(function (arg0, arg1, arg2, arg3) {
    arg0.copyBufferToTexture(arg1, arg2, arg3);
}, arguments); }
export function __wbg_copyExternalImageToTexture_305b23364c470d9e() { return handleError(function (arg0, arg1, arg2, arg3) {
    arg0.copyExternalImageToTexture(arg1, arg2, arg3);
}, arguments); }
export function __wbg_copyTexSubImage2D_3c7de20db5e2b39f() { return logError(function (arg0, arg1, arg2, arg3, arg4, arg5, arg6, arg7, arg8) {
    arg0.copyTexSubImage2D(arg1 >>> 0, arg2, arg3, arg4, arg5, arg6, arg7, arg8);
}, arguments); }
export function __wbg_copyTexSubImage2D_4b1ba73bf053b4e6() { return logError(function (arg0, arg1, arg2, arg3, arg4, arg5, arg6, arg7, arg8) {
    arg0.copyTexSubImage2D(arg1 >>> 0, arg2, arg3, arg4, arg5, arg6, arg7, arg8);
}, arguments); }
export function __wbg_copyTexSubImage3D_8ba04135d122a27a() { return logError(function (arg0, arg1, arg2, arg3, arg4, arg5, arg6, arg7, arg8, arg9) {
    arg0.copyTexSubImage3D(arg1 >>> 0, arg2, arg3, arg4, arg5, arg6, arg7, arg8, arg9);
}, arguments); }
export function __wbg_copyTextureToBuffer_a9b82ac765521aab() { return handleError(function (arg0, arg1, arg2, arg3) {
    arg0.copyTextureToBuffer(arg1, arg2, arg3);
}, arguments); }
export function __wbg_copyTextureToTexture_bb85c4b0b746d312() { return handleError(function (arg0, arg1, arg2, arg3) {
    arg0.copyTextureToTexture(arg1, arg2, arg3);
}, arguments); }
export function __wbg_createBindGroupLayout_59891d473ac8665d() { return handleError(function (arg0, arg1) {
    const ret = arg0.createBindGroupLayout(arg1);
    return ret;
}, arguments); }
export function __wbg_createBindGroup_4cb86ff853df5c69() { return logError(function (arg0, arg1) {
    const ret = arg0.createBindGroup(arg1);
    return ret;
}, arguments); }
export function __wbg_createBuffer_0e42c2e1f7bbaeeb() { return logError(function (arg0) {
    const ret = arg0.createBuffer();
    return isLikeNone(ret) ? 0 : addToExternrefTable0(ret);
}, arguments); }
export function __wbg_createBuffer_3fa0256cba655273() { return handleError(function (arg0, arg1) {
    const ret = arg0.createBuffer(arg1);
    return ret;
}, arguments); }
export function __wbg_createBuffer_9f602b2dbcbf409c() { return logError(function (arg0) {
    const ret = arg0.createBuffer();
    return isLikeNone(ret) ? 0 : addToExternrefTable0(ret);
}, arguments); }
export function __wbg_createCommandEncoder_98e3b731629054b4() { return logError(function (arg0, arg1) {
    const ret = arg0.createCommandEncoder(arg1);
    return ret;
}, arguments); }
export function __wbg_createComputePipeline_9d101515d504e110() { return logError(function (arg0, arg1) {
    const ret = arg0.createComputePipeline(arg1);
    return ret;
}, arguments); }
export function __wbg_createElement_9e23ac95e40e302c() { return handleError(function (arg0, arg1, arg2) {
    const ret = arg0.createElement(getStringFromWasm0(arg1, arg2));
    return ret;
}, arguments); }
export function __wbg_createFramebuffer_4a250944a4542bbc() { return logError(function (arg0) {
    const ret = arg0.createFramebuffer();
    return isLikeNone(ret) ? 0 : addToExternrefTable0(ret);
}, arguments); }
export function __wbg_createFramebuffer_ab73f30b5dc97415() { return logError(function (arg0) {
    const ret = arg0.createFramebuffer();
    return isLikeNone(ret) ? 0 : addToExternrefTable0(ret);
}, arguments); }
export function __wbg_createPipelineLayout_270b4fd0b4230373() { return logError(function (arg0, arg1) {
    const ret = arg0.createPipelineLayout(arg1);
    return ret;
}, arguments); }
export function __wbg_createProgram_4c8164d471c10346() { return logError(function (arg0) {
    const ret = arg0.createProgram();
    return isLikeNone(ret) ? 0 : addToExternrefTable0(ret);
}, arguments); }
export function __wbg_createProgram_f11c63f59f41b82a() { return logError(function (arg0) {
    const ret = arg0.createProgram();
    return isLikeNone(ret) ? 0 : addToExternrefTable0(ret);
}, arguments); }
export function __wbg_createQuerySet_062b688bddf6971f() { return handleError(function (arg0, arg1) {
    const ret = arg0.createQuerySet(arg1);
    return ret;
}, arguments); }
export function __wbg_createQuery_f013132b870a71ef() { return logError(function (arg0) {
    const ret = arg0.createQuery();
    return isLikeNone(ret) ? 0 : addToExternrefTable0(ret);
}, arguments); }
export function __wbg_createRenderBundleEncoder_c6c93cbb173c947e() { return handleError(function (arg0, arg1) {
    const ret = arg0.createRenderBundleEncoder(arg1);
    return ret;
}, arguments); }
export function __wbg_createRenderPipeline_4c120add6a62a442() { return handleError(function (arg0, arg1) {
    const ret = arg0.createRenderPipeline(arg1);
    return ret;
}, arguments); }
export function __wbg_createRenderbuffer_556000dbb01f5026() { return logError(function (arg0) {
    const ret = arg0.createRenderbuffer();
    return isLikeNone(ret) ? 0 : addToExternrefTable0(ret);
}, arguments); }
export function __wbg_createRenderbuffer_5ada3a0bc7cf3a43() { return logError(function (arg0) {
    const ret = arg0.createRenderbuffer();
    return isLikeNone(ret) ? 0 : addToExternrefTable0(ret);
}, arguments); }
export function __wbg_createSampler_95bff4f5405a3dd1() { return logError(function (arg0, arg1) {
    const ret = arg0.createSampler(arg1);
    return ret;
}, arguments); }
export function __wbg_createSampler_9fe50152a2524319() { return logError(function (arg0) {
    const ret = arg0.createSampler();
    return isLikeNone(ret) ? 0 : addToExternrefTable0(ret);
}, arguments); }
export function __wbg_createShaderModule_f0aa469466c7bdaa() { return logError(function (arg0, arg1) {
    const ret = arg0.createShaderModule(arg1);
    return ret;
}, arguments); }
export function __wbg_createShader_27d9388313f3b14e() { return logError(function (arg0, arg1) {
    const ret = arg0.createShader(arg1 >>> 0);
    return isLikeNone(ret) ? 0 : addToExternrefTable0(ret);
}, arguments); }
export function __wbg_createShader_9c5cd42709d915ff() { return logError(function (arg0, arg1) {
    const ret = arg0.createShader(arg1 >>> 0);
    return isLikeNone(ret) ? 0 : addToExternrefTable0(ret);
}, arguments); }
export function __wbg_createTexture_28341edbcc7d129e() { return handleError(function (arg0, arg1) {
    const ret = arg0.createTexture(arg1);
    return ret;
}, arguments); }
export function __wbg_createTexture_3eed23cb87dd35fc() { return logError(function (arg0) {
    const ret = arg0.createTexture();
    return isLikeNone(ret) ? 0 : addToExternrefTable0(ret);
}, arguments); }
export function __wbg_createTexture_8455c703424c567b() { return logError(function (arg0) {
    const ret = arg0.createTexture();
    return isLikeNone(ret) ? 0 : addToExternrefTable0(ret);
}, arguments); }
export function __wbg_createVertexArrayOES_4bbd1b38563aab57() { return logError(function (arg0) {
    const ret = arg0.createVertexArrayOES();
    return isLikeNone(ret) ? 0 : addToExternrefTable0(ret);
}, arguments); }
export function __wbg_createVertexArray_8685feb21901c932() { return logError(function (arg0) {
    const ret = arg0.createVertexArray();
    return isLikeNone(ret) ? 0 : addToExternrefTable0(ret);
}, arguments); }
export function __wbg_createView_d04a0f9bdd723238() { return handleError(function (arg0, arg1) {
    const ret = arg0.createView(arg1);
    return ret;
}, arguments); }
export function __wbg_cullFace_774780fb4177aab8() { return logError(function (arg0, arg1) {
    arg0.cullFace(arg1 >>> 0);
}, arguments); }
export function __wbg_cullFace_94f24b4fd5e9038b() { return logError(function (arg0, arg1) {
    arg0.cullFace(arg1 >>> 0);
}, arguments); }
export function __wbg_data_411cafdcea483b74() { return logError(function (arg0, arg1) {
    const ret = arg1.data;
    const ptr1 = passArray8ToWasm0(ret, wasm.__wbindgen_malloc);
    const len1 = WASM_VECTOR_LEN;
    getDataViewMemory0().setInt32(arg0 + 4 * 1, len1, true);
    getDataViewMemory0().setInt32(arg0 + 4 * 0, ptr1, true);
}, arguments); }
export function __wbg_deleteBuffer_d0fb5f1492ee8c6f() { return logError(function (arg0, arg1) {
    arg0.deleteBuffer(arg1);
}, arguments); }
export function __wbg_deleteBuffer_d758283bea6e0ccf() { return logError(function (arg0, arg1) {
    arg0.deleteBuffer(arg1);
}, arguments); }
export function __wbg_deleteFramebuffer_4c0996be4bc30a67() { return logError(function (arg0, arg1) {
    arg0.deleteFramebuffer(arg1);
}, arguments); }
export function __wbg_deleteFramebuffer_8953b325144192fe() { return logError(function (arg0, arg1) {
    arg0.deleteFramebuffer(arg1);
}, arguments); }
export function __wbg_deleteProgram_0135c6926e75af75() { return logError(function (arg0, arg1) {
    arg0.deleteProgram(arg1);
}, arguments); }
export function __wbg_deleteProgram_eff668280dcb01ca() { return logError(function (arg0, arg1) {
    arg0.deleteProgram(arg1);
}, arguments); }
export function __wbg_deleteQuery_ef51ea0a52420103() { return logError(function (arg0, arg1) {
    arg0.deleteQuery(arg1);
}, arguments); }
export function __wbg_deleteRenderbuffer_ada86fd85d32984f() { return logError(function (arg0, arg1) {
    arg0.deleteRenderbuffer(arg1);
}, arguments); }
export function __wbg_deleteRenderbuffer_c9320d711ddf649b() { return logError(function (arg0, arg1) {
    arg0.deleteRenderbuffer(arg1);
}, arguments); }
export function __wbg_deleteSampler_5c045e0cc55813d4() { return logError(function (arg0, arg1) {
    arg0.deleteSampler(arg1);
}, arguments); }
export function __wbg_deleteShader_3339454254c7147c() { return logError(function (arg0, arg1) {
    arg0.deleteShader(arg1);
}, arguments); }
export function __wbg_deleteShader_79dbaaed69b7ca3b() { return logError(function (arg0, arg1) {
    arg0.deleteShader(arg1);
}, arguments); }
export function __wbg_deleteSync_37ca83c429c43d8a() { return logError(function (arg0, arg1) {
    arg0.deleteSync(arg1);
}, arguments); }
export function __wbg_deleteTexture_3acb672a45f9998a() { return logError(function (arg0, arg1) {
    arg0.deleteTexture(arg1);
}, arguments); }
export function __wbg_deleteTexture_c1c58550dc55af5c() { return logError(function (arg0, arg1) {
    arg0.deleteTexture(arg1);
}, arguments); }
export function __wbg_deleteVertexArrayOES_287cf2a2e8a27b13() { return logError(function (arg0, arg1) {
    arg0.deleteVertexArrayOES(arg1);
}, arguments); }
export function __wbg_deleteVertexArray_8ee078fdb1fb1ffe() { return logError(function (arg0, arg1) {
    arg0.deleteVertexArray(arg1);
}, arguments); }
export function __wbg_depthFunc_31b183b5b8ee478e() { return logError(function (arg0, arg1) {
    arg0.depthFunc(arg1 >>> 0);
}, arguments); }
export function __wbg_depthFunc_eaca1bc79f7bf216() { return logError(function (arg0, arg1) {
    arg0.depthFunc(arg1 >>> 0);
}, arguments); }
export function __wbg_depthMask_3a9074b08d1f68e5() { return logError(function (arg0, arg1) {
    arg0.depthMask(arg1 !== 0);
}, arguments); }
export function __wbg_depthMask_cab7f2ae7f0e559c() { return logError(function (arg0, arg1) {
    arg0.depthMask(arg1 !== 0);
}, arguments); }
export function __wbg_depthRange_797a71ba3b79267a() { return logError(function (arg0, arg1, arg2) {
    arg0.depthRange(arg1, arg2);
}, arguments); }
export function __wbg_depthRange_c24a808b3496e0a9() { return logError(function (arg0, arg1, arg2) {
    arg0.depthRange(arg1, arg2);
}, arguments); }
export function __wbg_description_f6ebcdce701b056b() { return logError(function (arg0, arg1) {
    const ret = arg1.description;
    const ptr1 = passStringToWasm0(ret, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
    const len1 = WASM_VECTOR_LEN;
    getDataViewMemory0().setInt32(arg0 + 4 * 1, len1, true);
    getDataViewMemory0().setInt32(arg0 + 4 * 0, ptr1, true);
}, arguments); }
export function __wbg_destroy_0e8b506c96c4a3d6() { return logError(function (arg0) {
    arg0.destroy();
}, arguments); }
export function __wbg_destroy_a1ad55d8110037a7() { return logError(function (arg0) {
    arg0.destroy();
}, arguments); }
export function __wbg_destroy_ce807b0d8ddbb656() { return logError(function (arg0) {
    arg0.destroy();
}, arguments); }
export function __wbg_disableVertexAttribArray_25f8b2d699a4387a() { return logError(function (arg0, arg1) {
    arg0.disableVertexAttribArray(arg1 >>> 0);
}, arguments); }
export function __wbg_disableVertexAttribArray_b395358ec5084c39() { return logError(function (arg0, arg1) {
    arg0.disableVertexAttribArray(arg1 >>> 0);
}, arguments); }
export function __wbg_disable_4dca6ee0ccc91e4a() { return logError(function (arg0, arg1) {
    arg0.disable(arg1 >>> 0);
}, arguments); }
export function __wbg_disable_cb1b3e6c1cee5202() { return logError(function (arg0, arg1) {
    arg0.disable(arg1 >>> 0);
}, arguments); }
export function __wbg_document_2634180a4c694068() { return logError(function (arg0) {
    const ret = arg0.document;
    return isLikeNone(ret) ? 0 : addToExternrefTable0(ret);
}, arguments); }
export function __wbg_done_b62d4a7d2286852a() { return logError(function (arg0) {
    const ret = arg0.done;
    _assertBoolean(ret);
    return ret;
}, arguments); }
export function __wbg_drawArraysInstancedANGLE_83c84d616f54261b() { return logError(function (arg0, arg1, arg2, arg3, arg4) {
    arg0.drawArraysInstancedANGLE(arg1 >>> 0, arg2, arg3, arg4);
}, arguments); }
export function __wbg_drawArraysInstanced_999df3e7f5c8762b() { return logError(function (arg0, arg1, arg2, arg3, arg4) {
    arg0.drawArraysInstanced(arg1 >>> 0, arg2, arg3, arg4);
}, arguments); }
export function __wbg_drawArrays_10e1254aa4524ae9() { return logError(function (arg0, arg1, arg2, arg3) {
    arg0.drawArrays(arg1 >>> 0, arg2, arg3);
}, arguments); }
export function __wbg_drawArrays_42dbb4b0349c8f34() { return logError(function (arg0, arg1, arg2, arg3) {
    arg0.drawArrays(arg1 >>> 0, arg2, arg3);
}, arguments); }
export function __wbg_drawBuffersWEBGL_3bfb30349766d902() { return logError(function (arg0, arg1) {
    arg0.drawBuffersWEBGL(arg1);
}, arguments); }
export function __wbg_drawBuffers_558d96e52e754731() { return logError(function (arg0, arg1) {
    arg0.drawBuffers(arg1);
}, arguments); }
export function __wbg_drawElementsInstancedANGLE_a73eba5955ee33fa() { return logError(function (arg0, arg1, arg2, arg3, arg4, arg5) {
    arg0.drawElementsInstancedANGLE(arg1 >>> 0, arg2, arg3 >>> 0, arg4, arg5);
}, arguments); }
export function __wbg_drawElementsInstanced_fdc96cf6adbebc12() { return logError(function (arg0, arg1, arg2, arg3, arg4, arg5) {
    arg0.drawElementsInstanced(arg1 >>> 0, arg2, arg3 >>> 0, arg4, arg5);
}, arguments); }
export function __wbg_drawIndexedIndirect_e594d3740e91607c() { return logError(function (arg0, arg1, arg2) {
    arg0.drawIndexedIndirect(arg1, arg2);
}, arguments); }
export function __wbg_drawIndexed_cc7c04c1088cafad() { return logError(function (arg0, arg1, arg2, arg3, arg4, arg5) {
    arg0.drawIndexed(arg1 >>> 0, arg2 >>> 0, arg3 >>> 0, arg4, arg5 >>> 0);
}, arguments); }
export function __wbg_drawIndirect_7163ad3319140d5a() { return logError(function (arg0, arg1, arg2) {
    arg0.drawIndirect(arg1, arg2);
}, arguments); }
export function __wbg_draw_92eb37d6b3b2aab4() { return logError(function (arg0, arg1, arg2, arg3, arg4) {
    arg0.draw(arg1 >>> 0, arg2 >>> 0, arg3 >>> 0, arg4 >>> 0);
}, arguments); }
export function __wbg_enableVertexAttribArray_4f0f3da1ae1fd116() { return logError(function (arg0, arg1) {
    arg0.enableVertexAttribArray(arg1 >>> 0);
}, arguments); }
export function __wbg_enableVertexAttribArray_7fc50a6fdbc03eb3() { return logError(function (arg0, arg1) {
    arg0.enableVertexAttribArray(arg1 >>> 0);
}, arguments); }
export function __wbg_enable_c6e523307311617a() { return logError(function (arg0, arg1) {
    arg0.enable(arg1 >>> 0);
}, arguments); }
export function __wbg_enable_d1f42f78be33a553() { return logError(function (arg0, arg1) {
    arg0.enable(arg1 >>> 0);
}, arguments); }
export function __wbg_endOcclusionQuery_472efcf3abd55f95() { return logError(function (arg0) {
    arg0.endOcclusionQuery();
}, arguments); }
export function __wbg_endQuery_161170c5280a8293() { return logError(function (arg0, arg1) {
    arg0.endQuery(arg1 >>> 0);
}, arguments); }
export function __wbg_end_d49513b309f4ca43() { return logError(function (arg0) {
    arg0.end();
}, arguments); }
export function __wbg_entries_c261c3fa1f281256() { return logError(function (arg0) {
    const ret = Object.entries(arg0);
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
export function __wbg_error_f6720b4bc5b9976f() { return logError(function (arg0) {
    const ret = arg0.error;
    return ret;
}, arguments); }
export function __wbg_executeBundles_92e7459bdf3d7ec1() { return logError(function (arg0, arg1) {
    arg0.executeBundles(arg1);
}, arguments); }
export function __wbg_features_0d8935ffe5087d3e() { return logError(function (arg0) {
    const ret = arg0.features;
    return ret;
}, arguments); }
export function __wbg_features_6906f30d3b243f58() { return logError(function (arg0) {
    const ret = arg0.features;
    return ret;
}, arguments); }
export function __wbg_fenceSync_56efc7cc79111e54() { return logError(function (arg0, arg1, arg2) {
    const ret = arg0.fenceSync(arg1 >>> 0, arg2 >>> 0);
    return isLikeNone(ret) ? 0 : addToExternrefTable0(ret);
}, arguments); }
export function __wbg_finish_6c7bba424ffe1bbc() { return logError(function (arg0, arg1) {
    const ret = arg0.finish(arg1);
    return ret;
}, arguments); }
export function __wbg_finish_c40b67ff2af88e0c() { return logError(function (arg0) {
    const ret = arg0.finish();
    return ret;
}, arguments); }
export function __wbg_flush_7ae42f071230db6b() { return logError(function (arg0) {
    arg0.flush();
}, arguments); }
export function __wbg_flush_eb3fb8da2ec00d57() { return logError(function (arg0) {
    arg0.flush();
}, arguments); }
export function __wbg_framebufferRenderbuffer_52ae9fcc29125a07() { return logError(function (arg0, arg1, arg2, arg3, arg4) {
    arg0.framebufferRenderbuffer(arg1 >>> 0, arg2 >>> 0, arg3 >>> 0, arg4);
}, arguments); }
export function __wbg_framebufferRenderbuffer_f9d75924fbe9024a() { return logError(function (arg0, arg1, arg2, arg3, arg4) {
    arg0.framebufferRenderbuffer(arg1 >>> 0, arg2 >>> 0, arg3 >>> 0, arg4);
}, arguments); }
export function __wbg_framebufferTexture2D_367ab597a005e8d9() { return logError(function (arg0, arg1, arg2, arg3, arg4, arg5) {
    arg0.framebufferTexture2D(arg1 >>> 0, arg2 >>> 0, arg3 >>> 0, arg4, arg5);
}, arguments); }
export function __wbg_framebufferTexture2D_3a558e14f56720d2() { return logError(function (arg0, arg1, arg2, arg3, arg4, arg5) {
    arg0.framebufferTexture2D(arg1 >>> 0, arg2 >>> 0, arg3 >>> 0, arg4, arg5);
}, arguments); }
export function __wbg_framebufferTextureLayer_2312acdc74f97676() { return logError(function (arg0, arg1, arg2, arg3, arg4, arg5) {
    arg0.framebufferTextureLayer(arg1 >>> 0, arg2 >>> 0, arg3, arg4, arg5);
}, arguments); }
export function __wbg_framebufferTextureMultiviewOVR_bab62b45b7debf2c() { return logError(function (arg0, arg1, arg2, arg3, arg4, arg5, arg6) {
    arg0.framebufferTextureMultiviewOVR(arg1 >>> 0, arg2 >>> 0, arg3, arg4, arg5, arg6);
}, arguments); }
export function __wbg_frontFace_9bdcf2a758e989e5() { return logError(function (arg0, arg1) {
    arg0.frontFace(arg1 >>> 0);
}, arguments); }
export function __wbg_frontFace_c9bb1fa659ffd276() { return logError(function (arg0, arg1) {
    arg0.frontFace(arg1 >>> 0);
}, arguments); }
export function __wbg_getBufferSubData_92680d3a2f7be029() { return logError(function (arg0, arg1, arg2, arg3) {
    arg0.getBufferSubData(arg1 >>> 0, arg2, arg3);
}, arguments); }
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
export function __wbg_getPreferredCanvasFormat_6f629398d892f0c9() { return logError(function (arg0) {
    const ret = arg0.getPreferredCanvasFormat();
    return (__wbindgen_enum_GpuTextureFormat.indexOf(ret) + 1 || 96) - 1;
}, arguments); }
export function __wbg_getProgramInfoLog_35410850de9ccefe() { return logError(function (arg0, arg1, arg2) {
    const ret = arg1.getProgramInfoLog(arg2);
    var ptr1 = isLikeNone(ret) ? 0 : passStringToWasm0(ret, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
    var len1 = WASM_VECTOR_LEN;
    getDataViewMemory0().setInt32(arg0 + 4 * 1, len1, true);
    getDataViewMemory0().setInt32(arg0 + 4 * 0, ptr1, true);
}, arguments); }
export function __wbg_getProgramInfoLog_cd84be80942f345b() { return logError(function (arg0, arg1, arg2) {
    const ret = arg1.getProgramInfoLog(arg2);
    var ptr1 = isLikeNone(ret) ? 0 : passStringToWasm0(ret, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
    var len1 = WASM_VECTOR_LEN;
    getDataViewMemory0().setInt32(arg0 + 4 * 1, len1, true);
    getDataViewMemory0().setInt32(arg0 + 4 * 0, ptr1, true);
}, arguments); }
export function __wbg_getProgramParameter_039391d5ba319f50() { return logError(function (arg0, arg1, arg2) {
    const ret = arg0.getProgramParameter(arg1, arg2 >>> 0);
    return ret;
}, arguments); }
export function __wbg_getProgramParameter_bbc667347ac2e882() { return logError(function (arg0, arg1, arg2) {
    const ret = arg0.getProgramParameter(arg1, arg2 >>> 0);
    return ret;
}, arguments); }
export function __wbg_getQueryParameter_0599e85ddb81220b() { return logError(function (arg0, arg1, arg2) {
    const ret = arg0.getQueryParameter(arg1, arg2 >>> 0);
    return ret;
}, arguments); }
export function __wbg_getShaderInfoLog_495bddda98172699() { return logError(function (arg0, arg1, arg2) {
    const ret = arg1.getShaderInfoLog(arg2);
    var ptr1 = isLikeNone(ret) ? 0 : passStringToWasm0(ret, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
    var len1 = WASM_VECTOR_LEN;
    getDataViewMemory0().setInt32(arg0 + 4 * 1, len1, true);
    getDataViewMemory0().setInt32(arg0 + 4 * 0, ptr1, true);
}, arguments); }
export function __wbg_getShaderInfoLog_f423ce6d280ccca0() { return logError(function (arg0, arg1, arg2) {
    const ret = arg1.getShaderInfoLog(arg2);
    var ptr1 = isLikeNone(ret) ? 0 : passStringToWasm0(ret, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
    var len1 = WASM_VECTOR_LEN;
    getDataViewMemory0().setInt32(arg0 + 4 * 1, len1, true);
    getDataViewMemory0().setInt32(arg0 + 4 * 0, ptr1, true);
}, arguments); }
export function __wbg_getShaderParameter_4eb65cfb174ceb22() { return logError(function (arg0, arg1, arg2) {
    const ret = arg0.getShaderParameter(arg1, arg2 >>> 0);
    return ret;
}, arguments); }
export function __wbg_getShaderParameter_93cc1f20f1dd0b1e() { return logError(function (arg0, arg1, arg2) {
    const ret = arg0.getShaderParameter(arg1, arg2 >>> 0);
    return ret;
}, arguments); }
export function __wbg_getSupportedExtensions_fbc6e8f81b1f5dbd() { return logError(function (arg0) {
    const ret = arg0.getSupportedExtensions();
    return isLikeNone(ret) ? 0 : addToExternrefTable0(ret);
}, arguments); }
export function __wbg_getSupportedProfiles_e24289cb9a71b3f0() { return logError(function (arg0) {
    const ret = arg0.getSupportedProfiles();
    return isLikeNone(ret) ? 0 : addToExternrefTable0(ret);
}, arguments); }
export function __wbg_getSyncParameter_9a2bda340ebe166f() { return logError(function (arg0, arg1, arg2) {
    const ret = arg0.getSyncParameter(arg1, arg2 >>> 0);
    return ret;
}, arguments); }
export function __wbg_getUniformBlockIndex_3bf387d80cee898d() { return logError(function (arg0, arg1, arg2, arg3) {
    const ret = arg0.getUniformBlockIndex(arg1, getStringFromWasm0(arg2, arg3));
    _assertNum(ret);
    return ret;
}, arguments); }
export function __wbg_getUniformLocation_340155dc706d3fea() { return logError(function (arg0, arg1, arg2, arg3) {
    const ret = arg0.getUniformLocation(arg1, getStringFromWasm0(arg2, arg3));
    return isLikeNone(ret) ? 0 : addToExternrefTable0(ret);
}, arguments); }
export function __wbg_getUniformLocation_ab63f569a4e41744() { return logError(function (arg0, arg1, arg2, arg3) {
    const ret = arg0.getUniformLocation(arg1, getStringFromWasm0(arg2, arg3));
    return isLikeNone(ret) ? 0 : addToExternrefTable0(ret);
}, arguments); }
export function __wbg_get_197a3fe98f169e38() { return logError(function (arg0, arg1) {
    const ret = arg0[arg1 >>> 0];
    return ret;
}, arguments); }
export function __wbg_get_37b48b8fa52d1f2c() { return logError(function (arg0, arg1) {
    const ret = arg0[arg1 >>> 0];
    return isLikeNone(ret) ? 0 : addToExternrefTable0(ret);
}, arguments); }
export function __wbg_get_9a29be2cb383ed9a() { return handleError(function (arg0, arg1) {
    const ret = Reflect.get(arg0, arg1);
    return ret;
}, arguments); }
export function __wbg_get_dddb90ff5d27a080() { return handleError(function (arg0, arg1) {
    const ret = Reflect.get(arg0, arg1);
    return ret;
}, arguments); }
export function __wbg_get_unchecked_54a4374c38e08460() { return logError(function (arg0, arg1) {
    const ret = arg0[arg1 >>> 0];
    return ret;
}, arguments); }
export function __wbg_get_with_ref_key_6412cf3094599694() { return logError(function (arg0, arg1) {
    const ret = arg0[arg1];
    return ret;
}, arguments); }
export function __wbg_gpu_cbd27ad0589bc0b3() { return logError(function (arg0) {
    const ret = arg0.gpu;
    return ret;
}, arguments); }
export function __wbg_has_dbcaf77712624019() { return logError(function (arg0, arg1, arg2) {
    const ret = arg0.has(getStringFromWasm0(arg1, arg2));
    _assertBoolean(ret);
    return ret;
}, arguments); }
export function __wbg_height_3ad24dc28193a959() { return logError(function (arg0) {
    const ret = arg0.height;
    _assertNum(ret);
    return ret;
}, arguments); }
export function __wbg_height_519497d37234f77b() { return logError(function (arg0) {
    const ret = arg0.height;
    _assertNum(ret);
    return ret;
}, arguments); }
export function __wbg_height_5a65f00c2e236c0e() { return logError(function (arg0) {
    const ret = arg0.height;
    _assertNum(ret);
    return ret;
}, arguments); }
export function __wbg_height_8fb50acea2970780() { return logError(function (arg0) {
    const ret = arg0.height;
    _assertNum(ret);
    return ret;
}, arguments); }
export function __wbg_height_a04613570d793df2() { return logError(function (arg0) {
    const ret = arg0.height;
    _assertNum(ret);
    return ret;
}, arguments); }
export function __wbg_includes_83dff8d05da243c5() { return logError(function (arg0, arg1, arg2) {
    const ret = arg0.includes(arg1, arg2);
    _assertBoolean(ret);
    return ret;
}, arguments); }
export function __wbg_info_91a8fcd51fd17fff() { return logError(function (arg0) {
    const ret = arg0.info;
    return ret;
}, arguments); }
export function __wbg_insertDebugMarker_bd280225c1d10c7e() { return logError(function (arg0, arg1, arg2) {
    arg0.insertDebugMarker(getStringFromWasm0(arg1, arg2));
}, arguments); }
export function __wbg_insertDebugMarker_c70397db08a5ffcc() { return logError(function (arg0, arg1, arg2) {
    arg0.insertDebugMarker(getStringFromWasm0(arg1, arg2));
}, arguments); }
export function __wbg_instanceof_ArrayBuffer_2a7bb09fee70c2da() { return logError(function (arg0) {
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
export function __wbg_instanceof_GpuAdapter_1297a3a5ce0db3ff() { return logError(function (arg0) {
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
export function __wbg_instanceof_GpuCanvasContext_13613277d7bf3768() { return logError(function (arg0) {
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
export function __wbg_instanceof_GpuDeviceLostInfo_0e99a9595225a57d() { return logError(function (arg0) {
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
export function __wbg_instanceof_GpuOutOfMemoryError_100c4600c3e13387() { return logError(function (arg0) {
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
export function __wbg_instanceof_GpuValidationError_94580aa7a41f3bdb() { return logError(function (arg0) {
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
export function __wbg_instanceof_HtmlCanvasElement_8ce29a370a2b10a4() { return logError(function (arg0) {
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
export function __wbg_instanceof_Map_afa18d5840c04c15() { return logError(function (arg0) {
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
export function __wbg_instanceof_Object_60be3eaa7a661141() { return logError(function (arg0) {
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
export function __wbg_instanceof_OffscreenCanvas_be4f56ade081603c() { return logError(function (arg0) {
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
export function __wbg_instanceof_Uint8Array_f080092dc70f5d58() { return logError(function (arg0) {
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
export function __wbg_instanceof_WebGl2RenderingContext_b30fc72a0130431a() { return logError(function (arg0) {
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
export function __wbg_instanceof_Window_0d356b88a2f77c42() { return logError(function (arg0) {
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
export function __wbg_invalidateFramebuffer_08fe15b00b070e47() { return handleError(function (arg0, arg1, arg2) {
    arg0.invalidateFramebuffer(arg1 >>> 0, arg2);
}, arguments); }
export function __wbg_isArray_145a34fd0a38d37b() { return logError(function (arg0) {
    const ret = Array.isArray(arg0);
    _assertBoolean(ret);
    return ret;
}, arguments); }
export function __wbg_isSafeInteger_a3389a198582f5f6() { return logError(function (arg0) {
    const ret = Number.isSafeInteger(arg0);
    _assertBoolean(ret);
    return ret;
}, arguments); }
export function __wbg_is_de5b366c746e004c() { return logError(function (arg0, arg1) {
    const ret = Object.is(arg0, arg1);
    _assertBoolean(ret);
    return ret;
}, arguments); }
export function __wbg_iterator_cc47ba25a2be735a() { return logError(function () {
    const ret = Symbol.iterator;
    return ret;
}, arguments); }
export function __wbg_keys_cf55acdf6b776017() { return logError(function (arg0) {
    const ret = arg0.keys();
    return ret;
}, arguments); }
export function __wbg_label_9a8583e3a20fafc7() { return logError(function (arg0, arg1) {
    const ret = arg1.label;
    const ptr1 = passStringToWasm0(ret, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
    const len1 = WASM_VECTOR_LEN;
    getDataViewMemory0().setInt32(arg0 + 4 * 1, len1, true);
    getDataViewMemory0().setInt32(arg0 + 4 * 0, ptr1, true);
}, arguments); }
export function __wbg_length_589238bdcf171f0e() { return logError(function (arg0) {
    const ret = arg0.length;
    _assertNum(ret);
    return ret;
}, arguments); }
export function __wbg_length_c6054974c0a6cdb9() { return logError(function (arg0) {
    const ret = arg0.length;
    _assertNum(ret);
    return ret;
}, arguments); }
export function __wbg_limits_25f7265ea0cad6c5() { return logError(function (arg0) {
    const ret = arg0.limits;
    return ret;
}, arguments); }
export function __wbg_limits_b3a1d99e863846d4() { return logError(function (arg0) {
    const ret = arg0.limits;
    return ret;
}, arguments); }
export function __wbg_linkProgram_6a2eee02a03b9b00() { return logError(function (arg0, arg1) {
    arg0.linkProgram(arg1);
}, arguments); }
export function __wbg_linkProgram_e23a348b0f6e0c4f() { return logError(function (arg0, arg1) {
    arg0.linkProgram(arg1);
}, arguments); }
export function __wbg_lost_b787a12a0e44349f() { return logError(function (arg0) {
    const ret = arg0.lost;
    return ret;
}, arguments); }
export function __wbg_mapAsync_e3cfbd141919d03c() { return logError(function (arg0, arg1, arg2, arg3) {
    const ret = arg0.mapAsync(arg1 >>> 0, arg2, arg3);
    return ret;
}, arguments); }
export function __wbg_maxBindGroups_7e4965b5daa53b23() { return logError(function (arg0) {
    const ret = arg0.maxBindGroups;
    _assertNum(ret);
    return ret;
}, arguments); }
export function __wbg_maxBindingsPerBindGroup_5d11588150650215() { return logError(function (arg0) {
    const ret = arg0.maxBindingsPerBindGroup;
    _assertNum(ret);
    return ret;
}, arguments); }
export function __wbg_maxBufferSize_b59f147488bf047a() { return logError(function (arg0) {
    const ret = arg0.maxBufferSize;
    return ret;
}, arguments); }
export function __wbg_maxColorAttachmentBytesPerSample_726ea37aedfb839a() { return logError(function (arg0) {
    const ret = arg0.maxColorAttachmentBytesPerSample;
    _assertNum(ret);
    return ret;
}, arguments); }
export function __wbg_maxColorAttachments_62ecca7ef94d78e4() { return logError(function (arg0) {
    const ret = arg0.maxColorAttachments;
    _assertNum(ret);
    return ret;
}, arguments); }
export function __wbg_maxComputeInvocationsPerWorkgroup_a14458d75e0b90ac() { return logError(function (arg0) {
    const ret = arg0.maxComputeInvocationsPerWorkgroup;
    _assertNum(ret);
    return ret;
}, arguments); }
export function __wbg_maxComputeWorkgroupSizeX_6b8c17d5e4738e77() { return logError(function (arg0) {
    const ret = arg0.maxComputeWorkgroupSizeX;
    _assertNum(ret);
    return ret;
}, arguments); }
export function __wbg_maxComputeWorkgroupSizeY_13b5de41c6e0bc2a() { return logError(function (arg0) {
    const ret = arg0.maxComputeWorkgroupSizeY;
    _assertNum(ret);
    return ret;
}, arguments); }
export function __wbg_maxComputeWorkgroupSizeZ_b12d7f3e670aa0a2() { return logError(function (arg0) {
    const ret = arg0.maxComputeWorkgroupSizeZ;
    _assertNum(ret);
    return ret;
}, arguments); }
export function __wbg_maxComputeWorkgroupStorageSize_886498bc3b0baa23() { return logError(function (arg0) {
    const ret = arg0.maxComputeWorkgroupStorageSize;
    _assertNum(ret);
    return ret;
}, arguments); }
export function __wbg_maxComputeWorkgroupsPerDimension_144b6bbf6ac24451() { return logError(function (arg0) {
    const ret = arg0.maxComputeWorkgroupsPerDimension;
    _assertNum(ret);
    return ret;
}, arguments); }
export function __wbg_maxDynamicStorageBuffersPerPipelineLayout_d81239ef90f4f920() { return logError(function (arg0) {
    const ret = arg0.maxDynamicStorageBuffersPerPipelineLayout;
    _assertNum(ret);
    return ret;
}, arguments); }
export function __wbg_maxDynamicUniformBuffersPerPipelineLayout_0cca7d1cb9e5adf7() { return logError(function (arg0) {
    const ret = arg0.maxDynamicUniformBuffersPerPipelineLayout;
    _assertNum(ret);
    return ret;
}, arguments); }
export function __wbg_maxInterStageShaderVariables_4504147f810dd43d() { return logError(function (arg0) {
    const ret = arg0.maxInterStageShaderVariables;
    _assertNum(ret);
    return ret;
}, arguments); }
export function __wbg_maxSampledTexturesPerShaderStage_54e5ed0537676c83() { return logError(function (arg0) {
    const ret = arg0.maxSampledTexturesPerShaderStage;
    _assertNum(ret);
    return ret;
}, arguments); }
export function __wbg_maxSamplersPerShaderStage_71315fab0d7f34b1() { return logError(function (arg0) {
    const ret = arg0.maxSamplersPerShaderStage;
    _assertNum(ret);
    return ret;
}, arguments); }
export function __wbg_maxStorageBufferBindingSize_779fd522aaaa6f90() { return logError(function (arg0) {
    const ret = arg0.maxStorageBufferBindingSize;
    return ret;
}, arguments); }
export function __wbg_maxStorageBuffersPerShaderStage_c99b4f72aaf19e34() { return logError(function (arg0) {
    const ret = arg0.maxStorageBuffersPerShaderStage;
    _assertNum(ret);
    return ret;
}, arguments); }
export function __wbg_maxStorageTexturesPerShaderStage_5403c17d11da5280() { return logError(function (arg0) {
    const ret = arg0.maxStorageTexturesPerShaderStage;
    _assertNum(ret);
    return ret;
}, arguments); }
export function __wbg_maxTextureArrayLayers_eca9fa36b3d46099() { return logError(function (arg0) {
    const ret = arg0.maxTextureArrayLayers;
    _assertNum(ret);
    return ret;
}, arguments); }
export function __wbg_maxTextureDimension1D_a7d9d7ecd19aae9b() { return logError(function (arg0) {
    const ret = arg0.maxTextureDimension1D;
    _assertNum(ret);
    return ret;
}, arguments); }
export function __wbg_maxTextureDimension2D_c6a3937eb3ab18df() { return logError(function (arg0) {
    const ret = arg0.maxTextureDimension2D;
    _assertNum(ret);
    return ret;
}, arguments); }
export function __wbg_maxTextureDimension3D_d941aa547d9e0801() { return logError(function (arg0) {
    const ret = arg0.maxTextureDimension3D;
    _assertNum(ret);
    return ret;
}, arguments); }
export function __wbg_maxUniformBufferBindingSize_1e8c92a2094b7ce7() { return logError(function (arg0) {
    const ret = arg0.maxUniformBufferBindingSize;
    return ret;
}, arguments); }
export function __wbg_maxUniformBuffersPerShaderStage_83cde6650612f178() { return logError(function (arg0) {
    const ret = arg0.maxUniformBuffersPerShaderStage;
    _assertNum(ret);
    return ret;
}, arguments); }
export function __wbg_maxVertexAttributes_dd313a3540d56e88() { return logError(function (arg0) {
    const ret = arg0.maxVertexAttributes;
    _assertNum(ret);
    return ret;
}, arguments); }
export function __wbg_maxVertexBufferArrayStride_6fd082d9954d1f4a() { return logError(function (arg0) {
    const ret = arg0.maxVertexBufferArrayStride;
    _assertNum(ret);
    return ret;
}, arguments); }
export function __wbg_maxVertexBuffers_bbd14712ac158c6f() { return logError(function (arg0) {
    const ret = arg0.maxVertexBuffers;
    _assertNum(ret);
    return ret;
}, arguments); }
export function __wbg_message_1c3aafa647009286() { return logError(function (arg0, arg1) {
    const ret = arg1.message;
    const ptr1 = passStringToWasm0(ret, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
    const len1 = WASM_VECTOR_LEN;
    getDataViewMemory0().setInt32(arg0 + 4 * 1, len1, true);
    getDataViewMemory0().setInt32(arg0 + 4 * 0, ptr1, true);
}, arguments); }
export function __wbg_message_c717665d7f0d1da0() { return logError(function (arg0, arg1) {
    const ret = arg1.message;
    const ptr1 = passStringToWasm0(ret, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
    const len1 = WASM_VECTOR_LEN;
    getDataViewMemory0().setInt32(arg0 + 4 * 1, len1, true);
    getDataViewMemory0().setInt32(arg0 + 4 * 0, ptr1, true);
}, arguments); }
export function __wbg_minStorageBufferOffsetAlignment_726c386298254510() { return logError(function (arg0) {
    const ret = arg0.minStorageBufferOffsetAlignment;
    _assertNum(ret);
    return ret;
}, arguments); }
export function __wbg_minUniformBufferOffsetAlignment_6df1f95f5974788e() { return logError(function (arg0) {
    const ret = arg0.minUniformBufferOffsetAlignment;
    _assertNum(ret);
    return ret;
}, arguments); }
export function __wbg_navigator_017bc45e84c473cc() { return logError(function (arg0) {
    const ret = arg0.navigator;
    return ret;
}, arguments); }
export function __wbg_navigator_935098efd1dc7fe5() { return logError(function (arg0) {
    const ret = arg0.navigator;
    return ret;
}, arguments); }
export function __wbg_new_227d7c05414eb861() { return logError(function () {
    const ret = new Error();
    return ret;
}, arguments); }
export function __wbg_new_2e117a478906f062() { return logError(function () {
    const ret = new Object();
    return ret;
}, arguments); }
export function __wbg_new_36e147a8ced3c6e0() { return logError(function () {
    const ret = new Array();
    return ret;
}, arguments); }
export function __wbg_new_55041f0354b8ea99() { return handleError(function (arg0, arg1) {
    const ret = new OffscreenCanvas(arg0 >>> 0, arg1 >>> 0);
    return ret;
}, arguments); }
export function __wbg_new_81880fb5002cb255() { return logError(function (arg0) {
    const ret = new Uint8Array(arg0);
    return ret;
}, arguments); }
export function __wbg_new_typed_00a409eb4ec4f2d9() { return logError(function (arg0, arg1) {
    try {
        var state0 = {a: arg0, b: arg1};
        var cb0 = (arg0, arg1) => {
            const a = state0.a;
            state0.a = 0;
            try {
                return wasm_bindgen__convert__closures_____invoke__h135375d20de84ad6(a, state0.b, arg0, arg1);
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
export function __wbg_new_with_byte_offset_and_length_f2b65504a914f37a() { return logError(function (arg0, arg1, arg2) {
    const ret = new Uint8Array(arg0, arg1 >>> 0, arg2 >>> 0);
    return ret;
}, arguments); }
export function __wbg_new_with_u8_clamped_array_and_sh_adb3f647b0414eb2() { return handleError(function (arg0, arg1, arg2, arg3) {
    const ret = new ImageData(getClampedArrayU8FromWasm0(arg0, arg1), arg2 >>> 0, arg3 >>> 0);
    return ret;
}, arguments); }
export function __wbg_next_0c4066e251d2eff9() { return handleError(function (arg0) {
    const ret = arg0.next();
    return ret;
}, arguments); }
export function __wbg_next_402fa10b59ab20c3() { return logError(function (arg0) {
    const ret = arg0.next;
    return ret;
}, arguments); }
export function __wbg_of_62183ea089c00bfa() { return logError(function (arg0) {
    const ret = Array.of(arg0);
    return ret;
}, arguments); }
export function __wbg_onSubmittedWorkDone_5f36409816d68e04() { return logError(function (arg0) {
    const ret = arg0.onSubmittedWorkDone();
    return ret;
}, arguments); }
export function __wbg_pixelStorei_55ad4c67b699537c() { return logError(function (arg0, arg1, arg2) {
    arg0.pixelStorei(arg1 >>> 0, arg2);
}, arguments); }
export function __wbg_pixelStorei_a78a504be58d1d0a() { return logError(function (arg0, arg1, arg2) {
    arg0.pixelStorei(arg1 >>> 0, arg2);
}, arguments); }
export function __wbg_polygonOffset_06dc6468c12a57e1() { return logError(function (arg0, arg1, arg2) {
    arg0.polygonOffset(arg1, arg2);
}, arguments); }
export function __wbg_polygonOffset_a4f07d97b9b0dced() { return logError(function (arg0, arg1, arg2) {
    arg0.polygonOffset(arg1, arg2);
}, arguments); }
export function __wbg_popDebugGroup_48758e1c18d875e5() { return logError(function (arg0) {
    arg0.popDebugGroup();
}, arguments); }
export function __wbg_popDebugGroup_fe22c1f391f88a04() { return logError(function (arg0) {
    arg0.popDebugGroup();
}, arguments); }
export function __wbg_popErrorScope_966d33c301ea1c49() { return logError(function (arg0) {
    const ret = arg0.popErrorScope();
    return ret;
}, arguments); }
export function __wbg_prototypesetcall_d721637c7ca66eb8() { return logError(function (arg0, arg1, arg2) {
    Uint8Array.prototype.set.call(getArrayU8FromWasm0(arg0, arg1), arg2);
}, arguments); }
export function __wbg_pushDebugGroup_15d3fe543352bc6e() { return logError(function (arg0, arg1, arg2) {
    arg0.pushDebugGroup(getStringFromWasm0(arg1, arg2));
}, arguments); }
export function __wbg_pushDebugGroup_d96cdb6011450823() { return logError(function (arg0, arg1, arg2) {
    arg0.pushDebugGroup(getStringFromWasm0(arg1, arg2));
}, arguments); }
export function __wbg_pushErrorScope_163b750023f93530() { return logError(function (arg0, arg1) {
    arg0.pushErrorScope(__wbindgen_enum_GpuErrorFilter[arg1]);
}, arguments); }
export function __wbg_push_f724b5db8acf89d2() { return logError(function (arg0, arg1) {
    const ret = arg0.push(arg1);
    _assertNum(ret);
    return ret;
}, arguments); }
export function __wbg_putImageData_07049afdff5e311f() { return handleError(function (arg0, arg1, arg2, arg3) {
    arg0.putImageData(arg1, arg2, arg3);
}, arguments); }
export function __wbg_queryCounterEXT_ebb00bcc96221671() { return logError(function (arg0, arg1, arg2) {
    arg0.queryCounterEXT(arg1, arg2 >>> 0);
}, arguments); }
export function __wbg_querySelectorAll_ffda3c891a9eb29a() { return handleError(function (arg0, arg1, arg2) {
    const ret = arg0.querySelectorAll(getStringFromWasm0(arg1, arg2));
    return ret;
}, arguments); }
export function __wbg_querySelector_1f3658f4b48e268b() { return handleError(function (arg0, arg1, arg2) {
    const ret = arg0.querySelector(getStringFromWasm0(arg1, arg2));
    return isLikeNone(ret) ? 0 : addToExternrefTable0(ret);
}, arguments); }
export function __wbg_queueMicrotask_1c9b3800e321a967() { return logError(function (arg0) {
    const ret = arg0.queueMicrotask;
    return ret;
}, arguments); }
export function __wbg_queueMicrotask_311744e534a929a3() { return logError(function (arg0) {
    queueMicrotask(arg0);
}, arguments); }
export function __wbg_queue_7bbf92178b06da19() { return logError(function (arg0) {
    const ret = arg0.queue;
    return ret;
}, arguments); }
export function __wbg_readBuffer_361ec5474f3aae49() { return logError(function (arg0, arg1) {
    arg0.readBuffer(arg1 >>> 0);
}, arguments); }
export function __wbg_readPixels_05377f8b6fa1d8eb() { return handleError(function (arg0, arg1, arg2, arg3, arg4, arg5, arg6, arg7) {
    arg0.readPixels(arg1, arg2, arg3, arg4, arg5 >>> 0, arg6 >>> 0, arg7);
}, arguments); }
export function __wbg_readPixels_5840000f3e22f3ce() { return handleError(function (arg0, arg1, arg2, arg3, arg4, arg5, arg6, arg7) {
    arg0.readPixels(arg1, arg2, arg3, arg4, arg5 >>> 0, arg6 >>> 0, arg7);
}, arguments); }
export function __wbg_readPixels_5bf204799ed2272f() { return handleError(function (arg0, arg1, arg2, arg3, arg4, arg5, arg6, arg7) {
    arg0.readPixels(arg1, arg2, arg3, arg4, arg5 >>> 0, arg6 >>> 0, arg7);
}, arguments); }
export function __wbg_reason_170684b0bb329a56() { return logError(function (arg0) {
    const ret = arg0.reason;
    return (__wbindgen_enum_GpuDeviceLostReason.indexOf(ret) + 1 || 3) - 1;
}, arguments); }
export function __wbg_renderbufferStorageMultisample_d64a8abb8689a968() { return logError(function (arg0, arg1, arg2, arg3, arg4, arg5) {
    arg0.renderbufferStorageMultisample(arg1 >>> 0, arg2, arg3 >>> 0, arg4, arg5);
}, arguments); }
export function __wbg_renderbufferStorage_2918fb696fd45663() { return logError(function (arg0, arg1, arg2, arg3, arg4) {
    arg0.renderbufferStorage(arg1 >>> 0, arg2 >>> 0, arg3, arg4);
}, arguments); }
export function __wbg_renderbufferStorage_3049e13db5c4e60e() { return logError(function (arg0, arg1, arg2, arg3, arg4) {
    arg0.renderbufferStorage(arg1 >>> 0, arg2 >>> 0, arg3, arg4);
}, arguments); }
export function __wbg_requestAdapter_0049683abd339828() { return logError(function (arg0, arg1) {
    const ret = arg0.requestAdapter(arg1);
    return ret;
}, arguments); }
export function __wbg_requestAdapter_67400a4450a20436() { return logError(function (arg0) {
    const ret = arg0.requestAdapter();
    return ret;
}, arguments); }
export function __wbg_requestDevice_921f0a221b4492fa() { return logError(function (arg0, arg1) {
    const ret = arg0.requestDevice(arg1);
    return ret;
}, arguments); }
export function __wbg_resolveQuerySet_cfd1a8a1cdaaf314() { return logError(function (arg0, arg1, arg2, arg3, arg4, arg5) {
    arg0.resolveQuerySet(arg1, arg2 >>> 0, arg3 >>> 0, arg4, arg5 >>> 0);
}, arguments); }
export function __wbg_resolve_d82363d90af6928a() { return logError(function (arg0) {
    const ret = Promise.resolve(arg0);
    return ret;
}, arguments); }
export function __wbg_run_7a8a9fd51d457ba8() { return logError(function (arg0, arg1, arg2) {
    try {
        var state0 = {a: arg1, b: arg2};
        var cb0 = () => {
            const a = state0.a;
            state0.a = 0;
            try {
                return wasm_bindgen__convert__closures_____invoke__h1ebfdbcc0f9433ad(a, state0.b, );
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
export function __wbg_samplerParameterf_3157ba41c0f4d97a() { return logError(function (arg0, arg1, arg2, arg3) {
    arg0.samplerParameterf(arg1, arg2 >>> 0, arg3);
}, arguments); }
export function __wbg_samplerParameteri_f85a29156e790189() { return logError(function (arg0, arg1, arg2, arg3) {
    arg0.samplerParameteri(arg1, arg2 >>> 0, arg3);
}, arguments); }
export function __wbg_scissor_6c024669fbf4fe72() { return logError(function (arg0, arg1, arg2, arg3, arg4) {
    arg0.scissor(arg1, arg2, arg3, arg4);
}, arguments); }
export function __wbg_scissor_f9696c630e464977() { return logError(function (arg0, arg1, arg2, arg3, arg4) {
    arg0.scissor(arg1, arg2, arg3, arg4);
}, arguments); }
export function __wbg_setBindGroup_851043cf286f55f2() { return handleError(function (arg0, arg1, arg2, arg3, arg4, arg5, arg6) {
    arg0.setBindGroup(arg1 >>> 0, arg2, getArrayU32FromWasm0(arg3, arg4), arg5, arg6 >>> 0);
}, arguments); }
export function __wbg_setBindGroup_b546d112a2d27da3() { return logError(function (arg0, arg1, arg2) {
    arg0.setBindGroup(arg1 >>> 0, arg2);
}, arguments); }
export function __wbg_setBlendConstant_f91ce3104deb18b4() { return handleError(function (arg0, arg1) {
    arg0.setBlendConstant(arg1);
}, arguments); }
export function __wbg_setIndexBuffer_994771910f4a92bf() { return logError(function (arg0, arg1, arg2, arg3) {
    arg0.setIndexBuffer(arg1, __wbindgen_enum_GpuIndexFormat[arg2], arg3);
}, arguments); }
export function __wbg_setIndexBuffer_f0aa83f423c3ea49() { return logError(function (arg0, arg1, arg2, arg3, arg4) {
    arg0.setIndexBuffer(arg1, __wbindgen_enum_GpuIndexFormat[arg2], arg3, arg4);
}, arguments); }
export function __wbg_setPipeline_b0ecc74bdf8be629() { return logError(function (arg0, arg1) {
    arg0.setPipeline(arg1);
}, arguments); }
export function __wbg_setScissorRect_a1545e0e0ae58d7e() { return logError(function (arg0, arg1, arg2, arg3, arg4) {
    arg0.setScissorRect(arg1 >>> 0, arg2 >>> 0, arg3 >>> 0, arg4 >>> 0);
}, arguments); }
export function __wbg_setStencilReference_5b90bcde6c0b831e() { return logError(function (arg0, arg1) {
    arg0.setStencilReference(arg1 >>> 0);
}, arguments); }
export function __wbg_setVertexBuffer_1d85cc2da6e137a7() { return logError(function (arg0, arg1, arg2, arg3, arg4) {
    arg0.setVertexBuffer(arg1 >>> 0, arg2, arg3, arg4);
}, arguments); }
export function __wbg_setVertexBuffer_7f434cea2ca9b640() { return logError(function (arg0, arg1, arg2, arg3) {
    arg0.setVertexBuffer(arg1 >>> 0, arg2, arg3);
}, arguments); }
export function __wbg_setViewport_1963e6530328b01d() { return logError(function (arg0, arg1, arg2, arg3, arg4, arg5, arg6) {
    arg0.setViewport(arg1, arg2, arg3, arg4, arg5, arg6);
}, arguments); }
export function __wbg_set_272b80acaf9a75e8() { return logError(function (arg0, arg1, arg2) {
    arg0.set(arg1, arg2 >>> 0);
}, arguments); }
export function __wbg_set_4564f7dc44fcb0c9() { return handleError(function (arg0, arg1, arg2) {
    const ret = Reflect.set(arg0, arg1, arg2);
    _assertBoolean(ret);
    return ret;
}, arguments); }
export function __wbg_set_a_66601ffa2f4cbde8() { return logError(function (arg0, arg1) {
    arg0.a = arg1;
}, arguments); }
export function __wbg_set_access_08d6bdbda9aaa266() { return logError(function (arg0, arg1) {
    arg0.access = __wbindgen_enum_GpuStorageTextureAccess[arg1];
}, arguments); }
export function __wbg_set_address_mode_u_f80c73fc36e83289() { return logError(function (arg0, arg1) {
    arg0.addressModeU = __wbindgen_enum_GpuAddressMode[arg1];
}, arguments); }
export function __wbg_set_address_mode_v_3dee7a0095c326a6() { return logError(function (arg0, arg1) {
    arg0.addressModeV = __wbindgen_enum_GpuAddressMode[arg1];
}, arguments); }
export function __wbg_set_address_mode_w_e2be52f6efa2d9c7() { return logError(function (arg0, arg1) {
    arg0.addressModeW = __wbindgen_enum_GpuAddressMode[arg1];
}, arguments); }
export function __wbg_set_alpha_bb6680aaf01cdc62() { return logError(function (arg0, arg1) {
    arg0.alpha = arg1;
}, arguments); }
export function __wbg_set_alpha_mode_84140629c3b15c51() { return logError(function (arg0, arg1) {
    arg0.alphaMode = __wbindgen_enum_GpuCanvasAlphaMode[arg1];
}, arguments); }
export function __wbg_set_alpha_to_coverage_enabled_cac9212446be9cab() { return logError(function (arg0, arg1) {
    arg0.alphaToCoverageEnabled = arg1 !== 0;
}, arguments); }
export function __wbg_set_array_layer_count_01e36293bee85e02() { return logError(function (arg0, arg1) {
    arg0.arrayLayerCount = arg1 >>> 0;
}, arguments); }
export function __wbg_set_array_stride_34f4a147a16bff79() { return logError(function (arg0, arg1) {
    arg0.arrayStride = arg1;
}, arguments); }
export function __wbg_set_aspect_0675b2844dd12eb1() { return logError(function (arg0, arg1) {
    arg0.aspect = __wbindgen_enum_GpuTextureAspect[arg1];
}, arguments); }
export function __wbg_set_aspect_7829cca737701915() { return logError(function (arg0, arg1) {
    arg0.aspect = __wbindgen_enum_GpuTextureAspect[arg1];
}, arguments); }
export function __wbg_set_aspect_e09cb246c2df6f46() { return logError(function (arg0, arg1) {
    arg0.aspect = __wbindgen_enum_GpuTextureAspect[arg1];
}, arguments); }
export function __wbg_set_attributes_7ee8e82215809bfa() { return logError(function (arg0, arg1) {
    arg0.attributes = arg1;
}, arguments); }
export function __wbg_set_b_103abfb3e69345a3() { return logError(function (arg0, arg1) {
    arg0.b = arg1;
}, arguments); }
export function __wbg_set_base_array_layer_ff3450be9aa7d232() { return logError(function (arg0, arg1) {
    arg0.baseArrayLayer = arg1 >>> 0;
}, arguments); }
export function __wbg_set_base_mip_level_43e77e5d237ede24() { return logError(function (arg0, arg1) {
    arg0.baseMipLevel = arg1 >>> 0;
}, arguments); }
export function __wbg_set_beginning_of_pass_write_index_abea1e4e6c6095e1() { return logError(function (arg0, arg1) {
    arg0.beginningOfPassWriteIndex = arg1 >>> 0;
}, arguments); }
export function __wbg_set_beginning_of_pass_write_index_ebe753eeeade6f6c() { return logError(function (arg0, arg1) {
    arg0.beginningOfPassWriteIndex = arg1 >>> 0;
}, arguments); }
export function __wbg_set_bind_group_layouts_078241cf2822c39e() { return logError(function (arg0, arg1) {
    arg0.bindGroupLayouts = arg1;
}, arguments); }
export function __wbg_set_binding_d683cd9c1d4bcfed() { return logError(function (arg0, arg1) {
    arg0.binding = arg1 >>> 0;
}, arguments); }
export function __wbg_set_binding_e9ba14423117de0a() { return logError(function (arg0, arg1) {
    arg0.binding = arg1 >>> 0;
}, arguments); }
export function __wbg_set_blend_9eab91d6edf500f9() { return logError(function (arg0, arg1) {
    arg0.blend = arg1;
}, arguments); }
export function __wbg_set_buffer_598ab98a251b8f91() { return logError(function (arg0, arg1) {
    arg0.buffer = arg1;
}, arguments); }
export function __wbg_set_buffer_73d9f6fea9c41867() { return logError(function (arg0, arg1) {
    arg0.buffer = arg1;
}, arguments); }
export function __wbg_set_buffer_88dfc353992be57b() { return logError(function (arg0, arg1) {
    arg0.buffer = arg1;
}, arguments); }
export function __wbg_set_buffers_93f3f75d7338864f() { return logError(function (arg0, arg1) {
    arg0.buffers = arg1;
}, arguments); }
export function __wbg_set_bytes_per_row_0bdd54b7fc03c765() { return logError(function (arg0, arg1) {
    arg0.bytesPerRow = arg1 >>> 0;
}, arguments); }
export function __wbg_set_bytes_per_row_4d62ead4cbf1cd75() { return logError(function (arg0, arg1) {
    arg0.bytesPerRow = arg1 >>> 0;
}, arguments); }
export function __wbg_set_clear_value_c1a82bbe9a80b6ab() { return logError(function (arg0, arg1) {
    arg0.clearValue = arg1;
}, arguments); }
export function __wbg_set_code_6a0d763da082dcfb() { return logError(function (arg0, arg1, arg2) {
    arg0.code = getStringFromWasm0(arg1, arg2);
}, arguments); }
export function __wbg_set_color_495aa415ae5a39c9() { return logError(function (arg0, arg1) {
    arg0.color = arg1;
}, arguments); }
export function __wbg_set_color_attachments_6705c6b1e98a3040() { return logError(function (arg0, arg1) {
    arg0.colorAttachments = arg1;
}, arguments); }
export function __wbg_set_color_formats_72fbd83091e697db() { return logError(function (arg0, arg1) {
    arg0.colorFormats = arg1;
}, arguments); }
export function __wbg_set_compare_8aedfdbdc96ff4d7() { return logError(function (arg0, arg1) {
    arg0.compare = __wbindgen_enum_GpuCompareFunction[arg1];
}, arguments); }
export function __wbg_set_compare_a9a06469832600ec() { return logError(function (arg0, arg1) {
    arg0.compare = __wbindgen_enum_GpuCompareFunction[arg1];
}, arguments); }
export function __wbg_set_compute_5dd7704ee8a825c6() { return logError(function (arg0, arg1) {
    arg0.compute = arg1;
}, arguments); }
export function __wbg_set_count_34ecf81b3ad7e448() { return logError(function (arg0, arg1) {
    arg0.count = arg1 >>> 0;
}, arguments); }
export function __wbg_set_count_3dcf998ad3abd5e3() { return logError(function (arg0, arg1) {
    arg0.count = arg1 >>> 0;
}, arguments); }
export function __wbg_set_cull_mode_8e533f32672a379b() { return logError(function (arg0, arg1) {
    arg0.cullMode = __wbindgen_enum_GpuCullMode[arg1];
}, arguments); }
export function __wbg_set_depth_bias_07f95aa380a3e46e() { return logError(function (arg0, arg1) {
    arg0.depthBias = arg1;
}, arguments); }
export function __wbg_set_depth_bias_clamp_968b03f74984c77b() { return logError(function (arg0, arg1) {
    arg0.depthBiasClamp = arg1;
}, arguments); }
export function __wbg_set_depth_bias_slope_scale_478b204b4910400f() { return logError(function (arg0, arg1) {
    arg0.depthBiasSlopeScale = arg1;
}, arguments); }
export function __wbg_set_depth_clear_value_25268aa6b7cae2e0() { return logError(function (arg0, arg1) {
    arg0.depthClearValue = arg1;
}, arguments); }
export function __wbg_set_depth_compare_c017fcac5327dfbb() { return logError(function (arg0, arg1) {
    arg0.depthCompare = __wbindgen_enum_GpuCompareFunction[arg1];
}, arguments); }
export function __wbg_set_depth_fail_op_8484012cd5e4987c() { return logError(function (arg0, arg1) {
    arg0.depthFailOp = __wbindgen_enum_GpuStencilOperation[arg1];
}, arguments); }
export function __wbg_set_depth_load_op_ed90e4eaf314a16c() { return logError(function (arg0, arg1) {
    arg0.depthLoadOp = __wbindgen_enum_GpuLoadOp[arg1];
}, arguments); }
export function __wbg_set_depth_or_array_layers_f8981011496f12e7() { return logError(function (arg0, arg1) {
    arg0.depthOrArrayLayers = arg1 >>> 0;
}, arguments); }
export function __wbg_set_depth_read_only_90cca09674f446be() { return logError(function (arg0, arg1) {
    arg0.depthReadOnly = arg1 !== 0;
}, arguments); }
export function __wbg_set_depth_read_only_f05ffa956d3a2d9d() { return logError(function (arg0, arg1) {
    arg0.depthReadOnly = arg1 !== 0;
}, arguments); }
export function __wbg_set_depth_stencil_attachment_be8301fa499cd3db() { return logError(function (arg0, arg1) {
    arg0.depthStencilAttachment = arg1;
}, arguments); }
export function __wbg_set_depth_stencil_d536398c1b29bb38() { return logError(function (arg0, arg1) {
    arg0.depthStencil = arg1;
}, arguments); }
export function __wbg_set_depth_stencil_format_221f2f71ba894a55() { return logError(function (arg0, arg1) {
    arg0.depthStencilFormat = __wbindgen_enum_GpuTextureFormat[arg1];
}, arguments); }
export function __wbg_set_depth_store_op_8e9b1d0e47077643() { return logError(function (arg0, arg1) {
    arg0.depthStoreOp = __wbindgen_enum_GpuStoreOp[arg1];
}, arguments); }
export function __wbg_set_depth_write_enabled_adc2094871d66639() { return logError(function (arg0, arg1) {
    arg0.depthWriteEnabled = arg1 !== 0;
}, arguments); }
export function __wbg_set_device_47147a331245777f() { return logError(function (arg0, arg1) {
    arg0.device = arg1;
}, arguments); }
export function __wbg_set_dimension_b4da3979dc699ef8() { return logError(function (arg0, arg1) {
    arg0.dimension = __wbindgen_enum_GpuTextureViewDimension[arg1];
}, arguments); }
export function __wbg_set_dimension_d4f0c50e75083b7f() { return logError(function (arg0, arg1) {
    arg0.dimension = __wbindgen_enum_GpuTextureDimension[arg1];
}, arguments); }
export function __wbg_set_dst_factor_e44fc612d5e5bff4() { return logError(function (arg0, arg1) {
    arg0.dstFactor = __wbindgen_enum_GpuBlendFactor[arg1];
}, arguments); }
export function __wbg_set_end_of_pass_write_index_1cd39b9bafe090cc() { return logError(function (arg0, arg1) {
    arg0.endOfPassWriteIndex = arg1 >>> 0;
}, arguments); }
export function __wbg_set_end_of_pass_write_index_49de5f6017fb9a1f() { return logError(function (arg0, arg1) {
    arg0.endOfPassWriteIndex = arg1 >>> 0;
}, arguments); }
export function __wbg_set_entries_070b048e4bea0c29() { return logError(function (arg0, arg1) {
    arg0.entries = arg1;
}, arguments); }
export function __wbg_set_entries_f9b7f3d4e9faccf4() { return logError(function (arg0, arg1) {
    arg0.entries = arg1;
}, arguments); }
export function __wbg_set_entry_point_0116a9f5d58cf0aa() { return logError(function (arg0, arg1, arg2) {
    arg0.entryPoint = getStringFromWasm0(arg1, arg2);
}, arguments); }
export function __wbg_set_entry_point_52a2481a52f9799d() { return logError(function (arg0, arg1, arg2) {
    arg0.entryPoint = getStringFromWasm0(arg1, arg2);
}, arguments); }
export function __wbg_set_entry_point_f04e91eced449196() { return logError(function (arg0, arg1, arg2) {
    arg0.entryPoint = getStringFromWasm0(arg1, arg2);
}, arguments); }
export function __wbg_set_external_texture_cf122b1392d58f37() { return logError(function (arg0, arg1) {
    arg0.externalTexture = arg1;
}, arguments); }
export function __wbg_set_fail_op_e7eb17ed0228b457() { return logError(function (arg0, arg1) {
    arg0.failOp = __wbindgen_enum_GpuStencilOperation[arg1];
}, arguments); }
export function __wbg_set_flip_y_c75446cb371a71ee() { return logError(function (arg0, arg1) {
    arg0.flipY = arg1 !== 0;
}, arguments); }
export function __wbg_set_format_119bda0a3d0b3f47() { return logError(function (arg0, arg1) {
    arg0.format = __wbindgen_enum_GpuTextureFormat[arg1];
}, arguments); }
export function __wbg_set_format_27c63de9b0ec1cb3() { return logError(function (arg0, arg1) {
    arg0.format = __wbindgen_enum_GpuTextureFormat[arg1];
}, arguments); }
export function __wbg_set_format_75eb905a003c2f61() { return logError(function (arg0, arg1) {
    arg0.format = __wbindgen_enum_GpuTextureFormat[arg1];
}, arguments); }
export function __wbg_set_format_8b8359f261ea64b9() { return logError(function (arg0, arg1) {
    arg0.format = __wbindgen_enum_GpuVertexFormat[arg1];
}, arguments); }
export function __wbg_set_format_a5d373801c562623() { return logError(function (arg0, arg1) {
    arg0.format = __wbindgen_enum_GpuTextureFormat[arg1];
}, arguments); }
export function __wbg_set_format_b08d87d5f33bcd89() { return logError(function (arg0, arg1) {
    arg0.format = __wbindgen_enum_GpuTextureFormat[arg1];
}, arguments); }
export function __wbg_set_format_c1a342a37ced3e12() { return logError(function (arg0, arg1) {
    arg0.format = __wbindgen_enum_GpuTextureFormat[arg1];
}, arguments); }
export function __wbg_set_fragment_41044c9110c69c90() { return logError(function (arg0, arg1) {
    arg0.fragment = arg1;
}, arguments); }
export function __wbg_set_front_face_9c9f0518a3109d98() { return logError(function (arg0, arg1) {
    arg0.frontFace = __wbindgen_enum_GpuFrontFace[arg1];
}, arguments); }
export function __wbg_set_g_a39877021b450e75() { return logError(function (arg0, arg1) {
    arg0.g = arg1;
}, arguments); }
export function __wbg_set_has_dynamic_offset_69725fed837748fe() { return logError(function (arg0, arg1) {
    arg0.hasDynamicOffset = arg1 !== 0;
}, arguments); }
export function __wbg_set_height_975770494a218d52() { return logError(function (arg0, arg1) {
    arg0.height = arg1 >>> 0;
}, arguments); }
export function __wbg_set_height_ad5056ea051acd78() { return logError(function (arg0, arg1) {
    arg0.height = arg1 >>> 0;
}, arguments); }
export function __wbg_set_height_ef298446b359b0c5() { return logError(function (arg0, arg1) {
    arg0.height = arg1 >>> 0;
}, arguments); }
export function __wbg_set_label_26577513096f145b() { return logError(function (arg0, arg1, arg2) {
    arg0.label = getStringFromWasm0(arg1, arg2);
}, arguments); }
export function __wbg_set_label_2816ddca7866dcfa() { return logError(function (arg0, arg1, arg2) {
    arg0.label = getStringFromWasm0(arg1, arg2);
}, arguments); }
export function __wbg_set_label_2a41a6f671383447() { return logError(function (arg0, arg1, arg2) {
    arg0.label = getStringFromWasm0(arg1, arg2);
}, arguments); }
export function __wbg_set_label_325c5e4b70c1568f() { return logError(function (arg0, arg1, arg2) {
    arg0.label = getStringFromWasm0(arg1, arg2);
}, arguments); }
export function __wbg_set_label_37d0faa0c9b7dee4() { return logError(function (arg0, arg1, arg2) {
    arg0.label = getStringFromWasm0(arg1, arg2);
}, arguments); }
export function __wbg_set_label_3e306b2e8f9db666() { return logError(function (arg0, arg1, arg2) {
    arg0.label = getStringFromWasm0(arg1, arg2);
}, arguments); }
export function __wbg_set_label_5514e44725004e89() { return logError(function (arg0, arg1, arg2) {
    arg0.label = getStringFromWasm0(arg1, arg2);
}, arguments); }
export function __wbg_set_label_570d3dee0e80279e() { return logError(function (arg0, arg1, arg2) {
    arg0.label = getStringFromWasm0(arg1, arg2);
}, arguments); }
export function __wbg_set_label_58fbc9fcc6363f16() { return logError(function (arg0, arg1, arg2) {
    arg0.label = getStringFromWasm0(arg1, arg2);
}, arguments); }
export function __wbg_set_label_5a4dbb42c3b27bf7() { return logError(function (arg0, arg1, arg2) {
    arg0.label = getStringFromWasm0(arg1, arg2);
}, arguments); }
export function __wbg_set_label_5c952448f9d59f36() { return logError(function (arg0, arg1, arg2) {
    arg0.label = getStringFromWasm0(arg1, arg2);
}, arguments); }
export function __wbg_set_label_5fadf65a1f0f4714() { return logError(function (arg0, arg1, arg2) {
    arg0.label = getStringFromWasm0(arg1, arg2);
}, arguments); }
export function __wbg_set_label_782e33de78d86641() { return logError(function (arg0, arg1, arg2) {
    arg0.label = getStringFromWasm0(arg1, arg2);
}, arguments); }
export function __wbg_set_label_837a3b8ff99c2db3() { return logError(function (arg0, arg1, arg2) {
    arg0.label = getStringFromWasm0(arg1, arg2);
}, arguments); }
export function __wbg_set_label_8df6673e1e141fcc() { return logError(function (arg0, arg1, arg2) {
    arg0.label = getStringFromWasm0(arg1, arg2);
}, arguments); }
export function __wbg_set_label_c1d0f6c602be1752() { return logError(function (arg0, arg1, arg2) {
    arg0.label = getStringFromWasm0(arg1, arg2);
}, arguments); }
export function __wbg_set_label_fbf7d5a6a08cd2d4() { return logError(function (arg0, arg1, arg2) {
    arg0.label = getStringFromWasm0(arg1, arg2);
}, arguments); }
export function __wbg_set_layout_a6ee8e74696bc0c8() { return logError(function (arg0, arg1) {
    arg0.layout = arg1;
}, arguments); }
export function __wbg_set_layout_cd5d951ba305620a() { return logError(function (arg0, arg1) {
    arg0.layout = arg1;
}, arguments); }
export function __wbg_set_layout_d701bf37a1e489c6() { return logError(function (arg0, arg1) {
    arg0.layout = arg1;
}, arguments); }
export function __wbg_set_load_op_e8ff3e1c81f7398d() { return logError(function (arg0, arg1) {
    arg0.loadOp = __wbindgen_enum_GpuLoadOp[arg1];
}, arguments); }
export function __wbg_set_lod_max_clamp_a9f93b2e2ae9023d() { return logError(function (arg0, arg1) {
    arg0.lodMaxClamp = arg1;
}, arguments); }
export function __wbg_set_lod_min_clamp_342b47161f1fa002() { return logError(function (arg0, arg1) {
    arg0.lodMinClamp = arg1;
}, arguments); }
export function __wbg_set_mag_filter_28e863ff1a386f86() { return logError(function (arg0, arg1) {
    arg0.magFilter = __wbindgen_enum_GpuFilterMode[arg1];
}, arguments); }
export function __wbg_set_mapped_at_creation_7f0aad21612f3e22() { return logError(function (arg0, arg1) {
    arg0.mappedAtCreation = arg1 !== 0;
}, arguments); }
export function __wbg_set_mask_a18cbdfc03a4cbd9() { return logError(function (arg0, arg1) {
    arg0.mask = arg1 >>> 0;
}, arguments); }
export function __wbg_set_max_anisotropy_19e574a7e9cb009a() { return logError(function (arg0, arg1) {
    arg0.maxAnisotropy = arg1;
}, arguments); }
export function __wbg_set_min_binding_size_d70e460d165d9144() { return logError(function (arg0, arg1) {
    arg0.minBindingSize = arg1;
}, arguments); }
export function __wbg_set_min_filter_5275c8a3815f9f0c() { return logError(function (arg0, arg1) {
    arg0.minFilter = __wbindgen_enum_GpuFilterMode[arg1];
}, arguments); }
export function __wbg_set_mip_level_09f903ba22486513() { return logError(function (arg0, arg1) {
    arg0.mipLevel = arg1 >>> 0;
}, arguments); }
export function __wbg_set_mip_level_8d4dfc5d506cb37f() { return logError(function (arg0, arg1) {
    arg0.mipLevel = arg1 >>> 0;
}, arguments); }
export function __wbg_set_mip_level_count_04af0d33c4905fac() { return logError(function (arg0, arg1) {
    arg0.mipLevelCount = arg1 >>> 0;
}, arguments); }
export function __wbg_set_mip_level_count_dcb2ad32716506a5() { return logError(function (arg0, arg1) {
    arg0.mipLevelCount = arg1 >>> 0;
}, arguments); }
export function __wbg_set_mipmap_filter_ae5e0e814693019b() { return logError(function (arg0, arg1) {
    arg0.mipmapFilter = __wbindgen_enum_GpuMipmapFilterMode[arg1];
}, arguments); }
export function __wbg_set_module_0933874708065f3b() { return logError(function (arg0, arg1) {
    arg0.module = arg1;
}, arguments); }
export function __wbg_set_module_22d452288cef846d() { return logError(function (arg0, arg1) {
    arg0.module = arg1;
}, arguments); }
export function __wbg_set_module_a7a131494850e5f7() { return logError(function (arg0, arg1) {
    arg0.module = arg1;
}, arguments); }
export function __wbg_set_multisample_e857cbfca335c7f1() { return logError(function (arg0, arg1) {
    arg0.multisample = arg1;
}, arguments); }
export function __wbg_set_multisampled_4ce4c32144215354() { return logError(function (arg0, arg1) {
    arg0.multisampled = arg1 !== 0;
}, arguments); }
export function __wbg_set_offset_0e56098d94f81ccd() { return logError(function (arg0, arg1) {
    arg0.offset = arg1;
}, arguments); }
export function __wbg_set_offset_baf6780761c43b24() { return logError(function (arg0, arg1) {
    arg0.offset = arg1;
}, arguments); }
export function __wbg_set_offset_e316586bb85f0bd6() { return logError(function (arg0, arg1) {
    arg0.offset = arg1;
}, arguments); }
export function __wbg_set_offset_eabaf12fe1c98ce7() { return logError(function (arg0, arg1) {
    arg0.offset = arg1;
}, arguments); }
export function __wbg_set_onuncapturederror_6632a118e96fdf4e() { return logError(function (arg0, arg1) {
    arg0.onuncapturederror = arg1;
}, arguments); }
export function __wbg_set_operation_a91e5763a8313c6b() { return logError(function (arg0, arg1) {
    arg0.operation = __wbindgen_enum_GpuBlendOperation[arg1];
}, arguments); }
export function __wbg_set_origin_24a61b4427e330e9() { return logError(function (arg0, arg1) {
    arg0.origin = arg1;
}, arguments); }
export function __wbg_set_origin_9726209f22511ffa() { return logError(function (arg0, arg1) {
    arg0.origin = arg1;
}, arguments); }
export function __wbg_set_origin_f7cd05478d9232f0() { return logError(function (arg0, arg1) {
    arg0.origin = arg1;
}, arguments); }
export function __wbg_set_pass_op_eef0c5885ae707c3() { return logError(function (arg0, arg1) {
    arg0.passOp = __wbindgen_enum_GpuStencilOperation[arg1];
}, arguments); }
export function __wbg_set_power_preference_7d669fb9b41f7bf2() { return logError(function (arg0, arg1) {
    arg0.powerPreference = __wbindgen_enum_GpuPowerPreference[arg1];
}, arguments); }
export function __wbg_set_premultiplied_alpha_e49848a873888b3d() { return logError(function (arg0, arg1) {
    arg0.premultipliedAlpha = arg1 !== 0;
}, arguments); }
export function __wbg_set_primitive_3462e090c7a78969() { return logError(function (arg0, arg1) {
    arg0.primitive = arg1;
}, arguments); }
export function __wbg_set_query_set_604a8ae10429942b() { return logError(function (arg0, arg1) {
    arg0.querySet = arg1;
}, arguments); }
export function __wbg_set_query_set_62d86bdf10d64d37() { return logError(function (arg0, arg1) {
    arg0.querySet = arg1;
}, arguments); }
export function __wbg_set_r_40fe44b2d9a401f4() { return logError(function (arg0, arg1) {
    arg0.r = arg1;
}, arguments); }
export function __wbg_set_required_features_3d00070d09235d7d() { return logError(function (arg0, arg1) {
    arg0.requiredFeatures = arg1;
}, arguments); }
export function __wbg_set_required_limits_e0de55a49a48e3dc() { return logError(function (arg0, arg1) {
    arg0.requiredLimits = arg1;
}, arguments); }
export function __wbg_set_resolve_target_6e7eda03a6886624() { return logError(function (arg0, arg1) {
    arg0.resolveTarget = arg1;
}, arguments); }
export function __wbg_set_resource_fe1f979fce4afee2() { return logError(function (arg0, arg1) {
    arg0.resource = arg1;
}, arguments); }
export function __wbg_set_rows_per_image_1f4a56a3c5d57e93() { return logError(function (arg0, arg1) {
    arg0.rowsPerImage = arg1 >>> 0;
}, arguments); }
export function __wbg_set_rows_per_image_c616c70e60a35618() { return logError(function (arg0, arg1) {
    arg0.rowsPerImage = arg1 >>> 0;
}, arguments); }
export function __wbg_set_sample_count_08f0a784878aff15() { return logError(function (arg0, arg1) {
    arg0.sampleCount = arg1 >>> 0;
}, arguments); }
export function __wbg_set_sample_count_2b8ac49e1626ac13() { return logError(function (arg0, arg1) {
    arg0.sampleCount = arg1 >>> 0;
}, arguments); }
export function __wbg_set_sample_type_3cecbd4699e2e5fb() { return logError(function (arg0, arg1) {
    arg0.sampleType = __wbindgen_enum_GpuTextureSampleType[arg1];
}, arguments); }
export function __wbg_set_sampler_12544c21977075c1() { return logError(function (arg0, arg1) {
    arg0.sampler = arg1;
}, arguments); }
export function __wbg_set_shader_location_03356bf6a6da4332() { return logError(function (arg0, arg1) {
    arg0.shaderLocation = arg1 >>> 0;
}, arguments); }
export function __wbg_set_size_0c20f73abce8f1ce() { return logError(function (arg0, arg1) {
    arg0.size = arg1;
}, arguments); }
export function __wbg_set_size_cf04b4174c30722b() { return logError(function (arg0, arg1) {
    arg0.size = arg1;
}, arguments); }
export function __wbg_set_size_f1207de283144c72() { return logError(function (arg0, arg1) {
    arg0.size = arg1;
}, arguments); }
export function __wbg_set_source_7eb2b03d1177a7c8() { return logError(function (arg0, arg1) {
    arg0.source = arg1;
}, arguments); }
export function __wbg_set_src_factor_c3668d4122497276() { return logError(function (arg0, arg1) {
    arg0.srcFactor = __wbindgen_enum_GpuBlendFactor[arg1];
}, arguments); }
export function __wbg_set_stencil_back_8d01a6c0477059b0() { return logError(function (arg0, arg1) {
    arg0.stencilBack = arg1;
}, arguments); }
export function __wbg_set_stencil_clear_value_1f380af0bd0d9255() { return logError(function (arg0, arg1) {
    arg0.stencilClearValue = arg1 >>> 0;
}, arguments); }
export function __wbg_set_stencil_front_f881c15b2d170653() { return logError(function (arg0, arg1) {
    arg0.stencilFront = arg1;
}, arguments); }
export function __wbg_set_stencil_load_op_5cde31e71a964b58() { return logError(function (arg0, arg1) {
    arg0.stencilLoadOp = __wbindgen_enum_GpuLoadOp[arg1];
}, arguments); }
export function __wbg_set_stencil_read_mask_d79993adcfc418ab() { return logError(function (arg0, arg1) {
    arg0.stencilReadMask = arg1 >>> 0;
}, arguments); }
export function __wbg_set_stencil_read_only_4193231fec974b3a() { return logError(function (arg0, arg1) {
    arg0.stencilReadOnly = arg1 !== 0;
}, arguments); }
export function __wbg_set_stencil_read_only_ac984029b821315e() { return logError(function (arg0, arg1) {
    arg0.stencilReadOnly = arg1 !== 0;
}, arguments); }
export function __wbg_set_stencil_store_op_262e1df7b92404d3() { return logError(function (arg0, arg1) {
    arg0.stencilStoreOp = __wbindgen_enum_GpuStoreOp[arg1];
}, arguments); }
export function __wbg_set_stencil_write_mask_94ec6249877e083e() { return logError(function (arg0, arg1) {
    arg0.stencilWriteMask = arg1 >>> 0;
}, arguments); }
export function __wbg_set_step_mode_241a8d5515fa964b() { return logError(function (arg0, arg1) {
    arg0.stepMode = __wbindgen_enum_GpuVertexStepMode[arg1];
}, arguments); }
export function __wbg_set_storage_texture_36be4834c501acab() { return logError(function (arg0, arg1) {
    arg0.storageTexture = arg1;
}, arguments); }
export function __wbg_set_store_op_a95e8da4555c6010() { return logError(function (arg0, arg1) {
    arg0.storeOp = __wbindgen_enum_GpuStoreOp[arg1];
}, arguments); }
export function __wbg_set_strip_index_format_62c417aa65a4d277() { return logError(function (arg0, arg1) {
    arg0.stripIndexFormat = __wbindgen_enum_GpuIndexFormat[arg1];
}, arguments); }
export function __wbg_set_targets_6664b7e6ec5da9d3() { return logError(function (arg0, arg1) {
    arg0.targets = arg1;
}, arguments); }
export function __wbg_set_texture_292332b872bf75e8() { return logError(function (arg0, arg1) {
    arg0.texture = arg1;
}, arguments); }
export function __wbg_set_texture_64823aa8aca790b5() { return logError(function (arg0, arg1) {
    arg0.texture = arg1;
}, arguments); }
export function __wbg_set_texture_738e6f6215515de3() { return logError(function (arg0, arg1) {
    arg0.texture = arg1;
}, arguments); }
export function __wbg_set_timestamp_writes_3854a564715b0ac7() { return logError(function (arg0, arg1) {
    arg0.timestampWrites = arg1;
}, arguments); }
export function __wbg_set_timestamp_writes_6854d9d17bf5b0b4() { return logError(function (arg0, arg1) {
    arg0.timestampWrites = arg1;
}, arguments); }
export function __wbg_set_topology_914716698f5868bb() { return logError(function (arg0, arg1) {
    arg0.topology = __wbindgen_enum_GpuPrimitiveTopology[arg1];
}, arguments); }
export function __wbg_set_type_17a1387b620bc902() { return logError(function (arg0, arg1) {
    arg0.type = __wbindgen_enum_GpuBufferBindingType[arg1];
}, arguments); }
export function __wbg_set_type_5e3963a1d04b143d() { return logError(function (arg0, arg1) {
    arg0.type = __wbindgen_enum_GpuQueryType[arg1];
}, arguments); }
export function __wbg_set_type_d4edb621ec2051e0() { return logError(function (arg0, arg1) {
    arg0.type = __wbindgen_enum_GpuSamplerBindingType[arg1];
}, arguments); }
export function __wbg_set_unclipped_depth_e23e3091db2ac351() { return logError(function (arg0, arg1) {
    arg0.unclippedDepth = arg1 !== 0;
}, arguments); }
export function __wbg_set_usage_41b7d18f3f220e6c() { return logError(function (arg0, arg1) {
    arg0.usage = arg1 >>> 0;
}, arguments); }
export function __wbg_set_usage_6ae4d85589906117() { return logError(function (arg0, arg1) {
    arg0.usage = arg1 >>> 0;
}, arguments); }
export function __wbg_set_usage_e167dd772123f679() { return logError(function (arg0, arg1) {
    arg0.usage = arg1 >>> 0;
}, arguments); }
export function __wbg_set_usage_f084cd416060ceee() { return logError(function (arg0, arg1) {
    arg0.usage = arg1 >>> 0;
}, arguments); }
export function __wbg_set_vertex_29812f650590fa45() { return logError(function (arg0, arg1) {
    arg0.vertex = arg1;
}, arguments); }
export function __wbg_set_view_32a8132aec6de194() { return logError(function (arg0, arg1) {
    arg0.view = arg1;
}, arguments); }
export function __wbg_set_view_506e5beadab34e99() { return logError(function (arg0, arg1) {
    arg0.view = arg1;
}, arguments); }
export function __wbg_set_view_dimension_4a840560a13b4860() { return logError(function (arg0, arg1) {
    arg0.viewDimension = __wbindgen_enum_GpuTextureViewDimension[arg1];
}, arguments); }
export function __wbg_set_view_dimension_9ae69db849267b1a() { return logError(function (arg0, arg1) {
    arg0.viewDimension = __wbindgen_enum_GpuTextureViewDimension[arg1];
}, arguments); }
export function __wbg_set_view_formats_4d0b943f593dd219() { return logError(function (arg0, arg1) {
    arg0.viewFormats = arg1;
}, arguments); }
export function __wbg_set_view_formats_cba8520bf0d83d62() { return logError(function (arg0, arg1) {
    arg0.viewFormats = arg1;
}, arguments); }
export function __wbg_set_visibility_bbbf3d2b70571950() { return logError(function (arg0, arg1) {
    arg0.visibility = arg1 >>> 0;
}, arguments); }
export function __wbg_set_width_031bdecd763c5855() { return logError(function (arg0, arg1) {
    arg0.width = arg1 >>> 0;
}, arguments); }
export function __wbg_set_width_0f26635b289b3c67() { return logError(function (arg0, arg1) {
    arg0.width = arg1 >>> 0;
}, arguments); }
export function __wbg_set_width_f9e631f4ee129e5c() { return logError(function (arg0, arg1) {
    arg0.width = arg1 >>> 0;
}, arguments); }
export function __wbg_set_write_mask_949f521dcf3da2b5() { return logError(function (arg0, arg1) {
    arg0.writeMask = arg1 >>> 0;
}, arguments); }
export function __wbg_set_x_15a4c893b3366fab() { return logError(function (arg0, arg1) {
    arg0.x = arg1 >>> 0;
}, arguments); }
export function __wbg_set_x_7aa02c5d013f6852() { return logError(function (arg0, arg1) {
    arg0.x = arg1 >>> 0;
}, arguments); }
export function __wbg_set_y_80ad367d70451024() { return logError(function (arg0, arg1) {
    arg0.y = arg1 >>> 0;
}, arguments); }
export function __wbg_set_y_c631920a1c51a694() { return logError(function (arg0, arg1) {
    arg0.y = arg1 >>> 0;
}, arguments); }
export function __wbg_set_z_7c526101c55ea2ae() { return logError(function (arg0, arg1) {
    arg0.z = arg1 >>> 0;
}, arguments); }
export function __wbg_shaderSource_628c37a476ae65f9() { return logError(function (arg0, arg1, arg2, arg3) {
    arg0.shaderSource(arg1, getStringFromWasm0(arg2, arg3));
}, arguments); }
export function __wbg_shaderSource_66dce75b25a1a407() { return logError(function (arg0, arg1, arg2, arg3) {
    arg0.shaderSource(arg1, getStringFromWasm0(arg2, arg3));
}, arguments); }
export function __wbg_size_0549be120b7831da() { return logError(function (arg0) {
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
export function __wbg_static_accessor_CREATE_TASK_d23f6bf82576bece() { return logError(function () {
    const ret = typeof console === 'undefined' ? null : console?.createTask;
    return isLikeNone(ret) ? 0 : addToExternrefTable0(ret);
}, arguments); }
export function __wbg_static_accessor_GLOBAL_THIS_2fee5048bcca5938() { return logError(function () {
    const ret = typeof globalThis === 'undefined' ? null : globalThis;
    return isLikeNone(ret) ? 0 : addToExternrefTable0(ret);
}, arguments); }
export function __wbg_static_accessor_GLOBAL_ce44e66a4935da8c() { return logError(function () {
    const ret = typeof global === 'undefined' ? null : global;
    return isLikeNone(ret) ? 0 : addToExternrefTable0(ret);
}, arguments); }
export function __wbg_static_accessor_SELF_44f6e0cb5e67cdad() { return logError(function () {
    const ret = typeof self === 'undefined' ? null : self;
    return isLikeNone(ret) ? 0 : addToExternrefTable0(ret);
}, arguments); }
export function __wbg_static_accessor_WINDOW_168f178805d978fe() { return logError(function () {
    const ret = typeof window === 'undefined' ? null : window;
    return isLikeNone(ret) ? 0 : addToExternrefTable0(ret);
}, arguments); }
export function __wbg_stencilFuncSeparate_a17b2b1cc34fa948() { return logError(function (arg0, arg1, arg2, arg3, arg4) {
    arg0.stencilFuncSeparate(arg1 >>> 0, arg2 >>> 0, arg3, arg4 >>> 0);
}, arguments); }
export function __wbg_stencilFuncSeparate_ec603976be9569a4() { return logError(function (arg0, arg1, arg2, arg3, arg4) {
    arg0.stencilFuncSeparate(arg1 >>> 0, arg2 >>> 0, arg3, arg4 >>> 0);
}, arguments); }
export function __wbg_stencilMaskSeparate_3bf2cb54cc370b58() { return logError(function (arg0, arg1, arg2) {
    arg0.stencilMaskSeparate(arg1 >>> 0, arg2 >>> 0);
}, arguments); }
export function __wbg_stencilMaskSeparate_cabcdf843acbf5f1() { return logError(function (arg0, arg1, arg2) {
    arg0.stencilMaskSeparate(arg1 >>> 0, arg2 >>> 0);
}, arguments); }
export function __wbg_stencilMask_485dcb5965c79a71() { return logError(function (arg0, arg1) {
    arg0.stencilMask(arg1 >>> 0);
}, arguments); }
export function __wbg_stencilMask_f9fe198f7fd6fc9c() { return logError(function (arg0, arg1) {
    arg0.stencilMask(arg1 >>> 0);
}, arguments); }
export function __wbg_stencilOpSeparate_5c4dbe1cf597c5ed() { return logError(function (arg0, arg1, arg2, arg3, arg4) {
    arg0.stencilOpSeparate(arg1 >>> 0, arg2 >>> 0, arg3 >>> 0, arg4 >>> 0);
}, arguments); }
export function __wbg_stencilOpSeparate_6cf50803475d2640() { return logError(function (arg0, arg1, arg2, arg3, arg4) {
    arg0.stencilOpSeparate(arg1 >>> 0, arg2 >>> 0, arg3 >>> 0, arg4 >>> 0);
}, arguments); }
export function __wbg_submit_b3bbead76cbf7627() { return logError(function (arg0, arg1) {
    arg0.submit(arg1);
}, arguments); }
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
export function __wbg_texParameteri_c6efffcecb474d2f() { return logError(function (arg0, arg1, arg2, arg3) {
    arg0.texParameteri(arg1 >>> 0, arg2 >>> 0, arg3);
}, arguments); }
export function __wbg_texParameteri_fe6210a493d48a16() { return logError(function (arg0, arg1, arg2, arg3) {
    arg0.texParameteri(arg1 >>> 0, arg2 >>> 0, arg3);
}, arguments); }
export function __wbg_texStorage2D_ed5df596c5f1e3af() { return logError(function (arg0, arg1, arg2, arg3, arg4, arg5) {
    arg0.texStorage2D(arg1 >>> 0, arg2, arg3 >>> 0, arg4, arg5);
}, arguments); }
export function __wbg_texStorage3D_160b0197bc190f04() { return logError(function (arg0, arg1, arg2, arg3, arg4, arg5, arg6) {
    arg0.texStorage3D(arg1 >>> 0, arg2, arg3 >>> 0, arg4, arg5, arg6);
}, arguments); }
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
export function __wbg_then_05edfc8a4fea5106() { return logError(function (arg0, arg1, arg2) {
    const ret = arg0.then(arg1, arg2);
    return ret;
}, arguments); }
export function __wbg_then_2a84678a50976959() { return logError(function (arg0, arg1, arg2) {
    const ret = arg0.then(arg1, arg2);
    return ret;
}, arguments); }
export function __wbg_then_591b6b3a75ee817a() { return logError(function (arg0, arg1) {
    const ret = arg0.then(arg1);
    return ret;
}, arguments); }
export function __wbg_then_c768c7c3e60c20ef() { return logError(function (arg0, arg1) {
    const ret = arg0.then(arg1);
    return ret;
}, arguments); }
export function __wbg_uniform1f_3acd3f3eb50b5e11() { return logError(function (arg0, arg1, arg2) {
    arg0.uniform1f(arg1, arg2);
}, arguments); }
export function __wbg_uniform1f_d34e4b454f7c8e73() { return logError(function (arg0, arg1, arg2) {
    arg0.uniform1f(arg1, arg2);
}, arguments); }
export function __wbg_uniform1i_cd9a7f990128ea48() { return logError(function (arg0, arg1, arg2) {
    arg0.uniform1i(arg1, arg2);
}, arguments); }
export function __wbg_uniform1i_e4f13604354c28ae() { return logError(function (arg0, arg1, arg2) {
    arg0.uniform1i(arg1, arg2);
}, arguments); }
export function __wbg_uniform1ui_36c94692177ebf76() { return logError(function (arg0, arg1, arg2) {
    arg0.uniform1ui(arg1, arg2 >>> 0);
}, arguments); }
export function __wbg_uniform2fv_17592f4dad9798fb() { return logError(function (arg0, arg1, arg2, arg3) {
    arg0.uniform2fv(arg1, getArrayF32FromWasm0(arg2, arg3));
}, arguments); }
export function __wbg_uniform2fv_39277cf2d3cb83c7() { return logError(function (arg0, arg1, arg2, arg3) {
    arg0.uniform2fv(arg1, getArrayF32FromWasm0(arg2, arg3));
}, arguments); }
export function __wbg_uniform2iv_c5e863975dd780d8() { return logError(function (arg0, arg1, arg2, arg3) {
    arg0.uniform2iv(arg1, getArrayI32FromWasm0(arg2, arg3));
}, arguments); }
export function __wbg_uniform2iv_d5d29ebbc466977d() { return logError(function (arg0, arg1, arg2, arg3) {
    arg0.uniform2iv(arg1, getArrayI32FromWasm0(arg2, arg3));
}, arguments); }
export function __wbg_uniform2uiv_418ba3bf6a230dd5() { return logError(function (arg0, arg1, arg2, arg3) {
    arg0.uniform2uiv(arg1, getArrayU32FromWasm0(arg2, arg3));
}, arguments); }
export function __wbg_uniform3fv_7723e142be50856f() { return logError(function (arg0, arg1, arg2, arg3) {
    arg0.uniform3fv(arg1, getArrayF32FromWasm0(arg2, arg3));
}, arguments); }
export function __wbg_uniform3fv_dbe44b778e6b89e8() { return logError(function (arg0, arg1, arg2, arg3) {
    arg0.uniform3fv(arg1, getArrayF32FromWasm0(arg2, arg3));
}, arguments); }
export function __wbg_uniform3iv_bea3976522e15d48() { return logError(function (arg0, arg1, arg2, arg3) {
    arg0.uniform3iv(arg1, getArrayI32FromWasm0(arg2, arg3));
}, arguments); }
export function __wbg_uniform3iv_d75d3a5f86d54be4() { return logError(function (arg0, arg1, arg2, arg3) {
    arg0.uniform3iv(arg1, getArrayI32FromWasm0(arg2, arg3));
}, arguments); }
export function __wbg_uniform3uiv_71c1efc24a662de9() { return logError(function (arg0, arg1, arg2, arg3) {
    arg0.uniform3uiv(arg1, getArrayU32FromWasm0(arg2, arg3));
}, arguments); }
export function __wbg_uniform4f_4410d2faaa7e5dda() { return logError(function (arg0, arg1, arg2, arg3, arg4, arg5) {
    arg0.uniform4f(arg1, arg2, arg3, arg4, arg5);
}, arguments); }
export function __wbg_uniform4f_a5008773cfb47d1a() { return logError(function (arg0, arg1, arg2, arg3, arg4, arg5) {
    arg0.uniform4f(arg1, arg2, arg3, arg4, arg5);
}, arguments); }
export function __wbg_uniform4fv_85ad5d23234895d2() { return logError(function (arg0, arg1, arg2, arg3) {
    arg0.uniform4fv(arg1, getArrayF32FromWasm0(arg2, arg3));
}, arguments); }
export function __wbg_uniform4fv_9e670a001c77dca0() { return logError(function (arg0, arg1, arg2, arg3) {
    arg0.uniform4fv(arg1, getArrayF32FromWasm0(arg2, arg3));
}, arguments); }
export function __wbg_uniform4iv_1d57c6b8e5c0e447() { return logError(function (arg0, arg1, arg2, arg3) {
    arg0.uniform4iv(arg1, getArrayI32FromWasm0(arg2, arg3));
}, arguments); }
export function __wbg_uniform4iv_a9aaa92f2f458ec2() { return logError(function (arg0, arg1, arg2, arg3) {
    arg0.uniform4iv(arg1, getArrayI32FromWasm0(arg2, arg3));
}, arguments); }
export function __wbg_uniform4uiv_c5d45f5dbdae727a() { return logError(function (arg0, arg1, arg2, arg3) {
    arg0.uniform4uiv(arg1, getArrayU32FromWasm0(arg2, arg3));
}, arguments); }
export function __wbg_uniformBlockBinding_829a71912ad79a04() { return logError(function (arg0, arg1, arg2, arg3) {
    arg0.uniformBlockBinding(arg1, arg2 >>> 0, arg3 >>> 0);
}, arguments); }
export function __wbg_uniformMatrix2fv_b666dc80e084ddbc() { return logError(function (arg0, arg1, arg2, arg3, arg4) {
    arg0.uniformMatrix2fv(arg1, arg2 !== 0, getArrayF32FromWasm0(arg3, arg4));
}, arguments); }
export function __wbg_uniformMatrix2fv_cd6e1725152efce9() { return logError(function (arg0, arg1, arg2, arg3, arg4) {
    arg0.uniformMatrix2fv(arg1, arg2 !== 0, getArrayF32FromWasm0(arg3, arg4));
}, arguments); }
export function __wbg_uniformMatrix2x3fv_6a6221d5300ad184() { return logError(function (arg0, arg1, arg2, arg3, arg4) {
    arg0.uniformMatrix2x3fv(arg1, arg2 !== 0, getArrayF32FromWasm0(arg3, arg4));
}, arguments); }
export function __wbg_uniformMatrix2x4fv_68bc9cd1e2d67339() { return logError(function (arg0, arg1, arg2, arg3, arg4) {
    arg0.uniformMatrix2x4fv(arg1, arg2 !== 0, getArrayF32FromWasm0(arg3, arg4));
}, arguments); }
export function __wbg_uniformMatrix3fv_2ccfe6ff9f4f57ec() { return logError(function (arg0, arg1, arg2, arg3, arg4) {
    arg0.uniformMatrix3fv(arg1, arg2 !== 0, getArrayF32FromWasm0(arg3, arg4));
}, arguments); }
export function __wbg_uniformMatrix3fv_da8c388748c5739b() { return logError(function (arg0, arg1, arg2, arg3, arg4) {
    arg0.uniformMatrix3fv(arg1, arg2 !== 0, getArrayF32FromWasm0(arg3, arg4));
}, arguments); }
export function __wbg_uniformMatrix3x2fv_1083b1ecb80866a1() { return logError(function (arg0, arg1, arg2, arg3, arg4) {
    arg0.uniformMatrix3x2fv(arg1, arg2 !== 0, getArrayF32FromWasm0(arg3, arg4));
}, arguments); }
export function __wbg_uniformMatrix3x4fv_d4cc158d92dbd1ce() { return logError(function (arg0, arg1, arg2, arg3, arg4) {
    arg0.uniformMatrix3x4fv(arg1, arg2 !== 0, getArrayF32FromWasm0(arg3, arg4));
}, arguments); }
export function __wbg_uniformMatrix4fv_61b1a000cfdc35cc() { return logError(function (arg0, arg1, arg2, arg3, arg4) {
    arg0.uniformMatrix4fv(arg1, arg2 !== 0, getArrayF32FromWasm0(arg3, arg4));
}, arguments); }
export function __wbg_uniformMatrix4fv_c8ba105f2ce3edf8() { return logError(function (arg0, arg1, arg2, arg3, arg4) {
    arg0.uniformMatrix4fv(arg1, arg2 !== 0, getArrayF32FromWasm0(arg3, arg4));
}, arguments); }
export function __wbg_uniformMatrix4x2fv_cb66ed882d29c550() { return logError(function (arg0, arg1, arg2, arg3, arg4) {
    arg0.uniformMatrix4x2fv(arg1, arg2 !== 0, getArrayF32FromWasm0(arg3, arg4));
}, arguments); }
export function __wbg_uniformMatrix4x3fv_99e2e5fabf39e8b6() { return logError(function (arg0, arg1, arg2, arg3, arg4) {
    arg0.uniformMatrix4x3fv(arg1, arg2 !== 0, getArrayF32FromWasm0(arg3, arg4));
}, arguments); }
export function __wbg_unmap_817a2e3248a553fb() { return logError(function (arg0) {
    arg0.unmap();
}, arguments); }
export function __wbg_usage_265ef3d88b112387() { return logError(function (arg0) {
    const ret = arg0.usage;
    _assertNum(ret);
    return ret;
}, arguments); }
export function __wbg_useProgram_0e1cd86765304939() { return logError(function (arg0, arg1) {
    arg0.useProgram(arg1);
}, arguments); }
export function __wbg_useProgram_ab2ee2a13a1fd909() { return logError(function (arg0, arg1) {
    arg0.useProgram(arg1);
}, arguments); }
export function __wbg_valueOf_c4f805e57755a0ee() { return logError(function (arg0) {
    const ret = arg0.valueOf();
    return ret;
}, arguments); }
export function __wbg_value_49f783bb59765962() { return logError(function (arg0) {
    const ret = arg0.value;
    return ret;
}, arguments); }
export function __wbg_vertexAttribDivisorANGLE_ffd803d04b545670() { return logError(function (arg0, arg1, arg2) {
    arg0.vertexAttribDivisorANGLE(arg1 >>> 0, arg2 >>> 0);
}, arguments); }
export function __wbg_vertexAttribDivisor_f17a8585267be92f() { return logError(function (arg0, arg1, arg2) {
    arg0.vertexAttribDivisor(arg1 >>> 0, arg2 >>> 0);
}, arguments); }
export function __wbg_vertexAttribIPointer_23b6d6b8b8b79b4d() { return logError(function (arg0, arg1, arg2, arg3, arg4, arg5) {
    arg0.vertexAttribIPointer(arg1 >>> 0, arg2, arg3 >>> 0, arg4, arg5);
}, arguments); }
export function __wbg_vertexAttribPointer_36c76a0c7e4f0239() { return logError(function (arg0, arg1, arg2, arg3, arg4, arg5, arg6) {
    arg0.vertexAttribPointer(arg1 >>> 0, arg2, arg3 >>> 0, arg4 !== 0, arg5, arg6);
}, arguments); }
export function __wbg_vertexAttribPointer_4e5d289c5d224210() { return logError(function (arg0, arg1, arg2, arg3, arg4, arg5, arg6) {
    arg0.vertexAttribPointer(arg1 >>> 0, arg2, arg3 >>> 0, arg4 !== 0, arg5, arg6);
}, arguments); }
export function __wbg_videoHeight_3d8d9632b96e72e7() { return logError(function (arg0) {
    const ret = arg0.videoHeight;
    _assertNum(ret);
    return ret;
}, arguments); }
export function __wbg_videoWidth_b9990366012201e7() { return logError(function (arg0) {
    const ret = arg0.videoWidth;
    _assertNum(ret);
    return ret;
}, arguments); }
export function __wbg_viewport_a0ca330f9b85397e() { return logError(function (arg0, arg1, arg2, arg3, arg4) {
    arg0.viewport(arg1, arg2, arg3, arg4);
}, arguments); }
export function __wbg_viewport_b5bd46a0d111c83c() { return logError(function (arg0, arg1, arg2, arg3, arg4) {
    arg0.viewport(arg1, arg2, arg3, arg4);
}, arguments); }
export function __wbg_wgslLanguageFeatures_63fb0e3f15726e44() { return logError(function (arg0) {
    const ret = arg0.wgslLanguageFeatures;
    return ret;
}, arguments); }
export function __wbg_width_21574923e23732ce() { return logError(function (arg0) {
    const ret = arg0.width;
    _assertNum(ret);
    return ret;
}, arguments); }
export function __wbg_width_42c66a46c4d6f7c1() { return logError(function (arg0) {
    const ret = arg0.width;
    _assertNum(ret);
    return ret;
}, arguments); }
export function __wbg_width_b66bcbdc3c062766() { return logError(function (arg0) {
    const ret = arg0.width;
    _assertNum(ret);
    return ret;
}, arguments); }
export function __wbg_width_c8740d5bdf596189() { return logError(function (arg0) {
    const ret = arg0.width;
    _assertNum(ret);
    return ret;
}, arguments); }
export function __wbg_width_ca7775f863f3ddbb() { return logError(function (arg0) {
    const ret = arg0.width;
    _assertNum(ret);
    return ret;
}, arguments); }
export function __wbg_writeBuffer_24a10bfd5a8a57f7() { return handleError(function (arg0, arg1, arg2, arg3, arg4, arg5, arg6) {
    arg0.writeBuffer(arg1, arg2, getArrayU8FromWasm0(arg3, arg4), arg5, arg6);
}, arguments); }
export function __wbg_writeTexture_acb28796746826c8() { return handleError(function (arg0, arg1, arg2, arg3, arg4, arg5) {
    arg0.writeTexture(arg1, getArrayU8FromWasm0(arg2, arg3), arg4, arg5);
}, arguments); }
export function __wbindgen_cast_0000000000000001() { return logError(function (arg0, arg1) {
    // Cast intrinsic for `Closure(Closure { owned: true, function: Function { arguments: [Externref], shim_idx: 3069, ret: Result(Unit), inner_ret: Some(Result(Unit)) }, mutable: true }) -> Externref`.
    const ret = makeMutClosure(arg0, arg1, wasm_bindgen__convert__closures_____invoke__hfba5c1193d6f8698);
    return ret;
}, arguments); }
export function __wbindgen_cast_0000000000000002() { return logError(function (arg0, arg1) {
    // Cast intrinsic for `Closure(Closure { owned: true, function: Function { arguments: [Externref], shim_idx: 972, ret: Unit, inner_ret: Some(Unit) }, mutable: true }) -> Externref`.
    const ret = makeMutClosure(arg0, arg1, wasm_bindgen__convert__closures_____invoke__h06c2887414f43e07);
    return ret;
}, arguments); }
export function __wbindgen_cast_0000000000000003() { return logError(function (arg0, arg1) {
    // Cast intrinsic for `Closure(Closure { owned: true, function: Function { arguments: [NamedExternref("GPUUncapturedErrorEvent")], shim_idx: 971, ret: Unit, inner_ret: Some(Unit) }, mutable: true }) -> Externref`.
    const ret = makeMutClosure(arg0, arg1, wasm_bindgen__convert__closures_____invoke__hd8ca6cd153e56e86);
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
function wasm_bindgen__convert__closures_____invoke__h1ebfdbcc0f9433ad(arg0, arg1) {
    _assertNum(arg0);
    _assertNum(arg1);
    const ret = wasm.wasm_bindgen__convert__closures_____invoke__h1ebfdbcc0f9433ad(arg0, arg1);
    return ret !== 0;
}

function wasm_bindgen__convert__closures_____invoke__h06c2887414f43e07(arg0, arg1, arg2) {
    _assertNum(arg0);
    _assertNum(arg1);
    wasm.wasm_bindgen__convert__closures_____invoke__h06c2887414f43e07(arg0, arg1, arg2);
}

function wasm_bindgen__convert__closures_____invoke__hd8ca6cd153e56e86(arg0, arg1, arg2) {
    _assertNum(arg0);
    _assertNum(arg1);
    wasm.wasm_bindgen__convert__closures_____invoke__hd8ca6cd153e56e86(arg0, arg1, arg2);
}

function wasm_bindgen__convert__closures_____invoke__hfba5c1193d6f8698(arg0, arg1, arg2) {
    _assertNum(arg0);
    _assertNum(arg1);
    const ret = wasm.wasm_bindgen__convert__closures_____invoke__hfba5c1193d6f8698(arg0, arg1, arg2);
    if (ret[1]) {
        throw takeFromExternrefTable0(ret[0]);
    }
}

function wasm_bindgen__convert__closures_____invoke__h135375d20de84ad6(arg0, arg1, arg2, arg3) {
    _assertNum(arg0);
    _assertNum(arg1);
    wasm.wasm_bindgen__convert__closures_____invoke__h135375d20de84ad6(arg0, arg1, arg2, arg3);
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
