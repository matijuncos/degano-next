// Función para encontrar la categoría raíz (la que no tiene parentId)
export async function findMainCategory(
  categoryId: string
): Promise<{ id: string; name: string } | null> {
  if (!categoryId) return null;

  try {
    // Obtener todas las categorías
    const response = await fetch('/api/categories');
    const categories = await response.json();

    // Función recursiva para encontrar la raíz
    const findRoot = (catId: string): any => {
      const category = categories.find((cat: any) => cat._id.toString() === catId);
      if (!category) return null;

      // Si no tiene parentId, es la raíz
      if (!category.parentId || category.parentId === 'equipment') {
        return category;
      }

      // Si tiene parentId, buscar recursivamente
      return findRoot(category.parentId);
    };

    const rootCategory = findRoot(categoryId);
    if (!rootCategory) return null;

    return {
      id: rootCategory._id.toString(),
      name: rootCategory.name
    };
  } catch (error) {
    console.error('Error finding main category:', error);
    return null;
  }
}

// Función sincrónica que recibe el array de categorías
export function findMainCategorySync(
  categoryId: string,
  categories: any[]
): { id: string; name: string } | null {
  if (!categoryId || !categories || categories.length === 0) return null;

  const findRoot = (catId: string): any => {
    const category = categories.find(
      (cat: any) => cat._id.toString() === catId || cat._id === catId
    );
    if (!category) return null;

    // Si no tiene parentId, es la raíz
    if (!category.parentId) {
      return category;
    }

    // Si tiene parentId, buscar recursivamente
    return findRoot(category.parentId);
  };

  const rootCategory = findRoot(categoryId);
  if (!rootCategory) return null;

  return {
    id: rootCategory._id.toString(),
    name: rootCategory.name
  };
}
