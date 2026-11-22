import { UserCredentials } from '../../../../src/domain/entities/UserCredentials';
import { InvalidCredentialsException } from '../../../../src/domain/exceptions/InvalidCredentials.exception';

const makeValidLocalParams = (
  overrides: Partial<Parameters<typeof UserCredentials.create>[0]> = {},
) => ({
  id: 'cred-1',
  userId: 'user-1',
  provider: 'local' as const,
  passwordHash: 'hashed_password',
  firstName: 'John',
  lastName: 'Doe',
  photoUrl: 'https://example.com/photo.jpg',
  ...overrides,
});

const makeValidOAuthParams = (
  overrides: Partial<Parameters<typeof UserCredentials.create>[0]> = {},
) => ({
  id: 'cred-2',
  userId: 'user-2',
  provider: 'google' as const,
  providerId: 'google-uid-123',
  firstName: 'Jane',
  lastName: 'Doe',
  photoUrl: 'https://example.com/photo.jpg',
  ...overrides,
});

describe('UserCredentials', () => {
  describe('create', () => {
    describe('local provider', () => {
      it('should create local credentials with all fields', () => {
        const params = makeValidLocalParams();
        const cred = UserCredentials.create(params);

        expect(cred.id).toBe(params.id);
        expect(cred.userId).toBe(params.userId);
        expect(cred.provider).toBe('local');
        expect(cred.passwordHash).toBe(params.passwordHash);
        expect(cred.firstName).toBe(params.firstName);
        expect(cred.lastName).toBe(params.lastName);
        expect(cred.photoUrl).toBe(params.photoUrl);
      });

      it('should create local credentials without optional fields', () => {
        const cred = UserCredentials.create(
          makeValidLocalParams({
            firstName: undefined,
            lastName: undefined,
            photoUrl: undefined,
          }),
        );

        expect(cred.firstName).toBeUndefined();
        expect(cred.lastName).toBeUndefined();
        expect(cred.photoUrl).toBeUndefined();
      });

      it('should throw when local provider has no passwordHash', () => {
        expect(() =>
          UserCredentials.create(
            makeValidLocalParams({ passwordHash: undefined }),
          ),
        ).toThrow(InvalidCredentialsException);
      });
    });

    describe('OAuth provider', () => {
      it('should create google credentials with all fields', () => {
        const params = makeValidOAuthParams();
        const cred = UserCredentials.create(params);

        expect(cred.id).toBe(params.id);
        expect(cred.userId).toBe(params.userId);
        expect(cred.provider).toBe('google');
        expect(cred.providerId).toBe(params.providerId);
        expect(cred.passwordHash).toBeUndefined();
      });

      it('should create apple credentials', () => {
        const cred = UserCredentials.create(
          makeValidOAuthParams({
            provider: 'apple',
            providerId: 'apple-uid-456',
          }),
        );

        expect(cred.provider).toBe('apple');
        expect(cred.providerId).toBe('apple-uid-456');
      });

      it('should throw when OAuth provider has no providerId', () => {
        expect(() =>
          UserCredentials.create(
            makeValidOAuthParams({ providerId: undefined }),
          ),
        ).toThrow(InvalidCredentialsException);
      });
    });
  });

  describe('reconstitue', () => {
    it('should reconstitue local credentials with all fields', () => {
      const params = makeValidLocalParams();
      const cred = UserCredentials.reconstitue(params);

      expect(cred.id).toBe(params.id);
      expect(cred.userId).toBe(params.userId);
      expect(cred.provider).toBe('local');
      expect(cred.passwordHash).toBe(params.passwordHash);
      expect(cred.firstName).toBe(params.firstName);
      expect(cred.lastName).toBe(params.lastName);
      expect(cred.photoUrl).toBe(params.photoUrl);
    });

    it('should bypass validation for local credentials without passwordHash', () => {
      const cred = UserCredentials.reconstitue(
        makeValidLocalParams({ passwordHash: undefined }),
      );
      expect(cred.passwordHash).toBeUndefined();
    });

    it('should bypass validation for OAuth credentials without providerId', () => {
      const cred = UserCredentials.reconstitue(
        makeValidOAuthParams({ providerId: undefined }),
      );
      expect(cred.providerId).toBeUndefined();
    });

    it('should reconstitue OAuth credentials with all fields', () => {
      const params = makeValidOAuthParams();
      const cred = UserCredentials.reconstitue(params);

      expect(cred.id).toBe(params.id);
      expect(cred.userId).toBe(params.userId);
      expect(cred.provider).toBe('google');
      expect(cred.providerId).toBe(params.providerId);
    });
  });
});
