import { App, Meta, Sender, messages } from 'koishi';
import fs = require('fs');
import path = require('path');

interface Counter {
    title: string;
    participant: number[];
}

interface Gambling {
    // infomation
    belong_to: number;
    status: 0 | 1 | 2;
    // content
    title: string;
    max_point: number;
    counter: Counter[];
    // time
    end_at: number;
    begin_at: number;
}

export class Game {
    app: App;
    gamblings: Gambling[] = [];

    constructor(app: App) {
        this.app = app;
        this.initReceiver();
    }

    private async initReceiver() {
        this.app.group(435649543).receiver.on('message', (msg) => {
            const text = msg.rawMessage;

            if (/^\[CQ:at,qq=2622692056\] 设局 .+$/.test(text)) this.startGambling(msg);
        })
    }

    private async startGambling(msg: Meta<'message'>) {
    }
}