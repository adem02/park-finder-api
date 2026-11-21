import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { ReportAvailabilityInputDto } from '../../../../src/modules/parking/dto/ReportAvailabilityInputDto';

const validateBody = (body: unknown) =>
  validate(plainToInstance(ReportAvailabilityInputDto, body));

describe('ReportAvailabilityInputDto', () => {
  it('should accept 0 available spots (full parking)', async () => {
    const errors = await validateBody({ availableSpots: 0 });

    expect(errors).toHaveLength(0);
  });

  it('should accept a positive number of spots', async () => {
    const errors = await validateBody({ availableSpots: 12 });

    expect(errors).toHaveLength(0);
  });

  it('should reject a negative number of spots', async () => {
    const errors = await validateBody({ availableSpots: -1 });

    expect(errors).toHaveLength(1);
    expect(errors[0].constraints).toHaveProperty('min');
  });

  it('should reject a non-numeric value', async () => {
    const errors = await validateBody({ availableSpots: 'full' });

    expect(errors).toHaveLength(1);
    expect(errors[0].constraints).toHaveProperty('isNumber');
  });
});
