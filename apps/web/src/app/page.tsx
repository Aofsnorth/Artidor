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
			<AiDisclaimerBanner />
			<Header />
			<main className="flex flex-col">
				<Hero />
				<AIShowcaseSection />
				<FeaturesSection />
				<HowItWorksSection />
				<PledgeSection />
				<CtaSection />
			</main>
			<Footer />
			<WhatsNewCard />
			<div className="fixed bottom-4 right-4 z-50">
				<LanguageSwitcher />
			</div>
		</PageShell>
	);
}
