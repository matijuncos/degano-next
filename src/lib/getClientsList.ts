'use server';
export async function getClientsList() {
  const timestamp = Date.parse(new Date().toString());
  const res = await fetch(process.env.URL + `/api/getClients?id=${timestamp}`, {
    cache: 'no-store'
  });

  if (!res.ok) {
    throw new Error('Failed to fetch data');
  }

  return res.json();
}
