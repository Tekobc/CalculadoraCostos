import type { Metadata } from 'next';
import '../styles/tokens.css';

export const metadata: Metadata = {
  title: 'Calculadora de Costos para Emprendedores',
  description: 'Calculá costos reales y definí precios justos para tus productos y servicios.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es-AR">
      <body className="min-h-screen antialiased bg-canvas text-ink">
        {children}
      </body>
    </html>
  );
}
