const { anySep1, commaSep } = require('../common/common.js')

const PUNCTUATION_CHARACTERS_REGEX = '!-/:-@\\[-`\\{-~'
// prettier-ignore
const PUNCTUATION_CHARACTERS_ARRAY = [
  '!', '"', '#', '$', '%', '&', "'", '(', ')', '*', '+', ',', '-', '.', '/', ':', ';', '<',
  '=', '>', '?', '@', '[', '\\', ']', '^', '_', '`', '{', '|', '}', '~'
];

module.exports = grammar({
  name: 'asciidoc_inline',
  precedences: $ => [
    [$.auto_link, $._punctuation],
    [$.passthrough, $._punctuation],
  ],

  rules: {
    inline: $ =>
      repeat1(
        choice(
          $.replacement,
          $._word,
          $.anchor,
          $.email,
          $.footnote_macro,
          $.image_macro,
          $.kbd_macro,
          $.auto_link,
          $.link_macro,
          $.math_macro,
          $.menu_macro,
          $.passthrough,
          $._punctuation,
          $.xref,
          $.emphasis,
          $.ltalic,
          $.monospace,
          $.highlight,
          $.pass_macro,
        ),
      ),
    replacement: $ =>
      seq(
        '{',
        alias(token(repeat1(choice(/[^\}]/, '\\}'))), $.intrinsic_attributes),
        '}',
      ),
    _word: $ => choice($._word_no_digit, $._digits),
    _word_no_digit: $ =>
      new RegExp(
        '[^' +
          PUNCTUATION_CHARACTERS_REGEX +
          ' \\t\\n\\r0-9]+(_+[^' +
          PUNCTUATION_CHARACTERS_REGEX +
          ' \\t\\n\\r0-9]+)*',
      ),
    _digits: $ => /[0-9][0-9_]*/,
    _punctuation: _ => choice(...PUNCTUATION_CHARACTERS_ARRAY),
    anchor: $ =>
      choice(
        seq(
          '[[',
          alias(/\w+/, $.id),
          optional(seq(',', alias(/[\w\s ]+/, $.reftext))),
          ']]',
        ),
        seq(
          'anchor',
          ':',
          alias(/\w+/, $.id),
          '[',
          alias(/[^\]]*/, $.reftext),
          ']',
        ),
      ),
    // https://stackoverflow.com/a/201378
    email: $ =>
      /(?:[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*|"(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21\x23-\x5b\x5d-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])*")@(?:(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?|\[(?:(?:(2(5[0-5]|[0-4][0-9])|1[0-9][0-9]|[1-9]?[0-9]))\.){3}(?:(2(5[0-5]|[0-4][0-9])|1[0-9][0-9]|[1-9]?[0-9])|[a-z0-9-]*[a-z0-9]:(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21-\x5a\x53-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])+)\])/,
    footnote_macro: $ =>
      seq(
        choice('footnote', 'footnoteref'),
        ':',
        optional(alias(/\w+/, $.id)),
        '[',
        choice(
          seq(
            alias(/[\w]+/, $.id),
            optional(seq(',', alias(/[^\]]+/, $.reftext))),
          ),
          alias(/[^\]]*/, $.reftext),
        ),
        ']',
      ),
    image_macro: $ =>
      seq(
        choice('image', 'icon'),
        ':',
        alias(/[^\[]+/, $.link_url),
        '[',
        repeat(alias(choice(/[^\]]/, '\\[', '\\]'), $.id)),
        ']',
      ),
    kbd_macro: $ =>
      seq(
        choice('kbd', 'btn'),
        ':',
        '[',
        choice(anySep1($.key, '+'), anySep1($.key, ',')),
        ']',
      ),
    key: $ => choice(/[\w\d]+/, '\\]'),
    auto_link: $ =>
      prec.left(
        choice(
          $.link_url,
          prec(1, seq($.link_url, seq('[', optional($.link_label), ']'))),
          seq(
            '"',
            $.link_url,
            optional(seq('[', optional($.link_label), ']')),
            '"',
          ),
        ),
      ),
    link_label: $ => repeat1(choice(/[^\]]/, $.replacement)),
    link_url: $ =>
      seq(
        choice('http', 'https', 'file', 'ftp', 'irc'),
        '://',
        prec.right(anySep1($._link_component, '.')),
      ),
    _link_component: $ => /[^\.\s\[>]+/,
    link_macro: $ =>
      seq(
        choice('link', 'mailto'),
        ':',
        alias(/[^\s\[]+/, $.link),
        '[',
        optional($.link_label),
        ']',
      ),
    math_macro: $ =>
      seq(
        choice('stem', 'latexmath', 'asciimath'),
        ':',
        '[',
        alias(/[^\]]*/, $.math),
        ']',
      ),
    menu_macro: $ =>
      seq('menu', ':', alias(/\w+/, $.id), '[', alias(/[^\]]*/, $.keys), ']'),
    passthrough: $ =>
      choice(
        seq('+', /\w+/, '+'),
        seq('+++', /\w+/, '+++'),
        seq('$$', /\w+/, '$$'),
      ),
    xref: $ =>
      choice(
        seq('<<', alias(/\w+/, $.id), alias(/[^>]*/, $.reftext), '>>'),
        seq(
          'xref',
          ':',
          alias(/[^\[]*/, $.id),
          '[',
          alias(/[^\]]*/, $.reftext),
          ']',
        ),
      ),

    emphasis: $ =>
      create_text_formatting('*', $.ltalic, $.monospace, $.highlight),
    ltalic: $ =>
      create_text_formatting('_', $.emphasis, $.monospace, $.highlight),
    monospace: $ => create_text_formatting('`'),
    highlight: $ => create_text_formatting('#'),
    pass_macro: $ =>
      seq(
        'pass',
        ':',
        commaSep($.pass_macro_attr),
        '[',
        alias(optional($._macro_rule), $.pass_value),
        ']',
      ),
    pass_macro_attr: $ =>
      choice('c', 'a', 'r', 'm', 'p', 'n', 'v', 'quotes', 'q'),
    _macro_rule: $ =>
      repeat1(
        choice(
          /[^\]]/,
          '\\]',
          $.replacement,
          $.emphasis,
          $.ltalic,
          $.monospace,
          $.highlight,
        ),
      ),
  },
})

function create_text_formatting(ch, ...args) {
  return choice(
    seq(
      token(prec(1, ' ' + ch)),
      repeat(choice(new RegExp('[^' + ch + '\r\n]'), '\\' + ch, ...args)),
      ch + ' ',
    ),
    seq(
      ch + ch,
      repeat(choice(new RegExp('[^' + ch + '\r\n]'), '\\' + ch, ...args)),
      ch + ch,
    ),
  )
}
