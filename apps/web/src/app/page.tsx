import { Hero } from "@/components/landing/hero";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import type { Metadata } from "next";
import { SITE_URL } from "@/lib/site/brand";
import { PageTransition } from "@/components/page-transition";

export const metadata: Metadata = {
	alternates: {
		canonical: SITE_URL,
	},
};

export default async function Home() {
	return (
		<PageTransition className="flex flex-col min-h-screen">
			<Header />
			<Hero />
			<Footer />
		</PageTransition>
	);
}
