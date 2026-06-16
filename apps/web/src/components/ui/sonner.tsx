"use client";

import { Toaster as Sonner } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

// Theme is pinned to dark across the whole app — the marketing
// site, the editor, and the projects dashboard all use the same
// glassmorphism surface. Sonner inherits the page's CSS variables
// so a single dark palette covers the toast as well.
const Toaster = ({ ...props }: ToasterProps) => {
	return (
		<Sonner
			theme="dark"
			className="toaster group"
			position="bottom-right"
			offset={20}
			toastOptions={{
				classNames: {
					toast:
						"group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg",
					description: "group-[.toast]:text-muted-foreground",
					actionButton:
						"group-[.toast]:bg-primary group-[.toast]:text-primary-foreground",
					cancelButton:
						"group-[.toast]:bg-muted group-[.toast]:text-muted-foreground",
				},
			}}
			expand={false}
			richColors
			{...props}
		/>
	);
};

export { Toaster };
