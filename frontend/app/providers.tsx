'use client';

import { base } from 'wagmi/chains';
import { OnchainKitProvider } from '@coinbase/onchainkit';
import type { ReactNode } from 'react';
import { AuthProvider } from '@/context/AuthContext';
import { EmailProvider } from '@/context/EmailContext';

export function Providers(props: { children: ReactNode }) {
  return (
    <OnchainKitProvider
      apiKey={process.env.NEXT_PUBLIC_ONCHAINKIT_API_KEY}
          chain={base}
          config={{ appearance: { 
            mode: 'auto',
        }
      }}
    >
      <AuthProvider>
        <EmailProvider>
      {props.children}
      </EmailProvider>
      </AuthProvider>
    </OnchainKitProvider>
  );
}

