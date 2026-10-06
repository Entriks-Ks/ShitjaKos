ALTER TABLE "User" ADD COLUMN "deletedAt" TIMESTAMP(3);
ALTER TABLE "User" ADD CONSTRAINT "deleted_user_is_suspended"
  CHECK ("deletedAt" IS NULL OR "suspendedAt" IS NOT NULL);

-- A deleted identity cannot be restored by an auth update or admin action.
CREATE FUNCTION prevent_deleted_user_update() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF OLD."deletedAt" IS NOT NULL THEN
    RAISE EXCEPTION 'Deleted accounts cannot be modified';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER deleted_user_update BEFORE UPDATE ON "User"
FOR EACH ROW EXECUTE FUNCTION prevent_deleted_user_update();

-- Serialize new credentials, sessions and memberships against deletion.
CREATE FUNCTION reject_deleted_account_child() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE removed TIMESTAMP(3);
BEGIN
  SELECT "deletedAt" INTO removed FROM "User" WHERE id = NEW."userId" FOR SHARE;
  IF removed IS NOT NULL THEN
    RAISE EXCEPTION 'Deleted accounts cannot gain access';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER deleted_user_session BEFORE INSERT OR UPDATE ON "Session"
FOR EACH ROW EXECUTE FUNCTION reject_deleted_account_child();
CREATE TRIGGER deleted_user_credential BEFORE INSERT OR UPDATE ON "Account"
FOR EACH ROW EXECUTE FUNCTION reject_deleted_account_child();
CREATE TRIGGER deleted_user_membership BEFORE INSERT OR UPDATE ON "BusinessMembership"
FOR EACH ROW EXECUTE FUNCTION reject_deleted_account_child();

CREATE TRIGGER deleted_user_profile BEFORE INSERT OR UPDATE ON "PersonalProfile"
FOR EACH ROW EXECUTE FUNCTION reject_deleted_account_child();
CREATE TRIGGER deleted_user_favorite BEFORE INSERT OR UPDATE ON "Favorite"
FOR EACH ROW EXECUTE FUNCTION reject_deleted_account_child();

CREATE FUNCTION reject_deleted_personal_listing() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE removed TIMESTAMP(3);
BEGIN
  IF NEW."personalProfileId" IS NOT NULL THEN
    SELECT u."deletedAt" INTO removed FROM "User" u
      JOIN "PersonalProfile" p ON p."userId" = u.id
      WHERE p.id = NEW."personalProfileId" FOR SHARE OF u;
    IF removed IS NOT NULL THEN
      RAISE EXCEPTION 'Deleted accounts cannot modify personal listings';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER deleted_user_listing BEFORE INSERT OR UPDATE ON "Listing"
FOR EACH ROW EXECUTE FUNCTION reject_deleted_personal_listing();
