// little ditty
let C = require('craftyjs');
let context = new (window.AudioContext || window.webkitAudioContext)();
class Beeper {
    constructor(context) {
        this.context = context;
    }
    init() {
        this.oscillator = this.context.createOscillator();
        this.gainNode = this.context.createGain();
        this.oscillator.connect(this.gainNode);
        this.gainNode.connect(this.context.destination);
        this.oscillator.type = 'sine';
    }
    play(value=440, time=0) {
        this.init();
        this.oscillator.frequency.value = value;
        this.gainNode.gain.setValueAtTime(1, this.context.currentTime);
        this.oscillator.start(time);
        // this.stop(time);
    }
    stop(time=0) {
        this.oscillator.stop(time);
    }
}
let Osc = new Beeper(context);

function fontFit(el) {
    let fontSize = el.style.fontSize ||
        window.getComputedStyle(el, null).getPropertyValue('font-size');
    el.style.fontSize = fontSize;
    while (el.scrollHeight > el.offsetHeight) {
        let newsize = parseInt(el.style.fontSize.slice(0,-2))-1;
        el.style.fontSize = (newsize).toString() + 'px';
    }
}

// viewport size
let W = 800, H = 480;
// sprite tile default ht
let T = 70;
// controls speed of marker/wiper to display morse msg
let MarkerDelay = 70;
// player sprite w/h, will take on sprite asset dimensions
let P = { x: 100, y: 360, w: 0, h: 0 };
// player gravity speed jump strength, jump width, jump height
// TODO: magic values should be mathematically determined
let M = { G: 1 * 2500, S: 6 * 50, J: 17 * 50, J_W: 234, J_H: 170 };
// area to zoom to at the end containg all blocks
let ZRect = {}, Bottom = {}, Marker = {};
let V = {};
// contains morse message and display helper
let Msg = '';
let MsgTrain = [];

let Freeze = false;
C.init(W, H);
C.background('#FFF');
C.loggingEnabled = true;
let Clog = C.log;
let DefStr = "hi";

let assets = {
    "audio": {
        "footstep": [],
        "bg": [],
        "outro": []
    },
    "images": [
        "backgroundColorForest.png",
        "backgroundColorGrass.png",
        "platform_spritesheet.png",
        "player_spritesheet.png"
    ]
};

function assignSprites() {
    C.sprite(66, 92, "player_spritesheet.png", {
        "player_idle": [0, 0]
    });
    C.sprite(1024, 1024, "backgroundColorGrass.png", {
        "bg": [0, 0]
    });
    C.sprite("platform_spritesheet.png", {
        "cloud3": [0, 0, 216, 139],
        "moonFull": [216, 0, 84, 84],
        "sun": [300, 0, 84, 84],
        "fence": [216, 84, 104, 77],
        "flagRed": [0, 139, 67, 70],
        "flagRed2": [67, 139, 67, 70],
        "grass": [134, 139, 70, 70],
        "grassCliffLeft": [204, 161, 70, 70],
        "grassLeft": [274, 161, 70, 70],
        "grassMid": [0, 209, 70, 70],
        "ladderMid": [70, 209, 70, 70],
        "ladderTop": [140, 231, 70, 70],
        "lockYellow": [210, 231, 70, 70],
        "signRight": [320, 84, 64, 70],
        "bush3": [280, 231, 59, 52],
        "springboardUp": [0, 279, 70, 50],
        "bushAlt4": [70, 279, 50, 48],
        "player_badge": [339, 231, 47, 47],
        "star": [120, 301, 52, 46],
        "bush4": [172, 301, 50, 46],
        "grassHalf": [222, 301, 70, 40],
        "grassHalfLeft": [292, 301, 70, 40],
        "grassHalfMid": [0, 329, 70, 40],
        "keyGreen": [70, 347, 60, 36],
        "springboardDown": [130, 347, 70, 36],
        "spikes": [200, 347, 70, 35],
        "gemYellow": [344, 161, 34, 24]
    });
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
    for (var n in str) {
        out += String.fromCharCode(str.charCodeAt(n)^1);
    }
    return out;
}

function validateStr(str) {
    // return 1: ok, 0: too short, -1: too long, -2: bad chars
    if (str.length == 0) {
        return 2;
    }
    if (str.length > 15) {
        return 3;
    }
    for (var i = 0; i < str.length; i++) {
        if (!morse.hasOwnProperty(str[i])) {
            return 4;
        }
    }
    return true;
}

function getUrlHash() {
    let defaultStr = convertStr(DefStr);
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
    let bg = C.e('2D, Canvas, bg, back')
        .attr({alpha: 0.5, x: -20, y: -20, w: H+140, h: H+140});
    for (var i = 0; i < Math.ceil(W/bg.w)-1; i++) {
        bg.attach(C.e('2D, Canvas, bg')
            .attr({alpha: 0.5, x: bg.x+bg.w*(i+1), y: bg.y, w: bg.w, h: bg.h}));
    }
    bg.bind('UpdateFrame', function () {
        bg.x = -C.viewport.x-20;
        bg.y = -C.viewport.y-20;
    });

    let player = C.e('Player, 2D, Canvas, Persist, Twoway, GroundAttacher, SpriteAnimation, player_idle')
        .attr({ x: P.x, y: P.y })
        .twoway(M.S, M.J)
        .reel('jump', 500, 5, 0, 1)
        .reel('idle', 500, 0, 0, 1)
        .reel('move', 500, 1, 0, 4)
        .reel('climb', 500, 6, 0, 2);
    P.w = player.w;
    P.h = player.h;
    let startFloor = C.e('2D, Canvas, grassHalfLeft, Floor')
        .flip();
    startFloor.x = W/2 - startFloor.w;
    startFloor.y = P.y+P.h;
    for (var i = 0; i <= 20; i++) {
        C.e('2D, Canvas, grassHalfMid, Floor')
      .attr({x: startFloor.x - T*(i+1), y: startFloor.y});
    }
    // add gravity after setting up a floor
    player.addComponent('Gravity')
        .gravityConst(M.G)
        .gravity('Floor')
        .preventGroundTunneling();
    C.e('2D, Canvas, signRight').attr({x: -160, y: startFloor.y-T});

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
    let pos = { x: startFloor.x+startFloor.w, y: startFloor.y };
    for (var i=0; i < morseMap.length; i++) {
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
            let cloud = C.e("2D, Canvas, Persist, cloud3")
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
                let end = C.e('2D, Canvas, Floor, Persist, Block, grassLeft')
                    .attr({...attr})
                    .flip();
                mid.x += T*1;
                end.x += T*2;
                attr.w = T*3;
            }
        }
        pos.x = attr.x + attr.w;
        pos.y = attr.y;
    }

    // position final area
    let finalFloor = C.e('2D, Canvas, Color, Persist, Final, Floor')
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
            assignSprites();
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

    Msg = getUrlHash();
    if (!validateStr(Msg)) {
        Msg = DefStr;
    }
    makeMap();

    player = C('Player');
    player.bind('UpdateFrame', function(ev) {
        let v = player.velocity();
        if (!player.ground) {
            player.animate('jump', -1);
        } else if (v.x==0 && v.y==0) {
            player.animate('idle', -1);
        } else if (!player.isPlaying('move')) {
            player.animate('move', -1);
        }
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
    C.viewport.clampToEntities = false;
    let cam = C.e('2D, Persist, camera')
        .attr({x: player.x, y: H - 150, w: 350, h: 100});
    cam.bind('UpdateFrame', function () {
        C.viewport.centerOn(this, 250);
        let x = this.x, y = this.y;
        // if (player.dir_y == 1) { y = this.y }
        y = player.y + player.h - this.h/2;
        if (player.dir_x == 1) { x = player.x }
        else if (player.dir_x == -1) { x = player.x + player.w - this.w }
        this.attr({x: x, y: y});
    })

    player.bind('LandedOnGround', function(ground) {
        if (!ground.has('Space')) {
            this.rotation = 0;
        }
        if (ground.has('Final')) {
            V = { x: C.viewport.x, y: C.viewport.y };
            // C.enterScene('endScene');
            C.enterScene('outro');
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

C.defineScene("outro", function () {
    Clog('finishing');
    // TODO: make msg
    // TODO: restart with new msg
    let zoomPos = {x: V.y+C.viewport.width/2, y: V.y+C.viewport.height/2};

    let player = C("Player");
    player.removeComponent('Gravity', false);
    player.removeComponent('Twoway', false);
    player.removeComponent('Jumper', false);
    player.removeComponent('Multiway', false);
    player.addComponent('Tween');
    player.tween({x: player.x + 200}, 500);
    let FinalObjs = C('Final');
    FinalObjs.each(function (e) {
        if (this.has('2D')) { this.addComponent('Tween') };
    this.tween({alpha: 0}, 500);
    });
    C('camera').destroy();
    C.viewport.x = V.x;
    C.viewport.y = V.y;
    // make event based
    C.e('Delay').delay(function () {
        C('Final').each(function (i) {
            this.destroy();
        });
        C.enterScene('end');
    }, 15000);
});

C.defineScene("end", function () {
    Clog('ending');
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
    Osc.play(); Osc.stop(); Osc.play();
    C.viewport.zoom(zoom_factor, zrect.x+zrect.w/2, zrect.y+zrect.h/2, 2000);
    C.one('CameraAnimationDone', function () {
        C('cloud3').each(function (i) {
            this.addComponent('Tween');
            this.tween({y: -C.viewport.y-this.h}, 4000, 'easeOutQuad');
        });
        Osc.stop();
        let charCounter = 0;
        // zoom in close to marker and follow
        // C.viewport.follow(marker);
        let msgArea = document.getElementById('msgArea');
        msgArea.style.display = 'block';
        msgArea.style.width = C.viewport.width + 'px';
        marker.onHit('Collision', function (hit, first) {
            if (first === true) {
                let block = hit[0].obj; // there's no overlap so always only one entity hits
                block.color('red', 1);
                if (!block.has('SpaceCollider')) {
                    Osc.play();
                }
                charCounter++;
                if (typeof MsgTrain[charCounter] === 'string') {
                    msgArea.textContent += MsgTrain[charCounter];
                    fontFit(msgArea);
                    charCounter++;
                }
            }
        }, function () {
            Osc.stop();
        });
        if (charCounter >= MsgTrain.length) {
            Osc.stop();
        }
        marker.tween({x: zrect.x+zrect.w+20}, (zrect.w/T)*MarkerDelay);
        marker.one('TweenEnd', function () {
            let r = C.viewport.rect();
            C('*').each(function (i) {
                this.addComponent('Tween');
                this.removeComponent('Persist');
                this.tween({alpha: 0}, 5000, 'easeOutQuad');
            });
            C.e('Delay').delay(function () {
                // badger hints at click/touch
                let badger = C.e('2D, Canvas, player_badge, Tween');
                badger.attr({w:r._w/100*10, h:r._w/100*10});
                badger.attr({x:r._x+r._w/2-badger.w/2, y:r._y+r._h/2-badger.h/2});
                C('player_badge').bind('UpdateFrame', function () {
                    this.alpha = Math.min(70, Math.sin((C.frame())*0.05));
                });
                C.e('Keyboard, Mouse, 2D, Canvas, Color')
                    .attr({x:r._x, y:r._y, w:r._w, h:r._h})
                    .color("red", 0)
                    .bind("KeyUp", function (k) {Clog('clicked');C.enterScene("share")})
                    .bind("Click", function (k) {Clog('clicked');C.enterScene("share")});
            }, 2000);
        })
    });
});

C.defineScene('share', function () {
    // position: absolute; visibility: visible; width: 760px; height: 360px; z-index: 0; opacity: 1; transform: translate3d(20px, 60px, 0px);
    let inputContainer = document.getElementById('inputContainer');
    let inputArea = document.getElementById('inputArea');
    let credits = document.getElementById('credits');
    let input = document.getElementById('input');
    let status = document.getElementById('status');
    inputContainer.style.display = 'block';
    inputContainer.style.position = 'absolute';
    inputContainer.style.left = '0px';
    inputContainer.style.top = '0px';
    inputContainer.style.width = W+ 'px';
    inputContainer.style.height = H + 'px';
    inputContainer.style.transfrom = "translate3d(20px, 60px, 0px)";
    inputContainer.style.zIndex = "50";
    C.stage.elem.appendChild(inputContainer);
    inputArea.style.display = 'block';
    credits.style.width = W + 'px';
    credits.style.display = 'block';
    // return 1: ok, 2: too short, 3: too long, 4: bad chars
    let messages = {
        1: "here's your level!",
        2: "type a message",
        3: "whoa too much text!",
        4: "type something else!"
    };
    status.textContent = messages[2];
    let validator = function () {
        let msg = input.value;
        let result = validateStr(msg);
        result = (result === true) ? 1 : result;
        status.innerHTML = messages[result];
        if (result == 1) {
            let hash = convertStr(msg.toLowerCase());
            let addr = window.location.href.replace(/\#.*$/, '');
            let url = `${addr}#${hash}`;
            status.innerHTML = `<a href="${url}">${status.innerHTML}</a>`;
            status.classList.add('success');
        } else {
            status.classList.remove('success');
        }
    }
    validator(); // run on browser-prefilled input history
    input.addEventListener('keyup', validator);
    // hook input
});

// kick off
C.enterScene("start");
