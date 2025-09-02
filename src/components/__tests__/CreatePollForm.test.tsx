import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import CreatePollForm from '../CreatePollForm'
import { createPoll } from '../../lib/actions/polls'

// Mock the createPoll action
jest.mock('@/lib/actions/polls', () => ({
  createPoll: jest.fn(),
}))

// Mock Next.js router
const mockPush = jest.fn()
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    back: jest.fn(),
    refresh: jest.fn(),
  }),
}))

const mockCreatePoll = createPoll as jest.MockedFunction<typeof createPoll>

describe('CreatePollForm', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders the form with all required fields', () => {
    render(<CreatePollForm />)

    expect(screen.getByText('Create a New Poll')).toBeInTheDocument()
    expect(screen.getByText('Create a poll and share it with others to get their votes.')).toBeInTheDocument()
    
    // Check form fields
    expect(screen.getByLabelText(/poll title/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/description/i)).toBeInTheDocument()
    expect(screen.getByText(/poll options/i)).toBeInTheDocument()
    expect(screen.getByText(/poll settings/i)).toBeInTheDocument()
    
    // Check initial options
    expect(screen.getByPlaceholderText('Option 1')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Option 2')).toBeInTheDocument()
    
    // Check buttons
    expect(screen.getByRole('button', { name: /create poll/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument()
  })

  it('allows adding and removing poll options', async () => {
    const user = userEvent.setup()
    render(<CreatePollForm />)

    // Initially should have 2 options
    expect(screen.getByPlaceholderText('Option 1')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Option 2')).toBeInTheDocument()

    // Add a new option
    const addButton = screen.getByRole('button', { name: /add option/i })
    await user.click(addButton)

    // Should now have 3 options
    expect(screen.getByPlaceholderText('Option 1')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Option 2')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Option 3')).toBeInTheDocument()

    // Remove the third option
    const removeButtons = screen.getAllByRole('button', { name: '' })
    const removeButton = removeButtons.find(button => 
      button.querySelector('svg[data-testid="trash-2"]') || 
      button.innerHTML.includes('Trash2')
    )
    
    if (removeButton) {
      await user.click(removeButton)
    }

    // Should be back to 2 options
    expect(screen.getByPlaceholderText('Option 1')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Option 2')).toBeInTheDocument()
    expect(screen.queryByPlaceholderText('Option 3')).not.toBeInTheDocument()
  })

  it('prevents removing options when only 2 remain', async () => {
    const user = userEvent.setup()
    render(<CreatePollForm />)

    // Initially should have 2 options
    expect(screen.getByPlaceholderText('Option 1')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Option 2')).toBeInTheDocument()

    // Should not have remove buttons for the first 2 options
    const removeButtons = screen.queryAllByRole('button', { name: '' })
    const trashButtons = removeButtons.filter(button => 
      button.innerHTML.includes('Trash2')
    )
    
    expect(trashButtons).toHaveLength(0)
  })

  it('handles form submission successfully', async () => {
    const user = userEvent.setup()
    mockCreatePoll.mockResolvedValue({ success: true, pollId: 'poll-123' })

    render(<CreatePollForm />)

    // Fill out the form
    await user.type(screen.getByLabelText(/poll title/i), 'Test Poll Title')
    await user.type(screen.getByLabelText(/description/i), 'Test Poll Description')
    await user.type(screen.getByPlaceholderText('Option 1'), 'First Option')
    await user.type(screen.getByPlaceholderText('Option 2'), 'Second Option')

    // Submit the form
    const submitButton = screen.getByRole('button', { name: /create poll/i })
    await user.click(submitButton)

    // Wait for the action to complete
    await waitFor(() => {
      expect(mockCreatePoll).toHaveBeenCalled()
    })

    // Should show success message
    expect(screen.getByText(/poll created successfully/i)).toBeInTheDocument()
    expect(screen.getByText(/redirecting to polls page/i)).toBeInTheDocument()

    // Should redirect after delay
    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/polls?created=true')
    }, { timeout: 2000 })
  })

  it('handles form submission errors', async () => {
    const user = userEvent.setup()
    const errorMessage = 'Failed to create poll'
    mockCreatePoll.mockRejectedValue(new Error(errorMessage))

    render(<CreatePollForm />)

    // Fill out the form
    await user.type(screen.getByLabelText(/poll title/i), 'Test Poll Title')
    await user.type(screen.getByPlaceholderText('Option 1'), 'First Option')
    await user.type(screen.getByPlaceholderText('Option 2'), 'Second Option')

    // Submit the form
    const submitButton = screen.getByRole('button', { name: /create poll/i })
    await user.click(submitButton)

    // Wait for the error to appear
    await waitFor(() => {
      expect(screen.getByText(/error/i)).toBeInTheDocument()
      expect(screen.getByText(errorMessage)).toBeInTheDocument()
    })
  })

  it('validates required fields before submission', async () => {
    const user = userEvent.setup()
    render(<CreatePollForm />)

    // Try to submit without filling required fields
    const submitButton = screen.getByRole('button', { name: /create poll/i })
    await user.click(submitButton)

    // Should not call createPoll
    expect(mockCreatePoll).not.toHaveBeenCalled()
  })

  it('handles poll settings correctly', async () => {
    const user = userEvent.setup()
    mockCreatePoll.mockResolvedValue({ success: true, pollId: 'poll-123' })

    render(<CreatePollForm />)

    // Fill out basic form
    await user.type(screen.getByLabelText(/poll title/i), 'Test Poll Title')
    await user.type(screen.getByPlaceholderText('Option 1'), 'First Option')
    await user.type(screen.getByPlaceholderText('Option 2'), 'Second Option')

    // Enable multiple votes
    const multipleVotesCheckbox = screen.getByRole('checkbox', { name: /allow multiple votes per person/i })
    await user.click(multipleVotesCheckbox)

    // Enable auth requirement
    const authCheckbox = screen.getByRole('checkbox', { name: /require authentication to vote/i })
    await user.click(authCheckbox)

    // Set expiration date
    const expirationInput = screen.getByLabelText(/expiration date/i)
    const futureDate = new Date(Date.now() + 86400000).toISOString().slice(0, 16)
    await user.type(expirationInput, futureDate)

    // Submit the form
    const submitButton = screen.getByRole('button', { name: /create poll/i })
    await user.click(submitButton)

    // Wait for the action to complete
    await waitFor(() => {
      expect(mockCreatePoll).toHaveBeenCalled()
    })

    // Verify the form data was passed correctly
    const formData = mockCreatePoll.mock.calls[0][0]
    expect(formData.get('allowMultipleVotes')).toBe('on')
    expect(formData.get('requireAuthToVote')).toBe('on')
    expect(formData.get('expiresAt')).toBe(futureDate)
  })

  it('filters out empty options before submission', async () => {
    const user = userEvent.setup()
    mockCreatePoll.mockResolvedValue({ success: true, pollId: 'poll-123' })

    render(<CreatePollForm />)

    // Fill out basic form
    await user.type(screen.getByLabelText(/poll title/i), 'Test Poll Title')
    await user.type(screen.getByPlaceholderText('Option 1'), 'First Option')
    await user.type(screen.getByPlaceholderText('Option 2'), '   ') // Empty option

    // Add another option
    const addButton = screen.getByRole('button', { name: /add option/i })
    await user.click(addButton)
    await user.type(screen.getByPlaceholderText('Option 3'), 'Third Option')

    // Submit the form
    const submitButton = screen.getByRole('button', { name: /create poll/i })
    await user.click(submitButton)

    // Wait for the action to complete
    await waitFor(() => {
      expect(mockCreatePoll).toHaveBeenCalled()
    })

    // Verify only valid options were passed
    const formData = mockCreatePoll.mock.calls[0][0]
    const options = formData.getAll('options')
    expect(options).toEqual(['First Option', 'Third Option'])
  })

  it('disables form during submission', async () => {
    const user = userEvent.setup()
    // Mock a slow response
    mockCreatePoll.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)))

    render(<CreatePollForm />)

    // Fill out the form
    await user.type(screen.getByLabelText(/poll title/i), 'Test Poll Title')
    await user.type(screen.getByPlaceholderText('Option 1'), 'First Option')
    await user.type(screen.getByPlaceholderText('Option 2'), 'Second Option')

    // Submit the form
    const submitButton = screen.getByRole('button', { name: /create poll/i })
    await user.click(submitButton)

    // Form should be disabled during submission
    expect(submitButton).toBeDisabled()
    expect(submitButton).toHaveTextContent('Creating...')

    // Cancel button should also be disabled
    const cancelButton = screen.getByRole('button', { name: /cancel/i })
    expect(cancelButton).toBeDisabled()
  })

  it('disables form after successful submission', async () => {
    const user = userEvent.setup()
    mockCreatePoll.mockResolvedValue({ success: true, pollId: 'poll-123' })

    render(<CreatePollForm />)

    // Fill out the form
    await user.type(screen.getByLabelText(/poll title/i), 'Test Poll Title')
    await user.type(screen.getByPlaceholderText('Option 1'), 'First Option')
    await user.type(screen.getByPlaceholderText('Option 2'), 'Second Option')

    // Submit the form
    const submitButton = screen.getByRole('button', { name: /create poll/i })
    await user.click(submitButton)

    // Wait for success state
    await waitFor(() => {
      expect(screen.getByText(/poll created successfully/i)).toBeInTheDocument()
    })

    // Form should be disabled after success
    expect(submitButton).toBeDisabled()
    expect(submitButton).toHaveTextContent('Created!')

    // Cancel button should also be disabled
    const cancelButton = screen.getByRole('button', { name: /cancel/i })
    expect(cancelButton).toBeDisabled()
  })

  it('handles cancel button click', async () => {
    const user = userEvent.setup()
    const mockBack = jest.fn()
    jest.spyOn(require('next/navigation'), 'useRouter').mockReturnValue({
      push: mockPush,
      back: mockBack,
      refresh: jest.fn(),
    })

    render(<CreatePollForm />)

    const cancelButton = screen.getByRole('button', { name: /cancel/i })
    await user.click(cancelButton)

    expect(mockBack).toHaveBeenCalled()
  })

  it('shows proper validation for minimum options', async () => {
    const user = userEvent.setup()
    render(<CreatePollForm />)

    // Clear one of the options
    const option2Input = screen.getByPlaceholderText('Option 2')
    await user.clear(option2Input)

    // Try to submit
    const submitButton = screen.getByRole('button', { name: /create poll/i })
    await user.click(submitButton)

    // Should not submit with only one option
    expect(mockCreatePoll).not.toHaveBeenCalled()
  })

  it('handles dynamic option management correctly', async () => {
    const user = userEvent.setup()
    render(<CreatePollForm />)

    // Add multiple options
    const addButton = screen.getByRole('button', { name: /add option/i })
    
    await user.click(addButton) // Add option 3
    await user.click(addButton) // Add option 4
    await user.click(addButton) // Add option 5

    // Should now have 5 options
    expect(screen.getByPlaceholderText('Option 1')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Option 2')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Option 3')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Option 4')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Option 5')).toBeInTheDocument()

    // Remove option 3
    const removeButtons = screen.getAllByRole('button', { name: '' })
    const removeButton3 = removeButtons.find(button => 
      button.innerHTML.includes('Trash2')
    )
    
    if (removeButton3) {
      await user.click(removeButton3)
    }

    // Should now have 4 options
    expect(screen.getByPlaceholderText('Option 1')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Option 2')).toBeInTheDocument()
    expect(screen.queryByPlaceholderText('Option 3')).not.toBeInTheDocument()
    expect(screen.getByPlaceholderText('Option 4')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Option 5')).toBeInTheDocument()
  })
})
