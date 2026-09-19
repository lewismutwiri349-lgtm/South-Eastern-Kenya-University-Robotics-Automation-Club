# 09 — Development Workflow

This document describes the actual step-by-step process for building any
module, tying together the rules already established in the rest of the
handbook.

## 1. Starting a Module
1. Confirm which domain(s) the module belongs to (`01_Product_Vision.md`).
2. Confirm it's the agreed next step — not a skipped-ahead module
   (`00_Project_Constitution.md` §2, AI Operating Rules).
3. State what will be built, why it comes next, and which files/folders will
   be touched, before writing code.
4. Flag any tension with existing architecture or standards before
   proceeding — get explicit approval to deviate if needed.

## 2. Building
1. Create a `feature/<domain>-<description>` branch (`11_Git_Workflow.md`).
2. Implement following the layered pattern: schema → service → route →
   frontend (`12_Coding_Standards.md` §2).
3. Write tests alongside the code, not after
   (`10_Testing_Standards.md` §2).
4. Apply security checklist relevant to the domain (`08_Security_Standards.md`).
5. Apply UI system components rather than one-off styles, for any frontend
   work (`06_UI_Design_System.md`).

## 3. Finishing a Module
1. Run through the "Module Complete" checklist
   (`00_Project_Constitution.md` §3).
2. Write the module's documentation package
   (`13_Documentation_Standards.md` §1).
3. Update the handbook's Documentation Index if a handbook doc was created
   (`00_Project_Constitution.md` §5).
4. Provide the four-part summary: what was completed, how to test it,
   known limitations, recommended next step.
5. **Stop and wait for explicit approval before starting the next module.**

## 4. When Requirements Are Ambiguous
- If a requirement is unclear, ask before implementing — don't guess and
  don't silently pick the most convenient interpretation.
- If a requirement conflicts with an established standard, say so and
  propose a resolution rather than quietly following either the old
  standard or the new instruction without flagging the conflict.

## 5. When a Bug Is Found Mid-Module
- Small bugs in the current module's own new code are fixed inline as part
  of that module.
- Bugs discovered in *previously completed* modules are **not** silently
  fixed as a side effect — they're flagged, and a `hotfix/` branch or a
  explicitly scoped follow-up task is proposed, per
  `00_Project_Constitution.md` §2 ("never silently modify unrelated files").

## 6. Review Cadence
Given the project's expected multi-year lifespan, we treat every module as
if a future engineer (or future you) will read it without context. The
review question is always: *"Would this make sense to someone who joins the
project in two years?"*
