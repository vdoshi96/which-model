# BUG REPORT

## Summary
- P0 open: 0
- P1 open: 0
- P2 open: 0
- Fixed: 1

## Bugs

| ID | Severity | Status | Area | Description | Resolution |
| --- | --- | --- | --- | --- | --- |
| QA-001 | P2 | Fixed | `/api/compare` | The compare API validated that the request contained 2-5 names, but duplicate names or DB misses could still produce a 200 response with fewer than two actual models. | Added validator rejection for duplicate trimmed model names, added a 404 response when any requested model is not found, and covered both cases with Jest tests. |

## Notes
- No P0 or P1 bugs were found.
- No DeepSeek API key exposure was found in client code.
- Live external-service behavior was not fully exercised because real database, Redis, DeepSeek, and auth session env setup is outside this isolated QA run.
