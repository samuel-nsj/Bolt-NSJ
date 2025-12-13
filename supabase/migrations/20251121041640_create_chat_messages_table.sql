/*
  # Create chat messages table for AI chatbot

  1. New Tables
    - `chat_messages`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to auth.users)
      - `message` (text, the message content)
      - `sender` (text, either 'user' or 'bot')
      - `created_at` (timestamptz, timestamp of message)

  2. Security
    - Enable RLS on `chat_messages` table
    - Add policy for authenticated users to read their own chat history
    - Add policy for authenticated users to insert their own messages

  3. Indexes
    - Add index on user_id for faster queries
    - Add index on created_at for ordering messages
*/

CREATE TABLE IF NOT EXISTS chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  message text NOT NULL,
  sender text NOT NULL CHECK (sender IN ('user', 'bot')),
  created_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own chat messages"
  ON chat_messages
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own chat messages"
  ON chat_messages
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_chat_messages_user_id ON chat_messages(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at ON chat_messages(created_at DESC);