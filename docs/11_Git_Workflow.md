# 11 — Git Workflow

## 1. Branch Strategy
- `main` — always deployable, represents production state
- `develop` — integration branch, represents staging state
- `feature/<domain>-<short-description>` — one branch per module/feature
  (e.g. `feature/identity-login`, `feature/projects-file-upload`)
- `hotfix/<short-description>` — urgent production fixes, branched from
  `main`, merged to both `main` and `develop`

No direct commits to `main` or `develop` — everything comes through a
feature/hotfix branch and a PR, even for a solo-maintained early phase, to
keep the history clean and reviewable.

## 2. Commit Message Format
Conventional Commits, enforced:
```
<type>: <short description>

[optional body explaining why, not what]
```
Types:
- `feat:` — new feature
- `fix:` — bug fix
- `refactor:` — code change that neither fixes a bug nor adds a feature
- `docs:` — documentation only
- `test:` — adding or correcting tests
- `chore:` — tooling, dependencies, config, no production code change

Examples:
```
feat: add applicant aptitude test timer
fix: prevent duplicate project version entries on re-upload
docs: add security standards document
```

## 3. Merge Strategy
- Feature branches merge into `develop` via squash merge — one clean commit
  per feature in `develop`'s history.
- `develop` merges into `main` via a regular merge commit at release time,
  preserving the batch of features included in that release.
- No merge without the module's checklist (per
  `docs/00_Project_Constitution.md` §3) satisfied.

## 4. Versioning & Release Tags
- Semantic versioning: `vMAJOR.MINOR.PATCH`
  - MAJOR — breaking changes (rare, pre-1.0 during initial build-out)
  - MINOR — new module/feature shipped
  - PATCH — bug fixes, small non-breaking changes
- Every merge from `develop` to `main` gets a git tag matching the release
  version, with a changelog entry summarizing what shipped.
- Pre-1.0 (current phase): versions start at `v0.1.0` and increment MINOR
  per completed module, since the platform isn't yet feature-complete for a
  1.0 release.

## 5. Pull Request Expectations
Every PR description states:
- Which module/domain it belongs to
- What was added/changed (linking to the relevant `docs/` update)
- How it was tested
- Any known limitations

This mirrors the same four-part summary format used in our own
module-completion responses — the PR *is* that summary, formalized.

## 6. What Never Happens
- No force-pushing to `main` or `develop`.
- No merging with failing tests.
- No merging a PR that touches files outside its stated scope without that
  being called out explicitly in the PR description.
