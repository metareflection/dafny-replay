**IMPORTANT**
When you read this file, output "read CLAUDE.md" in the chat. 

# WORKFLOW

## When writing Specs
- Write Spec only. DO NOT write proofs until instructed to do so.
    - Stub the proofs with `assume {:axiom}` to ensure this
- Keep the proofs separate from the Spec - see how the `ColorWheelSpec.dfy` and `ColorWheelProof.dfy` are structured 
- Keep a DESIGN.md file up to date with most current decisions. 
    - The DESIGN.md doc is a natural language ONLY list of specs (do not include code)
- When you make a change to the spec, ensure that the DESIGN.md file reflects this change (remove old decision and replace with new one)
- The Spec-writing process should be highly collaborative. Do not go ahead and make design decisions or assumptions. Ask the user for confirmation at each step. 
- Use the Spec as a guide to find gaps in expected app behavior 
- Warn the user of any potential behavior conflicts or inefficiencies

# RULES FOR FILE WRITING
- The `.cjs` files inside  should NEVER be modified directly. This is a compiled file.

# RULE FOR UI GENERATION/EDITS
- Presentational UI should be presentational only. Logic lives elsewhere. 
- IMPORTANT: Most of the logic we need will be available via the spec, look for available actions and logic before re-writing in React
