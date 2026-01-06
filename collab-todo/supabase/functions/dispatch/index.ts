// Supabase Edge Function: dispatch
// Runs VERIFIED Dafny MultiCollaboration.Dispatch server-side
// JWT verified at gateway level
//
// Trust boundary: Only JSON conversion is unverified.
// The dispatch function uses TodoMultiCollaboration.__default.Dispatch directly.

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { dispatch } from './dafny-bundle.ts'

// ============================================================================
// CORS Headers
// ============================================================================

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, content-type, x-client-info, apikey',
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
    const { projectId, baseVersion, action } = await req.json()

    if (!projectId) {
      return new Response(JSON.stringify({ error: 'projectId is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Check membership (RLS should handle this, but let's be explicit)
    const { data: membership, error: memberError } = await supabaseClient
      .from('project_members')
      .select('role')
      .eq('project_id', projectId)
      .eq('user_id', userId)
      .single()

    if (memberError || !membership) {
      return new Response(JSON.stringify({ error: 'Not a member of this project' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Use service role for writes (to bypass RLS for atomic update)
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Load current project state (including audit_log if available)
    const { data: project, error: loadError } = await supabaseAdmin
      .from('projects')
      .select('state, version, applied_log, audit_log')
      .eq('id', projectId)
      .single()

    if (loadError || !project) {
      return new Response(JSON.stringify({ error: 'Project not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Validate baseVersion (Dafny requires baseVersion <= version)
    if (baseVersion > project.version) {
      return new Response(JSON.stringify({ error: 'Invalid base version' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // ========================================================================
    // Run VERIFIED Dafny MultiCollaboration.Dispatch
    // ========================================================================

    let result;
    try {
      result = dispatch(
        project.state,
        project.applied_log || [],
        baseVersion,
        action,
        project.audit_log || []  // Pass audit log for full ServerState
      )
    } catch (dispatchError) {
      console.error('Dispatch call failed:', dispatchError)
      return new Response(JSON.stringify({
        error: 'Dispatch failed',
        details: String(dispatchError),
        stack: dispatchError instanceof Error ? dispatchError.stack : undefined
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    if (result.status === 'rejected') {
      return new Response(JSON.stringify({
        status: 'rejected',
        reason: result.reason || 'No valid interpretation of action'
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Persist new state from verified Dispatch result
    // Use newVersion from Dafny (should equal project.version + 1)
    const newVersion = result.newVersion!

    const { error: updateError } = await supabaseAdmin
      .from('projects')
      .update({
        state: result.state,
        version: newVersion,
        applied_log: result.appliedLog,  // Full log from Dafny ServerState
        audit_log: result.auditLog,      // Audit trail from Dafny ServerState
        updated_at: new Date().toISOString()
      })
      .eq('id', projectId)
      .eq('version', project.version) // Optimistic lock

    if (updateError) {
      // Concurrent modification - client should retry
      console.error('Update error:', updateError)
      return new Response(JSON.stringify({
        status: 'conflict',
        message: 'Concurrent modification, please retry'
      }), {
        status: 409,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Return success with version from verified Dispatch
    return new Response(JSON.stringify({
      status: 'accepted',
      version: newVersion,
      state: result.state,
      noChange: result.noChange  // Useful for client to know if state actually changed
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (e) {
    console.error('Dispatch error:', e)
    return new Response(JSON.stringify({ error: 'Internal error', details: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
