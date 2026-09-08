// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { TransferScreen } from "./TransferScreen";
import { exportSettings, type Settings } from "./domain/settings";
import { DEFAULT_WORKING_WEEKDAYS } from "./domain/workdays";

vi.mock("@tauri-apps/plugin-clipboard-manager", () => ({
  readText: vi.fn(),
  writeText: vi.fn(),
}));
vi.mock("@tauri-apps/plugin-dialog", () => ({
  open: vi.fn(),
  save: vi.fn(),
}));
vi.mock("@tauri-apps/plugin-fs", () => ({
  readTextFile: vi.fn(),
  writeTextFile: vi.fn(),
}));

const VALID: Settings = {
  firstRetiredDay: "2032-06-01",
  workingWeekdays: DEFAULT_WORKING_WEEKDAYS,
  vacationDaysPerYear: 20,
  motion: "system",
  hasCelebrated: false,
};

afterEach(cleanup);

describe("TransferScreen", () => {
  it("previews and confirms a whole-settings replacement", async () => {
    const onImport = vi.fn();
    render(
      <TransferScreen settings={VALID} onBack={vi.fn()} onImport={onImport} />,
    );

    fireEvent.change(screen.getByLabelText("Backup JSON"), {
      target: { value: JSON.stringify(exportSettings(VALID)) },
    });
    await userEvent.click(
      screen.getByRole("button", { name: "Review imported settings" }),
    );

    expect(
      screen.getByRole("heading", { name: "Review replacement" }),
    ).toHaveFocus();
    expect(
      screen.getByText("Monday, Tuesday, Wednesday, Thursday, Friday"),
    ).toBeVisible();
    await userEvent.click(
      screen.getByRole("button", { name: "Replace my settings" }),
    );
    expect(onImport).toHaveBeenCalledWith(VALID);
  });

  it("rejects a newer schema before offering replacement", async () => {
    render(
      <TransferScreen settings={VALID} onBack={vi.fn()} onImport={vi.fn()} />,
    );
    fireEvent.change(screen.getByLabelText("Backup JSON"), {
      target: {
        value: JSON.stringify({ ...exportSettings(VALID), schemaVersion: 2 }),
      },
    });
    await userEvent.click(
      screen.getByRole("button", { name: "Review imported settings" }),
    );

    expect(screen.getByRole("status")).toHaveTextContent(/newer version/i);
    expect(
      screen.queryByRole("button", { name: "Replace my settings" }),
    ).not.toBeInTheDocument();
  });
});
