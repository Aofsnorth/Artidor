"use client";

import { PanelView } from "@/components/editor/panels/assets/views/base-panel";
import { useI18n } from "@/lib/i18n";

export function TemplatesView() {
	const { t } = useI18n();

	return (
		<PanelView title={t("catalog.titleTemplates")}>
			<div className="flex flex-col items-center justify-center gap-3 px-4 py-12 text-center">
				<div className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-[10px] font-medium uppercase tracking-wider text-white/50">
					{t("templates.comingSoon.badge")}
				</div>
				<p className="max-w-[16rem] text-sm text-white/70">
					{t("templates.comingSoon.message")}
				</p>
			</div>
		</PanelView>
	);
}
