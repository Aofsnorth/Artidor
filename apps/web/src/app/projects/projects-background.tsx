/** Neutral workspace backdrop keeps project thumbnails as the focal point. */
export function ProjectsBackground() {
	return <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-0 bg-background" />;
}
