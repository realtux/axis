<?php

function microtime_float()
{
    list($usec, $sec) = explode(" ", microtime());
    return ((float)$usec + (float)$sec);
}

$time_start = microtime_float();

function another_goodbye($mone, $mtwo) {
    echo $mone;
    echo $mtwo;
    echo $mone;
}

function goodbye($msg) {
    echo $msg;

    another_goodbye($msg, "outer\n");
    another_goodbye($msg, "outer\n");
    another_goodbye($msg, "outer\n");
}

function hello($message) {
    echo $message;
    echo $message;
    echo $message;
    goodbye("byebyebyebyebyebyebye\n");
    goodbye("byebyebyebyebyebyebye\n");
}

// some comment to ignore
echo "hello asdf world\n";
echo "hello asdf world";
echo "hello asdf world\n";
echo 1;
echo 2;
// comment
echo 3;
echo 789;
$variable = "brian\n";
echo $variable;
echo "end\n";
hello("im awesome\n");
hello("im awesomer\n");
hello("im awesomer\n");
hello("im awesomer\n");
// comment
echo "mo money";

$time_end = microtime_float();
$time = $time_end - $time_start;

echo number_format($time, 3) . PHP_EOL;