import '../styles/globals.css';

import type { AppProps } from 'next/app';
import { Chakra } from '../context/Chakra';

function MyApp({ Component, pageProps }: AppProps) {
  return (
    <Chakra cookies={pageProps.cookies}>
      <Component {...pageProps} />
    </Chakra>
  );
}
export default MyApp;

export { getServerSideProps } from '../context/Chakra';
