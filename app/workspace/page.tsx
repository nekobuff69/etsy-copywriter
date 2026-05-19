"use client";

import { useRef, useEffect } from "react";
import { useWorkspace } from "./hooks/useWorkspace";
import { UploadZone } from "./components/UploadZone";
import { AnalysisZone } from "./components/AnalysisZone";
import { CopyZone } from "./components/CopyZone";
import { DebugPanel } from "./components/DebugPanel";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

import { Plus, ChevronLeft, ChevronRight, ArrowLeft } from "lucide-react";

export default function WorkspacePage() {
	const { upload, analysis, copy, history, global, sessionNav } = useWorkspace();
	const mainRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		if (global.isHistory && mainRef.current) {
			mainRef.current.scrollTop = 0;
		}
	}, [global.isHistory]);

	return (
		<div className="min-h-screen bg-background text-foreground">
			{/* Sub-header */}
			<div className="border-b px-6 py-2.5 flex items-center bg-card">
				<div className="flex-1 flex items-center gap-3">
					<h1 className="text-lg font-medium">
						{global.isHistory ? "History Session" : "Workspace"}
					</h1>
					{global.isHistory ? (
						<span className="kami-tag">
							Read-only
						</span>
					) : (
						<Button variant="outline" size="sm" onClick={history.startNewSession}>
							<Plus className="h-4 w-4 mr-1" />
							New Session
						</Button>
					)}
				</div>

				{global.isHistory && sessionNav && (
					<div className="flex-1 flex justify-center items-center gap-2">
						<Button
							variant="ghost"
							size="sm"
							onClick={sessionNav.onPrev}
							disabled={sessionNav.currentIndex === 0}
							className="h-7 w-7 p-0"
							title="Previous session">
							<ChevronLeft className="h-4 w-4" />
						</Button>
						<span className="text-xs text-muted-foreground whitespace-nowrap">
							Session {sessionNav.currentIndex + 1} of {sessionNav.totalCount}
						</span>
						<Button
							variant="ghost"
							size="sm"
							onClick={sessionNav.onNext}
							disabled={sessionNav.currentIndex >= sessionNav.totalCount - 1}
							className="h-7 w-7 p-0"
							title="Next session">
							<ChevronRight className="h-4 w-4" />
						</Button>
						<Button
							variant="outline"
							size="sm"
							onClick={sessionNav.onBackToGroup}
							className="h-7 text-xs">
							<ArrowLeft className="h-3 w-3 mr-1" />
							Back to Group
						</Button>
					</div>
				)}

				<div className="flex-1 flex justify-end">
					{global.isHistory && (
						<Button variant="outline" size="sm" onClick={history.startNewSession}>
							<Plus className="h-4 w-4 mr-1" />
							New Session
						</Button>
					)}
				</div>
			</div>

			<main ref={mainRef} className="flex-1 p-6 overflow-y-auto h-[calc(100vh-110px)]">
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
									<div className="w-4 h-4 border-2 border-muted-foreground/30 border-t-primary rounded-full animate-spin" />
									Analyzing image...
								</>
							)}
							{global.stage === "generating" && (
								<>
									<div className="w-4 h-4 border-2 border-muted-foreground/30 border-t-primary rounded-full animate-spin" />
									Generating copy...
								</>
							)}
						</div>
						<div className="h-2 bg-muted rounded-full overflow-hidden">
							<div
								className="h-full bg-primary transition-all duration-300"
								style={{
									width:
										global.stage === "analyzing"
											? "33%"
											: global.stage === "generating"
												? "66%"
												: "100%",
								}}
							/>
						</div>
					</div>
				)}

				<div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
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
						userText={upload.userText}
						onUserTextChange={upload.onUserTextChange}
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
						visionModel={analysis.visionModel}
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
						copyModel={copy.copyModel}
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
