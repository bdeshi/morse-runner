// little ditty
let C = require('craftyjs');
let Tone = require("tone");
let Osc = new Tone.Oscillator(440, "sine").toMaster();

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

let Freeze = false;
C.init(W, H);
C.background('#FFF');
C.loggingEnabled = true;
let Clog = C.log;

let assets = {
    // see `http://craftyjs.com/api/Crafty-load.html
    "audio": {
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
        "signRight.png",
        "star.png",
        "sun.png"
    ],
    "sprites": {
        "player_spritesheet.png": {
            tile: 66,
            tileh: 92,
            map: {
                "player_idle": [0, 0]
            }
        }
    }
};

function beep(freq=440) {

}

function setupAssets() {
    // C.sprite(66, 92, "p1_spritesheet.png", { player_idle: [0,0]});
    C.sprite(47, 47, "alienGreen_badge1.png", { player_face: [0,0]});
    C.sprite("signRight.png", {sign: [0, 0, T, T]});
    C.sprite("grass.png", {grass: [0, 0, T, T]});
    C.sprite("grassLeft.png", {grassLeft: [0, 0, T, T]});
    C.sprite("grassMid.png", {grassMid: [0, 0, T, T]});
    C.sprite("grassRight.png", {grassRight: [0, 0, T, T]});
    C.sprite(216, 139, "cloud3.png", {cloudSpace: [0, 0]});
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
    // return 1: ok, 0: too short, -1: too long, -2: bad chars
    if (str.length == 0) {
        return 0;
    }
    if (str.length > 20) {
        return -1;
    }
    for (i = 0; i < str.length; i++) {
        if (!morse.hasOwnProperty(str[i])) {
            return -2;
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

function makeMap() {
    Freeze = false;
    // morseMap: 0: ., 1: -, 2: /, -1: end of a character
    let morseMap = [];
    MsgTrain = [];
    [...Msg].forEach(function (c) {
        [...morse[c]].forEach(function (s) {
            let t = (s==='.') ? 0 : (s==='-') ? 1 : 2;
            morseMap.push(t);
            MsgTrain.push(t);
        });
        MsgTrain.push(c);
    });
    Clog('morse map: ' + MsgTrain);
    // TODO: generate map
    // TODO: blocks distance must be within jump width
    // each new block is placed somewhere after (pox.x,pos.y)
    // withing a limited distance
    let cloudPlacedLast = false;
    let h = T, w = T;
    let pos = { x: W/2, y: P.y };
    for (i=0; i < morseMap.length; i++) {
        let attr = {x: 0, y: 0, w: 0, h: 0};
        let m = morseMap[i];
        let next_x, next_y;
        if (cloudPlacedLast) {
            next_x = 134, next_y = pos.y;
        } else {
            next_x = C.math.randomInt(M.J_W/2, M.J_W);
        }
        next_y = C.math.randomInt(pos.y - M.J_H + P.h, pos.y - M.J_H/3);

        //space
        if (m === 2) {
            Clog('space!');
            attr.x = pos.x + 134;
            attr.y = pos.y;
            attr.w = 80;
            attr.h = T - 20;
            let name = 'Space';
            let block = C.e('2D, Canvas, Block, Floor, Persist, Morse, ' + name)
                .attr({...attr});
            let cloud = C.e("2D, Canvas, Persist, cloudSpace")
                .attr({x:attr.x-64, y:attr.y-40});
            block.attach(cloud);
            cloudPlacedLast = true;

        // dots & dashes
        } else {
            cloudPlacedLast = false;
            attr.x = pos.x + next_x;
            attr.y = next_y;
            attr.w = T;
            attr.h = T;
            let block = C.e('2D, Canvas, Floor, Block, Persist')
                .attr({...attr});
            // dot
            if (m == 0) {
                block.addComponent('Dot, Morse, grass');
                let chance = C.math.randomInt(0,4) > 2;
                if (chance) {
                    let randPeriod = C.math.randomInt(0,20);
                    let randDist = C.math.randomInt(-5,5);
                    block.bind('UpdateFrame', function (ev) {
                        if (!Freeze) {
                            block.y += (randDist+7) * Math.sin((randPeriod+C.frame())*0.1);
                        }
                    });
                }
            // dash set
            } else {
                block.addComponent('Dash, Morse, grassLeft');
                let mid = C.e('2D, Canvas, Floor, Persist, Block, grassMid')
                    .attr({...attr});
                let end = C.e('2D, Canvas, Floor, Persist, Block, grassRight')
                    .attr({...attr});
                mid.x += T*1;
                end.x += T*2;
                attr.w = T*3;
            }
        }
        pos.x = attr.x + attr.w;
        pos.y = attr.y;
    }

    // position final area
    C.e('2D, Canvas, Color, Persist, Final, Floor')
        .color('goldenrod')
        .attr({x: pos.x + 100, y: pos.y, w: W, h: 60});

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
        .gravity('Floor')
        .preventGroundTunneling()
        .reel('jump', 500, 5, 0, 1)
        .reel('idle', 500, 0, 0, 1)
        .reel('move', 500, 1, 0, 4);
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
    player.bind('CheckJumping', function (ground) {
        if (!ground) {
            //player.animate('jump', -1);
        }
    })
    player.bind('LandedOnGround', function (ground) {
        //player.animate('idle', -1);
    })
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
        if (!ground.has('Space')) {
            this.rotation = 0;
        }
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
    Freeze = true;
    C.viewport.x = V.x;
    C.viewport.y = V.y;
    let bottom = C.e('2D, Canvas, Bottom')
        .attr({...Bottom});
    let marker = C.e('2D, Canvas, Collision, Tween')
        .attr({x: -50 /*Bottom.x*/, y: Bottom.y-T, w: 1, h: T*2})
    let zrect = C.e('2D, Canvas, ZRect')
        .attr({...ZRect});

    // create colliders
    C('Morse').each(function (i) {
        let collider = C.e('2D, Canvas, Collision, Color')
            .attr({y: Bottom.y + 4, h: 20})
            .color("red", 0);
        if (this.has('Dot')) {
            collider.addComponent('DotCollider');
            collider.x = this.x;
            collider.w = this.w;
        } else if (this.has('Dash')) {
            collider.addComponent('DashCollider');
            collider.x = this.x;
            collider.w = T*3;
        } else {
            collider.addComponent('SpaceCollider');
            collider.x = this.x;
            collider.w = this.w;
            // collider.origin("center");
            // collider.rotation = 90;
        }
    });
    // fall down (or up)
    C('Block').each(function (i) {
        this.addComponent('Gravity');
        this.gravityConst(M.G/2).gravity('Bottom');
    });
    zrect.y = Bottom.y - ZRect.h;
    let zoom_factor = Math.min(C.viewport.width/(zrect.w+60),
                               C.viewport.height/(zrect.h+60));
    zoom_factor = (zoom_factor > 1) ? 1: zoom_factor;
    let zoom_time = 2000;
    Osc.start();
    C.viewport.zoom(zoom_factor, zrect.x+zrect.w/2, zrect.y+zrect.h/2, zoom_time);
    function postZoom () {
        C('cloudSpace').each(function (i) {
            this.addComponent('Tween');
            this.tween({y: -C.viewport.y-this.h}, 4000, 'easeOutQuad');
        });
        Osc.stop();
        let charCounter = 0;
        // zoom in close to marker and follow
        // C.viewport.follow(marker);
        let inputArea = document.getElementById('inputArea');
        inputArea.style.display = 'block';
        inputArea.style.width = C.viewport.width + 'px';
        inputArea.style.marginTop = 20 + 'px';
        marker.onHit('Collision', function (hit, first) {
            if (first === true) {
                let block = hit[0].obj; // there's no overlap so always only one entity hits
                block.color('red', 1);
                if (!block.has('SpaceCollider')) {
                    Osc.start();
                }
                charCounter++;
                if (typeof MsgTrain[charCounter] === 'string') {
                    inputArea.textContent += MsgTrain[charCounter];
                    charCounter++;
                }
            }
        }, function () {
            Osc.stop();
        });
        if (charCounter >= MsgTrain.length) {
            Osc.stop();
        }
        marker.tween({x: zrect.x+zrect.w+20}, (zrect.w/T)*100);
    }
    C.e('Delay').delay(postZoom, zoom_time);
});

// kick off
C.enterScene("start");
