"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, X, Terminal, ArrowRight } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface EnvWarningModalProps {
	isMissing: boolean;
}

export function EnvWarningModal({ isMissing }: EnvWarningModalProps) {
	const [isOpen, setIsOpen] = useState(false);

	useEffect(() => {
		if (isMissing) {
			setIsOpen(true);
		}
	}, [isMissing]);

	return (
		<AnimatePresence>
			{isOpen && (
				<div className="fixed inset-0 z-[9999] flex items-center justify-center px-4">
					<motion.div
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						exit={{ opacity: 0 }}
						className="absolute inset-0 bg-black/60 backdrop-blur-sm"
						onClick={() => setIsOpen(false)}
					/>
					<motion.div
						initial={{ opacity: 0, scale: 0.95, y: 20 }}
						animate={{ opacity: 1, scale: 1, y: 0 }}
						exit={{ opacity: 0, scale: 0.95, y: 20 }}
						transition={{ type: "spring", bounce: 0, duration: 0.4 }}
						className="relative w-full max-w-lg overflow-hidden rounded-2xl border border-red-500/20 bg-zinc-950/90 shadow-2xl shadow-red-900/20 backdrop-blur-xl"
					>
						<div className="absolute inset-0 bg-gradient-to-br from-red-500/10 via-transparent to-transparent pointer-events-none" />
						
						<div className="relative p-6 sm:p-8">
							<button
								onClick={() => setIsOpen(false)}
								className="absolute right-4 top-4 rounded-full p-2 text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-zinc-100"
							>
								<X className="h-5 w-5" />
							</button>

							<div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-red-500/10 border border-red-500/20">
								<AlertTriangle className="h-7 w-7 text-red-500" />
							</div>

							<h2 className="mb-2 text-2xl font-semibold tracking-tight text-zinc-100">
								Environment Not Set
							</h2>
							<p className="mb-6 text-zinc-400 leading-relaxed">
								Looks like you are missing required environment variables. The application might not function correctly or certain features may be disabled.
							</p>

							<div className="mb-8 rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
								<div className="flex items-center gap-3 mb-3 text-sm font-medium text-zinc-300">
									<Terminal className="h-4 w-4 text-zinc-500" />
									<span>Quick Fix</span>
								</div>
								<code className="block text-sm text-zinc-400 font-mono">
									cp .env.example .env.local<br/>
									<span className="text-zinc-600"># Then edit .env.local with your values</span>
								</code>
							</div>

							<div className="flex items-center justify-end">
								<button
									onClick={() => setIsOpen(false)}
									className="group flex items-center gap-2 rounded-xl bg-zinc-100 px-5 py-2.5 text-sm font-medium text-zinc-900 transition-all hover:bg-white hover:shadow-lg hover:shadow-white/10 active:scale-95"
								>
									Acknowledge
									<ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
								</button>
							</div>
						</div>
					</motion.div>
				</div>
			)}
		</AnimatePresence>
	);
}
