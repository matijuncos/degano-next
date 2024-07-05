'use server';
export async function removeClient(id: string) {
  const res = await fetch(process.env.URL + `/api/removeClient/${id}`, {
    method: 'DELETE',
    cache: 'no-store'
  });

  if (!res.ok) {
    throw new Error('Failed to fetch data');
  }

  return res.json();
}
