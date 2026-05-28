// Sample Mock for Gemini (Google AI) Analysis Service

export const mockGeminiService = {
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
    new Error('Failed to parse Gemini JSON response')
  ),
  
  // Simulate a rate limit or overloaded model
  analyzeThreatOverloaded: jest.fn().mockRejectedValue(
    new Error('Gemini API overloaded')
  )
};

export const resetGeminiMocks = () => {
  mockGeminiService.analyzeThreat.mockClear();
  mockGeminiService.analyzeThreatFailure.mockClear();
  mockGeminiService.analyzeThreatOverloaded.mockClear();
};
