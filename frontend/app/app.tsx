import { WagmiConfig } from 'wagmi';
import { Toaster } from 'react-hot-toast';
import { config } from '../utils/wagmiConfig';
import { AuthProvider } from '../contexts/AuthContext';
import { EmailProvider } from '../contexts/EmailContext';
import '../styles/globals.css';

function MyApp({ Component, pageProps }) {
  return (
    <WagmiConfig config={config}>
      <AuthProvider>
        <EmailProvider>
          <Component {...pageProps} />
          <Toaster position="bottom-right" />
        </EmailProvider>
      </AuthProvider>
    </WagmiConfig>
  );
}

export default MyApp;