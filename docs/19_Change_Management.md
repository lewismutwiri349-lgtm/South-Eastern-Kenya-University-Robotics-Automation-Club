# 19 — Change Management

The handbook itself will need to change over a multi-year project. This
document defines how, so changes are deliberate rather than accidental
drift.

## 1. What Counts as a Handbook Change
Any edit to `docs/00_Project_Constitution.md` through `docs/19_Change_Management.md`
that changes a *rule* (not a typo fix or clarification of existing intent).
Examples: changing the file-size limit in `12_Coding_Standards.md`, adding a
new domain to `01_Product_Vision.md`, changing the branch strategy in
`11_Git_Workflow.md`.

## 2. Process for a Handbook Change
1. The change is proposed explicitly — not bundled silently into an
   unrelated module's work (per `00_Project_Constitution.md` §2).
2. The reasoning is stated: what's not working, or what new requirement
   demands the change.
3. Impact is assessed: does this invalidate code already built under the
   old rule? If so, is a migration/cleanup task created, or is the old code
   grandfathered with a documented exception?
4. The project owner approves before the change is made.
5. The relevant document's **Changelog** section gets a dated entry
   describing the change and why.

## 3. What Doesn't Require This Process
- Fixing a typo or clarifying wording without changing meaning.
- Filling in a section that was explicitly marked "deferred" or "pending"
  (e.g. writing `07_User_Roles.md` when the Auth module starts) — that's
  planned completion, not a change to an existing rule.

## 4. Versioning the Handbook Itself
The handbook doesn't carry its own version number separate from the
project's release versioning (`11_Git_Workflow.md` §4) — handbook changes
are just commits (`docs:` type) and are visible in git history and each
document's changelog.

## 5. Reviewing the Handbook Over Time
At natural checkpoints (e.g. after every few completed modules, or when
something in practice keeps causing friction), it's worth revisiting
whether a standard still fits reality — not to loosen discipline, but
because a rule that's consistently working around reality usually means the
rule needs revisiting, not that it should be quietly ignored.

## 6. Grandfathering
If a rule changes and existing code no longer conforms, that code is not
silently left inconsistent forever — a follow-up task is explicitly noted
(in the relevant module's doc, "Future Improvements" section per
`13_Documentation_Standards.md`) so the inconsistency is tracked, not
forgotten.
