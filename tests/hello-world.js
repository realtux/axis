var start = Date.now();

function another_goodbye(mone, mtwo) {
    console.log(mtwo);
    console.log(mone);
    console.log(mtwo);
}

function goodbye(msg) {
    console.log(msg);

    another_goodbye(msg, 'outer\n');
    another_goodbye(msg, 'outer\n');
    another_goodbye(msg, 'outer\n');
}

function hello(message) {
    console.log(message);
    console.log(message);
    console.log(message);
    goodbye('byebyebyebyebyebyebye\n');
    goodbye('byebyebyebyebyebyebye\n');
}

// some comment to ignore
console.log('hello asdf world\n');
console.log('hello asdf world');
console.log('hello asdf world\n');
console.log(1);
console.log(2);
// comment
console.log(3);
console.log(789);
var variable = 'brian\n';
console.log(variable);
console.log('end\n');
hello('im awesome\n');
hello('im awesomer\n');
hello('im awesomer\n');
hello('im awesomer\n');
// comment
console.log('mo money');

console.log('exe', ((Date.now() - start) / 1000).toFixed(3), 'seconds');