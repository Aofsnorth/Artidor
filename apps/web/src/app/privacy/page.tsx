import type { Metadata } from "next";
import { BasePage } from "@/app/base-page";
import {
	Accordion,
	AccordionContent,
	AccordionItem,
	AccordionTrigger,
} from "@/components/ui/accordion";
import { Separator } from "@/components/ui/separator";
import { SOCIAL_LINKS } from "@/lib/site/social";

export const metadata: Metadata = {
	title: "Privacy Policy - Artidor",
	description:
		"Learn how Artidor handles your data and privacy. Our commitment to protecting your information while you edit videos.",
	openGraph: {
		title: "Privacy Policy - Artidor",
		description:
			"Learn how Artidor handles your data and privacy. Our commitment to protecting your information while you edit videos.",
		type: "website",
	},
};

export default function PrivacyPage() {
	return (
		<BasePage
			title="Privacy policy"
			description="Learn how we handle your data and privacy. Contact us if you have any questions."
		>
			<Accordion type="single" collapsible className="w-full">
				<AccordionItem
					value="quick-summary"
					className="rounded-2xl border px-5"
				>
					<AccordionTrigger className="no-underline!">
						Quick summary
					</AccordionTrigger>
					<AccordionContent>
						<h3 className="mb-3 text-lg font-medium">
							Local-first by default — you control what leaves your device.
						</h3>
						<ol className="list-decimal space-y-2 pl-6">
							<li>
								Core editing and exporting happen locally in your browser — we
								never upload your raw media files to our servers
							</li>
							<li>
								On-device AI features (auto captions, frame interpolation) run
								locally in your browser; Arth AI Co-Pilot connects only to the
								AI provider you choose (such as local Ollama, Puter.js, OpenAI,
								or Anthropic)
							</li>
							<li>Artidor does not require an account or login to edit</li>
							<li>
								Projects stay in your browser's IndexedDB unless you explicitly
								back them up to Google Drive or create a share/collaboration
								link
							</li>
							<li>
								We use Vercel Analytics & Speed Insights for anonymized
								page-view and performance metrics — never to track your video
								content or timeline edits
							</li>
							<li>You can clear local data from your browser at any time</li>
							<li>We never sell or monetize your data</li>
						</ol>
						<p className="mt-4">
							Questions? Open an issue on{" "}
							<a
								href={`${SOCIAL_LINKS.github}/issues`}
								target="_blank"
								rel="noopener noreferrer"
								className="text-primary hover:underline"
							>
								GitHub
							</a>
							.
						</p>
					</AccordionContent>
				</AccordionItem>
			</Accordion>

			<section className="flex flex-col gap-3">
				<h2 className="text-2xl font-semibold">How We Handle Your Content</h2>
				<p>
					<strong>
						Core video editing, compositing, and exporting happen locally on
						your device.
					</strong>{" "}
					We do not upload, store, or inspect your raw video or audio files on
					our servers. On-device AI tools such as Whisper-based auto captions
					and RIFE frame interpolation also execute directly in your browser.
				</p>
				<p>
					If you choose to use <strong>Arth (AI Co-Pilot)</strong> with a
					cloud AI provider (such as Puter.js, OpenAI, Anthropic, Google
					Gemini, or OpenRouter), your chat prompts and relevant timeline
					context or sample frames are sent to that provider to fulfill your
					request. If you use a local provider like Ollama, requests stay on
					your machine. Your AI API keys are encrypted locally in your browser
					using AES-GCM.
				</p>
			</section>

			<section className="flex flex-col gap-3">
				<h2 className="text-2xl font-semibold">
					Projects, Cloud Backup & Sharing
				</h2>
				<p>
					Artidor does not require an account to create, edit, or export
					projects. By default, all project data — including timelines, names,
					and thumbnails — is stored locally in your browser using IndexedDB.
				</p>
				<ul className="list-disc space-y-2 pl-6">
					<li>
						<strong>Google Drive Backup (Optional):</strong> If you connect
						Google Drive to save or load projects, OAuth access tokens are
						kept in per-tab <code>sessionStorage</code> rather than persistent{" "}
						<code>localStorage</code>, and files are transferred directly
						between your browser and your Google Drive account.
					</li>
					<li>
						<strong>Share Links & Collaboration Rooms (Optional):</strong>{" "}
						When you generate a shareable project link or start a live
						collaboration room, the shared project snapshot or ephemeral room
						presence state is stored via Upstash Redis so invited participants
						can view or join. Collaboration rooms automatically expire after
						inactivity, and shared links can be password-protected.
					</li>
				</ul>
			</section>

			<section className="flex flex-col gap-3">
				<h2 className="text-2xl font-semibold">Analytics</h2>
				<p>
					We use{" "}
					<a
						href="https://vercel.com/analytics"
						target="_blank"
						rel="noopener noreferrer"
						className="text-primary hover:underline"
					>
						Vercel Analytics
					</a>{" "}
					and{" "}
					<a
						href="https://vercel.com/docs/speed-insights"
						target="_blank"
						rel="noopener noreferrer"
						className="text-primary hover:underline"
					>
						Vercel Speed Insights
					</a>{" "}
					for anonymized visitor counts and Web Vitals performance telemetry.
					We do not track your timeline contents, media assets, or AI prompts.
				</p>
			</section>

			<section className="flex flex-col gap-3">
				<h2 className="text-2xl font-semibold">Local Storage & Cookies</h2>
				<p>We use browser local storage, session storage, and IndexedDB to:</p>
				<ul className="list-disc space-y-2 pl-6">
					<li>Save your projects and media cache locally on your device</li>
					<li>
						Remember your editor preferences, keybindings, and encrypted AI
						provider configurations
					</li>
					<li>
						Hold temporary per-tab session state (such as optional Google
						Drive access tokens)
					</li>
				</ul>
				<p>
					All local browser data stays on your device and can be cleared at
					any time through your browser settings.
				</p>
			</section>

			<section className="flex flex-col gap-3">
				<h2 className="text-2xl font-semibold">Third-Party Services</h2>
				<p>
					Depending on which features you use, Artidor interacts with these
					services:
				</p>
				<ul className="list-disc space-y-2 pl-6">
					<li>
						<strong>Vercel:</strong> Hosting, content delivery, and anonymized
						analytics / Web Vitals
					</li>
					<li>
						<strong>Upstash Redis:</strong> Rate limiting and ephemeral state
						for optional share links and collaboration rooms
					</li>
					<li>
						<strong>Pexels & Freesound (Optional):</strong> Proxied search for
						stock videos and audio when you browse the built-in stock library
					</li>
					<li>
						<strong>Google Drive (Optional):</strong> User-initiated cloud
						project backup and import
					</li>
					<li>
						<strong>AI Providers (Optional):</strong> User-selected LLM
						endpoints (Ollama, Puter.js, OpenAI, Anthropic, Gemini,
						OpenRouter) when using Arth AI Co-Pilot
					</li>
				</ul>
			</section>

			<section className="flex flex-col gap-3">
				<h2 className="text-2xl font-semibold">Your Rights</h2>
				<p>You have complete control over your data:</p>
				<ul className="list-disc space-y-2 pl-6">
					<li>No account is required to use Artidor</li>
					<li>
						Clear browser storage (IndexedDB / localStorage) to remove all
						locally saved projects and settings
					</li>
					<li>
						Auto-learn style profiling for Arth is opt-in (off by default) and
						stored locally
					</li>
				</ul>
			</section>

			<section className="flex flex-col gap-3">
				<h2 className="text-2xl font-semibold">Open Source Transparency</h2>
				<p>
					Artidor is completely open source. You can review our code, see
					exactly how we handle data, and even self-host the application if you
					prefer.
				</p>
				<p>
					View our source code on{" "}
					<a
						href={SOCIAL_LINKS.github}
						target="_blank"
						rel="noopener noreferrer"
						className="text-primary hover:underline"
					>
						GitHub
					</a>
					.
				</p>
			</section>

			<section className="flex flex-col gap-3">
				<h2 className="text-2xl font-semibold">Contact Us</h2>
				<p>Questions about this privacy policy or how we handle your data?</p>
				<p>
					Open an issue on our{" "}
					<a
						href={`${SOCIAL_LINKS.github}/issues`}
						target="_blank"
						rel="noopener noreferrer"
						className="text-primary hover:underline"
					>
						GitHub repository
					</a>{" "}
					or start a thread in{" "}
					<a
						href={`${SOCIAL_LINKS.github}/discussions`}
						target="_blank"
						rel="noopener noreferrer"
						className="text-primary hover:underline"
					>
						GitHub Discussions
					</a>
					.
				</p>
			</section>

			<Separator />

			<p className="text-muted-foreground text-sm">
				Last updated: March 15, 2026
			</p>
		</BasePage>
	);
}
