import { CoordinatesVO } from '../../../../src/domain/value-objects/Coordinates.vo';
import { InvalidCoordinatesException } from '../../../../src/domain/exceptions/InvalidCoordinates.exception';

const PARIS_HOTEL_DE_VILLE = { lat: 48.8566, lng: 2.3522 };
const LYON_BELLECOUR = { lat: 45.7578, lng: 4.832 };

describe('CoordinatesVO', () => {
  describe('create', () => {
    it('should create valid coordinates (Paris - Hôtel de Ville)', () => {
      const coords = CoordinatesVO.create(
        PARIS_HOTEL_DE_VILLE.lat,
        PARIS_HOTEL_DE_VILLE.lng,
      );
      expect(coords.latitude).toBe(PARIS_HOTEL_DE_VILLE.lat);
      expect(coords.longitude).toBe(PARIS_HOTEL_DE_VILLE.lng);
    });

    it('should accept boundary values', () => {
      expect(() => CoordinatesVO.create(-90, -180)).not.toThrow();
      expect(() => CoordinatesVO.create(90, 180)).not.toThrow();
    });

    it('should throw for latitude below -90', () => {
      expect(() => CoordinatesVO.create(-90.1, 0)).toThrow(
        InvalidCoordinatesException,
      );
    });

    it('should throw for latitude above 90', () => {
      expect(() => CoordinatesVO.create(90.1, 0)).toThrow(
        InvalidCoordinatesException,
      );
    });

    it('should throw for longitude below -180', () => {
      expect(() => CoordinatesVO.create(0, -180.1)).toThrow(
        InvalidCoordinatesException,
      );
    });

    it('should throw for longitude above 180', () => {
      expect(() => CoordinatesVO.create(0, 180.1)).toThrow(
        InvalidCoordinatesException,
      );
    });
  });

  describe('distanceTo', () => {
    it('should return 0 for identical coordinates', () => {
      const paris = CoordinatesVO.create(
        PARIS_HOTEL_DE_VILLE.lat,
        PARIS_HOTEL_DE_VILLE.lng,
      );
      expect(paris.distanceTo(paris)).toBe(0);
    });

    it('should return a positive distance between Paris and Lyon', () => {
      const paris = CoordinatesVO.create(
        PARIS_HOTEL_DE_VILLE.lat,
        PARIS_HOTEL_DE_VILLE.lng,
      );
      const lyon = CoordinatesVO.create(LYON_BELLECOUR.lat, LYON_BELLECOUR.lng);
      expect(paris.distanceTo(lyon)).toBeGreaterThan(0);
    });

    it('should be symmetric: Paris→Lyon ≈ Lyon→Paris', () => {
      const paris = CoordinatesVO.create(
        PARIS_HOTEL_DE_VILLE.lat,
        PARIS_HOTEL_DE_VILLE.lng,
      );
      const lyon = CoordinatesVO.create(LYON_BELLECOUR.lat, LYON_BELLECOUR.lng);
      expect(paris.distanceTo(lyon)).toBeCloseTo(lyon.distanceTo(paris), 5);
    });

    it('should return ~391km between Paris and Lyon', () => {
      const paris = CoordinatesVO.create(
        PARIS_HOTEL_DE_VILLE.lat,
        PARIS_HOTEL_DE_VILLE.lng,
      );
      const lyon = CoordinatesVO.create(LYON_BELLECOUR.lat, LYON_BELLECOUR.lng);
      // Real straight-line distance ≈ 391 000m
      expect(paris.distanceTo(lyon)).toBeCloseTo(391_000, -4);
    });
  });
});
