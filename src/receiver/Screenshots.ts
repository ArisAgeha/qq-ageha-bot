import { App, Meta, Sender, messages } from 'koishi';
import fs = require('fs');
import path = require('path');
import puppeteer = require('puppeteer');
import { sleep, TextHelper } from '../utils/tools';
import { screenshotStore, ScreenshotStore } from '../nedb/Nedb';
import { idText } from 'typescript';
import { isUndefined } from '../utils/types';
const gm = require('gm');

export class Screenshots {

    app: App;
    prefix = 'ss';
    setPrefixs = ['-set', '-s'];
    removePrefixs = ['-remove', '-r'];
    listPrefixs = ['-list', '-l'];
    helpPrefixs = ['-help', '-h'];

    constructor(app: App) {
        this.app = app;
        this.initScreenshots();
    }

    private async initScreenshots() {
        const app = this.app;

        this.app.receiver.on('message', (msg) => {
            const text = msg.rawMessage;

            if (text.toLowerCase().startsWith(this.prefix)) {
                const prefix = msg.rawMessage.split(' ')[1];
                if (this.setPrefixs.includes(prefix)) this.setAlias(msg);
                else if (this.removePrefixs.includes(prefix)) this.removeAlias(msg);
                else if (this.listPrefixs.includes(prefix)) this.listAlias(msg);
                else if (this.helpPrefixs.includes(prefix)) this.sendHelp(msg);
                else this.getScreenshots(msg);
            }
        })
    }

    sendHelp(msg: Meta<'message'>) {
        const textHelper = new TextHelper();
        textHelper.append('· 截图器使用方式');
        textHelper.append('[1] 基础使用方式：【ss 任意url】');
        textHelper.append('[2] 绑定别名使用方式：【ss[已绑定的别名] 关键词】');
        textHelper.append('');
        textHelper.append('· 设置别名方法：【ss -set 别名 url】');
        textHelper.append('如： ss -set 百科 http://baike.baidu.com/item/${val}');
        textHelper.append('此时，以[2]方法使用时，关键词 会自动替代url中的${val}模板');
        textHelper.append('如ss百科 测试，则会自动截图【http://baike.baidu.com/item/测试】网页的内容');
        textHelper.append('');
        textHelper.append('· 查看已设置的别名列表：【ss -l】 或 【ss -list】');
        textHelper.append('');
        textHelper.append('· 移除别名：【ss -r 别名】 或 【ss -remove 别名】');

        const text = textHelper.getText();
        msg.$send(text);
    }

    async setAlias(msg: Meta<'message'>) {
        const text = msg.rawMessage;
        const textArray = text.split(' ');

        if (textArray.length !== 4) {
            msg.$send('参数有误，设置别名的格式为【ss -set [别名] [url]】');
            msg.$send('如：ss -set 百科 https://baike.baidu.com/item/${val}');
            return;
        }

        const id = msg.groupId || msg.userId;
        const name = textArray[2];
        const src = textArray[3].startsWith('http') ? textArray[3] : `http://${textArray[3]}`;

        try {
            await screenshotStore.update(
                { belong_id: id, name },
                { belong_id: id, name, src },
                { upsert: true }
            )
            msg.$send('记录别名成功');
        }
        catch (err) {
            console.error(err);
            msg.$send('写入数据库时出现错误');
        }

    }

    async removeAlias(msg: Meta<'message'>) {
        const text = msg.rawMessage;
        const textArray = text.split(' ');

        if (textArray.length !== 3) {
            msg.$send('参数有误，设置别名的格式为【ss -remove [别名]】');
            msg.$send('如：ss -remove 百科');
            return;
        }

        const id = msg.groupId || msg.userId;
        const name = textArray[2];

        try {
            await screenshotStore.remove(
                { belong_id: id, name }
            )
            msg.$send('删除别名成功');
        }
        catch (err) {
            msg.$send('删除别名失败');
        }
    }

    async listAlias(msg: Meta<'message'>) {
        const id = msg.groupId || msg.userId;
        const list: ScreenshotStore[] = await screenshotStore.find({ belong_id: id }).exec();
        if (list.length > 0) {
            const res = list.reduce((prev, cur, index) => {
                return prev + `[${index + 1}] ${cur.name} ${cur.src}\r\n`;
            }, '');
            msg.$send(res);
        }
        else {
            msg.$send('未查询到别名设置');
        }
    }

    private async getScreenshots(msg: Meta<'message'>) {
        try {
            msg.$send('正在连接网页...');
            const text = msg.rawMessage;
            const textArray = text.split(' ');
            const { timeout, alias } = this.extractParams(textArray);

            let src = '';
            if (alias) {
                const id = msg.groupId || msg.userId;
                const srcModelData: ScreenshotStore[] = await screenshotStore.find({ belong_id: id, name: alias }).exec();

                if (srcModelData.length === 0) {
                    msg.$send('未绑定此别名');
                    return;
                }

                const srcModel = srcModelData[0];
                src = srcModel?.src?.replace('${val}', textArray[1]);
            }
            else {
                src = textArray[1].startsWith('http') ? textArray[1] : `http://${textArray[1]}`;
            }

            if (!src) return;

            const browser = await puppeteer.launch({});
            const page = await browser.newPage();
            await page.goto(src);
            await page.waitFor(timeout);
            page.setViewport({
                width: 1600,
                height: 900
            });

            msg.$send('网页连接完成，正在加载网页资源...');
            await this.autoScroll(page);

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

    private extractParams(paramsArray: string[]) {
        let timeout = 0;
        let alias = '';

        if (paramsArray[0].length > 2) alias = paramsArray[0].slice(2);

        for (let i = 0; i < paramsArray.length; i++) {
            if (['-t', '-time'].includes(paramsArray[i])) {
                let timeoutData = Number(paramsArray[i + 1]);
                if (isNaN(timeoutData) || !timeoutData) continue;
                else timeout = timeoutData;
            }
        }

        return { timeout, alias };
    }
}