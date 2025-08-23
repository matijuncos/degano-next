import StaffTreeView from '@/components/TreeView/StaffTreeView';

export default function StaffSidebar({
  onSelect,
  selectedEmployee,
  onEdit
}: {
  onSelect: (node: any) => void;
  selectedEmployee: any;
  onEdit?: (item: any) => void;
}) {
  return (
    <aside className='border-r h-screen p-2 overflow-y-auto' style={{ width: '100%', height: '100%' }}>
      <h2 className='font-bold text-lg mb-2' style={{ textAlign: 'center' }}>
        Staff
      </h2>
      <StaffTreeView onSelect={onSelect} selectedEmployee={selectedEmployee} onEdit={onEdit}/>
    </aside>
  );
}
