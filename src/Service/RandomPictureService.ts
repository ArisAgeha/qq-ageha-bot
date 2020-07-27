import puppeteer = require('puppeteer');
import fs = require('fs');
import path = require('path');

export class RandomPictureService {
    async getPicture(keyword) {
        try {
            const src = `https://image.baidu.com/search/index?tn=baiduimage&ps=1&ct=201326592&lm=-1&cl=2&nc=1&ie=utf-8&word=${keyword}`;

            const browser = await puppeteer.launch({});
            const page = await browser.newPage();
            await page.goto(src);
            page.setViewport({
                width: 1600,
                height: 5000
            });

            await page.waitFor(2000);

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

            fs.renameSync(tempPath, savePath);

            setTimeout(() => {
                fs.unlink(savePath, () => { });
            }, 30 * 1000);

            return rd;
        }
        catch (err) {
            console.error(err);
            return false;
        }
    }
}