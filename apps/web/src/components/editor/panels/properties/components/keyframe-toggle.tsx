import { Button } from "@/components/ui/button";
import { HugeiconsIcon } from "@hugeicons/react";
import { KeyframeIcon } from "@hugeicons/core-free-icons";
import { cn } from "@/utils/ui";

export function KeyframeToggle({
	isActive,
	isDisabled = false,
	title,
	onToggle,
}: {
	isActive: boolean;
	isDisabled?: boolean;
	title: string;
	onToggle: () => void;
}) {
	return (
		<Button
			variant="text"
			aria-pressed={isActive}
			disabled={isDisabled}
			title={title}
			onClick={onToggle}
			className="[&>svg]:size-[1.125rem] mb-0.5"
		>
			<HugeiconsIcon
				icon={KeyframeIcon}
				className={cn(isActive && "text-primary fill-primary")}
			/>
		</Button>
	);
}
