import { submitVote, getUserVotes, getAnonymousVotes } from '../votes'
import { revalidatePath } from 'next/cache'

// Mock dependencies
jest.mock('../../supabase/server', () => ({
  getSupabaseServerClient: jest.fn(),
}))

jest.mock('../../supabase/session', () => ({
  getSession: jest.fn(),
}))

const mockGetSession = require('../../supabase/session').getSession as jest.MockedFunction<any>
const mockGetSupabaseServerClient = require('../../supabase/server').getSupabaseServerClient as jest.MockedFunction<any>
const mockRevalidatePath = revalidatePath as jest.MockedFunction<typeof revalidatePath>

describe('Vote Actions', () => {
  let mockSupabase: any

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks()
    
    // Mock Supabase client
    mockSupabase = {
      from: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
    }
    
    mockGetSupabaseServerClient.mockReturnValue(mockSupabase)
  })

  describe('submitVote', () => {
    const mockUser = {
      id: 'user-123',
      email: 'test@example.com',
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    }

    const mockPoll = {
      id: 'poll-123',
      title: 'Test Poll',
      description: 'Test Description',
      created_by: 'user-123',
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
      expires_at: null,
      is_active: true,
      allow_multiple_votes: false,
      require_auth_to_vote: false,
      share_token: 'abc123',
    }

    const mockOption = {
      id: 'option-123',
      poll_id: 'poll-123',
      text: 'Test Option',
      sort_order: 0,
    }

    it('should submit authenticated vote successfully', async () => {
      // Mock poll fetch
      mockSupabase.single.mockResolvedValueOnce({
        data: mockPoll,
        error: null,
      })

      // Mock option validation
      mockSupabase.single.mockResolvedValueOnce({
        data: mockOption,
        error: null,
      })

      // Mock vote creation
      mockSupabase.insert.mockResolvedValueOnce({
        data: null,
        error: null,
      })

      mockGetSession.mockResolvedValue(mockUser)

      const voteData = {
        poll_id: 'poll-123',
        option_id: 'option-123',
      }

      const result = await submitVote(voteData)

      expect(result).toEqual({ success: true })
      expect(mockSupabase.insert).toHaveBeenCalledWith({
        poll_id: 'poll-123',
        option_id: 'option-123',
        user_id: 'user-123',
        voter_email: null,
        voter_name: null,
      })
      expect(mockRevalidatePath).toHaveBeenCalledWith('/polls/poll-123')
    })

    it('should submit anonymous vote successfully', async () => {
      const anonymousPoll = { ...mockPoll, require_auth_to_vote: false }
      
      // Mock poll fetch
      mockSupabase.single.mockResolvedValueOnce({
        data: anonymousPoll,
        error: null,
      })

      // Mock option validation
      mockSupabase.single.mockResolvedValueOnce({
        data: mockOption,
        error: null,
      })

      // Mock vote creation
      mockSupabase.insert.mockResolvedValueOnce({
        data: null,
        error: null,
      })

      mockGetSession.mockResolvedValue(null)

      const voteData = {
        poll_id: 'poll-123',
        option_id: 'option-123',
        voter_email: 'anonymous@example.com',
        voter_name: 'Anonymous User',
      }

      const result = await submitVote(voteData)

      expect(result).toEqual({ success: true })
      expect(mockSupabase.insert).toHaveBeenCalledWith({
        poll_id: 'poll-123',
        option_id: 'option-123',
        user_id: null,
        voter_email: 'anonymous@example.com',
        voter_name: 'Anonymous User',
      })
    })

    it('should submit multiple votes when allowed', async () => {
      const multipleVotesPoll = { ...mockPoll, allow_multiple_votes: true }
      
      // Mock poll fetch
      mockSupabase.single.mockResolvedValueOnce({
        data: multipleVotesPoll,
        error: null,
      })

      // Mock option validation (called twice for two options)
      mockSupabase.single.mockResolvedValueOnce({
        data: mockOption,
        error: null,
      })

      mockSupabase.single.mockResolvedValueOnce({
        data: { ...mockOption, id: 'option-456' },
        error: null,
      })

      // Mock vote creation (called twice)
      mockSupabase.insert.mockResolvedValueOnce({
        data: null,
        error: null,
      })

      mockSupabase.insert.mockResolvedValueOnce({
        data: null,
        error: null,
      })

      mockGetSession.mockResolvedValue(mockUser)

      const voteData = {
        poll_id: 'poll-123',
        option_id: 'option-123',
      }

      const result = await submitVote(voteData)

      expect(result).toEqual({ success: true })
    })

    it('should throw error when poll not found', async () => {
      mockSupabase.single.mockResolvedValueOnce({
        data: null,
        error: { message: 'Not found' },
      })

      mockGetSession.mockResolvedValue(mockUser)

      const voteData = {
        poll_id: 'non-existent',
        option_id: 'option-123',
      }

      await expect(submitVote(voteData)).rejects.toThrow('Poll not found or inactive')
    })

    it('should throw error when poll is inactive', async () => {
      const inactivePoll = { ...mockPoll, is_active: false }
      
      mockSupabase.single.mockResolvedValueOnce({
        data: inactivePoll,
        error: null,
      })

      mockGetSession.mockResolvedValue(mockUser)

      const voteData = {
        poll_id: 'poll-123',
        option_id: 'option-123',
      }

      await expect(submitVote(voteData)).rejects.toThrow('Poll not found or inactive')
    })

    it('should throw error when poll has expired', async () => {
      const expiredPoll = { 
        ...mockPoll, 
        expires_at: new Date(Date.now() - 86400000).toISOString() // Yesterday
      }
      
      mockSupabase.single.mockResolvedValueOnce({
        data: expiredPoll,
        error: null,
      })

      mockGetSession.mockResolvedValue(mockUser)

      const voteData = {
        poll_id: 'poll-123',
        option_id: 'option-123',
      }

      await expect(submitVote(voteData)).rejects.toThrow('This poll has expired')
    })

    it('should throw error when authentication required but user not logged in', async () => {
      const authRequiredPoll = { ...mockPoll, require_auth_to_vote: true }
      
      mockSupabase.single.mockResolvedValueOnce({
        data: authRequiredPoll,
        error: null,
      })

      mockGetSession.mockResolvedValue(null)

      const voteData = {
        poll_id: 'poll-123',
        option_id: 'option-123',
        voter_email: 'anonymous@example.com',
      }

      await expect(submitVote(voteData)).rejects.toThrow('This poll requires authentication to vote')
    })

    it('should throw error when user already voted and multiple votes not allowed', async () => {
      // Mock poll fetch
      mockSupabase.single.mockResolvedValueOnce({
        data: mockPoll,
        error: null,
      })

      // Mock existing vote check
      mockSupabase.single.mockResolvedValueOnce({
        data: { id: 'existing-vote' },
        error: null,
      })

      mockGetSession.mockResolvedValue(mockUser)

      const voteData = {
        poll_id: 'poll-123',
        option_id: 'option-123',
      }

      await expect(submitVote(voteData)).rejects.toThrow('You have already voted on this poll')
    })

    it('should throw error when anonymous user already voted and multiple votes not allowed', async () => {
      // Mock poll fetch
      mockSupabase.single.mockResolvedValueOnce({
        data: mockPoll,
        error: null,
      })

      // Mock existing vote check
      mockSupabase.single.mockResolvedValueOnce({
        data: { id: 'existing-vote' },
        error: null,
      })

      mockGetSession.mockResolvedValue(null)

      const voteData = {
        poll_id: 'poll-123',
        option_id: 'option-123',
        voter_email: 'anonymous@example.com',
      }

      await expect(submitVote(voteData)).rejects.toThrow('You have already voted on this poll')
    })

    it('should throw error when option does not exist', async () => {
      // Mock poll fetch
      mockSupabase.single.mockResolvedValueOnce({
        data: mockPoll,
        error: null,
      })

      // Mock option validation failure
      mockSupabase.single.mockResolvedValueOnce({
        data: null,
        error: { message: 'Not found' },
      })

      mockGetSession.mockResolvedValue(mockUser)

      const voteData = {
        poll_id: 'poll-123',
        option_id: 'non-existent-option',
      }

      await expect(submitVote(voteData)).rejects.toThrow('Invalid voting option')
    })

    it('should throw error when option belongs to different poll', async () => {
      // Mock poll fetch
      mockSupabase.single.mockResolvedValueOnce({
        data: mockPoll,
        error: null,
      })

      // Mock option validation with wrong poll_id
      mockSupabase.single.mockResolvedValueOnce({
        data: { ...mockOption, poll_id: 'different-poll' },
        error: null,
      })

      mockGetSession.mockResolvedValue(mockUser)

      const voteData = {
        poll_id: 'poll-123',
        option_id: 'option-123',
      }

      await expect(submitVote(voteData)).rejects.toThrow('Invalid voting option')
    })

    it('should throw error when vote creation fails', async () => {
      // Mock poll fetch
      mockSupabase.single.mockResolvedValueOnce({
        data: mockPoll,
        error: null,
      })

      // Mock option validation
      mockSupabase.single.mockResolvedValueOnce({
        data: mockOption,
        error: null,
      })

      // Mock vote creation failure
      mockSupabase.insert.mockResolvedValueOnce({
        data: null,
        error: { message: 'Database error' },
      })

      mockGetSession.mockResolvedValue(mockUser)

      const voteData = {
        poll_id: 'poll-123',
        option_id: 'option-123',
      }

      await expect(submitVote(voteData)).rejects.toThrow('Failed to submit vote')
    })
  })

  describe('getUserVotes', () => {
    const mockUser = {
      id: 'user-123',
      email: 'test@example.com',
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    }

    it('should fetch user votes successfully', async () => {
      const mockVotes = [
        { option_id: 'option-1' },
        { option_id: 'option-2' },
      ]

      mockSupabase.single.mockResolvedValueOnce({
        data: mockVotes,
        error: null,
      })

      mockGetSession.mockResolvedValue(mockUser)

      const result = await getUserVotes('poll-123')

      expect(result).toEqual(['option-1', 'option-2'])
      expect(mockSupabase.from).toHaveBeenCalledWith('votes')
      expect(mockSupabase.select).toHaveBeenCalledWith('option_id')
      expect(mockSupabase.eq).toHaveBeenCalledWith('poll_id', 'poll-123')
      expect(mockSupabase.eq).toHaveBeenCalledWith('user_id', 'user-123')
    })

    it('should return empty array when user not authenticated', async () => {
      mockGetSession.mockResolvedValue(null)

      const result = await getUserVotes('poll-123')

      expect(result).toEqual([])
    })

    it('should return empty array when fetch fails', async () => {
      mockSupabase.single.mockResolvedValueOnce({
        data: null,
        error: { message: 'Database error' },
      })

      mockGetSession.mockResolvedValue(mockUser)

      const result = await getUserVotes('poll-123')

      expect(result).toEqual([])
    })
  })

  describe('getAnonymousVotes', () => {
    it('should fetch anonymous votes successfully', async () => {
      const mockVotes = [
        { option_id: 'option-1' },
        { option_id: 'option-3' },
      ]

      mockSupabase.single.mockResolvedValueOnce({
        data: mockVotes,
        error: null,
      })

      const result = await getAnonymousVotes('poll-123', 'anonymous@example.com')

      expect(result).toEqual(['option-1', 'option-3'])
      expect(mockSupabase.from).toHaveBeenCalledWith('votes')
      expect(mockSupabase.select).toHaveBeenCalledWith('option_id')
      expect(mockSupabase.eq).toHaveBeenCalledWith('poll_id', 'poll-123')
      expect(mockSupabase.eq).toHaveBeenCalledWith('voter_email', 'anonymous@example.com')
    })

    it('should return empty array when fetch fails', async () => {
      mockSupabase.single.mockResolvedValueOnce({
        data: null,
        error: { message: 'Database error' },
      })

      const result = await getAnonymousVotes('poll-123', 'anonymous@example.com')

      expect(result).toEqual([])
    })
  })
})
