//! Direct2D / DXGI rendering context for the native desktop shell.

use core::mem::ManuallyDrop;

use windows::core::{BOOL, Error, Interface, Result};
use windows::Win32::Foundation::{E_FAIL, HMODULE, HWND, RECT};
use windows::Win32::Graphics::Direct2D::{
    Common::{D2D1_COLOR_F, D2D1_PIXEL_FORMAT},
    D2D1CreateDevice, D2D1_BITMAP_OPTIONS_TARGET, D2D1_BITMAP_PROPERTIES1,
    D2D1_DEVICE_CONTEXT_OPTIONS_NONE, D2D1_UNIT_MODE_PIXELS, ID2D1Bitmap1, ID2D1Device,
    ID2D1DeviceContext, ID2D1RenderTarget,
};
use windows::Win32::Graphics::Direct2D::Common::D2D1_ALPHA_MODE_IGNORE;
use windows::Win32::Graphics::Direct3D::{
    D3D_DRIVER_TYPE_HARDWARE, D3D_DRIVER_TYPE_WARP, D3D_FEATURE_LEVEL_10_0,
    D3D_FEATURE_LEVEL_10_1, D3D_FEATURE_LEVEL_11_0, D3D_FEATURE_LEVEL_11_1,
};
use windows::Win32::Graphics::Direct3D11::{
    D3D11CreateDevice, D3D11_CREATE_DEVICE_BGRA_SUPPORT, D3D11_SDK_VERSION, ID3D11Device,
};
use windows::Win32::Graphics::Dxgi::{
    Common::{
        DXGI_ALPHA_MODE_IGNORE, DXGI_FORMAT_B8G8R8A8_UNORM, DXGI_SAMPLE_DESC,
    },
    CreateDXGIFactory1, DXGI_PRESENT, DXGI_SCALING_STRETCH, DXGI_SWAP_CHAIN_DESC1,
    DXGI_SWAP_CHAIN_FLAG, DXGI_SWAP_EFFECT_DISCARD, DXGI_USAGE_RENDER_TARGET_OUTPUT,
    IDXGIAdapter, IDXGIDevice, IDXGIFactory2, IDXGISurface, IDXGISwapChain1,
};
use windows::Win32::System::Com::{CoInitializeEx, COINIT_MULTITHREADED};
use windows::Win32::UI::WindowsAndMessaging::GetClientRect;

use crate::d2d::font::D2dFontCache;

/// Direct2D device context + swap chain + font cache.
pub struct D2dContext {
    d2d_context: ID2D1DeviceContext,
    swap_chain: IDXGISwapChain1,
    d2d_device: ID2D1Device,
    dxgi_device: IDXGIDevice,
    d3d_device: ID3D11Device,
    target: Option<ID2D1Bitmap1>,
    rt: ID2D1RenderTarget,
    fonts: D2dFontCache,
}

impl D2dContext {
    /// Build a D2D context for `hwnd`. Uses the current client size to create the
    /// swap chain. Falls back to WARP if no hardware D3D11 device is available.
    pub unsafe fn new(hwnd: HWND) -> Result<Self> {
        let _ = CoInitializeEx(None, COINIT_MULTITHREADED);

        let (width, height) = {
            let mut client = RECT::default();
            if GetClientRect(hwnd, &mut client).is_ok() {
                (
                    (client.right - client.left).max(0).max(1) as u32,
                    (client.bottom - client.top).max(0).max(1) as u32,
                )
            } else {
                (1, 1)
            }
        };

        let d3d_device = Self::create_d3d11_device()?;
        let dxgi_device: IDXGIDevice = d3d_device.cast()?;
        let d2d_device: ID2D1Device = D2D1CreateDevice(&dxgi_device, None)?;
        let d2d_context: ID2D1DeviceContext =
            d2d_device.CreateDeviceContext(D2D1_DEVICE_CONTEXT_OPTIONS_NONE)?;
        let rt: ID2D1RenderTarget = d2d_context.cast()?;

        rt.SetDpi(96.0, 96.0);
        d2d_context.SetUnitMode(D2D1_UNIT_MODE_PIXELS);

        let dxgi_factory: IDXGIFactory2 = CreateDXGIFactory1()?;
        let desc = DXGI_SWAP_CHAIN_DESC1 {
            Width: width,
            Height: height,
            Format: DXGI_FORMAT_B8G8R8A8_UNORM,
            SampleDesc: DXGI_SAMPLE_DESC { Count: 1, Quality: 0 },
            BufferUsage: DXGI_USAGE_RENDER_TARGET_OUTPUT,
            Stereo: BOOL(0),
            BufferCount: 1,
            Scaling: DXGI_SCALING_STRETCH,
            SwapEffect: DXGI_SWAP_EFFECT_DISCARD,
            AlphaMode: DXGI_ALPHA_MODE_IGNORE,
            Flags: 0,
        };
        let swap_chain: IDXGISwapChain1 =
            dxgi_factory.CreateSwapChainForHwnd(&dxgi_device, hwnd, &desc, None, None)?;

        let mut ctx = Self {
            d2d_context,
            swap_chain,
            d2d_device,
            dxgi_device,
            d3d_device,
            target: None,
            rt,
            fonts: D2dFontCache::new()?,
        };
        ctx.bind_target()?;
        Ok(ctx)
    }

    unsafe fn create_d3d11_device() -> Result<ID3D11Device> {
        let mut d3d_opt: Option<ID3D11Device> = None;
        let feature_levels = [
            D3D_FEATURE_LEVEL_11_1,
            D3D_FEATURE_LEVEL_11_0,
            D3D_FEATURE_LEVEL_10_1,
            D3D_FEATURE_LEVEL_10_0,
        ];
        let flags = D3D11_CREATE_DEVICE_BGRA_SUPPORT;

        let result = D3D11CreateDevice(
            None::<&IDXGIAdapter>,
            D3D_DRIVER_TYPE_HARDWARE,
            HMODULE::default(),
            flags,
            Some(&feature_levels),
            D3D11_SDK_VERSION,
            Some(&mut d3d_opt),
            None,
            None,
        );
        if result.is_ok() {
            return d3d_opt.ok_or_else(|| Error::from_hresult(E_FAIL));
        }

        D3D11CreateDevice(
            None::<&IDXGIAdapter>,
            D3D_DRIVER_TYPE_WARP,
            HMODULE::default(),
            flags,
            Some(&feature_levels),
            D3D11_SDK_VERSION,
            Some(&mut d3d_opt),
            None,
            None,
        )?;
        d3d_opt.ok_or_else(|| Error::from_hresult(E_FAIL))
    }

    unsafe fn bind_target(&mut self) -> Result<()> {
        self.d2d_context.SetTarget(None);
        let surface: IDXGISurface = self.swap_chain.GetBuffer(0)?;
        let bitmap: ID2D1Bitmap1 =
            self.d2d_context.CreateBitmapFromDxgiSurface(&surface, None)?;
        self.d2d_context.SetTarget(&bitmap);
        self.target = Some(bitmap);
        Ok(())
    }

    /// Start a frame, clearing to `color`.
    pub unsafe fn begin_draw(&self, color: &D2D1_COLOR_F) {
        self.rt.BeginDraw();
        self.rt.Clear(Some(color));
    }

    /// Finish the frame and present it.
    pub unsafe fn end_draw(&self) -> Result<()> {
        self.rt.EndDraw(None, None)?;
        self.swap_chain.Present(1, DXGI_PRESENT(0)).ok()?;
        Ok(())
    }

    /// Resize the swap chain to new client dimensions.
    pub unsafe fn resize(&mut self, width: u32, height: u32) -> Result<()> {
        let width = width.max(1);
        let height = height.max(1);
        self.d2d_context.SetTarget(None);
        self.target = None;
        self.swap_chain.ResizeBuffers(
            2,
            width,
            height,
            DXGI_FORMAT_B8G8R8A8_UNORM,
            DXGI_SWAP_CHAIN_FLAG(0),
        )?;
        self.bind_target()?;
        Ok(())
    }

    /// Access the render target for primitive helpers.
    pub fn rt(&self) -> &ID2D1RenderTarget {
        &self.rt
    }

    /// Access the font cache.
    pub fn fonts(&self) -> &D2dFontCache {
        &self.fonts
    }
}
