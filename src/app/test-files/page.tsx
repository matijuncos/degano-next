'use client';
import '@mantine/dropzone/styles.css';
import { Box, Button, Flex } from '@mantine/core';
import { Group, Text, rem } from '@mantine/core';
import {
  IconUpload,
  IconPhoto,
  IconTrash,
  IconFile3d
} from '@tabler/icons-react';
import { Dropzone } from '@mantine/dropzone';
import { useEffect, useState, useCallback } from 'react';
import { gapi } from 'gapi-script';
interface FileItem {
  id: string;
  [key: string]: any;
}
const CLIENT_ID =
  '748888465127-r6pcrtqkpse3ecuq2ih7nm5ph4chm64b.apps.googleusercontent.com';
const API_KEY = 'AIzaSyANXpqjioeOdn_NR4OGTuMATDxXkKNW9Mk';
const DISCOVERY_DOCS = [
  'https://www.googleapis.com/discovery/v1/apis/drive/v3/rest'
];
const SCOPES = 'https://www.googleapis.com/auth/drive.file';

export default function FileUploader() {
  const [value, setValue] = useState<File | null>(null);
  const [allFiles, setAllfiles] = useState<File[]>([]);
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [folderId, setFolderId] = useState('');
  const [files, setFiles] = useState<FileItem[]>([]);
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

  useEffect(() => {
    function updateSigninStatus(isSignedIn: boolean) {
      if (isSignedIn) {
        const currentAuth = gapi.auth2
          .getAuthInstance()
          .currentUser.get()
          .getAuthResponse().access_token;
        setAuthToken(currentAuth);
      } else {
        console.log('User not signed in.');
      }
    }

    gapi.load('client:auth2', () => {
      gapi.client
        .init({
          apiKey: API_KEY,
          clientId: CLIENT_ID,
          discoveryDocs: DISCOVERY_DOCS,
          scope: SCOPES
        })
        .then(() => {
          gapi.auth2.getAuthInstance().signIn();
          gapi.auth2.getAuthInstance().isSignedIn.listen(updateSigninStatus);
          updateSigninStatus(gapi.auth2.getAuthInstance().isSignedIn.get());
        })
        .catch((e: any) => console.log(e));
    });
  }, []);

  const findOrCreateFolder = useCallback(
    async (folderName: string) => {
      const accessToken = authToken;
      try {
        const searchResponse = await fetch(
          `https://www.googleapis.com/drive/v3/files?q=name='${folderName}' and mimeType='application/vnd.google-apps.folder' and trashed=false`,
          {
            method: 'GET',
            headers: new Headers({
              Authorization: 'Bearer ' + accessToken
            })
          }
        );
        const searchResult = await searchResponse.json();
        const folders = searchResult.files;
        if (folders.length > 0) {
          console.log('Folder exists', folders[0]);
          setFolderId(folders[0].id);
          return folders[0].id;
        } else {
          const metadata = {
            name: folderName,
            mimeType: 'application/vnd.google-apps.folder'
          };
          const createResponse = await fetch(
            'https://www.googleapis.com/drive/v3/files',
            {
              method: 'POST',
              headers: new Headers({
                Authorization: 'Bearer ' + accessToken,
                'Content-Type': 'application/json'
              }),
              body: JSON.stringify(metadata)
            }
          );
          const folder = await createResponse.json();
          console.log('Folder created', folder);
          setFolderId(folder.id);
          return folder.id;
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
          `https://www.googleapis.com/drive/v3/files?q='${folderId}'+in+parents and trashed=false`,
          {
            method: 'GET',
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
      }
    },
    [authToken]
  );

  useEffect(() => {
    findOrCreateFolder('Otra carpeta');
  }, [findOrCreateFolder]);

  useEffect(() => {
    if (authToken && folderId) {
      console.log('token and folderId ready');
      fetchFilesFromFolder(folderId)
        .then((res) => {
          setFiles(res);
        })
        .catch((e) => console.log(e));
    }
  }, [authToken, folderId, fetchFilesFromFolder]);

  const handleUploadClick = async () => {
    const newfolderId = await findOrCreateFolder('Otra carpeta'); // Use client name, salon and date to build the name
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

      fetch(
        'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart',
        {
          method: 'POST',
          headers: new Headers({ Authorization: 'Bearer ' + authToken }),
          body: form
        }
      )
        .then((response) => response.json())
        .then(() => {
          fetchFilesFromFolder(folderId)
            .then((res) => {
              setFiles(res);
              setAllfiles([]);
            })
            .catch((e) => console.log(e));
        })
        .catch((error) => {
          console.error('Error uploading file', error);
        });
    });
  };

  const deleteFileFromFolder = async (fileId: string) => {
    if (!authToken) {
      console.error('No auth token available');
      return;
    }

    try {
      const response = await fetch(
        `https://www.googleapis.com/drive/v3/files/${fileId}`,
        {
          method: 'DELETE',
          headers: new Headers({
            Authorization: `Bearer ${authToken}`
          })
        }
      );

      if (response.ok) {
        console.log(`File with ID ${fileId} deleted successfully.`);
        setFiles((prevFiles) => prevFiles.filter((file) => file.id !== fileId));
      } else {
        console.error('Failed to delete file', await response.text());
      }
    } catch (error) {
      console.error('Error deleting file:', error);
    }
  };

  return (
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
                    Adjunta la cantidad de archivos que quieras. Cada archivo no
                    debe exceder los 5mb
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
                <Flex key={file.name} gap='16px' justify='space-between'>
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
        disabled={allFiles.length === 0}
        mt='18px'
        w='100%'
        onClick={handleUploadClick}
      >
        Subir Archivos
      </Button>
      <Box py='24px'>
        <hr />
      </Box>
      <Flex direction='column' gap='12px' align='flex-start'>
        <h2>Archivos en la carpeta de este evento (Google drive)</h2>
        {files?.map((file) => (
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
                Download {file.name}
              </a>
            </div>
            <IconTrash
              color='red'
              onClick={() => deleteFileFromFolder(file.id)}
              cursor='pointer'
            />
          </Flex>
        ))}
      </Flex>
    </>
  );
}
