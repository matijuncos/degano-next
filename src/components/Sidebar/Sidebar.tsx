import TreeView from '@/components/TreeView/TreeView'

export default function   Sidebar({
  onSelect,
  selectedCategory,
  // disableCreateEquipment,
}: {
  onSelect: (node: any) => void;
  selectedCategory: any;
  // disableCreateEquipment: any;
}) {
  return (
    <aside className="w-64 border-r h-screen p-2 overflow-y-auto">
      <h2 className="font-bold text-lg mb-2" style={{textAlign: 'center'}}>Equipamiento</h2>
      <TreeView onSelect={onSelect} selectedCategory={selectedCategory} />
    </aside>
  );
}

