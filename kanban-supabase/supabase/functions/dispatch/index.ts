// Supabase Edge Function: dispatch
// Runs Dafny reconciliation logic server-side (MultiCollaboration pattern)
// JWT verified at gateway level

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

    // Load current project state
    const { data: project, error: loadError } = await supabaseAdmin
      .from('projects')
      .select('state, version, applied_log')
      .eq('id', projectId)
      .single()

    if (loadError || !project) {
      return new Response(JSON.stringify({ error: 'Project not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Validate baseVersion
    if (baseVersion > project.version) {
      return new Response(JSON.stringify({ error: 'Invalid base version' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // ========================================================================
    // Run Dafny dispatch (MultiCollaboration pattern)
    // ========================================================================

    const result = dispatch(
      project.state,
      project.applied_log || [],
      baseVersion,
      action
    )

    if (result.status === 'rejected') {
      return new Response(JSON.stringify({
        status: 'rejected',
        reason: result.reason || 'No valid interpretation of action'
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Persist new state (with optimistic concurrency)
    const newVersion = project.version + 1
    const newAppliedLog = [...(project.applied_log || []), result.appliedAction]

    const { error: updateError } = await supabaseAdmin
      .from('projects')
      .update({
        state: result.state,
        version: newVersion,
        applied_log: newAppliedLog,
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

    // Return success
    return new Response(JSON.stringify({
      status: 'accepted',
      version: newVersion,
      state: result.state
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
