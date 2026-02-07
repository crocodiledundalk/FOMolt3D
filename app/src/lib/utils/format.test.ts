import { describe, it, expect } from "vitest";
import { formatSol, formatAddress, formatTime, formatTimestamp } from "./format";

describe("formatSol", () => {
  it("formats lamports to SOL", () => {
    expect(formatSol(1_000_000_000)).toBe("1.0000");
    expect(formatSol(10_000_000)).toBe("0.0100");
    expect(formatSol(0)).toBe("0.0000");
  });

  it("respects decimal places", () => {
    expect(formatSol(1_500_000_000, 2)).toBe("1.50");
    expect(formatSol(42_500_000_000, 1)).toBe("42.5");
  });
});

describe("formatAddress", () => {
  it("truncates long addresses", () => {
    expect(formatAddress("AgNt1xRvPfBh8K2yLqA9mDjE5nFoQw7zXcYb4UiT3pRs")).toBe("AgNt...3pRs");
  });

  it("returns short addresses as-is", () => {
    expect(formatAddress("short")).toBe("short");
    expect(formatAddress("12345678")).toBe("12345678");
  });
});

describe("formatTime", () => {
  it("formats seconds as HH:MM:SS", () => {
    expect(formatTime(3661)).toBe("01:01:01");
    expect(formatTime(0)).toBe("00:00:00");
    expect(formatTime(86400)).toBe("24:00:00");
  });

  it("handles negative values", () => {
    expect(formatTime(-10)).toBe("00:00:00");
  });
});

describe("formatTimestamp", () => {
  it("returns a locale string", () => {
    const result = formatTimestamp(1700000000);
    expect(typeof result).toBe("string");
    expect(result.length).toBeGreaterThan(0);
  });
});
