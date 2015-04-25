//
// axis lang, by b
//

var crypto = require('crypto');
var inspector = require('util');

// global things
axis = {
    symbols: {
        variables: {}, // global variable scope
        functions: {}, // global function scope

        objects: {}, // object definition

        object_instances: {} // instantiated versions of objects
    },
    stack: [],
    exec_start: 0
};

// contextual parameters
context = {
    current_object_lex: null
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

        // method call todo: save in re const
        if (/^[a-zA-Z_0-9]+:[a-zA-Z_0-9]+\s*?\(/gi.test(src.slice(char))) {
            // get the object name
            var extracted_variable = parser.extract_word();

            // push past the colon
            ++char;

            // get the object method
            var extracted_method = parser.extract_word();

            // check to make sure the variable exists
            if (axis.symbols.variables[extracted_variable] === undefined) {
                errors.fatal('Undefined variable \'' + extracted_variable + '\'')
            }

            var object_sum = axis.symbols
                .variables[extracted_variable]
                .slice(4);

            var object_instance = axis.symbols.object_instances[object_sum];

            if (object_instance === undefined) {
                errors.fatal(extracted_variable + ' not an object instance');
            }

            var object_definition = axis.symbols.objects[object_instance.name];

            // add the stack frame
            var frame_function = axis.symbols.objects[object_instance.name].methods[extracted_method];

            // check if method exists
            if (frame_function === undefined) {
                errors.fatal('Method \'' + extracted_method + '\' in object \'' +object_instance.name + '\' does not exist')
            }

            // push past lparen
            ++char;

            // remove space between lparen and first argument
            parser.eat_space();

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

            // add the argument values
            frame_function.argument_values = argument_values;

            // add the object sum that contains the method currently being called
            frame_function.containing_instance = object_sum;

            axis.stack.push(frame_function);

            functions.call();

            var return_value = axis.stack[axis.stack.length - 1].return_value;

            if (return_value !== undefined) {
                output_buffer += return_value;
            }

            // push past rparen
            ++char;
        }

        // function
        if (/^[a-zA-Z_]+\s*?\(/gi.test(src.slice(char))) {
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
                errors.stack(axis);
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

            var return_value = axis.stack[axis.stack.length - 1].return_value;

            if (return_value !== undefined) {
                output_buffer += return_value;
            }

            // push past rparen
            ++char;
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

        // object instantiation
        if (src[char] === '+') {
            ++char;

            // eat space between plus and class
            parser.eat_space();

            var object_name = parser.extract_word();

            // check to make sure there was an object name provided
            if (!object_name) {
                errors.parse('No object name specified');
            }

            var arguments = functions.arguments();

            if (arguments.length > 0) {
                // todo: constructor argument handling
            }

            var original_object_sum = '';

            var generate_object_instance = function(childsum) {
                // check to make sure this class exists
                if (axis.symbols.objects[object_name] === undefined) {
                    errors.fatal('Object \'' + object_name + '\' not defined');
                }

                var object_definition = axis.symbols.objects[object_name];

                var properties = {};

                Object.keys(object_definition.properties)
                    .forEach(function(prop) {
                        // todo: change once default properties exist
                        properties[prop] = null;
                    });

                var objectsum = crypto
                    .createHash('sha1')
                    .update(Math.random() + new Date() + Date.now() / 2)
                    .digest('hex');

                if (!original_object_sum) {
                    original_object_sum = objectsum;
                }

                if (childsum) {
                    axis.symbols.object_instances[childsum].parent_sum = objectsum;
                }

                axis.symbols.object_instances[objectsum] = {
                    name: object_name,
                    parent: object_definition.extends,
                    properties: properties
                };

                if (object_definition.extends) {
                    object_name = object_definition.extends;
                    generate_object_instance(objectsum);
                }
            };

            generate_object_instance();

            output_buffer = 'obj:' + original_object_sum;

            // todo: run constructor logic
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

var objects = {

    evaluate_property: function(scope_type) {
        // evaluate the property name
        var property_name = '';

        for (;;) {
            // fail on newline or endline
            if (src[char] === '\n' || src[char] === undefined) {
                errors.parse('Unterminated object property definition');
            }

            // break
            if (/[^a-zA-Z_0-9]/gi.test(src[char])) {
                break;
            }

            // append char to variable name
            property_name += src[char];
            ++char;
        }

        parser.eat_space();

        if (src[char] !== ';') {
            errors.parse('Expecting end of property definition semicolon');
        }

        axis.symbols.objects[context.current_object_lex]
            .properties[property_name] = {

            scope: scope_type,
            name: property_name,
            value: null
        };
    },

    evaluate_method: function(scope_type) {
        // method template
        var method = {
            scope: scope_type,
            char_pos: char,
            name: null,
            arguments: [],
            body_line: 0,
            body_start: 0,
            body_end: 0
        };

        // evaluate the method name
        var method_name = '';

        for (;;) {
            // fail on newline or endline
            if (src[char] === '\n' || src[char] === undefined) {
                errors.parse('Unterminated object method definition');
            }

            // break
            if (/[^a-zA-Z_0-9]/gi.test(src[char])) {
                break;
            }

            // append char to variable name
            method_name += src[char];
            ++char;
        }

        method.name = method_name;

        // eat space between method name and lparen
        parser.eat_space();

        functions.evaluate(method_name, scope_type);
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
    },

    // evaluates from () to }
    evaluate: function(function_name, scope_type) {
        var func = {
            scope: scope_type || 'pub',
            char_pos: char,
            name: function_name,
            arguments: [],
            body_line: 0,
            body_start: 0,
            body_end: 0
        };

        func.arguments = functions.arguments();

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

        // todo: merge this in with eat_space()
        for (;;) {
            if (src[char] === '\n') {
                ++char;
                ++line;
            }

            if (src[char] !== '\n') {
                break;
            }
        }

        if (context.current_object_lex) {
            // add to current class being parsed
            axis.symbols.objects[context.current_object_lex].methods[func.name] = func;
        } else {
            // add to global scope of functions
            axis.symbols.functions[func.name] = func;
        }
    },

    // reads from ( to ) ex. (n1) or (n1,n2,n3), returns array
    arguments: function() {
        var final_arguments = [];

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
                parser.eat_space();

                // fail on newline or endline
                if (src[char] === '\n' || src[char] === undefined) {
                    errors.parse('Improper argument declaration');
                }

                if (src[char])

                // break on non alpha+_ character
                if (/[^a-zA-Z_0-9]/gi.test(src[char])) {
                    break;
                }

                // add the character to the current argument
                current_argument += src[char];
                ++char;
            }

            // argument iteration complete, push argument into func definition
            if (current_argument) {
                final_arguments.push(current_argument);
            }

            // no comma means no more argument, break out
            if (src[char] !== ',') {
                break;
            }

            ++char;
        }

        // eat space between last argument and rparen
        parser.eat_space();

        // verify next character is an rparen
        if (src[char] !== ')') {
            errors.parse('Expecting right parenthesis');
        }

        // push past rparen
        ++char;

        return final_arguments;
    }

};

var constructs = {

    // objects (class)
    class: function() {
        char += 5;

        parser.eat_space();

        var object = {
            char_pos: char,
            name: '',
            arguments: [],
            body_line: 0,
            body_start: 0,
            body_end: 0
        };

        for (;;) {
            // fail on newline or endline
            if (src[char] === '\n' || src[char] === undefined) {
                errors.parse('Improper class declaration');
            }

            // break
            if (/[^a-zA-Z]/gi.test(src[char])) {
                parser.eat_space();

                // check for "->" to symbolize extends
                if (src.slice(char, char + 2) === '->') {
                    char += 2;

                    // eat space between -> and extended class
                    parser.eat_space();

                    var extending_class = '';

                    for (;;) {
                        // fail on newline or endline
                        if (src[char] === '\n' || src[char] === undefined) {
                            errors.parse('Improper class declaration');
                        }

                        if (/[^a-zA-Z]/gi.test(src[char])) {
                            parser.eat_space();

                            break;
                        }

                        extending_class += src[char];
                        ++char;
                    }

                    // check symbol table for a matching class
                    if (axis.symbols.objects[extending_class] === undefined) {
                        errors.fatal('Undefined class \'' + extending_class + '\'');
                    }
                }

                if (src[char] !== '{') {
                    errors.parse('Unexpected symbol in class declaration');
                }

                break;
            }

            object.name += src[char];
            ++char;
        }

        // eat space between class name and lcurly
        parser.eat_space();

        // push past lcurly
        ++char;

        context.current_object_lex = object.name;

        axis.symbols.objects[object.name] = {
            extends: extending_class || null,
            implements: [],
            properties: {},
            methods: {}
        };

        lexer.object_lex();

        // push past rcurly
        ++char;

        context.current_object_lex = null;
    },

    // constructor
    constructor: function() {
        char += 1;

        functions.evaluate('_constructor');
    },

    // destructor
    destructor: function() {
        char += 1;

        functions.evaluate('_destructor');
    },

    // pub/pri/pro
    scope: function(scope_type) {
        char += 3;

        // eat up space between scope keyword and property/function name
        parser.eat_space();

        if (src[char] + src[char + 1] === 'fn') {
            char += 2;

            // eat space space between fn and method name
            parser.eat_space();

            if (/^[a-zA-Z_]+\s*?\(/gi.test(src.slice(char))) {
                // definitely a method
                objects.evaluate_method(scope_type);
            } else {
                errors.parse('Improper function declaration');
            }
        } else {
            // is a property
            objects.evaluate_property(scope_type);
        }
    },

    // generic output
    echo: function() {
        char += 4;

        parser.eat_space();

        process.stdout.write(expressions.evaluate());
    },

    // function declaration
    fn: function() {
        char += 2;

        parser.eat_space();

        var function_name = '';

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

            function_name += src[char];
            ++char;
        }

        functions.evaluate(function_name);
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

    this: function() {
        char += 4;

        if (src[char] !== ':') {
            errors.parse('Expected \':\' after \'this\'');
        }

        // push past colon
        ++char;

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

        if (src[char] === '(') {

        } else if (src[char] !== '=') {
            errors.parse('Expected =');
        }

        ++char;

        parser.eat_space();
        //errors.stack(axis);
        axis.symbols.object_instances[axis.stack[axis.stack.length - 1].containing_instance].properties[variable_name] =
            expressions.evaluate();
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
    },

    stack: function(obj) {
        console.log(inspector.inspect(obj, false, null));
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

    eat_comment: function() {
        // loop over each character in the comment
        for (;;) {
            ++char;

            // newline or end of the file, call it good
            if (src[char] === '\n' || src[char] === undefined) {
                break;
            }
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
    },

    extract_word: function() {
        var word_buffer = '';

        for (;;) {
            if (src[char] === '\n' || src[char] === undefined) {
                errors.parse('Error extracting word');
            }

            // break
            if (/[^a-zA-Z_0-9]+/gi.test(src[char])) {
                break;
            }

            word_buffer += src[char];
            ++char;
        }

        return word_buffer;
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
                parser.eat_comment();
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

            // method call
            if (/^[a-zA-Z_0-9]+:[a-zA-Z_0-9]+\s*?\(/gi.test(src.slice(char))) {
                expressions.evaluate();
            }

            // function call
            if (/^[a-zA-Z_0-9]+\s*?\(/gi.test(src.slice(char))) {
                expressions.evaluate();
            }

            // file done
            if (src[char] === undefined) break;

            // analyze next character
            ++char;
        }
    },

    /**
     * only stuff that should show up in an object are
     * +() = the constructor
     * -() = the destructor
     * pub/pro/pri properties
     * pub/pro/pri methods
     *
     * anything else should show an axis fatal
     */
    object_lex: function() {
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
                parser.eat_comment();
                continue;
            }

            // semi colon
            if (src[char] === ';') {
                ++char;
                continue;
            }

            // constructor declaration
            if (/\+\(\)/gi.test(src.slice(char, char + 3))) {
                constructs.constructor();
            }

            // destructor declartion
            if (/\-\(\)/gi.test(src.slice(char, char + 3))) {
                constructs.destructor();
            }

            // reserved object keyword
            var matches =
                new RegExp('^(' + this._get_object_reserved().join('|') + ')')
                    .exec(src.slice(char));

            // check for a matched object reserved keyword
            if (matches !== null) {
                var match = matches[0];

                if (match === 'pub' || match === 'pro' || match === 'pri') {
                    constructs.scope(match);
                    continue;
                }

                // execute the handling for that keyword
                constructs[match]();
                continue;
            }

            // method definition
            if (/^[a-zA-Z_]+\s*?\(/gi.test(src.slice(char))) {
                // not sure yet
            }

            // object done
            if (src[char] === '}') {
                // we out
                break;
            }

            // analyze next character
            ++char;
        }
    },

    _get_reserved: function() {
        return [
            'class',  // objects
            'echo',   // output
            'fn',     // generic functions
            'if',     // conditionals
            'return', // method returns
            'this',   // this reference
            'var'     // variable assignment
        ];
    },

    _get_object_reserved: function() {
        return [
            'pub', // public properties/methods
            'pro', // protected properties/methods
            'pri'  // private properties/methods
        ];
    }

};

try {
    // do it
    lexer.lex();

    console.log(inspector.inspect(axis, false, null));
    console.log('\n\n------', 'execution succeeded, read', line, 'line(s)');
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