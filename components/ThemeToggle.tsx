"use client";

import { useSyncExternalStore } from "react";
import { useTheme } from "next-themes";

export function ThemeToggle() {
	const { theme, setTheme } = useTheme();
	const mounted = useSyncExternalStore(
		() => () => {},
		() => true,
		() => false,
	);

	if (!mounted) {
		return (
			<div className="w-16 h-8 rounded-full bg-muted border border-border relative" aria-hidden="true" />
		);
	}

	const isDark = theme === "dark";

	return (
		<div
			role="button"
			tabIndex={0}
			aria-label="Toggle dark mode"
			className={`w-16 h-8 rounded-full border relative cursor-pointer flex items-center justify-between px-1.5 transition-colors duration-200 ${
				isDark
					? "bg-dark-warm border-dark-warm"
					: "bg-muted border-border"
			}`}
			style={{
				backgroundColor: isDark ? "var(--secondary)" : "var(--muted)",
				borderColor: isDark ? "var(--secondary)" : "var(--border)",
			}}
			onClick={() => setTheme(isDark ? "light" : "dark")}
			onKeyDown={(e) => {
				if (e.key === "Enter" || e.key === " ") {
					e.preventDefault();
					setTheme(isDark ? "light" : "dark");
				}
			}}
		>
			{/* Sun icon */}
			<svg
				className="w-[18px] h-[18px] z-10 pointer-events-none transition-opacity duration-200"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				strokeWidth="2"
				strokeLinecap="round"
				strokeLinejoin="round"
				style={{
					color: "var(--primary)",
					opacity: isDark ? 0.4 : 1,
				}}
			>
				<circle cx="12" cy="12" r="5" />
				<line x1="12" y1="1" x2="12" y2="3" />
				<line x1="12" y1="21" x2="12" y2="23" />
				<line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
				<line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
				<line x1="1" y1="12" x2="3" y2="12" />
				<line x1="21" y1="12" x2="23" y2="12" />
				<line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
				<line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
			</svg>

			{/* Moon icon */}
			<svg
				className="w-[18px] h-[18px] z-10 pointer-events-none transition-opacity duration-200"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				strokeWidth="2"
				strokeLinecap="round"
				strokeLinejoin="round"
				style={{
					color: isDark ? "var(--foreground)" : "var(--muted-foreground)",
					opacity: isDark ? 1 : 0.5,
				}}
			>
				<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
			</svg>

			{/* Sliding knob */}
			<div
				className="absolute top-[3px] w-[26px] h-[26px] rounded-full transition-transform duration-250"
				style={{
					backgroundColor: "var(--card)",
					boxShadow: "0 1px 4px rgba(0,0,0,0.12)",
					transform: isDark ? "translateX(32px)" : "translateX(0)",
					left: "3px",
				}}
			/>
		</div>
	);
}
