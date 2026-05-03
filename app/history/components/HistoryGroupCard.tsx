"use client";

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
	onToggleGroup,
	onToggleSession,
	onDeleteSession,
	onDeleteSessions,
	onOpenInWorkspace,
	onCopyText,
	onCopyAllForSession,
}: HistoryGroupCardProps) {
	const groupId = imageHash ? `group-${imageHash}` : `group-solo-${sessions[0]?.id}`;

	return (
		<div id={groupId} className="border rounded-lg overflow-hidden bg-card">
			<button
				onClick={onToggleGroup}
				className="w-full flex items-start gap-4 p-4 text-left hover:bg-accent/50 transition-colors"
			>
				{isExpanded ? (
					<ChevronDown className="h-5 w-5 mt-1 text-muted-foreground shrink-0" />
				) : (
					<ChevronRight className="h-5 w-5 mt-1 text-muted-foreground shrink-0" />
				)}
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
						<span className="font-medium text-sm truncate">
							{imageHash ? "Artwork" : "Session"}
						</span>
						<Badge variant="secondary" className="text-xs">
							{sessionCount} {sessionCount === 1 ? "run" : "runs"}
						</Badge>
					</div>
					<p className="text-xs text-muted-foreground mt-1">
						Latest: {new Date(latestDate).toLocaleString()}
					</p>
				</div>
			</button>

			{isExpanded && (
				<div className="border-t">
					{sessions.map((session, index) => (
						<HistorySessionRow
							key={session.id}
							session={session}
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
