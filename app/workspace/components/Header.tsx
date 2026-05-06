import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight, ArrowLeft } from "lucide-react";

interface SessionNav {
	currentIndex: number;
	totalCount: number;
	onPrev: () => void;
	onNext: () => void;
	onBackToGroup: () => void;
}

interface HeaderProps {
	isHistory: boolean;
	sessionNav?: SessionNav | null;
}

export function Header({ isHistory, sessionNav }: HeaderProps) {
	return (
		<header className="px-4 py-2 flex items-center">
			<div className="flex-1 flex items-center gap-3">
				<h1 className="text-lg font-semibold">
					{isHistory ? "History Session" : "Workspace"}
				</h1>
				{isHistory && (
					<Badge variant="secondary" className="text-xs">
						Read-only
					</Badge>
				)}
			</div>

			{isHistory && sessionNav && (
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
			<div className="flex-1" />
		</header>
	);
}
