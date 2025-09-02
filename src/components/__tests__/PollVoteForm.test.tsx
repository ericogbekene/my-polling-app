import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import PollVoteForm from '../PollVoteForm'
import { submitVote } from '../../lib/actions/votes'

// Mock the submitVote action
jest.mock('@/lib/actions/votes', () => ({
  submitVote: jest.fn(),
}))

// Mock Next.js router
const mockRefresh = jest.fn()
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    back: jest.fn(),
    refresh: mockRefresh,
  }),
}))

const mockSubmitVote = submitVote as jest.MockedFunction<typeof submitVote>

describe('PollVoteForm', () => {
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
      {
        id: 'option-3',
        text: 'Option 3',
        sort_order: 2,
        votes: [{ count: 2 }],
      },
    ],
  }

  const mockUser = {
    id: 'user-123',
    email: 'test@example.com',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders voting options for authenticated user', () => {
    render(<PollVoteForm poll={mockPoll} user={mockUser} />)

    expect(screen.getByText('Cast Your Vote')).toBeInTheDocument()
    expect(screen.getByText('Select an option:')).toBeInTheDocument()
    
    // Check all options are rendered
    expect(screen.getByText('Option 1')).toBeInTheDocument()
    expect(screen.getByText('Option 2')).toBeInTheDocument()
    expect(screen.getByText('Option 3')).toBeInTheDocument()
    
    // Check submit button
    expect(screen.getByRole('button', { name: /submit vote/i })).toBeInTheDocument()
  })

  it('renders anonymous voting form when user not authenticated', () => {
    render(<PollVoteForm poll={mockPoll} user={null} />)

    expect(screen.getByText('Cast Your Vote')).toBeInTheDocument()
    
    // Should show anonymous voter info section
    expect(screen.getByText('Your Information')).toBeInTheDocument()
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/name/i)).toBeInTheDocument()
    
    // Should show voting options
    expect(screen.getByText('Option 1')).toBeInTheDocument()
    expect(screen.getByText('Option 2')).toBeInTheDocument()
    expect(screen.getByText('Option 3')).toBeInTheDocument()
  })

  it('handles single choice voting correctly', async () => {
    const user = userEvent.setup()
    mockSubmitVote.mockResolvedValue({ success: true })

    render(<PollVoteForm poll={mockPoll} user={mockUser} />)

    // Select an option
    const option1Radio = screen.getByDisplayValue('option-1')
    await user.click(option1Radio)

    // Submit vote
    const submitButton = screen.getByRole('button', { name: /submit vote/i })
    await user.click(submitButton)

    // Wait for submission
    await waitFor(() => {
      expect(mockSubmitVote).toHaveBeenCalledWith({
        poll_id: 'poll-123',
        option_id: 'option-1',
      })
    })

    // Should show success message
    expect(screen.getByText(/vote submitted/i)).toBeInTheDocument()
    expect(screen.getByText(/thank you for voting/i)).toBeInTheDocument()
  })

  it('handles multiple choice voting when enabled', async () => {
    const user = userEvent.setup()
    const multipleVotesPoll = { ...mockPoll, allow_multiple_votes: true }
    mockSubmitVote.mockResolvedValue({ success: true })

    render(<PollVoteForm poll={multipleVotesPoll} user={mockUser} />)

    expect(screen.getByText('Select your options:')).toBeInTheDocument()

    // Select multiple options
    const option1Checkbox = screen.getByDisplayValue('option-1')
    const option2Checkbox = screen.getByDisplayValue('option-2')
    
    await user.click(option1Checkbox)
    await user.click(option2Checkbox)

    // Submit vote
    const submitButton = screen.getByRole('button', { name: /submit vote/i })
    await user.click(submitButton)

    // Wait for submission
    await waitFor(() => {
      expect(mockSubmitVote).toHaveBeenCalledWith({
        poll_id: 'poll-123',
        option_id: 'option-1',
      })
    })

    // Should show success message
    expect(screen.getByText(/vote submitted/i)).toBeInTheDocument()
  })

  it('handles anonymous voting correctly', async () => {
    const user = userEvent.setup()
    mockSubmitVote.mockResolvedValue({ success: true })

    render(<PollVoteForm poll={mockPoll} user={null} />)

    // Fill out anonymous voter info
    const emailInput = screen.getByLabelText(/email/i)
    const nameInput = screen.getByLabelText(/name/i)
    
    await user.type(emailInput, 'anonymous@example.com')
    await user.type(nameInput, 'Anonymous User')

    // Select an option
    const option1Radio = screen.getByDisplayValue('option-1')
    await user.click(option1Radio)

    // Submit vote
    const submitButton = screen.getByRole('button', { name: /submit vote/i })
    await user.click(submitButton)

    // Wait for submission
    await waitFor(() => {
      expect(mockSubmitVote).toHaveBeenCalledWith({
        poll_id: 'poll-123',
        option_id: 'option-1',
        voter_email: 'anonymous@example.com',
        voter_name: 'Anonymous User',
      })
    })

    // Should show success message
    expect(screen.getByText(/vote submitted/i)).toBeInTheDocument()
  })

  it('shows error when no option is selected', async () => {
    const user = userEvent.setup()
    render(<PollVoteForm poll={mockPoll} user={mockUser} />)

    // Try to submit without selecting an option
    const submitButton = screen.getByRole('button', { name: /submit vote/i })
    await user.click(submitButton)

    // Should show error
    expect(screen.getByText(/please select at least one option/i)).toBeInTheDocument()
    
    // Should not call submitVote
    expect(mockSubmitVote).not.toHaveBeenCalled()
  })

  it('shows error when multiple options selected for single choice poll', async () => {
    const user = userEvent.setup()
    render(<PollVoteForm poll={mockPoll} user={mockUser} />)

    // Try to select multiple options (should only allow one)
    const option1Radio = screen.getByDisplayValue('option-1')
    const option2Radio = screen.getByDisplayValue('option-2')
    
    await user.click(option1Radio)
    await user.click(option2Radio)

    // Should only have one option selected
    expect(option1Radio).not.toBeChecked()
    expect(option2Radio).toBeChecked()
  })

  it('shows error when authentication required but user not logged in', async () => {
    const user = userEvent.setup()
    const authRequiredPoll = { ...mockPoll, require_auth_to_vote: true }

    render(<PollVoteForm poll={authRequiredPoll} user={null} />)

    // Fill out anonymous voter info
    const emailInput = screen.getByLabelText(/email/i)
    await user.type(emailInput, 'anonymous@example.com')

    // Select an option
    const option1Radio = screen.getByDisplayValue('option-1')
    await user.click(option1Radio)

    // Submit vote
    const submitButton = screen.getByRole('button', { name: /submit vote/i })
    await user.click(submitButton)

    // Should show error
    expect(screen.getByText(/this poll requires authentication to vote/i)).toBeInTheDocument()
    
    // Should not call submitVote
    expect(mockSubmitVote).not.toHaveBeenCalled()
  })

  it('shows error when email is missing for anonymous voting', async () => {
    const user = userEvent.setup()
    render(<PollVoteForm poll={mockPoll} user={null} />)

    // Select an option without providing email
    const option1Radio = screen.getByDisplayValue('option-1')
    await user.click(option1Radio)

    // Submit vote
    const submitButton = screen.getByRole('button', { name: /submit vote/i })
    await user.click(submitButton)

    // Should show error
    expect(screen.getByText(/please provide your email address/i)).toBeInTheDocument()
    
    // Should not call submitVote
    expect(mockSubmitVote).not.toHaveBeenCalled()
  })

  it('handles voting errors correctly', async () => {
    const user = userEvent.setup()
    const errorMessage = 'You have already voted on this poll'
    mockSubmitVote.mockRejectedValue(new Error(errorMessage))

    render(<PollVoteForm poll={mockPoll} user={mockUser} />)

    // Select an option
    const option1Radio = screen.getByDisplayValue('option-1')
    await user.click(option1Radio)

    // Submit vote
    const submitButton = screen.getByRole('button', { name: /submit vote/i })
    await user.click(submitButton)

    // Wait for error to appear
    await waitFor(() => {
      expect(screen.getByText(/error/i)).toBeInTheDocument()
      expect(screen.getByText(errorMessage)).toBeInTheDocument()
    })
  })

  it('disables submit button when no option selected', () => {
    render(<PollVoteForm poll={mockPoll} user={mockUser} />)

    const submitButton = screen.getByRole('button', { name: /submit vote/i })
    expect(submitButton).toBeDisabled()
  })

  it('enables submit button when option is selected', async () => {
    const user = userEvent.setup()
    render(<PollVoteForm poll={mockPoll} user={mockUser} />)

    const submitButton = screen.getByRole('button', { name: /submit vote/i })
    expect(submitButton).toBeDisabled()

    // Select an option
    const option1Radio = screen.getByDisplayValue('option-1')
    await user.click(option1Radio)

    // Button should now be enabled
    expect(submitButton).toBeEnabled()
  })

  it('shows loading state during submission', async () => {
    const user = userEvent.setup()
    // Mock a slow response
    mockSubmitVote.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)))

    render(<PollVoteForm poll={mockPoll} user={mockUser} />)

    // Select an option
    const option1Radio = screen.getByDisplayValue('option-1')
    await user.click(option1Radio)

    // Submit vote
    const submitButton = screen.getByRole('button', { name: /submit vote/i })
    await user.click(submitButton)

    // Button should show loading state
    expect(submitButton).toBeDisabled()
    expect(submitButton).toHaveTextContent('Submitting...')
  })

  it('shows poll settings information', () => {
    const pollWithSettings = {
      ...mockPoll,
      allow_multiple_votes: true,
      require_auth_to_vote: true,
      expires_at: '2024-12-31T23:59:59Z',
    }

    render(<PollVoteForm poll={pollWithSettings} user={mockUser} />)

    // Should show poll settings info
    expect(screen.getByText(/you can select multiple options/i)).toBeInTheDocument()
    expect(screen.getByText(/authentication required to vote/i)).toBeInTheDocument()
    expect(screen.getByText(/poll expires on/i)).toBeInTheDocument()
  })

  it('refreshes page after successful vote', async () => {
    const user = userEvent.setup()
    mockSubmitVote.mockResolvedValue({ success: true })

    render(<PollVoteForm poll={mockPoll} user={mockUser} />)

    // Select an option
    const option1Radio = screen.getByDisplayValue('option-1')
    await user.click(option1Radio)

    // Submit vote
    const submitButton = screen.getByRole('button', { name: /submit vote/i })
    await user.click(submitButton)

    // Wait for success and page refresh
    await waitFor(() => {
      expect(screen.getByText(/vote submitted/i)).toBeInTheDocument()
    })

    // Should refresh page after delay
    await waitFor(() => {
      expect(mockRefresh).toHaveBeenCalled()
    }, { timeout: 2000 })
  })

  it('handles expired poll correctly', () => {
    const expiredPoll = {
      ...mockPoll,
      expires_at: '2020-01-01T00:00:00Z', // Past date
    }

    render(<PollVoteForm poll={expiredPoll} user={mockUser} />)

    // Should show that voting is closed
    expect(screen.getByText(/voting closed/i)).toBeInTheDocument()
    expect(screen.getByText(/this poll is no longer accepting votes/i)).toBeInTheDocument()
  })

  it('handles inactive poll correctly', () => {
    const inactivePoll = {
      ...mockPoll,
      is_active: false,
    }

    render(<PollVoteForm poll={inactivePoll} user={mockUser} />)

    // Should show that voting is closed
    expect(screen.getByText(/voting closed/i)).toBeInTheDocument()
    expect(screen.getByText(/this poll is no longer accepting votes/i)).toBeInTheDocument()
  })

  it('shows proper validation for anonymous voting', async () => {
    const user = userEvent.setup()
    render(<PollVoteForm poll={mockPoll} user={null} />)

    // Try to submit without email
    const option1Radio = screen.getByDisplayValue('option-1')
    await user.click(option1Radio)

    const submitButton = screen.getByRole('button', { name: /submit vote/i })
    await user.click(submitButton)

    // Should show email requirement error
    expect(screen.getByText(/please provide your email address/i)).toBeInTheDocument()
  })

  it('handles multiple votes submission correctly', async () => {
    const user = userEvent.setup()
    const multipleVotesPoll = { ...mockPoll, allow_multiple_votes: true }
    mockSubmitVote.mockResolvedValue({ success: true })

    render(<PollVoteForm poll={multipleVotesPoll} user={mockUser} />)

    // Select multiple options
    const option1Checkbox = screen.getByDisplayValue('option-1')
    const option2Checkbox = screen.getByDisplayValue('option-2')
    
    await user.click(option1Checkbox)
    await user.click(option2Checkbox)

    // Submit vote
    const submitButton = screen.getByRole('button', { name: /submit vote/i })
    await user.click(submitButton)

    // Should call submitVote for each selected option
    await waitFor(() => {
      expect(mockSubmitVote).toHaveBeenCalledTimes(2)
    })
  })
})
