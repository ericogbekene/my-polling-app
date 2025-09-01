# Database Setup Guide

This guide will help you set up the complete database schema for the polling app in Supabase.

## Prerequisites

1. A Supabase project (see `SUPABASE_SETUP.md` for project creation)
2. Access to your Supabase dashboard
3. Environment variables configured (see `SUPABASE_SETUP.md`)

## Step 1: Access the SQL Editor

1. Go to your Supabase dashboard
2. Navigate to **SQL Editor** in the left sidebar
3. Click **New Query**

## Step 2: Execute the Database Schema

1. Copy the entire contents of `database-schema.sql`
2. Paste it into the SQL Editor
3. Click **Run** to execute the schema

The schema will create:
- **3 tables**: `polls`, `poll_options`, `votes`
- **Indexes** for optimal performance
- **Row Level Security (RLS)** policies
- **Triggers** for automatic timestamp updates
- **Views** for common queries
- **Functions** for vote validation

## Step 3: Verify the Setup

After running the schema, you can verify everything is set up correctly:

### Check Tables
```sql
-- List all tables
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_type = 'BASE TABLE';
```

### Check RLS Policies
```sql
-- List RLS policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE schemaname = 'public';
```

### Check Views
```sql
-- List views
SELECT table_name 
FROM information_schema.views 
WHERE table_schema = 'public';
```

## Step 4: Test the Schema (Optional)

You can test the schema by creating a sample poll:

```sql
-- First, create a test user (replace with your actual user ID)
-- You can find your user ID in the Authentication > Users section

-- Create a test poll
INSERT INTO polls (title, description, created_by, allow_multiple_votes, require_auth_to_vote) 
VALUES (
  'Test Poll: What is your favorite color?',
  'A simple test poll to verify the schema works',
  'your-user-id-here', -- Replace with actual user ID
  false,
  false
);

-- Get the poll ID
SELECT id FROM polls WHERE title = 'Test Poll: What is your favorite color?';

-- Create poll options (replace 'poll-id-here' with the actual poll ID)
INSERT INTO poll_options (poll_id, text, sort_order) 
VALUES 
  ('poll-id-here', 'Red', 1),
  ('poll-id-here', 'Blue', 2),
  ('poll-id-here', 'Green', 3),
  ('poll-id-here', 'Yellow', 4);

-- Test the poll_results view
SELECT * FROM poll_results WHERE poll_title = 'Test Poll: What is your favorite color?';
```

## Schema Overview

### Tables

#### `polls`
- Stores poll information (title, description, settings)
- Includes expiration dates and voting preferences
- Has a unique `share_token` for QR code sharing

#### `poll_options`
- Stores the available options for each poll
- Includes sort order for consistent display
- Linked to polls via foreign key

#### `votes`
- Stores individual votes
- Supports both authenticated and anonymous voting
- Includes optional metadata (IP, user agent)

### Key Features

#### Row Level Security (RLS)
- **Polls**: Users can only modify their own polls
- **Options**: Users can only modify options for their own polls
- **Votes**: Users can only modify their own votes
- **Public Access**: Anyone can view active polls and their results

#### Performance Optimizations
- Indexes on frequently queried columns
- Efficient foreign key relationships
- Optimized views for common queries

#### Data Integrity
- Check constraints ensure valid data
- Foreign key constraints maintain relationships
- Triggers automatically update timestamps

## Security Considerations

1. **RLS is enabled** on all tables by default
2. **Authentication required** for creating polls
3. **Anonymous voting** is supported but can be disabled per poll
4. **Rate limiting** can be implemented using IP addresses
5. **Data validation** happens at the database level

## Troubleshooting

### Common Issues

1. **"Permission denied" errors**
   - Ensure RLS policies are correctly set up
   - Check that the user is authenticated
   - Verify the user has the correct permissions

2. **"Foreign key constraint" errors**
   - Ensure referenced records exist
   - Check that UUIDs are valid
   - Verify cascade delete settings

3. **"Unique constraint" errors**
   - Check for duplicate share tokens
   - Ensure one vote per user per poll (unless multiple votes allowed)

### Reset Schema (if needed)

If you need to start over:

```sql
-- Drop all objects (WARNING: This will delete all data)
DROP VIEW IF EXISTS poll_results CASCADE;
DROP VIEW IF EXISTS user_polls CASCADE;
DROP FUNCTION IF EXISTS can_user_vote CASCADE;
DROP FUNCTION IF EXISTS update_updated_at_column CASCADE;
DROP TABLE IF EXISTS votes CASCADE;
DROP TABLE IF EXISTS poll_options CASCADE;
DROP TABLE IF EXISTS polls CASCADE;
```

Then re-run the schema from `database-schema.sql`.

## Next Steps

After setting up the database:

1. **Configure environment variables** (see `SUPABASE_SETUP.md`)
2. **Test the connection** in your Next.js app
3. **Create poll creation functionality**
4. **Implement voting features**
5. **Add QR code generation** using the `share_token`

## Type Safety

The TypeScript types in `src/lib/types/database.ts` match the database schema exactly. This ensures:

- Type-safe database queries
- IntelliSense support in your IDE
- Compile-time error checking
- Consistent data structures

Make sure to import and use these types in your Server Actions and components.
