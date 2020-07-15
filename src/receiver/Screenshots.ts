import { App, Meta, Sender } from 'koishi';
import fs = require('fs');
import path = require('path');
import puppeteer = require('puppeteer');
import { sleep } from '../utils/tools';
const gm = require('gm');

export class Screenshots {

    app: App;
    prefixs = ['ss '];

    constructor(app: App) {
        this.app = app;
        this.initPokeWiki();
    }

    private async initPokeWiki() {
        const app = this.app;

        this.app.receiver.on('message', (msg) => {
            const text = msg.rawMessage;

            for (const word of this.prefixs) {
                if (text.toLowerCase().startsWith(word)) {
                    this.getScreenshots(msg);
                    return;
                }
            }
        })
    }

    private async getScreenshots(msg: Meta<'message'>) {
        try {
            msg.$send('正在连接网页...');
            const text = msg.rawMessage;
            let src = text.split(' ')[1];
            console.log(src);
            if (!src) {
                msg.$send('请输入网址');
                return;
            }
            if (!src.startsWith('http')) src = `http://${src}`;

            const browser = await puppeteer.launch({});
            const page = await browser.newPage();
            await page.goto(src);
            page.setViewport({
                width: 1600,
                height: 900
            });

            msg.$send('网页连接完成，正在加载网页资源...');
            await this.autoScroll(page);
            console.log('isEnd');

            const rd = String(Math.ceil(Math.random() * 10000000));
            const tempPath = path.resolve(`./temp/${rd}.png`);
            const savePath = path.resolve(`I:\\酷Q Pro\\data\\image\\${rd}.png`);

            msg.$send('正在截屏...');
            await page.screenshot({ path: tempPath, fullPage: true });

            gm(tempPath).size(async (err, size) => {
                let curHeight = size.height;
                const maxHeightPerSlice = 3000;
                if (curHeight > maxHeightPerSlice) {
                    msg.$send('截屏图片过大，正在裁剪图片...');

                    const imagesCode: string[] = [];
                    while (curHeight >= 0) {
                        const rd = String(Math.ceil(Math.random() * 10000000));
                        const savePath = path.resolve(`I:\\酷Q Pro\\data\\image\\${rd}.png`);
                        imagesCode.push(rd);
                        await this.cropImage(tempPath, savePath, 1600, maxHeightPerSlice, 0, size.height - curHeight);
                        curHeight -= maxHeightPerSlice;
                    }

                    msg.$send('裁剪完成，开始发送图片');
                    for (let rd of imagesCode) {
                        const pictureCq = `[CQ:image,file=${rd}.png]`;
                        await msg.$send(pictureCq);
                        await sleep(3000);
                    }
                }
                else {
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
                    // @ts-ignore
                    var scrollHeight = document.body.scrollHeight;
                    // @ts-ignore
                    window.scrollBy(0, distance);
                    totalHeight += distance;

                    if (totalHeight >= scrollHeight) {
                        clearInterval(timer);
                        resolve();
                    }
                }, 25);
            });
        })()`);
    }
}