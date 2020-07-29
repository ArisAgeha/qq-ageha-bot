import { App, Meta, Sender, messages, Random } from 'koishi';
import fs = require('fs');
import path = require('path');
import puppeteer = require('puppeteer');
import { sleep, TextHelper } from '../utils/tools';
import { screenshotStore, ScreenshotStore } from '../nedb/Nedb';
import { RandomPictureService } from '../Service/RandomPictureService';
const gm = require('gm');

export class RandomPicture {

    app: App;
    prefix = '随机';
    setSizePrefix = '随机 -size';
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

            if (text.startsWith('随机 -relative')) this.setRelative(msg);
            else if (/^随机 -size \d+$/.test(text)) this.setSize(msg);
            else if (text.toLowerCase().startsWith(this.prefix)) this.getRandomPicture(msg);
        })
    }

    private async setRelative(msg: Meta<'message'>) {
        const text = msg.rawMessage;
        if (!/^随机 -relative (0\.\d+)$|1$|1.0+$|0$|0.0+$/.test(text)) {
            msg.$send('相关性指数指定错误，请输入[0-1]之间的小数，数值越大，相关性越强');
            return;
        }
        const groupId = msg.groupId;
        const relative = Number(text.match(/(0\.\d+)$|1$|1.0+$|0$|0.0+$/)[0]);

        await this.randomPictureService.setRelative({ groupId, relative });
        msg.$send('相关指数设定成功');
    }

    private async setSize(msg: Meta<'message'>) {
        const text = msg.rawMessage;
        const qqId = msg.userId;
        const groupId = msg.groupId;
        const size = Number(text.match(/\d+/)[0]);

        if (![0, 1, 2, 3, 9].includes(size)) {
            msg.$send('尺寸指定出错，接受的尺寸：\r\n[0] 全部尺寸 \r\n[1] 小尺寸 \r\n[2] 中尺寸 \r\n[3] 大尺寸 \r\n[9] 特大尺寸');
            return;
        }

        await this.randomPictureService.setDefaultSize({ qqId, groupId, size });
        const textHelper = new TextHelper();
        textHelper.append(`[CQ:at,qq=${qqId}] 默认尺寸设置成功，您当前的设置为：${size}`);
        textHelper.append(`${size === 0 ? '☞ ' : ''}[0] 全部尺寸`);
        textHelper.append(`${size === 1 ? '☞ ' : ''}[1] 小尺寸`);
        textHelper.append(`${size === 2 ? '☞ ' : ''}[2] 中尺寸`);
        textHelper.append(`${size === 3 ? '☞ ' : ''}[3] 大尺寸`);
        textHelper.append(`${size === 9 ? '☞ ' : ''}[9] 特大尺寸`);
        const res = textHelper.getText();
        msg.$send(res);
    }

    private async getRandomPicture(msg: Meta<'message'>) {
        const text = msg.rawMessage;
        const content = text.slice(2);
        const { keyword, count } = this.parseText(content)
        msg.$send(`${keyword}加载中...`);

        const size = await this.randomPictureService.getSizeSetting({ groupId: msg.groupId, qqId: msg.userId });
        const relative = await this.randomPictureService.getRelative({ groupId: msg.groupId });
        const rds = await this.randomPictureService.getPicture(keyword, count, size, relative);

        if (rds) {
            rds.forEach(rd => {
                msg.$send(`[CQ:image,file=${rd}.png]`);
            })
        }
        else msg.$send(`没有找到内容！`);
    }

    private parseText(text: string) {
        const maxCount = 30;
        const minCount = 1;

        const res = {
            keyword: '',
            count: 1
        }

        const countMatch = text.match(/(.+)(\* *\d+)/);
        if (countMatch && countMatch[2]) {
            let count = Number(countMatch[2].match(/\d+/)[0]);

            res.count = Math.max(Math.min(count, maxCount), minCount);
            res.keyword = countMatch[1];
        }
        else {
            res.keyword = text;
        }

        return res;
    }
}