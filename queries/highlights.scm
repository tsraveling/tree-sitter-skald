; Comments
(comment) @comment
(inline_comment) @comment

; Block tags
(block_tag) @label
(block_tag depth: _ @punctuation.special)

; Top matter keywords
"@let" @keyword
"@end" @keyword
"@receive" @keyword
"@testbed" @keyword
"@methods" @keyword
"@globals" @keyword

; Conditional chain keywords
"@if" @keyword
"@elseif" @keyword
"@else" @keyword
"@endif" @keyword

; Declarations
(declaration name: (variable_name) @attribute)
(type) @type
(method_signature) @type
(testbed name: (identifier) @type)
(testbed_declaration variable: (variable_name) @attribute)

; Codex methods
(method_def name: (identifier) @function)
(arg_def name: (identifier) @variable.parameter)

; Variable references
(variable_ref) @attribute

; Attributions
(attribution) @attribute
(attribution) @markup.italic

; Conditionals
"(?" @punctuation.bracket
(conditional) @conditional
"and" @keyword.operator
"or" @keyword.operator
"!" @operator

; Operations
"->" @operator
(move_target) @label
"^" @operator
"GO" @keyword
(go_module_op module: (module_path) @string.special.path)
(receive module: (module_path) @string.special.path)
"EXIT" @keyword

; Method calls
(method_call
  method: (identifier) @function)
":" @punctuation.delimiter

; Mutations
(mutation_op
  variable: (variable_name) @attribute
  operator: _ @operator)

; Choices
">" @punctuation.special
(choice text: (text_content) @markup.italic)

; Insertions
"{" @punctuation.bracket
"}" @punctuation.bracket
"?" @operator
(ternary_insertion) @conditional
(switch_ternary) @conditional
((switch_case key: (rvalue (variable_ref) @constant.builtin))
  (#eq? @constant.builtin "_"))

; Values
(string) @string
(number) @number
(boolean) @boolean

; Operators
"=" @operator
"!=" @operator
">" @operator
"<" @operator
">=" @operator
"<=" @operator
"+=" @operator
"-=" @operator
"=!" @operator

; Punctuation
"(" @punctuation.bracket
")" @punctuation.bracket
"[" @punctuation.bracket
"]" @punctuation.bracket
"," @punctuation.delimiter
