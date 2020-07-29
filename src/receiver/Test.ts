import { App, Meta, Sender, messages } from 'koishi';
import { TextHelper } from '../utils/tools';
import { screenshotStore, ScreenshotStore, clockStore, userSettingsStore, pointStore } from '../nedb/Nedb';
import { isArray } from 'util';
const gm = require('gm');

export class Test {

    app: App;
    prefix = 'test db';
    clearPrefix = 'clear db';

    storesName = new Map();

    constructor(app: App) {
        this.storesName.set(screenshotStore, 'screenshotStore');
        this.storesName.set(clockStore, 'clockStore');
        this.storesName.set(userSettingsStore, 'userSettingsStore');

        this.app = app;
        this.initReceiver();
    }

    private async initReceiver() {
        const app = this.app;

        this.app.receiver.on('message', (msg) => {
            const text = msg.rawMessage;
            if (this.prefix === text) this.sendTest(msg);
            else if (this.clearPrefix === text) this.clearDb(msg);
        })
    }

    private async sendTest(msg: Meta<'message'>) {
        const textHelper = new TextHelper();

        const stores = [screenshotStore, clockStore, userSettingsStore];
        for (let store of stores) {
            textHelper.append(`======== ${this.storesName.get(store)} ========`);
            const data = await store.find({}).exec();
            if (isArray(data)) data.forEach(item => {
                textHelper.append(`  ${JSON.stringify(item)}`);
            });
        }

        const text = textHelper.getText();
        msg.$send(text);
    }

    private async clearDb(msg: Meta<'message'>) {
        const stores = [screenshotStore, clockStore, userSettingsStore];
        for (let store of stores) {
            const res = await store.remove({}, { multi: true });
        }
        msg.$send('complete');
    }
}