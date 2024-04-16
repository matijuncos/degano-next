'use client';
import { Box, Button, FileInput, Flex, Text } from '@mantine/core';
import { IconRowRemove } from '@tabler/icons-react';
import { useEffect, useState } from 'react';
import { gapi } from 'gapi-script';
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
  const [files, setFiles] = useState([]);
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
        console.log(currentAuth);
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

  const findOrCreateFolder = async (folderName: string) => {
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
  };

  useEffect(() => {
    if (authToken && folderId) {
      fetchFilesFromFolder(folderId).then(setFiles);
    }
  }, [authToken, folderId]);

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
        .then((result) => {
          console.log('File uploaded successfully', result);
        })
        .catch((error) => {
          console.error('Error uploading file', error);
        });
    });
  };

  const fetchFilesFromFolder = async (folderId: string) => {
    const accessToken = authToken; // Assuming authToken is your OAuth 2.0 access token
    try {
      const response = await fetch(
        `https://www.googleapis.com/drive/v3/files?q='${folderId}'+in+parents and trashed=false`,
        {
          method: 'GET',
          headers: new Headers({
            Authorization: 'Bearer ' + accessToken
          })
        }
      );
      const result = await response.json();
      return result.files; // Returns an array of files
    } catch (error) {
      console.error('Error fetching files from folder', error);
      return [];
    }
  };

  return (
    <>
      <FileInput
        value={value}
        onChange={setValue}
        label='Upload files'
        placeholder='Upload files'
      />
      {allFiles.map((file) => (
        <Flex key={file.name}>
          <Text>{file.name}</Text>
          <IconRowRemove
            cursor='pointer'
            onClick={() =>
              setAllfiles((prev) =>
                prev.filter((pfile) => file.name !== pfile.name)
              )
            }
          />
        </Flex>
      ))}
      <Button onClick={handleUploadClick}>Subir Archivos</Button>
      <Box py='24px'>
        <hr />
      </Box>
      {files.map(
        (file: { id: string; webContentLink?: string; name: string }) => (
          <div key={file.id}>
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
        )
      )}
    </>
  );
}
