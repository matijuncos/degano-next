import TreeView from '@/components/TreeView/TreeView';

export default function Sidebar({
  onSelect,
  selectedCategory,
  onEdit
}: {
  onSelect: (node: any) => void;
  selectedCategory: any;
  onEdit?: (item: any) => void;
}) {
  return (
    <aside className='border-r h-screen p-2 overflow-y-auto' style={{ width: '100%', height: '100%' }}>
      <h2 className='font-bold text-lg mb-2' style={{ textAlign: 'center' }}>
        Equipamiento
      </h2>
      <TreeView onSelect={onSelect} selectedCategory={selectedCategory} onEdit={onEdit}/>
    </aside>
  );
}
