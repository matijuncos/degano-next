export const columnsByType: Record<string, { key: string; label: string }[]> = {
  band: [
    { key: 'bandName', label: 'Nombre de banda' },
    { key: 'showTime', label: 'Horario show' },
    { key: 'testTime', label: 'Horario prueba' },
    { key: 'manager', label: 'Manager' },
    { key: 'managerPhone', label: 'Teléfono' },
    { key: 'bandInfo', label: 'Info' }
  ],
  contact: [
    { key: 'name', label: 'Nombre' },
    { key: 'phone', label: 'Teléfono' },
    { key: 'rol', label: 'Rol' }
  ]
};
