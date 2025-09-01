'use server';

import { getSupabaseServerClient } from '@/lib/supabase/server';
import { getSession } from '@/lib/supabase/session';
import { CreatePollData, Poll, PollOption } from '@/lib/types/database';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

export async function createPoll(formData: FormData) {
  try {
    const user = await getSession();
    if (!user) {
      throw new Error('Authentication required');
    }

    const supabase = getSupabaseServerClient();

    // Extract form data
    const title = formData.get('title') as string;
    const description = formData.get('description') as string;
    const options = formData.getAll('options') as string[];
    const expiresAt = formData.get('expiresAt') as string;
    const allowMultipleVotes = formData.get('allowMultipleVotes') === 'on';
    const requireAuthToVote = formData.get('requireAuthToVote') === 'on';

    // Validate input
    if (!title?.trim()) {
      throw new Error('Poll title is required');
    }

    if (options.length < 2) {
      throw new Error('At least 2 options are required');
    }

    // Filter out empty options
    const validOptions = options.filter(option => option?.trim());
    if (validOptions.length < 2) {
      throw new Error('At least 2 valid options are required');
    }

    // Validate expiration date
    let expiresAtDate: string | null = null;
    if (expiresAt) {
      const expiryDate = new Date(expiresAt);
      if (expiryDate <= new Date()) {
        throw new Error('Expiration date must be in the future');
      }
      expiresAtDate = expiryDate.toISOString();
    }

    // Create poll
    const { data: poll, error: pollError } = await supabase
      .from('polls')
      .insert({
        title: title.trim(),
        description: description?.trim() || null,
        created_by: user.id,
        expires_at: expiresAtDate,
        allow_multiple_votes: allowMultipleVotes,
        require_auth_to_vote: requireAuthToVote,
      })
      .select()
      .single();

    if (pollError) {
      console.error('Error creating poll:', pollError);
      throw new Error('Failed to create poll');
    }

    // Create poll options
    const pollOptions = validOptions.map((text, index) => ({
      poll_id: poll.id,
      text: text.trim(),
      sort_order: index,
    }));

    const { error: optionsError } = await supabase
      .from('poll_options')
      .insert(pollOptions);

    if (optionsError) {
      console.error('Error creating poll options:', optionsError);
      // Clean up the poll if options creation fails
      await supabase.from('polls').delete().eq('id', poll.id);
      throw new Error('Failed to create poll options');
    }

    // Revalidate the polls page
    revalidatePath('/polls');
    revalidatePath(`/polls/${poll.id}`);

    // Return success data instead of redirecting
    return { success: true, pollId: poll.id };

  } catch (error) {
    console.error('Error in createPoll:', error);
    throw error;
  }
}

export async function getPoll(pollId: string) {
  try {
    const supabase = getSupabaseServerClient();

    // Get poll with options and vote counts
    const { data: poll, error: pollError } = await supabase
      .from('polls')
      .select(`
        *,
        poll_options (
          *,
          votes (count)
        )
      `)
      .eq('id', pollId)
      .eq('is_active', true)
      .single();

    if (pollError) {
      throw new Error('Poll not found');
    }

    return poll;
  } catch (error) {
    console.error('Error in getPoll:', error);
    throw error;
  }
}

export async function getUserPolls() {
  try {
    const user = await getSession();
    if (!user) {
      throw new Error('Authentication required');
    }

    const supabase = getSupabaseServerClient();

    const { data: polls, error } = await supabase
      .from('user_polls')
      .select('*')
      .eq('created_by', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error('Failed to fetch polls');
    }

    return polls;
  } catch (error) {
    console.error('Error in getUserPolls:', error);
    throw error;
  }
}

export async function getPublicPolls() {
  try {
    const supabase = getSupabaseServerClient();

    const { data: polls, error } = await supabase
      .from('polls')
      .select(`
        *,
        poll_options (
          *,
          votes (count)
        )
      `)
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) {
      throw new Error('Failed to fetch polls');
    }

    return polls;
  } catch (error) {
    console.error('Error in getPublicPolls:', error);
    throw error;
  }
}
