'use client';
import { Button, FileInput, Flex, Text } from '@mantine/core';
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
  const [folderId, setFolderId] = useState<string | null>(null);
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
    if (authToken) {
      const initFolder = async () => {
        const newFolderId = await createFolder('My New Folder');
        setFolderId(newFolderId);
      };

      initFolder();
    }
  }, [authToken]);

  useEffect(() => {
    function updateSigninStatus(isSignedIn: boolean) {
      console.log('isisgned in', isSignedIn);
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
  const createFolder = async (folderName: string) => {
    const metadata = {
      name: folderName,
      mimeType: 'application/vnd.google-apps.folder'
    };

    const accessToken = authToken; // Assuming authToken is your OAuth 2.0 access token

    try {
      const response = await fetch(
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

      const folder = await response.json();

      console.log('Folder created', folder);
      return folder.id; // Returns the ID of the newly created folder
    } catch (error) {
      console.error('Error creating folder', error);
      return null;
    }
  };
  const uploadFile = (file: File) => {
    if (!folderId) return;
    const form = new FormData();
    form.append(
      'metadata',
      new Blob(
        [
          JSON.stringify({
            name: file.name,
            mimeType: file.type,
            parents: [folderId]
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
  };

  const handleUploadClick = () => {
    allFiles.forEach(uploadFile);
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
    </>
  );
}
