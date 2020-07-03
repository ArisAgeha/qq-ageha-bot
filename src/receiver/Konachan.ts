import { App, Meta } from 'koishi';
import axios from 'axios';
import { isArray } from 'util';
import { match } from 'assert';
const fs = require('fs');
const path = require('path');

export class Konachan {

    app: App;
    keyword = ['kona', 'kn'];

    constructor(app: App) {
        this.app = app;
        this.initMoeWiki();
    }

    private async initMoeWiki() {
        const app = this.app;

        this.app.group(435649543).receiver.on('message', (msg) => {
            const text = msg.rawMessage;

            for (const word of this.keyword) {
                if (text.toLowerCase() === word) {
                    this.startSearch(msg);
                    return;
                }
            }
        })
    }

    private async startSearch(msg: Meta<'message'>) {
        // get random page
        const sender = msg.sender.userId;
        const rdPage = await axios.get('https://konachan.net/post/random');
        const matchSrc = JSON.stringify(rdPage.data)?.match(/https\:\/\/konachan.net\/post\/show\/\d+/);
        const redirectPageSrc = matchSrc ? matchSrc[0] : null;

        // get redirect page (image page)
        const targetPage = await axios.get(redirectPageSrc);

        const cheerio = require('cheerio');
        const $ = cheerio.load(targetPage.data);

        // load image page
        const image = $('.image')[0];
        if (!image) return;
        const imageSrc = image.attribs.src;

        // download and send iamge to QQ
        if (imageSrc) {
            const response = await axios({
                method: 'GET',
                url: imageSrc,
                responseType: 'stream'
            });

            const rd = String(Math.ceil(Math.random() * 10000000));
            const savePath = path.resolve(`I:\\酷Q Pro\\data\\image\\${rd}`);
            const pictureCq = `[CQ:image,file=${rd}]`;

            const rs = fs.createWriteStream(savePath);
            response.data.pipe(rs);

            response.data.on('end', () => {
                console.log('request image end');
                msg.$send(`${pictureCq}[CQ:at,qq=${sender}]`);
                console.log('image send');

                setTimeout(() => {
                    fs.unlink(savePath, () => { });
                }, 10000);
            });

            response.data.on('error', (err: Error) => {
                console.log(err);
            });
        }
    }

}