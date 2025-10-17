export interface NewEquipment {
  _id: string;
  name: string;
  code: string;
  brand: string;
  model: string;
  serialNumber: string;
  lastUsedStartDate: Date | string;
  lastUsedEndDate: Date | string;
  rentalPrice: number;
  rentalPriceFormatted: string;
  investmentPrice: number;
  investmentPriceFormatted: string;
  weight: number;
  location: string;
  outOfService: {
    isOut: boolean;
    reason: string;
  };
  history: string;
  imageUrl: string;
  pdfUrl: string;
  pdfFileName: string | null;
}
