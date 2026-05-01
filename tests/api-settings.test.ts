import {describe, it, expect} from "vitest";
import {parseSettingsFromRequest} from "../lib/api-settings";
import {encodeConfigHeader, DEFAULT_SETTINGS} from "../lib/settings";

function makeRequest(headerValue: string | null) {
	return {
		headers: {
			get: (name: string) => {
				if (name === "X-LLM-Config") return headerValue;
				return null;
			},
		},
	} as unknown as import("next/server").NextRequest;
}

describe("parseSettingsFromRequest", () => {
	it("returns settings for valid header", () => {
		const header = encodeConfigHeader(DEFAULT_SETTINGS);
		const req = makeRequest(header);
		const result = parseSettingsFromRequest(req);
		expect(result).toEqual(DEFAULT_SETTINGS);
	});

	it("returns 400 Response when header is missing", () => {
		const req = makeRequest(null);
		const result = parseSettingsFromRequest(req);
		expect(result).toBeInstanceOf(Response);
		expect((result as Response).status).toBe(400);
	});

	it("returns 400 Response when header is not valid base64", () => {
		const req = makeRequest("!!!invalid!!!");
		const result = parseSettingsFromRequest(req);
		expect(result).toBeInstanceOf(Response);
		expect((result as Response).status).toBe(400);
	});

	it("returns 400 Response when header JSON fails schema", () => {
		const header = btoa(JSON.stringify({hello: "world"}));
		const req = makeRequest(header);
		const result = parseSettingsFromRequest(req);
		expect(result).toBeInstanceOf(Response);
		expect((result as Response).status).toBe(400);
	});
});
