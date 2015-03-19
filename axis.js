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

var constructs = {

    echo: function() {
        char += 4;

        parser.eat_space();

        if (src[char] === '\'') {
            ++char;

            var output_buffer = '';

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

                output_buffer += src[char];
                ++char;
            }

            console.log(output_buffer);

            return;
        } else {
            errors.parse('Unexpected symbol');
        }

        console.log('hello');
    }

};

var errors = {

    warning: function(message) {
        throw new Error('\nAxis Warning:', message, 'at line', line);
    },

    parse: function(message) {
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
            if (src.slice(char).match(/\/\//)) {
                for (;;) {
                    ++char;
                    if (src[char] === '\n') {
                        ++char;
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
            }

            // file done
            if (src[char] === undefined) break;

            // analyze next character
            ++char;
        }

        console.log('Execution complete, read', ++line, 'line(s)');
    },

    _get_reserved: function() {
        return [
            'echo'
        ];
    }

};

try {
    lexer.lex();
} catch (err) {
    console.log(err.toString());
}