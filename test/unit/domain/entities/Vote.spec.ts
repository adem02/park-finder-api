import { Vote } from '../../../../src/domain/entities/Vote';
import { VoteType } from '../../../../src/domain/types/vote.types';
import { Parking } from '../../../../src/domain/entities/Parking';
import { User } from '../../../../src/domain/entities/User';
import { CoordinatesVO } from '../../../../src/domain/value-objects/Coordinates.vo';
import { PointsBalanceVO } from '../../../../src/domain/value-objects/PointsBalance.vo';

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
  overrides: Partial<Parameters<typeof Vote.create>[0]> = {},
) => ({
  id: 'vote-1',
  parking: makeParking(),
  votedBy: makeUser(),
  voteType: VoteType.UPVOTE,
  createdAt: new Date('2024-01-01'),
  updateAt: new Date('2024-01-02'),
  ...overrides,
});

describe('Vote', () => {
  describe('create', () => {
    it('should create a vote with all provided fields', () => {
      const params = makeValidParams();
      const vote = Vote.create(params);

      expect(vote.id).toBe(params.id);
      expect(vote.parking).toBe(params.parking);
      expect(vote.votedBy).toBe(params.votedBy);
      expect(vote.voteType).toBe(params.voteType);
      expect(vote.createdAt).toBe(params.createdAt);
      expect(vote.updatedAt).toBe(params.updatedAt);
    });

    it('should create a vote without updateAt', () => {
      const vote = Vote.create(makeValidParams({ updatedAt: undefined }));
      expect(vote.updatedAt).toBeUndefined();
    });

    it('should create a DOWNVOTE', () => {
      const vote = Vote.create(
        makeValidParams({ voteType: VoteType.DOWNVOTE }),
      );
      expect(vote.voteType).toBe(VoteType.DOWNVOTE);
    });
  });

  describe('change', () => {
    it('should return a new Vote with the new voteType', () => {
      const original = Vote.create(
        makeValidParams({ voteType: VoteType.UPVOTE }),
      );
      const changed = original.change(VoteType.DOWNVOTE);

      expect(changed.voteType).toBe(VoteType.DOWNVOTE);
    });

    it('should preserve id, parking, votedBy and createdAt', () => {
      const original = Vote.create(makeValidParams());
      const changed = original.change(VoteType.DOWNVOTE);

      expect(changed.id).toBe(original.id);
      expect(changed.parking).toBe(original.parking);
      expect(changed.votedBy).toBe(original.votedBy);
      expect(changed.createdAt).toBe(original.createdAt);
    });

    it('should set a new updateAt date', () => {
      const before = new Date();
      const original = Vote.create(makeValidParams());
      const changed = original.change(VoteType.DOWNVOTE);
      const after = new Date();

      expect(changed.updatedAt).toBeDefined();
      expect(changed.updatedAt!.getTime()).toBeGreaterThanOrEqual(
        before.getTime(),
      );
      expect(changed.updatedAt!.getTime()).toBeLessThanOrEqual(after.getTime());
    });

    it('should not mutate the original vote', () => {
      const original = Vote.create(
        makeValidParams({ voteType: VoteType.UPVOTE }),
      );
      original.change(VoteType.DOWNVOTE);

      expect(original.voteType).toBe(VoteType.UPVOTE);
    });
  });
});
