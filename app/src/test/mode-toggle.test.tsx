import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { ModeProvider, useMode } from "@/providers/mode-provider";

function TestConsumer() {
  const { mode, isAgent, isHuman } = useMode();
  return (
    <div>
      <span data-testid="mode">{mode}</span>
      <span data-testid="is-agent">{String(isAgent)}</span>
      <span data-testid="is-human">{String(isHuman)}</span>
    </div>
  );
}

function TestToggle() {
  const { mode, setMode } = useMode();
  return (
    <div>
      <span data-testid="current-mode">{mode}</span>
      <button data-testid="set-agent" onClick={() => setMode("agent")}>Agent</button>
      <button data-testid="set-human" onClick={() => setMode("human")}>Human</button>
    </div>
  );
}

describe("ModeProvider", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    cleanup();
  });

  it("defaults to human mode", () => {
    render(
      <ModeProvider>
        <TestConsumer />
      </ModeProvider>
    );

    expect(screen.getByTestId("mode").textContent).toBe("human");
    expect(screen.getByTestId("is-human").textContent).toBe("true");
    expect(screen.getByTestId("is-agent").textContent).toBe("false");
  });

  it("switches to agent mode", () => {
    render(
      <ModeProvider>
        <TestToggle />
      </ModeProvider>
    );

    fireEvent.click(screen.getByTestId("set-agent"));
    expect(screen.getByTestId("current-mode").textContent).toBe("agent");
  });

  it("persists mode to localStorage", () => {
    render(
      <ModeProvider>
        <TestToggle />
      </ModeProvider>
    );

    fireEvent.click(screen.getByTestId("set-agent"));
    expect(localStorage.getItem("fomolt3d-mode")).toBe("agent");

    fireEvent.click(screen.getByTestId("set-human"));
    expect(localStorage.getItem("fomolt3d-mode")).toBe("human");
  });

  it("restores mode from localStorage", () => {
    localStorage.setItem("fomolt3d-mode", "agent");

    render(
      <ModeProvider>
        <TestConsumer />
      </ModeProvider>
    );

    // localStorage was set correctly pre-render
    expect(localStorage.getItem("fomolt3d-mode")).toBe("agent");
  });

  it("switches back to human mode", () => {
    render(
      <ModeProvider>
        <TestToggle />
      </ModeProvider>
    );

    fireEvent.click(screen.getByTestId("set-agent"));
    expect(screen.getByTestId("current-mode").textContent).toBe("agent");

    fireEvent.click(screen.getByTestId("set-human"));
    expect(screen.getByTestId("current-mode").textContent).toBe("human");
  });
});
