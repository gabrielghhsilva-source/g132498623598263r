import { describe, it, expect } from "vitest";
import {
  makeTask, normalizeTask,
  addTaskToArea, updateTaskInAreas, removeTaskFromArea, moveTaskBetweenAreas,
  addSubtask, toggleSubtask, deleteSubtask, updateSubtaskText,
  addCommentToTask, deleteCommentFromTask,
} from "@/lib/taskOperations";
import { Task, TaskArea } from "@/lib/types";

function area(id: string, tasks: Task[] = []): TaskArea {
  return { id, name: id, icon: "📁", tasks, collapsed: false };
}

describe("makeTask", () => {
  it("creates task with defaults", () => {
    const t = makeTask({ text: "hello" });
    expect(t.text).toBe("hello");
    expect(t.status).toBe("todo");
    expect(t.priority).toBe("none");
    expect(t.tagIds).toEqual([]);
    expect(t.subtasks).toEqual([]);
    expect(t.comments).toEqual([]);
    expect(t.id).toBeTruthy();
  });

  it("creates task with subtasks normalized", () => {
    const t = makeTask({ text: "x", subtasks: [{ text: "a" }, { text: "b" }] });
    expect(t.subtasks).toHaveLength(2);
    expect(t.subtasks![0]).toMatchObject({ text: "a", done: false });
    expect(t.subtasks![0].id).toBeTruthy();
  });

  it("preserves provided priority and tags", () => {
    const t = makeTask({ text: "x", priority: "high", tagIds: ["t1", "t2"] });
    expect(t.priority).toBe("high");
    expect(t.tagIds).toEqual(["t1", "t2"]);
  });
});

describe("normalizeTask", () => {
  it("backfills missing fields on legacy tasks", () => {
    const legacy: any = {
      id: "x", text: "old", status: "todo",
      style: { size: "base", weight: "normal", color: "#000" },
      createdAt: "2024-01-01",
    };
    const n = normalizeTask(legacy);
    expect(n.comments).toEqual([]);
    expect(n.priority).toBe("none");
    expect(n.tagIds).toEqual([]);
    expect(n.subtasks).toEqual([]);
  });
});

describe("addTaskToArea", () => {
  it("adds task to right area only", () => {
    const a1 = area("a1");
    const a2 = area("a2");
    const t = makeTask({ text: "new" });
    const next = addTaskToArea([a1, a2], "a2", t);
    expect(next[0].tasks).toHaveLength(0);
    expect(next[1].tasks).toHaveLength(1);
    expect(next[1].tasks[0].text).toBe("new");
  });
});

describe("updateTaskInAreas", () => {
  it("updates only the matching task", () => {
    const t1 = makeTask({ text: "t1" });
    const t2 = makeTask({ text: "t2" });
    const a = area("a", [t1, t2]);
    const next = updateTaskInAreas([a], "a", t1.id, t => ({ ...t, text: "updated" }));
    expect(next[0].tasks[0].text).toBe("updated");
    expect(next[0].tasks[1].text).toBe("t2");
  });

  it("returns same shape if area not found", () => {
    const t = makeTask({ text: "x" });
    const a = area("a", [t]);
    const next = updateTaskInAreas([a], "missing", t.id, t => ({ ...t, text: "z" }));
    expect(next[0].tasks[0].text).toBe("x");
  });
});

describe("removeTaskFromArea", () => {
  it("removes only the matching task", () => {
    const t1 = makeTask({ text: "t1" });
    const t2 = makeTask({ text: "t2" });
    const a = area("a", [t1, t2]);
    const next = removeTaskFromArea([a], "a", t1.id);
    expect(next[0].tasks).toHaveLength(1);
    expect(next[0].tasks[0].id).toBe(t2.id);
  });
});

describe("moveTaskBetweenAreas", () => {
  it("moves task between different areas", () => {
    const t = makeTask({ text: "movable" });
    const a1 = area("a1", [t]);
    const a2 = area("a2");
    const next = moveTaskBetweenAreas([a1, a2], "a1", "a2", t.id);
    expect(next[0].tasks).toHaveLength(0);
    expect(next[1].tasks).toHaveLength(1);
    expect(next[1].tasks[0].id).toBe(t.id);
  });

  it("inserts at given index in target area", () => {
    const moving = makeTask({ text: "moving" });
    const existing1 = makeTask({ text: "e1" });
    const existing2 = makeTask({ text: "e2" });
    const a1 = area("a1", [moving]);
    const a2 = area("a2", [existing1, existing2]);
    const next = moveTaskBetweenAreas([a1, a2], "a1", "a2", moving.id, 1);
    expect(next[1].tasks.map(t => t.text)).toEqual(["e1", "moving", "e2"]);
  });

  it("reorders within same area", () => {
    const t1 = makeTask({ text: "t1" });
    const t2 = makeTask({ text: "t2" });
    const t3 = makeTask({ text: "t3" });
    const a = area("a", [t1, t2, t3]);
    const next = moveTaskBetweenAreas([a], "a", "a", t1.id, 2);
    expect(next[0].tasks.map(t => t.text)).toEqual(["t2", "t3", "t1"]);
  });

  it("no-ops when task is missing", () => {
    const a1 = area("a1");
    const a2 = area("a2");
    const next = moveTaskBetweenAreas([a1, a2], "a1", "a2", "ghost-id");
    expect(next).toEqual([a1, a2]);
  });
});

describe("subtasks", () => {
  it("adds, toggles, updates and deletes subtasks", () => {
    let t = makeTask({ text: "parent" });
    t = addSubtask(t, "step 1");
    t = addSubtask(t, "step 2");
    expect(t.subtasks).toHaveLength(2);

    const subId = t.subtasks![0].id;
    t = toggleSubtask(t, subId);
    expect(t.subtasks![0].done).toBe(true);

    t = updateSubtaskText(t, subId, "edited");
    expect(t.subtasks![0].text).toBe("edited");

    t = deleteSubtask(t, subId);
    expect(t.subtasks).toHaveLength(1);
    expect(t.subtasks![0].text).toBe("step 2");
  });
});

describe("comments", () => {
  it("adds and deletes comments", () => {
    let t = makeTask({ text: "x" });
    t = addCommentToTask(t, "first");
    t = addCommentToTask(t, "second");
    expect(t.comments).toHaveLength(2);
    const id = t.comments[0].id;
    t = deleteCommentFromTask(t, id);
    expect(t.comments).toHaveLength(1);
    expect(t.comments[0].text).toBe("second");
  });
});
