-- Migration: Add chat_type and application_id to chat_messages
-- Date: 2025-10-23
-- Description: 
--   Добавляет поля для различения типов чата:
--   - chat_type: 'customer-agent' или 'agent-commercial'
--   - application_id: связь с заявкой
--   - file_url: для прикрепления файлов (видео, zip)

-- Step 1: Add chat_type column
ALTER TABLE chat_messages 
ADD COLUMN IF NOT EXISTS chat_type TEXT DEFAULT 'customer-agent';

-- Step 2: Add application_id for linking to applications
ALTER TABLE chat_messages 
ADD COLUMN IF NOT EXISTS application_id UUID REFERENCES applications(id) ON DELETE CASCADE;

-- Step 3: Add file_url for attachments
ALTER TABLE chat_messages 
ADD COLUMN IF NOT EXISTS file_url TEXT;

-- Step 4: Add file_name for display
ALTER TABLE chat_messages 
ADD COLUMN IF NOT EXISTS file_name TEXT;

-- Step 5: Add file_size for display
ALTER TABLE chat_messages 
ADD COLUMN IF NOT EXISTS file_size BIGINT;

-- Add comments
COMMENT ON COLUMN chat_messages.chat_type IS 'Тип чата: customer-agent (клиент-агент) или agent-commercial (агент-коммерческий)';
COMMENT ON COLUMN chat_messages.application_id IS 'ID заявки, к которой относится сообщение';
COMMENT ON COLUMN chat_messages.file_url IS 'URL прикреплённого файла (видеоролик, zip и т.д.)';
COMMENT ON COLUMN chat_messages.file_name IS 'Имя прикреплённого файла';
COMMENT ON COLUMN chat_messages.file_size IS 'Размер файла в байтах';

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_chat_messages_room_id ON chat_messages(room_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_application_id ON chat_messages(application_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_chat_type ON chat_messages(chat_type);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at ON chat_messages(created_at DESC);

-- Verify changes
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'chat_messages' 
  AND column_name IN ('chat_type', 'application_id', 'file_url', 'file_name', 'file_size')
ORDER BY ordinal_position;
