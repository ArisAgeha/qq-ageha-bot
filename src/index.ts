import { App } from 'koishi';
import { Clock } from './receiver/Clock';
import { MiniGame } from './receiver/MiniGame';
import { MoeWiki } from './receiver/MoeWiki';
import { Konachan } from './receiver/Konachan';
import { Chess } from './receiver/Chess';
import { PokeWiki } from './receiver/PokeWiki';
import { Screenshots } from './receiver/Screenshots';
import { RandomPicture } from './receiver/RandomPicture';
import { Test } from './receiver/test';

const groupShouldNotice = [435649543];

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

new Clock(app);
new MiniGame(app);
new MoeWiki(app);
new Konachan(app);
new Chess(app);
new PokeWiki(app);
new Screenshots(app);
new RandomPicture(app);
new Test(app);

groupShouldNotice.forEach((groupId) => {
    app.sender.sendGroupMsg(groupId, '服务器已重新启动...'); 
})

console.log('Koishi is started');
console.log(`port: ${config.port}`);
console.log(`server: ${config.server}`);