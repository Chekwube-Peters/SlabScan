import { useState } from 'react';
import SlabScan from './SlabScan';
import LandingPage from './LandingPage';

export default function App() {
  const [showApp, setShowApp] = useState(false);

  if (!showApp) {
    return <LandingPage onLaunch={() => setShowApp(true)} />;
  }

  return <SlabScan />;
}
