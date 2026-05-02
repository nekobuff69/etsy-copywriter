/**
 * Reproduction script for run-all timeout bug.
 * Usage: node scripts/repro-run-all.mjs
 */

const API_URL = "http://localhost:3000/api/run-all";
const TIMEOUT_MS = 30_000;

// Create a minimal valid JPEG (1x1 red pixel) using Buffer directly
const MINIMAL_JPEG_BASE64 = "/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQgJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAABAAEDASIAAhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/8QAHwEAAwEBAQEBAQEBAQAAAAAAAAECAwQFBgcICQoL/8QAtREAAgECBAQDBAcFBAQAAQJ3AAECAxEEBSExBhJBUQdhcRMiMoEIFEKRobHBCSMzUvAVYnLRChYkNOEl8RcYI4Q/SFhSRFJiMkVic4EzMyQ1NmQ9QkNDR0SlFUVVNXWFlomJicoKSo0NUVVZTV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uLi4+Tl5ufo6erx8vP09fb3+Pn6/9oADAMBAAIRAxEAPwA3/9k=";
const MINIMAL_JPEG = Buffer.from(MINIMAL_JPEG_BASE64, "base64");

function encodeConfigHeader(settings) {
  return Buffer.from(JSON.stringify(settings)).toString("base64");
}

const settings = {
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

async function main() {
  // Use node-fetch compatible FormData
  const formData = new FormData();
  formData.append("image", new Blob([MINIMAL_JPEG], { type: "image/jpeg" }), "test.jpg");

  console.log("[REPRO] Starting run-all request...");
  const t0 = Date.now();

  const controller = new AbortController();
  const timer = setTimeout(() => {
    console.log(`[REPRO] Client-side ${TIMEOUT_MS/1000}s timeout reached, aborting`);
    controller.abort();
  }, TIMEOUT_MS);

  try {
    const res = await fetch(API_URL, {
      method: "POST",
      body: formData,
      headers: {
        "X-LLM-Config": encodeConfigHeader(settings),
      },
      signal: controller.signal,
    });

    console.log(`[REPRO] Response status: ${res.status} (${(Date.now() - t0)}ms)`);

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      console.error("[REPRO] Non-OK response:", JSON.stringify(data));
      clearTimeout(timer);
      return;
    }

    const reader = res.body?.getReader();
    if (!reader) {
      console.error("[REPRO] No response body");
      clearTimeout(timer);
      return;
    }

    const decoder = new TextDecoder();
    let buffer = "";
    let eventCount = 0;

    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        console.log(`[REPRO] Stream closed by server after ${(Date.now() - t0)}ms (${eventCount} events)`);
        break;
      }
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";
      for (const line of lines) {
        if (!line.trim()) continue;
        try {
          const event = JSON.parse(line);
          eventCount++;
          console.log(`[REPRO] Event #${eventCount} at ${(Date.now() - t0)}ms: stage="${event.stage}"`);

          if (event.stage === "error") {
            console.error(`[REPRO] ERROR event: ${event.error}`);
          }
          if (event.stage === "done") {
            console.log(`[REPRO] DONE! Analysis keys: ${Object.keys(event.analysis || {}).join(", ")}`);
            console.log(`[REPRO] DONE! Copy keys: ${Object.keys(event.copy || {}).join(", ")}`);
          }
        } catch (parseErr) {
          console.error(`[REPRO] JSON parse error for line: ${line.slice(0, 100)}...`);
          console.error(`[REPRO] Parse error:`, parseErr.message);
        }
      }
    }

    console.log(`[REPRO] Total time: ${(Date.now() - t0)}ms`);
  } catch (err) {
    if (err.name === "AbortError") {
      console.error(`[REPRO] Request aborted after ${(Date.now() - t0)}ms`);
    } else {
      console.error(`[REPRO] Error after ${(Date.now() - t0)}ms:`, err.message);
    }
  } finally {
    clearTimeout(timer);
  }
}

main();
