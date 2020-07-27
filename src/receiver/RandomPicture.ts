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
    setPrefix = '随机 -set';
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

            if (text.toLowerCase().startsWith(this.setPrefix)) this.setSize(msg);
            else if (text.toLowerCase().startsWith(this.prefix)) this.getRandomPicture(msg);
        })
    }

    private async setSize(msg: Meta<'message'>) {

    }

    private async getRandomPicture(msg: Meta<'message'>) {
        try {
            const text = msg.rawMessage;
            const obj = text.slice(2);
            msg.$send(`${obj}加载中...`);
            const src = `https://image.baidu.com/search/index?tn=baiduimage&ps=1&ct=201326592&lm=-1&cl=2&nc=1&ie=utf-8&word=${obj}`;

            const browser = await puppeteer.launch({});
            const page = await browser.newPage();
            await page.goto(src);
            page.setViewport({
                width: 1600,
                height: 5000
            });

            await this.autoScroll(page);
            await page.waitFor(3000);

            const els = await page.$$('.main_img.img-hover');
            const el = els[Math.floor(Math.random() * els.length)];
            let imgs = await page.$$eval('.main_img.img-hover', imgs => imgs.map(img => img.getAttribute('src'))) as any;
            imgs = imgs.filter(img => {
                return img.startsWith('https');
            });
            const img = imgs[Math.floor(Math.random() * imgs.length)];

            await page.goto(img);
            const detailPageEl = await page.$('img');

            const rd = String(Math.ceil(Math.random() * 10000000));
            const tempPath = path.resolve(`./temp/${rd}.png`);
            const savePath = path.resolve(`I:\\酷Q Pro\\data\\image\\${rd}.png`);

            await detailPageEl.screenshot({ path: tempPath });

            fs.rename(tempPath, savePath, async (err) => {
                console.log(err);
                if (!err) {
                    const pictureCq = `[CQ:image,file=${rd}.png]`;
                    await msg.$send(pictureCq);

                    setTimeout(() => {
                        fs.unlink(savePath, () => { });
                    }, 300 * 1000);
                }
            });
        }
        catch (err) {
            console.error(err);
            msg.$send('获取网页截屏失败，请检查你的url');
        }
    }

    private async cropImage(targetPath, savePath, width, height, x, y) {
        return new Promise((res, rej) => {
            gm(targetPath).crop(width, height, x, y).write(savePath, (err) => {
                if (err) console.log(err);
                if (err) rej();
                else res();
            });
        })
    }

    private async autoScroll(page) {
        await page.evaluate(`(async () => {
            await new Promise((resolve, reject) => {
                var totalHeight = 0;
                var distance = 400;
                var timer = setInterval(() => {
                    window.scrollBy(0, distance);
                    totalHeight += distance;

                    if (totalHeight >= 1200) {
                        clearInterval(timer);
                        resolve();
                    }
                }, 25);
            });
        })()`);
    }
}