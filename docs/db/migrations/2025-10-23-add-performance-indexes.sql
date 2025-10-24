-- Performance optimization migration
-- Adds indexes for frequently queried columns

-- ==============================================
-- APPLICATIONS WORKFLOW TABLES INDEXES
-- ==============================================

-- Pending applications
CREATE INDEX IF NOT EXISTS idx_pending_app_status 
  ON pending_applications(status);

CREATE INDEX IF NOT EXISTS idx_pending_app_agent 
  ON pending_applications(agent_id) 
  WHERE agent_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_pending_app_customer 
  ON pending_applications(customer_id);

CREATE INDEX IF NOT EXISTS idx_pending_app_created 
  ON pending_applications(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_pending_app_show 
  ON pending_applications(show_id) 
  WHERE show_id IS NOT NULL;

-- Composite index for agent dashboard queries
CREATE INDEX IF NOT EXISTS idx_pending_app_agent_status 
  ON pending_applications(agent_id, status) 
  WHERE agent_id IS NOT NULL;

-- Approved applications
CREATE INDEX IF NOT EXISTS idx_approved_app_status 
  ON approved_applications(status);

CREATE INDEX IF NOT EXISTS idx_approved_app_agent 
  ON approved_applications(agent_id);

CREATE INDEX IF NOT EXISTS idx_approved_app_customer 
  ON approved_applications(customer_id);

CREATE INDEX IF NOT EXISTS idx_approved_app_created 
  ON approved_applications(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_approved_app_show 
  ON approved_applications(show_id);

-- Rejected applications
CREATE INDEX IF NOT EXISTS idx_rejected_app_status 
  ON rejected_applications(status);

CREATE INDEX IF NOT EXISTS idx_rejected_app_agent 
  ON rejected_applications(agent_id);

CREATE INDEX IF NOT EXISTS idx_rejected_app_customer 
  ON rejected_applications(customer_id);

CREATE INDEX IF NOT EXISTS idx_rejected_app_created 
  ON rejected_applications(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_rejected_app_show 
  ON rejected_applications(show_id);

-- ==============================================
-- CHAT MESSAGES INDEXES
-- ==============================================

-- Room-based queries (most common)
CREATE INDEX IF NOT EXISTS idx_chat_room 
  ON chat_messages(room_id, created_at DESC);

-- Sender queries
CREATE INDEX IF NOT EXISTS idx_chat_sender 
  ON chat_messages(sender_id);

-- Full composite for chat history
CREATE INDEX IF NOT EXISTS idx_chat_full 
  ON chat_messages(room_id, sender_id, created_at DESC);

-- ==============================================
-- USERS TABLE INDEXES
-- ==============================================

CREATE INDEX IF NOT EXISTS idx_users_email 
  ON users(email);

CREATE INDEX IF NOT EXISTS idx_users_role 
  ON users(role);

CREATE INDEX IF NOT EXISTS idx_users_created 
  ON users(created_at DESC);

-- ==============================================
-- SHOWS & SCHEDULE INDEXES
-- ==============================================

CREATE INDEX IF NOT EXISTS idx_shows_active 
  ON shows(is_active) 
  WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_schedule_show 
  ON show_schedule(show_id);

CREATE INDEX IF NOT EXISTS idx_schedule_date 
  ON show_schedule(scheduled_date);

CREATE INDEX IF NOT EXISTS idx_schedule_show_date 
  ON show_schedule(show_id, scheduled_date);

-- ==============================================
-- COMMISSIONS INDEXES
-- ==============================================

CREATE INDEX IF NOT EXISTS idx_commissions_agent 
  ON commissions(agent_id);

CREATE INDEX IF NOT EXISTS idx_commissions_application 
  ON commissions(application_id);

CREATE INDEX IF NOT EXISTS idx_commissions_status 
  ON commissions(status);

CREATE INDEX IF NOT EXISTS idx_commissions_date 
  ON commissions(payment_date DESC) 
  WHERE payment_date IS NOT NULL;

-- Composite for agent commission queries
CREATE INDEX IF NOT EXISTS idx_commissions_agent_status 
  ON commissions(agent_id, status, payment_date DESC);

-- ==============================================
-- ANALYZE TABLES FOR STATISTICS UPDATE
-- ==============================================

ANALYZE pending_applications;
ANALYZE approved_applications;
ANALYZE rejected_applications;
ANALYZE chat_messages;
ANALYZE users;
ANALYZE shows;
ANALYZE show_schedule;
ANALYZE commissions;

-- ==============================================
-- COMMENTS FOR DOCUMENTATION
-- ==============================================

COMMENT ON INDEX idx_pending_app_agent_status IS 'Speeds up agent dashboard application queries';
COMMENT ON INDEX idx_chat_room IS 'Optimizes chat message retrieval by room';
COMMENT ON INDEX idx_commissions_agent_status IS 'Optimizes agent commission calculations';
