import type { ElementAnimations } from "./types";
import type { MediaGraphicStyle } from "@/lib/timeline";
import { resolveColorAtTime, resolveNumberAtTime } from "./resolve";

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
		fillColor: resolveColorAtTime({
			animations,
			propertyPath: "graphicStyle.fillColor",
			localTime,
			baseColor: baseStyle?.fillColor ?? "#ffffff",
		}),
		fillOpacity: resolveNumberAtTime({
			animations,
			propertyPath: "graphicStyle.fillOpacity",
			localTime,
			baseValue: baseStyle?.fillOpacity ?? 0,
		}),
		stroke: stroke
			? {
					...stroke,
					color: resolveColorAtTime({
						animations,
						propertyPath: "graphicStyle.stroke.color",
						localTime,
						baseColor: stroke.color,
					}),
					width: resolveNumberAtTime({
						animations,
						propertyPath: "graphicStyle.stroke.width",
						localTime,
						baseValue: stroke.width,
					}),
				}
			: undefined,
		border: border
			? {
					...border,
					color: resolveColorAtTime({
						animations,
						propertyPath: "graphicStyle.border.color",
						localTime,
						baseColor: border.color,
					}),
					width: resolveNumberAtTime({
						animations,
						propertyPath: "graphicStyle.border.width",
						localTime,
						baseValue: border.width,
					}),
					opacity: resolveNumberAtTime({
						animations,
						propertyPath: "graphicStyle.border.opacity",
						localTime,
						baseValue: border.opacity ?? 1,
					}),
				}
			: undefined,
		shadow: shadow
			? {
					...shadow,
					color: resolveColorAtTime({
						animations,
						propertyPath: "graphicStyle.shadow.color",
						localTime,
						baseColor: shadow.color,
					}),
					blur: resolveNumberAtTime({
						animations,
						propertyPath: "graphicStyle.shadow.blur",
						localTime,
						baseValue: shadow.blur,
					}),
					offsetX: resolveNumberAtTime({
						animations,
						propertyPath: "graphicStyle.shadow.offsetX",
						localTime,
						baseValue: shadow.offsetX,
					}),
					offsetY: resolveNumberAtTime({
						animations,
						propertyPath: "graphicStyle.shadow.offsetY",
						localTime,
						baseValue: shadow.offsetY,
					}),
				}
			: undefined,
	};
}
