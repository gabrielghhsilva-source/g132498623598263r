import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { SubtaskList } from "@/components/SubtaskList";
import { PrioritySelect, PriorityBadge } from "@/components/PrioritySelect";

describe("SubtaskList", () => {
  it("renders subtasks with progress count", () => {
    render(
      <SubtaskList
        subtasks={[
          { id: "1", text: "a", done: true },
          { id: "2", text: "b", done: false },
        ]}
        onAdd={vi.fn()}
        onToggle={vi.fn()}
        onDelete={vi.fn()}
      />
    );
    expect(screen.getByText(/1\/2 concluídas/)).toBeInTheDocument();
    expect(screen.getByDisplayValue?.("a") ?? screen.getByText("a")).toBeInTheDocument();
  });

  it("calls onAdd when typing and pressing Enter", () => {
    const onAdd = vi.fn();
    render(<SubtaskList subtasks={[]} onAdd={onAdd} onToggle={vi.fn()} onDelete={vi.fn()} />);
    const input = screen.getByPlaceholderText(/Adicionar subtarefa/i);
    fireEvent.change(input, { target: { value: "novo passo" } });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(onAdd).toHaveBeenCalledWith("novo passo");
  });

  it("ignores empty subtask submission", () => {
    const onAdd = vi.fn();
    render(<SubtaskList subtasks={[]} onAdd={onAdd} onToggle={vi.fn()} onDelete={vi.fn()} />);
    const input = screen.getByPlaceholderText(/Adicionar subtarefa/i);
    fireEvent.keyDown(input, { key: "Enter" });
    expect(onAdd).not.toHaveBeenCalled();
  });

  it("toggles subtask when clicking checkbox", () => {
    const onToggle = vi.fn();
    render(
      <SubtaskList
        subtasks={[{ id: "1", text: "a", done: false }]}
        onAdd={vi.fn()}
        onToggle={onToggle}
        onDelete={vi.fn()}
      />
    );
    fireEvent.click(screen.getByRole("button", { name: /Marcar subtarefa/i }));
    expect(onToggle).toHaveBeenCalledWith("1");
  });
});

describe("PrioritySelect", () => {
  it("calls onChange when clicking a priority", () => {
    const onChange = vi.fn();
    render(<PrioritySelect value="none" onChange={onChange} />);
    fireEvent.click(screen.getByRole("button", { name: /Prioridade Urgente/i }));
    expect(onChange).toHaveBeenCalledWith("urgent");
  });
});

describe("PriorityBadge", () => {
  it("renders nothing for 'none'", () => {
    const { container } = render(<PriorityBadge priority="none" />);
    expect(container.firstChild).toBeNull();
  });

  it("renders a label for valid priorities", () => {
    render(<PriorityBadge priority="high" />);
    expect(screen.getByText("Alta")).toBeInTheDocument();
  });
});
