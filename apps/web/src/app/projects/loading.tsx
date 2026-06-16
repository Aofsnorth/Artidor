/**
 * Loading skeleton for the projects list.
 */

export default function ProjectsLoading() {
	return (
		<div className="bg-transparent min-h-screen relative">
			<header className="sticky top-0 z-20 px-8 bg-background/50 backdrop-blur-lg border-b border-border/10 h-16 flex items-center" />
			<main className="mx-auto px-4 pt-2 pb-6 flex flex-col gap-4">
				<div className="grid grid-cols-1 gap-6 sm:grid-cols-3 lg:grid-cols-4 px-4">
					{Array.from({ length: 8 }).map((_, i) => (
						<div
							// biome-ignore lint/suspicious/noArrayIndexKey: static skeleton
							key={i}
							className="aspect-square animate-pulse rounded-md bg-white/[0.04]"
							style={{ animationDelay: `${i * 60}ms` }}
						/>
					))}
				</div>
			</main>
		</div>
	);
}
