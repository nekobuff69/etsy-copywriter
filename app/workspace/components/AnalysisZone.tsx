import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { ClipboardList, RefreshCw, Square } from "lucide-react";
import type { ImageAnalysisType } from "@/lib/definitions";
import { getStoredSettings } from "@/lib/settings";
import { shortModelName } from "@/lib/display";

interface AnalysisZoneProps {
	displayAnalysis: Partial<ImageAnalysisType> | null;
	updateAnalysisField: <K extends keyof ImageAnalysisType>(
		field: K,
		value: ImageAnalysisType[K],
	) => void;
	onGenerateCopy: (data?: ImageAnalysisType) => void;
	onRegenerateAnalysis: () => void;
	onStopAnalysis: () => void;
	analysisLoading: boolean;
	copyLoading: boolean;
	isHistory: boolean;
	hasFile: boolean;
	visionModel?: string | null;
}


function Field({ children, label }: { children: ReactNode; label: string }) {
	return (
		<div>
			<label className="block text-xs font-medium text-muted-foreground uppercase tracking-[0.4px] mb-1">
				{label}
			</label>
			{children}
		</div>
	);
}

export function AnalysisZone({
	displayAnalysis,
	updateAnalysisField,
	onGenerateCopy,
	onRegenerateAnalysis,
	onStopAnalysis,
	analysisLoading,
	copyLoading,
	isHistory,
	hasFile,
	visionModel,
}: AnalysisZoneProps) {
	if (!displayAnalysis) {
		return (
			<Card className="h-[520px] flex flex-col">
				<CardHeader className="pb-3 border-b border-border/60">
					<CardTitle className="text-base font-medium flex items-center gap-2">
						Analysis
						<span className="kami-tag font-mono truncate max-w-[180px]">
							{shortModelName(getStoredSettings().vision.model)}
						</span>
					</CardTitle>
				</CardHeader>
				<CardContent className="flex-1 flex items-center justify-center">
					<p className="text-sm text-muted-foreground text-center">
						Upload an image and analyze to see results.
					</p>
				</CardContent>
			</Card>
		);
	}

	return (
		<Card className="h-[520px] flex flex-col">
			<CardHeader className="pb-3 border-b border-border/60">
				<CardTitle className="text-base font-medium flex items-center gap-2">
					Analysis
					<span className="kami-tag font-mono truncate max-w-[180px]">
						{shortModelName(visionModel ?? getStoredSettings().vision.model)}
					</span>
				</CardTitle>
			</CardHeader>
			<CardContent className="flex-1 overflow-hidden flex flex-col pt-4">
				<div className="flex-1 overflow-y-auto space-y-4 pr-1">
					<Field label="Subject">
						<Textarea
							value={displayAnalysis?.subject ?? ""}
							onChange={(e) =>
								updateAnalysisField("subject" as keyof ImageAnalysisType, e.target.value as ImageAnalysisType[keyof ImageAnalysisType])
							}
							readOnly={isHistory}
							rows={2}
						/>
					</Field>
					<Field label="Product Type">
						<Input
							value={displayAnalysis?.product_type ?? ""}
							onChange={(e) =>
								updateAnalysisField("product_type" as keyof ImageAnalysisType, e.target.value as ImageAnalysisType[keyof ImageAnalysisType])
							}
							readOnly={isHistory}
						/>
					</Field>
					<Field label="Medium">
						<Input
							value={displayAnalysis?.medium ?? ""}
							onChange={(e) =>
								updateAnalysisField("medium" as keyof ImageAnalysisType, e.target.value as ImageAnalysisType[keyof ImageAnalysisType])
							}
							readOnly={isHistory}
						/>
					</Field>
					<Field label="Artistic Style">
						<Input
							value={displayAnalysis?.artistic_style ?? ""}
							onChange={(e) =>
								updateAnalysisField("artistic_style" as keyof ImageAnalysisType, e.target.value as ImageAnalysisType[keyof ImageAnalysisType])
							}
							readOnly={isHistory}
						/>
					</Field>
					<Field label="Primary Colors">
						<Textarea
							value={(displayAnalysis?.primary_colors ?? []).join(", ")}
							onChange={(e) =>
								updateAnalysisField("primary_colors" as keyof ImageAnalysisType, e.target.value.split(",").map((s: string) => s.trim()) as ImageAnalysisType[keyof ImageAnalysisType])
							}
							readOnly={isHistory}
							rows={2}
						/>
					</Field>
					<Field label="Vibe Keywords">
						<Textarea
							value={(displayAnalysis?.vibe_keywords ?? []).join(", ")}
							onChange={(e) =>
								updateAnalysisField("vibe_keywords" as keyof ImageAnalysisType, e.target.value.split(",").map((s: string) => s.trim()) as ImageAnalysisType[keyof ImageAnalysisType])
							}
							readOnly={isHistory}
							rows={2}
						/>
					</Field>
				</div>

				<div className="flex flex-wrap gap-2 pt-4 flex-shrink-0 border-t border-border/60 mt-2">
					<Button
						onClick={() => onGenerateCopy()}
						disabled={copyLoading || !displayAnalysis || isHistory}
						size="sm">
						<ClipboardList className="h-4 w-4 mr-1" />
						Generate Copy
					</Button>
					<Button
						onClick={onRegenerateAnalysis}
						disabled={analysisLoading || !hasFile || isHistory}
						variant="outline"
						size="sm">
						<RefreshCw className="h-4 w-4 mr-1" />
						Regenerate
					</Button>
					{analysisLoading && (
						<Button
							onClick={onStopAnalysis}
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
