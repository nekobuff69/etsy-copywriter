import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Upload, Play, Square } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";

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
	userText: string;
	onUserTextChange: (text: string) => void;
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
	userText,
	onUserTextChange,
}: UploadZoneProps) {
	const showHistoryPreview = isHistory && thumbnailUrl;

	return (
		<Card className={`h-[520px] flex flex-col ${showHistoryPreview ? "" : isHistory ? "opacity-60" : ""}`}>
			<CardHeader className="pb-3 border-b border-border/60">
				<CardTitle className="text-base font-medium flex items-center gap-2">
					<Upload className="h-4 w-4 text-primary" />
					Upload
				</CardTitle>
			</CardHeader>
			<CardContent className="flex-1 overflow-hidden flex flex-col pt-4">
				{showHistoryPreview ? (
					<div className="flex-1 flex flex-col items-center space-y-3 overflow-y-auto">
						<img
							src={thumbnailUrl}
							alt="Processed image preview"
							className="mx-auto max-h-48 object-contain rounded-md"
						/>
						<div className="w-full mt-3 space-y-1">
							<Textarea
								value={userText}
								onChange={(e) => onUserTextChange(e.target.value)}
								placeholder="e.g. Hand-painted silk bookmark, Monet's Water Lilies pattern, cotton paper, boho aesthetic. Gift for book lovers."
								rows={3}
								readOnly
								className="resize-none text-sm"
							/>
						</div>
					</div>
				) : (
					<>
						<div className="flex-1 overflow-y-auto">
							<div
								onDrop={onDrop}
								onDragOver={(e) => e.preventDefault()}
								onClick={() => !isHistory && fileInputRef.current?.click()}
								className={`border-2 border-dashed border-border rounded-lg p-8 text-center transition-colors ${
									isHistory
										? "cursor-not-allowed bg-muted"
										: "cursor-pointer hover:bg-secondary/50"
								}`}>
								{previewUrl ? (
									<img
										src={previewUrl}
										alt="Preview"
										className="mx-auto max-h-48 object-contain rounded-md"
									/>
								) : (
									<div className="text-muted-foreground space-y-2">
										<Upload className="h-8 w-8 mx-auto" />
										<p className="text-sm font-medium">Drag & drop or click to upload</p>
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
						<div className="mt-3 space-y-1">
							<Textarea
								value={userText}
								onChange={(e) => onUserTextChange(e.target.value)}
								placeholder="e.g. Hand-painted silk bookmark, Monet's Water Lilies pattern, cotton paper, boho aesthetic. Gift for book lovers."
								rows={3}
								readOnly={isHistory}
								className="resize-none text-sm"
							/>
							<div className={`text-xs text-right ${userText.length > 500 ? 'text-red-500' : userText.length > 400 ? 'text-amber-500' : 'text-muted-foreground'}`}>
								{userText.length}/500
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
