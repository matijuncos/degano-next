export type NewEquipment = {
  _id: string;
  name: string;
  price: number;
  totalQuantity: number;
  currentQuantity: number;
  selectedQuantity?: number;
};
