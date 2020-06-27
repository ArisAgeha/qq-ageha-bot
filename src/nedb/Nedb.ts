const Datastore = require('nedb-promises')
const datastore = Datastore.create('./qqbot-nedb.db')

export default datastore;