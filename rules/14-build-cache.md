# Build cache rationale

Rationale behind the cache rule in `AGENTS.md` §5 (`.cache/`, `.astro/` and `dist/` must
never be deleted on one's own initiative).

Astro manages these directories. Deleting them — even partially — corrupts image-hash
references, makes the build fail with `ENOENT` errors and forces unnecessary full
recomputations. For real cache problems, prefer `astro sync` (content index) and ask the
owner instead of clearing a cache.
