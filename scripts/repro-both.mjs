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

const HDRS = { "X-LLM-Config": encodeConfigHeader(settings) };

async function testBoth() {
  const formData = new FormData();
  formData.append("image", new Blob([MINIMAL_JPEG], { type: "image/jpeg" }), "test.jpg");

  // Test 1: analyze-image with full body read
  console.log("=== Test 1: /api/analyze-image ===");
  {
    const t0 = Date.now();
    const res = await fetch(`${BASE}/api/analyze-image`, { method: "POST", body: formData, headers: HDRS });
    console.log(`Status: ${res.status} (${Date.now() - t0}ms)`);
    const text = await res.text();
    console.log(`Body length: ${text.length} bytes`);
    console.log(`Body preview: ${text.slice(0, 200)}`);
    console.log(`Total: ${Date.now() - t0}ms\n`);
  }

  // Test 2: run-all with full body read
  console.log("=== Test 2: /api/run-all ===");
  {
    const fd2 = new FormData();
    fd2.append("image", new Blob([MINIMAL_JPEG], { type: "image/jpeg" }), "test.jpg");
    const t0 = Date.now();
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 25000);
    try {
      const res = await fetch(`${BASE}/api/run-all`, { method: "POST", body: fd2, headers: HDRS, signal: controller.signal });
      console.log(`Status: ${res.status} (${Date.now() - t0}ms)`);
      const text = await res.text();
      console.log(`Body length: ${text.length} bytes`);
      const lines = text.split("\n").filter(l => l.trim());
      console.log(`Lines: ${lines.length}`);
      for (const line of lines) {
        console.log(`  ${line.slice(0, 150)}`);
      }
      console.log(`Total: ${Date.now() - t0}ms`);
    } catch(e) {
      console.error(`Error after ${Date.now() - t0}ms: ${e.message}`);
    } finally {
      clearTimeout(timer);
    }
  }
}

testBoth();
