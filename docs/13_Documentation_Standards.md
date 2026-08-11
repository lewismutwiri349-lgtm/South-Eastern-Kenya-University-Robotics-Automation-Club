# 13 — Documentation Standards

Documentation is a deliverable of every module, not an optional afterthought.
This document defines exactly what's required.

## 1. Required Package Per Module
Every module, when complete, produces a doc at
`docs/modules/<domain>-<feature>.md` (new folder, created when Module 1
starts) containing:

1. **Feature Overview** — what it does, in plain language, one paragraph
2. **Architecture** — how it fits the domains/layers from `03_Technical_Architecture.md`; any new tables, services, or routes introduced
3. **API** — every endpoint added/changed: method, path, auth requirement, request/response shape
4. **Database** — schema changes, with a short rationale for any new table or column
5. **Permissions** — which roles can do what, mapped explicitly (feeds `07_User_Roles.md`)
6. **Edge Cases** — non-obvious scenarios considered and how they're handled (e.g. "what happens if a file upload is interrupted mid-transfer")
7. **Tests** — what's covered, linking to the actual test files
8. **Future Improvements** — known deferred work, explicitly separated from bugs

## 2. Where Documentation Lives
```
docs/
├── 00-19_*.md            # The handbook (this set)
└── modules/
    ├── identity-login.md
    ├── identity-registration.md
    ├── projects-file-upload.md
    └── ...
```
One file per meaningfully distinct feature within a domain — not one giant
file per domain, and not one file per tiny change.

## 3. Root README
`README.md` at the repo root stays a short, current entry point: what the
project is, how to run it locally, and a link into `docs/00_Project_Constitution.md`
as the starting point for anyone new. It is not a dumping ground for details
that belong in the handbook.

## 4. Code-Level Documentation
- Every exported function/class has a one-line doc comment (per
  `docs/12_Coding_Standards.md` §5).
- Complex algorithms or non-obvious business rules get an inline comment
  explaining the *why*.
- No separate "code documentation" effort — it's produced as the code is
  written, not retrofitted.

## 5. Keeping Docs Honest
- A module is not "complete" (per `docs/00_Project_Constitution.md` §3)
  until its documentation package exists and its handbook doc index entry
  (if applicable) is updated.
- If a later module changes behavior described in an earlier module's docs,
  updating that doc is part of the later module's scope — docs never
  silently go stale.

## 6. Changelog Discipline
Each handbook document (00–19) carries its own dated changelog at the
bottom, as already modeled in `00_Project_Constitution.md`. Module docs
under `docs/modules/` do not need individual changelogs — their creation
date and git history serve that purpose.
