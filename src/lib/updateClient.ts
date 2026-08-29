export async function updateClient(client: {
  _id: string;
  fullName?: string;
  email?: string;
  phoneNumber?: string;
}) {
  const res = await fetch('/api/updateClient', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    cache: 'no-store',
    body: JSON.stringify(client)
  });

  if (!res.ok) {
    throw new Error('Failed to update client');
  }

  return res.json();
}
