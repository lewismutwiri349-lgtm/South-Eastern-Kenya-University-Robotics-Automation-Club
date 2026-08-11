# 14 — Performance Standards

Performance targets are stated as numbers, not aspirations, so they're
checkable.

## 1. Frontend Bundle Budget
- Initial JS bundle (per route, gzipped): **≤ 200KB** for public pages,
  **≤ 300KB** for authenticated portal/dashboard pages (dashboards
  reasonably carry more UI weight — tables, charts).
- Any single new dependency that pushes a route meaningfully over budget is
  flagged before merge, with a stated reason it's worth the cost.

## 2. API Latency Budget
- **p95 latency ≤ 200ms** for simple reads (single-table lookups).
- **p95 latency ≤ 500ms** for complex reads (joins, aggregations, dashboard
  analytics).
- **p95 latency ≤ 800ms** for writes involving file storage operations
  (R2 upload confirmation, etc.) — network-bound, budgeted separately from
  pure compute.
- Measured via Cloudflare Workers analytics; routes trending toward budget
  violation get flagged, not silently accepted.

## 3. Image & Media Budget
- Uploaded images are automatically optimized/resized on ingest (via a
  Worker or R2 + image resizing) — originals are never served raw to the
  public site.
- Maximum served image size: **≤ 300KB** per image on public-facing pages
  (Gallery, Projects, News), using responsive `srcset` variants.
- Video content is not self-hosted for streaming — embedded via an external
  provider (e.g. YouTube/Vimeo) rather than served from R2 directly, to
  avoid bandwidth and encoding complexity.

## 4. Upload Limits
| File type | Max size |
|---|---|
| Images | 10MB (pre-optimization) |
| PDFs | 25MB |
| CAD files | 100MB |
| ZIP archives | 250MB |
| Videos | Not uploaded directly — external embed link only |

Exact limits are revisited when the Projects/Storage domain is built, but
these are the working budget until then.

## 5. Database Query Budget
- No N+1 query patterns — list views that render related data use a single
  joined/batched query, not a query-per-row.
- Any query expected to scan more than a few thousand rows gets an index
  reviewed as part of that module's database design.

## 6. Enforcement
- Performance budgets are checked as part of the "module complete" checklist
  (`docs/00_Project_Constitution.md` §3) for any module introducing new
  routes, pages, or heavy data operations.
- A budget violation isn't an automatic blocker, but it must be explicitly
  acknowledged and justified, not silently shipped.
