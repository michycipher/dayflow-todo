import { z } from "zod";
export const taskInput = z.object({
  title: z.string().trim().min(1, "Give your task a title.").max(180),
  notes: z.string().max(5000).default(""),
  project: z.string().trim().min(1).max(40).default("Personal"),
  priority: z.enum(["high", "medium", "low"]).default("medium"),
  status: z.enum(["todo", "doing", "done"]).default("todo"),
  due: z
    .string()
    .refine(
      (v) =>
        v === "" ||
        (/^\d{4}-\d{2}-\d{2}$/.test(v) &&
          !isNaN(Date.parse(v)) &&
          new Date(v).toISOString().slice(0, 10) === v),
      "Choose a valid date.",
    )
    .default(""),
  tags: z.array(z.string().trim().min(1).max(30)).max(10).default([]),
  subtasks: z
    .array(
      z.object({
        id: z.string().uuid(),
        title: z.string().trim().min(1).max(180),
        done: z.boolean(),
      }),
    )
    .max(30)
    .default([]),
});
export type TaskInput = z.infer<typeof taskInput>;
export type Task = TaskInput & {
  id: string;
  version: number;
  createdAt: string;
  updatedAt: string;
};
export const blankTask = (): TaskInput => ({
  title: "",
  notes: "",
  project: "Personal",
  priority: "medium",
  status: "todo",
  due: "",
  tags: [],
  subtasks: [],
});
export function localDate(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
export function assignmentTasks(): TaskInput[] {
  const today = new Date();
  const days = (3 - today.getDay() + 7) % 7;
  today.setDate(today.getDate() + days);
  return [
    "Join my team’s Telegram chat",
    "Build a todo app with AI",
    "Publish my todo app on the web",
    "Structure the project with AGENTS.md",
    "Push code to a private GitHub repository",
  ].map((title, i) => ({
    ...blankTask(),
    title,
    project: "HNG assignment",
    priority: i < 3 ? "high" : "medium",
    due: localDate(today),
    tags: ["hng"],
    notes:
      i === 0
        ? "Open your team’s invite and join from your Telegram account."
        : "",
  }));
}
export function inView(task: Task, view: string, today: string) {
  if (view === "Completed") return task.status === "done";
  if (view === "My day")
    return (
      task.due === today ||
      (task.status !== "done" && !!task.due && task.due < today)
    );
  if (view === "Upcoming")
    return !!task.due && task.due > today && task.status !== "done";
  if (view.startsWith("project:")) return task.project === view.slice(8);
  return true;
}
