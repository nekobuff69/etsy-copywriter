import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { History, ChevronLeft, Plus } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";

interface HeaderProps {
	isHistory: boolean;
	historyOpen: boolean;
	onToggleHistory: () => void;
	onNewSession: () => void;
}

export function Header({
	isHistory,
	historyOpen,
	onToggleHistory,
	onNewSession,
}: HeaderProps) {
	return (
		<header className="border-b px-4 py-3 flex items-center justify-between sticky top-0 bg-background z-10">
			<div className="flex items-center gap-3">
				<Button variant="ghost" size="icon" onClick={onToggleHistory}>
					{historyOpen ? <ChevronLeft /> : <History />}
				</Button>
				<h1 className="text-lg font-semibold">
					{isHistory ? "History Session" : "Etsy Copywriter"}
				</h1>
				{isHistory && (
					<Badge variant="secondary" className="text-xs">
						Read-only
					</Badge>
				)}
			</div>
			<div className="flex items-center gap-2">
				{isHistory && (
					<Button variant="outline" size="sm" onClick={onNewSession}>
						<Plus className="h-4 w-4 mr-1" />
						New Session
					</Button>
				)}
				<ThemeToggle />
			</div>
		</header>
	);
}
