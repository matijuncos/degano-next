// BandsContentPanel.tsx
'use client';
import {
  Table,
  Group,
} from '@mantine/core';
import { columnsByType } from '@/lib/columnsByType';

export default function BandsContentPanel({
  selectedBand,
  onEdit,
  onCancel
}: {
  selectedBand: any;
  onEdit?: (item: any) => void;
  onCancel?: (wasCancelled: boolean, updatedItem?: any) => void;
}) {

  const renderHeader = () => {
    if (!selectedBand?.type) return null;
    const cols = columnsByType[selectedBand.type] || [];
    return (
      <tr>
        {cols.map((col) => (
          <th key={col.key}>{col.label}</th>
        ))}
      </tr>
    );
  };

  const renderRows = () => {
    if (!selectedBand?.type) return null;
    const cols = columnsByType[selectedBand.type] || [];
    return (
      <tr
        style={{
          backgroundColor: 'rgba(255,255,255,0.05)',
          textAlign: 'center'
        }}
      >
        {cols.map((col) => (
          <td key={col.key}>
            {selectedBand[col.key] || '-'}
          </td>
        ))}
      </tr>
    );
  };

  const renderTitle = () => {
    if (!selectedBand) return 'Empleado';

    return (
      <Group justify='space-between' style={{ marginBottom: '1rem' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold' }}>
          {selectedBand.fullName}
        </h2>
      </Group>
    );
  };

  return (
    <div style={{ padding: '1rem', width: '100%', overflowX: 'auto' }}>
      {renderTitle()}
      {selectedBand && selectedBand._id && (
        <Table
          striped
          highlightOnHover
          withColumnBorders
          withRowBorders
          style={{
            width: '100%',
            borderCollapse: 'collapse',
            minWidth: '600px'
          }}
        >
          <thead style={{ backgroundColor: 'rgba(255,255,255,0.1)' }}>
            {renderHeader()}
          </thead>
          <tbody>{renderRows()}</tbody>
        </Table>
      )}
    </div>
  );
}
