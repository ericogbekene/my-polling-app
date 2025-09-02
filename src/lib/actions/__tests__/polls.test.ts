import { createPoll, getPoll, getUserPolls, getPublicPolls } from '../polls'
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

describe('Poll Actions', () => {
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
    }
    
    mockGetSupabaseServerClient.mockReturnValue(mockSupabase)
  })

  describe('createPoll', () => {
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

    const mockFormData = new FormData()
    mockFormData.append('title', 'Test Poll')
    mockFormData.append('description', 'Test Description')
    mockFormData.append('options', 'Option 1')
    mockFormData.append('options', 'Option 2')
    mockFormData.append('expiresAt', '')
    mockFormData.append('allowMultipleVotes', 'off')
    mockFormData.append('requireAuthToVote', 'off')

    // Mock FormData methods for the test
    Object.defineProperty(mockFormData, 'get', {
      value: jest.fn((key: string) => {
        const data: { [key: string]: any } = {
          title: 'Test Poll',
          description: 'Test Description',
          expiresAt: '',
          allowMultipleVotes: 'off',
          requireAuthToVote: 'off',
        }
        return data[key] || null
      })
    })

    Object.defineProperty(mockFormData, 'getAll', {
      value: jest.fn((key: string) => {
        if (key === 'options') {
          return ['Option 1', 'Option 2']
        }
        return []
      })
    })

    it('should create a poll successfully with valid data', async () => {
      // Mock successful poll creation
      mockSupabase.insert.mockResolvedValueOnce({
        data: mockPoll,
        error: null,
      })

      // Mock successful options creation
      mockSupabase.insert.mockResolvedValueOnce({
        data: null,
        error: null,
      })

      mockGetSession.mockResolvedValue(mockUser)

      const result = await createPoll(mockFormData)

      expect(result).toEqual({
        success: true,
        pollId: 'poll-123',
      })

      // Verify poll was created
      expect(mockSupabase.insert).toHaveBeenCalledWith({
        title: 'Test Poll',
        description: 'Test Description',
        created_by: 'user-123',
        expires_at: null,
        allow_multiple_votes: false,
        require_auth_to_vote: false,
      })

      // Verify options were created
      expect(mockSupabase.insert).toHaveBeenCalledWith([
        {
          poll_id: 'poll-123',
          text: 'Option 1',
          sort_order: 0,
        },
        {
          poll_id: 'poll-123',
          text: 'Option 2',
          sort_order: 1,
        },
      ])

      // Verify cache was revalidated
      expect(mockRevalidatePath).toHaveBeenCalledWith('/polls')
      expect(mockRevalidatePath).toHaveBeenCalledWith('/polls/poll-123')
    })

    it('should create a poll with expiration date', async () => {
      const futureDate = new Date(Date.now() + 86400000).toISOString().slice(0, 16) // Tomorrow
      const formDataWithExpiry = new FormData()
      formDataWithExpiry.append('title', 'Test Poll')
      formDataWithExpiry.append('description', 'Test Description')
      formDataWithExpiry.append('options', 'Option 1')
      formDataWithExpiry.append('options', 'Option 2')
      formDataWithExpiry.append('expiresAt', futureDate)
      formDataWithExpiry.append('allowMultipleVotes', 'off')
      formDataWithExpiry.append('requireAuthToVote', 'off')

      // Mock FormData methods
      Object.defineProperty(formDataWithExpiry, 'get', {
        value: jest.fn((key: string) => {
          const data: { [key: string]: any } = {
            title: 'Test Poll',
            description: 'Test Description',
            expiresAt: futureDate,
            allowMultipleVotes: 'off',
            requireAuthToVote: 'off',
          }
          return data[key] || null
        })
      })

      Object.defineProperty(formDataWithExpiry, 'getAll', {
        value: jest.fn((key: string) => {
          if (key === 'options') {
            return ['Option 1', 'Option 2']
          }
          return []
        })
      })

      mockSupabase.insert.mockResolvedValueOnce({
        data: mockPoll,
        error: null,
      })

      mockSupabase.insert.mockResolvedValueOnce({
        data: null,
        error: null,
      })

      mockGetSession.mockResolvedValue(mockUser)

      const result = await createPoll(formDataWithExpiry)

      expect(result).toEqual({
        success: true,
        pollId: 'poll-123',
      })

      // Verify expiration date was set
      expect(mockSupabase.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          expires_at: expect.any(String),
        })
      )
    })

    it('should create a poll with multiple votes enabled', async () => {
      const formDataWithMultipleVotes = new FormData()
      formDataWithMultipleVotes.append('title', 'Test Poll')
      formDataWithMultipleVotes.append('description', 'Test Description')
      formDataWithMultipleVotes.append('options', 'Option 1')
      formDataWithMultipleVotes.append('options', 'Option 2')
      formDataWithMultipleVotes.append('expiresAt', '')
      formDataWithMultipleVotes.append('allowMultipleVotes', 'on')
      formDataWithMultipleVotes.append('requireAuthToVote', 'off')

      // Mock FormData methods
      Object.defineProperty(formDataWithMultipleVotes, 'get', {
        value: jest.fn((key: string) => {
          const data: { [key: string]: any } = {
            title: 'Test Poll',
            description: 'Test Description',
            expiresAt: '',
            allowMultipleVotes: 'on',
            requireAuthToVote: 'off',
          }
          return data[key] || null
        })
      })

      Object.defineProperty(formDataWithMultipleVotes, 'getAll', {
        value: jest.fn((key: string) => {
          if (key === 'options') {
            return ['Option 1', 'Option 2']
          }
          return []
        })
      })

      mockSupabase.insert.mockResolvedValueOnce({
        data: mockPoll,
        error: null,
      })

      mockSupabase.insert.mockResolvedValueOnce({
        data: null,
        error: null,
      })

      mockGetSession.mockResolvedValue(mockUser)

      const result = await createPoll(formDataWithMultipleVotes)

      expect(result).toEqual({
        success: true,
        pollId: 'poll-123',
      })

      // Verify multiple votes setting was applied
      expect(mockSupabase.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          allow_multiple_votes: true,
        })
      )
    })

    it('should create a poll with authentication required', async () => {
      const formDataWithAuth = new FormData()
      formDataWithAuth.append('title', 'Test Poll')
      formDataWithAuth.append('description', 'Test Description')
      formDataWithAuth.append('options', 'Option 1')
      formDataWithAuth.append('options', 'Option 2')
      formDataWithAuth.append('expiresAt', '')
      formDataWithAuth.append('allowMultipleVotes', 'off')
      formDataWithAuth.append('requireAuthToVote', 'on')

      mockSupabase.insert.mockResolvedValueOnce({
        data: mockPoll,
        error: null,
      })

      mockSupabase.insert.mockResolvedValueOnce({
        data: null,
        error: null,
      })

      mockGetSession.mockResolvedValue(mockUser)

      const result = await createPoll(formDataWithAuth)

      expect(result).toEqual({
        success: true,
        pollId: 'poll-123',
      })

      // Verify auth requirement was set
      expect(mockSupabase.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          require_auth_to_vote: true,
        })
      )
    })

    it('should filter out empty options', async () => {
      const formDataWithEmptyOptions = new FormData()
      formDataWithEmptyOptions.append('title', 'Test Poll')
      formDataWithEmptyOptions.append('description', 'Test Description')
      formDataWithEmptyOptions.append('options', 'Option 1')
      formDataWithEmptyOptions.append('options', '   ') // Empty option
      formDataWithEmptyOptions.append('options', 'Option 2')
      formDataWithEmptyOptions.append('expiresAt', '')
      formDataWithEmptyOptions.append('allowMultipleVotes', 'off')
      formDataWithEmptyOptions.append('requireAuthToVote', 'off')

      mockSupabase.insert.mockResolvedValueOnce({
        data: mockPoll,
        error: null,
      })

      mockSupabase.insert.mockResolvedValueOnce({
        data: null,
        error: null,
      })

      mockGetSession.mockResolvedValue(mockUser)

      const result = await createPoll(formDataWithEmptyOptions)

      expect(result).toEqual({
        success: true,
        pollId: 'poll-123',
      })

      // Verify only valid options were created
      expect(mockSupabase.insert).toHaveBeenCalledWith([
        {
          poll_id: 'poll-123',
          text: 'Option 1',
          sort_order: 0,
        },
        {
          poll_id: 'poll-123',
          text: 'Option 2',
          sort_order: 1,
        },
      ])
    })

    it('should throw error when user is not authenticated', async () => {
      mockGetSession.mockResolvedValue(null)

      await expect(createPoll(mockFormData)).rejects.toThrow('Authentication required')
    })

    it('should throw error when title is missing', async () => {
      const formDataWithoutTitle = new FormData()
      formDataWithoutTitle.append('description', 'Test Description')
      formDataWithoutTitle.append('options', 'Option 1')
      formDataWithoutTitle.append('options', 'Option 2')

      mockGetSession.mockResolvedValue(mockUser)

      await expect(createPoll(formDataWithoutTitle)).rejects.toThrow('Poll title is required')
    })

    it('should throw error when title is empty', async () => {
      const formDataWithEmptyTitle = new FormData()
      formDataWithEmptyTitle.append('title', '   ')
      formDataWithEmptyTitle.append('description', 'Test Description')
      formDataWithEmptyTitle.append('options', 'Option 1')
      formDataWithEmptyTitle.append('options', 'Option 2')

      mockGetSession.mockResolvedValue(mockUser)

      await expect(createPoll(formDataWithEmptyTitle)).rejects.toThrow('Poll title is required')
    })

    it('should throw error when less than 2 options provided', async () => {
      const formDataWithOneOption = new FormData()
      formDataWithOneOption.append('title', 'Test Poll')
      formDataWithOneOption.append('description', 'Test Description')
      formDataWithOneOption.append('options', 'Option 1')

      mockGetSession.mockResolvedValue(mockUser)

      await expect(createPoll(formDataWithOneOption)).rejects.toThrow('At least 2 options are required')
    })

    it('should throw error when all options are empty', async () => {
      const formDataWithEmptyOptions = new FormData()
      formDataWithEmptyOptions.append('title', 'Test Poll')
      formDataWithEmptyOptions.append('description', 'Test Description')
      formDataWithEmptyOptions.append('options', '   ')
      formDataWithEmptyOptions.append('options', '')

      mockGetSession.mockResolvedValue(mockUser)

      await expect(createPoll(formDataWithEmptyOptions)).rejects.toThrow('At least 2 valid options are required')
    })

    it('should throw error when expiration date is in the past', async () => {
      const pastDate = new Date(Date.now() - 86400000).toISOString().slice(0, 16) // Yesterday
      const formDataWithPastDate = new FormData()
      formDataWithPastDate.append('title', 'Test Poll')
      formDataWithPastDate.append('description', 'Test Description')
      formDataWithPastDate.append('options', 'Option 1')
      formDataWithPastDate.append('options', 'Option 2')
      formDataWithPastDate.append('expiresAt', pastDate)

      mockGetSession.mockResolvedValue(mockUser)

      await expect(createPoll(formDataWithPastDate)).rejects.toThrow('Expiration date must be in the future')
    })

    it('should throw error when poll creation fails', async () => {
      mockSupabase.insert.mockResolvedValueOnce({
        data: null,
        error: { message: 'Database error' },
      })

      mockGetSession.mockResolvedValue(mockUser)

      await expect(createPoll(mockFormData)).rejects.toThrow('Failed to create poll')
    })

    it('should throw error when options creation fails and clean up poll', async () => {
      // Mock successful poll creation
      mockSupabase.insert.mockResolvedValueOnce({
        data: mockPoll,
        error: null,
      })

      // Mock failed options creation
      mockSupabase.insert.mockResolvedValueOnce({
        data: null,
        error: { message: 'Options error' },
      })

      mockGetSession.mockResolvedValue(mockUser)

      await expect(createPoll(mockFormData)).rejects.toThrow('Failed to create poll options')

      // Verify poll was cleaned up
      expect(mockSupabase.from).toHaveBeenCalledWith('polls')
      expect(mockSupabase.delete).toHaveBeenCalled()
      expect(mockSupabase.eq).toHaveBeenCalledWith('id', 'poll-123')
    })
  })

  describe('getPoll', () => {
    const mockPollWithOptions = {
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
      poll_options: [
        {
          id: 'option-1',
          text: 'Option 1',
          sort_order: 0,
          votes: [{ count: 5 }],
        },
        {
          id: 'option-2',
          text: 'Option 2',
          sort_order: 1,
          votes: [{ count: 3 }],
        },
      ],
    }

    it('should fetch poll with options and vote counts', async () => {
      mockSupabase.single.mockResolvedValueOnce({
        data: mockPollWithOptions,
        error: null,
      })

      const result = await getPoll('poll-123')

      expect(result).toEqual(mockPollWithOptions)
      expect(mockSupabase.from).toHaveBeenCalledWith('polls')
      expect(mockSupabase.select).toHaveBeenCalledWith(`
        *,
        poll_options (
          *,
          votes (count)
        )
      `)
      expect(mockSupabase.eq).toHaveBeenCalledWith('id', 'poll-123')
      expect(mockSupabase.eq).toHaveBeenCalledWith('is_active', true)
    })

    it('should throw error when poll not found', async () => {
      mockSupabase.single.mockResolvedValueOnce({
        data: null,
        error: { message: 'Not found' },
      })

      await expect(getPoll('non-existent')).rejects.toThrow('Poll not found')
    })
  })

  describe('getUserPolls', () => {
    const mockUser = {
      id: 'user-123',
      email: 'test@example.com',
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    }

    const mockUserPolls = [
      {
        id: 'poll-1',
        title: 'User Poll 1',
        status: 'active',
        option_count: 3,
        total_votes: 10,
      },
      {
        id: 'poll-2',
        title: 'User Poll 2',
        status: 'expired',
        option_count: 2,
        total_votes: 5,
      },
    ]

    it('should fetch user polls successfully', async () => {
      mockSupabase.single.mockResolvedValueOnce({
        data: mockUserPolls,
        error: null,
      })

      mockGetSession.mockResolvedValue(mockUser)

      const result = await getUserPolls()

      expect(result).toEqual(mockUserPolls)
      expect(mockSupabase.from).toHaveBeenCalledWith('user_polls')
      expect(mockSupabase.eq).toHaveBeenCalledWith('created_by', 'user-123')
      expect(mockSupabase.order).toHaveBeenCalledWith('created_at', { ascending: false })
    })

    it('should throw error when user not authenticated', async () => {
      mockGetSession.mockResolvedValue(null)

      await expect(getUserPolls()).rejects.toThrow('Authentication required')
    })

    it('should throw error when fetch fails', async () => {
      mockSupabase.single.mockResolvedValueOnce({
        data: null,
        error: { message: 'Database error' },
      })

      mockGetSession.mockResolvedValue(mockUser)

      await expect(getUserPolls()).rejects.toThrow('Failed to fetch polls')
    })
  })

  describe('getPublicPolls', () => {
    const mockPublicPolls = [
      {
        id: 'poll-1',
        title: 'Public Poll 1',
        poll_options: [
          { id: 'option-1', text: 'Option 1', votes: [{ count: 5 }] },
        ],
      },
      {
        id: 'poll-2',
        title: 'Public Poll 2',
        poll_options: [
          { id: 'option-2', text: 'Option 2', votes: [{ count: 3 }] },
        ],
      },
    ]

    it('should fetch public polls successfully', async () => {
      mockSupabase.single.mockResolvedValueOnce({
        data: mockPublicPolls,
        error: null,
      })

      const result = await getPublicPolls()

      expect(result).toEqual(mockPublicPolls)
      expect(mockSupabase.from).toHaveBeenCalledWith('polls')
      expect(mockSupabase.select).toHaveBeenCalledWith(`
        *,
        poll_options (
          *,
          votes (count)
        )
      `)
      expect(mockSupabase.eq).toHaveBeenCalledWith('is_active', true)
      expect(mockSupabase.order).toHaveBeenCalledWith('created_at', { ascending: false })
      expect(mockSupabase.limit).toHaveBeenCalledWith(20)
    })

    it('should throw error when fetch fails', async () => {
      mockSupabase.single.mockResolvedValueOnce({
        data: null,
        error: { message: 'Database error' },
      })

      await expect(getPublicPolls()).rejects.toThrow('Failed to fetch polls')
    })
  })
})
