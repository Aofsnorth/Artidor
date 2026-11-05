use std::collections::HashMap;

use gpu::wgpu;

pub struct StoredTexture {
    texture: wgpu::Texture,
}

impl StoredTexture {
    pub fn new(texture: wgpu::Texture) -> Self {
        Self { texture }
    }

    pub fn texture(&self) -> &wgpu::Texture {
        &self.texture
    }
}

#[derive(Default)]
pub struct TextureStore {
    textures: HashMap<String, StoredTexture>,
}

impl TextureStore {
    pub fn upsert(&mut self, id: String, texture: wgpu::Texture) {
        self.textures.insert(id, StoredTexture::new(texture));
    }

    pub fn get(&self, id: &str) -> Option<&StoredTexture> {
        self.textures.get(id)
    }

    /// Returns the stored texture for `id` when it can be written into again.
    ///
    /// A video layer re-uploads every frame: its decoded frame comes from a
    /// rotating canvas pool, so the source object identity always changes and
    /// the compositor's identity-based upload dedupe can never skip it.
    /// Creating a fresh GPU texture per upload allocated and freed a full
    /// frame-sized texture 60x/second, which showed up as periodic hitches
    /// during playback. Reusing the existing texture when the id and
    /// dimensions match turns that into a plain copy into a texture that is
    /// already resident.
    pub fn texture_for_reuse(&self, id: &str, width: u32, height: u32) -> Option<&wgpu::Texture> {
        let stored = self.textures.get(id)?;
        let texture = stored.texture();
        if texture.width() == width && texture.height() == height {
            Some(texture)
        } else {
            None
        }
    }

    pub fn remove(&mut self, id: &str) {
        self.textures.remove(id);
    }
}
