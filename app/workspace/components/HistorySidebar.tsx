import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, X } from "lucide-react";
import type { HistorySession } from "@/lib/history";

interface HistorySidebarProps {
	history: HistorySession[];
	activeHistoryId: string | null;
	onRestore: (session: HistorySession) => void;
	onNewSession: () => void;
	onDelete: (id: string) => void;
	onClear: () => void;
}

export function HistorySidebar({
	history,
	activeHistoryId,
	onRestore,
	onNewSession,
	onDelete,
	onClear,
}: HistorySidebarProps) {
	return (
		<aside className="w-72 border-r bg-card p-3 space-y-3 shrink-0 h-[calc(100vh-57px)] overflow-y-auto">
			<div className="flex items-center justify-between">
				<h2 className="font-medium text-sm">History</h2>
				<div className="flex items-center gap-1">
					<Button
						variant="ghost"
						size="sm"
						className="h-7 text-xs"
						onClick={onNewSession}>
						<Plus className="h-3 w-3 mr-1" />
						New
					</Button>
					{history.length > 0 && (
						<Button
							variant="ghost"
							size="icon"
							className="h-7 w-7"
							onClick={onClear}>
							<Trash2 className="h-4 w-4" />
						</Button>
					)}
				</div>
			</div>
			{history.length === 0 && (
				<p className="text-xs text-muted-foreground">No sessions yet.</p>
			)}
			{history.map((session) => {
				const isActive = activeHistoryId === session.id;
				return (
					<div
						key={session.id}
						className={`group relative border rounded-md p-2 cursor-pointer hover:bg-accent transition-colors ${
							isActive ? "ring-1 ring-primary bg-primary/5" : ""
						}`}
						onClick={() => onRestore(session)}>
						{session.thumbnail && (
							<>
								{/* eslint-disable-next-line @next/next/no-img-element */}
								<img
									src={session.thumbnail}
									alt="Thumbnail"
									className="w-full h-20 object-cover rounded mb-2"
								/>
							</>
						)}
						<div className="flex items-center justify-between">
							<span className="text-xs text-muted-foreground">
								{new Date(session.createdAt).toLocaleString()}
							</span>
							{isActive && (
								<Badge variant="outline" className="text-[10px] h-5 px-1">
									Active
								</Badge>
							)}
							<Button
								variant="ghost"
								size="icon"
								className="h-6 w-6 opacity-0 group-hover:opacity-100"
								onClick={(e) => {
									e.stopPropagation();
									onDelete(session.id);
								}}>
								<X className="h-3 w-3" />
							</Button>
						</div>
					</div>
				);
			})}
		</aside>
	);
}
