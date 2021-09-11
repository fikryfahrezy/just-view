import type { ReactNode } from 'react';
import type { GetServerSideProps } from 'next';
import { ChakraProvider, cookieStorageManager, localStorageManager } from '@chakra-ui/react';

type ChakraProps = {
  children: ReactNode;
  cookies: string;
};
export function Chakra({ cookies, children }: ChakraProps) {
  // b) Pass `colorModeManager` prop
  const colorModeManager =
    typeof cookies === 'string' ? cookieStorageManager(cookies) : localStorageManager;

  return <ChakraProvider colorModeManager={colorModeManager}>{children}</ChakraProvider>;
}

// also export a reusable function getServerSideProps
export const getServerSideProps: GetServerSideProps = async ({ req }) => {
  return {
    props: {
      // first time users will not have any cookies and you may not return
      // undefined here, hence ?? is necessary
      cookies: req.headers.cookie ?? '',
    },
  };
};
