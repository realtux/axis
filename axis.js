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

// initial to string from buffer, trim, split, and filter out comments
src = src
    .toString()
    .trim();

var expressions = {

    evaluate: function() {
        var output_buffer = '';

        for (;;) {
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

        var value = expressions.evaluate();

        process.stdout.write(value);
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

            // append string version of integer
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
        console.log();
        throw new Error('\nAxis Warning:', message, 'at line', line);
    },

    parse: function(message) {
        console.log();
        throw new Error('\nAxis Parse Error: ' + message + ' at line ' + line);
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
                        ++char;
                        ++line;
                        break;
                    }
                }

                continue;
            }

            // reserved keyword
            var reserved_re = new RegExp('(' + this._get_reserved().join('|') + ')');
            var matches = reserved_re.exec(src.slice(char));

            if (matches !== null) {
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