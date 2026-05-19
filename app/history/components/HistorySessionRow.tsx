"use client";

import { useState } from "react";
import {
	ChevronDown,
	ChevronRight,
	ExternalLink,
	Clipboard,
	ClipboardList,
	FileText,
	Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";

import { Separator } from "@/components/ui/separator";
import type { HistorySession } from "@/lib/history";
import { shortModelName } from "@/lib/display";

interface HistorySessionRowProps {
	session: HistorySession;
	sessionIndex: number;
	isExpanded: boolean;
	onToggle: () => void;
	onDelete: () => void;
	onOpenInWorkspace: () => void;
	onCopyText: (text: string) => void;
	onCopyAll: () => void;
}

export function HistorySessionRow({
	session,
	sessionIndex,
	isExpanded,
	onToggle,
	onDelete,
	onOpenInWorkspace,
	onCopyText,
	onCopyAll,
}: HistorySessionRowProps) {
	const [analysisOpen, setAnalysisOpen] = useState(false);
	const { copy, analysis, createdAt } = session;

	const providerLabel = session.providerLabel ?? "unknown";
	const visionModel = session.visionModel ?? "default";
	const copyModel = session.copyModel ?? "default";

	return (
		<div id={`session-${session.id}`} className="border-b border-border/40 last:border-b-0">
			<button
				onClick={onToggle}
				className="w-full flex items-center gap-3 p-3 text-left hover:bg-accent/30 transition-colors"
			>
				{isExpanded ? (
					<ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
				) : (
					<ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
				)}
				<span className="text-xs text-muted-foreground shrink-0 w-6">
					#{sessionIndex}
				</span>
				<div className="flex items-center gap-2 flex-wrap flex-1 min-w-0">
					<span className="kami-tag font-mono">
						{shortModelName(visionModel)}
					</span>
					<span className="kami-tag font-mono">
						{shortModelName(copyModel)}
					</span>
					<span className="kami-tag">
						{providerLabel}
					</span>
					<span className="text-xs text-muted-foreground ml-auto">
						{new Date(createdAt).toLocaleString()}
					</span>
				</div>
			</button>

			{isExpanded && (
				<div className="px-3 pb-3 space-y-3">
					<Separator />

					<div className="space-y-3">
						<div className="flex items-center justify-between">
							<h4 className="text-sm font-medium">Generated Copy</h4>
							<div className="flex items-center gap-1">
								<Button
									variant="ghost"
									size="sm"
									className="h-7 text-xs"
									onClick={onCopyAll}
								>
									<ClipboardList className="h-3 w-3 mr-1" />
									Copy All
								</Button>
								<Button
									variant="ghost"
									size="sm"
									className="h-7 w-7 p-0"
									onClick={onDelete}
									title="Delete session"
								>
									<Trash2 className="h-3.5 w-3.5 text-destructive" />
								</Button>
								<Button
									variant="outline"
									size="sm"
									className="h-7 text-xs"
									onClick={onOpenInWorkspace}
								>
									<ExternalLink className="h-3 w-3 mr-1" />
									Open in Workspace
								</Button>
							</div>
						</div>

						{copy?.titles && (
							<div className="space-y-1">
								<div className="flex items-center justify-between">
									<label className="text-xs font-medium text-muted-foreground">
										Titles
									</label>
								</div>
								{["option1", "option2", "option3"].map((key) => {
									const title = (copy.titles as Record<string, string>)[key];
									if (!title) return null;
									return (
										<div
											key={key}
											className="flex items-center gap-2 bg-muted/50 rounded-md px-2 py-1.5"
										>
											<span className="text-xs text-muted-foreground shrink-0 w-6">
												#{key.replace("option", "")}
											</span>
											<span className="text-sm flex-1 truncate" title={title}>
												{title}
											</span>
											<Button
												variant="ghost"
												size="sm"
												className="h-6 w-6 p-0 shrink-0"
												onClick={() => onCopyText(title)}
												title="Copy title"
											>
												<Clipboard className="h-3 w-3" />
											</Button>
										</div>
									);
									})}
							</div>
						)}

						{copy?.tags && copy.tags.length > 0 && (
							<div className="space-y-1">
								<div className="flex items-center justify-between">
									<label className="text-xs font-medium text-muted-foreground">
										Tags
									</label>
									<Button
										variant="ghost"
										size="sm"
										className="h-6 text-xs px-2"
										onClick={() => onCopyText(copy.tags.join(", "))}
									>
										<Clipboard className="h-3 w-3 mr-1" />
										Copy Tags
									</Button>
								</div>
								<div className="flex flex-wrap gap-1">
									{copy.tags.map((tag, i) => (
										<span key={i} className="kami-tag">
											{tag}
										</span>
									))}
								</div>
							</div>
						)}

						{copy?.description && (
							<div className="space-y-1">
								<div className="flex items-center justify-between">
									<label className="text-xs font-medium text-muted-foreground">
										Description
									</label>
									<Button
										variant="ghost"
										size="sm"
										className="h-6 text-xs px-2"
										onClick={() => onCopyText(copy.description ?? "")}
									>
										<Clipboard className="h-3 w-3 mr-1" />
										Copy
									</Button>
								</div>
								<p className="text-sm text-muted-foreground whitespace-pre-wrap bg-muted/50 rounded-md p-3 max-h-48 overflow-y-auto">
									{copy.description}
								</p>
							</div>
						)}
					</div>

					<Separator />

					<div>
						<button
							onClick={() => setAnalysisOpen(!analysisOpen)}
							className="flex items-center gap-2 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
						>
							{analysisOpen ? (
								<ChevronDown className="h-3 w-3" />
							) : (
								<ChevronRight className="h-3 w-3" />
							)}
							<FileText className="h-3 w-3" />
							View Analysis
						</button>

						{analysisOpen && analysis && (
							<div className="mt-2 space-y-2 bg-muted/50 rounded-md p-3 text-sm">
								{analysis.subject && (
									<div>
										<span className="font-medium">Subject: </span>
										{analysis.subject}
									</div>
								)}
								{analysis.product_type && (
									<div>
										<span className="font-medium">Product Type: </span>
										{analysis.product_type}
									</div>
								)}
								{analysis.medium && (
									<div>
										<span className="font-medium">Medium: </span>
										{analysis.medium}
									</div>
								)}
								{analysis.artistic_style && (
									<div>
										<span className="font-medium">Artistic Style: </span>
										{analysis.artistic_style}
									</div>
								)}
								{analysis.primary_colors && analysis.primary_colors.length > 0 && (
									<div>
										<span className="font-medium">Primary Colors: </span>
										{analysis.primary_colors.join(", ")}
									</div>
								)}
								{analysis.vibe_keywords && analysis.vibe_keywords.length > 0 && (
									<div>
										<span className="font-medium">Vibe Keywords: </span>
										{analysis.vibe_keywords.join(", ")}
									</div>
								)}
							</div>
						)}
					</div>
				</div>
			)}
		</div>
	);
}
