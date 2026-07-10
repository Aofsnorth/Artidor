# State

Implemented / awaiting user hand-test.

## 2026-06-22

Fixed the restore gap: inspector tabs (`activeTabPerType`) are now re-applied on
project reload, not just saved. Assets tab + playhead + inspector tabs all
restore. No new storage key — reuses `artidor:editor-session:v1:<projectId>`.
