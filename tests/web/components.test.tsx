// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom/vitest";
import { EntryForm } from "../../apps/web/src/components/EntryForm";
import { HistoryList } from "../../apps/web/src/components/HistoryList";
import { LoginScreen } from "../../apps/web/src/components/LoginScreen";
import { StatsGrid } from "../../apps/web/src/components/StatsGrid";
import { SettingsDialog } from "../../apps/web/src/components/SettingsDialog";
import { formatDelta } from "../../apps/web/src/lib/format";
import { formatEntryDate } from "../../apps/web/src/lib/date";
import { buildWeightStats, type WeightEntry } from "@moonweight/shared";
afterEach(cleanup);
const fixture: WeightEntry = {
  id: "fictional",
  date: "2025-05-01",
  weightKg: 78.123,
  note: "Fictional note",
  createdAt: "2025-05-01T00:00:00Z",
  updatedAt: "2025-05-01T00:00:00Z",
};
describe("critical frontend behavior", () => {
  it("changes display units without rounding a configured target", async () => {
    Object.defineProperty(HTMLDialogElement.prototype, "showModal", {
      configurable: true,
      value: function (this: HTMLDialogElement) {
        this.setAttribute("open", "");
      },
    });
    Object.defineProperty(HTMLDialogElement.prototype, "close", {
      configurable: true,
      value: function (this: HTMLDialogElement) {
        this.removeAttribute("open");
      },
    });
    const user = userEvent.setup();
    const save = vi.fn().mockResolvedValue(undefined);
    render(
      <SettingsDialog
        settings={{ unit: "kg", targetWeightKg: 76.123 }}
        saving={false}
        onSave={save}
        onClose={vi.fn()}
      />,
    );
    await user.click(screen.getByRole("radio", { name: /Pounds/ }));
    await user.click(screen.getByRole("button", { name: "Save preferences" }));
    expect(save).toHaveBeenCalledWith({ unit: "lb", targetWeightKg: 76.123 });
  });
  it("validates an empty reading inline and preserves input after a failed save", async () => {
    const user = userEvent.setup();
    const save = vi.fn().mockRejectedValue(new Error("Connection interrupted"));
    render(<EntryForm unit="kg" saving={false} onSubmit={save} />);
    await user.click(screen.getByRole("button", { name: "Add entry" }));
    expect(screen.getByText("Weight must be at least 0.1 kg")).toBeVisible();
    expect(save).not.toHaveBeenCalled();
    await user.type(screen.getByLabelText(/Weight/), "78.2");
    await user.click(screen.getByRole("button", { name: "Add entry" }));
    expect(screen.getByRole("alert")).toHaveTextContent("Connection interrupted");
    expect(screen.getByLabelText(/Weight/)).toHaveValue(78.2);
  });
  it("keeps canonical precision on a note-only edit in pounds", async () => {
    const user = userEvent.setup();
    const save = vi.fn().mockResolvedValue(undefined);
    render(<EntryForm unit="lb" editingEntry={fixture} saving={false} onSubmit={save} />);
    await user.clear(screen.getByLabelText(/Note/));
    await user.type(screen.getByLabelText(/Note/), "Updated note");
    await user.click(screen.getByRole("button", { name: "Save changes" }));
    expect(save).toHaveBeenCalledWith({
      date: fixture.date,
      weightKg: fixture.weightKg,
      note: "Updated note",
    });
  });
  it("disables entry input and submit while saving", () => {
    render(<EntryForm unit="kg" saving onSubmit={vi.fn()} />);
    expect(screen.getByRole("button", { name: "Saving…" })).toBeDisabled();
    expect(screen.getByLabelText(/Weight/)).toBeDisabled();
  });
  it("searches history, paginates and exposes explicit edit/delete actions", async () => {
    const user = userEvent.setup();
    const edit = vi.fn();
    const remove = vi.fn();
    render(
      <HistoryList
        entries={Array.from({ length: 14 }, (_, i) => ({
          ...fixture,
          id: String(i),
          note: i === 13 ? "Unique fictional note" : "Example note",
        }))}
        unit="kg"
        saving={false}
        onEdit={edit}
        onDelete={remove}
      />,
    );
    expect(screen.getByText("1–12 of 14 entries")).toBeVisible();
    await user.click(screen.getByRole("button", { name: "Next page" }));
    expect(screen.getByText("13–14 of 14 entries")).toBeVisible();
    await user.type(screen.getByLabelText("Search history"), "Unique");
    expect(screen.getByText("1–1 of 1 entries")).toBeVisible();
    await user.click(screen.getByRole("button", { name: /Edit entry/ }));
    expect(edit).toHaveBeenCalledWith(expect.objectContaining({ id: "13" }));
    await user.click(screen.getByRole("button", { name: /Delete entry/ }));
    expect(remove).toHaveBeenCalledWith(expect.objectContaining({ id: "13" }));
  });
  it("displays honest unavailable statistics for one reading", () => {
    render(<StatsGrid stats={buildWeightStats([fixture])} unit="kg" />);
    expect(screen.getAllByText("More nearby readings needed")).toHaveLength(2);
    expect(screen.getByText("78.1")).toBeVisible();
  });
  it("shows a login error without losing keyboard-accessible form controls", async () => {
    const user = userEvent.setup();
    render(
      <LoginScreen
        onLogin={vi.fn().mockRejectedValue(new Error("Unable to sign in. Check your password."))}
      />,
    );
    await user.type(screen.getByLabelText("Password"), "wrong");
    await user.click(screen.getByRole("button", { name: "Sign in" }));
    expect(screen.getByRole("alert")).toHaveTextContent("Check your password");
  });
  it("formats calendar dates consistently and avoids negative zero", () => {
    expect(formatEntryDate("2025-05-01")).toBe("1 May 2025");
    expect(formatDelta(-0.01)).toBe("0.0 kg");
  });
});
