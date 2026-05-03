import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Upload, Play, Square } from "lucide-react";

interface UploadZoneProps {
	file: File | null;
	previewUrl: string | null;
	thumbnailUrl: string | null;
	onDrop: (e: React.DragEvent) => void;
	onFileInput: (e: React.ChangeEvent<HTMLInputElement>) => void;
	onAnalyze: () => void;
	onRunAll: () => void;
	onStop: () => void;
	isLoading: boolean;
	isHistory: boolean;
	fileInputRef: React.RefObject<HTMLInputElement | null>;
}

export function UploadZone({
	file,
	previewUrl,
	thumbnailUrl,
	onDrop,
	onFileInput,
	onAnalyze,
	onRunAll,
	onStop,
	isLoading,
	isHistory,
	fileInputRef,
}: UploadZoneProps) {
	const showHistoryPreview = isHistory && thumbnailUrl;

	return (
		<Card className={`h-[500px] flex flex-col ${showHistoryPreview ? "" : isHistory ? "opacity-60" : ""}`}>
			<CardHeader>
				<CardTitle className="text-base flex items-center gap-2">
					<Upload className="h-4 w-4" />
					Upload
				</CardTitle>
			</CardHeader>
			<CardContent className="flex-1 overflow-hidden flex flex-col">
				{showHistoryPreview ? (
					<div className="flex-1 flex flex-col items-center justify-center space-y-3">
						{/* eslint-disable-next-line @next/next/no-img-element */}
						<img
							src={thumbnailUrl}
							alt="Processed image preview"
							className="mx-auto max-h-48 object-contain rounded"
						/>
						<p className="text-xs text-muted-foreground">Processed image preview</p>
					</div>
				) : (
					<>
						<div className="flex-1 overflow-y-auto">
							<div
								onDrop={onDrop}
								onDragOver={(e) => e.preventDefault()}
								onClick={() => !isHistory && fileInputRef.current?.click()}
								className={`border-2 border-dashed border-border rounded-lg p-6 text-center transition-colors ${
									isHistory
										? "cursor-not-allowed bg-muted"
										: "cursor-pointer hover:bg-accent/50"
								}`}>
								{previewUrl ? (
									<>
										{/* eslint-disable-next-line @next/next/no-img-element */}
										<img
											src={previewUrl}
											alt="Preview"
											className="mx-auto max-h-48 object-contain rounded"
										/>
									</>
								) : (
									<div className="text-muted-foreground space-y-1">
										<Upload className="h-8 w-8 mx-auto" />
										<p className="text-sm">Drag & drop or click to upload</p>
										<p className="text-xs">jpg, png, webp, gif</p>
									</div>
								)}
								<input
									ref={fileInputRef}
									type="file"
									accept="image/jpeg,image/png,image/webp,image/gif"
									className="hidden"
									onChange={onFileInput}
									disabled={isHistory}
								/>
							</div>
						</div>

						<div className="flex flex-wrap gap-2 pt-4 flex-shrink-0">
							<Button
								onClick={onAnalyze}
								disabled={!file || isLoading || isHistory}
								size="sm">
								<Play className="h-4 w-4 mr-1" />
								Analyze
							</Button>
							<Button
								onClick={onRunAll}
								disabled={!file || isLoading || isHistory}
								size="sm">
								<Play className="h-4 w-4 mr-1" />
								Run All
							</Button>
							<Button
								onClick={onStop}
								disabled={!isLoading}
								variant="outline"
								size="sm">
								<Square className="h-4 w-4 mr-1" />
								Stop
							</Button>
						</div>
					</>
				)}
			</CardContent>
		</Card>
	);
}
