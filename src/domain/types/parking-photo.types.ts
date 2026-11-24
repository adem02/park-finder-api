/** One photo of a parking, with who posted it (parking_photos ledger). */
export interface ParkingPhotoRecord {
  id: string;
  parkingId: string;
  url: string;
  addedById: string;
  /** Points given for this photo (0 when posted with the parking), taken back on removal. */
  awardedPoints: number;
  createdAt: Date;
}
