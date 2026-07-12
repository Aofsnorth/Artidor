"use client";

import { cn } from "@/utils/ui";

interface PageTransitionProps {
	children: React.ReactNode;
	className?: string;
}

export function PageTransition({ children, className }: PageTransitionProps) {
	return <div className={cn("animate-page-in", className)}>{children}</div>;
}
