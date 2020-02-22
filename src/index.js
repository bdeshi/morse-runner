let C = require('craftyjs');

C.loggingEnabled = true;
C.init(800, 480);
C.background('#FFF');
C.paths({audio: 'assets/audio/', images: 'assets/images/'});
let Clog = C.log;

let assets = {
    // see `http://craftyjs.com/api/Crafty-load.html
};

let morse = {
    'a': '.-',    'b': '-...',  'c': '-.-.', 'd': '-..',
    'e': '.',     'f': '..-.',  'g': '--.',  'h': '....',
    'i': '..',    'j': '.---',  'k': '-.-',  'l': '.-..',
    'm': '--',    'n': '-.',    'o': '---',  'p': '.--.',
    'q': '--.-',  'r': '.-.',   's': '...',  't': '-',
    'u': '..-',   'v': '...-',  'w': '.--',  'x': '-..-',
    'y': '-.--',  'z': '--..',  ' ': '/',
    '1': '.----', '2': '..---', '3': '...--', '4': '....-',
    '5': '.....', '6': '-....', '7': '--...', '8': '---..',
    '9': '----.', '0': '-----',
}

function convertStr(str) {
    let out = "";
    for (n in str) {
        out += String.fromCharCode(str.charCodeAt(n)^1);
    }
    return out;
}

function validateStr(str) {
    for (i = 0; i < str.length; i++) {
        if (!morse.hasOwnProperty(str[i])) {
            return false;
        }
    }
    return true;
}

function getUrlHash() {
    let defaultStr = convertStr("hello");
    let targetStr = decodeURIComponent(window.location.hash.substring(1));
    targetStr = targetStr.toLowerCase();
    if (targetStr.length == 0) {
        targetStr = defaultStr;
    }
    return convertStr(targetStr);
}

function generateMap(msg) {
    // morseMap: 0: ., 1: -, 2: /, -1: end of a character
    var morseMap = [];
    [...msg].forEach(function (c) {
        [...morse[c]].forEach(function (s) {
            let t = (s==='.') ? 0 : (s==='-') ? 1 : 2;
            morseMap.push(t);
        });
        morseMap.push(-1);
    });
    Clog('morse map: ' + morseMap);
    // TODO: generate map
    return morseMap;
}

C.defineScene("loading", function () {
    // Crafty.background("#555");
    C.e("2D, Canvas, Text, LoadingText")
        .attr({x: C.viewport.width / 2, y: C.viewport.height / 2})
        .text("loading")
        .textAlign("center")
        .textColor("white");
    C.load(assets,
        function () {
            C.enterScene('main');
        },
        function (stat) {
            C('LoadingText').text(`loaded ${stat.loaded}/${stat.total}`);
        }
    );
});


C.defineScene("main", function () {
    msg = getUrlHash();
    if (!validateStr(msg)) {
        msg = "hello";
    }
    generateMap(msg);
    C.e('Player, 2D, Canvas, Color, Twoway, Gravity')
        .attr({x: C.viewport.width / 2, y: C.viewport.height / 2, w: 20, h: 20})
        .color("#ff0000")
        .twoway(200)
        .gravity('Floor');
    C.e('Floor, 2D, Canvas, Color')
        .attr({x: 0, y: C.viewport.height - 20, w: C.viewport.width, h: 20})
        .color("#40cf40");
    let player = C('Player');
    player.bind('UpdateFrame', function(ev) {
        if (this.x < 0) {
            this.x = 0;
        }
    });
    C.viewport.clampToEntities = false;
    C.viewport.follow(player, -200, 100);
    // TODO: mouse control
    // TODO: faster movement
    // TODO: better camera
    // TODO: obstacles
    // TODO: graphics
});

C.defineScene("end", function () {
    // TODO: make msg
    // TODO: restart with new msg
    return
});

C.enterScene("loading");
