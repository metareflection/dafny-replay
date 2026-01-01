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