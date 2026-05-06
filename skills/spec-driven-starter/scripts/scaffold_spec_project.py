#!/usr/bin/env python3
from __future__ import annotations

import argparse
import shutil
from pathlib import Path


FILES = {
    "AGENTS.md": "AGENTS.md",
    "docs/konstitutsioon.md": "konstitutsioon.md",
    "docs/spec.md": "spec.md",
    "docs/prd.md": "prd.md",
    "docs/ehituslogi.md": "ehituslogi.md",
}


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Scaffold a spec-driven Codex project workspace."
    )
    parser.add_argument(
        "--root",
        default=".",
        help="Project root where AGENTS.md and docs/ should be created.",
    )
    parser.add_argument(
        "--force",
        action="store_true",
        help="Overwrite existing starter files. Use only after explicit user approval.",
    )
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    project_root = Path(args.root).expanduser().resolve()
    skill_root = Path(__file__).resolve().parents[1]
    template_root = skill_root / "assets" / "templates"

    created: list[str] = []
    skipped: list[str] = []

    project_root.mkdir(parents=True, exist_ok=True)

    for destination, template_name in FILES.items():
        destination_path = project_root / destination
        template_path = template_root / template_name

        if destination_path.exists() and not args.force:
            skipped.append(destination)
            continue

        destination_path.parent.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(template_path, destination_path)
        created.append(destination)

    if created:
        print("Created or updated:")
        for path in created:
            print(f"- {path}")
    else:
        print("No files created.")

    if skipped:
        print("\nSkipped existing files:")
        for path in skipped:
            print(f"- {path}")
        print("\nRun again with --force only if the user wants to overwrite them.")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
