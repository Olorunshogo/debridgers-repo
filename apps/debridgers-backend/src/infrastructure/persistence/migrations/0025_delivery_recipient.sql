-- Who actually took delivery.
--
-- The verify endpoint has always accepted `recipient_name` and the service has
-- always declared it, but nothing wrote it anywhere, so it was collected and
-- discarded. The frontend compounded this by sending the buyer's own name
-- regardless of who was standing at the gate, which is precisely the detail
-- proof of delivery exists to record.

ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_recipient_name text;
