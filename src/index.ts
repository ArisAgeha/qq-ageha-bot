import { App } from 'koishi';
import { FarmNotifier } from './receiver/FarmNotifier';

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

console.log('Koishi is started');
console.log(`port: ${config.port}`);
console.log(`server: ${config.server}`);