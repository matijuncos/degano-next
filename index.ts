import { DataverseEnvironmentProps } from 'cj-dataverse-ui';

const local: DataverseEnvironmentProps = {
  DOMAIN: 'dev-zto14ngg.auth0.com',
  CLIENT_ID: 'C1XHi2mpzCn8MPHZZvxAJjnkvnZzOxBG',
  AUDIENCE: 'https://api.local.carejourney.com/',
  BASE_APP_URL: 'http://localhost:3000',
  ENVIRONMENT: 'local',
  LAUNCH_DARKLY_CLIENT_ID: '62a74c5cd369e413a0519df9',
  MIXPANEL_PUBLIC_PROJECT_TOKEN: '6caa612894a18c1fa35718d19f1ed7f7',
  MIXPANEL_API_HOST: 'https://api.mixpanel.com',
  DATAVERSE_API_URL: 'http://localhost:3003/dataverse',
  STRAPI_BASE_URL: 'http://localhost:1337'
};

const dev: DataverseEnvironmentProps = {
  DOMAIN: 'auth-dev.carejourney.com',
  CLIENT_ID: 'Z7gQeFheavA4DGfzAqJ7zvv5GTQ317fb',
  AUDIENCE: 'https://api.dev.carejourney.com/',
  BASE_APP_URL: '',
  ENVIRONMENT: 'dev',
  LAUNCH_DARKLY_CLIENT_ID: '',
  MIXPANEL_PUBLIC_PROJECT_TOKEN: '',
  MIXPANEL_API_HOST: '',
  DATAVERSE_API_URL: ''
};

const tst: DataverseEnvironmentProps = {
  DOMAIN: 'https://auth-tst.carejourney.com/',
  CLIENT_ID: 'utG4OXpZdyLe8i5nrlaJbFJAtvVg7Ik8',
  AUDIENCE: 'https://api.tst.carejourney.com/',
  BASE_APP_URL: '',
  ENVIRONMENT: 'tst',
  LAUNCH_DARKLY_CLIENT_ID: '',
  MIXPANEL_PUBLIC_PROJECT_TOKEN: '',
  MIXPANEL_API_HOST: '',
  DATAVERSE_API_URL: ''
};

const int: DataverseEnvironmentProps = {
  DOMAIN: 'auth-int.carejourney.com',
  CLIENT_ID: '9o59sPg9Ynwm0P0HaXEzOQwdQ60HpPPo',
  AUDIENCE: 'https://api.int.carejourney.com/',
  BASE_APP_URL: '',
  ENVIRONMENT: 'int',
  LAUNCH_DARKLY_CLIENT_ID: '',
  MIXPANEL_PUBLIC_PROJECT_TOKEN: '',
  MIXPANEL_API_HOST: '',
  DATAVERSE_API_URL: ''
};

const prod: DataverseEnvironmentProps = {
  DOMAIN: 'https://auth.carejourney.com/',
  CLIENT_ID: 'aIBSsLxdgg7HcuoaIg32jMjXKg5R7eDs',
  AUDIENCE: 'https://api.prod.carejourney.com/',
  BASE_APP_URL: '',
  ENVIRONMENT: 'prod',
  LAUNCH_DARKLY_CLIENT_ID: '',
  MIXPANEL_PUBLIC_PROJECT_TOKEN: '',
  MIXPANEL_API_HOST: '',
  DATAVERSE_API_URL: ''
};

export let DATAVERSE_ENVIRONMENT = local;

switch (process.env.REACT_APP_STAGE) {
  case 'prod':
    DATAVERSE_ENVIRONMENT = prod;
    break;
  case 'int':
    DATAVERSE_ENVIRONMENT = int;
    break;
  case 'tst':
    DATAVERSE_ENVIRONMENT = tst;
    break;
  case 'dev':
    DATAVERSE_ENVIRONMENT = dev;
    break;
  case 'local':
    DATAVERSE_ENVIRONMENT = local;
    break;
  default:
    break;
}

export const USER_AUTHORIZATION_NAMESPACE_KEY =
  'https://carejourney.com/user_authorization';

// This needs to be fixed to have a hardcoded hash calculated for this key
// In the local auth0 token, so we can run securemode
export const LD_LOCAL_USER_KEY = 'LDLocalUserKey';
