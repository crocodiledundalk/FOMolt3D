import { render } from "@testing-library/react";
import { axe, toHaveNoViolations } from "jest-axe";
import { describe, it, expect, vi } from "vitest";

// Extend vitest's expect with jest-axe matchers
expect.extend(toHaveNoViolations);

// Mock hooks used by components
vi.mock("@/hooks/use-countdown", () => ({
  useCountdown: () => ({ hours: 12, minutes: 30, seconds: 45, urgency: "normal" as const }),
}));

vi.mock("@/hooks/use-flash-on-change", () => ({
  useFlashOnChange: () => false,
}));

vi.mock("@/lib/utils/cn", () => ({
  cn: (...args: string[]) => args.filter(Boolean).join(" "),
}));

// Import after mocks
import { TimerDisplay } from "@/components/game/timer-display";

describe("Accessibility", () => {
  describe("TimerDisplay", () => {
    it("has no axe violations", async () => {
      const { container } = render(<TimerDisplay timerEnd={Date.now() + 60000} />);
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it("has timer role and aria-live", () => {
      const { container } = render(<TimerDisplay timerEnd={Date.now() + 60000} />);
      const timer = container.querySelector('[role="timer"]');
      expect(timer).toBeTruthy();
      expect(timer?.getAttribute("aria-live")).toBe("polite");
      expect(timer?.getAttribute("aria-label")).toContain("hours");
    });
  });
});
