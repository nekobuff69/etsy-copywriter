/**
 * Compare individual analyze-image endpoint vs run-all endpoint.
 */
const BASE = "http://localhost:3000";

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

async function testAnalyzeImage() {
  const formData = new FormData();
  formData.append("image", new Blob([MINIMAL_JPEG], { type: "image/jpeg" }), "test.jpg");

  console.log("[ANALYZE] Starting analyze-image request...");
  const t0 = Date.now();

  const controller = new AbortController();
  const timer = setTimeout(() => {
    console.log(`[ANALYZE] 30s timeout, aborting`);
    controller.abort();
  }, 30000);

  try {
    const res = await fetch(`${BASE}/api/analyze-image`, {
      method: "POST",
      body: formData,
      headers: { "X-LLM-Config": encodeConfigHeader(settings) },
      signal: controller.signal,
    });

    console.log(`[ANALYZE] Response status: ${res.status} (${Date.now() - t0}ms)`);

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      console.error("[ANALYZE] Non-OK:", JSON.stringify(data).slice(0, 200));
      clearTimeout(timer);
      return;
    }

    // Try to read some chunks from the stream to see if it's flowing
    const reader = res.body?.getReader();
    if (!reader) {
      console.error("[ANALYZE] No body");
      clearTimeout(timer);
      return;
    }

    const decoder = new TextDecoder();
    let chunkCount = 0;
    let totalBytes = 0;

    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        console.log(`[ANALYZE] Stream done after ${Date.now() - t0}ms (${chunkCount} chunks, ${totalBytes} bytes)`);
        break;
      }
      chunkCount++;
      totalBytes += value.length;
      const text = decoder.decode(value, { stream: true });
      // Show first ~100 chars of first few chunks
      if (chunkCount <= 3) {
        console.log(`[ANALYZE] Chunk #${chunkCount} at ${Date.now() - t0}ms: ${text.slice(0, 100)}...`);
      }
    }
    console.log(`[ANALYZE] Total: ${Date.now() - t0}ms`);
  } catch (err) {
    if (err.name === "AbortError") {
      console.error(`[ANALYZE] Aborted after ${Date.now() - t0}ms`);
    } else {
      console.error(`[ANALYZE] Error after ${Date.now() - t0}ms: ${err.message}`);
    }
  } finally {
    clearTimeout(timer);
  }
}

testAnalyzeImage();
