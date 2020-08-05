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
    typePrefix = '随机 -type';
    randomPictureService: RandomPictureService;

    sizeMap = {
        0: '全部尺寸',
        1: '小尺寸',
        2: '中尺寸',
        3: '大尺寸',
        9: '特大尺寸'
    }

    typeMap = {
        0: '全部类型',
        2: '二次元',
        3: '三次元'
    }

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
            else if (text.startsWith('随机 -type')) this.setType(msg);
            else if (text.startsWith('随机 -size')) this.setSize(msg);
            else if (text.toLowerCase().startsWith(this.prefix)) this.getRandomPicture(msg);
        })
    }

    private async setType(msg: Meta<'message'>) {
        const text = msg.rawMessage;

        if (!/^随机 -type [023]$/.test(text)) {
            const str = Object.keys(this.typeMap).reduce((prev, cur, index) => {
                return `${prev}\r\n[${cur}] ${this.typeMap[cur]}`;
            });
            msg.$send(`类型错误，可接受的类型：${str}`);
            return;
        }
        const qqId = msg.userId || 0;
        const groupId = msg.groupId || 0;
        const type = Number(text[9]);

        await this.randomPictureService.setDefaultType({ groupId, type, qqId });

        const textHelper = new TextHelper();
        textHelper.append(`[CQ:at,qq=${qqId}] 类型设置成功，您当前的设置为：${type}`);
        Object.keys(this.typeMap).forEach((typeNum) => {
            textHelper.append(`${type === Number(typeNum) ? '☞ ' : ''}[${typeNum}] ${this.typeMap[typeNum]}`);
        });
        const res = textHelper.getText();

        msg.$send(res);
    }

    private async setRelative(msg: Meta<'message'>) {
        const text = msg.rawMessage;
        if (!/^随机 -relative (0\.\d+)$|1$|1.0+$|0$|0.0+$/.test(text)) {
            msg.$send('相关性指数指定错误，请输入[0-1]之间的小数，数值越大，相关性越强');
            return;
        }
        const groupId = msg.groupId || 0;
        const relative = Number(text.match(/(0\.\d+)$|1$|1.0+$|0$|0.0+$/)[0]);

        await this.randomPictureService.setRelative({ groupId, relative });
        msg.$send('相关指数设定成功');
    }

    private async setSize(msg: Meta<'message'>) {
        const text = msg.rawMessage;
        const qqId = msg.userId || 0;
        const groupId = msg.groupId || 0;
        const match = text.match(/\d+/) || '-1';
        const size = Number(match[0]);

        if (![0, 1, 2, 3, 9].includes(size)) {
            const str = Object.keys(this.sizeMap).reduce((prev, cur, index) => {
                return `${prev}\r\n[${cur}] ${this.sizeMap[cur]}`;
            });
            msg.$send(`尺寸指定出错，接受的尺寸：${str}`);
            return;
        }

        await this.randomPictureService.setDefaultSize({ qqId, groupId, size });

        const textHelper = new TextHelper();
        textHelper.append(`[CQ:at,qq=${qqId}] 默认尺寸设置成功，您当前的设置为：${size}`);
        Object.keys(this.sizeMap).forEach((sizeNum) => {
            textHelper.append(`${size === Number(sizeNum) ? '☞ ' : ''}[${sizeNum}] ${this.sizeMap[sizeNum]}`);
        });
        const res = textHelper.getText();

        msg.$send(res);
    }

    private async getRandomPicture(msg: Meta<'message'>) {
        const text = msg.rawMessage;
        const content = text.slice(2);
        const { keyword, count } = this.parseText(content)
        const size = await this.randomPictureService.getSizeSetting({ groupId: msg.groupId, qqId: msg.userId });
        const relative = await this.randomPictureService.getRelative({ groupId: msg.groupId });
        const type = await this.randomPictureService.getTypeSetting({ groupId: msg.groupId, qqId: msg.userId });
        msg.$send(`${keyword}加载中... [${this.sizeMap[size]}] [相关度${relative}] [${this.typeMap[type]}]`);
        msg.$send(`[随机 -type] 设置类型（个人）\r\n[随机 -size] 设置尺寸（个人）\r\n[随机 -relative] 设置相关度（全群生效）`);

        const rds = await this.randomPictureService.getPicture(keyword, count, size, relative, type);

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