// Sample Mock for Bright Data SERP Client

export const mockBrightDataClient = {
  // Simulate a successful SERP capture
  captureBrandMentions: jest.fn().mockResolvedValue({
    id: 'mock-serp-id-123',
    status: 'completed',
    results: [
      {
        url: 'https://example-phishing.com',
        title: 'Your Brand - Login',
        snippet: 'Login to your account...',
        screenshotUrl: 'https://mock-screenshot-url.com/123.jpg'
      }
    ]
  }),
  
  // Simulate a failure (e.g., rate limit or network error)
  captureBrandMentionsFailure: jest.fn().mockRejectedValue(
    new Error('Bright Data rate limit exceeded')
  )
};

// Helpful for resetting between tests
export const resetBrightDataMocks = () => {
  mockBrightDataClient.captureBrandMentions.mockClear();
  mockBrightDataClient.captureBrandMentionsFailure.mockClear();
};
