import { App } from 'koishi';
import { FarmNotifier } from './receiver/FarmNotifier';
import { MiniGame } from './receiver/MiniGame';
import { MoeWiki } from './receiver/MoeWiki';
import { Konachan } from './receiver/Konachan';

const config = {
    type: "http",
    port: 8089,
    server: "http://127.0.0.1:5700",
    selfId: 2622692056,
    secret: "TEST",
    token: "TEST",
    plugins: [
        "common",
        "schedule"
    ]
}

const app = new App(config as any);

app.start()

new FarmNotifier(app);
new MiniGame(app);
new MoeWiki(app);
new Konachan(app);

console.log('Koishi is started');
console.log(`port: ${config.port}`);
console.log(`server: ${config.server}`);