import React from "react";
import { useLayoutSettings } from "@/hooks/useLayoutSettings";

interface RestaurantHeaderProps {
  actions?: React.ReactNode;
}

const RestaurantHeader: React.FC<RestaurantHeaderProps> = ({ actions }) => {
  const { settings, loading } = useLayoutSettings();

  if (loading) {
    return (
      <div className="relative">
        <div className="h-48 sm:h-80 w-full bg-muted animate-pulse" />
        <div className="container mx-auto px-4 relative -mt-4 sm:-mt-10 z-10 mb-1">
          <div className="rounded-lg shadow-lg p-3 sm:p-6 bg-muted animate-pulse h-32" />
        </div>
      </div>
    );
  }

  const useSameImage = settings.usar_mesma_imagem_mobile !== 'false';
  const mobileUrl = !useSameImage && settings.empresa_banner_mobile_url
    ? settings.empresa_banner_mobile_url
    : settings.empresa_banner_url;

  return (
    <div className="relative">
      <div
        className="h-48 sm:h-80 w-full overflow-hidden"
        style={{
          background: `linear-gradient(to left, ${settings.cor_secundaria}, ${settings.cor_primaria})`,
        }}
      >
        <picture>
          <source media="(min-width: 768px)" srcSet={settings.empresa_banner_url} />
          <img
            src={mobileUrl}
            alt={settings.empresa_nome}
            className="w-full h-full object-cover"
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.src = "/images/restaurant-banner.jpg";
            }}
          />
        </picture>
      </div>
      <div className="container mx-auto px-4 relative -mt-4 sm:-mt-10 z-10 mb-1">
        <div className="rounded-lg shadow-lg p-3 sm:p-6" style={{ backgroundColor: settings.cor_background_header }}>
          <div className="flex flex-col md:flex-row md:items-center gap-4">
            {/* Logo + Nome */}
            <div className="flex flex-col sm:flex-row items-center md:flex-1">
              <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-white shadow-md mr-0 sm:mr-6 mb-4 sm:mb-0 flex-shrink-0">
                <img
                  src={settings.empresa_logo_url}
                  alt="Logo"
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.src = "/placeholder.svg";
                  }}
                />
              </div>
              <div className="text-center sm:text-left">
                <h1 className="text-2xl sm:text-3xl font-bold" style={{ color: settings.cor_fonte }}>{settings.empresa_nome}</h1>
                <p className="mt-1" style={{ color: settings.cor_fonte }}><b>{settings.empresa_descricao}</b></p>

                <div className="flex items-center justify-center sm:justify-start mt-2">
                  <div className="flex text-yellow-400">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <svg key={star} className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                        <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
                      </svg>
                    ))}
                  </div>
                  <span className="ml-2" style={{ color: settings.cor_fonte }}>4.8 (120+)</span>
                </div>
              </div>
            </div>

            {/* Ações (botões + email) */}
            {actions && (
              <div className="md:flex-shrink-0 md:ml-auto">
                {actions}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default RestaurantHeader;
