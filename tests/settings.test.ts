import {describe, it, expect, beforeEach, beforeAll} from "vitest";
import {
	DEFAULT_SETTINGS,
	getStoredSettings,
	saveStoredSettings,
	appSettingsSchema,
	encodeConfigHeader,
	decodeConfigHeader,
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
