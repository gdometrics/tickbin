export default sync

function sync (db, remote) {
  if (!db) throw new Error('Please provide a couchdb instance')
  if (!remote) throw new Error('Please provide a remote destination')

}

class TickSyncer {
  constructor (db, remote) {
    this.db = db
    this.remote = remote
    this._promiseLastSync = this.getLastSync()
  }

  getLastSync() {
    const lastSync = {
      _id: '_local/last_sync',
      push: { last_seq: null },
      pull: { last_seq: null } 
    }

    return this.db.get(lastSync._id)
    .then(doc => doc, () => {
      return this.db.put(lastSync).then(() => this.db.get(lastSync._id))  
    })
  }

  sync() {
    return this._promiseLastSync.then(last_sync => {
      const opts = {
        push: { since: last_sync.push.last_seq },
        pull: { since: last_sync.pull.last_seq }
      }
      const sync = this.db.sync(this.remote, opts)
      sync.on('complete', this.updateLastSync.bind(this))
      // sync is a promise AND an event emitter. Since we are returning
      // it within a promise, only the resolved value will be
      // available to anything that calls sync(), not the event emitter itself
      return sync
    })
  }

  updateLastSync(info) {
    return this._promiseLastSync.then((last_sync) => {
      last_sync.push.last_seq = info.push.last_seq
      last_sync.pull.last_seq = info.pull.last_seq
      return this.db.put(last_sync)
    })
  }

}
