// @vitest-environment node
import { describe, it, expect } from "vitest";
import {
  getErrorByCode,
  getErrorByName,
  parseProgramError,
  isProgramError,
  ErrorCode,
} from "../errors";

describe("getErrorByCode", () => {
  it("returns error for valid code", () => {
    const err = getErrorByCode(6000);
    expect(err).not.toBeNull();
    expect(err!.code).toBe(6000);
    expect(err!.name).toBe("GameNotActive");
    expect(err!.userMessage).toContain("round has ended");
  });

  it("returns null for unknown code", () => {
    expect(getErrorByCode(9999)).toBeNull();
  });

  it("all 20 error codes are mapped", () => {
    for (let code = 6000; code <= 6019; code++) {
      const err = getErrorByCode(code);
      expect(err, `Error code ${code} should be mapped`).not.toBeNull();
      expect(err!.code).toBe(code);
      expect(err!.name).toBeTruthy();
      expect(err!.message).toBeTruthy();
      expect(err!.userMessage).toBeTruthy();
    }
  });
});

describe("getErrorByName", () => {
  it("finds error by name", () => {
    const err = getErrorByName("InsufficientFunds");
    expect(err).not.toBeNull();
    expect(err!.code).toBe(6004);
  });

  it("returns null for unknown name", () => {
    expect(getErrorByName("FooBarBaz")).toBeNull();
  });
});

describe("parseProgramError", () => {
  it("parses Anchor error with errorCode.number", () => {
    const err = {
      error: {
        errorCode: { number: 6004, code: "InsufficientFunds" },
        errorMessage: "Insufficient funds for purchase",
      },
    };
    const parsed = parseProgramError(err);
    expect(parsed).not.toBeNull();
    expect(parsed!.code).toBe(6004);
    expect(parsed!.name).toBe("InsufficientFunds");
  });

  it("parses error with direct code property", () => {
    const err = { code: 6010, message: "Cannot refer yourself" };
    const parsed = parseProgramError(err);
    expect(parsed).not.toBeNull();
    expect(parsed!.code).toBe(6010);
  });

  it("parses error from message string", () => {
    const err = new Error("Transaction failed: custom program error: 6005");
    const parsed = parseProgramError(err);
    expect(parsed).not.toBeNull();
    expect(parsed!.code).toBe(6005);
  });

  it("returns null for unknown error", () => {
    expect(parseProgramError(new Error("Network error"))).toBeNull();
  });

  it("returns null for null/undefined", () => {
    expect(parseProgramError(null)).toBeNull();
    expect(parseProgramError(undefined)).toBeNull();
  });
});

describe("isProgramError", () => {
  it("returns true for matching error", () => {
    const err = { code: 6000 };
    expect(isProgramError(err, 6000)).toBe(true);
  });

  it("returns false for non-matching error", () => {
    const err = { code: 6000 };
    expect(isProgramError(err, 6001)).toBe(false);
  });
});

describe("ErrorCode constants", () => {
  it("has all 20 error codes", () => {
    expect(ErrorCode.GameNotActive).toBe(6000);
    expect(ErrorCode.PlayerNotInRound).toBe(6019);
    expect(Object.keys(ErrorCode)).toHaveLength(20);
  });
});
