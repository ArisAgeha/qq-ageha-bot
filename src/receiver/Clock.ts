import { App, Meta } from 'koishi';
import { clockStore, ClockStore } from '../nedb/Nedb';
import { group } from 'console';
import { ClockService } from '../Service/ClockService';
const dayjs = require('dayjs');

export class Clock {
    app: App;
    clockService: ClockService;

    constructor(app: App) {
        this.app = app;
        this.clockService = new ClockService();
        this.initReceiver();
    }

    private initReceiver() {
        this.app.receiver.on('message', (msg) => {
            const text = msg.rawMessage;

            if (text === 'farm') this.setFarmDate(msg);
            if (text === 'show clock') this.showClock(msg);
            if (text === 'show all clock') this.showAllClock(msg);
            if (/^yc \d+[.\d*]*(ms|s|sec|secs|second|seconds|h|hour|hours|m|min|mins)/.test(text)) this.delayNotify(msg);
            if (/^\cancel clock/.test(text)) this.cancelClock(msg);
        })

        this.checkNotify();
    }


    // business function
    private async showClock(msg: Meta<'message'>) {
        const qqId = msg.sender.userId;
        const groupId = msg.groupId || 0;

        const clockInfos = await this.clockService.getClockInfos({ qqId, groupId });
        if (!clockInfos) {
            msg.$send(`[CQ:at,qq=${qqId}] 您还未调闹钟`);
            return;
        }
        else {
            msg.$send(clockInfos);
        }
    }

    private async showAllClock(msg: Meta<'message'>) {
        const qqId = msg.sender.userId;
        const groupId = msg.groupId || 0;

        const clockInfos = await this.clockService.getGroupClockInfos({ qqId, groupId });
        if (!clockInfos) {
            msg.$send(`未找到闹钟`);
            return;
        }
        else {
            msg.$send(clockInfos);
        }
    }

    private async cancelClock(msg: Meta<'message'>) {
        const qqId = msg.sender.userId;
        const groupId = msg.groupId || 0;

        const textArray = msg.rawMessage.split(' ');
        const desc = textArray.length === 3 ? textArray[2] : '';

        this.clockService.cancelClock({ qqId, groupId, desc });
        msg.$send(`[CQ:at,qq=${qqId}] 已取消提醒${desc}`)
    }

    private async checkNotify() {
        setInterval(async () => {
            const now = Number(Date.now());
            const data: ClockStore[] = await clockStore.find({}).exec();
            if (!data) return;

            data.forEach((item) => {
                const qqId = item.qq_id;
                const groupId = item.group_id || 0;

                if (item.notify_date <= now && !item.is_notifier) {
                    const msg = `[CQ:at,qq=${item.qq_id}] [${item.desc}] 够钟辣！`;

                    if (groupId) this.app.sender.sendGroupMsg(groupId, msg)
                    else this.app.sender.sendPrivateMsg(qqId, msg)
                    clockStore.remove({ qq_id: qqId, group_id: groupId, desc: item.desc });
                    clockStore.remove({})
                }
                if (item.is_notifier) {
                    clockStore.remove({ qq_id: qqId, group_id: groupId, desc: item.desc });
                }
            })
        }, 1 * 1000);
    }

    private async delayNotify(msg: Meta<'message'>) {
        const qqId = msg.sender.userId;
        const groupId = msg.groupId || 0;

        const text = msg.rawMessage;
        const textArray = text.split(' ');
        const delayTime = textArray[1];
        const desc = textArray[2] ? textArray[2] : ''

        const formatDate = await this.clockService.delayClock({ groupId, qqId, desc, delayTime });

        msg.$send(`[CQ:at,qq=${qqId}] ${desc} 提醒已推延至${formatDate}`)
    }

    private async setFarmDate(msg: Meta<'message'>) {
        const qqId = msg.sender.userId;
        const groupId = msg.groupId || 0;

        const formatDate = this.clockService.setFarmClock({ qqId, groupId });
        await msg.$send(`[CQ:at,qq=${qqId}] Mark 下次提醒时间为${formatDate}`);
    }
}