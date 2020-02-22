let C = require('craftyjs');

let W = 800, H = 480;
let I = { x: 100, y: 360 };

// player gravity speed jump strength, jump width, jump height
// jumps should be mathematically determined if possible
let G = 1 * 2500, S = 6 * 50, J = 17 * 50, J_W = 234, J_H = 170;
// player sprite w/h
let P = { w: 20, h: 20 };
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
    Clog(targetStr, ':', convertStr(targetStr));
    return convertStr(targetStr);
}

function randomInt(min, max) {
    // returns random int between min & max, both inclusive
    return Math.floor(Math.random() * (max - min + 1)) + min;
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
    // each new block is placed somewhere after (pox.x,pos.y)
    // withing a limited distance
    let h = 40, dot_w = 120, dash_w = 240;
    let pos = { x: W/2, y: 360 };
    for (i=0; i < morseMap.length; i++) {
        let step_x = randomInt(60, J_W);
        let step_y = randomInt(pos.y + h, pos.y - J_H + P.h);
        let attr = {x: pos.x + step_x, y: step_y+h, w: 0, h: h, name: ''};
        let m = morseMap[i];
        if (m in [0, 1]) {
            attr.w = (m === 0) ? dot_w : dash_w;
            attr.name += (m === 0) ? 'Dot' : 'Dash';
        } else {
            attr.x = pos.x;
            attr.y = pos.y;
            attr.w = 0;
            attr.name = (m < 0) ? 'Word' : 'Space';
        }
        C.e('2D, Canvas, Color, ' + attr.name)
            .color('blue')
            .attr({...attr});
        pos.x = attr.x + attr.w;
        pos.y = attr.y;
    }
    C.e('2D, Canvas, Color, Final, Floor')
        .color('goldenrod')
        .attr({x: pos.x + 60, y: pos.y, w: W, h: 60});
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
    // make map static, move generation into start scene with persistence
    msg = getUrlHash();
    if (!validateStr(msg)) {
        msg = "hello";
    }
    generateMap(msg);

    C("Dash, Dot").each(function (e) {
        this.addComponent('Floor, Persist');
    });

    // C("Dot, Dash").addComponent('Floor');
    let player = C.e('Player, 2D, Canvas, Color, Twoway, Gravity')
        .attr({x: I.x, y: I.y, w: P.w, h: P.h})
        .color("#ff0000")
        .gravityConst(G)
        .twoway(S, J)
        .preventGroundTunneling()
        .gravity('Floor');

    C.e('Floor, 2D, Canvas, Color')
        .attr({x: -W/2, y: H - 100, w: W, h: 20})
        .color("#40cf40");

    player.trigger('NewDirection', {x: 1, y: 1});
    player.bind('UpdateFrame', function(ev) {
        if (this.x < -50) { this.x += 20; }  // don't go off map
        if (this.y > H + 1000) { C.enterScene("redo"); }  // fall to death
    });

    // simplified smooth camera follow
    let cam = C.e('2D, Canvas, Color, Tween')
        .attr({x: player.x, y: H - 150, w: 350, h: 300})
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
    player.bind('LandedOnGround', function(ground) {
        if (ground.has('Final')) {
            Clog('finished!');
            C.enterScene('end');
        }
    })
});

// called from main and just goes back to main
// ensures no entities from main survives
C.defineScene("redo", function () {
    C('Dot, Dash').each(function (i) {
        this.destroy();
    })
    C.enterScene("main");
});

C.defineScene("end", function () {
    // TODO: make msg
    // TODO: restart with new msg
    return
});

C.enterScene("start");
