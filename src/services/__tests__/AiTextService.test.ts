import { aiTextService } from '../AiTextService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { runQuery } from '@/db/database';
import Logger from '@/utils/logger';

// Mock dependencies
// jest.mock('@react-native-async-storage/async-storage'); // Relies on global mock
jest.mock('@/db/database');
jest.mock('@/utils/logger');

// Mock AI providers
jest.mock('../ai/OpenAiProvider', () => ({
  OpenAiProvider: jest.fn().mockImplementation(() => ({
    name: 'OpenAI',
    initialize: jest.fn().mockResolvedValue(true),
    isAvailable: jest.fn().mockResolvedValue(true),
    generateText: jest.fn().mockResolvedValue({
      text: 'mock response',
      provider: 'OpenAI',
      tokensUsed: 10,
      costEstimate: 0.01
    })
  }))
}));

jest.mock('../ai/PuterAiProvider', () => ({
  PuterAiProvider: jest.fn().mockImplementation(() => ({
    name: 'Puter.ai',
    isAvailable: jest.fn().mockResolvedValue(true),
    generateText: jest.fn().mockResolvedValue({
      text: 'mock puter response',
      provider: 'Puter.ai',
      tokensUsed: 8,
      costEstimate: 0
    })
  }))
}));

describe('AiTextService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Mock AsyncStorage
    (AsyncStorage.getItem as jest.Mock).mockImplementation((key) => {
      if (key === 'ai:selected_provider') return Promise.resolve('auto');
      return Promise.resolve(null);
    });
  });

  it('should initialize with AUTO provider by default', async () => {
    await aiTextService.initialize();
    expect(AsyncStorage.getItem).toHaveBeenCalledWith('ai:selected_provider');
  });

  it('should generate message variations', async () => {
    const result = await aiTextService.generateMessageVariation('test message');
    expect(result).toBe('mock response');
    expect(Logger.info).toHaveBeenCalled();
  });

  it('should personalize messages', async () => {
    const result = await aiTextService.personalizeMessage('template', { name: 'John' });
    expect(result).toBe('mock response');
    expect(runQuery).toHaveBeenCalled();
  });

  it('should enforce rate limiting', async () => {
    // Mock rate limit exceeded
    const originalCheck = aiTextService['checkRateLimit'];
    aiTextService['checkRateLimit'] = jest.fn().mockReturnValue(false);

    await expect(aiTextService.generateMessageVariation('test'))
      .rejects.toThrow('Rate limit exceeded');

    aiTextService['checkRateLimit'] = originalCheck;
  });

  it('should log usage to database', async () => {
    await aiTextService.generateMessageVariation('test');
    expect(runQuery).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO ai_usage_log'),
      expect.any(Array)
    );
  });
});
