"use client";

import { useState, useCallback } from "react";
import { ChevronDown, ChevronRight, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { HistorySession } from "@/lib/history";
import { HistorySessionRow } from "./HistorySessionRow";

interface HistoryGroupCardProps {
	imageHash: string | null;
	thumbnail: string;
	sessionCount: number;
	latestDate: number;
	sessions: HistorySession[];
	isExpanded: boolean;
	expandedSessionId: string | null;
	groupTitle: string | null;
	onUpdateGroupTitle: (title: string) => void;
	onToggleGroup: () => void;
	onToggleSession: (id: string) => void;
	onDeleteSession: (id: string) => void;
	onDeleteSessions: (ids: string[]) => void;
	onOpenInWorkspace: (session: HistorySession) => void;
	onCopyText: (text: string) => void;
	onCopyAllForSession: (session: HistorySession) => void;
}

export function HistoryGroupCard({
	imageHash,
	thumbnail,
	sessionCount,
	latestDate,
	sessions,
	isExpanded,
	expandedSessionId,
	groupTitle,
	onUpdateGroupTitle,
	onToggleGroup,
	onToggleSession,
	onDeleteSession,
	onDeleteSessions,
	onOpenInWorkspace,
	onCopyText,
	onCopyAllForSession,
}: HistoryGroupCardProps) {
	const groupId = imageHash ? `group-${imageHash}` : `group-solo-${sessions[0]?.id}`;

	const [isEditing, setIsEditing] = useState(false);
	const [editValue, setEditValue] = useState("");

	const displayTitle = groupTitle ?? "Artwork";
	const truncatedTitle = displayTitle.length > 18 ? displayTitle.slice(0, 18) + "…" : displayTitle;

	const handleStartEdit = useCallback(() => {
		setEditValue(displayTitle);
		setIsEditing(true);
	}, [displayTitle]);

	const handleSave = useCallback(() => {
		if (editValue.trim()) {
			onUpdateGroupTitle(editValue.trim());
		}
		setIsEditing(false);
	}, [editValue, onUpdateGroupTitle]);

	const handleCancel = useCallback(() => {
		setIsEditing(false);
	}, []);

	const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
		if (e.key === "Enter") {
			handleSave();
		} else if (e.key === "Escape") {
			handleCancel();
		}
	}, [handleSave, handleCancel]);

	// Sort sessions newest-first (latest at top)
	const sortedSessions = [...sessions].sort((a, b) => b.createdAt - a.createdAt);

	return (
		<div id={groupId} className="border rounded-lg overflow-hidden bg-card">
			<div className="w-full flex items-start gap-4 p-4 hover:bg-accent/50 transition-colors">
				<button
					onClick={onToggleGroup}
					className="shrink-0 mt-1 text-muted-foreground hover:text-foreground transition-colors"
				>
					{isExpanded ? (
						<ChevronDown className="h-5 w-5" />
					) : (
						<ChevronRight className="h-5 w-5" />
					)}
				</button>
				{thumbnail && (
					// eslint-disable-next-line @next/next/no-img-element
					<img
						src={thumbnail}
						alt="Image thumbnail"
						className="w-16 h-16 object-cover rounded shrink-0"
					/>
				)}
				<div className="flex-1 min-w-0">
					<div className="flex items-center gap-2 flex-wrap">
						{isEditing ? (
							<input
								autoFocus
								value={editValue}
								onChange={(e) => setEditValue(e.target.value)}
								onBlur={handleSave}
								onKeyDown={handleKeyDown}
								className="text-sm font-medium bg-background border rounded px-2 py-0.5 w-48 focus:outline-none focus:ring-2 focus:ring-ring"
							/>
						) : (
							<span
								onDoubleClick={handleStartEdit}
								title={displayTitle}
								className="font-medium text-sm cursor-text select-none"
							>
								{truncatedTitle}
							</span>
						)}
						<Badge variant="secondary" className="text-xs">
							{sessionCount} {sessionCount === 1 ? "run" : "runs"}
						</Badge>
					</div>
					<p className="text-xs text-muted-foreground mt-1">
						Latest: {new Date(latestDate).toLocaleString()}
					</p>
				</div>
			</div>

			{isExpanded && (
				<div className="border-t">
					{sortedSessions.map((session, i) => (
						<HistorySessionRow
							key={session.id}
							session={session}
							sessionIndex={sortedSessions.length - i}
							isExpanded={expandedSessionId === session.id}
							onToggle={() => onToggleSession(session.id)}
							onDelete={() => onDeleteSession(session.id)}
							onOpenInWorkspace={() => onOpenInWorkspace(session)}
							onCopyText={onCopyText}
							onCopyAll={() => onCopyAllForSession(session)}
						/>
					))}
					<div className="p-3 flex justify-end">
						<Button
							variant="ghost"
							size="sm"
							className="text-xs text-destructive hover:text-destructive"
							onClick={() => onDeleteSessions(sessions.map((s) => s.id))}
						>
							<Trash2 className="h-3 w-3 mr-1" />
							Delete all in group
						</Button>
					</div>
				</div>
			)}
		</div>
	);
}
