'use client';
import { useDeganoCtx } from '@/context/DeganoContext';
import useLoadingCursor from '@/hooks/useLoadingCursor';
import { DrawerHeader, NavLink, Divider } from '@mantine/core';
import { useRouter } from 'next/navigation';
import styles from './DrawerContent.module.css';
import { NewEquipmentType } from '../equipmentStockTable/types';
import { useState, useCallback, useEffect } from 'react';
import { initializeGapiClientAndGetToken } from '@/lib/gapi';
import { IconBrandGoogleDrive } from '@tabler/icons-react';

const CATEGORIES: NewEquipmentType[] = [
  'Sonido',
  'Iluminación',
  'Imagen',
  'Accesorios',
  'No Definido'
];

interface FileItem {
  id: string;
  [key: string]: any;
}

const baseUrl = process.env.NEXT_PUBLIC_GOOGLE_BASE_URL;
const DISCOVERY_DOCS = [process.env.NEXT_PUBLIC_GOOGLE_DISCOVERY_DOCS];

const gapiConfig = {
  apiKey: process.env.NEXT_PUBLIC_GAPICONFIG_APIKEY,
  clientId: process.env.NEXT_PUBLIC_GAPICONFIG_CLIENTID,
  discoveryDocs: [DISCOVERY_DOCS],
  scope: process.env.NEXT_PUBLIC_GOOGLE_SCOPES
};

const DrawerContent = () => {
  const { selectedEvent, authToken, setAuthToken } = useDeganoCtx();
  const router = useRouter();
  const setLoadingCursor = useLoadingCursor();
  const [folderId, setFolderId] = useState('');
  const [files, setFiles] = useState<FileItem[]>([]);

  const capitalizeFirstLetter = (string: string) => {
    return string.charAt(0).toUpperCase() + string.slice(1);
  };

  const findFolder = useCallback(
    async (folderName: string) => {
      try {
        const searchResponse = await fetch(
          `${baseUrl}/drive/v3/files?q=name='${folderName}' and mimeType='application/vnd.google-apps.folder' and trashed=false`,
          {
            method: 'GET',
            cache: 'no-store',
            headers: new Headers({
              Authorization: 'Bearer ' + authToken
            })
          }
        );
        const searchResult = await searchResponse.json();
        const folders = searchResult?.files;
        if (folders?.length > 0) {
          console.log('Folder exists', folders[0]);
          setFolderId(folders[0].id);
          return folders[0].id;
        }
      } catch (error) {
        console.error('Error finding or creating folder', error);
        return null;
      }
    },
    [authToken, setFolderId]
  );

  const fetchFilesFromFolder = useCallback(
    async (folderId: string) => {
      try {
        const response = await fetch(
          `${baseUrl}/drive/v3/files?q='${folderId}'+in+parents and trashed=false&fields=files(id,name,webViewLink)`,
          {
            method: 'GET',
            cache: 'no-store',
            headers: new Headers({
              Authorization: 'Bearer ' + authToken
            })
          }
        );
        const result = await response.json();
        return result.files;
      } catch (error) {
        console.error('Error fetching files from folder', error);
        return [];
      }
    },
    [authToken]
  );

  useEffect(() => {
    if (selectedEvent) {
      const folderName = `${new Date(selectedEvent?.date).toLocaleDateString(
        'es-ES',
        {
          day: '2-digit',
          month: '2-digit',
          year: '2-digit'
        }
      )} - ${selectedEvent?.type} - ${selectedEvent?.lugar}`;
      findFolder(folderName);
    }
  }, [findFolder]);

  useEffect(() => {
    const fetchFiles = async () => {
      if (authToken && folderId) {
        console.log('token and folderId ready');
        fetchFilesFromFolder(folderId)
          .then((res) => {
            setFiles(res);
          })
          .catch((e) => console.log(e));
      } else if (!authToken) {
        const token = await getToken();
        if (token) setAuthToken(token);
      }
    };
    fetchFiles();
  }, [authToken, folderId, fetchFilesFromFolder]);

  const getToken = async () => {
    const token = await initializeGapiClientAndGetToken(gapiConfig);
    return token;
  };

  return (
    <>
      <DrawerHeader
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-start'
        }}
      >
        <h3>
          {selectedEvent?.type} - {selectedEvent?.lugar}
        </h3>
        <p style={{ padding: '8px 0px' }}>
          {selectedEvent?.start
            ? capitalizeFirstLetter(
                new Date(selectedEvent.start ?? '').toLocaleDateString(
                  'es-AR',
                  {
                    weekday: 'long',
                    day: '2-digit',
                    month: 'long',
                    year: 'numeric'
                  }
                )
              )
            : 'N/A'}
        </p>
      </DrawerHeader>
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          minHeight: '78vh',
          maxHeight: '78vh'
        }}
      >
        <div>
          <h4 className={styles.subtitle}>
            <u>{`${selectedEvent?.type} - ${selectedEvent?.lugar} - ${selectedEvent?.address}`}</u>
          </h4>
          <div className={styles.sectionContainer}>
            <p>
              {capitalizeFirstLetter(
                new Date(selectedEvent?.start ?? '').toLocaleDateString(
                  'es-AR',
                  {
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: false,
                    weekday: 'short',
                    day: '2-digit'
                  }
                )
              )}{' '}
              Hs. a{' '}
              {capitalizeFirstLetter(
                new Date(selectedEvent?.endDate ?? '').toLocaleTimeString(
                  'es-AR',
                  {
                    hour: '2-digit',
                    minute: '2-digit',
                    weekday: 'short',
                    day: '2-digit',
                    hour12: false
                  }
                )
              )}{' '}
              Hs.
            </p>
            <p>
              {selectedEvent?.guests ? `${selectedEvent?.guests} Pers.` : ''}
            </p>
          </div>
          <h4 className={styles.subtitle}>
            <u>Cliente:</u>
          </h4>
          <div className={styles.sectionContainer}>
            <p>{`${selectedEvent?.fullName}: ${selectedEvent?.phoneNumber}`}</p>
          </div>
          <h4 className={styles.subtitle}>
            <u>
              Show{selectedEvent && selectedEvent.bands.length > 0 && 's'} en
              vivo:
            </u>
          </h4>
          {selectedEvent &&
            selectedEvent?.bands.map((band, i) => (
              <div className={styles.sectionContainer} key={i}>
                <p>+ {band?.bandName}</p>
                <p>{band?.bandInfo}</p>
                <p>
                  Contacto: {band?.manager}: {band?.managerPhone}
                </p>
              </div>
            ))}
          <h4 className={styles.subtitle}>
            <u>Características:</u>
          </h4>
          <div className={styles.sectionContainer}>
            <p>{selectedEvent?.moreData}</p>
          </div>
          <h4 className={styles.subtitle}>
            <u>Staff:</u>
          </h4>
          <div className={styles.sectionContainer}>
            <p>STAFF</p>
          </div>
          <h4 className={styles.subtitle}>
            <u>Presupuesto:</u>
          </h4>
          <div className={styles.sectionContainer}>
            <p>$ anexos</p>
            <Divider
              variant='dashed'
              size='sm'
              color='#C9C9C9'
              style={{ padding: '5px', margin: '10px 0' }}
            />
            <p style={{ paddingLeft: '12px' }}>
              ${selectedEvent?.payment?.totalToPay}
            </p>
            <p>- ${selectedEvent?.payment?.upfrontAmount}</p>
            {/* agrgare mapeo de cada cosa que vyaa restando */}
            <p>Restante: </p>
          </div>
          <h4 className={styles.subtitle}>
            <u>Equipamiento:</u>
          </h4>
          <div>
            {CATEGORIES.map((category) => {
              const equipmentInCategory =
                selectedEvent?.equipment.filter((eq) => eq.type === category) ||
                [];

              return (
                equipmentInCategory?.length > 0 && (
                  <div key={category}>
                    <h4
                      className={styles.subtitle}
                      style={{ textTransform: 'uppercase' }}
                    >
                      {category}:
                    </h4>
                    <div className={styles.sectionContainer}>
                      {equipmentInCategory.map((eq) => (
                        <p key={eq._id}>
                          {eq.selectedQuantity} {eq.name}
                        </p>
                      ))}
                    </div>
                  </div>
                )
              );
            })}
          </div>
          {selectedEvent &&
            selectedEvent?.bands.map((band, i) => (
              <div key={i}>
                <h4 className={styles.subtitle}>
                  <p>{`Anexo Banda en Vivo "${band.bandName}"`}</p>
                </h4>
                <p>DEFINIR EQUIPAMIENTOS POR BANDA?</p>
              </div>
            ))}
        </div>
        <div>
          {files.length > 0 &&
            files.map((file) => (
              <div
                key={file.name}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  width: '200px',
                  justifyContent: 'flex-start',
                  flex: 1,
                  cursor: 'pointer'
                }}
                onClick={() => {
                  if (file.webViewLink) {
                    window.open(file.webViewLink, '_blank');
                  }
                }}
              >
                <IconBrandGoogleDrive size={34} />
                <div
                  style={{
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    marginLeft: '5px'
                  }}
                >
                  {file.name}
                </div>
              </div>
            ))}
        </div>
        <div>
          <NavLink
            active
            onClick={() => {
              setLoadingCursor(true);
              router.push(`/event/${selectedEvent?._id}`);
            }}
            label='Ver Evento'
          ></NavLink>
        </div>
      </div>
    </>
  );
};
export default DrawerContent;
