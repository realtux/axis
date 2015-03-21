//
// axis lang, by b
//

// global things
axis = {
    symbols: {
        variables: {},
        functions: []
    }
};

// load the source in
var src  = require('fs').readFileSync(process.argv[2]),
    line = 1,
    char = 0;

// initial to string from buffer, trim, split
src = src
    .toString()
    .trim();

var expressions = {

    evaluate: function() {
        var output_buffer = '';

        for (;;) {
            // bool/null
            var boolnull =
                new RegExp('(true|false|null)')
                    .exec(src.slice(char, char + 5));

            if (boolnull !== null) {
                switch (boolnull[0]) {
                    case 'true':
                        char += 4;
                        output_buffer = true;
                        break;
                    case 'false':
                        char += 5;
                        output_buffer = false;
                        break;
                    case 'null':
                        char += 4;
                        output_buffer = null;
                        break;
                    default:
                        // ignored
                }
            }

            // string
            if (src[char] === '\'') {
                ++char;

                for (;;) {
                    // fail on newline
                    if (src[char] === '\n' || src[char] === undefined) {
                        errors.parse('Unterminated string');
                    }

                    // account for escape
                    if (src[char] === '\'' && src[char - 1] !== '\\') {
                        ++char;
                        break;
                    }

                    // replace newline
                    if (src[char] === '\\') {
                        // peek forward
                        if (src[char + 1] == 'n') {
                            output_buffer += '\n';
                            ++char;
                            ++char;
                            continue;
                        }
                    }

                    output_buffer += src[char];
                    ++char;
                }
            }

            // integer
            if (/[1-9]/gi.test(src[char])) {
                var fullint = '';

                for (;;) {
                    // fail on newline or endline
                    if (src[char] === '\n' || src[char] === undefined) {
                        errors.parse('Unterminated expression');
                    }

                    // break
                    if (/[^1-9]/gi.test(src[char])) {
                        output_buffer += fullint;
                        break;
                    }

                    // append string version of integer
                    fullint += src[char];
                    ++char;
                }
            }

            // function
            if (/^[a-zA-Z_]+\s*?\(/gi.test(src.slice(char))) {

            }

            // variable
            if (/[a-zA-Z_]/gi.test(src[char])) {
                var variable_name = '';

                for (;;) {
                    // fail on newline or endline
                    if (src[char] === '\n' || src[char] === undefined) {
                        errors.parse('Unterminated expression');
                    }

                    // break
                    if (/[^a-zA-Z_]/gi.test(src[char])) {
                        break;
                    }

                    // append string version of integer
                    variable_name += src[char];
                    ++char;
                }

                // check if the variable is in the symbol table
                var variable_value = axis.symbols.variables[variable_name];

                if (variable_value === undefined) {
                    errors.warning('Undefined variable \'' + variable_name + '\'');
                } else {
                    output_buffer += variable_value;
                }
            }

            // end of expression
            if (src[char] === ';') {
                ++char;
                return output_buffer;
            }


            // newline means missing semi colon
            if (src[char] === '\n' || src[char] === undefined) {
                errors.parse('Unterminated expression');
            }
        }
    }

};

var constructs = {

    // generic output
    echo: function() {
        char += 4;

        parser.eat_space();

        process.stdout.write(expressions.evaluate());
    },

    // function declaration
    func: function() {
        var func = {
            char_pos: char,
            name: '',
            arguments: [],
            body_start: null,
            body_end: null
        };

        char += 4;

        parser.eat_space();

        for (;;) {
            // fail on newline or endline
            if (src[char] === '\n' || src[char] === undefined) {
                errors.parse('Improper function declaration');
            }

            // break
            if (/[^a-zA-Z_]/gi.test(src[char])) {
                parser.eat_space();
                if (src[char] !== '(') {
                    errors.parse('Unexpected symbol in function declaration');
                }
                break;
            }

            func.name += src[char];
            ++char;
        }

        // pass lparen
        ++char;


        // loop over each possible argument
        for (;;) {
            // zero out current argument
            var current_argument = '';

            // loop over each character in an argument
            for (;;) {
                // fail on newline or endline
                if (src[char] === '\n' || src[char] === undefined) {
                    errors.parse('Improper argument declaration');
                }

                // break on non alpha+_ character
                if (/[^a-zA-Z_]/gi.test(src[char])) {
                    break;
                }

                // add the character to the current argument
                current_argument += src[char];
                ++char;
            }

            // argument iteration complete, push argument into func definition
            func.arguments.push(current_argument);

            // no comma means no more argument, break out
            if (src[char] !== ',') {
                break;
            }

            ++char;
        }

        // verify next character is an rparen
        if (src[char] !== ')') {
            errors.parse('Expecting right parenthesis');
        }

        // push past rparen
        ++char;

        parser.eat_space();

        if (src[char] !== '{') {
            errors.parse('Expecting left curly start of function');
        }

        // push past lcurly
        ++char;
        func.body_start = char;

        // rip through to closing rcurly
        var nested_curly = 0;

        for (;;) {
            // fail on endline
            if (src[char] === undefined) {
                errors.parse('Unclosed function declaration beginning ' + func.char_pos);
            }

            if (src[char] === '\n') {
                ++line;
            }

            // check for end declaration
            if (src[char] === '}' && nested_curly === 0) {
                break;
            }

            // check for new opening lcurly
            if (src[char] === '{') {
                ++nested_curly;
            }

            // check for end nested closing rcurly
            if (src[char] === '}') {
                --nested_curly;
            }

            ++char;
        }

        func.body_end = char - 1;

        ++char;

        console.log(func);
        errors.exit();
    },

    // variable assignment
    var: function() {
        char += 3;

        if (src[char] !== ' ') {
            errors.parse('Expected space after \'var\'');
        }

        parser.eat_space();

        var variable_name = '';

        for (;;) {
            // fail on newline or endline
            if (src[char] === '\n' || src[char] === undefined) {
                errors.parse('Unterminated expression');
            }

            // break
            if (/[^a-zA-Z_]/gi.test(src[char])) {
                break;
            }

            // append char to variable name
            variable_name += src[char];
            ++char;
        }

        parser.eat_space();

        if (src[char] !== '=') {
            errors.parse('Expected =');
        }

        ++char;

        parser.eat_space();

        axis.symbols.variables[variable_name] = expressions.evaluate();
    }

};

var errors = {

    warning: function(message) {
        console.log('----');
        throw 'Axis Warning: ' + message + ' at line ' + line;
    },

    parse: function(message) {
        console.log('----');
        throw 'Axis Parse Error: ' + message + ' at line ' + line;
    },

    exit: function(message) {
        console.log('----');
        throw 'Manual exit triggered at line ' + line;
    }

};

var parser = {

    eat_space: function() {
        // eat space
        for (;;) {
            if (src[char] === ' ') {
                ++char;
                continue;
            }

            break;
        }
    }

};

var lexer = {

    lex: function() {
        for (;;) {
            // eat space
            if (src[char] === ' ') {
                parser.eat_space();
                continue;
            }

            // end newline and increment line
            if (src[char] === '\n') {
                ++char;
                ++line;
                continue;
            }

            // eat comment
            if (src.slice(char, char + 2).match(/\/\//)) {
                for (;;) {
                    ++char;
                    if (src[char] === '\n') {
                        break;
                    }
                }

                continue;
            }

            // reserved keyword
            var matches =
                new RegExp('(' + this._get_reserved().join('|') + ')')
                    .exec(src.slice(char));

            // check for a matched reserved keyword
            if (matches !== null) {
                // execute the handling for that keyword
                constructs[matches[0]]();
                continue;
            }

            // file done
            if (src[char] === undefined) break;

            // analyze next character
            ++char;
        }

        console.log('\n\n------', 'Execution complete, read', line, 'line(s)');
    },

    _get_reserved: function() {
        return [
            'echo',
            'func',
            'var'
        ];
    }

};

try {
    // do it
    lexer.lex();
} catch (err) {
    console.log(err.toString());
}