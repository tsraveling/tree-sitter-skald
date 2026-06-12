# PLAN: Update tree-sitter-skald for Skald v0.3 (`feat/v0.3`)

Source of truth: `~/repos/skald` branch `feat/v0.3` — specifically
`src/shared_grammar.h`, `src/skald_grammar.h`, `src/codex_grammar.h`,
`docs/Syntax.md`, and the test files `test/test.ska` / `test/test.codex`.

The v0.3 branch is a large rework (~3,600 insertions): top-matter is now
keyword-block based (`@let`, `@testbed`, `@receive`), conditional chains
replace `*` logic beats, blocks nest three levels, transitions gained
relative paths, comments moved to three hyphens, and a new `.codex` file
format exists (`@methods` / `@globals`).

---

## 1. Comment syntax change: `--` → `---`

- Line comments are now **three** hyphens: `--- comment to EOL`.
  Update `comment` rule from `token(seq('--', /.*/))`.
- Inline (embedded) comments are now `{--- ... }` (was `{-- ... }`).
  Update `inline_comment`.
- Two-hyphen `--` inside beat text is plain text (the whole point of the
  three-hyphen change — see Syntax.md 1.2). Make sure `text_fragment`
  still swallows `--` but the lexer prefers `---` as a comment.

## 2. Top matter rework

Remove:
- `variable_declaration` (`~ name = value` / `< name = value` at file top).
  Module variables are no longer declared with `~` at the top of the file.

Add:
- **`@let` block**:
  ```
  @let
    age int = 30      --- type and default both optional, but at least one required
    name string
    gender = "f"
  @end
  ```
  Shared `declaration` rule: `identifier [type] [= simple_value]` where
  type ∈ `int | float | string | bool`. Declarations are indented
  (2+ spaces or tabs). End-of-line `---` comments allowed.
- **`@receive` line**: `@receive subfolder/scene.ska` — keyword + module
  path, top matter only.
- **`@testbed name ... @end`** — already in the grammar; keep. Body lines
  are `identifier = simple_value` (no type annotation in testbeds).

Top-matter items (`@let`, `@testbed`, `@receive`, comments, blank lines)
may appear in **any order** before the first block — drop the current
strict declarations→testbeds→blocks sequencing in `source_file`.

## 3. Nested block tags

- Blocks now nest: `# tag`, `## child`, `### grandchild` (max 3 levels).
- A space is required after the `#` prefix (`block_tag_line` in skald is
  `block_prefix, one<' '>, name`).
- Decide flat vs nested tree. Recommendation: keep blocks **flat** in the
  parse tree (matching skald's own parser, which resolves hierarchy
  semantically) but expose depth, e.g. distinct `(block_tag)` with a
  `depth` via the `#`/`##`/`###` token, or fields. Flat avoids
  external-scanner work for dedent-style nesting.

## 4. Conditional chains replace `*` logic beats

Remove:
- `logic_beat` (`* (? cond)` / `* (else)` syntax) — gone from v0.3 grammar.

Add `cond_chain` at block-member level:
```
@if age > 30
  ...members...
@elseif age > 10
  ...members...
@else
  ...members...
@endif
```
- `@if` / `@elseif` take a `checkable_clause` (same expression grammar as
  inline conditionals); `@else` / `@endif` take nothing.
- Bodies are ordinary block members (beats, ops, choice groups, comments) —
  but **not** nested block tags.
- Note `@endif` (not `@end`) closes the chain; `@end` closes `@let`,
  `@testbed`, `@methods`, `@globals`. Keep these as distinct tokens —
  also note `@elseif` must lex before `@else` (longer match).

## 5. Transitions / move targets

Current `move_op` only accepts a bare identifier. v0.3 adds:

- **Full path**: `ident(.ident(.ident))` up to 3 segments, e.g.
  `-> alice.b` (`move_identifier_full`).
- **Relative short forms** (`move_identifier_short`), one or more of, in
  combination:
  - `.child` — into a child block
  - `-sib` — to a sibling block
  - `^` — up to parent, repeatable (`^^`)
- **Inline choice move**: `> Choice text -> target` on the same line as
  choice text. Requires `text_fragment` / `inline_text_segment` to stop at
  `->` (skald's `inline_text_segment` has `not_at<move_marker>`). This is
  the trickiest lexing change: amend the text-fragment regex/token so `->`
  terminates text, and verify beats containing literal `->` mid-sentence
  (check skald behavior — its parser also cuts text at the move marker).

## 6. `GO` and module paths

- `module_path` is now lenient: any run of characters up to `->`, a `---`
  comment, or EOL (was `/[a-zA-Z0-9_\/]+\.ska/`). Update regex; keep it
  non-greedy with respect to the optional `-> start_tag` tail.
- `GO path -> tag` start-tag form already exists; keep, but tag should use
  the new full move identifier (dotted path), not bare identifier.

## 7. Codex file support (`.codex`)

New file format parsed by `codex_grammar.h`:
```
@methods
  simple() action
  simple_args(a int, b string) action
  returns_something() int
@end

@globals
  age int
  gender = "?"
  alive bool = true
@end
```

Codex files use a distinct `*.codex` extension. That supports either of
two approaches:

- **Option A — one grammar, both extensions (recommended).** Add
  `@methods` / `@globals` sections as alternatives in `source_file` top
  matter — keywords are unambiguous. Register `codex` in
  `tree-sitter.json` `file-types` and map `*.codex` → `skald` filetype in
  editors. The parser is a union (it would accept `@methods` in a `.ska`
  file and narrative blocks in a `.codex` file), but tree-sitter only
  highlights — the LSP owns that validation. Zero build complexity.
- **Option B — split grammars (tree-sitter-typescript pattern).** One
  repo, shared `common/define-grammar.js`, two dialects (`skald`,
  `codex`), each mapped to its extension. Strict per-filetype parsing, no
  union laxness. Cost: two generated parsers, doubled bindings/build
  config, more CI.

Go with **Option A**. The codex grammar is tiny (`@methods`, `@globals`,
declarations, `---` comments) and the union laxness is harmless for
highlighting. The extension's real value is editor filetype detection,
not parser separation. Revisit Option B only if codex syntax grows or
diverges (e.g. codex-only constructs colliding with beat text lexing).

New rules:
- `methods_block`: `@methods` … `@end`; each entry
  `identifier(arg_defs?) signature` where `arg_def` = `name type` and
  `signature` ∈ `int | float | string | bool | action`.
- `globals_block`: `@globals` … `@end`; entries reuse the shared
  `declaration` rule from §2.

## 8. Values, operators, expressions

- **Signed numbers**: `signed_int` / `signed_float` allow leading `+`/`-`.
  Current `number` regex is unsigned — update to `/[+-]?\d+(\.\d+)?/`
  (mind conflicts with `-sib` move targets and `-=`).
- **Switch ternary default key**: `_` is now a valid switch key:
  `{x ? [1:"a", _:"fallback"]}`. Add to `switch_case` key.
- Mutation ops unchanged in surface syntax (`=`, `+=`, `-=`, `=!`), but
  `+=`/`-=` rhs is restricted to numeric/var/method (`math_rvalue`) —
  optional fidelity, fine to keep permissive `rvalue` in tree-sitter.
- Conditional expression grammar (`and`/`or`, parens, `!`, comparison
  operators) is structurally the same — keep, but verify operator set
  matches (`=`, `!=`, `>`, `<`, `>=`, `<=`).

## 9. Block-level operations and conditional members

- Ops now legal **non-indented at block level** (test.ska has bare
  `:simple()` and `~ age += 10` lines between beats). Current grammar only
  allows ops indented under a beat/choice. Add ops as direct block members.
- Any member (beat **or** op) can carry a leading inline conditional:
  `(? gender = "m") ~ age += 2`. Current grammar only allows conditionals
  on beats and choices — extend to operations.
- Indented members under a choice (`choice_member`) can be full beats too,
  not just operations — choice bodies can contain text lines.

## 10. Housekeeping / downstream

- **`queries/highlights.scm`**: update for every change above —
  remove `"<"`, `"(else)"`, `logic_beat`/`"*"` captures; add `@let`,
  `@receive`, `@if`/`@elseif`/`@else`/`@endif`, `@methods`, `@globals`,
  `action` type, declaration types, relative move tokens (`^`, `.x`, `-x`),
  `_` switch default.
- **Test corpus**: rewrite `test/corpus/*.txt` for new syntax; copy
  `~/repos/skald/test/test.ska` and `test/test.codex` in as integration
  fixtures (they exercise nearly everything: `@let`, `@testbed`, cond
  chains, relative transitions, codex blocks).
- **`tree-sitter.json` / `package.json`**: add `.codex` to file types if
  going the single-grammar route.
- Regenerate parser (`tree-sitter generate`), run `tree-sitter test`,
  spot-check highlighting with `tree-sitter highlight test/corpus/test.ska`.
- Bump version (repo uses conventional commits + cog for changelog).

## Suggested order of work

1. Comments (`---`) + signed numbers + `_` switch key (small, isolated).
2. Top matter: remove old declarations, add `@let` / `@receive`, relax ordering.
3. Nested block tags.
4. Move/transition targets + inline choice moves (text lexing change — riskiest).
5. Cond chains, drop logic beats; block-level ops + conditional ops.
6. Codex blocks.
7. Queries, corpus tests, fixtures, version bump.
