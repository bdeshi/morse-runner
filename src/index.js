let C = require('craftyjs');

let W = 800, H = 480;
C.init(W, H);
C.background('#FFF');
C.paths({audio: 'assets/audio/', images: 'assets/images/'});
C.loggingEnabled = true;
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
    if (str.length == 0) {
        return false;
    }
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
    // TODO: blocks distance must be within jump width
    let pos = 0;
    for (i=0; i < morseMap.length; i++) {

    }
    return morseMap;

}

C.defineScene("start", function () {
    // TODO: show splash screen
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
    // TODO: obstacles
    // TODO: graphics
    // TODO: mouse control
    msg = getUrlHash();
    if (!validateStr(msg)) {
        msg = "hello";
    }
    generateMap(msg);

    let player = C.e('Player, 2D, Canvas, Color, Twoway, Gravity')
        .attr({x: W/4, y: 0, w: 20, h: 20})
        .color("#ff0000")
        .gravityConst(1 * 2500)
        .twoway(6 * 50, 17 * 50)
        .preventGroundTunneling()
        .gravity('Floor');

    C.e('Floor, 2D, Canvas, Color')
        .attr({x: -W/2, y: H - 100, w: W, h: 20})
        .color("#40cf40");
    C.e('Floor, 2D, Canvas, Color')
        .attr({x: W/2 + 220, y: H - 100, w: W, h: 20})
        .color("#40cf40");

    player.trigger('NewDirection', {x: 1, y: 1});
    player.bind('UpdateFrame', function(ev) {
        if (this.x < -50) { this.x += 20; }  // don't go off map
        if (this.y > H + 100) { C.enterScene("gotoMain"); }  // fall to death
    });

    // simplified smooth camera follow
    let cam = C.e('2D, Canvas, Color, Tween')
        .attr({x: player.x, y: H - 150, w: 350, h: 100})
        .color("#000000", 0.0);
    C.viewport.clampToEntities = false;
    cam.bind('UpdateFrame', function () {
        C.viewport.centerOn(this, 250);
    })
    player.bind('NewDirection', function (dir) {
        this.last_dir_x = this.dir_x || -1;
        this.dir_x = dir.x;
        this.last_dir_y = this.dir_y || -1;
        this.dir_y = dir.y;
    });
    player.bind('UpdateFrame', function (ev) {
        let x = cam.x, y = cam.y;
        if (this.y < cam.y) { y = this.y }
        else if (this.y > cam.y+cam.h-this.h) { y = this.y-cam.h+this.h }
        if (player.dir_x == 1) { x = this.x }
        else if (player.dir_x == -1) { x = this.x + this.w - cam.w }
        cam.attr({x: x, y: y});
    });
});

// called from main and just goes back to main
// ensures no entities from main survives
C.defineScene("gotoMain", function () {
    C.enterScene("main");
});

C.defineScene("end", function () {
    // TODO: make msg
    // TODO: restart with new msg
    return
});

C.enterScene("start");
