import { App, Meta } from 'koishi';
import { clockStore, ClockStore } from '../nedb/Nedb';
import { group } from 'console';
const dayjs = require('dayjs');

export class Clock {
    app: App;

    constructor(app: App) {
        this.app = app;
        this.initReceiver();
    }

    private initReceiver() {
        this.app.receiver.on('message', (msg) => {
            const text = msg.rawMessage;

            if (text === 'farm') this.setFarmDate(msg);
            if (text === 'show clock') this.showClock(msg);
            if (text === 'show all clock') this.showAllClock(msg);
            if (/^yc \d+[.\d*]*(ms|s|sec|secs|second|seconds|h|hour|hours|m|min|mins)/.test(text)) this.delayNotify(msg);
            if (/^\cancel clock/.test(text)) this.cancelNotify(msg);
        })

        this.checkNotify();
    }


    // business function
    private async showClock(msg: Meta<'message'>) {
        const qqId = msg.sender.userId;
        const groupId = msg.groupId || 0;

        const clocks: ClockStore[] = await clockStore.find({ qq_id: qqId, group_id: groupId }).exec();
        if (clocks.length === 0) {
            msg.$send(`[CQ:at,qq=${qqId}] 您还未调闹钟`);
            return;
        }
        else {
            const prefix = `[CQ:at,qq=${qqId}]\r\n`
            const content = clocks
                .sort((a, b) => {
                    return a.notify_date - b.notify_date
                })
                .map((item, index) => {
                    const formatDate = dayjs(item.notify_date).format('YYYY-MM-DD HH:mm:ss');
                    return `[${index + 1}] ${item.desc ? item.desc : '默认闹钟'}: ${formatDate} \r\n`;
                })
                .reduce((prev, cur) => {
                    return prev + cur;
                }, '');
            const res = prefix + content;
            msg.$send(res);
        }
    }

    private async showAllClock(msg: Meta<'message'>) {
        const qqId = msg.sender.userId;
        const groupId = msg.groupId || 0;

        const clocks: ClockStore[] = groupId ? await clockStore.find({ group_id: groupId }) : await clockStore.find({ group_id: groupId, qq_id: qqId });
        if (clocks.length === 0) {
            msg.$send(`未设置闹钟`);
            return;
        }
        else {
            let curId = -1;
            let curIndex = 1;
            const content = clocks
                .sort((a, b) => {
                    return a.notify_date - b.notify_date
                })
                .map((item, index) => {
                    let text = '';
                    if (item.qq_id !== curId) {
                        curId = item.qq_id;
                        curIndex = 1;
                        text += `======= [CQ:at,qq=${item.qq_id}] =======\r\n`;
                    }

                    const formatDate = dayjs(item.notify_date).format('YYYY-MM-DD HH:mm:ss');
                    text += `[${curIndex++}] ${item.desc ? item.desc : '默认闹钟'}: ${formatDate} \r\n`;

                    return text;
                })
                .reduce((prev, cur) => {
                    return prev + cur;
                }, '');
            const res = content;
            msg.$send(res);
        }
    }

    private async cancelNotify(msg: Meta<'message'>) {
        const qqId = msg.sender.userId;
        const groupId = msg.groupId || 0;

        const textArray = msg.rawMessage.split(' ');
        const desc = textArray.length === 3 ? textArray[2] : '';

        await clockStore.remove({ qq_id: qqId, group_id: groupId, desc });
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

        const now = Number(Date.now());
        const text = msg.rawMessage;

        const textArray = text.split(' ');
        const delayTime = textArray[1];
        const desc = textArray[2] ? textArray[2] : '';

        const delayTimeValueMatch = delayTime.match(/^\d+[.\d*]*/);
        const delayTimeValue = delayTimeValueMatch ? Number(delayTimeValueMatch[0]) : 0;

        const notifyItem: ClockStore = await clockStore.findOne({ qq_id: qqId, group_id: groupId, desc });

        let notifyDate;
        if (notifyItem && !notifyItem.is_notifier) {
            if (/(h|hour|hours)/.test(delayTime)) notifyDate = notifyItem.notify_date + delayTimeValue * 60 * 60 * 1000;
            else if (/ms/.test(delayTime)) notifyDate = notifyItem.notify_date + delayTimeValue;
            else if (/(s|sec|secs|second|seconds)/.test(delayTime)) notifyDate = notifyItem.notify_date + delayTimeValue * 1000;
            else notifyDate = notifyItem.notify_date + delayTimeValue * 60 * 1000;
        }
        else {
            if (/(h|hour|hours)/.test(delayTime)) notifyDate = now + delayTimeValue * 60 * 60 * 1000;
            else if (/ms/.test(delayTime)) notifyDate = now + delayTimeValue;
            else if (/(s|sec|secs|second|seconds)/.test(delayTime)) notifyDate = now + delayTimeValue * 1000;
            else notifyDate = now + delayTimeValue * 60 * 1000;
        }

        await clockStore.update(
            { qq_id: qqId, group_id: groupId, desc },
            { qq_id: qqId, group_id: groupId, notify_date: notifyDate, is_notified: false, desc },
            { upsert: true }
        )

        const formatDate = dayjs(notifyDate).format('YYYY-MM-DD HH:mm:ss');
        msg.$send(`[CQ:at,qq=${qqId}] ${desc} 提醒已推延至${formatDate}`)
    }

    private async setFarmDate(msg: Meta<'message'>) {
        const qqId = msg.sender.userId;
        const groupId = msg.groupId || 0;
        const now = Number(Date.now());
        // const nextNotifyDate = now + 60 * 1000;
        const nextNotifyDate = now + 8 * 60 * 60 * 1000;

        const desc = '';

        const lastNotifyDateData: ClockStore = await clockStore.findOne({
            qq_id: qqId,
            group_id: groupId,
            desc
        });

        if (lastNotifyDateData) {
            await clockStore.update({ qq_id: qqId, group_id: groupId, desc }, { qq_id: qqId, group_id: groupId, notify_date: nextNotifyDate, is_notified: false, desc });
        }
        else {
            await clockStore.insert({ qq_id: qqId, group_id: groupId, notify_date: nextNotifyDate, is_notified: false, desc });
        }

        const formatDate = dayjs(nextNotifyDate).format('YYYY-MM-DD HH:mm:ss');
        await msg.$send(`[CQ:at,qq=${qqId}] Mark 下次提醒时间为${formatDate}`);
    }
}