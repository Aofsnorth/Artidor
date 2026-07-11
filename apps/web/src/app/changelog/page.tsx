import type { Metadata } from "next";
import { headers } from "next/headers";
import { BasePage } from "@/app/base-page";
import { Separator } from "@/components/ui/separator";
import { normalizeLocale, translate } from "@/lib/i18n";
import {
	type Release as ReleaseType,
	getSortedReleases,
} from "@/lib/changelog/utils";
import {
	ReleaseArticle,
	ReleaseMeta,
	ReleaseTitle,
	ReleaseDescription,
	ReleaseChanges,
} from "@/lib/changelog/components/release";

export async function generateMetadata(): Promise<Metadata> {
	const h = await headers();
	const locale = normalizeLocale(h.get("accept-language"));
	return {
		title: translate({ locale, key: "changelog.title" }),
		description: translate({ locale, key: "changelog.description" }),
		openGraph: {
			title: translate({ locale, key: "changelog.openGraphTitle" }),
			description: translate({
				locale,
				key: "changelog.openGraphDescription",
			}),
			type: "website",
			images: [
				{
					url: "/open-graph/changlog.jpg",
					width: 1200,
					height: 630,
					alt: translate({ locale, key: "changelog.openGraphImageAlt" }),
				},
			],
		},
		twitter: {
			card: "summary_large_image",
			title: translate({ locale, key: "changelog.twitterTitle" }),
			description: translate({ locale, key: "changelog.twitterDescription" }),
			images: ["/open-graph/changlog.jpg"],
		},
	};
}

export default async function ChangelogPage() {
	const h = await headers();
	const locale = normalizeLocale(h.get("accept-language"));
	const releases = getSortedReleases();

	return (
		<BasePage
			title={translate({ locale, key: "changelog.pageTitle" })}
			description={translate({ locale, key: "changelog.pageDescription" })}
		>
			<div className="mx-auto w-full max-w-3xl">
				<div className="relative">
					<div
						aria-hidden
						className="absolute top-2 bottom-0 left-1.25 w-px bg-border hidden sm:block"
					/>

					<div className="flex flex-col">
						{releases.map((release: ReleaseType, releaseIndex: number) => (
							<div key={release.version} className="flex flex-col">
								<ReleaseEntry release={release} />
								{releaseIndex < releases.length - 1 && (
									<Separator className="my-10 sm:ml-1.5" />
								)}
							</div>
						))}
					</div>
				</div>
			</div>
		</BasePage>
	);
}

function ReleaseEntry({ release }: { release: ReleaseType }) {
	return (
		<ReleaseArticle variant="list" isLatest={release.isLatest}>
			<ReleaseMeta release={release} />
			<div className="flex flex-col gap-4">
				<ReleaseTitle as="h2" href={`/changelog/${release.version}`}>
					{release.title}
				</ReleaseTitle>
				{release.description && (
					<ReleaseDescription>{release.description}</ReleaseDescription>
				)}
			</div>
			<ReleaseChanges release={release} />
		</ReleaseArticle>
	);
}
