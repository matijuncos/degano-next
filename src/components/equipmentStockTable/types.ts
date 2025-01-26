export type NewEquipmentType = 'Sonido' | 'Iluminación' | 'Imagen' | 'Accesorios' | 'No Definido';

export type NewEquipment = {
  _id?: string;
  name: string;
  price: number;
  totalQuantity: number;
  currentQuantity: number;
  selectedQuantity?: number;
  brand?: string;
  codeNumber?: string;
  model: string;
  realPrice: number;
  type: NewEquipmentType;
};
