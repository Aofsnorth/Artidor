"use client";

import { motion } from "motion/react";

interface PageTransitionProps {
	children: React.ReactNode;
	className?: string;
}

export function PageTransition({ children, className }: PageTransitionProps) {
	return (
		<motion.div
			initial={{ opacity: 0, y: 12 }}
			animate={{ opacity: 1, y: 0 }}
			exit={{ opacity: 0, y: -12 }}
			transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
			className={className}
		>
			{children}
		</motion.div>
	);
}
