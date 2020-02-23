// little ditty
let C = require('craftyjs');
let Tone = require("tone");

// viewport size
let W = 800, H = 480;
// sprite tile default ht
let T = 70;
// player sprite w/h, will take on sprite asset dimensions
let P = { x: 100, y: 360, w: 0, h: 0 };
// player gravity speed jump strength, jump width, jump height
// TODO: magic values should be mathematically determined
let M = { G: 1 * 2500, S: 6 * 50, J: 17 * 50, J_W: 234, J_H: 170 };
// area to zoom to at the end containg all blocks
let ZRect = {}, Bottom = {}, Marker = {};
let Msg = '';
let MsgTrain = [];

C.init(W, H);
C.background('#FFF');
C.loggingEnabled = true;
let Clog = C.log;

let assets = {
    // see `http://craftyjs.com/api/Crafty-load.html
    "audio": {
        "tone1": ["tone1.wav"]
    },
    "images": [
        "alienGreen_badge1.png",
        "alienGreen_stand.png",
        "backgroundCastles.png",
        "backgroundColorForest.png",
        "backgroundColorGrass.png",
        "backgroundDesert.png",
        "bush1.png",
        "bush2.png",
        "bush3.png",
        "bush4.png",
        "bushAlt2.png",
        "bushAlt3.png",
        "bushAlt4.png",
        "bushOrange1.png",
        "bushOrange2.png",
        "bushOrange3.png",
        "bushOrange4.png",
        "cloud1.png",
        "cloud2.png",
        "cloud3.png",
        "cloud4.png",
        "cloud5.png",
        "cloud6.png",
        "cloud7.png",
        "cloud8.png",
        "coinGold.png",
        "fence.png",
        "flagRed.png",
        "flagRed2.png",
        "gemYellow.png",
        "grass.png",
        "grassHalf.png",
        "grassHalfLeft.png",
        "grassHalfMid.png",
        "grassHalfRight.png",
        "grassLeft.png",
        "grassMid.png",
        "grassRight.png",
        "keyGreen.png",
        "ladder_mid.png",
        "ladder_top.png",
        "lock_yellow.png",
        "moon.png",
        "moonFull.png",
        "p1_spritesheet.png",
        "signRight.png",
        "star.png",
        "sun.png"
    ],
    "sprites": {

    }
};

function beep(freq=440) {

}

function setupAssets() {
    C.sprite(66, 92, "alienGreen_stand.png", {player_idle: [0, 0]});
    // C.sprite(66, 92, "p1_spritesheet.png", { player_idle: [0,0, 66, 92]});
    C.sprite("signRight.png", {sign: [0, 0, T, T]});
    C.sprite("grass.png", {grass: [0, 0, T, T]});
    C.sprite("grassLeft.png", {grassLeft: [0, 0, T, T]});
    C.sprite("grassMid.png", {grassMid: [0, 0, T, T]});
    C.sprite("grassRight.png", {grassRight: [0, 0, T, T]});
}

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
    // let defaultStr = "h!mnwd!xnt";
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

function makeMap() {
    // morseMap: 0: ., 1: -, 2: /, -1: end of a character
    var morseMap = [];
    [...Msg].forEach(function (c) {
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
    let h = T, w = T;
    let pos = { x: W/2, y: P.y };
    for (i=0; i < morseMap.length; i++) {
        let attr = {x: 0, y: 0, w: 0, h: 0};
        let m = morseMap[i];
        if (!(m in [0, 1])) {
            // roll back positioning
            attr.x = pos.x;
            attr.y = pos.y;
            attr.w = 2;
            attr.h = 2;
            let name = (m < 0) ? 'Word' : 'Space';
            let block = C.e('2D, Canvas, Block, Persist, Color, ' + name)
                .color('green')
                .attr({...attr});
        } else {
            let next_x = C.math.randomInt(M.J_W/2, M.J_W);
            let next_y = C.math.randomInt(pos.y - M.J_H + P.h, pos.y - M.J_H/3);
            attr.x = pos.x + next_x;
            attr.y = next_y;
            attr.w = T;
            attr.h = T;
            let block = C.e('2D, Canvas, Floor, Block, Persist')
                .attr({...attr});
            // dot
            if (m == 0) {
                block.addComponent('Dot, grass');
            // dash set
            } else {
                block.addComponent('Dash, grassRight');
                let mid = C.e('2D, Canvas, Floor, Persist, Block, grassMid')
                    .attr({...attr});
                let end = C.e('2D, Canvas, Floor, Persist, Block, grassLeft')
                    .attr({...attr});
                block.x += T*2;
                mid.x   += T*1;
                end.x   += T*0;
                attr.w = T*3;
            }
        }
        pos.x = attr.x + attr.w;
        pos.y = attr.y;
    }

    // position final area
    C.e('2D, Canvas, Color, Persist, Final, Floor')
        .color('goldenrod')
        .attr({x: pos.x + 60, y: pos.y, w: W, h: 60});

    // make markers
    // encompass location of all dots and dashes
    Bottom = { x: W, y: H, w: 0, h: 2 };
    ZRect = { x: W, y: H, w: 0, h: 0, y_init: null };
    C("Block").each(function (i) {
        Bottom.x = Math.min(Bottom.x, this.x);
        Bottom.w = Math.max(Bottom.w, this.x + this.w) - Bottom.x;
        ZRect.x = Math.min(ZRect.x, this.x);
        ZRect.y = Math.min(ZRect.y, this.y);
        ZRect.w = Math.max(ZRect.w, this.x + this.w) - ZRect.x;
        ZRect.y_init = ZRect.y_init || (this.y+this.h);
        ZRect.h = Math.abs(ZRect.y-ZRect.y_init);
    });
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
            setupAssets();
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
    // TEST: make map static, move generation into start scene with persistence
    let player = C.e('Player, 2D, Canvas, Twoway, Gravity, GroundAttacher, SpriteAnimation, player_idle')
        .attr({ x: P.x, y: P.y })
        .gravityConst(M.G)
        .twoway(M.S, M.J)
        // .preventGroundTunneling()
        .gravity('Floor');
    P.w = player.w;
    P.h = player.h;

    let startFloor = C.e('Floor, 2D, Canvas, Color')
      .attr({x: -W/2, y: H - 100, w: W, h: 20})
      .color("#40cf40");
    C.e('2D, Canvas, sign').attr({x: -160, y: startFloor.y-T});
    Msg = getUrlHash();
    if (!validateStr(Msg)) {
        Msg = "hello";
    }
    makeMap();

    player.bind('UpdateFrame', function(ev) {
        if (this.x < -50) { this.x += 10; }  // don't go off map
        if (this.y > H + 500) { C.enterScene("redo"); }  // reset scene on fall
    });
    player.trigger('NewDirection', {x: 1, y: 1});
    player.bind('NewDirection', function (dir) {
        // TODO: animate
        // y: 1 down, x: 1 right
        this.last_dir_x = this.dir_x || -1;
        this.dir_x = dir.x;
        this.last_dir_y = this.dir_y || -1;
        this.dir_y = dir.y;
        if (this.dir_x == -1) { this.flip() }
        else if (this.dir_x == 1) { this.unflip() }
    });

    // simplified smooth camera follow
    let cam = C.e('2D')
        .attr({x: player.x, y: H - 150, w: 350, h: 100});
    C.viewport.clampToEntities = false;
    cam.bind('UpdateFrame', function () {
        C.viewport.centerOn(this, 250);
    })
    player.bind('UpdateFrame', function (ev) {
        let x = cam.x, y = cam.y;
        // if (player.dir_y == 1) { y = this.y }
        y = this.y + this.h - cam.h/2;
        if (player.dir_x == 1) { x = this.x }
        else if (player.dir_x == -1) { x = this.x + this.w - cam.w }
        cam.attr({x: x, y: y});
    });

    player.bind('LandedOnGround', function(ground) {
        if (ground.has('Final')) {
            Clog('finished!');
            V = { x: C.viewport.x, y: C.viewport.y };
            // C.enterScene('endScene');
            C.enterScene('fadeToEnd');
        }
    })
});

// called from main and just goes back to main
// ensures no entities from main survives
C.defineScene("redo", function () {
    C('Persist').each(function (i) {
        this.destroy();
    })
    C.enterScene("main");
});

C.defineScene("fadeToEnd", function () {
    // TODO: make msg
    // TODO: restart with new msg
    C.viewport.x = V.x;
    C.viewport.y = V.y;
    let FinalObjs = C('Final');
    FinalObjs.each(function (e) {
        if (this.has('2D')) { this.addComponent('Tween') };
    this.tween({alpha: 0}, 500);
    });
    C.e('Delay').delay(function () {
        C('Final').each(function (i) {
            this.destroy();
        });
        C.enterScene('end');
    }, 500);
});

C.defineScene("end", function () {
    C.viewport.x = V.x;
    C.viewport.y = V.y;
    let bottom = C.e('2D, Canvas, Bottom, Color')
        .attr({...Bottom})
        .color("#de0000");
    let marker = C.e('2D, Canvas, Color, Collision, Tween')
        .attr({x: Bottom.x, y: Bottom.y-T, w: 1, h: T*2})
        .color("#de0000");
    let zrect = C.e('2D, Canvas, Color, ZRect')
        .color('black', 0.2)
        .attr({...ZRect});
    C('Block').each(function (i) {
        this.addComponent('Gravity');
        this.gravityConst(M.G/2).gravity('Bottom');
    });
    // create colliders
    C('Dot, Dash').each(function (i) {
        let collider = C.e('2D, Canvas, Collision, Color, Collider')
            .attr({y: Bottom.y - 16, h: 16})
            .color("red");
        if (this.has('Dot')) {
            collider.addComponent('Dot')
            collider.x = this.x;
            collider.w = this.w;
        } else {
            collider.addComponent('Dash')
            collider.x = this.x-(T*2);
            collider.w = T*3;
        }
    })

    marker.characterCounter = 0;
    zrect.y = Bottom.y - ZRect.h;
    let zoom_factor = Math.min(C.viewport.width/(zrect.w+60),
                               C.viewport.height/(zrect.h+60));
    zoom_factor = (zoom_factor > 1) ? 1: zoom_factor;
    let zoom_time = 2000;
    C.viewport.zoom(zoom_factor, zrect.x+zrect.w/2, zrect.y+zrect.h/2, zoom_time);
    function postZoom () {
        // zoom in close to marker and follow
        // C.viewport.follow(marker);
        let inputArea = document.getElementById('inputArea');
        inputArea.style.display = 'block';
        inputArea.style.width = C.viewport.width + 'px';
        inputArea.style.marginTop = 20 + 'px';
        var osc = new Tone.Oscillator(440, "sine").toMaster();
        marker.onHit('Collider', function (hit, first) {
            if (first) {
                osc.start();
            }
        }, function () {
            osc.stop();
        });
        marker.tween({x: zrect.x+zrect.w+20}, (zrect.w/T)*100);
    }
    C.e('Delay').delay(postZoom, zoom_time);
});

// kick off
C.enterScene("start");
