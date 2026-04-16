import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}

const PM_SYSTEM_PROMPT = `You are a project manager for a software development pipeline.

Your job is to help the user break down a large feature request into sequential, manageable tasks that can each be completed as a single PR.

You have access to the project's file tree, database schema, dependencies, framework rules, and existing tasks. Study them before proposing anything.

Rules:
- Ask clarifying questions if the request is ambiguous — don't guess
- Each task should be completable in one coding session (1-3 files typical)
- Tasks MUST be sequential — each builds on the previous
- Include both pipeline tasks (code changes) and human tasks (migrations, config, manual testing) where appropriate
- For human tasks, clearly describe what the person needs to do
- Reference specific files, tables, and components when describing tasks
- Keep task descriptions concise but specific enough for a planner to work from

When you have enough information to propose a breakdown, output a numbered task list AND a JSON block:

\`\`\`json
[
  {"order": 1, "name": "Create database tables", "description": "Run SQL migration to create...", "type": "human"},
  {"order": 2, "name": "Build API routes", "description": "Create GET/POST endpoints for...", "type": "pipeline"},
  {"order": 3, "name": "Build list page UI", "description": "Create /feature page with...", "type": "pipeline"}
]
\`\`\`

After proposing, ask if the user wants to adjust the breakdown before approving.
If the user requests changes, revise and re-propose with an updated JSON block.`;

async function loadProjectContext(projectId: string): Promise<string> {
  const parts: string[] = [];

  // 1. Project info
  const { data: project } = await supabaseAdmin
    .from("projects")
    .select("name,github_repo_url,settings")
    .eq("id", projectId)
    .single();

  if (project) {
    parts.push(`## Project: ${project.name}`);
    if (project.github_repo_url) parts.push(`Repository: ${project.github_repo_url}`);
  }

  // 2. Database schema via OpenAPI spec
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.NEXT_SUPABASE_SERVICE_ROLE_KEY;

  if (supabaseUrl && serviceKey) {
    try {
      const res = await fetch(`${supabaseUrl}/rest/v1/`, {
        headers: {
          apikey: serviceKey,
          Authorization: `Bearer ${serviceKey}`,
          Accept: "application/openapi+json",
        },
      });
      if (res.ok) {
        const spec = await res.json();
        const defs = spec.definitions || {};
        const schemaLines: string[] = ["## Database Schema\n"];
        for (const [table, def] of Object.entries(defs)) {
          const typedDef = def as { properties?: Record<string, { type?: string; format?: string }>; required?: string[] };
          const props = typedDef.properties || {};
          const cols = Object.entries(props)
            .map(([col, info]) => `  - ${col}: ${info.format || info.type || "?"}`)
            .join("\n");
          schemaLines.push(`### ${table}\n${cols}\n`);
        }
        parts.push(schemaLines.join("\n"));
      }
    } catch {
      // Skip schema on error
    }
  }

  // 3. File tree (read from host filesystem if available, otherwise skip)
  // The API runs on Vercel in production — file tree comes from a separate source
  // For now, we include what we can fetch from the project settings
  parts.push("## File Tree\n(File tree is loaded from the project repository at build time. The planner agent will have full access when writing task plans.)");

  // 4. Dependencies from package.json (stored in project settings or fetched)
  // This would require repo access — skip for now, planner handles it

  // 5. Existing tasks for this project
  const { data: tasks } = await supabaseAdmin
    .from("tasks")
    .select("name,status,task_type")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false })
    .limit(30);

  if (tasks && tasks.length > 0) {
    const taskLines = tasks.map(
      (t: Record<string, unknown>) => `  - [${t.status}] ${t.name}${t.task_type === "human" ? " (human)" : ""}`
    );
    parts.push(`## Existing Tasks (${tasks.length} most recent)\n${taskLines.join("\n")}`);
  }

  // 6. Existing epics for this project
  const { data: epics } = await supabaseAdmin
    .from("epics")
    .select("name,status")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false })
    .limit(10);

  if (epics && epics.length > 0) {
    const epicLines = epics.map((e: Record<string, unknown>) => `  - [${e.status}] ${e.name}`);
    parts.push(`## Existing Epics\n${epicLines.join("\n")}`);
  }

  return parts.join("\n\n");
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();
  const { message } = body;

  if (!message || typeof message !== "string") {
    return NextResponse.json({ error: "message is required" }, { status: 400 });
  }

  // Fetch the epic
  const { data: epic, error } = await supabaseAdmin
    .from("epics")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !epic) {
    return NextResponse.json({ error: "Epic not found" }, { status: 404 });
  }

  // Append user message
  const conversation: ChatMessage[] = [...(epic.conversation || [])];
  conversation.push({
    role: "user",
    content: message,
    timestamp: new Date().toISOString(),
  });

  // Build context on first message or if conversation is short
  let projectContext = "";
  if (conversation.length <= 2) {
    projectContext = await loadProjectContext(epic.project_id);
  }

  // Build messages for LLM
  const llmMessages: { role: string; content: string }[] = [
    { role: "system", content: PM_SYSTEM_PROMPT },
  ];

  // Add project context as first user context (only on first exchange)
  if (projectContext) {
    llmMessages.push({
      role: "system",
      content: `Here is the project context:\n\n${projectContext}\n\nEpic description: ${epic.description || epic.name}`,
    });
  }

  // Add conversation history
  for (const msg of conversation) {
    llmMessages.push({ role: msg.role, content: msg.content });
  }

  // Call LLM (Anthropic Opus 4.6 via service key)
  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  if (!anthropicKey) {
    return NextResponse.json({ error: "ANTHROPIC_API_KEY not configured" }, { status: 500 });
  }

  try {
    // Convert to Anthropic format (system separate from messages)
    const systemContent = llmMessages
      .filter((m) => m.role === "system")
      .map((m) => m.content)
      .join("\n\n");

    const chatMessages = llmMessages
      .filter((m) => m.role !== "system")
      .map((m) => ({ role: m.role as "user" | "assistant", content: m.content }));

    // Ensure messages alternate user/assistant (Anthropic requirement)
    // If we have consecutive same-role messages, merge them
    const mergedMessages: { role: string; content: string }[] = [];
    for (const msg of chatMessages) {
      if (mergedMessages.length > 0 && mergedMessages[mergedMessages.length - 1].role === msg.role) {
        mergedMessages[mergedMessages.length - 1].content += "\n\n" + msg.content;
      } else {
        mergedMessages.push({ ...msg });
      }
    }

    const anthropicRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": anthropicKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-opus-4-20250514",
        max_tokens: 4096,
        system: systemContent,
        messages: mergedMessages,
      }),
    });

    if (!anthropicRes.ok) {
      const errBody = await anthropicRes.text();
      console.error("Anthropic error:", errBody);
      return NextResponse.json({ error: "LLM call failed" }, { status: 502 });
    }

    const llmResult = await anthropicRes.json();
    const assistantContent =
      llmResult.content?.[0]?.text || "I encountered an issue. Please try again.";

    // Append assistant response
    conversation.push({
      role: "assistant",
      content: assistantContent,
      timestamp: new Date().toISOString(),
    });

    // Check if response contains a task breakdown JSON block
    let taskBreakdown = epic.task_breakdown || [];
    const jsonMatch = assistantContent.match(/```json\s*\n([\s\S]*?)\n```/);
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[1]);
        if (Array.isArray(parsed) && parsed.length > 0 && parsed[0].order !== undefined) {
          taskBreakdown = parsed;
        }
      } catch {
        // Not valid JSON, ignore
      }
    }

    // Save conversation and breakdown
    const { error: updateError } = await supabaseAdmin
      .from("epics")
      .update({
        conversation,
        task_breakdown: taskBreakdown,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({
      conversation,
      task_breakdown: taskBreakdown,
      assistant_message: assistantContent,
    });
  } catch (e) {
    console.error("Chat error:", e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
