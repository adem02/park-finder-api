import { Comment } from '../../../../src/domain/entities/Comment';
import { Parking } from '../../../../src/domain/entities/Parking';
import { User } from '../../../../src/domain/entities/User';
import { CoordinatesVO } from '../../../../src/domain/value-objects/Coordinates.vo';
import { PointsBalanceVO } from '../../../../src/domain/value-objects/PointsBalance.vo';
import { InvalidCommentContentLengthException } from '../../../../src/domain/exceptions/InvalidCommentContentLength.exception';

const makeUser = (): User =>
  User.create({
    id: 'user-1',
    username: 'john_doe',
    pointsBalance: PointsBalanceVO.create(10),
    createdAt: new Date('2024-01-01'),
  });

const makeParking = (): Parking =>
  Parking.create({
    id: 'parking-1',
    name: 'Centre Ville',
    totalSpots: 50,
    photos: [],
    coordinates: CoordinatesVO.create(0, 0),
    addedBy: makeUser(),
    createdAt: new Date('2024-01-01'),
  });

const makeValidParams = (
  overrides: Partial<Parameters<typeof Comment.create>[0]> = {},
) => ({
  id: 'comment-1',
  content: 'Super parking !',
  parking: makeParking(),
  author: makeUser(),
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-02'),
  ...overrides,
});

describe('Comment', () => {
  describe('create', () => {
    it('should create a comment with all provided fields', () => {
      const params = makeValidParams();
      const comment = Comment.create(params);

      expect(comment.id).toBe(params.id);
      expect(comment.content).toBe(params.content);
      expect(comment.parking).toBe(params.parking);
      expect(comment.author).toBe(params.author);
      expect(comment.createdAt).toBe(params.createdAt);
      expect(comment.updatedAt).toBe(params.updatedAt);
    });

    it('should create a comment without updatedAt', () => {
      const comment = Comment.create(makeValidParams({ updatedAt: undefined }));
      expect(comment.updatedAt).toBeUndefined();
    });

    it('should accept a content of exactly 1 character', () => {
      const comment = Comment.create(makeValidParams({ content: 'a' }));
      expect(comment.content).toBe('a');
    });

    it('should accept a content of exactly 500 characters', () => {
      const content = 'a'.repeat(500);
      const comment = Comment.create(makeValidParams({ content }));
      expect(comment.content).toBe(content);
    });

    it('should throw when content is empty', () => {
      expect(() => Comment.create(makeValidParams({ content: '' }))).toThrow(
        InvalidCommentContentLengthException,
      );
    });

    it('should throw when content exceeds 500 characters', () => {
      const content = 'a'.repeat(501);
      expect(() => Comment.create(makeValidParams({ content }))).toThrow(
        InvalidCommentContentLengthException,
      );
    });
  });

  describe('edit', () => {
    it('should return a new Comment with the updated content', () => {
      const original = Comment.create(makeValidParams());
      const edited = original.edit('Nouveau contenu');

      expect(edited.content).toBe('Nouveau contenu');
    });

    it('should preserve id, parking, author and createdAt', () => {
      const original = Comment.create(makeValidParams());
      const edited = original.edit('Nouveau contenu');

      expect(edited.id).toBe(original.id);
      expect(edited.parking).toBe(original.parking);
      expect(edited.author).toBe(original.author);
      expect(edited.createdAt).toBe(original.createdAt);
    });

    it('should set a new updatedAt date', () => {
      const before = new Date();
      const original = Comment.create(makeValidParams());
      const edited = original.edit('Nouveau contenu');
      const after = new Date();

      expect(edited.updatedAt).toBeDefined();
      expect(edited.updatedAt!.getTime()).toBeGreaterThanOrEqual(
        before.getTime(),
      );
      expect(edited.updatedAt!.getTime()).toBeLessThanOrEqual(after.getTime());
    });

    it('should not mutate the original comment', () => {
      const original = Comment.create(makeValidParams({ content: 'Original' }));
      original.edit('Modifié');

      expect(original.content).toBe('Original');
    });

    it('should accept edited content of exactly 1 character', () => {
      const original = Comment.create(makeValidParams());
      const edited = original.edit('x');
      expect(edited.content).toBe('x');
    });

    it('should accept edited content of exactly 500 characters', () => {
      const original = Comment.create(makeValidParams());
      const content = 'a'.repeat(500);
      const edited = original.edit(content);
      expect(edited.content).toBe(content);
    });

    it('should throw when new content is empty', () => {
      const original = Comment.create(makeValidParams());
      expect(() => original.edit('')).toThrow(
        InvalidCommentContentLengthException,
      );
    });

    it('should throw when new content exceeds 500 characters', () => {
      const original = Comment.create(makeValidParams());
      expect(() => original.edit('a'.repeat(501))).toThrow(
        InvalidCommentContentLengthException,
      );
    });
  });
});
