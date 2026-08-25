# End-User README Rewrite Implementation Plan

**Goal:** Replace the outdated README with a concise, accurate guide for installing and using Chess.com Time Manager.

**Scope:** Change only `README.md`. Preserve the current product boundary and describe only behavior that exists in the repository.

## Task 1: Rewrite and Verify the README

**Files:**
- Modify: `README.md`

- [ ] Replace the current planning-heavy content with the approved end-user sections: summary, features, installation, usage, settings, privacy/fair play, tech stack, project structure, troubleshooting, and links.
- [ ] Verify feature names, the 45-second default, Chrome loading steps, paths, scripts, permissions, and documentation links against `manifest.json`, `package.json`, `AGENTS.md`, and the source tree.
- [ ] Check the diff for obsolete framework proposals, malformed Markdown, stale paths, and unrelated changes.
- [ ] Run `npm test` to ensure the documentation-only change leaves the repository verification green.
