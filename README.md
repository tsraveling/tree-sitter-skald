# tree-sitter-skald

Tree sitter implementation for the Skald narrative scripting language.

# Local Development

```bash
npm install -g tree-sitter-cli  # if needed
tree-sitter generate            # after editing grammar.js
tree-sitter test                # run tests
```

## Neovim Integration

Add to your nvim-treesitter config (I have mine in `after/nvim-treesitter.lua`):

```lua
local parser_config = require("nvim-treesitter.parsers").get_parser_configs()

parser_config.skald = {
  install_info = {
    url = "/absolute/path/to/repo/tree-sitter-skald",
    files = { "src/parser.c" },
  },
  filetype = "ska",
}

vim.filetype.add({
  extension = {
    ska = "skald",
  },
})
```

Then run `:TSInstall skald` in Neovim (if you want to later make updates, just restart Neovim or do `:TSUpdate` to reload the treesitter after doing `tree-sitter generate`).

Copy `queries/highlights.scm` to `~/.config/nvim/queries/skald/` for syntax highlighting.

# Conventional Commits

## Prerequisites

- Go 1.25+
- [cocogitto](https://github.com/cocogitto/cocogitto) for commit linting (`brew install cocogitto`)

## Commit conventions

This project uses [Conventional Commits](https://www.conventionalcommits.org/). The git hooks will validate your commit messages.

Run this to use the comitted githooks directory:

```bash
git config core.hooksPath .githooks
```

Use conventional commit syntax when making commits or PRs:

```
feat: add new feature
fix: fix a bug
docs: update documentation
chore: maintenance tasks
```

## License

[GNU GPL v3](LICENSE)



