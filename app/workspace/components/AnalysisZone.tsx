import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ClipboardList, RefreshCw, Square } from "lucide-react";
import type { ImageAnalysisType } from "@/lib/definitions";
import { getStoredSettings } from "@/lib/settings";

interface AnalysisZoneProps {
	displayAnalysis: Partial<ImageAnalysisType> | null;
	updateAnalysisField: <K extends keyof ImageAnalysisType>(
		section: K,
		field: keyof ImageAnalysisType[K],
		value: unknown,
	) => void;
	onGenerateCopy: (data?: ImageAnalysisType) => void;
	onRegenerateAnalysis: () => void;
	onStopAnalysis: () => void;
	analysisLoading: boolean;
	copyLoading: boolean;
	isHistory: boolean;
	hasFile: boolean;
}

function Section({ children, title }: { children: ReactNode; title: string }) {
	return (
		<div>
			<h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
				{title}
			</h3>
			<div className="space-y-2">{children}</div>
		</div>
	);
}

function Field({ children, label }: { children: ReactNode; label: string }) {
	return (
		<div>
			<Label className="text-xs">{label}</Label>
			<div className="mt-1">{children}</div>
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
}: AnalysisZoneProps) {
	if (!displayAnalysis) {
		return (
			<Card>
				<CardHeader>
					<CardTitle className="text-base">Analysis</CardTitle>
				</CardHeader>
				<CardContent>
					<p className="text-sm text-muted-foreground">
						Upload an image and analyze to see results.
					</p>
				</CardContent>
			</Card>
		);
	}

	return (
		<Card>
			<CardHeader>
				<CardTitle className="text-base">Analysis</CardTitle>
			</CardHeader>
			<CardContent>
				<div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
					<Section title="Core Attributes">
						<Field label="Subject">
							<Textarea
								value={displayAnalysis.core_attributes?.subject ?? ""}
								onChange={(e) =>
									updateAnalysisField("core_attributes", "subject", e.target.value)
								}
								readOnly={isHistory}
								rows={2}
							/>
						</Field>
						<Field label="Orientation">
							<Input
								value={displayAnalysis.core_attributes?.orientation ?? ""}
								onChange={(e) =>
									updateAnalysisField("core_attributes", "orientation", e.target.value)
								}
								readOnly={isHistory}
							/>
						</Field>
						<Field label="Composition">
							<Textarea
								value={displayAnalysis.core_attributes?.composition ?? ""}
								onChange={(e) =>
									updateAnalysisField("core_attributes", "composition", e.target.value)
								}
								readOnly={isHistory}
								rows={2}
							/>
						</Field>
					</Section>

					<Section title="Technical Specs">
						<Field label="Medium">
							<Input
								value={displayAnalysis.technical_specs?.medium ?? ""}
								onChange={(e) =>
									updateAnalysisField("technical_specs", "medium", e.target.value)
								}
								readOnly={isHistory}
							/>
						</Field>
						<Field label="Surface">
							<Input
								value={displayAnalysis.technical_specs?.surface ?? ""}
								onChange={(e) =>
									updateAnalysisField("technical_specs", "surface", e.target.value)
								}
								readOnly={isHistory}
							/>
						</Field>
						<Field label="Textures">
							<Textarea
								value={(displayAnalysis.technical_specs?.textures ?? []).join(", ")}
								onChange={(e) =>
									updateAnalysisField(
										"technical_specs",
										"textures",
										e.target.value.split(",").map((s) => s.trim()),
									)
								}
								readOnly={isHistory}
								rows={2}
							/>
						</Field>
						<Field label="Visible Tools">
							<Textarea
								value={(displayAnalysis.technical_specs?.visible_tools ?? []).join(", ")}
								onChange={(e) =>
									updateAnalysisField(
										"technical_specs",
										"visible_tools",
										e.target.value.split(",").map((s) => s.trim()),
									)
								}
								readOnly={isHistory}
								rows={2}
							/>
						</Field>
					</Section>

					<Section title="Visual Identity">
						<Field label="Primary Colors">
							<Textarea
								value={(displayAnalysis.visual_identity?.primary_colors ?? []).join(", ")}
								onChange={(e) =>
									updateAnalysisField(
										"visual_identity",
										"primary_colors",
										e.target.value.split(",").map((s) => s.trim()),
									)
								}
								readOnly={isHistory}
								rows={2}
							/>
						</Field>
						<Field label="Lighting Vibe">
							<Textarea
								value={displayAnalysis.visual_identity?.lighting_vibe ?? ""}
								onChange={(e) =>
									updateAnalysisField("visual_identity", "lighting_vibe", e.target.value)
								}
								readOnly={isHistory}
								rows={2}
							/>
						</Field>
						<Field label="Artistic Style">
							<Textarea
								value={displayAnalysis.visual_identity?.artistic_style ?? ""}
								onChange={(e) =>
									updateAnalysisField("visual_identity", "artistic_style", e.target.value)
								}
								readOnly={isHistory}
								rows={2}
							/>
						</Field>
					</Section>

					<Section title="Marketing Hooks">
						<Field label="Emotional Keywords">
							<Textarea
								value={(
									displayAnalysis.marketing_hooks?.emotional_keywords ?? []
								).join(", ")}
								onChange={(e) =>
									updateAnalysisField(
										"marketing_hooks",
										"emotional_keywords",
										e.target.value.split(",").map((s) => s.trim()),
									)
								}
								readOnly={isHistory}
								rows={2}
							/>
						</Field>
						<Field label="Symbolism">
							<Textarea
								value={displayAnalysis.marketing_hooks?.symbolism ?? ""}
								onChange={(e) =>
									updateAnalysisField("marketing_hooks", "symbolism", e.target.value)
								}
								readOnly={isHistory}
								rows={2}
							/>
						</Field>
						<Field label="Suggested Placement">
							<Textarea
								value={(
									displayAnalysis.marketing_hooks?.suggested_placement ?? []
								).join(", ")}
								onChange={(e) =>
									updateAnalysisField(
										"marketing_hooks",
										"suggested_placement",
										e.target.value.split(",").map((s) => s.trim()),
									)
								}
								readOnly={isHistory}
								rows={2}
							/>
						</Field>
						<Field label="Unique Details">
							<Textarea
								value={
									displayAnalysis.marketing_hooks?.unique_handcrafted_details ?? ""
								}
								onChange={(e) =>
									updateAnalysisField(
										"marketing_hooks",
										"unique_handcrafted_details",
										e.target.value,
									)
								}
								readOnly={isHistory}
								rows={2}
							/>
						</Field>
					</Section>

					<div className="flex flex-wrap gap-2 pt-2">
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
				</div>
			</CardContent>
			<div className="px-6 pb-4">
				<Badge variant="secondary" className="text-[10px] font-mono">
					Vision: {getStoredSettings().vision.model}
				</Badge>
			</div>
		</Card>
	);
}
