// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SettingsScreen } from "./SettingsScreen";
import { DEFAULT_SETTINGS, type Settings } from "./domain/settings";
import { DEFAULT_WORKING_WEEKDAYS } from "./domain/workdays";

const VALID: Settings = {
  firstRetiredDay: "2032-06-01",
  workingWeekdays: DEFAULT_WORKING_WEEKDAYS,
  vacationDaysPerYear: 20,
  motion: "system",
  hasCelebrated: false,
};

afterEach(cleanup);

describe("SettingsScreen", () => {
  it("requires a valid retirement date before onboarding can finish", async () => {
    const onSave = vi.fn();
    render(
      <SettingsScreen
        initialSettings={DEFAULT_SETTINGS}
        onboarding
        onSave={onSave}
      />,
    );

    const submit = screen.getByRole("button", { name: "Start counting" });
    expect(submit).toBeDisabled();

    fireEvent.change(screen.getByLabelText("First day of retirement"), {
      target: { value: "2032-06-01" },
    });
    expect(submit).toBeEnabled();
    await userEvent.click(submit);

    expect(onSave).toHaveBeenCalledWith({
      ...DEFAULT_SETTINGS,
      firstRetiredDay: "2032-06-01",
    });
  });

  it("discards draft edits when returning from settings", async () => {
    const onSave = vi.fn();
    const onCancel = vi.fn();
    render(
      <SettingsScreen
        initialSettings={VALID}
        onboarding={false}
        onSave={onSave}
        onCancel={onCancel}
      />,
    );

    await userEvent.click(screen.getByRole("button", { name: "Thursday" }));
    await userEvent.click(
      screen.getByRole("button", {
        name: "Discard changes and return to countdown",
      }),
    );

    expect(onCancel).toHaveBeenCalledOnce();
    expect(onSave).not.toHaveBeenCalled();
  });

  it("keeps an empty vacation entry invalid instead of coercing it to zero", () => {
    render(
      <SettingsScreen
        initialSettings={VALID}
        onboarding={false}
        onSave={vi.fn()}
      />,
    );
    fireEvent.change(screen.getByLabelText("Vacation days per year"), {
      target: { value: "" },
    });
    expect(
      screen.getByRole("button", { name: "Save settings" }),
    ).toBeDisabled();
    expect(screen.getByText(/whole number between 0 and 365/i)).toBeVisible();
  });
});
