// Sample Mock for Claude Analysis Service

export const mockClaudeService = {
  // Simulate a successful validation response
  analyzeThreat: jest.fn().mockResolvedValue({
    isThreat: true,
    confidenceScore: 0.95,
    urgency: 'critical',
    reasoning: 'The domain mimics the official brand login page and requests credentials.',
    recommendedAction: 'takedown'
  }),

  // Simulate a model failure path (e.g., unparseable JSON or generic error)
  analyzeThreatFailure: jest.fn().mockRejectedValue(
    new Error('Failed to parse Claude JSON response')
  ),
  
  // Simulate a rate limit or overloaded model
  analyzeThreatOverloaded: jest.fn().mockRejectedValue(
    new Error('Anthropic API overloaded')
  )
};

export const resetClaudeMocks = () => {
  mockClaudeService.analyzeThreat.mockClear();
  mockClaudeService.analyzeThreatFailure.mockClear();
  mockClaudeService.analyzeThreatOverloaded.mockClear();
};
