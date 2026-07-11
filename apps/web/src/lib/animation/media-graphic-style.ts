import type { ElementAnimations } from "./types";
import type { MediaGraphicStyle } from "@/lib/timeline";
import { resolveAnimationPathValueAtTime } from "./resolve";

export function resolveMediaGraphicStyleAtTime({
	baseStyle,
	animations,
	localTime,
}: {
	baseStyle: MediaGraphicStyle | undefined;
	animations: ElementAnimations | undefined;
	localTime: number;
}): MediaGraphicStyle | undefined {
	if (!baseStyle && !animations) return undefined;
	const stroke = baseStyle?.stroke;
	const border = baseStyle?.border;
	const shadow = baseStyle?.shadow;
	return {
		...baseStyle,
		fillColor: resolveAnimationPathValueAtTime({
			animations,
			propertyPath: "graphicStyle.fillColor",
			localTime,
			fallbackValue: baseStyle?.fillColor ?? "#ffffff",
		}),
		fillOpacity: resolveAnimationPathValueAtTime({
			animations,
			propertyPath: "graphicStyle.fillOpacity",
			localTime,
			fallbackValue: baseStyle?.fillOpacity ?? 0,
		}),
		stroke: stroke
			? {
					...stroke,
					color: resolveAnimationPathValueAtTime({
						animations,
						propertyPath: "graphicStyle.stroke.color",
						localTime,
						fallbackValue: stroke.color,
					}),
					width: resolveAnimationPathValueAtTime({
						animations,
						propertyPath: "graphicStyle.stroke.width",
						localTime,
						fallbackValue: stroke.width,
					}),
				}
			: undefined,
		border: border
			? {
					...border,
					color: resolveAnimationPathValueAtTime({
						animations,
						propertyPath: "graphicStyle.border.color",
						localTime,
						fallbackValue: border.color,
					}),
					width: resolveAnimationPathValueAtTime({
						animations,
						propertyPath: "graphicStyle.border.width",
						localTime,
						fallbackValue: border.width,
					}),
					opacity: resolveAnimationPathValueAtTime({
						animations,
						propertyPath: "graphicStyle.border.opacity",
						localTime,
						fallbackValue: border.opacity ?? 1,
					}),
				}
			: undefined,
		shadow: shadow
			? {
					...shadow,
					color: resolveAnimationPathValueAtTime({
						animations,
						propertyPath: "graphicStyle.shadow.color",
						localTime,
						fallbackValue: shadow.color,
					}),
					blur: resolveAnimationPathValueAtTime({
						animations,
						propertyPath: "graphicStyle.shadow.blur",
						localTime,
						fallbackValue: shadow.blur,
					}),
					offsetX: resolveAnimationPathValueAtTime({
						animations,
						propertyPath: "graphicStyle.shadow.offsetX",
						localTime,
						fallbackValue: shadow.offsetX,
					}),
					offsetY: resolveAnimationPathValueAtTime({
						animations,
						propertyPath: "graphicStyle.shadow.offsetY",
						localTime,
						fallbackValue: shadow.offsetY,
					}),
				}
			: undefined,
	};
}
