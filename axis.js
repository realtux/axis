//
// axis lang, by b
//

// global things
axis = {
    symbols: {
        variables: {},
        functions: {}
    },
    stack: [],
    exec_start: 0
};

axis.exec_start = Date.now();

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

        // space
        if (src[char] == ' ') {
            parser.eat_space();
        }

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
            //errors.exit();
            var function_name = '';

            for (;;) {
                // fail on newline or endline
                if (src[char] === '\n' || src[char] === undefined) {
                    errors.parse('Unterminated function');
                }

                if (src[char] === ' ') {
                    ++char;
                    continue;
                }

                // break
                if (/[^a-zA-Z_]+/gi.test(src[char])) {
                    if (src[char] === '(') {
                        break;
                    }

                    errors.parse('Undefined symbol in function call');
                }

                function_name += src[char];
                ++char;
            }

            // push past lparen
            ++char;

            // remove space between lparen and first argument
            parser.eat_space();

            // check for function
            if (axis.symbols.functions[function_name] === undefined) {
                errors.fatal('Undefined function \'' + function_name + '\'');
            }

            var argument_values = [];

            for (;;) {
                argument_values.push(expressions.evaluate());

                if (src[char] === ',') {
                    ++char;
                    // remove space between comma and argument
                    parser.eat_space();
                    continue;
                }

                break;
            }

            // remove space between last argument and rparen
            parser.eat_space();

            if (src[char] !== ')') {
                errors.parse('Unclosed function call');
            }

            // check if the stack is empty
            if (axis.stack.length === 0) {
                // add char and line to the stack
                axis.stack.push({
                    char_pos: char,
                    line_pos: line
                });
            } else {
                axis.stack[axis.stack.length - 1].char_pos = char;
                axis.stack[axis.stack.length - 1].line_pos = line;
            }

            // add the stack frame
            var frame_function = axis.symbols.functions[function_name];

            // add the argument values
            frame_function.argument_values = argument_values;

            axis.stack.push(frame_function);

            functions.call();

            var return_value = axis.stack[axis.stack.length - 1].return_value

            if (return_value !== undefined) {
                output_buffer += return_value;
            }
        }

        // variable
        if (/[a-zA-Z_0-9]/gi.test(src[char])) {
            var variable_name = '';

            for (;;) {
                // fail on newline or endline
                if (src[char] === '\n' || src[char] === undefined) {
                    errors.parse('Unterminated expression');
                }

                // break
                if (/[^a-zA-Z_0-9]/gi.test(src[char])) {
                    break;
                }

                // append string version of integer
                variable_name += src[char];
                ++char;
            }

            // check if the variable is in the symbol table
            var variable_value = axis.symbols.variables[variable_name];

            if (variable_value === undefined) {
                // see if the stack is larger than one
                if (axis.stack.length > 1) {
                    // another chance to find this variable
                    var stack_frame = axis.stack[axis.stack.length - 1];

                    stack_frame.arguments.forEach(function(argument, index) {
                        if (argument === variable_name) {
                            variable_value = stack_frame.argument_values[index];
                        }
                    });

                    // last chance
                    if (variable_value === undefined) {
                        errors.warning('Undefined variable \'' + variable_name + '\'');
                    }
                } else {
                    errors.warning('Undefined variable \'' + variable_name + '\'');
                }
            }

            output_buffer += variable_value;
        }

        // eat space ahead of possible concatenation
        parser.eat_space();

        // concatenation
        if (src[char] === '.') {
            ++char;
            output_buffer += expressions.evaluate();
        }

        // newline means missing semi colon
        if (src[char] === '\n' || src[char] === undefined) {
            errors.parse('Unterminated expression');
        }

        return output_buffer;
    }

};

var functions = {

    call: function() {
        var stack_frame = axis.stack[axis.stack.length - 1];

        // move the cursor to the latest stack frame body start
        line = stack_frame.body_line;
        char = stack_frame.body_start;

        // lex
        lexer.lex();

        // add return value to previous stack item
        axis.stack[axis.stack.length - 2].return_value =
            axis.stack[axis.stack.length - 1].return_value;

        // remove the top stack and move the cursor back
        axis.stack.pop();

        line = axis.stack[axis.stack.length - 1].line_pos;
        char = axis.stack[axis.stack.length - 1].char_pos;
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
    fn: function() {
        var func = {
            char_pos: char,
            name: '',
            arguments: [],
            body_line: 0,
            body_start: 0,
            body_end: 0
        };

        char += 2;

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

        // eat space between lparen and first argument
        parser.eat_space();

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
                if (/[^a-zA-Z_0-9]/gi.test(src[char])) {
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
            parser.eat_space();
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
        func.body_line = line;
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

        axis.symbols.functions[func.name] = func;
    },

    // if/else/elseif handling
    if: function() {
        char += 2;

        // define valid operators
        var operators = [
            '===',
            '==',
            '!=',
            '!==',
            '<=',
            '>='
        ];

        // eat space from if to comparison
        parser.eat_space();

        // evaluate the first condition
        var value1 = expressions.evaluate();

        // eat space between first condition and operator
        parser.eat_space();

        // extract the operator in use
        var operator =
            new RegExp('^([=!<>]{2,3})')
                .exec(src.slice(char))[0];

        // if the operator is null or not part of the defined operators, error
        if (operator == null || operators.indexOf(operator) == -1) {
            errors.parse('Strange comparison operator detected');
        }

        // push past operator
        char += operator.length;

        // eat space from operator to second condition
        parser.eat_space();

        // evalute the second condition
        var value2 = expressions.evaluate();

        // eat space between the second condition and if block lcurly
        parser.eat_space();

        // check to make sure that character is an lcurly
        if (src[char] !== '{') {
            errors.parse('Expected { after conditional');
        }

        var result = null;

        // evaluate the two conditions
        switch (operator) {
            case '===':
                result = (value1 === value2);
                break;
            case '==':
                result = (value1 == value2);
                break;
            case '!=':
                result = (value1 != value2);
                break;
            case '!==':
                result = (value1 !== value2);
                break;
            case '<=':
                result = (value1 <= value2);
                break;
            case '<':
                result = (value1 < value2);
                break;
            case '>=':
                result = (value1 >= value2);
                break;
            case '>':
                result = (value1 > value2);
                break;
            default:
                errors.parse('Invalid operator');
        }

        if (result === true) {
            // lex the true block
            lexer.lex();

            // push past the rcurly
            ++char;

            // eat space between rcurly and possible else/elseif
            parser.eat_space();

            if (src.slice(char, char + 6) === 'elseif') {
                char += 6;
                // eat parens
                parser.eat_braced_block();
            } else if (src.slice(char, char + 4) === 'else') {
                char += 4;
                parser.eat_braced_block();
            }
        } else {
            // eat the true braced block
            parser.eat_braced_block();

            // eat space between rcurly and possible else/elseif
            parser.eat_space();

            if (src.slice(char, char + 6) === 'elseif') {
                char += 4;
                constructs.if();
            } else if (src.slice(char, char + 4) === 'else') {
                char += 4;

                // eat space between else and lcurly
                parser.eat_space();

                if (src[char] !== '{') {
                    errors.parse('Expected { after conditional');
                }

                // lex the false block
                lexer.lex();
            }

            // push past ending rcurly
            ++char;
        }
    },

    // return handling
    return: function() {
        char += 6;

        // set the return value of the function call
        axis.stack[axis.stack.length - 1].return_value = expressions.evaluate();

        // bypass everything to closing rcurly
        char = axis.stack[axis.stack.length - 1].body_end;
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
            if (/[^a-zA-Z_0-9]/gi.test(src[char])) {
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
        console.log('\n----');
        throw 'Axis Warn: ' + message + ' at line ' + line;
    },

    parse: function(message) {
        console.log('\n----');
        throw 'Axis Parse: ' + message + ' at line ' + line;
    },

    fatal: function(message) {
        console.log('\n----');
        throw 'Axis Fatal: ' + message + ' at line ' + line;
    },

    exit: function(message) {
        console.log('\n----');
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
    },

    eat_braced_block: function() {
        // push past the true block
        var nested_curly = 0;

        // push past lcurly
        ++char;

        for (;;) {
            // fail on endline
            if (src[char] === undefined) {
                errors.parse('Unclosed brace block');
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

        ++char;
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
                    if (src[char] === '\n' || src[char] === undefined) {
                        break;
                    }
                }

                continue;
            }

            // semi colon
            if (src[char] === ';') {
                ++char;
                continue;
            }

            // end braced area
            if (src[char] === '}') {
                return;
            }

            // reserved keyword
            var matches =
                new RegExp('^(' + this._get_reserved().join('|') + ')')
                    .exec(src.slice(char));

            // check for a matched reserved keyword
            if (matches !== null) {
                // execute the handling for that keyword
                constructs[matches[0]]();
                continue;
            }

            // function call
            if (/^[a-zA-Z_]+\s*?\(/gi.test(src.slice(char))) {
                return expressions.evaluate();
            }

            // file done
            if (src[char] === undefined) break;

            // analyze next character
            ++char;
        }
    },

    _get_reserved: function() {
        return [
            'class',
            'echo',
            'fn',
            'if',
            'return',
            'var'
        ];
    }

};

try {
    // do it
    lexer.lex();

    console.log('\n\n------', 'execution failed, read', line, 'line(s)');
    console.log('------', ((Date.now() - axis.exec_start) / 1000).toFixed(3), 'seconds');
} catch (err) {
    console.log(err.toString());
    console.log('Stack Trace:');

    if (axis.stack.length > 0) {
        for (var i = axis.stack.length; i > 0; --i) {
            if (i == axis.stack.length) {
                console.log('  -> ' + axis.stack[i - 1].name + '():' + line);
            } else if (i == 1) {
                console.log('  -> main:' + axis.stack[i - 1].line_pos);
            } else {
                console.log('  -> ' + axis.stack[i - 1].name + '():' + axis.stack[i - 1].line_pos);
            }
        }
    } else {
        console.log('  -> main:' + line);
    }
}