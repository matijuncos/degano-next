export interface ScheduledUse {
  eventId: string;
  eventName: string;
  eventType: string;
  startDate: Date | string;
  endDate: Date | string;
  location: string;
}

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
  propiedad: 'Degano' | 'Alquilado';
  outOfService: {
    isOut: boolean;
    reason: string;
  };
  scheduledUses: ScheduledUse[];
  selectedQuantity: number;
  history: string;
  imageUrl: string;
  pdfUrl: string;
  pdfFileName: string | null;
  categoryId?: string;
  mainCategoryId?: string;
  mainCategoryName?: string;
  quantity?: number;
}
