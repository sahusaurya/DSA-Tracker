-- 'bundle' was a second grouping kind that behaved exactly like 'topic'. One
-- grouping concept is easier to explain, so existing bundles become topics.
UPDATE `nodes` SET `kind` = 'topic' WHERE `kind` = 'bundle';
