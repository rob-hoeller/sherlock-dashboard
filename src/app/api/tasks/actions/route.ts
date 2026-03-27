import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { createSupabaseServerClient } from "@/lib/supabase-server";

export async function POST(req: NextRequest) {
  // 1. Get authenticated user
  const supabase = await createSupabaseServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const userId = user.id;
  const userName = user.user_metadata?.display_name || user.email || "Unknown";

  // 2. Parse request
  const body = await req.json();
  const { task_id, action_type, payload } = body;

  if (!action_type) {
    return NextResponse.json({ error: "action_type is required" }, { status: 400 });
  }

  let taskId = task_id;

  // 3. Handle action
  switch (action_type) {
    case 'plan': {
      // Create new task
      if (!payload?.name) {
        return NextResponse.json({ error: "payload.name is required for plan action" }, { status: 400 });
      }

      // Validate project_id
      if (!payload?.project_id) {
        return NextResponse.json({ error: "payload.project_id is required for plan action" }, { status: 400 });
      }

      const { data: task, error: taskError } = await supabaseAdmin
        .from("tasks")
        .insert({
          name: payload.name,
          description: payload.description || null,
          task_type: payload.task_type || "feature",
          github_repo: "rob-hoeller/sherlock-dashboard",
          status: "planning",
          project_id: payload.project_id,
        })
        .select()
        .single();

      if (taskError) return NextResponse.json({ error: taskError.message }, { status: 500 });
      taskId = task.id;

      // Record history
      await supabaseAdmin.from("task_history").insert({
        task_id: taskId,
        previous_status: null,
        new_status: "planning",
        changed_by: userName,
        note: "Task created from dashboard",
        user_id: userId,
        user_name: userName,
      });
      break;
    }

    case 'approve': {
      if (!taskId) return NextResponse.json({ error: "task_id required" }, { status: 400 });

      const { data: current } = await supabaseAdmin
        .from("tasks").select("status").eq("id", taskId).single();

      await supabaseAdmin.from("tasks")
        .update({ status: "approved" }).eq("id", taskId);

      await supabaseAdmin.from("task_history").insert({
        task_id: taskId,
        previous_status: current?.status || null,
        new_status: "approved",
        changed_by: userName,
        note: "Plan approved from dashboard",
        user_id: userId,
        user_name: userName,
      });
      break;
    }

    case 'request_changes': {
      if (!taskId) return NextResponse.json({ error: "task_id required" }, { status: 400 });

      const { data: current } = await supabaseAdmin
        .from("tasks").select("status").eq("id", taskId).single();

      await supabaseAdmin.from("tasks")
        .update({ status: "planning" }).eq("id", taskId);

      await supabaseAdmin.from("task_history").insert({
        task_id: taskId,
        previous_status: current?.status || null,
        new_status: "planning",
        changed_by: userName,
        note: payload?.feedback ? `Changes requested: ${payload.feedback}` : "Changes requested",
        user_id: userId,
        user_name: userName,
      });
      break;
    }

    case 'resolve_blocker': {
      if (!taskId) return NextResponse.json({ error: "task_id required" }, { status: 400 });

      const { data: current } = await supabaseAdmin
        .from("tasks").select("status").eq("id", taskId).single();

      await supabaseAdmin.from("tasks")
        .update({ status: "approved", blocked_reason: null }).eq("id", taskId);

      await supabaseAdmin.from("task_history").insert({
        task_id: taskId,
        previous_status: current?.status || null,
        new_status: "approved",
        changed_by: userName,
        note: payload?.feedback ? `Blocker resolved: ${payload.feedback}` : "Blocker resolved",
        user_id: userId,
        user_name: userName,
      });
      break;
    }

    case 'complete': {
      if (!taskId) return NextResponse.json({ error: "task_id required" }, { status: 400 });

      const { data: current } = await supabaseAdmin
        .from("tasks").select("status").eq("id", taskId).single();

      await supabaseAdmin.from("tasks")
        .update({ status: "merged" }).eq("id", taskId);

      await supabaseAdmin.from("task_history").insert({
        task_id: taskId,
        previous_status: current?.status || null,
        new_status: "merged",
        changed_by: userName,
        note: "Marked as merged from dashboard",
        user_id: userId,
        user_name: userName,
      });
      break;
    }

    case 'request_preview_changes': {
      if (!taskId) return NextResponse.json({ error: "task_id required" }, { status: 400 });

      const { data: current } = await supabaseAdmin
        .from("tasks").select("status").eq("id", taskId).single();

      // Null out Vercel fields and move back to approved
      await supabaseAdmin.from("tasks")
        .update({
          status: "approved",
          vercel_preview_url: null,
          vercel_deployment_id: null,
        }).eq("id", taskId);

      await supabaseAdmin.from("task_history").insert({
        task_id: taskId,
        previous_status: current?.status || null,
        new_status: "approved",
        changed_by: userName,
        note: payload?.feedback ? `Preview changes requested: ${payload.feedback}` : "Preview changes requested",
        user_id: userId,
        user_name: userName,
      });
      break;
    }

    case 'cancel': {
      // Update task status
      const { error: cancelError } = await supabaseAdmin
        .from("tasks")
        .update({ status: "cancelled" })
        .eq("id", taskId);

      if (cancelError) return NextResponse.json({ error: cancelError.message }, { status: 500 });

      // Record history
      const { data: currentTask } = await supabaseAdmin
        .from("tasks").select("status").eq("id", taskId).single();

      await supabaseAdmin.from("task_history").insert({
        task_id: taskId,
        previous_status: currentTask?.status || null,
        new_status: "cancelled",
        changed_by: userName || "dashboard",
        note: "Cancelled via dashboard",
      });

      break;
    }

    default:
      return NextResponse.json({ error: `Unknown action_type: ${action_type}` }, { status: 400 });
  }

  // 4. Store feedback as task document (if provided)
  if (taskId && payload?.feedback) {
    await supabaseAdmin.from("task_documents").insert({
      task_id: taskId,
      file_name: `${action_type}-feedback-${new Date().toISOString().slice(0,19)}.md`,
      doc_type: "planning",
      content: payload.feedback,
      created_by: userName,
    });
  }

  // 5. Store attached files as task documents
  if (taskId && payload?.files && Array.isArray(payload.files)) {
    for (const file of payload.files) {
      if (file.name && file.content) {
        await supabaseAdmin.from("task_documents").insert({
          task_id: taskId,
          file_name: file.name,
          doc_type: file.doc_type || "reference",
          content: file.content,
          created_by: userName,
        });
      }
    }
  }

  // 6. Queue the action for the agent to pick up
  const { data: action, error: actionError } = await supabaseAdmin
    .from("task_actions")
    .insert({
      task_id: taskId,
      action_type,
      user_id: userId,
      user_name: userName,
      payload: payload || {},
    })
    .select()
    .single();

  if (actionError) {
    return NextResponse.json({ error: actionError.message }, { status: 500 });
  }

  return NextResponse.json({ task_id: taskId, action_id: action.id }, { status: 201 });
}