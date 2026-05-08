-- Enable Realtime for marketplace_messages to support live chat
ALTER PUBLICATION supabase_realtime ADD TABLE marketplace_messages;
