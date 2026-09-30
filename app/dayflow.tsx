"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  Check,
  Plus,
  Sun,
  Inbox,
  CalendarDays,
  CheckCheck,
  Search,
  Flag,
  List,
  Columns3,
  ChevronRight,
  ArrowUpRight,
  Leaf,
  Timer,
  Play,
  Pause,
  RotateCcw,
  Trash2,
  X,
  Moon,
  Download,
  Upload,
  RefreshCw,
  Sparkles,
  LogOut,
  UserRound,
} from "lucide-react";
import { authClient } from "@/lib/auth/client";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  SidebarProvider,
  Sidebar,
  SidebarContent,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import {
  taskInput,
  type Task,
  type TaskInput,
  blankTask,
  localDate,
  inView,
  assignmentTasks,
} from "@/lib/tasks";

const navigation = [
  { name: "My day", icon: Sun },
  { name: "All tasks", icon: Inbox },
  { name: "Upcoming", icon: CalendarDays },
  { name: "Completed", icon: CheckCheck },
];
const projectColors = ["#8b9e75", "#b6997b", "#929fc0", "#bf8f9f", "#77a7a1"];
const statusNames = { todo: "To do", doing: "In progress", done: "Completed" };
function Choice({
  value,
  onChange,
  items,
  label,
}: {
  value: string;
  onChange: (v: string) => void;
  items: { value: string; label: string }[];
  label: string;
}) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger aria-label={label} className="choice">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {items.map((item) => (
          <SelectItem key={item.value} value={item.value}>
            {item.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
async function api(method = "GET", body?: unknown) {
  const response = await fetch("/api/tasks", {
    method,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
    cache: "no-store",
  });
  const result = (await response.json()) as {
    tasks: Task[];
    task: Task;
    error?: string;
  };
  if (!response.ok)
    throw new Error(result.error || "Something went wrong. Please try again.");
  return result;
}
export default function Dayflow() {
  const { data: authSession, isPending: authPending } = authClient.useSession();
  const signedInUser = authSession?.user;
  const signedInUserId = signedInUser?.id;
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [view, setView] = useState("My day");
  const [search, setSearch] = useState("");
  const [priority, setPriority] = useState("all");
  const [sort, setSort] = useState("due");
  const [layout, setLayout] = useState("list");
  const [filter, setFilter] = useState("active");
  const [editing, setEditing] = useState<Task | null>(null);
  const [draft, setDraft] = useState<TaskInput>(blankTask());
  const [dialog, setDialog] = useState(false);
  const [formError, setFormError] = useState("");
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  const [subtask, setSubtask] = useState("");
  const [tagText, setTagText] = useState("");
  const [dark, setDark] = useState(false);
  const [today, setToday] = useState(localDate());
  const [minutes, setMinutes] = useState("25");
  const [seconds, setSeconds] = useState(1500);
  const [running, setRunning] = useState(false);
  const deadline = useRef(0);
  const [focusTask, setFocusTask] = useState("none");
  const searchInput = useRef<HTMLInputElement>(null);
  const importInput = useRef<HTMLInputElement>(null);
  const load = useCallback(async () => {
    if (authPending) return;
    setLoading(true);
    setError("");
    try {
      if (signedInUserId) {
        const claim = await fetch("/api/tasks/claim", {
          method: "POST",
          cache: "no-store",
        });
        const claimResult = (await claim.json()) as { claimed?: number; error?: string };
        if (!claim.ok)
          throw new Error(claimResult.error || "Your guest tasks could not be saved. Please try again.");
        if (claimResult.claimed)
          toast.success(
            `${claimResult.claimed} guest ${claimResult.claimed === 1 ? "task" : "tasks"} saved to your account.`,
          );
      }
      setTasks((await api()).tasks);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [authPending, signedInUserId]);
  useEffect(() => {
    if (authPending) return;
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [authPending, load]);
  useEffect(() => {
    const timer = window.setTimeout(() => {
    try {
      setDark(localStorage.getItem("dayflow-theme") === "dark");
    } catch {}
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);
  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
  }, [dark]);
  useEffect(() => {
    const id = setInterval(() => setToday(localDate()), 30000);
    return () => clearInterval(id);
  }, []);
  useEffect(() => {
    if (!running) return;
    const tick = () => {
      const remaining = Math.max(
        0,
        Math.ceil((deadline.current - Date.now()) / 1000),
      );
      setSeconds(remaining);
      if (!remaining) {
        setRunning(false);
        toast.success("Focus session complete. Take a well-earned break.");
      }
    };
    const id = setInterval(tick, 250);
    tick();
    return () => clearInterval(id);
  }, [running]);
  const openNew = useCallback(() => {
    setEditing(null);
    setDraft({
      ...blankTask(),
      due: view === "My day" ? localDate() : "",
      project: view.startsWith("project:") ? view.slice(8) : "Personal",
    });
    setTagText("");
    setSubtask("");
    setFormError("");
    setDialog(true);
  }, [view]);
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (
        (e.target instanceof HTMLElement &&
          (["INPUT", "TEXTAREA", "SELECT"].includes(e.target.tagName) ||
            e.target.isContentEditable)) ||
        dialog
      )
        return;
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.key === "n") {
        e.preventDefault();
        openNew();
      }
      if (e.key === "/") {
        e.preventDefault();
        searchInput.current?.focus();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [dialog, openNew]);
  // Progressive enhancement: agent tools use the same authenticated API and UI state.
  useEffect(() => {
    type Tool = {
      name: string;
      description: string;
      inputSchema: object;
      annotations: { readOnlyHint: boolean; untrustedContentHint: boolean };
      execute: (input: unknown) => Promise<unknown>;
    };
    const context = (
      document as Document & {
        modelContext?: {
          registerTool: (
            tool: Tool,
            options: { signal: AbortSignal },
          ) => void | Promise<void>;
        };
      }
    ).modelContext;
    if (!context?.registerTool) return;
    const controller = new AbortController();
    const tools: Tool[] = [
      {
        name: "list_tasks",
        description: "Read tasks in this private workspace.",
        inputSchema: {
          type: "object",
          properties: {},
          additionalProperties: false,
        },
        annotations: { readOnlyHint: true, untrustedContentHint: true },
        execute: async () => {
          const result = await api();
          setTasks(result.tasks);
          return result;
        },
      },
      {
        name: "create_task",
        description:
          "Create and save one task in this private workspace.",
        inputSchema: {
          type: "object",
          properties: {
            title: { type: "string" },
            project: { type: "string" },
            due: { type: "string" },
          },
          required: ["title"],
          additionalProperties: false,
        },
        annotations: { readOnlyHint: false, untrustedContentHint: true },
        execute: async (input) => {
          const task = taskInput.parse(input);
          const result = await api("POST", { tasks: [task] });
          setTasks((previous) => [...result.tasks, ...previous]);
          toast.success("Task created");
          return result;
        },
      },
    ];
    for (const tool of tools) {
      try {
        Promise.resolve(
          context.registerTool(tool, { signal: controller.signal }),
        ).catch(() => {});
      } catch {}
    }
    return () => controller.abort();
  }, []);
  const mutate = async (action: () => Promise<void>) => {
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    try {
      await action();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  };
  const updateTask = async (task: Task, changes: Partial<TaskInput>) => {
    const result = await api("PUT", {
      id: task.id,
      version: task.version,
      task: { ...task, ...changes },
    });
    setTasks((previous) =>
      previous.map((t) => (t.id === task.id ? result.task : t)),
    );
    return result.task as Task;
  };
  const toggleTask = (task: Task) =>
    void mutate(async () => {
      await updateTask(task, {
        status: task.status === "done" ? "todo" : "done",
      });
      toast.success(
        task.status === "done" ? "Task reopened" : "One more thing, done.",
      );
    });
  const editTask = (task: Task) => {
    setEditing(task);
    setDraft({ ...task, subtasks: task.subtasks.map((s) => ({ ...s })) });
    setTagText(task.tags.join(", "));
    setSubtask("");
    setFormError("");
    setDialog(true);
  };
  const saveTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busyRef.current) return;
    setFormError("");
    const pendingSubtask = subtask.trim();
    const parsed = taskInput.safeParse({
      ...draft,
      tags: tagText
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
      subtasks: pendingSubtask
        ? [
            ...draft.subtasks,
            { id: crypto.randomUUID(), title: pendingSubtask, done: false },
          ]
        : draft.subtasks,
    });
    if (!parsed.success) {
      setFormError(parsed.error.issues[0].message);
      return;
    }
    busyRef.current = true;
    setBusy(true);
    try {
      if (editing) {
        await updateTask(editing, parsed.data);
      } else {
        const result = await api("POST", { tasks: [parsed.data] });
        setTasks((previous) => [...result.tasks, ...previous]);
      }
      setDialog(false);
      toast.success(editing ? "Task updated" : "Task added. You’ve got this.");
    } catch (e) {
      setFormError((e as Error).message);
    } finally {
      setBusy(false);
      busyRef.current = false;
    }
  };
  const deleteTask = () => {
    if (!editing) return;
    const removed = editing;
    void mutate(async () => {
      await api("DELETE", { id: removed.id, version: removed.version });
      setTasks((previous) => previous.filter((t) => t.id !== removed.id));
      setDialog(false);
      toast("Task deleted", {
        duration: 10000,
        action: {
          label: "Undo",
          onClick: () =>
            void mutate(async () => {
              const result = await api("POST", { tasks: [removed] });
              setTasks((previous) => [...result.tasks, ...previous]);
              toast.success("Task restored");
            }),
        },
      });
    });
  };
  const changeView = (next: string) => {
    setView(next);
    setSearch("");
    setFilter("active");
  };
  const projects = Array.from(
    new Set(["Personal", "Work", "Learning", ...tasks.map((t) => t.project)]),
  );
  const active = tasks.filter((t) => t.status !== "done");
  const dayTasks = tasks.filter((t) => inView(t, "My day", today));
  const doneToday = dayTasks.filter((t) => t.status === "done").length;
  const percent = dayTasks.length
    ? Math.round((doneToday / dayTasks.length) * 100)
    : 0;
  const scope = tasks.filter((t) => inView(t, view, today));
  const searched = scope.filter(
    (t) =>
      `${t.title} ${t.notes} ${t.project} ${t.tags.join(" ")}`
        .toLowerCase()
        .includes(search.toLowerCase()) &&
      (priority === "all" || t.priority === priority),
  );
  const filtered = searched
    .filter(
      (t) =>
        view === "Completed" ||
        filter === "all" ||
        (filter === "active" ? t.status !== "done" : t.status === "done"),
    )
    .sort((a, b) => {
      if (sort === "priority") {
        const rank = { high: 0, medium: 1, low: 2 };
        return rank[a.priority] - rank[b.priority];
      }
      if (sort === "newest") return b.createdAt.localeCompare(a.createdAt);
      return (
        (a.due || "9999").localeCompare(b.due || "9999") ||
        a.createdAt.localeCompare(b.createdAt)
      );
    });
  const upcoming = active
    .filter((t) => t.due && t.due > today)
    .sort((a, b) => a.due.localeCompare(b.due))
    .slice(0, 3);
  const title = view.startsWith("project:") ? view.slice(8) : view;
  const dueLabel = (due: string) => {
    if (!due) return "No date";
    if (due === today) return "Today";
    return new Date(`${due}T12:00:00`).toLocaleDateString("en", {
      month: "short",
      day: "numeric",
    });
  };
  function TaskCard({ task, board = false }: { task: Task; board?: boolean }) {
    const complete = task.status === "done";
    const overdue = !!task.due && task.due < today && !complete;
    return (
      <div
        className={`task-row ${complete ? "is-complete" : ""} ${board ? "board-card" : ""}`}
      >
        <Checkbox
          className="task-check"
          aria-label={`${complete ? "Reopen" : "Complete"} ${task.title}`}
          checked={complete}
          onCheckedChange={() => toggleTask(task)}
          disabled={busy}
        />
        <button className="task-body" onClick={() => editTask(task)}>
          <span className="task-title">{task.title}</span>
          <span className="task-details">
            <span
              className="project-dot"
              style={{
                background:
                  projectColors[
                    projects.indexOf(task.project) % projectColors.length
                  ],
              }}
            />
            {task.project}
            {task.subtasks.length > 0 && (
              <span className="subtask-count">
                <CheckCheck size={12} />
                {task.subtasks.filter((s) => s.done).length}/
                {task.subtasks.length}
              </span>
            )}
            {task.tags.slice(0, 2).map((tag) => (
              <span className="tag" key={tag}>
                #{tag}
              </span>
            ))}
          </span>
        </button>
        <span className={`priority ${task.priority}`}>
          <Flag size={11} />
          {task.priority}
        </span>
        <span className={`due ${overdue ? "overdue" : ""}`}>
          <CalendarDays size={12} />
          {overdue ? "Overdue · " : ""}
          {dueLabel(task.due)}
        </span>
        <button
          className="icon-button task-open"
          aria-label={`Edit ${task.title}`}
          onClick={() => editTask(task)}
        >
          <ChevronRight size={16} />
        </button>
      </div>
    );
  }
  return (
    <SidebarProvider
      className="workspace"
      style={{ "--sidebar-width": "246px" } as React.CSSProperties}
    >
      <Sidebar className="app-sidebar">
        <SidebarContent className="rail-content">
          <Link className="brand" href="/">
            <span className="brand-mark">
              <Check size={21} />
            </span>
            dayflow<span className="brand-dot">.</span>
          </Link>
          <div className="workspace-label">PERSONAL WORKSPACE</div>
          <nav aria-label="Workspace views">
            {navigation.map((item) => (
              <button
                className={`nav-link ${view === item.name ? "active" : ""}`}
                key={item.name}
                onClick={() => changeView(item.name)}
              >
                <item.icon size={18} />
                {item.name}
                <span className="nav-count">
                  {
                    tasks.filter(
                      (t) =>
                        inView(t, item.name, today) &&
                        (item.name === "Completed" || t.status !== "done"),
                    ).length
                  }
                </span>
              </button>
            ))}
          </nav>
          <div className="workspace-label projects-label">
            YOUR PROJECTS<span>{projects.length}</span>
          </div>
          <nav aria-label="Projects">
            {projects.map((name, i) => (
              <button
                key={name}
                className={`nav-link project-link ${view === `project:${name}` ? "active" : ""}`}
                onClick={() => changeView(`project:${name}`)}
              >
                <span
                  className="project-dot"
                  style={{
                    background: projectColors[i % projectColors.length],
                  }}
                />
                <span className="truncate">{name}</span>
                <span className="nav-count">
                  {active.filter((t) => t.project === name).length || ""}
                </span>
              </button>
            ))}
            <button
              className="nav-link subtle"
              onClick={() => {
                openNew();
                setDraft((d) => ({ ...d, project: "" }));
              }}
            >
              <Plus size={16} />
              New project
            </button>
          </nav>
          <div className="rail-bottom">
            <div className="quiet-card">
              <Leaf size={22} />
              <strong>Small steps. Big things.</strong>
              <p>
                You don’t have to do it all.
                <br />
                Just the next right thing.
              </p>
            </div>
            <div className="utility-actions">
              <button
                onClick={() => {
                  setDark(!dark);
                  try {
                    localStorage.setItem(
                      "dayflow-theme",
                      !dark ? "dark" : "light",
                    );
                  } catch {}
                }}
              >
                <span>{dark ? <Sun size={15} /> : <Moon size={15} />}</span>
                {dark ? "Light appearance" : "Dark appearance"}
              </button>
              <button
                disabled={!tasks.length}
                onClick={() => {
                  const blob = new Blob(
                    [JSON.stringify({ version: 1, tasks }, null, 2)],
                    { type: "application/json" },
                  );
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement("a");
                  a.href = url;
                  a.download = `dayflow-${today}.json`;
                  a.click();
                  setTimeout(() => URL.revokeObjectURL(url), 1000);
                  toast.success("Task backup downloaded");
                }}
              >
                <Download size={15} />
                Export tasks
              </button>
              <button disabled={busy} onClick={() => importInput.current?.click()}>
                <Upload size={15} />
                Import tasks
              </button>
            </div>
            <div className="profile">
              <span className="avatar">{signedInUser ? (signedInUser.name || signedInUser.email).slice(0, 1).toUpperCase() : "D"}</span>
              <div>
                <strong>{signedInUser?.name || signedInUser?.email || "Guest workspace"}</strong>
                <small>{signedInUser ? "Synced with your account" : "Private to this browser"}</small>
              </div>
            </div>
          </div>
        </SidebarContent>
      </Sidebar>
      <div className="main-shell">
        <header className="topbar">
          <div className="breadcrumb">
            <SidebarTrigger className="mobile-menu" />
            <span>Workspace</span>
            <span className="slash">/</span>
            <strong>{title}</strong>
          </div>
          <div className="topbar-right">
            <span className="today-date">
              {new Date(`${today}T12:00:00`).toLocaleDateString("en", {
                weekday: "short",
                month: "short",
                day: "numeric",
              })}
            </span>
            <span className="header-divider" />
            {signedInUser ? (
              <>
                <span className="account-name" title={signedInUser.email}>
                  <UserRound size={14} /> {signedInUser.name || signedInUser.email}
                </span>
                <button
                  className="account-action"
                  onClick={async () => {
                    try {
                      const result = await authClient.signOut();
                      if (result.error) throw new Error(result.error.message);
                      toast.success("You’ve signed out safely.");
                    } catch (error) {
                      toast.error((error as Error).message || "Could not sign out.");
                    }
                  }}
                >
                  <LogOut size={14} /> Sign out
                </button>
              </>
            ) : (
              <>
                <Link className="account-action" href="/auth/sign-in">Sign in</Link>
                <Link className="account-action primary-account" href="/auth/sign-up">Create account</Link>
              </>
            )}
          </div>
        </header>
        <main className="main">
          <div className="eyebrow">
            <Sun size={15} />A FRESH DAY, A FRESH PERSPECTIVE
          </div>
          <div className="heading-row">
            <div>
              <h1>
                {view === "My day"
                  ? "A little more focus."
                  : view === "Completed"
                    ? "Look how far you’ve come."
                    : title}
              </h1>
              <p className="subtitle">
                {view === "My day"
                  ? "A clear mind starts with a clear plan. Let’s make today count."
                  : view === "Upcoming"
                    ? "A little planning today makes tomorrow feel lighter."
                    : view === "Completed"
                      ? "Every finished task is a step forward."
                      : "Everything you need to move your work forward."}
              </p>
            </div>
            <button className="primary new-task" onClick={openNew}>
              <Plus size={17} />
              New task <kbd>N</kbd>
            </button>
          </div>
          <div className="content-grid">
            <div className="work-column">
              <section className="overview">
                <div>
                  <span>TODAY’S PROGRESS</span>
                  <h2>
                    {percent === 100
                      ? "A day well done."
                      : "Little by little, a lot gets done."}
                  </h2>
                  <p>
                    <strong>{doneToday}</strong> of {dayTasks.length} tasks
                    complete.{" "}
                    {percent === 100
                      ? "Make some room to recharge."
                      : "You’ve got this."}
                  </p>
                  <Progress
                    value={percent}
                    className="overview-progress"
                    aria-label="Today’s task completion"
                  />
                </div>
                <div className="ring-wrap">
                  <div
                    className="progress-ring"
                    style={{
                      background: `conic-gradient(var(--primary) ${percent}%,var(--ring-track) 0)`,
                    }}
                  >
                    <div>
                      <strong>
                        {percent}
                        <small>%</small>
                      </strong>
                      <span>COMPLETE</span>
                    </div>
                  </div>
                </div>
                <Leaf className="overview-leaf" size={120} strokeWidth={0.6} />
              </section>
              <section className="task-surface">
                <div className="section-heading">
                  <div className="section-title">
                    <h2>{view === "My day" ? "Today’s tasks" : title}</h2>
                    <span className="count-pill">{scope.length}</span>
                  </div>
                  <Tabs value={layout} onValueChange={setLayout}>
                    <TabsList aria-label="Task layout" className="layout-tabs">
                      <TabsTrigger value="list" aria-label="List view">
                        <List size={15} />
                      </TabsTrigger>
                      <TabsTrigger value="board" aria-label="Board view">
                        <Columns3 size={15} />
                      </TabsTrigger>
                    </TabsList>
                  </Tabs>
                </div>
                <div className="task-toolbar">
                  <label className="search-box">
                    <Search size={16} />
                    <input
                      ref={searchInput}
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Search tasks..."
                      aria-label="Search tasks"
                    />
                    <kbd>/</kbd>
                  </label>
                  <div className="toolbar-select">
                    <Choice
                      label="Filter priority"
                      value={priority}
                      onChange={setPriority}
                      items={[
                        { value: "all", label: "All priorities" },
                        ...["high", "medium", "low"].map((value) => ({
                          value,
                          label: `${value[0].toUpperCase() + value.slice(1)} priority`,
                        })),
                      ]}
                    />
                    <Choice
                      label="Sort tasks"
                      value={sort}
                      onChange={setSort}
                      items={[
                        { value: "due", label: "Due date" },
                        { value: "priority", label: "Priority" },
                        { value: "newest", label: "Newest" },
                      ]}
                    />
                  </div>
                </div>
                <div className="task-subbar">
                  {view !== "Completed" ? (
                    <Tabs value={filter} onValueChange={setFilter}>
                      <TabsList variant="line" aria-label="Task status">
                        <TabsTrigger value="active">
                          Active{" "}
                          <span>
                            {searched.filter((t) => t.status !== "done").length}
                          </span>
                        </TabsTrigger>
                        <TabsTrigger value="done">
                          Completed{" "}
                          <span>
                            {searched.filter((t) => t.status === "done").length}
                          </span>
                        </TabsTrigger>
                        <TabsTrigger value="all">All</TabsTrigger>
                      </TabsList>
                    </Tabs>
                  ) : (
                    <span className="muted">The things you made happen.</span>
                  )}
                  <button
                    className="icon-button"
                    aria-label="Refresh tasks"
                    onClick={() => void load()}
                    disabled={loading || busy}
                  >
                    <RefreshCw
                      size={14}
                      className={loading ? "spinning" : ""}
                    />
                  </button>
                </div>
                {loading ? (
                  <div className="loading-state" role="status">
                    <RefreshCw className="spinning" size={20} />
                    Gathering your tasks…
                  </div>
                ) : error ? (
                  <div className="empty-state" role="alert">
                    <h3>We couldn’t load your tasks.</h3>
                    <p>{error}</p>
                    <button className="primary" onClick={() => void load()}>
                      Try again
                    </button>
                  </div>
                ) : !filtered.length ? (
                  <div className="empty-state">
                    <div className="empty-icon">
                      {filter === "done" || view === "Completed" ? (
                        <CheckCheck size={30} />
                      ) : (
                        <Sun size={30} />
                      )}
                    </div>
                    <h3>
                      {search || priority !== "all"
                        ? "No matching tasks"
                        : view === "Completed" || filter === "done"
                          ? "Your wins will show up here"
                          : tasks.length
                            ? "A little breathing room."
                            : "Your next chapter starts here."}
                    </h3>
                    <p>
                      {search || priority !== "all"
                        ? "Try a different search or priority filter."
                        : tasks.length
                          ? "Nothing here just yet. Add a task or explore another view."
                          : "Write it down, break it up, make it happen."}
                    </p>
                    <button className="primary" onClick={openNew}>
                      <Plus size={15} />
                      Add a task
                    </button>
                    {!tasks.length && (
                      <button
                        className="text-button"
                        disabled={busy}
                        onClick={() =>
                          void mutate(async () => {
                            const result = await api("POST", {
                              tasks: assignmentTasks(),
                            });
                            setTasks(result.tasks);
                            setView("All tasks");
                            toast.success("Your assignment checklist is ready");
                          })
                        }
                      >
                        <Sparkles size={14} />
                        Add my HNG assignment checklist
                      </button>
                    )}
                  </div>
                ) : layout === "list" ? (
                  <div className="task-list">
                    {filtered.map((task) => (
                      <TaskCard task={task} key={task.id} />
                    ))}
                  </div>
                ) : (
                  <div className="board">
                    {(["todo", "doing", "done"] as const).map((status) => (
                      <div className="board-column" key={status}>
                        <h3>
                          <span className={`status-dot ${status}`} />
                          {statusNames[status]}
                          <small>
                            {filtered.filter((t) => t.status === status).length}
                          </small>
                        </h3>
                        {filtered
                          .filter((t) => t.status === status)
                          .map((task) => (
                            <TaskCard task={task} key={task.id} board />
                          ))}
                        {!filtered.some((t) => t.status === status) && (
                          <p className="board-empty">No tasks here</p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
                {!loading && !error && (
                  <button className="add-row" onClick={openNew}>
                    <Plus size={17} />
                    Add a new task<span>Press N</span>
                  </button>
                )}
              </section>
              <footer className="workspace-footer">
                <span>
                  <span className="live-dot" />
                  {signedInUser ? "Saved securely to your account" : "Saved securely to this browser’s workspace"}
                </span>
                <span>One thing at a time.</span>
              </footer>
            </div>
            <aside className="right-column">
              <section className="focus-card">
                <div className="card-heading">
                  <h2>
                    <Timer size={16} />
                    Time to focus
                  </h2>
                  <span className="tiny-pill">POMODORO</span>
                </div>
                <p>One task. Your full attention.</p>
                <div
                  className={`timer-display ${running ? "running" : ""}`}
                  role="timer"
                  aria-label={`${Math.floor(seconds / 60)} minutes ${seconds % 60} seconds remaining`}
                >
                  {String(Math.floor(seconds / 60)).padStart(2, "0")}
                  <span>:</span>
                  {String(seconds % 60).padStart(2, "0")}
                </div>
                <Choice
                  value={minutes}
                  label="Focus duration"
                  onChange={(v) => {
                    setMinutes(v);
                    setSeconds(Number(v) * 60);
                    setRunning(false);
                  }}
                  items={[
                    { value: "25", label: "25 min · Focus" },
                    { value: "50", label: "50 min · Deep work" },
                    { value: "5", label: "5 min · Short break" },
                  ]}
                />
                <Choice
                  value={focusTask}
                  label="Task to focus on"
                  onChange={setFocusTask}
                  items={[
                    { value: "none", label: "Choose a task (optional)" },
                    ...active.map((t) => ({ value: t.id, label: t.title })),
                  ]}
                />
                <div className="timer-actions">
                  <button
                    className="primary"
                    onClick={() => {
                      if (running) setRunning(false);
                      else {
                        const remaining = seconds || Number(minutes) * 60;
                        deadline.current = Date.now() + remaining * 1000;
                        setSeconds(remaining);
                        setRunning(true);
                      }
                    }}
                  >
                    {running ? <Pause size={14} /> : <Play size={14} />}{" "}
                    {running ? "Pause session" : "Start focusing"}
                  </button>
                  <button
                    className="reset-button"
                    aria-label="Reset timer"
                    onClick={() => {
                      setRunning(false);
                      setSeconds(Number(minutes) * 60);
                    }}
                  >
                    <RotateCcw size={15} />
                  </button>
                </div>
                <div className="focus-note">
                  <span className={running ? "live-dot" : "idle-dot"} />
                  {running
                    ? "You’re in your focus zone."
                    : "A small window for meaningful work."}
                </div>
              </section>
              <section className="up-next">
                <div className="card-heading">
                  <h2>On the horizon</h2>
                  <CalendarDays size={16} />
                </div>
                {upcoming.length ? (
                  upcoming.map((task) => (
                    <button
                      key={task.id}
                      className="upcoming-task"
                      onClick={() => editTask(task)}
                    >
                      <span className="date-block">
                        <small>
                          {new Date(`${task.due}T12:00:00`).toLocaleDateString(
                            "en",
                            { month: "short" },
                          )}
                        </small>
                        <strong>{Number(task.due.slice(-2))}</strong>
                      </span>
                      <span>
                        <strong>{task.title}</strong>
                        <small>{task.project}</small>
                      </span>
                      <ChevronRight size={13} />
                    </button>
                  ))
                ) : (
                  <div className="upcoming-empty">
                    <CalendarDays size={25} />
                    <p>A little room in your schedule.</p>
                    <span>Future tasks will appear here.</span>
                  </div>
                )}
                <button
                  className="text-button"
                  onClick={() => changeView("Upcoming")}
                >
                  View upcoming tasks <ArrowUpRight size={13} />
                </button>
              </section>
              <div className="quote-card">
                <span>“</span>
                <blockquote>
                  You don’t have to see the whole staircase, just take the first
                  step.
                </blockquote>
                <small>A LITTLE REMINDER</small>
                <div className="quote-decoration">
                  <Leaf size={55} strokeWidth={0.7} />
                </div>
              </div>
            </aside>
          </div>
        </main>
      </div>
      <Dialog
        open={dialog}
        onOpenChange={(open) => {
          if (!busy) setDialog(open);
        }}
      >
        <DialogContent className="task-dialog">
          <DialogTitle>
            {editing ? "A closer look" : "Make a little plan."}
          </DialogTitle>
          <DialogDescription>
            {editing
              ? "Update the details and keep things moving."
              : "Get it out of your head and into your day."}
          </DialogDescription>
          <form onSubmit={saveTask} className="task-form">
            <label>
              Task title
              <input
                autoFocus
                required
                maxLength={180}
                placeholder="What would you like to get done?"
                value={draft.title}
                onChange={(e) => setDraft({ ...draft, title: e.target.value })}
              />
            </label>
            <label>
              Notes
              <textarea
                rows={3}
                maxLength={5000}
                placeholder="A few details, a link, or a little context..."
                value={draft.notes}
                onChange={(e) => setDraft({ ...draft, notes: e.target.value })}
              />
            </label>
            <div className="form-grid">
              <label>
                Project
                <input
                  required
                  list="project-options"
                  maxLength={40}
                  placeholder="Choose or name a project"
                  value={draft.project}
                  onChange={(e) =>
                    setDraft({ ...draft, project: e.target.value })
                  }
                />
                <datalist id="project-options">
                  {projects.map((p) => (
                    <option key={p} value={p} />
                  ))}
                </datalist>
              </label>
              <label>
                Due date
                <input
                  type="date"
                  value={draft.due}
                  onChange={(e) => setDraft({ ...draft, due: e.target.value })}
                />
              </label>
              <label>
                Priority
                <Choice
                  label="Task priority"
                  value={draft.priority}
                  onChange={(v) =>
                    setDraft({ ...draft, priority: v as TaskInput["priority"] })
                  }
                  items={["high", "medium", "low"].map((v) => ({
                    value: v,
                    label: v[0].toUpperCase() + v.slice(1),
                  }))}
                />
              </label>
              <label>
                Status
                <Choice
                  label="Task status"
                  value={draft.status}
                  onChange={(v) =>
                    setDraft({ ...draft, status: v as TaskInput["status"] })
                  }
                  items={Object.entries(statusNames).map(([value, label]) => ({
                    value,
                    label,
                  }))}
                />
              </label>
            </div>
            <label>
              Tags <small>Separate with commas</small>
              <input
                value={tagText}
                onChange={(e) => setTagText(e.target.value)}
                placeholder="design, personal, quick-win"
                maxLength={300}
              />
            </label>
            <div className="subtask-editor">
              <span className="field-label">
                Break it into smaller steps{" "}
                <small>{draft.subtasks.length}/30</small>
              </span>
              {draft.subtasks.map((s) => (
                <div className="subtask-item" key={s.id}>
                  <Checkbox
                    aria-label={`Complete step: ${s.title}`}
                    checked={s.done}
                    onCheckedChange={(checked) =>
                      setDraft({
                        ...draft,
                        subtasks: draft.subtasks.map((item) =>
                          item.id === s.id
                            ? { ...item, done: checked === true }
                            : item,
                        ),
                      })
                    }
                  />
                  <span className={s.done ? "crossed" : ""}>{s.title}</span>
                  <button
                    type="button"
                    className="icon-button"
                    aria-label={`Remove step: ${s.title}`}
                    onClick={() =>
                      setDraft({
                        ...draft,
                        subtasks: draft.subtasks.filter(
                          (item) => item.id !== s.id,
                        ),
                      })
                    }
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
              <div className="subtask-input">
                <input
                  aria-label="New subtask"
                  placeholder="Add a small step..."
                  maxLength={180}
                  value={subtask}
                  onChange={(e) => setSubtask(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      if (subtask.trim() && draft.subtasks.length < 30) {
                        setDraft({
                          ...draft,
                          subtasks: [
                            ...draft.subtasks,
                            {
                              id: crypto.randomUUID(),
                              title: subtask.trim(),
                              done: false,
                            },
                          ],
                        });
                        setSubtask("");
                      }
                    }
                  }}
                />
                <button
                  type="button"
                  aria-label="Add subtask"
                  className="icon-button"
                  disabled={!subtask.trim() || draft.subtasks.length >= 30}
                  onClick={() => {
                    setDraft({
                      ...draft,
                      subtasks: [
                        ...draft.subtasks,
                        {
                          id: crypto.randomUUID(),
                          title: subtask.trim(),
                          done: false,
                        },
                      ],
                    });
                    setSubtask("");
                  }}
                >
                  <Plus size={18} />
                </button>
              </div>
            </div>
            {formError && (
              <p className="form-error" role="alert">
                {formError}
              </p>
            )}
            <div className="form-actions">
              {editing && (
                <button
                  type="button"
                  className="delete-button"
                  disabled={busy}
                  onClick={deleteTask}
                >
                  <Trash2 size={15} />
                  Delete
                </button>
              )}
              <button
                type="button"
                className="secondary"
                disabled={busy}
                onClick={() => setDialog(false)}
              >
                Cancel
              </button>
              <button className="primary" type="submit" disabled={busy}>
                {busy ? "Saving…" : editing ? "Save changes" : "Create task"}
                <Check size={15} />
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
      <input
        type="file"
        hidden
        ref={importInput}
        accept=".json,application/json"
        onChange={async (e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (!file) return;
          await mutate(async () => {
            if (file.size > 200000)
              throw new Error("Choose a JSON backup smaller than 200 KB.");
            const data = JSON.parse(await file.text());
            const items = Array.isArray(data) ? data : data.tasks;
            if (!Array.isArray(items) || !items.length || items.length > 100)
              throw new Error("Choose a backup with 1–100 tasks.");
            const parsed = items.map((t) => taskInput.parse(t));
            const result = await api("POST", { tasks: parsed });
            setTasks((previous) => [...result.tasks, ...previous]);
            setView("All tasks");
            toast.success(`Imported ${parsed.length} tasks as new copies`);
          });
        }}
      />
    </SidebarProvider>
  );
}
