'use server';

import { getSupabaseServerClient } from '@/lib/supabase/server';
import { getSession } from '@/lib/supabase/session';
import { VoteData } from '@/lib/types/database';
import { revalidatePath } from 'next/cache';

export async function submitVote(voteData: VoteData) {
  try {
    const user = await getSession();
    const supabase = getSupabaseServerClient();

    // Get poll information
    const { data: poll, error: pollError } = await supabase
      .from('polls')
      .select('*')
      .eq('id', voteData.poll_id)
      .eq('is_active', true)
      .single();

    if (pollError || !poll) {
      throw new Error('Poll not found or inactive');
    }

    // Check if poll has expired
    if (poll.expires_at && new Date(poll.expires_at) <= new Date()) {
      throw new Error('This poll has expired');
    }

    // Check authentication requirements
    if (poll.require_auth_to_vote && !user) {
      throw new Error('This poll requires authentication to vote');
    }

    // Check if user has already voted (if not allowing multiple votes)
    if (!poll.allow_multiple_votes) {
      if (user) {
        // Check authenticated user votes
        const { data: existingVote } = await supabase
          .from('votes')
          .select('id')
          .eq('poll_id', voteData.poll_id)
          .eq('user_id', user.id)
          .single();

        if (existingVote) {
          throw new Error('You have already voted on this poll');
        }
      } else if (voteData.voter_email) {
        // Check anonymous user votes
        const { data: existingVote } = await supabase
          .from('votes')
          .select('id')
          .eq('poll_id', voteData.poll_id)
          .eq('voter_email', voteData.voter_email)
          .single();

        if (existingVote) {
          throw new Error('You have already voted on this poll');
        }
      }
    }

    // Validate that the option exists and belongs to this poll
    const { data: option, error: optionError } = await supabase
      .from('poll_options')
      .select('id')
      .eq('id', voteData.option_id)
      .eq('poll_id', voteData.poll_id)
      .single();

    if (optionError || !option) {
      throw new Error('Invalid voting option');
    }

    // Create the vote
    const { error: voteError } = await supabase
      .from('votes')
      .insert({
        poll_id: voteData.poll_id,
        option_id: voteData.option_id,
        user_id: user?.id || null,
        voter_email: voteData.voter_email || null,
        voter_name: voteData.voter_name || null,
      });

    if (voteError) {
      console.error('Error creating vote:', voteError);
      throw new Error('Failed to submit vote');
    }

    // Revalidate the poll page to show updated results
    revalidatePath(`/polls/${voteData.poll_id}`);

    return { success: true };
  } catch (error) {
    console.error('Error in submitVote:', error);
    throw error;
  }
}

export async function getUserVotes(pollId: string) {
  try {
    const user = await getSession();
    if (!user) {
      return [];
    }

    const supabase = getSupabaseServerClient();

    const { data: votes, error } = await supabase
      .from('votes')
      .select('option_id')
      .eq('poll_id', pollId)
      .eq('user_id', user.id);

    if (error) {
      throw new Error('Failed to fetch user votes');
    }

    return votes.map(vote => vote.option_id);
  } catch (error) {
    console.error('Error in getUserVotes:', error);
    return [];
  }
}

export async function getAnonymousVotes(pollId: string, voterEmail: string) {
  try {
    const supabase = getSupabaseServerClient();

    const { data: votes, error } = await supabase
      .from('votes')
      .select('option_id')
      .eq('poll_id', pollId)
      .eq('voter_email', voterEmail);

    if (error) {
      throw new Error('Failed to fetch anonymous votes');
    }

    return votes.map(vote => vote.option_id);
  } catch (error) {
    console.error('Error in getAnonymousVotes:', error);
    return [];
  }
}
