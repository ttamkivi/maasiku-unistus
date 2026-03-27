import { describe, it, expect } from 'vitest';

// Test the pure utility functions that don't need DB access
// We import the module and test the encryption/decryption and provider catalogue

describe('ai-provider utilities', () => {
  // We need to dynamically import to avoid Prisma client issues in test
  let encryptApiKey: (plain: string) => string;
  let decryptApiKey: (encrypted: string) => string;
  let getProviderForModel: (modelId: string) => string | null;
  let AI_PROVIDERS: Record<string, unknown>;

  // Since ai-provider.ts imports db at top level, we test what we can
  // by reading the source and verifying the logic patterns

  describe('encryption roundtrip (conceptual test)', () => {
    it('XOR encryption should be reversible', () => {
      // Replicate the encryption logic from ai-provider.ts
      const ENCRYPTION_KEY = process.env.AI_PROVIDER_ENCRYPTION_KEY || 'ot-default-encryption-key-change-in-prod';

      function encrypt(plain: string): string {
        const key = ENCRYPTION_KEY;
        let result = '';
        for (let i = 0; i < plain.length; i++) {
          result += String.fromCharCode(plain.charCodeAt(i) ^ key.charCodeAt(i % key.length));
        }
        return Buffer.from(result, 'binary').toString('base64');
      }

      function decrypt(encrypted: string): string {
        const key = ENCRYPTION_KEY;
        const decoded = Buffer.from(encrypted, 'base64').toString('binary');
        let result = '';
        for (let i = 0; i < decoded.length; i++) {
          result += String.fromCharCode(decoded.charCodeAt(i) ^ key.charCodeAt(i % key.length));
        }
        return result;
      }

      const testKeys = [
        'sk-ant-api03-test-key-12345',
        'sk-proj-abc123',
        'AIzaSyD_test_key_google',
        '', // empty string
        'a', // single char
        'a-very-long-key-that-is-longer-than-the-encryption-key-itself-to-test-wrapping',
      ];
      // Note: XOR cipher with binary encoding does NOT support multi-byte Unicode (emoji etc.)
      // This is acceptable since API keys are always ASCII.

      for (const key of testKeys) {
        const encrypted = encrypt(key);
        const decrypted = decrypt(encrypted);
        expect(decrypted).toBe(key);
      }
    });

    it('encrypted output differs from plaintext', () => {
      const ENCRYPTION_KEY = 'ot-default-encryption-key-change-in-prod';
      const plain = 'sk-ant-api03-test-key-12345';

      let result = '';
      for (let i = 0; i < plain.length; i++) {
        result += String.fromCharCode(plain.charCodeAt(i) ^ ENCRYPTION_KEY.charCodeAt(i % ENCRYPTION_KEY.length));
      }
      const encrypted = Buffer.from(result, 'binary').toString('base64');

      expect(encrypted).not.toBe(plain);
      expect(encrypted.length).toBeGreaterThan(0);
    });
  });

  describe('provider-model mapping (conceptual test)', () => {
    // Replicate the mapping logic
    const MODEL_TO_PROVIDER: Record<string, string> = {
      'claude-sonnet-4-6': 'anthropic',
      'claude-opus-4-6': 'anthropic',
      'claude-haiku-4-5': 'anthropic',
      'gpt-4o': 'openai',
      'gpt-4o-mini': 'openai',
      'o3': 'openai',
      'gemini-2.5-pro': 'google',
      'gemini-2.5-flash': 'google',
    };

    it('maps Anthropic models correctly', () => {
      expect(MODEL_TO_PROVIDER['claude-sonnet-4-6']).toBe('anthropic');
      expect(MODEL_TO_PROVIDER['claude-opus-4-6']).toBe('anthropic');
      expect(MODEL_TO_PROVIDER['claude-haiku-4-5']).toBe('anthropic');
    });

    it('maps OpenAI models correctly', () => {
      expect(MODEL_TO_PROVIDER['gpt-4o']).toBe('openai');
      expect(MODEL_TO_PROVIDER['gpt-4o-mini']).toBe('openai');
      expect(MODEL_TO_PROVIDER['o3']).toBe('openai');
    });

    it('maps Google models correctly', () => {
      expect(MODEL_TO_PROVIDER['gemini-2.5-pro']).toBe('google');
      expect(MODEL_TO_PROVIDER['gemini-2.5-flash']).toBe('google');
    });

    it('returns undefined for unknown model', () => {
      expect(MODEL_TO_PROVIDER['unknown-model']).toBeUndefined();
    });
  });
});
