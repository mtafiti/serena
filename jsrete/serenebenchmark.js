var profiler = require('v8-profiler');
var exec = require('child_process').exec;


//
var profilerHandle = null;
var DEFAULT_RATE = 1000;
// command to read process consumed memory and cpu time
var getCpuCommand = "ps -p " + process.pid + " -o %cpu,%mem | grep " + process.pid;

var users = 0;
var countReceived = 0;
var countSended = 0;

function roundNumber(num, precision) {
    return parseFloat(Math.round(num * Math.pow(10, precision)) / Math.pow(10, precision));
}

function startProfiler(opts) {
    if (!opts){
        opts = { file: null, rate: DEFAULT_RATE };
    }
    profilerHandle = setInterval(function() {
        var auxReceived = roundNumber(countReceived / users, 1)
        var msuReceived = (users > 0 ? auxReceived : 0);

        var auxSended = roundNumber(countSended / users, 1)
        var msuSended = (users > 0 ? auxSended : 0);

        // call a system command (ps) to get current process resources utilization
        var child = exec(getCpuCommand, function(error, stdout, stderr) {
            var s = stdout.split(/\s+/);
            var cpu = s[2];
            var memory = s[3];

            var l = [
                'U: ' + users,
                'MR/S: ' + countReceived,
                'MS/S: ' + countSended,
                'MR/S/U: ' + msuReceived,
                'MS/S/U: ' + msuSended,
                'CPU: ' + cpu,
                'Mem: ' + memory
            ];

            if (opts.file){
                fs.appendFile(opts.file, l.join(',\t'), function (err) {
                    console.error(err);
                });
            } else {
                console.log(l.join(',\t'));
            }
            countReceived = 0;
            countSended = 0;
        });

    }, opts.rate);

}

function stopProfiler(){
    if (profilerHandle){
        clearInterval(profilerHandle);
    }
}

exports.incuser = function () { users++ };
exports.decuser = function () { users++ };

exports.start = startProfiler;

exports.stop = stopProfiler;
