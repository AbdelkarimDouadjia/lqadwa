import assert from 'node:assert/strict';
import { workspaceNavigation, workspaceView, canSubmitPharmacy } from '../lib/workspace.ts';

const views = ['search', 'bookings', 'map', 'account', 'pharmacy', 'admin'];
assert.deepEqual(workspaceNavigation('client'), ['search', 'bookings', 'map', 'account']);
assert.deepEqual(workspaceNavigation('pharmacist'), ['pharmacy', 'account']);
assert.deepEqual(workspaceNavigation('admin'), ['admin', 'account']);
for (const role of ['client', 'pharmacist', 'admin']) {
  for (const view of views) {
    assert(['search', 'pharmacy'].includes(workspaceView(view, role, true)), 'Guests only see onboarding');
    const resolved = workspaceView(view, role, false);
    assert(workspaceNavigation(role).includes(resolved) || role === 'client' && resolved === 'pharmacy');
    if (role !== 'admin') assert.notEqual(resolved, 'admin', 'A pasted hash must not expose operations');
  }
}
assert.equal(workspaceView('search', 'pharmacist', false), 'pharmacy', 'Returning pharmacies land in their work queue');
assert.equal(workspaceView('pharmacy', 'client', false), 'pharmacy', 'Client can deliberately apply, without a pharmacy tab');
assert(canSubmitPharmacy()); assert(canSubmitPharmacy('rejected'));
for (const status of ['pending', 'approved', 'suspended', 'unknown']) assert(!canSubmitPharmacy(status));
console.log('PASS: guest/client/pharmacy/admin navigation matrix and pharmacy onboarding state transitions.');
