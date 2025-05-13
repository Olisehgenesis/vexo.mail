// components/layout/MainLayout.js
import React from 'react';
import Head from 'next/head';
import Navigation from './Navigation';

const MainLayout = ({ children, title = 'Vexo.social - Web3 Email' }) => {
 return (
   <>
     <Head>
       <title>{title}</title>
       <meta name="description" content="Web3 email system using wallet authentication" />
       <link rel="icon" href="/favicon.ico" />
     </Head>
     
     <div className="h-full flex">
       <Navigation />
       <main className="flex-1 overflow-auto bg-gray-50">{children}</main>
     </div>
   </>
 );
};

export default MainLayout;