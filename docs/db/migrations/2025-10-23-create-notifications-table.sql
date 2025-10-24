-- Notifications system migration
-- Creates table for storing user notifications

CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL, -- 'application_created', 'application_updated', 'status_changed', 'new_message', 'commission_paid', etc.
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  data JSONB, -- Additional data (application_id, message_id, etc.)
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  read_at TIMESTAMP WITH TIME ZONE
);

-- Indexes for fast queries
CREATE INDEX IF NOT EXISTS idx_notifications_user 
  ON notifications(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_notifications_user_unread 
  ON notifications(user_id, read) 
  WHERE read = FALSE;

CREATE INDEX IF NOT EXISTS idx_notifications_type 
  ON notifications(type);

CREATE INDEX IF NOT EXISTS idx_notifications_created 
  ON notifications(created_at DESC);

-- Composite index for user's unread notifications
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread_created 
  ON notifications(user_id, read, created_at DESC) 
  WHERE read = FALSE;

COMMENT ON TABLE notifications IS 'User notifications for application changes, messages, and system events';
COMMENT ON COLUMN notifications.type IS 'Notification type: application_created, application_updated, status_changed, new_message, commission_paid';
COMMENT ON COLUMN notifications.data IS 'Additional JSON data specific to notification type';
