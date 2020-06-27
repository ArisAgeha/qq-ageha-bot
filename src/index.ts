import { App } from 'koishi';
import { Receiver } from './receiver/Receiver';

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

new Receiver(app);

console.log('Koishi is started');
console.log(`port: ${config.port}`);
console.log(`server: ${config.server}`);