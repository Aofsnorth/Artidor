"use client";

import * as React from "react";
import { Dialog as DialogPrimitive } from "radix-ui";
import { X } from "lucide-react";
import { cn } from "@/utils/ui";
import { useOverlayOpenChange } from "./use-overlay-open-change";

function Dialog({
	open,
	onOpenChange,
	...props
}: React.ComponentProps<typeof DialogPrimitive.Root>) {
	const handleOpenChange = useOverlayOpenChange({
		open,
		onOpenChange,
	});
	return (
		<DialogPrimitive.Root
			open={open}
			onOpenChange={handleOpenChange}
			{...props}
		/>
	);
}

const DialogTrigger = DialogPrimitive.Trigger;

const DialogPortal = DialogPrimitive.Portal;

const DialogClose = DialogPrimitive.Close;

const DialogOverlay = React.forwardRef<
	React.ElementRef<typeof DialogPrimitive.Overlay>,
	React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
	<DialogPrimitive.Overlay
		ref={ref}
		className={cn(
			"fixed inset-0 z-250 bg-black/60",
			className,
		)}
		{...props}
	/>
));
DialogOverlay.displayName = DialogPrimitive.Overlay.displayName;

/** Portaled modal with viewport-bounded scrolling and an accessible close target. */
const DialogContent = React.forwardRef<
	React.ElementRef<typeof DialogPrimitive.Content>,
	React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>
>(({ className, children, ...props }, ref) => (
	<DialogPortal>
		<DialogOverlay />
		<DialogPrimitive.Content
			ref={ref}
			className={cn(
				"bg-popover fixed top-[50%] left-[50%] z-250 grid max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-lg overflow-y-auto overscroll-contain translate-x-[-50%] translate-y-[-50%] rounded-lg border shadow-lg duration-200",
				className,
			)}
			onCloseAutoFocus={(e) => {
				e.stopPropagation();
				e.preventDefault();
			}}
			{...props}
		>
			{children}
			<DialogPrimitive.Close type="button" className="ring-offset-background focus-visible:ring-ring absolute top-3 right-3 grid size-9 place-items-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground focus-visible:ring-2 focus-visible:outline-hidden disabled:pointer-events-none">
				<X aria-hidden="true" className="size-4" />
				<span className="sr-only">Close</span>
			</DialogPrimitive.Close>
		</DialogPrimitive.Content>
	</DialogPortal>
));
DialogContent.displayName = DialogPrimitive.Content.displayName;

const DialogHeader = ({
	className,
	...props
}: React.HTMLAttributes<HTMLDivElement>) => (
	<div
		className={cn("flex flex-col space-y-2 text-left border-b p-6 pr-14", className)}
		{...props}
	/>
);
DialogHeader.displayName = "DialogHeader";

const DialogBody = ({
	className,
	...props
}: React.HTMLAttributes<HTMLDivElement>) => (
	<div className={cn("p-6 flex flex-col gap-4", className)} {...props} />
);
DialogBody.displayName = "DialogBody";

const DialogFooter = ({
	className,
	...props
}: React.HTMLAttributes<HTMLDivElement>) => (
	<div
		className={cn(
			"flex gap-3 flex-col-reverse sm:flex-row sm:justify-end p-6 py-5 border-t",
			className,
		)}
		{...props}
	/>
);
DialogFooter.displayName = "DialogFooter";

const DialogTitle = React.forwardRef<
	React.ElementRef<typeof DialogPrimitive.Title>,
	React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
	<DialogPrimitive.Title
		ref={ref}
		className={cn(
			"text-lg leading-none font-semibold tracking-tight",
			className,
		)}
		{...props}
	/>
));
DialogTitle.displayName = DialogPrimitive.Title.displayName;

const DialogDescription = React.forwardRef<
	React.ElementRef<typeof DialogPrimitive.Description>,
	React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
	<DialogPrimitive.Description
		ref={ref}
		className={cn("text-muted-foreground text-sm", className)}
		{...props}
	/>
));
DialogDescription.displayName = DialogPrimitive.Description.displayName;

export {
	Dialog,
	DialogPortal,
	DialogOverlay,
	DialogTrigger,
	DialogClose,
	DialogContent,
	DialogHeader,
	DialogBody,
	DialogFooter,
	DialogTitle,
	DialogDescription,
};
