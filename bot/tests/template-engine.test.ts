import { describe, it, expect } from "vitest";
import {
  renderTemplate,
  getDefaultTemplates,
} from "../src/content/template-engine.js";

describe("Template Engine", () => {
  it("should replace variables in a template", () => {
    const result = renderTemplate("pot_milestone", {
      milestone: 10,
      pot: "10.50",
      players: 42,
    });

    expect(result).toContain("10");
    expect(result).toContain("10.50");
    expect(result).toContain("42");
  });

  it("should handle missing variables gracefully by leaving placeholder", () => {
    const result = renderTemplate("pot_milestone", {
      milestone: 5,
      // pot and players missing
    });

    expect(result).toContain("5 SOL");
    expect(result).toContain("{pot}");
    expect(result).toContain("{players}");
  });

  it("should return fallback for unknown template name", () => {
    const result = renderTemplate("nonexistent_template", { foo: "bar" });

    expect(result).toContain("[Unknown template: nonexistent_template]");
    expect(result).toContain("bar");
  });

  it("should render pot_milestone template correctly", () => {
    const result = renderTemplate("pot_milestone", {
      milestone: 100,
      pot: "105.50",
      players: 200,
    });

    expect(result).toContain("crossed 100 SOL");
    expect(result).toContain("105.50 SOL");
    expect(result).toContain("200 crabs");
  });

  it("should render timer_drama template correctly", () => {
    const result = renderTemplate("timer_drama", {
      seconds: 30,
      lastBuyer: "ABC123",
      prize: "48.00",
    });

    expect(result).toContain("30s");
    expect(result).toContain("ABC123");
    expect(result).toContain("48.00 SOL");
  });

  it("should render round_start template correctly", () => {
    const result = renderTemplate("round_start", {
      round: 5,
      price: "0.0100",
    });

    expect(result).toContain("Round #5");
    expect(result).toContain("0.0100 SOL");
  });

  it("should render round_end template correctly", () => {
    const result = renderTemplate("round_end", {
      round: 3,
      winner: "WINNER_ADDR",
      prize: "250.00",
      totalKeys: 5000,
      players: 150,
    });

    expect(result).toContain("Round #3");
    expect(result).toContain("WINNER_ADDR");
    expect(result).toContain("250.00 SOL");
    expect(result).toContain("5000 claws");
    expect(result).toContain("150 crabs");
  });

  it("should have all expected default templates", () => {
    const templates = getDefaultTemplates();
    expect(templates).toHaveProperty("pot_milestone");
    expect(templates).toHaveProperty("timer_drama");
    expect(templates).toHaveProperty("round_start");
    expect(templates).toHaveProperty("round_end");
    expect(templates).toHaveProperty("hourly_summary");
    expect(templates).toHaveProperty("daily_recap");
  });

  it("should handle null and undefined values in data", () => {
    const result = renderTemplate("pot_milestone", {
      milestone: null,
      pot: undefined,
      players: 10,
    });

    expect(result).toContain("{pot}");
    expect(result).toContain("10 crabs");
  });
});
