-- Session revocation (L4): the version is signed into the cookie; bumping it revokes all sessions.
ALTER TABLE "Player" ADD COLUMN "sessionVersion" INTEGER NOT NULL DEFAULT 0;

-- Leader attribution and leader-entered free text move out of public summaries (M3, M4).
ALTER TABLE "ClanActivity" ADD COLUMN "editorName" TEXT,
ADD COLUMN "detail" TEXT;
ALTER TABLE "ActivityEntry" ADD COLUMN "editorName" TEXT,
ADD COLUMN "detail" TEXT;

-- Sync claim lock (H2, review I2): one row, claimed by a conditional UPDATE. Seeded with the
-- last sync start so the manual cooldown carries over.
CREATE TABLE "SyncLock" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "lockedUntil" TIMESTAMP(3),
    "startedBy" TEXT,
    "lastStartedAt" TIMESTAMP(3),

    CONSTRAINT "SyncLock_pkey" PRIMARY KEY ("id")
);
INSERT INTO "SyncLock" ("id", "lastStartedAt") SELECT 1, MAX("startedAt") FROM "SyncLog";

-- Push subscriptions are now owned by a signed-in leader (M1, M2).
-- Existing rows were accepted without authentication and cannot be attributed to anyone,
-- so they are removed. A signed-in leader's device re-registers automatically the next time
-- the app is opened (PushNotificationSetup re-posts the browser's current subscription).
DELETE FROM "PushSubscription";
ALTER TABLE "PushSubscription" ADD COLUMN "ownerTag" TEXT NOT NULL;
CREATE INDEX "PushSubscription_ownerTag_idx" ON "PushSubscription"("ownerTag");
