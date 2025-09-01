-- Polling App Database Schema
-- Execute this in your Supabase SQL Editor

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================
-- TABLES
-- =============================================

-- Polls table
CREATE TABLE IF NOT EXISTS polls (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL CHECK (length(trim(title)) > 0),
  description TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT true,
  allow_multiple_votes BOOLEAN DEFAULT false,
  require_auth_to_vote BOOLEAN DEFAULT false,
  share_token TEXT UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  CONSTRAINT valid_expiry CHECK (expires_at IS NULL OR expires_at > created_at)
);

-- Poll options table
CREATE TABLE IF NOT EXISTS poll_options (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  poll_id UUID REFERENCES polls(id) ON DELETE CASCADE NOT NULL,
  text TEXT NOT NULL CHECK (length(trim(text)) > 0),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  sort_order INTEGER DEFAULT 0
);

-- Votes table
CREATE TABLE IF NOT EXISTS votes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  poll_id UUID REFERENCES polls(id) ON DELETE CASCADE NOT NULL,
  option_id UUID REFERENCES poll_options(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  voter_email TEXT, -- For anonymous voting
  voter_name TEXT, -- For anonymous voting
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ip_address INET, -- For rate limiting (optional)
  user_agent TEXT, -- For analytics (optional)
  CONSTRAINT valid_vote CHECK (
    (user_id IS NOT NULL AND voter_email IS NULL AND voter_name IS NULL) OR
    (user_id IS NULL AND voter_email IS NOT NULL)
  )
);

-- =============================================
-- INDEXES FOR PERFORMANCE
-- =============================================

-- Indexes for polls table
CREATE INDEX IF NOT EXISTS idx_polls_created_by ON polls(created_by);
CREATE INDEX IF NOT EXISTS idx_polls_created_at ON polls(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_polls_expires_at ON polls(expires_at);
CREATE INDEX IF NOT EXISTS idx_polls_is_active ON polls(is_active);
CREATE INDEX IF NOT EXISTS idx_polls_share_token ON polls(share_token);

-- Indexes for poll_options table
CREATE INDEX IF NOT EXISTS idx_poll_options_poll_id ON poll_options(poll_id);
CREATE INDEX IF NOT EXISTS idx_poll_options_sort_order ON poll_options(poll_id, sort_order);

-- Indexes for votes table
CREATE INDEX IF NOT EXISTS idx_votes_poll_id ON votes(poll_id);
CREATE INDEX IF NOT EXISTS idx_votes_option_id ON votes(option_id);
CREATE INDEX IF NOT EXISTS idx_votes_user_id ON votes(user_id);
CREATE INDEX IF NOT EXISTS idx_votes_voter_email ON votes(voter_email);
CREATE INDEX IF NOT EXISTS idx_votes_created_at ON votes(created_at);

-- =============================================
-- ROW LEVEL SECURITY (RLS)
-- =============================================

-- Enable RLS on all tables
ALTER TABLE polls ENABLE ROW LEVEL SECURITY;
ALTER TABLE poll_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE votes ENABLE ROW LEVEL SECURITY;

-- =============================================
-- RLS POLICIES FOR POLLS
-- =============================================

-- Anyone can view active polls
CREATE POLICY "Polls are viewable by everyone" ON polls
  FOR SELECT USING (is_active = true);

-- Users can view their own polls (including inactive ones)
CREATE POLICY "Users can view their own polls" ON polls
  FOR SELECT USING (auth.uid() = created_by);

-- Authenticated users can create polls
CREATE POLICY "Authenticated users can create polls" ON polls
  FOR INSERT WITH CHECK (auth.uid() = created_by);

-- Users can update their own polls
CREATE POLICY "Users can update their own polls" ON polls
  FOR UPDATE USING (auth.uid() = created_by);

-- Users can delete their own polls
CREATE POLICY "Users can delete their own polls" ON polls
  FOR DELETE USING (auth.uid() = created_by);

-- =============================================
-- RLS POLICIES FOR POLL_OPTIONS
-- =============================================

-- Anyone can view poll options for active polls
CREATE POLICY "Poll options are viewable by everyone" ON poll_options
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM polls 
      WHERE polls.id = poll_options.poll_id 
      AND polls.is_active = true
    )
  );

-- Users can view options for their own polls
CREATE POLICY "Users can view options for their own polls" ON poll_options
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM polls 
      WHERE polls.id = poll_options.poll_id 
      AND polls.created_by = auth.uid()
    )
  );

-- Users can create options for their own polls
CREATE POLICY "Users can create options for their own polls" ON poll_options
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM polls 
      WHERE polls.id = poll_options.poll_id 
      AND polls.created_by = auth.uid()
    )
  );

-- Users can update options for their own polls
CREATE POLICY "Users can update options for their own polls" ON poll_options
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM polls 
      WHERE polls.id = poll_options.poll_id 
      AND polls.created_by = auth.uid()
    )
  );

-- Users can delete options for their own polls
CREATE POLICY "Users can delete options for their own polls" ON poll_options
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM polls 
      WHERE polls.id = poll_options.poll_id 
      AND polls.created_by = auth.uid()
    )
  );

-- =============================================
-- RLS POLICIES FOR VOTES
-- =============================================

-- Anyone can view votes for active polls
CREATE POLICY "Votes are viewable by everyone" ON votes
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM polls 
      WHERE polls.id = votes.poll_id 
      AND polls.is_active = true
    )
  );

-- Users can view votes for their own polls
CREATE POLICY "Users can view votes for their own polls" ON votes
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM polls 
      WHERE polls.id = votes.poll_id 
      AND polls.created_by = auth.uid()
    )
  );

-- Users can vote on polls (authenticated voting)
CREATE POLICY "Authenticated users can vote" ON votes
  FOR INSERT WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1 FROM polls 
      WHERE polls.id = votes.poll_id 
      AND polls.is_active = true
      AND (polls.expires_at IS NULL OR polls.expires_at > NOW())
    )
  );

-- Anonymous users can vote on polls that allow it
CREATE POLICY "Anonymous users can vote on allowed polls" ON votes
  FOR INSERT WITH CHECK (
    user_id IS NULL AND
    voter_email IS NOT NULL AND
    EXISTS (
      SELECT 1 FROM polls 
      WHERE polls.id = votes.poll_id 
      AND polls.is_active = true
      AND polls.require_auth_to_vote = false
      AND (polls.expires_at IS NULL OR polls.expires_at > NOW())
    )
  );

-- Users can update their own votes
CREATE POLICY "Users can update their own votes" ON votes
  FOR UPDATE USING (auth.uid() = user_id);

-- Users can delete their own votes
CREATE POLICY "Users can delete their own votes" ON votes
  FOR DELETE USING (auth.uid() = user_id);

-- =============================================
-- TRIGGERS FOR UPDATED_AT TIMESTAMPS
-- =============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at
CREATE TRIGGER update_polls_updated_at 
  BEFORE UPDATE ON polls 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_poll_options_updated_at 
  BEFORE UPDATE ON poll_options 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- FUNCTIONS FOR VOTE VALIDATION
-- =============================================

-- Function to check if user can vote (one vote per poll unless multiple votes allowed)
CREATE OR REPLACE FUNCTION can_user_vote(
  p_poll_id UUID,
  p_user_id UUID DEFAULT NULL,
  p_voter_email TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
  poll_record RECORD;
  existing_votes INTEGER;
BEGIN
  -- Get poll information
  SELECT * INTO poll_record 
  FROM polls 
  WHERE id = p_poll_id AND is_active = true;
  
  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;
  
  -- Check if poll has expired
  IF poll_record.expires_at IS NOT NULL AND poll_record.expires_at <= NOW() THEN
    RETURN FALSE;
  END IF;
  
  -- If multiple votes not allowed, check existing votes
  IF NOT poll_record.allow_multiple_votes THEN
    IF p_user_id IS NOT NULL THEN
      -- Check authenticated user votes
      SELECT COUNT(*) INTO existing_votes
      FROM votes 
      WHERE poll_id = p_poll_id AND user_id = p_user_id;
    ELSIF p_voter_email IS NOT NULL THEN
      -- Check anonymous user votes
      SELECT COUNT(*) INTO existing_votes
      FROM votes 
      WHERE poll_id = p_poll_id AND voter_email = p_voter_email;
    END IF;
    
    IF existing_votes > 0 THEN
      RETURN FALSE;
    END IF;
  END IF;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- VIEWS FOR COMMON QUERIES
-- =============================================

-- View for poll results with vote counts
CREATE OR REPLACE VIEW poll_results AS
SELECT 
  p.id as poll_id,
  p.title as poll_title,
  p.description as poll_description,
  p.created_at as poll_created_at,
  p.expires_at as poll_expires_at,
  p.is_active as poll_is_active,
  po.id as option_id,
  po.text as option_text,
  po.sort_order,
  COUNT(v.id) as vote_count,
  ROUND(
    (COUNT(v.id) * 100.0 / NULLIF((
      SELECT COUNT(*) 
      FROM votes v2 
      WHERE v2.poll_id = p.id
    ), 0)), 2
  ) as vote_percentage
FROM polls p
JOIN poll_options po ON p.id = po.poll_id
LEFT JOIN votes v ON po.id = v.option_id
WHERE p.is_active = true
GROUP BY p.id, p.title, p.description, p.created_at, p.expires_at, p.is_active, po.id, po.text, po.sort_order
ORDER BY p.created_at DESC, po.sort_order, po.text;

-- View for user's polls with basic stats
CREATE OR REPLACE VIEW user_polls AS
SELECT 
  p.*,
  COUNT(DISTINCT po.id) as option_count,
  COUNT(v.id) as total_votes,
  CASE 
    WHEN p.expires_at IS NOT NULL AND p.expires_at <= NOW() THEN 'expired'
    WHEN p.is_active = false THEN 'inactive'
    ELSE 'active'
  END as status
FROM polls p
LEFT JOIN poll_options po ON p.id = po.poll_id
LEFT JOIN votes v ON p.id = v.poll_id
GROUP BY p.id
ORDER BY p.created_at DESC;

-- =============================================
-- SAMPLE DATA (OPTIONAL)
-- =============================================

-- Uncomment the following lines to insert sample data for testing

/*
-- Sample poll (only works if you have a user in auth.users)
INSERT INTO polls (title, description, created_by, allow_multiple_votes, require_auth_to_vote) 
VALUES (
  'What is your favorite programming language?',
  'Choose your preferred programming language for web development',
  (SELECT id FROM auth.users LIMIT 1),
  false,
  false
);

-- Sample poll options
INSERT INTO poll_options (poll_id, text, sort_order) 
SELECT 
  p.id,
  option_text,
  sort_order
FROM (
  VALUES 
    ('JavaScript', 1),
    ('TypeScript', 2),
    ('Python', 3),
    ('Go', 4),
    ('Rust', 5)
) AS options(option_text, sort_order)
CROSS JOIN (SELECT id FROM polls WHERE title = 'What is your favorite programming language?' LIMIT 1) p;
*/

-- =============================================
-- COMMENTS
-- =============================================

COMMENT ON TABLE polls IS 'Stores poll information including title, description, and settings';
COMMENT ON TABLE poll_options IS 'Stores the available options for each poll';
COMMENT ON TABLE votes IS 'Stores individual votes cast by users or anonymous voters';
COMMENT ON VIEW poll_results IS 'Provides aggregated poll results with vote counts and percentages';
COMMENT ON VIEW user_polls IS 'Provides user-specific poll information with basic statistics';
