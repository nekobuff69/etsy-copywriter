import {describe, it, expect, beforeEach, beforeAll} from "vitest";
import {
	DEFAULT_SETTINGS,
	getStoredSettings,
	saveStoredSettings,
	appSettingsSchema,
	encodeConfigHeader,
	decodeConfigHeader,
	deriveProviderLabel,
} from "../lib/settings";

const storage: Record<string, string> = {};

beforeAll(() => {
	(globalThis as Record<string, unknown>).window = globalThis;
	Object.defineProperty(globalThis, "localStorage", {
		value: {
			getItem: (key: string) => storage[key] ?? null,
			setItem: (key: string, value: string) => {
				storage[key] = value;
			},
			removeItem: (key: string) => {
				delete storage[key];
			},
		},
		configurable: true,
	});
});

beforeEach(() => {
	Object.keys(storage).forEach((k) => delete storage[k]);
});

describe("appSettingsSchema", () => {
	it("accepts valid settings", () => {
		const result = appSettingsSchema.safeParse(DEFAULT_SETTINGS);
		expect(result.success).toBe(true);
	});

	it("rejects invalid URL", () => {
		const invalid = {
			...DEFAULT_SETTINGS,
			vision: {...DEFAULT_SETTINGS.vision, baseURL: "not-a-url"},
		};
		const result = appSettingsSchema.safeParse(invalid);
		expect(result.success).toBe(false);
	});

	it("rejects empty model", () => {
		const invalid = {
			...DEFAULT_SETTINGS,
			copy: {...DEFAULT_SETTINGS.copy, model: ""},
		};
		const result = appSettingsSchema.safeParse(invalid);
		expect(result.success).toBe(false);
	});

	it("accepts empty apiKey", () => {
		const valid = {
			...DEFAULT_SETTINGS,
			vision: {...DEFAULT_SETTINGS.vision, apiKey: ""},
		};
		const result = appSettingsSchema.safeParse(valid);
		expect(result.success).toBe(true);
	});
});

describe("getStoredSettings", () => {
	it("returns defaults when localStorage is empty", () => {
		expect(getStoredSettings()).toEqual(DEFAULT_SETTINGS);
	});

	it("returns parsed settings when valid", () => {
		const custom = {
			...DEFAULT_SETTINGS,
			vision: {...DEFAULT_SETTINGS.vision, model: "custom-model"},
		};
		saveStoredSettings(custom);
		expect(getStoredSettings()).toEqual(custom);
	});

	it("returns defaults when localStorage has invalid JSON", () => {
		storage["etsy-copywriter-settings"] = "not-json";
		expect(getStoredSettings()).toEqual(DEFAULT_SETTINGS);
	});

	it("returns defaults when localStorage has invalid schema", () => {
		storage["etsy-copywriter-settings"] = JSON.stringify({hello: "world"});
		expect(getStoredSettings()).toEqual(DEFAULT_SETTINGS);
	});
});

describe("encode/decode config header", () => {
	it("round-trips settings correctly", () => {
		const encoded = encodeConfigHeader(DEFAULT_SETTINGS);
		const decoded = decodeConfigHeader(encoded);
		expect(decoded).toEqual(DEFAULT_SETTINGS);
	});
});

describe("deriveProviderLabel", () => {
	it("maps OpenRouter to friendly name", () => {
		expect(deriveProviderLabel("https://openrouter.ai/api/v1")).toBe("OpenRouter");
	});

	it("maps OpenAI to friendly name", () => {
		expect(deriveProviderLabel("https://api.openai.com/v1")).toBe("OpenAI");
	});

	it("maps localhost to localhost:port", () => {
		expect(deriveProviderLabel("http://localhost:11434/v1")).toBe("localhost:11434");
	});

	it("maps localhost without port to localhost:443", () => {
		expect(deriveProviderLabel("https://localhost/v1")).toBe("localhost:443");
	});

	it("maps 127.0.0.1 to localhost:port", () => {
		expect(deriveProviderLabel("http://127.0.0.1:8080/v1")).toBe("localhost:8080");
	});

	it("falls back to hostname for unknown providers", () => {
		expect(deriveProviderLabel("https://my-llm.example.com/v1")).toBe("my-llm.example.com");
	});

	it("returns unknown for invalid URLs", () => {
		expect(deriveProviderLabel("")).toBe("unknown");
	});
});
