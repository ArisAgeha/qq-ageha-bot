const Datastore = require('nedb-promises')
const datastore = Datastore.create('./notifier.db')
const screenshotStore = Datastore.create('./screenshots-alias.db')

export { datastore, screenshotStore };