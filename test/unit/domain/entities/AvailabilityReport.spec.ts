import { AvailabilityReport } from '../../../../src/domain/entities/AvailabilityReport';
import { Parking } from '../../../../src/domain/entities/Parking';
import { User } from '../../../../src/domain/entities/User';
import { CoordinatesVO } from '../../../../src/domain/value-objects/Coordinates.vo';
import { PointsBalanceVO } from '../../../../src/domain/value-objects/PointsBalance.vo';
import {
  AVAILABILITY_EXPIRY_MINUTES,
  AVAILABILITY_RECENT_MINUTES,
} from '../../../../src/domain/constants/availability.constants';
import { InvalidAvailabilityReportException } from '../../../../src/domain/exceptions/InvalidAvailabilityReport.exception';

const minutesAgo = (minutes: number) =>
  new Date(Date.now() - minutes * 60 * 1000);

const makeUser = (): User =>
  User.create({
    id: 'user-1',
    username: 'john_doe',
    pointsBalance: PointsBalanceVO.create(10),
    createdAt: new Date('2024-01-01'),
  });

const makeParking = (totalSpots = 50): Parking =>
  Parking.create({
    id: 'parking-1',
    name: 'Centre Ville',
    totalSpots,
    photos: [],
    coordinates: CoordinatesVO.create(0, 0),
    addedBy: makeUser(),
    createdAt: new Date('2024-01-01'),
  });

const makeValidParams = (
  overrides: Partial<Parameters<typeof AvailabilityReport.create>[0]> = {},
) => ({
  id: 'report-1',
  parking: makeParking(),
  reportedBy: makeUser(),
  availableSpots: 10,
  reportedAt: new Date(),
  ...overrides,
});

describe('AvailabilityReport', () => {
  describe('create', () => {
    it('should create a report with all provided fields', () => {
      const params = makeValidParams();
      const report = AvailabilityReport.create(params);

      expect(report.id).toBe(params.id);
      expect(report.parking).toBe(params.parking);
      expect(report.reportedBy).toBe(params.reportedBy);
      expect(report.availableSpots).toBe(params.availableSpots);
      expect(report.reportedAt).toBe(params.reportedAt);
    });

    it('should initialise the availability window from reportedAt', () => {
      const reportedAt = new Date();
      const report = AvailabilityReport.create(makeValidParams({ reportedAt }));

      expect(report.window.reportedAt).toBe(reportedAt);
    });

    it('should accept availableSpots of 0', () => {
      const report = AvailabilityReport.create(
        makeValidParams({ availableSpots: 0 }),
      );
      expect(report.availableSpots).toBe(0);
    });

    it('should accept availableSpots equal to totalSpots', () => {
      const parking = makeParking(50);
      const report = AvailabilityReport.create(
        makeValidParams({ parking, availableSpots: 50 }),
      );
      expect(report.availableSpots).toBe(50);
    });

    it('should throw when availableSpots is negative', () => {
      expect(() =>
        AvailabilityReport.create(makeValidParams({ availableSpots: -1 })),
      ).toThrow(InvalidAvailabilityReportException);
    });

    it('should throw when availableSpots exceeds totalSpots', () => {
      const parking = makeParking(10);
      expect(() =>
        AvailabilityReport.create(
          makeValidParams({ parking, availableSpots: 11 }),
        ),
      ).toThrow(InvalidAvailabilityReportException);
    });
  });

  describe('isExpired', () => {
    it('should be false when reported just now', () => {
      const report = AvailabilityReport.create(
        makeValidParams({ reportedAt: new Date() }),
      );
      expect(report.isExpired).toBe(false);
    });

    it(`should be true when reported more than ${AVAILABILITY_EXPIRY_MINUTES} minutes ago`, () => {
      const report = AvailabilityReport.create(
        makeValidParams({
          reportedAt: minutesAgo(AVAILABILITY_EXPIRY_MINUTES + 1),
        }),
      );
      expect(report.isExpired).toBe(true);
    });
  });

  describe('isRecent', () => {
    it('should be true when reported just now', () => {
      const report = AvailabilityReport.create(
        makeValidParams({ reportedAt: new Date() }),
      );
      expect(report.isRecent).toBe(true);
    });

    it(`should be false when reported more than ${AVAILABILITY_RECENT_MINUTES} minutes ago`, () => {
      const report = AvailabilityReport.create(
        makeValidParams({
          reportedAt: minutesAgo(AVAILABILITY_RECENT_MINUTES + 1),
        }),
      );
      expect(report.isRecent).toBe(false);
    });
  });

  describe('status', () => {
    it('should be "recent" when reported just now', () => {
      const report = AvailabilityReport.create(
        makeValidParams({ reportedAt: new Date() }),
      );
      expect(report.status).toBe('recent');
    });

    it('should be "old" when reported between recent and expiry thresholds', () => {
      const report = AvailabilityReport.create(
        makeValidParams({
          reportedAt: minutesAgo(AVAILABILITY_RECENT_MINUTES + 1),
        }),
      );
      expect(report.status).toBe('old');
    });

    it('should be "expired" when reported past the expiry threshold', () => {
      const report = AvailabilityReport.create(
        makeValidParams({
          reportedAt: minutesAgo(AVAILABILITY_EXPIRY_MINUTES + 1),
        }),
      );
      expect(report.status).toBe('expired');
    });
  });
});
