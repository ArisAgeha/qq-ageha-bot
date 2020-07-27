import { App, Meta, Sender, messages, Random } from 'koishi';
import fs = require('fs');
import path = require('path');
import puppeteer = require('puppeteer');
import { sleep } from '../utils/tools';
import { screenshotStore, ScreenshotStore } from '../nedb/Nedb';
import { RandomPictureService } from '../Service/RandomPictureService';
const gm = require('gm');

export class RandomPicture {

    app: App;
    prefix = '随机';
    randomPictureService: RandomPictureService;

    constructor(app: App) {
        this.app = app;
        this.initReceiver();
        this.randomPictureService = new RandomPictureService();
    }

    private async initReceiver() {
        const app = this.app;

        this.app.receiver.on('message', (msg) => {
            const text = msg.rawMessage;

            if (text.toLowerCase().startsWith(this.prefix)) this.getRandomPicture(msg);
        })
    }

    private async getRandomPicture(msg: Meta<'message'>) {
        const text = msg.rawMessage;
        const keyword = text.slice(2);
        msg.$send(`${keyword}加载中...`);

        const rd = await this.randomPictureService.getPicture(keyword);

        if (rd) msg.$send(`[CQ:image,file=${rd}.png]`);
        else msg.$send(`没有找到内容！`);
    }
}