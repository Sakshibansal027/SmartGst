import test from 'node:test';
import assert from 'node:assert/strict';
import { seedOrClaimBusinessData } from '../controllers/authController.js';

// Previously the first account to register adopted every document that had no
// owner, which on a shared instance meant one user silently inheriting another
// deployment's records. Claiming is now opt-in, so both branches are pinned
// here. The database is stubbed because the suite runs without MongoDB.

function stubDb({invoices = [], tasks = []} = {}) {
  const calls = { insertMany: [], updateMany: [], updateOne: [] };
  const collection = (name, rows) => {
    const store = rows.slice();
    return {
      countDocuments: async filter => store.filter(row => Object.entries(filter ?? {}).every(([field, value]) => row[field] === value)).length,
      find: () => ({ toArray: async () => store.filter(row => row.userId === undefined) }),
      insertMany: async docs => { calls.insertMany.push({ name, count: docs.length, docs }); store.push(...docs); },
      updateMany: async (filter, update) => { calls.updateMany.push({ name, filter, update }); },
      updateOne: async (filter, update) => { calls.updateOne.push({ name, filter, update }); }
    };
  };
  return {
    calls,
    collection: name => collection(name, name === 'invoices' ? invoices : name === 'tasks' ? tasks : [])
  };
}

const newUser = { _id: 'user-new', state: 'Maharashtra' };

test('with claiming off, ownerless records are left alone and samples are seeded', async () => {
  // This is the important behavioural change: an existing unowned record must
  // stay unowned rather than being absorbed by whoever registers next.
  const db = stubDb({
    invoices: [{ id: 1, kind: 'sale', number: 'LEGACY-1', userId: undefined }],
    tasks: [{ id: 1, title: 'Legacy reminder', due: '2026-12-01', userId: undefined }]
  });

  await seedOrClaimBusinessData(newUser, { db, claim: false });

  assert.deepEqual(db.calls.updateMany, [], 'no record may be reassigned when claiming is off');
  const invoiceSeed = db.calls.insertMany.find(call => call.name === 'invoices');
  const taskSeed = db.calls.insertMany.find(call => call.name === 'tasks');
  assert.ok(invoiceSeed, 'a new account still receives sample invoices');
  assert.equal(invoiceSeed.count, 6);
  assert.ok(taskSeed, 'a new account still receives sample reminders');
  assert.equal(taskSeed.count, 3);
  assert.ok(invoiceSeed.docs.every(doc => doc.userId === 'user-new'), 'seeded records belong to the new account');
});

test('with claiming on, ownerless records are adopted and no samples are added', async () => {
  const db = stubDb({
    invoices: [
      { id: 4, kind: 'sale', number: 'LEGACY-4', userId: undefined },
      { id: 7, kind: 'purchase', number: 'LEGACY-7', userId: undefined }
    ],
    tasks: [{ id: 2, title: 'Legacy reminder', due: '2026-12-01', userId: undefined }]
  });

  await seedOrClaimBusinessData(newUser, { db, claim: true });

  const adoptedInvoices = db.calls.updateMany.find(call => call.name === 'invoices');
  const adoptedTasks = db.calls.updateMany.find(call => call.name === 'tasks');
  assert.ok(adoptedInvoices, 'ownerless invoices should be assigned to the new account');
  assert.deepEqual(adoptedInvoices.filter, { userId: { $exists: false } });
  assert.deepEqual(adoptedInvoices.update, { $set: { userId: 'user-new' } });
  assert.ok(adoptedTasks, 'ownerless reminders should be assigned too');

  assert.deepEqual(db.calls.insertMany, [], 'adopted data replaces the samples, it does not add to them');
});

test('seeding bumps the shared counters so new ids do not collide with legacy ones', async () => {
  const db = stubDb({
    invoices: [{ id: 41, kind: 'sale', number: 'LEGACY-41', userId: undefined }]
  });

  await seedOrClaimBusinessData(newUser, { db, claim: true });

  const invoiceCounter = db.calls.updateOne.find(call => call.name === 'counters' && call.filter._id === 'invoice');
  assert.ok(invoiceCounter, 'the invoice counter should be raised past the adopted ids');
  assert.equal(invoiceCounter.update.$max.seq, 41);
});

test('an account that already owns records is left completely alone', async () => {
  const db = stubDb({
    invoices: [{ id: 1, kind: 'sale', number: 'OWN-1', userId: 'user-new' }],
    tasks: [{ id: 1, title: 'Mine', due: '2026-12-01', userId: 'user-new' }]
  });

  await seedOrClaimBusinessData(newUser, { db, claim: true });

  assert.deepEqual(db.calls.insertMany, [], 'an existing account is not reseeded on every sign-up');
  assert.deepEqual(db.calls.updateMany, []);
});

test('the default is taken from config, which stays off unless the flag is set', async () => {
  const { config } = await import('../config/env.js');
  assert.equal(config.claimLegacyData, false, 'claiming legacy data must be opt-in');
});
