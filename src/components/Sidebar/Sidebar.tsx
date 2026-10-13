import TreeView from '@/components/TreeView/TreeView';

export default function Sidebar({
  onSelect,
  selectedCategory,
  onEdit,
  onOpenModal,
  newEvent,
  eventStartDate,
  eventEndDate,
  editingEventId,
  disableEditOnSelect = false,
  onApplySet
}: {
  onSelect: (node: any) => void;
  selectedCategory: any;
  onEdit?: (item: any) => void;
  onOpenModal?: () => void;
  newEvent: boolean;
  eventStartDate?: Date | string;
  eventEndDate?: Date | string;
  // Evento que se está editando (sus reservas fantasma no bloquean)
  editingEventId?: string;
  disableEditOnSelect?: boolean;
  onApplySet?: () => void;
}) {
  return (
    <aside
      className='border-r h-screen p-2'
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden'
      }}
    >
      {!newEvent  &&
        <h2 className='font-bold text-lg mb-2' style={{ textAlign: 'center' }}>
          Equipamiento
        </h2>
      }
      <TreeView
        onSelect={onSelect}
        selectedCategory={selectedCategory}
        onEdit={onEdit}
        onOpenModal={onOpenModal}
        newEvent={newEvent}
        eventStartDate={eventStartDate}
        eventEndDate={eventEndDate}
        editingEventId={editingEventId}
        disableEditOnSelect={disableEditOnSelect}
        onApplySet={onApplySet}
      />
    </aside>
  );
}
