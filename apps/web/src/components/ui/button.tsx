import * as React from "react";
import { Slot as SlotPrimitive } from "radix-ui";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/utils/ui";

const buttonVariants = cva(
	"inline-flex items-center cursor-pointer justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-[transform,background-color,color,border-color,box-shadow,opacity] duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] active:scale-[0.97] focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
	{
		variants: {
			variant: {
				default: "bg-foreground text-background hover:bg-foreground/90",
				background: "bg-background text-foreground hover:bg-background/90",
				destructive:
					"bg-destructive text-destructive-foreground hover:bg-destructive/80",
				"destructive-foreground":
					"border bg-background hover:bg-destructive/15 text-destructive",
				caution: "text-caution hover:bg-caution/10",
				outline: "border border-border bg-background hover:bg-accent",
				secondary:
					"bg-secondary text-secondary-foreground border border-secondary-border",
				text: "bg-transparent rounded-none opacity-100 hover:opacity-75",
				ghost: "bg-transparent hover:bg-accent",
				link: "text-primary underline-offset-4 hover:underline !p-0 !h-auto",
				editorial:
					"rounded-[3px] border border-[#141413] bg-[#141413] text-[#F4F1EA] shadow-beautiful-sm hover:bg-[#282725] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#141413]",
				"editorial-outline":
					"rounded-[3px] border border-[#141413]/35 bg-[#EAE7DF]/75 text-[#141413] shadow-beautiful-sm hover:border-[#141413] hover:bg-[#EAE7DF] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#141413]",
				"editorial-ghost":
					"rounded-[3px] border border-transparent bg-transparent text-[#141413]/80 hover:border-[#141413]/20 hover:bg-[#DFDCD4]/70 hover:text-[#141413] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#141413]",
				"editorial-light":
					"rounded-[3px] border border-[#F4F1EA] bg-[#F4F1EA] text-[#141413] shadow-beautiful-sm hover:bg-[#EAE7DF] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#F4F1EA]",
			},
			size: {
				default: "h-9 px-4 py-2",
				sm: "h-7 p-1 px-2.5 text-sm rounded-sm",
				lg: "h-10 p-5 px-6",
				icon: "size-7 rounded-sm",
				text: "p-0",
				"editorial-sm":
					"min-h-11 px-3.5 py-2 text-[12px] font-medium uppercase tracking-[0.12em]",
				"editorial-default":
					"min-h-11 px-5 py-2.5 text-[12.5px] font-medium uppercase tracking-[0.12em]",
				"editorial-lg":
					"min-h-12 px-6 py-3 text-[13px] font-medium uppercase tracking-[0.12em]",
			},
		},
		defaultVariants: {
			variant: "default",
			size: "default",
		},
	},
);

export interface ButtonProps
	extends React.ButtonHTMLAttributes<HTMLButtonElement>,
		VariantProps<typeof buttonVariants> {
	asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
	({ className, variant, size, asChild = false, ...props }, ref) => {
		const Comp = asChild ? SlotPrimitive.Slot : "button";
		const effectiveSize = size ?? (variant === "text" ? "text" : "default");
		return (
			<Comp
				className={cn(
					buttonVariants({ variant, size: effectiveSize, className }),
				)}
				ref={ref}
				type="button"
				{...props}
			/>
		);
	},
);
Button.displayName = "Button";

export { Button, buttonVariants };
