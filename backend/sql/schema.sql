CREATE TABLE IF NOT EXISTS participant_session (
  id BIGSERIAL PRIMARY KEY,
  session_id VARCHAR(64) UNIQUE NOT NULL,
  user_id VARCHAR(64) NULL,
  client_time TIMESTAMPTZ NULL,
  user_agent TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS practice_answer (
  id BIGSERIAL PRIMARY KEY,
  session_id VARCHAR(64) NOT NULL,
  item_id VARCHAR(100) NULL,
  selected_option VARCHAR(20) NULL,
  is_correct BOOLEAN NULL,
  duration_ms INTEGER NULL,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS formal_answer (
  id BIGSERIAL PRIMARY KEY,
  session_id VARCHAR(64) NOT NULL,
  item_id VARCHAR(100) NULL,
  selected_option VARCHAR(20) NULL,
  duration_ms INTEGER NULL,
  order_index INTEGER NULL,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS survey_response (
  id BIGSERIAL PRIMARY KEY,
  session_id VARCHAR(64) NOT NULL,
  user_id VARCHAR(64) NULL,
  hardest_question VARCHAR(20) NULL,
  judgment_basis VARCHAR(100) NULL,
  read_ubik_before VARCHAR(20) NULL,
  feedback_text TEXT NULL,
  total_duration_ms INTEGER NULL,
  q_hardest_question_duration_ms INTEGER NULL,
  q_judgment_basis_duration_ms INTEGER NULL,
  q_read_ubik_before_duration_ms INTEGER NULL,
  q_feedback_duration_ms INTEGER NULL,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS event_log (
  id BIGSERIAL PRIMARY KEY,
  session_id VARCHAR(64) NULL,
  event_id VARCHAR(64) NULL,
  event_name VARCHAR(100) NULL,
  event_time TIMESTAMPTZ NULL,
  step VARCHAR(30) NULL,
  event_payload JSONB NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE participant_session ADD COLUMN IF NOT EXISTS user_id VARCHAR(64) NULL;

ALTER TABLE survey_response ADD COLUMN IF NOT EXISTS user_id VARCHAR(64) NULL;
ALTER TABLE survey_response ADD COLUMN IF NOT EXISTS q_hardest_question_duration_ms INTEGER NULL;
ALTER TABLE survey_response ADD COLUMN IF NOT EXISTS q_judgment_basis_duration_ms INTEGER NULL;
ALTER TABLE survey_response ADD COLUMN IF NOT EXISTS q_read_ubik_before_duration_ms INTEGER NULL;
ALTER TABLE survey_response ADD COLUMN IF NOT EXISTS q_feedback_duration_ms INTEGER NULL;

CREATE INDEX IF NOT EXISTS idx_participant_session_user_id ON participant_session(user_id);
CREATE INDEX IF NOT EXISTS idx_event_log_session_id ON event_log(session_id);
CREATE INDEX IF NOT EXISTS idx_formal_answer_session_id ON formal_answer(session_id);
CREATE INDEX IF NOT EXISTS idx_survey_response_session_id ON survey_response(session_id);
CREATE INDEX IF NOT EXISTS idx_survey_response_user_id ON survey_response(user_id);
