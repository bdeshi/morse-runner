let Crafty = require('craftyjs');
Crafty.init(800, 480, '#game');
Crafty.background('#FFF');

function assetLoader () {
    return
}

function generateMap () {
    return
}

function entitySetup () {
    return
}

Crafty.defineScene("loading", function () {
    Crafty.background("#555");
    Crafty.e("2D, DOM, Text")
        .attr({w: 100, h: 20, x: 0, y: 0})
        .text("loading")
        .textAlign("center")
        .textColor("red");
});

Crafty.defineScene("menu", function () {
    return
});

Crafty.defineScene("main", function () {
    return
});

Crafty.defineScene("end", function () {
    return
});

Crafty.enterScene("loading");

