import { pointStore, PointStore } from "../nedb/Nedb";

export class PointService {
    async getPoint(userData: { qqId: number, groupId: number }) {
        try {
            const pointData: PointStore = await pointStore.findOne({ qq_id: userData.qqId, group_Id: userData.groupId });
            if (!pointData) {
                await this.initPoint(userData);
                return 100;
            }
            else {
                return pointData.point;
            }
        }
        catch (err) {
            console.error(err);
            return -1;
        }
    }

    async setPoint(pointData: { qqId: number, groupId: number, point: number }) {
        try {
            await pointStore.update({ qq_id: pointData.qqId, group_id: pointData.groupId, point: pointData.point }, { upsert: true });
            return true;
        }
        catch (err) {
            console.error(err);
            return false;
        }
    }

    async deltaPoint(toSetData: { qqId: number, groupId: number, delta: number }) {
        const userData = { qqId: toSetData.qqId, groupId: toSetData.groupId };
        let point = -1;

        try {
            let pointData: PointStore = await pointStore.find({ qq_id: toSetData.qqId, group_id: toSetData.groupId }).exec();
            if (!pointData) {
                await this.initPoint(userData);
                pointData = await pointStore.find({ qq_id: toSetData.qqId, group_id: toSetData.groupId }).exec();
            }
            const newPoint = pointData.point + toSetData.delta;
            await this.setPoint({ ...userData, point: newPoint });
        }
        catch (err) {
            console.error(err);
            return point;
        }
    }

    async initPoint(userData: { qqId: number, groupId: number }) {
        try {
            await pointStore.insert({ qq_id: userData.qqId, group_id: userData.groupId, point: 100 });
        }
        catch (err) {
            throw err;
        }
    }
}