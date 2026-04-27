import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";
import { KanbanBoard } from "@/components/KanbanBoard";
import { TaskArea, TaskTag } from "@/lib/types";
import { makeTask } from "@/lib/taskOperations";

function buildAreas(): TaskArea[] {
  return [
    { id: "work", name: "Trabalho", icon: "💼", collapsed: false, tasks: [
      makeTask({ text: "Existing work task", priority: "high" }),
    ]},
    { id: "games", name: "Jogos", icon: "🎮", collapsed: false, tasks: [] },
  ];
}

const tags: TaskTag[] = [
  { id: "t1", name: "cliente X", color: "#ef4444" },
];

function buildProps(overrides: Partial<React.ComponentProps<typeof KanbanBoard>> = {}) {
  return {
    areas: buildAreas(),
    tags,
    timezone: "America/Sao_Paulo",
    onAddTaskFull: vi.fn(),
    onAddTaskQuick: vi.fn(),
    onUpdateText: vi.fn(),
    onUpdateStatus: vi.fn(),
    onUpdateStyle: vi.fn(),
    onUpdateTime: vi.fn(),
    onUpdatePriority: vi.fn(),
    onUpdateTags: vi.fn(),
    onMoveTask: vi.fn(),
    onDeleteTask: vi.fn(),
    onDeleteArea: vi.fn(),
    onAddSubtask: vi.fn(),
    onToggleSubtask: vi.fn(),
    onDeleteSubtask: vi.fn(),
    onUpdateSubtaskText: vi.fn(),
    onAddComment: vi.fn(),
    onDeleteComment: vi.fn(),
    onAddTag: vi.fn(() => ({ id: "new", name: "new", color: "#000" })),
    onDeleteTag: vi.fn(),
    onAddArea: vi.fn(),
    ...overrides,
  } as React.ComponentProps<typeof KanbanBoard>;
}

describe("KanbanBoard", () => {
  beforeEach(() => {
    // jsdom doesn't implement these used by Radix Dialog focus management
    Element.prototype.scrollIntoView = vi.fn();
  });

  it("renders all area columns with task counts", () => {
    render(<KanbanBoard {...buildProps()} />);
    expect(screen.getByText("Trabalho")).toBeInTheDocument();
    expect(screen.getByText("Jogos")).toBeInTheDocument();
    expect(screen.getByText("Existing work task")).toBeInTheDocument();
  });

  it("shows the 'Nova área' button", () => {
    render(<KanbanBoard {...buildProps()} />);
    expect(screen.getByRole("button", { name: /Nova área/i })).toBeInTheDocument();
  });

  it("calls onAddArea when 'Nova área' clicked", () => {
    const onAddArea = vi.fn();
    render(<KanbanBoard {...buildProps({ onAddArea })} />);
    fireEvent.click(screen.getByRole("button", { name: /Nova área/i }));
    expect(onAddArea).toHaveBeenCalled();
  });

  it("inline quick add: clicking + opens input and Enter submits", () => {
    const onAddTaskQuick = vi.fn();
    render(<KanbanBoard {...buildProps({ onAddTaskQuick })} />);
    fireEvent.click(screen.getByRole("button", { name: /Nova tarefa em Jogos/i }));
    const input = screen.getByPlaceholderText(/Título da tarefa/i);
    fireEvent.change(input, { target: { value: "Jogar xadrez" } });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(onAddTaskQuick).toHaveBeenCalledWith("games", "Jogar xadrez");
  });

  it("ignores empty quick add", () => {
    const onAddTaskQuick = vi.fn();
    render(<KanbanBoard {...buildProps({ onAddTaskQuick })} />);
    fireEvent.click(screen.getByRole("button", { name: /Nova tarefa em Jogos/i }));
    const input = screen.getByPlaceholderText(/Título da tarefa/i);
    fireEvent.keyDown(input, { key: "Enter" });
    expect(onAddTaskQuick).not.toHaveBeenCalled();
  });

  it("global N shortcut opens quick add dialog", () => {
    render(<KanbanBoard {...buildProps()} />);
    fireEvent.keyDown(window, { key: "n" });
    // Dialog title appears
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getAllByText(/Nova tarefa/i).length).toBeGreaterThan(0);
  });

  it("N shortcut is ignored while typing in inputs", () => {
    render(<KanbanBoard {...buildProps()} />);
    // Open inline add to focus a textarea
    fireEvent.click(screen.getByRole("button", { name: /Nova tarefa em Jogos/i }));
    const input = screen.getByPlaceholderText(/Título da tarefa/i);
    input.focus();
    fireEvent.keyDown(input, { key: "n" });
    // No dialog opened
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("clicking a card opens the detail dialog", () => {
    render(<KanbanBoard {...buildProps()} />);
    fireEvent.click(screen.getByText("Existing work task"));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText("Editar tarefa")).toBeInTheDocument();
  });

  it("quick toggle done on card calls onUpdateStatus", () => {
    const onUpdateStatus = vi.fn();
    render(<KanbanBoard {...buildProps({ onUpdateStatus })} />);
    const checkbox = screen.getByRole("button", { name: /Marcar como feita/i });
    fireEvent.click(checkbox);
    expect(onUpdateStatus).toHaveBeenCalledWith("work", expect.any(String), "done");
  });

  it("submitting QuickAddDialog calls onAddTaskFull with full input", () => {
    const onAddTaskFull = vi.fn();
    render(<KanbanBoard {...buildProps({ onAddTaskFull })} />);
    fireEvent.keyDown(window, { key: "n" });
    const dialog = screen.getByRole("dialog");
    const titleInput = within(dialog).getByPlaceholderText(/Descreva a tarefa/i);
    fireEvent.change(titleInput, { target: { value: "Nova task complexa" } });
    const subtaskArea = within(dialog).getByPlaceholderText(/Fazer briefing/i);
    fireEvent.change(subtaskArea, { target: { value: "passo 1\npasso 2" } });
    fireEvent.click(within(dialog).getByRole("button", { name: /Criar tarefa/i }));
    expect(onAddTaskFull).toHaveBeenCalledTimes(1);
    const [areaId, input] = onAddTaskFull.mock.calls[0];
    expect(areaId).toBe("work");
    expect(input.text).toBe("Nova task complexa");
    expect(input.subtasks).toEqual([{ text: "passo 1" }, { text: "passo 2" }]);
  });

  it("renders the virtual 'Prontas' column with done count", () => {
    const areas: TaskArea[] = [
      { id: "work", name: "Trabalho", icon: "💼", collapsed: false, tasks: [
        { ...makeTask({ text: "Done one" }), status: "done" },
        makeTask({ text: "Pending one" }),
      ]},
      { id: "games", name: "Jogos", icon: "🎮", collapsed: false, tasks: [
        { ...makeTask({ text: "Done two" }), status: "done" },
      ]},
    ];
    render(<KanbanBoard {...buildProps({ areas })} />);
    expect(screen.getByText("Prontas")).toBeInTheDocument();
    // 2 done tasks visible inside the Prontas column
    expect(screen.getByText("Done one")).toBeInTheDocument();
    expect(screen.getByText("Done two")).toBeInTheDocument();
    // Pending one still in its area
    expect(screen.getByText("Pending one")).toBeInTheDocument();
  });

  it("hiding the 'Prontas' column persists and shows compact toggle", () => {
    localStorage.removeItem("kanban-hide-done");
    const areas: TaskArea[] = [
      { id: "work", name: "Trabalho", icon: "💼", collapsed: false, tasks: [
        { ...makeTask({ text: "Done one" }), status: "done" },
      ]},
    ];
    render(<KanbanBoard {...buildProps({ areas })} />);
    fireEvent.click(screen.getByRole("button", { name: /Ocultar coluna Prontas/i }));
    expect(localStorage.getItem("kanban-hide-done")).toBe("1");
    expect(screen.getByRole("button", { name: /Mostrar coluna Prontas/i })).toBeInTheDocument();
  });

  it("done tasks are NOT shown in their original area column", () => {
    const areas: TaskArea[] = [
      { id: "work", name: "Trabalho", icon: "💼", collapsed: false, tasks: [
        { ...makeTask({ text: "Already done" }), status: "done" },
      ]},
      { id: "games", name: "Jogos", icon: "🎮", collapsed: false, tasks: [] },
    ];
    render(<KanbanBoard {...buildProps({ areas })} />);
    // Single occurrence (in Prontas), not duplicated in Trabalho
    expect(screen.getAllByText("Already done")).toHaveLength(1);
  });
});
