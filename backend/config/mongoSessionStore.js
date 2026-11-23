import session from 'express-session';
import { getDatabase } from './db.js';

export class MongoSessionStore extends session.Store {
  constructor(options={}){super();this.collection=getDatabase().collection('sessions');this.defaultMaxAge=options.maxAge||12*60*60*1000;}
  get(sid,callback){this.collection.findOne({_id:sid,expireAt:{$gt:new Date()}}).then(doc=>callback(null,doc?.session||null)).catch(callback);}
  set(sid,value,callback=()=>{}){const expireAt=value.cookie?.expires?new Date(value.cookie.expires):new Date(Date.now()+(value.cookie?.maxAge||this.defaultMaxAge));this.collection.replaceOne({_id:sid},{_id:sid,session:value,expireAt},{upsert:true}).then(()=>callback()).catch(callback);}
  touch(sid,value,callback=()=>{}){const expireAt=value.cookie?.expires?new Date(value.cookie.expires):new Date(Date.now()+(value.cookie?.maxAge||this.defaultMaxAge));this.collection.updateOne({_id:sid},{$set:{expireAt,'session.cookie':value.cookie}}).then(()=>callback()).catch(callback);}
  destroy(sid,callback=()=>{}){this.collection.deleteOne({_id:sid}).then(()=>callback()).catch(callback);}
}
