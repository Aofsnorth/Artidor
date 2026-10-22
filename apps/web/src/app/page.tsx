import { Hero } from "@/components/landing/hero";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { AIShowcaseSection } from "@/components/landing/ai-showcase";
import { FeaturesSection } from "@/components/landing/features-section";
import { HowItWorksSection } from "@/components/landing/how-it-works-section";
import { PledgeSection } from "@/components/landing/pledge-section";
import { CtaSection } from "@/components/landing/cta-section";
import { PageShell } from "@/components/landing/page-shell";
import { WhatsNewCard } from "@/components/whats-new/whats-new-card";
import { AiDisclaimerBanner } from "@/components/landing/ai-disclaimer-banner";
import { LanguageSwitcher } from "@/components/language-switcher";
import type { Metadata } from "next";
import { SITE_URL } from "@/lib/site/brand";

export const metadata: Metadata = {
	alternates: {
		canonical: SITE_URL,
	},
};

export default async function Home() {
	return (
		<PageShell variant="marketing">
			{/* WCAG 2.4.1 Skip Link: first focusable element on the page */}
			<a
				href="#main-content"
				className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:inline-flex focus:min-h-11 focus:items-center focus:rounded-[3px] focus:border focus:border-[#141413] focus:bg-[#F4F1EA] focus:px-4 focus:py-2 focus:font-mono focus:text-xs focus:font-semibold focus:uppercase focus:tracking-[0.14em] focus:text-[#141413] focus:shadow-beautiful-md"
			>
				Skip to main content
			</a>
			<AiDisclaimerBanner />
			<Header variant="editorial" />
			<main id="main-content" tabIndex={-1} className="flex flex-col focus:outline-hidden">
				<Hero />
				<AIShowcaseSection />
				<FeaturesSection />
				<HowItWorksSection />
				<PledgeSection />
				<CtaSection />
			</main>
			<Footer variant="editorial" />
			<WhatsNewCard />
			<div className="fixed bottom-4 right-4 z-40">
				<LanguageSwitcher />
			</div>
		</PageShell>
	);
}
