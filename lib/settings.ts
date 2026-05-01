import {z} from "zod";

export const llmConfigSchema = z.object({
	baseURL: z.string().url(),
	apiKey: z.string(),
	model: z.string().min(1),
});

export const appSettingsSchema = z.object({
	vision: llmConfigSchema,
	copy: llmConfigSchema,
});

export type LlmConfig = z.infer<typeof llmConfigSchema>;
export type AppSettings = z.infer<typeof appSettingsSchema>;

const SETTINGS_KEY = "etsy-copywriter-settings";

export const DEFAULT_SETTINGS: AppSettings = {
	vision: {
		baseURL: "https://openrouter.ai/api/v1",
		apiKey: "",
		model: "qwen/qwen3-vl-8b-instruct",
	},
	copy: {
		baseURL: "https://openrouter.ai/api/v1",
		apiKey: "",
		model: "qwen/qwen3-vl-30b-a3b-instruct",
	},
};

export function getStoredSettings(): AppSettings {
	if (typeof window === "undefined") return DEFAULT_SETTINGS;
	try {
		const raw = localStorage.getItem(SETTINGS_KEY);
		if (!raw) return DEFAULT_SETTINGS;
		const parsed = JSON.parse(raw);
		const result = appSettingsSchema.safeParse(parsed);
		return result.success ? result.data : DEFAULT_SETTINGS;
	} catch {
		return DEFAULT_SETTINGS;
	}
}

export function saveStoredSettings(settings: AppSettings): void {
	if (typeof window === "undefined") return;
	localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

export function encodeConfigHeader(settings: AppSettings): string {
	const json = JSON.stringify(settings);
	if (typeof Buffer !== "undefined") {
		return Buffer.from(json).toString("base64");
	}
	const bytes = new TextEncoder().encode(json);
	let binary = "";
	for (let i = 0; i < bytes.byteLength; i++) {
		binary += String.fromCharCode(bytes[i]);
	}
	return btoa(binary);
}

/**
 * Derive a human-readable provider label from a baseURL.
 * Maps known endpoints to friendly names; falls back to hostname.
 */
export function deriveProviderLabel(baseURL: string): string {
	try {
		const url = new URL(baseURL);
		const host = url.hostname;

		// Known provider mappings
		if (host === "openrouter.ai") return "OpenRouter";
		if (host === "api.openai.com") return "OpenAI";
		if (host === "localhost" || host === "127.0.0.1") {
			return `localhost:${url.port || "443"}`;
		}

		// Generic fallback: just the hostname
		return host;
	} catch {
		return "unknown";
	}
}

export function decodeConfigHeader(header: string): unknown {
	if (typeof Buffer !== "undefined") {
		return JSON.parse(Buffer.from(header, "base64").toString("utf-8"));
	}
	const binary = atob(header);
	const bytes = new Uint8Array(binary.length);
	for (let i = 0; i < binary.length; i++) {
		bytes[i] = binary.charCodeAt(i);
	}
	return JSON.parse(new TextDecoder().decode(bytes));
}


