/**
 * Example usage of the Capture component
 * This file demonstrates how to integrate the Capture component in your application
 */

import { Capture } from './Capture';

/**
 * Basic Usage
 * The simplest way to use the Capture component
 */
export function BasicCaptureExample() {
  return (
    <div className="min-h-screen bg-background-dark">
      <Capture />
    </div>
  );
}

/**
 * With Custom Styling
 * You can add custom classes to the component
 */
export function StyledCaptureExample() {
  return (
    <div className="min-h-screen bg-background-dark">
      <Capture className="custom-capture-styles" />
    </div>
  );
}

/**
 * In a Route (with React Router)
 * How to use in a routed application
 */
export function RouteExample() {
  return (
    <div className="min-h-screen bg-background-dark">
      {/* Your app header/navigation */}
      <header className="p-4 bg-surface-dark">
        <h1 className="text-white text-xl">Focus Flow</h1>
      </header>

      {/* Capture component as main content */}
      <main>
        <Capture />
      </main>
    </div>
  );
}

/**
 * With Layout Component
 * Integrated with the Focus Flow layout
 */
import { Layout } from '../Layout';

export function LayoutIntegratedExample() {
  return (
    <Layout>
      <Capture />
    </Layout>
  );
}
