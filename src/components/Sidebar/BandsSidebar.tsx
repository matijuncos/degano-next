import BandsTreeView from '@/components/TreeView/BandsTreeView';

export default function BandsSidebar({
  onSelect,
  selectedBand,
  onEdit,
  setAllData
}: {
  onSelect: (node: any) => void;
  selectedBand: any;
  onEdit?: (item: any) => void;
  setAllData: (data: any) => void;
}) {
  return (
    <aside className='border-r h-screen p-2 overflow-y-auto' style={{ width: '100%', height: '100%' }}>
      <h2 className='font-bold text-lg mb-2' style={{ textAlign: 'center' }}>
        Bands
      </h2>
      <BandsTreeView onSelect={onSelect} selectedBand={selectedBand} onEdit={onEdit} setAllData={setAllData}/>
    </aside>
  );
}
