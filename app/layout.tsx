import type {Metadata} from "next";
import "./globals.css";
import {ThemeProvider} from "@/components/theme-provider";
import {KamiToaster} from "@/components/KamiToaster";
import {TopNav} from "@/app/components/TopNav";

export const metadata: Metadata = {
	title: "Etsy Copywriter",
	description:
		"An AI-powered app that extracts info from artwork and writes compelling copy for artists on Etsy.",
};

export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<html lang='en' suppressHydrationWarning>
			<body className="antialiased">
				<ThemeProvider
					attribute='class'
					defaultTheme='system'
					enableSystem
					disableTransitionOnChange>
					<TopNav />
					{children}
					<KamiToaster />
				</ThemeProvider>
			</body>
		</html>
	);
}
