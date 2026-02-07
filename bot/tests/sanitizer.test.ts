import { describe, it, expect } from "vitest";
import { sanitize } from "../src/content/sanitizer.js";

describe("Sanitizer", () => {
  it("should truncate content exceeding max length", () => {
    const longContent = "A".repeat(300);
    const result = sanitize(longContent, 280);

    expect(result.length).toBeLessThanOrEqual(280);
    expect(result.endsWith("\u2026")).toBe(true);
  });

  it("should not truncate content within max length", () => {
    const content = "Short message";
    const result = sanitize(content, 280);

    expect(result).toBe("Short message");
  });

  it("should trim whitespace", () => {
    const result = sanitize("  hello world  ");
    expect(result).toBe("hello world");
  });

  it("should collapse multiple spaces", () => {
    const result = sanitize("hello    world");
    expect(result).toBe("hello world");
  });

  it("should remove blocked keywords (case-insensitive)", () => {
    const result = sanitize("This is Guaranteed Profit for you!");
    expect(result).not.toContain("Guaranteed Profit");
    expect(result).toContain("This is");
    expect(result).toContain("for you!");
  });

  it("should remove multiple blocked keywords", () => {
    const result = sanitize("This is risk-free and guaranteed profit!");
    expect(result).not.toContain("risk-free");
    expect(result).not.toContain("guaranteed profit");
  });

  it("should handle custom blocked keywords", () => {
    const result = sanitize("buy now for cheap!", 280, ["buy now"]);
    expect(result).not.toContain("buy now");
    expect(result).toContain("for cheap!");
  });

  it("should clean non-printable characters", () => {
    const result = sanitize("hello\x00world\x01test");
    expect(result).toBe("helloworldtest");
  });

  it("should preserve valid unicode characters", () => {
    const result = sanitize("Hello world! Price: 5 SOL");
    expect(result).toContain("Hello world!");
  });

  it("should handle empty string", () => {
    const result = sanitize("");
    expect(result).toBe("");
  });

  it("should use default max length of 280", () => {
    const longContent = "B".repeat(500);
    const result = sanitize(longContent);

    expect(result.length).toBeLessThanOrEqual(280);
  });
});
