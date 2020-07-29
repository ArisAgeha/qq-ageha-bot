import puppeteer = require('puppeteer');
import fs = require('fs');
import path = require('path');
import { userSettingsStore } from '../nedb/Nedb';
import { groupFields } from 'koishi';

export class RandomPictureService {
    async getPicture(keyword: string, count: number, size: number, relative: number) {
        try {
            const src = `https://image.baidu.com/search/index?z=${size}&tn=baiduimage&ps=1&ct=201326592&lm=-1&cl=2&nc=1&ie=utf-8&word=${keyword}`;

            const maxHeight = 10000;
            const minHeight = 1000;
            const loadHeight = Math.floor(Math.min(Math.max(1000 / relative, minHeight), maxHeight));

            const browser = await puppeteer.launch({});
            const page = await browser.newPage();
            await page.goto(src);
            console.log(loadHeight);
            page.setViewport({
                width: 1600,
                height: loadHeight
            });

            await page.waitFor(2000);

            const els = await page.$$('.main_img.img-hover');
            const el = els[Math.floor(Math.random() * els.length)];
            let imgs = await page.$$eval('.main_img.img-hover', imgs => imgs.map(img => img.getAttribute('src'))) as any;
            imgs = imgs.filter(img => {
                return img.startsWith('https');
            });

            const rds: string[] = [];

            for (let i = 0; i < count; i++) {
                const img = imgs.splice(Math.floor(Math.random() * imgs.length), 1)[0];

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

                rds.push(rd);
            }

            return rds;
        }
        catch (err) {
            console.error(err);
            return false;
        }
    }

    async setDefaultSize(data: { qqId: number, groupId: number, size: number }) {
        const { qqId, groupId, size } = data;
        try {
            await userSettingsStore.update({ qq_id: qqId, group_id: groupId }, { qq_id: qqId, group_id: groupId, size }, { upsert: true });
        }
        catch (err) {
            console.error(err);
        }
    }

    async getSizeSetting(data: { qqId: number, groupId: number }) {
        const { qqId, groupId } = data;
        try {
            const userSettingData = await userSettingsStore.findOne({ qq_id: qqId, group_id: groupId });
            const size = userSettingData?.size || 0;
            return size;
        }
        catch (err) {
            console.error(err);
            return 0;
        }

    }

    async setRelative(data: { groupId: number, relative: number }) {
        const { relative, groupId } = data;
        try {
            await userSettingsStore.update({ qq_id: 0, group_id: groupId }, { qq_id: 0, group_id: groupId, relative }, { upsert: true });
        }
        catch (err) {
            console.error(err);
        }
    }

    async getRelative(data: { groupId: number }) {
        const { groupId } = data;
        const defaultRelative = 0.5;
        try {
            const relativeData = await userSettingsStore.findOne({ qq_id: 0, group_id: groupId });
            const relative = relativeData?.relative || defaultRelative;
            return relative;
        }
        catch (err) {
            console.error(err);
            return defaultRelative;
        }
    }
}