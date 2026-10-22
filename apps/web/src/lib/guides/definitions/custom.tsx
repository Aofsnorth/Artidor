import { RulerIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import type { GuideDefinition } from "@/lib/guides/types";

// Custom guide lines are not implemented yet, so this definition is kept out of
// the registry and exposes no options/overlay. Rendering a "Add guide line"
// button here without a handler would be dead UI.
export const customGuide = {
	id: "custom",
	label: "Custom",
	renderPreview: () => <HugeiconsIcon size={16} icon={RulerIcon} />,
	renderTriggerIcon: () => <HugeiconsIcon icon={RulerIcon} />,
	renderOverlay: () => null,
} as const satisfies GuideDefinition;
