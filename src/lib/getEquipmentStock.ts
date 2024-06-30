'use server';
export async function getEquipmentStock() {
  const timestamp = Date.parse(new Date().toString());
  const res = await fetch(
    process.env.URL + `/api/getEquipment?id=${timestamp}`,
    {
      cache: 'no-store'
    }
  );

  if (!res.ok) {
    throw new Error('Failed to fetch data');
  }

  return res.json();
}
