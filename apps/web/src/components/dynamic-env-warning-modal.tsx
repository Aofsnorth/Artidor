"use client";

import dynamic from "next/dynamic";

const EnvWarningModal = dynamic(
	() => import("@/components/env-warning-modal").then((m) => m.EnvWarningModal),
	{ ssr: false },
);

export function DynamicEnvWarningModal() {
	return <EnvWarningModal isMissing />;
}
