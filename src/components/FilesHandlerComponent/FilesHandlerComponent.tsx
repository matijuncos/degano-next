'use client';
import '@mantine/dropzone/styles.css';
import { Box, Button, Flex, Loader } from '@mantine/core';
import { Group, Text, rem } from '@mantine/core';
import {
  IconUpload,
  IconPhoto,
  IconTrash,
  IconFile3d
} from '@tabler/icons-react';
import { Dropzone } from '@mantine/dropzone';
import { useEffect, useState, useCallback, useRef } from 'react';
import { useDeganoCtx } from '@/context/DeganoContext';
import { initializeGapiClientAndGetToken } from '@/lib/gapi';
interface FileItem {
  id: string;
  [key: string]: any;
}

interface LoadingState {
  findingFolder: boolean;
  fetchingFiles: boolean;
  uploading: boolean;
  deletingFile: string | null;
}

const baseUrl = process.env.NEXT_PUBLIC_GOOGLE_BASE_URL;
const DISCOVERY_DOCS = [process.env.NEXT_PUBLIC_GOOGLE_DISCOVERY_DOCS];

const gapiConfig = {
  apiKey: process.env.NEXT_PUBLIC_GAPICONFIG_APIKEY,
  clientId: process.env.NEXT_PUBLIC_GAPICONFIG_CLIENTID,
  discoveryDocs: [DISCOVERY_DOCS],
  scope: process.env.NEXT_PUBLIC_GOOGLE_SCOPES
};

export default function FilesHandlerComponent() {
  const { folderName, authToken, setAuthToken } = useDeganoCtx();
  const [value, setValue] = useState<File | null>(null);
  const [allFiles, setAllfiles] = useState<File[]>([]);
  // const [authToken, setAuthToken] = useState<string | null>(null);
  const [folderId, setFolderId] = useState('');
  const [files, setFiles] = useState<FileItem[]>([]);
  const [showUploadSection, setShowUploadSection] = useState(false);
  const [loading, setLoading] = useState<LoadingState>({
    findingFolder: false,
    fetchingFiles: false,
    uploading: false,
    deletingFile: null
  });
  useEffect(() => {
    if (value) {
      setAllfiles((prev: File[]) => {
        if (!prev.some((file) => file.name === value.name)) {
          return [...prev, value];
        } else {
          return [...prev];
        }
      });
    }
    setValue(null);
  }, [value]);

  // function updateSigninStatus(isSignedIn: boolean) {
  //   if (isSignedIn) {
  //     const currentAuth = gapiRef.current.auth2
  //       .getAuthInstance()
  //       .currentUser.get()
  //       .getAuthResponse().access_token;
  //     setAuthToken(currentAuth);
  //   } else {
  //     console.log('User not signed in.');
  //   }
  // }

  const gapiRef = useRef<any>(null);
  // useEffect(() => {
  //   async function start() {
  //     const gapiModule = await import('gapi-script');
  //     gapiRef.current = gapiModule.gapi || gapiModule.default.gapi; // Adjust based on actual module structure
  //     if (gapiRef.current) {
  //       gapiRef.current.load('client:auth2', () => {
  //         gapiRef.current.client
  //           .init(gapiConfig)
  //           .then(() => {
  //             gapiRef.current.auth2.getAuthInstance().signIn();
  //             gapiRef.current.auth2
  //               .getAuthInstance()
  //               .isSignedIn.listen(updateSigninStatus);
  //             updateSigninStatus(
  //               gapiRef.current.auth2.getAuthInstance().isSignedIn.get()
  //             );
  //           })
  //           .catch((e: any) => console.log(e));
  //       });
  //     } else {
  //       console.error('Failed to load gapi from gapi-script');
  //     }
  //   }
  //   start();
  // }, []);

  const findOrCreateFolder = useCallback(
    async (folderName: string) => {
      if (!authToken) return;
      setLoading((prev) => ({ ...prev, findingFolder: true }));
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
        } else {
          const metadata = {
            name: folderName,
            mimeType: 'application/vnd.google-apps.folder'
          };
          const createResponse = await fetch(baseUrl + '/drive/v3/files', {
            method: 'POST',
            headers: new Headers({
              Authorization: 'Bearer ' + authToken,
              'Content-Type': 'application/json'
            }),
            body: JSON.stringify(metadata)
          });
          const folder = await createResponse.json();
          console.log('Folder created', folder);
          setFolderId(folder.id);
          return folder.id;
        }
      } catch (error) {
        console.error('Error finding or creating folder', error);
        return null;
      } finally {
        setLoading((prev) => ({ ...prev, findingFolder: false }));
      }
    },
    [authToken, setFolderId]
  );

  const fetchFilesFromFolder = useCallback(
    async (folderId: string) => {
      setLoading((prev) => ({ ...prev, fetchingFiles: true }));
      try {
        const response = await fetch(
          `${baseUrl}/drive/v3/files?q='${folderId}'+in+parents and trashed=false`,
          {
            method: 'GET',
            cache: 'no-store',
            headers: new Headers({
              Authorization: 'Bearer ' + authToken
            })
          }
        );
        const result = await response.json();
        return result.files; // Returns an array of files
      } catch (error) {
        console.error('Error fetching files from folder', error);
        return [];
      } finally {
        setLoading((prev) => ({ ...prev, fetchingFiles: false }));
      }
    },
    [authToken]
  );

  useEffect(() => {
    findOrCreateFolder(folderName);
  }, [findOrCreateFolder]);

  useEffect(() => {
    const fetchFiles = async () => {
      if (authToken && folderId) {
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

  const handleUploadClick = async () => {
    setLoading((prev) => ({ ...prev, uploading: true }));
    try {
      const newfolderId = await findOrCreateFolder(folderName); // Use client name, salon and date to build the name
      if (!newfolderId) return;

      allFiles.forEach((file) => {
        const form = new FormData();
        form.append(
          'metadata',
          new Blob(
            [
              JSON.stringify({
                name: file.name,
                mimeType: file.type,
                parents: [newfolderId]
              })
            ],
            { type: 'application/json' }
          )
        );
        form.append('file', file);

        fetch(baseUrl + '/upload/drive/v3/files?uploadType=multipart', {
          method: 'POST',
          headers: new Headers({ Authorization: 'Bearer ' + authToken }),
          body: form
        })
          .then((response) => response.json())
          .then(() => {
            fetchFilesFromFolder(folderId)
              .then((res) => {
                setFiles(res);
                setAllfiles([]);
              })
              .catch((e) => console.log(e))
              .finally(() =>
                setLoading((prev) => ({ ...prev, uploading: false }))
              );
          })
          .catch((error) => {
            console.error('Error uploading file', error);
          });
      });
    } catch (error) {
      console.log(error);
    }
  };

  const deleteFileFromFolder = async (fileId: string) => {
    if (!authToken) {
      console.error('No auth token available');
      return;
    }

    setLoading((prev) => ({ ...prev, deletingFile: fileId }));
    try {
      const response = await fetch(`${baseUrl}/drive/v3/files/${fileId}`, {
        method: 'DELETE',
        headers: new Headers({
          Authorization: `Bearer ${authToken}`
        })
      });

      if (response.ok) {
        console.log(`File with ID ${fileId} deleted successfully.`);
        setFiles((prevFiles) => prevFiles.filter((file) => file.id !== fileId));
      } else {
        console.error('Failed to delete file', await response.text());
      }
    } catch (error) {
      console.error('Error deleting file:', error);
    } finally {
      setLoading((prev) => ({ ...prev, deletingFile: null }));
    }
  };

  return (
    <>
      {typeof window !== 'undefined' && (
        <>
          <Button
            onClick={() => setShowUploadSection((prev) => !prev)}
            w='100%'
            my='18px'
          >
            {showUploadSection
              ? 'Ocultar sección de carga de archivos'
              : 'Mostrar sección de carga de archivos'}
          </Button>

          {loading.findingFolder && <Loader size='sm' />}

          {showUploadSection && (
            <>
              <Flex w='100%'>
                <Dropzone
                  multiple
                  onDrop={(files) => setAllfiles((prev) => [...prev, ...files])}
                  onReject={(files) => console.log('rejected files', files)}
                  maxSize={10 * 1024 ** 2}
                  style={{ width: '100%', flex: 5 }}
                >
                  <Group
                    justify='center'
                    gap='xl'
                    mih={220}
                    style={{ pointerEvents: 'none' }}
                  >
                    {!allFiles.length ? (
                      <>
                        <Dropzone.Accept>
                          <IconUpload
                            style={{
                              width: rem(52),
                              height: rem(52),
                              color: 'var(--mantine-color-blue-6)'
                            }}
                            stroke={1.5}
                          />
                        </Dropzone.Accept>
                        <Dropzone.Idle>
                          <IconPhoto
                            style={{
                              width: rem(52),
                              height: rem(52),
                              color: 'var(--mantine-color-dimmed)'
                            }}
                            stroke={1.5}
                          />
                        </Dropzone.Idle>
                        <div>
                          <Text size='xl' inline>
                            Arrastra archivos o haz click
                          </Text>
                          <Text size='sm' c='dimmed' inline mt={7}>
                            Adjunta la cantidad de archivos que quieras. Cada
                            archivo no debe exceder los 5mb
                          </Text>
                        </div>
                      </>
                    ) : (
                      <div
                        style={{
                          display: 'flex',
                          gap: '22px',
                          width: '90%',
                          flexWrap: 'wrap',
                          justifyContent: 'flex-start',
                          alignItems: 'flex-start'
                        }}
                      >
                        {allFiles.map((file) => {
                          return (
                            <div
                              key={file.name}
                              onClick={() => console.log(file)}
                              style={{
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                width: '120px',
                                justifyContent: 'flex-start',
                                flex: 1
                              }}
                            >
                              <IconFile3d size={34} />
                              <div
                                style={{
                                  width: '100px',
                                  whiteSpace: 'nowrap',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis'
                                }}
                              >
                                {file.name}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </Group>
                </Dropzone>
                {!!allFiles.length && (
                  <Flex direction='column' p='18px' gap='8px' flex={1}>
                    {allFiles.map((file) => {
                      return (
                        <Flex
                          key={file.name}
                          gap='16px'
                          justify='space-between'
                        >
                          <div
                            style={{
                              width: '150px',
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis'
                            }}
                          >
                            <>{file.name}</>
                          </div>
                          <IconTrash
                            color='red'
                            onClick={() =>
                              setAllfiles((prev) =>
                                prev.filter((f) => f.name !== file.name)
                              )
                            }
                          />
                        </Flex>
                      );
                    })}
                  </Flex>
                )}
              </Flex>

              <Button
                disabled={allFiles.length === 0 || loading.uploading}
                mt='18px'
                w='100%'
                onClick={handleUploadClick}
                leftSection={
                  loading.uploading && <Loader size='sm' color='white' />
                }
              >
                {loading.uploading ? 'Subiendo...' : 'Subir Archivos'}
              </Button>
              <Box py='24px'>
                <hr />
              </Box>
            </>
          )}

          <Flex direction='column' gap='12px' align='flex-start'>
            <h2>Archivos en la carpeta de este evento (Google drive)</h2>
            {loading.fetchingFiles ? (
              <Loader size='sm' />
            ) : (
              files?.map((file) => (
                <Flex
                  gap='12px'
                  key={file.id}
                  justify='space-between'
                  p='12px 18px'
                  flex={1}
                  w='100%'
                  maw='350px'
                  style={{
                    border: 'solid 1px rgba(180, 180, 180, 0.3)',
                    borderRadius: '6px',
                    width: '100%',
                    maxWidth: '350px'
                  }}
                >
                  <div
                    style={{
                      width: '250px',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis'
                    }}
                  >
                    <a
                      href={
                        file.webContentLink ||
                        `https://drive.google.com/uc?id=${file.id}&export=download`
                      }
                      target='_blank'
                      rel='noopener noreferrer'
                    >
                      Descargar - {file.name}
                    </a>
                  </div>
                  {loading.deletingFile === file.id ? (
                    <Loader size='xs' />
                  ) : (
                    <IconTrash
                      color='red'
                      onClick={() => deleteFileFromFolder(file.id)}
                      cursor='pointer'
                    />
                  )}
                </Flex>
              ))
            )}
          </Flex>
        </>
      )}
    </>
  );
}
