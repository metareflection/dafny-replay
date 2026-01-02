// Supabase Edge Function: multi-dispatch
// Runs VERIFIED Dafny TryMultiStep for cross-project operations
// JWT verified at gateway level
//
// Trust boundary: Only JSON conversion is unverified.
// The tryMultiStep function uses TodoMultiProjectDomain.TryMultiStep directly.

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { tryMultiStep, getTouchedProjects, modelToJson } from './dafny-bundle.ts'

// ============================================================================
// CORS Headers
// ============================================================================

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, content-type, x-client-info, apikey',
}

// ============================================================================
// Types
// ============================================================================

interface MultiAction {
  type: 'Single' | 'MoveTaskTo' | 'CopyTaskTo';
  project?: string;
  action?: Record<string, unknown>;
  srcProject?: string;
  dstProject?: string;
  taskId?: number;
  dstList?: number;
  anchor?: { type: string; anchor?: number };
}

interface RequestBody {
  action: MultiAction;
  baseVersions: Record<string, number>;
}

// ============================================================================
// Edge Function Handler
// ============================================================================

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Get auth context
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing Authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Create Supabase client with user's JWT (for RLS)
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    )

    // Verify user via Supabase Auth API
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser()
    if (authError || !user) {
      console.error('Auth error:', authError)
      return new Response(JSON.stringify({ error: 'Invalid or expired token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const userId = user.id

    // Parse request body
    const { action, baseVersions }: RequestBody = await req.json()

    if (!action) {
      return new Response(JSON.stringify({ error: 'action is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Get touched projects from the action
    const touchedProjectIds = getTouchedProjects(action)

    if (touchedProjectIds.length === 0) {
      return new Response(JSON.stringify({ error: 'No projects touched by action' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Check membership for ALL touched projects
    const { data: memberships, error: memberError } = await supabaseClient
      .from('project_members')
      .select('project_id')
      .eq('user_id', userId)
      .in('project_id', touchedProjectIds)

    if (memberError) {
      console.error('Membership check error:', memberError)
      return new Response(JSON.stringify({ error: 'Failed to check membership' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const memberProjectIds = new Set((memberships || []).map(m => m.project_id))
    const missingAccess = touchedProjectIds.filter(id => !memberProjectIds.has(id))

    if (missingAccess.length > 0) {
      return new Response(JSON.stringify({
        error: 'Not a member of all touched projects',
        missingAccess
      }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Use service role for writes (to bypass RLS for atomic update)
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Load touched projects
    const { data: projects, error: loadError } = await supabaseAdmin
      .from('projects')
      .select('id, state, version, applied_log')
      .in('id', touchedProjectIds)

    if (loadError || !projects) {
      console.error('Load error:', loadError)
      return new Response(JSON.stringify({ error: 'Failed to load projects' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Build project map
    const projectMap: Record<string, { state: unknown; version: number; applied_log: unknown[] }> = {}
    for (const p of projects) {
      projectMap[p.id] = {
        state: p.state,
        version: p.version,
        applied_log: p.applied_log || []
      }
    }

    // Verify all touched projects were loaded
    const missingProjects = touchedProjectIds.filter(id => !projectMap[id])
    if (missingProjects.length > 0) {
      return new Response(JSON.stringify({
        error: 'Projects not found',
        missingProjects
      }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Validate baseVersions
    for (const projectId of touchedProjectIds) {
      const clientVersion = baseVersions[projectId]
      const serverVersion = projectMap[projectId].version
      if (clientVersion !== undefined && clientVersion > serverVersion) {
        return new Response(JSON.stringify({
          error: 'Invalid base version',
          projectId,
          clientVersion,
          serverVersion
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }
    }

    // Build MultiModel from loaded projects
    const multiModelJson = {
      projects: Object.fromEntries(
        Object.entries(projectMap).map(([id, p]) => [id, p.state])
      )
    }

    // ========================================================================
    // Run VERIFIED Dafny TryMultiStep
    // ========================================================================

    let result;
    try {
      result = tryMultiStep(multiModelJson, action)
    } catch (stepError) {
      console.error('TryMultiStep failed:', stepError)
      return new Response(JSON.stringify({
        error: 'Multi-step failed',
        details: String(stepError)
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    if (result.status === 'rejected') {
      return new Response(JSON.stringify({
        status: 'rejected',
        reason: result.error || 'Multi-step rejected'
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Get changed projects
    const changedProjects = result.changedProjects || []

    if (changedProjects.length === 0) {
      // No changes - return success without updating DB
      return new Response(JSON.stringify({
        status: 'accepted',
        changed: [],
        versions: {},
        states: {}
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Build updates for changed projects
    const updates = changedProjects.map(projectId => ({
      id: projectId,
      state: result.multiModel!.projects[projectId],
      expectedVersion: projectMap[projectId].version,
      newVersion: projectMap[projectId].version + 1,
      newLogEntry: action // Store the multi-action in applied_log
    }))

    // Persist atomically using save_multi_update
    const { data: saveResult, error: saveError } = await supabaseAdmin
      .rpc('save_multi_update', { updates: JSON.stringify(updates) })

    if (saveError) {
      console.error('Save error:', saveError)
      // Check if it's a version conflict
      if (saveError.message?.includes('Version conflict')) {
        return new Response(JSON.stringify({
          status: 'conflict',
          message: 'Concurrent modification, please retry'
        }), {
          status: 409,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }
      return new Response(JSON.stringify({
        error: 'Failed to save updates',
        details: saveError.message
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    if (!saveResult?.success) {
      return new Response(JSON.stringify({
        status: 'conflict',
        message: saveResult?.error || 'Save failed'
      }), {
        status: 409,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Build response with new versions and states
    const newVersions: Record<string, number> = {}
    const newStates: Record<string, unknown> = {}

    for (const projectId of changedProjects) {
      newVersions[projectId] = projectMap[projectId].version + 1
      newStates[projectId] = result.multiModel!.projects[projectId]
    }

    return new Response(JSON.stringify({
      status: 'accepted',
      changed: changedProjects,
      versions: newVersions,
      states: newStates
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (e) {
    console.error('Multi-dispatch error:', e)
    return new Response(JSON.stringify({ error: 'Internal error', details: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
