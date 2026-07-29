-- Sound is a persisted preference, independent of Web Push registration.
ALTER TABLE "NotificationPushPrefs" ADD COLUMN "soundEnabled" BOOLEAN NOT NULL DEFAULT false;
