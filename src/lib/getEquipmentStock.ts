'use server';
export async function getEquipmentStock() {
  const res = await fetch(process.env.URL + '/api/getEquipment', {
    next: { revalidate: 0 }
  });

  if (!res.ok) {
    // This will activate the closest `error.js` Error Boundary
    throw new Error('Failed to fetch data');
  }

  return res.json();
}
