import { User } from '../../../../src/domain/entities/User';
import { PointsBalanceVO } from '../../../../src/domain/value-objects/PointsBalance.vo';
import { InvalidUsernameLengthException } from '../../../../src/domain/exceptions/InvalidUsernameLength.exception';

const makePointsBalance = () => PointsBalanceVO.create(10);

const makeValidParams = (
  overrides: Partial<Parameters<typeof User.create>[0]> = {},
) => ({
  id: 'user-1',
  username: 'john_doe',
  email: 'john@example.com',
  photoUrl: 'https://example.com/photo.jpg',
  pointsBalance: makePointsBalance(),
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-02'),
  ...overrides,
});

describe('User', () => {
  describe('create', () => {
    it('should create a user with all provided fields', () => {
      const params = makeValidParams();
      const user = User.create(params);

      expect(user.id).toBe(params.id);
      expect(user.username).toBe(params.username);
      expect(user.email).toBe(params.email);
      expect(user.photoUrl).toBe(params.photoUrl);
      expect(user.pointsBalance).toBe(params.pointsBalance);
      expect(user.createdAt).toBe(params.createdAt);
      expect(user.updatedAt).toBe(params.updatedAt);
    });

    it('should create a user without optional fields', () => {
      const params = makeValidParams({
        email: undefined,
        photoUrl: undefined,
        updatedAt: undefined,
      });
      const user = User.create(params);

      expect(user.email).toBeUndefined();
      expect(user.photoUrl).toBeUndefined();
      expect(user.updatedAt).toBeUndefined();
    });

    it('should accept a username of exactly 3 characters', () => {
      const user = User.create(makeValidParams({ username: 'abc' }));
      expect(user.username).toBe('abc');
    });

    it('should accept a username of exactly 50 characters', () => {
      const username = 'a'.repeat(50);
      const user = User.create(makeValidParams({ username }));
      expect(user.username).toBe(username);
    });

    it('should throw when username is shorter than 3 characters', () => {
      expect(() => User.create(makeValidParams({ username: 'ab' }))).toThrow(
        InvalidUsernameLengthException,
      );
    });

    it('should throw when username is longer than 50 characters', () => {
      expect(() =>
        User.create(makeValidParams({ username: 'a'.repeat(51) })),
      ).toThrow(InvalidUsernameLengthException);
    });

    it('should throw when username is empty', () => {
      expect(() => User.create(makeValidParams({ username: '' }))).toThrow(
        InvalidUsernameLengthException,
      );
    });
  });
});
