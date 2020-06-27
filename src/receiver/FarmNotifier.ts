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

        this.listenToGroupMemeber(435649543, [87725092, 530126639], async (msg: Meta<'message'>) => {
            const text = msg.rawMessage;
            console.log(msg);

            if (text === 'farm') this.setFarmDate(msg);
            if (/^yc \d+(h|hour|hours|m|min|mins)$/.test(text)) this.delayNotify(msg);
            if (/^\[CQ:at,qq=2622692056\] cancel$/.test(text)) this.cancelNotify(msg);
        })

        this.checkNotify();
    }


    // business function
    private async cancelNotify(msg: Meta<'message'>) {
        const qqId = msg.sender.userId;
        const groupId = msg.groupId;

        await datastore.remove({ qqId: qqId, groupId: groupId });
        msg.$send(`[CQ:at,qq=${qqId}] 已取消 是个好地主`)
    }

    private checkNotify() {
        setInterval(async () => {
            const now = Number(Date.now());
            const data = await datastore.find({}).exec();
            if (!data) return;

            data.forEach((item: NotifyData) => {
                if (item.notifyDate <= now && !item.isNotified) {
                    this.app.sender.sendGroupMsg(item.groupId, `[CQ:at,qq=${item.qqId}] 够钟上线辣`)
                    datastore.update(
                        { qqId: item.qqId, groupId: item.groupId },
                        { qqId: item.qqId, groupId: item.groupId, notifyDate: item.notifyDate, isNotified: true }
                    )
                }
            })
        }, 30 * 1000);
    }

    private async delayNotify(msg: Meta<'message'>) {
        const qqId = msg.sender.userId;
        const groupId = msg.groupId;

        const now = Number(Date.now());
        const text = msg.rawMessage;
        const delayTimeValue = Number(text.match(/\d+/)[0]);

        const notifyItem: NotifyData = await datastore.findOne({ qqId, groupId });

        let notifyDate;
        if (notifyItem && !notifyItem.isNotified) {
            if (/(h|hour|hours)/.test(text)) notifyDate = notifyItem.notifyDate + delayTimeValue * 60 * 60 * 1000;
            else notifyDate = notifyItem.notifyDate + delayTimeValue * 60 * 1000;
        }
        else {
            if (/(h|hour|hours)/.test(text)) notifyDate = now + delayTimeValue * 60 * 60 * 1000;
            else notifyDate = now + delayTimeValue * 60 * 1000;
        }

        await datastore.update(
            { qqId: qqId, groupId: groupId },
            { qqId: qqId, groupId: groupId, notifyDate, isNotified: false },
            { upsert: true }
        )

        const formatDate = dayjs(notifyDate).format('MM-DD HH:mm:ss');
        msg.$send(`[CQ:at,qq=${qqId}] 已推延 下次提醒时间为${formatDate}`)
    }

    private async setFarmDate(msg: Meta<'message'>) {
        const qqId = msg.sender.userId;
        const groupId = msg.groupId;
        const now = Number(Date.now());
        const nextNotifyDate = now + 60 * 1000;
        // const nextNotifyDate = now + 8 * 60 * 60 * 1000;

        const lastNotifyDateData: NotifyData = await datastore.findOne({
            qqId,
            groupId
        });

        console.log(lastNotifyDateData);

        if (lastNotifyDateData) {
            const lastNotifyDate = lastNotifyDateData.notifyDate;
            await datastore.update({ qqId, groupId }, { qqId, groupId, notifyDate: nextNotifyDate, isNotified: false });
            if (now < lastNotifyDate) msg.$send(`懂了 你8小时内可以连发请求？`);
        }
        else {
            await datastore.insert({ qqId, groupId, notifyDate: nextNotifyDate, isNotified: false });
        }

        const formatDate = dayjs(nextNotifyDate).format('MM-DD HH:mm:ss');
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
}