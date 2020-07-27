const Datastore = require('nedb-promises')
const clockStore = Datastore.create('./notifier.db')
const screenshotStore = Datastore.create('./screenshots-alias.db')
const pointStore = Datastore.create('./point.db')
const userSettingsStore = Datastore.create('./user-settings.db')

export { clockStore, screenshotStore, pointStore, userSettingsStore };

export interface ClockStore {
    qq_id: number;
    group_id: number;
    desc: string;
    is_notifier: boolean;
    notify_date: number;
}

export interface ScreenshotStore {
    belong_id: number;
    name: string;
    src: string;
}

export interface PointStore {
    qq_id: number;
    group_id: number;
    point: number;
}

export interface UserSettingsStore {
    qq_id: number;
    group_id: number;
    rdp_size: number; // the size of random picture
}