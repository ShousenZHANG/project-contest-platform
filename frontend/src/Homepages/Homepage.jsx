/**
 * Homepage.jsx
 *
 * Main landing page layout. Migrated from CSS scroll-snap to a normal vertical
 * page composed of <Navbar /> + sections + <Footer />. Behavior preserved:
 * sections render in order, navbar stays sticky.
 *
 * Developer: Beiqi Dai (migrated)
 */

import React from 'react';
import Navbar from './Navbar';
import Hero from './Hero';
import TopValues from './TopValues';
import Footer from './Footer';

function HomePage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />
      <main>
        <Hero />
        <TopValues />
      </main>
      <Footer />
    </div>
  );
}

export default HomePage;
