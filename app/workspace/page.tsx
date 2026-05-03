"use client";

import { useWorkspace } from "./hooks/useWorkspace";
import { Header } from "./components/Header";
import { UploadZone } from "./components/UploadZone";
import { AnalysisZone } from "./components/AnalysisZone";
import { CopyZone } from "./components/CopyZone";
import { DebugPanel } from "./components/DebugPanel";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Plus, RefreshCw } from "lucide-react";

export default function WorkspacePage() {
	const { upload, analysis, copy, history, global, sessionNav } = useWorkspace();

	return (
		<div className="min-h-screen bg-background text-foreground">
			{/* Sub-header with page-specific actions */}
			<div className="border-b px-4 py-2 flex items-center justify-between">
				<Header isHistory={global.isHistory} sessionNav={sessionNav} />
				<Button variant="outline" size="sm" onClick={history.startNewSession}>
					<Plus className="h-4 w-4 mr-1" />
					New Session
				</Button>
			</div>

			<main className="flex-1 p-4 overflow-y-auto h-[calc(100vh-110px)]">
				{global.error && (
					<Alert variant="destructive" className="mb-4">
						<AlertDescription>{global.error}</AlertDescription>
					</Alert>
				)}

				{global.isLoading && (
					<div className="mb-4 space-y-2">
						<div className="flex items-center gap-2 text-sm text-muted-foreground">
							{global.stage === "analyzing" && (
								<>
									<RefreshCw className="h-4 w-4 animate-spin" />
									Analyzing image...
								</>
							)}
							{global.stage === "generating" && (
								<>
									<RefreshCw className="h-4 w-4 animate-spin" />
									Generating copy...
								</>
							)}
						</div>
						<Progress
							value={
								global.stage === "analyzing"
									? 33
									: global.stage === "generating"
										? 66
										: 100
							}
							className="h-2"
						/>
					</div>
				)}

				<div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
					<UploadZone
						file={upload.file}
						previewUrl={upload.previewUrl}
						thumbnailUrl={upload.thumbnailUrl}
						onDrop={upload.onDrop}
						onFileInput={upload.onFileInput}
						onAnalyze={upload.startAnalysis}
						onRunAll={upload.runAll}
						onStop={upload.stop}
						isLoading={global.isLoading}
						isHistory={global.isHistory}
						fileInputRef={upload.fileInputRef}
					/>

					<AnalysisZone
						displayAnalysis={analysis.displayAnalysis}
						updateAnalysisField={analysis.updateAnalysisField}
						onGenerateCopy={analysis.startCopy}
						onRegenerateAnalysis={analysis.startAnalysis}
						onStopAnalysis={analysis.stopZoneAnalysis}
						analysisLoading={analysis.analysisLoading}
						copyLoading={analysis.copyLoading}
						isHistory={global.isHistory}
						hasFile={!!upload.file}
					/>

					<CopyZone
						displayCopy={copy.displayCopy}
						updateCopyField={copy.updateCopyField}
						onGenerateCopy={copy.startCopy}
						onCopyAll={copy.copyAll}
						onCopyText={copy.copyText}
						onStopCopy={copy.stopZoneCopy}
						copyLoading={copy.copyLoading}
						isHistory={global.isHistory}
						hasAnalysis={!!analysis.displayAnalysis}
					/>
				</div>

				<DebugPanel
					stage={global.stage}
					isLoading={global.isLoading}
					analysisLoading={analysis.analysisLoading}
					copyLoading={copy.copyLoading}
					error={global.error}
					analysis={analysis.displayAnalysis}
					copy={copy.displayCopy}
				/>
			</main>
		</div>
	);
}
