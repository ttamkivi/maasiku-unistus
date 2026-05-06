---
name: spec-driven-starter
description: Initialize or repair a spec-driven project workspace for hackathons and prototypes. Use when the user wants to start a new repo, create the initial project structure, scaffold AGENTS.md, create docs/konstitutsioon.md, docs/spec.md, docs/prd.md, docs/ehituslogi.md, or set up a Codex-friendly knowledge base before implementation.
---

# Spec-driven Starter

## Purpose

Use this skill to turn an empty or loosely structured project folder into a spec-driven workspace that Codex can work from. Favor small, editable Markdown files over large generated documents.

## Workflow

1. Inspect the current directory before writing files:
   - `pwd`
   - `rg --files` or `find . -maxdepth 3 -type f`
   - `ls -la`
2. If `AGENTS.md` already exists, read it and preserve project-specific rules.
3. If a `docs/` knowledge base already exists, read the relevant files and fill only obvious gaps.
4. Create or update the minimal starter structure:
   - `AGENTS.md`
   - `docs/konstitutsioon.md`
   - `docs/spec.md`
   - `docs/prd.md`
   - `docs/ehituslogi.md`
5. Ask the user for missing product context only when the next file cannot be filled safely from existing information. Otherwise leave clear `TODO:` placeholders.
6. End by telling the user which files were created or updated and what to fill next.

## Scaffold Script

Prefer the bundled script for a new or mostly empty repo:

```bash
python3 skills/spec-driven-starter/scripts/scaffold_spec_project.py --root .
```

Use `--force` only when the user explicitly wants to overwrite existing starter files. The script creates parent directories as needed and does not overwrite existing files by default.

## Content Rules

- Keep `AGENTS.md` focused on how Codex should work in this repo.
- Put problem, user, scope, and success criteria in `docs/konstitutsioon.md`.
- Put user-facing behavior, user stories, explicit non-goals, and visual direction in `docs/spec.md`.
- Put trackable requirements and statuses in `docs/prd.md`.
- Put implementation decisions, discoveries, tradeoffs, and spec changes in `docs/ehituslogi.md`.
- Do not duplicate the same long explanation across files.
- Mark unknowns as `TODO:` instead of inventing product facts.

## Required AGENTS.md Principles

Ensure `AGENTS.md` tells Codex to:

- read the knowledge base before implementation;
- build one user story or PRD requirement at a time;
- update `docs/prd.md` after completing a requirement;
- update `docs/spec.md` or `docs/ehituslogi.md` when scope, constraints, or decisions change;
- avoid implementing behavior that conflicts with the spec without user confirmation;
- treat a change as done only after Codex asks the user whether the result matches expectations and the user confirms it.

## Starter File Shape

Use the templates in `assets/templates/` as the default source of truth. Copy them as files, then adapt them to the current project if the user has already provided context.

When adapting templates:

- Replace bracketed placeholders only when the answer is known.
- Keep the checklist format in `docs/prd.md`.
- Keep `docs/ehituslogi.md` chronological.
- Keep headings in Estonian unless the user asks for another language.
