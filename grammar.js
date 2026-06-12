module.exports = grammar({
  name: 'skald',

  extras: $ => [
    /[ \t]/,
    $.empty,
  ],

  rules: {

    // A skald source file: top matter (any order), then narrative blocks.
    // Codex files (*.codex) share this grammar; @methods / @globals sections
    // are top-matter items and codex files simply contain no blocks.
    source_file: $ => repeat(choice(
      $.let_block,
      $.testbed,
      $.receive,
      $.methods_block,
      $.globals_block,
      $.block,
      $.comment,
    )),

    // Empty lines
    empty: $ => /\n/,

    // Comments (three hyphens; `--` is plain text inside beats)
    comment: $ => token(seq('---', /.*/)),

    // -- Top matter --------------------------------------------------------

    // @let ... @end — module-scoped variable declarations
    let_block: $ => seq(
      '@let',
      optional($.comment),
      /\n/,
      repeat(choice($.declaration, $.comment)),
      '@end',
      optional($.comment),
      /\n/,
    ),

    // name [type] [= default] — used by @let and @globals
    declaration: $ => seq(
      field('name', $.variable_name),
      optional(field('type', $.type)),
      optional(seq('=', field('value', $.simple_value))),
      optional($.comment),
      /\n/,
    ),

    type: $ => choice('int', 'float', 'string', 'bool'),

    // @receive path/to/module.ska — LSP hint for pushed module variables
    receive: $ => seq(
      '@receive',
      field('module', $.module_path),
      optional($.comment),
      /\n/,
    ),

    // @testbed name ... @end
    testbed: $ => seq(
      '@testbed',
      field('name', $.identifier),
      optional($.comment),
      /\n/,
      repeat(choice($.testbed_declaration, $.comment)),
      '@end',
      optional($.comment),
      /\n/,
    ),

    testbed_declaration: $ => seq(
      field('variable', $.variable_name),
      '=',
      field('value', $.simple_value),
      optional($.comment),
      /\n/,
    ),

    // -- Codex sections (*.codex) -------------------------------------------

    // @methods ... @end
    methods_block: $ => seq(
      '@methods',
      optional($.comment),
      /\n/,
      repeat(choice($.method_def, $.comment)),
      '@end',
      optional($.comment),
      /\n/,
    ),

    method_def: $ => seq(
      field('name', $.identifier),
      '(',
      commaSep($.arg_def),
      ')',
      field('returns', $.method_signature),
      optional($.comment),
      /\n/,
    ),

    arg_def: $ => seq(
      field('name', $.identifier),
      field('type', $.type),
    ),

    method_signature: $ => choice($.type, 'action'),

    // @globals ... @end
    globals_block: $ => seq(
      '@globals',
      optional($.comment),
      /\n/,
      repeat(choice($.declaration, $.comment)),
      '@end',
      optional($.comment),
      /\n/,
    ),

    // -- Blocks --------------------------------------------------------------

    // Blocks are flat in the parse tree; nesting depth comes from the tag
    // prefix (#, ##, ###) and is resolved semantically by skald itself.
    block: $ => prec.right(seq(
      field('tag', $.block_tag),
      repeat(choice($.cond_chain, $._block_member)),
    )),

    block_tag: $ => seq(
      field('depth', choice('###', '##', '#')),
      field('name', $.identifier),
      optional($.comment),
      /\n/,
    ),

    _block_member: $ => choice(
      $.beat,
      $.operation_line,
      $.choices,
      $.comment,
    ),

    // -- Conditional chains ---------------------------------------------------

    cond_chain: $ => seq(
      $.if_clause,
      repeat($.elseif_clause),
      optional($.else_clause),
      '@endif',
      optional($.comment),
      /\n/,
    ),

    if_clause: $ => prec.right(seq(
      '@if',
      field('condition', $.conditional_expression),
      optional($.comment),
      /\n/,
      repeat($._block_member),
    )),

    elseif_clause: $ => prec.right(seq(
      '@elseif',
      field('condition', $.conditional_expression),
      optional($.comment),
      /\n/,
      repeat($._block_member),
    )),

    else_clause: $ => prec.right(seq(
      '@else',
      optional($.comment),
      /\n/,
      repeat($._block_member),
    )),

    // -- Beats -----------------------------------------------------------------

    attribution: $ => token(seq(/[a-zA-Z_][a-zA-Z0-9_]*/, ':')),

    beat: $ => seq(
      optional($.conditional),
      optional(field('attribution', $.attribution)),
      field('content', $.text_content),
      /\n/,
    ),

    // A standalone operation line, optionally guarded: (? cond) ~ x += 1
    operation_line: $ => seq(
      optional($.conditional),
      $.operation,
      optional($.comment),
      /\n/,
    ),

    // -- Text content with insertions ---------------------------------------------

    text_content: $ => prec.right(repeat1(choice(
      $.text_fragment,
      '-',
      $.insertion,
      $.inline_comment,
    ))),

    // Hyphens are handled separately so `->` can terminate choice text.
    text_fragment: $ => token(prec(-1, /[^{}\-\n\r]+/)),

    inline_comment: $ => token(seq('{---', /[^}]*/, '}')),

    insertion: $ => seq(
      '{',
      choice(
        $.simple_insertion,
        $.ternary_insertion,
        $.switch_ternary,
      ),
      '}',
    ),

    simple_insertion: $ => $.rvalue,

    ternary_insertion: $ => seq(
      field('condition', $.rvalue),
      '?',
      field('true_value', $.rvalue),
      ':',
      field('false_value', $.rvalue),
    ),

    switch_ternary: $ => seq(
      field('switch_value', $.rvalue),
      '?',
      '[',
      commaSep1($.switch_case),
      ']',
    ),

    switch_case: $ => seq(
      field('key', $.rvalue),
      ':',
      field('value', $.rvalue),
    ),

    // -- Conditionals ----------------------------------------------------------

    conditional: $ => seq(
      '(?',
      field('expression', $.conditional_expression),
      ')',
    ),

    conditional_expression: $ => choice(
      $.conditional_clause,
      seq(
        $.conditional_clause,
        repeat1(seq(
          choice('and', 'or'),
          $.conditional_clause,
        )),
      ),
    ),

    conditional_clause: $ => choice(
      seq('(', $.conditional_expression, ')'),
      $.conditional_atom,
    ),

    conditional_atom: $ => choice(
      seq('!', $.rvalue),
      $.rvalue,
      seq(
        $.rvalue,
        field('operator', choice('=', '!=', '>', '<', '>=', '<=')),
        $.rvalue,
      ),
    ),

    // -- Choices -----------------------------------------------------------------

    choices: $ => prec.right(repeat1($.choice)),

    choice: $ => prec.right(seq(
      '>',
      optional($.conditional),
      field('text', $.text_content),
      optional(seq('->', field('target', $.move_target))),
      /\n/,
      repeat($.choice_member),
    )),

    // Indented members under a choice: operations or nested beats
    choice_member: $ => prec.right(2, seq(
      /[ \t]+/,
      choice(
        seq(optional($.conditional), $.operation, optional($.comment)),
        seq(optional($.conditional), optional(field('attribution', $.attribution)), field('content', $.text_content)),
      ),
      /\n/,
    )),

    // -- Operations ---------------------------------------------------------------

    operation: $ => choice(
      $.move_op,
      $.go_module_op,
      $.exit_op,
      $.method_call_op,
      $.mutation_op,
    ),

    move_op: $ => seq('->', field('target', $.move_target)),

    // Full path (block, block.child, block.child.grandchild) or relative
    // steps: .child, -sibling, ^ (parent, repeatable), in combination.
    move_target: $ => choice(
      $.move_path,
      $.move_relative,
    ),

    move_path: $ => prec.right(seq(
      $.identifier,
      repeat(seq('.', $.identifier)),
    )),

    move_relative: $ => prec.right(repeat1(choice(
      seq('.', $.identifier),
      seq('-', $.identifier),
      '^',
    ))),

    go_module_op: $ => prec.right(seq(
      'GO',
      field('module', $.module_path),
      optional(seq('->', field('tag', $.move_target))),
    )),

    module_path: $ => /[a-zA-Z0-9_][a-zA-Z0-9_\/.\-]*/,

    exit_op: $ => prec.right(seq('EXIT', optional($.rvalue))),

    method_call_op: $ => $.method_call,

    mutation_op: $ => seq(
      '~',
      field('variable', $.variable_name),
      field('operator', choice('=!', '+=', '-=', '=')),
      optional(field('value', $.rvalue)),
    ),

    // -- RValues (right-hand side values) ----------------------------------------

    rvalue: $ => choice(
      $.simple_value,
      $.variable_ref,
      $.method_call,
    ),

    simple_value: $ => choice(
      $.string,
      $.number,
      $.boolean,
    ),

    variable_ref: $ => $.variable_name,

    method_call: $ => seq(
      ':',
      field('method', $.identifier),
      '(',
      commaSep($.rvalue),
      ')',
    ),

    // -- Primitives -----------------------------------------------------------------

    identifier: $ => /[a-zA-Z_][a-zA-Z0-9_]*/,

    variable_name: $ => $.identifier,

    string: $ => token(seq(
      '"',
      repeat(choice(
        /[^"\\]/,
        seq('\\', /./),
      )),
      '"',
    )),

    number: $ => /[+-]?\d+(\.\d+)?/,

    boolean: $ => choice('true', 'false'),
  }
});

function commaSep1(rule) {
  return seq(rule, repeat(seq(',', rule)));
}

function commaSep(rule) {
  return optional(commaSep1(rule));
}
