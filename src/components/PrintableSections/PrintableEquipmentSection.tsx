import React from 'react';
import { Page, Text, View, Document, StyleSheet, Image } from '@react-pdf/renderer';
import { EventModel } from '@/context/types';
import { findMainCategorySync } from '@/utils/categoryUtils';
import { groupEquipmentByNameCount } from '@/utils/equipmentGroupUtils';

const styles = StyleSheet.create({
  page: { padding: 30, fontSize: 11 },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  logo: { width: 220, height: 60 },
  sectionHeader: {
    backgroundColor: '#6aa74f',
    paddingHorizontal: 10,
    paddingVertical: 2,
    marginBottom: 16,
    borderRadius: 4
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
    backgroundColor: '#6aa74f',
    textTransform: 'uppercase'
  },
  section: { marginBottom: 12 },
  categorySection: {
    marginBottom: 16
  },
  categoryHeader: {
    backgroundColor: '#e8f5e9',
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginBottom: 8,
    borderRadius: 3,
    borderLeft: '3px solid #6aa74f'
  },
  categoryTitle: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#2e7d32',
    textTransform: 'uppercase'
  },
  equipmentTable: {
    marginTop: 8
  },
  equipmentTableHeader: {
    flexDirection: 'row',
    marginBottom: 8,
    backgroundColor: '#7dc55eab',
    padding: '4px 0px'
  },
  equipmentTableHeaderCell: {
    fontSize: 10,
    fontWeight: 'bold',
    textTransform: 'uppercase'
  },
  equipmentNameHeader: {
    flex: 2.5
  },
  equipmentQuantityHeader: {
    flex: 1,
    textAlign: 'center',
  },
  equipmentCheckboxHeader: {
    flex: 1,
    textAlign: 'center'
  },
  equipmentTableRow: {
    flexDirection: 'row',
    marginBottom: 6,
    alignItems: 'center'
  },
  equipmentNameCell: {
    flex: 2.5,
    fontSize: 10
  },
  equipmentQuantityCell: {
    flex: 1,
    fontSize: 10,
    textAlign: 'center',
    marginLeft: 8
  },
  equipmentCheckboxCell: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row'
  },
  checkbox: {
    width: 12,
    height: 12,
    border: '1.5px solid #333',
    backgroundColor: '#ffffff'
  },
  noDataText: {
    fontStyle: 'italic',
    color: '#666',
    fontSize: 10
  }
});

interface PrintableEquipmentSectionProps {
  event: EventModel;
  categories?: any[];
}

// Exportar contenido interno para reutilización en PrintableFullEventSection
export const PrintableEquipmentContent: React.FC<PrintableEquipmentSectionProps> = ({
  event,
  categories = []
}) => {
  // Primero agrupar equipos por categoría principal
  const groupedByCategory: { [categoryName: string]: any[] } = {};

  if (event.equipment && event.equipment.length > 0) {
    event.equipment.forEach((eq) => {
      // Primero intentar usar mainCategoryName existente
      let categoryName = eq.mainCategoryName;

      // Si no tiene mainCategoryName, calcularlo usando categoryId y las categorías
      if (!categoryName && eq.categoryId && categories.length > 0) {
        const mainCategory = findMainCategorySync(eq.categoryId, categories);
        categoryName = mainCategory?.name || 'Sin categoría';
      }

      // Fallback final
      if (!categoryName) {
        categoryName = 'Sin categoría';
      }

      if (!groupedByCategory[categoryName]) {
        groupedByCategory[categoryName] = [];
      }

      groupedByCategory[categoryName].push(eq);
    });
  }

  const categoryEntries = Object.entries(groupedByCategory);

  return (
    <View style={styles.section}>
      {categoryEntries.length > 0 ? (
        <View style={styles.equipmentTable}>
          {/* Header de la tabla */}
          <View style={styles.equipmentTableHeader} fixed>
            <Text style={[styles.equipmentTableHeaderCell, styles.equipmentNameHeader]}>
              Nombre Equipamiento
            </Text>
            <Text style={[styles.equipmentTableHeaderCell, styles.equipmentQuantityHeader]}>
              Cant.
            </Text>
            <Text style={[styles.equipmentTableHeaderCell, styles.equipmentCheckboxHeader]}>
              Controlado
            </Text>
            <Text style={[styles.equipmentTableHeaderCell, styles.equipmentCheckboxHeader]}>
              Listo
            </Text>
            <Text style={[styles.equipmentTableHeaderCell, styles.equipmentCheckboxHeader]}>
              Salida
            </Text>
            <Text style={[styles.equipmentTableHeaderCell, styles.equipmentCheckboxHeader]}>
              Regreso
            </Text>
          </View>

          {/* Secciones por categoría */}
          {categoryEntries.map(([categoryName, equipmentArray], categoryIndex) => {
            const equipmentByName = groupEquipmentByNameCount(equipmentArray);
            const equipmentEntries = Object.entries(equipmentByName);

            return (
              <View key={categoryIndex} style={styles.categorySection}>
                {/* Header de categoría */}
                <View style={styles.categoryHeader}>
                  <Text style={styles.categoryTitle}>{categoryName}</Text>
                </View>

                {/* Equipos de esta categoría */}
                {equipmentEntries.map(([name, quantity], index) => (
                  <View key={index} style={styles.equipmentTableRow} wrap={false}>
                    <Text style={styles.equipmentNameCell}>
                      {name}
                    </Text>
                    <Text style={styles.equipmentQuantityCell}>
                      {quantity > 1 ? quantity : '-'}
                    </Text>
                    <View style={styles.equipmentCheckboxCell}>
                      <View style={styles.checkbox} />
                    </View>
                    <View style={styles.equipmentCheckboxCell}>
                      <View style={styles.checkbox} />
                    </View>
                    <View style={styles.equipmentCheckboxCell}>
                      <View style={styles.checkbox} />
                    </View>
                    <View style={styles.equipmentCheckboxCell}>
                      <View style={styles.checkbox} />
                    </View>
                  </View>
                ))}
              </View>
            );
          })}
        </View>
      ) : (
        <Text style={styles.noDataText}>
          No hay equipos registrados para este evento.
        </Text>
      )}
    </View>
  );
};

// Componente principal con logo y header verde
const PrintableEquipmentSection: React.FC<PrintableEquipmentSectionProps> = ({
  event,
  categories = []
}) => (
  <Document>
    <Page size='A4' style={styles.page}>
      <View style={styles.header}>
        <Image src="/degano-logo-imp.png" style={styles.logo} />
      </View>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Equipos</Text>
      </View>
      <PrintableEquipmentContent event={event} categories={categories} />
    </Page>
  </Document>
);

export default PrintableEquipmentSection;
