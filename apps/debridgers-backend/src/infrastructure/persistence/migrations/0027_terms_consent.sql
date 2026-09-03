-- What the account holder agreed to, and when.
--
-- Consent was collected at signup and thrown away, which proves nothing after
-- the fact. Three columns rather than a flag: each role signs a different
-- document, so the role alone does not identify the text, and without the
-- version a later revision cannot be told apart from the one that was shown.
--
-- Nullable on purpose. Every account created before this migration consented to
-- nothing that was recorded, and writing a default would manufacture a consent
-- record for people who never saw the document.

ALTER TABLE users ADD COLUMN IF NOT EXISTS terms_accepted_at timestamp;
ALTER TABLE users ADD COLUMN IF NOT EXISTS terms_document varchar(64);
ALTER TABLE users ADD COLUMN IF NOT EXISTS terms_version varchar(32);
