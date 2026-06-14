"use client";

import { Button } from "./ui/button";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { cn } from "@/utils/ui";
import { Sun03Icon, Moon02Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { motion, AnimatePresence } from "motion/react";

interface ThemeToggleProps {
	className?: string;
	iconClassName?: string;
	onToggle?: (e: React.MouseEvent<HTMLButtonElement>) => void;
}

export function ThemeToggle({
	className,
	iconClassName,
	onToggle,
}: ThemeToggleProps) {
	const { resolvedTheme, setTheme } = useTheme();
	const [mounted, setMounted] = useState(false);
	useEffect(() => {
		setMounted(true);
	}, []);
	const isDark = mounted && resolvedTheme === "dark";

	return (
		<Button
			size="icon"
			variant="ghost"
			aria-label={isDark ? "Switch to light theme" : "Switch to dark theme"}
			className={cn("relative size-8 overflow-hidden", className)}
			suppressHydrationWarning
			onClick={(e) => {
				if (typeof document !== "undefined" && "startViewTransition" in document) {
					document.startViewTransition(() => {
						setTheme(isDark ? "light" : "dark");
					});
				} else {
					setTheme(isDark ? "light" : "dark");
				}
				onToggle?.(e);
			}}
		>
			<AnimatePresence mode="popLayout" initial={false}>
				{mounted && (
					<motion.span
						key={isDark ? "moon" : "sun"}
						className="pointer-events-none absolute inset-0 flex items-center justify-center"
						initial={{ rotate: -90, scale: 0.6, opacity: 0 }}
						animate={{ rotate: 0, scale: 1, opacity: 1 }}
						exit={{ rotate: 90, scale: 0.6, opacity: 0 }}
						transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
					>
						<HugeiconsIcon
							icon={isDark ? Moon02Icon : Sun03Icon}
							className={cn("!size-[1.1rem]", iconClassName)}
						/>
					</motion.span>
				)}
			</AnimatePresence>
			<span className="sr-only">
				{isDark ? "Light mode" : "Dark mode"}
			</span>
		</Button>
	);
}
