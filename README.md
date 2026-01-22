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
