import { Badge } from "@/components/ui/badge";

interface HeaderProps {
	isHistory: boolean;
}

export function Header({ isHistory }: HeaderProps) {
	return (
		<header className="px-4 py-2 flex items-center justify-between">
			<div className="flex items-center gap-3">
				<h1 className="text-lg font-semibold">
					{isHistory ? "History Session" : "Workspace"}
				</h1>
				{isHistory && (
					<Badge variant="secondary" className="text-xs">
						Read-only
					</Badge>
				)}
			</div>
		</header>
	);
}
