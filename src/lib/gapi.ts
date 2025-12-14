export const initializeGapiClientAndGetToken = async (
  gapiConfig: any,
  forceAccountSelection: boolean = false
): Promise<string | null> => {
  try {
    // Carga y configuración de GAPI
    const gapiModule = await import('gapi-script');
    const gapi = gapiModule.gapi || gapiModule.default.gapi;
    await new Promise<void>((resolve, reject) => {
      gapi.load('client:auth2', () => {
        gapi.client
          .init(gapiConfig)
          .then(() => resolve())
          .catch((e: any) => reject(e));
      });
    });

    // Intentar obtener el token después de la autenticación
    const authInstance = gapi.auth2.getAuthInstance();

    // Si se solicita forzar la selección de cuenta, siempre pedir login
    if (forceAccountSelection) {
      try {
        await authInstance.signIn({
          prompt: 'select_account'
        });
        const authResponse = authInstance.currentUser.get().getAuthResponse();
        return authResponse.access_token;
      } catch (error) {
        console.error('Error during sign-in:', error);
        return null;
      }
    }

    if (authInstance.isSignedIn.get()) {
      // Si ya está autenticado, obtener el token
      const authResponse = authInstance.currentUser.get().getAuthResponse();
      return authResponse.access_token;
    } else {
      // Si no está autenticado, abrir el popup de login
      try {
        await authInstance.signIn();
        const authResponse = authInstance.currentUser.get().getAuthResponse();
        return authResponse.access_token;
      } catch (error) {
        console.error('Error during sign-in:', error);
        return null;
      }
    }
  } catch (error) {
    console.error('Error during GAPI initialization or authentication:', error);
    return null;
  }
};
