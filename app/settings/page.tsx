"use client";

import {useState} from "react";
import {
	DEFAULT_SETTINGS,
	type AppSettings,
	type LlmConfig,
	encodeConfigHeader,
} from "@/lib/settings";
import {useSettings} from "@/lib/useSettings";
import {Button} from "@/components/ui/button";
import {Input} from "@/components/ui/input";
import {Label} from "@/components/ui/label";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import {Badge} from "@/components/ui/badge";
import {ThemeToggle} from "@/components/ThemeToggle";
import {Loader2, Check, X} from "lucide-react";

type HealthStatus = "idle" | "testing" | "online" | "failed";

interface LlmConfigCardProps {
	title: string;
	description: string;
	config: LlmConfig;
	onChange: (config: LlmConfig) => void;
}

function LlmConfigCard({title, description, config, onChange}: LlmConfigCardProps) {
	const [health, setHealth] = useState<HealthStatus>("idle");
	const [healthError, setHealthError] = useState<string | null>(null);

	const runHealthCheck = async () => {
		setHealth("testing");
		setHealthError(null);
		try {
			const settings: AppSettings = {
				vision: title === "Vision Model" ? config : DEFAULT_SETTINGS.vision,
				copy: title === "Copy Model" ? config : DEFAULT_SETTINGS.copy,
			};
			const res = await fetch("/api/health-check", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					"X-LLM-Config": encodeConfigHeader(settings),
				},
				body: JSON.stringify({type: title === "Vision Model" ? "vision" : "copy"}),
			});
			const data = await res.json();
			if (data.ok) {
				setHealth("online");
			} else {
				setHealth("failed");
				setHealthError(data.error || "Health check failed");
			}
		} catch (err) {
			setHealth("failed");
			setHealthError(err instanceof Error ? err.message : "Network error");
		}
	};

	return (
		<Card>
			<CardHeader>
				<CardTitle>{title}</CardTitle>
				<CardDescription>{description}</CardDescription>
			</CardHeader>
			<CardContent className="space-y-4">
				<div className="space-y-2">
					<Label htmlFor={`${title}-baseURL`}>Endpoint URL</Label>
					<Input
						id={`${title}-baseURL`}
						value={config.baseURL}
						onChange={(e) => onChange({...config, baseURL: e.target.value})}
						placeholder="https://api.example.com/v1"
					/>
				</div>
				<div className="space-y-2">
					<Label htmlFor={`${title}-apiKey`}>API Key</Label>
					<Input
						id={`${title}-apiKey`}
						type="password"
						value={config.apiKey}
						onChange={(e) => onChange({...config, apiKey: e.target.value})}
						placeholder="sk-..."
					/>
				</div>
				<div className="space-y-2">
					<Label htmlFor={`${title}-model`}>Model ID</Label>
					<Input
						id={`${title}-model`}
						value={config.model}
						onChange={(e) => onChange({...config, model: e.target.value})}
						placeholder="model-name"
					/>
				</div>
				<div className="flex items-center gap-2 flex-wrap">
					<Button
						variant="outline"
						size="sm"
						onClick={runHealthCheck}
						disabled={health === "testing"}>
						{health === "testing" && (
							<Loader2 className="h-4 w-4 mr-1 animate-spin" />
						)}
						{health === "online" && (
							<Check className="h-4 w-4 mr-1 text-green-500" />
						)}
						{health === "failed" && (
							<X className="h-4 w-4 mr-1 text-red-500" />
						)}
						{health === "testing" ? "Testing..." : "Health Check"}
					</Button>
					{health === "online" && (
						<Badge variant="outline" className="text-green-600">
							Online
						</Badge>
					)}
					{health === "failed" && (
						<Badge variant="outline" className="text-red-600">
							Failed
						</Badge>
					)}
					{healthError && (
						<span className="text-xs text-red-500">{healthError}</span>
					)}
				</div>
			</CardContent>
		</Card>
	);
}

export default function SettingsPage() {
	const {settings, updateSettings, loaded} = useSettings();
	const [localSettings, setLocalSettings] = useState<AppSettings | null>(null);

	if (!loaded) return null;

	const current = localSettings ?? settings;

	const handleChangeVision = (vision: LlmConfig) => {
		setLocalSettings({...current, vision});
	};

	const handleChangeCopy = (copy: LlmConfig) => {
		setLocalSettings({...current, copy});
	};

	const handleApply = () => {
		if (localSettings) {
			updateSettings(localSettings);
			setLocalSettings(null);
		}
	};

	const handleReset = () => {
		setLocalSettings(DEFAULT_SETTINGS);
	};

	return (
		<div className="min-h-screen bg-background text-foreground p-6">
			<div className="max-w-4xl mx-auto space-y-8">
				<div>
					<h1 className="text-2xl font-bold">Settings</h1>
					<p className="text-muted-foreground">
						Configure your LLM endpoints and preferences.
					</p>
				</div>

				<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
					<LlmConfigCard
						title="Vision Model"
						description="Used for analyzing uploaded artwork images."
						config={current.vision}
						onChange={handleChangeVision}
					/>
					<LlmConfigCard
						title="Copy Model"
						description="Used for generating Etsy listing copy from analysis."
						config={current.copy}
						onChange={handleChangeCopy}
					/>
				</div>

				<div className="flex items-center gap-4">
					<Button onClick={handleApply} disabled={!localSettings}>
						Apply
					</Button>
					<Button variant="outline" onClick={handleReset}>
						Reset to Defaults
					</Button>
				</div>

				<div className="border-t pt-6">
					<h2 className="text-lg font-semibold mb-4">Appearance</h2>
					<div className="flex items-center gap-4">
						<span className="text-sm text-muted-foreground">Theme</span>
						<ThemeToggle />
					</div>
				</div>
			</div>
		</div>
	);
}
