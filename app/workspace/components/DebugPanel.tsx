"use client";

import { useState } from "react";
import type { ImageAnalysisType, CopyWritingType } from "@/lib/definitions";
import { ChevronDown, ChevronRight, Bug } from "lucide-react";

interface DebugPanelProps {
	stage: string;
	isLoading: boolean;
	analysisLoading: boolean;
	copyLoading: boolean;
	error: string | null;
	analysis: Partial<ImageAnalysisType> | null;
	copy: Partial<CopyWritingType> | null;
}

const stageColors: Record<string, string> = {
	idle: "bg-gray-500",
	analyzing: "bg-blue-500",
	generating: "bg-purple-500",
	done: "bg-green-500",
	error: "bg-red-500",
};

function JsonBlock({
	label,
	data,
}: {
	label: string;
	data: unknown;
}) {
	const [open, setOpen] = useState(false);

	if (data == null) return null;

	const json = JSON.stringify(data, null, 2);
	const preview = json.length > 120 ? json.slice(0, 120) + "…" : json;

	return (
		<div className="space-y-1">
			<button
				type="button"
				onClick={() => setOpen(!open)}
				className="flex items-center gap-1 text-xs font-mono text-muted-foreground hover:text-foreground transition-colors"
			>
				{open ? (
					<ChevronDown className="h-3 w-3" />
				) : (
					<ChevronRight className="h-3 w-3" />
				)}
				{label}
				<span className="text-[10px] opacity-60">({json.length} chars)</span>
			</button>
			{open && (
				<pre className="text-[10px] font-mono bg-muted/50 rounded p-2 max-h-48 overflow-auto whitespace-pre-wrap break-all">
					{json}
				</pre>
			)}
			{!open && (
				<code className="text-[10px] font-mono text-muted-foreground block truncate">
					{preview}
				</code>
			)}
		</div>
	);
}

export function DebugPanel({
	stage,
	isLoading,
	analysisLoading,
	copyLoading,
	error,
	analysis,
	copy,
}: DebugPanelProps) {
	const [open, setOpen] = useState(false);

	return (
		<div className="mt-4 border rounded-lg bg-muted/30 text-xs">
			<button
				type="button"
				onClick={() => setOpen(!open)}
				className="w-full flex items-center gap-2 px-3 py-2 hover:bg-muted/50 transition-colors"
			>
				{open ? (
					<ChevronDown className="h-3 w-3 text-muted-foreground" />
				) : (
					<ChevronRight className="h-3 w-3 text-muted-foreground" />
				)}
				<Bug className="h-3 w-3 text-muted-foreground" />
				<span className="font-semibold text-muted-foreground">Debug</span>
				{open && (
					<>
						<span className="text-muted-foreground">│</span>
						<span
							className={`px-1.5 py-0.5 rounded text-[10px] text-white ${stageColors[stage] ?? "bg-gray-500"}`}
						>
							{stage}
						</span>
						{isLoading && (
							<span className="px-1.5 py-0.5 rounded bg-yellow-500 text-[10px] text-black">
								loading
							</span>
						)}
						{analysisLoading && (
							<span className="px-1.5 py-0.5 rounded bg-blue-500 text-[10px] text-white">
								analysis streaming
							</span>
						)}
						{copyLoading && (
							<span className="px-1.5 py-0.5 rounded bg-purple-500 text-[10px] text-white">
								copy streaming
							</span>
						)}
						{error && (
							<span className="px-1.5 py-0.5 rounded bg-red-500 text-[10px] text-white">
								error
							</span>
						)}
					</>
				)}
			</button>

			{open && (
				<div className="px-3 pb-3 space-y-2 border-t pt-2">
					<div className="grid grid-cols-2 gap-2 text-[11px]">
						<div>
							<span className="text-muted-foreground">Stage:</span>{" "}
							<span className="font-mono">{stage}</span>
						</div>
						<div>
							<span className="text-muted-foreground">isLoading:</span>{" "}
							<span className="font-mono">{String(isLoading)}</span>
						</div>
						<div>
							<span className="text-muted-foreground">analysisLoading:</span>{" "}
							<span className="font-mono">{String(analysisLoading)}</span>
						</div>
						<div>
							<span className="text-muted-foreground">copyLoading:</span>{" "}
							<span className="font-mono">{String(copyLoading)}</span>
						</div>
					</div>

					{error && (
						<div className="bg-red-500/10 border border-red-500/20 rounded p-2 text-red-400 font-mono break-all">
							{error}
						</div>
					)}

					<JsonBlock label="analysis object" data={analysis} />
					<JsonBlock label="copy object" data={copy} />

					<div className="text-[10px] text-muted-foreground pt-1">
						Console logs tagged <code className="bg-muted px-1 rounded">[PIPELINE]</code> — grep to find all debug output.
					</div>
				</div>
			)}
		</div>
	);
}
