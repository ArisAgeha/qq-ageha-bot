import { ClockStore, clockStore } from "../nedb/Nedb";
import { format } from "path";
const dayjs = require('dayjs');

export class ClockService {
    async getClockInfos(belongData: { qqId: number, groupId: number }) {
        const { qqId, groupId } = belongData;
        const clocks: ClockStore[] = await clockStore.find({ qq_id: qqId, group_id: groupId }).exec();

        if (clocks.length === 0) {
            return false;
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
            return res;
        }
    }

    async getGroupClockInfos(belongData: { qqId: number, groupId: number }) {
        const { qqId, groupId } = belongData;
        const clocks: ClockStore[] = groupId ? await clockStore.find({ group_id: groupId }) : await clockStore.find({ group_id: groupId, qq_id: qqId });

        if (clocks.length === 0) {
            return false;
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
            return res;
        }
    }

    async cancelClock(clockInfo: { qqId: number, groupId: number, desc: string }) {
        const { qqId, groupId, desc } = clockInfo;
        try {
            await clockStore.remove({ qq_id: qqId, group_id: groupId, desc });
            return true;
        }
        catch (err) {
            console.error(err);
            return false;
        }
    }

    async delayClock(info: { qqId: number, groupId: number, desc: string, delayTime: string }) {
        const { qqId, groupId, desc, delayTime } = info;
        const now = Number(Date.now());

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

        const formatDate = dayjs(notifyDate).format('YYYY-MM-DD HH:mm:ss')
        return formatDate;
    }

    async setFarmClock(belongData: { qqId: number, groupId: number }) {
        const { qqId, groupId } = belongData;
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
        return formatDate;
    }
}