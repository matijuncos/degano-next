export const formatPrice = (price: number): string => {
  return `$ ${new Intl.NumberFormat('es-AR').format(Number(price))}`
}