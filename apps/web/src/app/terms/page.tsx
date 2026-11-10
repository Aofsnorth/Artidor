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
	title: "terms-of-service - Artidor",
	description:
		"Artidor's terms-of-service. Fair, transparent terms for our free and open-source video editor.",
	openGraph: {
		title: "terms-of-service - Artidor",
		description:
			"Artidor's terms-of-service. Fair, transparent terms for our free and open-source video editor.",
		type: "website",
	},
};

export default function TermsPage() {
	return (
		<BasePage
			title="Terms of service"
			description="Fair and transparent terms for our free, open-source video editor. Contact us if you have any questions."
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
							You own your content, we own nothing.
						</h3>
						<ol className="list-decimal space-y-2 pl-6">
							<li>
								Core editing and rendering run locally in your browser — your
								media files stay on your device
							</li>
							<li>We never claim ownership of your content</li>
							<li>
								Free for personal and commercial use with no watermarks or
								restrictions
							</li>
							<li>
								You're responsible for how you use it and any third-party AI or
								cloud providers you connect — don't break the law
							</li>
							<li>
								Service provided "as is" — we can't guarantee perfect uptime
							</li>
							<li>
								Open source means you can review our code and self-host if
								needed
							</li>
							<li>
								No account required — your exported videos are always yours
							</li>
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
				<h2 className="text-2xl font-semibold">Your Content, Your Rights</h2>
				<p>
					<strong>You own everything you create.</strong> Core editing and
					rendering happen locally on your device. We make no claims to
					ownership, licensing, or rights over your videos, projects, or any
					content you create using Artidor.
				</p>
				<ul className="list-disc space-y-2 pl-6">
					<li>
						Your local project files stay on your device unless you explicitly
						share or back them up
					</li>
					<li>You retain all intellectual property rights to your content</li>
					<li>You can export and use your content however you choose</li>
					<li>No watermarks, no licensing restrictions from Artidor</li>
				</ul>
			</section>

			<section className="flex flex-col gap-3">
				<h2 className="text-2xl font-semibold">How You Can Use Artidor</h2>
				<p>Artidor is free for personal and commercial use. You can:</p>
				<ul className="list-disc space-y-2 pl-6">
					<li>
						Create videos for personal, educational, or commercial purposes
					</li>
					<li>Use Artidor for client work and paid projects</li>
					<li>Share and distribute videos created with Artidor</li>
					<li>
						Modify and distribute the Artidor software (under MIT license)
					</li>
				</ul>
				<p>
					You're responsible for how you use Artidor and the content you create.
					Don't use it for anything illegal in your jurisdiction.
				</p>
			</section>

			<section className="flex flex-col gap-3">
				<h2 className="text-2xl font-semibold">
					AI & Optional Cloud Features
				</h2>
				<p>
					On-device AI features (such as auto captions and frame
					interpolation) run directly in your browser. If you use{" "}
					<strong>Arth (AI Co-Pilot)</strong> with external AI providers
					(such as Puter.js, OpenAI, Anthropic, Gemini, OpenRouter, or custom
					endpoints), or if you use optional Google Drive backup, stock media
					search (Pexels/Freesound), or project share/collaboration links,
					your use of those third-party services is subject to their
					respective terms and policies. All AI and cloud features are
					optional.
				</p>
			</section>

			<section className="flex flex-col gap-3">
				<h2 className="text-2xl font-semibold">Service</h2>
				<p>
					Artidor does not currently require an account. The service is provided
					"as is" without warranties. While we strive for reliability, we can't
					guarantee uninterrupted service.
				</p>
			</section>

			<section className="flex flex-col gap-3">
				<h2 className="text-2xl font-semibold">Open Source Benefits</h2>
				<p>Because Artidor is open source, you have additional rights:</p>
				<ul className="list-disc space-y-2 pl-6">
					<li>Review our code to see exactly how we handle your data</li>
					<li>Self-host Artidor on your own servers</li>
					<li>Modify the software to suit your needs</li>
					<li>Contribute improvements back to the community</li>
				</ul>
				<p>
					View our source code and license on{" "}
					<a
						href={SOCIAL_LINKS.github}
						target="_blank"
						rel="noopener"
						className="text-primary hover:underline"
					>
						GitHub
					</a>
					.
				</p>
			</section>

			<section className="flex flex-col gap-3">
				<h2 className="text-2xl font-semibold">Limitations and Liability</h2>
				<p>
					Artidor is provided free of charge. To the extent permitted by law:
				</p>
				<ul className="list-disc space-y-2 pl-6">
					<li>We're not liable for any loss of data or content</li>
					<li>
						Projects are stored in your browser and may be lost if you clear
						browser data
					</li>
					<li>We're not responsible for how you use the service</li>
					<li>Our liability is limited to the maximum extent allowed by law</li>
				</ul>
				<p>
					Since your content stays on your device, we have no way to recover
					lost projects. Consider exporting important videos when finished
					editing.
				</p>
			</section>

			<section className="flex flex-col gap-3">
				<h2 className="text-2xl font-semibold">Service Changes</h2>
				<p>We may update Artidor and these terms:</p>
				<ul className="list-disc space-y-2 pl-6">
					<li>We'll notify you of significant changes to these terms</li>
					<li>Continued use means you accept any updates</li>
					<li>You can always self-host an older version if you prefer</li>
					<li>Major changes will be discussed with the community on GitHub</li>
				</ul>
			</section>

			<section className="flex flex-col gap-3">
				<h2 className="text-2xl font-semibold">Stopping Use</h2>
				<p>You can stop using Artidor at any time:</p>
				<ul className="list-disc space-y-2 pl-6">
					<li>Clear your browser data to remove local projects</li>
				</ul>
			</section>

			<section className="flex flex-col gap-3">
				<h2 className="text-2xl font-semibold">Contact Us</h2>
				<p>Questions about these terms or need to report an issue?</p>
				<p>
					Contact us by opening an issue on our{" "}
					<a
						href={`${SOCIAL_LINKS.github}/issues`}
						target="_blank"
						rel="noopener noreferrer"
						className="text-primary hover:underline"
					>
						GitHub repository
					</a>{" "}
					or starting a thread in{" "}
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
				<p>
					These terms are governed by applicable law in your jurisdiction. We
					prefer to resolve disputes through friendly discussion in our
					open-source community.
				</p>
			</section>
			<Separator />
			<p className="text-muted-foreground text-sm">
				Last updated: March 15, 2026
			</p>
		</BasePage>
	);
}
