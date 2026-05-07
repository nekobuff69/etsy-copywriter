import { Button } from "@/components/ui/button";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { ClipboardList, RefreshCw, Square, Copy } from "lucide-react";
import type { CopyWritingType, ImageAnalysisType } from "@/lib/definitions";
import { getStoredSettings } from "@/lib/settings";
import { shortModelName } from "@/lib/display";

interface CopyZoneProps {
	displayCopy: Partial<CopyWritingType> | null;
	updateCopyField: <K extends keyof CopyWritingType>(
		field: K,
		value: CopyWritingType[K],
	) => void;
	onGenerateCopy: (data?: ImageAnalysisType) => void;
	onCopyAll: () => void;
	onCopyText: (text: string) => void;
	onStopCopy: () => void;
	copyLoading: boolean;
	isHistory: boolean;
	hasAnalysis: boolean;
	copyModel?: string | null;
}

export function CopyZone({
	displayCopy,
	updateCopyField,
	onGenerateCopy,
	onCopyAll,
	onCopyText,
	onStopCopy,
	copyLoading,
	isHistory,
	hasAnalysis,
	copyModel,
}: CopyZoneProps) {
	if (!displayCopy) {
		return (
			<Card className="h-[520px] flex flex-col">
				<CardHeader className="pb-3 border-b border-border/60">
					<CardTitle className="text-base font-medium flex items-center gap-2">
						Copy
						<span className="kami-tag font-mono truncate max-w-[180px]">
							{shortModelName(copyModel ?? getStoredSettings().copy.model)}
						</span>
					</CardTitle>
				</CardHeader>
				<CardContent className="flex-1 flex items-center justify-center">
					<p className="text-sm text-muted-foreground text-center">
						Generate copy from analysis to see results.
					</p>
				</CardContent>
			</Card>
		);
	}

	return (
		<Card className="h-[520px] flex flex-col">
			<CardHeader className="pb-3 border-b border-border/60">
				<CardTitle className="text-base font-medium flex items-center gap-2">
					Copy
					<span className="kami-tag font-mono truncate max-w-[180px]">
						{shortModelName(copyModel ?? getStoredSettings().copy.model)}
					</span>
				</CardTitle>
			</CardHeader>
			<CardContent className="flex-1 overflow-hidden flex flex-col pt-4">
				<div className="flex-1 overflow-y-auto space-y-4 pr-1">
					<div className="space-y-2">
						{(["option1", "option2", "option3"] as const).map((opt, i) => (
							<div key={opt}>
								<label className="block text-xs font-medium text-muted-foreground uppercase tracking-[0.4px] mb-1">
									Title {i + 1}
								</label>
								<div className="flex gap-2 mt-1">
									<Input
										value={displayCopy.titles?.[opt] ?? ""}
										onChange={(e) =>
											updateCopyField("titles", {
												option1: displayCopy.titles?.option1 ?? "",
												option2: displayCopy.titles?.option2 ?? "",
												option3: displayCopy.titles?.option3 ?? "",
												[opt]: e.target.value,
											} as CopyWritingType["titles"])
										}
										readOnly={isHistory}
									/>
									<Button
										variant="outline"
										size="icon"
										className="shrink-0"
										onClick={() => onCopyText(displayCopy.titles?.[opt] ?? "")}>
										<Copy className="h-4 w-4" />
									</Button>
								</div>
							</div>
						))}
					</div>

					<div>
						<label className="block text-xs font-medium text-muted-foreground uppercase tracking-[0.4px] mb-1">
							Tags
						</label>
						<div className="flex gap-2 mt-1">
							<Textarea
								value={(displayCopy.tags ?? []).join(", ")}
								onChange={(e) =>
									updateCopyField(
										"tags",
										e.target.value.split(",").map((s) => s.trim()),
									)
								}
								readOnly={isHistory}
								rows={3}
							/>
							<Button
								variant="outline"
								size="icon"
								className="shrink-0"
								onClick={() => onCopyText((displayCopy.tags ?? []).join(", "))}>
								<Copy className="h-4 w-4" />
							</Button>
						</div>
					</div>

					<div>
						<label className="block text-xs font-medium text-muted-foreground uppercase tracking-[0.4px] mb-1">
							Description
						</label>
						<div className="flex gap-2 mt-1">
							<Textarea
								value={displayCopy.description ?? ""}
								onChange={(e) => updateCopyField("description", e.target.value)}
								readOnly={isHistory}
								rows={6}
							/>
							<Button
								variant="outline"
								size="icon"
								className="shrink-0"
								onClick={() => onCopyText(displayCopy.description ?? "")}>
								<Copy className="h-4 w-4" />
							</Button>
						</div>
					</div>
				</div>

				<div className="flex flex-wrap gap-2 pt-4 flex-shrink-0 border-t border-border/60 mt-2">
					<Button onClick={onCopyAll} size="sm">
						<ClipboardList className="h-4 w-4 mr-1" />
						Copy All
					</Button>
					<Button
						onClick={() => onGenerateCopy()}
						disabled={copyLoading || !hasAnalysis || isHistory}
						variant="outline"
						size="sm">
						<RefreshCw className="h-4 w-4 mr-1" />
						Regenerate
					</Button>
					{copyLoading && (
						<Button
							onClick={onStopCopy}
							variant="destructive"
							size="sm">
							<Square className="h-4 w-4 mr-1" />
							Stop
						</Button>
					)}
				</div>
			</CardContent>
		</Card>
	);
}
