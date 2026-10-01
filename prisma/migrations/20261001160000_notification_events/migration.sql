-- Transactional invalidations: PostgreSQL delivers NOTIFY only after commit.
CREATE FUNCTION notify_message_recipients() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE recipient TEXT;
BEGIN
  FOR recipient IN
    SELECT c."buyerId" FROM "Conversation" c WHERE c.id = NEW."conversationId"
    UNION
    SELECT c."sellerUserId" FROM "Conversation" c
      WHERE c.id = NEW."conversationId" AND c."sellerUserId" IS NOT NULL
    UNION
    SELECT m."userId" FROM "BusinessMembership" m
      JOIN "Conversation" c ON c."businessId" = m."businessId"
      WHERE c.id = NEW."conversationId"
        AND (m.role = 'OWNER' OR (m.role = 'STAFF' AND c."createdAt" >= m."joinedAt"))
  LOOP
    PERFORM pg_notify('shitjakos_notifications', recipient);
  END LOOP;
  RETURN NEW;
END;
$$;
CREATE TRIGGER message_notification_event AFTER INSERT ON "Message"
FOR EACH ROW EXECUTE FUNCTION notify_message_recipients();

CREATE FUNCTION notify_user_inbox_change() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM pg_notify('shitjakos_notifications', OLD."userId");
    RETURN OLD;
  END IF;
  PERFORM pg_notify('shitjakos_notifications', NEW."userId");
  RETURN NEW;
END;
$$;
CREATE TRIGGER read_state_notification_event AFTER INSERT OR UPDATE OR DELETE ON "ConversationReadState"
FOR EACH ROW EXECUTE FUNCTION notify_user_inbox_change();
CREATE TRIGGER membership_notification_event AFTER INSERT OR UPDATE OR DELETE ON "BusinessMembership"
FOR EACH ROW EXECUTE FUNCTION notify_user_inbox_change();
CREATE TRIGGER session_notification_event AFTER DELETE ON "Session"
FOR EACH ROW EXECUTE FUNCTION notify_user_inbox_change();
