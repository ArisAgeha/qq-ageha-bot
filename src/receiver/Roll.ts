import { App, Meta } from 'koishi';

export class FarmNotifier {
    app: App;

    constructor(app: App) {
        this.app = app;
        this.initReceiver();
    }

    private initReceiver() {
        const app = this.app;

        this.app.group(435649543).receiver.on('message', (msg) => {
            const text = msg.rawMessage;
        })
    }


}