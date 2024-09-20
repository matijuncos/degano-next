export type NewEquipment = {
  _id: string;
  name: string;
  price: number;
  totalQuantity: number;
  currentQuantity: number;
  selectedQuantity?: number;
  brand?: string;
  codeNumber?: string;
};
