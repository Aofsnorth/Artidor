use std::collections::HashMap;

use serde::{Deserialize, Serialize};

use crate::BlendMode;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FrameDescriptor {
    pub width: u32,
    pub height: u32,
    pub clear: CanvasClearDescriptor,
    pub items: Vec<FrameItemDescriptor>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CanvasClearDescriptor {
    pub color: [f32; 4],
}

/// A single item in a frame descriptor. `Layer` is a media layer; `SceneEffect` is a
/// post-processing effect applied to the whole scene after all layers are blended.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type", rename_all = "camelCase")]
pub enum FrameItemDescriptor {
    Layer(LayerDescriptor),
    SceneEffect {
        /// Groups of effect passes to apply to the scene. The `rename` is required
        /// because `rename_all` on the enum only applies to variant names, not to
        /// fields of struct variants.
        #[serde(rename = "effectPassGroups")]
        effect_pass_groups: Vec<Vec<EffectPassDescriptor>>,
    },
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LayerDescriptor {
    pub texture_id: String,
    pub transform: QuadTransformDescriptor,
    pub opacity: f32,
    pub blend_mode: BlendMode,
    #[serde(default)]
    pub effect_pass_groups: Vec<Vec<EffectPassDescriptor>>,
    pub mask: Option<LayerMaskDescriptor>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct QuadTransformDescriptor {
    pub center_x: f32,
    pub center_y: f32,
    pub width: f32,
    pub height: f32,
    pub rotation_degrees: f32,
    pub flip_x: bool,
    pub flip_y: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LayerMaskDescriptor {
    pub texture_id: String,
    pub feather: f32,
    pub inverted: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct EffectPassDescriptor {
    pub shader: String,
    pub uniforms: HashMap<String, EffectUniformValueDescriptor>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(untagged)]
pub enum EffectUniformValueDescriptor {
    Number(f32),
    Vector(Vec<f32>),
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CanvasTextureDescriptor {
    pub id: String,
    pub width: u32,
    pub height: u32,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn deserialize_scene_effect_with_tile_uniforms() {
        let json = r#"{
            "width": 1920,
            "height": 1080,
            "clear": { "color": [0, 0, 0, 1] },
            "items": [
                {
                    "type": "sceneEffect",
                    "effectPassGroups": [
                        [
                            {
                                "shader": "tile",
                                "uniforms": {
                                    "u_amount": 0.4,
                                    "u_shift": 0,
                                    "u_single_line": 0,
                                    "u_orientation": 0
                                }
                            }
                        ]
                    ]
                }
            ]
        }"#;

        let frame: FrameDescriptor = serde_json::from_str(json).unwrap();
        assert_eq!(frame.items.len(), 1);
        let FrameItemDescriptor::SceneEffect { effect_pass_groups } = frame.items.first().unwrap()
        else {
            panic!("expected sceneEffect");
        };
        assert_eq!(effect_pass_groups.len(), 1);
        assert_eq!(effect_pass_groups[0].len(), 1);

        let pass = &effect_pass_groups[0][0];
        assert_eq!(pass.shader, "tile");
        assert!(matches!(
            pass.uniforms["u_amount"],
            EffectUniformValueDescriptor::Number(0.4)
        ));
        assert!(matches!(
            pass.uniforms["u_single_line"],
            EffectUniformValueDescriptor::Number(0.0)
        ));
        assert!(matches!(
            pass.uniforms["u_orientation"],
            EffectUniformValueDescriptor::Number(0.0)
        ));
    }
}
