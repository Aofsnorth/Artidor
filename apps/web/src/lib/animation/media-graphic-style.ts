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
	};
}
