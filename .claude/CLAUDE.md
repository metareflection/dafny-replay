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

## When Updating Specs
**The proper workflow is:**
- Add function to Dafny spec
- Verify with dafny verify
- Compile to JS with dafny translate js
- Add thin wrapper in app-extras.js to call the compiled function (type conversion only)
**NOTE**: You should not manually edit app-extras.js if you can compile the logic change

## When compiling
- dafny2js requires you to source the shell first
- AppCore functions are compiled to app.js 
- Query wrappers go in app-extras.js


# RULES FOR FILE WRITING
- The `.cjs` and the `app.js` files should NEVER be modified directly. This is a compiled file.

# RULE FOR UI GENERATION/EDITS
- Presentational UI should be presentational only. Logic lives elsewhere. 
- IMPORTANT: Most of the logic we need will be available via the spec, look for available actions and logic before re-writing in React
- Consult the ARCHITECTURE.md file to understand project architecture
