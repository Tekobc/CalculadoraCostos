export default function HomePage() {
  return (
    <main className="max-w-4xl mx-auto px-4 py-16 sm:px-6 lg:px-8">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold tracking-tight text-ink sm:text-5xl">
          Calculá tus costos reales sin vueltas
        </h1>
        <p className="text-lg text-ink/80 max-w-2xl mx-auto">
          Una herramienta pensada para emprendedores: sabé exactamente cuánto te cuesta producir,
          definí precios con margen real y cuidá tu negocio.
        </p>
        <div className="pt-4 flex justify-center gap-4">
          <button className="px-6 py-3 rounded-xl bg-primary text-white font-medium hover:bg-primary-hover transition-colors shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">
            Empezar ahora
          </button>
        </div>
      </div>
    </main>
  );
}
