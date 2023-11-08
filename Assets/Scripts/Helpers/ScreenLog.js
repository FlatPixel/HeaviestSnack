
// @input Component.Text screenText

const PRINT_LOGGING = false;
const WARNING_LOGGING = false;

script.logLines = [];
const MAX_LINES = 20;

function screenLog(textLine) {
    while (script.logLines.length > MAX_LINES) {
        script.logLines.shift();
    }
    
    script.logLines.push(textLine);
    
    var str = "";
    for (var i = 0; i < script.logLines.length; i++) {
        str = str + script.logLines[i] + "\n";
    }
    
    script.screenText.text = str;
    print(textLine);
}

function log(message, obj) {
    if (!PRINT_LOGGING) {
        return;
    }
    var txt = "" + message;
    if (obj) {
        txt += JSON.stringify(obj);
    }
    print(txt);
}

function showWarning(message, obj) {
    var txt = message;
    if (obj) {
        txt += JSON.stringify(obj);
    }
    if (!WARNING_LOGGING) {
        print(txt);
        return;
    }
    screenLog(txt);
}

global.log = log;
global.showWarning = showWarning;
global.screenLog = screenLog;