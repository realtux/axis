# Axis 0.1-alpha
Axis is the fun and useless toy language written in JavaScript. Axis is a multi-paradigm, scripted, optionally object-oriented, imperative programming language. Executed with the standard Node.js CLI binary, Axis source is ultimately JIT compiled with Google's V8 Engine. By being backed by Node.js, Axis gains access to the low-level APIs provided by Node.js's core. Current benchmarks have Axis being roughly 50% slower than Node.js. The goal is to get Axis to run at 20% - 5% slower than Node.js.

Axis uses peek, read, and rewind interpretation and constructs the object model in memory until it needs to be used.

##### What does Axis look like?
```go
// new function
fn say_hello(msg) {
  if msg { // truthy/falsy conditionals
    return msg;
  } else {
    return 'hello!';
  }
}

// set a variable
var name = 'axis';

// do a conditional
if name == 'axis' {
  echo say_hello(); // argument optional
}
```

## Change Log

#### v0.1-alpha
- Stack traces
- Code bypass after return statement
- Return values
- Expression concatenation
- if and else constructs
- Function evaluation
- Function declaration
- Implemented a function stack
- Variable assignment
- Variable evaluation
- Output (echo) strings and integers
- Line comments
- Language boilerplate
- Let the fun begin
