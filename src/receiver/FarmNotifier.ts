import { App, Meta } from 'koishi';
import datastore from '../nedb/Nedb';
import { convertCompilerOptionsFromJson, createTextChangeRange } from 'typescript';
const dayjs = require('dayjs');

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

            if (text === 'farm') this.setFarmDate(msg);
            if (/^yc \d+[.\d*]*(ms|s|sec|secs|second|seconds|h|hour|hours|m|min|mins)/.test(text)) this.delayNotify(msg);
            if (/^\[CQ:at,qq=2622692056\] cancel/.test(text)) this.cancelNotify(msg);
        })

        this.checkNotify();
    }


    // business function
    private async cancelNotify(msg: Meta<'message'>) {
        const qqId = msg.sender.userId;
        const groupId = msg.groupId;

        const textArray = msg.rawMessage.split(' ');
        const desc = textArray.length === 3 ? textArray[2] : '';

        await datastore.remove({ qqId: qqId, groupId: groupId, desc });
        msg.$send(`[CQ:at,qq=${qqId}] 已取消提醒${desc}`)
    }

    private async checkNotify() {
        console.log(await datastore.find({}).exec());
        setInterval(async () => {
            const now = Number(Date.now());
            const data = await datastore.find({}).exec();
            if (!data) return;
            console.log(data);

            data.forEach((item: NotifyData) => {
                if (item.notifyDate <= now && !item.isNotified) {
                    this.app.sender.sendGroupMsg(item.groupId, `[CQ:at,qq=${item.qqId}] \r\n够钟${item.desc}辣！`)
                    console.log('should remove:' + item.desc);
                    datastore.remove({ qqId: item.qqId, groupId: item.groupId, desc: item.desc });
                    // datastore.update(
                    //     { qqId: item.qqId, groupId: item.groupId, desc: item.desc },
                    //     { qqId: item.qqId, groupId: item.groupId, notifyDate: item.notifyDate, desc: item.desc, isNotified: true }
                    // )
                }
                if (item.isNotified) {
                    datastore.remove({ qqId: item.qqId, groupId: item.groupId, desc: item.desc });
                }
            })
        }, 1 * 1000);
    }

    private async delayNotify(msg: Meta<'message'>) {
        const qqId = msg.sender.userId;
        const groupId = msg.groupId;

        const now = Number(Date.now());
        const text = msg.rawMessage;

        const textArray = text.split(' ');
        const delayTime = textArray[1];
        const desc = textArray[2] ? textArray[2] : '';

        const delayTimeValueMatch = delayTime.match(/^\d+[.\d*]*/);
        const delayTimeValue = delayTimeValueMatch ? Number(delayTimeValueMatch[0]) : 0;

        const notifyItem: NotifyData = await datastore.findOne({ qqId, groupId, desc });
        console.log(delayTimeValueMatch);
        console.log(delayTimeValue);

        let notifyDate;
        if (notifyItem && !notifyItem.isNotified) {
            if (/(h|hour|hours)/.test(delayTime)) notifyDate = notifyItem.notifyDate + delayTimeValue * 60 * 60 * 1000;
            else if (/ms/.test(delayTime)) notifyDate = notifyItem.notifyDate + delayTimeValue;
            else if (/(s|sec|secs|second|seconds)/.test(delayTime)) notifyDate = notifyItem.notifyDate + delayTimeValue * 1000;
            else notifyDate = notifyItem.notifyDate + delayTimeValue * 60 * 1000;
        }
        else {
            if (/(h|hour|hours)/.test(delayTime)) notifyDate = now + delayTimeValue * 60 * 60 * 1000;
            else if (/ms/.test(delayTime)) notifyDate = now + delayTimeValue;
            else if (/(s|sec|secs|second|seconds)/.test(delayTime)) notifyDate = now + delayTimeValue * 1000;
            else notifyDate = now + delayTimeValue * 60 * 1000;
        }

        await datastore.update(
            { qqId: qqId, groupId: groupId, desc },
            { qqId: qqId, groupId: groupId, notifyDate, isNotified: false, desc },
            { upsert: true }
        )

        const formatDate = dayjs(notifyDate).format('YYYY-MM-DD HH:mm:ss');
        msg.$send(`[CQ:at,qq=${qqId}] ${desc} 提醒已推延至${formatDate}`)
    }

    private async setFarmDate(msg: Meta<'message'>) {
        const qqId = msg.sender.userId;
        const groupId = msg.groupId;
        const now = Number(Date.now());
        // const nextNotifyDate = now + 60 * 1000;
        const nextNotifyDate = now + 8 * 60 * 60 * 1000;

        const desc = '';

        const lastNotifyDateData: NotifyData = await datastore.findOne({
            qqId,
            groupId,
            desc
        });

        if (lastNotifyDateData) {
            const lastNotifyDate = lastNotifyDateData.notifyDate;
            await datastore.update({ qqId, groupId, desc }, { qqId, groupId, notifyDate: nextNotifyDate, isNotified: false, desc });
        }
        else {
            await datastore.insert({ qqId, groupId, notifyDate: nextNotifyDate, isNotified: false, desc });
        }

        const formatDate = dayjs(nextNotifyDate).format('YYYY-MM-DD HH:mm:ss');
        await msg.$send(`[CQ:at,qq=${qqId}] Mark 下次提醒时间为${formatDate}`);
    }

    // function tools
    private listenToGroupMemeber(group: GroupId, users: UserId[], callback: Cb) {
        this.app.group(group).receiver.on('message', (msg) => {
            if (users.includes(msg?.sender?.userId)) {
                callback(msg);
            }
        })
    }

}

type UserId = number;
type GroupId = number;
type Cb = Function;

interface NotifyData {
    qqId: number;
    groupId: number;
    notifyDate: number;
    isNotified: boolean;
    desc: string;
}