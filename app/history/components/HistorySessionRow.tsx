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
import { Badge } from "@/components/ui/badge";
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
		<div id={`session-${session.id}`} className="border-b last:border-b-0">
			{/* Session header row */}
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
					<Badge variant="outline" className="text-xs">
						👁️ {shortModelName(visionModel)}
					</Badge>
					<Badge variant="outline" className="text-xs">
						✍️ {shortModelName(copyModel)}
					</Badge>
					<Badge variant="secondary" className="text-xs">
						{providerLabel}
					</Badge>
					<span className="text-xs text-muted-foreground ml-auto">
						{new Date(createdAt).toLocaleString()}
					</span>
				</div>
			</button>

			{/* Expanded session details */}
			{isExpanded && (
				<div className="px-3 pb-3 space-y-3">
					<Separator />

					{/* Copy-writings section */}
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

						{/* Titles */}
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
											className="flex items-center gap-2 bg-muted/50 rounded px-2 py-1.5"
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

						{/* Tags */}
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
										<Badge key={i} variant="secondary" className="text-xs">
											{tag}
										</Badge>
									))}
								</div>
							</div>
						)}

						{/* Description */}
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
								<p className="text-sm text-muted-foreground whitespace-pre-wrap bg-muted/50 rounded p-3 max-h-48 overflow-y-auto">
									{copy.description}
								</p>
							</div>
						)}
					</div>

					<Separator />

					{/* Analysis section (collapsible, hidden by default) */}
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
							<div className="mt-2 space-y-2 bg-muted/50 rounded p-3 text-sm">
								{analysis.core_attributes && (
									<div>
										<span className="font-medium">Subject: </span>
										{analysis.core_attributes.subject}
									</div>
								)}
								{analysis.technical_specs && (
									<div>
										<span className="font-medium">Medium: </span>
										{analysis.technical_specs.medium}
									</div>
								)}
								{analysis.visual_identity && (
									<div>
										<span className="font-medium">Style: </span>
										{analysis.visual_identity.artistic_style}
									</div>
								)}
								{analysis.marketing_hooks && (
									<div>
										<span className="font-medium">Symbolism: </span>
										{analysis.marketing_hooks.symbolism}
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


