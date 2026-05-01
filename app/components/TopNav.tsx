"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navLinks = [
	{ href: "/workspace", label: "Workspace" },
	{ href: "/history", label: "History" },
	{ href: "/settings", label: "Settings" },
];

export function TopNav() {
	const pathname = usePathname();

	return (
		<nav className="border-b bg-background sticky top-0 z-50">
			<div className="max-w-7xl mx-auto px-4 h-14 flex items-center gap-6">
				<Link
					href="/workspace"
					className="text-lg font-bold hover:opacity-80 transition-opacity"
				>
					Etsy Copywriter
				</Link>
				<div className="flex items-center gap-1">
					{navLinks.map((link) => {
						const isActive = pathname === link.href;
						return (
							<Link
								key={link.href}
								href={link.href}
								className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
									isActive
										? "bg-accent text-accent-foreground"
										: "text-muted-foreground hover:text-foreground hover:bg-accent/50"
								}`}
							>
								{link.label}
							</Link>
						);
					})}
				</div>
			</div>
		</nav>
	);
}
