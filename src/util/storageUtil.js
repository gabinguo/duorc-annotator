var engine = require('store/src/store-engine')
var storages = [
    require('store/storages/localStorage'),
    require('store/storages/cookieStorage')
]
var plugins = [
    require('store/plugins/defaults'),
    require('store/plugins/expire')
]
var store = engine.createStore(storages, plugins)

const TMP_KEY = "tmp_key";

// eslint-disable-next-line
export default {
    saveTmpKey(info){
        store.set(TMP_KEY, info[TMP_KEY], new Date().getTime() + 1000 * 3600 * 24 * 7) // expire in 24 hrs * 7
    },
    getTmpKey(){
        return store.get(TMP_KEY) || null
    },
    removeTmpKey(){
        store.remove(TMP_KEY)
    },
}