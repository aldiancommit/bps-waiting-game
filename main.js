import Phaser from 'phaser';

const config = {
    type: Phaser.AUTO,
    width: 360,
    height: 640,
    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH
    },
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 0 },
            debug: false
        }
    },
    scene: {
        preload: preload,
        create: create,
        update: update
    }
};

const game = new Phaser.Game(config);

function preload() {
    // Tempat load gambar/suara nanti
}

function create() {
    // Teks uji coba awal
    this.add.text(180, 320, 'Game BPS Ready!', {
        fontSize: '24px',
        color: '#ffffff'
    }).setOrigin(0.5);
}

function update() {
    // Logic per-frame
}