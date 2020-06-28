import { App, Meta } from "koishi";
import axios from 'axios';

export class MoeWiki {

    app: App;
    prefixs: ['moe', '萌百'];

    constructor(app: App) {
        this.app = app;
        this.initMoeWiki();
    }

    private initMoeWiki() {
        const app = this.app;

        this.app.group(435649543).receiver.on('message', (msg) => {
            const text = msg.rawMessage;

            this.prefixs.forEach(word => {
                if (text.toLowerCase().startsWith(word + ' ')) this.startSearch(msg);
            });
        })
    }

    private async startSearch(msg: Meta<'message'>) {
        const word = this.getWord(msg.rawMessage);
        
        const html = await axios.get(`https://zh.moegirl.org/${word}`);
        console.log(html);
    }

    private getWord(text: string) {
        let word = '';

        for (let prefixWord of this.prefixs) {
            if (text.toLowerCase().startsWith(word + ' ')) {
                const slicePos = prefixWord.length + 1;
                word = text.slice(slicePos);
                break;
            }
        }
    }
}