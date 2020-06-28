import { App, Meta } from 'koishi';

export class MiniGame {
    app: App;

    constructor(app: App) {
        this.app = app;
        this.initReceiver();
    }

    private initReceiver() {
        const app = this.app;

        this.app.group(435649543).receiver.on('message', (msg) => {
            const text = msg.rawMessage;

            if (/(^roll$|^roll \d+$)/.test(text)) this.roll(msg);
            if (/^分组 (\[CQ:at,qq=\d+\] )+/.test(text)) this.group(msg);
            if (/^抛硬币/.test(text)) this.coin(msg);
            if (/^猜拳/.test(text)) this.fingerGussing(msg);
        })
    }

    private roll(msg: Meta<'message'>) {
        const text = msg.rawMessage;
        const value = text.match(/\d+/);
        const maxValue = value ? Number(value[0]) : 100;

        const res = Math.ceil(Math.random() * maxValue);

        msg.$send(`[CQ:at,qq=${msg.sender.userId}] ${res}`)
    }

    private group(msg: Meta<'message'>) {
        const text = msg.rawMessage;
        const members = text.match(/\d+/g);

        if (members.length === 0) {
            msg.$send(`[CQ:at,qq=${msg.sender.userId}] 诶？人呢？人呢？人呢？`);
            return;
        }
        if (members.length === 1) {
            msg.$send(`[CQ:at,qq=${msg.sender.userId}] 孤独风中一匹狼 还分个jio分`)
            return;
        }

        const group1 = [];
        let group2 = [];

        const length = Math.ceil(members.length / 2);
        for (let i = 0; i < length; i++) {
            const member = members.splice(Math.floor(Math.random() * members.length), 1)[0];
            group1.push(member);
        }
        group2 = [...members];

        let res = '';

        res += 'A组：';
        group1.forEach(member => {
            res += `[CQ:at,qq=${member}] `;
        });

        res += '\r\nB组：';
        group2.forEach(member => {
            res += `[CQ:at,qq=${member}] `;
        });

        msg.$send(`${res}`);
    }

    private coin(msg: Meta<'message'>) {
        msg.$send(`[CQ:at,qq=${msg.sender.userId}] ${Math.random() < 0.5 ? '正面' : '反面'}`)
    }

    private fingerGussing(msg: Meta<'message'>) {
        const winMaps = {
            '布': '石头',
            '石头': '剪刀',
            '剪刀': '布'
        };
        const type = ['布', '石头', '剪刀'];
        const players: number[] = [];
        const text = msg.rawMessage;
        // this.app.group(msg.groupId).

        const orderPlayer = text.match(/\[CQ:at,qq=\d+\]/g);
        if (orderPlayer && orderPlayer.length > 0) {
            orderPlayer.forEach(item => {
                const playerId = Number(item.match(/\d+/)[0]);
                players.push(playerId);
            })
        }
        else {
            players.push(msg.sender.userId);
        }

        if (players.length === 1) {
            const playerRes = type[Math.floor(Math.random() * 3)];
            msg.$send(`[CQ:at,qq=${msg.sender.userId}] ${playerRes}`);
        }
        else {
            const res = players.map(player => type[Math.floor(Math.random() * 3)]);
            const typeCheck = Array.from(new Set(res));
            const resString = res.reduce((prev, cur, cin) => {
                if (cin === 0) return `[CQ:at,qq=${players[cin]}] 的猜拳结果为：${cur}`;
                else return prev + '\r\n' + `[CQ:at,qq=${players[cin]}] 的猜拳结果为：${cur}`;
            }, '')

            if (typeCheck.length === 1) msg.$send(`${resString}\r\n 平手！这局比赛莫得胜负！`)
            else if (typeCheck.length === 3) msg.$send(`${resString}\r\n 平手！这局比赛莫得胜负！`)
            else if (typeCheck.length === 2) {
                let winType: string;
                for (let item of res) {
                    if (res.includes(winMaps[item])) {
                        winType = item;
                        break;
                    }
                }

                let winners = '';
                res.forEach((item, index) => {
                    if (item === winType) {
                        winners += `[CQ:at,qq=${players[index]}] `;
                    }
                });

                msg.$send(`${resString}\r\n${winners} 胜出，其他人被淘汰！`)
            }
        }
    }
}