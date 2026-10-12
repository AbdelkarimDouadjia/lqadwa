CREATE TABLE service_controls (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  requests_paused INTEGER NOT NULL DEFAULT 0 CHECK (requests_paused IN (0,1)),
  pickups_paused INTEGER NOT NULL DEFAULT 0 CHECK (pickups_paused IN (0,1)),
  message TEXT NOT NULL DEFAULT '',
  updated INTEGER NOT NULL DEFAULT 0
);
INSERT INTO service_controls (id) VALUES (1);
CREATE TABLE request_controls (
  request TEXT PRIMARY KEY REFERENCES requests(id) ON DELETE CASCADE,
  stopped INTEGER NOT NULL DEFAULT 1 CHECK (stopped = 1)
);
-- Enforce stops inside the write transaction, including in-flight and older clients.
CREATE TRIGGER service_request_guard BEFORE INSERT ON requests
WHEN (SELECT requests_paused FROM service_controls WHERE id = 1) = 1
BEGIN SELECT RAISE(ABORT, 'Availability requests paused'); END;
CREATE TRIGGER service_reservation_guard BEFORE INSERT ON reservations
WHEN (SELECT requests_paused FROM service_controls WHERE id = 1) = 1
  OR EXISTS (SELECT 1 FROM request_controls WHERE request = NEW.request)
BEGIN SELECT RAISE(ABORT, 'Reservations paused or request stopped'); END;
CREATE TRIGGER stopped_reply_guard BEFORE UPDATE OF status ON responses
WHEN NEW.status = 'yes' AND EXISTS (SELECT 1 FROM request_controls WHERE request = NEW.request)
BEGIN SELECT RAISE(ABORT, 'Request stopped'); END;
CREATE TRIGGER service_pickup_guard BEFORE UPDATE OF status ON reservations
WHEN NEW.status = 'collected' AND (SELECT pickups_paused FROM service_controls WHERE id = 1) = 1
BEGIN SELECT RAISE(ABORT, 'Pickup confirmation paused'); END;
