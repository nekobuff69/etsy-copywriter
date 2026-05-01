import { describe, it, expect } from "vitest";
import { computeFileHash } from "../lib/file-hash";

describe("computeFileHash", () => {
  function makeFile(content: string, name = "test.txt", type = "text/plain"): File {
    return new File([content], name, { type });
  }

  it("should produce a deterministic hash for the same file content", async () => {
    const file1 = makeFile("hello world");
    const file2 = makeFile("hello world");
    const hash1 = await computeFileHash(file1);
    const hash2 = await computeFileHash(file2);
    expect(hash1).toBe(hash2);
  });

  it("should produce different hashes for different file content", async () => {
    const file1 = makeFile("hello world");
    const file2 = makeFile("goodbye world");
    const hash1 = await computeFileHash(file1);
    const hash2 = await computeFileHash(file2);
    expect(hash1).not.toBe(hash2);
  });

  it("should produce a 64-character hex string", async () => {
    const file = makeFile("test content");
    const hash = await computeFileHash(file);
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
  });

  it("should produce different hashes for files with same name but different content", async () => {
    const file1 = makeFile("content A", "same.txt");
    const file2 = makeFile("content B", "same.txt");
    const hash1 = await computeFileHash(file1);
    const hash2 = await computeFileHash(file2);
    expect(hash1).not.toBe(hash2);
  });

  it("should produce different hashes for empty vs non-empty files", async () => {
    const emptyFile = makeFile("");
    const nonEmptyFile = makeFile("not empty");
    const hashEmpty = await computeFileHash(emptyFile);
    const hashNonEmpty = await computeFileHash(nonEmptyFile);
    expect(hashEmpty).not.toBe(hashNonEmpty);
  });

  it("should produce the known SHA-256 hash for empty string", async () => {
    // SHA-256 of empty string is e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855
    const file = makeFile("");
    const hash = await computeFileHash(file);
    expect(hash).toBe("e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855");
  });
});
