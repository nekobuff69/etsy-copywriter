import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ClipboardList, RefreshCw, Square, Copy } from "lucide-react";
import type { CopyWritingType, ImageAnalysisType } from "@/lib/definitions";

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
}: CopyZoneProps) {
	if (!displayCopy) {
		return (
			<Card>
				<CardHeader>
					<CardTitle className="text-base">Copy</CardTitle>
				</CardHeader>
				<CardContent>
					<p className="text-sm text-muted-foreground">
						Generate copy from analysis to see results.
					</p>
				</CardContent>
			</Card>
		);
	}

	return (
		<Card>
			<CardHeader>
				<CardTitle className="text-base">Copy</CardTitle>
			</CardHeader>
			<CardContent>
				<div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
					<div className="space-y-2">
						{(["option1", "option2", "option3"] as const).map((opt, i) => (
							<div key={opt}>
								<Label className="text-xs">Title {i + 1}</Label>
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
						<Label className="text-xs">Tags</Label>
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
						<Label className="text-xs">Description</Label>
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

					<div className="flex flex-wrap gap-2 pt-2">
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
				</div>
			</CardContent>
		</Card>
	);
}
