const { commaSep } = require('../common/common.js')

module.exports = grammar({
  name: 'asciidoc',

  extras: $ => [$._NEWLINE, $.comment],
  externals: $ => [
    $._eof,
    $.title_h0_marker,
    $.title_h1_marker,
    $.title_h2_marker,
    $.title_h3_marker,
    $.title_h4_marker,
    $.title_h5_marker,
    $.list_marker_star,
    $.list_marker_hyphen,
    $.list_marker_dot,
    $.list_marker_digit,
    $.list_marker_geek,
    $.list_marker_alpha,
    $.document_attr_marker,
    $.element_attr_marker,
    $.block_title_marker,
    $.breaks_marker,
    $.table_block_marker,
    $.delimited_block_marker,
    $.raw_block_marker,
    $.block_macro_name,
    $.anno_list_marker,
  ],

  precedences: $ => [[$.checked_list, $.unordered_list]],

  rules: {
    document: $ =>
      repeat(
        choice(
          $.title0,
          $.title1,
          $.title2,
          $.title3,
          $.title4,
          $.title5,
          $._section_block,
          $.block_macro,
        ),
      ),

    _section_block: $ =>
      seq(
        repeat(choice($.element_attr, $.block_title)),
        choice(
          $.unordered_list,
          $.ordered_list,
          $.checked_list,
          $.table_block,
          $.delimited_block,
          $.raw_block,
          $.breaks,
          $.paragraph,
        ),
      ),
    title0: $ =>
      seq(
        $.title_h0_marker,
        $._WHITE_SPACE,
        $.line,
        repeat(choice($.document_attr, $.block_macro)),
        $._block_end,
      ),
    title1: $ => seq($.title_h1_marker, $._WHITE_SPACE, $.line),
    title2: $ => seq($.title_h2_marker, $._WHITE_SPACE, $.line),
    title3: $ => seq($.title_h3_marker, $._WHITE_SPACE, $.line),
    title4: $ => seq($.title_h4_marker, $._WHITE_SPACE, $.line),
    title5: $ => seq($.title_h5_marker, $._WHITE_SPACE, $.line),
    breaks: $ => seq($.breaks_marker, $._block_end),

    block_macro: $ =>
      seq(
        $.block_macro_name,
        '::',
        alias(repeat(choice(/[^\[]/, '\\[')), $.target),
        '[',
        commaSep($.block_macro_attr),
        ']',
        $._block_end,
      ),
    block_macro_attr: $ =>
      seq(
        alias(repeat1(choice(/[^=]/, '\\=')), $.name),
        optional(seq('=', alias(repeat1(choice(/[^\]]/, '\\]')), $.value))),
      ),

    document_attr: $ =>
      seq(
        $.document_attr_marker,
        alias(/[\w\d_][\w\d-]*/, $.attr_name),
        alias(':', $.document_attr_marker),
        optional(seq(token.immediate(' '), alias($.escaped_line, $.line))),
        $._block_end,
      ),
    escaped_line: $ =>
      repeat1(choice(/[^\/\n]/, /\/[^*]/, /\\\r?\n/, seq($.hard_wrap))),
    hard_wrap: $ => ' +',
    element_attr: $ =>
      seq(
        $.element_attr_marker,
        alias(token(repeat(choice(/[^\]\r\n]/, '\\]'))), $.attr_value),
        alias(']', $.element_attr_marker),
        $._NEWLINE,
      ),
    block_title: $ => seq($.block_title_marker, $.line),

    checked_list: $ => seq(repeat1($.ck_item), $._block_end),
    ck_item: $ =>
      seq(
        $.unordered_list_marker,
        $._WHITE_SPACE,
        choice(
          alias(token(prec(1, /\[[*x]\]/)), $.task_list_marker_checked),
          alias(token(prec(1, '[ ]')), $.task_list_marker_unchecked),
        ),
        $._WHITE_SPACE,
        $.line,
      ),

    unordered_list: $ => seq(repeat1($.ul_item), $._block_end),
    ul_item: $ => seq($.unordered_list_marker, $._WHITE_SPACE, $.line),
    unordered_list_marker: $ =>
      choice($.list_marker_star, $.list_marker_hyphen),

    ordered_list: $ => seq(repeat1($.ol_item), $._block_end),
    ol_item: $ => seq($.ordered_list_marker, $._WHITE_SPACE, $.line),
    ordered_list_marker: $ =>
      choice(
        $.list_marker_digit,
        $.list_marker_geek,
        $.list_marker_alpha,
        $.list_marker_dot,
      ),

    table_block: $ =>
      seq($.table_block_marker, repeat($.table_cell), $.table_block_marker),
    table_cell: $ => seq(optional($.table_cell_attr), '|', /[^|\r\n]*/),
    table_cell_attr: $ =>
      repeat1(
        choice(/\w/, '<', '>', '^', '.^', '~', /\d+\+/, /\.\d+\+/, /\d+\.\d+/),
      ),

    delimited_block: $ =>
      seq($.delimited_block_marker, repeat($.line), $.delimited_block_marker),
    raw_block: $ =>
      seq(
        $.raw_block_marker,
        alias(
          repeat(choice(seq(/[^\r\n]+/, $._block_end), $.block_macro)),
          $.raw_block_body,
        ),
        $.raw_block_marker,
        optional($.anno_list),
      ),

    anno_list: $ => repeat1($.anno_list_item),
    anno_list_item: $ => seq($.anno_list_marker, $._WHITE_SPACE, $.line),

    line: $ => seq(/[^\r\n]+/, $._block_end),
    paragraph: $ => prec(-1, seq(repeat1($.line), $._block_end)),

    comment: $ => seq(token(prec(1, '//')), /(\\+(.|\r?\n)|[^\\\n])*/),

    _block_end: $ => choice($._NEWLINE, $._eof),
    _NEWLINE: _ => /\r?\n/,
    _WHITE_SPACE: $ => /[ \t]+/,
  },
})
