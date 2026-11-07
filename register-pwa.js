
if ('serviceWorker' in navigator) {
  window.addEventListener('load', async () => {
    try {
      const registration =
        await navigator.serviceWorker.register(
          '/NextFind/sw.js',
          { scope: '/NextFind/' }
        );

      console.log(
        'NextFind-app geregistreerd:',
        registration.scope
      );

    } catch (error) {
      console.error(
        'NextFind-app kon niet worden geregistreerd:',
        error
      );
    }
  });
}
