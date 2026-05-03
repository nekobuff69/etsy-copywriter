"use client";

import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useHistory } from "./hooks/useHistory";
import { HistoryGroupCard } from "./components/HistoryGroupCard";

export default function HistoryPage() {
	const {
		groups,
		expandedGroupHash,
		expandedSessionId,
		toggleGroup,
		toggleSession,
		handleDeleteSession,
		handleDeleteSessions,
		handleClearHistory,
		openInWorkspace,
		copyText,
		copyAllForSession,
		hasHistory,
	} = useHistory();

	return (
		<div className="max-w-7xl mx-auto px-4 py-8">
			<div className="flex items-center justify-between mb-6">
				<div>
					<h1 className="text-2xl font-bold">History</h1>
					<p className="text-muted-foreground text-sm">
						Browse and compare past sessions grouped by image.
					</p>
				</div>
				{hasHistory && (
					<Button
						variant="outline"
						size="sm"
						onClick={handleClearHistory}
					>
						<Trash2 className="h-4 w-4 mr-1" />
						Clear All
					</Button>
				)}
			</div>

			{!hasHistory && (
				<div className="text-center py-16">
					<p className="text-muted-foreground">
						No sessions yet. Upload an image in the Workspace to get started.
					</p>
				</div>
			)}

			<div className="space-y-4">
				{groups.map((group) => {
					const groupKey =
						group.imageHash ?? `solo-${group.sessions[0]!.id}`;

					return (
						<HistoryGroupCard
							key={groupKey}
							imageHash={group.imageHash}
							thumbnail={group.thumbnail}
							sessionCount={group.sessions.length}
							latestDate={group.latestDate}
							sessions={group.sessions}
							isExpanded={expandedGroupHash === groupKey}
							expandedSessionId={expandedSessionId}
							onToggleGroup={() => toggleGroup(groupKey)}
							onToggleSession={toggleSession}
							onDeleteSession={handleDeleteSession}
							onDeleteSessions={handleDeleteSessions}
							onOpenInWorkspace={openInWorkspace}
							onCopyText={copyText}
							onCopyAllForSession={copyAllForSession}
						/>
					);
				})}
			</div>
		</div>
	);
}
